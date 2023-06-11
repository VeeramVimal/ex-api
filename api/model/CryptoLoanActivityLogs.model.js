const Mongoose = require('mongoose');
const schema = Mongoose.Schema;
const model = Mongoose.model;
const ObjectId = Mongoose.Schema.Types.ObjectId;

const LoanActivitySchema = new schema({
    userId : { type: String, index: true, default: '' },
	ownerId : { type: String, index: true, default: '' },
	orderNo : { type: String, default: 0 },
	orderId : { type: String, index: true, default: '' },
	type: { type: String, default: '' },
	comment: { type: String, default: '' },
	dateTime: { type: Date, default: Date.now }
}, {
    collection: 'CryptoLoanActivityLogs',
    timestamps: true
});
module.exports = LoanActivity = model('CryptoLoanActivityLogs', LoanActivitySchema);