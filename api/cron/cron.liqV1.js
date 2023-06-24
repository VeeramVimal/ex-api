const mongoose = require("mongoose");
const query_helper = require("../helpers/query");
const trade = require("../helpers/trade");
const p2pHelper = require("../helpers/p2p");
let common = require("../helpers/common");
const cron = require("node-cron");

let config = require("../Config/config");

const customerWalletController = require("../controllers/v1/customerWalletController");

let pairsDB = mongoose.model("Pairs");
const DerivativesPairDB = mongoose.model("DerivativesPairs");

let tradeChartDB = mongoose.model("TradeChart");
let TradeChartUSDTPerpetual = mongoose.model("TradeChartUSDTPerpetual");
let Currency = mongoose.model("Currency");
let getJSON = require("get-json");
let percentageChange = 149;
require("events").defaultMaxListeners = 0;
// var WebSocket = require('ws');
let io = require("socket.io-client");

// const OrderBook = require('./model/OrderBook');
let OrderBookDB = mongoose.model("OrderBook");

let runningWazirxCronPairs = {},
  usdtValues = {},
  availablePairs = [],
  availablePairsObj = {},
  unAvailablePairs = [],
  updateExceptPairs_cronInit = 0,
  availablePairsDetails = {};

let orderedPairs = [];
function _intervalFunc(orderwith) {
  var index = orderedPairs.indexOf(orderwith);
  if (index > -1) {
    orderedPairs.splice(index, 1);
  }
}

let oArray = [];
function _intervalFuncNT(orderwith) {
  orderwith = orderwith.toString();
  var index = oArray.indexOf(orderwith);
  if (index > -1) {
    oArray.splice(index, 1);
  }
}

let oArrayDO = [];
function _intervalFuncDO(orderwith) {
  orderwith = orderwith.toString();
  var index = oArrayDO.indexOf(orderwith);
  if (index > -1) {
    oArrayDO.splice(index, 1);
  }
}

async function changeUsdt() {
  await common.setUsdtRateChange();
}

async function liquidityChecking() {
  const getPairOBData = await pairsDB.aggregate([
    {
      $match: {
        autoOrderExecute: 1,
      },
    },
    {
      $lookup: {
        from: "OrderBook",
        let: {
          pairOB: "$pair",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ["$pair", "$$pairOB"],
                  },
                ],
              },
            },
          },
          {
            $project: {
              pair: "$pair",
              liquidityDataTime: "$liquidityDataTime",
            },
          },
        ],
        as: "OrderBookData",
      },
    },
    {
      $project: {
        _id: "$_id",
        pair: "$pair",
        tradeEnable: "$tradeEnable",
        OrderBookData: "$OrderBookData",
      },
    },
  ]);
  for (let a = 0; a < getPairOBData.length; a++) {
    const element = getPairOBData[a];

    if (element) {
      let newStatus = 0;
      const tradeEnable = element.tradeEnable;
      if (element.OrderBookData && element.OrderBookData[0]) {
        if (tradeEnable != 0) {
          let seconds = 120;
          if (element.OrderBookData[0].liquidityDataTime) {
            const liquidityDataTime =
              element.OrderBookData[0].liquidityDataTime;
            const endDate = new Date();
            seconds = (endDate.getTime() - liquidityDataTime.getTime()) / 1000;
          }

          if (seconds >= 60) {
            newStatus = 2;
          } else {
            newStatus = 1;
          }
        }
      } else {
        newStatus = 2;
      }

      if (tradeEnable != newStatus) {
        console.log(element.pair, { newStatus });
        await query_helper.updateData(
          pairsDB,
          "one",
          {
            _id: mongoose.Types.ObjectId(element._id),
          },
          {
            tradeEnable: newStatus,
          }
        );
      }
    }
  }
}

async function tickerUpdate() {
  try {
    // console.log("tickerUpdate : ");
    const resData = await getJSON("https://api.coindcx.com/exchange/ticker");
    if (resData) {
      let priceChange = common.getUsdtRateChange();
      for (var key in resData) {
        let element = resData[key];
        if (Object.keys(availablePairsObj).length > 0) {
          let pair = availablePairsObj[element.market.toLowerCase()];
          if (pair && Object.keys(pair).length > 0) {
            if (typeof pair == "object") {
              if (pair.topair.currencySymbol == "usdt") {
                usdtValues[pair.frompair.currencySymbol.toLowerCase()] =
                  element.last_price;
              }
              let open =
                element.last_price -
                (element.last_price * element.change_24_hour) / 100;
              if (priceChange.changeValue > 0) {
                open = priceChange.changePer * +open;
                element.high = priceChange.changePer * +element.high;
                element.low = priceChange.changePer * +element.low;
                element.last_price =
                  priceChange.changePer * +element.last_price;
              }
              const openPrice = +open;
              const newChange =
                ((+element.last_price - openPrice) / openPrice) * 100;
              const changeValue = !isNaN(+element.last_price - openPrice)
                ? +element.last_price - openPrice
                : 0;
              // availablePairsObj[element.market.toLowerCase()].change = newChange;
              // if(+element.q > 0) {
              // 	availablePairsObj[element.s].volume = +(+((+element.q * 115)/100).toFixed(pair.fromDecimal));
              // }

              let maxLiquidityQuantity =
                pair.maxLiquidityQuantity > 0 ? pair.maxLiquidityQuantity : 0;
              // let quantityLiquidityCorrection = pair.quantityLiquidityCorrection > 0 ? pair.quantityLiquidityCorrection : 0;
              let tfhrVolLiquidityCorrection =
                pair.tfhrVolLiquidityCorrection > 0
                  ? pair.tfhrVolLiquidityCorrection
                  : 0;

              if (maxLiquidityQuantity > 0 && tfhrVolLiquidityCorrection > 0) {
                if (element.volume > maxLiquidityQuantity) {
                  element.volume =
                    element.volume * (tfhrVolLiquidityCorrection / 100);
                }
              }
              const volume_fromCur = element.volume / element.last_price;

              availablePairsObj[element.market.toLowerCase()].change =
                newChange;
              availablePairsObj[element.market.toLowerCase()].changeValue =
                changeValue;
              availablePairsObj[element.market.toLowerCase()].price =
                element.last_price;
              availablePairsObj[element.market.toLowerCase()].lastPrice =
                pair.price;
              availablePairsObj[element.market.toLowerCase()].high = pair.high;
              availablePairsObj[element.market.toLowerCase()].low = pair.low;
              availablePairsObj[element.market.toLowerCase()].volume =
                element.volume;
              availablePairsObj[element.market.toLowerCase()].volume_fromCur =
                volume_fromCur;

              pair = availablePairsObj[element.market.toLowerCase()];

              await query_helper.updateData(
                pairsDB,
                "many",
                { pair: pair.pair },
                {
                  change: newChange,
                  changeValue: changeValue,
                  price: element.last_price,
                  lastPrice: pair.price,
                  high: element.high,
                  low: element.low,
                  volume: element.volume,
                  volume_fromCur,
                }
              );
              // await query_helper.updateData(pairsDB, 'many', { pair: pair.pair }, {change: 0, changeValue: 0, price: 0, lastPrice: 0, high: 0, low: 0})
            }
          }
        }
      }
      common.setUsdtValues(usdtValues);
    }
  } catch (e) {
    console.log("tickerUpdate", e);
  }
}

