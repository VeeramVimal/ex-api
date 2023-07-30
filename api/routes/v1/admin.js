const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/v1/adminController')
const adminCustomerWalletController = require('../../controllers/v1/adminCustomerWalletController')
const commonHelper = require('../../helpers/common');
const multer = require('multer');
const storage = multer.diskStorage({
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + Date.now());
    }
});
const upload = multer({ storage });
router.get('/getBankDetails', adminController.getBankDetails);
router.post('/login', adminController.login);
router.post('/forgotPassword', adminController.forgotPassword);
router.post('/forgotPasswordCheck', adminController.forgotPasswordCheck);
router.post('/resetPassword', adminController.resetPassword);
// router.post('/changePassword', adminController.changePassword);
router.get('/getSiteSettings', adminController.getSiteSettings);
router.post('/fileUpload', upload.array("images[]"), adminController.updateImages);

router.get('/setSiteDeploy', commonHelper.tokenMiddlewareAdmin, adminController.setSiteDeploy);
router.get('/getLogs', commonHelper.tokenMiddlewareAdmin, adminController.getLogs);
router.get('/deleteLogs', commonHelper.tokenMiddlewareAdmin, adminController.deleteLogs);
router.get('/getErrLogs', commonHelper.tokenMiddlewareAdmin, adminController.getErrLogs);
router.get('/getCurrencyBalance', commonHelper.tokenMiddlewareAdmin, adminController.getCurrencyBalance);
router.get('/deleteErrLogs', commonHelper.tokenMiddlewareAdmin, adminController.deleteErrLogs);
router.post('/UpdateSiteSettings', commonHelper.tokenMiddlewareAdmin, adminController.UpdateSiteSettings);
router.post('/updateBankDetails', commonHelper.tokenMiddlewareAdmin, adminController.updateBankDetails);
router.get('/getMyProfile', commonHelper.tokenMiddlewareAdmin, adminController.getMyProfile);
router.post('/updateMyProfile', commonHelper.tokenMiddlewareAdmin, adminController.updateMyProfile);
router.post('/sendPushNotification', commonHelper.tokenMiddlewareAdmin, adminController.sendPushNotification);
router.post('/changePassword', commonHelper.tokenMiddlewareAdmin, adminController.changePassword);
router.get('/getDocs', commonHelper.tokenMiddlewareAdmin, adminController.getDocs);
router.post('/updateUserBalance', commonHelper.tokenMiddlewareAdmin, adminController.updateUserBalanceManualy);
router.post('/getUserBalanceSetView', commonHelper.tokenMiddlewareAdmin, adminController.getUserBalanceSetView);
router.post('/getDocsById', commonHelper.tokenMiddlewareAdmin, adminController.getDocsById);
router.post('/addDocs', commonHelper.tokenMiddlewareAdmin, adminController.addDocs);
router.post('/updateDocs', commonHelper.tokenMiddlewareAdmin, adminController.updateDocs);
router.post('/deleteDocs', commonHelper.tokenMiddlewareAdmin, adminController.deleteDocs);
router.get('/getDashboardCount', commonHelper.tokenMiddlewareAdmin, adminController.getDashboardCount);
router.post('/sendNewsLetter', commonHelper.tokenMiddlewareAdmin, adminController.sendNewsLetter);
router.post('/getactivitylogadmin', commonHelper.tokenMiddlewareAdmin, adminController.getactivitylogadmin);
router.get('/depositEVMBased', commonHelper.tokenMiddlewareAdmin, adminCustomerWalletController.depositEVMBased);

module.exports = router;