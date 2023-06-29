const express = require('express');
const router = express.Router();
const emailTemplateController = require('../../controllers/v1/emailTemplateController')
const commonHelper = require('../../helpers/common');
router.post('/getemailTemplate', commonHelper.tokenMiddlewareAdmin, emailTemplateController.getemailTemplate);
router.post('/addEmailTemplate' , commonHelper.tokenMiddlewareAdmin, emailTemplateController.addEmailTemplate);
router.post('/updateEmailTemplate', commonHelper.tokenMiddlewareAdmin, emailTemplateController.updateEmailTemplate);
module.exports = router;