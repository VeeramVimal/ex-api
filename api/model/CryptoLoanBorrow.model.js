const Mongoose = require('mongoose');
const schema = Mongoose.Schema;
const model = Mongoose.model;
const ObjectId = Mongoose.Schema.Types.ObjectId;

const CryptoLoanBorrowSchema = new schema({
    userId: {
        type: ObjectId, index: true, ref: 'Users',
        required: true
    },
    collateralCurrencyId: {
        type: ObjectId, index: true, ref: 'CurrencySymbol',
        required: true
    },
    collateralCoin: {
        type: String,
        required: true
    },
    collateralAmount: {
        type: Number,
        default: 0
    },
    borrowCurrencyId: {
        type: ObjectId, index: true, ref: 'CurrencySymbol',
        required: true
    },
    borrowedCoin: {
        type: String,
        required: true
    },
    remainingPrinciple: {
        type: Number,
        default: 0
    },
    debtLoanableAmount: {
        type: Number
    },
    loanStatus: {
        type: Number,
        default: 0
    },
    loanTermDays: {
        type: Number,
        default: 0
    },
    hourlyInterestRate: {
        type: Number,
        default: 0
    },
    yearlyInterestRate: {
        type: Number,
        default: 0
    },
    totalInterestRate: {
        type: Number,
        default: 0
    },
    liquidateLTV: {
        type: Number,
        default: 0
    },
    marginLTV: {
        type: Number,
        default: 0
    },
    borrowDate: {
        type: Date,
        default: Date.now
    },
    expirationDate: {
        type: Date,
        required: true
    },
    RepaidDate: {
        type: Date,
        default: Date.now
    }

}, {
    collection: 'cryptoLoanBorrowed',
    timestamps: true
});

module.exports = LoanBorrow = model("cryptoLoanBorrowed", CryptoLoanBorrowSchema);