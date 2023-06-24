const Mongoose = require('mongoose');
const MongoObjectId = Mongoose.mongo.ObjectId;
const messageUtils = require("../helpers/messageUtils");
const CryptoLoanBorrowed = require("../model/CryptoLoanBorrow.model");
const UserWallet = require("../model/UserWallet");
const Repayment = require("../model/repayment.model");
const CryptoLoanBalanceUpdation = require("../model/CryptoLoanBalanceUpdation.model");
const common = require("../helpers/common");
/**
* @description Get SinglePackage by userId
* @param {ObjectId<string} userId
* @returns {Promise<User>}
*/
const singleCryptoLoan = async (userId) => {
    const user = await CryptoLoanBorrowed.findOne({ userId: userId, loanStatus: 0 });
    return user;
}
/**
 * @description create a new loan borrowed 
 * @param {Object} coinBody
 * @returns {Promise<UserIdoForm>}
 */
const borrowedCreateServices = async (coinBody) => {
    const { userId } = coinBody;
    const userLoanRepaid = await singleCryptoLoan(userId);
    if (userLoanRepaid) throw new Error(messageUtils.ALREADY_LOAN_ACCURED);
    return CryptoLoanBorrowed.create(coinBody).then(async (loanBorrow) => {
        let cryptoLoanId = loanBorrow._id;
        let userId = loanBorrow.userId;
        let collateralCurrencyId = loanBorrow.collateralCurrencyId;
        let borrowCurrencyId = loanBorrow.borrowCurrencyId;
        let walletData = [];
        let collateralCoin = loanBorrow.collateralCoin;
        let borrowCoin = loanBorrow.borrowedCoin;
        let borrowAmt = loanBorrow.remainingPrinciple;
        collateralCurrencyId && (
            UserWallet.findOne(
                { userId: userId, currencyId: collateralCurrencyId },
                { amount: 1, _id: 1, userId: 1, currencyId: 1, cryptoLoanHold: 1, cryptoLoanAmount: 1 })
                .then(async (userWalletCollateralCoin) => {
                    let oldAmount = userWalletCollateralCoin.amount; //** using crypto loan balance updation in old amount */
                    walletData = []
                    if (userWalletCollateralCoin) {
                        userWalletCollateralCoin.amount = (userWalletCollateralCoin.amount - loanBorrow.collateralAmount)
                        // userWalletCollateralCoin.cryptoLoanAmount = (userWalletCollateralCoin.amount - loanBorrow.collateralAmount);
                        userWalletCollateralCoin.cryptoLoanAmount = 0;
                        userWalletCollateralCoin.cryptoLoanHold = loanBorrow.collateralAmount;
                        Object.assign(userWalletCollateralCoin);
                        //** userWallet update the crypto loan collateral amount */
                        await userWalletCollateralCoin.save()
                            .then(
                                async (userWalletCollateral) => {
                                    let newAmount = userWalletCollateral.amount; //** using crypto loan balance updation in new amount */
                                    await common.cryptoLoanCollateralBalance(userId, collateralCurrencyId, newAmount, oldAmount, cryptoLoanId, 'Crypto loan collateral asset')
                                }).catch(err => console.log(err));
                        walletData.push(userWalletCollateralCoin);
                        return walletData;
                    };
                }).catch((err) => console.log(err))
        );
        borrowCurrencyId && (
            UserWallet.findOne(
                { userId: userId, currencyId: borrowCurrencyId },
                { amount: 1, _id: 1, userId: 1, currencyId: 1, cryptoLoanHold: 1, cryptoLoanAmount: 1 })
                .then(async (userWalletBorrowCoin) => {
                    let oldAmount = userWalletBorrowCoin.amount; //** using crypto loan balance updation in old amount */
                    walletData = []
                    if (userWalletBorrowCoin) {
                        // userWalletBorrowCoin.cryptoLoanAmount = (userWalletBorrowCoin.amount + loanBorrow.remainingPrinciple);
                        let conLoan = (userWalletBorrowCoin.cryptoLoanAmount == 0 || userWalletBorrowCoin.cryptoLoanAmount == null);
                        userWalletBorrowCoin.cryptoLoanAmount = conLoan ? loanBorrow.remainingPrinciple : ((userWalletBorrowCoin.cryptoLoanAmount) + (loanBorrow.remainingPrinciple));
                        userWalletBorrowCoin.cryptoLoanHold = loanBorrow.collateralAmount;
                        Object.assign(userWalletBorrowCoin);
                        //** userWallet update the crypto loan borrow amount */
                        await userWalletBorrowCoin.save()
                            .then(
                                async (userWalletBorrow) => {
                                    let newAmount = (userWalletBorrowCoin.amount + loanBorrow.remainingPrinciple); //** using crypto loan balance updation in new amount */
                                    await common.cryptoLoanBorrowBalance(userId, borrowCurrencyId, newAmount, oldAmount, cryptoLoanId, 'Crypto loan borrow asset')
                                }).catch((err) => console.log(err));
                        walletData.push(userWalletBorrowCoin);
                        return walletData;
                    };
                }).catch((err) => console.log(err))
        );
        await common.loanActivityLogs(userId, " ", " ", cryptoLoanId, 'Crypto Loan Borrowed', `Crypto loan ${borrowAmt} ${borrowCoin} borrowed successfully`)
        return { data: walletData, message: messageUtils.CRYPTO_LOAN_UPDATED };
    }).catch((err) => console.log(err));
};
/**
 * @description Get all borrow market details
 * @param {empty} 
 * @returns {Promise<User>} ArrayOfObject
 */
