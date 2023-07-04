const express = require('express');
const multer = require('multer');
const router = express.Router();
const supportTicketController = require('../../controllers/v1/supportTicketController');
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

router.post("/createticket", uploadLocal.array("images"),  commonHelper.tokenMiddlewareCustomers, supportTicketController.createTicket);
router.get("/viewticket/:id", commonHelper.tokenMiddlewareCustomers, supportTicketController.userViewTickets),
router.post('/chat-ticket', commonHelper.tokenMiddlewareCustomers, supportTicketController.replayTicket); 
router.get("/issuelist", commonHelper.tokenMiddlewareCustomers, supportTicketController.issueList);
module.exports = router;