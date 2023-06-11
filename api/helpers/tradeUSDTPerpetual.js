// import package
const WebSocket = require('ws')
const mongoose = require('mongoose');
const axios = require('axios');

let common = require('./common');
var query_helper = require('./query');
var respMessage_helper = require('./respMessage.json');
var validator = require('node-validator');

// import model
const pairsDB = mongoose.model('USDTPerpetualPair');
const orderDB = mongoose.model('USDTPerpetualOrder');
const positionDB = mongoose.model("USDTPerpetualPosition");
const UserWallet = mongoose.model("UserWallet");
const TradeDB = mongoose.model("USDTPerpetualTrade");
const profitLossDB = mongoose.model("USDTPerpetualProfitLoss");

// import helper
const bybitUSDTCalc = require('./bybit/usdtPerpetual');

let OrderBookDB = mongoose.model('OrderBookFutures');
let usersDB = mongoose.model('Users');

let mapDb = mongoose.model('MappingOrdersFutures');
let tradeChartDb = mongoose.model('TradeChartUSDTPerpetual');
let CurrencyDb = mongoose.model('Currency');
let ReferralDB = mongoose.model('ReferralCommission');
let ProfitDB = mongoose.model('ProfitFutures');
let siteSettings = mongoose.model('SiteSettings');
const Transactions = mongoose.model("Transactions");
const VoucherDB = mongoose.model("Voucher");
const USDMBalanceUpdation = mongoose.model("USDMBalanceUpdation");

var Config = require('../Config/config');

let siteSettingData = {};

let adminDoc = {
  '_id': '640daa81cd50574129530f03'
}

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

async function updateSiteSettings() {
  let settings = await query_helper.findoneData(siteSettings, {}, {})
  siteSettingData = settings.msg;
}
updateSiteSettings();
let oArray = [], activePairs = [], recentTrade = {}, tradeWS;
const volumeBetween = [
  { price: 0.0001, from: 100000000, to: 9999999999, percentage: 10 },
  { price: 0.001, from: 10000000, to: 999999999, percentage: 10 },
  { price: 0.01, from: 1000000, to: 99999999, percentage: 1 },
  { price: 0.1, from: 100000, to: 9999999, percentage: 1 },
  { price: 1, from: 1000, to: 99999, percentage: 1 },
  { price: 10, from: 100, to: 9999, percentage: 0.1 },
  { price: 100, from: 100, to: 50000, percentage: 0.1 },
  { price: 200, from: 10, to: 5000, percentage: 0.1 },
  { price: 1000, from: 1, to: 99, percentage: 0.01 },
  { price: 10000, from: 0.1, to: 9.9, percentage: 0.002 },
  { price: 100000, from: 0.01, to: 0.99, percentage: 0.002 },
  { price: 1000000, from: 0.001, to: 0.099, percentage: 0.002 },
  { price: 1000000, from: 0.0001, to: 0.0099, percentage: 0.002 }
]
var async = require('async');
var mapTrade = function () { };
let _tradeMap = new mapTrade();
var socket = 0;
// here socket connect 
exports.SocketInit = function (socketIO) {
  socket = socketIO;
}
exports.settingsUpdate = function (result) {
  siteSettingData = result;
  socket.sockets.emit('settingsUpdate', result);
}
mapTrade.prototype._intervalFunc = (orderwith) => {
  var index = oArray.indexOf(orderwith);
  if (index > -1) {
    oArray.splice(index, 1);
  }
}
function removeintervalFunc(orderwith) {
  var index = oArray.indexOf(orderwith);
  if (index > -1) {
    oArray.splice(index, 1);
  }
}
/** 
 * orderType, action, pair, price, amount,
*/
exports.createOrder = async function (reqBody) {
  try {
    if (Config.sectionStatus && Config.sectionStatus.perpetualTrade != "Enable") {
      _tradeMap._createResponseUSDTPerpetual({
        "status": false,
        "message": "Trade disabled. Kindly contact admin!",
        "userId": reqBody.userId
      });
    }
    else {
      const userId = reqBody.userId;
      const getUser = await query_helper.findoneData(usersDB, { "_id": mongoose.Types.ObjectId(userId) }, {usdmDisabled: 1});
      if (getUser.status && getUser.msg) {
        const userResult = getUser.msg;
        userResult.usdmDisabled = (typeof userResult.usdmDisabled == 'number' && typeof userResult.usdmDisabled != 'undefined') ? userResult.usdmDisabled : 1;
        if (userResult.usdmDisabled == 1) {
          _tradeMap._createResponseUSDTPerpetual({
            "status": false,
            "message": "Your account disabled for trade. Kindly contact admin!",
            "userId": reqBody.userId
          });
          return true;
        }
        else {
          if (reqBody.orderType == 'limit') {
            if (reqBody.action == 'open') {
              return _tradeMap._limitOrderOpenPosition(reqBody)
            } else if (reqBody.action == 'close') {
              return _tradeMap._limitOrderClosePosition(reqBody)
            }
          } else if (reqBody.orderType == 'market') {
            if (reqBody.action == 'open') {
              return _tradeMap._marketOrderOpenPosition(reqBody)
            } else if (reqBody.action == 'close') {
              return _tradeMap._marketOrderClosePosition(reqBody)
            }
          } else if (reqBody.orderType == 'stopLimit') {
            if (reqBody.action == 'open') {
              return _tradeMap._stopLimitOrderOpenPosition(reqBody)
            }
          } else {
            _tradeMap._createResponseUSDTPerpetual({
              "status": false,
              "message": "Invalid Order type",
              "userId": reqBody.userId
            });
          }
        }
      }
      else {
        _tradeMap._createResponseUSDTPerpetual({
          "status": false,
          "message": "Please login to continue.",
          "userId": reqBody.userId
        });
      }
    }
  } catch (err) {
    console.log('err : usd-m createOrder ', err)
    _tradeMap._createResponseUSDTPerpetual({
      "status": false,
      "message": "Something went wrong! Please try again someother time",
      "userId": reqBody.userId
    });
  }
}

/** 
 * orderType, action, pair, price, amount, leverage, 
*/
mapTrade.prototype._limitOrderOpenPosition = async function (reqBody) {
  try {
    let pairDoc = await pairsDB.findOne(
      { "pair": reqBody.pair, 'status': "active" }
    )
    .populate('fromCurrency')
    .populate('toCurrency');
    if (!pairDoc) {
      return _tradeMap._createResponseUSDTPerpetual({
        "status": false,
        "message": "Invalid pair",
        "userId": reqBody.userId
      });
    }
    reqBody.price = parseFloat(reqBody.price);
    reqBody.amount = parseFloat(reqBody.amount);
    reqBody.leverage = parseFloat(reqBody.leverage);

    let checkSpOrd = await checkTpSlOrder({
      type: reqBody.type,
      isTP: reqBody.isTP,
      isSL: reqBody.isSL,
      tpPrice: reqBody.tpPrice,
      slPrice: reqBody.slPrice,
      price: reqBody.price,
    })
    if (!checkSpOrd.status) {
      return _tradeMap._createResponseUSDTPerpetual({
        "status": false,
        'message': checkSpOrd.message,
        "userId": reqBody.userId
      });
    }

    let status = 'active';
    if (reqBody.type == 'buy' && reqBody.price > pairDoc.askPrice) {
      reqBody.price = pairDoc.askPrice;
      status = 'filled';
    } else if (reqBody.type == 'sell' && reqBody.price < pairDoc.bidPrice) {
      reqBody.price = pairDoc.bidPrice;
      status = 'filled';
    }

    let orderCost = bybitUSDTCalc.orderCost(reqBody.price, reqBody.amount, reqBody.leverage, pairDoc.takerFee, reqBody.type)
    let deductBal = await deductAsset(reqBody.userId, pairDoc.toCurrency.currencyId, orderCost, {
      affetType: "Open Position"
    });
    if (deductBal.status != 'SUCCESS') {
      return _tradeMap._createResponseUSDTPerpetual({
        "status": false,
        "message": "Insufficient balance",
        "userId": reqBody.userId
      });
    }

    let newDoc = new orderDB({
      "userId": reqBody.userId,
      "amount": reqBody.amount,
      "price": reqBody.price,
      "type": reqBody.type,
      "total": reqBody.price * reqBody.amount,
      "orderType": reqBody.orderType,
      "pair": pairDoc._id,
      "pairName": pairDoc.pair,
      "leverage": reqBody.leverage,
      "method": reqBody.method,
      "status": status,
      "fromCurrency": pairDoc.fromCurrency.currencyId,
      "toCurrency": pairDoc.toCurrency.currencyId,
      "action": reqBody.action,
      'isTP': reqBody.isTP,
      'isSL': reqBody.isSL,
      'tpPrice': reqBody.tpPrice,
      'slPrice': reqBody.slPrice,
    })
    let saveDoc = await newDoc.save();

    if(saveDoc && saveDoc._id && deductBal && deductBal.balUpdDet && deductBal.balUpdDet.status && deductBal.balUpdDet.msg) {
      const balUpdId = deductBal.balUpdDet.msg._id;
      await USDMBalanceUpdation.findOneAndUpdate({
        _id: balUpdId
      }, {
        lastId: saveDoc._id
      });
    }

    _tradeMap._createResponseUSDTPerpetual({
      "status": true,
      "message": "Order placed successfully",
      "userId": reqBody.userId
    });

    if (reqBody.type == 'buy' && reqBody.price >= pairDoc.askPrice) {
      _tradeMap._matchingProcess(saveDoc, pairDoc)
    } else if (reqBody.type == 'sell' && reqBody.price <= pairDoc.bidPrice) {
      _tradeMap._matchingProcess(saveDoc, pairDoc)
    } else {
      _tradeMap._userEmit(reqBody.userId, pairDoc._id, pairDoc.fromCurrency.currencyId, pairDoc.toCurrency.currencyId, "", "");
    }
    return;
  } catch (err) {
    return _tradeMap._createResponseUSDTPerpetual({
      "status": false,
      "message": "Something went wrong! Please try again someother time",
      "userId": reqBody.userId
    });
  }
}

/** 
 * orderType, action, pair, price, amount, leverage, 
*/
mapTrade.prototype._limitOrderClosePosition = async function (reqBody) {
  try {
    let pairDoc = await pairsDB.findOne({ "pair": reqBody.pair, 'status': "active" }).populate('fromCurrency').populate('toCurrency')
    if (!pairDoc) {
      return _tradeMap._createResponseUSDTPerpetual({
        "status": false,
        "message": "Invalid pair",
        "userId": reqBody.userId
      }), 'createRespUSDTPerpetualPosClose';
    }

    reqBody.price = parseFloat(reqBody.price);
    reqBody.amount = parseFloat(reqBody.amount);
    reqBody.leverage = parseFloat(reqBody.leverage);

    let status = 'active';
    if (reqBody.type == 'buy' && reqBody.price > pairDoc.askPrice) {
      reqBody.price = pairDoc.askPrice
      status = 'filled';
    } else if (reqBody.type == 'sell' && reqBody.price < pairDoc.bidPrice) {
      reqBody.price = pairDoc.bidPrice
      status = 'filled';
    }

    if (reqBody.price && reqBody.amount && reqBody.leverage && pairDoc.takerFee && reqBody.type) {
      let oldCloseOrderExpire = await orderDB.update({
        "pair": pairDoc._id,
        "userId": reqBody.userId,
        "status": "active",
        "action": reqBody.action,
      }, {
        "status": "expired"
      }, {
        multi: true
      });
      let newDoc = new orderDB({
        "userId": reqBody.userId,
        "amount": reqBody.amount,
        "price": reqBody.price,
        "type": reqBody.type,
        "total": reqBody.price * reqBody.amount,
        "orderType": reqBody.orderType,
        "pair": pairDoc._id,
        "pairName": pairDoc.pair,
        "leverage": reqBody.leverage,
        "method": reqBody.method,
        "status": status,
        "fromCurrency": pairDoc.fromCurrency.currencyId,
        "toCurrency": pairDoc.toCurrency.currencyId,
        "action": reqBody.action,
      })
      let saveDoc = await newDoc.save();

      if (reqBody.type == 'buy' && reqBody.price >= pairDoc.askPrice) {
        _tradeMap._matchingProcess(saveDoc, pairDoc)
      } else if (reqBody.type == 'sell' && reqBody.price <= pairDoc.bidPrice) {
        _tradeMap._matchingProcess(saveDoc, pairDoc)
      } else {
        _tradeMap._userEmit(reqBody.userId, pairDoc._id, pairDoc.fromCurrency.currencyId, pairDoc.toCurrency.currencyId, "", "");
      }
      _tradeMap._createResponseUSDTPerpetual({
        "status": true,
        "message": "Order placed successfully",
        "userId": reqBody.userId
      }, 'createRespUSDTPerpetualPosClose');
    } else {
      return _tradeMap._createResponseUSDTPerpetual({
        "status": false,
        "message": "Please fill all fields.",
        "userId": reqBody.userId
      }, 'createRespUSDTPerpetualPosClose');
    }
    return
  } catch (err) {
    return _tradeMap._createResponseUSDTPerpetual({
      "status": false,
      "message": "Something went wrong! Please try again someother time",
      "userId": reqBody.userId
    }, 'createRespUSDTPerpetualPosClose');
  }
}

/** 
 * orderType, action, pair, price, amount, leverage, 
*/
mapTrade.prototype._marketOrderOpenPosition = async function (reqBody) {
  try {
    let pairDoc = await pairsDB.findOne({ "pair": reqBody.pair, 'status': "active" }).populate('fromCurrency').populate('toCurrency')
    if (!pairDoc) {
      return _tradeMap._createResponseUSDTPerpetual({
        "status": false,
        "message": "Invalid pair",
        "userId": reqBody.userId
      });
    }

    reqBody.price = reqBody.type == 'buy' ? pairDoc.askPrice : pairDoc.bidPrice;
    reqBody.amount = parseFloat(reqBody.amount);
    reqBody.leverage = parseFloat(reqBody.leverage);

    let checkSpOrd = await checkTpSlOrder({
      type: reqBody.type,
      isTP: reqBody.isTP,
      isSL: reqBody.isSL,
      tpPrice: reqBody.tpPrice,
      slPrice: reqBody.slPrice,
      price: reqBody.price,
    })
    if (!checkSpOrd.status) {
      return _tradeMap._createResponseUSDTPerpetual({
        "status": false,
        'message': checkSpOrd.message,
        "userId": reqBody.userId
      });
    }

    let status = 'active'
    if (reqBody.type == 'buy' && reqBody.price > pairDoc.askPrice) {
      reqBody.price = pairDoc.askPrice
      status = 'filled'
    } else if (reqBody.type == 'sell' && reqBody.price < pairDoc.bidPrice) {
      reqBody.price = pairDoc.bidPrice
      status = 'filled'
    }

    if (reqBody.price && reqBody.amount && reqBody.leverage && pairDoc.takerFee && reqBody.type) {
      let orderCost = bybitUSDTCalc.orderCost(reqBody.price, reqBody.amount, reqBody.leverage, pairDoc.takerFee, reqBody.type)
      let deductBal = await deductAsset(reqBody.userId, pairDoc.toCurrency.currencyId, orderCost, {
        affetType: "Open Position"
      });
      if (deductBal.status != 'SUCCESS') {
        return _tradeMap._createResponseUSDTPerpetual({
          "status": false,
          "message": "Insufficient balance",
          "userId": reqBody.userId
        });
      }

      let newDoc = new orderDB({
        "userId": reqBody.userId,
        "amount": reqBody.amount,
        "price": reqBody.price,
        "type": reqBody.type,
        "total": reqBody.price * reqBody.amount,
        "orderType": reqBody.orderType,
        "pair": pairDoc._id,
        "pairName": pairDoc.pair,
        "leverage": reqBody.leverage,
        "method": reqBody.method,
        "status": status,
        "fromCurrency": pairDoc.fromCurrency.currencyId,
        "toCurrency": pairDoc.toCurrency.currencyId,
        "action": reqBody.action,
        'isTP': reqBody.isTP,
        'isSL': reqBody.isSL,
        'tpPrice': reqBody.tpPrice,
        'slPrice': reqBody.slPrice,
      })
      let saveDoc = await newDoc.save();

      if(saveDoc && saveDoc._id && deductBal && deductBal.balUpdDet && deductBal.balUpdDet.status && deductBal.balUpdDet.msg) {
        const balUpdId = deductBal.balUpdDet.msg._id;
        await USDMBalanceUpdation.findOneAndUpdate({
          _id: balUpdId
        }, {
          lastId: saveDoc._id
        });
      }

      _tradeMap._matchingProcess(saveDoc, pairDoc)

      _tradeMap._createResponseUSDTPerpetual({
        "status": true,
        "message": "Order placed successfully",
        "userId": reqBody.userId
      });
    }
    else {
      return _tradeMap._createResponseUSDTPerpetual({
        "status": false,
        "message": "Please fill all fields.",
        "userId": reqBody.userId
      });
    }
    return
  } catch (err) {
    return _tradeMap._createResponseUSDTPerpetual({
      "status": false,
      "message": "Something went wrong! Please try again someother time",
      "userId": reqBody.userId
    });
  }
}

