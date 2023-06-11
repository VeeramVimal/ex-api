const express = require('express');
const router = express.Router();
const stakingController = require('../controllers/stakingController')
const commonHelper = require('../helpers/common');
router.get('/getStaking', stakingController.getStaking);
router.post('/getStakingfilter', stakingController.getStakingfilter);
router.post('/addStaking', commonHelper.tokenMiddlewareAdmin, stakingController.addStaking);
router.post('/updateStaking', commonHelper.tokenMiddlewareAdmin, stakingController.updateStaking);
router.post('/getStakingById', commonHelper.tokenMiddlewareAdmin, stakingController.getStakingById);
router.post('/checkStakingPair', stakingController.checkStakingPair);
router.post('/getStakingHistory', commonHelper.tokenMiddlewareCustomers, stakingController.getStakingHistory);
router.post('/getStakingHistoryList', commonHelper.tokenMiddlewareAdmin, stakingController.getStakingHistoryList);
router.post('/getStakingTableDetailsSum', commonHelper.tokenMiddlewareAdmin, stakingController.getStakingTableDetailsSum);
router.post('/getStakingHistoryDetails', stakingController.getStakingHistoryDetails);
router.get('/getRefstakingComissionAdmin', commonHelper.tokenMiddlewareAdmin,  stakingController.getRefstakingComissionAdmin);
router.post('/getRefstakingComissionAdminfilter', commonHelper.tokenMiddlewareAdmin,  stakingController.getRefstakingComissionAdminfilter);
router.post('/stakingdetails', commonHelper.tokenMiddlewareAdmin, stakingController.stakingdetails);
module.exports = router;