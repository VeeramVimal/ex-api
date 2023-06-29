const express = require('express');
const router = express.Router();
const commonHelper = require('../../helpers/common');
const notificationController = require('../../controllers/v1/notificationController');

router.post('/readNotification',notificationController.clearAllNotification);
router.post('/getAllNotification',notificationController.getAllNotification);
router.get('/getAllClearedNotification',notificationController.getAllClearedNotification);
module.exports = router;


