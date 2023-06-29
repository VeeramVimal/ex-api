const { successResponse, errorResponse } = require("../../helpers/response");
const borrowMarketservices = require("../../services/borrow-market.services");
const BorrowMarket = require("../../model/BorrowMarket.model");
const createBorrowCoin = async (req, res) => {
    try {
        const borrowMarket = await borrowMarketservices.createBorrowMarketServices(req.body);
        return successResponse(req, res, borrowMarket.data, borrowMarket.message)
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

//** get all Borrow Market details */
const getAllBorrowMarket = async (req, res) => {
    try {
        var page = parseInt(req.query.page) || 0; //for next page pass 1 here
        var limit = parseInt(req.query.limit) || 0;
        var query = {}
        var queryLimit = {
            page, limit, query
        };
        const borrowMarket = await borrowMarketservices.getAllServices(queryLimit)
        return successResponse(req, res, borrowMarket)
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

//** get a single details */
const getSingleBorrowMarket = async (req, res) => {
    try {
        const Borrow = await borrowMarketservices.getSingleServices(req.params.borrowId);
        return successResponse(req, res, Borrow)
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

const getCollateralCoin = async (req, res) => {
    try {
        const CollateralCoins = await borrowMarketservices.getCollateralCoinServices();
        return successResponse(req, res, CollateralCoins)
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}

//** get the borrow interest details in user and balance */
const getBorrowingDetails = async (req, res) => {
    try {
        const user = await borrowMarketservices.getBorrowDetails(req.query, req.body);
        return successResponse(req, res, user.data)
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};
const getPairsSingledetail = async (req, res) => {
    try {
        const pairs = await borrowMarketservices.getPairServices(req.body);
        return successResponse(req, res, pairs)
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}

//** create new crypto loan */
const createCryptoLoan = async (req, res) => {
    try {
        const cryptoLoan = await borrowMarketservices.createCryptoLoanServices(req.query, req.body);
        return successResponse(req, res, cryptoLoan.data, cryptoLoan.message);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}

const createCryptoLoanUsdt = async (req, res) => {
    try {
        const cryptoLoan = await borrowMarketservices.createCryptoLoanUSDTServices(req.query, req.body);
        return successResponse(req, res, cryptoLoan.data, cryptoLoan.message);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}
module.exports = {
    createBorrowCoin,
    getAllBorrowMarket,
    getSingleBorrowMarket,
    getBorrowingDetails,
    getCollateralCoin,
    getPairsSingledetail,
    createCryptoLoan,
    createCryptoLoanUsdt
}