exports.unAvailablePairsUpdate = async (updatedData = {}, options = {}) => {
  const { from = "spot", action = "add" } = options;

  let OrderBookDBSel;
  let PairDBSel;

  if (from == "spot") {
    OrderBookDBSel = OrderBookDB;
    PairDBSel = pairsDB;
  }

  console.log("unAvailablePairsUpdate : ", {updatedData, options});

  if (updatedData.pair) {
    // autoOrderExecute detail correction
    if (updatedData.autoOrderExecute == 1) {
      if (availablePairs.indexOf(updatedData.pair) == -1) {
        updatedData.autoOrderExecute = 0;
        await query_helper.updateData(
          PairDBSel,
          "one",
          {
            _id: mongoose.Types.ObjectId(updatedData._id),
          },
          {
            autoOrderExecute: 0,
          }
        );
      }
    }

    // Order book table record checking
    if (updatedData.autoOrderExecute == 0) {
      const findData = { pair: updatedData.pair };
      let getOrderBook = await query_helper.findoneData(
        OrderBookDBSel,
        findData,
        {}
      );
      if (getOrderBook.status === false) {
        let insertData = {
          pair: updatedData.pair,
          bids: [],
          asks: [],
          userbids: [],
          userasks: [],
        };
        await query_helper.insertData(OrderBookDBSel, insertData);
      } else {
        let update = { bids: [], asks: [] };
        await query_helper.updateData(
          OrderBookDB,
          "one",
          { pair: updatedData.pair },
          update
        );
      }
    }

    // socket checking & avai, un-avail update
    const getPairData = await PairDBSel.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(updatedData._id),
        },
      },
      {
        $lookup: {
          from: "Currency",
          localField: "fromCurrency",
          foreignField: "_id",
          as: "frompair",
        },
      },
      {
        $lookup: {
          from: "Currency",
          localField: "toCurrency",
          foreignField: "_id",
          as: "topair",
        },
      },
      {
        $project: {
          from_symbol_id: "$fromCurrency",
          to_symbol_id: "$toCurrency",
          pair: "$pair",
          decimalValue: "$decimalValue",
          enableBuySell: "$enableBuySell",
          change: "$change",
          volume: "$volume",
          frompair: "$frompair",
          topair: "$topair",
          fromcurrency: "$frompair",
          tocurrency: "$topair",
          _id: "$_id",
          price: "$price",
          lastPrice: "$lastPrice",
          marketStatus: "$marketStatus",
          autoOrderExecute: "$autoOrderExecute",
          getOldPrice: "$getOldPrice",
          status: "$status",
          enableTradeHistory: "$enableTradeHistory",
          marketPrice: "$marketPrice",
          changePercentage: "$changePercentage",
          orderDataMin: "$orderDataMin",
          orderDataMax: "$orderDataMax",
          minTrade: "$minTrade",
          fromusd: { $arrayElemAt: ["$frompair.USDvalue", 0] },
          tousd: { $arrayElemAt: ["$topair.USDvalue", 0] },
          fromDecimal: { $arrayElemAt: ["$frompair.siteDecimal", 0] },
          toDecimal: "$decimalValue",
          maxLiquidityQuantity: "$maxLiquidityQuantity",
          quantityLiquidityCorrection: "$quantityLiquidityCorrection",
          tfhrVolLiquidityCorrection: "$tfhrVolLiquidityCorrection",
        },
      },
    ]);
    if (getPairData) {
      if (getPairData.length > 0) {
        getPairData.forEach((element) => {
          element.frompair = element.frompair[0];
          element.topair = element.topair[0];

          if (availablePairs.indexOf(element.pair) >= 0) {
            let symbol = element.pair.split("_").join("").toLowerCase();
            availablePairsObj[symbol] = element;
            const ecode =
              availablePairsDetails[element.pair] &&
              availablePairsDetails[element.pair].ecode
                ? availablePairsDetails[element.pair].ecode
                : "B";
            let channelName =
              ecode +
              "-" +
              element.pair.split("_")[0] +
              "_" +
              element.pair.split("_")[1];
            // let channelName = (element.pair.split('_')[1] == 'INR' ? 'I' : 'B') +"-"+element.pair.split('_')[0]+'_'+element.pair.split('_')[1];
            if (element.autoOrderExecute == 1 && element.status == 1) {
              console.log("join : ", { channelName });
              socket.emit("join", {
                channelName: channelName,
              });
            } else {
              console.log("leave : ", { channelName });
              socket.emit("leave", {
                channelName: channelName,
              });
            }
          } else {
            if (
              updatedData &&
              updatedData._id &&
              unAvailablePairs &&
              unAvailablePairs.length > 0
            ) {
              const idx_unavail = unAvailablePairs.findIndex(
                (e) => e._id && e._id.toString() === updatedData._id.toString()
              );
              if (idx_unavail > -1) {
                unAvailablePairs[idx_unavail].autoOrderExecute =
                  updatedData.autoOrderExecute;
              } else {
                unAvailablePairs.push(element);
              }
            } else {
              unAvailablePairs.push(element);
            }
          }
        });
      }
    }
  }
};

