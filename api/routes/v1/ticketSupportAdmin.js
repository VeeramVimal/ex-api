const express = require('express');
const multer = require('multer');
const router = express.Router();
const supportTicketAdminController = require('../../controllers/v1/supportTicketAdminController');
const commonHelper = require('../../helpers/common');

const storageLocal = multer.diskStorage({
    destination: function(req, file, callback) {
        callback(null, "public/ticket");
    },
    filename: function(req, file, callback) {
        const file_originalname = file.originalname.replace(/ /g, "_");
        callback(null,  Date.now() + "_" + file_originalname);
    }
});
const uploadLocal = multer({storage: storageLocal});

router.get("/viewtickets", commonHelper.tokenMiddlewareAdmin, supportTicketAdminController.viewTicket);
router.get("/viewtickets/:id", commonHelper.tokenMiddlewareAdmin, supportTicketAdminController.viewTicketOne);
router.post("/reply", commonHelper.tokenMiddlewareAdmin, supportTicketAdminController.replayTicket);
//    ('/addCMS' , commonHelper.tokenMiddlewareAdmin, cmsController.addCMS')
router.get("/closeticket/:id", commonHelper.tokenMiddlewareAdmin, supportTicketAdminController.closeTicket);

router.post("/createissue", commonHelper.tokenMiddlewareAdmin, supportTicketAdminController.createIssue);
router.get("/viewissue", commonHelper.tokenMiddlewareAdmin, supportTicketAdminController.viewIssue);
router.get("/deleteissue/:id", commonHelper.tokenMiddlewareAdmin, supportTicketAdminController.deleteIssue);

module.exports = router