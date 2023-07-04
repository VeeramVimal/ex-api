const express = require('express');
const loanConfigController = require("../../controllers/v1/collateral-config.controller");
const commonHelper = require("../../helpers/common");

const router = express.Router();

router.route('/create').post(commonHelper.tokenMiddlewareAdmin, loanConfigController.createCollateral);
router.route('/coins').get(commonHelper.tokenMiddlewareAdmin, loanConfigController.getCollateralCoin);
router.route('/:collateralCoinId').get(commonHelper.tokenMiddlewareAdmin, loanConfigController.singleCollateral);;
router.route('/:collateralCoinId').patch(commonHelper.tokenMiddlewareAdmin, loanConfigController.updateCollateralCoin);
module.exports = router;