/** 
 * orderType, action, pair, price, amount, leverage, 
*/
mapTrade.prototype._marketOrderClosePosition = async function (reqBody) {
  try {
    let pairDoc = await pairsDB.findOne({ "pair": reqBody.pair, 'status': "active" }).populate('fromCurrency').populate('toCurrency')
    if (!pairDoc) {
      return _tradeMap._createResponseUSDTPerpetual({
        "status": false,
        "message": "Invalid pair",
        "userId": reqBody.userId
      }, 'createRespUSDTPerpetualPosClose');
    }

    reqBody.price = reqBody.type == 'buy' ? pairDoc.askPrice : pairDoc.bidPrice;
    reqBody.amount = parseFloat(reqBody.amount);
    reqBody.leverage = parseFloat(reqBody.leverage);

    let newDoc = new orderDB({
      "userId": reqBody.userId,
      "amount": reqBody.amount,
      "price": reqBody.price,
      "type": reqBody.type,
      "total": reqBody.price * reqBody.amount,
      "orderType": reqBody.orderType,
      "pair": pairDoc._id,
      "pairName": pairDoc.pair,
      "leverage": reqBody.leverage,
      "method": reqBody.method,
      "status": 'filled',
      "fromCurrency": pairDoc.fromCurrency.currencyId,
      "toCurrency": pairDoc.toCurrency.currencyId,
      "action": reqBody.action,
    })

    let saveDoc = await newDoc.save()
    _tradeMap._matchingProcess(saveDoc, pairDoc)

    return _tradeMap._createResponseUSDTPerpetual({
      "status": true,
      "message": "Order placed successfully",
      "userId": reqBody.userId
    }, 'createRespUSDTPerpetualPosClose');
  } catch (err) {
    return _tradeMap._createResponseUSDTPerpetual({
      "status": false,
      "message": "Something went wrong! Please try again someother time",
      "userId": reqBody.userId
    }, 'createRespUSDTPerpetualPosClose');
  }
}

/** 
 * orderType, action, pair, price, amount, leverage, 
*/
mapTrade.prototype._stopLimitOrderOpenPosition = async function (reqBody) {
  try {
    let pairDoc = await pairsDB.findOne({ "pair": reqBody.pair, 'status': "active" }).populate('fromCurrency').populate('toCurrency')
    if (!pairDoc) {
      return _tradeMap._createResponseUSDTPerpetual({
        "status": false,
        "message": "Invalid pair",
        "userId": reqBody.userId
      });
    }

    let triggerType
    if (reqBody.markPrice < reqBody.stopPrice) {
      triggerType = "greater";
    } else if (reqBody.markPrice > reqBody.stopPrice) {
      triggerType = "lesser";
    }

    reqBody.price = parseFloat(reqBody.price);
    reqBody.amount = parseFloat(reqBody.amount);
    reqBody.leverage = parseFloat(reqBody.leverage);
    reqBody.triggerPrice = parseFloat(reqBody.triggerPrice);

    let orderCost = bybitUSDTCalc.orderCost(reqBody.price, reqBody.amount, reqBody.leverage, pairDoc.takerFee, reqBody.type)
    let deductBal = await deductAsset(reqBody.userId, pairDoc.toCurrency.currencyId, orderCost, {
      affetType: "Open Position"
    });
    if (deductBal.status != 'SUCCESS') {
      return _tradeMap._createResponseUSDTPerpetual({
        "status": false,
        "message": "Insufficient balance",
        "userId": reqBody.userId
      });
    }

    let newDoc = new orderDB({
      "userId": reqBody.userId,
      "amount": reqBody.amount,
      "price": reqBody.price,
      "type": reqBody.type,
      "total": reqBody.price * reqBody.amount,
      "orderType": reqBody.orderType,
      "pair": pairDoc._id,
      "pairName": pairDoc.pair,
      "leverage": reqBody.leverage,
      "method": reqBody.method,
      "status": 'conditional',
      "fromCurrency": pairDoc.fromCurrency.currencyId,
      "toCurrency": pairDoc.toCurrency.currencyId,
      "action": reqBody.action,
      "triggerType": triggerType,
      "triggerPrice": reqBody.triggerPrice
    })

    let saveDoc = await newDoc.save();

    if(saveDoc && saveDoc._id && deductBal && deductBal.balUpdDet && deductBal.balUpdDet.status && deductBal.balUpdDet.msg) {
      const balUpdId = deductBal.balUpdDet.msg._id;
      await USDMBalanceUpdation.findOneAndUpdate({
        _id: balUpdId
      }, {
        lastId: saveDoc._id
      });
    }

    _tradeMap._userEmit(reqBody.userId, pairDoc._id, pairDoc.fromCurrency.currencyId, pairDoc.toCurrency.currencyId, "", "");
    _tradeMap._createResponseUSDTPerpetual({
      "status": true,
      "message": "Order placed successfully",
      "userId": reqBody.userId
    });
    return
  } catch (err) {
    return _tradeMap._createResponseUSDTPerpetual({
      "status": false,
      "message": "Something went wrong! Please try again someother time",
      "userId": reqBody.userId
    });
  }
}
mapTrade.prototype._matchingProcess = async function (orderDoc, pairDoc) {
  try {
    if (pairDoc && orderDoc) {
      if (orderDoc.status == 'active') {
        await orderDB.updateOne({ '_id': orderDoc._id }, {
          "$set": {
            'status': 'filled'
          }
        })
      }

      let adminOrder = await orderDB.create({
        "userId": adminDoc._id,
        "amount": orderDoc.amount,
        "price": orderDoc.price,
        "type": orderDoc.type == 'buy' ? 'sell' : 'buy',
        "total": orderDoc.price * orderDoc.amount,
        "orderType": 'market',
        "pair": orderDoc.pair,
        "pairName": orderDoc.pairName,
        "leverage": orderDoc.leverage,
        "method": orderDoc.method,
        "status": 'filled',
        "action": orderDoc.action
      });
      await TradeDB.create({
        "buyUserId": orderDoc.type == 'buy' ? orderDoc.userId : adminDoc._id,
        "sellUserId": orderDoc.type == 'sell' ? orderDoc.userId : adminDoc._id,
        "buyOrderId": orderDoc.type == 'buy' ? orderDoc._id : adminOrder._id,
        "sellOrderId": orderDoc.type == 'sell' ? orderDoc._id : adminOrder._id,
        "amount": orderDoc.amount,
        "price": orderDoc.price,
        "type": orderDoc.type,
        "total": orderDoc.price * orderDoc.amount,
        "pair": orderDoc.pair,
        "pairName": orderDoc.pairName,
      });

      _tradeMap._userEmit(orderDoc.userId, pairDoc._id, pairDoc.fromCurrency.currencyId, pairDoc.toCurrency.currencyId, "", "");

      if (orderDoc.action == 'open') {
        await _tradeMap._openPosition(orderDoc, pairDoc);
      } else if (orderDoc.action == 'close') {
        await _tradeMap._closePosition(orderDoc, pairDoc);
      }
      _tradeMap._userEmit(orderDoc.userId, pairDoc._id, pairDoc.fromCurrency.currencyId, pairDoc.toCurrency.currencyId, "", "");
    }
    else {
      _tradeMap._userEmit(orderDoc.userId, pairDoc._id, pairDoc.fromCurrency.currencyId, pairDoc.toCurrency.currencyId, "", "");
    }
    return true
  } catch (err) {
    console.log("err : usd-m matchingProcess", err)
    return true
  }
}

mapTrade.prototype._openPosition = async function (orderDoc, pairData) {
  try {
    let openPos = await positionDB.findOneAndUpdate({
      'pair': orderDoc.pair,
      'userId': orderDoc.userId,
      'type': orderDoc.type
    }, {
      "$push": {
        "filled": {
          "price": orderDoc.price,
          "amount": orderDoc.amount
        }
      },
      "$inc": {
        "totalAmount": orderDoc.amount
      },
      "fromCurrency": orderDoc.fromCurrency,
      "toCurrency": orderDoc.toCurrency,
      "userId": orderDoc.userId,
      "pair": orderDoc.pair,
      "pairName": orderDoc.pairName,
      "leverage": orderDoc.leverage,
      "type": orderDoc.type,
      "method": orderDoc.method
    }, {
      "new": true,
      "upsert": true
    })

    if (openPos) {
      let entryPrice = bybitUSDTCalc.averagePrice(openPos.filled)
      openPos.liquidityPrice = bybitUSDTCalc.liquidityPrice(
        entryPrice,
        openPos.leverage,
        pairData.MMR,
        openPos.type
      )

      if (orderDoc.isTP) {
        openPos.isTP = orderDoc.isTP;
        openPos.tpPrice = orderDoc.tpPrice;
      }

      if (orderDoc.isSL) {
        openPos.isSL = orderDoc.isSL;
        openPos.slPrice = orderDoc.slPrice;
      }

      await openPos.save();

      if (openPos.isTP) {
        await tpOrder(openPos, orderDoc, pairData);
      }

      if (openPos.isSL) {
        await slOrder(openPos, orderDoc, pairData);
      }
    }
  } catch (err) {
    console.log("err : openPosition ", err)
  }
}

mapTrade.prototype._closePosition = async function (orderDoc, pairData) {
  try {
    let posDoc = await positionDB.findOne({
      'pair': orderDoc.pair,
      'userId': orderDoc.userId,
      'type': orderDoc.type == 'buy' ? "sell" : "buy"
    })

    if (posDoc && posDoc.totalAmount >= orderDoc.amount) {
      let closePosAmt = posDoc.totalAmount >= orderDoc.amount ? orderDoc.amount : posDoc.totalAmount

      let contracts = [], checkedPosAmt = 0, overallOC = 0, posFilleds = [], tradeFee = 0;
      for (let posFilled of posDoc.filled) {
        if (checkedPosAmt < closePosAmt) {
          let amount = ((closePosAmt - checkedPosAmt) >= posFilled.amount) ? posFilled.amount : (closePosAmt - checkedPosAmt)

          checkedPosAmt = checkedPosAmt + amount
          contracts.push(posFilled)

          if ((closePosAmt - checkedPosAmt) < posFilled.amount) {
            posFilleds.push({
              ...posFilled,
              amount
            })
          }

          let orderCost = bybitUSDTCalc.orderCost(
            posFilled.price,
            amount,
            posDoc.leverage,
            pairData.takerFee,
            posDoc.type,
          );

          orderCost = common.toFixed(orderCost, 8);
          overallOC = overallOC + orderCost;

          tradeFee = tradeFee + bybitUSDTCalc.feeToOpen(
            posFilled.price,
            amount,
            pairData.takerFee,
          ) + bybitUSDTCalc.feeToClose(
            posFilled.price,
            amount,
            pairData.takerFee,
            posDoc.leverage,
            posDoc.type,
          );

        } else {
          posFilleds.push(posFilled)
        }
      }

      let entryPrice = bybitUSDTCalc.averagePrice(contracts)
      let pAndL = bybitUSDTCalc.pnl(
        entryPrice,
        orderDoc.price,
        closePosAmt,
        orderDoc.type == "buy" ? "sell" : "buy",
      );

      pAndL = common.toFixed(pAndL, 8)

      if (posDoc.totalAmount == orderDoc.amount) {
        await posDoc.remove()

        if (posDoc.isTP) {
          await removeTpOrder({
            pair: posDoc.pair,
            userId: posDoc.userId,
            type: posDoc.type,
          });
        }

        if (posDoc.isSL) {
          await removeSlOrder({
            pair: posDoc.pair,
            userId: posDoc.userId,
            type: posDoc.type,
          });
        }
      } else {
        // need to check
        // filled: CastError: Cast to Array failed for value "[
        // reason: TypeError: value[i].toObject is not a function
        console.log({
          dash1:"----------",
          posDoc,
          dash2:"----------",
          posFilleds,
          dash3:"----------",
        })
        posDoc.filled = posFilleds;

        let curEntryPrice = bybitUSDTCalc.averagePrice(posDoc.filled)
        posDoc.liquidityPrice = bybitUSDTCalc.liquidityPrice(
          curEntryPrice,
          posDoc.leverage,
          pairData.MMR,
          posDoc.type
        )

        await posDoc.save()

        if (posDoc.isTP) {
          await changeTpAmount({
            pair: posDoc.pair,
            userId: posDoc.userId,
            type: posDoc.type,
            amount: posDoc.totalAmount,
          });
        }

        if (posDoc.isSL) {
          await changeSlAmount({
            pair: posDoc.pair,
            userId: posDoc.userId,
            type: posDoc.type,
            amount: posDoc.totalAmount,
          });
        }
      }

      let profitLoss = overallOC + pAndL + -tradeFee;

      if (profitLoss > 0) {
        creditAsset(posDoc.userId, posDoc.toCurrency, profitLoss, {
          lastId: orderDoc._id,
          affetType: "Close Position"
        });
      }

      await profitLossDB.create({
        "userId": posDoc.userId,
        "pair": posDoc.pair,
        "pairName": posDoc.pairName,
        "entryPrice": entryPrice,
        "exitPrice": orderDoc.price,
        "closedDir": orderDoc.type == "buy" ? "sell" : "buy",
        "amount": closePosAmt,
        "tradeFee": tradeFee,
        "pAndL": (pAndL - tradeFee),
        "profitLoss": profitLoss,
        "notes": {overallOC, tradeFee, profitLoss, pAndL: (pAndL - tradeFee), pnlWithFee: pAndL},
        "type": 'trade',
        "openAt": posDoc.createdAt,
        "closedAt": new Date(),
      })
    }
    return true;
  } catch (err) {
    console.log("closePosition err : ", err)
    return true;
  }
}

mapTrade.prototype._createResponseUSDTPerpetual = async function (response, channelName = 'createResponseUSDTPerpetual') {
  if(response.message && respMessage_helper && respMessage_helper[response.message]) {
    response['message'] = respMessage_helper[response.message];
  }
  response['msg'] = "Order Executed Successfully";
  socket.sockets.emit(channelName, response);
};

mapTrade.prototype._createResponseFutures = async function (response, pairs = '') {
  response['msg'] = "Order Executed Successfully";
  socket.sockets.emit('createResponseUSDTPerpetual', response);
};

/** 
 * Check asset and deduct balance
*/
async function deductAsset(userId, currencyId, deductBal, extdata = {}) {
  try {
    deductBal = parseFloat(deductBal)
    if (deductBal <= 0) {
      return {
        'status': "ERROR"
      }
    }
    const findData = {
      'userId': userId,
      'currencyId': currencyId,
      'perpetualAmount': { "$gte": deductBal }
    };
    const updData = {
      "$inc": {
        'perpetualAmount': -deductBal,
        'perpetualHold': deductBal,
      }
    };
    const deductAssetResp = await UserWallet.findOneAndUpdate(findData, updData);
    if(deductAssetResp) {
      // USD-M Balance tracking - Start
      // const {
      //   lastId = "",
      //   affetType = ""
      // } = extdata;
      // const updations = {
      //   userId: mongoose.mongo.ObjectId(userId),
      //   currencyId: mongoose.mongo.ObjectId(currencyId),
      //   amount: common.roundValues(amount, 8),
      //   difference: common.roundValues(amount - balance, 8),
      //   oldBalance: common.roundValues(balance, 8),
      //   lastId: lastId,
      //   type: affetType,
      //   notes: extdata.notes ? JSON.stringify(extdata.notes) : "",
      //   detail: extdata.detail ? JSON.stringify(extdata.detail) : "",
      // };
      // const balUpdDet = await query_helper.insertData(USDMBalanceUpdation, updations);
      const balUpdDet = {};
      // USD-M Balance tracking - End
      return {
        'status': "SUCCESS",
        balUpdDet
      }
    }
    else {
      return {
        'status': "ERROR"
      }
    }
  } catch (err) {
    console.log("err : deductAsset : ", err);
    return {
      'status': "ERROR"
    }
  }
}

/** 
 * Check asset and credit balance
*/
async function creditAsset(userId, currencyId, balance, extdata = {}) {
  try {
    balance = parseFloat(balance)
    if (balance <= 0) {
      return {
        'status': "ERROR"
      }
    }
    const findData = {
      'userId': userId,
      'currencyId': currencyId,
    };
    const updData = {
      "$inc": {
        'perpetualAmount': balance,
        'perpetualHold': -balance
      }
    };
    const options = { new: true };
    const creditAssetResp = await UserWallet.findOneAndUpdate(findData, updData, options);
    if(creditAssetResp) {
      // USD-M Balance tracking - Start
      // const {
      //   lastId = "",
      //   affetType = ""
      // } = extdata;
      // const updations = {
      //   userId: mongoose.mongo.ObjectId(userId),
      //   currencyId: mongoose.mongo.ObjectId(currencyId),
      //   amount: common.roundValues(amount, 8),
      //   difference: common.roundValues(amount - balance, 8),
      //   oldBalance: common.roundValues(balance, 8),
      //   lastId: lastId,
      //   type: affetType,
      //   notes: extdata.notes ? JSON.stringify(extdata.notes) : "",
      //   detail: extdata.detail ? JSON.stringify(extdata.detail) : "",
      // };
      // const balUpdDet = await query_helper.insertData(USDMBalanceUpdation, updations);
      const balUpdDet = {};
      // USD-M Balance tracking - End
      return {
        'status': "SUCCESS",
        balUpdDet
      }
    }
    else {
      return {
        'status': "ERROR"
      }
    }
  } catch (err) {
    console.log("err : creditAsset : ", err);
    return {
      'status': "ERROR"
    }
  }
}

