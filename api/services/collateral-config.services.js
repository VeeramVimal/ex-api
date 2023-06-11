const messageUtils = require("../helpers/messageUtils");
const CollateralConfig = require("../model/collateral-config.model");

/**
 * @description create a new collateral config 
 * @param {Object} collateralBody
 * @returns {Promise<UserIdoForm>}
 */
const isCoinTaken = async (coin) => {
    const verifyCoin = await CollateralConfig.findOne({ coin });
    return !!verifyCoin
};

const createCollateralServices = async (collateralBody) => {
    const { coin } = collateralBody;
    if (await isCoinTaken(coin)) {
        throw new Error(messageUtils.ALREADY_COIN)
    }
    const collateral = await CollateralConfig.create(collateralBody);
    return { data: collateral, message: messageUtils.COLLATERAL_CONFIG_CREATE};
};

/**
 * @description Get all borrow market details
 * @param {empty} 
 * @returns {Promise<User>} ArrayOfObject
 */
const getCollateralCoinServices = async () => {
    const coins = await CollateralConfig.aggregate([
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
                __v: 0, createdAt: 0, updatedAt: 0,
                // "currencyDetails": "$currencies"
            }
        }
    ]);
    return coins
};

/**
* @description Get SinglePackage by collateralCoinId
* @param {ObjectId<string} collateralCoinId
* @returns {Promise<User>}
*/
const getSingleCollateralCoinServices = async(collateralCoinId) => {
    const collateralData = await CollateralConfig.findById({ _id: collateralCoinId }, { __v: 0, createdAt: 0, updatedAt: 0 });
    return collateralData;
};

/**
 * @description update collateralCoin data used in collateralCoinId
 * @param {ObjectId<string>} collateralCoinId
 * @param {Object} updateCollateralBody
 * @returns {Promise<User>}
 */
const updateCollateralCoinServices = async (collateralCoinId, updateCollateralBody) => {
    const collateralData = await getSingleCollateralCoinServices(collateralCoinId);
    if(!collateralData) throw new Error(messageUtils.COLLATERAL_NOT_FOUND);
    Object.assign(collateralData, updateCollateralBody);
    await collateralData.save().then(async (collateral) => {
        if(collateral.coin == 'BTC'){
            const coin = collateral.coin;
            const collateralCoin = await CollateralConfig.findOne({ coin: { $regex: coin, $options: 'i' } });
            if (collateralCoin) {
                await LoanConfig.find({}).then((loan_config) => {
                    loan_config.filter(async (loanData) => {
                        let loanCoin = loanData.coin;
                        let sevenInt, fourteenInt, thirtyInt, sevenIntHr, fourteenIntHr, thirtyIntHr;
                        let sevenInterest, fourteenInterest, thirtyInterest;
                        await BorrowMarket.findOne({ coin: { $regex: loanCoin, $options: 'i' } })
                            .then(async (borrow_config) => {
                                if (borrow_config) {
                                    sevenInt =collateralCoin.sevenDaysFixedInterest;
                                    fourteenInt = collateralCoin.fourteenDaysFixedInterest;
                                    thirtyInt = collateralCoin.thirtyDaysFixedInterest;
                                    sevenIntHr = sevenInt / (365 * 24);
                                    fourteenIntHr = fourteenInt / (365 * 24);
                                    thirtyIntHr = thirtyInt / (365 * 24);
                                    sevenInterest = sevenIntHr * 24 * 7;
                                    fourteenInterest = fourteenIntHr * 24 * 14;
                                    thirtyInterest = thirtyIntHr * 24 * 30;
                                    borrow_config.sevenDaysFixedRate.annuallyRate = parseFloat(sevenInterest).toFixed(8);
                                    borrow_config.sevenDaysFixedRate.hourlyRate = parseFloat(sevenIntHr).toFixed(8);
                                    borrow_config.fourteenDaysFixedRate.annuallyRate = parseFloat(fourteenInterest).toFixed(8);
                                    borrow_config.fourteenDaysFixedRate.hourlyRate = parseFloat(fourteenIntHr).toFixed(8);
                                    borrow_config.thirtyDaysFixedRate.annuallyRate = parseFloat(thirtyInterest).toFixed(8);
                                    borrow_config.thirtyDaysFixedRate.hourlyRate = parseFloat(thirtyIntHr).toFixed(8);
                                    Object.assign(borrow_config);
                                    await borrow_config.save();
                                }
                            })
                            .catch((err) => err);
                    })
                }).catch((err) => err);
            }
        }
    })
    .catch((err) => console.log(err))
    return { data: collateralData, message: messageUtils.COLLATERAL_UPDATE_SUCCESS};
};

module.exports = {
    createCollateralServices,
    getCollateralCoinServices,
    getSingleCollateralCoinServices,
    updateCollateralCoinServices
}