const express = require('express');
const router = express.Router();
const transactionController = require('../../controllers/v2/transactionController');
const commonHelper = require('../../helpers/common');
const multer = require('multer');
const storage = multer.diskStorage({
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + Date.now());
    }
});
const upload = multer({ storage });

router.get('/withdrawLevelDetail', commonHelper.tokenMiddlewareCustomers, transactionController.withdrawLevelDetail);

module.exports = router;