async function checkTpSlOrder(reqBody) {
  try {
    if (reqBody.type == "buy") {
      if (
        reqBody.isTP &&
        !common.isEmpty(reqBody.tpPrice) &&
        reqBody.tpPrice < reqBody.price
      ) {
        return {
          status: false,
          message: "LONG_TAKE_PROFIT",
        };
      }

      if (
        reqBody.isSL &&
        !common.isEmpty(reqBody.slPrice) &&
        reqBody.slPrice > reqBody.price
      ) {
        return {
          status: false,
          message: "LONG_STOP_LOSS",
        };
      }
    } else if (reqBody.type == "sell") {
      if (
        reqBody.isTP &&
        !common.isEmpty(reqBody.tpPrice) &&
        reqBody.tpPrice > reqBody.price
      ) {
        return {
          status: false,
          message: "SHORT_TAKE_PROFIT",
        };
      }

      if (
        reqBody.isSL &&
        !common.isEmpty(reqBody.slPrice) &&
        reqBody.slPrice < reqBody.price
      ) {
        return {
          status: false,
          message: "SHORT_STOP_LOSS",
        };
      }
    }
    return {
      status: true,
    };
  } catch (err) {
    return {
      status: false,
      message: "SOMETHING_WRONG",
    };
  }
}

async function tpOrder(posDoc, orderDoc, pairDoc) {
  try {
    if (posDoc && posDoc.isTP) {
      if (posDoc.type == 'buy' && posDoc.tpPrice < pairDoc.markPrice) {
        return {
          'status': false,
          'message': 'TAKE_PROFIT_MUST'
        }
      } else if (posDoc.type == 'sell' && posDoc.tpPrice > pairDoc.markPrice) {
        return {
          'status': false,
          'message': 'TAKE_PROFIT_LESS'
        }
      }

      let checkOrder = await orderDB.findOne({
        'pair': posDoc.pair,
        'userId': posDoc.userId,
        'status': 'conditional',
        'tpSlType': posDoc.type == 'buy' ? 'greater' : 'lesser',
      })

      if (checkOrder) {
        checkOrder.amount = posDoc.totalAmount
        checkOrder.price = orderDoc.tpPrice
        checkOrder.total = orderDoc.tpPrice * posDoc.totalAmount;
        await checkOrder.save();
        return {
          'status': true
        }
      } else {
        let newDoc = new orderDB({
          "userId": posDoc.userId,
          "amount": posDoc.totalAmount,
          "price": orderDoc.tpPrice,
          "type": posDoc.type == "buy" ? "sell" : "buy",
          "total": orderDoc.tpPrice * posDoc.totalAmount,
          "orderType": 'market',
          "pair": pairDoc._id,
          "pairName": pairDoc.pair,
          "leverage": orderDoc.leverage,
          "method": orderDoc.method,
          "status": 'conditional',
          "fromCurrency": pairDoc.fromCurrency.currencyId,
          "toCurrency": pairDoc.toCurrency.currencyId,
          "action": 'close',
          'tpSlType': posDoc.type == 'buy' ? 'greater' : 'lesser',
          'tpSl': 'tp',
        })

        await newDoc.save()
        return {
          'status': true
        }
      }
    }
    return {
      'status': false
    }
  } catch (err) {
    console.log('tpOrder : err : ', err);
    return {
      'status': false
    }
  }
}

async function slOrder(posDoc, orderDoc, pairDoc) {
  try {
    if (posDoc && posDoc.isSL) {
      if (posDoc.type == 'buy' && posDoc.slPrice > pairDoc.markPrice) {
        return {
          'status': false,
          'message': 'STOP_LOSS_LESS'
        }
      } else if (posDoc.type == 'sell' && posDoc.slPrice < pairDoc.markPrice) {
        return {
          'status': false,
          'message': 'STOP_LOSS_HIGHER'
        }
      }

      let checkOrder = await orderDB.findOne({
        'pair': posDoc.pair,
        'userId': posDoc.userId,
        'status': 'conditional',
        'tpSlType': posDoc.type == 'buy' ? 'lesser' : 'greater',
      })

      if (checkOrder) {
        checkOrder.amount = posDoc.totalAmount
        checkOrder.price = orderDoc.slPrice
        checkOrder.total = orderDoc.slPrice * posDoc.totalAmount;
        await checkOrder.save();
        return {
          'status': true
        }
      } else {
        let newDoc = new orderDB({
          "userId": posDoc.userId,
          "amount": posDoc.totalAmount,
          "price": orderDoc.slPrice,
          "type": posDoc.type == "buy" ? "sell" : "buy",
          "total": orderDoc.slPrice * posDoc.totalAmount,
          "orderType": 'market',
          "pair": pairDoc._id,
          "pairName": pairDoc.pair,
          "leverage": orderDoc.leverage,
          "method": orderDoc.method,
          "status": 'conditional',
          "fromCurrency": pairDoc.fromCurrency.currencyId,
          "toCurrency": pairDoc.toCurrency.currencyId,
          "action": 'close',
          'tpSlType': posDoc.type == 'buy' ? 'lesser' : 'greater',
          'tpSl': 'sl',
        })

        await newDoc.save()
        return {
          'status': true
        }
      }
    }
    return {
      'status': false
    }
  } catch (err) {
    console.log("err : ", {err});
    return {
      'status': false
    }
  }
}

async function removeTpOrder(reqBody) {
  try {
    await orderDB.updateOne({
      'pair': reqBody.pair,
      'userId': reqBody.userId,
      'status': 'conditional',
      'tpSlType': reqBody.type == 'buy' ? 'greater' : 'lesser',
    }, {
      "$set": {
        'status': 'cancel'
      }
    })
    return {
      'status': true
    }
  } catch (err) {
    return {
      'status': false
    }
  }
}

async function removeSlOrder(reqBody) {
  try {
    await orderDB.updateOne({
      'pair': reqBody.pair,
      'userId': reqBody.userId,
      'status': 'conditional',
      'tpSlType': reqBody.type == 'buy' ? 'lesser' : 'greater',
    }, {
      "$set": {
        'status': 'cancel'
      }
    })
    return {
      'status': true
    }
  } catch (err) {
    return {
      'status': false
    }
  }
}

async function changeTpAmount(reqBody) {
  try {
    let checkOrder = await orderDB.findOne({
      'pair': reqBody.pair,
      'userId': reqBody.userId,
      'status': 'conditional',
      'tpSlType': reqBody.type == 'buy' ? 'greater' : 'lesser',
    })

    if (checkOrder) {
      checkOrder.amount = checkOrder.amount - reqBody.amount;
      checkOrder.total = checkOrder.price * checkOrder.amount;
      await checkOrder.save();
      return {
        'status': true
      }
    }
    return {
      'status': false
    }
  } catch (err) {
    return {
      'status': false
    }
  }
}

async function changeSlAmount(reqBody) {
  try {
    let checkOrder = await orderDB.findOne({
      'pair': reqBody.pair,
      'userId': reqBody.userId,
      'status': 'conditional',
      'tpSlType': reqBody.type == 'buy' ? 'lesser' : 'greater',
    })

    if (checkOrder) {
      checkOrder.amount = checkOrder.amount - reqBody.quantity;
      checkOrder.total = checkOrder.price * checkOrder.amount;;
      await checkOrder.save();
      return {
        'status': true
      }
    }
    return {
      'status': false
    }
  } catch (err) {
    return {
      'status': false
    }
  }
}

async function tradeCheckBalance(userId, currency, total, type, orderType, amount, price, orderId, response, orderPlace, data = {}) {
  response.msg = amount;
  let returnResponse = { status: false, changedAmount: false, response: response };
  if (orderType == 'market' && orderPlace == 0) {
    returnResponse.status = true;
    return (returnResponse);
  } else if (orderType != 'market' && orderPlace == 1) {
    returnResponse.status = true;
    return (returnResponse);
  } else if ((orderType != 'market' && orderPlace == 0) || (orderType == 'market' && orderPlace == 1)) {
    const balance = await common.getbalance(userId, currency);
    let curBalance = balance.amount;
    if (orderType == 'market') {
      if ((total > curBalance && type == "buy") || (amount > curBalance && type == "sell")) {
        if (data.leverage) {
          total = curBalance;
          total = common.roundValues(total, 8);
          amount = common.mathRound(total, price, 'division');
          amount = common.roundValues(amount, 8);
        }
        else {
          if (type == "buy") {
            total = curBalance;
            total = common.roundValues(total, 8);
            amount = common.mathRound(total, price, 'division');
            amount = common.roundValues(amount, 8);
          } else {
            amount = curBalance;
            amount = common.roundValues(amount, 8);
            total = common.mathRound(amount, price, 'multiplication');
            total = common.roundValues(total, 8);
          }
        }
        returnResponse.changedAmount = true;
      }
    }
    if (parseFloat(amount) > 0 && parseFloat(total) > 0) {

      const leverage = data.leverage ? data.leverage : 1;
      const chkBalance = curBalance * leverage;
      if ((total <= chkBalance && type == "buy") || (amount <= chkBalance && type == "sell")) {
        let Balance = 0;
        let updateValue = 0;
        if (data.leverage) {
          Balance = common.mathRound(curBalance, total / leverage, 'subtraction');
          updateValue = total / leverage;
        }
        else {
          if (type == "buy") {
            Balance = common.mathRound(curBalance, total, 'subtraction');
            updateValue = total;
          } else {
            Balance = common.mathRound(curBalance, amount, 'subtraction');
            updateValue = amount;
          }
        }
        if (orderType != 'market') {
          common.updateHoldAmount(userId, currency, updateValue);
        }
        await common.updateUserBalance(userId, currency, Balance, orderId, 'Trade - Creation');
        returnResponse.status = true;
        returnResponse.response.msg = amount;
        return (returnResponse);
      } else {
        returnResponse.response.msg = "Insufficient balance!";
        return (returnResponse);
      }
    } else {
      returnResponse.response.msg = "Please enter valid amount and price";
      return (returnResponse);
    }
  }
}

mapTrade.prototype._sendResponse = async function (pair, userId, type) {
  if (type == 'pairemit') {
    var pairSymbol = pair.frompair.currencySymbol + '_' + pair.topair.currencySymbol;
    pairData(pairSymbol, (result) => {
      socket.sockets.emit('pairResponseFutures', result.Message);
    });
  }
  if (userId && mongoose.isValidObjectId(userId)) {
    _tradeMap._userEmit(userId, pair._id, pair.frompair.currencyId, pair.topair.currencyId, "", "");
  }
};
mapTrade.prototype.mapOrder = async function (lastInsertOrder, pairs, response = '') {
  if (common.getSiteDeploy() == 0) {
    var globalPairDetails = pairs;
    if (lastInsertOrder.type == 'buy') {
      if (lastInsertOrder.orderType == 'market') {
        whereCondn = { pair: globalPairDetails._id, type: "sell", $or: [{ status: 'active' }, { status: 'partially' }], orderPicked: 0, cancelInitiate: { $ne: 1 } }
      } else {
        whereCondn = { pair: globalPairDetails._id, type: "sell", price: { $lte: lastInsertOrder.price }, $or: [{ status: 'active' }, { status: 'partially' }], orderPicked: 0, cancelInitiate: { $ne: 1 } }
      }
      sorting = { price: 1, dateTime: 1 }
    } else {
      if (lastInsertOrder.orderType == 'market') {
        whereCondn = { pair: globalPairDetails._id, type: "buy", $or: [{ status: 'active' }, { status: 'partially' }], orderPicked: 0, cancelInitiate: { $ne: 1 } }
      } else {
        whereCondn = { pair: globalPairDetails._id, type: "buy", price: { $gte: lastInsertOrder.price }, $or: [{ status: 'active' }, { status: 'partially' }], orderPicked: 0, cancelInitiate: { $ne: 1 } }
      }
      sorting = { price: -1, dateTime: 1 }
    }
    const getOrders = await query_helper.findData(orderDB, whereCondn, {}, sorting, 0);
    if (getOrders.status && getOrders.msg.length > 0) {
      _tradeMap.mappingLoop(globalPairDetails, lastInsertOrder, getOrders.msg, 0)
      if (lastInsertOrder.orderType == 'market') {
        if (response != '') {
          response['msg'] = "Market " + response['type'].charAt(0).toUpperCase() + response['type'].slice(1) + " Order Executed Successfully!";
          if (response['placeType'] == "socket") {
            socket.sockets.emit('createResponseFutures', response);
          } else {
            let res1 = {
              status: response['status'],
              type: response['type'],
              msg: response['msg'],
              orderType: response['orderType'],
              pair: response['pair'],
              userId: response['userId'],
              placeType: response['placeType'],
              amount: response['amount'],
              price: response['price'],
              insertId: response['insertId'],
              order: response['order']
            }
            response['res'].json(res1)
          }
        }
      }
    } else {
      if (lastInsertOrder.orderType == 'market') {
        let update = { status: 'cancelled' };
        await query_helper.updateData(orderDB, 'one', { _id: lastInsertOrder._id }, update);
        if (response != '') {
          response['status'] = 0;
          response['msg'] = "There is no matching order for your market " + response['type'] + " order";
          if (response['placeType'] == "socket") {
            socket.sockets.emit('createResponseFutures', response);
          } else {
            let res1 = {
              status: response['status'],
              type: response['type'],
              msg: response['msg'],
              orderType: response['orderType'],
              pair: response['pair'],
              userId: response['userId'],
              placeType: response['placeType'],
              amount: response['amount'],
              price: response['price'],
              insertId: response['insertId'],
              order: response['order']
            }
            response['res'].json(res1)
          }
        }
        _tradeMap._sendResponse(pairs, lastInsertOrder.userId, 'pairemit');
      } else {
        _tradeMap._sendResponse(pairs, lastInsertOrder.userId, 'pairemit');
      }
    }
  }
}
mapTrade.prototype.autoOrderExecute = async function (globalPairDetails, lastInsertOrder, response) {
  let tempHide = "no";
  // temp Hide by raja
  if (common.getSiteDeploy() == 0 || tempHide === "no") {
    if (lastInsertOrder.orderType == 'market') {
      let getOrderBook = await query_helper.findoneData(OrderBookDB, { pair: globalPairDetails.pair }, {});
      let orders = [];
      if (getOrderBook.status) {
        let bookOrders = lastInsertOrder.type == 'buy' ? getOrderBook.msg.asks : getOrderBook.msg.bids;
        orders = [];
        bookOrders.forEach(element => {
          orders.push({ price: element._id, amount: element.amount })
        });
      }
      else {
        orders = executeOrders(globalPairDetails, lastInsertOrder.type);
      }
      _tradeMap.marketExecute(globalPairDetails, lastInsertOrder, response, orders, 0);
    } else {
      let getOrderBook = await query_helper.findoneData(OrderBookDB, { pair: globalPairDetails.pair }, {});
      let orders = [];
      if (getOrderBook.status) {
        let bookOrders = lastInsertOrder.type == 'buy' ? getOrderBook.msg.asks : getOrderBook.msg.bids;
        orders = [];
        bookOrders.forEach(element => {
          if ((lastInsertOrder.type == 'buy' && element._id <= lastInsertOrder.price) || (lastInsertOrder.type == 'sell' && element._id >= lastInsertOrder.price)) {
            orders.push({ price: element._id, amount: element.amount })
          }
        });
      }
      else {
        orders = executeOrders(globalPairDetails, lastInsertOrder.type)
      }
      if (orders.length == 0) {
        orders.push({ price: lastInsertOrder.price, amount: lastInsertOrder.amount })
      }
      _tradeMap.limitExecute(globalPairDetails, lastInsertOrder, response, orders, 0);
    }
  }
}

