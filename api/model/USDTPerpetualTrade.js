var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var tradeOrdersSchema = new Schema({
    "buyUserId": { type: mongoose.Schema.Types.ObjectId, ref: 'Users', 'index': true },
    "sellUserId": { type: mongoose.Schema.Types.ObjectId, ref: 'Users', 'index': true },
    "buyOrderId": { type: mongoose.Schema.Types.ObjectId, ref: 'Users', 'index': true },
    "sellOrderId": { type: mongoose.Schema.Types.ObjectId, ref: 'Users', 'index': true },
    "amount": { type: Number, default: 0 },
    "price": { type: Number, default: 0 },
    "type": String,//buy or sell
    "total": { type: Number, default: 0 },
    "sumFee": { type: Number, default: 0 },
    "dateTime": { type: Date, default: Date.now },
    "pair": { type: mongoose.Schema.Types.ObjectId, ref: 'USDTPerpetualPair', 'index': true },
    "pairName": { type: String, 'index': true },
    "makerFee": { type: Number, default: 0 }, // fee percentage
    "takerFee": { type: Number, default: 0 }, // fee percentage
});

module.exports = mongoose.model('USDTPerpetualTrade', tradeOrdersSchema, 'USDTPerpetualTrade')