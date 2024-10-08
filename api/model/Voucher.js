var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var voucherSchema = new Schema({
	"childUserId" : { type: mongoose.Schema.Types.ObjectId, ref: 'Users'},
	"parentUserId" : { type: mongoose.Schema.Types.ObjectId, ref: 'Users'},
	"parentUserType" : { type: String, default: ""},
	"userId" : { type: mongoose.Schema.Types.ObjectId, ref: 'Users'},
	"type": {type: String, default: ""},
	"voucherType": {type: String, default: ""},
	"currencyId": { type: mongoose.Schema.Types.ObjectId, ref: 'Currency'},
	"balance": {type: Number, default: 0},
	"amount": {type: Number, default: 0},
	"beforeAmount": {type: Number, default: 0},
	"afterAmount": {type: Number, default: 0},
	"givenDate": {type: Date, default: Date.now},
	"expirePeriod": {type: Number, default: 0},
	"expirePeriodType": {type: String, default: ""},
	"expireDate": {type: Date, default: Date.now},
	"claim": {type: Number, default: 0},
    "claimDate"   : { type: Date },
});
module.exports = mongoose.model('Voucher', voucherSchema, 'Voucher')