const express = require('express');
const router = express.Router();
const adminP2PController = require('../../controllers/v1/adminP2pController')
const commonHelper = require('../../helpers/common');
const multer = require('multer');
const storage = multer.diskStorage({
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + Date.now());
    }
});
const upload = multer({ storage });
router.post('/createAppeal', commonHelper.tokenMiddlewareAdmin, adminP2PController.createAppeal);
router.post('/getp2pAppealHistoryDetails', commonHelper.tokenMiddlewareAdmin, adminP2PController.getp2pAppealHistoryDetails);
router.post('/getPairsfilter', commonHelper.tokenMiddlewareAdmin, adminP2PController.getPairsfilter);
router.post('/addPairs',commonHelper.tokenMiddlewareAdmin,adminP2PController.addPairs); 
router.post('/updatePairs',commonHelper.tokenMiddlewareAdmin,adminP2PController.updatePairs); 
router.post('/getallTransactions',commonHelper.tokenMiddlewareAdmin,adminP2PController.getallTransactions);
router.post('/getTransactionHistoryDetails',commonHelper.tokenMiddlewareAdmin,adminP2PController.getTransactionHistoryDetails);
router.post('/p2pcancelOrder',commonHelper.tokenMiddlewareAdmin,adminP2PController.p2pcancelOrder);
router.post('/getallAppealDetails',commonHelper.tokenMiddlewareAdmin,adminP2PController.getallAppealDetails);
router.post('/p2ppaymentReceived',commonHelper.tokenMiddlewareAdmin,adminP2PController.p2ppaymentReceived);
router.post('/p2pCancelAppeal',commonHelper.tokenMiddlewareAdmin,adminP2PController.p2pCancelAppeal);
module.exports = router;