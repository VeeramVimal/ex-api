const express = require('express');
const router = express.Router();
const pairsController = require('../../controllers/v1/pairsController')
const commonHelper = require('../../helpers/common');
router.get('/getPairs', pairsController.getPairs);
router.post('/getPairsfilter', pairsController.getPairsfilter);
router.post('/addPairs', commonHelper.tokenMiddlewareAdmin, pairsController.addPairs);
router.post('/updatePairs', commonHelper.tokenMiddlewareAdmin, pairsController.updatePairs);
router.post('/popularPair', pairsController.popularPair);

module.exports = router;