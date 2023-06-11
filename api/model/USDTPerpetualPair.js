var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var usdtPerpetualSchema = new Schema({
    "fromCurrency": { type: mongoose.Schema.Types.ObjectId, ref: 'Currency' },
    "toCurrency": { type: mongoose.Schema.Types.ObjectId, ref: 'Currency' },
    "pair": { type: String, required: true },

    "lastPrice": { type: Number, default: 1 },
    "marketPrice": { type: Number, default: 1 },
    "indexPrice": { type: Number, default: 1 },
    "bidPrice": { type: Number, default: 1 },
    "askPrice": { type: Number, default: 1 },
    "highPrice24h": { type: Number, default: 1 },
    "lowPrice24h": { type: Number, default: 1 },
    
    "maxLeverage": { type: Number, default: 1 },
    "takerFee": { type: Number, default: 0 },
    "decimalValue": { type: Number, default: 8 },
    "priceDecimal": { type: Number, default: 8 },
    "amountDecimal": { type: Number, default: 8 },

    "botType": {
        type: String,
        enum: ["BYBIT"],
        default: "BYBIT"
    },
    "makerFee": { type: Number, default: 0 },

    "MMR": { type: Number, default: 0.02 }, // Maintenance Margin Rate
    "status": {
        type: String,
        enum: ["active", "deactive"],
        default: "active"
    },


    "changePercentage": { type: Number, default: 0 },
    "marketStatus": { type: Number, default: 1 },
    "lastVolume": { type: Number, default: 0 },

    "turnover_24h": { type: Number, default: 0 },
    "price_24h_pcnt": { type: Number, default: 0 },

    // index: true, unique: true

    "created": { type: Date, default: Date.now },
});

module.exports = mongoose.model('USDTPerpetualPair', usdtPerpetualSchema, 'USDTPerpetualPair')