mapTrade.prototype.marketExecute = async function (globalPairDetails, newOrder, response, orders, autoInc) {
  if (common.getSiteDeploy() == 0) {
    response['msg'] = "Market " + response['type'].charAt(0).toUpperCase() + response['type'].slice(1) + " Order Executed Successfully!";
    let amount = 0;
    let orderPrice = 0;
    const orderAmount = newOrder.amount;
    _tradeMap._orderTempChecking(newOrder._id, newOrder.type, async function (result) {

      if (result > 0) {
        newOrder.amount = common.mathRound(newOrder.amount, result, 'subtraction');
      }
      if (orders && orders.length > 0) {
        if (autoInc == (orders.length - 1)) {
          amount = newOrder.amount;
        } else {
          if (newOrder.amount <= orders[autoInc].amount) {
            amount = newOrder.amount;
          } else {
            amount = orders[autoInc].amount;
          }
        }
      }
      newOrder.amount = +(newOrder.amount.toFixed(globalPairDetails.frompair.siteDecimal));
      amount = +(amount.toFixed(globalPairDetails.frompair.siteDecimal));

      if (newOrder.amount > 0 && amount > 0) {
        _tradeMap._positionOrderCreateChecking({ newOrder }, async function (positionRes) {
          amount = common.roundValues(amount, 8);
          orderPrice = orders[autoInc].price;

          const {
            amount: posAmt = 0,
            entryPrice: posEntryPrice = 0,
            status: posStatus = "new",
            _id: posId = ""
          } = positionRes.positionData ? positionRes.positionData : {};

          const pairName = globalPairDetails.frompair.currencySymbol + '_' + globalPairDetails.topair.currencySymbol;

          let posNewUpd = {
            userId: newOrder.userId,
            // orderId
            marginMode: "isolated",
            amount: newOrder.amount,
            stopPrice: 0,
            usdPrice: 0,
            // total: "",
            // usdTotal: "",
            pair: globalPairDetails._id,
            pairName: pairName,
          };

          const entryPriceDet = getlEntryPrice({ posEntryPrice, orderPrice, posStatus });
          const liqPriceDet = getlLiqPrice({ entryPrice: orderPrice, type: newOrder.type });

          if (posStatus == "new") {
            var da_te = new Date();
            var ye_ar = da_te.getFullYear();
            var str_year = ye_ar.toString();
            var str_length = str_year.length;
            var st_r_year = str_year.substr(str_length - 2, str_length);
            var millis = Date.now();
            var orderId = "O-" + st_r_year + "-" + millis;

            posNewUpd.orderType = "market";
            posNewUpd.entryPrice = entryPriceDet.entryPrice;
            posNewUpd.liqPrice = liqPriceDet.liqPrice;
            posNewUpd.exitPrice = 0;
            posNewUpd.type = newOrder.type;
            posNewUpd.status = "opened";
            posNewUpd.orderId = orderId;
            await query_helper.insertData(positionDB, posNewUpd);
          }
          else {
            posNewUpd.entryPrice = orderPrice;
            // posNewUpd.exitPrice = 0;
            // posNewUpd.status = "opened";
            await query_helper.updateData(positionDB, 'one', { _id: posId }, posNewUpd);
          }

          let getOrderBook = await query_helper.findoneData(OrderBookDB, { pair: globalPairDetails.pair }, {});
          let conditionCheck = 0;
          if (getOrderBook.status) {
            conditionCheck = 1;
          }
          if (conditionCheck == 1 || ((orderPrice >= globalPairDetails.price && newOrder.type == 'buy') || (orderPrice <= globalPairDetails.price && newOrder.type == 'sell'))) {
            const role = "taker";
            const fees = newOrder.takerFee;
            const orderType = newOrder.type;
            // const currency = orderType == "buy" ? globalPairDetails.tocurrency : globalPairDetails.fromcurrency;
            const currency = globalPairDetails.tocurrency;
            let filledPrice = common.mathRound(amount, orderPrice, 'multiplication');

            const tradeCheck = await tradeCheckBalance(newOrder.userId, currency[0].currencyId, filledPrice, orderType, newOrder.orderType, amount, orderPrice, newOrder.orderId, { status: 0, msg: '' }, 1);
            if (tradeCheck.status) {
              amount = tradeCheck.response.msg;
              if (amount > 0) {
                filledPrice = common.mathRound(amount, orderPrice, 'multiplication');
                let orderFee = 0;
                if (fees > 0 && orderType == "buy") {
                  orderFee = common.mathRound((common.mathRound(amount, fees, 'multiplication')), 100, 'division');
                }
                if (fees > 0 && orderType == "sell") {
                  orderFee = common.mathRound((common.mathRound(filledPrice, fees, 'multiplication')), 100, 'division');
                }
                const pairName = globalPairDetails.frompair.currencySymbol + '_' + globalPairDetails.topair.currencySymbol;
                let insertTempDbJson = {
                  sellOrderId: newOrder._id,
                  sellerUserId: newOrder.userId,
                  tradePrice: orderPrice,
                  filledAmount: amount,
                  buyOrderId: newOrder._id,
                  buyerUserId: newOrder.userId,
                  buyPrice: orderPrice,
                  sellPrice: orderPrice,
                  pair: globalPairDetails._id,
                  pairName: pairName,
                  total: filledPrice,
                  buyFee: orderType == "buy" ? orderFee : 0,
                  sellFee: orderType == "sell" ? orderFee : 0,
                  orderType: orderType,
                  convertedAmount: globalPairDetails.tocurrency[0].USDvalue * filledPrice,
                  role
                }
                let tradeChart = {
                  price: orderPrice,
                  open: orderPrice,
                  high: orderPrice,
                  low: orderPrice,
                  close: orderPrice,
                  volume: amount,
                  total: amount * orderPrice,
                  pair: globalPairDetails._id,
                  pairName: pairName,
                  type: orderType
                }
                await query_helper.insertData(tradeChartDb, tradeChart);
                await _tradeMap.pairPriceUpdate(tradeChart, "marketExecute");
                const tempRes = await query_helper.insertData(mapDb, insertTempDbJson);
                if (tempRes.status) {
                  const tempId = tempRes.msg._id;
                  // sell order profit
                  if (orderType == "sell" && orderFee > 0) {
                    const referralSellGiven = await _tradeMap.referral(newOrder.userId, globalPairDetails.tocurrency[0].currencyId, globalPairDetails, orderFee, 'sell', tempId);
                    let sellOrderProfitToAdmin = {
                      mappingOrderId: tempId,
                      type: 'trade sell',
                      userId: newOrder.userId,
                      currencyId: referralSellGiven.currencyId,
                      USDvalue: referralSellGiven.USDvalue,
                      totalFees: referralSellGiven.fees,
                      refund: referralSellGiven.refund,
                      fees: referralSellGiven.fees - referralSellGiven.refund,
                      usdFees: (referralSellGiven.fees - referralSellGiven.refund) * referralSellGiven.USDvalue,
                      userFeeReduced: referralSellGiven.userFeeReduced,
                      voucherIds: referralSellGiven.voucherIds
                    }
                    if (referralSellGiven.referPercentage) {
                      sellOrderProfitToAdmin.referPercentage = referralSellGiven.referPercentage;
                    }
                    await query_helper.insertData(ProfitDB, sellOrderProfitToAdmin);
                    orderFee = referralSellGiven.orderFees;
                  }
                  // buy order profit
                  if (orderType == "buy" && orderFee > 0) {
                    const referralBuyGiven = await _tradeMap.referral(newOrder.userId, globalPairDetails.fromcurrency[0].currencyId, globalPairDetails, orderFee, 'buy', tempId);
                    let buyOrderProfitToAdmin = {
                      mappingOrderId: tempId,
                      type: 'trade buy',
                      userId: newOrder.userId,
                      currencyId: referralBuyGiven.currencyId,
                      USDvalue: referralBuyGiven.USDvalue,
                      totalFees: referralBuyGiven.fees,
                      refund: referralBuyGiven.refund,
                      fees: referralBuyGiven.fees - referralBuyGiven.refund,
                      usdFees: (referralBuyGiven.fees - referralBuyGiven.refund) * referralBuyGiven.USDvalue,
                      userFeeReduced: referralBuyGiven.userFeeReduced,
                      voucherIds: referralBuyGiven.voucherIds
                    }
                    if (referralBuyGiven.referPercentage) {
                      buyOrderProfitToAdmin.referPercentage = referralBuyGiven.referPercentage;
                    }
                    await query_helper.insertData(ProfitDB, buyOrderProfitToAdmin);
                    orderFee = referralBuyGiven.orderFees;
                  }
                  let tdsPercentage = (typeof siteSettingData.tradeTDSPercentage != 'undefined' && typeof siteSettingData.tradeTDSPercentage != undefined && siteSettingData.tradeTDSPercentage > 0) ? siteSettingData.tradeTDSPercentage : 0;
                  let tdsBuyValue = 0, tdsSellValue = 0;
                  if (tdsPercentage > 0) {
                    if (globalPairDetails.frompair.currencySymbol == 'INR' || globalPairDetails.topair.currencySymbol == 'INR') {
                      tdsBuyValue = globalPairDetails.topair.currencySymbol == 'INR' ? 0 : (common.mathRound(amount, +orderFee, 'subtraction') * tdsPercentage) / 100;
                      tdsSellValue = globalPairDetails.topair.currencySymbol != 'INR' ? 0 : (common.mathRound(common.mathRound(amount, orderPrice, 'multiplication'), +orderFee, 'subtraction') * tdsPercentage) / 100;
                    } else {
                      tdsBuyValue = (common.mathRound(amount, +orderFee, 'subtraction') * tdsPercentage) / 100;
                      tdsSellValue = (common.mathRound(common.mathRound(amount, orderPrice, 'multiplication'), +orderFee, 'subtraction') * tdsPercentage) / 100;
                    }
                  }
                  //seller balance update
                  if (orderType == "sell") {
                    await common.insertActivity(newOrder.userId, "--", 'Trade Sell Complete', "--", "");
                    let tradedSellBalance = common.mathRound(common.mathRound(common.mathRound(amount, orderPrice, 'multiplication'), +orderFee, 'subtraction'), +tdsSellValue, 'subtraction');
                    await query_helper.updateData(mapDb, 'one', { _id: tempId }, { tdsSellValue: tdsSellValue });
                    const sellBalance = await common.getbalance(newOrder.userId, globalPairDetails.tocurrency[0].currencyId);
                    let curSellBalance = sellBalance.amount;
                    let sellNewBalance = common.mathRound(curSellBalance, tradedSellBalance, 'addition');
                    // if (newOrder.orderType != 'market') {
                    //   await common.updateHoldAmount(newOrder.userId, globalPairDetails.fromcurrency[0].currencyId, -(+amount));
                    // }
                    // await common.updateUserBalance(newOrder.userId, globalPairDetails.tocurrency[0].currencyId, sellNewBalance, tempId, 'Mapping Sell');
                  }
                  //buyer balance update
                  if (orderType == "buy") {
                    await common.insertActivity(newOrder.userId, "--", 'Trade Buy Complete', "--", "");
                    let tradedBuyBalance = common.mathRound(common.mathRound(amount, +orderFee, 'subtraction'), +tdsBuyValue, 'subtraction');
                    await query_helper.updateData(mapDb, 'one', { _id: tempId }, { tdsBuyValue: tdsBuyValue });
                    const buyBalance = await common.getbalance(newOrder.userId, globalPairDetails.fromcurrency[0].currencyId);
                    let curBuyBalance = buyBalance.amount;
                    let buyNewBalance = common.mathRound(curBuyBalance, tradedBuyBalance, 'addition');
                    // if (newOrder.orderType != 'market') {
                    //   await common.updateHoldAmount(newOrder.userId, globalPairDetails.tocurrency[0].currencyId, -(+amount * +orderPrice));
                    // }
                    // await common.updateUserBalance(newOrder.userId, globalPairDetails.fromcurrency[0].currencyId, buyNewBalance, tempId, 'Mapping Buy');
                    if (pairName == 'USDT_INR') {
                      await preBookCalculation(newOrder.userId, amount, orderPrice, tempId, globalPairDetails.tocurrency[0].currencyId);
                    }
                  }
                  let newAmount = common.mathRound(newOrder.amount, +amount, 'subtraction');
                  newAmount = +(newAmount.toFixed(globalPairDetails.frompair.siteDecimal));
                  const uptquery = newOrder.orderType == 'market' ? 'market' : newAmount == 0 ? 'filled' : 'partially';
                  //filled amount Update
                  let newAmountCalc = common.mathRound(+newOrder.filledAmount, +amount, 'addition');
                  newOrder.filledAmount = newAmountCalc;
                  let newTotalCalc = common.mathRound(newAmount, newOrder.price, 'multiplication');
                  newAmountCalc = common.roundValues(newAmountCalc, 8);
                  newTotalCalc = common.roundValues(newTotalCalc, 8);
                  await query_helper.updateData(orderDB, 'one', { _id: newOrder._id }, { filledAmount: newAmountCalc, pendingTotal: newTotalCalc, status: uptquery });
                  _tradeMap._sendResponse(globalPairDetails, newOrder.userId, 'useremit');
                  if (newAmount > 0) {
                    const nextInc = autoInc + 1;
                    if (typeof orders[nextInc] == 'object') {
                      newOrder.amount = orderAmount;
                      _tradeMap.marketExecute(globalPairDetails, newOrder, response, orders, nextInc);
                    } else {
                      _tradeMap._sendResponse(globalPairDetails, newOrder.userId, 'pairemit');
                      if (response != '') {
                        socket.sockets.emit('createResponseFutures', response);
                      }
                    }
                  } else {
                    _tradeMap._sendResponse(globalPairDetails, newOrder.userId, 'pairemit');
                    if (response != '') {
                      socket.sockets.emit('createResponseFutures', response);
                    }
                  }
                } else {
                  _tradeMap._sendResponse(globalPairDetails, newOrder.userId, 'pairemit');
                  if (response != '') {
                    socket.sockets.emit('createResponseFutures', response);
                  }
                }
              } else {
                _tradeMap._sendResponse(globalPairDetails, newOrder.userId, 'pairemit');
                if (response != '') {
                  socket.sockets.emit('createResponseFutures', response);
                }
              }
            } else {
              _tradeMap._sendResponse(globalPairDetails, newOrder.userId, 'pairemit');
              if (response != '') {
                socket.sockets.emit('createResponseFutures', response);
              }
            }
          } else {
            _tradeMap._sendResponse(globalPairDetails, newOrder.userId, 'pairemit');
            try {
              if (response != '') {
                socket.sockets.emit('createResponseFutures', response);
              }
            } catch (e) {
              console.log('err : marketExecute', e)
            }
          }
        });
      } else {
        _tradeMap._sendResponse(globalPairDetails, newOrder.userId, 'pairemit');
        if (response != '') {
          socket.sockets.emit('createResponseFutures', response);
        }
      }
    });
  } else {
    socket.sockets.emit('createResponseFutures', response);
  }
}

