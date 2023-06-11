const WebSocket = require("ws");

let config = require("../Config/config");
let common = require("../helpers/common");
const trade = require("../helpers/trade");
const { setTimeout } = require("node-bitcoin-rpc");

let runnSockPairsAskBidPri = {};
let updateExceptPairs_cronInit = 0;
let percentageChange = 149;

let allowAll = false;
// let byBitAvailablePairs = [ 'BTC_USDT', 'ETH_USDT', 'SHIB_USDT', 'USDC_USDT' ];
// let byBitAvailablePairs = [ 'SHIB_USDT', 'USDC_USDT' ];
let byBitAvailablePairs = ["BTC_USDT"];

let oArrayRT = [];
function _intervalFuncRT(orderwith) {
  orderwith = orderwith.toString();
  var index = oArrayRT.indexOf(orderwith);
  if (index > -1) {
    oArrayRT.splice(index, 1);
  }
}

let oArrayDU = [];
function _intervalFuncDUNew(orderwith) {
  // console.log("bybit try delete : ", orderwith);
  orderwith = orderwith.toString();
  var index = oArrayDU.indexOf(orderwith);
  if (index > -1) {
    oArrayDU.splice(index, 1);
  }
}

let socketEndpoint = "wss://stream.bybit.com/realtime_public";
let socket;
let socket_OB;

// const byBitFunc = {
//   async consoleChkOne () {
//     try {
//       console.log("33333");
//       setTimeout(function() {
//         console.log("44444");
//       }, 1000);
//     }
//     catch(err) {
//       console.log("----", err);
//     }
//   }
// }

// module.exports = byBitFunc;

exports.consoleChktwo = function () {
  try {
    console.log("bbb 33333");
    setTimeout(function() {
      console.log("bbb 44444");
    }, 1000);
  }
  catch(err) {
    console.log("----", err);
  }
};

exports.socChannelUpd = async function (passData = {}) {
  let { channelName = "", target = "" } = passData;

  // let channelNameUpd = channelName.replace("_", "");
  // args = [];
  // args.push(`trade.${channelNameUpd}`);
  // let subscribe = { op: "subscribe", args: args };
  // socket.send(JSON.stringify(subscribe));
};

exports.connectWS = async function (passData = {}) {
  connectWS_init_RT(passData);
  connectWS_init_OB(passData);
};

async function connectWS_init_RT(passData = {}) {
  let { socketChannel = [] } = passData;
  socket = new WebSocket(socketEndpoint);

  socket.on("open", function open() {
    console.log("ws open");
    socketConnected({
      socketChannel,
      socket,
    });
  });

  socket.on("message", async function incoming(responseData) {
    responseData = JSON.parse(responseData);
    let bybitData = responseData.data;
    if (bybitData && bybitData.length > 0 && responseData.topic) {
      // console.log(responseData.topic);
      let symbol = responseData.topic.replace("trade.", "");
      recentTrade(passData, { resData: responseData, s: symbol });
    }
  });

  socket.on("error", async function () {
    console.log("error");
  });

  socket.on("close", function close() {
    console.log("close");
    connectWS_init();
  });
}

async function connectWS_init_OB(passData = {}) {
  console.log("connectWS_init_OB");
  let { socketChannel = [] } = passData;
  socket_OB = new WebSocket(socketEndpoint);

  socket_OB.on("open", function open() {
    console.log("ws open");
    socketConnected_OB({
      socketChannel,
      socket_OB,
    });
  });

  socket_OB.on('message', async function message(data) {
    let respData = JSON.parse(data.toString());
    if (respData.topic) {
      // console.log(respData.topic);
      let symbol = respData.topic.replace("orderBookL2_25.", "");
      depthUpdate(passData, { respData, symbol });
    }
  });

  socket_OB.on("error", async function () {
    console.log("error");
  });

  socket_OB.on("close", function close() {
    console.log("close");
    connectWS_init();
  });
}

async function socketConnected(passData = {}) {
  let { socketChannel = [], socket } = passData;
  let args = [];
  socketChannel.forEach((channelName) => {
    if (byBitAvailablePairs.indexOf(channelName) > -1 || allowAll == true) {
      let channelNameUpd = channelName.replace("_", "");
      args = [];
      args.push(`trade.${channelNameUpd}`);
      let subscribe = { op: "subscribe", args: args };
      socket.send(JSON.stringify(subscribe));
    }
  });
}

async function socketConnected_OB(passData = {}) {
  let { socketChannel = [], socket_OB } = passData;
  let args = [];
  socketChannel.forEach((channelName) => {
    if (byBitAvailablePairs.indexOf(channelName) > -1 || allowAll == true) {
      let channelNameUpd = channelName.replace("_", "");
      args = [];
      args.push(`orderBookL2_25.${channelNameUpd}`);
      let subscribeOB = { op: "subscribe", args: args };
      socket_OB.send(JSON.stringify(subscribeOB));
    }
  });
}

let orderBooks = {};

