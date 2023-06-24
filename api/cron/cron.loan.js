const cron = require("node-cron");
let config = require("../Config/config");

const CryptoLoanBorrowModel = require('../model/CryptoLoanBorrow.model');
const UserWallet = require('../model/UserWallet');
const LoanRepayment = require('../model/repayment.model');
const collateralConfig = require('../model/collateral-config.model');
const LoanConfig = require("../model/loan-config.model");
const BorrowMarket = require("../model/BorrowMarket.model");
const Currency = require("../model/Currency");
const getJson = require("get-json");
const common = require("../helpers/common");
//** crypto loan expiration cron function */
const cryptoLoanExpirateCheck = async () => {
	try {
		const cryptoLoan = await CryptoLoanBorrowModel.find({});
		const todayDate = new Date();

		if (cryptoLoan && cryptoLoan.length) {
			var expireDate;
			const expiredLoanDetails = cryptoLoan.filter((loan) => new Date(loan.expirationDate) <= todayDate);
			expiredLoanDetails.forEach(async (loan) => {
				if (loan.loanStatus == 0) {
					let cryptoLoanId = loan._id;
					let userId = loan.userId;
					let borrowCurrencyId = loan.borrowCurrencyId;
					let collateralCurrencyId = loan.collateralCurrencyId;
					var collateralAmount = loan.collateralAmount;

					collateralCurrencyId && (
						UserWallet.findOne(
							{ userId: userId, currencyId: collateralCurrencyId },
							{ amount: 1, _id: 1, userId: 1, currencyId: 1, cryptoLoanHold: 1 })
							.then(async (userWalletCollateralCoin) => {
								let oldAmount = userWalletCollateralCoin.cryptoLoanAmount; //** using crypto loan balance updation in old amount */
								let newAmount = "";
								// userWalletCollateralCoin.amount = userWalletCollateralCoin.amount - collateralAmount;
								// userWalletCollateralCoin.amount = userWalletCollateralCoin.cryptoLoanAmount - collateralAmount;

								// Update the object's properties
								userWalletCollateralCoin.cryptoLoanHold = 0;
								Object.assign(userWalletCollateralCoin);
								// Save the updated object
								await userWalletCollateralCoin.save((err, updatedObject) => {
									if (err) {
										console.log(err);
									} else {
										console.log("user wallet collateral coin is automatic liquidated");
										newAmount = updatedObject.cryptoLoanAmount; //** using crypto loan balance updation in new amount */
									}
								});
								let type = "Crypto loan will automatically close the Collateral Asset to Loan Asset"
								await common.cryptoLoanBorrowBalance(userId, collateralCurrencyId, newAmount, oldAmount, cryptoLoanId, type);
							}).catch((err) => console.log(err))
					)

					borrowCurrencyId && (
						UserWallet.findOne(
							{ userId: userId, currencyId: borrowCurrencyId },
							{ amount: 1, _id: 1, userId: 1, currencyId: 1, cryptoLoanHold: 1 })
							.then(async (userWalletBorrowCoin) => {
								walletData = [];
								if (userWalletBorrowCoin) {
									// userWalletBorrowCoin.amount = (userWalletBorrowCoin.amount - repay.due_detail[0].due_paid_amount);
									userWalletBorrowCoin.cryptoLoanHold = 0;
									Object.assign(userWalletBorrowCoin);
									await userWalletBorrowCoin.save((err, updatedObject) => {
										if (err) console.log(err);
										else console.log("user wallet borrow coin is automatic liquidated");
									});
								}
							}).catch((err) => console.log(err))
					)

					if (loan) {
						loan.collateralAmount = 0;
						loan.remainingPrinciple = 0;
						loan.debtLoanableAmount = loan.debtLoanableAmount;
						loan.yearlyInterestRate = 0;
						loan.loanStatus = 2;
						loan.RepaidDate = new Date();
						Object.assign(loan);
						await loan.save();
					}
					return loan;
				}
			})

		}
	} catch (error) {
		console.log(error);
	}
};

