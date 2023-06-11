var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var tradeOrdersSchema = new Schema({
    "userId": { type: mongoose.Schema.Types.ObjectId, ref: 'Users', 'index': true },
    "amount": { type: Number, default: 0 },
    "filledAmount": { type: Number, default: 0 },
    "pendingTotal": { type: Number, default: 0 },
    "price": { type: Number, default: 0 },
    "type": String,//buy or sell
    "total": { type: Number, default: 0 },
    "orderType": { type: String }, // limit, market, stopLimit, conditional
    "dateTime": { type: Date, default: Date.now },
    "pair": { type: mongoose.Schema.Types.ObjectId, ref: 'USDTPerpetualPair', 'index': true },
    "pairName": { type: String, 'index': true },
    "status": { type: String, 'index': true }, //active,filled,cancelled,partially, closed, conditional
    "orderPicked": { type: Number, default: 0 },
    "cancelInitiate": { type: Number, default: 0 },
    "cancelInitiateTime": { type: Date, default: Date.now },
    "referenceId": { type: String, lowercase: true, required: true, index: true, unique: true },
    "method": {
        type: String,       // isolated, cross
        default: 'isolated'
    },
    "fromCurrency": { type: mongoose.Schema.Types.ObjectId, ref: 'Currency' },
    "toCurrency": { type: mongoose.Schema.Types.ObjectId, ref: 'Currency' },
    "leverage": { type: Number, default: 0 },
    "action": { type: String, default: 'open' }, // open, close
    "triggerType": { type: String },  // greater, lesser
    "triggerPrice": { type: String },
    "isTP": { type: Boolean, default: false },
    "isSL": { type: Boolean, default: false },
    "tpPrice": { type: Number, default: 0 },
    "slPrice": { type: Number, default: 0 },
    "tpSlType": { type: String },  // greater, lesser
    "tpSl": { type: String },  // tp, sl
});

tradeOrdersSchema.pre('validate', function (next) {
    const trade = this;
    let curDate = new Date();
    let txnRef = curDate.getFullYear() + '/' + (curDate.getMonth() + 1) + '/' + curDate.getDate() + ' ' + curDate.getHours() + ':' + curDate.getMinutes();
    let number = curDate.getSeconds();
    let checkNumber = number / 5;
    checkNumber = checkNumber.toString().split('.');
    if (checkNumber.length > 1) {
        number = number - (('0.' + checkNumber[1]) * 5);
    }
    let randomNumA = Math.floor(Math.random() * 100) + 1;
    let randomNumB = Math.floor(Math.random() * 100) + 1;
    txnRef = txnRef + ':' + number;
    txnRef = txnRef + '-' + trade.userId.toString()+'-'+randomNumA+randomNumB;
    trade.referenceId = txnRef;
    next();
});
module.exports = mongoose.model('USDTPerpetualOrder', tradeOrdersSchema, 'USDTPerpetualOrder')