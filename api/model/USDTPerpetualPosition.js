var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var usdtPerpetualSchema = new Schema({
    "fromCurrency": { type: mongoose.Schema.Types.ObjectId, ref: 'Currency' },
    "toCurrency": { type: mongoose.Schema.Types.ObjectId, ref: 'Currency' },
    "userId": { type: mongoose.Schema.Types.ObjectId, ref: 'Users', 'index': true },
    "pair": { type: mongoose.Schema.Types.ObjectId, ref: 'USDTPerpetualPair', 'index': true },
    "pairName": { type: String, 'index': true },
    "filled": [{
        '_id': 0,
        'price': {
            type: Number
        },
        'amount': {
            type: Number
        },
    }],
    "totalAmount": {
        type: Number
    },
    "leverage": {
        type: Number
    },
    "liquidityPrice": {
        type: Number
    },
    "type": {
        type: String    // buy or sell
    },
    "method": {
        type: String    // isolated, cross
    },
    "isTP": { type: Boolean, default: false },
    "isSL": { type: Boolean, default: false },
    "tpPrice": { type: Number, default: 0 },
    "slPrice": { type: Number, default: 0 },
    "createdAt": {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('USDTPerpetualPosition', usdtPerpetualSchema, 'USDTPerpetualPosition')