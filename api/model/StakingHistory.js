var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var StakingHistorySchema = new Schema({
  "userId"               : { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Users' },
  "stakingId"            : { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Staking' },
  "walletCurrencyId"     : { type: mongoose.Schema.Types.ObjectId, index: true, ref: 'CurrencySymbol' },
  "currency"             : { type: String, index: true, default: '' },
  "package"              : { type: Object, default: {} },
  "amount"               : { type: Number, default: 0 },
  "maturedDays"          : { type: Number, default: 0 },
  "lastDay"              : { type: Date, default: Date.now },
  "lastBonusDay"         : { type: Date, default: Date.now },
  "nextBonusDay"         : { type: Date, default: Date.now },
  "bonus"                : { type: Number, default: 0 },
  "status"               : { type: Number, default: 0 },
  "reStake"              : { type: Number, default: 0 },
  "maturityDate"         : { type: Date, default: Date.now },
  "createdDate"          : { type: Date, default: Date.now },
  "referenceId"         : { type:String, lowercase: true, required: true, index: true, unique: true }
});
StakingHistorySchema.pre('validate', function (next) {
	const staking = this;
  let curDate = new Date();
  let txnRef = curDate.getFullYear()+'/'+(curDate.getMonth()+1)+'/'+curDate.getDate()+' '+curDate.getHours()+':'+curDate.getMinutes();
  let number = curDate.getSeconds();
  let checkNumber = number/5;
  checkNumber = checkNumber.toString().split('.');
  if(checkNumber.length > 1) {
      number = number - (('0.'+checkNumber[1])* 5);
  }
  txnRef = txnRef + ':' + number;
  txnRef = txnRef + '-' + staking.userId.toString();
	staking.referenceId = txnRef;
	next();
});
module.exports = mongoose.model('StakingHistory', StakingHistorySchema, 'StakingHistory')