mapTrade.prototype.limitExecute = async function (globalPairDetails, newOrder, response, orders, autoInc) {
  try {
    if (common.getSiteDeploy() == 0) {
      let amount = 0;
      let orderPrice = 0;
      const orderAmount = newOrder.amount;
      _tradeMap._orderTempChecking(newOrder._id, newOrder.type, async function (result) {
        if (result > 0) {
          newOrder.amount = common.mathRound(newOrder.amount, result, 'subtraction');
        }
        if (autoInc == (orders.length - 1)) {
          amount = newOrder.amount;
        } else {
          if (newOrder.amount <= orders[autoInc].amount) {
            amount = newOrder.amount;
          } else {
            amount = orders[autoInc].amount;
          }
        }
        newOrder.amount = +(newOrder.amount.toFixed(globalPairDetails.frompair.siteDecimal));
        amount = +(amount.toFixed(globalPairDetails.frompair.siteDecimal));
        if (newOrder.amount > 0 && amount > 0) {
          amount = common.roundValues(amount, 8);
          orderPrice = orders[autoInc].price;
          let getOrderBook = await query_helper.findoneData(OrderBookDB, { pair: globalPairDetails.pair }, {});
          let conditionCheck = 0;
          if (getOrderBook.status) {
            conditionCheck = 1;
          }
          if (conditionCheck == 1 || ((orderPrice >= globalPairDetails.price && newOrder.type == 'buy') || (orderPrice <= globalPairDetails.price && newOrder.type == 'sell'))) {
            const role = "taker";
            const fees = newOrder.takerFee;
            const orderType = newOrder.type;
            // const currency = orderType == "buy" ? globalPairDetails.tocurrency : globalPairDetails.fromcurrency;
            const currency = globalPairDetails.tocurrency;
            let filledPrice = common.mathRound(amount, orderPrice, 'multiplication');
            const tradeCheck = await tradeCheckBalance(newOrder.userId, currency[0].currencyId, filledPrice, orderType, newOrder.orderType, amount, orderPrice, newOrder.orderId, { status: 0, msg: '' }, 1);
            if (tradeCheck.status) {
              amount = tradeCheck.response.msg;
              if (amount > 0) {
                filledPrice = common.mathRound(amount, orderPrice, 'multiplication');
                let orderFee = 0;
                if (fees > 0 && orderType == "buy") {
                  orderFee = common.mathRound((common.mathRound(amount, fees, 'multiplication')), 100, 'division');
                }
                if (fees > 0 && orderType == "sell") {
                  orderFee = common.mathRound((common.mathRound(filledPrice, fees, 'multiplication')), 100, 'division');
                }
                const pairName = globalPairDetails.frompair.currencySymbol + '_' + globalPairDetails.topair.currencySymbol;
                let insertTempDbJson = {
                  sellOrderId: newOrder._id,
                  sellerUserId: newOrder.userId,
                  tradePrice: orderPrice,
                  filledAmount: amount,
                  buyOrderId: newOrder._id,
                  buyerUserId: newOrder.userId,
                  buyPrice: orderPrice,
                  sellPrice: orderPrice,
                  pair: globalPairDetails._id,
                  pairName: pairName,
                  total: filledPrice,
                  buyFee: orderType == "buy" ? orderFee : 0,
                  sellFee: orderType == "sell" ? orderFee : 0,
                  orderType: orderType,
                  convertedAmount: globalPairDetails.tocurrency[0].USDvalue * filledPrice,
                  role
                }
                let tradeChart = {
                  price: orderPrice,
                  open: orderPrice,
                  high: orderPrice,
                  low: orderPrice,
                  close: orderPrice,
                  volume: amount,
                  total: amount * orderPrice,
                  pair: globalPairDetails._id,
                  pairName: pairName,
                  type: orderType
                }
                await query_helper.insertData(tradeChartDb, tradeChart);
                await _tradeMap.pairPriceUpdate(tradeChart, "limitExecute");
                const tempRes = await query_helper.insertData(mapDb, insertTempDbJson);
                if (tempRes.status) {
                  const tempId = tempRes.msg._id;
                  // sell order profit
                  if (orderType == "sell" && orderFee > 0) {
                    const referralSellGiven = await _tradeMap.referral(newOrder.userId, globalPairDetails.tocurrency[0].currencyId, globalPairDetails, orderFee, 'sell', tempId);
                    let sellOrderProfitToAdmin = {
                      mappingOrderId: tempId,
                      type: 'trade sell',
                      userId: newOrder.userId,
                      currencyId: referralSellGiven.currencyId,
                      USDvalue: referralSellGiven.USDvalue,
                      totalFees: referralSellGiven.fees,
                      refund: referralSellGiven.refund,
                      fees: referralSellGiven.fees - referralSellGiven.refund,
                      usdFees: (referralSellGiven.fees - referralSellGiven.refund) * referralSellGiven.USDvalue,
                      userFeeReduced: referralSellGiven.userFeeReduced,
                      voucherIds: referralSellGiven.voucherIds
                    }
                    if (referralSellGiven.referPercentage) {
                      sellOrderProfitToAdmin.referPercentage = referralSellGiven.referPercentage;
                    }
                    await query_helper.insertData(ProfitDB, sellOrderProfitToAdmin);
                    orderFee = referralSellGiven.orderFees;
                  }
                  // buy order profit
                  if (orderType == "buy" && orderFee > 0) {
                    const referralBuyGiven = await _tradeMap.referral(newOrder.userId, globalPairDetails.fromcurrency[0].currencyId, globalPairDetails, orderFee, 'buy', tempId);
                    let buyOrderProfitToAdmin = {
                      mappingOrderId: tempId,
                      type: 'trade buy',
                      userId: newOrder.userId,
                      currencyId: referralBuyGiven.currencyId,
                      USDvalue: referralBuyGiven.USDvalue,
                      totalFees: referralBuyGiven.fees,
                      refund: referralBuyGiven.refund,
                      fees: referralBuyGiven.fees - referralBuyGiven.refund,
                      usdFees: (referralBuyGiven.fees - referralBuyGiven.refund) * referralBuyGiven.USDvalue,
                      userFeeReduced: referralBuyGiven.userFeeReduced,
                      voucherIds: referralBuyGiven.voucherIds
                    }
                    if (referralBuyGiven.referPercentage) {
                      buyOrderProfitToAdmin.referPercentage = referralBuyGiven.referPercentage;
                    }
                    await query_helper.insertData(ProfitDB, buyOrderProfitToAdmin);
                    orderFee = referralBuyGiven.orderFees;
                  }
                  let tdsPercentage = (typeof siteSettingData.tradeTDSPercentage != 'undefined' && typeof siteSettingData.tradeTDSPercentage != undefined && siteSettingData.tradeTDSPercentage > 0) ? siteSettingData.tradeTDSPercentage : 0;
                  let tdsBuyValue = 0, tdsSellValue = 0;
                  if (tdsPercentage > 0) {
                    if (globalPairDetails.frompair.currencySymbol == 'INR' || globalPairDetails.topair.currencySymbol == 'INR') {
                      tdsBuyValue = globalPairDetails.topair.currencySymbol == 'INR' ? 0 : (common.mathRound(amount, +orderFee, 'subtraction') * tdsPercentage) / 100;
                      tdsSellValue = globalPairDetails.topair.currencySymbol != 'INR' ? 0 : (common.mathRound(common.mathRound(amount, orderPrice, 'multiplication'), +orderFee, 'subtraction') * tdsPercentage) / 100;
                    } else {
                      tdsBuyValue = (common.mathRound(amount, +orderFee, 'subtraction') * tdsPercentage) / 100;
                      tdsSellValue = (common.mathRound(common.mathRound(amount, orderPrice, 'multiplication'), +orderFee, 'subtraction') * tdsPercentage) / 100;
                    }
                  }
                  //seller balance update
                  if (orderType == "sell") {
                    await common.insertActivity(newOrder.userId, "--", 'Trade Sell Complete', "--", "");
                    let tradedSellBalance = common.mathRound(common.mathRound(common.mathRound(amount, orderPrice, 'multiplication'), +orderFee, 'subtraction'), +tdsSellValue, 'subtraction');
                    await query_helper.updateData(mapDb, 'one', { _id: tempId }, { tdsSellValue: tdsSellValue });
                    const sellBalance = await common.getbalance(newOrder.userId, globalPairDetails.tocurrency[0].currencyId);
                    let curSellBalance = sellBalance.amount;
                    let sellNewBalance = common.mathRound(curSellBalance, tradedSellBalance, 'addition');
                    // if (newOrder.orderType != 'market') {
                    //   await common.updateHoldAmount(newOrder.userId, globalPairDetails.fromcurrency[0].currencyId, -(+amount));
                    // }
                    // await common.updateUserBalance(newOrder.userId, globalPairDetails.tocurrency[0].currencyId, sellNewBalance, tempId, 'Mapping Sell');
                  }
                  //buyer balance update
                  if (orderType == "buy") {
                    await common.insertActivity(newOrder.userId, "--", 'Trade Buy Complete', "--", "");
                    let tradedBuyBalance = common.mathRound(common.mathRound(amount, +orderFee, 'subtraction'), +tdsBuyValue, 'subtraction');
                    await query_helper.updateData(mapDb, 'one', { _id: tempId }, { tdsBuyValue: tdsBuyValue });
                    const buyBalance = await common.getbalance(newOrder.userId, globalPairDetails.fromcurrency[0].currencyId);
                    let curBuyBalance = buyBalance.amount;
                    let buyNewBalance = common.mathRound(curBuyBalance, tradedBuyBalance, 'addition');
                    // if (newOrder.orderType != 'market') {
                    //   await common.updateHoldAmount(newOrder.userId, globalPairDetails.tocurrency[0].currencyId, -(+amount * +orderPrice));
                    // }
                    // await common.updateUserBalance(newOrder.userId, globalPairDetails.fromcurrency[0].currencyId, buyNewBalance, tempId, 'Mapping Buy');
                    if (pairName == 'USDT_INR') {
                      await preBookCalculation(newOrder.userId, amount, orderPrice, tempId, globalPairDetails.tocurrency[0].currencyId);
                    }
                  }
                  if (orderType == "buy" && newOrder.price > orders[autoInc].price) {
                    var price1 = common.mathRound(newOrder.price, orders[autoInc].price, 'subtraction');
                    let theftPrice = common.mathRound(amount, price1, 'multiplication');
                    const theftBalance = await common.getbalance(newOrder.userId, globalPairDetails.tocurrency[0].currencyId);
                    var curTheftBalance = theftBalance.amount;
                    var theftNewBalance = common.mathRound(curTheftBalance, theftPrice, 'addition');
                    common.updateUserBalance(newOrder.userId, globalPairDetails.tocurrency[0].currencyId, theftNewBalance, tempId, 'trade - return price');
                  }
                  let newAmount = common.mathRound(newOrder.amount, +amount, 'subtraction');
                  newAmount = +(newAmount.toFixed(globalPairDetails.frompair.siteDecimal));
                  const uptquery = newOrder.orderType == 'market' ? 'market' : newAmount == 0 ? 'filled' : 'partially';
                  //filled amount Update
                  let newAmountCalc = common.mathRound(+newOrder.filledAmount, +amount, 'addition');
                  newOrder.filledAmount = newAmountCalc;
                  let newTotalCalc = common.mathRound(newAmount, newOrder.price, 'multiplication');
                  newAmountCalc = common.roundValues(newAmountCalc, 8);
                  newTotalCalc = common.roundValues(newTotalCalc, 8);
                  await query_helper.updateData(orderDB, 'one', { _id: newOrder._id }, { filledAmount: newAmountCalc, pendingTotal: newTotalCalc, status: uptquery });
                  _tradeMap._sendResponse(globalPairDetails, newOrder.userId, 'pairemit');
                  if (newAmount > 0) {
                    const nextInc = autoInc + 1;
                    if (typeof orders[nextInc] == 'object') {
                      newOrder.amount = orderAmount;
                      _tradeMap.limitExecute(globalPairDetails, newOrder, response, orders, nextInc);
                    }
                  }
                }
              }
            }
          }
        }
      });
    }
  } catch (e) {
    console.log('err : limitExecute', e)
  }
}