let socketEndpoint = "http://stream.coindcx.com";
let socket = io.connect(socketEndpoint, {
  transports: ["websocket"],
  origin: "*",
});

async function wazirxWS() {
  try {
    console.log("wazirxWS : ");

    socketEndpoint = "https://stream.coindcx.com";
    socket = io.connect(socketEndpoint, {
      transports: ["websocket"],
      origin: "*",
    });

    updateExceptPairs_cronInit = 0;
    socket.connect();

    socket.on("depth-update", (response) => {
      let priceChange = common.getUsdtRateChange();
      let resData = JSON.parse(response.data);
      if (resData && resData.s && resData.s.toLowerCase()) {
        const orderwith = oArrayDO.indexOf(resData.s.toLowerCase());
        // console.log("depth-update : ", resData.s.toLowerCase(), {orderwith}, resData);
        if (orderwith == -1) {
          // console.log("depth-update action");
          oArrayDO.push(resData.s.toLowerCase());
          setTimeout(_intervalFuncDO, 3000, resData.s.toLowerCase());
          if (Object.keys(availablePairsObj).length > 0) {
            let pair = availablePairsObj[resData.s.toLowerCase()];
            if (pair && Object.keys(pair).length > 0) {
              if (
                pair.autoOrderExecute === 1 ||
                pair.autoOrderExecute === "1"
              ) {
                resData.a.forEach(async (pairElement, key) => {
                  if (priceChange.changeValue > 0) {
                    let changeVal = priceChange.changePer * resData.a[key][0];
                    resData.a[key][0] = +changeVal;
                  }
                });
                resData.b.forEach(async (pairElement1, key1) => {
                  if (priceChange.changeValue > 0) {
                    let changeVal = priceChange.changePer * resData.b[key1][0];
                    resData.b[key1][0] = +changeVal;
                  }
                });
                if (common.getSiteDeploy() == 0) {
                  runningWazirxCronPairs[pair] = {
                    ask: +resData.a[0][0],
                    bid: +resData.b[0][0],
                  };
                }
                trade.updateWazirxTrades(
                  "depth",
                  pair,
                  resData,
                  percentageChange
                );
              }
            }
          }
        }
      }
    });

    socket.on("new-trade", (response) => {
      // console.log("new-trade : ", new Date());
      let priceChange = common.getUsdtRateChange();
      let resData = JSON.parse(response.data);
      if (Object.keys(availablePairsObj).length > 0) {
        let pair = availablePairsObj[resData.s.toLowerCase()];
        // console.log("new-trade : ", resData.s.toLowerCase(), {resData, pair});
        if (pair && Object.keys(pair).length > 0) {
          pair.lastPrice = pair.price;
          if (pair.autoOrderExecute === 1 || pair.autoOrderExecute === "1") {
            if (pair.pair == "USDT_INR") {
              common.setUsdtRate(+resData.p);
            }
            if (priceChange.changeValue > 0) {
              let changeVal = priceChange.changePer * resData.p;
              resData.p = +changeVal;
            }
            pair.lastPrice = +resData.p;
            pair.price = +resData.p;
            availablePairsObj[resData.s.toLowerCase()] = pair;
            resData.q = (+resData.q * percentageChange) / 100;
            resData.trades = [
              {
                p: resData.p,
                q: resData.q,
                m: resData.m,
                E: resData.T,
              },
            ];

            if (pair.pair) {
              const orderwith = oArray.indexOf(pair.pair.toString());
              if (orderwith == -1) {
                // console.log("new-trade action");
                trade.updateWazirxTrades(
                  "trades",
                  pair,
                  resData.trades,
                  percentageChange
                );
                oArray.push(pair.pair.toString());
                setTimeout(_intervalFuncNT, 7000, pair.pair.toString());
                setTimeout(() => {
                  trade.stopOrderGet(pair.price, pair);
                }, 8000);
              }
            }
          }
        }
      }
    });

    // var ws = new WebSocket('wss://stream.wazirx.com/stream');
    socket.on("connect", async function () {
      console.log(socket.id, "socket.id : coindcx");
      const response1 = await getJSON(
        "https://api.coindcx.com/exchange/ticker"
      );
      const response2 = await getJSON(
        "https://api.coindcx.com/exchange/v1/markets_details"
      );
      if (response1.length > 0 && response2.length > 0) {
        usdtValues["usdt"] = 1;
        let responseObj = {};
        response2.map(function (response2data) {
          // console.log("response2data.ecode : ", response2data.ecode);
          responseObj[response2data.coindcx_name] = {
            from: response2data.target_currency_short_name,
            to: response2data.base_currency_short_name,
            ecode: response2data.ecode,
          };
        });
        response1.map(function (response1data) {
          if (typeof responseObj[response1data.market] == "object") {
            const fromTo =
              responseObj[response1data.market].from +
              "_" +
              responseObj[response1data.market].to;
            availablePairs.push(fromTo);
            availablePairsDetails[fromTo] = responseObj[response1data.market];
            if (responseObj[response1data.market].to == "USDT") {
              usdtValues[responseObj[response1data.market].from.toLowerCase()] =
                response1data.last_price;
            }
            if (
              responseObj[response1data.market].to == "INR" &&
              responseObj[response1data.market].from == "USDT"
            ) {
              usdtValues[responseObj[response1data.market].to.toLowerCase()] =
                1 / response1data.last_price;
            }
          }
        });
        common.setUsdtValues(usdtValues);
        pairsDB.aggregate(
          [
            {
              $match: {
                status: 1,
              },
            },
            {
              $lookup: {
                from: "Currency",
                localField: "fromCurrency",
                foreignField: "_id",
                as: "frompair",
              },
            },
            {
              $lookup: {
                from: "Currency",
                localField: "toCurrency",
                foreignField: "_id",
                as: "topair",
              },
            },
            {
              $project: {
                from_symbol_id: "$fromCurrency",
                to_symbol_id: "$toCurrency",
                pair: "$pair",
                decimalValue: "$decimalValue",
                enableBuySell: "$enableBuySell",
                change: "$change",
                volume: "$volume",
                frompair: "$frompair",
                topair: "$topair",
                fromcurrency: "$frompair",
                tocurrency: "$topair",
                _id: "$_id",
                price: "$price",
                lastPrice: "$lastPrice",
                marketStatus: "$marketStatus",
                autoOrderExecute: "$autoOrderExecute",
                getOldPrice: "$getOldPrice",
                status: "$status",
                enableTradeHistory: "$enableTradeHistory",
                marketPrice: "$marketPrice",
                changePercentage: "$changePercentage",
                orderDataMin: "$orderDataMin",
                orderDataMax: "$orderDataMax",
                minTrade: "$minTrade",
                fromusd: { $arrayElemAt: ["$frompair.USDvalue", 0] },
                tousd: { $arrayElemAt: ["$topair.USDvalue", 0] },
                fromDecimal: { $arrayElemAt: ["$frompair.siteDecimal", 0] },
                toDecimal: "$decimalValue",
                maxLiquidityQuantity: "$maxLiquidityQuantity",
                quantityLiquidityCorrection: "$quantityLiquidityCorrection",
                tfhrVolLiquidityCorrection: "$tfhrVolLiquidityCorrection",
              },
            },
          ],
          async (err, getPairData) => {
            if (!err) {
              availablePairsObj = {};
              unAvailablePairs = [];
              if (getPairData.length > 0) {
                getPairData.forEach((element) => {
                  element.frompair = element.frompair[0];
                  element.topair = element.topair[0];
                  if (availablePairs.indexOf(element.pair) >= 0) {
                    let symbol = element.pair.split("_").join("").toLowerCase();
                    availablePairsObj[symbol] = element;
                    const ecode = availablePairsDetails[element.pair].ecode;
                    // let channelName = (element.pair.split('_')[1] == 'INR' ? 'I' : 'B') +"-"+element.pair.split('_')[0]+'_'+element.pair.split('_')[1];
                    let channelName =
                      ecode +
                      "-" +
                      element.pair.split("_")[0] +
                      "_" +
                      element.pair.split("_")[1];
                    if (updateExceptPairs_cronInit === 0) {
                      if (element.autoOrderExecute == 1) {
                        console.log("join : ", { channelName });
                        socket.emit("join", {
                          channelName: channelName,
                        });
                      }
                    }
                  } else {
                    unAvailablePairs.push(element);
                  }
                });
                updateExceptPairs_cronInit = 1;
              }
            }
          }
        );
      }
    });

    socket.on("connect_error", (err) => {
      console.log("coinDCX socket connect_error : ", err);
    });

    socket.on("disconnect", async function () {
      console.log("coinDCX socket disconnected : ");
      updateExceptPairs_cronInit = 0;
      // socket.emit('disconnected');
      socket.connect();
    });

    // ws.on('message', function(data, flags) {
    // 	if(typeof JSON.parse(data.toString()).stream == 'string') {
    // 		let stream = JSON.parse(data.toString()).stream;
    // 		let resData = JSON.parse(data.toString()).data;
    // 		let priceChange = common.getUsdtRateChange();
    // 		if(typeof resData == 'object') {
    // 			if(stream.split('@')[1] == 'trades' || stream.split('@')[1] == 'depth') {
    // 				let pair = availablePairsObj[stream.split('@')[0]];
    // 				if(stream.split('@')[1] == 'trades') {
    // 					pair.lastPrice = pair.price;
    // 					if(pair.pair == 'USDT_INR') {
    // 						common.setUsdtRate(+(resData.trades[0].p));
    // 					}
    // 					if(priceChange.changeValue > 0) {
    // 						let changeVal = priceChange.changePer * resData.trades[0].p;
    // 						resData.trades[0].p = +(changeVal);
    // 					}
    // 					pair.price = +((resData.trades[0].p));
    // 					availablePairsObj[stream.split('@')[0]] = pair;
    // 					resData.trades[0].q = (+resData.trades[0].q * percentageChange)/100;
    // 					trade.updateWazirxTrades('trades', pair, resData.trades, percentageChange);
    // 				} else {
    // 					resData.a.forEach(async (pairElement, key) => {
    // 						if(priceChange.changeValue > 0) {
    // 							let changeVal = priceChange.changePer * resData.a[key][0];
    // 							resData.a[key][0] = +(changeVal);
    // 						}
    // 					});
    // 					resData.b.forEach(async (pairElement1, key1) => {
    // 						if(priceChange.changeValue > 0) {
    // 							let changeVal = priceChange.changePer * resData.b[key1][0];
    // 							resData.b[key1][0] = +(changeVal);
    // 						}
    // 					});
    // 					if(common.getSiteDeploy() == 0) {
    // 						runningWazirxCronPairs[pair] = {
    // 							ask: +resData.a[0][0],
    // 							bid: +resData.b[0][0]
    // 						}
    // 					}
    // 					trade.updateWazirxTrades('depth', pair, resData, percentageChange);
    // 				}
    // 			} else {
    // 				if(stream == '!ticker@arr') {
    // 					resData.forEach(async element => {
    // 						if(element.U == 'usdt') {
    // 							usdtValues[element.u] = element.c;
    // 						}
    // 						let pair = availablePairsObj[element.s];
    // 						if(typeof pair == 'object') {
    // 							if(priceChange.changeValue > 0) {
    // 								element.o = priceChange.changePer * +(element.o);
    // 								element.h = priceChange.changePer * +(element.h);
    // 								element.l = priceChange.changePer * +(element.l);
    // 								element.c = priceChange.changePer * +(element.c);
    // 							}
    // 							const openPrice = +element.o;
    // 							const newChange = (((+element.c - openPrice) / openPrice) * 100)
    // 							const changeValue = (!isNaN(+element.c - openPrice) ? +element.c - openPrice : 0)
    // 							availablePairsObj[element.s].change = newChange;
    // 							if(+element.q > 0) {
    // 								availablePairsObj[element.s].volume = +(+((+element.q * 115)/100).toFixed(pair.fromDecimal));
    // 							}
    // 							const orderwith = orderedPairs.indexOf(pair.pair);
    // 							if (orderwith == -1) {
    // 								orderedPairs.push(pair.pair);
    // 								setTimeout(_intervalFunc, 15000, pair.pair);
    // 								await query_helper.updateData(pairsDB, 'many', { pair: pair.pair }, {change: newChange, changeValue: changeValue, price: element.c, lastPrice: pair.price, high: element.h, low: element.l})
    // 							}
    // 						}
    // 					});
    // 					common.setUsdtValues(usdtValues);
    // 				}
    // 			}
    // 		}
    // 	}
    // });
    // ws.onclose = function(e) {
    // 	console.log('wazirx socket closed try again');
    // 	setTimeout(function() {
    // 		wazirxWS();
    // 	}, 1000);
    // }
    // ws.onerror = function(err) {
    // 	console.error('wazirx socket errored', err)
    // 	ws.close();
    // };
  } catch (err) {
    console.log("wazirxWS : ", err);
  }
}

