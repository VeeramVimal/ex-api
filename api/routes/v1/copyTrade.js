const express = require('express');
const router = express.Router();
const copytradeController = require('../../controllers/v1/copyTradeController');
const commonHelper = require('../../helpers/common');
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
    windowMs: 5 * 1000,
    max: 1,
    message: { status: false, Msg: "Too many requests created from this IP, please try again after an 5 seconds"},
    statusCode: 200
});



router.post('/addLeadTrader', copytradeController.CreateLeadTrader);
router.post('/getAllLeadTrader', copytradeController.getAllTraderDetails);
router.post('/createOrder', copytradeController.createOrder);
router.post('/createCopyTraderRequest', copytradeController.createCopyTraderRequest);
router.post('/getUserBalance', copytradeController.getUserBalance);
router.post('/getAllCopyUsers', copytradeController.getAllCopyUsers);
router.post('/getCopyUserTrade', copytradeController.getCopyUserTrade);
router.post('/cancelOrder',limiter, commonHelper.tokenMiddlewareCustomers, copytradeController.cancelOrder);


module.exports = router;