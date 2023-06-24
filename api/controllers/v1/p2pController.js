const query_helper = require('../../helpers/query');
let common = require('../../helpers/common');
const mongoose = require('mongoose');
let speakeasy = require('speakeasy');
const emailTemplate = mongoose.model("EmailTemplate");
const mail_helper = require('../../helpers/mailHelper');
const p2pHelper = require('../../helpers/p2p');
const Admin = mongoose.model("Admin");
const Users = mongoose.model("Users");
const P2PPayment = mongoose.model("P2PPayment");
const P2POrder = mongoose.model("P2POrder");
const P2PPair = mongoose.model("P2PPair");
let CurrencyDb = mongoose.model('Currency');
const P2PTransactions = mongoose.model("P2PTransactions");
const P2PAppealHistory = mongoose.model("P2PAppealHistory");
const P2PFeedBack = mongoose.model("P2PFeedBack");
const P2PReport = mongoose.model("P2PReport");
const P2PAllPayments = mongoose.model("P2PAllPayments");
const P2PSettings = mongoose.model("P2PSettings");
const P2PFaqDb = mongoose.model("P2PFaq");
const P2PActivityLog = mongoose.model("P2PActivityLog");

const commonHelper = require('../../helpers/common');
const kycHelper = require("../../helpers/kycHelper");
const bankController = require('../v2/bankController');

let getJSON = require('get-json');
var config = require("../../Config/config");
let request = require('request');
var axios = require('axios');

