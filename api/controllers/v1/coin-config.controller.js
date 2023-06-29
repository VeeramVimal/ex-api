const { successResponse, errorResponse} = require("../../helpers/response");
const coinConfigServices = require("../../services/coin-config.services");

//** create loan config */
const createLoanConfig = async (req, res) => {
    try {
        const loanConfig = await coinConfigServices.loanCreateServices(req.body);
        return successResponse(req, res, loanConfig.data, loanConfig.message);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

//** single loan config */
const getSinlgeLoanConfig = async (req, res) => {
    try {
        const loanconfig = await coinConfigServices.getOneLoanServices(req.params.coinId);
        return successResponse(req, res, loanconfig);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
} 

//** loan config update */
const updateLoanConfig = async (req, res) => {
    try {
        const loanConfig = await coinConfigServices.UpdateLoanServices(req.params.coinId, req.body);
        return successResponse(req, res, loanConfig.data, loanConfig.message)
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}
//** create collateral config */
const createCollateralConfig = async (req, res) => {
    try {
        const collateralConfig = await coinConfigServices.collateralCreateServices(req.body);
        return successResponse(req, res, collateralConfig.data, collateralConfig.message)
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}

// single collateralCoin details
const getSingleCollateralCoin = async (req, res) => {
    try {
        const collateralCoin = await coinConfigServices.getOneCollateralServices(req.params.coinId);
        return successResponse(req, res, collateralCoin)
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}

//** update collateralCoin */
const updatecollateralCoin = async (req, res) => {
    try {
        const collateral = await coinConfigServices.UpdateCollateralServices(req.params.coinId, req.body)
        return successResponse(req, res, collateral.data, collateral.message)
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}
module.exports = {
    createLoanConfig,
    createCollateralConfig,
    getSingleCollateralCoin,
    updatecollateralCoin,
    getSinlgeLoanConfig,
    updateLoanConfig
}