const express = require('express');
const loanBorrowController = require("../../controllers/v1/loan-borrowed.controller");
const commonHelper = require("../../helpers/common");
const router = express.Router();

router.route('/borrow/create').post(commonHelper.tokenMiddlewareCustomers, loanBorrowController.BorrowLoanCreated);
router.route('/borrow/history').get(loanBorrowController.BorrowLoanHistory);
router.route('/:orderId').get(loanBorrowController.singleCryptoLoan);
router.route('/repayment').post(commonHelper.tokenMiddlewareCustomers, loanBorrowController.cryptoLoanRepay);
router.route('/repaid/history').post(commonHelper.tokenMiddlewareCustomers, loanBorrowController.loanRepaiedHistory);
module.exports = router;