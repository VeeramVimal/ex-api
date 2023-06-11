var crypto = require("crypto");
var config = require("../Config/config");
var jsonrpc = require("../Config/rpc");

let imageUpload = require("./image-upload");
const mongoose = require("mongoose");
let queryHelper = require("./query");
let jwt = require("jsonwebtoken");
var WAValidator = require("multicoin-address-validator");
const ipInfo = require("ipinfo");
var axios = require('axios');
let plivo = require('plivo');

const UserWallet = mongoose.model("UserWallet");
const BalanceUpdation = mongoose.model("BalanceUpdation");
const StakeBalanceUpdation = mongoose.model("StakeBalanceUpdation");
const P2PBalanceUpdation = mongoose.model("P2PBalanceUpdation");
const USDMBalanceUpdation = mongoose.model("USDMBalanceUpdation");
const query_helper = require("../helpers/query");
const subadminactvitylog = mongoose.model("SubAdminActivityLog");
const P2PActivityLog = mongoose.model("P2PActivityLog");
const Users = mongoose.model("Users");
const Notification = mongoose.model("Notification");
const emailTemplate = mongoose.model("EmailTemplate");
const mail_helper = require("../helpers/mailHelper");
const sitesetting = mongoose.model("SiteSettings");
const VoucherDB = mongoose.model("Voucher");
const CryptoLoanBalanceUpdation = require("../model/CryptoLoanBalanceUpdation.model");
const LoanActivityLogs = require("../model/CryptoLoanActivityLogs.model");
let clientTwilio = "";
let clientPlivo = "";

if(config.sendSMS) {
  if(config.sendSMS.enable) {
    if(config.sendSMS.name == "twilio") {
      clientTwilio = require("twilio")(config.twilio.accountSid, config.twilio.authToken);
    }
    else  if(config.sendSMS.name == "plivo") {
      clientPlivo = new plivo.Client(config.plivo.authID, config.plivo.authToken);
    }
  }
}

