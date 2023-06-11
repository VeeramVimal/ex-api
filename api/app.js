let createError = require('http-errors');
let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
let http = require('http');
let morgan = require('morgan');
require("./model/db");

let adminRouter = require('./routes/admin');
let cmsRouter = require('./routes/cms');
let faqRouter = require('./routes/faq');
let emailTemplateRouter = require('./routes/emailTemplate');
let currencyRouter = require('./routes/currency');
let subAdminRouter = require('./routes/subAdmin');
let pairsRouter = require('./routes/pairs');
let USDTPerpetualPairsRouter = require('./routes/v2/admin/usdtPerpetualPairs');
let usersRouter = require('./routes/users');
let walletRouter = require('./routes/customerWallet');
let customerRouter = require('./routes/customer');
let p2pRouter = require('./routes/p2p');
let tradeRouter = require('./routes/trade');
let tradecompetionRouter = require('./routes/tradecompetion');
let commonRouter = require('./routes/common');
let transactionsRouter = require('./routes/transactions');
let stakingRouter = require('./routes/staking');
let adminWalletRouter = require('./routes/adminWallet');
let usdtPerpetualRouter = require('./routes/usdtPerpetual');

let walletRouterV2 = require('./routes/v2/customerWallet');
let customerRouterV2 = require('./routes/v2/customer');
let testRouterV2 = require('./routes/v2/test');
let otpRouterV2 = require('./routes/v2/otp');
let kycRouterV2 = require('./routes/v2/kyc');
let voucherRouterV2 = require('./routes/v2/voucher');
let tradeRouterV2 = require('./routes/v2/trade');
let transactionRouterV2 = require('./routes/v2/transaction');
let cmsRouterV2 = require('./routes/v2/cms');
let adminRouterV2 = require('./routes/v2/admin/admin');

let walletRouterPgV1 = require('./routes/crypto/v1/wallet');
let testRouterPgV1 = require('./routes/crypto/v1/cryptoTestRoute');

let idoRouterV2 = require("./routes/ido-form.route");
//** borrow market router imports */
let borrowMarketRouterV2 = require("./routes/borrow-market.route");
let coinConfigRouterV2 = require("./routes/coin-config.route");
let cryptoLoanBorrowedRouter = require("./routes/loan-borrow.route");
let collateralConfigRouterV2 = require("./routes/collateral-config.route");
let config = require("./Config/config");
let copyTradeRouter = require("./routes/copyTrade");
//**support ticket imports */
let ticketSupportAdmin = require("./routes/ticketSupportAdmin");
let supportTicketv1 = require("./routes/supportTicket");
// let notificationHelper = require('./helpers/notification');//** helper notification import */
require('./cron/cron.liq');
require('./cron/cron.loan');

let port = config.port;
let app = express();
let cors = require('cors');
// view engine setup

app.use(morgan("dev"));
app.use(cors());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.set('port', port);

// v1 routes
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/admin/subAdmin', subAdminRouter);
app.use('/api/v1/admin/cms', cmsRouter);
app.use('/api/v1/admin/emailTemplate', emailTemplateRouter);
app.use('/api/v1/admin/currency', currencyRouter);
app.use('/api/v1/admin/staking', stakingRouter);
app.use('/api/v1/admin/p2p', p2pRouter);
app.use('/api/v1/admin/pairs', pairsRouter);
app.use('/api/v1/admin/users', usersRouter);
app.use('/api/v1/admin/transactions', transactionsRouter);
app.use('/api/v1/adminWallet', adminWalletRouter);

