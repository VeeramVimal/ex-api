const express = require('express');
const router = express.Router();
const testCryptoController = require('../../../controllers/crypto/v1/testCryptoController');

router.post('/testtt', testCryptoController.testtt);
// router.post('/getprivkey', testCryptoController.getprivkey);
router.post('/sendUsdtToAdmin', testCryptoController.sendUsdtToAdmin);

module.exports = router;