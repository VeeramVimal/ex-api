var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var P2PTransactionsSchema = new Schema({
  ownerId         : { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Users' },
  userId          : { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Users' },
  buyerUserId          : { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Users' },
  sellerUserId          : { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Users' },
  pairId          : { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'P2PPair' },
  paymentId       : { type: mongoose.Schema.Types.ObjectId, ref: 'P2PPayment' },
  // paymentId : [{ type: mongoose.Schema.Types.ObjectId,ref: 'P2PPayment'}],
  price           : { type: Number, default: 0 },
  orderPrice      : { type: Number, default: 0 },
  orderId         : { type: mongoose.Schema.Types.ObjectId, index: true},
  totalPrice      : { type: Number, default: 0 },
  orderNo         : { type: String, default: 0 },
  orderLimit      : { type: Number, default: 0 },
  orderType       : { type: String, default: '' },
  description     : { type: String, default: '' },
  cancelReason    : { type: String, default: '' },
  phone           : { type: String, default: '' },
  reasonAppeal    : { type: String, default: '' },
  attachment      : { type: String, default: '' },
  chattingHistory : [{ 
      userId  : { type: mongoose.Schema.Types.ObjectId, ref: 'Users', 'index':true},
      message : { type: String, default: '' },
      chattingImage  : { type: String, default: '' },
      createdDate     : { type: Date, default: Date.now },
  }],
  verifyStep      : { type: Number, index: true, default: 1 }, //{1-step1, 2-step1,3-step1 },
  selectedCancel      : { type: Number, index: true, default: 0 }, //{1-already cancel called, 0-Fresh },
  status          : { type: Number, index: true, default: 3 }, //{0-pending, 1-completed, 2-cancelled,3-user side pending },
  orderEndDate    : { type: Date, default: Date.now },
  paymentEndDate    : { type: Date, default: Date.now },
  createdDate     : { type: Date, default: Date.now },
});

module.exports = mongoose.model('P2PTransactions', P2PTransactionsSchema, 'P2PTransactions')