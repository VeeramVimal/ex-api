const express = require('express');
const router = express.Router();
const siteSettingsController = require('../../controllers/v2/siteSettingsController');

router.get('/web', siteSettingsController.webSettings);
router.get('/app', siteSettingsController.appSettings);

module.exports = router;