const loanBorrowServices = async () => {
    const Borrow = await CryptoLoanBorrowed.aggregate([
        {
            $lookup: {
                from: 'loanRepayment',
                let: { orderID: '$_id' },
                pipeline: [
                    { $match: { $expr: { $cond: [{ $eq: ['$loanOrderId', '$$orderID'] }, { $ne: ['$$orderID', []] }, false] } } },
                    { $project: { __v: 0, createdAt: 0, updatedAt: 0 } }
                ],
                as: 'loanRepaiedHistory'
            }
        },
        // { $unwind: '$loanRepaiedHistory'},
        { $project: { __v: 0, createdAt: 0, updatedAt: 0 } }

    ]);
    return Borrow
};

/**
 * @description search over all fields filter to get the crypto loan repaid history details
 * @param {Object} query
 *  * @param {Object<string>} userId
 *  * @param {Object<string>} userBodyQuery
 * @returns {Promise<Object>} ArrayOfObject
 */
const loanRepaiedHistoryServices = async (queryData, userQuery, userBody) => {
    // const { userId } = queryData;
    const { sort, limit, offset } = userQuery;
    const { userId, startDate, endDate, searchQuery, loanStatus } = userBody;
    var query = {};
    if (userId && startDate == "" && endDate == "" && !loanStatus) {
        query = { userId: Mongoose.Types.ObjectId(userId) }
    };
    if (searchQuery) {
        query = { '_id': Mongoose.Types.ObjectId(searchQuery) }
    };
    if (userId && startDate != "" && endDate != "") {
        let StateDateRange = new Date(startDate);
        let EndDateRange = new Date(endDate);
        let dateFilter = new Date(StateDateRange.setTime(StateDateRange.getTime() + 5.5 * 60 * 60 * 1000));
        let nextDateFilter = new Date(EndDateRange.setTime(EndDateRange.getTime() + 29.49 * 60 * 60 * 1000));
        query.$and = [
            { 'userId': Mongoose.Types.ObjectId(userId) },
            { 'borrowDate': { "$gte": dateFilter, "$lt": nextDateFilter } }
        ];
    }
    if (userId && loanStatus != "") {
        query.$and = [
            { 'userId': Mongoose.Types.ObjectId(userId) },
            { 'loanStatus': Number(loanStatus) }
        ];
    }
    if (userId && loanStatus != "" && startDate != "" && endDate != "") {
        let StateDateRange = new Date(startDate);
        let EndDateRange = new Date(endDate);
        let dateFilter = new Date(StateDateRange.setTime(StateDateRange.getTime() + 5.5 * 60 * 60 * 1000));
        let nextDateFilter = new Date(EndDateRange.setTime(EndDateRange.getTime() + 29.49 * 60 * 60 * 1000));
        query.$and = [
            { 'userId': Mongoose.Types.ObjectId(userId) },
            { 'borrowDate': { "$gte": dateFilter, "$lt": nextDateFilter } },
            { 'loanStatus': Number(loanStatus) }
        ];
    }
    const loanHistoryCount = await CryptoLoanBorrowed.find(query).countDocuments();
    const Borrow = await CryptoLoanBorrowed.aggregate([
        // { $project: { _id: 1, __v: 0, createdAt: 0, updatedAt: 0 } },
        { $match: query },
        { '$sort': sort },
        { '$limit': offset + limit },
        { '$skip': offset },
        {
            $lookup: {
                from: 'loanRepayment',
                let: { orderID: '$_id' },
                pipeline: [
                    { $match: { $expr: { $cond: [{ $eq: ['$loanOrderId', '$$orderID'] }, { $ne: ['$$orderID', []] }, false] } } },
                    { $project: { __v: 0, createdAt: 0, updatedAt: 0 } }
                ],
                as: 'loanRepaiedHistory'
            }
        },
        // { $unwind: '$loanRepaiedHistory'},
        { $project: { __v: 0, createdAt: 0, updatedAt: 0 } },

    ]);

    return { loanHistory: Borrow, total: loanHistoryCount };
}
/**
* @description Get SinglePackage by coinId
* @param {ObjectId<string} coinId
* @returns {Promise<User>}
*/
const getLoanAndUserWalletServices = async (orderId) => {
    const orderData = await CryptoLoanBorrowed.aggregate([
        { $match: { _id: Mongoose.Types.ObjectId(orderId) } },
        {
            $lookup: {
                from: "UserWallet",
                let: { currencyID: '$borrowCurrencyId', userID: '$userId', },
                pipeline: [
                    {
                        $match: {
                            $expr: {

                                $and: [
                                    { $eq: ["$userId", "$$userID"] },
                                    { $eq: ["$currencyId", "$$currencyID"] }
                                    // { $eq: ['currencyId', 'borrowCurrencyId']}
                                ]
                            }
                        }
                    },
                    { $project: { currencyId: 1, userId: 1, cryptoLoanHold: 1, amount: 1, cryptoLoanAmount: 1 } }
                ],
                as: 'userWallet'
            }
        },
        { $unwind: "$userWallet" },
        {
            $project: {
                __v: 0,
                // "userWalletDetail": "$userWallet"
            }
        }
    ]);
    return orderData;
}


