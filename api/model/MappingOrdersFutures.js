var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var genSchema = new Schema({
  "sellOrderId": { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'TradeOrdersFutures' },
  "sellerUserId": { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Users' },
  "tradePrice": { type: Number, default: 0 },
  "filledAmount": { type: Number, default: 0 },
  "buyOrderId": { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'TradeOrdersFutures' },
  "buyerUserId": { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Users' },
  "buyPrice": { type: Number, default: 0 },
  "sellPrice": { type: Number, default: 0 },
  "dateTime": { type: Date, default: Date.now },
  "pair": { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'DerivativesPairs' },
  "role": { type: String, index: true , default: ""},
  "pairName": { type: String, index: true },
  "userType": { type: String, index: true },
  "total": { type: Number, default: 0 },
  "buyFee": { type: Number, default: 0 },
  "orderType": { type: String, default: '' },
  "sellFee": { type: Number, default: 0 },
  "tdsBuyValue": { type: Number, default: 0 },
  "tdsSellValue": { type: Number, default: 0 },
  "convertedAmount": { type: Number, default: 0 },
  "discount": { type: Number, default: 0 },
  "referenceId": { type: String, lowercase: true, required: true, index: true, unique: true },
  "status": { type: String, default: "filled" }, // filled, cancelled
});
genSchema.pre('validate', function (next) {
  const mapOrders = this;
  let txnRef = mapOrders.pairName + '-' + mapOrders.filledAmount + '-' + mapOrders.tradePrice + '-' + mapOrders.sellOrderId.toString() + '-' + new Date(mapOrders.dateTime).getTime();
  mapOrders.referenceId = txnRef;
  next();
});
module.exports = mongoose.model('MappingOrdersFutures', genSchema, 'MappingOrdersFutures')