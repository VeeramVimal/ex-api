var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var P2PFeedBackSchema = new Schema({
  "orderId" : { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'P2PTransactions' },
  "fromUserId"  : { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Users' },
  "toUserId" : { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Users' },
  "description"     : { type: String, default: '' },
  "feedBackStatus"  : { type: Number, default: 0 }, //positive 1 ,negative 2
  "status"          : { type: Number, default: 1 },
  "createdDate"     : { type: Date, default: Date.now },
});

module.exports = mongoose.model('P2PFeedBack', P2PFeedBackSchema, 'P2PFeedBack')