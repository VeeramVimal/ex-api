var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var tradeOrdersSchema = new Schema({
  "userId": { type: mongoose.Schema.Types.ObjectId, ref: 'Users', 'index': true },
  "orderId": { type: String, index: true },
  "amount": { type: Number, default: 0 },
  "filledAmount": { type: Number, default: 0 },
  "pendingTotal": { type: Number, default: 0 },
  "price": { type: Number, default: 0 },
  "stopPrice": { type: Number, default: 0 },
  "usdPrice": { type: Number, default: 0 },
  "type": String,//buy or sell
  "total": { type: Number, default: 0 },
  "usdTotal": { type: Number, default: 0 },
  "sumFee": { type: Number, default: 0 },
  "usdSumFee": { type: Number, default: 0 },
  "orderType": { type: String }, // limit, instant,stop
  "dateTime": { type: Date, default: Date.now },
  "pair": { type: mongoose.Schema.Types.ObjectId, ref: 'Pairs', 'index': true },
  "pairName": { type: String, 'index': true },
  "status": { type: String, 'index': true }, //active,filled,cancelled,partially, closed
  "makerFee": { type: Number, default: 0 }, // fee percentage
  "takerFee": { type: Number, default: 0 }, // fee percentage
  "makerFeeWithKYC": { type: Number, default: 0 }, // fee percentage
  "takerFeeWithKYC": { type: Number, default: 0 }, // fee percentage
  "orderPicked": { type: Number, default: 0 },
  "cancelInitiate": { type: Number, default: 0 },
  "cancelInitiateTime": { type: Date, default: Date.now },
  "copyTrade":{type: Number, default: 0},
  "copyTradeID":{type: String, default: ''},
  "TraderID":{type: mongoose.Schema.Types.ObjectId, ref: 'Users', 'index': true},
  "referenceId": { type: String, lowercase: true, required: true, index: true, unique: true }
});
tradeOrdersSchema.pre('validate', function (next) {
  const trade = this;
  let curDate = new Date();
  let txnRef = curDate.getFullYear() + '/' + (curDate.getMonth() + 1) + '/' + curDate.getDate() + ' ' + curDate.getHours() + ':' + curDate.getMinutes();
  let number = curDate.getSeconds();
  let checkNumber = number / 5;
  checkNumber = checkNumber.toString().split('.');
  if (checkNumber.length > 1) {
    number = number - (('0.' + checkNumber[1]) * 5);
  }
  txnRef = txnRef + ':' + number;
  txnRef = txnRef + '-' + trade.userId.toString();
  trade.referenceId = txnRef;
  next();
});
module.exports = mongoose.model('TradeOrders', tradeOrdersSchema, 'TradeOrders')