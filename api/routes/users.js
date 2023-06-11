const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const commonHelper = require('../helpers/common');
router.post('/getUsers', commonHelper.tokenMiddlewareAdmin, usersController.getUsers);
router.post('/getKycUser', commonHelper.tokenMiddlewareAdmin, usersController.getKycUser);
router.post('/getUserDetails', commonHelper.tokenMiddlewareAdmin, usersController.getUserDetails);
router.post('/updateUser', commonHelper.tokenMiddlewareAdmin, usersController.updateUser);
router.post('/balancedetails', commonHelper.tokenMiddlewareAdmin, usersController.balancedetails);
router.post('/tradehistorydetails',commonHelper.tokenMiddlewareAdmin, usersController.tradehistorydetails)
router.post('/referreduserdetails',commonHelper.tokenMiddlewareAdmin, usersController.referreduserdetails)
router.post('/stakeBalanceDetails',commonHelper.tokenMiddlewareAdmin, usersController.stakeBalanceDetails);
router.post('/p2pBalanceDetails',commonHelper.tokenMiddlewareAdmin, usersController.p2pBalanceDetails)
router.post('/getReferralData',commonHelper.tokenMiddlewareAdmin, usersController.getReferralData)
module.exports = router;