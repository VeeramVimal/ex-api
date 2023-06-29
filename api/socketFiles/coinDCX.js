const cron = require("node-cron");
let io = require("socket.io-client");

let config = require("../Config/config");
let common = require("../helpers/common");
const trade = require("../helpers/trade");

let runnSockPairsAskBidPri = {};
let updateExceptPairs_cronInit = 0;
let percentageChange = 149;

let oArrayRT = [];
function _intervalFuncRT(orderwith) {
  orderwith = orderwith.toString();
  var index = oArrayRT.indexOf(orderwith);
  if (index > -1) {
    oArrayRT.splice(index, 1);
  }
}

let oArrayDU = [];
function _intervalFuncDU(orderwith) {
  orderwith = orderwith.toString();
  var index = oArrayDU.indexOf(orderwith);
  if (index > -1) {
    oArrayDU.splice(index, 1);
  }
}

let socketEndpoint = "https://stream.coindcx.com";
let socket;

exports.socChannelUpd = async function (passData = {}) {
  let { channelName = "", target = "" } = passData;
  socket.emit(target, { channelName: channelName });
};

exports.connectWS = async function (passData = {}) {
  connectWS_init(passData);
};

async function connectWS_init(passData = {}) {
  let { socketChannel = [] } = passData;
  console.log("connectWS_init : ", { socketChannel });

  socket = io.connect(socketEndpoint, {
    transports: ["websocket"],
    origin: "*",
  });

  updateExceptPairs_cronInit = 0;
  socket.connect();

  // var ws = new WebSocket('wss://stream.wazirx.com/stream');
  socket.on("connect", async function () {
    console.log(socket.id, "socket.id : coindcx", socketChannel);
    socketConnected({socketChannel, socket});
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

  socket.on("depth-update", (response) => {
    console.log("depthUpdate : ");
    depthUpdate(passData, response);
  });

  socket.on("new-trade", (response) => {
    console.log("new-trade : ");
    recentTrade(passData, response);
  });
}

async function socketConnected(passData = {}) {
  try {
    let { socketChannel = [], socket } = passData;
    console.log("socketConnected : ", socketChannel);
    socketChannel.forEach((channelName) => {
      socket.emit("join", {
        channelName: channelName,
      });
    });
  }
  catch(err) {
    console.log("socketConnected err : ", err);
  }
}

async function depthUpdate(passData = {}) {
  try {
    let { availablePairsObj = {}, response } = passData;
    let priceChange = common.getUsdtRateChange();
    let resData = JSON.parse(response.data);
    if (resData && resData.s && resData.s.toLowerCase()) {
      const orderwith = oArrayDU.indexOf(resData.s.toLowerCase());
      if (orderwith == -1) {
        oArrayDU.push(resData.s.toLowerCase());
        setTimeout(_intervalFuncDU, 3000, resData.s.toLowerCase());
        if (Object.keys(availablePairsObj).length > 0) {
          let pair = availablePairsObj[resData.s.toLowerCase()];
          if (pair && Object.keys(pair).length > 0) {
            if (pair.autoOrderExecute === 1 || pair.autoOrderExecute === "1") {
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
                runnSockPairsAskBidPri[pair] = {
                  ask: +resData.a[0][0],
                  bid: +resData.b[0][0],
                };
              }
              trade.updateWazirxTrades("depth", pair, resData, percentageChange);
            }
          }
        }
      }
    }
  }
  catch(err) {
    console.log("depthUpdate err : ", err);
  }
}

async function recentTrade(passData = {}, response) {
  try {
    let { availablePairsObj = {}, response } = passData;
    let priceChange = common.getUsdtRateChange();
    let resData = JSON.parse(response.data);
    if (Object.keys(availablePairsObj).length > 0) {
      let pair = availablePairsObj[resData.s.toLowerCase()];
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
            const orderwith = oArrayRT.indexOf(pair.pair.toString());
            if (orderwith == -1) {
              // console.log("new-trade action");
              trade.updateWazirxTrades(
                "trades",
                pair,
                resData.trades,
                percentageChange
              );
              oArrayRT.push(pair.pair.toString());
              setTimeout(_intervalFuncRT, 7000, pair.pair.toString());
              setTimeout(() => {
                trade.stopOrderGet(pair.price, pair);
              }, 8000);
            }
          }
        }
      }
    }
  }
  catch(err) {
    console.log("recentTrade err : ", err);
  }
}

if (config.cronStatus != "Disable") {
  let cronExecuteOrdersRunning = false
  cron.schedule("*/5 * * * * *", (req, res) => {
    if(cronExecuteOrdersRunning) {
      return true;
    }
    if (Object.keys(runnSockPairsAskBidPri).length > 0) {
      cronExecuteOrdersRunning = true;
      for (var key in p) {
        trade.cronExecuteOrders(p[key].ask, p[key].bid, key);
      }
      cronExecuteOrdersRunning = false;
    }
  });
}
