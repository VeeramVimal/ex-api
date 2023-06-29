const express = require('express');
const router = express.Router();

let adminRouter = require('../v1/admin');
let cmsRouter = require('../v1/cms');
let faqRouter = require('../v1/faq');
let emailTemplateRouter = require('../v1/emailTemplate');
let currencyRouter = require('../v1/currency');
let subAdminRouter = require('../v1/subAdmin');
let pairsRouter = require('../v1/pairs');
let usersRouter = require('../v1/users');
let walletRouter = require('../v1/customerWallet');
let customerRouter = require('../v1/customer');
let p2pRouter = require('../v1/p2p');
let tradeRouter = require('../v1/trade');
let tradecompetionRouter = require('../v1/tradecompetion');
let commonRouter = require('../v1/common');
let transactionsRouter = require('../v1/transactions');
let stakingRouter = require('../v1/staking');
let adminWalletRouter = require('../v1/adminWallet');

let siteSettingsRouter = require('../v2/siteSettingsRouter');
let walletRouterV2 = require('../v2/customerWallet');
let customerRouterV2 = require('../v2/customer');
let testRouterV2 = require('../v2/test');
let otpRouterV2 = require('../v2/otp');
let kycRouterV2 = require('../v2/kyc');
let voucherRouterV2 = require('../v2/voucher');
let tradeRouterV2 = require('../v2/trade');
let transactionRouterV2 = require('../v2/transaction');
let cmsRouterV2 = require('../v2/cms');
let adminRouterV2 = require('../v2/admin/admin');

let walletRouterPgV1 = require('../crypto/v1/wallet');
let testRouterPgV1 = require('../crypto/v1/cryptoTestRoute');

let idoRouterV2 = require("../v1/ido-form.route");
//** borrow market router imports */
let borrowMarketRouterV2 = require("../v1/borrow-market.route");
let coinConfigRouterV2 = require("../v1/coin-config.route");
let cryptoLoanBorrowedRouter = require("../v1/loan-borrow.route");
let collateralConfigRouterV2 = require("../v1/collateral-config.route");
let copyTradeRouter = require("../v1/copyTrade");
//**support ticket imports */
let ticketSupportAdmin = require("../v1/ticketSupportAdmin");
let supportTicketv1 = require("../v1/supportTicket");
let notificationRouter = require('../v1/notificationRoute');

let notificationHelper = require('../../helpers/notification');//** helper notification import */

// v1 routes
router.use('/v1/admin', adminRouter);
router.use('/v1/admin/subAdmin', subAdminRouter);
router.use('/v1/admin/cms', cmsRouter);
router.use('/v1/admin/emailTemplate', emailTemplateRouter);
router.use('/v1/admin/currency', currencyRouter);
router.use('/v1/admin/staking', stakingRouter);
router.use('/v1/admin/p2p', p2pRouter);
router.use('/v1/admin/pairs', pairsRouter);
router.use('/v1/admin/users', usersRouter);
router.use('/v1/admin/transactions', transactionsRouter);
router.use('/v1/adminWallet', adminWalletRouter);

router.use('/v1/staking', stakingRouter);
router.use('/v1/wallet', walletRouter);
router.use('/v1/user', customerRouter);
router.use('/v1/p2p', p2pRouter);
router.use('/v1/trade', tradeRouter);
router.use('/v1/tradecompetion', tradecompetionRouter);
router.use('/v1/common', commonRouter);
router.use('/v1/cms', cmsRouter);
router.use('/v1/faq', faqRouter);
// router.use('/v1/usdt-perpetual', usdtPerpetualRouter);
router.use('/v1/ido-form', idoRouterV2); //** ido form route */
router.use('/v1/borrowMarket', borrowMarketRouterV2); //** borrow market route */
router.use('/V1/crypto-loan', cryptoLoanBorrowedRouter); //** loan borrowed route */
router.use('/v1/coin-config', coinConfigRouterV2); // coin config route
router.use('/v1/collateral-config', collateralConfigRouterV2); // collateral config route
router.use('/v1/copyTrade', copyTradeRouter); //** copy-trade route */
// pg v1 routes
router.use('/pg/v1/wallet', walletRouterPgV1);
router.use('/pg/v1/test', testRouterPgV1);
//** support ticket route */
router.use("/v1/admin/ticketsupport", ticketSupportAdmin);
router.use("/v1/supportticket", supportTicketv1);

router.use("/v1/notification", notificationRouter);
// v2 routes
router.use('/v2/otp', otpRouterV2);
router.use('/v2/user', customerRouterV2);
router.use('/v2/customer', customerRouterV2);
router.use('/v2/wallet', walletRouterV2);
router.use('/v2/kyc', kycRouterV2);
router.use('/v2/voucher', voucherRouterV2);
router.use('/v2/trade', tradeRouterV2);
router.use('/v2/transaction', transactionRouterV2);
router.use('/v2/cms', cmsRouterV2);
router.use('/v2/localtestinglt', testRouterV2);
router.use('/v2/settings', siteSettingsRouter);

module.exports = router;