const { successResponse, errorResponse} = require("../../helpers/response");
const collateralServices = require("../../services/collateral-config.services");

//** create collateral config */
const createCollateral = async (req, res) => {
    console.log("asdfghjkl");
    try {
        const collateral = await collateralServices.createCollateralServices(req.body);
        return successResponse(req, res, collateral.data, collateral.message)
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
};

//** get all collateral coins */
const getCollateralCoin = async (req, res) => {
    try {
        const CollateralCoins = await collateralServices.getCollateralCoinServices();
        return successResponse(req, res, CollateralCoins)
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}

//** single collateral coin detail */
const singleCollateral = async (req, res) => {
    try {
        const collateral = await collateralServices.getSingleCollateralCoinServices(req.params.collateralCoinId);
        return successResponse(req, res, collateral);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

//** update collateral coin */
const updateCollateralCoin = async (req, res) => {
    try {
        const collateral = await collateralServices.updateCollateralCoinServices(req.params.collateralCoinId, req.body);
        return successResponse(req, res, collateral.data, collateral.message);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}
module.exports = {
    createCollateral,
    getCollateralCoin,
    singleCollateral,
    updateCollateralCoin
}