const Admin = mongoose.model("Admin");
let siteDeploy = 0;
let siteDeployPG = 0;
let password = config.passPhrase;
let algorithm = config.algorithm;
let iv = config.iv;
let jwtTokenAdmin = config.jwtTokenAdmin;
let jwtTokenCustomers = config.jwtTokenCustomers;
var request = require("request");
let usdtRate = { changePer: 0, usdtType: 0, changeValue: 0 };
let usdtValues = {};
exports.setUsdtValues = (value) => {
  usdtValues = value;
  return true;
};
exports.getUsdtValues = () => {
  return usdtValues;
};
var socket = 0;
// here socket connect
exports.SocketInit = function (socketIO) {
  socket = socketIO;
};
exports.GetSocket = function () {
  return socket;
};
let usdtRateCall = 0;
function _intervalFunc() {
  if (usdtRateCall == 1) {
    usdtRateCall = 0;
  }
}
exports.setUsdtRateChange = async function () {
  let sitesettingdata = await query_helper.findoneData(sitesetting, {}, {});
  let changeValue =
    sitesettingdata.status && sitesettingdata.msg.tradeUSDTValue > 0
      ? sitesettingdata.msg.tradeUSDTValue
      : 0;
  let usdtType =
    sitesettingdata.status && sitesettingdata.msg.tradeUSDTType == "+"
      ? "+"
      : "-";
  let usdtChange =
    changeValue > 0
      ? usdtType == "+"
        ? 80 + changeValue
        : 80 - changeValue
      : 0;
  let changePer = changeValue > 0 ? usdtChange / 80 : 0;
  usdtRate = { changePer, usdtType, changeValue };
  return usdtRate;
};
exports.getUsdtRateChange = () => {
  return usdtRate;
};
exports.setUsdtRate = (usdRate) => {
  if (usdtRateCall == 0) {
    usdtRateCall = 1;
    setTimeout(_intervalFunc, 300000);
    if (usdtRate.changeValue > 0) {
      let usdtChange =
        usdtRate.changeValue > 0
          ? usdtRate.usdtType == "+"
            ? usdRate + usdtRate.changeValue
            : usdRate - usdtRate.changeValue
          : 0;
      let changePer = usdtRate.changeValue > 0 ? usdtChange / usdRate : 0;
      usdtRate.changePer = changePer;
    }
  }
  return usdtRate;
};
exports.setSiteDeploy = (value) => {
  siteDeploy = value;
  return true;
};
exports.getSiteDeploy = () => {
  return siteDeploy;
};
exports.getSiteDeployPG = () => {
  return siteDeployPG;
};
exports.encrypt = (value) => {
  var cipher = crypto.createCipheriv(algorithm, password, iv);
  var crypted = cipher.update(value, "utf8", "hex");
  crypted += cipher.final("hex");
  return crypted;
};
exports.decrypt = (value) => {
  var decipher = crypto.createDecipheriv(algorithm, password, iv);
  var dec = decipher.update(value, "hex", "utf8");
  dec += decipher.final("utf8");
  return dec;
};
exports.createPayloadAdmin = (key) => {
  let payload = { subject: key };
  let token = jwt.sign(payload, jwtTokenAdmin);
  return token;
};
exports.tokenMiddlewareAdmin = async function (request, res, next) {
  if (!request.headers.authorization) {
    return res.status(401).send("unauthorized");
  }
  let token = request.headers.authorization.split(" ")[1];
  if (token === "null") {
    return res.status(401).send("unauthorized");
  } else {
    let payload = jwt.verify(token, jwtTokenAdmin);
    if (!payload) {
      return res.status(401).send("unauthorized");
    }
    const userData = await queryHelper.findoneData(
      Admin,
      { _id: mongoose.Types.ObjectId(payload.subject), status: 1 },
      {}
    );
    if (userData.status) {
      request.userId = payload.subject;
      next();
    } else {
      return res.status(401).send("unauthorized");
    }
  }
};
exports.tokenMiddlewareWalletAdminCurrency = async function (
  request,
  res,
  next
) {
  if (!request.headers.authorization) {
    return res.status(401).send("unauthorized");
  }
  let token = request.headers.authorization.split(" ")[1];
  if (token === "null") {
    return res.status(401).send("unauthorized");
  } else {
    let payload = jwt.verify(token, jwtTokenAdmin);
    if (!payload) {
      return res.status(401).send("unauthorized");
    }
    request.userId = payload.subject;
    next();
  }
};
exports.createPayloadCustomers = (key, securityKey = "") => {
  let payload = { subject: key, securityKey };
  let token = jwt.sign(payload, jwtTokenCustomers);
  return token;
};
exports.tokenMiddlewareCustomersDataGet = async (request, res, next) => {
  try {
    if (!request.headers.authorization) {
      next();
    }
    else {
      let token = request.headers.authorization.split(" ")[1];
      if (token === "null") {
        next();
      } else {
        let payload = jwt.verify(token, jwtTokenCustomers);
        if (!payload) {
          next();
        }
        else {
          const userData = await queryHelper.findoneData(
            Users,
            {
              _id: mongoose.Types.ObjectId(payload.subject),
              status: 1,
              securityKey: payload.securityKey,
            },
            {}
          );
          if (userData.status) {
            if (userData.msg.status === 0) {
              next();
            }
            else {
              const myProfile = userData.msg;
              request.reqUserData = myProfile;
              request.kycUserType = myProfile.country == "IND" ? myProfile.country : "International"
              request.userId = payload.subject;
              request.securityKey = payload.securityKey;
              next();
            }
          }
          else {
            next();
          }
        }
      }
    }
  } catch (e) {
    console.log("tokenMiddlewareCustomersDataGet : ", e);
    next();
  }
}
exports.tokenMiddlewareCustomers = async (request, res, next) => {
  try {
    if (!request.headers.authorization) {
      return res.status(401).json({ status: false, message: "unauthorized" });
    }
    let token = request.headers.authorization.split(" ")[1];
    if (token === "null") {
      return res.status(401).json({ status: false, message: "unauthorized" });
    } else {
      let payload = jwt.verify(token, jwtTokenCustomers);
      if (!payload) {
        return res.status(401).json({ status: false, message: "unauthorized" });
      }
      const userData = await queryHelper.findoneData(
        Users,
        {
          _id: mongoose.Types.ObjectId(payload.subject),
          status: 1,
          securityKey: payload.securityKey,
        },
        {}
      );
      if (userData.status) {
        if (userData.msg.status === 0) {
          return res
            .status(401)
            .json({
              status: false,
              message: "Your account is disabled by admin",
            });
        }
        request.reqUserData = userData.msg;
        request.userId = payload.subject;
        request.securityKey = payload.securityKey;
        next();
      } else {
        return res.status(401).json({ status: false, message: "unauthorized" });
      }
    }
  } catch (e) {
    console.log("tokenMiddlewareCustomers", e, request.headers.authorization);
    return res.status(401).json({ status: false, message: "unauthorized" });
  }
};

exports.tokenImageCustomers = (request) => {
  if (!request.headers.authorization) {
    return null;
  }
  let token = request.headers.authorization.split(" ")[1];
  if (token === "null") {
    return null;
  } else {
    let payload = jwt.verify(token, jwtTokenCustomers);
    if (!payload) {
      return null;
    }
    return payload.subject;
  }
};
exports.tokenTradeCustomers = async function (token) {
  if (!token) {
    return null;
  }
  if (token === "null") {
    return null;
  } else {
    let payload = jwt.verify(token, jwtTokenCustomers);
    if (!payload) {
      return null;
    }
    const userData = await queryHelper.findoneData(
      Users,
      { _id: mongoose.Types.ObjectId(payload.subject) },
      {}
    );
    if (userData.status) {
      return userData.msg;
    } else {
      return null;
    }
  }
};
exports.CreateAddress = async function (Cursymbol, user_id, callback) {
  const GetCoin = require("./CoinTransactions/" + Cursymbol + ".js");
  GetCoin.CreateAddress(user_id, function (addressDet) {
    callback(addressDet);
  });
};
exports.getPaymentData = async function (
  address,
  symbol,
  contract,
  block,
  currency
) {
  const GetCoin = require("./CoinTransactions/" + symbol + ".js");
  return await GetCoin.getPaymentData(address, contract, block, currency);
};
exports.CreateAdminAddress = async function (Cursymbol, callback) {
  const GetCoin = require("./CoinTransactions/" + Cursymbol + ".js");
  GetCoin.CreateAdminAddress(function (addressDet) {
    callback(addressDet);
  });
};
exports.addressvalidator = function (address, currSym) {
  currSym = currSym == "BNB" || currSym == "MATIC" ? "ETH" : currSym;
  var valid = WAValidator.validate(address, currSym);
  if (valid) {
    return true;
  } else {
    return false;
  }
};
exports.roundValuesMail = (num, precision) => {
  return num.toFixed(precision);
};
exports.uploadImage = (fieldName) => async (request, response, next) => {
  imageUpload.upload.array(fieldName, request.query.sizeFile),
    async (req, res) => {
      next();
    };
};
exports.getbalance = async function (userId, currencyId) {
  let resdata1 = await queryHelper.findoneData(
    UserWallet,
    {
      userId: mongoose.mongo.ObjectId(userId),
      currencyId: mongoose.mongo.ObjectId(currencyId),
    },
    {}
  );
  if (resdata1.status) {
    return resdata1.msg;
  } else {
    const createWallet = {
      userId: mongoose.mongo.ObjectId(userId),
      currencyId: mongoose.mongo.ObjectId(currencyId),
      amount: 0,
      hold: 0,
      p2pAmount: 0,
      p2pHold: 0,
      perpetualAmount: 0,
      perpetualHold: 0,
    };
    await queryHelper.insertData(UserWallet, createWallet);
    return createWallet;
  }
};

