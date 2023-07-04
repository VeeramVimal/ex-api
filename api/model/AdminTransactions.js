var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var adminTransactionSchema = new Schema({
    "userId"     : { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Users' },
    "currency"   : {type:String,default: ""},
    "currencyId" : { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Currency'},
    "fromaddress" : { type:String,default: ""},
    "amount"     : { type: Number, default: 0 },
    "txnId"      : { type:String, default: "" },
    "status"     : {type:Number, default: 1},
    "dateTime"   : {type: Date, default: Date.now},
});
module.exports = mongoose.model('AdminTransactions', adminTransactionSchema, 'AdminTransactions');