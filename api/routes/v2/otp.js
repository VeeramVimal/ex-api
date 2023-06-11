const express = require('express');
const router = express.Router();
const otpControllerV2 = require('../../controllers/v2/otpController');
const commonHelper = require('../../helpers/common');

router.post('/getCode', commonHelper.tokenMiddlewareCustomers, commonHelper.checkReCaptcha, otpControllerV2.getCode);

module.exports = router;