const Mongoose = require('mongoose');
const schema = Mongoose.Schema;
const model = Mongoose.model;
const ObjectId = Mongoose.Schema.Types.ObjectId;

const CryptoLoanBalanceUpdationSchema = new schema({
    userId: {
        type: String, 
        index: true, 
        default: ''
    },
    currencyId: {
        type: ObjectId, 
        ref: 'Currency'
    },
    difference: {
        type: Number, 
        default: 0
    },
    amount: {
        type: Number, 
        default: 0
    },
    oldBalance: {
        type: Number, 
        default: 0
    }, 
    lastId: {
        type: String, 
        default: ''
    }, 
    type: {
        type: String
    }, 
    dateTime: {
        type: Date, 
        default: Date.now
    }
}, {
    collection: 'CryptoLoanBalanceUpdation',
    timestamps: true
});
module.exports = cryptoLoanBalance = model('CryptoLoanBalanceUpdation', CryptoLoanBalanceUpdationSchema);