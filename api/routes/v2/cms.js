const express = require('express');
const router = express.Router();
const cmsController = require('../../controllers/v2/cmsController');
const commonHelper = require('../../helpers/common');
const multer = require('multer');
const storage = multer.diskStorage({
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + Date.now());
    }
});
const upload = multer({ storage });

router.post('/getCMS', cmsController.getCMS);


module.exports = router;
