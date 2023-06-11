// import package
const WebSocket = require("ws");
const mongoose = require("mongoose");
const axios = require("axios");
let async = require('async');

let common = require("../helpers/common");
var query_helper = require("../helpers/query");

// import model
const pairsDB = mongoose.model("USDTPerpetualPair");

let OrderBookDB = mongoose.model("OrderBookFutures");
let tradeChartDb = mongoose.model("TradeChartUSDTPerpetual");

let oArrayOB = [];
function _intervalFuncOB(orderwith) {
  orderwith = orderwith.toString();
  var index = oArrayOB.indexOf(orderwith);
  if (index > -1) {
    oArrayOB.splice(index, 1);
  }
}

let oArrayOBSend = [];
function _intervalFuncOBSend(orderwith) {
  orderwith = orderwith.toString();
  var index = oArrayOBSend.indexOf(orderwith);
  if (index > -1) {
    oArrayOBSend.splice(index, 1);
  }
}

let oArrayRT = [];
function _intervalFuncRT(orderwith) {
  orderwith = orderwith.toString();
  var index = oArrayRT.indexOf(orderwith);
  if (index > -1) {
    oArrayRT.splice(index, 1);
  }
}

let oArray = [],
  activePairs = [],
  activePairsDet = {},
  recentTrade = {},
  tradeWS;

// const bybitSocketLink = "wss://stream.bybit.com/perpetual/ws/v1/realtime_public";
const bybitSocketLink = "wss://stream.bybit.com/realtime_public";

var socket = 0;

// here socket connect
exports.SocketInit = function (socketIO) {
  socket = socketIO;
};

exports.initialCall = async function () {
  try {
    let pairList = await pairsDB
      .find({ botType: "BYBIT", status: "active" }, { pair: 1 })
      .lean();
    if (pairList.length > 0) {
      for (let item of pairList) {
        activePairs.push({
          ...item,
          symbol: item.pair.replace("_", ""),
        });
        activePairsDet[item.pair.replace("_", "")] = item.pair;
      }
      if (activePairs.length > 0) {
        instrumentInfo();
        orderBookL2_25();
        await setRecentTrade();
        wsRecentTrade();
      }
    }
  } catch (err) {
    console.log("err : ", err);
  }
};