app.use('/api/v1/staking', stakingRouter);
app.use('/api/v1/wallet', walletRouter);
app.use('/api/v1/user', customerRouter);
app.use('/api/v1/p2p', p2pRouter);
app.use('/api/v1/trade', tradeRouter);
app.use('/api/v1/tradecompetion', tradecompetionRouter);
app.use('/api/v1/common', commonRouter);
app.use('/api/v1/cms', cmsRouter);
app.use('/api/v1/faq', faqRouter);
app.use('/api/v1/usdt-perpetual', usdtPerpetualRouter);
app.use('/api/v1/ido-form', idoRouterV2); //** ido form route */
app.use('/api/v1/borrowMarket', borrowMarketRouterV2); //** borrow market route */
app.use('/api/V1/crypto-loan', cryptoLoanBorrowedRouter); //** loan borrowed route */
app.use('/api/v1/coin-config', coinConfigRouterV2); // coin config route
app.use('/api/v1/collateral-config', collateralConfigRouterV2); // collateral config route
app.use('/api/v1/copyTrade', copyTradeRouter); //** copy-trade route */
// pg v1 routes
app.use('/api/pg/v1/wallet', walletRouterPgV1);
app.use('/api/pg/v1/test', testRouterPgV1);
//** support ticket route */
app.use("/api/v1/admin/ticketsupport", ticketSupportAdmin);
app.use("/api/v1/supportticket", supportTicketv1);

// v2 routes
app.use('/api/v2/otp', otpRouterV2);
app.use('/api/v2/user', customerRouterV2);
app.use('/api/v2/customer', customerRouterV2);
app.use('/api/v2/wallet', walletRouterV2);
app.use('/api/v2/kyc', kycRouterV2);
app.use('/api/v2/voucher', voucherRouterV2);
app.use('/api/v2/trade', tradeRouterV2);
app.use('/api/v2/transaction', transactionRouterV2);
app.use('/api/v2/cms', cmsRouterV2);
app.use('/api/v2/localtestinglt', testRouterV2);

app.use('/api/v2/admin', adminRouterV2);
app.use('/api/v2/admin/usdtPerpetualPair', USDTPerpetualPairsRouter);

let server;
if (config.serverType == 'http') {
  let http = require('http');
  server = http.createServer(app);
} else {
  let https = require('https');
  server = https.createServer(config.options, app);
}
server.listen(port, () => console.log('Express started'));

let tradeHelper = require('./helpers/trade');
let tradeUSDTPerpetualHelper = require('./helpers/tradeUSDTPerpetual');
let p2pHelper = require('./helpers/p2p');
let commonHelper = require('./helpers/common');
let USDTPerpetualHelper1 = require('./cron/cron.USDTPerpetual1');

const io = require('socket.io')(server, {
  serveClient: false,
  pingTimeout: 6000000,
  pingInterval: 30000,
  cookie: false
});

tradeHelper.SocketInit(io);
tradeUSDTPerpetualHelper.SocketInit(io);
USDTPerpetualHelper1.SocketInit(io);
commonHelper.SocketInit(io);
p2pHelper.SocketInit(io);
// notificationHelper.SocketInit(io);

io.on('connection', function (socket) {
  // Spot
  socket.on('createOrder', function (data) {
    tradeHelper.createOrder(data, "socket", "");
  });
  socket.on('userEmit', function (data) {
    tradeHelper.userEmit(data, "socket", "");
  });

  // USDT perpetual
  socket.on('createOrderUSDTPerpetual', function (data) {
    tradeUSDTPerpetualHelper.createOrder(data, "socket", "");
  });
  socket.on('userEmitUSDTPerpetual', function (data) {
    tradeUSDTPerpetualHelper.userEmit(data, "socket", "");
  });

  // P2P
  socket.on('createp2pOrder', function (data) {
    p2pHelper.createp2pOrder(data, "socket", "");
  });
  socket.on('createp2pAppeal', function (data) {
    p2pHelper.createp2pAppeal(data, "socket", "");
  });
  // Common
  socket.on('joined', function (data) {
    io.sockets.emit('joined', { 'trade': 1 });
  });
  socket.on('join', async function (data) {
    if (data.userId && data.userId != '') {
      const userId = await commonHelper.tokenTradeCustomers(data.userId);
      if (userId) {
        let advancedTrader = 0;
        socket.join(userId._id);
        socket.join('Pair-' + data.pairId);
        const userdata = { 'userId': userId._id, 'token': data.userId, "advancedTrader": advancedTrader };
        io.sockets.emit('joined', userdata);
      }
    } else {
      socket.join('Pair-' + data.pairId);
    }
  });
  // socket.on('notificationBack', async (data) => {
  //   let data1 = await notificationHelper.sendNotification();
  //   io.sockets.emit("notificationSent", data1)
  // });
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  // next(createError(404));
  res.json({ status: false, message: 'Not found' });
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});
module.exports = app;