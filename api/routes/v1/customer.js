const express = require('express');
const router = express.Router();
const customerController = require('../../controllers/v1/customerController');
const usercontroller = require('../../controllers/v1/usersController')
const commonHelper = require('../../helpers/common');
const multer = require('multer');
const storage = multer.diskStorage({
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + Date.now());
    }
});
const upload = multer({ storage });
router.get('/getServerTime', customerController.getServerTime);
router.post('/login', commonHelper.checkReCaptcha, customerController.login);
router.post('/forgotPassword', customerController.forgotPassword);
router.post('/forgotPasswordCheck', customerController.forgotPasswordCheck);
router.post('/resetPassword', customerController.resetPassword);
router.post('/register', commonHelper.checkReCaptcha, customerController.register);
router.post('/changePassword', commonHelper.tokenMiddlewareCustomers, customerController.changePassword);
router.get('/getMyProfile', commonHelper.tokenMiddlewareCustomers, customerController.getMyProfile);
router.get('/getReferralData', commonHelper.tokenMiddlewareCustomers, customerController.getReferralData);
router.post('/updateTFA', commonHelper.tokenMiddlewareCustomers, customerController.updateTFA);
router.post('/updateMyProfile', commonHelper.tokenMiddlewareCustomers, customerController.updateMyProfile);
router.post('/updateMyBank', commonHelper.tokenMiddlewareCustomers, customerController.updateMyBank);
module.exports = router;