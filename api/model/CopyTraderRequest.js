var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var copyTraderRequestSchema = new Schema({
  "cost_per_order": {type: Number,default:""},
  "copy_amt": {type: Number,default:""},
  "take_profit": {type: Number, default:""},
  "stop_loss" : {type: Number, default:""},
  "trader_id": { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Users' },
  "copy_user_id": { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Users' },
  "selected_pairs":{type: String,default:""},
  "status" : {type: Number, default: 1},
  "createdOn": { type: Date, default: Date.now }
});
module.exports = mongoose.model('CopyTraderRequest', copyTraderRequestSchema, 'CopyTraderRequest');