exports.updateUserBalance = async function (
  userId,
  currencyId,
  amount,
  lastId,
  type,
  extdata = {}
) {
  const userWalletFindData = {
    userId: mongoose.mongo.ObjectId(userId),
    currencyId: mongoose.mongo.ObjectId(currencyId),
  }
  const wallet_data = await queryHelper.findoneData(
    UserWallet,
    userWalletFindData,
    {}
  );
  let balance = 0;
  if (wallet_data.status && wallet_data.msg) {
    if (type == 'p2pWallet') {
      balance = wallet_data.msg.p2pAmount;
    } else if (type == 'usdmWallet') {
      balance = wallet_data.msg.perpetualAmount;
    } else {
      balance = wallet_data.msg.amount;
    }
  } else {
    let createwallet = {
      userId: mongoose.mongo.ObjectId(userId),
      currencyId: mongoose.mongo.ObjectId(currencyId),
      p2pAmount: 0,
      p2pHold: 0,
      perpetualAmount: 0,
      perpetualHold: 0,
      amount: 0,
      hold: 0,
    };
    await queryHelper.insertData(UserWallet, createwallet);
    balance = 0;
  }

  const updations = {
    userId: mongoose.mongo.ObjectId(userId),
    currencyId: mongoose.mongo.ObjectId(currencyId),
    amount: roundValues(amount, 8),
    difference: roundValues(amount - balance, 8),
    oldBalance: roundValues(balance, 8),
    lastId: lastId,
    type: type,
    notes: extdata.notes ? JSON.stringify(extdata.notes) : "",
  };
  let balanceId;
  let balanceUpdColl;

  if (type == 'p2pWallet') {
    balanceUpdColl = P2PBalanceUpdation;
  } else if (type == 'usdmWallet') {
    balanceUpdColl = USDMBalanceUpdation;
  } else {
    balanceUpdColl = BalanceUpdation;
  }

  balanceId = await queryHelper.insertData(balanceUpdColl, updations);

  let updBalData = {}
  if (type == 'p2pWallet') {
    updBalData = { p2pAmount: +roundValues(+amount, 8) };
  } else if (type == 'usdmWallet') {
    updBalData = { perpetualAmount: +roundValues(+amount, 8) };
  }
  else {
    updBalData = { amount: +roundValues(+amount, 8) };
  }

  await queryHelper.updateData(
    UserWallet,
    "one",
    userWalletFindData,
    updBalData
  );

  // if (balance < 0) {
  //   let email_data = await query_helper.findoneData(emailTemplate, { hint: 'negative-hold-issue' }, {})
  //   if (email_data.status) {
  //     const userResult = await query_helper.findoneData(Users, { "_id": mongoose.Types.ObjectId(userId) }, {});
  //     if (userResult.status) {
  //       email_data = email_data.msg;
  //       let emailtemplate = email_data.content.replace(/###USER###/g, userResult.msg.username).replace(/###BALANCE###/g, balance);
  //       mail_helper.sendMail({ subject: email_data.subject, to: 'test@yopmail.com', html: emailtemplate }, (aftermail) => {
  //       })
  //     }
  //   }
  // }

  if (balanceId && balanceId.msg && balanceId.msg._id) {
    return balanceId.msg._id;
    // return updations;
  }
  else {
    return false;
  }
};

