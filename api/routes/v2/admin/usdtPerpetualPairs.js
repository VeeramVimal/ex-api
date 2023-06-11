const express = require('express');
const router = express.Router();
const usdmController = require('../../../controllers/v2/admin/usdtPerpetualPairsController')
const commonHelper = require('../../../helpers/common');

router.get('/getPairs', commonHelper.tokenMiddlewareAdmin, usdmController.getPairs);
router.post('/getPairsfilter', commonHelper.tokenMiddlewareAdmin, usdmController.getPairsfilter);
router.post('/addPairs',  commonHelper.tokenMiddlewareAdmin, usdmController.addPairs);
router.post('/updatePairs', commonHelper.tokenMiddlewareAdmin, usdmController.updatePairs);
router.post('/popularPair', commonHelper.tokenMiddlewareAdmin, usdmController.popularPair);
router.post('/getPositionHistory', commonHelper.tokenMiddlewareAdmin, usdmController.getPositionHistory);
router.post('/getUSDMPositionsDetails', commonHelper.tokenMiddlewareAdmin, usdmController.getUSDMPositionsDetails);
router.post('/getTradeHistory', commonHelper.tokenMiddlewareAdmin, usdmController.getTradeHistory);
router.post('/getUSDMOpenOrders', commonHelper.tokenMiddlewareAdmin, usdmController.getUSDMOpenOrders);
router.post('/getUSDMOrdersHistory', commonHelper.tokenMiddlewareAdmin, usdmController.getUSDMOrdersHistory);


module.exports = router;