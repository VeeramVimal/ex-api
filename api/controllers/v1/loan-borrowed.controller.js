const { successResponse, errorResponse } = require("../../helpers/response");
const loanBorrowedServices = require("../../services/loan-borrowed.services");

const BorrowLoanCreated = async (req, res) => {
    try {
        const BorrowedLoan = await loanBorrowedServices.borrowedCreateServices(req.body);
        return successResponse(req, res, BorrowedLoan.data, BorrowedLoan.message);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

const BorrowLoanHistory = async (req, res) => {
    try {
        const Borrow = await loanBorrowedServices.loanBorrowServices();
        return successResponse(req, res, Borrow);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

const singleCryptoLoan = async (req, res) => {
    try {
        const order = await loanBorrowedServices.getLoanAndUserWalletServices(req.params.orderId);
        return successResponse(req, res, order);
    } catch (error) {
        return errorResponse(req, res, error.message);

    }
}
const cryptoLoanRepay = async (req, res) => {
    try {
        const repay = await loanBorrowedServices.cryptoRepayServices(req.body);
        return successResponse(req, res, repay.data, repay.message);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};
const loanRepaiedHistory = async (req, res) => {
    try {
        let sort = { createdAt: -1 };
        let limit = req.body.limit ? parseInt(req.body.limit) : 2;
        let offset = req.body.offset ? parseInt(req.body.offset) : 0
        const query = {
            sort, limit, offset
        }
        const repay = await loanBorrowedServices.loanRepaiedHistoryServices(req.query, query, req.body);
        return successResponse(req, res, repay);
    } catch (error) {
        return errorResponse(req, res, error.message);

    }
}
module.exports = {
    BorrowLoanCreated,
    singleCryptoLoan,
    BorrowLoanHistory,
    cryptoLoanRepay,
    loanRepaiedHistory
}