const express = require('express');
const CoinConfigController = require("../controllers/coin-config.controller");
const commonHelper = require("../helpers/common");
const router = express.Router();

router.route('/loan/create').post(commonHelper.tokenMiddlewareCustomers, CoinConfigController.createLoanConfig);
router.route('/collateral/create').post(commonHelper.tokenMiddlewareCustomers, CoinConfigController.createCollateralConfig);
router.route('/collateral/:coinId').get(commonHelper.tokenMiddlewareCustomers, CoinConfigController.getSingleCollateralCoin);
router.route('/collateral/:coinId').patch(commonHelper.tokenMiddlewareCustomers, CoinConfigController.updatecollateralCoin);
router.route('/loan/:coinId').get(commonHelper.tokenMiddlewareCustomers, CoinConfigController.getSinlgeLoanConfig);
router.route('/loan/:coinId').patch(commonHelper.tokenMiddlewareCustomers, CoinConfigController.updateLoanConfig);
module.exports = router;