const express = require('express');
const userController = require("../controllers/user-ido-form.controller");
const commonHelper = require("../helpers/common");
const router = express.Router();

router.route('/update/:userId').patch(commonHelper.tokenMiddlewareAdmin, userController.lanchPadUpdate);
router.route("/list").get(commonHelper.tokenMiddlewareAdmin, userController.lanchPadList);
router.route("/single").post(commonHelper.tokenMiddlewareAdmin, userController.lanchPadSingleList);
router.route('/create').post(commonHelper.tokenMiddlewareCustomers, userController.createUser);
router.route("/").get(commonHelper.tokenMiddlewareCustomers, userController.getUserDataFilter);
router.route("/:userId").get(commonHelper.tokenMiddlewareCustomers, userController.getSingleUser);
module.exports = router;