const Mongoose = require('mongoose');
const schema = Mongoose.Schema;
const model = Mongoose.model;

const loanConfigSchema = new schema({
    coin: {
        type: String
    },
    maxLimit: {
        type: Number, 
        default: 0
    },
    minLimit: {
        type: Number, 
        default: 0
    }, 
    remainingLoanableAmount: {
        type: Number, 
        default: 0
    },
    loanTerm: {
        type: String, 
    },
    loanTermDays: {
        type: Number, 
        default: 0
    },
    dailyInterestRate: {
        type: Number, 
        default: 0
    },
    yearlyInterestRate: {
        type: Number, 
        default: 0
    },
    hourlyInterestRate: {
        type: Number, 
        default: 0
    },
    stakingDailyInterestRate: {
        type: Number, 
        default: 0
    },
    stakingYearlyInterestRate: {
        type: Number, 
        default: 0
    },
    stakingHourlyInterestRate: {
        type: Number, 
        default: 0
    }
}, {
    collection: 'loanConfig',
    timestamps: true
});

module.exports = Loan = model("loanConfig", loanConfigSchema);