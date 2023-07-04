const express = require('express');
const router = express.Router();
const cmsController = require('../../controllers/v1/cmsController')
const commonHelper = require('../../helpers/common');

// login not require
router.post('/getCMS', cmsController.getCMS);

// login require
router.get('/getCMS', commonHelper.tokenMiddlewareAdmin, cmsController.getCMS);
router.post('/getCMSById', commonHelper.tokenMiddlewareAdmin, cmsController.getCMSById);
router.post('/addCMS' , commonHelper.tokenMiddlewareAdmin, cmsController.addCMS);
router.post('/updateCMS', commonHelper.tokenMiddlewareAdmin, cmsController.updateCMS);
router.post('/deleteCMS', commonHelper.tokenMiddlewareAdmin, cmsController.deleteCMS);
router.post('/changeStatus', commonHelper.tokenMiddlewareAdmin, cmsController.changeStatus);


module.exports = router;