async function tradeOrderData() {
  try {
    let getPairData = await query_helper.findData(
      pairsDB,
      {},
      { pair: 1 },
      { _id: -1 },
      0
    );
    if (getPairData.status) {
      getPairData.msg.forEach((element) => {
        updTradeData(element);
      });
    }
  } catch (e) {
    console.log("tradeOrderData", e);
  }
}

async function updTradeData(pairData) {
  let pairs = pairData.pair.split("_");
  try {
    if (pairs[0] && pairs[1]) {
      let ohlcURL =
        "https://public.coindcx.com/market_data/candles?pair=" +
        (pairs[1] == "INR" ? "I" : "B") +
        "-" +
        pairData.pair +
        "&interval=";
      try {
        //let interval = ['1m', '5m', '15m', '30m', '1h', '1d', '3d', '1w', '1M'];
        let interval = ["1m", "1d"];
        let records = [];
        interval.forEach(async (element, key) => {
          try {
            const response1 = await getJSON(ohlcURL + element);
            if (response1.length > 0) {
              records = records.concat(response1);
            }
          } catch (e) {
            console.log("updTradeData", e);
          }
          if (key + 1 == interval.length) {
            let orders = [];
            for (let inc = 0; inc < records.length; inc++) {
              let list = records[inc];
              let ordertype = ["buy", "sell"];
              let recordsInsert = {
                price: list.open,
                open: list.open,
                high: list.high,
                low: list.low,
                close: list.close,
                volume: list.volume,
                total: list.volume * list.open,
                type: ordertype[Math.floor(Math.random() * ordertype.length)],
                pair: pairData._id,
                chartType: "Chart",
                pairName: pairData.pair,
                time: new Date(list.time),
              };
              orders.push(recordsInsert);
            }
            if (orders.length > 0) {
              await query_helper.DeleteMany(tradeChartDB, {
                pairName: pairData.pair,
              });
              try {
                await query_helper.insertManyData(tradeChartDB, orders);
              } catch (e) {
                console.log("updTradeData", e);
              }
            }
          }
        });
      } catch (e) {
        console.log("updTradeData", e);
      }
    }
  } catch (e) {
    console.log("updTradeData", e);
  }
}

