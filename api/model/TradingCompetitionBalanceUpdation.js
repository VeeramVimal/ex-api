var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var competitionupdateSchema = new Schema({
  "userId" : {type: String, index: true, default: ''},
  "currencyId"   : { type: mongoose.Schema.Types.ObjectId, ref: 'Currency'},
  "amount" : { type: Number, default: 0 },
  "oldBalance" : { type: Number, default: 0 },
  "type"   : String,
  "dateTime" : { type: Date, default: Date.now }
});

module.exports = mongoose.model('TradingCompetitionBalanceUpdation', competitionupdateSchema, 'TradingCompetitionBalanceUpdation')