async function instrumentInfo() {
  try {
    const ws = new WebSocket(bybitSocketLink);
    ws.on("open", function open() {
      try {
        if (activePairs.length > 0) {
          let args = [];
          for (let item of activePairs) {
            args.push(`instrument_info.100ms.${item.symbol}`);
          }

          let subscribe = {
            op: "subscribe",
            args: args,
          };

          ws.send(JSON.stringify(subscribe));
        }
      } catch (err) {
        console.log("error : instrumentInfo : open : ", err);
      }
    });
    ws.on("message", async function message(data) {
      try {
        let tickerData = JSON.parse(data.toString());
        if (tickerData && tickerData.topic) {
          let symbol = tickerData.topic.replace("instrument_info.100ms.", "");
          const orderwith = oArrayOB.indexOf(symbol.toString());
          if (orderwith == -1) {
            oArrayOB.push(symbol.toString());
            setTimeout(_intervalFuncOB, 2000, symbol.toString());
            if (tickerData.type == "snapshot") {
              let updateTicker = tickerData.data;
              let pairDoc = activePairs.find(
                (el) => el.symbol == tickerData.data.symbol
              );

              let updateDoc = {
                lastPrice: updateTicker.last_price,
                marketPrice: updateTicker.mark_price,
                indexPrice: updateTicker.index_price,
                bidPrice: updateTicker.bid1_price,
                askPrice: updateTicker.ask1_price,
                highPrice24h: updateTicker.high_price_24h,
                lowPrice24h: updateTicker.low_price_24h,
              };

              if (!common.isEmpty(updateTicker.highPrice24h)) {
                updateDoc["high_price_24h"] = updateTicker.highPrice24h;
              };

              let latestDoc = await pairsDB.findOneAndUpdate(
                {
                  pair: pairDoc.pair,
                },
                updateDoc,
                { new: true }
              );
              socket.sockets.emit("USDTPerpetualPairResp", latestDoc);
            } else if (
              tickerData.type == "delta" &&
              tickerData.data &&
              tickerData.data.update &&
              tickerData.data.update[0]
            ) {
              let updateTicker = tickerData.data.update[0];
              let updateDoc = {};
              if (!common.isEmpty(updateTicker.last_price)) {
                updateDoc["lastPrice"] = updateTicker.last_price;
              }

              if (!common.isEmpty(updateTicker.mark_price)) {
                updateDoc["marketPrice"] = updateTicker.mark_price;
              }

              if (!common.isEmpty(updateTicker.index_price)) {
                updateDoc["indexPrice"] = updateTicker.index_price;
              }

              if (!common.isEmpty(updateTicker.bid1_price)) {
                updateDoc["bidPrice"] = updateTicker.bid1_price;
              }

              if (!common.isEmpty(updateTicker.ask1_price)) {
                updateDoc["askPrice"] = updateTicker.ask1_price;
              }

              if (!common.isEmpty(updateTicker.highPrice24h)) {
                updateDoc["high_price_24h"] = updateTicker.highPrice24h;
              }

              if (!common.isEmpty(updateTicker.turnover_24h_e8)) {
                updateDoc["turnover_24h"] =
                  updateTicker.turnover_24h_e8 / 100000000;
              }
              if (!common.isEmpty(updateTicker.price_24h_pcnt_e6)) {
                updateDoc["price_24h_pcnt"] =
                  updateTicker.price_24h_pcnt_e6 / 10000;
              }

              if (!common.isEmpty(updateTicker.low_price_24h)) {
                updateDoc["lowPrice24h"] = updateTicker.low_price_24h;
              }

              if (!common.isEmpty(updateDoc)) {
                let pairDoc = activePairs.find(
                  (el) => el.symbol == updateTicker.symbol
                );
                let latestDoc = await pairsDB.findOneAndUpdate(
                  {
                    pair: pairDoc.pair,
                  },
                  updateDoc,
                  { new: true }
                );
                socket.sockets.emit("USDTPerpetualPairResp", latestDoc);
              }
            }
          }
        }
      } catch (err) {
        console.log("error : instrumentInfo : message : ", err);
      }
    });
    ws.on("error", (error) => {
      console.log("error : instrumentInfo : ", error);
    });
    // ws.on('error', console.error);
    ws.on("close", function close() {
      console.log("close : instrumentInfo : ");
      instrumentInfo();
    });
  } catch (err) {
    console.log("Error on instrumentInfo");
  }
}

let orderBooks = {};
async function orderBookL2_25() {
  try {
    const ws = new WebSocket(bybitSocketLink);
    ws.on("open", function open() {
      if (activePairs.length > 0) {
        let args = [];
        for (let item of activePairs) {
          args.push(`orderBookL2_25.${item.symbol}`);
        }

        let subscribe = {
          op: "subscribe",
          args: args,
        };
        ws.send(JSON.stringify(subscribe));
      }
    });
    ws.on("message", async function message(data) {
      try {
        let respData = JSON.parse(data.toString());
        if (respData && respData.topic) {
          let symbol = respData.topic.replace("orderBookL2_25.", "");
          let bybitOB = orderBooks[symbol];

          if (respData.type == "snapshot") {
            bybitOB = respData.data.order_book;
          } else if (respData.type == "delta") {
            if (bybitOB && Array.isArray(bybitOB)) {
              if (
                respData.data.delete &&
                respData.data.delete.length > 0 &&
                bybitOB.length > 0
              ) {
                for (let deleted of respData.data.delete) {
                  let index = bybitOB.findIndex(
                    (el) => el.price == deleted.price
                  );
                  if (index > -1) {
                    bybitOB.splice(index, 1);
                  }
                }
              }

              if (
                respData.data.update &&
                respData.data.update.length > 0 &&
                bybitOB.length > 0
              ) {
                for (let updated of respData.data.update) {
                  let index = bybitOB.findIndex(
                    (el) => el.price == updated.price
                  );
                  if (index > -1) {
                    bybitOB[index] = updated;
                  }
                }
              }

              if (respData.data.insert && respData.data.insert.length > 0) {
                bybitOB = [...bybitOB, ...respData.data.insert];
              }
            }
          }
          orderBooks[symbol] = bybitOB;

          const orderwith = oArrayOBSend.indexOf(symbol.toString());
          if (orderwith == -1) {
            oArrayOBSend.push(symbol.toString());
            setTimeout(_intervalFuncOBSend, 2000, symbol.toString());

            // sell order book
            let sellOrder = [],
              bybitSellOrder = bybitOB.filter((el) => el.side == "Sell");
            if (bybitSellOrder.length > 0) {
              for (let sellItem of bybitSellOrder) {
                sellOrder.push({
                  _id: parseFloat(sellItem.price),
                  amount: parseFloat(sellItem.size),
                  filledAmount: 0,
                });
              }
            }
            sellOrder = sellOrder.sort(
              (a, b) => parseFloat(a._id) - parseFloat(b._id)
            );
            // sellOrder = sellOrder.slice(0, 10).reverse();

            // buy order book
            let buyOrder = [],
              bybitBuyOrder = bybitOB.filter((el) => el.side == "Buy");

            if (bybitBuyOrder.length > 0) {
              for (let buyItem of bybitBuyOrder) {
                buyOrder.push({
                  _id: parseFloat(buyItem.price),
                  amount: parseFloat(buyItem.size),
                  filledAmount: 0,
                });
              }
            }

            buyOrder = buyOrder.sort(
              (a, b) => parseFloat(b._id) - parseFloat(a._id)
            );

            let updateDoc = {};
            if(buyOrder && buyOrder[0] && buyOrder[0]._id) {
              updateDoc.bidPrice = buyOrder[0]._id;
            }
            if(sellOrder && sellOrder[0] && sellOrder[0]._id) {
              updateDoc.askPrice = sellOrder[0]._id;
            }

            if(symbol && activePairsDet[symbol]) {
              let latestDoc = await pairsDB.findOneAndUpdate(
                {
                  pair: activePairsDet[symbol],
                },
                updateDoc,
                { new: true }
              );
  
              socket.sockets.emit("USDTPerpetualOrderBook", {
                pairName: symbol,
                buyOrder: buyOrder,
                sellOrder: sellOrder
              });
            }

          }
        }
      } catch (err) {
        console.log("Error on orderBookL2_25--", err);
      }
    });
    ws.on("error", (error) => {
      console.log("error : orderBookL2_25 : ", error);
    });
    // ws.on('error', console.error);
    ws.on("close", function close() {
      orderBookL2_25();
      // need to restart the pm2 - notes by raja
    });
  } catch (err) {
    console.log("Error on orderBookL2_25", err);
  }
}