let cronPairs = [];
function insertNewData() {
  try {
    pairsDB.aggregate(
      [
        {
          $match: {
            status: 1,
            enableTradeHistory: { $ne: 0 },
          },
        },
        {
          $lookup: {
            from: "Currency",
            localField: "fromCurrency",
            foreignField: "_id",
            as: "frompair",
          },
        },
        {
          $lookup: {
            from: "Currency",
            localField: "toCurrency",
            foreignField: "_id",
            as: "topair",
          },
        },
        {
          $project: {
            from_symbol_id: "$fromCurrency",
            to_symbol_id: "$toCurrency",
            pair: "$pair",
            decimalValue: "$decimalValue",
            enableBuySell: "$enableBuySell",
            change: "$change",
            frompair: "$frompair",
            topair: "$topair",
            fromcurrency: "$frompair",
            tocurrency: "$topair",
            _id: "$_id",
            price: "$price",
            lastPrice: "$lastPrice",
            marketStatus: "$marketStatus",
            autoOrderExecute: "$autoOrderExecute",
            getOldPrice: "$getOldPrice",
            status: "$status",
            enableTradeHistory: "$enableTradeHistory",
            marketPrice: "$marketPrice",
            changePercentage: "$changePercentage",
            orderDataMin: "$orderDataMin",
            orderDataMax: "$orderDataMax",
            fromusd: { $arrayElemAt: ["$frompair.USDvalue", 0] },
            tousd: { $arrayElemAt: ["$topair.USDvalue", 0] },
          },
        },
      ],
      async (err, result) => {
        if (result.length > 0) {
          let symbols = {};
          let symbolValue = "";
          cronPairs = [];
          result.forEach((element) => {
            symbols[element.fromcurrency[0].currencySymbol] =
              element.fromcurrency[0].apiid;
            symbolValue +=
              symbolValue == ""
                ? element.fromcurrency[0].apiid
                : "," + element.fromcurrency[0].apiid;
            cronPairs.push({
              pair: element.pair,
              price: element.price,
              lastPrice: element.lastPrice,
              decimalValue: element.decimalValue,
              _id: element._id,
              change: element.change,
              enableBuySell: element.enableBuySell,
              changePercentage: element.changePercentage,
              fromCurrency: {
                siteDecimal: element.fromcurrency[0].siteDecimal,
              },
            });
          });
          const response1 = await getJSON(
            "https://api.wazirx.com/api/v2/tickers"
          );
          if (response1) {
            let wazirxPrice = {};
            let ownPairs = {};
            for (var key in response1) {
              ownPairs[key] = response1[key].last;
              if (response1[key].quote_unit == "usdt" || key == "usdtinr") {
                if (response1[key].last > 0) {
                  if (key == "usdtinr") {
                    wazirxPrice.inr = (1 / response1[key].last).toFixed(8);
                  } else {
                    wazirxPrice[response1[key].base_unit] = response1[key].last;
                  }
                }
              }
            }
            trade.updateOrderPrice(result, symbols, wazirxPrice, ownPairs, 0);
          }
        }
      }
    );
  } catch (e) {
    console.log("insertNewData", e);
  }
}