mapTrade.prototype.mappingLoop = async function (globalPairDetails, lastInsertOrder, dbMatchingOrders, inc) {
  if (common.getSiteDeploy() == 0) {
    let mapOrder = dbMatchingOrders[inc];
    let newOrder = {};
    for (var key in lastInsertOrder) {
      newOrder[key] = lastInsertOrder[key];
    }
    let amount = 0;
    let orderPrice = 0;
    _tradeMap._orderTempChecking(mapOrder._id, mapOrder.type, async function (result) {
      if (result > 0) {
        mapOrder.amount = common.mathRound(mapOrder.amount, result, 'subtraction');
      }
      _tradeMap._orderTempChecking(newOrder._id, newOrder.type, async function (result) {
        if (result > 0) {
          newOrder.amount = common.mathRound(newOrder.amount, result, 'subtraction');
        }
        if (newOrder.amount >= mapOrder.amount) {
          amount = mapOrder.amount;
        } else {
          amount = newOrder.amount;
        }
        if (mapOrder.amount > 0 && newOrder.amount > 0 && amount > 0) {
          amount = common.roundValues(amount, 8);
          if (newOrder.orderType == 'market') {
            if (mapOrder.dateTime < newOrder.dateTime) {
              orderPrice = mapOrder.price;
            } else {
              orderPrice = newOrder.price;
            }
          } else {
            orderPrice = mapOrder.price;
          }
          const buyOrder = newOrder.type == 'buy' ? newOrder : mapOrder;
          const sellOrder = newOrder.type == 'sell' ? newOrder : mapOrder;
          sellOrder.amount = common.roundValues(sellOrder.amount, 8);
          buyOrder.amount = common.roundValues(buyOrder.amount, 8);
          const role = buyOrder.dateTime < sellOrder.dateTime ? "maker" : "taker";
          const buyFees = buyOrder.dateTime < sellOrder.dateTime ? buyOrder.makerFee : buyOrder.takerFee;
          const sellFees = buyOrder.dateTime < sellOrder.dateTime ? sellOrder.takerFee : sellOrder.makerFee;
          const orderType = buyOrder.dateTime < sellOrder.dateTime ? 'sell' : 'buy';
          // const currency = newOrder.type == "buy" ? globalPairDetails.tocurrency : globalPairDetails.fromcurrency;
          const currency = globalPairDetails.tocurrency;
          let filledPrice = common.mathRound(amount, orderPrice, 'multiplication');
          let buyFee = 0;
          let sellFee = 0;
          let response = { status: 0, msg: '' };
          const tradeCheck = await tradeCheckBalance(newOrder.userId, currency[0].currencyId, filledPrice, newOrder.type, newOrder.orderType, amount, orderPrice, newOrder.orderId, response, 1);
          if (tradeCheck.status) {
            amount = tradeCheck.response.msg;
            filledPrice = common.mathRound(amount, orderPrice, 'multiplication');
            if (buyFees > 0) {
              buyFee = common.mathRound((common.mathRound(amount, buyFees, 'multiplication')), 100, 'division');
            }
            if (sellFees > 0) {
              if (sellOrder.status == "market") {
                sellFee = common.mathRound((common.mathRound(filledPrice, sellFees, 'multiplication')), 100, 'division');
              } else {
                sellFee = common.mathRound((common.mathRound(common.mathRound(amount, sellOrder.price, 'multiplication'), sellFees, 'multiplication')), 100, 'division');
              }
            }
            let buy1Price = orderPrice, sell1Price = orderPrice;
            if (buyOrder.status != "market") {
              buy1Price = buyOrder.price;
            }
            if (sellOrder.status != "market") {
              sell1Price = sellOrder.price;
            }
            const pairName = globalPairDetails.frompair.currencySymbol + '_' + globalPairDetails.topair.currencySymbol;
            let insertTempDbJson = {
              sellOrderId: sellOrder._id,
              sellerUserId: sellOrder.userId,
              tradePrice: orderPrice,
              filledAmount: amount,
              buyOrderId: buyOrder._id,
              buyerUserId: buyOrder.userId,
              buyPrice: buy1Price,
              sellPrice: sell1Price,
              pair: globalPairDetails._id,
              pairName: pairName,
              total: filledPrice,
              buyFee: buyFee,
              sellFee: sellFee,
              orderType: orderType,
              convertedAmount: globalPairDetails.tocurrency[0].USDvalue * filledPrice,
              role
            }
            let tradeChart = {
              price: orderPrice,
              open: orderPrice,
              high: orderPrice,
              low: orderPrice,
              close: orderPrice,
              volume: amount,
              total: amount * orderPrice,
              pair: globalPairDetails._id,
              pairName: pairName,
              type: orderType
            }
            await query_helper.insertData(tradeChartDb, tradeChart);
            await _tradeMap.pairPriceUpdate(tradeChart, "mappingLoop");
            const tempRes = await query_helper.insertData(mapDb, insertTempDbJson);
            if (tempRes.status) {
              const tempId = tempRes.msg._id;
              let theftPrice = 0;
              if (buyOrder.price > sellOrder.price) {
                var price1 = common.mathRound(buyOrder.price, sellOrder.price, 'subtraction');
                theftPrice = common.mathRound(amount, price1, 'multiplication');
              }
              // sell order profit
              if (sellFee > 0) {
                const referralSellGiven = await _tradeMap.referral(sellOrder.userId, globalPairDetails.tocurrency[0].currencyId, globalPairDetails, sellFee, 'sell', tempId);
                let sellOrderProfitToAdmin = {
                  mappingOrderId: tempId,
                  type: 'trade sell',
                  userId: sellOrder.userId,
                  currencyId: referralSellGiven.currencyId,
                  USDvalue: referralSellGiven.USDvalue,
                  totalFees: referralSellGiven.fees,
                  refund: referralSellGiven.refund,
                  fees: referralSellGiven.fees - referralSellGiven.refund,
                  usdFees: (referralSellGiven.fees - referralSellGiven.refund) * referralSellGiven.USDvalue,
                  userFeeReduced: referralSellGiven.userFeeReduced,
                  voucherIds: referralSellGiven.voucherIds,
                }
                if (referralSellGiven.referPercentage) {
                  sellOrderProfitToAdmin.referPercentage = referralSellGiven.referPercentage;
                }
                await query_helper.insertData(ProfitDB, sellOrderProfitToAdmin);
                sellFee = referralSellGiven.orderFees;
              }
              //buy order profit
              if (buyFee > 0) {
                const referralBuyGiven = await _tradeMap.referral(buyOrder.userId, globalPairDetails.fromcurrency[0].currencyId, globalPairDetails, buyFee, 'buy', tempId);
                let buyOrderProfitToAdmin = {
                  mappingOrderId: tempId,
                  type: 'trade buy',
                  userId: buyOrder.userId,
                  currencyId: referralBuyGiven.currencyId,
                  USDvalue: referralBuyGiven.USDvalue,
                  totalFees: referralBuyGiven.fees,
                  refund: referralBuyGiven.refund,
                  fees: referralBuyGiven.fees - referralBuyGiven.refund,
                  usdFees: (referralBuyGiven.fees - referralBuyGiven.refund) * referralBuyGiven.USDvalue,
                  userFeeReduced: referralBuyGiven.userFeeReduced,
                  voucherIds: referralBuyGiven.voucherIds
                }
                if (referralBuyGiven.referPercentage) {
                  buyOrderProfitToAdmin.referPercentage = referralBuyGiven.referPercentage;
                }
                await query_helper.insertData(ProfitDB, buyOrderProfitToAdmin);
                buyFee = referralBuyGiven.orderFees;
              }
              common.insertActivity(buyOrder.userId, "--", 'Trade Buy Complete', "--", "");
              common.insertActivity(sellOrder.userId, "--", 'Trade Sell Complete', "--", "");
              //seller balance update
              let tdsPercentage = (typeof siteSettingData.tradeTDSPercentage != 'undefined' && typeof siteSettingData.tradeTDSPercentage != undefined && siteSettingData.tradeTDSPercentage > 0) ? siteSettingData.tradeTDSPercentage : 0;
              let tdsBuyValue = 0, tdsSellValue = 0;
              if (tdsPercentage > 0) {
                if (globalPairDetails.frompair.currencySymbol == 'INR' || globalPairDetails.topair.currencySymbol == 'INR') {
                  tdsBuyValue = globalPairDetails.topair.currencySymbol == 'INR' ? 0 : (common.mathRound(amount, +buyFee, 'subtraction') * tdsPercentage) / 100;
                  tdsSellValue = globalPairDetails.topair.currencySymbol != 'INR' ? 0 : (common.mathRound(common.mathRound(amount, sell1Price, 'multiplication'), +sellFee, 'subtraction') * tdsPercentage) / 100;
                } else {
                  tdsBuyValue = (common.mathRound(amount, +buyFee, 'subtraction') * tdsPercentage) / 100;
                  tdsSellValue = (common.mathRound(common.mathRound(amount, sell1Price, 'multiplication'), +sellFee, 'subtraction') * tdsPercentage) / 100;
                }
              }
              let tradedSellBalance = common.mathRound(common.mathRound(common.mathRound(amount, sell1Price, 'multiplication'), +sellFee, 'subtraction'), +tdsSellValue, 'subtraction');
              await query_helper.updateData(mapDb, 'one', { _id: tempId }, { tdsSellValue: tdsSellValue });
              const sellBalance = await common.getbalance(sellOrder.userId, globalPairDetails.tocurrency[0].currencyId);
              let curSellBalance = sellBalance.amount;
              let sellNewBalance = common.mathRound(curSellBalance, tradedSellBalance, 'addition');
              // if (sellOrder.orderType != 'market') {
              //   common.updateHoldAmount(sellOrder.userId, globalPairDetails.fromcurrency[0].currencyId, -(+amount));
              // }
              // await common.updateUserBalance(sellOrder.userId, globalPairDetails.tocurrency[0].currencyId, sellNewBalance, tempId, 'Mapping Sell');
              //buyer balance update
              let tradedBuyBalance = common.mathRound(common.mathRound(amount, +buyFee, 'subtraction'), +tdsBuyValue, 'subtraction');
              await query_helper.updateData(mapDb, 'one', { _id: tempId }, { tdsBuyValue: tdsBuyValue });
              const buyBalance = await common.getbalance(buyOrder.userId, globalPairDetails.fromcurrency[0].currencyId);
              let curBuyBalance = buyBalance.amount;
              let buyNewBalance = common.mathRound(curBuyBalance, tradedBuyBalance, 'addition');
              // if (buyOrder.orderType != 'market') {
              //   common.updateHoldAmount(buyOrder.userId, globalPairDetails.tocurrency[0].currencyId, -(+amount * +buyOrder.price));
              // }
              // common.updateUserBalance(buyOrder.userId, globalPairDetails.fromcurrency[0].currencyId, buyNewBalance, tempId, 'Mapping Buy');
              //theft balance update
              if (theftPrice > 0 && newOrder.type == 'buy') {
                const theftUser = buyOrder.dateTime > sellOrder.dateTime ? buyOrder.userId : sellOrder.userId;
                const theftBalance = await common.getbalance(theftUser, globalPairDetails.tocurrency[0].currencyId);
                var curTheftBalance = theftBalance.amount;
                var theftNewBalance = common.mathRound(curTheftBalance, theftPrice, 'addition');
                common.updateUserBalance(newOrder.userId, globalPairDetails.tocurrency[0].currencyId, theftNewBalance, tempId, 'trade - return price');
              }
              async.parallel({
                hourChange: function (cb) {
                  tradeChartDb.aggregate([
                    {
                      $match: {
                        "pair": globalPairDetails._id,
                        "time": {
                          $lte: new Date(),
                          $gte: new Date(new Date().setDate(new Date().getDate() - 1))
                        }
                      }
                    },
                    {
                      $sort: { datetime: 1 }
                    },
                    {
                      $group: {
                        _id: null,
                        first: { $first: '$price' },
                        last: { $last: '$price' },
                        high: { $max: '$price' },
                        low: { $min: '$price' },
                        Total: { $sum: '$total' },
                      }
                    }
                  ]).exec(cb)
                },
                yesterDaychange: async function () {
                  const resData = await query_helper.findoneData(tradeChartDb, { "pair": globalPairDetails._id, "time": { $lte: new Date(new Date().setDate(new Date().getDate() - 1)) } }, { price: 1 }, { time: -1 });
                  return resData.msg;
                },
                yesterDaychangeLast: async function () {
                  const resData = await query_helper.findoneData(tradeChartDb, { "pair": globalPairDetails._id, "time": { $gte: new Date(new Date().setDate(new Date().getDate() - 1)) } }, { price: 1 }, { time: 1 });
                  return resData.msg;
                },
              }, async function (err, results) {
                const hourChangeData = results.hourChange[0]
                const lastPrice = globalPairDetails.price;
                if (hourChangeData) {
                  const yesterday = results.yesterDaychange;
                  let elsPrice = 0;
                  if (yesterday) {
                    elsPrice = results.yesterDaychange.price
                  } else {
                    elsPrice = results.yesterDaychangeLast.price
                  }
                  const elsePrice = elsPrice
                  const high = hourChangeData.high
                  const low = hourChangeData.low
                  const volume = hourChangeData.Total
                  const usdPrice = globalPairDetails.topair.USDvalue * orderPrice
                  const newLast = (((orderPrice - elsePrice) / elsePrice) * 100)
                  let updatePairJson = {
                    price: orderPrice,
                    lastPrice: lastPrice,
                    change: newLast,
                    // changeValue: orderPrice - elsPrice,

                    changeValue: (!isNaN(orderPrice - elsPrice) ? orderPrice - elsPrice : 0),

                    high: high,
                    low: low,
                    usdPrice: isNaN(usdPrice) ? 1 : usdPrice,
                    volume: volume
                  }
                  await query_helper.updateData(pairsDB, 'one', { _id: globalPairDetails._id }, updatePairJson);
                  buyOrder.amount = common.mathRound(buyOrder.amount, +amount, 'subtraction');
                  sellOrder.amount = common.mathRound(sellOrder.amount, +amount, 'subtraction');
                  const buyuptquery = buyOrder.orderType == 'market' ? 'market' : buyOrder.amount == 0 ? 'filled' : 'partially';
                  const selluptquery = sellOrder.orderType == 'market' ? 'market' : sellOrder.amount == 0 ? 'filled' : 'partially';
                  //filled amount Update
                  let newbuyAmountCalc = common.mathRound(+buyOrder.filledAmount, +amount, 'addition');
                  let newbuyTotalCalc = common.mathRound(buyOrder.amount, buyOrder.price, 'multiplication');
                  newbuyAmountCalc = common.roundValues(newbuyAmountCalc, 8);
                  newbuyTotalCalc = common.roundValues(newbuyTotalCalc, 8);
                  await query_helper.updateData(orderDB, 'one', { _id: buyOrder._id }, { filledAmount: newbuyAmountCalc, pendingTotal: newbuyTotalCalc, status: buyuptquery });
                  let newsellAmountCalc = common.mathRound(+sellOrder.filledAmount, +amount, 'addition');
                  let newsellTotalCalc = common.mathRound(sellOrder.amount, sellOrder.price, 'multiplication');
                  newsellAmountCalc = common.roundValues(newsellAmountCalc, 8);
                  newsellTotalCalc = common.roundValues(newsellTotalCalc, 8);
                  await query_helper.updateData(orderDB, 'one', { _id: sellOrder._id }, { filledAmount: newsellAmountCalc, pendingTotal: newsellTotalCalc, status: selluptquery });
                  let firstId = (newOrder.userId).toString();
                  let secondId = (mapOrder.userId).toString();
                  if (firstId != secondId) {
                    _tradeMap._sendResponse(globalPairDetails, mapOrder.userId, 'useremit');
                  }
                  _tradeMap._stopOrderGet(orderPrice, globalPairDetails);
                  const checkAmount = newOrder.type == 'buy' ? buyOrder.amount : sellOrder.amount;
                  lastInsertOrder.filledAmount = common.mathRound(lastInsertOrder.filledAmount, +amount, 'addition');
                  lastInsertOrder.filledAmount = common.roundValues(lastInsertOrder.filledAmount, 8);
                  if (checkAmount > 0 && !tradeCheck.changedAmount) {
                    let inc1 = inc + 1;
                    if (dbMatchingOrders[inc1]) {
                      _tradeMap.mappingLoop(globalPairDetails, lastInsertOrder, dbMatchingOrders, inc1)
                    } else {
                      if (newOrder.orderType == 'market') {
                        let updateQuery = {};
                        if (lastInsertOrder.filledAmount > 0) {
                          updateQuery.amount = lastInsertOrder.filledAmount;
                          updateQuery.pendingTotal = 0;
                          updateQuery.total = common.mathRound(lastInsertOrder.filledAmount, lastInsertOrder.price, 'multiplication');
                          updateQuery.status = 'filled';
                        } else {
                          updateQuery.status = 'cancelled';
                        }
                        await query_helper.updateData(orderDB, 'one', { _id: newOrder._id }, updateQuery);
                        if (updateQuery.status == 'filled') {
                          // let insertPositionData = {
                          //   userId: ""
                          // };
                          // await query_helper.insertData(positionDB, insertPositionData);
                        }
                        _tradeMap._sendResponse(globalPairDetails, newOrder.userId, 'pairemit');
                      } else {
                        _tradeMap._sendResponse(globalPairDetails, newOrder.userId, 'pairemit');
                      }
                    }
                  } else {
                    if (newOrder.orderType == 'market') {
                      let updateQuery = {};
                      if (lastInsertOrder.filledAmount > 0) {
                        updateQuery.amount = lastInsertOrder.filledAmount;
                        updateQuery.pendingTotal = 0;
                        updateQuery.total = common.mathRound(lastInsertOrder.filledAmount, lastInsertOrder.price, 'multiplication');
                        updateQuery.status = 'filled';
                      } else {
                        updateQuery.status = 'cancelled';
                      }
                      await query_helper.updateData(orderDB, 'one', { _id: newOrder._id }, updateQuery);
                      _tradeMap._sendResponse(globalPairDetails, newOrder.userId, 'pairemit');
                    } else {
                      _tradeMap._sendResponse(globalPairDetails, newOrder.userId, 'pairemit');
                    }
                  }
                }
              })
            }
          } else {
            if (newOrder.orderType == 'market') {
              let updateQuery = {};
              if (lastInsertOrder.filledAmount > 0) {
                updateQuery.amount = lastInsertOrder.filledAmount;
                updateQuery.pendingTotal = 0;
                updateQuery.total = common.mathRound(lastInsertOrder.filledAmount, lastInsertOrder.price, 'multiplication');
                updateQuery.status = 'filled';
              } else {
                updateQuery.status = 'cancelled';
              }
              await query_helper.updateData(orderDB, 'one', { _id: newOrder._id }, updateQuery);
              _tradeMap._sendResponse(globalPairDetails, newOrder.userId, 'pairemit');
            } else {
              _tradeMap._sendResponse(globalPairDetails, newOrder.userId, 'pairemit');
            }
          }
        } else {
          if (mapOrder.amount <= 0) {
            await query_helper.updateData(orderDB, 'one', { _id: mapOrder._id }, { filledAmount: mapOrder.amount, pendingTotal: 0, status: 'filled' });
          }
          if (newOrder.orderType == 'market') {
            let updateQuery = {};
            if (lastInsertOrder.filledAmount > 0) {
              updateQuery.amount = lastInsertOrder.filledAmount;
              updateQuery.pendingTotal = 0;
              updateQuery.total = common.mathRound(lastInsertOrder.filledAmount, lastInsertOrder.price, 'multiplication');
              updateQuery.status = 'filled';
            } else {
              updateQuery.status = 'cancelled';
            }
            await query_helper.updateData(orderDB, 'one', { _id: newOrder._id }, updateQuery);
            _tradeMap._sendResponse(globalPairDetails, newOrder.userId, 'pairemit');
          } else {
            _tradeMap._sendResponse(globalPairDetails, newOrder.userId, 'pairemit');
          }
        }
      });
    });
  }
}

mapTrade.prototype.pairPriceUpdate = async function (tradeChart, from) {
  // updateExceptPairs
  // updateWazirxTrades
  // marketExecute
  // limitExecute
  // mappingLoop
  if (tradeChart.pair && tradeChart.price > 0 && (tradeChart.chartType == undefined || tradeChart.chartType == "Trade History")) {
    const orderPrice = tradeChart.price;
    const pairId = tradeChart.pair;
    await query_helper.updateData(pairsDB, 'one',
      { _id: mongoose.Types.ObjectId(pairId) },
      { marketPrice: orderPrice, price: orderPrice }
    );
  }
  return true;
}
mapTrade.prototype.referral = async function (userId, currencyId, pair, fee, type, tempId) {
  return ({ fees: fee, currencyId: currencyId, refund: 0, USDvalue: currency.USDvalue, orderFees: orderFees, userFeeReduced, voucherIds });
  try {
    const FanTknSymbol = Config.FanTknSymbol;
    let currency = type == 'buy' ? pair.frompair : pair.topair;
    let orderFees = fee;
    let userResult = await query_helper.findoneData(usersDB, { _id: userId }, {});

    let userFeeReduced = "respective";

    let voucherIds = [];

    if (userResult.status && userResult.msg) {

      const {
        referUser: referUserId,
        referPromoter: referPromoterId,
      } = userResult.msg

      let USDvalue = type == 'sell' ? pair.tocurrency[0].USDvalue : pair.fromcurrency[0].USDvalue;
      let usdFees = fee * USDvalue;

      const settData = await query_helper.findoneData(siteSettings, {}, {});
      if (settData.status) {

        let tradeFeeDiscount = settData.msg.tradeFeeDiscount > 0 ? settData.msg.tradeFeeDiscount : 0;
        const referralBonusCurrency = settData.msg.referralBonusCurrency;

        if (referralBonusCurrency != '') {
          const curResult = await query_helper.findoneData(CurrencyDb, { _id: mongoose.mongo.ObjectId(referralBonusCurrency) }, { siteDecimal: 1, USDvalue: 1, currencyId: 1, currencySymbol: 1 })
          if (curResult.status) {
            const {
              USDvalue: refUSDvalue,
              siteDecimal,
              currencyId: currencyId_wallet
            } = curResult.msg;
            let curFees = ((usdFees / refUSDvalue) * ((100 - 0) / 100)).toFixed(siteDecimal);

            let voucherData = await query_helper.findoneData(VoucherDB, {
              userId: mongoose.mongo.ObjectId(userId),
              currencyId: mongoose.mongo.ObjectId(currencyId_wallet),
              claim: 1
            }, {});

            if (voucherData.status && voucherData.msg && voucherData.msg.balance && voucherData.msg.balance > 0) {
              const beforeamountTradeFee = voucherData.msg.balance;
              if (beforeamountTradeFee >= curFees) {
                currencyId = currencyId_wallet;
                fee = curFees;
                currency = curResult.msg;
                orderFees = 0;
                userFeeReduced = "tradeFeeVoucher";
                const voucherId = voucherData.msg._id;
                const Balance = common.mathRound(beforeamountTradeFee, +curFees, 'subtraction');
                common.updateUserVoucherBalance(userId, currencyId, voucherId, Balance, tempId, 'trade - fees - ' + userFeeReduced);
                voucherIds.push(voucherData.msg._id);
              }
            }
          }
        }

        if (userFeeReduced == "respective") {
          const tradeFanTknFees = typeof userResult.msg.tradeFanTknFees == 'number' ? userResult.msg.tradeFanTknFees : 0;
          if (tradeFanTknFees == 1) {
            let fantknResult = await query_helper.findoneData(CurrencyDb, { currencySymbol: FanTknSymbol }, { siteDecimal: 1, USDvalue: 1, currencyId: 1, currencySymbol: 1 });
            if (fantknResult.status && fantknResult.msg) {

              const {
                USDvalue: fanUSDvalue,
                siteDecimal: fansiteDecimal,
                currencyId: currencyId_wallet
              } = fantknResult.msg;

              if (usdFees > 1) {
                usdFees = 1;
              }

              let curFees = ((usdFees / fanUSDvalue) * ((100 - tradeFeeDiscount) / 100)).toFixed(fansiteDecimal);
              let walletData = await query_helper.findoneData(UserWallet, { userId: mongoose.mongo.ObjectId(userId), currencyId: mongoose.mongo.ObjectId(fantknResult.msg.currencyId) }, {});

              if (walletData.status && walletData.msg && walletData.msg.amount) {
                const beforeamountTradeFee = walletData.msg.amount;
                if (beforeamountTradeFee >= curFees) {
                  const extdata = {
                    notes: {
                      usdFees,
                      curFees,
                      fanUSDvalue,
                      tradeFeeDiscount,
                      orderFees,
                      USDvalue
                    }
                  }
                  currencyId = currencyId_wallet;
                  fee = curFees;
                  currency = fantknResult.msg;
                  orderFees = 0;
                  userFeeReduced = "fanToken";
                  const balance = await common.getbalance(userId, currencyId);
                  var curBalance = balance.amount;
                  const Balance = common.mathRound(curBalance, +curFees, 'subtraction');
                  common.updateUserBalance(userId, currencyId, Balance, tempId, 'trade - fees - ' + userFeeReduced, extdata);
                }
              }
            }
          }
        }
      }

      if ((referUserId != '' || referPromoterId != '') && (userFeeReduced !== "tradeFeeVoucher")) {
        let resData = await query_helper.findoneData(siteSettings, {}, {});
        if (resData.status) {

          let referUser = { status: false };

          if (referUserId != '') {
            referUser = await query_helper.findoneData(usersDB, { _id: mongoose.Types.ObjectId(referUserId) }, {});
          }
          else if (referPromoterId != '') {
            referUser = await query_helper.findoneData(usersDB, { _id: mongoose.Types.ObjectId(referPromoterId) }, {});
          }

          if (referUser.status) {
            let referPercentage = 0;

            if (referUserId != "" && referUser.status && resData.msg) {
              referPercentage = resData.msg.referralCommission;
            }
            else if (referPromoterId != "" && referUser.status && referUser.msg.referCommission) {
              referPercentage = referUser.msg.referCommission;
            }

            if (referPercentage > 0) {
              const decimal = (typeof currency.siteDecimal == 'number' && currency.siteDecimal > 0) ? currency.siteDecimal : 8;
              let refund = parseFloat(common.mathRound((common.mathRound(fee, referPercentage, 'multiplication')), 100, 'division'));
              refund = common.roundValues(refund, decimal);

              if (refund > 0) {
                const convertedAmount = common.roundValues(currency.USDvalue * refund, 2);
                await query_helper.insertData(ReferralDB, {
                  userId: referUser.msg._id,
                  refUser: userId,
                  commissionAmount: refund,
                  currencyId: currencyId,
                  currencyName: currency.currencySymbol,
                  convertedAmount: convertedAmount,
                  convertedCurrency: 'USD',
                  description: 'Trade - ' + type
                });
                const balance = await common.getbalance(referUser.msg._id, currencyId);
                var curBalance = balance.amount;
                const Balance = common.mathRound(curBalance, refund, 'addition');
                common.updateUserBalance(referUser.msg._id, currencyId, Balance, tempId, 'trade - referral');
                return ({ fees: fee, currencyId: currencyId, refund: refund, USDvalue: currency.USDvalue, orderFees: orderFees, userFeeReduced, voucherIds, referPercentage });
              } else {
                return ({ fees: fee, currencyId: currencyId, refund: 0, USDvalue: currency.USDvalue, orderFees: orderFees, userFeeReduced, voucherIds });
              }
            }
            else {
              return ({ fees: fee, currencyId: currencyId, refund: 0, USDvalue: currency.USDvalue, orderFees: orderFees, userFeeReduced, voucherIds });
            }
          } else {
            return ({ fees: fee, currencyId: currencyId, refund: 0, USDvalue: currency.USDvalue, orderFees: orderFees, userFeeReduced, voucherIds });
          }
        } else {
          return ({ fees: fee, currencyId: currencyId, refund: 0, USDvalue: currency.USDvalue, orderFees: orderFees, userFeeReduced, voucherIds });
        }
      } else {
        return ({ fees: fee, currencyId: currencyId, refund: 0, USDvalue: currency.USDvalue, orderFees: orderFees, userFeeReduced, voucherIds });
      }
    }
    else {
      return ({ fees: fee, currencyId: currencyId, refund: 0, USDvalue: currency.USDvalue, orderFees: orderFees, userFeeReduced, voucherIds });
    }
  } catch (e) {
    console.log('err : referral : ', e)
    return ({ fees: fee, currencyId: currencyId, refund: 0, USDvalue: currency.USDvalue, orderFees: orderFees, userFeeReduced, voucherIds });
  }
}

