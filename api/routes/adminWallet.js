const express = require('express');
const router = express.Router();
const adminWalletController = require('../controllers/adminWalletController')
const commonHelper = require('../helpers/common');
const multer = require('multer');
const storage = multer.diskStorage({
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + Date.now());
    }
});
const upload = multer({ storage });

router.get('/createAddress', adminWalletController.createAddress);
router.get('/adminMoveProcess', adminWalletController.adminMoveProcess);
router.get('/adminTokenMoveProcess', adminWalletController.adminTokenMoveProcess);
router.get('/getCurrencyBalance', commonHelper.tokenMiddlewareWalletAdminCurrency, adminWalletController.getCurrencyBalance);

module.exports = router;