const p2pController = {
    async getPayment(req, res) {
        try {
            let payment = await query_helper.findoneData(P2PPayment, { userId: mongoose.Types.ObjectId(req.userId) }, {})
            if (payment.status) {
                if (payment.msg && payment.msg.methods.length > 0) {
                    const userActivePayment = payment.msg.methods.filter(elem => elem.status != 2)
                    res.json({ "status": true, "message": 'payment details', data: userActivePayment });
                }
            } else {
                res.json({ "status": false, "message": 'Not a valid payment!' });
            }
        } catch (e) {
            console.log('getPayment', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time!" });
        }
    },
    async getPayment(req, res) {
        try {
            let payment = await query_helper.findoneData(P2PPayment, { userId: mongoose.Types.ObjectId(req.body.userId) }, {})
            if (payment.status) {
                if (payment.msg && payment.msg.methods.length > 0) {
                    const userActivePayment = payment.msg.methods.filter(elem => elem.status != 4)
                    res.json({ "status": true, "message": 'payment details', data: userActivePayment });
                }
            } else {
                res.json({ "status": false, "message": 'Not a valid payment!' });
            }
        } catch (e) {
            console.log('getPayment', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time!" });
        }
    },
    async getadsP2PPayment(req,res){
        try {
            let payment = await query_helper.findoneData(P2PPayment, { userId: mongoose.Types.ObjectId(req.userId) }, {})
            if (payment.status) {
                if (payment.msg && payment.msg.methods.length > 0) {
                    const userActivePayment = payment.msg.methods.filter(elem => elem.status == 1)
                    res.json({ "status": true, "message": 'payment details', data: userActivePayment });
                }
            } else {
                res.json({ "status": false, "message": 'Not a valid payment!' });
            }
        } catch (e) {
            console.log('getPayment', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time!" });
        }
    },
    async getParticularPaymentList(req, res) {
        try {
            let payment = await query_helper.findoneData(P2PAllPayments, { _id: mongoose.Types.ObjectId(req.body.paymentId) }, {});
            if (payment.status) {
                res.json({ "status": true, "message": 'payment details', data: payment.msg });
            } else {
                res.json({ "status": false, "message": 'Not a valid payment!' });
            }
        } catch (e) {
            console.log('getPayment', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time!" });
        }
    },
    async getmyParticularPaymentList(req, res) {
        try {
            let payment = await query_helper.findoneData(P2PPayment, { "methods._id": mongoose.Types.ObjectId(req.body.paymentId)}, {})
            if (payment.status) {
                let data = payment.msg;
                let array = []
                data.methods.length > 0 && data.methods.forEach(element => {
                    if (element._id == req.body.paymentId) {
                        array.push(element)
                    }
                });
                res.json({ "status": true, "message": 'payment details', 'data': array });
            } else {
                res.json({ "status": false, "message": 'Not a valid payment!' });
            }
        } catch (e) {
            console.log('getPayment', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time!" });
        }
    },
    async getallPayments(req, res) {
        try {
            let payment = await query_helper.findData(P2PAllPayments, { status: 1 }, { _id: -1, name: 1, symbol: 1, status: 1 }, { _id: -1 }, 0)
            res.json({ status: true, data: payment.msg });
        } catch (e) {
            console.log('getallPayments', e);
            res.json({ "status": false, "data": [], "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getbuyerPaymentMethods(req, res) {
        try {
            let payment = await query_helper.findoneData(P2PPayment, { userId: mongoose.Types.ObjectId(req.userId)}, {});
            if (payment.status) {
                let data = payment.msg;
                let paymentData = []
                data.methods.length > 0 && data.methods.forEach(element => {
                    if (element.status == 1) {
                        paymentData.push(element)
                    }
                });
                res.json({ status: true, data: paymentData });
            } else {
                res.json({ status: false, data: "No payment methods" });
            }
        } catch (err) { }
    },
    async getPaymentDetails(req, res) {
        try {
            let payment = await query_helper.findoneData(P2PPayment, { "methods._id": mongoose.Types.ObjectId(req.body.paymentId), "methods.status": 1 }, {})
            if (payment.status) {
                let data = payment.msg;
                let array = []
                data.methods.length > 0 && data.methods.forEach(element => {
                    if (element._id == req.body.paymentId) {
                        array.push(element)
                    }
                });
                res.json({ "status": true, "message": 'payment details', data: array });
            } else {
                res.json({ "status": false, "message": 'Not a valid payment!' });
            }
        } catch (e) {
            console.log('getPaymentDetails', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time!" });
        }
    },
    async getp2pPair(req, res) {
        try {
            let pair = await query_helper.findoneData(P2PPair, { pair: req.body.pair }, {})
            if (pair.status) {
                res.json({ "status": true, "message": 'pair details', data: pair.msg });
            } else {
                res.json({ "status": false, "message": 'Not a valid pair!' });
            }
        } catch (e) {
            console.log('getp2pPair', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time!" });
        }
    },
    async getallPairs(req, res) {
        try {
            const {
                reqUserData = {},
                kycUserType = "IND"
            } = req;

            let pairFinddata  = { status: 1 };

            if(kycUserType == "International") {
                let currencyData = await query_helper.findoneData(CurrencyDb, { currencySymbol: "INR" }, {})
                if(currencyData && currencyData.status && currencyData.msg) {
                    pairFinddata.toCurrency = {"$ne": currencyData.msg._id}
                }
            }

            let pairs = await P2PPair.find(pairFinddata, { _id: -1, pair: 1 })
            .sort({ _id: 1 })
            .populate("fromCurrency", "currencySymbol image currencyId siteDecimal currencySymbolCode").populate("toCurrency", "currencySymbol image currencyId siteDecimal currencySymbolCode");

            let pairsData = [], pairObj = {};
            pairs.forEach((entry) => {
                if (typeof pairObj[entry.toCurrency.currencySymbol] != 'object') {
                    pairObj[entry.toCurrency.currencySymbol] = [];
                }
                pairObj[entry.toCurrency.currencySymbol].push(entry);
            });
            for (var key in pairObj) {
                pairsData.push({currency: key, pairs: pairObj[key]});
            }
            return res.json({ status: true, message: "User balance", data: pairsData })
        } catch (err) { }
    },
    async getBalance(req, res) {
        try {
            let usdtResult = await query_helper.findoneData(CurrencyDb, { _id: mongoose.Types.ObjectId(req.body.currencyId) }, { currencyId: 1 });
            if (usdtResult.status) {
                let walletOutput = await common.getbalance(req.userId, usdtResult.msg.currencyId);
                if (walletOutput) {
                    return res.json({ status: true, message: "User balance", data: walletOutput })
                } else {
                    return res.json({ status: true, message: "User balance error", data: { amount: 0 } })
                }
            } else {
                return res.json({ status: true, message: "Currency id error", data: { amount: 0 } })
            }
        } catch (err) {
            console.log('getBalance', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time!" });
        }
    },
    async addPayment(req, res) {
        try {
            const orderwith = oArray.indexOf(req.userId.toString());
            if (orderwith == -1) {
                oArray.push(req.userId.toString())
                setTimeout(_intervalFunc, 5000, req.userId.toString());
                let userResult = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.userId) }, {});
                if (userResult.status) {
                    userResult = userResult.msg;
                    let reqBody = req.body;
                    let holderName = reqBody.holderName;
                    let accountNo = reqBody.accountNo;
                    let ifscCode = reqBody.ifscCode;
                    let bankName = reqBody.bankName;
                    let accountType = reqBody.accountType;
                    let paymenttype = reqBody.paymenttype;
                    // let branch = reqBody.branch;
                    // let UPIID = reqBody.UPIID;
                    // let paymentmethodId = reqBody.paymentmethodId;
                    // let paymentId = reqBody.paymentId;
                    let attachment = reqBody.attachment;

                    const {
                        era_domain = "",
                        token: kycToken = "",
                        bankApi = "",
                        panLite = "",
                        upiApi = ""
                    } = config.kyc;
                    const optUrl = era_domain+bankApi;
                    const optUPIUrl = era_domain+upiApi;

                    const {
                        branch,
                        UPIID,
                        paymentId,
                        paymentmethodId
                    } = reqBody;
                    if (userResult.kycstatus == 1 && typeof userResult.tfaenablekey != "undefined" && typeof userResult.tfaenablekey != undefined && userResult.tfaenablekey != '') {
                        let token = speakeasy.totp.verify({
                            secret: userResult.tfaenablekey,
                            encoding: 'base32',
                            token: reqBody.OTPCode
                        });
                        if (token) {
                            let paymentData = {};
                            let updateData = {};
                            if ((paymenttype == 'IMPS') || (paymenttype == 'Bank')) {
                                paymentData = {
                                    userId: req.userId,
                                    methods: {
                                        attachment: "",
                                        paymentmethodId: paymentmethodId,
                                        userId: req.userId,
                                        paymenttype: paymenttype,
                                        holderName: holderName,
                                        accountNo: accountNo,
                                        ifscCode: ifscCode,
                                        bankName: bankName,
                                        accountType: accountType,
                                        branch: branch,
                                        createdDate: new Date()
                                    }
                                }
                            }
                            else {
                                paymentData = {
                                    userId: req.userId,
                                    methods: {
                                        attachment: attachment,
                                        paymentmethodId: paymentmethodId,
                                        userId: req.userId,
                                        paymenttype: paymenttype,
                                        holderName: holderName,
                                        accountNo: accountNo,
                                        upiId: UPIID,
                                        createdDate: new Date()
                                    }
                                }
                            }
                           
                            let userStatus = await query_helper.findoneData(P2PPayment, { userId: mongoose.Types.ObjectId(req.userId) }, {})
                            if (userStatus.status) {
                                let checkPayment = await P2PPayment.findOne({ 'methods._id': mongoose.Types.ObjectId(paymentId) });
                                if (checkPayment) {
                                    if (paymenttype == "Bank") {

                                        let status = 0;
                                        let name = "";
                                        let bankholderName = ""

                                        if (config.kyc.bankVerifyStatus != 'Disable') {
                                            let response = await kycHelper.bankVerify({
                                                accountNo, ifscCode
                                            });
                                            if(response && response.data && response.data.success && response.data.data && response.data.data.account_exists) {
                                                let username = userResult.username;
                                                if(username) {
                                                    username = username
                                                        .replace(/ /g, "")
                                                        .replace(/\./g, "");
                                                    username = username.toLowerCase();
                                                }
                                                bankholderName = response.data.data.full_name;

                                                if(bankholderName) {
                                                    name = bankholderName;
                                                    bankholderName = bankholderName
                                                        .replace(/ /g, "")
                                                        .replace(/\./g, "");
                                                        bankholderName = bankholderName.toLowerCase();
                                                }
                                                if(username == bankholderName) {
                                                    status = 1;
                                                }
                                                else {
                                                    status = 0;
                                                }
                                            }
                                            else {
                                                return res.json({ "status": false, "message": "Verification failed, Please try again." });
                                            }
                                        }
                                        else {
                                            let username = userResult.username;
                                            bankholderName = username;
                                            status = 1;
                                            const paymentLengthChk = userStatus.msg.methods.filter(elem => elem.accountNo == accountNo && elem.status == 1);
                                            if (paymentLengthChk && paymentLengthChk.length > 5 ){
                                                status = 0;
                                            }
                                        }
                                            
                                        updateData = {
                                            "userId": req.userId,
                                            "methods.$.attachment": "",
                                            "methods.$.paymentmethodId": paymentmethodId,
                                            "methods.$.userId": req.userId,
                                            "methods.$.paymenttype": paymenttype,
                                            "methods.$.holderName": bankholderName,
                                            "methods.$.accountNo": accountNo,
                                            "methods.$.ifscCode": ifscCode,
                                            "methods.$.accountType": accountType,
                                            "methods.$.branch": branch,
                                            "methods.$.status": status,
                                            "methods.$.updatedDate": new Date()   
                                        }
                                        let data = await P2PPayment.findOneAndUpdate({ 'methods._id': mongoose.Types.ObjectId(paymentId) }, { $set: updateData }, { new: true });
                                        if (data) {
                                            await bankController.afterBankDetailUpd(req, res);
                                            let email_data = await query_helper.findoneData(emailTemplate, { hint: 'p2p-updated-payment' }, {});
                                            if (email_data.status) {
                                                let etempdataDynamic = email_data.msg.content.replace(/###NAME###/g, reqBody.paymenttype);
                                                mail_helper.sendMail({ subject: email_data.msg.subject, to: userResult.email, html: etempdataDynamic }, function (res1) {
                                                    res.json({ status: true, message: "Payment Updated Successfully", data: data })
                                                });
                                            } else {
                                                res.json({ status: false, message: "Oops! Something went wrong.Please try again" })
                                            }
                                        } else {
                                            res.json({ status: true, message: "Payment Updated Failed" })
                                        }
                                        
                                    } else {
                                        let status = 0;
                                        let upiHolderName = "";
                                        let username = userResult.username;

                                        if (config.kyc.upiVerifyStatus != 'Disable') {
                                            let response = await kycHelper.upiVerify({
                                                UPIID
                                            });
                                            if(response && response.data && response.data.success && response.data.data && response.data.data.account_exists) {
                                                if(username) {
                                                    username = username
                                                        .replace(/ /g, "")
                                                        .replace(/\./g, "");
                                                    username = username.toLowerCase();
                                                }

                                                upiHolderName = response.data.data.full_name;
                                                paymentData.methods.holderName = "";

                                                if(upiHolderName) {
                                                    paymentData.methods.holderName = upiHolderName;
                                                    upiHolderName = upiHolderName
                                                        .replace(/ /g, "")
                                                        .replace(/\./g, "");
                                                    upiHolderName = upiHolderName.toLowerCase();
                                                }
                                                if(username == upiHolderName) {
                                                    status = 1;
                                                }
                                                else {
                                                    status = 0;
                                                }
                                            }
                                            else {
                                                return res.json({ "status": false, "message": "Verification failed, Please try again." });
                                            }
                                        }
                                        else {
                                            upiHolderName = username;
                                            status = 1;
                                            const paymentLengthChk = userStatus.msg.methods.filter(elem => elem.upiId == UPIID && elem.status == 1);
                                            if (paymentLengthChk && paymentLengthChk.length > 5 ){
                                                status = 0;
                                            } 
                                        }

                                        updateData = {
                                            "userId": req.userId,
                                            "methods.$.attachment": attachment,
                                            "methods.$.paymentmethodId": paymentmethodId,
                                            "methods.$.userId": req.userId,
                                            "methods.$.paymenttype": paymenttype,
                                            "methods.$.holderName": upiHolderName,
                                            "methods.$.accountNo": accountNo,
                                            "methods.$.upiId": UPIID,
                                            "methods.$.status": status,
                                            "methods.$.updatedDate": new Date()   
                                        }
                                        let data = await P2PPayment.findOneAndUpdate({ 'methods._id': mongoose.Types.ObjectId(paymentId) }, { $set: updateData }, { new: true });
                                        if (data) {
                                            await bankController.afterBankDetailUpd(req, res);
                                            let email_data = await query_helper.findoneData(emailTemplate, { hint: 'p2p-updated-payment' }, {});
                                            if (email_data.status) {
                                                let etempdataDynamic = email_data.msg.content.replace(/###NAME###/g, reqBody.paymenttype);
                                                mail_helper.sendMail({ subject: email_data.msg.subject, to: userResult.email, html: etempdataDynamic }, function (res1) {
                                                    res.json({ status: true, message: "Payment Updated Successfully", data: data })
                                                });
                                            } else {
                                                res.json({ status: false, message: "Oops! Something went wrong.Please try again" })
                                            }
                                        } else {
                                            res.json({ status: true, message: "Payment Updated Failed" })
                                        }
                                    }
                                } else {
                                    if (paymenttype == "Bank") {

                                        let username = userResult.username;

                                        if (config.kyc.bankVerifyStatus != 'Disable') {
                                            let response = await kycHelper.bankVerify({
                                                accountNo, ifscCode
                                            });

                                            if(response && response.data && response.data.success && response.data.data && response.data.data.account_exists) {
                                                if(username) {
                                                    username = username
                                                        .replace(/ /g, "")
                                                        .replace(/\./g, "");
                                                    username = username.toLowerCase();
                                                }

                                                let bankName = response.data.data.full_name;
                                                paymentData.methods.holderName = "";

                                                if(bankName) {
                                                    paymentData.methods.holderName = bankName;
                                                    bankName = bankName
                                                        .replace(/ /g, "")
                                                        .replace(/\./g, "");
                                                    bankName = bankName.toLowerCase();
                                                }
                                                if(username == bankName) {
                                                    paymentData.methods.status = 1;
                                                }
                                                else {
                                                    paymentData.methods.status = 0;
                                                }
                                            }
                                            else {
                                                return res.json({ "status": false, "message": "Verification failed, Please enter correct bank details." });;
                                                // return res.json({ "status": false, "message": "Verification failed, Please try again." });
                                            }
                                        }
                                        else {
                                            paymentData.methods.holderName = username;
                                            paymentData.methods.status = 1;
                                            const paymentLengthChk = userStatus.msg.methods.filter(elem => elem.accountNo == accountNo && elem.status == 1);
                                            if (paymentLengthChk && paymentLengthChk.length > 5 ){
                                                paymentData.methods.status = 0;
                                            } 
                                        }
  
                                        let paymentStatus = await query_helper.findoneData(P2PPayment, { userId: mongoose.Types.ObjectId(req.userId) }, {});
                                        if (paymentStatus.status) {
                                            paymentStatus = paymentStatus.msg;
                                            const alreadyExits = paymentStatus.methods.filter(elem => elem.accountNo == accountNo && elem.status == 1);
                                            if (alreadyExits && alreadyExits.length > 0 ){
                                                return res.json({ status: false, message: "This bank details are already exits", data: alreadyExits });
                                            } 
                                        }
                                        const updatedData = await P2PPayment.findOneAndUpdate({ userId: mongoose.Types.ObjectId(req.userId) }, { $addToSet: { methods: paymentData.methods } }, { upsert: true, new: true });
                                        if (updatedData) {
                                            await bankController.afterBankDetailUpd(req, res);
                                            let email_data = await query_helper.findoneData(emailTemplate, { hint: 'p2p-added-payment' }, {});
                                            if (email_data.status) {
                                                let etempdataDynamic = email_data.msg.content.replace(/###NAME###/g, reqBody.paymenttype);
                                                res.json({ status: true, message: paymentData.methods.status == 1 ? "Bank Payment Added Successfully" : "Bank details request added successfully", data: updatedData });
                                                mail_helper.sendMail({ subject: email_data.msg.subject, to: userResult.email, html: etempdataDynamic }, function (res1) {
                                                });
                                            } else {
                                                res.json({ status: false, message: "Oops! Something went wrong.Please try again" })
                                            }
                                        } else {
                                            res.json({ status: false, message: "Payment Added Failed" })
                                        }
                                    } else {

                                        let username = userResult.username;

                                        if (config.kyc.upiVerifyStatus != 'Disable') {
                                            let response = await kycHelper.upiVerify({
                                                UPIID
                                            });
                                            if(response && response.data && response.data.success && response.data.data && response.data.data.account_exists) {
                                                if(username) {
                                                    username = username
                                                        .replace(/ /g, "")
                                                        .replace(/\./g, "");
                                                    username = username.toLowerCase();
                                                }
                                                let upiHolderName = response.data.data.full_name;
                                                paymentData.methods.holderName = "";

                                                if(upiHolderName) {
                                                    paymentData.methods.holderName = upiHolderName;
                                                    upiHolderName = upiHolderName
                                                        .replace(/ /g, "")
                                                        .replace(/\./g, "");
                                                        upiHolderName = upiHolderName.toLowerCase();
                                                }
                                                if(username == upiHolderName) {
                                                    paymentData.methods.status = 1;
                                                }
                                                else {
                                                    paymentData.methods.status = 0;
                                                }
                                            } else {
                                                return res.json({ "status": false, "message": "Verification failed, Please enter correct bank details." });; 
                                            }
                                        }
                                        else {
                                            paymentData.methods.holderName = username;
                                            paymentData.methods.status = 1;
                                            const paymentLengthChk = userStatus.msg.methods.filter(elem => elem.upiId == UPIID && elem.status == 1);
                                            if (paymentLengthChk && paymentLengthChk.length > 5 ){
                                                paymentData.methods.status = 0;
                                            }
                                        }

                                        let paymentStatus = await query_helper.findoneData(P2PPayment, { userId: mongoose.Types.ObjectId(req.userId) }, {});
                                        if (paymentStatus.status) {
                                            paymentStatus = paymentStatus.msg;
                                            const alreadyExits = paymentStatus.methods.filter(elem => elem.upiId == UPIID && elem.status == 1);
                                            if (alreadyExits && alreadyExits.length > 0 ){
                                                return res.json({ status: false, message: "This upi details are already exits", data: alreadyExits });
                                            } 
                                        }
                                        const updatedData = await P2PPayment.findOneAndUpdate({ userId: mongoose.Types.ObjectId(req.userId) }, { $addToSet: { methods: paymentData.methods } }, { upsert: true, new: true });
                                        if (updatedData) {
                                            await bankController.afterBankDetailUpd(req, res);
                                            let email_data = await query_helper.findoneData(emailTemplate, { hint: 'p2p-added-payment' }, {});
                                            if (email_data.status) {
                                                let etempdataDynamic = email_data.msg.content.replace(/###NAME###/g, reqBody.paymenttype);
                                                res.json({ status: true, message: paymentData.methods.status == 1 ? "UPI Payment Added Successfully" : "UPI details request added successfully", data: updatedData });
                                                mail_helper.sendMail({ subject: email_data.msg.subject, to: userResult.email, html: etempdataDynamic }, function (res1) {
                                                });
                                            } else {
                                                res.json({ status: false, message: "Oops! Something went wrong.Please try again" })
                                            }
                                        } else {
                                            res.json({ status: false, message: "Payment Added Failed" })
                                        }

                                    }
                                }
                            } else {
                                if (paymenttype == "Bank") {

                                    let username = userResult.username;

                                    if (config.kyc.bankVerifyStatus != 'Disable'){
                                        let response = await kycHelper.bankVerify({
                                            accountNo, ifscCode
                                        });

                                        if(response && response.data && response.data.success && response.data.data && response.data.data.account_exists) {
                                            if(username) {
                                                username = username
                                                    .replace(/ /g, "")
                                                    .replace(/\./g, "");
                                                username = username.toLowerCase();
                                            }

                                            let bankName = response.data.data.full_name;
                                            paymentData.methods.holderName = "";

                                            if(bankName) {
                                                paymentData.methods.holderName = bankName;
                                                bankName = bankName
                                                    .replace(/ /g, "")
                                                    .replace(/\./g, "");
                                                bankName = bankName.toLowerCase();
                                            }
                                            if(username == bankName) {
                                                paymentData.methods.status = 1;
                                            }
                                            else {
                                                paymentData.methods.status = 0;
                                            }
                                        } else {
                                            return res.json({ "status": false, "message": "Verification failed, Please enter correct bank details." });; 
                                        }
                                    } else {
                                        paymentData.methods.holderName = username;
                                        paymentData.methods.status = 1;
                                    }

                                    let payment = await query_helper.insertData(P2PPayment, paymentData);
                                    if (payment) {
                                        await bankController.afterBankDetailUpd(req, res);
                                        res.json({ "status": true, "message": paymentData.methods.status == 1 ? "Bank Payment Added Successfully" : "Bank details request added successfully" });
                                    } else {
                                        res.json({ "status": false, "message": payment.msg });
                                    }
                                    
                                } else {
                                    let username = userResult.username;

                                    if (config.kyc.upiVerifyStatus != 'Disable'){
                                        let response = await kycHelper.upiVerify({
                                            accountNo, UPIID
                                        });
                                        if(response && response.data && response.data.success && response.data.data && response.data.data.account_exists) {
                                            if(username) {
                                                username = username
                                                    .replace(/ /g, "")
                                                    .replace(/\./g, "");
                                                username = username.toLowerCase();
                                            }

                                            let upiHolderName = response.data.data.full_name;
                                            paymentData.methods.holderName = "";

                                            if(upiHolderName) {
                                                paymentData.methods.holderName = upiHolderName;
                                                upiHolderName = upiHolderName
                                                    .replace(/ /g, "")
                                                    .replace(/\./g, "");
                                                upiHolderName = upiHolderName.toLowerCase();
                                            }
                                            if(username == upiHolderName) {
                                                paymentData.methods.status = 1;
                                            }
                                            else {
                                                paymentData.methods.status = 0;
                                            }
                                        } else {
                                            return res.json({ "status": false, "message": "Verification failed, Please enter correct bank details." });; 
                                        }
                                    }
                                    else {
                                        paymentData.methods.holderName = username;
                                        paymentData.methods.status = 1;
                                    }

                                    let payment = await query_helper.insertData(P2PPayment, paymentData);
                                    if (payment) {
                                        await bankController.afterBankDetailUpd(req, res);
                                        res.json({ "status": true, "message": paymentData.methods.status == 1 ? "UPI Payment Added Successfully" : "UPI details request added successfully" });
                                    } else {
                                        res.json({ "status": false, "message": payment.msg });
                                    }
                                }
                            }
                        } else {
                            res.json({ status: false, message: "Invalid 2FA Code" });
                        }
                    } else {
                        res.json({ status: false, message: "Please complete " + (userResult.kycstatus != 1 ? "KYC" : "2FA") + " to process ads.", type: userResult.kycstatus != 1 ? "KYC" : "2FA" })
                    }
                } else {
                    res.json({ status: false, message: "Not a valid user" });
                }
            } else {
                setTimeout(_intervalFunc, 5000, req.userId.toString());
                res.json({ status: false, message: "Please wait for 5 seconds before placing another request!" });
            }
        } catch (e) {
            console.log('addPayment', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async deletePayemnt(req, res) {
        try {
            const orderwith = oArray.indexOf(req.userId.toString());
            if (orderwith == -1) {
                oArray.push(req.userId.toString())
                setTimeout(_intervalFunc, 5000, req.userId.toString());
                let userResult = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.userId) }, {});
                let userStatus = userResult.msg;
                if (userStatus.status) {
                    let reqBody = req.body;
                    let checkData = await P2PPayment.findOne({ 'methods._id': mongoose.Types.ObjectId(reqBody._id) })
                    if (checkData) { 
                        await P2PPayment.findOneAndUpdate({ 'methods._id': mongoose.Types.ObjectId(reqBody._id) }, { $set: { 'methods.$.status': 4 } }, { new: true },async function (err, result) {
                            if (result) {
                                let email_data = await query_helper.findoneData(emailTemplate, { hint: 'p2p-payment-deleted' }, {});
                                if (email_data.status) {
                                    let etempdataDynamic = email_data.msg.content.replace(/###NAME###/g);
                                    mail_helper.sendMail({ subject: email_data.msg.subject, to: userStatus.email, html: etempdataDynamic }, function (res1) {
                                        res.json({ status: true, message: "Payment Deleted Successfully", data: result })
                                    });
                                } else {
                                    res.json({ status: false, message: "Oops! Something went wrong.Please try again" })
                                }
                            } else {
                                res.json({ status: false, message: "Payment Deleted Failed" })
                            }
                        });
                    }
                } else {
                    res.json({ status: false, message: "Not valid user" })
                }
            } else {
                setTimeout(_intervalFunc, 5000, req.userId.toString());
                res.json({ status: false, message: "Please wait for 5 seconds before placing another request!" });
            }
        } catch (err) {
            console.log('deletePayemnt', err);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async deletemyAds(req, res) {
        try {
            const orderwith = oArray.indexOf(req.userId.toString());
            if (orderwith == -1) {
                oArray.push(req.userId.toString())
                setTimeout(_intervalFunc, 5000, req.userId.toString());
                let myadsStatus = await query_helper.findoneData(P2POrder, { _id: mongoose.Types.ObjectId(req.body.orderId), userId: mongoose.Types.ObjectId(req.userId) }, {});
                if (myadsStatus.status) {
                    myadsStatus = myadsStatus.msg;
                    let fromCurrency = myadsStatus.pairName.split(/[_]+/)[0];
                    if (myadsStatus.orderType == 'sell') {
                        let usdtResult = await query_helper.findoneData(CurrencyDb, { currencySymbol: fromCurrency }, { currencyId: 1 });
                        if (usdtResult.status) {
                            const balance = await common.getbalance(req.userId, usdtResult.msg.currencyId);
                            await common.updatep2pAmount(req.userId, usdtResult.msg.currencyId, balance.p2pAmount + myadsStatus.usdtPrice, req.body.orderId, 'P2P - Ads Cancellation');
                            await common.updatep2pAmountHold(req.userId, usdtResult.msg.currencyId, -(myadsStatus.usdtPrice));
                        }
                    }

                    await query_helper.updateData(P2POrder, "one", { _id: mongoose.Types.ObjectId(req.body.orderId), userId: mongoose.Types.ObjectId(req.userId) }, { status: 2 })
                    await common.p2pactivtylog(req.userId,"","", "", 'P2P Ads Deleted','P2P Ads Deleted Successfully!');

                    let userResult = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.userId) }, {});
                    let userStatus = userResult.msg;
                    let email_data = await query_helper.findoneData(emailTemplate, { hint: 'p2p-ad-Deleted' }, {});
                    if (email_data.status) {
                        let etempdataDynamic = email_data.msg.content.replace(/###NAME###/g, userStatus.username);
                        mail_helper.sendMail({ subject: email_data.msg.subject, to: userStatus.email, html: etempdataDynamic }, function (res1) {
                            res.json({ status: true, message: "Ads Deleted Sucessfully" });
                        });
                    } else {
                        res.json({ status: false, message: "Oops! Something went wrong.Please try again" })
                    }
                }
            } else {
                setTimeout(_intervalFunc, 5000, req.userId.toString());
                res.json({ status: false, message: "Please wait for 5 seconds before placing another request!" });
            }
        } catch (err) {
            console.log('deletePayemnt', err);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async submitVerification(req, res) {
        try {
            if(config.sectionStatus && config.sectionStatus.p2p == "Disable") {
                return res.json({ "status": false, "message": "P2P trade disabled. Kindly contact admin!" });
            } else {
                let {
                    body: reqBody,
                    userId,
                    reqUserData = {}
                } = req;
                const {
                    orderId
                } = reqBody;
                const orderwith = oArray.indexOf(userId.toString());
                if (orderwith == -1) {
                    oArray.push(userId.toString())
                    setTimeout(_intervalFunc, 5000, userId.toString());
                    let orderResult = { status: false };
                    if(!common.isEmpty(orderId)) {
                        orderResult = await query_helper.findoneData(P2POrder, { _id: mongoose.Types.ObjectId(orderId), status: 1 }, {});
                    }
                    if (orderResult.status) {
                    
                        const {
                            floatingPrice,
                            maxAmt,
                            minAmt,
                            price,
                            timeLimit,
                            paymentNames,
                            paymentmethodId,
                            paymentId,
                            orderId
                        } = reqBody;

                        let data = {
                            floatingPrice,
                            maxAmt,
                            minAmt,
                            price,
                            timeLimit,
                            paymentNames,
                            paymentId,
                            orderId,
                            updatedDate: new Date()
                        };
                        if (reqBody.orderType == 'buy') {
                            data.paymentmethodId = paymentId;
                        } else {
                            data.paymentId = paymentId;
                        }
                        if (reqUserData.p2pDisabled == 0) {
                            let orderDet = await query_helper.findoneData(P2POrder, { _id: mongoose.Types.ObjectId(data.orderId) }, {});
                            if (orderDet.status){
                                orderDet = orderDet.msg;
                                let pairList = await query_helper.findoneData(P2PPair, { _id: mongoose.Types.ObjectId(orderDet.pairId)}, {});
                                if (pairList.status) {
                                    pairList = pairList.msg;
                                    let fromCurrency = pairList.pair.split(/[_]+/)[0];
                                    let toCurrency = pairList.pair.split(/[_]+/)[1];
                                    if (pairList.status === 0 ){
                                        res.json({ status: false, message: "This pair is De-Activated"});
                                        return false;
                                    }
                                    if (pairList.minTrade > Number(data.minAmt)) {
                                        res.json({ status: false, message: "Min limit should not be less than " + pairList.minTrade + " " + toCurrency});
                                        return false;
                                    }
                                    if (pairList.maxTrade < Number(data.maxAmt)) {
                                        res.json({ status: false, message: "Max order limit " + pairList.maxTrade + " " + toCurrency});
                                        return false;
                                    }
                                    if ((Number(data.maxAmt) < Number(data.minAmt))) {
                                        res.json({ status: false, message: "Max order should not be less than min amount"});
                                        return false;
                                    }

                                    data.timeLimit = (timeLimit != 15 && timeLimit != 30 && timeLimit != 45) ? (timeLimit * 60) : timeLimit;
                                    await query_helper.updateData(P2POrder, "one", { _id: mongoose.Types.ObjectId(orderId) }, data);
                                    let activity = common.activity(req);
                                    activity.browser = (typeof activity.browser == 'string') ? activity.browser : loginType + ' Application';
                                    let userActData = await query_helper.findoneData(P2PActivityLog, { userId: req.userId, ip: activity.ip, type: "P2P Ads Updated" }, {})
                                    if (!userActData.status) {
                                        common.userNotify({
                                            userId: req.userId,
                                            reason: 'P2P Ads Updated',
                                            activity,
                                            detail: {
                                               adsId : mongoose.Types.ObjectId(orderId)
                                            }
                                        });
                                    }
                                    await common.p2pactivtylog(req.userId," "," ", orderResult._id, 'P2P Ads Updated','P2P Ads Updated Successfully!');
                                    res.json({ status: true, message: "Ads Updated Sucessfully" });
                                    let email_data = await query_helper.findoneData(emailTemplate, { hint: 'p2p-ad-updated' }, {});
                                    if (email_data.status) {
                                        let etempdataDynamic = email_data.msg.content.replace(/###NAME###/g, reqUserData.username).replace(/###AMOUNT###/g, common.roundValuesMail(+orderResult.msg.orderAmount, 8)).replace(/###TYPE###/g, orderResult.msg.orderType);
                                        mail_helper.sendMail({ subject: email_data.msg.subject, to: reqUserData.email, html: etempdataDynamic }, function (res1) {
                                            console.error("Ads Updated Sucessfully");
                                        });
                                    } else {
                                        console.error('Oops! Something went wrong.Please try again');
                                    }
                                } else {
                                    res.json({ status: false, message: "Invalid pair" })
                                }
                            } else {
                                res.json({ status: false, message: "Invalid order" })
                            }
                           
                        } else {
                            res.json({ status: false, message: "Your p2p account is disabled by admin" })
                        }
                    }
                    else {
                        const {
                            passData = {}
                        } = reqBody;
                        const {
                            paymentId = [],
                            orderType,
                            timeLimit,
                            paymentNames,
                            usdtPrice = 0
                        } = passData;
                        if (reqUserData.p2pDisabled == 0) {
                            if (reqUserData.kycstatus == 1 && typeof reqUserData.tfaenablekey != "undefined" && typeof reqUserData.tfaenablekey != undefined && reqUserData.tfaenablekey != '') {
                                // let token = speakeasy.totp.verify({
                                //     secret: reqUserData.tfaenablekey,
                                //     encoding: 'base32',
                                //     token: reqBody.authCode
                                // });
                                // if (token) {
                                    let pairList = await query_helper.findoneData(P2PPair, { pair: passData.pairName}, {});
                                    if (pairList.status){
                                        pairList = pairList.msg;
                                        let fromCurrency = passData.pairName.split(/[_]+/)[0];
                                        let toCurrency = passData.pairName.split(/[_]+/)[1];
                                        if (pairList.status === 0 ){
                                            res.json({ status: false, message: "This pair is De-Activated"});
                                            return false;
                                        }
                                        let data = passData;
                                        if (pairList.minTrade > Number(data.maxAmt)) {
                                            res.json({ status: false, message: "Min limit should not be less than " + pairList.minTrade + " " + toCurrency});
                                            return false;
                                        }
                                        if (pairList.maxTrade < Number(data.maxAmt)) {
                                            res.json({ status: false, message: "Max order limit " + pairList.maxTrade + " " + toCurrency});
                                            return false;
                                        }
                                        if (data.registeredStatus == true && (data.registeredDays == "" || data.registeredDays == undefined || typeof data.registeredDays == "undefined")) {
                                            res.json({ status: false, message: "Please enter the registered time limit" });
                                            return false;
                                        } 
                                        if (data.holdingStatus == true && (data.holdingBTC == "" || data.holdingBTC == undefined || typeof data.holdingBTC == "undefined")) {
                                            res.json({ status: false, message: "Please enter holdings" });
                                            return false;
                                        } 
                                        if (data.holdingStatus == true && (data.holdingBTC == 0)) {
                                            res.json({ status: false, message: "Holdings more than 0" });
                                            return false;
                                        } 

                                        data.timeLimit = (timeLimit != 15 && timeLimit != 30 && timeLimit != 45) ? (timeLimit * 60) : timeLimit;
                                        data.paymentNames = paymentNames.toString();
                                        if (orderType == 'buy') {
                                            data.paymentmethodId = paymentId;
                                        } else {
                                            data.paymentId = paymentId;
                                        }
                                        let pairStatus = await query_helper.findoneData(P2POrder, { _id: mongoose.Types.ObjectId(data.pairId) }, {});
                                        if (!pairStatus.status) {
                                            let returnId = '';
                                            if (orderType == 'sell') {
                                                let usdtResult = await query_helper.findoneData(CurrencyDb, { currencySymbol: fromCurrency }, { currencyId: 1 });
                                                if (usdtResult.status) {
                                                    const balance = await common.getbalance(reqBody.userId, usdtResult.msg.currencyId);
                                                    if (balance.p2pAmount >= data.usdtPrice) {
                                                        returnId = await common.updatep2pAmount(reqBody.userId, usdtResult.msg.currencyId, balance.p2pAmount - data.usdtPrice, '', 'P2P - Ads Creation');
                                                        await common.updatep2pAmountHold(reqBody.userId, usdtResult.msg.currencyId, +(data.usdtPrice));
                                                    } else {
                                                        res.json({ status: false, message: "You don't have enough balance to place order" });
                                                        return false;
                                                    }
                                                }
                                            }
                                            data.orderAmount = data.usdtPrice;
                                            let payment = await query_helper.insertData(P2POrder, data);
                                            if (payment.status) {
                                                let activity = common.activity(req);
                                                activity.browser = (typeof activity.browser == 'string') ? activity.browser : loginType + ' Application';
                                                let userActData = await query_helper.findoneData(P2PActivityLog, { userId: req.userId, ip: activity.ip, type: "P2P Ads Created" }, {})
                                                if (!userActData.status) {
                                                    common.userNotify({
                                                        userId: req.userId,
                                                        reason: 'P2P Ads Created',
                                                        activity,
                                                        detail: {
                                                           adsId : payment.msg._id
                                                        }
                                                    });
                                                }
                                                await common.p2pactivtylog(req.userId," "," ", payment.msg._id, 'P2P Ads Created','P2P Ads Created Successfully!');
                                                if (returnId != '') {
                                                    await common.updatp2peBalanceUpdationId(returnId, payment.msg._id);
                                                }
                                            }
                                            let email_data = await query_helper.findoneData(emailTemplate, { hint: 'p2p-ad-created' }, {});
                                            if (email_data.status) {
                                                let etempdataDynamic = email_data.msg.content.replace(/###NAME###/g, reqUserData.username);
                                                mail_helper.sendMail({ subject: email_data.msg.subject, to: reqUserData.email, html: etempdataDynamic }, function (res1) {
                                                    res.json({ status: true, message: "Verified successfully", data: payment })
                                                });
                                            } else {
                                                res.json({ status: false, message: "Oops! Something went wrong.Please try again" })
                                            }
                                        } else {
                                            res.json({ status: false, message: "Invalid 2FA Code" })
                                        }
                                    } else {
                                        return res.json({ status: false, message: "Invalid pair" });
                                    }
                                // } else {
                                //     res.json({ status: false, message: "Invalid 2FA Code" })
                                // }
                            } else {
                                res.json({ status: false, message: "Please complete " + (reqUserData.kycstatus != 1 ? "KYC" : "2FA") + " to process ads.", type: reqUserData.kycstatus != 1 ? "KYC" : "2FA" })
                            }
                        }
                        else {
                            res.json({ status: false, message: "Your account is disabled by admin" })
                        }
                    }
                } else {
                    setTimeout(_intervalFunc, 5000, userId.toString());
                    res.json({ status: false, message: "Please wait for 5 seconds before placing another request!" });
                }
            }
        } catch (e) {
            console.log('err', e)
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getallOrders(req, res) {
        try {
            let data = {};
            data = req.body;
            let query = {};
            let orderType = data.orderType == "buy" ? "sell" : "buy";
            let sort = orderType == "sell" ? { price: 1 } : { price: -1 }
            if (data.payTypes == "All payments" && data.countryName == "All Regions" && data.searchprice == "") {
                query = { usdtPrice: {$gt: 0}, orderType: orderType, pairName: data.pair, status: 1 };
            } else if (data.payTypes == "All payments" && data.countryName == "All Regions" && data.searchprice != "") {
                query = { usdtPrice: {$gt: 0}, orderType: orderType, pairName: data.pair, price: Number(data.searchprice), status: 1 };
            } else if (data.payTypes != "All payments" && data.countryName != "All Regions" && data.searchprice != "") {
                query = { usdtPrice: {$gt: 0}, orderType: orderType, pairName: data.pair, paymentNames: { $regex: data.payTypes }, "country.label": data.countryName, price: Number(data.searchprice), status: 1 };
            } else if (data.payTypes == "All payments" && data.countryName != "All Regions" && data.searchprice != "") {
                query = { usdtPrice: {$gt: 0}, orderType: orderType, pairName: data.pair, "country.label": data.countryName, price: Number(data.searchprice), status: 1 };
            } else if (data.payTypes != "All payments" && data.countryName == "All Regions" && data.searchprice != "") {
                query = { usdtPrice: {$gt: 0}, orderType: orderType, pairName: data.pair, paymentNames: { $regex: data.payTypes }, price: Number(data.searchprice), status: 1 };
            } else if (data.payTypes == "All payments" && data.countryName != "All Regions" && data.searchprice == "") {
                query = { usdtPrice: {$gt: 0}, orderType: orderType, pairName: data.pair, "country.label": data.countryName, status: 1 };
            } else if (data.payTypes != "All payments" && data.countryName == "All Regions" && data.searchprice == "") {
                query = { usdtPrice: {$gt: 0}, orderType: orderType, pairName: data.pair, paymentNames: { $regex: data.payTypes }, status: 1 };
            } else if (data.payTypes != "" && data.countryName != "" && data.searchprice == "") {
                query = { usdtPrice: {$gt: 0}, orderType: orderType, pairName: data.pair, "country.label": data.countryName, paymentNames: { $regex: data.payTypes }, status: 1 };
            }
            
            let limit = req.body.limit ? parseInt(req.body.limit) : 10;
            let offset = req.body.offset ? parseInt(req.body.offset) : 0;
            let ordersCount = await P2POrder.find(query).countDocuments();
            let pairResult = await query_helper.findoneData(P2PPair, { pair: data.pair, status: 1 }, {});
            if (pairResult.status) {
                P2POrder.aggregate([
                    {
                        $match: query
                    },
                    { "$sort": sort },
                    { "$limit": offset + limit },
                    { "$skip": offset },
                    {
                        $lookup:
                        {
                            from: 'Users',
                            localField: 'userId',
                            foreignField: '_id',
                            as: 'users'
                        }
                    },
                    { $unwind: "$users" },
                    {
                        $lookup:
                        {
                            from: 'Currency',
                            localField: 'fromCurrency',
                            foreignField: '_id',
                            as: 'fromCurrency'
                        }
                    },
                    { $unwind: "$fromCurrency" },
                    {
                        $lookup:
                        {
                            from: 'Currency',
                            localField: 'toCurrency',
                            foreignField: '_id',
                            as: 'toCurrency'
                        }
                    },
                    { $unwind: "$toCurrency" },
                    {
                        $lookup:
                        {
                            from: 'P2PAllPayments',
                            localField: 'paymentmethodId',
                            foreignField: '_id',
                            as: 'paymentmethodIdDetail'
                        }
                    },
                    {
                        $lookup:
                        {
                            from: 'P2PPair',
                            localField: 'pairName',
                            foreignField: 'pair',
                            as: 'pairDetails'
                        }
                    },
                    { $unwind: "$pairDetails" },
                    {
                        $project: {
                            "paymentId": "$paymentId",
                            "paymentmethodId": "$paymentmethodId",
                            "paymentmethodIdDetail": "$paymentmethodIdDetail",
                            "fromCurrencyId": "$fromCurrency._id",
                            "fromCurrencysiteDecimal": "$fromCurrency.siteDecimal",
                            "fromCurrency": "$fromCurrency.currencySymbol",
                            "fromCurrencySymbolCode": "$fromCurrency.currencySymbolCode",
                            "fromCurrencyDecimal" : "$pairDetails.fromDecimal",
                            "toCurrencyDecimal" : "$pairDetails.toDecimal",
                            "toCurrency": "$toCurrency.currencySymbol",
                            "toCurrencySymbolCode": "$toCurrency.currencySymbolCode",
                            "toCurrencyId": "$toCurrency._id",
                            "toCurrencysiteDecimal": "$toCurrency.siteDecimal",
                            "paymentNames": "$paymentNames",
                            "orderType": "$orderType",
                            "pairId": "$pairId",
                            "userId": "$userId",
                            "orderMode": "$orderMode",
                            "usdtPrice": "$usdtPrice",
                            "price": "$price",
                            "country": "$country",
                            "minAmt": "$minAmt",
                            "maxAmt": "$maxAmt",
                            "status": "$status",
                            "remarks": "$remarks",
                            "autoreply": "$autoreply",
                            "timeLimit": "$timeLimit",
                            "username": "$users.username",
                            "email": "$users.email",
                            "createdDate": "$createdDate",
                            "priceType": "$priceType",
                            "registeredStatus": "$registeredStatus",
                            "registeredDays": "$registeredDays",
                            "holdingStatus": "$holdingStatus",
                            "holdingBTC": "$holdingBTC"
                        },
                    },
                ]).exec(async function (err, result) {
                    res.json({ "status": true, "message": "Order details listed", data: result, total: ordersCount });
                });
            } else {
                res.json({ "status": true, "message": "Order details listed", data: [], total: 0 });
            }
        } catch (e) {
            console.log('tradeorders', e)
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getp2puserOrders(req, res) {
        try {
            let reqBody = req.body;
            let userResult = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.userId) }, {});
            if (userResult.status) {
                userResult = userResult.msg;
                if (userResult.p2pDisabled == 0) {
                let monthlyDate = new Date();
                monthlyDate.setMonth(monthlyDate.getMonth() - 1);
                P2PTransactions.aggregate([
                    {
                        $facet: {
                            paymentDetails: [
                                {
                                    $match: {
                                        orderNo: reqBody.orderNo
                                    },
                                },
                                {
                                    $lookup: {
                                        from: 'P2PPayment',
                                        let: {
                                            paymentId: '$paymentId',
                                            sellerUserId: '$sellerUserId'
                                        },
                                        pipeline: [
                                            {
                                                $match: {
                                                    $expr: {
                                                        "$in": ["$$paymentId", "$methods._id"],
                                                    }
                                                }
                                            },
                                            {
                                                $match: {
                                                    $expr: {
                                                        "$eq": ["$userId", "$$sellerUserId"]
                                                    }
                                                }
                                            },
                                        ],
                                        as: 'paymentDet'
                                    }
                                },
                                {
                                    $unwind: '$paymentDet'
                                },
                                {
                                    $unwind: '$paymentDet.methods'
                                },
                                {
                                    $project: {
                                        "paymentDet": "$paymentDet",
                                        "paymentId": "$paymentId",
                                        "paymentCond": {
                                            $cond: {
                                                if: {
                                                    $eq: [
                                                        "$paymentDet.methods._id",
                                                        "$paymentId"
                                                    ]
                                                }, then: 'equal', else: "notequal"
                                            }
                                        },
                                        "verifyStep": "$verifyStep",
                                        "price": "$price",
                                        "qunatity": "$totalPrice",
                                        "orderNo": "$orderNo",
                                        "ownerId": "$ownerId",
                                        "totalcount": "$totalcount",
                                        "userId": "$userId",
                                        "buyerUserId": "$buyerUserId",
                                        "sellerUserId": "$sellerUserId",
                                        "orderLimit": "$orderLimit",
                                        "status": "$status",
                                        "orderType": "$orderType",
                                        "orderEndDate": "$orderEndDate",
                                        "paymentEndDate": "$paymentEndDate",
                                        "chattingHistory": "$chattingHistory",
                                        "createdDate": "$createdDate",
                                    },
                                },
                                {
                                    '$match': {
                                        "paymentCond": 'equal'
                                    }
                                },
                            ],
                            orderDetails: [
                                {
                                    $match: {
                                        orderNo: reqBody.orderNo
                                    },
                                },
                                {
                                    $lookup:
                                    {
                                        from: 'Users',
                                        localField: 'userId',
                                        foreignField: '_id',
                                        as: 'usersDet'
                                    }
                                },
                                { $unwind: "$usersDet" },
                                {
                                    $lookup:
                                    {
                                        from: 'Users',
                                        localField: 'ownerId',
                                        foreignField: '_id',
                                        as: 'ownerDet'
                                    }
                                },
                                { $unwind: "$ownerDet" },
                                {
                                    $lookup:
                                    {
                                        from: 'P2PPair',
                                        localField: 'pairId',
                                        foreignField: '_id',
                                        as: 'pairDet'
                                    }
                                },
                                { $unwind: "$pairDet" },
                                {
                                    $lookup:
                                    {
                                        from: 'Currency',
                                        localField: 'pairDet.toCurrency',
                                        foreignField: '_id',
                                        as: 'toCurrencyDet'
                                    }
                                },
                                { $unwind: "$toCurrencyDet" },
                                {
                                    $lookup:
                                    {
                                        from: 'Currency',
                                        localField: 'pairDet.fromCurrency',
                                        foreignField: '_id',
                                        as: 'fromCurrencyDet'
                                    }
                                },
                                { $unwind: "$fromCurrencyDet" },
                                {
                                    $lookup:
                                    {
                                        from: 'P2PFeedBack',
                                        localField: '_id',
                                        foreignField: 'orderId',
                                        as: 'feedbackDet'
                                    }
                                },
                                { $unwind: "$ownerDet" },
                                {
                                    $lookup:
                                    {
                                        from: 'P2POrder',
                                        localField: 'orderId',
                                        foreignField: '_id',
                                        as: 'orderDet'
                                    }
                                },
                                { $unwind: "$orderDet" },
                                // {
                                //     $lookup:
                                //     {
                                //         from: 'P2PPayment',
                                //         localField: 'sellerUserId',
                                //         foreignField: 'userId',
                                //         as: 'ownerPaymentDet'
                                //     }
                                // },
                                {
                                    $lookup: {
                                        from: 'P2PPayment',
                                        let: {
                                            paymentId: '$orderDet.paymentId',
                                        },
                                        pipeline: [
                                            {"$unwind":"$methods"},
                                            {
                                                $match: {
                                                    $expr: {
                                                        $and: [
                                                            {
                                                                "$in":["$methods._id", "$$paymentId"]
                                                            },
                                                            {
                                                                "$eq":["$methods.status", 1]
                                                            }
                                                        ]
                                                    }
                                                }
                                            },
                                        ],
                                        as: 'ownerPaymentDet'
                                    }
                                },
                                {
                                    $project: {
                                        "ownerPaymentDet": "$ownerPaymentDet",
                                        "ownerPaymentDet":{
                                            "$map":{
                                                "input":"$ownerPaymentDet",
                                                "as":"x",
                                                "in":{
                                                    "paymentId":"$$x.methods._id",
                                                    "holderName":"$$x.methods.holderName",
                                                    "paymenttype":"$$x.methods.paymenttype",
                                                    "attachment":"$$x.methods.attachment",
                                                    "accountNo":"$$x.methods.accountNo",
                                                    "ifscCode":"$$x.methods.ifscCode",
                                                    "bankName":"$$x.methods.bankName",
                                                    "upiId":"$$x.methods.upiId",
                                                    "branch":"$$x.methods.branch",
                                                    "paymentmethodId":"$$x.methods.paymentmethodId",
                                                    "userId":"$$x.methods.userId",
                                                    "_id":"$$x.methods._id",
                                                    "status":"$$x.methods.status",
                                                }                
                                            }
                                        },
                                        "pairDet" : "$pairDet",
                                        "fromCurrencyDet" : "$fromCurrencyDet",
                                        "toCurrencyDet" : "$toCurrencyDet",
                                        "buyerPaymentDet": "$buyerPaymentDet",
                                        "ownerOrderCount": "$ownerOrderCount",
                                        "feedbackDet": "$feedbackDet",
                                        "paymentId": "$paymentId",
                                        "orderDet": "$orderDet",
                                        "ownerEmail": "$ownerDet.email",
                                        "ownerName": "$ownerDet.username",
                                        "email": "$usersDet.email",
                                        "username": "$usersDet.username",
                                        "orderPrice": "$orderDet.price",
                                        "pairName": "$orderDet.pairName",
                                        "verifyStep": "$verifyStep",
                                        "price": "$price",
                                        "qunatity": "$totalPrice",
                                        "orderNo": "$orderNo",
                                        "ownerId": "$ownerId",
                                        "totalcount": "$totalcount",
                                        "userId": "$userId",
                                        "buyerUserId": "$buyerUserId",
                                        "sellerUserId": "$sellerUserId",
                                        "orderLimit": "$orderLimit",
                                        "status": "$status",
                                        "orderType": "$orderType",
                                        "orderEndDate": "$orderEndDate",
                                        "paymentEndDate": "$paymentEndDate",
                                        "chattingHistory": "$chattingHistory",
                                        "createdDate": "$createdDate",
                                    },
                                },
                            ],
                        },
                    },
                ]).exec(async function (err, result) {
                    if (result) {
                        res.json({ "status": true, "message": "Order details listed", data: result });
                    } else {
                        res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                    }
                });
            } else {
                res.json({ status: false, message: "Your account is disabled by admin" })
            }
        }else{
            res.json({ status: false, message: "Not a valid user" })
        }
            } catch (err) {
                console.log('getp2puserOrders', err);
                res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
            }
    },
    async getp2puserAllOrders(req, res) {
        try {
            let reqBody = req.body;
            let query = {};
            let createdDate = {};
            if (reqBody.type == 'processing') {
                query = { $or: [{ userId: mongoose.Types.ObjectId(req.userId) }, { ownerId: mongoose.Types.ObjectId(req.userId) }], status: 3 };
            } else {
                if (reqBody.tradeType != undefined && reqBody.tradeType != undefined) {
                let orderType = reqBody.tradeType == "Buy" ? "buy" : "sell";
                let tradeStatus = reqBody.tradeStatus == "Completed" ? 1 : reqBody.tradeStatus == "Cancelled" ? 2 : 3 ;
                if (reqBody.filterDates != undefined && reqBody.filterDates.length > 0) {
                    var fromDate= new Date(reqBody.filterDates[0]);
                    var toDate = new Date(reqBody.filterDates[1]);
                    var dateFilter= new Date(fromDate.setTime(fromDate.getTime()));
                    var nextDateFilter = new Date(toDate.setTime(toDate.getTime()));
                    createdDate ={
                        "$gte":dateFilter,
                        "$lt":nextDateFilter
                    }
                }
                    if (reqBody.tradeType == "All Status" && reqBody.tradeStatus == "All Status") {
                        query = { $or: [{ userId: mongoose.Types.ObjectId(req.userId) }, { ownerId: mongoose.Types.ObjectId(req.userId) }],createdDate : createdDate };
                    } else if (reqBody.tradeType == "All Status" && reqBody.tradeStatus != "All Status") {
                        query = { $or: [{ userId: mongoose.Types.ObjectId(req.userId) }, { ownerId: mongoose.Types.ObjectId(req.userId) }],  status: tradeStatus, createdDate : createdDate };
                    } else if (reqBody.tradeType != "All Status" && reqBody.tradeStatus == "All Status") {
                        query = { $or: [{ userId: mongoose.Types.ObjectId(req.userId) }, { ownerId: mongoose.Types.ObjectId(req.userId) }], orderType: orderType,createdDate : createdDate };
                    } else {
                        query = { $or: [{ userId: mongoose.Types.ObjectId(req.userId) }, { ownerId: mongoose.Types.ObjectId(req.userId) }],orderType: orderType, status: tradeStatus, createdDate : createdDate };
                    }
                } else {
                    query = { $or: [{ userId: mongoose.Types.ObjectId(req.userId) }, { ownerId: mongoose.Types.ObjectId(req.userId) }]};
                }
            }
            let sort =  { createdDate: -1 }
            let limit = req.body.limit ? parseInt(req.body.limit) : 10;
            let offset = req.body.offset ? parseInt(req.body.offset) : 0;
            let ordersCount = await P2PTransactions.find(query).countDocuments();

            P2PTransactions.aggregate([
                {
                    $match: query
                },
                { "$sort": sort },
                { "$limit": offset + limit },
                { "$skip": offset },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'ownerId',
                        foreignField: '_id',
                        as: 'ownerDet'
                    }
                },
                { $unwind: "$ownerDet" },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'userDet'
                    }
                },
                { $unwind: "$userDet" },
                {
                    $lookup:
                    {
                        from: 'P2PPair',
                        localField: 'pairId',
                        foreignField: '_id',
                        as: 'pairDet'
                    }
                },
                { $unwind: "$pairDet" },
                {
                    $lookup:
                    {
                        from: 'Currency',
                        localField: 'pairDet.fromCurrency',
                        foreignField: '_id',
                        as: 'fromCurrencyDet'
                    }
                },
                { $unwind: "$fromCurrencyDet" },
                {
                    $lookup:
                    {
                        from: 'Currency',
                        localField: 'pairDet.toCurrency',
                        foreignField: '_id',
                        as: 'toCurrencyDet'
                    }
                },
                { $unwind: "$toCurrencyDet" },
                {
                    $lookup:
                    {
                        from: 'P2POrder',
                        localField: 'orderId',
                        foreignField: '_id',
                        as: 'orderDet'
                    }
                },
                { $unwind: "$orderDet" },
                {
                    $project: {
                        "toCurrency": "$toCurrencyDet",
                        "fromCurrency": "$fromCurrencyDet",
                        "orderPrice": "$orderDet.price",
                        "advertiserNo": "$orderDet.advertiserNo",
                        "orderEndDate": "$orderEndDate",
                        "paymentEndDate": "$paymentEndDate",
                        "ownerEmail": "$ownerDet.email",
                        "ownerName": "$ownerDet.username",
                        "userEmail": "$userDet.email",
                        "userName": "$userDet.username",
                        "price": "$price",
                        "cryptoAmt": "$totalPrice",
                        "orderNo": "$orderNo",
                        "ownerId": "$ownerId",
                        "userId": "$userId",
                        "buyerUserId": "$buyerUserId",
                        "sellerUserId": "$sellerUserId",
                        "paymentId": "$paymentId",
                        "pairId": "$pairId",
                        "orderLimit": "$orderLimit",
                        "status": "$status",
                        "orderType": "$orderType",
                        "createdDate": "$createdDate",
                    },
                },
            ]).exec(async function (err, result) {
                if (result) {
                    res.json({ "status": true, "message": "Order details listed", data: result, userId: req.userId, total: ordersCount });
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }
            });
        } catch (err) {
            console.log('getp2puserAllOrders', err);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getMyads(req, res) {
        try {
            P2POrder.aggregate([
                {
                    $match: {
                        _id: mongoose.Types.ObjectId(req.body.editId),
                        status: 1
                    }
                },
                {
                    $lookup:
                    {
                        from: 'P2PPair',
                        localField: 'pairId',
                        foreignField: '_id',
                        as: 'pairDet'
                    }
                },
                { $unwind: "$pairDet" },
                {
                    $lookup:
                    {
                        from: 'Currency',
                        localField: 'pairDet.fromCurrency',
                        foreignField: '_id',
                        as: 'fromCurrencyDet'
                    }
                },
                { $unwind: "$fromCurrencyDet" },
                {
                    $lookup:
                    {
                        from: 'Currency',
                        localField: 'pairDet.toCurrency',
                        foreignField: '_id',
                        as: 'toCurrencyDet'
                    }
                },
                { $unwind: "$toCurrencyDet" },
                
                {
                    $lookup: {
                        from: 'P2PPayment',
                        let: {
                            paymentId: '$paymentId',
                        },
                        pipeline: [
                            {"$unwind":"$methods"},
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                 "$in":["$methods._id", "$$paymentId"]
                                            },
                                            {
                                                "$eq":["$methods.status", 1]
                                            }
                                        ]
                                    }
                                }
                            },
                        ],
                        as: 'sellpaymentDet'
                    }
                },
                {
                    $lookup: {
                        from: 'P2PAllPayments',
                        let: {
                            paymentId: '$paymentId'
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                "$in":["$_id", "$$paymentId"]
                                            },
                                            {
                                                "$eq":["$status", 1]
                                            }
                                        ]
                                        
                                    }
                                }
                            },
                        ],
                        as: 'buypaymentDet'
                    }
                },
                {
                    $project: {
                        "buypaymentDet": "$buypaymentDet",
                        "sellpaymentDet": "$sellpaymentDet",
                        "sellpaymentDet":{
                            "$map":{
                                "input":"$sellpaymentDet",
                                "as":"x",
                                "in":{
                                    "paymentId":"$$x.methods._id",
                                    "holderName":"$$x.methods.holderName",
                                    "paymenttype":"$$x.methods.paymenttype",
                                    "attachment":"$$x.methods.attachment",
                                    "accountNo":"$$x.methods.accountNo",
                                    "ifscCode":"$$x.methods.ifscCode",
                                    "bankName":"$$x.methods.bankName",
                                    "upiId":"$$x.methods.upiId",
                                    "branch":"$$x.methods.branch",
                                    "paymentmethodId":"$$x.methods.paymentmethodId",
                                    "userId":"$$x.methods.userId",
                                    "status":"$$x.methods.status",
                                }                
                            }
                        },
                        "paymentId": "$paymentId",
                        "fromCurrency": "$fromCurrencyDet.currencySymbol",
                        "toCurrency": "$toCurrencyDet.currencySymbol",
                        "price": "$price",
                        "highestPrice": "$highestPrice",
                        "lowestPrice": "$lowestPrice",
                        "totalPrice": "$totalPrice",
                        "floatingPrice": "$floatingPrice",
                        "paymentNames": "$paymentNames",
                        "orderMode": "$orderMode",
                        "orderType": "$orderType",
                        "priceType": "$priceType",
                        "usdtPrice": "$usdtPrice",
                        "pairId": "$pairId",
                        "pairName": "$pairName",
                        "status": "$status",
                        "timeLimit": "$timeLimit",
                        "maxAmt": "$maxAmt",
                        "minAmt": "$minAmt",
                        "createdDate": "$createdDate",
                    },
                },
            ]).exec(async function (err, result) {
                console.log("err:",err)
                if (result) {
                    res.json({ "status": true, "message": "My ads details listed", data: result });
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }
            });
        } catch (err) {
            console.log('getMyads', err);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getallMyads(req, res) {
        try {
            let query = {};
            let reqBody = req.body;
            let userId = mongoose.Types.ObjectId(req.userId);
            let orderType = reqBody.tradeType == "Buy" ? "buy" : "sell";
            let orderMode = reqBody.advStatus == "Published" ? "Online" : "Offline";
            if (reqBody.tradeType == 'All Status' && reqBody.advStatus == 'All Status' && reqBody.assetType == "All assets") {
                query = { status: 1, userId: userId }
            } else if (reqBody.tradeType == 'All Status' && reqBody.advStatus == 'All Status' && reqBody.assetType != "All assets") {
                query = { status: 1, userId: userId, pairName: reqBody.assetType }
            } else if (reqBody.tradeType == 'All Status' && reqBody.advStatus != 'All Status' && reqBody.assetType == "All assets") {
                query = { status: 1, userId: userId, orderMode: orderMode }
            } else if (reqBody.tradeType != 'All Status' && reqBody.advStatus != 'All Status' && reqBody.assetType == "All assets") {
                query = { status: 1, userId: userId, orderType: orderType, orderMode: orderMode }
            } else if (reqBody.tradeType != 'All Status' && reqBody.advStatus == 'All Status' && reqBody.assetType == "All assets") {
                query = { status: 1, userId: userId, orderType: orderType }
            }else if (reqBody.tradeType != 'All Status' && reqBody.advStatus != 'All Status' && reqBody.assetType != "All assets") {
                query = { status: 1, userId: userId, pairName: reqBody.assetType, orderType: orderType, orderMode: orderMode }
            } else if (reqBody.tradeType == 'All Status' && reqBody.advStatus == 'All Status' && reqBody.assetType != "All assets") {
                query = { status: 1, userId: userId, pairName: reqBody.assetType }
            } else if (reqBody.tradeType != 'All Status' && reqBody.advStatus == 'All Status' && reqBody.assetType != "All assets") {
                query = { status: 1, userId: userId, pairName: reqBody.assetType, orderType: orderType }
            } else if (reqBody.tradeType == 'All Status' && reqBody.advStatus != 'All Status' && reqBody.assetType != "All assets") {
                query = { status: 1, userId: userId, pairName: reqBody.assetType, orderType: orderType, orderMode: orderMode }
            }

            let sort = { createdDate: -1 }
            let limit = req.body.limit ? parseInt(req.body.limit) : 10;
            let offset = req.body.offset ? parseInt(req.body.offset) : 0;
            let ordersCount = await P2POrder.find(query).countDocuments();

            P2POrder.aggregate([
                {
                    $match: query
                },
                { "$sort": sort },
                { "$limit": offset + limit },
                { "$skip": offset },
                {
                    $lookup:
                    {
                        from: 'P2PPair',
                        localField: 'pairId',
                        foreignField: '_id',
                        as: 'pairDet'
                    }
                },
                { $unwind: "$pairDet" },
                {
                    $lookup:
                    {
                        from: 'Currency',
                        localField: 'pairDet.fromCurrency',
                        foreignField: '_id',
                        as: 'fromCurrencyDet'
                    }
                },
                { $unwind: "$fromCurrencyDet" },
                {
                    $lookup:
                    {
                        from: 'Currency',
                        localField: 'pairDet.toCurrency',
                        foreignField: '_id',
                        as: 'toCurrencyDet'
                    }
                },
                { $unwind: "$toCurrencyDet" },
                {
                    $project: {
                        "paymentId": "$paymentId",
                        "fromCurrency": "$fromCurrencyDet.currencySymbol",
                        "toCurrency": "$toCurrencyDet.currencySymbol",
                        "paymentNames": "$paymentNames",
                        "price": "$price",
                        "totalPrice": "$totalPrice",
                        "orderMode": "$orderMode",
                        "orderType": "$orderType",
                        "usdtPrice": "$usdtPrice",
                        "orderAmount": "$orderAmount",
                        "userId": "$userId",
                        "pairId": "$pairId",
                        "pairName": "$pairName",
                        "status": "$status",
                        "timeLimit": "$timeLimit",
                        "maxAmt": "$maxAmt",
                        "minAmt": "$minAmt",
                        "lowestPrice": "$lowestPrice",
                        "highestPrice": "$highestPrice",
                        "createdDate": "$createdDate",
                    },
                },
            ]).exec(async function (err, result) {
                if (result) {
                    res.json({ "status": true, "message": "My ads details listed", data: result, total:ordersCount });
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }
            });
        } catch (err) { }
    },
    async advertiserDet(req, res) {
        try {
            if (typeof req.body.advertiserNo == 'undefined' || typeof req.body.advertiserNo == undefined || req.body.advertiserNo == '' || !mongoose.Types.ObjectId.isValid(req.body.advertiserNo)) {
                return res.json({ "status": false, "message": "Invalid UserId!" });
            }
            let userStatus = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.body.advertiserNo) }, {});
            if (userStatus.status) {
                userStatus = userStatus.msg;
                let userDet = {};
                userDet.userId = userStatus._id;
                userDet.username = userStatus.username;
                userDet.email = userStatus.email;
                userDet.registerOn = userStatus.registerOn;
                userDet.dateTime = userStatus.dateTime;
                res.json({ "status": true, "message": "User details listed", data: userDet });
               
            } else {
                res.json({ "status": true, "message": "No records found!" });
            }
        } catch (err) {
            console.log('advertiserDet', err);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async advertiserOrderDet(req,res) {
        try {
            let query = {};
            let reqBody = req.body;
            query = { userId : mongoose.Types.ObjectId(reqBody.advertiserNo), usdtPrice: {$gt: 0}, status: 1};
            let sort = { createdDate: -1, status: 1 }
            P2POrder.aggregate([
                {
                    $match: query
                },
                { "$sort": sort },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'users'
                    }
                },
                { $unwind: "$users" },
                {
                    $lookup:
                    {
                        from: 'Currency',
                        localField: 'fromCurrency',
                        foreignField: '_id',
                        as: 'fromCurrency'
                    }
                },
                { $unwind: "$fromCurrency" },
                {
                    $lookup:
                    {
                        from: 'Currency',
                        localField: 'toCurrency',
                        foreignField: '_id',
                        as: 'toCurrency'
                    }
                },
                { $unwind: "$toCurrency" },
                {
                    $lookup:
                    {
                        from: 'P2PAllPayments',
                        localField: 'paymentmethodId',
                        foreignField: '_id',
                        as: 'paymentmethodIdDetail'
                    }
                },
                {
                    $lookup:
                    {
                        from: 'P2PPair',
                        localField: 'pairName',
                        foreignField: 'pair',
                        as: 'pairDetails'
                    }
                },
                { $unwind: "$pairDetails" },
                {
                    $project: {
                        "paymentId": "$paymentId",
                        "paymentmethodId": "$paymentmethodId",
                        "paymentmethodIdDetail": "$paymentmethodIdDetail",
                        "fromCurrencyId": "$fromCurrency._id",
                        "fromCurrency": "$fromCurrency.currencySymbol",
                        "fromCurrencySymbolCode": "$fromCurrency.currencySymbolCode",
                        "fromCurrencyImage": "$fromCurrency.image",
                        "toCurrency": "$toCurrency.currencySymbol",
                        "toCurrencyImage": "$toCurrency.image",
                        "toCurrencyId": "$toCurrency._id",
                        "toCurrencySymbolCode": "$toCurrency.currencySymbolCode",
                        "fromCurrencyDecimal": "$pairDetails.fromDecimal",
                        "toCurrencyDecimal": "$pairDetails.toDecimal",
                        "paymentNames": "$paymentNames",
                        "orderType": "$orderType",
                        "pairId": "$pairId",
                        "userId": "$userId",
                        "orderMode": "$orderMode",
                        "usdtPrice": "$usdtPrice",
                        "price": "$price",
                        "country": "$country",
                        "minAmt": "$minAmt",
                        "maxAmt": "$maxAmt",
                        "status": "$status",
                        "remarks": "$remarks",
                        "autoreply": "$autoreply",
                        "timeLimit": "$timeLimit",
                        "username": "$users.username",
                        "email": "$users.email",
                        "createdDate": "$createdDate",
                        "priceType": "$priceType",
                        "registeredStatus": "$registeredStatus",
                        "registeredDays": "$registeredDays",
                        "holdingStatus": "$holdingStatus",
                        "holdingBTC": "$holdingBTC"
                    },
                },
            ]).exec(async function (err, result) {
                res.json({ "status": true, "message": "Order details listed", data: result });
            });
        } catch (err) {}
    },
    async getpriceRange(req, res) {
        try {
            let orderStatus = [];
            let reqBody = req.body;
            if (req.body.type == "buy") {
                orderStatus = await P2POrder.find({ pairName: reqBody.pair ,orderType: reqBody.type, status: 1},{price: 1}).sort({ "price": -1 }).limit(1);
            } else {
                orderStatus = await P2POrder.find({ pairName: reqBody.pair ,orderType: reqBody.type, status: 1 }, {price: 1}).sort({ "price": 1 }).limit(1);
            }
            const lowhighPrice = (orderStatus[0] && orderStatus[0].price) ? (orderStatus[0].price) : 0;
            res.json({ "status": true, "message": "My ads details listed", data: lowhighPrice });
        } catch (err) {
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async orderReleased(req, res){
        try {
            let reqBody = req.body;
            let userDetails = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.userId) }, {});
            if (userDetails.status) {
                userDetails = userDetails.msg;
                let checkTxn = await query_helper.findoneData(P2PTransactions, { orderNo: reqBody.orderNo }, {});
                if (checkTxn.status && (checkTxn.msg.verifyStep == 2 || checkTxn.msg.verifyStep == 3) && checkTxn.msg.status == 3) {
                    checkTxn = checkTxn.msg;
                    if (req.userId != checkTxn.sellerUserId) {
                        res.json({ "status": false, "message": 'Not an valid request', type: 0 });
                        return false;
                    }
                    await query_helper.updateData(P2PTransactions, "one", { orderNo: reqBody.orderNo }, { status: 1, verifyStep: 4 });
                    await query_helper.updateData(P2PAppealHistory, "one", { orderNo: reqBody.orderNo }, { status: 2 });
                    let where = checkTxn.pairId != '' ? { _id: mongoose.Types.ObjectId(checkTxn.pairId) } : {};
                    let pairs = await P2PPair.findOne(where).sort({ _id: 1 }).populate("fromCurrency").populate("toCurrency");
                    if (pairs) {
                        if (pairs.fromCurrency) {
                            let fromCurrency = pairs.fromCurrency;
                            let buyerUser = checkTxn.orderType == 'buy' ? checkTxn.userId : checkTxn.ownerId;
                            let sellerUser = checkTxn.orderType == 'buy' ? checkTxn.ownerId : checkTxn.userId;
                            let walletOutput = await common.getbalance(buyerUser, fromCurrency.currencyId);
                            if (walletOutput) {
                                let buyerDetails = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(buyerUser) }, {});
                                if (buyerDetails.status) {
                                    buyerDetails = buyerDetails.msg;
                                    let newbal = (+walletOutput.p2pAmount) + (+checkTxn.totalPrice);
                                    let smsTemplate = "[ Exchange ] P2P Order "+ reqBody.orderNo.slice(- 4) + " has been completed.The seller has released "+ checkTxn.totalPrice + " "+ fromCurrency.currencySymbol +" to your P2P wallet"
                                    await common.updatep2pAmount(buyerUser, fromCurrency.currencyId, newbal, reqBody.orderNo, 'P2P - Completion');
                                    if( checkTxn.orderType == 'sell'){
                                        await common.updatep2pAmountHold(checkTxn.sellerUserId,  fromCurrency.currencyId, -(checkTxn.totalPrice));
                                    } 
                                    await common.mobileSMS(buyerDetails.phoneno, smsTemplate);
                                    await common.p2pactivtylog(req.userId, checkTxn.ownerId, checkTxn.orderNo, checkTxn.orderId, 'Order released', checkTxn.totalPrice + " "+ fromCurrency.currencySymbol + " " + (checkTxn.orderType == 'buy' ? 'Sell' : 'Buy') + ' Order released successfully');
                                    let activity = common.activity(req);
                                    activity.browser = (typeof activity.browser == 'string') ? activity.browser : loginType + ' Application';
                                    let userActData = await query_helper.findoneData(P2PActivityLog, { userId: req.userId, ip: activity.ip, type: "P2P Order Released" }, {})
                                    if (!userActData.status) {
                                        common.userNotify({
                                            userId: req.userId,
                                            reason: 'P2P Order Released',
                                            activity,
                                            detail: {
                                                orderId: checkTxn._id,
                                                orderType: checkTxn.orderType,
                                                orderNo: reqBody.orderNo
                                            }
                                        });
                                    }
                                    let email_data = await query_helper.findoneData(emailTemplate, { hint: 'p2p-order-released' }, {});
                                    if (email_data.status) {
                                        let username = buyerDetails.username != "" ? (buyerDetails.username) : (buyerDetails.email != "" ? buyerDetails.email : buyerDetails.phoneno);
                                        let etempdataDynamic = email_data.msg.content.replace(/###NAME###/g, username).replace(/###AMOUNT###/g, common.roundValuesMail(+checkTxn.totalPrice, 8));
                                        res.json({ status: true, message: "Order released successfully", data: checkTxn, type: 0 });
                                        mail_helper.sendMail({ subject: email_data.msg.subject, to: buyerDetails.email, html: etempdataDynamic }, function (res1) {
                                        });
                                    } else {
                                        res.json({ status: false, message: "Something went wrong! Please try again someother time", type: 0 });
                                    }
                                } else {
                                    res.json({ status: false, message: "not valid a user!", type: 0 })
                                }
                            } else {
                                res.json({ status: false, message: "Please try again after sometime!", type: 0 })
                            }
                        } else {
                            res.json({ status: false, message: "Please try again after sometime!", type: 0 })
                        }
                    } else {
                        res.json({ status: false, message: "Please try again after sometime!", type: 0 })
                    }
                } else {
                    res.json({ status: false, message: "Not a valid transaction!",type: 0 })
                }
            } else {
                return res.json({ status: false, message: "Not a valid user", type: 0 });
            }
        } catch(err){
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async submitOrder(req, res) {
        try {
            if(config.sectionStatus && config.sectionStatus.p2p == "Disable") {
                return res.json({ "status": false, "message": "P2P trade disabled. Kindly contact admin!" });
            }
            else {
                const orderwith = oArray.indexOf(req.userId.toString());
                if (orderwith == -1) {
                    oArray.push(req.userId.toString())
                    setTimeout(_intervalFunc, 5000, req.userId.toString());
                    let data = {};
                    let type = "";
                    let reqBody = req.body;
                    let userDetails = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.userId) }, {});
                    if (userDetails.status) {
                        userDetails = userDetails.msg;
                        if (userDetails.p2pDisabled != 0) {
                            return res.json({ "status": false, "message": 'Not a valid user. Your account disabled by admin', type: 0 });
                        }
    
                        if (userDetails.phoneno == "") {
                            return res.json({ "status": false, "message": 'Please enter the phone no', type: 1});
                        }
    
                        if ((userDetails.tfaenablekey == "") || (userDetails.tfaenablekey == undefined )|| (typeof userDetails.tfaenablekey == "undefined")) {
                            return res.json({ status: false, message: "Please enable 2FA to complete order!", type: 2 });
                        }
    
                        if (userDetails.kycstatus != 1) {
                            return res.json({ status: false, message: "Please complete the kyc details", type: 3 });
                        }
                       
                        if (reqBody.OTPCode != "" && reqBody.OTPCode != undefined && reqBody.OTPCode != "undefined") {
                            let token = speakeasy.totp.verify({
                                secret: userDetails.tfaenablekey,
                                encoding: 'base32',
                                token: reqBody.OTPCode
                            });
                            if (token) {
                                let checkTxn = await query_helper.findoneData(P2PTransactions, { orderNo: reqBody.orderNo }, {});
                                if (checkTxn.status && (checkTxn.msg.verifyStep == 2 || checkTxn.msg.verifyStep == 3) && checkTxn.msg.status == 3) {
                                    checkTxn = checkTxn.msg;
                                    if (req.userId != checkTxn.sellerUserId) {
                                        res.json({ "status": false, "message": 'Not an valid request', type: 0 });
                                        return false;
                                    }
                                    await query_helper.updateData(P2PTransactions, "one", { orderNo: reqBody.orderNo }, { status: 1, verifyStep: 4 });
                                    await query_helper.updateData(P2PAppealHistory, "one", { orderNo: reqBody.orderNo }, { status: 2 });
                                    let where = checkTxn.pairId != '' ? { _id: mongoose.Types.ObjectId(checkTxn.pairId) } : {};
                                    let pairs = await P2PPair.findOne(where).sort({ _id: 1 }).populate("fromCurrency").populate("toCurrency");
                                    if (pairs) {
                                        if (pairs.fromCurrency) {
                                            let fromCurrency = pairs.fromCurrency;
                                            let buyerUser = checkTxn.orderType == 'buy' ? checkTxn.userId : checkTxn.ownerId;
                                            let sellerUser = checkTxn.orderType == 'buy' ? checkTxn.ownerId : checkTxn.userId;
                                            let walletOutput = await common.getbalance(buyerUser, fromCurrency.currencyId);
                                            if (walletOutput) {
                                                let buyerDetails = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(buyerUser) }, {});
                                                if (buyerDetails.status) {
                                                    buyerDetails = buyerDetails.msg;
                                                    let newbal = (+walletOutput.p2pAmount) + (+checkTxn.totalPrice);
                                                    let smsTemplate = "[ Exchange ] P2P Order "+ reqBody.orderNo.slice(- 4) + " has been completed.The seller has released "+ checkTxn.totalPrice + " "+ fromCurrency.currencySymbol +" to your P2P wallet"
                                                    await common.updatep2pAmount(buyerUser, fromCurrency.currencyId, newbal, reqBody.orderNo, 'P2P - Completion');
                                                    if( checkTxn.orderType == 'sell'){
                                                        await common.updatep2pAmountHold(checkTxn.sellerUserId,  fromCurrency.currencyId, -(checkTxn.totalPrice));
                                                    } else {
                                                        // let walletsellerOutput = await common.getbalance(sellerUser, fromCurrency.currencyId);
                                                        // if (walletsellerOutput) {
                                                        //     let newbal1 = (+walletsellerOutput.p2pAmount) - (+checkTxn.totalPrice);
                                                        //     await common.updatep2pAmount(sellerUser, fromCurrency.currencyId, newbal1, reqBody.orderNo, 'P2P - Detected');
                                                        // } else {
                                                        //     res.json({ status: false, message: "not valid a user!", type: 0 })
                                                        // }                                                    
                                                    }
                                                    await common.mobileSMS(buyerDetails.phoneno, smsTemplate);
                                                    await common.p2pactivtylog(req.userId, checkTxn.ownerId, checkTxn.orderNo, checkTxn.orderId, 'Order released', checkTxn.totalPrice + " "+ fromCurrency.currencySymbol + " " + (checkTxn.orderType == 'buy' ? 'Sell' : 'Buy') + ' Order released successfully');
                                                    let activity = common.activity(req);
                                                    activity.browser = (typeof activity.browser == 'string') ? activity.browser : loginType + ' Application';
                                                    let userActData = await query_helper.findoneData(P2PActivityLog, { userId: req.userId, ip: activity.ip, type: "P2P Order Released" }, {})
                                                    if (!userActData.status) {
                                                        common.userNotify({
                                                            userId: req.userId,
                                                            reason: 'P2P Order Released',
                                                            activity,
                                                            detail: {
                                                                orderId: checkTxn._id,
                                                                orderType: checkTxn.orderType,
                                                                orderNo: reqBody.orderNo
                                                            }
                                                        });
                                                    }
                                                    let email_data = await query_helper.findoneData(emailTemplate, { hint: 'p2p-order-released' }, {});
                                                    if (email_data.status) {
                                                        let username = buyerDetails.username != "" ? (buyerDetails.username) : (buyerDetails.email != "" ? buyerDetails.email : buyerDetails.phoneno);
                                                        let etempdataDynamic = email_data.msg.content.replace(/###NAME###/g, username).replace(/###AMOUNT###/g, common.roundValuesMail(+checkTxn.totalPrice, 8));
                                                        res.json({ status: true, message: "Order released successfully", data: checkTxn, type: 0 });
                                                        mail_helper.sendMail({ subject: email_data.msg.subject, to: buyerDetails.email, html: etempdataDynamic }, function (res1) {
                                                        });
                                                    } else {
                                                        res.json({ status: false, message: "Something went wrong! Please try again someother time", type: 0 });
                                                    }
                                                } else {
                                                    res.json({ status: false, message: "not valid a user!", type: 0 })
                                                }
                                            } else {
                                                res.json({ status: false, message: "Please try again after sometime!", type: 0 })
                                            }
                                        } else {
                                            res.json({ status: false, message: "Please try again after sometime!", type: 0 })
                                        }
                                    } else {
                                        res.json({ status: false, message: "Please try again after sometime!", type: 0 })
                                    }
                                } else {
                                    res.json({ status: false, message: "Not a valid transaction!",type: 0 })
                                }
                            } else {
                                return res.json({ "status": false, "message": "Please Enter Valid 2FA Code", type: 0 }); 
                            }
                        } else {
                            let checkTxn = await query_helper.findoneData(P2PTransactions, { orderNo: reqBody.orderNo }, {});
                            if (checkTxn.status) {
                                let reqData = {};
                                checkTxn = checkTxn.msg;
                                reqData = { verifyStep: 0, paymentId: req.body.paymentId };
                                let sellerDetails = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(checkTxn.sellerUserId) }, {});
                                if (sellerDetails.status) {
                                    sellerDetails = sellerDetails.msg;
                                    if (checkTxn.verifyStep == 1) {
                                        if (req.userId != checkTxn.buyerUserId) {
                                            res.json({ "status": false, "message": 'Not an valid request', type: 0 });
                                            return false;
                                        }
                                        var currDate = new Date();
                                        currDate.setMinutes(currDate.getMinutes() + checkTxn.orderLimit);
                                        reqData = { verifyStep: 2, paymentId: req.body.paymentId, paymentEndDate: currDate };
                                        if (sellerDetails.phoneno == "") {
                                            res.json({ "status": false, "message": 'Please enter the phone no', type: 1 });
                                            return false;
                                        }
                                    } else if (checkTxn.verifyStep = 2) {
                                        reqData = { verifyStep: 3 };
                                    } else {
                                        reqData = {
                                            description: reqBody.description,
                                            orderNo: checkTxn.orderNo,
                                            phone: reqBody.phone,
                                            reasonAppeal: reqBody.reasonAppeal,
                                            attachment: reqBody.attachment,
                                        }
                                    }
                                    await query_helper.updateData(P2PTransactions, "one", { orderNo: reqBody.orderNo }, reqData);
                                    await common.p2pactivtylog(req.userId, checkTxn.ownerId, checkTxn.orderNo, checkTxn.orderId, ' Order Marked as paid', (checkTxn.orderType) == 'buy' ? "Sell " : "Buy " +'Order Marked as paid');
                                    let activity = common.activity(req);
                                    activity.browser = (typeof activity.browser == 'string') ? activity.browser : loginType + ' Application';
                                    let userActData = await query_helper.findoneData(P2PActivityLog, { userId: req.userId, ip: activity.ip, type: "P2P Order Paid" }, {})
                                    if (!userActData.status) {
                                        common.userNotify({
                                            userId: req.userId,
                                            reason: 'P2P Order Paid',
                                            activity,
                                            detail: {
                                                orderId: checkTxn._id,
                                                orderType: checkTxn.orderType,
                                                orderNo: reqBody.orderNo
                                            }
                                        });
                                    }
                                    let smsTemplate = "[ Exchange ] The buyer has marked P2P Order "+ reqBody.orderNo.slice(- 4) + " as paid.Please release the crypto ASAP after confirming that payment has been received."
                                    await common.mobileSMS(sellerDetails.phoneno, smsTemplate);
                                    return res.json({ "status": true, "message": 'Order Marked as paid', data: checkTxn, type: 0 });
                                } else {
                                    return res.json({ status: false, message: "Please try again after sometime!", type: 0 })
                                }
                            } else {
                                let pendingOrders = await P2PTransactions.find({ userId: mongoose.Types.ObjectId(req.userId), status: 3});
                                if (pendingOrders && pendingOrders.length > 0 && pendingOrders.length >= 2) {
                                    return res.json({ status: false, data: pendingOrders, type: 4 });
                                }
                                let orderData = await query_helper.findoneData(P2POrder, { _id: mongoose.Types.ObjectId(reqBody.orderId) }, {});
                                if (orderData.status) {
                                    orderData = orderData.msg;
                                    if (reqBody.totalPrice > orderData.usdtPrice) {
                                        res.json({ status: false, message: "Please enter less than or equal to available amount "+(orderData.usdtPrice).toFixed(2), type: 0 });
                                        return false;
                                    }
                                    let blockData = await query_helper.findoneData(P2PReport, { userId: mongoose.Types.ObjectId(req.userId), advertiserNo : mongoose.Types.ObjectId(reqBody.ownerId) }, {});
                                    if (blockData.status) {
                                        blockData = blockData.msg;
                                        if (blockData.status == 1) {
                                            res.json({ status: false, message: "This user has been blocked", type: 0});
                                            return false;
                                        }
                                    }
                                    var currDate = new Date();
                                    currDate.setMinutes(currDate.getMinutes() + orderData.timeLimit);
                                    data.orderNo = Math.floor(1000000000000000 + Math.random() * 9000000000000000);
                                    data.orderEndDate = currDate;
                                    data.price = orderData.price;
                                    data.orderPrice = reqBody.price;
                                    data.totalPrice = reqBody.totalPrice;
                                    data.userId = req.userId;
                                    data.orderId = orderData._id;
                                    data.ownerId = orderData.userId;
                                    data.pairId = orderData.pairId;
                                    data.orderLimit = orderData.timeLimit;
                                    data.orderType = reqBody.orderType;
                                    if (data.orderType == "sell") {
                                        data.paymentId = reqBody.paymentId;
                                    }
                                    let returnId = '';
                                    if (data.userId.toString() == data.ownerId.toString()) {
                                        res.json({ status: false, message: "You Can't Select Your Own Order", type: 0 });
                                        return false;
                                    }
                                    let holdingStatus = orderData.holdingStatus;
                                    let holdingUSDT = orderData.holdingBTC;
                                    let registeredStatus = orderData.registeredStatus;
                                    let registeredDays = orderData.registeredDays;
                                    let userRegisteredDate = new Date(userDetails.dateTime);
                                    let oneDay = (1000 * 60 * 60 * 24);
                                    let diffInTime = (currDate.getTime()) - (userRegisteredDate.getTime());
                                    let diffInDays = Math.round(diffInTime / oneDay);
                                    if (registeredStatus == true && registeredDays >= diffInDays) {
                                        res.json({ status: false, message: "Your registered days must be greater than or equal " + registeredDays, type: 0 });
                                        return false;
                                    } 
                                    let where = orderData.pairId != '' ? { _id: mongoose.Types.ObjectId(orderData.pairId) } : {};
                                    let pairs = await P2PPair.findOne(where).sort({ _id: 1 }).populate("fromCurrency").populate("toCurrency");
                                    if (pairs) {
                                        if (pairs.fromCurrency) {
                                            let fromCurrency = pairs.fromCurrency;
                                            let walletOutput = await common.getbalance(req.userId, fromCurrency.currencyId);
                                            if (walletOutput) {
                                                if (holdingStatus == true && (holdingUSDT > walletOutput.hold)) {
                                                    res.json({ status: false, message: "Holdings more than " + holdingUSDT + " " + fromCurrency.currencySymbol, type: 0 });
                                                    return false;
                                                } 
                                                if (orderData.orderType == 'buy') {
                                                    let sellerUser = req.userId;
                                                    let pairs = await P2PPair.findOne({ _id: mongoose.Types.ObjectId(orderData.pairId) }).sort({ _id: 1 }).populate("fromCurrency").populate("toCurrency");
                                                    if (pairs) {
                                                        let fromCurrency = pairs.fromCurrency;
                                                        let walletOutput = await common.getbalance(sellerUser, fromCurrency.currencyId);
                                                        if (walletOutput) {
                                                            if (walletOutput.p2pAmount >= reqBody.totalPrice) {
                                                                let newbal = (+walletOutput.p2pAmount) - (+reqBody.totalPrice);
                                                                returnId = await common.updatep2pAmount(sellerUser, fromCurrency.currencyId, newbal, '', 'P2P - Completion');
                                                                await common.updatep2pAmountHold(sellerUser,  fromCurrency.currencyId, +(reqBody.totalPrice));
                                                            } else {
                                                                res.json({ status: false, message: "You don't have enough balance to place order", type: 0 });
                                                                return false;
                                                            }
                                                        }
                                                    }
                                                }
                                                data.buyerUserId = orderData.orderType == 'buy' ? orderData.userId : req.userId;
                                                data.sellerUserId = orderData.orderType == 'sell' ? orderData.userId : req.userId;
                                                let payment = await query_helper.insertData(P2PTransactions, data);
                                                if (payment.status) {
                                                    payment = payment.msg;
                                                    if (returnId != '') {
                                                        await common.updatp2peBalanceUpdationId(returnId, payment._id);
                                                    }
                                                    const newval = (+orderData.usdtPrice) - (+reqBody.totalPrice);
                                                    if (orderData.autoreply != "") {
                                                        data = {
                                                            chattingHistory: {
                                                                userId: req.userId,
                                                                message: orderData.autoreply,
                                                                chattingImage: ""
                                                            }
                                                        }
                                                    }
                                                    await query_helper.updateData(P2PTransactions, "one", { _id: mongoose.Types.ObjectId(payment._id) }, data);
                                                    await common.p2pactivtylog(req.userId, req.body.ownerId," ", orderData._id, 'Create Order',(req.body.orderType == 'buy' ? 'Buy' : 'Sell') + ' Order has been created');
                                                    let result = await query_helper.updateData(P2POrder, "one", { _id: mongoose.Types.ObjectId(orderData._id) }, { usdtPrice: newval });
                                                    if (result) {
                                                        let smsTemplate = "[ Exchange ] P2P Order "+ payment.orderNo.slice(- 4) + " has been placed successfully."
                                                        await common.mobileSMS(userDetails.phoneno, smsTemplate);
                                                        res.json({ status: true, message: "Successfully place an order", data: payment , type: 0});
                                                    } else {
                                                        res.json({ status: false, message: "Something went wrong! Please try again someother time", type: 0 });
                                                    }
                                                }
                                            } else {
                                                res.json({ status: false, message: "Please try again after sometime!", type: 0 })
                                            }
                                            return false;
                                        } else {
                                            res.json({ status: false, message: "Please try again after sometime!", type: 0 })
                                        }
                                    } else {
                                        res.json({ status: false, message: "Please try again after sometime!", type: 0 })
                                    }
                                } else {
                                    return res.json({ status: false, message: "Invalid order", type: 0 });   
                                }
                            }
                        }
                    } else {
                        return res.json({ status: false, message: "Not a valid user", type: 0 });
                    }
                } else {
                    setTimeout(_intervalFunc, 5000, req.userId.toString());
                    res.json({ status: false, message: "Please wait for 5 seconds before placing another request!", type: 0 });
                }
            }
        } catch (err) {
            console.log('submitOrder', err);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time", type: 0 });
        }
    },
    async cancelOrder(req, res) {
        try {
            const orderwith = oArray.indexOf(req.userId.toString());
            if (orderwith == -1) {
                oArray.push(req.userId.toString())
                setTimeout(_intervalFunc, 5000, req.userId.toString());
                let data = { status: 2, cancelReason: req.body.reason };
                let response = await p2pHelper.cancelOrder(req.body.orderNo, req.userId, data);
                res.json(response);
            } else {
                setTimeout(_intervalFunc, 5000, req.userId.toString());
                res.json({ status: false, message: "Please wait for 5 seconds before placing another request!" });
            }
        } catch (err) {
            console.log('cancelOrder', err);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getfeedbackDetails(req, res) {
        try {
            const advertiserNo = req.body.advertiserNo;
            let query = {};
            let query1 = {};
            let query2 = {};
            if (advertiserNo != "" && advertiserNo != undefined) {
                const userId_mong = mongoose.Types.ObjectId(advertiserNo);
                query = {
                    toUserId: userId_mong,
                    feedBackStatus: 1
                }
                query1 = {
                    toUserId: userId_mong,
                    feedBackStatus: 0
                },
                query2 = {
                    toUserId: userId_mong,
                }
            } else {
                const userId_mong = mongoose.Types.ObjectId(req.userId);
                query = {
                    toUserId: userId_mong,
                    feedBackStatus: 1
                }
                query1 = {
                    toUserId: userId_mong,
                    feedBackStatus: 0
                },
                query2 = {
                    toUserId: userId_mong,
                }
            }
            const fromuserlookup = {
                $lookup:
                {
                    from: 'Users',
                    localField: 'fromUserId',
                    foreignField: '_id',
                    as: 'userDet'
                }
            };
            const fromuserunwind = {
                $unwind: {
                    path: '$userDet',
                },
            }
            const touserlookup = {
                $lookup:
                {
                    from: 'Users',
                    localField: 'toUserId',
                    foreignField: '_id',
                    as: 'ownerDet'
                }
            };
            const touserunwind = {
                $unwind: {
                    path: '$ownerDet',
                },
            }
            await P2PFeedBack.aggregate([
                {
                    $facet: {
                        postive: [
                            {
                                $match: query
                            },
                            fromuserlookup,
                            fromuserunwind,
                            touserlookup,
                            touserunwind
                        ],
                        negative: [
                            {
                                $match: query1
                            },
                            fromuserlookup,
                            fromuserunwind,
                            touserlookup,
                            touserunwind
                        ],
                        totalfeedback: [
                            {
                                $match: query2
                            },
                            fromuserlookup,
                            fromuserunwind,
                            touserlookup,
                            touserunwind
                        ],
                    },
                },

            ]).exec(async function (err, result) {
                if (result) {
                    const resultFirst = result[0] ? result[0] : [];
                    const {
                        postive = [],
                        negative = [],
                        totalfeedback = [],
                        ownerDet = []
                    } = resultFirst;
                    let feedBackDetails = {
                        postive: postive,
                        negative: negative, 
                        totalfeedback: totalfeedback,
                        positiveCount: postive.length,
                        negativeCount: negative.length,
                        totalfeedbackCount: totalfeedback.length
                    };
                    let totalpositiveFeedback = (postive.length * totalfeedback.length) / 100;
                    let totalnegativeFeedback = (negative.length * totalfeedback.length) / 100;
                    feedBackDetails.positivefeedback = totalpositiveFeedback;
                    feedBackDetails.totalnegativeFeedback = totalnegativeFeedback;
                    res.json({ "status": true, "message": "User details listed", data: feedBackDetails });
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }
            });
        } catch (err) {
            console.log('getfeedbackDetails', err);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getmyOrderDetails(req, res) {
        try {
            const advertiserNo = req.body.advertiserNo;
            let userId = "";
            if (advertiserNo != "" && advertiserNo != undefined) {
                userId = mongoose.Types.ObjectId(advertiserNo);
            } else {
                userId = mongoose.Types.ObjectId(req.userId);
            }
            let monthlyDate = new Date();
            monthlyDate.setMonth(monthlyDate.getMonth() - 1);
            await P2PTransactions.aggregate([
                {
                    $facet: {
                        monthtradeCounts: [
                            {
                                $match: {
                                    userId: userId,
                                    createdDate: { $gte: monthlyDate }
                                },
                            },
                            {
                                $group: {
                                    _id: "$userId",
                                    count: { $sum: 1 },
                                }
                            },
                        ],
                        totaltradesCounts: [
                            {
                                $match: {
                                    userId: userId,
                                },
                            },
                            {
                                $group: {
                                    _id: "$userId",
                                    count: { $sum: 1 },
                                }
                            },
                        ],
                        totalbuyCounts: [
                            {
                                $match: {
                                    userId: userId,
                                    orderType: "buy"
                                },
                            },
                            {
                                $group: {
                                    _id: "$userId",
                                    count: { $sum: 1 },
                                }
                            },
                        ],
                        completedordersCounts: [
                            {
                                $match: {
                                    userId: userId,
                                    status: 1,
                                    createdDate: { $gte: monthlyDate }
                                },
                            },
                            {
                                $group: {
                                    _id: "$userId",
                                    count: { $sum: 1 },
                                }
                            },
                        ],
                        totalsellCounts: [
                            {
                                $match: {
                                    userId: userId,
                                    orderType: "sell"
                                },
                            },
                            {
                                $group: {
                                    _id: "$userId",
                                    count: { $sum: 1 },
                                }
                            },
                        ],
                        firstTradeDate: [
                            {
                                $match: {
                                    userId: userId,
                                },
                            },
                            { $sort: { createdDate: 1 } },
                        ],
                    }
                },
            ])
                .exec(async function (err, result) {
                    if (result) {
                        const resultFirst = result[0] ? result[0] : [];
                        const {
                            monthtradeCounts = [],
                            totaltradesCounts = [],
                            totalbuyCounts = [],
                            totalsellCounts = [],
                            completedordersCounts = [],
                        } = resultFirst;
                        let usertradeDetails = {
                            monthtradeCounts: (monthtradeCounts.length == 0) ? 0 : monthtradeCounts[0].count,
                            totaltradesCounts: (totaltradesCounts.length == 0) ? 0 : totaltradesCounts[0].count,
                            totalbuyCounts: (totalbuyCounts.length == 0) ? 0 : totalbuyCounts[0].count,
                            totalsellCounts: (totalsellCounts.length == 0) ? 0 : totalsellCounts[0].count,
                            completedordersCounts: (completedordersCounts.length == 0) ? 0 : completedordersCounts[0].count,
                        }; 
                        if (result.length > 0) {
                            result.forEach(element => {
                                if (element.firstTradeDate.length > 0) {
                                    const curDate = new Date();
                                    const tradeDays = (element.firstTradeDate[0].createdDate);
                                    const firstTradeDate = new Date(tradeDays);
                                    const oneDay = (1000 * 60 * 60 * 24);
                                    const diffInTime = (curDate.getTime()) - (firstTradeDate.getTime());
                                    const diffInDays = Math.round(diffInTime / oneDay);
                                    usertradeDetails.firstTradeDate = diffInDays;
                                } else {
                                    usertradeDetails.firstTradeDate = 0;
                                }
                                let total = (usertradeDetails.completedordersCounts * usertradeDetails.totaltradesCounts) / 100;
                                usertradeDetails.completionRate = (total);
                            });
                            res.json({ "status": true, "message": "My trade details listed", data: usertradeDetails });
                        } else {
                            res.json({ "status": true, "message": "My trade details not listed", data: usertradeDetails });
                        }
                    } else {
                        res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                    }
                });
        } catch (err) {
            console.log('getmyOrderDetails', err);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });

        }
    },
    async getmyFeedBack(req, res) {
        try {
            let checkTxn = await query_helper.findoneData(P2PTransactions, { orderNo: req.body.orderNo }, {});
            if (checkTxn.status) {
                checkTxn = checkTxn.msg;
                let Feedback = await P2PFeedBack.find({ orderId: mongoose.Types.ObjectId(checkTxn._id) });
                if (Feedback && Feedback.length > 0) {
                    res.json({ "status": true, "message": 'payment details', data: Feedback });
                } else {
                    res.json({ "status": false, "message": 'No records found!' });
                }
            }
        } catch (e) {
            res.json({ "status": false, "message": "No records found!" });
        }
    },
    async createFeedback(req, res) {
        try {
            let data = {};
            data.feedBackStatus = (req.body.type == 'positive' ? 1 : 0);
            data.description = req.body.description != "" ? req.body.description : "";
            let checkTxn = await query_helper.findoneData(P2PTransactions, { orderNo: req.body.orderNo }, {});
            if (checkTxn.status) {
                checkTxn = checkTxn.msg;
                data.toUserId = req.body.toUserId;
                data.fromUserId = req.userId;
                data.orderId = checkTxn._id;
                let Feedback = await query_helper.findoneData(P2PFeedBack, { orderId: mongoose.Types.ObjectId(checkTxn._id), toUserId: mongoose.Types.ObjectId(data.toUserId) }, {})
                if (Feedback.status) {
                    let FeedBackStatus = await query_helper.updateData(P2PFeedBack, "one", { orderNo: data.orderNo, toUserId: mongoose.Types.ObjectId(data.toUserId) }, data);
                    if (FeedBackStatus.status) {
                        res.json({ status: true, message: "Feed Back Updated Successfully", data: FeedBackStatus.msg });
                    } else {
                        res.json({ status: false, message: "Something went wrong! Please try again someother time" });
                    }
                } else {
                    let FeedBackStatus = await query_helper.insertData(P2PFeedBack, data);
                    if (FeedBackStatus.status) {
                        res.json({ status: true, message: "Feed Back Created Successfully", data: FeedBackStatus.msg });
                    } else {
                        res.json({ status: false, message: "Something went wrong! Please try again someother time" });
                    }
                }
            } else {
                res.json({ "status": false, "message": "No records found!" });
            }
        } catch (err) {
            console.log("err_err", err);
            res.json({ status: false, message: "Something went wrong! Please try again someother time" });
        }
    },
    async submitChatMessage(req, res) {
        try {
            let data = {};
            let reqBody = req.body;
            let checkData = await P2PTransactions.findOne({ orderNo: reqBody.orderNo });
            let checkLength = checkData.chattingHistory.length;
            if (checkLength == 0) {
                let userResult = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(checkData.ownerId) }, {});
                let userStatus = userResult.msg;
                let email_data = await query_helper.findoneData(emailTemplate, { hint: 'P2P-Order-message' }, {});
                let etempdataDynamic = email_data.msg.content.replace(/###NAME###/g, userStatus.username).replace(/###ORDERNO###/g, req.body.orderNo).replace(/###TYPE###/g, checkData.orderType).replace(/###MESSAGE###/g, reqBody.chattingMsg);
                mail_helper.sendMail({ subject: email_data.msg.subject, to: userStatus.email, html: etempdataDynamic }, function (res1) {
                });
            }
            if (checkData) {
                if (reqBody.attachment != "") {
                    data = {
                        chattingHistory: {
                            userId: req.userId,
                            message: reqBody.chattingMsg,
                            chattingImage: reqBody.attachment
                        }
                    }
                } else {
                    data = {
                        chattingHistory: {
                            userId: req.userId,
                            message: reqBody.chattingMsg,
                            chattingImage: ""
                        }
                    }
                }
                let result = await P2PTransactions.findOneAndUpdate({ orderNo: reqBody.orderNo }, { $addToSet: { chattingHistory: data.chattingHistory } });
                if (result) {
                    let last_element = {};
                    if (result.chattingHistory && result.chattingHistory.length > 0){
                        last_element = result.chattingHistory.findLast((result) => true);
                    }
                    let userResult = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.userId) }, {});
                    let userStatus = userResult.msg;
                    let email_data = await query_helper.findoneData(emailTemplate, { hint: 'p2p-chatting-message' }, {});
                    if (email_data.status) {
                        let etempdataDynamic = email_data.msg.content.replace(/###NAME###/g, reqBody.chattingMsg).replace(/###LINK###/g, last_element.chattingImage)
                        mail_helper.sendMail({ subject: email_data.msg.subject, to: userStatus.email, html: etempdataDynamic }, function (res1) {
                            let socket = common.GetSocket();
                            socket.sockets.emit('chattingResponse', { chattingHistory: data.chattingHistory, orderNo: reqBody.orderNo });
                            res.json({ "status": true, "message": 'Successfully!' });
                        });
                    } else {
                        res.json({ status: false, message: "Oops! Something went wrong.Please try again" })
                    }
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }
            } else {
                res.json({ status: false, message: "Not valid orderId" });
            }
        } catch (err) {
            console.log('submitChatMessage', err);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getappealHistory(req, res) {
        try {
            P2PAppealHistory.aggregate([
                {
                    $match: {
                        orderNo: req.body.orderNo,
                    }
                },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'userDet'
                    }
                },
                { $unwind: "$userDet" },
                {
                    $project: {
                        "userName": "$userDet.username",
                        "userEmail": "$userDet.email",
                        "user_ID": "$userDet._id",
                        "appealHistory": "$appealHistory",
                        "date": "$appealHistory.date",
                        "reason": "$reason",
                        "orderNo": "$orderNo",
                        "appealCode": "$appealCode",
                        "status": "$status",
                        "userId": "$userId",
                        "ownerId": "$ownerId",
                        "helpbuyer": "$helpbuyer",
                        "helpseller": "$helpseller",
                        "createdDate": "$createdDate",
                        "appealEndDate": "$appealEndDate"
                    },
                },

            ]).exec(async function (err, result) {
                if (result) {
                    res.json({ "status": true, "message": "Appeal details listed", data: result });
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }
            });
        } catch (err) {
            console.log('getappealHistory', err);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async helpcenterAppeal(req,res) {
        try {
            let data = {};
            let reqBody = req.body;
            let checkOwner = await P2PTransactions.findOne({ orderNo: reqBody.orderNo });
            if (checkOwner) {
                if ((checkOwner && checkOwner.ownerId) == req.userId) {
                    data.helpbuyer =  {
                        buyedId : req.userId,
                        description : reqBody.supportMessage,
                        status:3
                    }
                } else {
                    data.helpseller =  {
                        sellerId : req.userId,
                        description : reqBody.supportMessage,
                        status:3
                    }
                }
                let checkData = await P2PAppealHistory.find({ 'orderNo': checkOwner.orderNo, status: 1 }).sort({ "createdDate": -1 });
                if (checkData && checkData.length > 0) {
                     let appealData = await P2PAppealHistory.find({ 'orderNo': reqBody.orderNo});
                    if (appealData && appealData.length > 0) {
                        let result = await P2PAppealHistory.findOneAndUpdate({ orderNo: reqBody.orderNo}, { $set: data }, { new: true });
                            if (result) {
                                let adminUser = await Admin.find({ "role":1,'status': 1});
                                if (adminUser && adminUser.length > 0) {
                                    let email = adminUser && adminUser[0].email;
                                    let name = adminUser && adminUser[0].name;
                                    let email_data = await query_helper.findoneData(emailTemplate, { hint: 'p2p-support-center' }, {});
                                    let etempdataDynamic = email_data.msg.content.replace(/###NAME###/g, name).replace(/###supportMessage###/g, reqBody.supportMessage);
                                    mail_helper.sendMail({ subject: email_data.msg.subject, to: email, html: etempdataDynamic }, function (res1) {
                                    });
                                    res.json({ status: true, message: "Support Message Sented Successfully", data: result })
                                } else {
                                    res.json({ status: false, message: "Not valid admin" })
                                }
                            } else {
                                res.json({ status: false, message: "Support Message Sented Failed" })
                            }
                    } else {
                        let result = await P2PAppealHistory.findOneAndUpdate({ orderNo: reqBody.orderNo}, { $set:  data  }, { new: true });
                            if (result) {
                                let adminUser = await Admin.find({ "role":1,'status': 1});
                                if (adminUser && adminUser.length > 0) {
                                    let email = adminUser && adminUser[0].email;
                                    let name = adminUser && adminUser[0].name;
                                    let email_data = await query_helper.findoneData(emailTemplate, { hint: 'p2p-support-center' }, {});
                                    let etempdataDynamic = email_data.msg.content.replace(/###NAME###/g, name).replace(/###supportMessage###/g, reqBody.supportMessage);
                                    mail_helper.sendMail({ subject: email_data.msg.subject, to: email, html: etempdataDynamic }, function (res1) {
                                    });
                                    res.json({ status: true, message: "Support Message Sented Successfully", data: result })
                                } else {
                                    res.json({ status: false, message: "Not valid admin" })
                                }
                            } else {
                                res.json({ status: false, message: "Support Message Sented Failed" })
                            }
                    }
                } else {
                    res.json({ status: false, message: "Appeal number is not valid" });
                }
            } else {
                res.json({ status: false, message: "Order number is not valid" });
            }
        } catch(err){}
    },
    async createAppeal(req, res) {
        try {
            let data = {};
            let reqBody = req.body;
            if (reqBody.attachment != "") {
                data = {
                    orderNo: reqBody.orderNo,
                    userId: reqBody.userId,
                    appealHistory: {
                        userId: reqBody.userId,
                        description: reqBody.description,
                        phone: reqBody.phone,
                        attachment: reqBody.attachment,
                    }
                }
            } else {
                data = {
                    orderNo: reqBody.orderNo,
                    userId: reqBody.userId,
                    appealHistory: {
                        userId: reqBody.userId,
                        description: reqBody.description,
                        phone: reqBody.phone,
                    }
                }
            }
            let checkOwner = await P2PTransactions.findOne({ orderNo: reqBody.orderNo });
            if (checkOwner) {
                let checkData = await P2PAppealHistory.find({ 'orderNo': checkOwner.orderNo, status: 1 }).sort({ "createdDate": -1 });
                if (checkData && checkData.length > 0) {
                    let appealData = await P2PAppealHistory.find({ 'orderNo': reqBody.orderNo, "appealHistory.userId": mongoose.Types.ObjectId(req.userId) });
                    if (appealData && appealData.length > 0) {
                        await P2PAppealHistory.findOneAndUpdate({ 'orderNo': reqBody.orderNo, "appealHistory.userId": req.userId }, { $addToSet: { 'appealHistory': data.appealHistory } }, { upsert: true }, function (err, result) {
                            if (result) {
                                res.json({ status: true, message: "Appeal Created Successfully", data: result })
                            } else {
                                res.json({ status: false, message: "Appeal Failed" })
                            }
                        });
                    } else {
                        await P2PAppealHistory.findOneAndUpdate({ 'orderNo': reqBody.orderNo }, { $addToSet: { 'appealHistory': data.appealHistory } }, { upsert: true }, function (err, result) {
                            if (result) {
                                res.json({ status: true, message: "Appeal Created Successfully", data: result })
                            } else {
                                res.json({ status: false, message: "Appeal Failed" })
                            }
                        });
                    }
                } else {
                    const currDate = new Date();
                    currDate.setMinutes(currDate.getMinutes() + checkOwner.orderLimit);
                    data.appealEndDate = currDate;
                    data.appealCode = Math.floor(1000000 + Math.random() * 9000000);
                    data.reason = reqBody.reasonAppeal;
                    let appealStatus = await query_helper.insertData(P2PAppealHistory, data);
                    if (appealStatus.status) {
                        let userResult = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.userId) }, {});
                        let userStatus = userResult.msg;
                        let email_data = await query_helper.findoneData(emailTemplate, { hint: 'p2p-Order-Payment-Apeal' }, {});
                        let etempdataDynamic = email_data.msg.content.replace(/###NAME###/g, userStatus.username).replace(/###ORDERNO###/g, reqBody.orderNo).replace(/###AMOUNT###/g, common.roundValuesMail(+(checkOwner.price * checkOwner.totalPrice), 2));
                        mail_helper.sendMail({ subject: email_data.msg.subject, to: userStatus.email, html: etempdataDynamic }, function (res1) {
                        });
                        res.json({ status: true, message: "Successfully Created Appeal", data: appealStatus.msg });
                    } else {
                        res.json({ status: false, message: "Not inserted" });
                    }
                }
            } else {
                res.json({ status: false, message: "Order number is not valid" });
            }
        } catch (err) {
            console.log('createAppeal', err);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async cancelAppeal(req, res) {
        try {
            let data = {};
            let reqBody = req.body;
            data.status = 2;
            let checkData = await P2PAppealHistory.find({ orderNo: reqBody.orderNo, userId: mongoose.Types.ObjectId(req.userId), status: 1 }).sort({ "createdDate": -1 });
            if (checkData && checkData.length > 0) {
                await query_helper.updateData(P2PAppealHistory, "one", { orderNo: reqBody.orderNo, userId: mongoose.Types.ObjectId(req.userId) }, data);
                let userResult = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.userId) }, {});
                let userStatus = userResult.msg;
                let email_data = await query_helper.findoneData(emailTemplate, { hint: 'p2p-Apeal-Cancel' }, {});
                let etempdataDynamic = email_data.msg.content.replace(/###NAME###/g, userStatus.username).replace(/###ORDERNO###/g, reqBody.orderNo);
                mail_helper.sendMail({ subject: email_data.msg.subject, to: userStatus.email, html: etempdataDynamic }, function (res1) {
                });
                res.json({ "status": true, "message": 'Appeal Cancelled Successfully' });
            } else {
                res.json({ "status": false, "message": 'Appeal Not Cancelled' });
            }
        } catch (err) {
            console.log('cancelAppeal', err);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getCurrentpair(req, res) {
        try {
            let data =  req.body.pair.toLowerCase();
            if (data){
                let pair = data.split("_")[0] + data.split("_")[1];
                let fromCurrency = req.body.pair.split("_")[0];
                let toCurrency = req.body.pair.split("_")[1];
                let currencyStatus = await query_helper.findoneData(CurrencyDb, { "currencySymbol": fromCurrency }, {});
                if (currencyStatus.status){
                    currencyStatus = currencyStatus.msg;
                    const pairDet = await getJSON("https://api.wazirx.com/sapi/v1/ticker/24hr?symbol=" + pair);
                    if (pairDet) {
                        res.json({ status: true, message: "get current pair price", data: pairDet })
                    } else {
                        const pairDet = await getJSON("https://api.coingecko.com/api/v3/simple/price?ids=" + currencyStatus.apiid + "&vs_currencies=" + toCurrency);
                        if (pairDet && pairDet[currencyStatus.apiid]) {
                            let currentPrice = pairDet[currencyStatus.apiid][toCurrency.toLowerCase()];
                            res.json({ status: true, message: "get current pair price", data: { lastPrice: currentPrice } });
                        } else {
                            res.json({ status: true, message: "get current pair price", data: { lastPrice: 0} })
                        }
                    }
                } else{
                    res.json({ status: false, message: "Not valid currency",data:[] });
                }
            } else {
                res.json({ status: false, message: "Pair Details is required",data:[] });
            }
        } catch (err) {
            console.log("err:",err)
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getblockUsers(req, res) {
        try {
            let query = {};
            if (req.body.advertiserNo != undefined) {
                query = { advertiserNo: mongoose.Types.ObjectId(req.body.advertiserNo), userId: mongoose.Types.ObjectId(req.userId), type:"blockuser"};
            } else {
                query = { userId: mongoose.Types.ObjectId(req.userId), type:"blockuser"};
            }
            P2PReport.aggregate([
                {
                    $match: query
                },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'advertiserNo',
                        foreignField: '_id',
                        as: 'userDet'
                    }
                },
                { $unwind: "$userDet" },
                {
                    $project: {
                        "username": "$userDet.username",
                        "advertiserNo": "$advertiserNo",
                        "orderNo": "$orderNo",
                        "userId": "$userId",
                        "reason": "$reason",
                        "type": "$type",
                        "status": "$status",
                        "createdDate": "$createdDate",
                    },
                },
            ]).exec(async function (err, result) {
                if (result) {
                    res.json({ "status": true, "message": "Report details listed", data: result });
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }
            });
        } catch (err) { console.log("err:", err) }
    },
    async submitReport(req, res) {
        try {
            let reqBody = req.body;
            let type = reqBody.type;
            let blockeduserResult = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.body.advertiserNo) }, {});
            let userResult = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.userId) }, {});
            if ((blockeduserResult.status && blockeduserResult.msg && userResult.status && userResult.msg) || (userResult.status && userResult.msg)) {
                let reportStatus = await query_helper.findoneData(P2PReport, { userId: mongoose.Types.ObjectId(req.userId), advertiserNo: mongoose.Types.ObjectId(req.body.advertiserNo), type: req.body.type }, {});
                if (reportStatus.status && reportStatus.msg.type != "report") {
                    reportStatus = reportStatus.msg;
                    reportStatus.reason = reqBody.reason;
                    let status = 0;
                    if (reportStatus.status == 1) {
                        status = 0;
                        reportStatus.reason = reportStatus.reason;
                    } else {
                        status = 1;
                    }
                    await query_helper.updateData(P2PReport, "one", { userId: mongoose.Types.ObjectId(req.userId), advertiserNo: mongoose.Types.ObjectId(req.body.advertiserNo), type: req.body.type }, { status: status, reason: reqBody.reason });
                    if (type == "blockuser" && reportStatus.status == 0) {
                        let email_data = await query_helper.findoneData(emailTemplate, { hint: 'p2p-blocked-User' }, {});
                        if (email_data) {
                            let etempdataDynamic = email_data.msg.content.replace(/###NAME###/g, userResult.msg.username);
                            mail_helper.sendMail({ subject: email_data.msg.subject, to: blockeduserResult.msg.email, html: etempdataDynamic }, function (res1) {
                                res.json({ status: true, message: "User Blocked successfully"}); 
                            });
                        } else {
                            res.json({ status: false, message: "Oops! Something went wrong.Please try again" })
                        }
                    } else {
                        let email_data = await query_helper.findoneData(emailTemplate, { hint: 'p2p-unblocked-User' }, {});
                        if (email_data) {
                            let etempdataDynamic = email_data.msg.content.replace(/###NAME###/g, userResult.msg.username);
                            mail_helper.sendMail({ subject: email_data.msg.subject, to: blockeduserResult.msg.email, html: etempdataDynamic }, function (res1) {
                                res.json({ status: true, message: "User Unblocked successfully"}); 
                            });
                        } else {
                            res.json({ status: false, message: "Oops! Something went wrong.Please try again" })
                        }
                    }
                } else {
                    if (reqBody.type == "blockuser") {
                        reqBody.status = 1;
                        let reportData = await query_helper.insertData(P2PReport, reqBody);
                            let email_data = await query_helper.findoneData(emailTemplate, { hint: 'p2p-blocked-User' }, {});
                            if (email_data) {
                                let etempdataDynamic = email_data.msg.content.replace(/###NAME###/g, userResult.msg.username);
                                mail_helper.sendMail({ subject: email_data.msg.subject, to: blockeduserResult.msg.email, html: etempdataDynamic }, function (res1) {
                                    res.json({ status: true, message: "User Blocked successfully", data: reportData }); 
                                });
                            } else {
                                res.json({ status: false, message: "Oops! Something went wrong.Please try again" })
                            }
                    }else {
                        let orderStatus = await query_helper.findoneData(P2PTransactions, { orderNo: reqBody.orderNo }, {});
                        if (orderStatus.status == false){
                            return res.json({ status: false, message: "Invalid Order No" });
                        }
                        let ReportStatus = await P2PReport.find({ userId: mongoose.Types.ObjectId(reqBody.userId), orderNo: reqBody.orderNo});
                        if(ReportStatus && ReportStatus.length == 1 ) {
                            return res.json({ status: false, message: "Already your report submitted successfully" });
                        }

                        let reportData = await query_helper.insertData(P2PReport, reqBody);
                        let email_data = await query_helper.findoneData(emailTemplate, { hint: 'p2p-report' }, {});
                        if (email_data) {
                            let advertiserResult = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.body.advertiserNo) }, {});
                            if (advertiserResult.status) {
                                advertiserResult = advertiserResult.msg;
                                let etempdataDynamic = email_data.msg.content.replace(/###NAME###/g, advertiserResult.username).replace(/###REPORTERNAME###/g, userResult.msg.username).replace(/###REASON###/g, reqBody.reason)
                                res.json({ status: true, message: "Report submitted successfully", data: reportData });
                                mail_helper.sendMail({ subject: email_data.msg.subject, to: advertiserResult.email, html: etempdataDynamic }, function (res1) {
                                });
                            } else {
                                res.json({ status: false, message: "Invalid advertiser" })
                            }
                        } else {
                            res.json({ status: false, message: "Oops! Something went wrong.Please try again" })
                        }
                    }
                }
            } else {
                res.json({ "status": false, "message": "Not a valid" });
            }
        } catch (err) {
            console.log("P2PReport:", err);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async enableDisablP2PPayment(req,res){
        try {
            let reqBody = req.body;
            let userData = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.userId) }, {})
            if (userData.status){
                let payment = await query_helper.findoneData(P2PPayment, { userId: mongoose.Types.ObjectId(req.userId) }, {})
                if (payment.status){
                    let status = {}
                    if (reqBody.status == 1) {
                        status = { "methods.$.status" : 5 };
                    } else if (reqBody.status == 5) {
                        status = { "methods.$.status" : 1 };
                    }
                    let data = await P2PPayment.findOneAndUpdate({ 'methods._id': mongoose.Types.ObjectId(reqBody._id) }, { $set: status }, { new: true });
                    if(data) {
                        let text = "";
                        if (reqBody.status == 1) {
                            text = reqBody.paymenttype == "Bank" ? "Bank Account is disabled Successfully...!" : "UPI is disabled successfully..!"
                        } else {
                            text = reqBody.paymenttype == "Bank" ? "Bank Account is enabled Successfully...!" : "UPI is enabled successfully..!"
                        }
                        res.json({ "status": true, "message" : text,"getp2ppaymentDetails": data });
                    } else {
                        res.json({ status: false, message: "Payment Added Failed" })
                    }
                } else {
                    res.json({ "status": false, "message": 'Not a valid payment!',data:[] });
                }
            } else{
                res.json({ "status": false, "message": 'Not a valid user!',data:[] });
            }
        } catch(err){
            console.log("err:",err)
        }
    },
    async getParticularCurrency (req, res) {
        try {
            const {
                currencySymbol = "INR"
            } = req.body;
            let where = { currencySymbol };
            if ((typeof req.body.CurrencyID == 'string' && req.body.CurrencyID != '') && mongoose.Types.ObjectId.isValid(req.body.CurrencyID)) {
                where = {_id: mongoose.Types.ObjectId(req.body.CurrencyID)}
            }
            let currency = await query_helper.findoneData(CurrencyDb, where, {})
            if (currency.status){
                res.json({ "status": currency.status, "data": currency.msg });
            } else {
                res.json({ "status": currency.status, "message": 'No records found', "data": [] });
            }
        } catch (e) {
            console.log('getParticularCurrency',e);
            res.json({ "status": false, "data": [] });
        }
    },
    // admin panel
    async getallTransactions(req,res) {
        try {
            let query = {};
            let getdata = req.body.formvalue;
            let sort = { createdDate: -1 };
            if (getdata) {
                
                if (getdata.fromdate != '' && getdata.todate!='') {
                    var fromDate= new Date(getdata.fromdate);
                    var toDate = new Date(getdata.todate);
                    var dateFilter= new Date(fromDate.setTime(fromDate.getTime() + 5.5*60*60*1000));
                    var nextDateFilter = new Date(toDate.setTime(toDate.getTime() + 29.49*60*60*1000));
                    query.createdDate = {
                        "$gte":dateFilter,
                        "$lt":nextDateFilter
                    }
                }

                if (getdata.searchQuery != '') {
                    let userMatchQ = { '$and': [{ '$or': [{ "username": { $regex: getdata.searchQuery } }, { "email": { $regex: getdata.searchQuery } }] }] };
                    let users = await query_helper.findData(Users, userMatchQ, { _id: 1 }, {}, 0, 1)
                    let userIds = [];
                    if (users.status && users.msg.length > 0) {
                        users.msg.forEach(function (item) {
                            userIds.push(item._id);
                        });
                    }
                    if (userIds.length > 0) {
                        query.userId = { $in: userIds };
                    } else {
                        query.searchQuery = '';
                    }
                }

                if (getdata.type != '') {
                    query.orderType = getdata.type;
                }

                if (getdata.orderNo != '') {
                    query.orderNo = getdata.orderNo;
                }

                if (getdata.status != '') {
                    query.status = getdata.status == "processing" ? 3 : getdata.status == "completed" ? 1 : 2 ;
                }
            }
           
            let limit = req.body.limit ? parseInt(req.body.limit) : 10;
            let offset = req.body.offset? parseInt(req.body.offset) : 0;

            let ordercount= await P2PTransactions.find(query).countDocuments();
            P2PTransactions.aggregate([
                {
                    $match: query
                },
                { "$sort": sort },
                { "$limit": offset+ limit },
                { "$skip": offset },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'buyerUserId',
                        foreignField: '_id',
                        as: 'buyerDet'
                    }
                },
                { $unwind: "$buyerDet" },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'sellerUserId',
                        foreignField: '_id',
                        as: 'sellerDet'
                    }
                },
                { $unwind: "$sellerDet" },
                {
                    $lookup:
                    {
                        from: 'P2PPair',
                        localField: 'pairId',
                        foreignField: '_id',
                        as: 'pairDet'
                    }
                },
                { $unwind: "$pairDet" },
                {
                    $lookup:
                    {
                        from: 'Currency',
                        localField: 'pairDet.fromCurrency',
                        foreignField: '_id',
                        as: 'fromCurrency'
                    }
                },
                { $unwind: "$fromCurrency" },
                {
                    $lookup:
                    {
                        from: 'Currency',
                        localField: 'pairDet.toCurrency',
                        foreignField: '_id',
                        as: 'toCurrency'
                    }
                },
                { $unwind: "$toCurrency" },
                {
                    $project: {
                        "pairDet": "$pairDet",
                        "fromCurrencyId": "$fromCurrency._id",
                        "fromCurrency": "$fromCurrency.currencySymbol",
                        "toCurrency": "$toCurrency.currencySymbol",
                        "toCurrencyId": "$toCurrency._id",
                        "buyerName": "$buyerDet.username",
                        "buyerEmail": "$buyerDet.email",
                        "sellerName": "$sellerDet.username",
                        "sellerEmail": "$sellerDet.email",
                        "paymentId": "$paymentId",
                        "buyerUserId": "$buyerUserId",
                        "sellerUserId": "$sellerUserId",
                        "paymentEndDate": "$paymentEndDate",
                        "orderNo": "$orderNo",
                        "orderType": "$orderType",
                        "pairId": "$pairId",
                        "totalPrice": "$totalPrice",
                        "price": "$price",
                        "status": "$status",
                        "orderLimit": "$orderLimit",
                        "createdDate": "$createdDate",
                    },
                },
            ]).exec(async function (err, result) {
                if (result) {
                    res.json({ "status": true, "message": "Order details listed", data: result, total: ordercount });
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time", total: 0 });
                }
            });
        } catch (err) {
            console.log("err:",err)
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time", total: 0 });
        }
    },
    async getallAppealDetails(req,res) {
        try {
            let query = {};
            let getdata = req.body.formvalue;
            let sort = { createdDate: -1 };
            if (getdata) {
                if(getdata.fromdate != '' && getdata.todate!=''){
                    var fromDate= new Date(getdata.fromdate);
                    var toDate = new Date(getdata.todate);
                    var dateFilter= new Date(fromDate.setTime(fromDate.getTime() + 5.5*60*60*1000));
                    var nextDateFilter = new Date(toDate.setTime(toDate.getTime() + 29.49*60*60*1000));
                    query.createdDate = {
                        "$gte":dateFilter,
                        "$lt":nextDateFilter
                    }
                }
                if (getdata.status != '') {
                    query.status = Number(getdata.status);
                }
                if (getdata.orderNo != '') {
                    query.orderNo = getdata.orderNo;
                }
            }
            let limit =req.body.limit?parseInt(req.body.limit):10;
            let offset =req.body.offset? parseInt(req.body.offset):0
            let ordercount= await P2PAppealHistory.find(query).countDocuments();
            P2PAppealHistory.aggregate([
                {
                    $match: query
                },
                { "$sort": sort },
                { "$limit": offset+ limit },
                { "$skip": offset },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'appealCreatorDet'
                    }
                },
                { $unwind: "$appealCreatorDet" },
                {
                    $project: {
                        "appealCreatorEmail": "$appealCreatorDet.email",
                        "appealCreatorUserName": "$appealCreatorDet.username",
                        "appealCreatorDet" : "$appealCreatorDet",
                        "appealHistory": "$appealHistory",
                        "userId": "$userId",
                        "orderNo": "$orderNo",
                        "appealCode": "$appealCode",
                        "reason": "$reason",
                        "helpseller": "$helpseller",
                        "helpbuyer": "$helpbuyer",
                        "status": "$status",
                        "createdDate": "$createdDate",
                    },
                },
            ]).exec(async function (err, result) {
                if (result) {
                    res.json({ "status": true, "message": "Appeal details listed", data: result, total: ordercount });
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }
            });
        } catch (err) {}
    },
    async getTransactionHistoryDetails(req,res) {
        try {
            let query = {};
            let sort = { createdDate: -1 }
            query = {_id: mongoose.Types.ObjectId(req.body._id) };
            P2PTransactions.aggregate([
                {
                    $match: query
                },
                { "$sort": sort },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'buyerUserId',
                        foreignField: '_id',
                        as: 'buyerDet'
                    }
                },
                { $unwind: "$buyerDet" },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'sellerUserId',
                        foreignField: '_id',
                        as: 'sellerDet'
                    }
                },
                { $unwind: "$sellerDet" },
                {
                    $lookup:
                    {
                        from: 'P2POrder',
                        localField: 'orderId',
                        foreignField: '_id',
                        as: 'orderDet'
                    }
                },
                { $unwind: "$orderDet" },
                {
                    $lookup:
                    {
                        from: 'P2PPair',
                        localField: 'pairId',
                        foreignField: '_id',
                        as: 'pairDet'
                    }
                },
                { $unwind: "$pairDet" },
                {
                    $lookup:
                    {
                        from: 'Currency',
                        localField: 'pairDet.fromCurrency',
                        foreignField: '_id',
                        as: 'fromCurrency'
                    }
                },
                { $unwind: "$fromCurrency" },
                {
                    $lookup:
                    {
                        from: 'Currency',
                        localField: 'pairDet.toCurrency',
                        foreignField: '_id',
                        as: 'toCurrency'
                    }
                },
                { $unwind: "$toCurrency" },
                {
                    $project: {
                        "pairDet": "$pairDet",
                        "fromCurrencyId": "$fromCurrency._id",
                        "fromCurrency": "$fromCurrency.currencySymbol",
                        "toCurrency": "$toCurrency.currencySymbol",
                        "toCurrencyId": "$toCurrency._id",
                        "orderDet": "$orderDet",
                        "orderNo":"$orderNo",
                        "userId":"$userId",
                        "ownerId":"$ownerId",
                        "buyerName": "$buyerDet.username",
                        "buyerEmail": "$buyerDet.email",
                        "sellerName": "$sellerDet.username",
                        "sellerEmail": "$sellerDet.email",
                        "paymentId": "$paymentId",
                        "buyerUserId": "$buyerUserId",
                        "sellerUserId": "$sellerUserId",
                        "paymentEndDate": "$paymentEndDate",
                        "orderNo": "$orderNo",
                        "orderType": "$orderType",
                        "pairId": "$pairId",
                        "totalPrice": "$totalPrice",
                        "price": "$price",
                        "paymentNames": "$paymentNames",
                        "country": "$country",
                        "status": "$status",
                        "orderLimit": "$orderLimit",
                        "createdDate": "$createdDate",
                    },
                },
            ]).exec(async function (err, result) {
                if (result) {
                    res.json({ "status": true, "message": "P2P Transaction Details listed", data: result });
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }
            });
        } catch (err) {}
    },
    async getp2pAppealHistoryDetails(req,res) {
        try {
            let query = {};
            let sort = { createdDate: -1 }
            query = {_id: mongoose.Types.ObjectId(req.body._id) };
            P2PAppealHistory.aggregate([
                {
                    $match: query
                },
                { "$sort": sort },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'appealCreatorDet'
                    }
                },
                { $unwind: "$appealCreatorDet" },
               
                {
                    $lookup:
                    {
                        from: 'P2PTransactions',
                        localField: 'orderNo',
                        foreignField: 'orderNo',
                        as: 'orderDet'
                    }
                },
                { $unwind: "$orderDet" },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'orderDet.sellerUserId',
                        foreignField: '_id',
                        as: 'toUser'
                    }
                },
                { $unwind: "$toUser" },
                {
                    $project: {
                        "orderDet": "$orderDet",
                        "appealCreatorEmail": "$appealCreatorDet.email",
                        "appealCreatorUserName": "$appealCreatorDet.username",
                        "appealCreatorDet" : "$appealCreatorDet",
                        "appealHistory": "$appealHistory",
                        "helpbuyer": "$helpbuyer",
                        "helpseller": "$helpseller",
                        "userId": "$userId",
                        "orderNo": "$orderNo",
                        "appealCode": "$appealCode",
                        "reason": "$reason",
                        "status": "$status",
                        "createdDate": "$createdDate",
                        "createdDate": "$createdDate",
                        "toUserDet": "$toUser",
                    },
                },
            ]).exec(async function (err, result) {
                if (result) {
                    res.json({ "status": true, "message": "P2P Transaction Details listed", data: result });
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }
            });
        } catch (err) {}
    },
    async p2ppaymentReceived(req,res){
        
        // return res.json({ status: false, message: "We have stopped these services temporary. We will get back soon." })
        try {
            try {
                const orderwith = oArray.indexOf(req.userId.toString());
                if (orderwith == -1) {
                    oArray.push(req.userId.toString())
                    setTimeout(_intervalFunc, 5000, req.userId.toString());
                    let data = {};
                    let reqBody = req.body.orderDet;
                    let checkTxn = await query_helper.findoneData(P2PTransactions, { orderNo: reqBody.orderNo }, {});
                    if (checkTxn.status && (checkTxn.msg.verifyStep == 2 || checkTxn.msg.verifyStep == 3) && checkTxn.msg.status == 3) {
                        checkTxn = checkTxn.msg;
                        // if (req.userId != checkTxn.sellerUserId) {
                        //     res.json({ "status": false, "message": 'Not an valid request' });
                        //     return false;
                        // }
                        await query_helper.updateData(P2PTransactions, "one", { orderNo: reqBody.orderNo }, { status: 1, verifyStep: 4 });
                        let where = checkTxn.pairId != '' ? { _id: mongoose.Types.ObjectId(checkTxn.pairId) } : {};
                        let pairs = await P2PPair.findOne(where).sort({ _id: 1 }).populate("fromCurrency").populate("toCurrency");
                        if (pairs) {
                            if (pairs.fromCurrency) {
                                let fromCurrency = pairs.fromCurrency;
                                let buyerUser = checkTxn.orderType == 'buy' ? checkTxn.ownerId : checkTxn.userId;
                                let walletOutput = await common.getbalance(buyerUser, fromCurrency.currencyId);
                                if (walletOutput) {
                                    let userStatus = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(buyerUser) }, {});
                                    if (userStatus.status) {
                                        userStatus = userStatus.msg;
                                        let newbal = (+walletOutput.p2pAmount) + (+checkTxn.totalPrice);
                                        await common.updatep2pAmount(buyerUser, fromCurrency.currencyId, newbal, reqBody.orderNo, 'P2P - Completion');
                                        let email_data = await query_helper.findoneData(emailTemplate, { hint: 'p2p-order-released' }, {});
                                        let username = userStatus.username != "" ? userStatus.username : userStatus.email != "" ? userStatus.email : userStatus.phoneno;
                                        let etempdataDynamic = email_data.msg.content.replace(/###NAME###/g, username).replace(/###AMOUNT###/g, common.roundValuesMail(+newbal, 8));
                                        mail_helper.sendMail({ subject: email_data.msg.subject, to: userStatus.email, html: etempdataDynamic }, function (res1) {
                                            res.json({ status: true, message: "Order released successfully", data: checkTxn });
                                        });
                                    } else {
                                        res.json({ status: false, message: "Please try again after sometime!" })
                                    }
                                } else {
                                    res.json({ status: false, message: "Please try again after sometime!" })
                                }
                            } else {
                                res.json({ status: false, message: "Please try again after sometime!" })
                            }
                        } else {
                            res.json({ status: false, message: "Please try again after sometime!" })
                        }
                    } else {
                        res.json({ status: false, message: "Not a valid transaction!" })
                    }
                } else {
                    setTimeout(_intervalFunc, 5000, req.userId.toString());
                    res.json({ status: false, message: "Please wait for 5 seconds before placing another request!" });
                }
            } catch (err) {
                console.log('p2ppaymentReceived', err);
                res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
            }

        } catch (err) {}
    },
    async p2pCancelAppeal(req,res){
        try {
            try {
                let data = {};
                let userId = req.body.data.appealdet[0].userId;
                let reqBody = req.body.data.transactiondet;
                data.cancelReason  = req.body.data.reason;
                data.status = 2;
                let checkData = await P2PAppealHistory.find({ orderNo: reqBody.orderNo, userId: mongoose.Types.ObjectId(userId), status: 1 }).sort({ "createdDate": -1 });
                if (checkData && checkData.length > 0) {
                    await query_helper.updateData(P2PAppealHistory, "one", { orderNo: reqBody.orderNo, userId: mongoose.Types.ObjectId(userId) }, data);
                    let userResult = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(userId) }, {});
                    let userStatus = userResult.msg;
                    let email_data = await query_helper.findoneData(emailTemplate, { hint: 'p2p-Apeal-Cancel' }, {});
                    let etempdataDynamic = email_data.msg.content.replace(/###NAME###/g, userStatus.username).replace(/###ORDERNO###/g, reqBody.orderNo);
                    mail_helper.sendMail({ subject: email_data.msg.subject, to: userStatus.email, html: etempdataDynamic }, function (res1) {
                    });
                    res.json({ "status": true, "message": 'Appeal Cancelled Successfully' });
                } else {
                    res.json({ "status": false, "message": 'Appeal Not Cancelled' });
                }
            } catch (err) {
                console.log('p2pCancelAppeal', err);
                res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
            }

        } catch (err) {}
    },
    async p2pcancelOrder(req,res) {
        try {
            let data = {};
            let userId = "";
            let orderNo = "";        
            if (req.body.data) {
                userId = req.body.data.userId;
                orderNo = req.body.data.orderNo;
                data = { status: 2, cancelReason: req.body.data.reason };
            }
            let response = await p2pHelper.admincancelOrder(orderNo, userId, data);
            res.json(response);
        } catch (err) {
            console.log("err_err",)
            res.json({ "status": false, "message": err });
        }
    },
    async getP2PSettings(req, res) {
        try {
            let settings = await query_helper.findoneData(P2PSettings, {}, {})
            res.json({ "status": settings.status, "message": settings.msg, data:settings.msg });
        } catch (e) {
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async UpdateP2PSettings(req,res){
        try {
            let data = req.body;
            await query_helper.updateData(P2PSettings, "one", {}, data);
            let settings = await query_helper.findoneData(P2PSettings, {}, {});
            if (settings.status) {
                res.json({ "status": true, "message": "P2P settings updated successfully", "data": settings.msg });
            } else {
                let p2pSettings = await query_helper.insertData(P2PSettings, data);
                res.json({ "status": true, "message": "P2P settings updated successfully", "data": settings.msg });
            }
        } catch (e) {
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getp2pReportHistoryDetails(req,res) {
        try {
            let query = {};
            let sort = { createdDate: -1 }
            query = {_id: mongoose.Types.ObjectId(req.body._id),type: "report" };
            P2PReport.aggregate([
                {
                    $match: query
                },
                { "$sort": sort },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'reporterDet'
                    }
                },
                { $unwind: "$reporterDet" },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'advertiserNo',
                        foreignField: '_id',
                        as: 'advertiserDet'
                    }
                },
                { $unwind: "$advertiserDet" },
                {
                    $project: {
                        "reporterDet": "$reporterDet",
                        "advertiserDet": "$advertiserDet",
                        "userId": "$userId",
                        "orderNo": "$orderNo",
                        "email": "$email",
                        "reason": "$reason",
                        "status": "$status",
                        "createdDate": "$createdDate",
                        "description": "$description",
                        "attachment": "$attachment",
                        "type":"$type"
                    },
                },
            ]).exec(async function (err, result) {
                if (result) {
                    res.json({ "status": true, "message": "P2P Report Details listed", data: result });
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }
            });
        } catch (err) {}
    },
    async getp2pReportDetails(req,res) {
        try {
            let query = {};
            let getdata = req.body.formvalue;
            let sort = { createdDate: -1 }
            if(getdata.fromdate != '' && getdata.todate!=''){
                var fromDate= new Date(getdata.fromdate);
                var toDate = new Date(getdata.todate);
                var dateFilter= new Date(fromDate.setTime(fromDate.getTime() + 5.5*60*60*1000));
                var nextDateFilter = new Date(toDate.setTime(toDate.getTime() + 29.49*60*60*1000));
                query.createdDate = {
                    "$gte":dateFilter,
                    "$lt":nextDateFilter
                }
                query.type = "report" ;
            }
            let limit =req.body.limit?parseInt(req.body.limit):10;
            let offset =req.body.offset? parseInt(req.body.offset):0
            let ordercount= await P2PReport.find(query).countDocuments();
            P2PReport.aggregate([
                {
                    $match: query
                },
                { "$sort": sort },
                { "$limit": offset+ limit },
                { "$skip": offset },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'reporterDet'
                    }
                },
                { $unwind: "$reporterDet" },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'advertiserNo',
                        foreignField: '_id',
                        as: 'advertiserDet'
                    }
                },
                { $unwind: "$advertiserDet" },
                {
                    $project: {
                        "reporterDet.email": "$reporterDet.email",
                        "reporterDet.username": "$reporterDet.username",
                        "reporterDet.dateTime": "$reporterDet.dateTime",
                        "advertiserDet.email": "$advertiserDet.email",
                        "advertiserDet.username": "$advertiserDet.username",
                        "advertiserDet.dateTime": "$advertiserDet.dateTime",
                        "userId": "$userId",
                        "orderNo": "$orderNo",
                        "email": "$email",
                        "reason": "$reason",
                        "status": "$status",
                        "createdDate": "$createdDate",
                        "description": "$description",
                        "attachment": "$attachment",
                        "type":"$type"
                    },
                },
            ]).exec(async function (err, result) {
                if (result) {
                    res.json({ "status": true, "message": "P2P Report Details listed", data: result, total: ordercount });
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }
            });
        } catch (err) {}
    },
    async getp2pBlockedUserstDetails(req,res) {
        try {
            let query = {};
            let getdata = req.body.formvalue;
            let sort = { createdDate: -1 }
            query = { type: "blockuser" };
            if(getdata.fromdate != '' && getdata.todate!=''){
                var fromDate= new Date(getdata.fromdate);
                var toDate = new Date(getdata.todate);
                var dateFilter= new Date(fromDate.setTime(fromDate.getTime() + 5.5*60*60*1000));
                var nextDateFilter = new Date(toDate.setTime(toDate.getTime() + 29.49*60*60*1000));
                query.createdDate = {
                    "$gte":dateFilter,
                    "$lt":nextDateFilter
                }
            }
            if (req.body.formvalue.status != '') {
                query.status = req.body.formvalue.status == "blocked" ? 0 : 1 ;
            }
            if(getdata.searchQuery != '') {
                var queryvalue=getdata.searchQuery
                let userMatchQ = { "email": new RegExp(queryvalue,"i")}
                let users = await query_helper.findData(Users, userMatchQ, {_id:1}, {}, 0)
                let userIds = [];
                if(users.status && users.msg.length > 0) {
                    users.msg.forEach(function(item) {
                        userIds.push(item._id);
                    });                    
                }
                if(userIds.length > 0) {
                    query['$or'] = [
                        {
                            userId: { $in: userIds },
                            advertiserNo: { $in: userIds }
                        }
                    ]
                } else {
                    query.pairName = '';
                }
            }
            let limit =req.body.limit?parseInt(req.body.limit):10;
            let offset =req.body.offset? parseInt(req.body.offset):0
            let blockdcount= await P2PReport.find(query).countDocuments();
            P2PReport.aggregate([
                {
                    $match: query
                },
                { "$sort": sort },
                { "$limit": offset+ limit },
                { "$skip": offset },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'blockerUserDet'
                    }
                },
                { $unwind: "$blockerUserDet" },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'advertiserNo',
                        foreignField: '_id',
                        as: 'blockedUserDet'
                    }
                },
                { $unwind: "$blockedUserDet" },
                {
                    $project: {
                        "blockerUserDet.username": "$blockerUserDet.username",
                        "blockerUserDet.email": "$blockerUserDet.email",
                        "blockerUserDet._id": "$blockerUserDet._id",
                        "blockerUserDet.dateTime": "$blockerUserDet.dateTime",
                        "blockedUserDet.username": "$blockedUserDet.username",
                        "blockedUserDet.email": "$blockedUserDet.email",
                        "blockedUserDet._id": "$blockedUserDet._id",
                        "blockedUserDet.dateTime": "$blockedUserDet.dateTime",
                        "userId": "$userId",
                        "orderNo": "$orderNo",
                        "email": "$email",
                        "reason": "$reason",
                        "status": "$status",
                        "createdDate": "$createdDate",
                        "description": "$description",
                        "attachment": "$attachment",
                        "type":"$type"
                    },
                },
            ]).exec(async function (err, result) {
                if (result) {
                    res.json({ "status": true, "message": "P2P Report Details listed", data: result, total:blockdcount });
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }
            });
        } catch (err) {}
    },
    async getp2pFeedbackDetails(req,res) {
        try {
            let query = {};
            let getdata = req.body.formvalue;
            let sort = { createdDate: -1 }
            if(getdata.fromdate != '' && getdata.todate!=''){
                var fromDate= new Date(getdata.fromdate);
                var toDate = new Date(getdata.todate);
                var dateFilter= new Date(fromDate.setTime(fromDate.getTime() + 5.5*60*60*1000));
                var nextDateFilter = new Date(toDate.setTime(toDate.getTime() + 29.49*60*60*1000));
                query.createdDate = {
                    "$gte":dateFilter,
                    "$lt":nextDateFilter
                }
            }
            if(getdata.searchQuery != '') {
                var queryvalue=getdata.searchQuery
                let userMatchQ = { "email": new RegExp(queryvalue,"i")}
                let users = await query_helper.findData(Users, userMatchQ, {_id:1}, {}, 0)
                let userIds = [];
                if(users.status && users.msg.length > 0) {
                    users.msg.forEach(function(item) {
                        userIds.push(item._id);
                    });                    
                }
                if(userIds.length > 0) {
                    query['$or'] = [
                        {
                            toUserId: { $in: userIds },
                            fromUserId: { $in: userIds }
                        }
                    ]
                } else {
                    query.pairName = '';
                }
            }
            let limit =req.body.limit?parseInt(req.body.limit):10;
            let offset =req.body.offset? parseInt(req.body.offset):0
            let feebackcount= await P2PFeedBack.find(query).countDocuments();
            P2PFeedBack.aggregate([
                {
                    $match: query
                },
                { "$sort": sort },
                { "$limit": offset+ limit },
                { "$skip": offset },
                {
                    $lookup:
                    {
                        from: 'P2PTransactions',
                        localField: 'orderId',
                        foreignField: '_id',
                        as: 'orderDet'
                    }
                },
                { $unwind: "$orderDet" },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'fromUserId',
                        foreignField: '_id',
                        as: 'fromUserDet'
                    }
                },
                { $unwind: "$fromUserDet" },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'toUserId',
                        foreignField: '_id',
                        as: 'toUserDet'
                    }
                },
                { $unwind: "$toUserDet" },
                {
                    $project: {
                        "fromUserDet.username": "$fromUserDet.username",
                        "fromUserDet.email": "$fromUserDet.email",
                        "fromUserDet.Id": "$fromUserDet._id",
                        "toUserDet.username": "$toUserDet.username",
                        "toUserDet.email": "$toUserDet.email",
                        "toUserDet.Id": "$toUserDet._id",
                        "orderDet.orderNo": "$orderDet.orderNo",
                        "orderDet.orderId": "$orderDet.orderId",
                        "orderDet.createdDate": "$orderDet.createdDate",
                        "fromUserId": "$fromUserId",
                        "toUserId": "$toUserId",
                        "orderId": "$orderId",
                        "status": "$status",
                        "feedBackStatus": "$feedBackStatus",
                        "description": "$description",
                        "createdDate": "$createdDate",
                    },
                },
            ]).exec(async function (err, result) {
                if (result) {
                    res.json({ "status": true, "message": "P2P Report Details listed", data: result,total: feebackcount });
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }
            });
        } catch (err) {}
    },
    async getp2pFeedbackList(req,res) {
        try {
            let query = {};
            let sort = { createdDate: -1 }
            query = {_id: mongoose.Types.ObjectId(req.body._id)};
            let limit =req.body.limit?parseInt(req.body.limit):10;
            let offset =req.body.offset? parseInt(req.body.offset):0
            let feebackcount= await P2PFeedBack.find(query).countDocuments();
            P2PFeedBack.aggregate([
                {
                    $match: query
                },
                { "$sort": sort },
                { "$limit": offset+ limit },
                { "$skip": offset },
                {
                    $lookup:
                    {
                        from: 'P2PTransactions',
                        localField: 'orderId',
                        foreignField: '_id',
                        as: 'orderDet'
                    }
                },
                { $unwind: "$orderDet" },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'fromUserId',
                        foreignField: '_id',
                        as: 'fromUserDet'
                    }
                },
                { $unwind: "$fromUserDet" },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'toUserId',
                        foreignField: '_id',
                        as: 'toUserDet'
                    }
                },
                { $unwind: "$toUserDet" },
                {
                    $project: {
                        "fromUserDet.email": "$fromUserDet.email",
                        "fromUserDet.username": "$fromUserDet.username",
                        "fromUserDet._id": "$fromUserDet._id",
                        "toUserDet.email": "$toUserDet.email",
                        "toUserDet.username": "$toUserDet.username",
                        "toUserDet._id": "$toUserDet._id",
                        "orderDet.orderNo": "$orderDet.orderNo",
                        "orderDet.orderId": "$orderDet.orderId",
                        "orderDet.createdDate": "$orderDet.createdDate",
                        "fromUserId": "$fromUserId",
                        "toUserId": "$toUserId",
                        "orderId": "$orderId",
                        "status": "$status",
                        "feedBackStatus": "$feedBackStatus",
                        "description": "$description",
                        "createdDate": "$createdDate",
                    },
                },
            ]).exec(async function (err, result) {
                if (result) {
                    res.json({ "status": true, "message": "P2P Report Details listed", data: result, total: feebackcount });
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }
            });
        } catch (err) {}
    },
    async blockUnlockUser(req,res) {
        try {
            let checkStatus = await query_helper.findoneData(P2PReport, { _id: mongoose.Types.ObjectId(req.body.row._id), type: 'blockuser' }, {});
            if (checkStatus.status) {
                checkStatus = checkStatus.msg;
                let status = "";
                if (checkStatus.status ==1) {
                    status = 0 ;
                } else {
                    status = 1;
                }
                let data = await P2PReport.findOneAndUpdate({ _id: mongoose.Types.ObjectId(req.body.row._id) }, { $set: { status: status } }, { new: true });
                if (data) {
                    res.json({ status: true, message: data.status == 1 ? "Blocked Successfully" : "Unblocked Successfully", data: data })
                } else {
                    res.json({ status: true, message: "Please try again after sometime!" })
                }
            } else {
                res.json({ status: true, message: "Please try again after sometime!" })
            }

        } catch (err) {}
    },
    async getPairsfilter (req, res) {
        try {
            let matchQ = {};
            let getdata=req.body.formvalue
            if(getdata.pair!=''){
                var queryvalue=getdata.pair
                matchQ.pair = new RegExp(queryvalue,"i");
            }
            if(getdata.status!=''){
                var queryvalue=getdata.status
                matchQ.status = queryvalue
            }
            let limit =req.body.limit?parseInt(req.body.limit):10;
            let offset =req.body.offset? parseInt(req.body.offset):0
            let pairs = await query_helper.findDatafilter(P2PPair,matchQ,{},{_id:-1},limit,offset)
            let pairscount = await P2PPair.countDocuments(matchQ)
            res.json({ "status": pairs.status, "getp2ppairsDetails": pairs.msg, "total":pairscount});
        } catch (e) {
            console.log('getPairsfilter',e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async addPairs (req, res) {
        let data = req.body;
        let fromCurrency = await query_helper.findoneData(CurrencyDb,{_id: mongoose.Types.ObjectId(data.fromCurrency)},{});
        let toCurrency = await query_helper.findoneData(CurrencyDb,{_id: mongoose.Types.ObjectId(data.toCurrency)},{});
        if(fromCurrency.status && toCurrency.status) {
            data.pair = fromCurrency.msg.currencySymbol+'_'+toCurrency.msg.currencySymbol
            let getPairs = await query_helper.findoneData(P2PPair,{fromCurrency: mongoose.Types.ObjectId(data.fromCurrency), toCurrency: mongoose.Types.ObjectId(data.toCurrency)},{})
            if(!getPairs.status) {
                let pairs = await query_helper.insertData(P2PPair,data)
                if(pairs.status) {
                    await commonHelper.adminactivtylog(req, 'Pair Added', req.userId, mongoose.Types.ObjectId(data._id), 'New Pair', 'New Pair Added Successfully');
                    res.json({ "status": pairs.status, "message": 'P2P Pair Added Successfully!' });
                } else {
                    res.json({ "status": false, "message": pairs.msg });
                }
            } else {
                res.json({ "status": false, "message": 'P2P Pair Already Exists' });
            }
        } else {
            res.json({ "status": false, "message": 'Not a valid from and to currency' });
        }
    },
    async updatePairs (req, res) {
        let data = req.body;
        let getPairs = await query_helper.findoneData(P2PPair,{fromCurrency: mongoose.Types.ObjectId(data.fromCurrency), toCurrency: mongoose.Types.ObjectId(data.toCurrency), _id: { $ne: mongoose.Types.ObjectId(data._id) }},{})
        if(!getPairs.status) {
            delete data.fromCurrency;
            delete data.toCurrency;
            let pairs = await query_helper.updateData(P2PPair,"one",{_id:mongoose.Types.ObjectId(data._id)},data)
            if(pairs.status) {
                await commonHelper.adminactivtylog(req, 'P2P Pair Updated', req.userId, mongoose.Types.ObjectId(data._id), 'Pair Updated', ' Pair Updated Successfully');
                res.json({ "status": pairs.status, "message": 'P2P Pair Updated Successfully!' });
            } else {
                res.json({ "status": false, "message": pairs.msg });
            }
        } else {
            res.json({ "status": false, "message": 'P2P Pair Already Exists' });
        }
    },
    async getFaq (req, res) {
        try {
            let matchQ = {};
            let getdata=req.body.formvalue
            if(getdata.status!=''){
                var queryvalue=getdata.status
                matchQ.status = queryvalue
            }
            let limit =req.body.limit?parseInt(req.body.limit):10;
            let offset =req.body.offset? parseInt(req.body.offset):0
            let pairs = await query_helper.findDatafilter(P2PFaqDb,matchQ,{},{_id:-1},limit,offset)
            let pairscount = await P2PFaqDb.countDocuments(matchQ)
            res.json({ "status": pairs.status, "getp2ppairsDetails": pairs.msg, "total":pairscount});
        } catch (e) {
            console.log('getPairsfilter',e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getFaqDetails (req,res) {
        try {
            let faqStatus = await P2PFaqDb.find({status: 1}).sort({_id:-1});
            if (faqStatus && faqStatus.length > 0) {
                res.json({ "status": true, "message": "P2P Faq Details listed", data: faqStatus });
            } else {
                res.json({ "status": false, "message": "No records found!" });
            }
        } catch (err) {}
    },
    async addFaq (req,res) {
      try {
        let data = req.body;
        let faqData = await query_helper.findoneData(P2PFaqDb,{"title": data.title},{});
        if (!faqData.status) {
            let faqStatus = await query_helper.insertData(P2PFaqDb,data);
            if(faqStatus.status) {
                await commonHelper.adminactivtylog(req, 'Faq Added', req.userId, 'New Faq', 'New Faq Added Successfully');
                res.json({ "status": faqStatus.status, "message": 'P2P Faq Added Successfully!' });
            } else {
                res.json({ "status": false, "message": faqStatus.msg });
            }
        } else{
            res.json({ "status": false, "message": 'P2P Faq Already Exists' });
        }
      } catch (err) {
          console.log("err:",err)
          res.json({ "status": false, "message": err });

      }
    },
    async updateFaq (req, res) {
        let data = req.body;
        let getPairs = await query_helper.findoneData(P2PFaqDb,{title: data.title, _id: { $ne: mongoose.Types.ObjectId(data._id) }},{})
        if(!getPairs.status) {
            delete data.fromCurrency;
            delete data.toCurrency;
            let pairs = await query_helper.updateData(P2PFaqDb,"one",{_id:mongoose.Types.ObjectId(data._id)},data)
            if(pairs.status) {
                await commonHelper.adminactivtylog(req, 'P2P Faq Updated', req.userId, mongoose.Types.ObjectId(data._id), 'Faq Updated', ' Faq Updated Successfully');
                res.json({ "status": pairs.status, "message": 'P2P Faq Updated Successfully!' });
            } else {
                res.json({ "status": false, "message": pairs.msg });
            }
        } else {
            res.json({ "status": false, "message": 'P2P Faq Already Exists' });
        }
    },   
    };
    let oArray =[];
    function _intervalFunc(orderwith) {
        orderwith = orderwith.toString();
var index = oArray.indexOf(orderwith);
if (index > -1) {
    oArray.splice(index, 1);
}
}
module.exports = p2pController;