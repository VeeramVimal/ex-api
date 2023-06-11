const express = require('express');
const router = express.Router();
const currencyController = require('../controllers/currencyController')
const commonHelper = require('../helpers/common');
router.get('/getCurrency', currencyController.getCurrency);
router.post('/getCurrencyfilter', currencyController.getCurrencyfilter);
router.post('/addCurrency', commonHelper.tokenMiddlewareAdmin, currencyController.addCurrency);
router.post('/updateCurrency', commonHelper.tokenMiddlewareAdmin, currencyController.updateCurrency);
router.post('/getCurrencyById', commonHelper.tokenMiddlewareAdmin, currencyController.getCurrencyById);
module.exports = router;