function deleteOldData() {
  try {
    var d = new Date();
    d.setDate(d.getDate() - 5);
    var project = {
      _id: 0,
      Date: "$Date",
      low: "$low",
      high: "$high",
      open: "$open",
      close: "$close",
      volume: "$volume",
      pairName: "$pairName",
      pair: "$pair",
      count: "$count",
    };
    tradeChartDB
      .aggregate([
        {
          $match: {
            time: {
              $lt: d,
            },
          },
        },
        {
          $group: {
            _id: {
              year: {
                $year: "$time",
              },
              month: {
                $month: "$time",
              },
              day: {
                $dayOfMonth: "$time",
              },
              pairName: "$pairName",
            },
            count: {
              $sum: 1,
            },
            pairName: { $first: "$pairName" },
            pair: { $first: "$pair" },
            Date: { $first: "$time" },
            low: { $min: "$price" },
            high: { $max: "$price" },
            open: { $first: "$price" },
            close: { $last: "$price" },
            volume: { $sum: "$price" },
          },
        },
        {
          $project: project,
        },
        {
          $sort: {
            Date: -1,
          },
        },
      ])
      .exec(function (err, result) {
        if (!err && result.length > 0) {
          let inc = 0;
          for (let i = 0; i < result.length; i++) {
            if (result[i].count > 1) {
              const d = new Date(result[i].Date);
              let yesterday = new Date(result[i].Date);
              let today = new Date(d.setDate(d.getDate() + 1));
              yesterday.setHours(0);
              yesterday.setMinutes(0);
              yesterday.setSeconds(0);
              yesterday.getMilliseconds(0);
              today.setHours(0);
              today.setMinutes(0);
              today.setSeconds(0);
              today.getMilliseconds(0);
              deleteAndUpdatePairData(result[i], yesterday, today);
            }
          }
        }
      });
  } catch (e) {
    console.log("deleteOldData", e);
  }
}

async function deleteOldWazirxData() {
  try {
    var d = new Date();
    d.setMinutes(d.getMinutes() - 10);
    await query_helper.DeleteMany(tradeChartDB, {
      time: { $lt: d },
      chartType: "Wazirx",
    });
    return true;
  } catch (e) {
    console.log("deleteOldWazirxData", e);
    return true;
  }
}

async function deleteOldBybitData() {
  try {
    var d = new Date();
    d.setMinutes(d.getMinutes() - 1);
    await query_helper.DeleteMany(TradeChartUSDTPerpetual, {
      time: { $lt: d },
      chartType: "Bybit",
    });
    return true;
  } catch (e) {
    console.log("deleteOldBybitData", e);
    return true;
  }
}