const coingecko = async (coinQuery) => {
	const { ids, vs_currencies } = coinQuery
	const USD_Data = await getJson(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vs_currencies}`);
	return USD_Data
};

const autoCloseAsset = async (cryptoLoanAutoRepaid) => {
	const { userId, borrowCurrencyId, collateralCurrencyId } = cryptoLoanAutoRepaid;
	if (collateralCurrencyId) {
		UserWallet.findOne(
			{ userId: userId, currencyId: collateralCurrencyId },
			{ amount: 1, _id: 1, userId: 1, currencyId: 1, cryptoLoanHold: 1 })
			.then(async (userWalletCollateralCoin) => {
				// Update the object's properties
				userWalletCollateralCoin.cryptoLoanHold = 0;
				Object.assign(userWalletCollateralCoin);
				// Save the updated object
				await userWalletCollateralCoin.save((err, updatedObject) => {
					if (err) console.log(err);
					else console.log("user wallet collateral coin is automatic liquidated");
				});
			}).catch((err) => console.log(err))
	}
	if (borrowCurrencyId) {
		UserWallet.findOne(
			{ userId: userId, currencyId: borrowCurrencyId },
			{ amount: 1, _id: 1, userId: 1, currencyId: 1, cryptoLoanHold: 1 })
			.then(async (userWalletBorrowCoin) => {
				walletData = [];
				if (userWalletBorrowCoin) {
					// userWalletBorrowCoin.amount = (userWalletBorrowCoin.amount - repay.due_detail[0].due_paid_amount);
					userWalletBorrowCoin.cryptoLoanHold = 0;
					Object.assign(userWalletBorrowCoin); // Update the object's properties
					await userWalletBorrowCoin.save((err, updatedObject) => {
						if (err) console.log(err);
						else console.log("user wallet borrow coin is automatic liquidated");
					}); // Save the updated object
				}
			}).catch((err) => console.log(err))
	}
	if (cryptoLoanAutoRepaid) {
		cryptoLoanAutoRepaid.collateralAmount = 0;
		cryptoLoanAutoRepaid.remainingPrinciple = 0;
		cryptoLoanAutoRepaid.debtLoanableAmount = cryptoLoanAutoRepaid.debtLoanableAmount;
		cryptoLoanAutoRepaid.yearlyInterestRate = 0;
		cryptoLoanAutoRepaid.loanStatus = 2;
		cryptoLoanAutoRepaid.RepaidDate = new Date();
		Object.assign(cryptoLoanAutoRepaid); //Update the object's properties
		await cryptoLoanAutoRepaid.save();// Save the updated object
	}
	return console.log("Automatically close your Collateral Asset to repay the loan");
};

// const topUpAssetMargin = async () => {
// 	return console.log("you to top up the Collateral Asset");
// };

const topUpAssetLiquidation = async () => {
	return console.log("Please top up your collateral in time to avoid closing the position.");
};

const liquidePriceCheck = async () => {
	try {
		const checkLiquidation = await LoanRepayment.find({});
		const CryptoLoanBorrow = await CryptoLoanBorrowModel.find({});
		const todayDate = new Date();

		if (CryptoLoanBorrow && CryptoLoanBorrow.length) {
			CryptoLoanBorrow.forEach(async (cryptoLoan) => {
				if (cryptoLoan.loanStatus == 0) {
					let collateralCoin = cryptoLoan.collateralCoin;
					let userId = cryptoLoan.userId;
					let orderId = cryptoLoan._id;
					let remainingPrinciple = cryptoLoan.remainingPrinciple;
					let collateralAmt = cryptoLoan.collateralAmount;
					var RepaidDate = new Date(cryptoLoan.RepaidDate);
					var hours = parseInt(Math.abs(RepaidDate - todayDate) / 3600000);
					var hourInterest = (hours + 1) * parseFloat(cryptoLoan.hourlyInterestRate);
					var usdValue = null;
					var loanAmt = null;
					var marginLTVCalc = null;
					var liqudateLTVCalc = null;
					let liquidateLTV = cryptoLoan.liquidateLTV;
					let marginLTV = cryptoLoan.marginLTV;
					var coinQuery = {
						ids: "",
						vs_currencies: ""
					};
					if (remainingPrinciple == 0 || remainingPrinciple == null) {
						loanAmt = cryptoLoan.debtLoanableAmount;
					} else {
						loanAmt = cryptoLoan.remainingPrinciple;
					}
					// collateralConfig.findOne({ coin: collateralCoin })
					// 	.then((collateralData) => {
					// 		const { initLtv, marginLtv, liquidationLtv } = collateralData;
					// 		Currency.findOne({ currencySymbol: { $regex: collateralCoin, $options: 'i' } },
					// 			{ image: true, currencyId: 1, currencyName: 1, currencySymbol: 1, apiid: 1, _id: 0, USDvalue: 1 })
					// 			.then(async (currencyData) => {
					// 				usdValue = currencyData.USDvalue;
					// 				// usdValue = "20000";
					// 				LoanRepayment.findOne({ loanOrderId: orderId, userId: userId })
					// 					.then(async (repayment) => {
					// 						// let liqidationCond = (((liquidationLtv * 100) == 80) ? 80 : (liquidationLtv * 100));
					// 						marginLTVCalc = (((loanAmt + hourInterest) / usdValue) / collateralAmt);
					// 						if ((marginLTVCalc * 100) <= (liquidationLtv * 100)) {
					// 							if (((marginLTVCalc * 100) >= (marginLtv * 100)) &&
					// 								((marginLTVCalc * 100) <= (liquidationLtv * 100))) {
					// 								const marginLtvTopUp = await topUpAssetLiquidation();
					// 							}
					// 						} else if ((marginLTVCalc * 100) >= (liquidationLtv * 100)) {
					// 							const liquitationLtvClose = await autoCloseAsset(cryptoLoan);
					// 						}
					// 						// if ((marginLTVCalc * 100) == (liquidationLtv * 100)) {
					// 						// 	console.log("Automatically close your Collateral Asset to repay the loan");
					// 						// }
					// 						// if ((marginLTVCalc * 100) >= (marginLtv * 100)) {
					// 						// 	console.log("you to top up the Collateral Asset");
					// 						// }
					// 						// if (((marginLTVCalc * 100) >= (liquidationLtv * 100)) && ((marginLTVCalc * 100) <= (liquidationLtv * 100))) {
					// 						// 	console.log("Please top up your collateral in time to avoid closing the position.");
					// 						// }

					// 					}).catch((err) => console.log(err))
					// 			}).catch((err) => console.log(err));
					// 	}).catch((err) => console.log(err));
					collateralConfig.findOne({ coin: collateralCoin })
						.then((collateralData) => {
							const { initLtv, marginLtv, liquidationLtv } = collateralData;
							LoanRepayment.findOne({ loanOrderId: orderId, userId: userId })
								.then(async (repayment) => {
									Currency.findOne({ currencySymbol: { $regex: collateralCoin, $options: 'i' } },
										{ image: true, currencyId: 1, currencyName: 1, currencySymbol: 1, apiid: 1, _id: 0, USDvalue: 1 })
										.then(async (currencyData) => {
											coinQuery.ids = currencyData.apiid;
											coinQuery.vs_currencies = 'usd';
											marginLTVCalc = ((loanAmt) / (collateralAmt * marginLtv));
											liqudateLTVCalc = ((loanAmt) / (collateralAmt * liquidationLtv));
											var USD_Value = null;
											if (coinQuery.ids == 'Fibit' || coinQuery.ids == '') {
												USD_Value = null
											} else {
												USD_Value = await coingecko(coinQuery);
											};

											var CurrentUSD = USD_Value && USD_Value[coinQuery.ids][coinQuery.vs_currencies];
											if (CurrentUSD) {
												if (liqudateLTVCalc >= CurrentUSD) {
													await autoCloseAsset(cryptoLoan)
												} else if (marginLTVCalc >= CurrentUSD) {
													await topUpAssetLiquidation();
												}
											};

										}).catch((err) => console.log(err));
								}).catch((err) => console.log(err))
						}).catch((err) => console.log(err));
				}
			})
		}
	} catch (error) {
		console.log(error);

	}
};

// const loanConfigCoin = async () => {
// 	try {
// 		const coin = 'btc';
// 		const collateralCoin = await collateralConfig.findOne({ coin: { $regex: coin, $options: 'i' } });

// 		if (collateralCoin) {
// 			// console.log("collateralCoin========condit=====", collateralCoin);
// 			await LoanConfig.find({}).then((loan_config) => {
// 				loan_config.filter(async (loanData) => {
// 					// console.log("loanData============", loanData);
// 					let loanCoin = loanData.coin;
// 					// console.log("loanCoin===========", loanCoin);
// 					let sevenInt, fourteenInt, thirtyInt, sevenIntHr, fourteenIntHr, thirtyIntHr;
// 					let sevenInterest, fourteenInterest, thirtyInterest;
// 					await BorrowMarket.findOne({ coin: { $regex: loanCoin, $options: 'i' } })
// 						.then(async (borrow_config) => {
// 							// console.log("collateral_config============", collateral_config);
// 							if (borrow_config) {
// 								sevenInt =collateralCoin.sevenDaysFixedInterest;
// 								fourteenInt = collateralCoin.fourteenDaysFixedInterest;
// 								thirtyInt = collateralCoin.thirtyDaysFixedInterest;
// 								sevenIntHr = sevenInt / (365 * 24);
// 								fourteenIntHr = fourteenInt / (365 * 24);
// 								thirtyIntHr = thirtyInt / (365 * 24);
// 								sevenInterest = sevenIntHr * 24 * 7;
// 								fourteenInterest = fourteenIntHr * 24 * 14;
// 								thirtyInterest = thirtyIntHr * 24 * 30;
// 								borrow_config.sevenDaysFixedRate.annuallyRate = parseFloat(sevenInterest).toFixed(8);
// 								borrow_config.sevenDaysFixedRate.hourlyRate = parseFloat(sevenIntHr).toFixed(8);
// 								borrow_config.fourteenDaysFixedRate.annuallyRate = parseFloat(fourteenInterest).toFixed(8);
// 								borrow_config.fourteenDaysFixedRate.hourlyRate = parseFloat(fourteenIntHr).toFixed(8);
// 								borrow_config.thirtyDaysFixedRate.annuallyRate = parseFloat(thirtyInterest).toFixed(8);
// 								borrow_config.thirtyDaysFixedRate.hourlyRate = parseFloat(thirtyIntHr).toFixed(8);
// 								Object.assign(borrow_config);
// 								await borrow_config.save();
// 							}
// 							// await collateralConfig.findOne({ coin: { $regex: loanCoin, $options: 'i' } })
// 							// .then((updateLoanConfig) => {
// 							// 	if (updateLoanConfig) {
// 							// 		console.log("updateLoanConfig=============", updateLoanConfig);
// 							// 	}
// 							// })
// 							// .catch((err) => err);
// 						})
// 						.catch((err) => err);
// 				})
// 			}).catch((err) => err);
// 		}
// 	} catch (error) {
// 		console.log(error);
// 	}
// };

if (config.sectionStatus && config.sectionStatus.cryptoLoan == "Enable") {
	//** at every mins schedule for crypto-loan expired checked and updating*/
	let cryptoLoanExpirateCheckRunning = false;
	cron.schedule("* * * * *", async (req, res) => {
		if (cryptoLoanExpirateCheckRunning) {
			return true;
		}
		cryptoLoanExpirateCheckRunning = true;
		await cryptoLoanExpirateCheck();
		cryptoLoanExpirateCheckRunning = false;
	});

	//** at every mins schedule for liquidation price functionalities*/
	let liquidePriceCheckRunning = false;
	cron.schedule("* * * * *", async (req, res) => {
		if (liquidePriceCheckRunning) {
			return true;
		}
		liquidePriceCheckRunning = true;
		await liquidePriceCheck();
		liquidePriceCheckRunning = false;
	});

	// let loanConfigCoinRunning = false;
	// cron.schedule("* * * * *", async (req, res) => {
	// 	if (loanConfigCoinRunning) {
	// 		return true;
	// 	}
	// 	loanConfigCoinRunning = true;
	// 	await loanConfigCoin();
	// 	loanConfigCoinRunning = false;
	// });
}