exports.updateUserVoucherBalance = async function (
  userId,
  currencyId,
  voucherId,
  amount,
  lastId,
  type
) {
  const wallet_data = await queryHelper.findoneData(
    VoucherDB,
    {
      userId: mongoose.mongo.ObjectId(userId),
      currencyId: mongoose.mongo.ObjectId(currencyId),
      _id: mongoose.mongo.ObjectId(voucherId),
    },
    {}
  );
  let balance = 0;
  if (wallet_data.status) {
    balance = wallet_data.msg.balance;
    const updations = {
      userId: mongoose.mongo.ObjectId(userId),
      currencyId: mongoose.mongo.ObjectId(currencyId),
      vaoucherId: mongoose.mongo.ObjectId(voucherId),
      amount: roundValues(amount, 8),
      difference: roundValues(amount - balance, 8),
      oldBalance: roundValues(balance, 8),
      lastId: lastId,
      type: type,
    };
    let balanceId = await queryHelper.insertData(BalanceUpdation, updations);
    await queryHelper.updateData(
      VoucherDB,
      "one",
      {
        userId: mongoose.mongo.ObjectId(userId),
        currencyId: mongoose.mongo.ObjectId(currencyId),
      },
      { balance: +roundValues(+amount, 8) }
    );
    return balanceId.msg._id;
  } else {
    return false;
  }
};

exports.updateBalanceUpdationId = async function (balanceId, lastId) {
  await queryHelper.updateData(
    BalanceUpdation,
    "one",
    { _id: mongoose.mongo.ObjectId(balanceId) },
    { lastId: lastId }
  );
  return true;
};

exports.updateHoldAmount = async function (userId, currencyId, amount) {
  amount = roundValues(amount, 8);
  UserWallet.updateOne(
    {
      userId: mongoose.mongo.ObjectId(userId),
      currencyId: mongoose.mongo.ObjectId(currencyId),
    },
    { $inc: { hold: amount } },
    { multi: true }
  ).exec(function (balErr, balRes) { });
  // if (amount < 0) {
  //   let email_data = await query_helper.findoneData(
  //     emailTemplate,
  //     { hint: "negative-hold-issue" },
  //     {}
  //   );
  //   if (email_data.status) {
  //     const userResult = await query_helper.findoneData(
  //       Users,
  //       { _id: mongoose.Types.ObjectId(userId) },
  //       {}
  //     );
  //     if (userResult.status) {
  //       email_data = email_data.msg;
  //       let emailtemplate = email_data.content
  //         .replace(/###USER###/g, userResult.msg.username)
  //         .replace(/###BALANCE###/g, amount);
  //       mail_helper.sendMail(
  //         {
  //           subject: email_data.subject,
  //           to: "test@yopmail.com",
  //           html: emailtemplate,
  //         },
  //         (aftermail) => {}
  //       );
  //     }
  //   }
  // }
};
exports.updateStakeAmount = async function (
  userId,
  currencyId,
  amount,
  lastId,
  type
) {
  const wallet_data = await queryHelper.findoneData(
    UserWallet,
    {
      userId: mongoose.mongo.ObjectId(userId),
      currencyId: mongoose.mongo.ObjectId(currencyId),
    },
    {}
  );
  let balance = 0;
  if (wallet_data.status) {
    balance = wallet_data.msg.stakingAmount;
  }
  const updations = {
    userId: mongoose.mongo.ObjectId(userId),
    currencyId: mongoose.mongo.ObjectId(currencyId),
    amount: roundValues(amount, 8),
    difference: roundValues(amount - balance, 8),
    oldBalance: roundValues(balance, 8),
    lastId: lastId,
    type: type,
  };
  await queryHelper.insertData(StakeBalanceUpdation, updations);
  await queryHelper.updateData(
    UserWallet,
    "one",
    {
      userId: mongoose.mongo.ObjectId(userId),
      currencyId: mongoose.mongo.ObjectId(currencyId),
    },
    { stakingAmount: +roundValues(+amount, 8) }
  );
  return true;
};
exports.updateIcoAmount = async function (userId, currencyId, amount) {
  amount = roundValues(amount, 8);
  await queryHelper.updateData(
    UserWallet,
    "one",
    {
      userId: mongoose.mongo.ObjectId(userId),
      currencyId: mongoose.mongo.ObjectId(currencyId),
    },
    { icoAmount: amount }
  );
  return true;
};
exports.updateStakeHoldAmount = function (userId, currencyId, amount) {
  amount = roundValues(amount, 8);
  UserWallet.updateOne(
    {
      userId: mongoose.mongo.ObjectId(userId),
      currencyId: mongoose.mongo.ObjectId(currencyId),
    },
    { $inc: { stakingHold: amount } },
    { multi: true }
  ).exec(function (balErr, balRes) { });
  return true;
};
exports.updatep2pAmount = async function (
  userId,
  currencyId,
  amount,
  lastId,
  type,
  extdata = {}
) {
  const wallet_data = await queryHelper.findoneData(
    UserWallet,
    {
      userId: mongoose.mongo.ObjectId(userId),
      currencyId: mongoose.mongo.ObjectId(currencyId),
    },
    {}
  );
  let balance = 0;
  if (wallet_data.status) {
    balance = wallet_data.msg.p2pAmount;
  }
  const updations = {
    userId: mongoose.mongo.ObjectId(userId),
    currencyId: mongoose.mongo.ObjectId(currencyId),
    amount: roundValues(amount, 8),
    difference: roundValues(amount - balance, 8),
    oldBalance: roundValues(balance, 8),
    lastId: lastId,
    type: type,
    notes: extdata.notes ? JSON.stringify(extdata.notes) : "",
  };
  const p2pNewData = await queryHelper.insertData(P2PBalanceUpdation, updations);
  await queryHelper.updateData(
    UserWallet,
    "one",
    {
      userId: mongoose.mongo.ObjectId(userId),
      currencyId: mongoose.mongo.ObjectId(currencyId),
    },
    { p2pAmount: +roundValues(+amount, 8) }
  );
  if (p2pNewData && p2pNewData.status && p2pNewData.msg && p2pNewData.msg._id) {
    return p2pNewData.msg._id;
  }
  return true;
};
exports.updateperpetualAmount = async function (
  userId,
  currencyId,
  amount,
  lastId,
  type
) {
  const wallet_data = await queryHelper.findoneData(
    UserWallet,
    {
      userId: mongoose.mongo.ObjectId(userId),
      currencyId: mongoose.mongo.ObjectId(currencyId),
    },
    {}
  );
  let balance = 0;
  if (wallet_data.status) {
    balance = wallet_data.msg.perpetualAmount;
  }
  const updations = {
    userId: mongoose.mongo.ObjectId(userId),
    currencyId: mongoose.mongo.ObjectId(currencyId),
    amount: roundValues(amount, 8),
    difference: roundValues(amount - balance, 8),
    oldBalance: roundValues(balance, 8),
    lastId: lastId,
    type: type,
  };
  await queryHelper.insertData(USDMBalanceUpdation, updations);
  await queryHelper.updateData(
    UserWallet,
    "one",
    {
      userId: mongoose.mongo.ObjectId(userId),
      currencyId: mongoose.mongo.ObjectId(currencyId),
    },
    { perpetualAmount: +roundValues(+amount, 8) }
  );
  // return true;
};
exports.updatep2pAmountHold = async function (userId, currencyId, amount) {
  amount = roundValues(amount, 8);
  UserWallet.updateOne(
    {
      userId: mongoose.mongo.ObjectId(userId),
      currencyId: mongoose.mongo.ObjectId(currencyId),
    },
    { $inc: { p2pHold: amount } },
    { multi: true }
  ).exec(function (balErr, balRes) { });
  return true;
};
exports.updatp2peBalanceUpdationId = async function (balanceId, lastId) {
  await queryHelper.updateData(
    P2PBalanceUpdation,
    "one",
    { _id: mongoose.mongo.ObjectId(balanceId) },
    { lastId: lastId }
  );
  return true;
};
exports.AutoWithdraw = async function (sym, transresult, curncyRes, callback) {
  callback({ status: true, txnId: "", Tstatus: 3 });
  // if (curncyRes.autoWithdraw == 1) {
  //   CoinWithdraw(sym, transresult, curncyRes, function (resTxnData) {
  //     callback(resTxnData);
  //   });
  // } else {
  //   callback({ status: true, txnId: "", Tstatus: 3 });
  // }
};
let CoinWithdraw = (exports.CoinWithdraw = async function (
  sym,
  transresult,
  curncyRes,
  callback
) {
  try {
    let currencyBalance = await walletBalance(curncyRes);
    if (currencyBalance > transresult.receiveAmount) {
      let connectSymbol = curncyRes.currencySymbol;
      if (curncyRes.basecoin != "Coin") {
        connectSymbol = currencyToken(curncyRes.basecoin);
      }
      let GetCoin = require("./CoinTransactions/" + connectSymbol + ".js");
      GetCoin.Coinwithdraw(sym, transresult, function (txnId) {
        if (txnId) {
          callback({ status: true, txnId: txnId, Tstatus: 1 });
        } else {
          callback({ status: false, txnId: "", Tstatus: 3 });
        }
      });
    } else {
      callback({ status: false, txnId: "", Tstatus: 3 });
    }
  } catch (e) {
    console.log("CoinWithdraw", e);
    callback({ status: false, txnId: "", Tstatus: 3 });
  }
});

