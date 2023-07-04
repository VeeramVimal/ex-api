var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PaymentsallSchema = new Schema({
    "name": {type: String, index: true},
    "symbol": {type: String, index: true},
    "updatedAt": {type:Date, default: Date.now},
    "createdAt": {type:Date, default: Date.now}
});

module.exports = mongoose.model('P2PAllPayments', PaymentsallSchema, 'P2PAllPayments')