var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ProfitFuturesSchema = new Schema({
  "userId": { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Users' },
  // "currencyId": { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Currency' },
  "currencyId": { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'CurrencySymbol' },
  "mappingOrderId": { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'MappingOrdersFutures' },
  "type": { type: String, default: "" },
  "USDvalue": { type: Number, default: 0 },
  "referPercentage": { type: Number, default: 0 },
  "totalFees": { type: Number, default: 0 },
  "refund": { type: Number, default: 0 },
  "fees": { type: Number, default: 0 },
  "usdFees": { type: Number, default: 0 },
  "date": { type: Date, default: Date.now },
  "userFeeReduced": { type: String, default: "respective" },
  "voucherIds": [
    {
      type: Schema.Types.ObjectId,
      ref: 'Voucher'
    }
  ]
});

module.exports = mongoose.model('ProfitFutures', ProfitFuturesSchema, 'ProfitFutures')