var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var p2porderSchema = new Schema({
    userId    : { type: mongoose.Schema.Types.ObjectId, ref: 'Users'},
    pairId    : { type: mongoose.Schema.Types.ObjectId, ref: 'P2PPair'},
    paymentId : [{ type: mongoose.Schema.Types.ObjectId,ref: 'P2PPayment'}],
    paymentmethodId : [{ type: mongoose.Schema.Types.ObjectId,ref: 'P2PAllPayments'}],
    paymentNames  : {type: Object,  default: {}},
    pairName  : {type:String, default: ""},
    timeLimit : {type: Number, default: 15},
    highestPrice    : {type: Number, default: 0},
    lowestPrice : {type: Number, default: 0},
    maxAmt    : {type: Number, default: 0},
    minAmt    : {type: Number, default: 0},
    price     : {type: Number, default: 0}, //inr price
    totalPrice : {type: Number, default: 0}, //inr price
    floatingPrice : {type: Number, default: 0},
    usdtPrice  : {type: Number, default: 0},
    orderAmount  : {type: Number, default: 0},
    priceType  : {type: String, default: "fixed"},
    remarks    : {type: String, default: ""},
    autoreply : {type: String, default: ""},
    country   : {type: Object,  default: {}},
    orderMode : {type: String, default: "Online"},
    orderType : {type: String, default: ""},
    status    : { type: Number, default: 1 }, //1 - enable, 2 - delete, 0 - de-active
    registeredStatus : {type: Boolean, default: false},
    kycStatus : {type: Boolean, default: false},
    holdingStatus : {type: Boolean, default: false},
    registeredDays : {type: Number, default: 0},
    holdingBTC : {type: Number, default: 0},
    fromCurrency  : { type: mongoose.Schema.Types.ObjectId, ref: 'Currency'}, 
    toCurrency    : { type: mongoose.Schema.Types.ObjectId, ref: 'Currency'}, 
    updatedDate   : {type:Date, default: ""},
    createdDate   : {type:Date, default: Date.now}
});
module.exports = mongoose.model('P2POrder', p2porderSchema, 'P2POrder')
