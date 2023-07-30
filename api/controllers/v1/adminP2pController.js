let common = require('../../helpers/common');
const query_helper = require('../../helpers/query');
const mongoose = require('mongoose');
let mail_helper = require('../../helpers/mailHelper');
const emailTemplate = mongoose.model("EmailTemplate");
const Admin = mongoose.model("Admin");
const Users = mongoose.model("Users");
const adminactivity = mongoose.model("SubAdminActivityLog");
let config = require("../../Config/config");
const siteSettings = mongoose.model("SiteSettings");
const stakeEnableList = mongoose.model("StakingEnabledUser");
const tradeHelper = require('../../helpers/trade');
const adminBank = mongoose.model("AdminBank");
const Docs = mongoose.model("Docs");
const Transactions = mongoose.model("Transactions");
const cloudinary = require('../../helpers/cloudinary');
const Currency = mongoose.model("Currency");
const ManualBalance = mongoose.model("ManualBalance");
const Notification = mongoose.model("Notification");
const P2PTransactions = mongoose.model("P2PTransactions");
const P2PAppealHistory = mongoose.model("P2PAppealHistory");
const P2PPair = mongoose.model("P2PPair");
let CurrencyDb = mongoose.model('Currency');
const fs = require('fs');
const path = require('path');
var request = require('request');

const commonHelper = require('../../helpers/common');
const p2pHelper = require('../../helpers/p2p');

const adminP2PController = {
    async createAppeal(req, res) {
        try {
            let data = {};
            let reqBody = req.body;
            data = {
                orderNo: reqBody.orderNo,
                userId: req.userId,
                appealHistory: {
                    userId: req.userId,
                    description: reqBody.message,
                    userType: "admin"
                }
            }
            let checkOwner = await P2PTransactions.findOne({ orderNo: reqBody.orderNo });
            if (checkOwner) {
                let socket = common.GetSocket();
                let checkData = await P2PAppealHistory.find({ 'orderNo': checkOwner.orderNo, status: 1 }).sort({ "createdDate": -1 });
                if (checkData && checkData.length > 0) {
                    let appealData = await P2PAppealHistory.find({ 'orderNo': reqBody.orderNo, "appealHistory.userId": mongoose.Types.ObjectId(req.userId) });
                    if (appealData && appealData.length > 0) {
                        await P2PAppealHistory.findOneAndUpdate({ 'orderNo': reqBody.orderNo, "appealHistory.userId": req.userId }, { $addToSet: { 'appealHistory': data.appealHistory } }, { upsert: true }, function (err, result) {
                            if (result) {
                                socket.sockets.emit('p2pappealResponse', checkData);
                                res.json({ status: true, message: "Appeal Created Successfully", data: result })
                            } else {
                                res.json({ status: false, message: "Appeal Failed" })
                            }
                        });
                    } else {
                        await P2PAppealHistory.findOneAndUpdate({ 'orderNo': reqBody.orderNo }, { $addToSet: { 'appealHistory': data.appealHistory } }, { upsert: true }, function (err, result) {
                            if (result) {
                                socket.sockets.emit('p2pappealResponse', checkData);
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
                        socket.sockets.emit('p2pappealResponse', appealStatus.msg);
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
                    $lookup: {
                        from: 'Users',
                        let: {
                            userId: '$appealHistory.userId'
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        "$in": ["$_id", "$$userId"],
                                    }
                                }
                            }
                        ],
                        as: 'appealUsersDet'
                    }
                },
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
                        from: 'P2PPair',
                        localField: 'orderDet.pairId',
                        foreignField: '_id',
                        as: 'pairDet'
                    }
                },
                { $unwind: "$pairDet" },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'orderDet.buyerUserId',
                        foreignField: '_id',
                        as: 'fromUser'
                    }
                },
                { $unwind: "$fromUser" },
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
                        "appealUsersDet": "$appealUsersDet",
                        "fromUser" : "$fromUser",
                        "pairDet": "$pairDet",
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
                    query.orderNo = { $regex: getdata.orderNo };
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
                    query.orderNo = { $regex:  getdata.orderNo }
                }
            }
            let limit = req.body.limit?parseInt(req.body.limit):10;
            let offset = req.body.offset? parseInt(req.body.offset):0
            let ordercount = await P2PAppealHistory.find(query).countDocuments();
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
        } catch (err) {
            console.log("err",err)
        }
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
                        "chattingHistory":"$chattingHistory",
                        "cancelReason":"$cancelReason",
                        "createdDate": "$createdDate",
                        "orderReleasedDate": "$orderReleasedDate",
                        "cancelledDate": "$cancelledDate"
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
    async p2ppaymentReceived(req,res){
        try {
            let reqBody = req.body.orderDet;
            let checkTxn = await query_helper.findoneData(P2PTransactions, { orderNo: reqBody.orderNo }, {});
            if (checkTxn.status && (checkTxn.msg.verifyStep == 2 || checkTxn.msg.verifyStep == 3) && checkTxn.msg.status == 3) {
                checkTxn = checkTxn.msg;
                await query_helper.updateData(P2PTransactions, "one", { orderNo: reqBody.orderNo }, { status: 1, verifyStep: 4, orderReleasedDate: new Date() });
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
                                let mailTemplatenew = "P2P Order "+ reqBody.orderNo.slice(- 4) + " has been completed.The admin has released "+ checkTxn.totalPrice + " "+ fromCurrency.currencySymbol +" to your P2P wallet"
                                await common.updatep2pAmount(buyerUser, fromCurrency.currencyId, newbal, reqBody.orderNo, 'P2P - Completion');
                                if( checkTxn.orderType == 'sell'){
                                    await common.updatep2pAmountHold(checkTxn.sellerUserId,  fromCurrency.currencyId, -(checkTxn.totalPrice));
                                } 
                                await common.mobileSMS(buyerDetails.phoneno, smsTemplate, {section: "p2p"});
                                await common.p2pactivtylog(req.userId, checkTxn.ownerId, checkTxn.orderNo, checkTxn.orderId, 'Order released', checkTxn.totalPrice + " "+ fromCurrency.currencySymbol + " " + (checkTxn.orderType == 'buy' ? 'Buy' : 'Sell') + ' Order released successfully');
                                let email_data = await query_helper.findoneData(emailTemplate, { hint: 'p2p-order-released-new' }, {});
                                if (email_data.status) {
                                    let username = buyerDetails.username != "" ? (buyerDetails.username) : (buyerDetails.email != "" ? buyerDetails.email : buyerDetails.phoneno);
                                    let etempdataDynamic = email_data.msg.content.replace(/###NAME###/g, username).replace(/###AMOUNT###/g, common.roundValuesMail(+checkTxn.totalPrice, 8));
                                    let p2porderrelasedetempdata = email_data.msg.content.replace(/###USERNAME###/g, username).replace(/###CONTENT###/g, mailTemplatenew).replace(/###ORDERLINK###/g, config.frontEnd + 'order-details/' + checkTxn.orderNo);
                                    res.json({ status: true, message: "Order released successfully", data: checkTxn, type: 0 });
                                    mail_helper.sendMail({ subject: email_data.msg.subject, to: buyerDetails.email, html: p2porderrelasedetempdata }, function (res1) {
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
                        res.json({ status: false, message: "Please try again after sometime!" })
                    }
                } else {
                    res.json({ status: false, message: "Please try again after sometime!" })
                }
            } else {
                res.json({ status: false, message: "Not a valid transaction!" })
            }
        } catch (err) {
            console.log('p2ppaymentReceived', err);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
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
};
module.exports = adminP2PController;