exports.checkCaptcha = function (key) {
  return true;
};
exports.activity = function (req) {
  let ua = req.headers["user-agent"];
  ua = ua.toLowerCase();
  let browser = "";
  if (/firefox/i.test(ua)) browser = "Firefox";
  else if (/chrome/i.test(ua)) browser = "Chrome";
  else if (/safari/i.test(ua)) browser = "Safari";
  else if (/msie/i.test(ua)) browser = "msie";
  else browser = "unknown";

  let ip = "";
  if (req != "") {
    ip =
      typeof req.headers["x-forwarded-for"] == "string"
        ? req.headers["x-forwarded-for"]
        : typeof req.headers["cf-connecting-ip"] == "string"
          ? req.headers["cf-connecting-ip"]
          : "";
  }
  return { ip: ip, browser: browser };
};
exports.insertActivity = async function (userId, comment, type, role, req) {
  let browser = "";
  if (req != "") {
    let ua = req.headers["user-agent"];
    ua = ua.toLowerCase();
    if (/firefox/i.test(ua)) browser = "Firefox";
    else if (/chrome/i.test(ua)) browser = "Chrome";
    else if (/safari/i.test(ua)) browser = "Safari";
    else if (/msie/i.test(ua)) browser = "msie";
    else browser = "unknown";
  }
  let ip = "";
  let ipDetails = "";
  if (req != "") {
    ip =
      typeof req.headers["x-forwarded-for"] == "string"
        ? req.headers["x-forwarded-for"]
        : req.headers["cf-connecting-ip"];

    if (ip) {
      try {
        const ipInfoResp = await ipInfo(ip);
        if (ipInfoResp) {
          ipDetails = JSON.stringify(ipInfoResp);
        }
      } catch (e) {
        //
      }
    }
  }
  let userdata = "";
  if (comment === "Login" && role === "user") {
    userdata = { userId: userId, d: type };
    type = comment;
  }
  let activityJson = {
    userId,
    ip,
    ipDetails,
    browser,
    type,
    comment,
  };
  let activityDB;
  if (role == "admin") {
    activityDB = mongoose.model("AdminActivity");
  } else {
    activityDB = mongoose.model("UserActivity");
  }
  await queryHelper.insertData(activityDB, activityJson);
  return true;
};
exports.checkValidEmail = function (emailId) {
  const blockEmail = require("./disposal_email.json");
  let mailValue = emailId.split("@");
  mailValue = (mailValue && mailValue[1]) ? mailValue[1].toLowerCase() : "";
  const indexValue = blockEmail.indexOf(mailValue.trim());
  if (indexValue == -1) {
    return true;
  } else {
    return false;
  }
};
exports.mathRound = (num1, num2, type) => {
  if (type == "addition") {
    return Math.round((+num1 + +num2) * 1e12) / 1e12;
  } else if (type == "subtraction") {
    return Math.round((num1 - num2) * 1e12) / 1e12;
  } else if (type == "multiplication") {
    return Math.round(num1 * num2 * 1e12) / 1e12;
  } else if (type == "division") {
    return Math.round((num1 / num2) * 1e12) / 1e12;
  }
};