async function setRecentTrade() {
  try {
    if (activePairs && activePairs.length > 0) {
      for (let item of activePairs) {
        let respData = await axios({
          url: "https://api.bybit.com/public/linear/recent-trading-records",
          method: "get",
          params: {
            symbol: item.symbol,
            limit: 25,
          },
        });

        if (
          respData &&
          respData.data &&
          respData.data.result &&
          Array.isArray(respData.data.result)
        ) {
          let trades = [];
          respData.data.result.map((el) => {
            trades.push({
              time: new Date(el.time),
              type: el.side == "Buy" ? "buy" : "sell",
              price: el.price,
              volume: el.qty,
            });
          });
          recentTrade[item.symbol] = trades;
        }
      }
    }
  } catch (err) {
    console.log("err : setRecentTrade ", err);
  }
}

async function wsRecentTrade() {
  tradeWS = new WebSocket(bybitSocketLink);

  tradeWS.on("open", async function open() {
    if (activePairs && activePairs.length > 0) {
      let args = [];
      for (let item of activePairs) {
        args.push(`trade.${item.symbol}`);
      }

      let subscribe = {
        op: "subscribe",
        args: args,
      };
      tradeWS.send(JSON.stringify(subscribe));
    }
  });

  tradeWS.on("message", async function incoming(responseData) {
    try {
      if (responseData) {
        responseData = JSON.parse(responseData);
        let bybitData = responseData.data;
        if (bybitData && bybitData.length > 0) {
          let symbol = responseData.topic.replace("trade.", "");

          const orderwith = oArrayRT.indexOf(symbol.toString());
          if (orderwith == -1) {
            oArrayRT.push(symbol.toString());
            setTimeout(_intervalFuncRT, 2000, symbol.toString());

            let preData = recentTrade[symbol];
            if (preData) {
              preData.pop();
            } else {
              preData = [];
            }
            let tradeDocs = [];
            for (let item of bybitData) {
              tradeDocs.push({
                time: new Date(item.timestamp),
                type: item.side == "Buy" ? "buy" : "sell",
                price: item.price,
                volume: item.size,
              });
            }
            tradeDocs = [...tradeDocs, ...preData];
            recentTrade[symbol] = tradeDocs;

            let pairDoc = activePairs.find((el) => el.symbol == symbol);
            if (recentTrade && recentTrade[symbol] && recentTrade[symbol][0]) {
              const firstItem = recentTrade[symbol][0];
              const newPrice = firstItem.price;
              if (pairDoc) {
                await pairsDB.findOneAndUpdate(
                  {
                    pair: pairDoc.pair,
                  },
                  {
                    lastPrice: newPrice,
                    marketPrice: newPrice,
                    indexPrice: newPrice,
                  },
                  { new: true }
                );
              }

              socket.sockets.emit("USDTPerpetualRecentTrade", {
                pairName: symbol,
                data: tradeDocs,
              });

              let pairSymbol = pairDoc.pair;
              const price = common.toFixed(firstItem.price, 8);
              const qVal = common.toFixed(firstItem.volume, 8);
              const type = firstItem.side == "Buy" ? "buy" : "sell";
              let tradeChart = {
                price: price,
                open: price,
                high: price,
                low: price,
                close: price,
                volume: qVal,
                total: price * qVal,
                pair: pairDoc._id,
                pairName: pairDoc.pair,
                type: type,
                time: firstItem.time,
                chartType: "Bybit",
                dataFrom: "updateBybitTrades",
              };
              const insResp = await query_helper.insertData(
                tradeChartDb,
                tradeChart
              );
              pairData(pairSymbol, (result) => {
                try {
                  if (result.status) {
                    socket.sockets.emit("pairResponseFutures", result.Message);
                  }
                } catch (e) {
                  console.log("err : updateOrderPrice", e);
                }
              });
            }
          }
        }
      }
    } catch (err) {
      console.log("err : wsRecentTrade : ", err);
    }
  });

  tradeWS.on("error", (error) => {
    console.log("error : wsRecentTrade : ", error);
  });

  tradeWS.on("close", function close() {
    wsRecentTrade();
  });
}

