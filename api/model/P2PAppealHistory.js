var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var P2PAppealHistorySchema = new Schema({
  "orderNo"          : { type: String, default: 0 },
  "appealCode"       : { type: String, default: '' },
  "reason"           : { type: String, default: '' },
  "cancelReason"     : { type: String, default: '' },
  "supportMessage"   : { type: String, default: '' },
  "helpbuyer"        :{
    "buyedId" : { type: mongoose.Schema.Types.ObjectId, ref: 'Users', 'index':true },
    "status"          : { type: Number, index: true, default: 0 }, //{0-pending, 1-completed, 2-cancelled,3-user side pending },
    "description" : { type: String, default: '' },
  },
  "helpseller"        :{
    "sellerId" : { type: mongoose.Schema.Types.ObjectId, ref: 'Users', 'index':true },
    "status"          : { type: Number, index: true, default: 0 }, //{0-pending, 1-completed, 2-cancelled,3-user side pending },
    "description" : { type: String, default: '' },
  },
  "userId"           : { type: mongoose.Schema.Types.ObjectId, ref: 'Users', 'index':true},
  "appealHistory"    : [{ 
      "userId"          : { type: mongoose.Schema.Types.ObjectId, ref: 'Users', 'index':true},
      "description"     : { type: String, default: '' },
      "cancelReason"    : { type: String, default: '' },
      "phone"           : { type: String, default: '' },
      "attachment"      : { type: String, default: '' },
      "status"          : { type: Number, index: true, default: 3 }, //{0-pending, 1-completed, 2-cancelled,3-user side pending },
      "date"            : { type: Date, default: Date.now },
  }],
  "status"          : { type: Number, index: true, default: 1 },
  "appealEndDate"   : { type: Date, default: Date.now },
  "createdDate"     : { type: Date, default: Date.now },
});

module.exports = mongoose.model('P2PAppealHistory', P2PAppealHistorySchema, 'P2PAppealHistory')