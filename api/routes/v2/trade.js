const express = require('express');
const router = express.Router();
const tradeControllerV2 = require('../../controllers/v2/tradeController');
const commonHelper = require('../../helpers/common');

// router.get('/profit/list', commonHelper.tokenMiddlewareCustomers, tradeControllerV2.getProfitList);
router.post('/profit/list', commonHelper.tokenMiddlewareCustomers, tradeControllerV2.getProfitList);

// new v2
router.post('/getOrderDetail', commonHelper.tokenMiddlewareCustomers, tradeControllerV2.getOrderDetail);

module.exports = router;