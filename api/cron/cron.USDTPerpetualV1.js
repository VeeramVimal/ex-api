// import package
const mongoose = require('mongoose');
const cron = require("node-cron");

// import model
const pairsDB = mongoose.model('USDTPerpetualPair');
const orderDB = mongoose.model('USDTPerpetualOrder');
const positionDB = mongoose.model("USDTPerpetualPosition");

// import helper
var Config = require('../Config/config');

const tradeUSDTPerpetual = require("../helpers/tradeUSDTPerpetual")

if(Config.sectionStatus.derivativeCron !== "Disable") {
  let liquidityCron = false
  cron.schedule("*/5 * * * * *", async () => {
    if (liquidityCron) {
      return true
    }
    liquidityCron = true
    try {
      let pairList = await pairsDB.find({ 'status': "active" }).populate('fromCurrency').populate('toCurrency')
      if (pairList && pairList.length > 0) {
        for (let pairData of pairList) {
          let liquidityPosition = await positionDB.find({
            "method": 'isolated',
            "pair": mongoose.Types.ObjectId(pairData._id),
            "$or": [
              {
                "$and": [
                  { "type": 'sell' },
                  { "liquidityPrice": { "$lte": pairData.marketPrice } },
                ]
              },
              {
                "$and": [
                  { "type": 'buy' },
                  { "liquidityPrice": { "$gte": pairData.marketPrice } },
                ]
              }
            ]
          })
          if (liquidityPosition && liquidityPosition.length > 0) {
            await tradeUSDTPerpetual.forceUpdate_call(liquidityPosition, pairData)
          }
        }
      }
    } catch (err) {
      console.log("err : cr1 : liquidityCron : ", { err });
    }
    liquidityCron = false
  });

  let limitOrderCron = false
  cron.schedule("*/2 * * * * *", async () => {
    if (limitOrderCron) {
      return true
    }
    limitOrderCron = true
    try {
      let pairList = await pairsDB.find({})
      if (pairList && pairList.length > 0) {
        for (let pairData of pairList) {

          let orderList = await orderDB.find({
            'orderType': 'limit',
            'status': 'active',
            'pair': pairData._id,
            '$or': [{
              "$and": [
                { 'type': 'buy' },
                { 'price': { "$gte": pairData.askPrice } }
              ]
            }, {
              "$and": [
                { 'type': 'sell' },
                { 'price': { "$lte": pairData.bidPrice } }
              ]
            }]
          });

          if (orderList && orderList.length > 0) {
            for (let orderDoc of orderList) {
              try {
                if (
                  (orderDoc.type == 'buy' && orderDoc.price >= pairData.askPrice) ||
                  (orderDoc.type == 'sell' && orderDoc.price <= pairData.bidPrice)
                ) {
                  await tradeUSDTPerpetual._matchingProcess_call(orderDoc, pairData)
                }
              } catch (err) {
                console.log("err : c2 : 1 : _matchingProcess_call : ", err);
                continue
              }
            }
          }
        }
      }
    } catch (err) {
      console.log("err : c2 : 2 : _matchingProcess_call : ", err);
    }
    limitOrderCron = false
  })

  let triggerCondOrder;
  cron.schedule("*/5 * * * * *", async () => {
    if (triggerCondOrder) {
      return;
    }
    triggerCondOrder = true;
    try {
      let pairList = await pairsDB.find({ 'status': "active" }).populate('fromCurrency').populate('toCurrency')
      if (pairList && pairList.length > 0) {
        for (let pairData of pairList) {
          await tradeUSDTPerpetual.triggerConditionalOrder_call(pairData)
        }
      }
    } catch (err) {
      console.log("err : cr3 : triggerConditionalOrder_call : ", err);
    }
    triggerCondOrder = false;
  });

  let triggerProcess;
  cron.schedule('*/2 * * * * *', async (date) => {
    if (triggerProcess) {
      return;
    }
    triggerProcess = true;
    try {
      let pairList = await pairsDB.find({ 'status': "active" }).populate('fromCurrency').populate('toCurrency')
      for (let pairData of pairList) {
        await tradeUSDTPerpetual.triggerTpSl_call(pairData);
      }
    } catch (err) {
      console.log("---err : cr4 : triggerTpSlPair", err);
    }
    triggerProcess = false;
    return true;
  })
}
