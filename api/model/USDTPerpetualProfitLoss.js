var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var usdtPerpetualSchema = new Schema({
    "userId": { type: mongoose.Schema.Types.ObjectId, ref: 'Users', 'index': true },
    "pair": { type: mongoose.Schema.Types.ObjectId, ref: 'USDTPerpetualPair', 'index': true },
    "pairName": { type: String, 'index': true },
    "entryPrice": {
        type: Number
    },
    "exitPrice": {
        type: Number
    },
    "closedDir": {
        type: String    // buy, sell
    },
    "amount": {
        type: Number
    },
    "tradeFee": {
        type: Number
    },
    "pAndL": {
        type: Number
    },
    "profitLoss": {
        type: Number
    },
    "notes": {type:Object, default:{}},
    "type": {
        type: String   // trade, liquidation
    },
    "openAt": {
        type: Date,
        default: Date.now
    },
    "closedAt": {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('USDTPerpetualProfitLoss', usdtPerpetualSchema, 'USDTPerpetualProfitLoss')