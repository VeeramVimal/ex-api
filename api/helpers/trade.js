const mongoose = require('mongoose');
let common = require('./common');
var query_helper = require('./query');
var validator = require('node-validator');
let pairsDB = mongoose.model('Pairs');
let OrderBookDB = mongoose.model('OrderBook');
let usersDB = mongoose.model('Users');
let orderDB = mongoose.model('TradeOrders');
let mapDb = mongoose.model('MappingOrders');
let tradeChartDb = mongoose.model('TradeChart');
let CurrencyDb = mongoose.model('Currency');
let ReferralDB = mongoose.model('ReferralCommission');
let ProfitDB = mongoose.model('Profit');
const UserWallet = mongoose.model("UserWallet");
let siteSettings = mongoose.model('SiteSettings');
const Transactions = mongoose.model("Transactions");
const VoucherDB = mongoose.model("Voucher");
var Config = require('../Config/config');

let siteSettingData = {};
async function updateSiteSettings() {
  let settings = await query_helper.findoneData(siteSettings, {}, {})
  siteSettingData = settings.msg;
}
updateSiteSettings();
let oArray = [];
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
const Pairs = require('../model/Pairs');
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

exports.createOrder = async function (data, placeType, res) {
  try {
    var response = {};
    response['status'] = 0,
    response['type'] = data['type'],
    response['msg'] = '',
    response['orderType'] = data['orderType'],
    response['placeType'] = placeType,
    response['pair'] = data['pair'],
    response['userId'] = data['userId'];
    response['copyTrade'] = data['copyTrade'] ? data['copyTrade'] : 0;
    response['copyTradeID'] = data['copyTradeID'] ? data['copyTradeID'] : '';
    response['res'] = res;
    if(Config.sectionStatus && Config.sectionStatus.spotTrade == "Disable") {
      response['msg'] = 'Trade disabled. Kindly contact admin!';
      _tradeMap._createResponse(response);
    }
    else {
      if(common.getSiteDeploy() == 0) {
        const orderwith = oArray.indexOf(data['userId']);
        if (orderwith == -1) {
          oArray.push(data['userId'])
          setTimeout(_tradeMap._intervalFunc, 5000, data['userId']);
          var amount = data['amount'],
            userId = data['userId'],
            price = data['price'],
            pair = data['pair'],
            orderType = data['orderType'],
            type = data['type'];
            copyTrade = data['copyTrade'] ? data['copyTrade'] : 0;
            copyTradeID = data['copyTradeID'] ? data['copyTradeID'] : '';
          var check = validator.isObject()
            .withRequired('userId', validator.isString())
            .withOptional('amount', validator.isNumber())
            .withOptional('price', validator.isNumber())
            .withOptional('pair', validator.isString())
            .withOptional('orderType', validator.isString())
            .withOptional('type', validator.isString())
            .withOptional('stopPrice', validator.isNumber())
            .withOptional('copyTrade', validator.isNumber())
            .withOptional('copyTradeID', validator.isString());
          validator.run(check, data, async function (errorCount, errors) {
            if (errorCount == 0) {
              where = { "frompair.status": 1, "topair.status": 1, "status": 1, "_id": mongoose.Types.ObjectId(pair) };
              const getUser = await query_helper.findoneData(usersDB, { "_id": mongoose.Types.ObjectId(userId) }, {});//, "kycstatus": 1
              if (getUser.status) {
                const userResult = getUser.msg;
                userResult.tradeDisable = typeof userResult.tradeDisable == 'number' ? userResult.tradeDisable : 0;
                if (userResult.tradeDisable == 0) {
                  pairsDB.aggregate([
                    {
                      $lookup:
                      {
                        from: 'Currency',
                        localField: 'fromCurrency',
                        foreignField: '_id',
                        as: 'frompair'
                      }
                    },
                    {
                      $lookup:
                      {
                        from: 'Currency',
                        localField: 'toCurrency',
                        foreignField: '_id',
                        as: 'topair'
                      }
                    },
                    {
                      $project: {
                        "from_symbol_id": "$fromCurrency",
                        "to_symbol_id": "$toCurrency",
                        "min_trade_amount": "$minTrade",
                        "fees": "$fee",
                        "price": "$price",
                        "pair": "$pair",
                        "takerFee": "$takerFee",
                        "makerFee": "$makerFee",
                        "makerFeeWithKYC": "$makerFeeWithKYC",
                        "takerFeeWithKYC": "$takerFeeWithKYC",
                        "status": "$status",
                        "decimalValue": "$decimalValue",
                        "autoOrderExecute": "$autoOrderExecute",
                        "_id": "$_id",
                        "topair": "$topair",
                        "frompair": "$frompair",
                        "fromcurrency": "$frompair",
                        "tocurrency": "$topair",
                        "tradeEnable": "$tradeEnable",
                      }
                    },
                    {
                      $match: where
                    },
                  ]).exec(async function (err, resData) {
                    if (resData.length == 1) {
                      let pair_details = resData[0];
                      if(pair_details.tradeEnable == 1){
                        var nowDateT = new Date();
                        var checkDate = new Date();
                        var prevnowDateT = new Date(checkDate.setDate(checkDate.getDate() - 1));
                        let matchQ = {};
                        matchQ.userId= data['userId'];
                        matchQ.dateTime = {
                          "$gte":prevnowDateT,
                          "$lt":nowDateT
                        }
                        let ordercount = await orderDB.find(matchQ).countDocuments();
                        let settings = await query_helper.findoneData(siteSettings, {}, {})
                        siteSettingData = settings.msg;
  
                        if(ordercount <= siteSettingData.userMaxTradeCount) {
                          pair_details.frompair = pair_details.frompair[0];
                          pair_details.topair = pair_details.topair[0];
                          const checkFiat = (pair_details.frompair.curnType == 'Fiat' || pair_details.topair.curnType == 'Fiat') ? true : false;
  
                          const kycNotVerifiedFiatTrade = "allow";
                          if (kycNotVerifiedFiatTrade === "allow" || checkFiat == false || (checkFiat == true && userResult.kycstatus == 1)) {
                            var min_trade_amount = pair_details.min_trade_amount;
                            if (orderType == 'market') {
                              price = pair_details.price;
                            }
                            var total = amount * price;
                            if (total < min_trade_amount) {
                              response['msg'] = "Trade Total must be " + min_trade_amount + " " + pair_details.tocurrency[0].currencySymbol;
                              _tradeMap._createResponse(response);
                            } else {
                              const markerResponse = await getOrderValue(orderType, pair_details._id, type, price);
                              if (markerResponse.status) {
                                const currency = type == "buy" ? pair_details.tocurrency[0] : pair_details.fromcurrency[0];
                                if (amount == 0 || price == 0 || amount == "" || price == "") {
                                  response['msg'] = "Please enter valid amount and price";
                                  _tradeMap._createResponse(response);
                                } else {
  
                                  let allowTrade = "yes";
                                  let usdPrice = price * pair_details.tocurrency[0].USDvalue;
                                  const usdTotal_cur = amount * usdPrice;
  
                                  if(userResult.kycstatus != 1) {
                                    var usdTotal_old = await getOldTradeUsdval({userId});
                                    // console.log({usdTotal_old});
                                    let userTradeUsdPrice = usdTotal_cur + usdTotal_old;
                                    const levelBasedLimit = (siteSettingData.withdrawLevel && siteSettingData.withdrawLevel['level1']) ? siteSettingData.withdrawLevel['level1'] : {
                                      tradeMaxLimit: 0
                                    }
                                    if(userTradeUsdPrice > levelBasedLimit.tradeMaxLimit) {
                                      allowTrade = "no";
                                      response['msg'] = "Your Daily Trade Limit exceeds..For more Trade Please complete your KYC...!";
                                      // console.log({
                                      //   userTradeUsdPrice,
                                      //   usdTotal_cur,
                                      //   usdTotal_old,
                                      //   amount,
                                      //   usdPrice
                                      // });
                                      _tradeMap._createResponse(response);
                                    }
                                  }
  
                                  if(allowTrade == "yes") {
                                    var da_te = new Date();
                                    var ye_ar = da_te.getFullYear();
                                    var str_year = ye_ar.toString();
                                    var str_length = str_year.length;
                                    var st_r_year = str_year.substr(str_length - 2, str_length);
                                    var millis = Date.now();
                                    var orderId = "O-" + st_r_year + "-" + millis;
  
                                    const balance = await tradeCheckBalance(userId, currency.currencyId, total, type, orderType, amount, price, orderId, response, 0);
                                    if (balance.status) {
                                      let status = '';
                                      let stopPrice = 0;
                                      if (orderType == 'stop') {
                                        status = "stoporder";
                                        stopPrice = data.stopPrice;
                                      } else if (orderType == 'market') {
                                        status = "market";
                                      } else {
                                        status = "active";
                                      }
  
                                      let fee = 0;
                                      let usdFee = 0;
                                      if (type == "buy") {
                                        fee = (amount * pair_details.takerFee) / 100;
                                        usdFee = fee * pair_details.fromcurrency[0].USDvalue;
                                      } else {
                                        fee = (amount * price * pair_details.takerFee) / 100;
                                        usdFee = fee * pair_details.tocurrency[0].USDvalue;
                                      }
  
                                      let makerFeeUser = pair_details.makerFee;
                                      let takerFeeUser = pair_details.takerFee;
  
                                      if(userResult.kycstatus == 1) {
                                        makerFeeUser = pair_details.makerFeeWithKYC;
                                        takerFeeUser = pair_details.takerFeeWithKYC;
                                      }
  
                                      let orderJson = {
                                        userId: userId,
                                        amount: amount,
                                        price: price,
                                        type: type,
                                        makerFee: makerFeeUser,
                                        takerFee: takerFeeUser,
                                        total: total,
                                        pendingTotal: total,
                                        orderType: orderType,
                                        pair: pair_details._id,
                                        status: status,
                                        orderId: orderId,
                                        usdPrice: usdPrice,
                                        sumFee: +fee,
                                        usdSumFee: +usdFee,
                                        stopPrice: +stopPrice,
                                        pairName: pair_details.fromcurrency[0].currencySymbol + '_' + pair_details.tocurrency[0].currencySymbol,
                                        copyTrade:data['copyTrade'] ? data['copyTrade'] : 0,
                                      copyTradeID : data['copyTradeID'] ? data['copyTradeID'] : '',
                                      TraderID:userId,
                                        usdTotal: usdTotal_cur
                                      }
  
                                      const insertTrade = await query_helper.insertData(orderDB, orderJson);
                                      if(insertTrade.status) {
                                        common.insertActivity(userId, type + " Order has been created", 'Create Order', "user", "");
                                        response['status'] = 1;
                                        response['amount'] = amount;
                                        response['price'] = price;
                                        response['type'] = type;
                                        response['insertId'] = insertTrade.msg._id;
                                        response['order'] = insertTrade.msg;
                                        response['msg'] = "Order Created Successfully";
                                        _tradeMap._createResponse(response, pair_details);
                                      } else {
                                        // console.log('insertTrade', insertTrade)
                                        response['msg'] = "Please try after 5 seconds";
                                        _tradeMap._createResponse(balance.response);
                                      }  
                                    } else {
                                      _tradeMap._createResponse(balance.response);
                                    }
                                  }
  
                                }
                              } else {
                                response['msg'] = markerResponse.msg;
                                _tradeMap._createResponse(response);
                              }
                            }
                          } else {
                            response['msg'] = 'Your Kyc is not verified. Please verify kyc for trade Fiat Currency!';
                            _tradeMap._createResponse(response);
                          }
                        } else {
                          response['msg'] = 'You tried maximum order attempt of day, Try after 24 hours!';
                          _tradeMap._createResponse(response);
                        }
                      }
                      else {
                        response['msg'] = pair_details.pair+" disabled for trade.";
                        _tradeMap._createResponse(response);
                      }
                    } else {
                      response['msg'] = "Not a valid pair";
                      _tradeMap._createResponse(response);
                    }
                  })
                } else {
                  response['msg'] = 'Your account disabled for trade. Kindly contact admin!';
                  _tradeMap._createResponse(response);
                }
              } else {
                response['msg'] = 'Not a valid user!';
                _tradeMap._createResponse(response);
              }
            } else {
              console.log('e', errorCount, errors)
              response['msg'] = "Please fill all fields";
              _tradeMap._createResponse(response);
            }
          });
        } else {
          response['success'] = false;
          response['msg'] = "Please try after 5 seconds";
          _tradeMap._createResponse(response);
        }
      } else {
        response['msg'] = "Please wait for 5 minutes before placing another request!";
        _tradeMap._createResponse(response);
      }
    }
  } catch (e) {
    console.log('createOrder', e);
    // response['msg'] = "Please fill all fields";
    // _tradeMap._createResponse(response);
  }
};

