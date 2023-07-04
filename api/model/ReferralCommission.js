var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

var referralCommissionSchema = new Schema({
   "userId"             : { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Users' },
   "refUser"          : { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Users' },
   "refType"          : { type: String, default: 'user' },
   "earnedId"          : { type: String},
   "commissionAmount"  : { type: Number, default: '' },
   "currencyId": { type: mongoose.Schema.Types.ObjectId, ref: 'Currency' },
   "currencyName" : { type: String, default: '' },
   "convertedAmount"   : { type: Number, default: '' },
   "convertedCurrency" : { type: String},
   "description"        : { type: String, default: '' },
   "dateTime"           : { type: Date, default: Date.now }
});
module.exports = mongoose.model('ReferralCommission', referralCommissionSchema, 'ReferralCommission')