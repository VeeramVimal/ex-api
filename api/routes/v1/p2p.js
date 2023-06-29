const express = require('express');
const router = express.Router();
const p2pController = require('../../controllers/v1/p2pController');
const commonHelper = require('../../helpers/common');
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
    windowMs: 5 * 1000,
    max: 1,
    message: { status: false, message: "Too many requests created from this IP, please try again after an 5 seconds"},
    statusCode: 200
});
router.post('/getCurrentpair',p2pController.getCurrentpair);
router.post('/advertiserDet',commonHelper.tokenMiddlewareCustomers,p2pController.advertiserDet);
router.post('/getBalance',commonHelper.tokenMiddlewareCustomers,p2pController.getBalance);

{/*payment  */}
router.post('/addPayment', commonHelper.tokenMiddlewareCustomers, p2pController.addPayment);
router.post('/getPayment', commonHelper.tokenMiddlewareCustomers, p2pController.getPayment);
router.get('/getPayment', commonHelper.tokenMiddlewareCustomers, p2pController.getPayment);
router.get('/getadsP2PPayment', commonHelper.tokenMiddlewareCustomers, p2pController.getadsP2PPayment);
router.post('/getParticularPaymentList', commonHelper.tokenMiddlewareCustomers, p2pController.getParticularPaymentList);
router.post('/getmyParticularPaymentList', commonHelper.tokenMiddlewareCustomers, p2pController.getmyParticularPaymentList);
router.post('/getPaymentDetails', commonHelper.tokenMiddlewareCustomers, p2pController.getPaymentDetails);
router.post('/deletePayemnt',commonHelper.tokenMiddlewareCustomers,p2pController.deletePayemnt);
router.post('/enableDisablP2PPayment',commonHelper.tokenMiddlewareCustomers,p2pController.enableDisablP2PPayment);


{/* user section*/}
router.post('/getp2puserOrders',commonHelper.tokenMiddlewareCustomers,p2pController.getp2puserOrders);
router.post('/getblockUsers',commonHelper.tokenMiddlewareCustomers,p2pController.getblockUsers);
router.post('/getp2puserAllOrders',commonHelper.tokenMiddlewareCustomers,p2pController.getp2puserAllOrders);
router.post('/advertiserOrderDet',commonHelper.tokenMiddlewareCustomers,p2pController.advertiserOrderDet);
router.post('/getmyOrderDetails', commonHelper.tokenMiddlewareCustomers,p2pController.getmyOrderDetails);

{/*post ads*/}
router.post('/getallMyads',commonHelper.tokenMiddlewareCustomers,p2pController.getallMyads);
router.post('/getMyads',commonHelper.tokenMiddlewareCustomers,p2pController.getMyads);
router.post('/getp2pPair', commonHelper.tokenMiddlewareCustomers, p2pController.getp2pPair);
router.post('/submitVerification', limiter, commonHelper.tokenMiddlewareCustomers, p2pController.submitVerification);
router.post('/submitChatMessage',commonHelper.tokenMiddlewareCustomers,p2pController.submitChatMessage);
router.post('/deletemyAds',limiter, commonHelper.tokenMiddlewareCustomers,p2pController.deletemyAds);
router.post('/changeMode',commonHelper.tokenMiddlewareCustomers,p2pController.changeMode);

{/* order */}
router.post('/getParticularCurrency',p2pController.getParticularCurrency);
router.post('/getallOrders', p2pController.getallOrders);
router.get('/getallPayments', p2pController.getallPayments);
router.get('/getallPairs', commonHelper.tokenMiddlewareCustomersDataGet, p2pController.getallPairs);
router.get('/getbuyerPaymentMethods',commonHelper.tokenMiddlewareCustomers, p2pController.getbuyerPaymentMethods);
router.post('/getpriceRange', commonHelper.tokenMiddlewareCustomers,p2pController.getpriceRange);
router.post('/submitOrder',  limiter, commonHelper.tokenMiddlewareCustomers,p2pController.submitOrder);
router.post('/cancelOrder',  limiter, commonHelper.tokenMiddlewareCustomers,p2pController.cancelOrder);
router.get('/getFaqDetails',p2pController.getFaqDetails); 
router.post('/orderReleased',  limiter, commonHelper.tokenMiddlewareCustomers,p2pController.orderReleased);

