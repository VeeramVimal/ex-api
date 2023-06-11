var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var p2ppairSchema = new Schema({
    "fromCurrency"       : { type: mongoose.Schema.Types.ObjectId, ref: 'Currency'}, 
    "toCurrency"         : { type: mongoose.Schema.Types.ObjectId, ref: 'Currency'}, 
    "minTrade"           : { type: Number, default: 0 },
    "maxTrade"           : { type: Number, default: 0 },
    "fromDecimal"        : { type: Number, default: 0 },
    "toDecimal"          : { type: Number, default: 0 },
    "pair"               : { type: String, required: true, index: true, unique: true},
    "status"             : { type: Number, default: 1 },
    "created"            : { type: Date, default: Date.now },
});

module.exports = mongoose.model('P2PPair', p2ppairSchema, 'P2PPair')