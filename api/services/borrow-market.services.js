const messageUtils = require("../helpers/messageUtils");
const BorrowMarket = require("../model/BorrowMarket.model");
const getJSON = require('get-json');
const Currency = require("../model/Currency");
const collateralConfigModel = require("../model/collateral-config.model");
const loanConfigModel = require("../model/loan-config.model");
const Pairs = require("../model/Pairs");
const UserWallet = require("../model/UserWallet");
const queryHelper = require("../helpers/query");
const isCoinTaken = async (coin) => {
    const verifyCoin = await BorrowMarket.findOne({ coin });
    return !!verifyCoin
};

/**
 * @description create a new coin borrow market
 * @param {Object} userBody
 * @returns {Promise<UserIdoForm>}
 */
const createBorrowMarketServices = async (userBody) => {
    const { coin } = userBody;
    if (await isCoinTaken(coin)) {
        throw new Error(messageUtils.ALREADY_COIN)
    }
    const coinData = await BorrowMarket.create(userBody);
    return { data: coinData, message: messageUtils.COIN_CREATE_SUCCESSFULL }
};

/**
 * @description Get all borrow market details
 * @param {empty} 
 * @returns {Promise<User>} ArrayOfObject
 */
// const getAllServices = async (queryLimit) => {
//     const { page, limit, query } = queryLimit
//     const borrowData = await BorrowMarket.aggregate([
//         {
//             $lookup: {
//                 from: 'Currency',
//                 let: { coinName: '$coin' },
//                 pipeline: [
//                     {
//                         $match: {
//                             $expr: { $cond: [{ $eq: ['$currencySymbol', '$$coinName'] }, { $ne: ['$currencySymbol', []] }, false] }
//                         }
//                     },
//                     { $project: { image: true, currencyId: 1, currencyName: 1, currencySymbol: 1, apiid: 1, } }
//                 ],
//                 as: 'currencies'
//             }
//         },
//         { $unwind: '$currencies' },
//         {
//             $project: {
//                 coin: 1,
//                 marketCap: 1,
//                 flexibleRate: 1,
//                 sevenDaysFixedRate: 1,
//                 thirtyDaysFixedRate: 1,
//                 "currencyDetails": "$currencies"
//             }
//         }
//     ])
//     return borrowData
// };

const getAllServices = async (queryLimit) => {
    const { page, limit, query } = queryLimit
    const borrowData = await loanConfigModel.aggregate([
        {
            $lookup: {
                from: 'borrowMarket',
                let: { coinName: '$coin' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: ['$coin', '$$coinName']
                            }
                        }
                    },
                    {
                        $project: {
                            coin: 1,
                            marketCap: 1,
                            // flexibleRate: 1,
                            sevenDaysFixedRate: 1,
                            fourteenDaysFixedRate: 1,
                            thirtyDaysFixedRate: 1,
                        }
                    }
                ],
                as: 'borrowCoinDetails'
            }
        },
        { $unwind: '$borrowCoinDetails' },
        {
            $lookup: {
                from: 'Currency',
                let: { coinName: '$coin' },
                pipeline: [
                    {
                        $match: {
                            $expr: { $cond: [{ $eq: ['$currencySymbol', '$$coinName'] }, { $ne: ['$currencySymbol', []] }, false] }
                        }
                    },
                    { $project: { image: true, currencyId: 1, currencyName: 1, currencySymbol: 1, USDvalue: 1, apiid: 1, } }
                ],
                as: 'currencies'
            }
        },
        { $unwind: '$currencies' },
        {
            $project: {
                "borrowCoinDetails": "$borrowCoinDetails",
                "currencyDetails": "$currencies"
            }
        }
    ])
    return borrowData
};

const getCollateralCoinServices = async () => {
    const coins = await collateralConfigModel.aggregate([
        { $match: { isMortgageable: true } },
        {
            $lookup: {
                from: 'Currency',
                let: { coinSymbol: '$coin' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $cond: [{ $eq: ['$currencySymbol', '$$coinSymbol'] },
                                { $ne: ['$currencySymbol', []] }, false]
                            }
                        }
                    },
                    { $project: { image: true, currencyId: 1, currencyName: 1, currencySymbol: 1, apiid: 1, USDvalue: 1, _id: 0 } }
                ],
                as: 'currencies'
            }
        },
        // { $unwind: '$currencies' },
        {
            $project: {
                // coin: 1,
                // "currencyDetails": "$currencies"
                __v: 0, createdAt: 0, updatedAt: 0,
            }
        }
    ]);
    return coins
}
/**
* @description Get SinglePackage by borrowId
* @param {ObjectId<string} borrowId
* @returns {Promise<User>}
*/
const getSingleServices = async (borrowId) => {
    const borrowData = await BorrowMarket.findById({ _id: borrowId });
    return borrowData
};

