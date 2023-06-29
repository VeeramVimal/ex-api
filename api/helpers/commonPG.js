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
const accountSid = config.twilio.accountSid;
const authToken = config.twilio.authToken;
const client = require("twilio")(accountSid, authToken);
// const CryptoLoanBalanceUpdation = mongoose.model("CryptoLoanBalanceUpdation");
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

exports.getBlockNumberPG = async function (Cursymbol, reqBody = {}) {
  const GetCoin = require("./CoinTransactionsPG/" + Cursymbol + ".js");
  const resp = await GetCoin.getBlockNumberPG(reqBody);
  return resp;
};

exports.CreateAddressPG = async function (Cursymbol, user_id, callback) {
  const GetCoin = require("./CoinTransactionsPG/" + Cursymbol + ".js");
  console.log("GetCoin : ", GetCoin);
  GetCoin.CreateAddressPG(user_id, function (addressDet) {
    callback(addressDet);
  });
};

exports.CreateAdminAddressPG = async function (Cursymbol, user_id, callback) {
  const GetCoin = require("./CoinTransactionsPG/" + Cursymbol + ".js");
  console.log("GetCoin : ", GetCoin);
  GetCoin.CreateAdminAddressPG(function (addressDet) {
    callback(addressDet);
  });
};

exports.CoinDepositPG = async function (
  Cursymbol,
  GetuserID = "",
  reqBody = {}
) {
  const GetCoin = require("./CoinTransactionsPG/" + Cursymbol + ".js");
  const AddressDet = await GetCoin.CoinDepositPG(reqBody);
  return AddressDet;
};

let BalanceCheckPG = (exports.BalanceCheckPG = async function (
  transresult,
  callback
) {
  try {
    const currencySymbol = transresult.currencySymbol;
    const contractAddress = transresult.contractAddress;
    const symbol = contractAddress ? contractAddress : currencySymbol;

    let GetCoin = require("./CoinTransactionsPG/" + currencySymbol + ".js");
    GetCoin.BalanceCheckPG(symbol, transresult, function (balRes, balAmt) {
      if (balRes) {
        callback({ status: true, balAmt });
      }
      else {
        callback({ status: false, balAmt: 0 });
      }
    });
  } catch (e) {
    console.log("CoinWithdrawPG", e);
    callback({ status: false, txnId: "", Tstatus: 3 });
  }
});

let CoinWithdrawPG = (exports.CoinWithdrawPG = async function (
  transresult,
  callback
) {
  try {
    const currencySymbol = transresult.currencySymbol;
    const contractAddress = transresult.contractAddress;
    const symbol = contractAddress ? contractAddress : currencySymbol;

    let GetCoin = require("./CoinTransactionsPG/" + currencySymbol + ".js");
    GetCoin.BalanceCheckPG(symbol, transresult, function (balRes, balAmt) {
      console.log({ balRes, transresult });
      if (balRes) {
        // callback({ status: true, txnId: "", message: "allow" });
        GetCoin.CoinwithdrawPG(symbol, transresult, function (txnId) {
          if (txnId) {
            callback({ status: true, txnId: txnId });
          } else {
            callback({ status: false, txnId: "" });
          }
        });
      }
      else {
        callback({ status: false, txnId: "", message: "Insufficient balance", balance: balAmt });
      }
    });
  } catch (e) {
    console.log("CoinWithdrawPG", e);
    callback({ status: false, txnId: "", Tstatus: 3 });
  }
});

let TokenWithdrawPG = (exports.TokenWithdrawPG = async function (
  transresult,
  callback
) {
  try {
    const currencySymbol = transresult.currencySymbol;
    let GetCoin = require("./CoinTransactionsPG/" + currencySymbol + ".js");
    GetCoin.TokenwithdrawPG(currencySymbol, transresult, function (txnId) {
      if (txnId) {
        callback({ status: true, txnId: txnId });
      } else {
        callback({ status: false, txnId: "" });
      }
    });
  } catch (e) {
    console.log("TokenWithdrawPG", e);
    callback({ status: false, txnId: "", Tstatus: 3 });
  }
});