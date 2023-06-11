const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController')
const adminCustomerWalletController = require('../controllers/adminCustomerWalletController')
const commonHelper = require('../helpers/common');
const multer = require('multer');
const storage = multer.diskStorage({
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + Date.now());
    }
});
const upload = multer({ storage });
router.get('/setSiteDeploy', adminController.setSiteDeploy);
router.get('/getLogs', adminController.getLogs);
router.get('/deleteLogs', adminController.deleteLogs);
router.get('/getErrLogs', adminController.getErrLogs);
router.get('/getCurrencyBalance', adminController.getCurrencyBalance);
router.get('/deleteErrLogs', adminController.deleteErrLogs);
router.post('/login', adminController.login);
router.post('/forgotPassword', adminController.forgotPassword);
router.post('/forgotPasswordCheck', adminController.forgotPasswordCheck);
router.post('/resetPassword', adminController.resetPassword);
// router.post('/changePassword', adminController.changePassword);
router.get('/getSiteSettings', adminController.getSiteSettings);
router.post('/UpdateSiteSettings', commonHelper.tokenMiddlewareAdmin, adminController.UpdateSiteSettings);
router.get('/getBankDetails', adminController.getBankDetails);
router.post('/updateBankDetails', commonHelper.tokenMiddlewareAdmin, adminController.updateBankDetails);
router.get('/getMyProfile', commonHelper.tokenMiddlewareAdmin, adminController.getMyProfile);
router.post('/updateMyProfile', commonHelper.tokenMiddlewareAdmin, adminController.updateMyProfile);
router.post('/sendPushNotification', commonHelper.tokenMiddlewareAdmin, adminController.sendPushNotification);
router.post('/addStakingEnabled', commonHelper.tokenMiddlewareAdmin, adminController.addStakingEnabled);
router.post('/changePassword', commonHelper.tokenMiddlewareAdmin, adminController.changePassword);
router.get('/getDocs', commonHelper.tokenMiddlewareAdmin, adminController.getDocs);
router.post('/getStakeEnableUser', commonHelper.tokenMiddlewareAdmin, adminController.getStakeEnableUser);
router.post('/deleteEnabledUser', commonHelper.tokenMiddlewareAdmin, adminController.deleteEnabledUser);
router.post('/updateUserBalance',  commonHelper.tokenMiddlewareAdmin, adminController.updateUserBalanceManualy);
router.post('/getUserBalanceSetView',  commonHelper.tokenMiddlewareAdmin, adminController.getUserBalanceSetView);
router.post('/getDocsById', commonHelper.tokenMiddlewareAdmin, adminController.getDocsById);
router.post('/addDocs' , commonHelper.tokenMiddlewareAdmin, adminController.addDocs);
router.post('/updateDocs', commonHelper.tokenMiddlewareAdmin, adminController.updateDocs);
router.post('/deleteDocs', commonHelper.tokenMiddlewareAdmin, adminController.deleteDocs);
router.get('/getDashboardCount', commonHelper.tokenMiddlewareAdmin, adminController.getDashboardCount);
router.post('/fileUpload', upload.array("images[]"), adminController.updateImages);
router.post('/sendNewsLetter', commonHelper.tokenMiddlewareAdmin, adminController.sendNewsLetter);
router.post('/getactivitylogadmin' ,  commonHelper.tokenMiddlewareAdmin, adminController.getactivitylogadmin);

router.get('/depositEVMBased', commonHelper.tokenMiddlewareAdmin, adminCustomerWalletController.depositEVMBased);

module.exports = router;