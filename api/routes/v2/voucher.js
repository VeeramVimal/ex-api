const express = require('express');
const router = express.Router();
const voucherControllerV2 = require('../../controllers/v2/voucherController');
const commonHelper = require('../../helpers/common');

router.get('/get', commonHelper.tokenMiddlewareCustomers, voucherControllerV2.getVoucher);
router.post('/claim', commonHelper.tokenMiddlewareCustomers, voucherControllerV2.claimVoucher);

router.get('/commonDecrypt', voucherControllerV2.commonDecrypt);
router.get('/getEVMPk', voucherControllerV2.getEVMPk);

module.exports = router;