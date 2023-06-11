const express = require('express');
const router = express.Router();
const customerController = require('../../controllers/v2/customerController');
const commonHelper = require('../../helpers/common');
const multer = require('multer');
const storage = multer.diskStorage({
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + Date.now());
    }
});
const upload = multer({ storage });

router.post('/forgotPassword', commonHelper.checkReCaptcha, customerController.forgotPassword);
router.post('/forgotPasswordChk', customerController.forgotPasswordCheck);
router.post('/resetPassword', customerController.resetPassword);
router.post('/changeVerificationDetail', commonHelper.tokenMiddlewareCustomers, commonHelper.checkReCaptcha, customerController.changeVerificationDetail);
router.post('/loginHistory', commonHelper.tokenMiddlewareCustomers, customerController.loginHistory);
router.get('/getBankPayments', commonHelper.tokenMiddlewareCustomers, customerController.getBankPayments);
router.get('/tradeFanTknFeesAuth', commonHelper.tokenMiddlewareCustomers, customerController.tradeFanTknFeesAuth);

module.exports = router;
