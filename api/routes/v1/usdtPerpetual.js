const express = require('express');
const router = express.Router();
const usdtPerpetpualController = require('../../controllers/v1/usdtPerpetpualController');
const commonHelper = require('../../helpers/common');
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
    windowMs: 5 * 1000,
    max: 1,
    message: { status: false, Msg: "Too many requests created from this IP, please try again after an 5 seconds"},
    statusCode: 200
});

router.get('/clearAllOrder', usdtPerpetpualController.clearAllOrder);

router.post('/orderPlace', usdtPerpetpualController.orderPlace);
// router.get('/getMarkets', tradeController.getMarkets);
router.get('/getMarketsTab', usdtPerpetpualController.getMarketsTab);
// router.get('/getHomeMarkets', tradeController.getHomeMarketsList);
// router.post('/getHomeMarkets', tradeController.getHomeMarkets);
// router.get('/chart/:config', tradeController.chart);
// router.get('/markets', tradeController.markets);
// router.get('/chartData', tradeController.chartData);
// router.get('/historyChart', tradeController.historyChart);
// router.get('/tradeChart', tradeController.tradeChart);
router.post('/checkPair', usdtPerpetpualController.checkPair);
// router.post('/getTradeHistory', tradeController.getTradeHistory);
// router.post('/getOrderHistory', tradeController.getOrderHistory);
// router.post('/getOrderTradeTDSHistory', tradeController.getOrderTradeTDSHistory);
// router.get('/getOldOhlcData', tradeController.getOldOhlcData);
router.post('/market_data/candles', usdtPerpetpualController.marketData);
// router.get('/getOrderWiseAmount', tradeController.getOrderWiseAmount);
router.post('/cancelOrder', limiter, commonHelper.tokenMiddlewareCustomers, usdtPerpetpualController.cancelOrder);
module.exports = router;