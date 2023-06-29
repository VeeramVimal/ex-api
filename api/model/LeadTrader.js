var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var leadTraderSchema = new Schema({
  "name": {type: String,default:""},
  "email": {type: String,default:""},
  "avatar": {type: String,default:""},
  "discription": {type: String, default:""},
  //"trader_id":{type: String, index: true, default:""},
  "trader_id": { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Users' },
  "status" : {type: Number, default: 1},
  "createdOn": { type: Date, default: Date.now }
});
module.exports = mongoose.model('LeadTrader', leadTraderSchema, 'LeadTrader');