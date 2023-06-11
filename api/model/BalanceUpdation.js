var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var genSchema = new Schema({
  "userId" : {type: String, index: true, default: ''},
  "currencyId"  : { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Currency'},
  "difference" : { type: Number, default: 0 },
  "amount" : { type: Number, default: 0 },
  // "amountTradeFee" : { type: Number, default: 0 },
  "oldBalance" : { type: Number, default: 0 },
  "lastId" : { type: String, default: '' },
  "type"   : String,
  "dateTime" : { type: Date, default: Date.now },
  "notes"   : String,
});
module.exports = mongoose.model('BalanceUpdation', genSchema, 'BalanceUpdation')