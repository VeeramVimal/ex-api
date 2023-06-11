var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var stakingSchema = new Schema({
  "currencyId"  : { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Currency'},
  "walletCurrencyId"  : { type: mongoose.Schema.Types.ObjectId, ref: 'CurrencySymbol'},
  "maturityDays": { type: Number, default: 0 },
  "packages": { type: Object, default: {} },
  "status": { type: Number, default: 1 },
  "dateTime"   : {type: Date, default: Date.now}
});

module.exports = mongoose.model('Staking', stakingSchema, 'Staking')