let pairData = (exports.pairData = async function (pair, callback, req = {}) {
  const reqBody = req.body ? req.body : {};

  let where = pair != "" ? { pair, status: "active" } : { status: "active" };

  let pairs = await pairsDB
    .findOne(where)
    .sort({ _id: 1 })
    .populate("fromCurrency")
    .populate("toCurrency");
  if (pairs) {
    async.parallel(
      {
        TradeHistory: async function () {
          const resData = await query_helper.findData(
            tradeChartDb,
            { pair: pairs._id },
            {},
            { time: -1 },
            25
          );
          return resData.msg;
        },
      },
      async function (err, tradeDetails) {
        var fromCurrency = pairs.fromCurrency
          ? pairs.fromCurrency.currencySymbol
          : "";
        var toCurrency = pairs.toCurrency
          ? pairs.toCurrency.currencySymbol
          : "";
        var inputData = JSON.parse(JSON.stringify(pairs));

        let fromdata = {
          _id: "",
          currencyId: "",
          currencyName: "",
          currencySymbol: "",
          curnType: "",
          USDvalue: "",
          image: "",
          decimal: "",
          siteDecimal: "",
        };
        let todata = {
          _id: "",
          currencyId: "",
          currencyName: "",
          currencySymbol: "",
          curnType: "",
          USDvalue: "",
          image: "",
          decimal: "",
          siteDecimal: "",
        };

        if (inputData.fromCurrency) {
          fromdata = {
            _id: inputData.fromCurrency._id,
            currencyId: inputData.fromCurrency.currencyId,
            currencyName: inputData.fromCurrency.currencyName,
            currencySymbol: inputData.fromCurrency.currencySymbol,
            curnType: inputData.fromCurrency.curnType,
            USDvalue: inputData.fromCurrency.USDvalue,
            image: inputData.fromCurrency.image,
            decimal: inputData.fromCurrency.decimal,
            siteDecimal: inputData.fromCurrency.siteDecimal,
          };
          todata = {
            _id: inputData.toCurrency._id,
            currencyId: inputData.toCurrency.currencyId,
            currencyName: inputData.toCurrency.currencyName,
            currencySymbol: inputData.toCurrency.currencySymbol,
            curnType: inputData.toCurrency.curnType,
            USDvalue: inputData.toCurrency.USDvalue,
            image: inputData.toCurrency.image,
            decimal: inputData.toCurrency.decimal,
            siteDecimal: inputData.toCurrency.siteDecimal,
          };
        }
        delete inputData.fromCurrency;
        delete inputData.toCurrency;
        inputData.fromCurrency = fromdata;
        inputData.toCurrency = todata;
        inputData.pair = fromCurrency + "_" + toCurrency;
        if (
          typeof inputData.decimalValue == "undefined" ||
          typeof inputData.decimalValue == undefined
        ) {
          inputData.decimalValue = inputData.toCurrency.siteDecimal;
        }
        inputData.buyOrders = tradeDetails.BuyOrder;
        inputData.sellOrders = tradeDetails.SellOrder;
        inputData.tradeHistory = tradeDetails.TradeHistory;

        if (
          typeof tradeDetails.orderBook == "object" &&
          typeof tradeDetails.orderBook.asks == "object" &&
          typeof tradeDetails.orderBook.bids == "object"
        ) {
          let ordertype = ["buy", "sell"];
          var item = ordertype[Math.floor(Math.random() * ordertype.length)];

          inputData.price =
            item == "buy"
              ? tradeDetails.orderBook.bids[0]
                ? tradeDetails.orderBook.bids[0]._id
                : 0
              : tradeDetails.orderBook.asks[0]
              ? tradeDetails.orderBook.asks[0]._id
              : 0;

          inputData.lastPrice =
            item == "buy"
              ? tradeDetails.orderBook.asks[0]
                ? tradeDetails.orderBook.asks[0]._id
                : 0
              : tradeDetails.orderBook.bids[0]
              ? tradeDetails.orderBook.bids[0]._id
              : 0;

          let update = {
            userbids: inputData.buyOrders,
            userasks: inputData.sellOrders,
          };

          await query_helper.updateData(
            OrderBookDB,
            "one",
            { pair: inputData.pair },
            update
          );
          inputData.buyOrders.forEach((element, i) => {
            let orderPushed = 0;
            tradeDetails.orderBook.bids.forEach((element1, i1) => {
              if (element1._id == element._id) {
                orderPushed = 1;
                tradeDetails.orderBook.bids[i1].amount =
                  tradeDetails.orderBook.bids[i1].amount + element.amount;
                return;
              }
            });
            if (orderPushed == 0) {
              tradeDetails.orderBook.bids.push(element);
            }
          });
          inputData.sellOrders.forEach((element2, i2) => {
            let orderPushed1 = 0;
            tradeDetails.orderBook.asks.forEach((element3, i3) => {
              if (element3._id == element2._id) {
                orderPushed1 = 1;
                tradeDetails.orderBook.asks[i3].amount =
                  tradeDetails.orderBook.asks[i3].amount + element2.amount;
                return;
              }
            });
            if (orderPushed1 == 0) {
              tradeDetails.orderBook.asks.push(element2);
            }
          });

          inputData.buyOrders = tradeDetails.orderBook.bids;
          inputData.sellOrders = tradeDetails.orderBook.asks;
          inputData.buyOrders.sort(function (a, b) {
            return b._id - a._id;
          });
          inputData.sellOrders.sort(function (a, b) {
            return a._id - b._id;
          });
        } else {
          let percentageChange = 149;
          if (inputData.buyOrders && inputData.buyOrders.length > 0) {
            inputData.buyOrders[0].amount = +(+(
              (+inputData.buyOrders[0].amount * percentageChange) /
              100
            ).toFixed(inputData.fromCurrency.siteDecimal));
            inputData.buyOrders[0]._id = +(+inputData.buyOrders[0]._id).toFixed(
              inputData.decimalValue
            );
          }
          if (inputData.sellOrders && inputData.sellOrders.length > 0) {
            inputData.sellOrders[0].amount = +(+(
              (+inputData.sellOrders[0].amount * percentageChange) /
              100
            ).toFixed(inputData.fromCurrency.siteDecimal));
            inputData.sellOrders[0]._id = +(+inputData.sellOrders[0]
              ._id).toFixed(inputData.decimalValue);
          }
        }

        // if(inputData.price <= 0) {
        //   inputData.price = tradeDetails.TradeHistory.price;
        // }
        // if(inputData.price <= 0) {
        //   inputData.lastPrice = tradeDetails.TradeHistory.lastPrice;
        // }
        if (inputData.price <= 0) {
          inputData.price = pairs.price;
        }
        if (inputData.price <= 0) {
          inputData.lastPrice = pairs.lastPrice;
        }

        inputData.type = 1;
        callback({ status: true, Message: inputData });
      }
    );
  } else {
    callback({ status: false, Message: "No Pairs Available!" });
  }
});
