const express = require('express');
const router = express.Router();
const subAdminController = require('../controllers/subAdminController')
const commonHelper = require('../helpers/common');
router.get('/getSubAdmin', subAdminController.getSubAdmin);
router.post('/getSubAdminfilter', subAdminController.getSubAdminfilter);
router.post('/addSubAdmin', commonHelper.tokenMiddlewareAdmin, subAdminController.addSubAdmin);
router.post('/updateSubAdmin', commonHelper.tokenMiddlewareAdmin, subAdminController.updateSubAdmin);
router.post('/getSubAdminById', commonHelper.tokenMiddlewareAdmin, subAdminController.getSubAdminById);
module.exports = router;