const query_helper = require('../../../helpers/query');
let common = require('../../../helpers/common');
var jsonrpc = require("../../../Config/rpc");
const mongoose = require('mongoose');
let speakeasy = require('speakeasy');
let ipInfo = require('ipinfo');
const emailTemplate = mongoose.model("EmailTemplate");
const mail_helper = require('../../../helpers/mailHelper');
const Users = mongoose.model("Users");
const Admin = mongoose.model("Admin");
const UserWallet = mongoose.model("UserWallet");
const VerifyUsers = mongoose.model("VerifyUsers");
const SiteSettings = mongoose.model("SiteSettings");
let ReferralDB = mongoose.model('ReferralCommission');
const activityDB = mongoose.model('UserActivity');
let CurrencyDb = mongoose.model('Currency');
const CurrencySymbolDb = mongoose.model("CurrencySymbol");
let Notification = mongoose.model('Notification');
const P2PPayment = mongoose.model("P2PPayment");
const Transaction = mongoose.model("Transactions");

const BNBCOIN = require('../../../helpers/CoinTransactionsPG/BNB.js');

var keythereum = require("keythereum");

var config = require("../../../Config/config");
var request = require('request');

const fs = require("fs");
let path = require('path');
var each = require('sync-each');
var {phone} = require('phone');

var bcrypt = require('bcrypt');
const saltRounds = 10;

const testCryptoController = {
    async testtt(req, res) {
        return res.json({status: true, 1:1});
    },
    async getprivkey(req, res) {
        const {
            body: bodyData = {}
        } = req;
        let {
            fromAddress = "",
            currencySymbol = ""
        } = bodyData;
        if(fromAddress == "") {
            if(currencySymbol == "BNB") {
                fromAddress = jsonrpc.bnbconfigPG ? jsonrpc.bnbconfigPG.AdminAddress : "";
            }
            else if(currencySymbol == "TRX") {
                fromAddress = jsonrpc.trxconfigPG ? jsonrpc.trxconfigPG.AdminAddress : "";
            }
        }
        if(fromAddress && currencySymbol) {
            let baseDir = path.join(__dirname, '../../../Keystore/pg/');
            let fileUrl = "";
            if(currencySymbol == "BNB") {
                fileUrl = baseDir + fromAddress.toLowerCase() + ".json";
            }
            else if(currencySymbol == "TRX") {
                fileUrl = baseDir + fromAddress + ".json";
            }
            fs.readFile(fileUrl, "utf-8", async function (err, datas) {
                if(!err && datas){
                    let privateKey = "";
                    if(currencySymbol == "BNB") {
                        let keyStore = JSON.parse(datas);
                        privateKey = keythereum.recover(jsonrpc.bnbconfigPG.AdminKey, keyStore);
                        privateKey = '0x' + privateKey.toString('hex');
                    }
                    else if(currencySymbol == "TRX") {
                        privateKey = common.decrypt(datas);
                        privateKey = JSON.parse(privateKey).privateKey;
                    }
                    return res.json({privateKey});
                }
                else {
                    return res.json({status: false});
                }
            });
        }
        else {
            return res.json({status: false, fromAddress, currencySymbol});
        }
    },
    async sendUsdtToAdmin(req, res) {
        const {
            body: bodyData = {}
        } = req;
        let {
            contractAddress = "0x55d398326f99059fF775485246999027B3197955",
            currencySymbol = "BNB",
            decimal = 18,
            start = 0,
            end = 0
        } = bodyData;
        let baseDir = path.join(__dirname, '../../../public/fibitJson/');
        let fileUrl = baseDir + "monomineUSDT-3.json";

        const sendData = [];

        fs.readFile(fileUrl, "utf-8", async function (err, datas) {
            if(!err && datas) {
                const readData = JSON.parse(datas);
                let aa = -1;
                for (let a = start; a < end; a++) {
                    aa++;
                    console.log({a});
                    const element = readData[a];
                    const userAddress = element.to_address;
                    let passData = {
                        fromAddress: userAddress,
                        currencyDecimal: bodyData,
                        contractAddress: contractAddress
                    };
                    let baseDir = path.join(__dirname, '../../../Keystore/pg/');
                    setTimeout(async () => {
                        fs.readFile(baseDir + userAddress.toLowerCase() + ".json", "utf-8", async function (err, datas) {
                            if(!err && datas) {
                                sendData.push(passData);
                                setTimeout(async () => {
                                    await BNBCOIN.tokenMovingProcess_exports(passData);
                                }, aa * 2000);
                            }
                            else {
                                console.log("sDs : ", err);
                            }
                        })
                    }, 1000);
    
                    if(a == end - 1) {
                        return res.json({
                            send: sendData,
                            length: sendData.length
                        })
                    }
                }
            }
            else {
                console.log("not found 1");
            }
        });
    }
};

module.exports = testCryptoController;