const express = require('express');
const multer = require('multer');

const router = express.Router();

const kycController = require('../../controllers/v2/kycController');
const commonHelper = require('../../helpers/common');

const storage = multer.diskStorage({
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + Date.now());
    }
});
const upload = multer({ storage });

const storageLocal = multer.diskStorage({
    destination: function(req, file, callback) {
        if(req.query.type == "aadhaarVerify") {
            callback(null, "./public/aadhaar_image");
        }
        else if(req.query.type == "selfieVerify" || req.query.type == "checkSelfieVerify" || req.query.type == "selfieSubmit") {
            callback(null, "./public/userSelfie");
        }
    },
    filename: function(req, file, callback) {
        const file_originalname = file.originalname.replace(/ /g, "_");
        callback(null,  Date.now() + "_" + file_originalname);
    }
});
const uploadLocal = multer({storage: storageLocal});

router.post('/online/verify/pan', commonHelper.tokenMiddlewareCustomers, kycController.verifyPanOnline);
router.post('/online/verify/aadhaar', commonHelper.tokenMiddlewareCustomers, kycController.verifyAadhaarOnline);
router.post('/online/verify/selfie', uploadLocal.array("images[]"), commonHelper.tokenMiddlewareCustomers, kycController.verifySelfieOnline);
router.get('/online/verify/selfie/fromAdmin', commonHelper.tokenMiddlewareCustomers, kycController.verifySelfieFromAdminOnline);

router.post('/offline/verify/pan', upload.array("images[]"), commonHelper.tokenMiddlewareCustomers, kycController.verifyPanOffline);
router.post('/offline/verify/aadhaar', uploadLocal.array("images[]"), commonHelper.tokenMiddlewareCustomers, kycController.verifyAadhaarOffline);
router.post('/offline/verify/selfie', uploadLocal.array("images[]"), commonHelper.tokenMiddlewareCustomers, kycController.verifySelfieOffline);

// router.get('/updUserDataTemp', kycController.updUserDataTemp);
router.post('/resetKYC', commonHelper.tokenMiddlewareAdmin, kycController.updUserDataTemp);

// testing
// router.post('/online/verify/userUploadToCloud', upload.array("images[]"), commonHelper.tokenMiddlewareCustomers, kycController.userUploadToCloud);
// router.post('/online/verify/base64ToCloud', upload.array("images[]"), commonHelper.tokenMiddlewareCustomers, kycController.base64ToCloud);

module.exports = router;