function deleteAndUpdatePairData(list, time, today) {
  try {
    let pair = list.pairName;
    let pairid = list.pair;
    let ordertype = ["buy", "sell"];
    let records = {
      price: list.open,
      open: list.open,
      high: list.high,
      low: list.low,
      close: list.close,
      volume: list.volume,
      total: list.volume * list.open,
      type: ordertype[Math.floor(Math.random() * ordertype.length)],
      pair: pairid,
      pairName: pair,
      time: time,
    };
    tradeChartDB
      .deleteMany({ time: { $gte: time, $lt: today }, pairName: pair })
      .exec(function (err, delData) {
        tradeChartDB.create(records, function (Err, resData) {});
      });
  } catch (e) {
    console.log("deleteAndUpdatePairData", e);
  }
}

function fixedState(value, decimal) {
  return parseFloat(value).toFixed(decimal);
}

async function updateCronPrice() {
  let reqUrl = "";
  try {
    reqUrl = "https://api.wazirx.com/sapi/v1/ticker/24hr?symbol=usdtinr";
    let usdtusdPrice = 1;
    const usdtTickers = await getJSON(reqUrl);
    if (usdtTickers) {
      let usdtPrice = usdtTickers.lastPrice;
      let inrPrice = 1 / usdtTickers.lastPrice;
      let pairDetail = [];
      const pairData = await query_helper.findData(
        pairsDB,
        { status: 1 },
        {},
        { _id: -1 },
        0
      );

      if (pairData.status && pairData.msg && pairData.msg.length > 0) {
        pairDetail = pairData.msg;
      }

      let resData = await query_helper.findData(
        Currency,
        { status: 1 },
        {},
        { _id: -1 },
        0
      );
      if (resData.status && resData.msg.length > 0) {
        resData = resData.msg;
        let cryptoIds = [];
        let cryptoNoIds = [];
        let fiatIds = [];
        let clists = {};
        let tetherId = 0;
        for (var i = 0; i < resData.length; i++) {
          if (resData[i].curnType == "Crypto") {
            if (
              resData[i].apiid != "" &&
              resData[i].apiid != "noapiid" &&
              resData[i].apiid != "NA"
            ) {
              cryptoIds.push(resData[i].apiid);
              clists[resData[i].apiid] = i;
            } else {
              cryptoNoIds.push(resData[i].currencySymbol);
              clists[resData[i].currencySymbol] = i;
            }
          } else {
            clists[resData[i].currencySymbol] = i;
            fiatIds.push(resData[i].currencySymbol);
          }
          if (resData[i].currencySymbol == "USDT") {
            tetherId = i;
          }
        }
        if (cryptoIds.length > 0) {
          try {
            reqUrl =
              "https://api.coingecko.com/api/v3/simple/price?ids=" +
              cryptoIds.join(",") +
              "&vs_currencies=USD,BTC,ETH,INR";
            const response = await getJSON(reqUrl);
            if (response) {
              for (let j = 0; j < cryptoIds.length; j++) {
                if (
                  typeof response[cryptoIds[j]] != "undefined" &&
                  typeof response[cryptoIds[j]] != undefined
                ) {
                  let values = response[cryptoIds[j]];
                  if (cryptoIds[j] == "tether") {
                    usdtusdPrice = values.usd;
                  }
                  let curValUpd = {
                    USDvalue: fixedState(values.usd, 8),
                    INRvalue: fixedState(values.usd * usdtPrice, 8),
                    BTCvalue: fixedState(values.btc, 8),
                    ETHvalue: fixedState(values.eth, 8),
                  };
                  query_helper.updateData(
                    Currency,
                    "many",
                    { apiid: cryptoIds[j] },
                    curValUpd
                  );
                }
              }
            }
          } catch (e) {
            console.log("updateCronPrice", e);
          }
          reqUrl =
            "https://api.coingecko.com/api/v3/simple/price?ids=tether,bitcoin,ethereum&vs_currencies=" +
            fiatIds.join(",");
          // console.log("updateCronPrice 3 : ", {reqUrl});
          const response1 = await getJSON(reqUrl);
          try {
            if (response1) {
              for (let j = 0; j < fiatIds.length; j++) {
                let upd = {};
                if (
                  typeof response1["tether"][fiatIds[j].toLowerCase()] !=
                    "undefined" &&
                  typeof response1["tether"][fiatIds[j].toLowerCase()] !=
                    undefined
                ) {
                  if (fiatIds[j].toLowerCase() != "inr") {
                    upd.USDvalue = fixedState(
                      1 / response1["tether"][fiatIds[j].toLowerCase()],
                      8
                    );
                  } else {
                    upd.USDvalue = inrPrice;
                  }
                }
                if (
                  typeof response1["bitcoin"][fiatIds[j].toLowerCase()] !=
                    "undefined" &&
                  typeof response1["bitcoin"][fiatIds[j].toLowerCase()] !=
                    undefined
                ) {
                  upd.BTCvalue = fixedState(
                    1 / response1["bitcoin"][fiatIds[j].toLowerCase()],
                    8
                  );
                }
                if (
                  typeof response1["ethereum"][fiatIds[j].toLowerCase()] !=
                    "undefined" &&
                  typeof response1["ethereum"][fiatIds[j].toLowerCase()] !=
                    undefined
                ) {
                  upd.ETHvalue = fixedState(
                    1 / response1["ethereum"][fiatIds[j].toLowerCase()],
                    8
                  );
                }
                await query_helper.updateData(
                  Currency,
                  "many",
                  { currencySymbol: fiatIds[j] },
                  upd
                );
                if (
                  typeof clists[fiatIds[j]] != "undefined" &&
                  typeof clists[fiatIds[j]] != undefined &&
                  resData[clists[cryptoIds[j]]] != undefined
                ) {
                  if (
                    typeof upd.USDvalue != "undefined" &&
                    typeof upd.USDvalue != undefined
                  ) {
                    resData[clists[cryptoIds[j]]].USDvalue = upd.USDvalue;
                  }
                  if (
                    typeof upd.BTCvalue != "undefined" &&
                    typeof upd.BTCvalue != undefined
                  ) {
                    resData[clists[cryptoIds[j]]].BTCvalue = upd.BTCvalue;
                  }
                  if (
                    typeof upd.ETHvalue != "undefined" &&
                    typeof upd.ETHvalue != undefined
                  ) {
                    resData[clists[cryptoIds[j]]].ETHvalue = upd.ETHvalue;
                  }
                }
              }
            }
          } catch (e) {
            console.log("updateCronPrice", e);
          }

          if (cryptoNoIds.length > 0) {
            let tetherValue = resData[tetherId];
            for (let j = 0; j < cryptoNoIds.length; j++) {
              if (
                typeof clists[cryptoNoIds[j]] != "undefined" &&
                typeof clists[cryptoNoIds[j]] != undefined
              ) {
                let upd = {};

                let eqValue = 1 / resData[clists[cryptoNoIds[j]]].USDvalue;
                const currencySymbol =
                  resData[clists[cryptoNoIds[j]]].currencySymbol;
                const usdtPairIndex = pairDetail.findIndex(
                  (e) => e.pair == currencySymbol + "_USDT"
                );

                if (usdtPairIndex > 0) {
                  eqValue = pairDetail[usdtPairIndex].price * usdtusdPrice;
                  upd.USDvalue = eqValue;
                } else {
                  const pairIndex = pairDetail.findIndex(
                    (e) => e.pair == currencySymbol + "_INR"
                  );
                  if (pairIndex > 0) {
                    eqValue =
                      (pairDetail[pairIndex].price * usdtusdPrice) / usdtPrice;
                    upd.USDvalue = eqValue;
                  }
                }

                upd.BTCvalue = tetherValue.BTCvalue * eqValue;
                upd.ETHvalue = tetherValue.ETHvalue * eqValue;
                upd.INRvalue = tetherValue.INRvalue * eqValue;
                query_helper.updateData(
                  Currency,
                  "many",
                  { currencySymbol: cryptoNoIds[j] },
                  upd
                );
              }
            }
          }
        }
      }
    }
  } catch (e) {
    console.log("updateCronPrice 1", e);
  }
}

