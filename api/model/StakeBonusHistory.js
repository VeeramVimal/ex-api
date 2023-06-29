var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var StakeBonusHistorySchema = new Schema({
  "userId"               : { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Users' },
  "stakeId"              : { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'StakingHistory' },
  "walletCurrencyId"     : { type: mongoose.Schema.Types.ObjectId, ref: 'CurrencySymbol' },
  "currency"             : { type: String, default: '' },
  "bonusDate"             : { type: String, default: '' },
  "amount"               : { type: Number, default: 0 },
  "bonus"                : { type: Number, default: 0 },
  "createdDate"          : { type: Date, default: Date.now },
  "referenceId"         : { type:String, lowercase: true, required: true, index: true, unique: true }
});
StakeBonusHistorySchema.pre('validate', function (next) {
	const stakeBonus = this;
  let curDate = new Date();
  let txnRef = curDate.getFullYear()+'/'+(curDate.getMonth()+1)+'/'+curDate.getDate()+' '+curDate.getHours()+':'+curDate.getMinutes();
  let number = curDate.getSeconds();
  let checkNumber = number/5;
  checkNumber = checkNumber.toString().split('.');
  if(checkNumber.length > 1) {
      number = number - (('0.'+checkNumber[1])* 5);
  }
  txnRef = txnRef + ':' + number;
  txnRef = txnRef + '-' + stakeBonus.userId.toString();
	stakeBonus.referenceId = txnRef;
	next();
});
module.exports = mongoose.model('StakeBonusHistory', StakeBonusHistorySchema, 'StakeBonusHistory')