async function depthUpdate(passData = {}, responseData) {
  
  let finalData = {};
  
  let { availablePairsObj = {} } = passData;
  let priceChange = common.getUsdtRateChange();
  let { respData, symbol = "" } = responseData;
  // console.log("depthUpdate : ", {s});

  symbol = symbol.toLowerCase();
  symbol = symbol.toString();

  if (symbol) {
    let orderwith = oArrayDU.indexOf(symbol);
    // orderwith = -1;
    if (orderwith == -1) {
      oArrayDU.push(symbol);
      console.log("bybit set delete : ", symbol);
      setTimeout(_intervalFuncDUNew, 2000, symbol);

      if (Object.keys(availablePairsObj).length > 0) {
        let pair = availablePairsObj[symbol];
        if (pair && Object.keys(pair).length > 0) {
          if (pair.autoOrderExecute === 1 || pair.autoOrderExecute === "1") {
            if((respData && respData.type) && (respData.type == 'snapshot' || respData.type == 'delta')) {
              let bybitOB = (orderBooks && orderBooks[symbol]) ? orderBooks[symbol] : [];

              if (respData.type == 'snapshot') {
                bybitOB = respData.data.order_book;
              }
              else if (respData.type == 'delta') {

                if (bybitOB && Array.isArray(bybitOB)) {
                  if (respData.data.delete && respData.data.delete.length > 0 && bybitOB.length > 0) {
                    for (let deleted of respData.data.delete) {
                      let index = bybitOB.findIndex(el => el.price == deleted.price)
                      if (index > -1) {
                        bybitOB.splice(index, 1)
                      }
                    }
                  }
    
                  if (respData.data.update && respData.data.update.length > 0 && bybitOB.length > 0) {
                    for (let updated of respData.data.update) {
                      let index = bybitOB.findIndex(el => el.price == updated.price)
                      if (index > -1) {
                        bybitOB[index] = updated
                      }
                    }
                  }
    
                  if (respData.data.insert && respData.data.insert.length > 0) {
                    bybitOB = [...bybitOB, ...respData.data.insert]
                  }
                }
              }

              orderBooks[symbol] = bybitOB;

              let bybitSellOrder = bybitOB.filter(el => el.side == 'Sell');
              let bybitBuyOrder = bybitOB.filter(el => el.side == 'Buy');

              finalData.a = [];
              finalData.b = [];

              bybitBuyOrder.forEach(async (pairElement, key) => {
                let priVal = +pairElement.price;
                let sizeVal = +pairElement.size;
                if (priceChange.changeValue > 0) {
                  priVal = priceChange.changePer * priVal;
                }
                finalData.a.push([
                  priVal,
                  sizeVal
                ]);
              });

              bybitSellOrder.forEach(async (pairElement, key) => {
                let priVal = +pairElement.price;
                let sizeVal = +pairElement.size;
                if (priceChange.changeValue > 0) {
                  priVal = priceChange.changePer * priVal;
                }
                finalData.b.push([
                  priVal,
                  sizeVal
                ]);
              });

              console.log(JSON.stringify(finalData));

              if (common.getSiteDeploy() == 0) {
                runnSockPairsAskBidPri[pair] = {
                  ask: +finalData.a[0][0],
                  bid: +finalData.b[0][0],
                };
              }
              trade.updateWazirxTrades("depth", pair, finalData, percentageChange);
            }
          }
        }
      }
    }
  }
  else {
    console.log("ssss: ", s);
  }
}

async function recentTrade(passData = {}, responseData) {
  try {
    let { availablePairsObj = {} } = passData;
    let priceChange = common.getUsdtRateChange();
    let { resData, s = "" } = responseData;
    if (resData && resData.data && resData.data[0] && resData.data[0].price) {
      if (Object.keys(availablePairsObj).length > 0) {
        let pair = availablePairsObj[s.toLowerCase()];
        if (pair && Object.keys(pair).length > 0) {
          pair.lastPrice = pair.price;
          if (pair.autoOrderExecute === 1 || pair.autoOrderExecute === "1") {
            let priceVal = +resData.data[0].price;
            let quantityVal = +resData.data[0].size;
            let trade_time_ms = +resData.data[0].trade_time_ms;
            if (pair.pair == "USDT_INR") {
              common.setUsdtRate(priceVal);
            }
            if (priceChange.changeValue > 0) {
              let changeVal = priceChange.changePer * priceVal;
              resData.p = +changeVal;
            }
            pair.lastPrice = priceVal;
            pair.price = priceVal;
            availablePairsObj[s.toLowerCase()] = pair;
            resData.q = (quantityVal * percentageChange) / 100;
            resData.trades = [
              {
                p: priceVal,
                q: quantityVal,
                m: true,
                E: trade_time_ms,
              },
            ];

            if (pair.pair) {
              const orderwith = oArrayRT.indexOf(pair.pair.toString());
              if (orderwith == -1) {
                trade.updateWazirxTrades(
                  "trades",
                  pair,
                  resData.trades,
                  percentageChange
                );
                oArrayRT.push(pair.pair.toString());
                setTimeout(_intervalFuncRT, 2000, pair.pair.toString());
                setTimeout(() => {
                  trade.stopOrderGet(pair.price, pair);
                }, 8000);
              }
            }
          }
        }
      }
    }
    else {
      console.log(resData);
    }
  }
  catch(err) {
    console.log("bybit : rt err : ", err)
  }

    // let tradeDocs = []
    // for (let item of bybitData) {
    //   tradeDocs.push({
    //     'time': new Date(item.timestamp),
    //     'type': item.side == 'Buy' ? 'buy' : 'sell',
    //     'price': item.price,
    //     'volume': item.size,
    //   })
    // }
    // tradeDocs = [...tradeDocs, ...preData]
    // recentTrade[symbol] = tradeDocs
    // socket.sockets.emit('USDTPerpetualRecentTrade', {
    //   'pairName': symbol,
    //   'data': tradeDocs
    // });
}

// if (config.cronStatus != "Disable") {
//   cron.schedule("*/5 * * * * *", (req, res) => {
//     if (Object.keys(runnSockPairsAskBidPri).length > 0) {
//       for (var key in p) {
//         trade.cronExecuteOrders(p[key].ask, p[key].bid, key);
//       }
//     }
//   });
// }
