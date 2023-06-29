const Mongoose = require('mongoose');
const schema = Mongoose.Schema;
const model = Mongoose.model;

const collateralConfigSchema = new schema({
    coin: {
        type: String,
        index: true
    }, 
    initLtv: {
        type: Number, 
        default: 0.00
    },
    marginLtv: {
        type: Number, 
        default: 0.00
    },
    liquidationLtv: {
        type: Number, 
        default: 0.00
    },
    sevenDaysFixedInterest: {
        type: Number, 
        default: 0
    },
    fourteenDaysFixedInterest: {
        type: Number, 
        default: 0
    },
    thirtyDaysFixedInterest: {
        type: Number, 
        default: 0
    },
    isMortgageable: {
        type: Boolean, 
        default: false
    }
}, {
    collection: 'collateralConfig',
    timestamps: true
});

module.exports = Collateral = model("collateralConfig", collateralConfigSchema);