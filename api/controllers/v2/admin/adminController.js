
let common = require('../../../helpers/common');
const query_helper = require('../../../helpers/query');
const mongoose = require('mongoose');
let mail_helper = require('../../../helpers/mailHelper');
const emailTemplate = mongoose.model("EmailTemplate");
const Admin = mongoose.model("Admin");
const Users = mongoose.model("Users");
const adminactivity = mongoose.model("SubAdminActivityLog");
let config = require("../../../Config/config");
const siteSettings = mongoose.model("SiteSettings");
const stakeEnableList = mongoose.model("StakingEnabledUser");
const tradeHelper = require('../../../helpers/trade');
const adminBank = mongoose.model("AdminBank");
const Docs = mongoose.model("Docs");
const Transactions = mongoose.model("Transactions");
const cloudinary = require('../../../helpers/cloudinary');
const Currency = mongoose.model("Currency");
const ManualBalance = mongoose.model("ManualBalance");
const P2PPayment = mongoose.model("P2PPayment");
const P2PAllPayments = mongoose.model("P2PAllPayments");
const P2POrder = mongoose.model("P2POrder");
const fs = require('fs');
const path = require('path');
var request = require('request');

const kycController = require('../kycController');
const bankController = require('../../v2/bankController');
var axios = require('axios');
const { cat } = require('shelljs');
const e = require('express');

