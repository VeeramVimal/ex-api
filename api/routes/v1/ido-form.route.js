const express = require('express');
const userController = require("../../controllers/v1/user-ido-form.controller");
const commonHelper = require("../../helpers/common");
const router = express.Router();

router.route('/update/:userId').patch(commonHelper.tokenMiddlewareAdmin, userController.launchPadUpdate);
router.route("/list").get(commonHelper.tokenMiddlewareAdmin, userController.launchPadList);
router.route("/single").post(commonHelper.tokenMiddlewareAdmin, userController.launchPadSingleList);
router.route('/create').post(commonHelper.tokenMiddlewareCustomers, userController.createUser);
router.route("/").get(commonHelper.tokenMiddlewareCustomers, userController.getUserDataFilter);
router.route("/:userId").get(commonHelper.tokenMiddlewareCustomers, userController.getSingleUser);
router.route("/tokenBuy").post(commonHelper.tokenMiddlewareCustomers, userController.launchTokenBuy);
module.exports = router;