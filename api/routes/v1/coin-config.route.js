const express = require('express');
const CoinConfigController = require("../../controllers/v1/coin-config.controller");
const commonHelper = require("../../helpers/common");
const router = express.Router();

router.route('/loan/create').post(commonHelper.tokenMiddlewareAdmin, CoinConfigController.createLoanConfig);
router.route('/collateral/create').post(commonHelper.tokenMiddlewareAdmin, CoinConfigController.createCollateralConfig);
router.route('/collateral/:coinId').get(commonHelper.tokenMiddlewareAdmin, CoinConfigController.getSingleCollateralCoin);
router.route('/collateral/:coinId').patch(commonHelper.tokenMiddlewareAdmin, CoinConfigController.updatecollateralCoin);
router.route('/loan/:coinId').get(commonHelper.tokenMiddlewareAdmin, CoinConfigController.getSinlgeLoanConfig);
router.route('/loan/:coinId').patch(commonHelper.tokenMiddlewareAdmin, CoinConfigController.updateLoanConfig);
module.exports = router;