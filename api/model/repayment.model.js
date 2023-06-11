const Mongoose = require('mongoose');
const schema = Mongoose.Schema;
const model = Mongoose.model;
const ObjectId = Mongoose.Schema.Types.ObjectId;

const RepaymentSchema = new schema({
    userId: {
        type: ObjectId, index: true, ref: 'Users',
        required: true
    },
    loanOrderId: {
        type: ObjectId, index: true, ref: 'cryptoLoanBorrowed',
        required: true
    },
    repaymentAmount: {
        type: Number, 
        default: 0
    },
    due_detail: [{
        due_percentage: { type: Number, default: 0 },
        due_paid_amount: { type: Number, default: 0 },
        due_date: { type: Date, default: Date.now }
    }],
    expirationDate: {
        type: Date, 
        required: true
    },
    due_status: {
        type: Number
    }
},{
    collection: 'loanRepayment',
    timestamps: true
});

module.exports = Repayment = model("loanRepayment", RepaymentSchema);