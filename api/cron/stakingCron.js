const mongoose = require('mongoose');
const query_helper = require('./helpers/query');
const cron = require("node-cron");
const StakingHistory = mongoose.model('StakingHistory');
const StakeBonusHistory = mongoose.model('StakeBonusHistory');
const emailTemplate = mongoose.model("EmailTemplate");
let common = require('./helpers/common');
const sitesetting = mongoose.model('SiteSettings');
const Users = mongoose.model("Users");
const CurrencyDB = mongoose.model("Currency");
const ReferralDB = mongoose.model('ReferralCommission');
const mail_helper = require('./helpers/mailHelper');
cron.schedule("* * * * *", (req, res) => {
	if(common.getSiteDeploy() == 0) {
		// checkBonusAndMatured();
		// temp hide by rajams
	}
});
async function checkBonusAndMatured() {
	try {
		let curDate = new Date();
		let sitesettingdata = await query_helper.findoneData(sitesetting, {}, {})
		let stakingHistory = await query_helper.findData(StakingHistory, { status: 0, nextBonusDay: { $lte: curDate }, maturityDate: { $gt: curDate } }, {}, { _id: 1 }, 0);
		if (stakingHistory.status && stakingHistory.msg.length > 0) {
			creditBonusData(stakingHistory.msg, sitesettingdata, 0)
		}
		setTimeout(async function () {
			let stakingEndHistory = await query_helper.findData(StakingHistory, { status: 0, maturityDate: { $lte: curDate } }, {}, { _id: 1 }, 0); 
			if (stakingEndHistory.status && stakingEndHistory.msg.length > 0) {
				stakingEndHistory = stakingEndHistory.msg;
				maturityReturn(stakingEndHistory, 0);
			}
		}, 15000);
	} catch (e) {
		console.log('checkBonusAndMatured', e)
	}
}
async function creditBonusData(stakingHistory, sitesettingdata, inc) {
	try {
		const element = stakingHistory[inc];
		let currency = await query_helper.findoneData(CurrencyDB, { currencySymbol: element.currency }, {});
		if (currency.status) {
			currency = currency.msg;
			if (element.nextBonusDay.getTime() <= element.lastDay.getTime()) {
				try {
					if (element.nextBonusDay.getTime() == element.lastDay.getTime()) {
						let userResult = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(element.userId) }, {username: 1, email: 1});
                		if (userResult.status) {
							userResult = userResult.msg;
							common.userNotification(element.userId, 'Staking Package', 'Hi '+userResult.username+', Your Staking Package Is Mature Tomorrow, Re-Stake a Same Package To Continue Earning Same Profit. If You Haven`t Re-Staked New Bonus Percentage Will Be Calculated Hereafter.');
							let configResult = await query_helper.findoneData(emailTemplate, { hint: 'user-staking-matured' }, {})
							if (configResult.status) {
								configResult = configResult.msg;
								let emailtemplate = configResult.content.replace(/###NAME###/g, userResult.username).replace(/###CURRENCY###/g, element.currency).replace(/###AMOUNT###/g, common.roundValuesMail(+element.amount, 8));
								mail_helper.sendMail({ subject: configResult.subject.replace(/###CURRENCY###/g, element.currency)+" - "+element.package.packageName, to: userResult.email, html: emailtemplate }, (aftermail) => {
								})
							}
						}
					}
				} catch (e) {
					console.log('Notification API Call:', e)
				}
				const nextDate = element.nextBonusDay.getFullYear() + '-' + ((element.nextBonusDay.getMonth() + 1) > 9 ? (element.nextBonusDay.getMonth() + 1) : '0' + (element.nextBonusDay.getMonth() + 1)) + '-' + (element.nextBonusDay.getDate() > 9 ? element.nextBonusDay.getDate() : '0' + element.nextBonusDay.getDate());
				let stakingBonusHistory = await query_helper.findData(StakeBonusHistory, { stakeId: element._id, bonusDate: nextDate }, {}, { _id: 1 }, 0);
				if (!stakingBonusHistory.status || stakingBonusHistory.msg.length == 0) {
					let bonus = (element.amount * element.package.interest * element.package.interestUnlockDays) / 100;
					bonus = common.roundValues(bonus, currency.siteDecimal);
					let bonusData = {
						userId: element.userId,
						stakeId: element._id,
						walletCurrencyId: element.walletCurrencyId,
						currency: element.currency,
						bonusDate: nextDate,
						amount: element.amount,
						bonus: bonus
					}
					let walletOutput = await common.getbalance(element.userId, element.walletCurrencyId)
					let newstakebal = (+walletOutput.stakingAmount) + (+bonus);
					newstakebal = common.roundValues(newstakebal, currency.siteDecimal);
					let nextBonusDay = new Date(element.nextBonusDay);
					nextBonusDay = new Date(nextBonusDay.setDate(nextBonusDay.getDate() + +(element.package.interestUnlockDays)));
					let updObj = {
						lastBonusDay: element.nextBonusDay,
						nextBonusDay: nextBonusDay,
						bonus: common.roundValues((element.bonus + +(bonus)), currency.siteDecimal)
					}
					let bonusNew = await query_helper.insertData(StakeBonusHistory, bonusData);
					if (bonusNew.status) {
						await query_helper.updateData(StakingHistory, 'one', { _id: element._id }, updObj)
						await common.updateStakeAmount(element.userId, element.walletCurrencyId, +newstakebal, bonusNew._id, 'Staking-Bonus');
						if (sitesettingdata.status && sitesettingdata.msg.stakingreferralBonus > 0) {
							const referUsers = await query_helper.findoneData(Users, { _id: element.userId }, {});
							if (referUsers.status && referUsers.msg.referUser != "") {
								const referredUsers = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(referUsers.msg.referUser) }, {});
								if (referredUsers.status) {
									let commisionbonus = (bonus * sitesettingdata.msg.stakingreferralBonus) / 100;
									commisionbonus = common.roundValues(commisionbonus, currency.siteDecimal);
									const convertedAmount = common.roundValues(currency.USDvalue * commisionbonus, 2);
									let refStakbonusdata = {
										userId: referUsers.msg.referUser,
										refUser: element.userId,
										commissionAmount: commisionbonus,
										currencyId: element.walletCurrencyId,
										earnedId: element._id,
										currencyName: element.currency,
										convertedAmount: convertedAmount,
										convertedCurrency: 'USD',
										description: 'Staking Bonus On ' + nextDate
									}
									await query_helper.insertData(ReferralDB, refStakbonusdata);
									let walletOutput1 = await common.getbalance(referUsers.msg.referUser, element.walletCurrencyId)
									let newstakebal1 = (+walletOutput1.stakingAmount) + (+commisionbonus);
									newstakebal1 = common.roundValues(newstakebal1, currency.siteDecimal);
									await common.updateStakeAmount(referUsers.msg.referUser, element.walletCurrencyId, +newstakebal1, element._id, 'Staking');
									inc++;
									if (typeof stakingHistory[inc] == 'object') {
										creditBonusData(stakingHistory, sitesettingdata, inc);
									}
								} else {
									inc++;
									if (typeof stakingHistory[inc] == 'object') {
										creditBonusData(stakingHistory, sitesettingdata, inc);
									}
								}
							} else {
								inc++;
								if (typeof stakingHistory[inc] == 'object') {
									creditBonusData(stakingHistory, sitesettingdata, inc);
								}
							}
						} else {
							inc++;
							if (typeof stakingHistory[inc] == 'object') {
								creditBonusData(stakingHistory, sitesettingdata, inc);
							}
						}
					} else {
						inc++;
						if (typeof stakingHistory[inc] == 'object') {
							creditBonusData(stakingHistory, sitesettingdata, inc);
						}
					}
				} else {
					let nextBonusDay = new Date(element.nextBonusDay);
					nextBonusDay = new Date(nextBonusDay.setDate(nextBonusDay.getDate() + +(element.package.interestUnlockDays)));
					let updObj = {
						lastBonusDay: element.nextBonusDay,
						nextBonusDay: nextBonusDay
					}
					await query_helper.updateData(StakingHistory, 'one', { _id: element._id }, updObj)
					inc++;
					if (typeof stakingHistory[inc] == 'object') {
						creditBonusData(stakingHistory, sitesettingdata, inc);
					}
				}
			} else {
				inc++;
				if (typeof stakingHistory[inc] == 'object') {
					creditBonusData(stakingHistory, sitesettingdata, inc);
				}
			}
			// if (new Date().getTime() > element.maturityDate.getTime()) {
			// 	if(element.reStake == 1) {
			// 		let updObj = {
			// 			status: 1
			// 		}
			// 		await query_helper.updateData(StakingHistory, 'one', { _id: element._id }, updObj)
			// 		let newRecord = JSON.parse(JSON.stringify(element));
			// 		delete newRecord._id;
			// 		delete newRecord.referenceId;
			// 		delete newRecord.createdDate;
			// 		delete newRecord.lastBonusDay;
			// 		let someDate = new Date(),someDate1 = new Date(),someDate2 = new Date();
			// 		newRecord.maturityDate = new Date(someDate.setDate(someDate.getDate() + (+(newRecord.maturedDays) + +(newRecord.package.tenureDays))));
			// 		newRecord.nextBonusDay = new Date(someDate1.setDate(someDate1.getDate() + +(newRecord.package.interestUnlockDays)));
			// 		newRecord.lastDay = new Date(someDate2.setDate(someDate2.getDate() + +(newRecord.package.tenureDays)));
			// 		newRecord.bonus = 0;
			// 		newRecord.status = 0;
			// 		newRecord.reStake = 0;
			// 		await query_helper.insertData(StakingHistory, newRecord);
			// 	} else {
			// 		let walletOutput = await common.getbalance(element.userId, element.walletCurrencyId)
			// 		let newstakebal2 = (+walletOutput.stakingAmount) + (+element.amount);
			// 		newstakebal2 = common.roundValues(newstakebal2, currency.siteDecimal);
			// 		let updObj = {
			// 			status: 1
			// 		}
			// 		await query_helper.updateData(StakingHistory, 'one', { _id: element._id }, updObj)
			// 		await common.updateStakeAmount(element.userId, element.walletCurrencyId, +newstakebal2, element._id, 'Staking-Maturity');
			// 	}
			// }
		} else {
			inc++;
			if (typeof stakingHistory[inc] == 'object') {
				creditBonusData(stakingHistory, sitesettingdata, inc);
			}
		}
	} catch (e) {
		console.log('creditBonusData', e)
	}
}
async function maturityReturn(stakingEndHistory, inc1) {
	try {
		let curDate1 = new Date("2022-04-25T08:00:00.000Z");
		element1 = stakingEndHistory[inc1];
		let currency1 = await query_helper.findoneData(CurrencyDB, { currencySymbol: element1.currency }, {});
		if (currency1.status) {
			currency1 = currency1.msg;
			if (new Date().getTime() > element1.maturityDate.getTime()) {
				if(element1.reStake == 1) {
					let updObj = {
						status: 1
					}
					await query_helper.updateData(StakingHistory, 'one', { _id: element1._id }, updObj)
					let newRecord = JSON.parse(JSON.stringify(element1));
					delete newRecord._id;
					delete newRecord.referenceId;
					delete newRecord.createdDate;
					delete newRecord.lastBonusDay;
					let someDate = new Date(),someDate1 = new Date(),someDate2 = new Date();
					newRecord.maturityDate = new Date(someDate.setDate(someDate.getDate() + (+(newRecord.maturedDays) + +(newRecord.package.tenureDays))));
					newRecord.nextBonusDay = new Date(someDate1.setDate(someDate1.getDate() + +(newRecord.package.interestUnlockDays)));
					newRecord.lastDay = new Date(someDate2.setDate(someDate2.getDate() + +(newRecord.package.tenureDays)));
					newRecord.bonus = 0;
					newRecord.status = 0;
					newRecord.reStake = 0;
					await query_helper.insertData(StakingHistory, newRecord);
				} else {
					let walletOutput = await common.getbalance(element1.userId, element1.walletCurrencyId)
					let newstakebal = (+walletOutput.stakingAmount) + (+element1.amount);
					newstakebal = common.roundValues(newstakebal, currency1.siteDecimal);
					let updObj = {
						status: 1
					}
					await query_helper.updateData(StakingHistory, 'one', { _id: element1._id }, updObj)
					await common.updateStakeAmount(element1.userId, element1.walletCurrencyId, +newstakebal, element1._id, 'Staking-Maturity');
					let createdDate = element1.createdDate;
					if (curDate1 < createdDate) {
						await common.updateStakeHoldAmount(element1.userId, element1.walletCurrencyId, -element1.amount);
					}
				}
				inc1++;
				if (typeof stakingEndHistory[inc1] == 'object') {
					maturityReturn(stakingEndHistory, inc1);
				}
			} else {
				inc1++;
				if (typeof stakingEndHistory[inc1] == 'object') {
					maturityReturn(stakingEndHistory, inc1);
				}
			}
		} else {
			inc1++;
			if (typeof stakingEndHistory[inc1] == 'object') {
				maturityReturn(stakingEndHistory, inc1);
			}
		}
	} catch (e) {
		console.log('maturityReturn', e)
	}
}