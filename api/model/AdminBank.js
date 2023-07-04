var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var adminBankSchema = new Schema({
	"accountName"   : {type:String},
	"accountNumber"   : {type:String},
	"bankName"   : {type:String},
	"swiftIFSCCode"   : {type:String},
	"type"   : {type:String},
	"accountType"   : {type:String},
	"currencySymbol"   : {type:String, default: 'INR'},
	"createdDate"   : {type: Date, default: Date.now},
});
module.exports = mongoose.model('AdminBank', adminBankSchema, 'AdminBank')