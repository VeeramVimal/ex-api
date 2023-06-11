var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var genSchema = new Schema({
  "userId" : {type: String, index: true, default: ''},
  "currencyId"   : { type: mongoose.Schema.Types.ObjectId, ref: 'Currency'},
  "difference" : { type: Number, default: 0 },
  "amount" : { type: Number, default: 0 },
  "oldBalance" : { type: Number, default: 0 },
  "lastId" : { type: String, default: '' },
  "type"   : String,
  "dateTime" : { type: Date, default: Date.now }
});
module.exports = mongoose.model('P2PBalanceUpdation', genSchema, 'P2PBalanceUpdation')
