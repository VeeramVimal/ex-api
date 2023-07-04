const messageUtils = require("../helpers/messageUtils");
const CollateralConfig = require("../model/collateral-config.model");
const LoanConfig = require("../model/loan-config.model");

/**
 * @description create a new loan config 
 * @param {Object} coinBody
 * @returns {Promise<UserIdoForm>}
 */
const isLoanCoinTaken = async (coin) => {
    const checkCoin = await LoanConfig.findOne({ coin });
    return !!checkCoin
};

const loanCreateServices = async (coinBody) => {
    const { coin } = coinBody;
    if(!coin) throw new Error(messageUtils.COIN_ERROR);
    if(await isLoanCoinTaken(coin)) throw new Error(messageUtils.ALREADY_COIN_SELECTED);
    const loanData  = await LoanConfig.create(coinBody);
    return {data: loanData, message: messageUtils.LOAN_CONFIG_CREATE};
};

/**
* @description Get SinglePackage by coinId
* @param {ObjectId<string} coinId
* @returns {Promise<User>}
*/
const getOneLoanServices = async (coinId) => {
    const loanConfig = await LoanConfig.findOne({ _id: coinId });
    return loanConfig;
};

/**
 * @description update loan data used by coinId
 * @param {ObjectId<string>} coinId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const UpdateLoanServices = async (coinId, updateBody) => {
    const loanData = await getOneLoanServices(coinId);
    if(!loanData) throw new Error(messageUtils.LOAN_NOT_FOUND);
    Object.assign(loanData, updateBody);
    await loanData.save();
    return {data: loanData, message: messageUtils.LOAN_UPDATE_SUCCESS}
};

/**
 * @description create a new Collateral config 
 * @param {Object} collateralBody
 * @returns {Promise<UserIdoForm>}
 */
const isCollateralCoinTaken = async (coin) => {
    const checkCoin = await CollateralConfig.findOne({ coin });
    return !!checkCoin
};

const collateralCreateServices = async (collateralBody) => {
    const { coin } = collateralBody;
    if(!coin) throw new Error(messageUtils.COIN_ERROR);
    if(await isCollateralCoinTaken(coin)) throw new Error(messageUtils.ALREADY_COIN_SELECTED)
    const collateralConfig = await CollateralConfig.create(collateralBody);
    return { data: collateralConfig, message: messageUtils.COLLATERAL_CONFIG_CREATE };
};

/**
* @description Get SinglePackage by coinId
* @param {ObjectId<string} coinId
* @returns {Promise<User>}
*/
const getOneCollateralServices = async (coinId) => {
    const collateral = await CollateralConfig.findById({ _id: coinId });
    return collateral;
};

/**
 * @description update collateral data used by coinId
 * @param {ObjectId<string>} coinId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const UpdateCollateralServices = async (coinId, updateBody) => {
    const collateralData = await getOneCollateralServices(coinId);
    if(!collateralData) throw new Error(messageUtils.COLLATERAL_NOT_FOUND);
    Object.assign(collateralData, updateBody);
    await collateralData.save();
    return { data:collateralData, message: messageUtils.COLLATERAL_UPDATE_SUCCESS }
};
/**
 * @description Get all borrow market details
 * @param {empty} 
 * @returns {Promise<User>} ArrayOfObject
 */

module.exports = {
    loanCreateServices,
    getOneCollateralServices,
    collateralCreateServices,
    UpdateCollateralServices,
    getOneLoanServices,
    UpdateLoanServices
}