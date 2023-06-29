const express = require('express');
const router = express.Router();
const tradecompetionController = require('../../controllers/v1/tradecompetionController');
const commonHelper = require('../../helpers/common');
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
    windowMs: 5 * 1000,
    max: 1,
    message: { status: false, Msg: "Too many requests created from this IP, please try again after an 5 seconds"},
    statusCode: 200
});

router.get('/getcurrencypair',tradecompetionController.getcurrencypair);
router.post('/removewinnerid',commonHelper.tokenMiddlewareAdmin,tradecompetionController.removewinnerid);
router.post('/getwinnerbyid',tradecompetionController.getwinnerbyid);
router.post('/editwinnerlist',tradecompetionController.editwinnerlist);
router.post('/findonecurrencypair',tradecompetionController.findonecurrencypair);
router.post('/updatecurrencypair',commonHelper.tokenMiddlewareAdmin,tradecompetionController.updatecurrencypair);
router.post('/newcompetitionadd',commonHelper.tokenMiddlewareAdmin,tradecompetionController.newcompetitionadd);
router.post('/competionpairdelete',commonHelper.tokenMiddlewareAdmin,tradecompetionController.competionpairdelete);
router.post('/addwinnerlist',tradecompetionController.addwinnerlist);
router.post('/getwinnerlist',tradecompetionController.getwinnerlist);

router.get('/getcurrencycompetion',tradecompetionController.getcurrencycompetion);
router.post('/getcurrencycompdash',tradecompetionController.getcurrencycompdash);
router.get('/gettotalvolume',tradecompetionController.gettotalvolume);
router.post('/gettotaltradesperpair',tradecompetionController.gettotaltradesperpair);
router.get('/getcmstandc',tradecompetionController.getcmstandc);
router.get("/currencypairlist", tradecompetionController.getAllPair);
router.get("/currencylist", tradecompetionController.getAllCurrency);

router.post('/gettotalvolumeemail',tradecompetionController.gettotalvolumeemail);
router.get('/gettotaluservolumeemail',tradecompetionController.gettotaluservolumeemail)
router.post('/winnersendtoken',commonHelper.tokenMiddlewareAdmin,tradecompetionController.winnersendtoken);
router.get('/getpairslist',tradecompetionController.getpairs);
router.get('/getcompetitiontransaction',tradecompetionController.getcompetitiontransaction);

module.exports = router;