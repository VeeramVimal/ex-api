let createError = require('http-errors');
let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
let http = require('http');
let morgan = require('morgan');
require("./model/db");

let apiRouter = require('./routes/base/apiRouter');
let admapiRouter = require('./routes/base/admapiRouter');
let appapiRouter = require('./routes/base/appapiRouter');
let webapiRouter = require('./routes/base/webapiRouter');

let config = require("./Config/config");
let tradeHelper = require('./helpers/trade');
let tradeUSDTPerpetualHelper = require('./helpers/tradeUSDTPerpetual');
let p2pHelper = require('./helpers/p2p');
let commonHelper = require('./helpers/common');
let notificationHelper = require("./helpers/notification");
require('./cron/cron.liq');
require('./cron/cron.loan');
let cronUSDTPerpetual = require('./cron/initial.USDTPerpetual');

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

app.use('/api', commonHelper.middlewareApi, apiRouter);
app.use('/appapi', commonHelper.middlewareAppApi, appapiRouter);
app.use('/webapi', commonHelper.middlewareWebapi, webapiRouter);
app.use('/admapi', commonHelper.middlewareAdmapi, admapiRouter);

let server;
if (config.serverType == 'http') {
  let http = require('http');
  server = http.createServer(app);
} else {
  let https = require('https');
  server = https.createServer(config.options, app);
}
server.listen(port, () => console.log('Express started'));

const io = require('socket.io')(server, {
  serveClient: false,
  pingTimeout: 6000000,
  pingInterval: 30000,
  cookie: false
});

tradeHelper.SocketInit(io);
tradeUSDTPerpetualHelper.SocketInit(io);
cronUSDTPerpetual.SocketInit(io);
commonHelper.SocketInit(io);
p2pHelper.SocketInit(io);
notificationHelper.SocketInit(io);

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

  // socket.on('notification', async (data) => {
  //   let data1 = await notificationHelper.sendNotification();
  //   console.log('asgcsacsac=============',data1);
  //   io.sockets.emit("notification", data1)
  // });

  // socket.on('user_id', async (userId) => {
  //   // console.log("userId=========", userId);
  //   let data1 = await notificationHelper.getUserId(userId);
  //   console.log("data1====condition======", data1)
  //   io.sockets.emit("user_id", data1);
  // });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });

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