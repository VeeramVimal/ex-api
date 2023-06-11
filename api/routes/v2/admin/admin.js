const express = require('express');
const router = express.Router();
const v2adminController = require('../../../controllers/v2/admin/adminController');
const commonHelper = require('../../../helpers/common');
const multer = require('multer');
const storage = multer.diskStorage({
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + Date.now());
    }
});
const upload = multer({ storage });

router.post('/getUserDetails', commonHelper.tokenMiddlewareAdmin, v2adminController.getUserDetails);
router.post('/updateKycDetails', commonHelper.tokenMiddlewareAdmin, v2adminController.updateKycDetails);
router.post('/userDetailsRemoved', commonHelper.tokenMiddlewareAdmin, v2adminController.userDetailsRemoved);

/* p2p section*/
router.post('/getP2PPaymentDetails', commonHelper.tokenMiddlewareAdmin, v2adminController.getP2PPaymentDetails);
router.post('/updateP2PPaymentStatus', commonHelper.tokenMiddlewareAdmin, v2adminController.updateP2PPaymentStatus);
router.post('/addBankPayment', commonHelper.tokenMiddlewareAdmin, v2adminController.addBankPayment);
router.post('/updateSuspend', commonHelper.tokenMiddlewareAdmin, v2adminController.updateSuspend);
router.post('/userEmailUpdation', commonHelper.tokenMiddlewareAdmin, v2adminController.userEmailUpdation);
router.post('/getallOrders', commonHelper.tokenMiddlewareAdmin, v2adminController.getallOrders);
router.post('/getordersDetails', commonHelper.tokenMiddlewareAdmin, v2adminController.getordersDetails);


module.exports = router;