const v2adminController = {
    async getUserDetails(req, res) {
        try {
           
        } catch (err) {}
    },
    async updateKycDetails (req,res){
        try {
            let data = req.body;
            let updateOnlineKYCData = {};
            let updateOfflinKYCData = {};
            var text = '', text1 = '';
            let users = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.body._id) }, {});

            if (users.status) {

                if (data.type == 'pan') {
                    if (req.body.kycstatus == 'Approve') {
                        if (data.kycMode == "Offline") {
                            updateOfflinKYCData = {
                                "kycStatusDetail.pan.status": 1,
                                "kycOffline.pan.status": 1,
                                "kycOffline.pan.reject_reason": '',
                                "kycstatus": 3
                            }
                            text = 'Pan Approved';
                        } else {
                            updateOnlineKYCData = {
                                "kycStatusDetail.aadhaar.status": 1,
                                "kycOnline.pan.status": 1,
                                "kycOnline.pan.reject_reason": '',
                                "kycstatus": 3
                            }
                            text = 'Pan Approved';
                        }
                    } else {
                        if (data.kycMode == "Offline") {
                            updateOfflinKYCData = {
                                "kycStatusDetail.pan.status": 2,
                                "kycOffline.pan.status": 2,
                                "kycOffline.pan.reject_reason": data.rejectReason,
                                "kycstatus": 2
                            }
                            text = 'Pan Rejected';
                        } else {
                            updateOnlineKYCData = {
                                "kycStatusDetail.pan.status": 2,
                                "kycOnline.pan.status": 2,
                                "kycOnline.pan.reject_reason": data.rejectReason,
                                "kycstatus": 2
                            }
                            text = 'Pan Rejected';
                        }
                    }
                } else if (data.type == 'aadhaar') {
                    if (req.body.kycstatus == 'Approve') {
                        if (data.kycMode == "Offline") {
                            updateOfflinKYCData = {
                                "kycStatusDetail.aadhaar.status": 1,
                                "kycOffline.aadhaar.status": 1,
                                "kycOffline.aadhaar.reject_reason": '',
                                "kycstatus": 3
                            }
                            text = 'Aadhaar Approved';
                        } else {
                            updateOnlineKYCData = {
                                "kycStatusDetail.aadhaar.status": 1,
                                "kycOnline.aadhaar.status": 1,
                                "kycOnline.aadhaar.reject_reason": '',
                                "kycstatus": 3
                            }
                            text = 'Aadhaar Approved';
                        }
                    } else {
                        if (data.kycMode == "Offline") {
                            updateOfflinKYCData = {
                                "kycStatusDetail.aadhaar.status": 2,
                                "kycOffline.aadhaar.status": 2,
                                "kycOffline.aadhaar.reject_reason": data.rejectReason,
                                "kycstatus": 2
                            }
                            text = 'Aadhaar Rejected';
                        } else {
                            updateOnlineKYCData = {
                                "kycStatusDetail.aadhaar.status": 2,
                                "kycOnline.aadhaar.status": 2,
                                "kycOnline.aadhaar.reject_reason": data.rejectReason,
                                "kycstatus": 2
                            }
                            text = 'Aadhaar Rejected';
                        }
                    }
                } else if (data.type == 'selfie') {
                    if (req.body.kycstatus == 'Approve') {
                        if (data.kycMode == "Offline") {
                            updateOfflinKYCData = {
                                "kycStatusDetail.selfie.status": 1,
                                "kycOffline.selfie.status": 1,
                                "kycstatus": 1,
                                "kycOffline.selfie.reject_reason": '',
                                "level": 2
                            }
                            text = 'Selfie Approved';
                        } else {
                            updateOnlineKYCData = {
                                "kycStatusDetail.selfie.status": 1,
                                "kycOnline.selfie.status": 1,
                                "kycstatus": 1,
                                "kycOnline.selfie.reject_reason": '',
                                "level": 2
                            }
                            text = 'Selfie Approved';
                        }
                        let userId = req.body._id;
                        kycController.afterKYCApproval({
                            users,
                            req,
                            userId
                        });
                    } else {
                        if (data.kycMode == "Offline") {
                            updateOfflinKYCData = {
                                "kycStatusDetail.selfie.status": 2,
                                "kycOffline.selfie.status": 2,
                                "kycstatus": 2,
                                "kycOffline.selfie.reject_reason": data.rejectReason,
                            }
                            text = 'Selfie Rejected';

                        } else {
                            updateOnlineKYCData = {
                                "kycStatusDetail.selfie.status": 2,
                                "kycOnline.selfie.status": 2,
                                "kycstatus": 2,
                                "kycOnline.selfie.reject_reason": data.rejectReason
                            }
                            text = 'Selfie Rejected';
                        }
                    }
                }
    
                const finalUpdData = (data.kycMode == "Online") ? updateOnlineKYCData : updateOfflinKYCData;
                await query_helper.updateData(Users, "one", { _id: mongoose.Types.ObjectId(req.body._id) }, finalUpdData);
                await common.adminactivtylog(req, 'User KYC Rejected', req.userId, mongoose.Types.ObjectId(req.body._id), 'User KYC Rejected', 'User KYC Rejected Successfully!');
                res.json({ "status": true, "message": "Users " + text + " Successfully!" });

            } else {
                res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
            }
        } catch(err){}
    },
    async userDetailsRemoved (req,res){
        try {
            let data = req.body.reqData;
            let updateData = {};
            let text = data.target == 'phoneno' ? 'User Phone Number Removed Successfully' : data.target == 'email' ? 'User Email is Removed Successfully' : '' ;
            if (data.target == 'phoneno') {
                updateData.phoneno = "";
            } else if (data.target == 'email') {
                updateData.email = "";
            }
            await query_helper.updateData(Users, "one", { _id: mongoose.Types.ObjectId(data._id) }, updateData);
            await common.adminactivtylog(req,  text, req.userId, mongoose.Types.ObjectId(data._id), text, text);
            res.json({ "status": true, "message": text });
        } catch (err) {}
    },
    async getP2PPaymentDetails(req, res){
        try {
            let reqBody = req.body;
            let payment = await query_helper.findoneData(P2PPayment, { userId: mongoose.Types.ObjectId(reqBody.data._id) }, {})
            if (payment.status) {
                payment = payment.msg;
                res.json({ "status": true, "getp2ppaymentDetails": payment.methods, "total" : payment.methods.length});
            } else {
                res.json({ "status": false, "message": 'Not a valid payment!',data:[] });
            }
        } catch (e) {
            console.log('getPaymentDetails', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time!" });
        }
    },
    async updateP2PPaymentStatus(req, res){
        try {
            let reqBody = req.body;
            let userId = reqBody.userId;
            let payment = await query_helper.findoneData(P2PPayment, { userId: mongoose.Types.ObjectId(userId) }, {})
            if (payment.status){
                let paymentData = {};
                if (reqBody.status == 1) {
                    paymentData = { "methods.$.status" : 1 };
                    // await bankController.afteradminBankApproval({paymentData,userId});
                }
                else {
                    paymentData = { "methods.$.status" : reqBody.status };
                }                
                let data = await P2PPayment.findOneAndUpdate({ 'methods._id': mongoose.Types.ObjectId(reqBody._id) }, { $set: paymentData }, { new: true });
                if(data) {
                    await bankController.afterBankDetailUpd(req, res);
                    res.json({ "status": true, "message" : "Payment status Changed Successfully","getp2ppaymentDetails": data });
                } else {
                    res.json({ status: false, message: "Payment Added Failed" })
                }
            } else {
                res.json({ "status": false, "message": 'Not a valid payment!',data:[] });
            }

        } catch(err) {
            console.log('getPaymentDetails', err);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time!" });
        }
    },
    async addBankPayment(req, res) {
        try {
                let reqBody = req.body;
                let profile = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(reqBody.userId) }, {});
                if (profile.status) {
                    let updateObj = {};
                    const {
                        era_domain = "",
                        token: kycToken = "",
                        bankApi = "",
                        panLite = "",
                    } = config.kyc;

                    const bank_Name =  reqBody.paymenttype;
                    const accNum = reqBody.accountNo;
                    const ifscCode = reqBody.ifscCode;
                    const accType = reqBody.accountType;
                    const optUrl = era_domain+bankApi;

                    const data = JSON.stringify({
                        "id_number": accNum,
                        "ifsc": ifscCode
                    });
                    const axiosConfig = {
                        method: 'post',
                        url: optUrl,
                        headers: { 
                          'Authorization': 'Bearer '+kycToken, 
                          'Content-Type': 'application/json'
                        },
                        data : data
                    };
                    axios(axiosConfig)
                    .then(async function (response) {
                        if(response && response.data && response.data.success && response.data.data && response.data.data.account_exists) {
                            let username = profile.msg.username;
                            if(username) {
                                username = username
                                    .replace(/ /g, "")
                                    .replace(/\./g, "");
                                username = username.toLowerCase();
                            }
            
                            let bankName = response.data.data.full_name;
                            if(bankName) {
                                bankName = bankName
                                    .replace(/ /g, "")
                                    .replace(/\./g, "");
                                bankName = bankName.toLowerCase();
                            }
            
                            // updateObj.bankdetails["Beneficiary Name"] = response.data.data.full_name;
            
                            if(username == bankName) {
                                updateObj.bankstatus = 1;
                                // await bankController.afterBankApproval({updateObj,req,});
                            }
                            else {
                                updateObj.bankstatus = 0;
                            }
                            // updateObj.bankdetails.details = response.data.data;
                            updateObj.updatedOn = new Date();
                            let paymentData = {};
                            let payment = await query_helper.findoneData(P2PAllPayments, { name: "Bank" }, {})
                            if (payment.status) {
                                paymentData = payment.msg;
                            }
                            let updateData = {};
                            updateData = {
                                userId: reqBody.userId,
                                methods: {
                                    userId: reqBody.userId,
                                    adminId: req.userId,
                                    paymenttype: paymentData.name,
                                    bankName: bank_Name,
                                    holderName: response.data.data.full_name,
                                    accountNo: accNum,
                                    ifscCode: ifscCode,
                                    accountType: accType,
                                    status: updateObj.bankstatus,
                                    paymentmethodId: paymentData._id,
                                    type:"user",
                                    createdDate: new Date()
                                }
                            }
                            
                            let paymentStatus = await query_helper.findoneData(P2PPayment, { userId: mongoose.Types.ObjectId(reqBody.userId) }, {})
                            if (paymentStatus.status) {
                                paymentStatus = paymentStatus.msg;
                                if (paymentStatus && paymentStatus.methods && paymentStatus.methods.length > 0) {  
                                    const userRejectedPayment = paymentStatus.methods.filter(elem => elem.status == 2);
                                    if (userRejectedPayment && userRejectedPayment.length == 3) {
                                       return res.json({ status: true, message: "You cant upload the Bank Details from User panel. To upload Document again, please Contact Support", data: userRejectedPayment });
                                    }
                                }
                                const updatedData = await P2PPayment.findOneAndUpdate({ userId: mongoose.Types.ObjectId(reqBody.userId) }, { $addToSet: { methods: updateData.methods } }, { upsert: true, new: true });
                                if (updatedData) {
                                    await bankController.afterBankDetailUpd(req, res);
                                    res.json({ status: true, message: "Document Uploaded Successfully...!", data: updatedData });
                                } else {
                                    res.json({ status: false, message: "Payment Added Failed" })
                                }
                            } else {
                                let payment = await query_helper.insertData(P2PPayment, updateData);
                                if (payment) {
                                    await bankController.afterBankDetailUpd(req, res);
                                    res.json({ status: true, message: "Document Uploaded Successfully...!", data: updatedData });
                                } else {
                                    res.json({ "status": false, "message": payment.msg });
                                }
                            }
                        }
                        else {
                            return res.json({ "status": false, "message": "Verification failed, Please enter correct bank details." });; 
                        }
                    })
                    .catch(function (error) {
                        console.log("- - - - - error - - - - - - - : ", error);
                        if (error && error.response && error.response.data && error.response.data.success == false) {
                            if (error && error.response && error.response.data && error.response.data.message == 'Verification Failed.') {
                                res.json({ "status": false, "message":  "Verification Failed,Please check the bank details"});
                            } else {
                                res.json({ "status": false, "message":  error.response.data.message});
                            }
                        }
                    });
                } else {
                    res.json({ "status": false, "message": "Invalid user " });
                }
           
        } catch (e) {
            console.log('updateMyBank', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time-error code :606" });
        }
    },
    async updateSuspend(req,res) {
        try {
            let data = req.body;
            let userId = data._id;
            let payment = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(userId) }, {})
            if (payment.status) {
                payment = payment.msg;
                let passData = {};
                if (data.bankSuspend == "active") {
                    var currDate = new Date();
                    const getDaysInMonth = date =>new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
                    daysInThisMonth = getDaysInMonth(new Date());
                    currDate.setDate(currDate.getDate() + daysInThisMonth);
                    passData.bankSuspendDate = currDate;
                    passData = { 
                        bankSuspend : "suspend",
                        bankSuspendReason : data.bankSuspendReason,
                        bankSuspendDate: currDate
                    };
                } else {
                    passData = { 
                        bankSuspend : "active",
                        bankSuspendReason : "",
                        bankSuspendDate : new Date()
                    };
                }
                await query_helper.updateData(Users, "one", { _id: mongoose.Types.ObjectId(userId) }, passData);
                res.json({ "status": true, "message": "This user " + passData.bankSuspend +  " successfully!" });
            } else {
                res.json({ "status": false, "message": 'Not a valid user!',data:[] });
            }
        } catch(err) {}
    },
    async userEmailUpdation(req,res){
        try {
            let data = req.body;
            let userId = data.reqData  && data.reqData._id;
            let userResult = await query_helper.findoneData(Users, { email: data.reqData.email }, {})
            if (userResult.status) {
                res.json({ "status": false, "message": "The email is already exists",data:[] });
            } else {
                await query_helper.updateData(Users, "one", { _id: mongoose.Types.ObjectId(userId) }, { email: data.reqData.email});
                res.json({ "status": false, "message": "Email is Updated Successfully!",data: userResult.msg });
            }
        } catch (err) {}
    },
    async getallOrders(req,res){
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

                if (getdata.orderType != '') {
                    query.orderType = getdata.orderType;
                }

                if (getdata.pair != '') {
                    query.pairName = getdata.pair;
                }

                if (getdata.status != '') {
                    query.status = parseInt(getdata.status);
                }
            }
           
            let limit = req.body.limit ? parseInt(req.body.limit):10;
            let offset = req.body.offset ? parseInt(req.body.offset):0
           
            let ordercount = await P2POrder.find(query).countDocuments();
            P2POrder.aggregate([
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
                        "username": "$userDet.username",
                        "email": "$userDet.email",
                        "fromCurrencySymbol" : "$fromCurrency.currencySymbol",
                        "fromCurrencySymbol" : "$fromCurrency.currencySymbol",
                        "toCurrencySymbol" : "$toCurrency.currencySymbol",
                        "toCurrencyName" : "$toCurrency.currencyName",
                        "paymentId": "$paymentId",
                        "paymentmethodId": "$paymentmethodId",
                        "pairName": "$pairName",
                        "timeLimit": "$timeLimit",
                        "maxAmt": "$maxAmt",
                        "minAmt": "$minAmt",
                        "price": "$price",
                        "totalPrice": "$totalPrice",
                        "usdtPrice": "$usdtPrice",
                        "orderAmount": "$totorderAmountalPrice",
                        "orderType": "$orderType",
                        "orderMode": "$orderMode",
                        "paymentNames": "$paymentNames",
                        "buyerUserId": "$buyerUserId",
                        "sellerUserId": "$sellerUserId",
                        "paymentEndDate": "$paymentEndDate",
                        "orderNo": "$orderNo",
                        "orderType": "$orderType",
                        "userId": "$userId",
                        "pairId": "$pairId",
                        "status": "$status",
                        "createdDate": "$createdDate",
                    },
                },
            ]).exec(async function (err, result) {
                if (result) {
                    res.json({ "status": true, "message": "Order details listed", data: result,total: ordercount });
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }
            });
        } catch (err) {}
    },
    async getordersDetails(req,res){
        try {
            let data = req.body;
            let query = {};
            query = { _id : mongoose.Types.ObjectId(data._id) }
            let orderRecord = await query_helper.findoneData(P2POrder, { _id: mongoose.Types.ObjectId(data._id) }, {})
            if (orderRecord.status) {
                P2POrder.aggregate([
                    {
                        $match: query
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
                            "username": "$userDet.username",
                            "email": "$userDet.email",
                            "fromCurrencySymbol" : "$fromCurrency.currencySymbol",
                            "fromCurrencyName" : "$fromCurrency.currencyName",
                            "fromCurrencySymbolCode" : "$fromCurrency.currencySymbolCode",
                            "toCurrencySymbol" : "$toCurrency.currencySymbol",
                            "toCurrencyName" : "$toCurrency.currencyName",
                            "toCurrencySymbolCode" : "$toCurrency.currencySymbolCode",
                            "paymentId": "$paymentId",
                            "paymentmethodId": "$paymentmethodId",
                            "pairName": "$pairName",
                            "timeLimit": "$timeLimit",
                            "maxAmt": "$maxAmt",
                            "minAmt": "$minAmt",
                            "price": "$price",
                            "totalPrice": "$totalPrice",
                            "usdtPrice": "$usdtPrice",
                            "orderAmount": "$totorderAmountalPrice",
                            "orderType": "$orderType",
                            "orderMode": "$orderMode",
                            "paymentNames": "$paymentNames",
                            "buyerUserId": "$buyerUserId",
                            "sellerUserId": "$sellerUserId",
                            "paymentEndDate": "$paymentEndDate",
                            "orderNo": "$orderNo",
                            "orderType": "$orderType",
                            "userId": "$userId",
                            "pairId": "$pairId",
                            "priceType": "$priceType",
                            "autoreply": "$autoreply",
                            "remarks": "$remarks",
                            "holdingBTC": "$holdingBTC",
                            "registeredDays": "$registeredDays",
                            "registeredStatus": "$registeredStatus",
                            "holdingStatus": "$holdingStatus",
                            "kycStatus": "$kycStatus",
                            "status": "$status",
                            "createdDate": "$createdDate",
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
                res.json({ "status": false, "message": "Not valid order",data:[] });
            }
        } catch (err){}
    }
};
module.exports = v2adminController;