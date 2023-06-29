const express = require('express');
const router = express.Router();
const testController = require('../../controllers/v2/testController');

router.get('/', testController.welcome);
router.post('/getUserBalanceByCurrencyId', testController.getUserBalanceByCurrencyId);

module.exports = router;