const getSingleLoanServices = async (orderId) => {
    const orderData = await CryptoLoanBorrowed.findById({ _id: orderId }, { createdAt: 0, updatedAt: 0, __v: 0 });
    return orderData;
}
/**
 * @description update loan data used by coinId
 * @param {ObjectId<string>} coinId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const repayGetSingleServices = async (orderData) => {
    const repay = await Repayment.findOne({ userId: orderData.userId, loanOrderId: orderData.loanOrderId });
    return repay;
}

const userWalletServices = async (userId, borrowCurrencyId) => {
    const userWallet = await UserWallet.findOne(
        { userId: userId, currencyId: borrowCurrencyId },
        { amount: 1, _id: 1, userId: 1, currencyId: 1, cryptoLoanHold: 1, cryptoLoanAmount: 1 });
    return userWallet;
};

const cryptoRepayServices = async (orderData) => {
    const orderwith = oArray.indexOf(orderData.userId.toString());
    if(orderwith == -1){
        oArray.push(orderData.userId.toString());
        setTimeout(_intervalFunc, 5000, orderData.userId.toString());
        // let repayProcessing = false;
        const repayData = await getSingleLoanServices(orderData.loanOrderId);
        if (!repayData) throw new Error(messageUtils.CRYPTO_LOAN_NOT_FOUND);
        const orderRepayDetails = await repayGetSingleServices(orderData);
        let min = ((repayData.remainingPrinciple) * (10 / 100));
        let userId = repayData.userId;
        let collateralCurrencyId = repayData.collateralCurrencyId;
        let borrowCurrencyId = repayData.borrowCurrencyId;
        let collateralAmt = repayData.collateralAmount;
        let percentageOrder = orderData.due_detail[0].due_percentage;
        const checkWalletAmt = await userWalletServices(userId, borrowCurrencyId);
        if (checkWalletAmt.amount < orderData.repaymentAmount) throw new Error(`your amount is ${checkWalletAmt.amount}`)
        // if (repayProcessing) return;
        if (!orderRepayDetails) {
            // repayProcessing = true;
            let walletData = [];
            let repayAmtSub = "";
            let debtRepayAmt = "";
    
            return Repayment.create(orderData).then(async (repay) => {
                walletData = [];
                //** loanStatus 0 is Accuring Interest, and loanStatus 1 is Repaid */
                collateralCurrencyId && (percentageOrder == 100) && (
                    UserWallet.findOne(
                        { userId: userId, currencyId: collateralCurrencyId },
                        { amount: 1, _id: 1, userId: 1, currencyId: 1, cryptoLoanHold: 1, cryptoLoanAmount: 1 })
                        .then(async (userWalletCollateralCoin) => {
                            let oldAmount = userWalletCollateralCoin.cryptoLoanAmount; //** using crypto loan balance updation in old amount */
                            walletData = [];
                            if (userWalletCollateralCoin) {
                                let newAmount = userWalletCollateralCoin.cryptoLoanAmount + collateralAmt; //** using crypto loan balance updation in new amount */
                                // let newAmount = collateralAmt; //** using crypto loan balance updation in new amount */
                                userWalletCollateralCoin.amount = userWalletCollateralCoin.amount + collateralAmt;
                                userWalletCollateralCoin.cryptoLoanAmount = 0;
                                userWalletCollateralCoin.cryptoLoanHold = ((percentageOrder == 100) ? 0.00000000 : userWalletCollateralCoin.cryptoLoanHold);
                                Object.assign(userWalletCollateralCoin);
                                await userWalletCollateralCoin.save();
                                await common.cryptoLoanCollateralBalance(userId, collateralCurrencyId, newAmount, oldAmount, repay._id, 'Crypto loan repaid accuring interest collateral coin')
                                walletData.push(userWalletCollateralCoin);
                                // return walletData;
                            }
                        }).catch((err) => console.log(err))
                );
                borrowCurrencyId && (
                    UserWallet.findOne(
                        { userId: userId, currencyId: borrowCurrencyId },
                        { amount: 1, _id: 1, userId: 1, currencyId: 1, cryptoLoanHold: 1, cryptoLoanAmount: 1 })
                        .then(async (userWalletBorrowCoin) => {
                            let oldAmount = userWalletBorrowCoin.amount;  //** using crypto loan balance updation in old amount */
                            walletData = [];
                            if (userWalletBorrowCoin) {
                                let newAmount = userWalletBorrowCoin.amount - repay.due_detail[0].due_paid_amount;
                                // userWalletBorrowCoin.cryptoLoanAmount = (userWalletBorrowCoin.cryptoLoanAmount - repay.due_detail[0].due_paid_amount);
                                userWalletBorrowCoin.amount = (userWalletBorrowCoin.amount - repay.due_detail[0].due_paid_amount);
                                userWalletBorrowCoin.cryptoLoanHold = ((percentageOrder == 100) ? 0.00000000 : userWalletBorrowCoin.cryptoLoanHold)
                                Object.assign(userWalletBorrowCoin);
                                await userWalletBorrowCoin.save()
                                // .then(async() => {
                                // }).catch((err) => console.log(err));
                                await common.cryptoLoanBorrowBalance(userId, borrowCurrencyId, newAmount, oldAmount, repay._id, 'Crypto loan repaid accuring interest borrow coin')
                                walletData.push(userWalletBorrowCoin);
                            }
                        }).catch((err) => console.log(err))
                );
                if (repayData) {
                    // repayAmtSub = repayData.remainingPrinciple - repay.due_detail[0].due_paid_amount;
                    repayAmtSub = repayData.remainingPrinciple - repay.repaymentAmount;
                    // debtRepayAmt = repayData.debtLoanableAmount - repay.due_detail[0].due_paid_amount;
                    repayData.collateralAmount = (percentageOrder == 100) ? 0.00000000 : repayData.collateralAmount;
                    repayData.remainingPrinciple = (repayAmtSub == 0) ? 0.00000000 : repayAmtSub;
                    // repayData.debtLoanableAmount = (percentageOrder == 100) ? 0.00000000 : debtRepayAmt;
                    repayData.yearlyInterestRate = (percentageOrder == 100) ? 0 : repayData.yearlyInterestRate;
                    repayData.loanStatus = (percentageOrder == 100) ? 1 : 0;
                    repayData.RepaidDate = new Date();
                    Object.assign(repayData);
                    await repayData.save();
                    await common.loanActivityLogs(userId, " ", " ", repay._id, 'Crypto Loan Repaid', `Crypto loan due amount ${parseFloat(repay.due_detail[0].due_paid_amount).toFixed(8)} is repaid`)
                    return repayData;
                }
                repayProcessing = false;
                return { data: repayData, message: messageUtils.REPAYMENT_SUCCESS }
            }).catch((err) => console.log(err))
        } 
        else {
            repayProcessing = true;
            orderData.due_status = 'Repaid';
            collateralCurrencyId && (percentageOrder == 100) && (
                UserWallet.findOne(
                    { userId: userId, currencyId: collateralCurrencyId },
                    { amount: 1, _id: 1, userId: 1, currencyId: 1, cryptoLoanHold: 1, cryptoLoanAmount: 1 })
                    .then(async (userWalletCollateralCoin) => {
                        let oldAmount = userWalletCollateralCoin.cryptoLoanAmount; //** using crypto loan balance updation in old amount */
                        if (userWalletCollateralCoin) {
                            let newAmount = userWalletCollateralCoin.cryptoLoanAmount + collateralAmt; //** using crypto loan balance updation in new amount */
                            // let newAmount =  collateralAmt; //** using crypto loan balance updation in new amount */
                            userWalletCollateralCoin.amount = userWalletCollateralCoin.amount + collateralAmt;
                            userWalletCollateralCoin.cryptoLoanAmount = 0;
                            userWalletCollateralCoin.cryptoLoanHold = ((percentageOrder == 100) ? 0.00000000 : userWalletCollateralCoin.cryptoLoanHold);
                            Object.assign(userWalletCollateralCoin);
                            await userWalletCollateralCoin.save()
                            // .then(async() => {
                            // }).catch((err) => console.log(err));
                            await common.cryptoLoanCollateralBalance(userId, collateralCurrencyId, newAmount, oldAmount, orderRepayDetails._id, 'Crypto loan repaid accuring interest collateral coin');
                        }
                    }).catch((err) => console.log(err))
            );
            borrowCurrencyId && (
                UserWallet.findOne(
                    { userId: userId, currencyId: borrowCurrencyId },
                    { amount: 1, _id: 1, userId: 1, currencyId: 1, cryptoLoanHold: 1, cryptoLoanAmount: 1 })
                    .then(async (userWalletBorrowCoin) => {
                        let oldAmount = userWalletBorrowCoin.cryptoLoanAmount;
                        if (userWalletBorrowCoin) {
                            let newAmount = userWalletBorrowCoin.amount - orderData.due_detail[0].due_paid_amount //** using crypto loan balance updation in new amount */
                            // userWalletBorrowCoin.cryptoLoanAmount = (userWalletBorrowCoin.cryptoLoanAmount - orderData.due_detail[0].due_paid_amount);
                            userWalletBorrowCoin.amount = (userWalletBorrowCoin.amount - orderData.due_detail[0].due_paid_amount);
                            userWalletBorrowCoin.cryptoLoanHold = ((percentageOrder == 100) ? 0.00000000 : userWalletBorrowCoin.cryptoLoanHold)
                            Object.assign(userWalletBorrowCoin);
                            await userWalletBorrowCoin.save()
                            // .then(async() => {
                            // }).catch((err) => console.log(err));
                            await common.cryptoLoanBorrowBalance(userId, borrowCurrencyId, newAmount, oldAmount, orderRepayDetails._id, 'Crypto loan repaid accuring interest borrow coin');
                        }
                    }).catch((err) => console.log(err))
            );
            if (orderRepayDetails) {
                orderRepayDetails.repaymentAmount = (parseFloat(orderRepayDetails.repaymentAmount) + parseFloat(orderData.repaymentAmount));
                orderRepayDetails.due_detail.push(orderData.due_detail[0]);
                Object.assign(orderRepayDetails);
                await orderRepayDetails.save();
            }
            if (repayData) {
                repayAmtSub = repayData.remainingPrinciple - orderData.due_detail[0].due_paid_amount;
    
                // debtRepayAmt = repayData.debtLoanableAmount - orderData.due_detail[0].due_paid_amount;
                repayData.collateralAmount = (percentageOrder == 100) ? 0.00000000 : repayData.collateralAmount;
                repayData.remainingPrinciple = (repayAmtSub == 0) ? 0.00000000 : repayAmtSub;
                // repayData.hourlyInterestRate = 
                // repayData.debtLoanableAmount = (percentageOrder == 100) ? 0.00000000 : debtRepayAmt;
                repayData.yearlyInterestRate = (percentageOrder == 100) ? 0 : repayData.yearlyInterestRate;
                repayData.loanStatus = (percentageOrder == 100) ? 1 : 0;
                repayData.RepaidDate = new Date();
                Object.assign(repayData);
                await repayData.save();
                await common.loanActivityLogs(userId, " ", " ", orderRepayDetails._id, 'Crypto Loan Repaid', `Crypto loan due amount ${parseFloat(orderData.due_detail[0].due_paid_amount).toFixed(6)} is repaid`);
                return repayData;
            }
            repayProcessing = false;
            return { data: orderRepayDetails, message: messageUtils.REPAYMENT_SUCCESS };
    
            // Object.assign(repayData, orderData);
            // await repayData.save();
            // return { data: repayData, message: messageUtils.REPAYMENT_SUCCESS };
    
        }
    } else {
        setTimeout(_intervalFunc, 5000, orderData.userId.toString());
        // return { status: false, message: "Please wait for 5 seconds before placing another request!" }
        throw new Error(messageUtils.SET_TIME_INTERVAL);
    }
};
let oArray = [];
const  _intervalFunc = (orderwith) => {
    orderwith = orderwith.toString();
    var index = oArray.indexOf(orderwith);
    if (index > -1) {
        oArray.splice(index, 1);
    }
}
module.exports = {
    borrowedCreateServices,
    loanBorrowServices,
    getSingleLoanServices,
    getLoanAndUserWalletServices,
    cryptoRepayServices,
    loanRepaiedHistoryServices
}