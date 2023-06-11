const express                = require('express');
const router                 = express.Router();
const adminWalletController = require('../controllers/adminWalletController')
const commonHelper = require('../helpers/common');
const multer = require('multer');
const storage = multer.diskStorage({
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + Date.now());
    }
});
const upload = multer({ storage });
// router.get('/createAddress', adminWalletController.createAddress);
router.get('/adminMoveProcess', adminWalletController.adminMoveProcess);
// router.get('/adminTokenMoveProcess', adminWalletController.adminTokenMoveProcess);
// router.post('/login', adminWalletController.login);
// router.post('/forgotPassword', adminWalletController.forgotPassword);
// router.post('/forgotPasswordCheck', adminWalletController.forgotPasswordCheck);
// router.post('/resetPassword', adminWalletController.resetPassword);
// router.post('/changePassword', adminWalletController.changePassword);
// router.get('/getSiteSettings', adminWalletController.getSiteSettings);
// router.get('/getMyProfile', commonHelper.tokenMiddlewareWalletAdmin, adminWalletController.getMyProfile);
// router.post('/updateMyProfile', commonHelper.tokenMiddlewareWalletAdmin, adminWalletController.updateMyProfile);
// router.post('/changePassword', commonHelper.tokenMiddlewareWalletAdmin, adminWalletController.changePassword);
// router.get('/getCurrencyBalance', commonHelper.tokenMiddlewareWalletAdminCurrency, adminWalletController.getCurrencyBalance);
// router.post('/getParCurrencyBalance', commonHelper.tokenMiddlewareWalletAdmin, adminWalletController.getParCurrencyBalance);
// router.post('/withdrawWallet', commonHelper.tokenMiddlewareWalletAdmin, adminWalletController.withdrawWallet);
// router.get('/getCurrency', commonHelper.tokenMiddlewareWalletAdmin, adminWalletController.getCurrency);
// router.get('/getDepositAddress', commonHelper.tokenMiddlewareWalletAdmin, adminWalletController.getDepositAddress);
// router.get('/getAdminWithdraw', commonHelper.tokenMiddlewareWalletAdmin, adminWalletController.getAdminWithdraw);
// router.get('/getProfit', commonHelper.tokenMiddlewareWalletAdmin, adminWalletController.getProfit);
// router.get('/checkETHBlock', adminWalletController.checkETHBlock);
// router.post('/fileUpload', upload.array("images[]"), adminWalletController.updateImages);
module.exports = router;