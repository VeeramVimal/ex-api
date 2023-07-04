const express = require('express');
const router = express.Router();
const faqController = require('../../controllers/v1/faqController')
const commonHelper = require('../../helpers/common');

router.post('/getFaq', faqController.getFaq);

module.exports = router;