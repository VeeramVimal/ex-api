const express = require('express');
const router = express.Router();
const walletControllerV1 = require('../../../controllers/crypto/v1/walletController');

// router.get('/CreateAdminAddress', walletControllerV1.CreateAdminAddress);
router.get('/createNewAddress', walletControllerV1.createNewAddress);
router.post('/depositBNB', walletControllerV1.deposit);
router.post('/withdrawBNB', walletControllerV1.withdraw);

router.post('/deposit', walletControllerV1.deposit);
router.post('/getbalance', walletControllerV1.getbalance);
router.post('/withdraw', walletControllerV1.withdraw);
router.get('/getBlockNumberBNB', walletControllerV1.getBlockNumberBNB);
router.get('/getBlockNumber', walletControllerV1.getBlockNumber);

module.exports = router;