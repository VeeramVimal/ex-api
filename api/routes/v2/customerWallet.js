const express = require('express');
const router = express.Router();
const customerWalletControllerV2 = require('../../controllers/v2/customerWalletController');
const commonHelper = require('../../helpers/common');

router.get('/getWalletCurrency', commonHelper.tokenMiddlewareCustomers, customerWalletControllerV2.getWalletCurrency);
router.get('/getSpotHoldings', commonHelper.tokenMiddlewareCustomers, customerWalletControllerV2.getSpotHoldings);

module.exports = router;