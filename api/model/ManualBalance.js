var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var genSchema = new Schema({
    "walletType": { type: String },
    "currencyId": { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'CurrencySymbol' },
    "oldBalance": { type: Number, default: 0 },
    "amount": { type: Number, default: 0 },
    "newBalance": { type: Number, default: 0 },
    "lastId": { type: String, default: '' },
    "reason": String,
    "userId": { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Users' },
    "adminId": { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Admin'},
    "dateTime": { type: Date, default: Date.now }
});
module.exports = mongoose.model('ManualBalance', genSchema, 'ManualBalance')