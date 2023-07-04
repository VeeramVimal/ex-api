var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var genSchema = new Schema({
  "price"   : { type: Number, default: 0 },
  "open"   : { type: Number, default: 0 },
  "high"   : { type: Number, default: 0 },
  "low"   : { type: Number, default: 0 },
  "close"   : { type: Number, default: 0 },
  "volume" : { type: Number, default: 0 },
  "total" : { type: Number, default: 0 },
  "time"    : { type: Date, default: Date.now },
  "pair"        : { type: mongoose.Schema.Types.ObjectId, ref: 'pairs'},
  "pairName"   : {type: String, index: true},
  "type" : { type: String, default: '' },
  "chartType" : { type: String, default: 'Trade History' },
  "dataFrom": {type: String, default: ""},
});

module.exports = mongoose.model('TradeChart', genSchema, 'TradeChart')