mapTrade.prototype._positionOrderCreateChecking = async function (data = {}, callback) {
  const {
    userId = ""
  } = data;

  const findData = {
    userId,
    status: "pending"
  }
  const resData = await query_helper.findoneData(positionDB, findData);
  if (resData && resData.msg) {
    callback({
      status: true,
      positionData: resData.msg
    });
  } else {
    callback({
      status: false, positionData: {
        amount: 0
      }
    });
  }
}

mapTrade.prototype._orderTempChecking = async function (_id, type, callback) {
  let matchCase;
  if (type == 'buy') {
    matchCase = { buyOrderId: _id }
  } else {
    matchCase = { sellOrderId: _id }
  }
  mapDb.aggregate([
    {
      $match: matchCase
    },
    {
      $group: {
        _id: null,
        sum: { $sum: "$filledAmount" }
      }
    },
    {
      $project: {
        _id: 0,
        sum: 1
      }
    }
  ]).exec((err, results) => {
    if (results.length > 0) {
      if (results[0].sum) {
        callback(results[0].sum)
      } else {
        callback(0)
      }
    } else {
      callback(0)
    }
  })
}
exports.userEmit = async function (values, placeType, res) {
  var userId = values.userId,
    pairId = values.pairId,
    fromCurn = values.fromCurn,
    toCurn = values.toCurn;
  _tradeMap._userEmit(userId, pairId, fromCurn, toCurn, placeType, res);
}
mapTrade.prototype._userEmit = async function (userId, pairId, fromCurn, toCurn, placeType, res) {
  var userResponse = {};
  userResponse.userId = userId;
  userResponse.pairId = pairId;
  const balance2 = toCurn != '' ? await common.getbalance(userId, toCurn) : 0;

  async.parallel({
    positionOrders: async function () {
      const resData = await positionDB.find({
        'userId': userId,
        'pair': pairId
      }).sort({ createdAt: -1 }).limit(50).populate("pair", "decimalValue amountDecimal priceDecimal");
      return resData;
    },
    activeOrders: async function () {
      const resData = await orderDB.find({
        'userId': userId,
        'pair': pairId,
        'status': { "$in": ['active', 'partially', 'conditional'] }
      }).sort({ dateTime: -1 }).limit(50).populate("pair", "decimalValue amountDecimal priceDecimal");
      return resData;
    },
    orderHistory: async function () {
      const resData = await orderDB.find({
        'userId': userId,
        'pair': pairId,
        'status': { "$in": ['partially', 'filled', 'cancelled', 'expired'] }
      }).sort({ dateTime: -1 }).limit(50).populate("pair", "decimalValue amountDecimal priceDecimal");
      return resData;
    },
    tradeHistoryCount: async function (cb) {
      const count = await TradeDB.countDocuments({
        "$or": [
          { 'buyUserId': userId },
          { 'sellUserId': userId },
        ]
      })
      return count;
    },
    tradeHistory: async function (cb) {
      const resData = await TradeDB.find({
        "$or": [
          { 'buyUserId': userId },
          { 'sellUserId': userId },
        ]
      }).sort({ dateTime: -1 }).limit(50).populate("pair", "decimalValue amountDecimal priceDecimal");
      return resData
    },
    closedPnl: async function (cb) {
      const resData = await profitLossDB.find({
        'userId': userId,
        'pair': pairId,
      }).sort({ dateTime: -1 }).limit(50).populate("pair", "decimalValue amountDecimal priceDecimal");
      return resData
    }
  }, function (err, results) {
    userResponse.toBalance = balance2.perpetualAmount;

    userResponse.positionOrders = results.positionOrders;
    userResponse.activeOrders = results.activeOrders;
    userResponse.tradeHistory = results.tradeHistory;
    userResponse.orderHistory = results.orderHistory;
    userResponse.closedPnl = results.closedPnl;

    userResponse.count = {
      tradeHistory: results.tradeHistoryCount
    }
    if (placeType == "api") {
      res.json(userResponse)
    } else {
      socket.sockets.emit('userResponseUSDTPerpetual', userResponse);
    }
  })
}
exports.cancelOrder = async function (orderId, userId, callback) {
  try {
    let orderDoc = await orderDB.findOneAndUpdate({
      'userId': userId,
      '_id': orderId,
      "$or":[
        {'status': 'active'},
        {'status': 'conditional'},
      ]
    },
    { 'status': 'cancelled' }).populate("pair", "takerFee");
    if (!orderDoc) {
      return callback({ status: false, Msg: "Invalid OrderId!" })
    }
    if (orderDoc.status == 'conditional') {
      callback({ status: true, Msg: "Your Order is Cancelled." })
      _tradeMap._userEmit(orderDoc.userId, orderDoc.pair._id, orderDoc.fromCurrency, orderDoc.toCurrency, "", "");
      return
    }
    else
    if (orderDoc.status == 'active') {
      if (orderDoc.action == "open") {
        let orderCost = bybitUSDTCalc.orderCost(orderDoc.price, orderDoc.amount, orderDoc.leverage, orderDoc.pair.takerFee, orderDoc.type)
        let creditBal = await creditAsset(orderDoc.userId, orderDoc.toCurrency, orderCost, {
          lastId: orderDoc._id,
          affetType: "Cancel USD-M Trade"
        });
        if (creditBal.status != 'SUCCESS') {
          return callback({ status: false, Msg: "Please try after 5 minutes!" });
        }
        callback({ status: true, Msg: "Your Order is Cancelled and balance is credited to your wallet" })
      }
      else {
        callback({ status: true, Msg: "Your Order is Cancelled" });
      }
      _tradeMap._userEmit(orderDoc.userId, orderDoc.pair._id, orderDoc.fromCurrency, orderDoc.toCurrency, "", "");
      return;
    } else {
      return callback({ status: false, Msg: "Order is Already Cancelled!" })
    }
  } catch (err) {
    console.log('------err', err)
    return callback({ status: false, Msg: "Please try after 5 minutes!" });
  }
}
mapTrade.prototype.OrderCancel = async function (orderDetails, userId, pairInfo, callback) {
  try {
    if (common.getSiteDeploy() == 0) {
      let calculateAmount = 0;
      let currency;
      currency = pairInfo.tocurrency[0].currencyId;
      calculateAmount = common.mathRound(orderDetails.price, (common.mathRound(orderDetails.amount, +orderDetails.filledAmount, 'subtraction')), 'multiplication')

      const leverage = orderDetails.leverage ? orderDetails.leverage : 1;
      calculateAmount = calculateAmount / leverage;

      // if (orderDetails.type == 'buy') {
      //   currency = pairInfo.tocurrency[0].currencyId;
      //   calculateAmount = common.mathRound(orderDetails.price, (common.mathRound(orderDetails.amount, +orderDetails.filledAmount, 'subtraction')), 'multiplication')
      // } else {
      //   currency = pairInfo.fromcurrency[0].currencyId;
      //   calculateAmount = common.mathRound(orderDetails.amount, +orderDetails.filledAmount, 'subtraction')
      // }
      let remAmount = common.mathRound(orderDetails.amount, +orderDetails.filledAmount, 'subtraction')
      const balance = await common.getbalance(userId, currency);
      var curBalance = balance.amount;
      var Balance = common.mathRound(curBalance, calculateAmount, 'addition');
      let updateData;

      let tempId = orderDetails._id;
      if (orderDetails.status == 'active' || orderDetails.status == 'stoporder') {
        updateData = { status: 'cancelled', usdTotal: 0 };
      } else {
        updateData = {
          // amount: orderDetails.filledAmount,
          // total: orderDetails.filledAmount * orderDetails.price,
          pendingTotal: 0,
          status: 'filled'
        };
        let usdPrice = orderDetails.price * pairInfo.tocurrency[0].USDvalue;
        let fee = 0;
        let usdFee = 0;
        if (orderDetails.type == "buy") {
          fee = (remAmount * orderDetails.takerFee) / 100;
          usdFee = fee * pairInfo.fromcurrency[0].USDvalue;
        } else {
          fee = (remAmount * orderDetails.price * orderDetails.takerFee) / 100;
          usdFee = fee * pairInfo.tocurrency[0].USDvalue;
        }
        // let createNew = {
        //   userId: orderDetails.userId,
        //   amount: remAmount,
        //   price: orderDetails.price,
        //   type: orderDetails.type,
        //   makerFee: orderDetails.makerFee,
        //   takerFee: orderDetails.takerFee,
        //   total: common.mathRound(remAmount, orderDetails.Price, 'multiplication'),
        //   orderType: orderDetails.orderType,
        //   pair: orderDetails.pair,
        //   status: "cancelled",
        //   pairName: orderDetails.pairName,
        //   usdPrice: usdPrice,
        //   sumFee: +fee,
        //   usdSumFee: +usdFee
        // }
        // await query_helper.insertData(orderDB, createNew);

        let filledPrice = common.mathRound(remAmount, orderDetails.price, 'multiplication');

        let convertedAmount = 0;
        convertedAmount = pairInfo.tocurrency[0].USDvalue * filledPrice;

        let createNew = {
          sellOrderId: orderDetails._id,
          sellerUserId: orderDetails.userId,
          tradePrice: orderDetails.price,
          filledAmount: remAmount,
          buyOrderId: orderDetails._id,
          buyerUserId: orderDetails.userId,
          buyPrice: orderDetails.price,
          sellPrice: orderDetails.price,
          pair: orderDetails.pair,
          pairName: orderDetails.pairName,
          total: filledPrice,
          buyFee: 0,
          sellFee: 0,
          orderType: orderDetails.type,
          convertedAmount: convertedAmount,
          role: "maker",
          status: "cancelled",
        };

        const tempRes = await query_helper.insertData(mapDb, createNew);
        tempId = tempRes.msg._id;

        const usdPrice_old = orderDetails.price * orderDetails.usdPrice;
        updateData.usdTotal = orderDetails.filledAmount * usdPrice_old;
      }

      let updateRes = await query_helper.updateData(orderDB, 'one', { _id: orderDetails._id }, updateData);
      if (updateRes.status) {
        common.updateHoldAmount(userId, currency, -calculateAmount);
        await common.updateUserBalance(userId, currency, Balance, tempId, 'cancel order');
        callback({ status: true, Msg: "Your Order is Cancelled and balance is credited to your wallet" })
      } else {
        callback({ status: false, Msg: "Your Order is not Cancelled. Please Try Again" })
      }
    } else {
      callback({ status: false, Msg: "Please wait for 5 minutes before placing another request!" })
    }
  } catch (e) {
    console.log('err : OrderCancel', e)
    callback({ status: false, Msg: "Your Order is not Cancelled. Please Try Again" })
  }
}
exports.stopOrderGet = async function (tradePrice, pairs) {
  _tradeMap._stopOrderGet(tradePrice, pairs);
}
mapTrade.prototype._stopOrderGet = async function (tradePrice, pairs) {
  if (common.getSiteDeploy() == 0) {
    let _globalPairDetails = pairs

    // let test = { status: "stoporder", pair: _globalPairDetails._id, type: 'sell', stopPrice: { $gte: tradePrice } }
    // let test1 = { status: "stoporder", pair: _globalPairDetails._id, type: 'buy', stopPrice: { $lte: tradePrice } }
    // let ordersList = await query_helper.findData(orderDB, test, {}, { _id: 1 }, 0);
    // if (ordersList.status && ordersList.msg.length > 0) {
    //   ordersLists = ordersLists.concat(ordersList.msg);
    // }
    // let ordersList1 = await query_helper.findData(orderDB, test1, {}, { _id: 1 }, 0);
    // if (ordersList1.status && ordersList1.msg.length > 0) {
    //   ordersLists = ordersLists.concat(ordersList1.msg);
    // }

    let test2 = {
      "$or": [
        {
          status: "stoporder",
          pair: _globalPairDetails._id,
          type: 'sell',
          stopPrice: { $gte: tradePrice }
        },
        {
          status: "stoporder",
          pair: _globalPairDetails._id,
          type: 'buy',
          stopPrice: { $lte: tradePrice }
        },
      ]
    }
    let ordersLists = [];
    let ordersList = await query_helper.findData(orderDB, test2, {}, { _id: 1 }, 0);
    if (ordersList.status && ordersList.msg.length > 0) {
      ordersLists = ordersLists.concat(ordersList.msg);
    }

    if (ordersLists.length > 0) {
      ordersLists.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
      for (let j = 0; j < ordersLists.length; j++) {
        setTimeout(async function () {
          let i = j;
          let _id = ordersLists[i]._id
          await query_helper.updateData(orderDB, 'one', { _id: _id }, { status: 'active' });
          _tradeMap.mapOrder(ordersLists[i], pairs);
        }, ((j * 1000) + 1000));
      }
    }
  }
}

