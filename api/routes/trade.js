const express = require('express');
const router = express.Router();
const tradeController = require('../controllers/tradeController');
const commonHelper = require('../helpers/common');
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
    windowMs: 5 * 1000,
    max: 1,
    message: { status: false, Msg: "Too many requests created from this IP, please try again after an 5 seconds"},
    statusCode: 200
});
router.get('/getMarketsMismatched', tradeController.getMarketsMismatched);
router.get('/getMarkets', tradeController.getMarkets);
router.post('/getMarkets', tradeController.getMarkets);
router.get('/getMarketsTab', tradeController.getMarketsTab);
router.get('/getHomeMarkets', tradeController.getHomeMarketsList);
router.post('/getHomeMarkets', tradeController.getHomeMarkets);
router.post('/getHomeTopMarkets', tradeController.getHomeTopMarkets);
router.get('/chart/:config', tradeController.chart);
router.get('/markets', tradeController.markets);
router.get('/chartData', tradeController.chartData);
router.get('/historyChart', tradeController.historyChart);
router.get('/tradeChart', tradeController.tradeChart);
router.post('/checkPair', tradeController.checkPair);
router.post('/market/data', tradeController.exchangeMarketData);
router.post('/getTradeHistory', tradeController.getTradeHistory);
router.post('/getOrderHistory', tradeController.getOrderHistory);
router.post('/getOrderTradeTDSHistory', tradeController.getOrderTradeTDSHistory);
router.get('/getOldOhlcData', tradeController.getOldOhlcData);
router.post('/market_data/candles', tradeController.marketData);
router.get('/getOrderWiseAmount', tradeController.getOrderWiseAmount);
router.post('/cancelOrder', limiter, commonHelper.tokenMiddlewareCustomers, tradeController.cancelOrder);
module.exports = router;