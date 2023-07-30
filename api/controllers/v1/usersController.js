const query_helper = require('../../helpers/query');
let common = require('../../helpers/common');
const mongoose = require('mongoose');
const emailTemplate = mongoose.model("EmailTemplate");
const mail_helper = require('../../helpers/mailHelper');
const kycController = require('../v2/kycController');
const Users = mongoose.model("Users");
const UserWallet = mongoose.model("UserWallet");
const CoinAddress = mongoose.model("CoinAddress");
const Currency = mongoose.model("Currency");
const StakingHistory = mongoose.model("StakingHistory");
const SiteSettings = mongoose.model("SiteSettings");
let mapDb = mongoose.model('MappingOrders');
let ReferralDB = mongoose.model('ReferralCommission');

let BalanceUpdation = mongoose.model("BalanceUpdation");
let StakeBalanceUpdation = mongoose.model('StakeBalanceUpdation');
const P2PBalanceUpdation = mongoose.model("P2PBalanceUpdation");
const USDMBalanceUpdation = mongoose.model("USDMBalanceUpdation");

const usersController = {
    async getUsers(req, res) {
        try {
            let sortOption = { updatedOn: -1 };
            let matchQ = {};
            if(req.body.formvalue) {
                if(req.body.formvalue.fromdate!='' && req.body.formvalue.todate!=''){
                    var fromDate= new Date(req.body.formvalue.fromdate);
                    var toDate = new Date(req.body.formvalue.todate);
                    var dateFilter= new Date(fromDate.setTime(fromDate.getTime() + 5.5*60*60*1000));
                    var nextDateFilter = new Date(toDate.setTime(toDate.getTime() + 29.49*60*60*1000));
                    matchQ.registerOn = {
                        "$gte":dateFilter,
                        "$lt":nextDateFilter
                    }
                }
                if (req.body.formvalue.status != '') {
                    matchQ.status = req.body.formvalue.status;
                }
                if (req.body.formvalue.kycstatus != '') {
                    matchQ.kycstatus = req.body.formvalue.kycstatus;
                }
                if (req.body.formvalue.bankstatus != '') {
                    matchQ.bankstatus = req.body.formvalue.bankstatus;
                }
                if (req.body.formvalue.bankstatus != '') {
                    matchQ.bankstatus = req.body.formvalue.bankstatus;
                }
                if (req.body.formvalue.sortOption != '') {
                    sortOption = { _id: req.body.formvalue.sortOption };
                }
                if (req.body.formvalue.searchQuery != '') {
                    let query = { '$and': [{ '$or': [
                        { "username": { $regex: req.body.formvalue.searchQuery } },
                        { "email": { $regex: req.body.formvalue.searchQuery } },
                        { "phoneno": { $regex: req.body.formvalue.searchQuery } },
                        { "kycOnline.pan.number": { $regex: req.body.formvalue.searchQuery } },
                        { "kycOffline.pan.number": { $regex: req.body.formvalue.searchQuery } },
                        // { "kycV1.details.pan_number": { $regex: req.body.formvalue.searchQuery } },
                        { "kycOnline.aadhaar.number": { $regex: req.body.formvalue.searchQuery } },
                        { "kycOffline.aadhaar.number": { $regex: req.body.formvalue.searchQuery } },
                        // { "kycV1.details.id_number": { $regex: req.body.formvalue.searchQuery } },
                        { "kycOnline.pan.details.full_name": { $regex: req.body.formvalue.searchQuery } },
                        { "kycOnline.aadhaar.details.full_name": { $regex: req.body.formvalue.searchQuery } },
                    ] }] };

                    let addressSearch = await query_helper.findData(CoinAddress, { "address": { $regex: req.body.formvalue.searchQuery } }, {}, {})
                    let userIds = [];
                    if(addressSearch.status && addressSearch.msg.length > 0) {
                        addressSearch.msg.forEach(function(item) {
                            userIds.push(item.user_id);
                        });
                    }
                    if(userIds.length > 0 && query['$and'] && query['$and'][0] && query['$and'][0]['$or']) {
                        query['$and'][0]['$or'].push({
                            _id: {$in: userIds}
                        });
                    }

                    var size = Object.keys(matchQ).length;
                    if (size > 0) {
                        for (var key in matchQ) {
                            let objPush = {};
                            objPush[key] = matchQ[key];
                            query['$and'].push(objPush);
                        }
                    }
                    matchQ = query;
                }
            }
            let limit =req.body.limit?parseInt(req.body.limit):10;
            let offset =req.body.offset? parseInt(req.body.offset):0
            let users = await query_helper.findDatafilter(Users, matchQ, {}, sortOption,limit,offset)
            let userCount = await Users.countDocuments(matchQ);
            res.json({ "status": users.status, "getUsersTblDetails": users.msg, "total": userCount});
        } catch (e) {
            console.log("getUsers",e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getKycUser(req, res) {
        try {
            let sortOption = { updatedOn: -1 };
            let matchQ = {};
            matchQ.kycstatus=1;
            if(req.body.formvalue.fromdate!='' && req.body.formvalue.todate!=''){
                var fromDate= new Date(req.body.formvalue.fromdate);
                var toDate = new Date(req.body.formvalue.todate);
                var dateFilter= new Date(fromDate.setTime(fromDate.getTime() + 5.5*60*60*1000));
                var nextDateFilter = new Date(toDate.setTime(toDate.getTime() + 29.49*60*60*1000));
                matchQ.registerOn = {
                    "$gte":dateFilter,
                    "$lt":nextDateFilter
                }
            }
            
            if (req.body.formvalue.status != '') {
                matchQ.status = req.body.formvalue.status;
            }
            if (req.body.formvalue.kycstatus != '') {
                matchQ.kycstatus = req.body.formvalue.kycstatus;
            }
            if (req.body.formvalue.bankstatus != '') {
                matchQ.bankstatus = req.body.formvalue.bankstatus;
            }
            if (req.body.formvalue.bankstatus != '') {
                matchQ.bankstatus = req.body.formvalue.bankstatus;
            }
            if (req.body.formvalue.sortOption != '') {
                sortOption = { _id: req.body.formvalue.sortOption };
            }
            if (req.body.formvalue.searchQuery != '') {
                var size = Object.keys(matchQ).length;
                let query = { '$and': [{ '$or': [{ "username": { $regex: req.body.formvalue.searchQuery } }, { "email": { $regex: req.body.formvalue.searchQuery } }] }] };
                if (size > 0) {
                    for (var key in matchQ) {
                        let objPush = {};
                        objPush[key] = matchQ[key];
                        query['$and'].push(objPush);
                    }
                }
                matchQ = query;
            }
            let limit =req.body.limit?parseInt(req.body.limit):10;
            let offset =req.body.offset? parseInt(req.body.offset):0
            let users = await query_helper.findDatafilter(Users, matchQ, {}, sortOption,limit,offset)
            let kycPendingUsers = await Users.countDocuments(matchQ);
            res.json({ "status": users.status, "getUsersTblDetails": users.msg, "total": kycPendingUsers});
        } catch (e) {
            console.log("getKycUser",e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getUserblanceTotal(req, res) {
        try {
            let userWallet = await query_helper.findData(UserWallet, { "userId": mongoose.Types.ObjectId(req.userId) }, {}, { _id: -1 }, 0);
            if(userWallet){
                  const userWalletTotal = await UserWallet.aggregate(
                [
                    { $match: {
                        userId: mongoose.Types.ObjectId(req.userId)
                    } },
                    {
                        $group:
                          {
                            _id: null,
                            walletTotalAmount: { $sum: "$amount" },
                            holdTotalAmount: { $sum: "$hold" }
                          }
                      }
                ]
            );
            const userStakTotal = await StakingHistory.aggregate(
                [
                    { $match: {
                        userId: mongoose.Types.ObjectId(req.userId)
                    } },
                    {
                        $group:
                          {
                            _id: null,
                            stakTotalAmount: { $sum: "$amount" }
                          }
                      }
                ]
            );
            userWalletTotal.push(userStakTotal);
            res.json({status:"true","data":userWalletTotal});
            }
            else{
                res.json({status:"False","data":'User wallet Not User'});
            }

        } catch (e) {
            console.log("getUserblanceTotal",e);
            res.json({status:"False","data":"userWallet Error !!"});
        }
    },
    async balancedetails(req,res){
        try{
            let users = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.body.data._id) }, {});
            if (users.status) {
                let limit =req.body.data.limit?parseInt(req.body.data.limit):10;
                let offset =req.body.data.offset? parseInt(req.body.data.offset):0
                BalanceUpdation.aggregate([
                    {
                        $match: {userId:req.body.data._id}
                    },
                    {
                        $lookup:
                        {
                            from: 'Currency',
                            localField: 'currencyId',
                            foreignField: 'currencyId',
                            as: 'currencydet'
                        }
                    },
                    {
                        $project: {
                            "currencySymbol": { $arrayElemAt: ["$currencydet.currencySymbol", 0] },
                            "oldBalance":"$oldBalance",
                            "amount":"$amount",
                            "type":"$type",
                            "difference":"$difference",
                            "dateTime": "$dateTime"
                        }
                    },
                    { $sort: { dateTime: -1 } },
                    {$limit: offset+limit},
                    {$skip: offset}
                ]).exec(async function (err, result) {
                    let balancecount = await BalanceUpdation.find({userId: req.body.data._id }).countDocuments();
                    res.json({ "status": true, "userbalance": result ,"total":balancecount});
                });
            }
            else{
                res.json({ "status": false,"message":"Invalid userId" });
            }
        }
        catch(err){
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async stakeBalanceDetails(req,res){
        try{
            let users = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.body.data._id) }, {});
            if (users.status) {
                let limit =req.body.data.limit?parseInt(req.body.data.limit):10;
                let offset =req.body.data.offset? parseInt(req.body.data.offset):0
                StakeBalanceUpdation.aggregate([
                    {
                        $match: {userId:req.body.data._id}
                    },
                    {
                        $lookup:
                        {
                            from: 'Currency',
                            localField: 'currencyId',
                            foreignField: 'currencyId',
                            as: 'currencydet'
                        }
                    },
                    {
                        $project: {
                            "currencySymbol": { $arrayElemAt: ["$currencydet.currencySymbol", 0] },
                            "oldBalance":"$oldBalance",
                            "amount":"$amount",
                            "type":"$type",
                            "difference":"$difference",
                            "dateTime": "$dateTime"
                        }
                    },
                    { $sort: { dateTime: -1 } },
                    {$limit: offset+limit},
                    {$skip: offset}
                ]).exec(async function (err, result) {
                    let stakeBalancecount = await StakeBalanceUpdation.find({userId: req.body.data._id }).countDocuments();
                    res.json({ "status": true, "stakeBalance": result ,"total":stakeBalancecount});
                });
            } else {
                res.json({ "status": false,"message":"Invalid userId" });
            }
        }
        catch(err){
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async p2pBalanceDetails(req,res){
        try{
            let users = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.body.data._id) }, {});
            if (users.status) {
                let limit =req.body.data.limit?parseInt(req.body.data.limit):10;
                let offset =req.body.data.offset? parseInt(req.body.data.offset):0
                P2PBalanceUpdation.aggregate([
                    {
                        $match: {userId:req.body.data._id}
                    },
                    {
                        $lookup:
                        {
                            from: 'Currency',
                            localField: 'currencyId',
                            foreignField: 'currencyId',
                            as: 'currencydet'
                        }
                    },
                    {
                        $project: {
                            "currencySymbol": { $arrayElemAt: ["$currencydet.currencySymbol", 0] },
                            "oldBalance":"$oldBalance",
                            "amount":"$amount",
                            "type":"$type",
                            "difference":"$difference",
                            "dateTime": "$dateTime"
                        }
                    },
                    { $sort: { dateTime: -1 } },
                    {$limit: offset+limit},
                    {$skip: offset}
                ]).exec(async function (err, result) {
                    let p2pBalancecount = await P2PBalanceUpdation.find({userId: req.body.data._id }).countDocuments();
                    res.json({ "status": true, "p2pBalance": result ,"total":p2pBalancecount});
                });
            } else {
                res.json({ "status": false,"message":"Invalid userId" });
            }
        }
        catch(err){
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getUSDMBalance(req,res){
        try{
            let users = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.body.data._id) }, {});
            if (users.status) {
                let limit =req.body.data.limit?parseInt(req.body.data.limit):10;
                let offset =req.body.data.offset? parseInt(req.body.data.offset):0
                USDMBalanceUpdation.aggregate([
                    {
                        $match: {userId:req.body.data._id}
                    },
                    {
                        $lookup:
                        {
                            from: 'Currency',
                            localField: 'currencyId',
                            foreignField: 'currencyId',
                            as: 'currencydet'
                        }
                    },
                    {
                        $project: {
                            "currencySymbol": { $arrayElemAt: ["$currencydet.currencySymbol", 0] },
                            "oldBalance":"$oldBalance",
                            "amount":"$amount",
                            "type":"$type",
                            "difference":"$difference",
                            "dateTime": "$dateTime"
                        }
                    },
                    { $sort: { dateTime: -1 } },
                    {$limit: offset+limit},
                    {$skip: offset}
                ]).exec(async function (err, result) {
                    let usdmBalancecount = await USDMBalanceUpdation.find({userId: req.body.data._id }).countDocuments();
                    res.json({ "status": true, "usdmBalance": result ,"total":usdmBalancecount});
                });
            } else {
                res.json({ "status": false,"message":"Invalid userId" });
            }
        }
        catch(err){
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async tradehistorydetails(req,res){
        try{
            let users = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.body.data._id) }, {});
            if (users.status) {
                let limit =req.body.data.limit?parseInt(req.body.data.limit):10;
                let offset =req.body.data.offset? parseInt(req.body.data.offset):0
                let matchQ={}
                let userIds = []
                if(req.body.data._id != ''){
                    userIds = [mongoose.Types.ObjectId(req.body.data._id)]
                }
                matchQ['$or'] = [
                    {
                        buyerUserId: { $in: userIds },
                        sellerUserId: { $in: userIds }
                    }
                ]
                let mapOrders = await mapDb.find(matchQ).sort({_id:-1}).populate("buyerUserId", "username email").populate("sellerUserId", "username email").limit(limit).skip(offset)
                let Orderscount = await mapDb.find(matchQ).populate("buyerUserId", "username email").populate("sellerUserId", "username email").countDocuments();
                res.json({"status":true,"userhistory":mapOrders,"total":Orderscount})
            } else {
                res.json({ "status": false,"message":"Invalid userId" });
            }
        } catch(err){
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async referreduserdetails(req,res){
        try {
            let users = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.body.data._id) }, {});
            if (users.status) {
                let limit =req.body.data.limit?parseInt(req.body.data.limit):10;
                let offset =req.body.data.offset? parseInt(req.body.data.offset):0
                let referredUsers = await query_helper.findDatafilter(Users, { referUser: req.body.data._id }, { username: 1, email: 1, registerOn: 1 }, { _id: -1 }, limit,offset);
                let referredcount = await Users.find({ referUser: req.body.data._id }, { username: 1, email: 1, registerOn: 1 }, { _id: -1 }).countDocuments()
                res.json({"status":true,
                "referUser": referredUsers.status ? referredUsers.msg : [] ,"total":referredcount})
            } else {
                res.json({ "status": false,"message":"Invalid userId" });
            }
        } catch(err) {
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getUserDetails(req, res) {
        try {
            let users = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.body.data._id) }, {});
            if (users.status) {
                users = users.msg;
                let userWallet = await query_helper.findData(UserWallet, { "userId": mongoose.Types.ObjectId(req.body.data._id) }, {}, { _id: -1 }, 0);
                userWallet = userWallet.status ? userWallet.msg : [];
                let coinAddress = await query_helper.findData(CoinAddress, { "user_id": mongoose.Types.ObjectId(req.body.data._id) }, {}, { _id: -1 }, 0);
                coinAddress = coinAddress.status ? coinAddress.msg : [];
                let currency = await query_helper.findData(Currency, {}, {}, { _id: -1 }, 0);
                currency = currency.msg;
                let walletArr = {};
                let addressArr = {};
                if (userWallet.length > 0) {
                    for (i = 0; i < userWallet.length; i++) {
                        walletArr[userWallet[i].currencyId] = { amount: userWallet[i].amount, hold: userWallet[i].hold, stakingAmount: userWallet[i].stakingAmount, stakingHold: userWallet[i].stakingHold, p2pAmount: userWallet[i].p2pAmount, p2pHold: userWallet[i].p2pHold, perpetualAmount: userWallet[i].perpetualAmount, perpetualHold: userWallet[i].perpetualHold }
                    }
                }
                if (coinAddress.length > 0) {
                    for (i = 0; i < coinAddress.length; i++) {
                        addressArr[coinAddress[i].currencyname] = { address: coinAddress[i].address, tag: coinAddress[i].tag, ethBlock : coinAddress[i].ethBlock, trxBlock : coinAddress[i].trxBlock, bnbBlock: coinAddress[i].bnbBlock, maticBlock: coinAddress[i].maticBlock }
                    }
                }
                let newarr = [];
                if (currency.length > 0) {
                    currency.forEach(element => {
                        const walletObj = typeof walletArr[element.currencyId] == 'object' ? walletArr[element.currencyId] : { amount: 0, hold: 0, stakingAmount: 0, stakingHold: 0, p2pAmount: 0, p2pHold:0, perpetualAmount: 0, perpetualHold:0  };
                        const curName = element.basecoin == 'Coin' ? element.currencySymbol : common.currencyToken(element.basecoin);
                        const addressObj = typeof addressArr[curName] == 'object' ? addressArr[curName] : { address: '-', tag: '-', ethBlock: '-', trxBlock: '-', bnbBlock: "-", maticBlock: '-' };
                        const currencyObj = { currencysym: element.currencySymbol, basecoin: element.basecoin };
                        const merged = { ...currencyObj, ...walletObj, ...addressObj };
                        newarr.push(merged);
                    });
                }
                res.json({ "status": true, "data": { "userDetails": users, "wallet": newarr} });
            } else {
                res.json({ "status": false });
            }
        } catch (e) {
            console.log('getUserDetails',e)
            res.json({ "status": false });
        }
    },
    async updateUser(req, res) {
        try {
            let users = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.body._id) }, {});
            if (users.status) {
                const email_data = await query_helper.findoneData(emailTemplate, { hint: "user-status" }, {});
                let mailsend = email_data.msg;
                switch (req.body.type) {
                    case 'user':
                        if(typeof req.body.userReason != 'undefined' && typeof req.body.userReason != undefined && req.body.userReason != '') {
                            let updateStatusData = {
                                status: users.msg.status == 1 ? 0 : 1,
                                blockStatus: req.body.userReason
                            }
                            let toUser = users.msg.username != "" ? (users.msg.username) : (users.msg.email);
                            await query_helper.updateData(Users, "one", { _id: mongoose.Types.ObjectId(req.body._id) }, updateStatusData);
                            if (users.msg.email != "" &&  users.msg.email != undefined) {
                                var text = 'Your Account Status Changed Successfully!', text1 = 'Account Status Updation';
                                await common.adminactivtylog(req, 'User update ', req.userId, mongoose.Types.ObjectId(req.body._id), 'Account Status Updation', 'Your Account Status Changed Successfully');
                                var etemplate = mailsend.content.replace(/###NAME###/g, toUser).replace(/###CONTENT###/g, text)
                                var subject = mailsend.subject.replace(/###TYPE###/g, text1);
                                mail_helper.sendMail({ subject: subject, to: users.msg.email, html: etemplate }, (mailresult) => {
                                });
                            } else {
                                let smsTemplate = "Users Status Changed Successfully!";
                                await common.mobileSMS(users.msg.phoneno, smsTemplate);
                            }
                            res.json({ "status": true, "message": "Users Status Changed Successfully!" });
                        } else {
                            res.json({ "status": false, "message": "Please enter reason!" });
                        }
                        break;
                    case 'level':
                        let updateLevelData = {
                            level: req.body.userLevel
                        }
                        await query_helper.updateData(Users, "one", { _id: mongoose.Types.ObjectId(req.body._id) }, updateLevelData);
                        await common.adminactivtylog(req, 'User update ', req.userId, mongoose.Types.ObjectId(req.body._id), 'User Level Updation', 'Users Level Changed Successfully');
                        res.json({ "status": true, "message": "Users Level Changed Successfully!" });
                        break;
                    case 'bank':
                        let updateBankData = {
                            bankstatus: req.body.bankstatus == 'Reject' ? 2 : 1
                        }
                        await query_helper.updateData(Users, "one", { _id: mongoose.Types.ObjectId(req.body._id) }, updateBankData);
                        var text = 'Your Bank Status ' + (req.body.bankstatus != 'Reject' ? 'Approved Successfully!' : 'Rejected!'), text1 = 'Bank Status ' + (req.body.bankstatus != 'Reject' ? 'Approved Successfully!' : 'Rejected!');
                        var etemplate = mailsend.content.replace(/###NAME###/g, users.msg.username).replace(/###CONTENT###/g, text)
                        var subject = mailsend.subject.replace(/###TYPE###/g, text1);
                        await common.adminactivtylog(req, 'User Bank ', req.userId, mongoose.Types.ObjectId(req.body._id), 'User Bank Updation', 'Users Bank Status Changed Successfully!');
                        mail_helper.sendMail({ subject: subject, to: users.msg.email, html: etemplate }, (mailresult) => {
                        });
                        res.json({ "status": true, "message": "Users Bank Status Changed Successfully!" });
                        break;
                    case 'rejectbank':
                        let rejectBankData = {
                            bankstatus: req.body.bankstatus == 'Reject' ? 2 : 1
                        }
                        await query_helper.updateData(Users, "one", { _id: mongoose.Types.ObjectId(req.body._id) }, rejectBankData);
                        let toUser = users.msg.username != "" ? (users.msg.username) : (users.msg.email);
                        if (users.msg.email != "" &&  users.msg.email != undefined) {
                            var text = 'Your Bank Status ' + (req.body.bankstatus != 'Reject' ? 'Rejected Successfully!' : 'Rejected!'), text1 = 'Bank Status ' + (req.body.bankstatus != 'Reject' ? 'Approved Successfully!' : 'Rejected!');
                            var etemplate = mailsend.content.replace(/###NAME###/g, toUser).replace(/###CONTENT###/g, text)
                            var subject = mailsend.subject.replace(/###TYPE###/g, text1);
                            await common.adminactivtylog(req, 'User Bank ', req.userId, mongoose.Types.ObjectId(req.body._id), 'User Bank Updation', 'Users Bank Status Rejected');
                            mail_helper.sendMail({ subject: subject, to: users.msg.email, html: etemplate }, (mailresult) => {
                            });
                        } else {
                            let smsTemplate = "Users Bank Status Changed Successfully!";
                            await common.mobileSMS(users.msg.phoneno, smsTemplate);
                        }
                        res.json({ "status": true, "message": text });
                        break;
                    case 'tfa':
                    case '2fa':
                        let updateTFAData = {
                            tfaStatus: 0,
                            tfaenablekey: ''
                        }
                        await query_helper.updateData(Users, "one", { _id: mongoose.Types.ObjectId(req.body._id) }, updateTFAData);
                        var text = 'Your 2FA Removed Successfully!', text1 = '2FA De-Activated';
                        await common.adminactivtylog(req, '2FA Deactivated ', req.userId, mongoose.Types.ObjectId(req.body._id), '2FA Removed', 'Your 2FA Removed Successfully!');
                        var etemplate = mailsend.content.replace(/###NAME###/g, users.msg.username).replace(/###CONTENT###/g, text)
                        var subject = mailsend.subject.replace(/###TYPE###/g, text1);
                        mail_helper.sendMail({ subject: subject, to: users.msg.email, html: etemplate }, (mailresult) => {
                        });
                        res.json({ "status": true, "message": "Users 2FA De-Activated Successfully!" });
                        break;
                    case 'kyc':
                        try {
                            let updateKYCData = {
                                kyc: users.msg.kyc
                            }
                            let updateOnlineKYCData = {};
                            var text = '', text1 = '';
                            if (req.body.kycstatus == 'Approve') {
                                if (req.body.kycMode == "Online") {
                                    updateOnlineKYCData = {
                                        kycstatus: 1,
                                        level: 2,
                                        "kycOnline.selfie_status": 1,
                                        "kycOnline.reject_reason": ''
                                    }
                                } else {
                                    updateKYCData.kyc['Reject Reason'] = { type: 'string', value: '-' };
                                    updateKYCData.kycstatus = 1;
                                    updateKYCData.level = 2;
                                }
                                text = 'Your KYC Document Approved!';
                                text1 = 'KYC Approved';
                                await kycController.afterKYCApproval({
                                    users,
                                    req
                                });
                            } else {
                                if (req.body.kycMode == "Online") {
                                    updateOnlineKYCData = {
                                        kycstatus: 2,
                                        "kycOnline.selfie_status" : 2,
                                        "kycOnline.reject_reason" : req.body.rejectReason != '' ? req.body.rejectReason : '-'
                                    }
                                } else {
                                    updateKYCData.kyc['Reject Reason'] = { type: 'string', value: req.body.rejectReason != '' ? req.body.rejectReason : '-' };
                                    updateKYCData.kycstatus = 2;
                                }
                                text = 'Your KYC Document Rejected!';
                                text1 = 'KYC Rejected';
                                if (req.body.rejectReason != '') {
                                    text = text + ' Reason is ' + req.body.rejectReason;
                                }
                            }

                            const finalUpdData = (req.body.kycMode == "Online") ? updateOnlineKYCData : updateKYCData;
                            await query_helper.updateData(Users, "one", { _id: mongoose.Types.ObjectId(req.body._id) }, finalUpdData);
    
                            if(mailsend && mailsend.content && mailsend.content != "") {
                                var etemplate = mailsend.content.replace(/###NAME###/g, users.msg.username).replace(/###CONTENT###/g, text)
                                var subject = mailsend.subject.replace(/###TYPE###/g, text1);
                                mail_helper.sendMail({ subject: subject, to: users.msg.email, html: etemplate }, (mailresult) => {
                                });
                            }
                            await common.adminactivtylog(req, 'User KYC Rejected', req.userId, mongoose.Types.ObjectId(req.body._id), 'User KYC Rejected', 'User KYC Rejected Successfully!');
    
                            res.json({ "status": true, "message": "Users " + text1 + " Successfully!" });
                        } catch(err) {
                            console.log("err:",err)
                        }
                        break;
                    case 'tradeDisable':
                        if(typeof req.body.userReason != 'undefined' && typeof req.body.userReason != undefined && req.body.userReason != '') {
                            let updateTradeStatusData = {
                                tradeDisable: users.msg.tradeDisable == 1 ? 0 : 1,
                                blockStatus: req.body.userReason
                            }
                            await query_helper.updateData(Users, "one", { _id: mongoose.Types.ObjectId(req.body._id) }, updateTradeStatusData);
                            await common.adminactivtylog(req, 'User Trade Status', req.userId, mongoose.Types.ObjectId(req.body._id), +users.msg.tradeDisable == '0' ? 'User Trade Disable':'User Trade Enable', users.msg.tradeDisable == '0' ? 'User Trade Disable Successfully' : 'User Trade Enable Successfully');
                            res.json({ "status": true, "message": "Users Trade Status Changed Successfully!" });
                        } else {
                            res.json({ "status": false, "message": "Please enter reason!" });
                        }
                        break;
                    case 'p2pDisable':
                        if((typeof req.body.userReason == '' && typeof req.body.userReason == undefined && req.body.userReason == '') && users.msg.p2pDisabled != 1) {
                            return res.json({ "status": false, "message": "Please enter reason!" });
                        }
                            let updateTradeStatusData = {
                                p2pDisabled: users.msg.p2pDisabled == 1 ? 0 : 1,
                                p2pblockStatus: req.body.userReason
                            }
                            await query_helper.updateData(Users, "one", { _id: mongoose.Types.ObjectId(req.body._id) }, updateTradeStatusData);
                            await common.adminactivtylog(req, 'User P2P Status', req.userId, mongoose.Types.ObjectId(req.body._id), +users.msg.p2pDisabled == '0' ? 'User P2P Disable':'User P2P Enable', users.msg.p2pDisabled == '0' ? 'User P2P Disable Successfully' : 'User P2P Enable Successfully');
                            res.json({ "status": true, "message": "Users P2P  Status Changed Successfully!" });
                        break;
                    case 'usdmDisable':
                        if((typeof req.body.userReason == '' && typeof req.body.userReason == undefined && req.body.userReason == '') && users.msg.usdmDisabled != 1) {
                            return res.json({ "status": false, "message": "Please enter reason!" });
                        }
                            let updateUSDMData = {
                                usdmDisabled: users.msg.usdmDisabled == 1 ? 0 : 1,
                                usdmBlockReason: req.body.userReason
                            }
                            await query_helper.updateData(Users, "one", { _id: mongoose.Types.ObjectId(req.body._id) }, updateUSDMData);
                            await common.adminactivtylog(req, 'User USD-M Status', req.userId, mongoose.Types.ObjectId(req.body._id), +users.msg.usdmDisabled == '0' ? 'User USD-M Disable':'User USD-M Enable', users.msg.usdmDisabled == '0' ? 'User USD-M Disable Successfully' : 'User USD-M Enable Successfully');
                            res.json({ "status": true, "message": "Users USD-M Status Changed Successfully!" });
                        break;
                    case 'withdrawDisable':
                        if(typeof req.body.userReason != 'undefined' && typeof req.body.userReason != undefined && req.body.userReason != '') {
                            let updateWithdrawStatusData = {
                                withdrawDisable: users.msg.withdrawDisable == 1 ? 0 : 1,
                                blockStatus: req.body.userReason
                            }
                            await query_helper.updateData(Users, "one", { _id: mongoose.Types.ObjectId(req.body._id) }, updateWithdrawStatusData);
                            await common.adminactivtylog(req, 'User withdraw Status', req.userId, mongoose.Types.ObjectId(req.body._id), users.msg.withdrawDisable == '0' ? 'User withdraw Disable':'User withdraw Enable', users.msg.withdrawDisable == '0' ? 'User withdraw Disable Successfully' : 'User withdraw Enable Successfully');
                            res.json({ "status": true, "message": "Users Withdraw Status Changed Successfully!" });
                        } else {
                            res.json({ "status": false, "message": "Please enter reason!" });
                        }
                        break;
                    case 'promotedreferral':
                        try {
                            let reqBody = req.body;
                            let referralCodeNew = reqBody.referralCode;
                            if(referralCodeNew) {
                                referralCodeNew = referralCodeNew.toUpperCase();
                            }
                            let updatePromotedReferral = {};
                            let alreadyExitsCode = await query_helper.findoneData(Users, {
                                _id: {"$ne": mongoose.Types.ObjectId(req.body._id)},
                                referCode: referralCodeNew
                            }, {});
                            if (alreadyExitsCode.status){
                              return res.json({ "status": true, "message": "Influencer Referral Code Already Exits!" });
                            }
                            if (reqBody.userType == 'promoted') {
                                updatePromotedReferral = {
                                    referCode: referralCodeNew,
                                    referCommission: reqBody.referralCommission,
                                    userType: reqBody.userType
                                }
                            } else {
                                updatePromotedReferral = {
                                    userType: 'user',
                                    referCommission: 0,
                                    referCode: ''
                                }
                            }
                            
                            await query_helper.updateData(Users, "one", { _id: mongoose.Types.ObjectId(reqBody._id) }, updatePromotedReferral);
                            await common.adminactivtylog(req, 'Promoted Referral ', req.userId, mongoose.Types.ObjectId(reqBody._id), 'Promoted Referral Updation', 'Promoted Referral Details Updated');
                            return res.json({ "status": true, "message": "Users Promoted Referral Details Updated Successfully!" });
                        } catch (err) {
                            console.log("err_err:",err)
                        }
                    case 'spotfeeDiscount':
                        try {
                            let reqBody = req.body;
                            let updatedData = { "spotfeeDiscount" : reqBody.spotfeeDiscount }
                            await query_helper.updateData(Users, "one", { _id: mongoose.Types.ObjectId(reqBody._id) }, updatedData);
                            await common.adminactivtylog(req, 'Spot Trade Fee Discount', req.userId, mongoose.Types.ObjectId(reqBody._id), 'Spot Trade Fee Discount Updation', 'Spot Trade Fee Discount Updated');
                            return res.json({ "status": true, "message": "Spot Trade Fee Discount Updated Successfully!" });
                        } catch(err){
                            console.log("err_err:",err)
                            return res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                        }
                    default:
                        res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }

            } else {
                res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
            }
        } catch (e) {
            console.log('updateUser',e)
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getReferralData(req, res) {
        try {
            let users = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.body.data._id) }, {});
            if (users.status) {
                let limit =req.body.data.limit?parseInt(req.body.data.limit):10;
                let offset =req.body.data.offset? parseInt(req.body.data.offset):0
                const commissionHistory = await ReferralDB.find({ userId: mongoose.Types.ObjectId(req.body.data._id) }).sort({ _id: -1 }).populate("refUser", "email").limit(limit).skip(offset);
                const commissioncount = await ReferralDB.find({ userId: mongoose.Types.ObjectId(req.body.data._id) }).sort({ _id: -1 }).populate("refUser", "email").countDocuments()
                res.json({"status":true,"commission":commissionHistory,'total':commissioncount})
            } else {
                res.json({"status":false,"message":"Invalid UserId"})
            }
        } catch (e) {
            console.log('getReferralData', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    }
    
};
module.exports = usersController;