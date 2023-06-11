var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var orderBookSchema = new Schema({
    "liquidityDataTime":  { type: Date, default: Date.now },
    "bids"   : { type: Object, default: {} },
    "asks"   : { type: Object, default: {} },
    "userDataTime":  { type: Date, default: Date.now },
    "userbids"   : { type: Object, default: {} },
    "userasks"   : { type: Object, default: {} },
    "pair"   : { type: String, required: true, index: true, unique: true }
});

module.exports = mongoose.model('OrderBook', orderBookSchema, 'OrderBook')