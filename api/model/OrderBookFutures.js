var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var OrderBookFuturesSchema = new Schema({
    "bids"   : { type: Object, default: {} },
    "asks"   : { type: Object, default: {} },
    "userbids"   : { type: Object, default: {} },
    "userasks"   : { type: Object, default: {} },
    "pair"   : { type: String, required: true, index: true, unique: true }
});

module.exports = mongoose.model('OrderBookFutures', OrderBookFuturesSchema, 'OrderBookFutures')