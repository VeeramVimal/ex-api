const express = require('express');
const router = express.Router();
const transactionsController = require('../../controllers/v1/transactionsController');
const commonHelper = require('../../helpers/common');
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
    windowMs: 5 * 1000,
    max: 1,
    message: { status: false, message: "Too many requests created from this IP, please try again after an 5 seconds"},
    statusCode: 200
});
router.post('/getTransactions', commonHelper.tokenMiddlewareAdmin, transactionsController.getTransactions);
router.post('/getTransactionsDetails', commonHelper.tokenMiddlewareAdmin, transactionsController.getTransactionsDetails);
router.post('/getUserTransactionsDetails', commonHelper.tokenMiddlewareAdmin, transactionsController.getUserTransactionsDetails);
router.post('/updateTransactions', limiter, commonHelper.tokenMiddlewareAdmin, transactionsController.updateTransactions);
router.post('/adminTrxnVerification', limiter, commonHelper.tokenMiddlewareAdmin, transactionsController.adminTrxnVerification);
module.exports = router;