const coingecko = async (coinQuery) => {
    const { ids, vs_currencies } = coinQuery
    const USD_Data = await getJSON(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vs_currencies}`);
    return USD_Data
}
const getBorrowDetails = async (coinQuery, coinBody) => {
    const { ids, vs_currencies } = coinBody;
    // var USD_Value = null;
    // if (ids == 'Fibit' || ids == '') {
    //     USD_Value = null
    // } else {
    //     USD_Value = await coingecko(coinBody);
    // }

    if (ids) {
        const userData = await queryHelper.findoneData(Currency,
            { apiid: { $regex: ids, $options: 'i' } },
            // { apiid: ids },
            { image: true, currencyId: 1, currencyName: 1, currencySymbol: 1, apiid: 1, _id: 0, USDvalue: 1 });
        const collateral = await queryHelper.findoneData(collateralConfigModel, 
            { coin: userData.msg.currencySymbol, isMortgageable: true },
            { __v: 0, createdAt: 0, updatedAt: 0 })
        return { data: { userData: userData.msg, collateral: collateral.msg } };
    }

};

/**
* @description Get SinglePackage by pairs name
* @param {ObjectId<string} userId and currencyId
* @returns {Promise<User>}
*/

const getUserWalletServices = async (userId, currencyId) => {
    const userWallet = await UserWallet.findOne(
        { userId: userId, currencyId: currencyId },
        { amount: 1, _id: 1, userId: 1, currencyId: 1, cryptoLoanHold: 1, cryptoLoanAmount: 1 });
    return userWallet;
}

const getPairServices = async (pairsBody) => {
    const { userId, currencyId } = pairsBody;
    const pair = await getUserWalletServices(userId, currencyId);
    return pair;
};

// const createCryptoLoanServices = async (userQuery, userBody) => {
//     const { cryptoLoanHold, crypto_loan_Borrow_amt } = userBody;
//     // const getUserWallet = [], getUserWalletBorrow = [];

//     if (cryptoLoanHold) {
//         const { userId, currencyId } = userQuery;
//         const cryptoLoan = await getAllUserWalletServices(userId, currencyId);
//         const getUserWallet = await UserWallet.findById({ _id: cryptoLoan._id });
//         cryptoLoan.cryptoLoanAmount = ((cryptoLoan.amount) - cryptoLoanHold);
//         cryptoLoan.cryptoLoanHold = cryptoLoanHold;
//         Object.assign(getUserWallet, cryptoLoan);
//         await getUserWallet.save();
//         return { message: messageUtils.CRYPTO_LOAN_UPDATED }
//         // return { data: getUserWallet, message: messageUtils.CRYPTO_LOAN_UPDATED };
//     }
//     if (crypto_loan_Borrow_amt) {
//         console.log("crypto_loan_Borrow_amt=========", crypto_loan_Borrow_amt);
//         const { userId, currencyId } = userQuery;
//         const cryptoLoan = await getUserWalletServices(userId, currencyId);
//         const getUserWalletBorrow = await UserWallet.findById({ _id: cryptoLoan._id })
//         cryptoLoan.cryptoLoanAmount = ((cryptoLoan.amount) + crypto_loan_Borrow_amt);
//         cryptoLoan.cryptoLoanHold = crypto_loan_Borrow_amt;
//         Object.assign(getUserWalletBorrow, cryptoLoan);
//         await getUserWalletBorrow.save();
//         return { data: getUserWalletBorrow, message: messageUtils.CRYPTO_LOAN_UPDATED };
//     }

// }

/**
 * @description create a new crypto loan in borrow market
 * @param {Object} userBody
 * @returns {Promise<UserIdoForm>}
 */
const createCryptoLoanServices = async (userQuery, userBody) => {
    const { cryptoLoanHold } = userBody;
    const { userId, currencyId } = userQuery;
    const cryptoLoan = await getUserWalletServices(userId, currencyId);
    const getUserWallet = await UserWallet.findById({ _id: cryptoLoan._id });
    cryptoLoan.cryptoLoanAmount = ((cryptoLoan.amount) - cryptoLoanHold);
    cryptoLoan.cryptoLoanHold = cryptoLoanHold;
    Object.assign(getUserWallet, cryptoLoan);
    await getUserWallet.save();
    return { data: getUserWallet, message: messageUtils.CRYPTO_LOAN_UPDATED };
};

/**
 * @description create a new crypto loan USDT in borrow market
 * @param {Object} userBody
 * @returns {Promise<UserIdoForm>}
 */
const createCryptoLoanUSDTServices = async (userQuery, userBody) => {
    const { cryptoLoanHold, crypto_loan_Borrow_amt } = userBody;
    const { userId, currencyId } = userQuery;
    const cryptoLoan = await getUserWalletServices(userId, currencyId);
    cryptoLoan.cryptoLoanAmount = ((cryptoLoan.amount) + crypto_loan_Borrow_amt);
    cryptoLoan.cryptoLoanHold = cryptoLoanHold;
    const getUserWalletBorrow = await UserWallet.findById({ _id: cryptoLoan._id });
    Object.assign(getUserWalletBorrow, cryptoLoan);
    await getUserWalletBorrow.save();
    return { data: getUserWalletBorrow, message: messageUtils.CRYPTO_LOAN_UPDATED };

};

module.exports = {
    createBorrowMarketServices,
    getAllServices,
    getSingleServices,
    getBorrowDetails,
    getCollateralCoinServices,
    createCryptoLoanServices,
    getPairServices,
    createCryptoLoanUSDTServices
}