{/* appeal*/}
router.post('/createAppeal', commonHelper.tokenMiddlewareCustomers,p2pController.createAppeal);
router.post('/helpcenterAppeal', commonHelper.tokenMiddlewareCustomers,p2pController.helpcenterAppeal);
router.post('/cancelAppeal', commonHelper.tokenMiddlewareCustomers,p2pController.cancelAppeal);
router.post('/getappealHistory',commonHelper.tokenMiddlewareCustomers,p2pController.getappealHistory);

{/* report,block,feedback*/}
router.post('/getmyFeedBack',commonHelper.tokenMiddlewareCustomers,p2pController.getmyFeedBack);
router.post('/createFeedback',commonHelper.tokenMiddlewareCustomers,p2pController.createFeedback);
router.post('/getfeedbackDetails',commonHelper.tokenMiddlewareCustomers,p2pController.getfeedbackDetails);
router.post('/submitReport',commonHelper.tokenMiddlewareCustomers,p2pController.submitReport);

{/* admin panel */}
router.post('/getallTransactions',commonHelper.tokenMiddlewareAdmin,p2pController.getallTransactions);
router.post('/getallAppealDetails',commonHelper.tokenMiddlewareAdmin,p2pController.getallAppealDetails);
router.post('/getTransactionHistoryDetails',commonHelper.tokenMiddlewareAdmin,p2pController.getTransactionHistoryDetails);
router.post('/getp2pAppealHistoryDetails',commonHelper.tokenMiddlewareAdmin,p2pController.getp2pAppealHistoryDetails);
router.post('/p2pCancelAppeal',commonHelper.tokenMiddlewareAdmin,p2pController.p2pCancelAppeal);
router.post('/p2pcancelOrder',commonHelper.tokenMiddlewareAdmin,p2pController.p2pcancelOrder);
router.post('/p2ppaymentReceived',commonHelper.tokenMiddlewareAdmin,p2pController.p2ppaymentReceived);
router.post('/UpdateP2PSettings',commonHelper.tokenMiddlewareAdmin,p2pController.UpdateP2PSettings);
router.get('/getP2PSettings',p2pController.getP2PSettings);
router.post('/getp2pReportDetails',commonHelper.tokenMiddlewareAdmin,p2pController.getp2pReportDetails);
router.post('/getp2pReportHistoryDetails',commonHelper.tokenMiddlewareAdmin,p2pController.getp2pReportHistoryDetails);
router.post('/getp2pBlockedUserstDetails',commonHelper.tokenMiddlewareAdmin,p2pController.getp2pBlockedUserstDetails);
router.post('/getp2pFeedbackDetails',commonHelper.tokenMiddlewareAdmin,p2pController.getp2pFeedbackDetails);
router.post('/getp2pFeedbackList',commonHelper.tokenMiddlewareAdmin,p2pController.getp2pFeedbackList);
router.post('/blockUnlockUser',commonHelper.tokenMiddlewareAdmin,p2pController.blockUnlockUser);
router.post('/getPairsfilter',commonHelper.tokenMiddlewareAdmin,p2pController.getPairsfilter); 
router.post('/addPairs',commonHelper.tokenMiddlewareAdmin,p2pController.addPairs); 
router.post('/updatePairs',commonHelper.tokenMiddlewareAdmin,p2pController.updatePairs); 
router.post('/getFaq',commonHelper.tokenMiddlewareAdmin,p2pController.getFaq); 
router.get('/getFaqDetails',commonHelper.tokenMiddlewareAdmin,p2pController.getFaqDetails); 
router.post('/addFaq',commonHelper.tokenMiddlewareAdmin,p2pController.addFaq); 
router.post('/updateFaq',commonHelper.tokenMiddlewareAdmin,p2pController.updateFaq); 





module.exports = router;