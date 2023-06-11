var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var addressSchema = new Schema({
	"user_id": { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Users' },
	"address": { type: String, default: '' },
	"currencyid": { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Currency' },
	"currencyname": { type: String, index: true, default: '' },
	"encData": { type: String, default: '' },
	"tag": { type: String, default: '' },
	"tagType": { type: String, default: '' },
	"ethBlock": { type: Object, default: { eth: 0, token: 0 } },
	"trxBlock": { type: Object, default: { trx: 0, token: 0 } },
	"bnbBlock": { type: Object, default: { bnb: 0, token: 0 } },
	"maticBlock": { type: Object, default: { matic: 0, token: 0 } },
	"datecreated": { type: Date, default: Date.now },
	"referenceId": { type: String, lowercase: true, required: true, index: true, unique: true }
});
addressSchema.pre('validate', function (next) {
	const address = this;
	let txnRef = address.currencyname + '-' + address.user_id.toString();
	address.referenceId = txnRef;
	next();
});
module.exports = mongoose.model('CoinAddress', addressSchema, 'CoinAddress')