let roundValues = (exports.roundValues = (numIn, precision = 2) => {
  numIn += "";                                            // To cater to numric entries
  var sign = "";                                           // To remember the number sign
  numIn.charAt(0) == "-" && (numIn = numIn.substring(1), sign = "-"); // remove - sign & remember it
  var str = numIn.split(/[eE]/g);                        // Split numberic string at e or E
  if (str.length < 2) return sign + numIn;                   // Not an Exponent Number? Exit with orginal Num back
  var power = str[1];                                    // Get Exponent (Power) (could be + or -)

  var deciSp = 1.1.toLocaleString().substring(1, 2);  // Get Deciaml Separator
  str = str[0].split(deciSp);                        // Split the Base Number into LH and RH at the decimal point
  var baseRH = str[1] || "",                         // RH Base part. Make sure we have a RH fraction else ""
    baseLH = str[0];                               // LH base part.

  if (power >= 0) {   // ------- Positive Exponents (Process the RH Base Part)
    if (power > baseRH.length) baseRH += "0".repeat(power - baseRH.length); // Pad with "0" at RH
    baseRH = baseRH.slice(0, power) + deciSp + baseRH.slice(power);      // Insert decSep at the correct place into RH base
    if (baseRH.charAt(baseRH.length - 1) == deciSp) baseRH = baseRH.slice(0, -1); // If decSep at RH end? => remove it

  } else {         // ------- Negative exponents (Process the LH Base Part)
    num = Math.abs(power) - baseLH.length;                               // Delta necessary 0's
    if (num > 0) baseLH = "0".repeat(num) + baseLH;                       // Pad with "0" at LH
    baseLH = baseLH.slice(0, power) + deciSp + baseLH.slice(power);     // Insert "." at the correct place into LH base
    if (baseLH.charAt(0) == deciSp) baseLH = "0" + baseLH;                // If decSep at LH most? => add "0"

  }
  // Rremove leading and trailing 0's and Return the long number (with sign)
  return parseFloat(sign + (baseLH + baseRH).replace(/^0*(\d+|\d+\.\d+?)\.?0*$/, "$1")).toFixed(precision);
})

let roundValuesOld = (exports.roundValuesOld = (num, precision) => {
  if (num.toString().indexOf("e") > -1) {
    num = num.toLocaleString("fullwide", { useGrouping: false });
    // const numChk = num.toLocaleString("fullwide", { useGrouping: false });
    // if (parseFloat(numChk) !== 0) {
    //   num = numChk;
    // }
  }
  var num1 = num.toString().split(".");
  var num2 = num1[0];
  if (num1.length == 2) {
    num2 = num2 + "." + num1[1].substring(0, precision);
  }
  return parseFloat(num2).toFixed(precision);
});

let getAdminAdress = (exports.getAdminAdress = async function (curncyRes) {
  let connectSymbol = curncyRes.currencySymbol;
  if (curncyRes.basecoin != "Coin") {
    connectSymbol = currencyToken(curncyRes.basecoin);
  }
  let address = "";
  if (connectSymbol && jsonrpc[connectSymbol.toLowerCase() + 'config']) {
    address = jsonrpc[connectSymbol.toLowerCase() + 'config'].AdminAddress;
  }
  console.log({ address, connectSymbol }, jsonrpc[connectSymbol.toLowerCase() + 'config']);
  return { address };
});

let walletBalance = (exports.walletBalance = async function (curncyRes) {
  let connectSymbol = curncyRes.currencySymbol;
  if (curncyRes.basecoin != "Coin") {
    connectSymbol = currencyToken(curncyRes.basecoin);
  }
  console.log("./CoinTransactions/" + connectSymbol + ".js");
  let GetCoin = require("./CoinTransactions/" + connectSymbol + ".js");
  const balance = await GetCoin.adminBalance(curncyRes);
  return balance;
});
exports.Coindeposit = async function (Cursymbol, userId, reqBody = {}) {
  const GetCoin = require("./CoinTransactions/" + Cursymbol + ".js");
  const AddressDet = await GetCoin.CoinDeposit(userId, reqBody);
  return AddressDet;
};