let pairData = exports.pairData = async function (pair, callback, req = {}) {
  const reqBody = req.body ? req.body : {}

  let where = pair != '' ? { pair, status: 'active' } : { status: 'active' };

  let pairs = await pairsDB.findOne(where).sort({ _id: 1 }).populate("fromCurrency").populate("toCurrency");
  if (pairs) {
    async.parallel({
      TradeHistory: async function () {
        const resData = await query_helper.findData(tradeChartDb, { pair: pairs._id }, {}, { time: -1 }, 25);
        return resData.msg;
      }
    }, async function (err, tradeDetails) {
      var fromCurrency = pairs.fromCurrency ? pairs.fromCurrency.currencySymbol : "";
      var toCurrency = pairs.toCurrency ? pairs.toCurrency.currencySymbol : "";
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
      }
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
      }

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
          siteDecimal: inputData.fromCurrency.siteDecimal
        }
        todata = {
          _id: inputData.toCurrency._id,
          currencyId: inputData.toCurrency.currencyId,
          currencyName: inputData.toCurrency.currencyName,
          currencySymbol: inputData.toCurrency.currencySymbol,
          curnType: inputData.toCurrency.curnType,
          USDvalue: inputData.toCurrency.USDvalue,
          image: inputData.toCurrency.image,
          decimal: inputData.toCurrency.decimal,
          siteDecimal: inputData.toCurrency.siteDecimal
        }
      }
      delete inputData.fromCurrency;
      delete inputData.toCurrency;
      inputData.fromCurrency = fromdata;
      inputData.toCurrency = todata;
      inputData.pair = fromCurrency + '_' + toCurrency;
      if (typeof inputData.decimalValue == 'undefined' || typeof inputData.decimalValue == undefined) {
        inputData.decimalValue = inputData.toCurrency.siteDecimal;
      }
      inputData.buyOrders = tradeDetails.BuyOrder;
      inputData.sellOrders = tradeDetails.SellOrder;
      inputData.tradeHistory = tradeDetails.TradeHistory;

      if (
        typeof tradeDetails.orderBook == 'object' && typeof tradeDetails.orderBook.asks == 'object' && typeof tradeDetails.orderBook.bids == 'object'
      ) {
        let ordertype = ['buy', 'sell'];
        var item = ordertype[Math.floor(Math.random() * ordertype.length)]

        inputData.price = item == 'buy'
          ?
          tradeDetails.orderBook.bids[0] ? tradeDetails.orderBook.bids[0]._id : 0
          :
          tradeDetails.orderBook.asks[0] ? tradeDetails.orderBook.asks[0]._id : 0;

        inputData.lastPrice = item == 'buy'
          ?
          tradeDetails.orderBook.asks[0] ? tradeDetails.orderBook.asks[0]._id : 0
          :
          tradeDetails.orderBook.bids[0] ? tradeDetails.orderBook.bids[0]._id : 0;

        let update = { userbids: inputData.buyOrders, userasks: inputData.sellOrders };

        await query_helper.updateData(OrderBookDB, 'one', { pair: inputData.pair }, update);
        inputData.buyOrders.forEach((element, i) => {
          let orderPushed = 0;
          tradeDetails.orderBook.bids.forEach((element1, i1) => {
            if (element1._id == element._id) {
              orderPushed = 1;
              tradeDetails.orderBook.bids[i1].amount = tradeDetails.orderBook.bids[i1].amount + element.amount;
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
              tradeDetails.orderBook.asks[i3].amount = tradeDetails.orderBook.asks[i3].amount + element2.amount;
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
      }
      else {
        let percentageChange = 149;
        if (inputData.buyOrders && inputData.buyOrders.length > 0) {
          inputData.buyOrders[0].amount = +(+((+inputData.buyOrders[0].amount * percentageChange) / 100).toFixed(inputData.fromCurrency.siteDecimal));
          inputData.buyOrders[0]._id = +((+inputData.buyOrders[0]._id).toFixed(inputData.decimalValue));
        }
        if (inputData.sellOrders && inputData.sellOrders.length > 0) {
          inputData.sellOrders[0].amount = +(+((+inputData.sellOrders[0].amount * percentageChange) / 100).toFixed(inputData.fromCurrency.siteDecimal));
          inputData.sellOrders[0]._id = +((+inputData.sellOrders[0]._id).toFixed(inputData.decimalValue));
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
      callback({ status: true, Message: inputData })
    })
  } else {
    callback({ status: false, Message: "No Pairs Available!" });
  }
}
function executeOrders(pairDetails, type) {
  let orderPer = 1;
  let botOrder = []
  let marketPrice = pairDetails.price;
  let priceDiff = (marketPrice * orderPer) / 100;
  let diffPrice = ((+marketPrice) * (orderPer * 4)) / 100;
  let volDetails = '';
  for (let volInc = 0; volInc < volumeBetween.length; volInc++) {
    if (volumeBetween[volInc].price > marketPrice) {
      volDetails = volumeBetween[volInc];
      break;
    }
    if (volDetails == '' && volInc == (volumeBetween.length - 1)) {
      volDetails = volumeBetween[volInc];
    }
  }
  const buyEnding = marketPrice - priceDiff, buyStarting = marketPrice - diffPrice;
  const sellEnding = marketPrice + parseFloat(diffPrice), sellStarting = marketPrice + parseFloat(priceDiff);
  for (let i = 0; i < 20; i++) {
    let orderPrice;
    if (type == 'sell') {
      if (buyEnding < 1) {
        orderPrice = Math.random() * (buyEnding - buyStarting) + buyStarting
      } else {
        orderPrice = Math.random() * (buyEnding - buyStarting) + buyStarting
      }
    } else {
      if (sellEnding < 1) {
        orderPrice = Math.random() * (sellEnding - sellStarting) + sellStarting
      } else {
        orderPrice = Math.random() * (sellEnding - sellStarting) + sellStarting
      }
    }
    if ((orderPrice >= marketPrice && type == 'buy') || (orderPrice <= marketPrice && type == 'sell')) {
      let amount;
      if (volDetails.to < 1) {
        amount = (Math.random() * volDetails.to - volDetails.from) + volDetails.from;
      } else {
        amount = Math.random() * (volDetails.to - volDetails.from + 1) + volDetails.from;
      }
      amount = amount.toFixed(pairDetails.frompair.siteDecimal);
      let obj = { price: +(orderPrice.toFixed(pairDetails.decimalValue)), amount: +amount }
      botOrder.push(obj);
    }
  }
  if (type == 'sell') {
    botOrder.sort(function (a, b) {
      return b.price - a.price;
    });
  } else {
    botOrder.sort(function (a, b) {
      return a.price - b.price;
    });
  }
  const idx1 = Math.floor(Math.random() * botOrder.length);
  const idx2 = Math.floor(Math.random() * botOrder.length);
  botOrder[idx1].amount = botOrder[idx1].amount * 10;
  botOrder[idx2].amount = botOrder[idx2].amount * 100;
  return botOrder;
}
async function preBookCalculation(userId, amount, price, tempId, currencyId) {
  try {
    let bonusDetails = [];
    let getTxn = await query_helper.findoneData(Transactions, { depositType: 'Pre Booking', status: 1, userId: mongoose.Types.ObjectId(userId), 'bonusData.status': 0 }, {}, { _id: -1 });
    if (getTxn.status) {
      getTxn = getTxn.msg;
      let settings = await query_helper.findoneData(siteSettings, {}, {});
      if (settings.status && settings.msg.preBookingPercentage.length > 0) {
        settings.msg.preBookingPercentage.forEach(element => {
          let obj = {
            from: element.from * price,
            to: element.to * price,
            bonus: element.bonus
          }
          bonusDetails.push(obj);
        });
        let bonusData = getTxn.bonusData;
        let newAmount = getTxn.amount - bonusData.bonusValue;
        if ((amount * price) > newAmount) {
          amount = common.mathRound(newAmount, price, 'division');
        }
        var newValue = bonusDetails.filter(function (item) {
          return item.from <= getTxn.amount && item.to >= getTxn.amount;
        });
        if (typeof newValue != 'object' || newValue.length == 0) {
          return true;
        } else {
          if (amount > 0) {
            var price1 = newValue[0].bonus;
            let validateDate = settings.msg.extraBonusDate;
            let txnDate = new Date(getTxn.createdDate);
            let txnDMY = (txnDate.getDate() > 9 ? txnDate.getDate() : '0' + txnDate.getDate()) + '-' + (txnDate.getMonth() >= 9 ? (txnDate.getMonth() + 1) : '0' + (txnDate.getMonth() + 1)) + '-' + txnDate.getFullYear();
            if (txnDMY == validateDate) {
              price1 = price1 * settings.msg.extraBonus;
            }
            let theftPrice = common.mathRound(amount, price1, 'multiplication');
            const theftBalance = await common.getbalance(userId, currencyId);
            var curTheftBalance = theftBalance.amount;
            var theftNewBalance = common.mathRound(curTheftBalance, theftPrice, 'addition');
            await common.updateUserBalance(userId, currencyId, theftNewBalance, tempId, 'trade - bonus price');
            await query_helper.updateData(mapDb, 'one', { _id: tempId }, { discount: price1 });
            bonusData.bonusGiven = bonusData.bonusGiven + theftPrice;
            bonusData.tradeQty = bonusData.tradeQty + amount;
            bonusData.bonusValue = bonusData.bonusValue + common.mathRound(amount, price, 'multiplication');
            if ((amount * price) >= newAmount) {
              bonusData.status = 1;
            }
          } else {
            bonusData.status = 1;
          }
          await query_helper.updateData(Transactions, 'one', { _id: getTxn._id }, { bonusData: bonusData });
          return true;
        }
      } else {
        return true;
      }
    } else {
      return true;
    }
  } catch (e) {
    console.log('preBookCalculation', e)
    return true;
  }
}

// ================= New Code

function getlEntryPrice(data = {}) {
  const {
    posEntryPrice = 0,
    orderPrice = 0,
    posStatus = ""
  } = data;

  let entryPrice = 0;
  if (posStatus == "new") {
    entryPrice = (posEntryPrice + orderPrice) / 2;
  }
  else {
    entryPrice = (posEntryPrice + orderPrice) / 2;
  }
  return {
    entryPrice
  };
}

function getlLiqPrice(data = {}) {
  const {
    entryPrice = 0,
    type = ""
  } = data;

  let liqPrice = 0;
  if (type == "buy") {
    const liqPriceChange = entryPrice * (10 / 100);
    liqPrice = entryPrice + liqPriceChange;
  }
  else if (type == "sell") {
    const liqPriceChange = entryPrice * (10 / 100);
    liqPrice = entryPrice - liqPriceChange;
  }
  return {
    liqPrice
  };
}

exports.forceUpdate_call = async function (liquidityPosition, pairData) {
  forceUpdate(liquidityPosition, pairData)
}

exports._matchingProcess_call = async function (orderDoc, pairData) {
  await _tradeMap._matchingProcess(orderDoc, pairData)
}

exports.triggerConditionalOrder_call = async function (pairData) {
  await triggerConditionalOrder(pairData)
}

exports.triggerTpSl_call = async function (pairData) {
  await triggerTpSl(pairData);
}

async function forceUpdate(liquidityPosition, pairData) {
  try {
    for (let posDoc of liquidityPosition) {
      try {
        let chPosDoc = await positionDB.findOneAndDelete({ '_id': posDoc._id })
        if (chPosDoc) {
          let userDoc = await orderDB.create({
            "userId": chPosDoc.userId,
            "amount": chPosDoc.totalAmount,
            "price": pairData.marketPrice,
            "type": chPosDoc.type == 'buy' ? 'sell' : 'buy',
            "total": pairData.marketPrice * chPosDoc.totalAmount,
            "orderType": 'market',
            "pair": chPosDoc.pair,
            "pairName": chPosDoc.pairName,
            "leverage": chPosDoc.leverage,
            "method": 'isolated',
            "status": 'filled',
            "fromCurrency": chPosDoc.fromCurrency,
            "toCurrency": chPosDoc.toCurrency,
            "action": 'close',
          })

          let adminOrder = await orderDB.create({
            "userId": adminDoc._id,
            "amount": chPosDoc.totalAmount,
            "price": pairData.marketPrice,
            "type": chPosDoc.type,
            "total": pairData.marketPrice * chPosDoc.totalAmount,
            "orderType": 'market',
            "pair": chPosDoc.pair,
            "pairName": chPosDoc.pairName,
            "leverage": chPosDoc.leverage,
            "method": 'isolated',
            "status": 'filled',
            "fromCurrency": chPosDoc.fromCurrency,
            "toCurrency": chPosDoc.toCurrency,
            "action": 'close'
          })

          await TradeDB.create({
            "buyUserId": userDoc.type == 'buy' ? userDoc.userId : adminDoc._id,
            "sellUserId": userDoc.type == 'sell' ? userDoc.userId : userDoc._id,
            "buyOrderId": userDoc.type == 'buy' ? userDoc._id : adminOrder._id,
            "sellOrderId": userDoc.type == 'sell' ? userDoc._id : adminOrder._id,
            "amount": userDoc.amount,
            "price": userDoc.price,
            "type": userDoc.type,
            "total": userDoc.price * userDoc.amount,
            "pair": userDoc.pair,
            "pairName": userDoc.pairName,
          })

          let entryPrice = bybitUSDTCalc.averagePrice(chPosDoc.filled)

          let overallOC = 0, tradeFee = 0;
          for (let posFilled of chPosDoc.filled) {
            let orderCost = bybitUSDTCalc.orderCost(
              posFilled.price,
              posFilled.amount,
              chPosDoc.leverage,
              pairData.takerFee,
              chPosDoc.type,
            );
            orderCost = common.toFixed(orderCost, 8);
            overallOC = overallOC + orderCost;

            tradeFee = tradeFee + bybitUSDTCalc.feeToOpen(
              posFilled.price,
              posFilled.amount,
              pairData.takerFee,
            ) + bybitUSDTCalc.feeToClose(
              posFilled.price,
              posFilled.amount,
              pairData.takerFee,
              chPosDoc.leverage,
              chPosDoc.type,
            );
          }

          let pAndL = bybitUSDTCalc.pnl(
            entryPrice,
            pairData.marketPrice,
            chPosDoc.totalAmount,
            chPosDoc.type == "buy" ? "sell" : "buy",
          );

          pAndL = common.toFixed(pAndL, 8)
          let profitLoss = overallOC + pAndL + -tradeFee;

          await profitLossDB.create({
            "userId": chPosDoc.userId,
            "pair": chPosDoc.pair,
            "pairName": chPosDoc.pairName,
            "entryPrice": entryPrice,
            "exitPrice": pairData.marketPrice,
            "closedDir": chPosDoc.type == "buy" ? "sell" : "buy",
            "amount": chPosDoc.totalAmount,
            "tradeFee": tradeFee,
            "pAndL": (pAndL - tradeFee),
            "profitLoss": profitLoss,
            "notes": {overallOC, tradeFee, profitLoss, pAndL: (pAndL - tradeFee), pnlWithFee: pAndL},
            "type": 'liquidation',
            "openAt": chPosDoc.createdAt,
            "closedAt": new Date()
          })

          _tradeMap._userEmit(chPosDoc.userId, chPosDoc.pair, pairData.fromCurrency.currencyId, pairData.toCurrency.currencyId, "", "");
        }
      } catch (err) {
        console.log("err : forceUpdate :", err);
        continue;
      }
    }
    return true
  } catch (err) {
    console.log("err : forceUpdate :", err);
    return false
  }
}

let triggerCron = {}
async function triggerConditionalOrder(pairData) {
  if (triggerCron && triggerCron[pairData._id]) {
    return true
  }
  triggerCron[pairData._id] = true
  try {
    let tpOrder = await orderDB.find({
      pair: pairData._id,
      status: "conditional",
      orderType: "stopLimit",
      triggerType: "greater",
      triggerPrice: { $lte: pairData.marketPrice },
    });

    if (tpOrder && tpOrder.length > 0) {
      for (let pOrder of tpOrder) {
        await orderDB.findOneAndUpdate(
          { _id: pOrder._id },
          { status: "open" },
          { new: true }
        );
        _tradeMap._userEmit(pOrder.userId, pOrder.pair, pairData.fromCurrency.currencyId, pairData.toCurrency.currencyId, "", "");
      }
    }
  } catch (err) {
    console.log("err : triggerConditionalOrder ", err);
  }

  try {
    let slOrder = await orderDB.find({
      pairId: pairData._id,
      status: "conditional",
      orderType: "stopLimit",
      triggerType: "lesser",
      triggerPrice: { $gte: pairData.marketPrice },
    });

    if (slOrder && slOrder.length > 0) {
      for (let lOrder of slOrder) {
        await orderDB.findOneAndUpdate(
          { _id: lOrder._id },
          { status: "open" },
          { new: true }
        );
        _tradeMap._userEmit(lOrder.userId, lOrder.pair, pairData.fromCurrency.currencyId, pairData.toCurrency.currencyId, "", "");
      }
    }
  } catch (err) {
    console.log("err : ", err);
  }

  triggerCron[pairData._id] = false
  return
}

let tpSLProcess = {}
async function triggerTpSl(pairData) {
  let pairId = pairData._id.toString()
  try {
    if (tpSLProcess && tpSLProcess[pairId] == true) {
      return false
    }
    tpSLProcess[pairId] = true
    let tpOrders = await orderDB.find({
      'pair': pairData._id,
      'status': 'conditional',
      'tpSlType': 'greater',
      'price': { "$lte": pairData.marketPrice }
    })

    if (tpOrders && tpOrders.length > 0) {
      await closeTpSl(tpOrders, 0, pairData)
    }

    let slOrders = await orderDB.find({
      'pair': pairData._id,
      'status': 'conditional',
      'tpSlType': 'lesser',
      'price': { "$gte": pairData.marketPrice }
    })

    if (slOrders && slOrders.length > 0) {
      await closeTpSl(slOrders, 0, pairData)
    }

    tpSLProcess[pairId] = false
    return true
  } catch (err) {
    console.log('err : triggerTpSl ', err);
    tpSLProcess[pairId] = false
    return true
  }
}

async function closeTpSl(orderData, count = 0, pairData) {
  try {
    if (common.isEmpty(orderData[count])) {
      return false
    }

    let upateOrder = await orderDB.findOneAndUpdate({
      "_id": orderData[count]._id
    }, {
      'status': 'open'
    }, {
      "new": true
    })

    await orderDB.updateOne({
      'pair': upateOrder.pairId,
      'userId': orderData[count].userId,
      'status': 'conditional',
      'tpSlType': upateOrder.tpSlType == 'greater' ? 'lesser' : 'greater',
    }, {
      "$set": {
        'status': 'cancel'
      }
    });

    await _tradeMap._matchingProcess(upateOrder, pairData)

    await closeTpSl(orderData, count + 1, pairData)
  } catch (err) {
    console.log('err : closeTpSl ', err);
  }
}