exports.createCopyTradeOrder = async function (leader_details,copy_user_details,res={}) {
  try {
    let user_ids = ['6453550ca9a6dd29f823498c','645cb2da0975f5339832459d'];
    let copy_user = copy_user_details;
    copy_user.map(copy_user_res=>{

      console.log('copy_user_rescopy_user_res.....',copy_user_res)
      console.log('leader_detailsleader_details...',leader_details)
      var response = {};
      let data={};
      let copy_user_amt = parseFloat(copy_user_res.copy_amt);
      let leader_price = parseFloat(leader_details.price);      
      let final_amt = (copy_user_amt / leader_price);
      data['userId'] = copy_user_res.copy_user_id;
      data['amount'] = final_amt; //0.00037;
      data['price'] = leader_details.price;
      data['stopPrice'] = leader_details.stopPrice;
      data['pair'] = '6136485308c26b4025024ce1'
      data['orderType'] = leader_details.orderType;
      data['type'] = leader_details.type;


    response['status'] = 0,
    response['type'] = data['type'],
    response['msg'] = '',
    response['orderType'] = data['orderType'],
    response['placeType'] = 'socket',
    response['pair'] = data['pair'],
    response['userId'] = data['userId']; //[6453550ca9a6dd29f823498c,645cb2da0975f5339832459d]
    response['res'] = res;
    if(Config.sectionStatus && Config.sectionStatus.spotTrade == "Disable") {
      response['msg'] = 'Trade disabled. Kindly contact admin!';
      _tradeMap._createResponse(response);
    }
    else {
      console.log('elseeeeeeeeee')
      if(common.getSiteDeploy() == 0) {
        
        const orderwith = oArray.indexOf(data['userId']);
        if (orderwith == -1) {
          oArray.push(data['userId'])
          setTimeout(_tradeMap._intervalFunc, 5000, data['userId']);
          var amount = data['amount'],
            userId = data['userId'],
            price = data['price'],
            pair = data['pair'],
            orderType = data['orderType'],
            type = data['type'];
          var check = validator.isObject()
            .withRequired('userId', validator.isString())
            .withOptional('amount', validator.isNumber())
            .withOptional('price', validator.isNumber())
            .withOptional('pair', validator.isString())
            .withOptional('orderType', validator.isString())
            .withOptional('type', validator.isString())
            .withOptional('stopPrice', validator.isNumber());
          validator.run(check, data, async function (errorCount, errors) {
            if (errorCount == 0) {
              where = { "frompair.status": 1, "topair.status": 1, "status": 1, "_id": mongoose.Types.ObjectId(pair) };
              const getUser = await query_helper.findoneData(usersDB, { "_id": mongoose.Types.ObjectId(userId) }, {});//, "kycstatus": 1
              if (getUser.status) {
                const userResult = getUser.msg;
                userResult.tradeDisable = typeof userResult.tradeDisable == 'number' ? userResult.tradeDisable : 0;
                if (userResult.tradeDisable == 0) {
                  pairsDB.aggregate([
                    {
                      $lookup:
                      {
                        from: 'Currency',
                        localField: 'fromCurrency',
                        foreignField: '_id',
                        as: 'frompair'
                      }
                    },
                    {
                      $lookup:
                      {
                        from: 'Currency',
                        localField: 'toCurrency',
                        foreignField: '_id',
                        as: 'topair'
                      }
                    },
                    {
                      $project: {
                        "from_symbol_id": "$fromCurrency",
                        "to_symbol_id": "$toCurrency",
                        "min_trade_amount": "$minTrade",
                        "fees": "$fee",
                        "price": "$price",
                        "pair": "$pair",
                        "takerFee": "$takerFee",
                        "makerFee": "$makerFee",
                        "makerFeeWithKYC": "$makerFeeWithKYC",
                        "takerFeeWithKYC": "$takerFeeWithKYC",
                        "status": "$status",
                        "decimalValue": "$decimalValue",
                        "autoOrderExecute": "$autoOrderExecute",
                        "_id": "$_id",
                        "topair": "$topair",
                        "frompair": "$frompair",
                        "fromcurrency": "$frompair",
                        "tocurrency": "$topair",
                        "tradeEnable": "$tradeEnable",
                      }
                    },
                    {
                      $match: where
                    },
                  ]).exec(async function (err, resData) {
                    if (resData.length == 1) {
                      let pair_details = resData[0];
                      if(pair_details.tradeEnable == 1){
                        var nowDateT = new Date();
                        var checkDate = new Date();
                        var prevnowDateT = new Date(checkDate.setDate(checkDate.getDate() - 1));
                        let matchQ = {};
                        matchQ.userId= data['userId'];
                        matchQ.dateTime = {
                          "$gte":prevnowDateT,
                          "$lt":nowDateT
                        }
                        let ordercount = await orderDB.find(matchQ).countDocuments();
                        let settings = await query_helper.findoneData(siteSettings, {}, {})
                        siteSettingData = settings.msg;
  
                        if(ordercount <= siteSettingData.userMaxTradeCount) {
                          pair_details.frompair = pair_details.frompair[0];
                          pair_details.topair = pair_details.topair[0];
                          const checkFiat = (pair_details.frompair.curnType == 'Fiat' || pair_details.topair.curnType == 'Fiat') ? true : false;
  
                          const kycNotVerifiedFiatTrade = "allow";
                          if (kycNotVerifiedFiatTrade === "allow" || checkFiat == false || (checkFiat == true && userResult.kycstatus == 1)) {
                            var min_trade_amount = pair_details.min_trade_amount;
                            if (orderType == 'market') {
                              price = pair_details.price;
                            }
                            var total = amount * price;
                            if (total < min_trade_amount) {
                              response['msg'] = "Trade Total must be " + min_trade_amount + " " + pair_details.tocurrency[0].currencySymbol;
                              _tradeMap._createResponse(response);
                            } else {
                              const markerResponse = await getOrderValue(orderType, pair_details._id, type, price);
                              if (markerResponse.status) {
                                const currency = type == "buy" ? pair_details.tocurrency[0] : pair_details.fromcurrency[0];
                                if (amount == 0 || price == 0 || amount == "" || price == "") {
                                  response['msg'] = "Please enter valid amount and price";
                                  _tradeMap._createResponse(response);
                                } else {
  
                                  let allowTrade = "yes";
                                  let usdPrice = price * pair_details.tocurrency[0].USDvalue;
                                  const usdTotal_cur = amount * usdPrice;
  
                                  if(userResult.kycstatus != 1) {
                                    var usdTotal_old = await getOldTradeUsdval({userId});
                                    let userTradeUsdPrice = usdTotal_cur + usdTotal_old;
                                    const levelBasedLimit = (siteSettingData.withdrawLevel && siteSettingData.withdrawLevel['level1']) ? siteSettingData.withdrawLevel['level1'] : {
                                      tradeMaxLimit: 0
                                    }
                                    if(userTradeUsdPrice > levelBasedLimit.tradeMaxLimit) {
                                      allowTrade = "no";
                                      response['msg'] = "Your Daily Trade Limit exceeds..For more Trade Please complete your KYC...!";
                                      _tradeMap._createResponse(response);
                                    }
                                  }
  
                                  if(allowTrade == "yes") {
                                    var da_te = new Date();
                                    var ye_ar = da_te.getFullYear();
                                    var str_year = ye_ar.toString();
                                    var str_length = str_year.length;
                                    var st_r_year = str_year.substr(str_length - 2, str_length);
                                    var millis = Date.now();
                                    var orderId = "O-" + st_r_year + "-" + millis;
  
                                    const balance = await tradeCheckBalance(userId, currency.currencyId, total, type, orderType, amount, price, orderId, response, 0);
                                    if (balance.status) {
                                      let status = '';
                                      let stopPrice = 0;
                                      if (orderType == 'stop') {
                                        status = "stoporder";
                                        stopPrice = data.stopPrice;
                                      } else if (orderType == 'market') {
                                        status = "market";
                                      } else {
                                        status = "active";
                                      }
  
                                      let fee = 0;
                                      let usdFee = 0;
                                      if (type == "buy") {
                                        fee = (amount * pair_details.takerFee) / 100;
                                        usdFee = fee * pair_details.fromcurrency[0].USDvalue;
                                      } else {
                                        fee = (amount * price * pair_details.takerFee) / 100;
                                        usdFee = fee * pair_details.tocurrency[0].USDvalue;
                                      }
  
                                      let makerFeeUser = pair_details.makerFee;
                                      let takerFeeUser = pair_details.takerFee;
  
                                      if(userResult.kycstatus == 1) {
                                        makerFeeUser = pair_details.makerFeeWithKYC;
                                        takerFeeUser = pair_details.takerFeeWithKYC;
                                      }
  
                                      let orderJson = {
                                        userId: userId,
                                        amount: amount,
                                        price: price,
                                        type: type,
                                        makerFee: makerFeeUser,
                                        takerFee: takerFeeUser,
                                        total: total,
                                        pendingTotal: total,
                                        orderType: orderType,
                                        pair: pair_details._id,
                                        status: status,
                                        orderId: orderId,
                                        usdPrice: usdPrice,
                                        sumFee: +fee,
                                        usdSumFee: +usdFee,
                                        stopPrice: +stopPrice,
                                        copyTrade:1,
                                        copyTradeID:leader_details.copyTradeID,
                                        TraderID:leader_details.userId,
                                        pairName: pair_details.fromcurrency[0].currencySymbol + '_' + pair_details.tocurrency[0].currencySymbol,  
                                        usdTotal: usdTotal_cur
                                      }
  
                                      const insertTrade = await query_helper.insertData(orderDB, orderJson);
                                      if(insertTrade.status) {
                                        common.insertActivity(userId, type + " Order has been created", 'Create Order', "user", "");
                                        response['status'] = 1;
                                        response['amount'] = amount;
                                        response['price'] = price;
                                        response['type'] = type;
                                        response['insertId'] = insertTrade.msg._id;
                                        response['order'] = insertTrade.msg;
                                        response['msg'] = "Order Created Successfully";
                                        _tradeMap._createResponse(response, pair_details);
                                      } else {
                                        // console.log('insertTrade', insertTrade)
                                        response['msg'] = "Please try after 5 seconds";
                                        _tradeMap._createResponse(balance.response);
                                      }  
                                    } else {
                                      _tradeMap._createResponse(balance.response);
                                    }
                                  }
  
                                }
                              } else {
                                response['msg'] = markerResponse.msg;
                                _tradeMap._createResponse(response);
                              }
                            }
                          } else {
                            response['msg'] = 'Your Kyc is not verified. Please verify kyc for trade Fiat Currency!';
                            _tradeMap._createResponse(response);
                          }
                        } else {
                          response['msg'] = 'You tried maximum order attempt of day, Try after 24 hours!';
                          _tradeMap._createResponse(response);
                        }
                      }
                      else {
                        response['msg'] = pair_details.pair+" disabled for trade.";
                        _tradeMap._createResponse(response);
                      }
                    } else {
                      response['msg'] = "Not a valid pair";
                      _tradeMap._createResponse(response);
                    }
                  })
                } else {
                  response['msg'] = 'Your account disabled for trade. Kindly contact admin!';
                  _tradeMap._createResponse(response);
                }
              } else {
                response['msg'] = 'Not a valid user!';
                _tradeMap._createResponse(response);
              }
            } else {
              console.log('e', errorCount, errors)
              response['msg'] = "Please fill all fields";
              _tradeMap._createResponse(response);
            }
          });
        } else {
          response['success'] = false;
          response['msg'] = "Please try after 5 seconds";
          _tradeMap._createResponse(response);
        }
      } else {
        response['msg'] = "Please wait for 5 minutes before placing another request!";
        _tradeMap._createResponse(response);
      }
    }
   })
  } catch (e) {
    console.log('createOrder', e);
  }
}
async function getOldTradeUsdval(data = {}) {
  // let dailyDate = new Date();
  // dailyDate.setDate(dailyDate.getDate() - 1);

  const {
    userId = ""
  } = data;

  const result = await orderDB.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        // dateTime: { $gte: dailyDate }
      }
    },
    {
      "$group": {
        "_id": '$userId',
        usdTotal: { $sum: '$usdTotal' }
      }
    },
    {
      $project: {usdTotal: "$usdTotal"},
    }
  ]).exec();

  // console.log({result});
  let totalDailyusdVal = 0;

  try {
    if(result.length > 0) {
      if(result[0].usdTotal > 0) {
        totalDailyusdVal = result[0].usdTotal;
      }
    }
    // console.log("totalDailyusdVal 1 : ", totalDailyusdVal);
    return totalDailyusdVal;
  } catch(e){
    // console.log("totalDailyusdVal 2 : ", totalDailyusdVal);
    console.log('totalDailyusdVal : ', e);
    return totalDailyusdVal;
  }
}
async function tradeCheckBalance(userId, currency, total, type, orderType, amount, price, orderId, response, orderPlace) {
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
        returnResponse.changedAmount = true;
      }
    }
    if (parseFloat(amount) > 0 && parseFloat(total) > 0) {
      if ((total <= curBalance && type == "buy") || (amount <= curBalance && type == "sell")) {
        let Balance = 0;
        let updateValue = 0;
        if (type == "buy") {
          Balance = common.mathRound(curBalance, total, 'subtraction');
          updateValue = total;
        } else {
          Balance = common.mathRound(curBalance, amount, 'subtraction');
          updateValue = amount;
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
async function getOrderValue(orderType, pairId, type, price) {
  if (orderType == 'market') {
    let whereCondn;
    let sendType;
    if (type == 'buy') {
      sendType = 'Sell';
      whereCondn = { pair: pairId, Type: "sell", price: { $lte: price }, $or: [{ status: 'active' }, { status: 'partially' }] }
      sorting = { dateTime: 1 }
    } else {
      sendType = 'Buy';
      whereCondn = { pair: pairId, Type: "buy", price: { $gte: price }, $or: [{ status: 'active' }, { status: 'partially' }] }
      sorting = { dateTime: 1 }
    }
    const getOrders = await query_helper.findData(orderDB, whereCondn, {}, sorting, 0);
    let obj = { status: true, msg: '' };
    if (!getOrders.status || getOrders.length == 0) {
      obj.msg = "No Matching " + sendType + " Orders Found";
      obj.status = false;
    }
    return (obj);
  } else {
    return ({ status: true });
  }
}
mapTrade.prototype._createResponse = async function (response, pairs = '') {
  if (response['status'] == 1) {
    if (response['orderType'] == 'stop') {
      response['msg'] = "Stop Limit Order Created Successfully";
      _tradeMap._sendResponse(pairs, response.order.userId, 'pairemit');
    } else {
      if(common.getSiteDeploy() == 0) {
        let autoOrderExecute = typeof pairs.autoOrderExecute == 'number' ? pairs.autoOrderExecute : 0;
        if (autoOrderExecute == 1) {
          // auto order execution
          let getOrderBook = await query_helper.findoneData(OrderBookDB, { pair: pairs.pair }, {});
          let buyPrice = parseFloat(pairs.price);
          let sellPrice = parseFloat(pairs.price);
          if (getOrderBook.status && getOrderBook.msg.bids[0]) {
            if(getOrderBook.msg.asks[0]) {
              buyPrice = getOrderBook.msg.asks[0]._id;
            }
            if(getOrderBook.msg.bids[0]) {
              sellPrice = getOrderBook.msg.bids[0]._id;
            }
          }
          if (response.orderType == 'market' || ((response.order.type == 'sell' && sellPrice >= response.order.price) || (response.order.type == 'buy' && buyPrice <= response.order.price))) {
            response['msg'] = "Limit Order Executed Successfully";
            console.log("_createResponse --> autoOrderExecute", {pairs, order: response.order, response});
            _tradeMap.autoOrderExecute(pairs, response.order, response);
          } else {
            _tradeMap._sendResponse(pairs, response.order.userId, 'pairemit');
            if (response['placeType'] == "socket") {
              socket.sockets.emit('createResponse', response);
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
        } else {
          _tradeMap.mapOrder(response.order, pairs, response);
        }
      }
    }
  }
  if (response.orderType != 'market' || (response.orderType == 'market' && response['status'] == 0)) {
    if (response['placeType'] == "socket") {
      socket.sockets.emit('createResponse', response);
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
};
mapTrade.prototype._sendResponse = async function (pair, userId, type) {
  console.log("_sendResponse : ");
  if (type == 'pairemit') {
    var pairSymbol = pair.frompair.currencySymbol + '_' + pair.topair.currencySymbol;
    pairData(pairSymbol, (result) => {
      // console.log('result', result.Message.tradeHistory);
      // console.log('trade -> pairResponse 1');
      socket.sockets.emit('pairResponse', result.Message);
    });
  }
  if (userId && mongoose.isValidObjectId(userId)) {
    _tradeMap._userEmit(userId, pair._id, pair.frompair.currencyId, pair.topair.currencyId, "", "");
  }
};
mapTrade.prototype.mapOrder = async function (lastInsertOrder, pairs, response = '') {
  if(common.getSiteDeploy() == 0) {
    var globalPairDetails = pairs;
    if (lastInsertOrder.type == 'buy') {
      if (lastInsertOrder.orderType == 'market') {
        whereCondn = { pair: globalPairDetails._id, type: "sell", $or: [{ status: 'active' }, { status: 'partially' }], orderPicked: 0, cancelInitiate: {$ne: 1} }
      } else {
        whereCondn = { pair: globalPairDetails._id, type: "sell", price: { $lte: lastInsertOrder.price }, $or: [{ status: 'active' }, { status: 'partially' }], orderPicked: 0, cancelInitiate: {$ne: 1} }
      }
      sorting = { price: 1, dateTime: 1 }
    } else {
      if (lastInsertOrder.orderType == 'market') {
        whereCondn = { pair: globalPairDetails._id, type: "buy", $or: [{ status: 'active' }, { status: 'partially' }], orderPicked: 0, cancelInitiate: {$ne: 1} }
      } else {
        whereCondn = { pair: globalPairDetails._id, type: "buy", price: { $gte: lastInsertOrder.price }, $or: [{ status: 'active' }, { status: 'partially' }], orderPicked: 0, cancelInitiate: {$ne: 1} }
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
            socket.sockets.emit('createResponse', response);
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
            socket.sockets.emit('createResponse', response);
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
  // console.log({lastInsertOrder});
  if(common.getSiteDeploy() == 0) {
    if (lastInsertOrder.orderType == 'market') {
      let getOrderBook = await query_helper.findoneData(OrderBookDB, { pair: globalPairDetails.pair }, {});
      let orders = [];
      if (getOrderBook.status) {
        let bookOrders = lastInsertOrder.type == 'buy' ? getOrderBook.msg.asks : getOrderBook.msg.bids;
        orders = [];
        bookOrders.forEach(element => {
          orders.push({price: element._id, amount: element.amount})
        });
      }
      else {
        orders = executeOrders(globalPairDetails, lastInsertOrder.type);
      }
      // console.log('autoOrderExecute : ', "getOrderBook.status", getOrderBook.status, {
      //   orders
      // });
      _tradeMap.marketExecute(globalPairDetails, lastInsertOrder, response, orders, 0);
    } else {
      // console.log("globalPairDetails.pair  : ", globalPairDetails.pair );
      let getOrderBook = await query_helper.findoneData(OrderBookDB, { pair: globalPairDetails.pair }, {});
      let orders = [];
      if (getOrderBook.status) {
        let bookOrders = lastInsertOrder.type == 'buy' ? getOrderBook.msg.asks : getOrderBook.msg.bids;
        orders = [];
        bookOrders.forEach(element => {
          if((lastInsertOrder.type == 'buy' && element._id <= lastInsertOrder.price) || (lastInsertOrder.type == 'sell' && element._id >= lastInsertOrder.price)) {
            orders.push({price: element._id, amount: element.amount})
          }
        });
      }
      else {
        orders = executeOrders(globalPairDetails, lastInsertOrder.type)
      }
      if(orders.length == 0) {
        orders.push({price: lastInsertOrder.price, amount: lastInsertOrder.amount})
      }
      // console.log('autoOrderExecute : ', "getOrderBook.status", getOrderBook.status, {
      //   orders
      // });
      _tradeMap.limitExecute(globalPairDetails, lastInsertOrder, response, orders, 0);
    }
  }
}
mapTrade.prototype.marketExecute = async function (globalPairDetails, newOrder, response, orders, autoInc) {
  console.log("marketExecute : ");
  if(common.getSiteDeploy() == 0) {
    response['msg'] = "Market " + response['type'].charAt(0).toUpperCase() + response['type'].slice(1) + " Order Executed Successfully!";
    let amount = 0;
    let orderPrice = 0;
    const orderAmount = newOrder.amount;
    _tradeMap._orderTempChecking(newOrder._id, newOrder.type, async function (result) {
      if (result > 0) {
        newOrder.amount = common.mathRound(newOrder.amount, result, 'subtraction');
      }
      // console.log({
      //   orders
      // });
      if(orders && orders.length > 0) {
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
          const currency = orderType == "buy" ? globalPairDetails.tocurrency : globalPairDetails.fromcurrency;
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
                type: orderType,
                dataFrom: "marketExecute _orderTempChecking"
              }
              const tempRes = await query_helper.insertData(mapDb, insertTempDbJson);
              if (tempRes.status) {
                await query_helper.insertData(tradeChartDb, tradeChart);
                await _tradeMap.pairPriceUpdate(tradeChart, "marketExecute");
                const tempId = tempRes.msg._id;
                // sell order profit
                // console.log("1 _orderTempChecking : ", {orderType, orderFee});
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
                  if(referralSellGiven.referPercentage) {
                    sellOrderProfitToAdmin.referPercentage = referralSellGiven.referPercentage;
                  }
                  await query_helper.insertData(ProfitDB, sellOrderProfitToAdmin);
                  orderFee = referralSellGiven.orderFees;
                }
                //buy order profit
                // console.log("2 _orderTempChecking : ", {orderType, orderFee});
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
                  if(referralBuyGiven.referPercentage) {
                    buyOrderProfitToAdmin.referPercentage = referralBuyGiven.referPercentage;
                  }
                  await query_helper.insertData(ProfitDB, buyOrderProfitToAdmin);
                  orderFee = referralBuyGiven.orderFees;
                }
                let tdsPercentage = ( typeof siteSettingData.tradeTDSPercentage != 'undefined' && typeof siteSettingData.tradeTDSPercentage != undefined && siteSettingData.tradeTDSPercentage > 0 ) ? siteSettingData.tradeTDSPercentage : 0;
                let tdsBuyValue = 0, tdsSellValue = 0;
                if(tdsPercentage > 0) {
                  if(globalPairDetails.frompair.currencySymbol == 'INR' || globalPairDetails.topair.currencySymbol == 'INR') {
                    tdsBuyValue = globalPairDetails.topair.currencySymbol == 'INR' ? 0 : (common.mathRound(amount, +orderFee, 'subtraction') * tdsPercentage)/100;
                    tdsSellValue = globalPairDetails.topair.currencySymbol != 'INR' ? 0 : (common.mathRound(common.mathRound(amount, orderPrice, 'multiplication'), +orderFee, 'subtraction') * tdsPercentage)/100;
                  } else {
                    tdsBuyValue = (common.mathRound(amount, +orderFee, 'subtraction') * tdsPercentage)/100;
                    tdsSellValue = (common.mathRound(common.mathRound(amount, orderPrice, 'multiplication'), +orderFee, 'subtraction') * tdsPercentage)/100;
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
                  if (newOrder.orderType != 'market') {
                    await common.updateHoldAmount(newOrder.userId, globalPairDetails.fromcurrency[0].currencyId, -(+amount));
                  }
                  await common.updateUserBalance(newOrder.userId, globalPairDetails.tocurrency[0].currencyId, sellNewBalance, tempId, 'Mapping Sell');
                }
                //buyer balance update
                if (orderType == "buy") {
                  await common.insertActivity(newOrder.userId, "--", 'Trade Buy Complete', "--", "");
                  let tradedBuyBalance = common.mathRound(common.mathRound(amount, +orderFee, 'subtraction'), +tdsBuyValue, 'subtraction');
                  await query_helper.updateData(mapDb, 'one', { _id: tempId }, { tdsBuyValue: tdsBuyValue });
                  const buyBalance = await common.getbalance(newOrder.userId, globalPairDetails.fromcurrency[0].currencyId);
                  let curBuyBalance = buyBalance.amount;
                  let buyNewBalance = common.mathRound(curBuyBalance, tradedBuyBalance, 'addition');
                  if (newOrder.orderType != 'market') {
                    await common.updateHoldAmount(newOrder.userId, globalPairDetails.tocurrency[0].currencyId, -(+amount * +orderPrice));
                  }
                  await common.updateUserBalance(newOrder.userId, globalPairDetails.fromcurrency[0].currencyId, buyNewBalance, tempId, 'Mapping Buy');
                  if(pairName == 'USDT_INR') {
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
                      socket.sockets.emit('createResponse', response);
                    }
                  }
                } else {
                  _tradeMap._sendResponse(globalPairDetails, newOrder.userId, 'pairemit');
                  if (response != '') {
                    socket.sockets.emit('createResponse', response);
                  }
                }
              } else {
                _tradeMap._sendResponse(globalPairDetails, newOrder.userId, 'pairemit');
                if (response != '') {
                  socket.sockets.emit('createResponse', response);
                }
              }
            } else {
              _tradeMap._sendResponse(globalPairDetails, newOrder.userId, 'pairemit');
              if (response != '') {
                socket.sockets.emit('createResponse', response);
              }
            }
          } else {
            _tradeMap._sendResponse(globalPairDetails, newOrder.userId, 'pairemit');
            if (response != '') {
              socket.sockets.emit('createResponse', response);
            }
          }
        } else {
          _tradeMap._sendResponse(globalPairDetails, newOrder.userId, 'pairemit');
          try {
            if (response != '') {
              socket.sockets.emit('createResponse', response);
            }
          } catch (e) {
            console.log('marketExecute',e)
          }
        }
      } else {
        _tradeMap._sendResponse(globalPairDetails, newOrder.userId, 'pairemit');
        if (response != '') {
          socket.sockets.emit('createResponse', response);
        }
      }
    });
  } else {
    socket.sockets.emit('createResponse', response);
  }
}
mapTrade.prototype.limitExecute = async function (globalPairDetails, newOrder, response, orders, autoInc) {
  try {
    if(common.getSiteDeploy() == 0) {
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
            const currency = orderType == "buy" ? globalPairDetails.tocurrency : globalPairDetails.fromcurrency;
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
                  type: orderType,
                  dataFrom: "limitExecute _orderTempChecking"
                }
                const tempRes = await query_helper.insertData(mapDb, insertTempDbJson);
                if (tempRes.status) {
                  await query_helper.insertData(tradeChartDb, tradeChart);
                  await _tradeMap.pairPriceUpdate(tradeChart, "limitExecute");
                  const tempId = tempRes.msg._id;
                  // sell order profit
                  // console.log("3 _orderTempChecking : ", {orderType, orderFee});
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
                    if(referralSellGiven.referPercentage) {
                      sellOrderProfitToAdmin.referPercentage = referralSellGiven.referPercentage;
                    }
                    await query_helper.insertData(ProfitDB, sellOrderProfitToAdmin);
                    orderFee = referralSellGiven.orderFees;
                  }
                  // buy order profit
                  // console.log("4 _orderTempChecking orderFee : ", {orderType, orderFee});
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
                    if(referralBuyGiven.referPercentage) {
                      buyOrderProfitToAdmin.referPercentage = referralBuyGiven.referPercentage;
                    }
                    await query_helper.insertData(ProfitDB, buyOrderProfitToAdmin);
                    orderFee = referralBuyGiven.orderFees;
                  }
                  let tdsPercentage = ( typeof siteSettingData.tradeTDSPercentage != 'undefined' && typeof siteSettingData.tradeTDSPercentage != undefined && siteSettingData.tradeTDSPercentage > 0 ) ? siteSettingData.tradeTDSPercentage : 0;
                  let tdsBuyValue = 0, tdsSellValue = 0;
                  if(tdsPercentage > 0) {
                    if(globalPairDetails.frompair.currencySymbol == 'INR' || globalPairDetails.topair.currencySymbol == 'INR') {
                      tdsBuyValue = globalPairDetails.topair.currencySymbol == 'INR' ? 0 : (common.mathRound(amount, +orderFee, 'subtraction') * tdsPercentage)/100;
                      tdsSellValue = globalPairDetails.topair.currencySymbol != 'INR' ? 0 : (common.mathRound(common.mathRound(amount, orderPrice, 'multiplication'), +orderFee, 'subtraction') * tdsPercentage)/100;
                    } else {
                      tdsBuyValue = (common.mathRound(amount, +orderFee, 'subtraction') * tdsPercentage)/100;
                      tdsSellValue = (common.mathRound(common.mathRound(amount, orderPrice, 'multiplication'), +orderFee, 'subtraction') * tdsPercentage)/100;
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
                    if (newOrder.orderType != 'market') {
                      await common.updateHoldAmount(newOrder.userId, globalPairDetails.fromcurrency[0].currencyId, -(+amount));
                    }
                    await common.updateUserBalance(newOrder.userId, globalPairDetails.tocurrency[0].currencyId, sellNewBalance, tempId, 'Mapping Sell');
                  }
                  //buyer balance update
                  if (orderType == "buy") {
                    await common.insertActivity(newOrder.userId, "--", 'Trade Buy Complete', "--", "");
                    let tradedBuyBalance = common.mathRound(common.mathRound(amount, +orderFee, 'subtraction'), +tdsBuyValue, 'subtraction');
                    await query_helper.updateData(mapDb, 'one', { _id: tempId }, { tdsBuyValue: tdsBuyValue });
                    const buyBalance = await common.getbalance(newOrder.userId, globalPairDetails.fromcurrency[0].currencyId);
                    let curBuyBalance = buyBalance.amount;
                    let buyNewBalance = common.mathRound(curBuyBalance, tradedBuyBalance, 'addition');
                    if (newOrder.orderType != 'market') {
                      await common.updateHoldAmount(newOrder.userId, globalPairDetails.tocurrency[0].currencyId, -(+amount * +orderPrice));
                    }
                    await common.updateUserBalance(newOrder.userId, globalPairDetails.fromcurrency[0].currencyId, buyNewBalance, tempId, 'Mapping Buy');
                    if(pairName == 'USDT_INR') {
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
  } catch(e) {
    console.log('limitExecute', e)
  }
}
mapTrade.prototype.mappingLoop = async function (globalPairDetails, lastInsertOrder, dbMatchingOrders, inc) {
  if(common.getSiteDeploy() == 0) {
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
          const currency = newOrder.type == "buy" ? globalPairDetails.tocurrency : globalPairDetails.fromcurrency;
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
              type: orderType,
              dataFrom: "mappingLoop _orderTempChecking _orderTempChecking"
            }
            const tempRes = await query_helper.insertData(mapDb, insertTempDbJson);
            if (tempRes.status) {
              await query_helper.insertData(tradeChartDb, tradeChart);
              await _tradeMap.pairPriceUpdate(tradeChart, "mappingLoop");
              const tempId = tempRes.msg._id;
              let theftPrice = 0;
              if (buyOrder.price > sellOrder.price) {
                var price1 = common.mathRound(buyOrder.price, sellOrder.price, 'subtraction');
                theftPrice = common.mathRound(amount, price1, 'multiplication');
              }
              // sell order profit
              // console.log("5 _orderTempChecking : sellFee : ", {sellFee});
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
                if(referralSellGiven.referPercentage) {
                  sellOrderProfitToAdmin.referPercentage = referralSellGiven.referPercentage;
                }
                await query_helper.insertData(ProfitDB, sellOrderProfitToAdmin);
                sellFee = referralSellGiven.orderFees;
              }
              // buy order profit
              // console.log("6 _orderTempChecking : buyFee : ", {buyFee});
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
                if(referralBuyGiven.referPercentage) {
                  buyOrderProfitToAdmin.referPercentage = referralBuyGiven.referPercentage;
                }
                await query_helper.insertData(ProfitDB, buyOrderProfitToAdmin);
                buyFee = referralBuyGiven.orderFees;
              }
              common.insertActivity(buyOrder.userId, "--", 'Trade Buy Complete', "--", "");
              common.insertActivity(sellOrder.userId, "--", 'Trade Sell Complete', "--", "");
              //seller balance update
              let tdsPercentage = ( typeof siteSettingData.tradeTDSPercentage != 'undefined' && typeof siteSettingData.tradeTDSPercentage != undefined && siteSettingData.tradeTDSPercentage > 0 ) ? siteSettingData.tradeTDSPercentage : 0;
              let tdsBuyValue = 0, tdsSellValue = 0;
              if(tdsPercentage > 0) {
                if(globalPairDetails.frompair.currencySymbol == 'INR' || globalPairDetails.topair.currencySymbol == 'INR') {
                  tdsBuyValue = globalPairDetails.topair.currencySymbol == 'INR' ? 0 : (common.mathRound(amount, +buyFee, 'subtraction') * tdsPercentage)/100;
                  tdsSellValue = globalPairDetails.topair.currencySymbol != 'INR' ? 0 : (common.mathRound(common.mathRound(amount, sell1Price, 'multiplication'), +sellFee, 'subtraction') * tdsPercentage)/100;
                } else {
                  tdsBuyValue = (common.mathRound(amount, +buyFee, 'subtraction') * tdsPercentage)/100;
                  tdsSellValue = (common.mathRound(common.mathRound(amount, sell1Price, 'multiplication'), +sellFee, 'subtraction') * tdsPercentage)/100;
                }
              }
              let tradedSellBalance = common.mathRound(common.mathRound(common.mathRound(amount, sell1Price, 'multiplication'), +sellFee, 'subtraction'), +tdsSellValue, 'subtraction');
              await query_helper.updateData(mapDb, 'one', { _id: tempId }, { tdsSellValue: tdsSellValue });
              const sellBalance = await common.getbalance(sellOrder.userId, globalPairDetails.tocurrency[0].currencyId);
              let curSellBalance = sellBalance.amount;
              let sellNewBalance = common.mathRound(curSellBalance, tradedSellBalance, 'addition');
              if (sellOrder.orderType != 'market') {
                common.updateHoldAmount(sellOrder.userId, globalPairDetails.fromcurrency[0].currencyId, -(+amount));
              }
              await common.updateUserBalance(sellOrder.userId, globalPairDetails.tocurrency[0].currencyId, sellNewBalance, tempId, 'Mapping Sell');
              //buyer balance update
              let tradedBuyBalance = common.mathRound(common.mathRound(amount, +buyFee, 'subtraction'), +tdsBuyValue, 'subtraction');
              await query_helper.updateData(mapDb, 'one', { _id: tempId }, { tdsBuyValue: tdsBuyValue });
              const buyBalance = await common.getbalance(buyOrder.userId, globalPairDetails.fromcurrency[0].currencyId);
              let curBuyBalance = buyBalance.amount;
              let buyNewBalance = common.mathRound(curBuyBalance, tradedBuyBalance, 'addition');
              if (buyOrder.orderType != 'market') {
                common.updateHoldAmount(buyOrder.userId, globalPairDetails.tocurrency[0].currencyId, -(+amount * +buyOrder.price));
              }
              common.updateUserBalance(buyOrder.userId, globalPairDetails.fromcurrency[0].currencyId, buyNewBalance, tempId, 'Mapping Buy');
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
                    volume: volume,
                    volume_fromCur: volume / lastPrice,
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
          if(mapOrder.amount <= 0) {
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
  // updateOrderPrice
  // updateExceptPairs
  // updateWazirxTrades
  // marketExecute
  // limitExecute
  // mappingLoop
  if(tradeChart.pair && tradeChart.price > 0 && (tradeChart.chartType == undefined || tradeChart.chartType == "Trade History")) {
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
  try {
    // console.log("referral : ", userId, currencyId, pair, fee, type, tempId);
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

        // console.log({referralBonusCurrency});

        if (referralBonusCurrency != '') {
          const curResult = await query_helper.findoneData(CurrencyDb, { _id: mongoose.mongo.ObjectId(referralBonusCurrency) }, { siteDecimal: 1, USDvalue: 1, currencyId: 1, currencySymbol: 1 })
          // console.log({curResult});
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

            // console.log({voucherData}, { mmmuserId: userId, userId: mongoose.mongo.ObjectId(userId), claim: 1 });

            if (voucherData.status && voucherData.msg && voucherData.msg.balance && voucherData.msg.balance > 0) {
              const beforeamountTradeFee = voucherData.msg.balance;
              // console.log({beforeamountTradeFee, curFees});
              if(beforeamountTradeFee >= curFees) {
                currencyId = currencyId_wallet;
                fee = curFees;
                currency = curResult.msg;
                orderFees = 0;
                userFeeReduced = "tradeFeeVoucher";
                const voucherId = voucherData.msg._id;
                const Balance = common.mathRound(beforeamountTradeFee, +curFees, 'subtraction');
                common.updateUserVoucherBalance(userId, currencyId, voucherId, Balance, tempId, 'trade - fees - '+userFeeReduced);
                voucherIds.push(voucherData.msg._id);
              }
            }
          }
        }

        if(userFeeReduced == "respective") {
          const tradeFanTknFees = typeof userResult.msg.tradeFanTknFees == 'number' ? userResult.msg.tradeFanTknFees : 0;
          if (tradeFanTknFees == 1) {
            let fantknResult = await query_helper.findoneData(CurrencyDb, { currencySymbol: FanTknSymbol }, { siteDecimal: 1, USDvalue: 1, currencyId: 1, currencySymbol: 1 });
            if (fantknResult.status && fantknResult.msg) {

              const {
                USDvalue: fanUSDvalue,
                siteDecimal: fansiteDecimal,
                currencyId: currencyId_wallet
              } = fantknResult.msg;

              if(usdFees > 1) {
                usdFees = 1;
              }

              // console.log({fanUSDvalue});
              // console.log({tradeFeeDiscount});

              let curFees = ((usdFees / fanUSDvalue) * ((100 - tradeFeeDiscount) / 100)).toFixed(fansiteDecimal);
              let walletData = await query_helper.findoneData(UserWallet, { userId: mongoose.mongo.ObjectId(userId), currencyId: mongoose.mongo.ObjectId(fantknResult.msg.currencyId) }, {});

              if (walletData.status && walletData.msg && walletData.msg.amount) {
                const beforeamountTradeFee = walletData.msg.amount;
                if(beforeamountTradeFee >= curFees) {
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
                  common.updateUserBalance(userId, currencyId, Balance, tempId, 'trade - fees - '+userFeeReduced, extdata);
                }
              }
            }
          }
        }
      }

      // console.log({
      //   userFeeReduced,
      //   voucherIds
      // })

      console.log({referUserId, referPromoterId, userFeeReduced});

      if((referUserId != '' || referPromoterId != '') && (userFeeReduced !== "tradeFeeVoucher")) {
        let resData = await query_helper.findoneData(siteSettings, {}, {});
        if(resData.status) {

          let referUser = {status: false};

          if(referUserId != '') {
            referUser = await query_helper.findoneData(usersDB, { _id: mongoose.Types.ObjectId(referUserId) }, { });
          }
          else if(referPromoterId != '') {
            referUser = await query_helper.findoneData(usersDB, { _id: mongoose.Types.ObjectId(referPromoterId) }, { });
          }

          if(referUser.status) {
            let referPercentage = 0;

            let refType = "user"

            if(referUserId != "" && referUser.status && resData.msg) {
              referPercentage = resData.msg.referralCommission;
            }
            else if(referPromoterId != "" && referUser.status && referUser.msg.referCommission) {
              referPercentage = referUser.msg.referCommission;
              refType = "promoter";
            }
            // console.log({referPercentage, fee});

            if(referPercentage > 0) {
              const decimal = (typeof currency.siteDecimal == 'number' && currency.siteDecimal > 0) ? currency.siteDecimal : 8;
              let refund = parseFloat(common.mathRound((common.mathRound(fee, referPercentage, 'multiplication')), 100, 'division'));
              // console.log({refund});
              refund = common.roundValues(refund, decimal);
              // console.log({refund, decimal});

              if (refund > 0) {
                const convertedAmount = common.roundValues(currency.USDvalue * refund, 2);
                await query_helper.insertData(ReferralDB, {
                  userId: referUser.msg._id,
                  refUser: userId,
                  refType,
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
    console.log('referral : err : ', e)
    return ({ fees: fee, currencyId: currencyId, refund: 0, USDvalue: currency.USDvalue, orderFees: orderFees, userFeeReduced, voucherIds });
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
  // console.log("_userEmit : ");
  try {
    var userResponse = {};
    userResponse.userId = userId;
    userResponse.pairId = pairId;
    const balance1 = fromCurn != '' ? await common.getbalance(userId, fromCurn) : 0;
    const balance2 = toCurn != '' ? await common.getbalance(userId, toCurn) : 0;
    const whereCondnUser = { userId: userId, $or: [{ status: 'active' }, { status: 'partially' }] };
    const whereCondnUser1 = { userId: userId, status: 'stoporder' };
    async.parallel({
      activeOrders: async function () {
        const resData = await orderDB.find(whereCondnUser).sort({ dateTime: -1 }).limit(50).populate("pair", "decimalValue amountDecimal");
        return resData;
      },
      stopOrders: async function () {
        const resData = await orderDB.find(whereCondnUser1).sort({ dateTime: -1 }).limit(50).populate("pair", "decimalValue amountDecimal");
        return resData;
      },
      tradeHistoryCount: async function (cb) {
        // const resData = await mapDb
        //   .find({ $or: [{ buyerUserId: userId }, { sellerUserId: userId }] })
        //   .sort({ dateTime: -1 })
        //   .limit(50)
        //   .populate("pair", "decimalValue amountDecimal");
        // return resData;
        const findData = {
          "$or": [
            { buyerUserId: mongoose.Types.ObjectId(userId) },
            { sellerUserId: mongoose.Types.ObjectId(userId) }
          ]
        };
        const countChk = await mapDb.find(findData);
        const count = countChk && countChk.length > 0 ? countChk.length : 0;
        return count;
      },
      tradeHistory: async function (cb) {
        const findData = {
          "$or": [
            { userId: mongoose.Types.ObjectId(userId) },
          ]
        };
        const resData = await orderDB.aggregate([
          {
            $match: findData
          },

          {
            $lookup: {
              from: 'MappingOrders',
              let: {
                ordId: '$_id',
                useId: '$userId',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $or: [
                            { "$eq": ["$buyOrderId", "$$ordId"] },
                            { "$eq": ["$sellOrderId", "$$ordId"] },
                          ]
                        },
                        {
                          $or: [
                            { "$eq": ["$buyerUserId", "$$useId"] },
                            { "$eq": ["$sellerUserId", "$$useId"] },
                          ]
                        }
                      ]
                    }
                  }
                },


                {
                  $lookup:
                  {
                    from: 'Pairs',
                    localField: 'pair',
                    foreignField: '_id',
                    as: 'pair'
                  }
                },
                {
                  $unwind: {
                    "path": "$pair",
                    "preserveNullAndEmptyArrays": true
                  }
                },

                {
                  $lookup: {
                    from: 'Profit',
                    let: {
                      mapordId: '$_id',
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [
                              { "$eq": ["$mappingOrderId", "$$mapordId"] },
                              { "$eq": ["$userId", mongoose.Types.ObjectId(userId)] },
                            ]
                          }
                        }
                      },
        
                      {
                        $lookup: {
                          from: 'Currency',
                          let: {
                            curId: '$currencyId',
                          },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $and: [
                                    { "$eq": ["$currencyId", "$$curId"] },
                                  ]
                                }
                              }
                            },
                          ],
                          as: 'currency'
                        },
                      },
                      {
                        $unwind: {
                          "path": "$currency",
                          "preserveNullAndEmptyArrays": true
                        }
                      },
        
                    ],
                    as: 'Profit'
                  },
                },

              ],
              as: 'MappingOrders'
            },
          },

          {
            $unwind: {
              "path": "$MappingOrders",
              // "preserveNullAndEmptyArrays": true
            }
          },

          { "$sort": { _id: -1 } },
          { "$limit": 25 },
        ]).exec();
        return resData
      }
    }, function (err, results) {
      if(results) {
        userResponse.status = true;
        userResponse.fromBalance = balance1.amount;
        userResponse.toBalance = balance2.amount;
        userResponse.activeOrders = results.activeOrders;
        userResponse.stopOrders = results.stopOrders;
        userResponse.tradeHistory = results.tradeHistory;
        userResponse.count = {
          tradeHistory: results.tradeHistoryCount
        }
        if (placeType == "api") {
          res.json(userResponse)
        } else {
          socket.sockets.emit('userResponse', userResponse);
        }
      }
      else {
        console.error("err : _useremit ", err);
        userResponse.status = false;
        if (placeType == "api") {
          res.json(userResponse)
        } else {
          socket.sockets.emit('userResponse', userResponse);
        }
      }
    })
  }
  catch(err) {
    console.error("err : _useremit catch : ", err);
  }
}
exports.cancelOrder = async function (orderId, userId, callback) {
  if(common.getSiteDeploy() == 0) {
    const orderwith = oArray.indexOf(userId);
    if (orderwith == -1) {
      oArray.push(userId);
      orderDB.findOne({ userId: userId, _id: orderId }).exec(async function (ordErr, ordRes) {
        if (ordRes) {
          // console.log({ordRes});
          if(ordRes.orderPicked == 0) {
            if ((ordRes.status == 'active' || ordRes.status == 'stoporder' || ordRes.status == 'partially') && ordRes.orderType != 'market') {
              if(ordRes.cancelInitiate == 1) {
                setTimeout(_tradeMap._intervalFunc, 5000, userId);
                where = { "_id": ordRes.pair };
                pairsDB.aggregate([
                  {
                    $lookup:
                    {
                      from: 'Currency',
                      localField: 'fromCurrency',
                      foreignField: '_id',
                      as: 'frompair'
                    }
                  },
                  {
                    $lookup:
                    {
                      from: 'Currency',
                      localField: 'toCurrency',
                      foreignField: '_id',
                      as: 'topair'
                    }
                  },
                  {
                    $project: {
                      "from_symbol_id": "$fromCurrency",
                      "to_symbol_id": "$toCurrency",
                      "min_trade_amount": "$minTrade",
                      "fees": "$fee",
                      "takerFee": "$takerFee",
                      "makerFee": "$makerFee",
                      "status": "$status",
                      "_id": "$_id",
                      "topair": "$topair",
                      "frompair": "$frompair",
                      "fromcurrency": "$frompair",
                      "tocurrency": "$topair"
                    }
                  },
                  {
                    $match: where
                  },
                ]).exec(function (err, resData) {
                  if (resData.length == 1) {
                    var pair_details = resData[0];
                    pair_details.frompair = pair_details.frompair[0];
                    pair_details.topair = pair_details.topair[0];
                    _tradeMap.OrderCancel(ordRes, userId, pair_details, (activeRes) => {
                      if (activeRes.status) {
                        _tradeMap._sendResponse(pair_details, userId, 'pairemit');
                      }
                      callback(activeRes)
                    })
                  }
                  else {
                    callback({ status: false, Msg: "Something went Wrong. Please try Again" })
                  }
                });
              } else {
                let updateRes = await query_helper.updateData(orderDB, 'one', { _id: orderId }, {cancelInitiate: 1});
                if(updateRes.status) {
                  removeintervalFunc(userId);
                  oArray.push(userId)
                  setTimeout(_tradeMap._intervalFunc, 5000, userId);
                } else {
                  setTimeout(_tradeMap._intervalFunc, 5000, userId);
                }
                callback({ status: false, Msg: "Order execution stopped, Please click cancel again after 5 seconds to cancel your order" })
              }
            } else {
              setTimeout(_tradeMap._intervalFunc, 5000, userId);
              callback({ status: false, Msg: "Order is Already Cancelled!" })
            }
          } else {
            setTimeout(_tradeMap._intervalFunc, 5000, userId);
            callback({ status: false, Msg: "Order is Already Executed!" })
          }
        } else {
          setTimeout(_tradeMap._intervalFunc, 5000, userId);
          callback({ status: false, Msg: "Invalid OrderId!" })
        }
      })
    } else {
      callback({ status: false, Msg: "Please try after 5 seconds!" });
    }
  } else {
    callback({ status: false, Msg: "Please try after 5 minutes!" });
  }
}
mapTrade.prototype.OrderCancel = async function (orderDetails, userId, pairInfo, callback) {
  try {
    if(common.getSiteDeploy() == 0) {
      let calculateAmount = 0;
      let currency;
      if (orderDetails.type == 'buy') {
        currency = pairInfo.tocurrency[0].currencyId;
        calculateAmount = common.mathRound(orderDetails.price, (common.mathRound(orderDetails.amount, +orderDetails.filledAmount, 'subtraction')), 'multiplication')
      } else {
        currency = pairInfo.fromcurrency[0].currencyId;
        calculateAmount = common.mathRound(orderDetails.amount, +orderDetails.filledAmount, 'subtraction')
      }
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
        // console.log("OrderCancel : ", {createNew});
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
          convertedAmount:convertedAmount,
          role: "maker",
          status: "cancelled",
        };

        // console.log("OrderCancel : ", {createNew});
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
    console.log('OrderCancel', e)
    callback({ status: false, Msg: "Your Order is not Cancelled. Please Try Again" })
  }
}
exports.stopOrderGet = async function (tradePrice, pairs) {
  _tradeMap._stopOrderGet(tradePrice, pairs);
}
mapTrade.prototype._stopOrderGet = async function (tradePrice, pairs) {
  if(common.getSiteDeploy() == 0) {
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
let orderedPairs = [];
exports.cronExecuteOrders = async function (buyPrice, sellPrice, pairs) {
  if(common.getSiteDeploy() == 0) {
    setTimeout(async function() {
      _tradeMap.cronAutoOrder(buyPrice, sellPrice, pairs);
    }, Math.random() * 3000);
  }
}
mapTrade.prototype.cronAutoOrder = async function (buyPrice, sellPrice, pairs) {
  if(common.getSiteDeploy() == 0) {
    const orderwith = orderedPairs.indexOf(pairs.pair);
    if (orderwith == -1) {
      orderedPairs.push(pairs.pair);
      let test = { $or: [{ status: 'active' }, { status: 'partially' }], pair: pairs._id, type: 'sell', price: { $lte: sellPrice }, orderPicked: 0, cancelInitiate: {$ne: 1} }
      let test1 = { $or: [{ status: 'active' }, { status: 'partially' }], pair: pairs._id, type: 'buy', price: { $gte: buyPrice }, orderPicked: 0, cancelInitiate: {$ne: 1} }
      var ordersLists = [];
      let ordersList = await query_helper.findData(orderDB, test, {}, { _id: 1 }, 0);
      if (ordersList.status && ordersList.msg.length > 0) {
        ordersLists = ordersLists.concat(ordersList.msg);
      }
      let ordersList1 = await query_helper.findData(orderDB, test1, {}, { _id: 1 }, 0);
      if (ordersList1.status && ordersList1.msg.length > 0) {
        ordersLists = ordersLists.concat(ordersList1.msg);
      }
      if (ordersLists.length > 0) {
        let allOrders = [];
        ordersLists.forEach(element => {
          allOrders.push(element._id);
        });
        await query_helper.updateData(orderDB, 'many', {_id: {$in: allOrders}}, { orderPicked: 1 });
        setTimeout(async function() {
          var index = orderedPairs.indexOf(pairs.pair);
          if (index > -1) {
            orderedPairs.splice(index, 1);
          }
        }, 5000);
        ordersLists.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
        for (let j = 0; j < ordersLists.length; j++) {
          setTimeout(async function () {
            _tradeMap.autoOrderExecute(pairs, ordersLists[j], '');
          }, j * 2000);
        }
      } else {
        setTimeout(async function() {
          var index = orderedPairs.indexOf(pairs.pair);
          if (index > -1) {
            orderedPairs.splice(index, 1);
          }
        }, 5000);
      }
    }
  }
}
let updateOrderPrice = exports.updateOrderPrice = async function (result, symbols, wazirxPrice, ownPairs, i) {
  try {
    console.log("trade -> updateOrderPrice : ", result, symbols, wazirxPrice, ownPairs, i);
    let pairSymbol = result[i].fromcurrency[0].currencySymbol + '_' + result[i].tocurrency[0].currencySymbol;
    let mprice = result[i].marketStatus == 0 ? result[i].marketPrice : 0;
    let from = result[i].fromusd;
    let to = result[i].tousd;
    getOldPrice = (typeof result[i].getOldPrice != 'undefined' && typeof result[i].getOldPrice != undefined) ? result[i].getOldPrice : 0;
    if(typeof ownPairs[result[i].fromcurrency[0].currencySymbol.toLowerCase()+result[i].tocurrency[0].currencySymbol.toLowerCase()] == 'string') {
      let pairSet = result[i].fromcurrency[0].currencySymbol.toLowerCase()+result[i].tocurrency[0].currencySymbol.toLowerCase();
      mprice = ownPairs[pairSet];
      const changePercentage = result[i].changePercentage != 0 ? result[i].changePercentage : 0;
      mprice = (changePercentage > 0 || changePercentage < 0) ? (mprice - ((mprice * changePercentage) / 100)) : mprice;
    } else {
      if ((typeof wazirxPrice[result[i].fromcurrency[0].currencySymbol.toLowerCase()] == 'string' || result[i].fromcurrency[0].currencySymbol.toLowerCase() == 'usdt') && (typeof wazirxPrice[result[i].tocurrency[0].currencySymbol.toLowerCase()] == 'string' || result[i].tocurrency[0].currencySymbol.toLowerCase() == 'usdt')) {
        try {
          if (result[i].fromcurrency[0].currencySymbol.toLowerCase() == 'usdt' || result[i].tocurrency[0].currencySymbol.toLowerCase() == 'usdt') {
            if (result[i].fromcurrency[0].currencySymbol.toLowerCase() == 'usdt') {
              mprice = 1 / wazirxPrice[result[i].tocurrency[0].currencySymbol.toLowerCase()];
            } else {
              mprice = wazirxPrice[result[i].fromcurrency[0].currencySymbol.toLowerCase()];
            }
          } else {
            mprice = wazirxPrice[result[i].fromcurrency[0].currencySymbol.toLowerCase()] / wazirxPrice[result[i].tocurrency[0].currencySymbol.toLowerCase()];
          }
          const changePercentage = result[i].changePercentage != 0 ? result[i].changePercentage : 0;
          mprice = (changePercentage > 0 || changePercentage < 0) ? (mprice - ((mprice * changePercentage) / 100)) : mprice;
        } catch (e) {
          // console.log('updateOrderPrice',e);
          if (getOldPrice == 1) {
            const diff = 1 / Math.pow(10, result[i].decimalValue);
            let min = parseFloat((result[i].price - diff).toFixed(result[i].decimalValue)), max = parseFloat((result[i].price + diff).toFixed(result[i].decimalValue));
            let orderPrice = Math.random() * (max - min) + min;
            orderPrice = orderPrice.toFixed(result[i].decimalValue)
            mprice = orderPrice;
          } else {
            mprice = from / to;
          }
        }
      } else {
        if (getOldPrice == 1) {
          const diff = 1 / Math.pow(10, result[i].decimalValue);
          let min = parseFloat((result[i].price - diff).toFixed(result[i].decimalValue)), max = parseFloat((result[i].price + diff).toFixed(result[i].decimalValue));
          let orderPrice = Math.random() * (max - min) + min;
          orderPrice = orderPrice.toFixed(result[i].decimalValue)
          mprice = orderPrice;
        } else {
          mprice = from / to;
        }
      }
    }
    mprice = common.roundValues(mprice, 8);
    await query_helper.updateData(pairsDB, 'one', { _id: mongoose.Types.ObjectId(result[i]._id) }, { marketPrice: mprice, price: mprice });
    let volDetails = '';
    for (let volInc = 0; volInc < volumeBetween.length; volInc++) {
      if (volumeBetween[volInc].price > mprice) {
        volDetails = volumeBetween[volInc];
        break;
      }
      if (volDetails == '' && volInc == (volumeBetween.length - 1)) {
        volDetails = volumeBetween[volInc];
      }
    }
    let amount;
    if (volDetails.to < 1) {
      amount = (Math.random() * volDetails.to - volDetails.from) + volDetails.from;
    } else {
      amount = Math.random() * (volDetails.to - volDetails.from + 1) + volDetails.from;
    }
    amount = amount / 100;
    let total = common.roundValues(amount * mprice, 8);
    let ordertype = ['buy', 'sell'];
    var item = ordertype[Math.floor(Math.random() * ordertype.length)]
    var d1 = new Date();
    var d2 = new Date();
    d2.setSeconds(d1.getSeconds() - 10);
    let time = new Date(d2.getTime() + Math.random() * (d1.getTime() - d2.getTime()));
    let tradeChart = {
      price: mprice,
      open: mprice,
      high: mprice,
      low: mprice,
      close: mprice,
      volume: amount,
      total: total,
      pair: result[i]._id,
      pairName: pairSymbol,
      type: item,
      time: time,
      dataFrom: "updateOrderPrice"
    }
    const tempRes = await query_helper.insertData(tradeChartDb, tradeChart);
    // await _tradeMap.pairPriceUpdate(tradeChart, "updateOrderPrice");
    async.parallel({
      hourChange: function (cb) {
        tradeChartDb.aggregate([
          {
            $match: {
              "pair": result[i]._id,
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
              Total: { $sum: '$total' }
            }
          }
        ]).exec(cb)
      },
      yesterDaychange: async function () {
        const resData = await query_helper.findoneData(tradeChartDb, { "pair": result[i]._id, "time": { $lte: new Date(new Date().setDate(new Date().getDate() - 1)) } }, { price: 1 }, { time: -1 });
        return resData.msg;
      },
      yesterDaychangeLast: async function () {
        const resData = await query_helper.findoneData(tradeChartDb, { "pair": result[i]._id, "time": { $gte: new Date(new Date().setDate(new Date().getDate() - 1)) } }, { price: 1 }, { time: 1 });
        return resData.msg;
      }
    }, async function (err, results) {
      let hourChangeData;
      if (results.hourChange && results.hourChange.length > 0) {
        hourChangeData = results.hourChange[0];
      }
      let lastPrice = result[i].price;
      if (hourChangeData) {
        const yesterday = results.yesterDaychange;
        const elsPrice = yesterday ? results.yesterDaychange.price : results.yesterDaychangeLast.price;
        const elsePrice = elsPrice;
        const high = hourChangeData.high
        const low = hourChangeData.low
        const volume = hourChangeData.Total
        const usdPrice = to * mprice
        const newLast = (((mprice - elsePrice) / elsePrice) * 100)
        let updatePairJson = {
          price: mprice,
          lastPrice: lastPrice,
          change: (!isNaN(newLast) ? newLast : 0),
          changeValue: (!isNaN(mprice - elsPrice) ? mprice - elsPrice : 0),
          high: high,
          low: low,
          usdPrice: isNaN(usdPrice) ? 1 : usdPrice,
          volume: volume,
          volume_fromCur: volume / lastPrice,
        }
        let updTradeChartData = {
          high: high,
          low: low,
          open: hourChangeData.first,
          close: hourChangeData.last
        };
        await query_helper.updateData(tradeChartDb, 'one', { _id: tempRes.msg._id }, updTradeChartData);
        await query_helper.updateData(pairsDB, 'one', { _id: result[i]._id }, updatePairJson);
        var project = { _id: 0, Date: "$Date", pair: { $literal: pairSymbol }, low: "$low", high: "$high", open: "$open", close: "$close", volume: "$volume", exchange: { $literal: "Exchange" } };
        tradeChartDb.aggregate([
          {
            $match: {
              pairName: pairSymbol
            }
          },
          {
            "$group": {
              "_id": {
                "year": {
                  "$year": "$time"
                },
                "month": {
                  "$month": "$time"
                },
                "day": {
                  "$dayOfMonth": "$time"
                }
              },
              count: {
                "$sum": 1
              },
              Date: { $first: "$time" },
              pairName: { $first: '$pairName' },
              low: { $min: '$price' },
              high: { $max: '$price' },
              open: { $first: '$price' },
              close: { $last: '$price' },
              volume: { $sum: '$volume' }
            }
          },
          {
            $project: project,
          },
          {
            $sort: {
              "Date": -1,
            }
          },
          { $limit: 1 }
        ]).exec(function (err, result1) {
          _tradeMap._stopOrderGet(mprice, result[i]);
          let autoOrderExecute = typeof result[i].autoOrderExecute == 'number' ? result[i].autoOrderExecute : 0;
          if (autoOrderExecute == 1) {
            let pair_details = result[i];
            pair_details.frompair = pair_details.frompair[0];
            pair_details.topair = pair_details.topair[0];
            _tradeMap.cronAutoOrder(mprice, mprice, pair_details);
          }
          i = i + 1;
          if (result.length > i) {
            setTimeout(function () {
              updateOrderPrice(result, symbols, wazirxPrice, ownPairs, i);
            }, 500);
          }
          pairData(pairSymbol, (result) => {
            try {
              if (result.status) {
                // console.log('trade -> pairResponse 2');
                socket.sockets.emit('pairResponse', result.Message);
              }
            } catch (e) {
              console.log('updateOrderPrice',e)
            }
          });
        })
      }
    });
  } catch (e) {
    console.log('updateOrderPrice',e);
  }
}
exports.updateExceptPairs = async function (result, percentageChange) {
  try {
    let pairSymbol = result.pair;
    // console.log("t => updateExceptPairs : ", {pairSymbol});
    let to = result.tousd;
    pairData(pairSymbol, async function (pairResult) {
      try {
        if (pairResult.status) {
          if(pairResult.Message.buyOrders.length > 0 && pairResult.Message.sellOrders.length > 0) {
            let buyAmount = +(+((+pairResult.Message.buyOrders[0].amount * percentageChange)/100).toFixed(result.fromDecimal)); 
            let sellAmount = +(+((+pairResult.Message.sellOrders[0].amount * percentageChange)/100).toFixed(result.fromDecimal)); 
            // console.log({
            //   pairSymbol,
            //   b_amount: pairResult.Message.buyOrders[0].amount,
            //   buyAmount,
            //   s_amount: pairResult.Message.sellOrders[0].amount,
            //   sellAmount
            // });
            pairResult.Message.buyOrders[0].amount = buyAmount;
            pairResult.Message.sellOrders[0].amount = sellAmount;
            let ordertype = ['buy', 'sell'];
            var item = ordertype[Math.floor(Math.random() * ordertype.length)]
            let orders = item == 'buy' ? pairResult.Message.sellOrders : pairResult.Message.buyOrders;
            if(orders.length > 0) {
              let mprice = common.roundValues(orders[0]._id, 8);
              await query_helper.updateData(pairsDB, 'one', { _id: mongoose.Types.ObjectId(result._id) }, { marketPrice: mprice, price: mprice });
              let volDetails = '';
              for (let volInc = 0; volInc < volumeBetween.length; volInc++) {
                if (volumeBetween[volInc].price > mprice) {
                  volDetails = volumeBetween[volInc];
                  break;
                }
                if (volDetails == '' && volInc == (volumeBetween.length - 1)) {
                  volDetails = volumeBetween[volInc];
                }
              }
              let amount;
              if(volDetails.to > (orders[0].amount - orders[0].filledAmount)) {
                volDetails.to = (orders[0].amount - orders[0].filledAmount);
              }
              if(volDetails.from < (result.minTrade/result.topair.INRvalue)/mprice) {
                volDetails.from = (result.minTrade/result.topair.INRvalue)/mprice;
              }
              if (volDetails.to < 1) {
                amount = (Math.random() * volDetails.to - volDetails.from) + volDetails.from;
              } else {
                amount = Math.random() * (volDetails.to - volDetails.from + 1) + volDetails.from;
              }
              if(item == 'buy') {
                pairResult.Message.buyOrders[0].filledAmount = amount;
              } else {
                pairResult.Message.sellOrders[0].filledAmount = amount;
              }
              let total = common.roundValues(amount * mprice, 8);
              var d1 = new Date();
              var d2 = new Date();
              d2.setSeconds(d1.getSeconds() - 10);
              let time = new Date(d2.getTime() + Math.random() * (d1.getTime() - d2.getTime()));
              let tradeChart = {
                price: +mprice,
                open: +mprice,
                high: +mprice,
                low: +mprice,
                close: +mprice,
                volume: +amount,
                total: +total,
                pair: result._id,
                pairName: pairSymbol,
                type: item,
                time: time,
                dataFrom: "updateExceptPairs"
              }
              let tradeHistoryData = pairResult.Message.tradeHistory.reverse();
              tradeHistoryData.push(tradeChart);
              pairResult.Message.tradeHistory = tradeHistoryData.reverse();
              // console.log({tradeChart});
              const tempRes = await query_helper.insertData(tradeChartDb, tradeChart);
              // await _tradeMap.pairPriceUpdate(tradeChart, "updateExceptPairs");
              async.parallel({
                hourChange: function (cb) {
                  tradeChartDb.aggregate([
                    {
                      $match: {
                        "pair": result._id,
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
                        Total: { $sum: '$total' }
                      }
                    }
                  ]).exec(cb)
                },
                yesterDaychange: async function () {
                  const resData = await query_helper.findoneData(tradeChartDb, { "pair": result._id, "time": { $lte: new Date(new Date().setDate(new Date().getDate() - 1)) } }, { price: 1 }, { time: -1 });
                  return resData.msg;
                },
                yesterDaychangeLast: async function () {
                  const resData = await query_helper.findoneData(tradeChartDb, { "pair": result._id, "time": { $gte: new Date(new Date().setDate(new Date().getDate() - 1)) } }, { price: 1 }, { time: 1 });
                  return resData.msg;
                }
              }, async function (err, results) {
                let hourChangeData;
                if (results.hourChange && results.hourChange.length > 0) {
                  hourChangeData = results.hourChange[0];
                }
                let lastPrice = result.price;
                if (hourChangeData) {
                  const yesterday = results.yesterDaychange;
                  const elsPrice = yesterday ? results.yesterDaychange.price : results.yesterDaychangeLast.price;
                  const elsePrice = elsPrice;
                  const high = hourChangeData.high
                  const low = hourChangeData.low
                  const volume = hourChangeData.Total
                  const usdPrice = to * mprice
                  const newLast = (((mprice - elsePrice) / elsePrice) * 100)
                  let updatePairJson = {
                    marketPrice: +mprice,
                    price: +mprice,
                    lastPrice: +lastPrice,
                    change: +(!isNaN(newLast) ? newLast : 0),
                    changeValue: +(!isNaN(mprice - elsPrice) ? mprice - elsPrice : 0),
                    high: +high,
                    low: +low,
                    usdPrice: isNaN(usdPrice) ? 1 : +usdPrice,
                    volume: +volume,
                    volume_fromCur: +volume / +lastPrice,
                  }
                  let updTradeChartData = {
                    high: high,
                    low: low,
                    open: hourChangeData.first,
                    close: hourChangeData.last
                  };
                  await query_helper.updateData(tradeChartDb, 'one', { _id: tempRes.msg._id }, updTradeChartData);
                  await query_helper.updateData(pairsDB, 'one', { _id: result._id }, updatePairJson);
                  // cmd to uncmd
                  // console.log('trade -> pairResponse 3');
                  socket.sockets.emit('pairResponse', pairResult.Message);
                }
              });
            }
          }
        }
      } catch (e) {
        console.log('updateExceptPairs', e)
      }
    });
  } catch (e) {
    console.log('updateExceptPairs', e)
  }
}
exports.updateWazirxTrades = async function (type, pair, data, percentageChange) {
  // console.log("t => updateWazirxTrades : ", {pair: pair.pair});
  let pairDataRes = JSON.parse(JSON.stringify(pair));
  let asks = [], bids = [];
  let maxLiquidityQuantity = 0;
  let quantityLiquidityCorrection = 0;

  let getpairDetail = await query_helper.findoneData(pairsDB, { pair: pair.pair }, {});
  if(getpairDetail && getpairDetail.msg) {
    maxLiquidityQuantity = getpairDetail.msg.maxLiquidityQuantity;
    quantityLiquidityCorrection = getpairDetail.msg.quantityLiquidityCorrection;

    pairDataRes.volume = getpairDetail.msg.volume;
    pairDataRes.volume_fromCur = getpairDetail.msg.volume;
  }

  let getOrderBook = await query_helper.findoneData(OrderBookDB, { pair: pair.pair }, {});
  pairDataRes.type = 2;

  if(type == 'trades') {
    let qVal = +data[0].q;
    if(maxLiquidityQuantity > 0 && quantityLiquidityCorrection > 0) {
      if(qVal > maxLiquidityQuantity) {
        qVal = qVal * (quantityLiquidityCorrection/100);
      }
    }

    let price = +((data[0].p));
    let tradeChart = {
      price: price,
      open: price,
      high: price,
      low: price,
      close: price,
      volume: qVal,
      total: price * qVal,
      pair: pair._id,
      pairName: pair.pair,
      type: data[0].m ? 'sell' : 'buy',
      time: new Date(data[0].E),
      chartType: "Wazirx",
      dataFrom: "updateWazirxTrades"
    }
    pairDataRes.tradeHistory = tradeChart;
    if (getOrderBook.status) {
      let returnState = 1;
      if(!data[0].m && getOrderBook.msg.userasks.length > 0) {
        if(price >= +getOrderBook.msg.userasks[0]._id) {
          returnState = 0;
        }
      }
      if(data[0].m && getOrderBook.msg.userbids.length > 0) {
        if(price <= +getOrderBook.msg.userbids[0]._id) {
          returnState = 0;
        }
      }
      // console.log("returnState : ", returnState);
      if(returnState == 1) {
        await query_helper.insertData(tradeChartDb, tradeChart);
        await _tradeMap.pairPriceUpdate(tradeChart, "updateWazirxTrades");
        pairDataRes.price = tradeChart.price;
        pairDataRes.marketPrice = tradeChart.price;
      } else {
        // console.log("cronAutoOrder : ");
        _tradeMap.cronAutoOrder(price, price, pair);
      }
      if(getOrderBook.msg.bids.length > 0) {
        bids = getOrderBook.msg.bids;
      }
      if(getOrderBook.msg.asks.length > 0) {
        asks = getOrderBook.msg.asks;
      }
    }
  } else {
    pairDataRes.tradeHistory = false;
    let minBidAmount = 0,
    maxBidAmount = 0,
    maxBidPrice = +((+data.b[0][0]).toFixed(pair.toDecimal)),
    minBidPrice = +((+data.b[data.b.length-1][0]).toFixed(pair.toDecimal));
    data.b.forEach(element => {
      let amount = +(+((+element[1] * percentageChange)/100).toFixed(pair.fromDecimal));
      if(minBidAmount == 0 || amount < minBidAmount) {
        minBidAmount = amount;
      }
      if(maxBidAmount == 0 || amount > maxBidAmount) {
        maxBidAmount = amount;
      }
      let price = +((+element[0]).toFixed(pair.toDecimal));
      if(amount > 0 && price > 0) { 
        if(maxLiquidityQuantity > 0 && quantityLiquidityCorrection > 0) {
          if(amount > maxLiquidityQuantity) {
            amount = amount * (quantityLiquidityCorrection/100);
          }
        }
        bids.push({ _id: price, amount: amount, filledAmount: 0, status: 0})
      }
    });
    let diffBidPrice = maxBidPrice - minBidPrice;
    let newBidOrderStart = minBidPrice-diffBidPrice, newBidOrderEnd = minBidPrice;
    for(let inc = 0; inc <= 15; inc++) {
      let newAmount = +(((Math.random() * (maxBidAmount - minBidAmount)) + minBidAmount).toFixed(pair.fromDecimal));
      let newPrice = +(((Math.random() * (newBidOrderEnd - newBidOrderStart)) + newBidOrderStart).toFixed(pair.toDecimal));
      if(newPrice < minBidPrice) {
        if(maxLiquidityQuantity > 0 && quantityLiquidityCorrection > 0) {
          if(newAmount > maxLiquidityQuantity) {
            newAmount = newAmount * (quantityLiquidityCorrection/100);
          }
        }
        bids.push({ _id: newPrice, amount: newAmount, filledAmount: 0, status: 0})
      }
    }

    let minAskAmount = 0,
    maxAskAmount = 0,
    minAskPrice = +((+data.a[0][0]).toFixed(pair.toDecimal)),
    maxAskPrice = +((+data.a[data.a.length-1][0]).toFixed(pair.toDecimal));
    data.a.forEach(element1 => {
      let amount1 = +(+((+element1[1] * percentageChange)/100).toFixed(pair.fromDecimal));
      if(minAskAmount == 0 || amount1 < minAskAmount) {
        minAskAmount = amount1;
      }
      if(maxAskAmount == 0 || amount1 > maxAskAmount) {
        maxAskAmount = amount1;
      }
      let price1 = +((+element1[0]).toFixed(pair.toDecimal));
      if(amount1 > 0 && price1 > 0) {
        if(maxLiquidityQuantity > 0 && quantityLiquidityCorrection > 0) {
          if(amount1 > maxLiquidityQuantity) {
            amount1 = amount1 * (quantityLiquidityCorrection/100);
          }
        }
        asks.push({ _id: price1, amount: amount1, filledAmount: 0, status: 0})
      }
    });
    let diffAskPrice = maxAskPrice - minAskPrice;
    let newAskOrderStart = maxAskPrice, newAskOrderEnd = maxAskPrice+diffAskPrice;
    for(let inc = 0; inc <= 15; inc++) {
      let newAmount = +(((Math.random() * (maxAskAmount - minAskAmount)) + minAskAmount).toFixed(pair.fromDecimal));
      let newPrice = +(((Math.random() * (newAskOrderEnd - newAskOrderStart)) + newAskOrderStart).toFixed(pair.toDecimal));
      if(newPrice > maxAskPrice) {
        if(maxLiquidityQuantity > 0 && quantityLiquidityCorrection > 0) {
          if(newAmount > maxLiquidityQuantity) {
            newAmount = newAmount * (quantityLiquidityCorrection/100);
          }
        }
        asks.push({ _id: newPrice, amount: newAmount, filledAmount: 0, status: 0})
      }
    }
    bids.sort(function (a, b) {
      return b._id - a._id;
    });
    asks.sort(function (a, b) {
      return a._id - b._id;
    });

    let update = { bids: bids, asks: asks };

    let correctSocketRecord = true;
    if(getOrderBook && getOrderBook.status && getOrderBook.msg) {
      const bidsOld = (getOrderBook.msg.bids && getOrderBook.msg.bids.length > 0) ? getOrderBook.msg.bids : [];
      const asksOld = (getOrderBook.msg.asks && getOrderBook.msg.asks.length > 0) ? getOrderBook.msg.asks : [];
      if(JSON.stringify(bidsOld) == JSON.stringify(update.bids) && JSON.stringify(asksOld) == JSON.stringify(update.asks)) {
        correctSocketRecord = false
      }
    }

    if(correctSocketRecord === true) {
      update.liquidityDataTime = new Date();
      let updateData = await query_helper.updateData(OrderBookDB, 'one', { pair: pair.pair }, update);
      if(updateData.msg.nModified == 0) {
        update.pair = pair.pair;
        await query_helper.insertData(OrderBookDB, update);
      }
    }
  }

  if (getOrderBook.status) {
    if(getOrderBook.msg.userasks.length > 0) {
      getOrderBook.msg.userasks.forEach((element, i) => {
        let orderPushed = 0;
        asks.forEach((element1, i1) => {
          if(element1._id == element._id) {
            orderPushed = 1;
            asks[i1].amount = asks[i1].amount + element.amount;
            asks[i1].status = 1;
            return;
          }
        });
        if(orderPushed == 0) {
          asks.push(element);
        }
      });
      bids.sort(function (a, b) { // ask to bid changed by rajaMS
        return b._id - a._id;
      });
      asks.sort(function (a, b) {
        return a._id - b._id;
      });
    }
    if(getOrderBook.msg.userbids.length > 0) {
      getOrderBook.msg.userbids.forEach((element, i) => {
        let orderPushed = 0;
        bids.forEach((element1, i1) => {
          if(element1._id == element._id) {
            if(bids[i1] && bids[i1].amount && asks[i1] && asks[i1].amount && element && element.amount) {
              orderPushed = 1;
              bids[i1].amount = asks[i1].amount + element.amount;
              bids[i1].status = 1;
              return;
            }
          }
        });
        if(orderPushed == 0) {
          bids.push(element);
        }
      });
    }
    bids.sort(function (a, b) {
      return b._id - a._id;
    });
    asks.sort(function (a, b) {
      return a._id - b._id;
    });
    pairDataRes.buyOrders = bids;
    pairDataRes.sellOrders = asks;
  }
  // console.log('trade -> pairResponse 4');
  socket.sockets.emit('pairResponse', pairDataRes);
}
let pairFindData = exports.pairFindData = async function (req = {}) {
  const {
    query: reqQuery = {},
    body: reqBody = {},
  } = req;
  const exchangeType = reqQuery.exchangeType ? reqQuery.exchangeType : reqBody.exchangeType ? reqBody.exchangeType : "SPOT";
  const findData = { status: 1, exchangeType };
  return findData;
}
let pairData = exports.pairData = async function (pair, callback, req = {}) {
  const reqBody = req.body ? req.body : {}
  const {
    exchangeType = "SPOT"
  } = reqBody;
  let where = pair != '' ? { exchangeType, pair, status: 1 } : { exchangeType, status: 1};

  let pairs = await pairsDB.findOne(where).sort({ _id: 1 }).populate("fromCurrency").populate("toCurrency");
  if (pairs) {
    const whereCondn = { pair: pairs._id, type: 'buy', $or: [{ status: 'active' }, { status: 'partially' }], cancelInitiate: 0 }
    const whereCondnSell = { pair: pairs._id, type: 'sell', $or: [{ status: 'active' }, { status: 'partially' }], cancelInitiate: 0 }
    async.parallel({
      BuyOrder: function (cb) {
        orderDB.aggregate([
          {
            $match: whereCondn
          },
          { $sort: { price: -1 } },
          {
            $project: {
              amount: 1,
              price: 1,
              filledAmount: 1
            }
          },
          {
            $group: {
              '_id': '$price',
              'amount': { $sum: '$amount' },
              'filledAmount': { $sum: '$filledAmount' }
            }
          },
          { $sort: { _id: -1 } },
          { $limit: 9 }
        ]).exec(cb)
      },
      SellOrder: function (cb) {
        orderDB.aggregate([
          {
            $match: whereCondnSell
          },
          { $sort: { price: 1 } },
          {
            $project: {
              amount: 1,
              price: 1,
              filledAmount: 1
            }
          },
          {
            $group: {
              '_id': '$price',
              'amount': { $sum: '$amount' },
              'filledAmount': { $sum: '$filledAmount' }
            }
          },
          { $sort: { _id: 1 } },
          { $limit: 9 }
        ]).exec(cb)
      },
      orderBook: async function () {
        const resData = await query_helper.findoneData(OrderBookDB, { pair: pairs.pair }, {});
        return resData.msg;
      },
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
      
      if(inputData.fromCurrency) {
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

      if(
        typeof tradeDetails.orderBook == 'object' && typeof tradeDetails.orderBook.asks == 'object' && typeof tradeDetails.orderBook.bids == 'object'
      ) {
        let ordertype = ['buy', 'sell'];
        var item = ordertype[Math.floor(Math.random() * ordertype.length)];

        if(pairs.autoOrderExecute == 1) {
          if(inputData.price == undefined || inputData.price <= 0) {
            inputData.price = item == 'buy'
            ?
            tradeDetails.orderBook.bids[0] ? tradeDetails.orderBook.bids[0]._id : 0
            :
            tradeDetails.orderBook.asks[0] ? tradeDetails.orderBook.asks[0]._id : 0;
          }
          if(inputData.lastPrice == undefined || inputData.price <= 0) {
            inputData.lastPrice = item == 'buy'
            ?
              tradeDetails.orderBook.asks[0] ? tradeDetails.orderBook.asks[0]._id : 0
            :
            tradeDetails.orderBook.bids[0] ? tradeDetails.orderBook.bids[0]._id : 0;
          }
        }
        else if(pairs.autoOrderExecute == 0) {
          if(inputData.price == undefined || inputData.price <= 0) {
            inputData.price = item == 'buy'
            ?
              tradeDetails.orderBook.userbids[0] ? tradeDetails.orderBook.userbids[0]._id : 0
            :
              tradeDetails.orderBook.userasks[0] ? tradeDetails.orderBook.userasks[0]._id : 0;
          }
          if(inputData.lastPrice == undefined || inputData.price <= 0) {
            inputData.lastPrice = item == 'buy'
            ?
              tradeDetails.orderBook.userasks[0] ? tradeDetails.orderBook.userasks[0]._id : 0
            :
            tradeDetails.orderBook.userbids[0] ? tradeDetails.orderBook.userbids[0]._id : 0;
          }
        }

        let update = { userbids: inputData.buyOrders, userasks: inputData.sellOrders };
        await query_helper.updateData(OrderBookDB, 'one', { pair: inputData.pair }, update);

        inputData.buyOrders.forEach((element, i) => {
          let orderPushed = 0;
          tradeDetails.orderBook.bids.forEach((element1, i1) => {
            if(element1._id == element._id) {
              orderPushed = 1;
              tradeDetails.orderBook.bids[i1].amount = tradeDetails.orderBook.bids[i1].amount + element.amount;
              return;
            }
          });
          if(orderPushed == 0) {
            tradeDetails.orderBook.bids.push(element);
          }
        });

        inputData.sellOrders.forEach((element2, i2) => {
          let orderPushed1 = 0;
          tradeDetails.orderBook.asks.forEach((element3, i3) => {
            if(element3._id == element2._id) {
              orderPushed1 = 1;
              tradeDetails.orderBook.asks[i3].amount = tradeDetails.orderBook.asks[i3].amount + element2.amount;
              return;
            }
          });
          if(orderPushed1 == 0) {
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
        if(inputData.buyOrders.length > 0) {
          inputData.buyOrders[0].amount = +(+((+inputData.buyOrders[0].amount * percentageChange)/100).toFixed(inputData.fromCurrency.siteDecimal));
          inputData.buyOrders[0]._id = +((+inputData.buyOrders[0]._id).toFixed(inputData.decimalValue));
        }
        if(inputData.sellOrders.length > 0) {
          inputData.sellOrders[0].amount = +(+((+inputData.sellOrders[0].amount * percentageChange)/100).toFixed(inputData.fromCurrency.siteDecimal));
          inputData.sellOrders[0]._id = +((+inputData.sellOrders[0]._id).toFixed(inputData.decimalValue));
        }
      }

      if(inputData.price == undefined || inputData.price <= 0) {
        inputData.price = pairs.price;
      }
      if(inputData.lastPrice == undefined || inputData.price <= 0) {
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
    let getTxn = await query_helper.findoneData(Transactions, { depositType : 'Pre Booking', status: 1, userId: mongoose.Types.ObjectId(userId), 'bonusData.status': 0 }, {}, { _id: -1 });
    if (getTxn.status) {
      getTxn = getTxn.msg;
      let settings = await query_helper.findoneData(siteSettings,{},{});
      if(settings.status && settings.msg.preBookingPercentage.length > 0) {
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
        if((amount * price) > newAmount) {
          amount = common.mathRound(newAmount, price, 'division');
        }
        var newValue = bonusDetails.filter(function(item) {
          return item.from <= getTxn.amount && item.to >= getTxn.amount;
        });
        if(typeof newValue != 'object' || newValue.length == 0) {
          return true;
        } else {
          if(amount > 0) {
            var price1 = newValue[0].bonus;
            let validateDate = settings.msg.extraBonusDate;
            let txnDate = new Date(getTxn.createdDate);
            let txnDMY = (txnDate.getDate() > 9 ? txnDate.getDate() : '0'+txnDate.getDate())+'-'+(txnDate.getMonth() >= 9 ? (txnDate.getMonth()+1) : '0'+(txnDate.getMonth()+1))+'-'+txnDate.getFullYear();
            // console.log('txnDMY == validateDate', txnDMY, validateDate)
            if(txnDMY == validateDate) {
              price1 = price1 * settings.msg.extraBonus;
              // console.log('extra bonus', price1, txnDMY, getTxn._id)
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
            if((amount * price) >= newAmount) {
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
  } catch(e) {
    console.log('preBookCalculation', e)
    return true;
  }
};

exports.cancelCopyTradeOrder = async function (order_details, callback) {   
  if(common.getSiteDeploy() == 0) {
    order_details.reverse().map(copy_user_res=>{
    const orderwith = oArray.indexOf(copy_user_res.userId);
    if (orderwith == -1) {
      oArray.push(copy_user_res.userId);
      orderDB.findOne({ userId: copy_user_res.userId, orderId: copy_user_res.orderId }).exec(async function (ordErr, ordRes) {
        if (ordRes) {
          if(ordRes.orderPicked == 0) {
            if ((ordRes.status == 'active' || ordRes.status == 'stoporder' || ordRes.status == 'partially') && ordRes.orderType != 'market') {
              if(ordRes.cancelInitiate == 1) {
                setTimeout(_tradeMap._intervalFunc, 5000, copy_user_res.userId);
                where = { "_id": ordRes.pair };
                pairsDB.aggregate([
                  {
                    $lookup:
                    {
                      from: 'Currency',
                      localField: 'fromCurrency',
                      foreignField: '_id',
                      as: 'frompair'
                    }
                  },
                  {
                    $lookup:
                    {
                      from: 'Currency',
                      localField: 'toCurrency',
                      foreignField: '_id',
                      as: 'topair'
                    }
                  },
                  {
                    $project: {
                      "from_symbol_id": "$fromCurrency",
                      "to_symbol_id": "$toCurrency",
                      "min_trade_amount": "$minTrade",
                      "fees": "$fee",
                      "takerFee": "$takerFee",
                      "makerFee": "$makerFee",
                      "status": "$status",
                      "_id": "$_id",
                      "topair": "$topair",
                      "frompair": "$frompair",
                      "fromcurrency": "$frompair",
                      "tocurrency": "$topair"
                    }
                  },
                  {
                    $match: where
                  },
                ]).exec(function (err, resData) {
                  if (resData.length == 1) {
                    var pair_details = resData[0];
                    pair_details.frompair = pair_details.frompair[0];
                    pair_details.topair = pair_details.topair[0];
                    _tradeMap.OrderCancel(ordRes, copy_user_res.userId, pair_details, (activeRes) => {
                      if (activeRes.status) {
                        _tradeMap._sendResponse(pair_details, copy_user_res.userId, 'pairemit');
                      }
                      callback(activeRes)
                    })
                  }
                  else {
                    callback({ status: false, Msg: "Something went Wrong. Please try Again" })
                  }
                });
              } else {
                let updateRes = await query_helper.updateData(orderDB, 'one', { orderId: copy_user_res.orderId }, {cancelInitiate: 1});
                if(updateRes.status) {
                  removeintervalFunc(copy_user_res.userId);
                  oArray.push(copy_user_res.userId)
                  setTimeout(_tradeMap._intervalFunc, 5000, copy_user_res.userId);
                } else {
                  setTimeout(_tradeMap._intervalFunc, 5000, copy_user_res.userId);
                }
                callback({ status: false, Msg: "Order execution stopped, Please click cancel again after 5 seconds to cancel your order" })
              }
            } else {
              setTimeout(_tradeMap._intervalFunc, 5000, copy_user_res.userId);
              callback({ status: false, Msg: "Order is Already Cancelled!" })
            }
          } else {
            setTimeout(_tradeMap._intervalFunc, 5000, copy_user_res.userId);
            callback({ status: false, Msg: "Order is Already Executed!" })
          }
        } else {
          setTimeout(_tradeMap._intervalFunc, 5000, copy_user_res.userId);
          callback({ status: false, Msg: "Invalid OrderId!" })
        }
      })
    } else {
      callback({ status: false, Msg: "Please try after 5 seconds!" });
    }
  })
  } else {
    callback({ status: false, Msg: "Please try after 5 minutes!" });
  }
};