exports.TokenDeposit = async function (Cursymbol, userId) {
  const GetCoin = require("./CoinTransactions/" + Cursymbol + ".js");
  const AddressDet = await GetCoin.TokenDeposit(userId);
  return AddressDet;
};
let currencyToken = (exports.currencyToken = function (currencyType) {
  const tokens = {
    ERC20: "ETH",
    // 'MATIC20': 'MATIC',
    BEP20: "BNB",
    TRC20: "TRX",
  };
  return typeof tokens[currencyType] == "string" ? tokens[currencyType] : "";
});
exports.generatePassword = (length) => {
  let charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    retVal = "";
  for (var i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  return retVal;
};
exports.userNotification = async function (userId, content, content1) {
  return true;
  const userlogdata = { userId: userId, content: content, content1: content1 };
  userAppPushNotification(userId, content1);
  await query_helper.insertData(Notification, userlogdata);
  return true;
};

exports.userNotify = async function (data = {}) {
};

let userAppPushNotification = (exports.userAppPushNotification = async function (userId, content1) {
  // let profile = await query_helper.findoneData(
  //   Users,
  //   { _id: mongoose.Types.ObjectId(userId) },
  //   {}
  // );
  // if (profile.status) {
  //   if (profile.msg.oneSignalId) {
  //     var options = {
  //       method: "POST",
  //       url: "https://onesignal.com/api/v1/notifications",
  //       headers: {
  //         Authorization:
  //           "Basic ",
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         app_id: "",
  //         contents: {
  //           en: content1,
  //         },
  //         channel_for_external_user_ids: "push",
  //         include_player_ids: [profile.msg.oneSignalId],
  //       }),
  //     };
  //     request(options, function (error, response) {
  //       if (error) {
  //         console.log("Error in Push Notification API");
  //       }
  //     });
  //   } else {
  //     // console.log("Error to send Push Notification Becuase Id not Avaiablable," + userId)
  //   }
  // } else {
  //   // console.log("Error to send Push Notification,User Not Found" + userId)
  // }
});
exports.adminactivtylog = async function (
  req,
  typelog,
  adminuseridlog,
  lastId,
  remarklog,
  commentlog
) {
  let browserlog = "";
  if (req != "") {
    let ua = req.headers["user-agent"];
    ua = ua.toLowerCase();
    if (/firefox/i.test(ua)) browserlog = "Firefox";
    else if (/chrome/i.test(ua)) browserlog = "Chrome";
    else if (/safari/i.test(ua)) browserlog = "Safari";
    else if (/msie/i.test(ua)) browserlog = "msie";
    else browserlog = "unknown";
  }
  let iplog = "";
  if (req != "") {
    iplog =
      typeof req.headers["x-forwarded-for"] == "string"
        ? req.headers["x-forwarded-for"]
        : req.headers["cf-connecting-ip"];
  }
  const adminlogdata = {
    ip: iplog,
    browser: browserlog,
    type: typelog,
    adminuserid: adminuseridlog,
    lastId: lastId,
    remark: remarklog,
    comment: commentlog,
  };
  await query_helper.insertData(subadminactvitylog, adminlogdata);
  return true;
};
exports.p2pactivtylog = async function (
  userId,
  ownerId,
  orderNo,
  orderId,
  typelog,
  commentlog
) {
  const p2plogdata = {
    userId: userId,
    ownerId: ownerId,
    orderNo: orderNo,
    orderId: orderId,
    type: typelog,
    comment: commentlog,
  };
  await query_helper.insertData(P2PActivityLog, p2plogdata);
  return true;
};
exports.mobileSMS = async function (phoneno, type) {
  try {
    if(config.sendSMS) {
      if(config.sendSMS.enable) {
        if(config.sendSMS.name == "twilio") {
          await clientTwilio.messages.create({
            from: config.twilio.phone,
            to: phoneno,
            body: type,
          });
          return true;
        }
        else if(config.sendSMS.name == "plivo") {
          const senderId = config.plivo.senderId;
  
          clientPlivo.messages.create({
            src: senderId,
            dst: phoneno,
            text: type,
          }).then(function(response) {
            if (response) {
              return response;
            } else {
              return true;
            }
          });
        }
      }
      else {
        return true;
      }
    }
    else {
      return true;
    }
  } catch (err) {
    console.log("mobileSMS : ", err);
    return true;
  }
};

exports.isEmpty = (value) =>
  value === undefined ||
  value === null ||
  (typeof value === "object" && Object.keys(value).length === 0) ||
  (typeof value === "string" && value.trim().length === 0);

exports.otpExpireCheck = function (data = {}) {
  let { start = "" } = data;
  const startDateTime = new Date(start);
  const endDateTime = new Date();
  const diffInSeconds =
    (endDateTime.getTime() - startDateTime.getTime()) / 1000;
  if (diffInSeconds > config.timer.resendOtp) {
    return false;
  } else {
    return true;
  }
};

exports.toFixed = (item, type = 2) => {
  try {
    if (!this.isEmpty(item) && !isNaN(item)) {
      item = parseFloat(item)
      item = item.toFixed(type)
      return parseFloat(item)
    }
    return ''
  } catch (err) {
    return ''
  }
}

exports.checkReCaptcha = (request, res, next) => {
  if(config.CAPTCHA_STATUS == "Enable") {
    let {
      body:bodyData = {}
    } = request;
    let {
      reCatpchaVal = ""
    } = bodyData;
    const response_key = reCatpchaVal;
    const secret_key = config.google.recaptcha.SECRET_KEY;

    if(response_key == "") {
      return res.status(200).json({ "status": false, "message": "Captcha is required." });
    }
    // return res.status(200).json({ "status": false, "message": "Captcha Failed, Please Try again later." });

    const url =
    `https://www.google.com/recaptcha/api/siteverify?secret=${secret_key}&response=${response_key}`;

    const data = JSON.stringify({});
    const axiosConfig = {
      method: 'post',
      url: url,
      data : data
  };

    axios(axiosConfig)
    .then(async function (response) {
      console.log("checkReCaptcha : ", {response: response.data});
      if (response && response.data && response.data.success == true) {
        next();
      } else {
        return res.status(200).json({ "status": false, "message": "Captcha Failed, Try again." });
      }
    })
    .catch(function (error) {
      // console.log("checkReCaptcha : ", {error});
      return res.status(200).json({ "status": false, "message": "Captcha Failed, Please Try again later." });
    });
  }
  else {
    next();
  }
}

exports.getOTPCode = async (data = {}) => {
  let genotp = Math.floor(100000 + Math.random() * 900000);
  if(data.from == "user" && data.userData && data.userData.otpDisable == 1) {
    genotp = 123456;
  }
  return genotp;
}

/**
 * @description create a new crypto loan balance updation 
 * @param {Object} cryptoLoanBalanceBody
 * @returns {Promise<UserIdoForm>}
 */
exports.cryptoLoanCollateralBalance = async (
  userId,
  currencyId,
  amount,
  balance,
  lastId,
  type
) => {
  //** crypto-loan-balance-updation db will be created here */
  const balanceUpdations = {
    userId: mongoose.mongo.ObjectId(userId),
    currencyId: mongoose.mongo.ObjectId(currencyId),
    amount: roundValues(amount, 8),
    difference: roundValues(amount - balance, 8),
    oldBalance: roundValues(balance, 8),
    lastId: lastId,
    type: type,
  };
  //** crypto loan balance created */ 
  const CryptoBalance = await CryptoLoanBalanceUpdation.create(balanceUpdations);
  return CryptoBalance;
};

exports.cryptoLoanBorrowBalance = async (
  userId,
  currencyId,
  amount,
  balance,
  lastId,
  type
) => {

  //** crypto-loan-balance-updation db will be created here */
  const balanceUpdations = {
    userId: mongoose.mongo.ObjectId(userId),
    currencyId: mongoose.mongo.ObjectId(currencyId),
    amount: roundValues(amount, 8),
    difference: roundValues(amount - balance, 8),
    oldBalance: roundValues(balance, 8),
    lastId: lastId,
    type: type,
  };
  //** crypto loan balance created */ 
  const CryptoBalance = await CryptoLoanBalanceUpdation.create(balanceUpdations);
  return CryptoBalance;
};

//** crypto loan amount updated in user wallet and create a new crypto loan balance updation */
exports.updateCryptoLoanAmount = async (
  userId,
  currencyId,
  amount,
  lastId,
  type,
  extdata = {}
) => {
  const wallet_data = await queryHelper.findoneData(
    UserWallet,
    {
      userId: mongoose.mongo.ObjectId(userId),
      currencyId: mongoose.mongo.ObjectId(currencyId),
    },
    {}
  );
  let balance = 0;
  if (wallet_data.status) {
    balance = wallet_data.msg.cryptoLoanAmount;
  }
  const updations = {
    userId: mongoose.mongo.ObjectId(userId),
    currencyId: mongoose.mongo.ObjectId(currencyId),
    amount: roundValues(amount, 8),
    difference: roundValues(amount - balance, 8),
    oldBalance: roundValues(balance, 8),
    lastId: lastId,
    type: type,
    notes: extdata.notes ? JSON.stringify(extdata.notes) : "",
  };
  const CryptoLoan = await queryHelper.insertData(CryptoLoanBalanceUpdation, updations);
  await queryHelper.updateData(
    UserWallet,
    "one",
    {
      userId: mongoose.mongo.ObjectId(userId),
      currencyId: mongoose.mongo.ObjectId(currencyId),
    },
    { cryptoLoanAmount: +roundValues(+amount, 8) }
  );
  if (CryptoLoan && CryptoLoan.status && CryptoLoan.msg && CryptoLoan.msg._id) {
    return CryptoLoan.msg._id;
  }
  return true;
};

exports.loanActivityLogs = async (
  userId,
  ownerId,
  orderNo,
  orderId,
  typelog,
  commentlog
) => {
  const loanActivityData = {
    userId: userId,
    ownerId: ownerId,
    orderNo: orderNo,
    orderId: orderId,
    type: typelog,
    comment: commentlog
  };
  await queryHelper.insertData(LoanActivityLogs, loanActivityData);
  return true;
};