if (config.sectionStatus && config.sectionStatus.spotTradeCron != "Disable") {
  // cron start
  changeUsdt();
  wazirxWS();

  let cronprocessWithdrawalRunning = false;
  cron.schedule("*/5 * * * *", async (req, res) => {
    if (cronprocessWithdrawalRunning) {
      return true;
    }
    cronprocessWithdrawalRunning = true;
    await customerWalletController.processWithdrawal();
    cronprocessWithdrawalRunning = false;
  });

  let cronExecuteOrdersRunning = false;
  cron.schedule("*/5 * * * * *", async (req, res) => {
    if (cronExecuteOrdersRunning) {
      return true;
    }
    cronExecuteOrdersRunning = true;
    if (Object.keys(runningWazirxCronPairs).length > 0) {
      for (var key in p) {
        await trade.cronExecuteOrders(p[key].ask, p[key].bid, key);
      }
    }
    cronExecuteOrdersRunning = false;
  });

  let cronliquidityCheckingRunning = false;
  cron.schedule("* * * * *", async (req, res) => {
    if (cronliquidityCheckingRunning) {
      return true;
    }
    cronliquidityCheckingRunning = true;
    await tickerUpdate();
    await liquidityChecking();
    cronliquidityCheckingRunning = false;
  });

  let updateCronPriceRunning = false;
  cron.schedule("* * * * *", async (req, res) => {
    if (updateCronPriceRunning) {
      return true;
    }
    updateCronPriceRunning = true;
    await updateCronPrice();
    updateCronPriceRunning = false;
  });

  let cronCancelOrderRunning = false;
  cron.schedule("*/5 * * * * *", async (req, res) => {
    if (cronCancelOrderRunning) {
      return true;
    }
    cronCancelOrderRunning = true;
    await p2pHelper.cronCancelOrder();
    cronCancelOrderRunning = false;
  });

  let deleteOldData1Running = false;
  cron.schedule("*/10 * * * * *", async (req, res) => {
    if (deleteOldData1Running) {
      return true;
    }
    deleteOldData1Running = true;
    await deleteOldWazirxData();
    await deleteOldBybitData();
    deleteOldData1Running = false;
  });

  let deleteOldDataRunning = false;
  cron.schedule("0 0 */3 * * *", (req, res) => {
    if (deleteOldDataRunning) {
      return true;
    }
    deleteOldDataRunning = true;
    deleteOldData();
    deleteOldDataRunning = false;
  });

  // cron.schedule("*/30 * * * * *",(req,res)=>{
  //     if(unAvailablePairs.length > 0 && updateExceptPairs_cronInit === 0) {
  //         unAvailablePairs.forEach(element => {
  // 			trade.updateExceptPairs(element, percentageChange);
  //         });
  //     }
  // });

  setTimeout(function () {
    // changeUsdt();
    // wazirxWS();
    updateCronPrice();
  }, 10000);

  // production
  // const BTCXRPCoinChkEnv = "development";
  // if(process.env.NODE_ENV == BTCXRPCoinChkEnv) {
  // 	const BTCCOIN = require('../helpers/CoinTransactions/BTC.js');
  // 	const XRPCOIN = require('../helpers/CoinTransactions/XRP.js');
  // 	setInterval(function(){
  // 		if(common.getSiteDeploy() == 0) {
  // 			BTCCOIN.CoinDeposit();
  // 			XRPCOIN.CoinDeposit();
  // 		}
  // 	}, 60000);
  // }

  // cron end
}
