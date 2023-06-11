const Mongoose = require('mongoose');
const schema = Mongoose.Schema;
const model = Mongoose.model;

const borrowMarketSchema = new schema({
    coin: {
        type: String,
        index: true
    }, 
    sevenDaysFixedRate: {
        annuallyRate: {
            type: Number, 
            default: 0
        },
        hourlyRate: {
            type: Number, 
            default: 0
        }
    },
    marketCap: {
        type: Number, 
        default: 0
    },
    fourteenDaysFixedRate: {
        annuallyRate: {
            type: Number, 
            default: 0
        },
        hourlyRate: {
            type: Number, 
            default: 0
        }
    },
    thirtyDaysFixedRate: {
        annuallyRate: {
            type: Number, 
            default: 0
        },
        hourlyRate: {
            type: Number, 
            default: 0
        }
    }
}, {
    collection: 'borrowMarket',
    timestamps: true
});
module.exports = Loan = model("borrowMarket", borrowMarketSchema)