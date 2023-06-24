const express = require('express');
const router = express.Router();
const customerWalletController = require('../../controllers/v1/customerWalletController');
const commonHelper = require('../../helpers/common');
const rateLimit = require("express-rate-limit");

const limiter1 = rateLimit({
    windowMs: 5 * 1000,
    max: 1,
    message: { status: false, message: "Too many requests created from this IP, please try again after an 5 seconds"},
    statusCode: 200
});
const limiter2 = rateLimit({
    windowMs: 5 * 1000,
    max: 1,
    message: { status: false, msg: "Too many requests created from this IP, please try again after an 5 seconds"},
    statusCode: 200
});
const limiter3 = rateLimit({
    windowMs: 5 * 1000,
    max: 1,
    message: { status: false, data: "Too many requests created from this IP, please try again after an 5 seconds"},
    statusCode: 200
});
const limiter4 = rateLimit({
    windowMs: 5 * 1000,
    max: 1,
    message: { status: false, errMsg: "Too many requests created from this IP, please try again after an 5 seconds"},
    statusCode: 200
});
const limiter5 = rateLimit({
    windowMs: 5 * 1000,
    max: 1,
    message: { status: false, message: "Too many requests created from this IP, please try again after an 5 seconds"},
    statusCode: 200
});
const limiter6 = rateLimit({
    windowMs: 5 * 1000,
    max: 1,
    message: { status: false, message: "Too many requests created from this IP, please try again after an 5 seconds"},
    statusCode: 200
});
router.post('/createAddress', commonHelper.tokenMiddlewareCustomers, customerWalletController.createAddress);
router.post('/getParticularCurrency', commonHelper.tokenMiddlewareCustomers, customerWalletController.getParticularCurrency);
router.get('/getWithdrawCurrency', customerWalletController.getWithdrawCurrency);
router.post('/submitWithdraw', limiter5, commonHelper.tokenMiddlewareCustomers, customerWalletController.submitWithdraw);
router.post('/submitTransfer', limiter6, commonHelper.tokenMiddlewareCustomers, customerWalletController.submitTransfer);
router.post('/submitStaking', limiter5, commonHelper.tokenMiddlewareCustomers, customerWalletController.submitStaking);
router.post('/depositFiat', commonHelper.tokenMiddlewareCustomers, customerWalletController.depositFiat);
router.get('/getWalletCurrency', commonHelper.tokenMiddlewareCustomers, customerWalletController.getWalletCurrency);
router.get('/getHistory', commonHelper.tokenMiddlewareCustomers, customerWalletController.getHistory);
router.post('/getHistoryWithFilter', commonHelper.tokenMiddlewareCustomers, customerWalletController.getHistoryWithFilter);
router.post('/getHistory', commonHelper.tokenMiddlewareCustomers, customerWalletController.getPostHistory);
router.post('/getCurrencyBalance', commonHelper.tokenMiddlewareCustomers, customerWalletController.getCurrencyBalance);
router.get('/getCurrency', limiter1, customerWalletController.getCurrency);
router.get('/depositETHTRX', limiter2, commonHelper.tokenMiddlewareCustomers, customerWalletController.depositETHTRX);
router.get('/userDepositETHTRX', limiter2, customerWalletController.userDepositETHTRX);
router.get('/listAddress', customerWalletController.listAddress);
router.get('/getAddressBalance', customerWalletController.getAddressBalance);
router.get('/GetInfo', customerWalletController.GetInfo);

router.post('/CreateAdminAddress', customerWalletController.CreateAdminAddress);
router.post('/depositBNB', limiter2, commonHelper.tokenMiddlewareCustomers, customerWalletController.depositBNB);
router.get('/getactiveCoinStatus', limiter1, customerWalletController.getactiveCoinStatus);

module.exports = router;