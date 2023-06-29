const query_helper = require('../../helpers/query');
let common = require('../../helpers/common');
const mongoose = require('mongoose');
const emailTemplate = mongoose.model("EmailTemplate");
const mail_helper = require('../../helpers/mailHelper');
const commonHelper = require('../../helpers/common');
const Transactions = mongoose.model("Transactions");
const Users = mongoose.model("Users");
const transactionsController = {
    async getTransactions (req, res) {
        try {
            let matchQ = {
                '$and': []
            };
            let getdata = req.body.formvalue;
            if(getdata.searchQuery != '') {
                matchQ = {
                    '$and': [
                        {
                            '$or': [
                                { "address": { $regex: getdata.searchQuery } },
                                { "txnId": { $regex: getdata.searchQuery } }
                            ]
                        }
                    ]
                };
            }
            if(getdata.fromdate != '' && getdata.todate != ''){
                var fromDate= new Date(getdata.fromdate);
                var toDate = new Date(getdata.todate);
                var dateFilter= new Date(fromDate.setTime(fromDate.getTime() + 5.5*60*60*1000));
                var nextDateFilter = new Date(toDate.setTime(toDate.getTime() + 29.49*60*60*1000));
                matchQ['$and'].push({
                    createdDate: {
                        "$gte":dateFilter,
                        "$lt":nextDateFilter
                    }
                });
            }
            if(getdata.status != '') {
                let statusChk = getdata.status == 0 ? { $in: [0,3] } : (getdata.status == 5 ? { $in: [5,6] } : getdata.status);
                matchQ['$and'].push({
                    status: statusChk
                });
            }
            if(getdata.type != '') {
                if(getdata.type == 'Deposit' || getdata.type == 'Withdraw' || getdata.type == 'Wallet Transfer') {
                    matchQ['$and'].push({
                        type: getdata.type
                    });
                } else {
                    matchQ['$and'].push({
                        txnId: getdata.type
                    });
                }
            }
            if(getdata.depositType != '') {
                if(getdata.depositType == 'Wallet Balance' || getdata.depositType == 'Pre Booking') {
                    matchQ['$and'].push({
                        depositType: getdata.depositType
                    });
                } else {
                    // matchQ['$and'].push({
                    //     depositType: ''
                    // });
                }
            }
            if(getdata.currencyId != '') {
                matchQ['$and'].push({
                    currencyId: mongoose.Types.ObjectId(getdata.currencyId)
                });
            }
            if(getdata.searchQuery != '') {
                let userMatchQ = {
                    '$and': [
                        {
                            '$or': [
                                { "username": { $regex: getdata.searchQuery } },
                                { "email": { $regex: getdata.searchQuery } },
                                // { "address": { $regex: getdata.searchQuery } }
                            ]
                        }
                    ]
                };
                let users = await query_helper.findData(Users, userMatchQ, {_id:1}, {})
                let userIds = [];
                if(users.status && users.msg.length > 0) {
                    users.msg.forEach(function(item) {
                        userIds.push(item._id);
                    });                    
                }
                if(userIds.length > 0) {
                    matchQ['$and'].push({
                        userId: {$in: userIds}
                    });
                } else {
                    // matchQ['$and'].push({
                    //     type: ''
                    // });
                }
            }
            let limit = req.body.limit?parseInt(req.body.limit):10;
            let offset = req.body.offset? parseInt(req.body.offset):0;

            if(matchQ['$and'] && matchQ['$and'].length == 0) {
                matchQ = {};
            } 

            console.log(JSON.stringify({matchQ}));

            let transactions = await Transactions.find(matchQ)
                .sort({_id:-1})
                .populate({ path: "userId", select: "username email phoneno" })
                .populate("currencyId", "currencyName currencySymbol basecoin")
                .limit(limit).skip(offset);
            let transcount=await Transactions.find(matchQ)
                .populate({ path: "userId", select: "username email phoneno" })
                .populate("currencyId", "currencyName currencySymbol basecoin")
                .countDocuments();
            res.json({ "status": true, "getTransactionsTblDetails": transactions,"total": transcount});
        } catch (e) {
            console.log('getTransactions',e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getTransactionsDetails (req, res) {
        try {
            // let transactions = await Transactions.findOne({_id: mongoose.Types.ObjectId(req.body._id)}).populate("userId", "username email bankdetails").populate("currencyId", "currencyName currencySymbol basecoin curnType");
            // res.json({ "status": transactions ? true : false, "data": transactions });
            let query = {};
            query = { _id: mongoose.Types.ObjectId(req.body._id) }
            Transactions.aggregate([
                {
                    $match: query
                },
                {
                    $lookup:
                    {
                        from: 'Currency',
                        localField: 'currencyId',
                        foreignField: '_id',
                        as: 'currencyDet'
                    }
                },
                { $unwind: "$currencyDet" },
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
                    $lookup: {
                        from: 'P2PPayment',
                        let: {
                            paymentId: '$paymentId'
                        },
                        pipeline: [
                            {"$unwind":"$methods"},
                            {
                                $match: {
                                    $expr: {
                                        "$eq":["$methods._id", "$$paymentId"]
                                    }
                                }
                            },
                        ],
                        as: 'paymentDet'
                    }
                },
                {
                    $project: {
                        "amount": "$amount",
                        "txnId": "$txnId",
                        "fees": "$fees",
                        "receiveAmount": "$receiveAmount",
                        "address": "$address",
                        "tag": "$tag",
                        "attachment": "$attachment",
                        "rejectReason": "$rejectReason",
                        "status": "$status",
                        "type": "$type",
                        "adminVerify": "$adminVerify",
                        "userId" : "$usersDet._id",
                        "username" : "$usersDet.username",
                        "email" : "$usersDet.email",
                        "phoneno" : "$usersDet.phoneno",
                        "currencyDet":"$currencyDet",
                        "paymentDet":{
                            "$map":{
                                "input":"$paymentDet",
                                "as":"x",
                                "in":{
                                    "paymentId":"$$x.methods._id",
                                    "holderName":"$$x.methods.holderName",
                                    "paymenttype":"$$x.methods.paymenttype",
                                    "accountType":"$$x.methods.accountType",
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
                    },
                },
            ]).exec(async function (err, result) {
                if (result) {
                    res.json({ "status": true, "message": "Transaction details", data: result });
                } else {
                    res.json({ "status": false, "message": "Transaction details Failed", data: err });
                }
            });
        } catch (e) {
            console.log('getTransactionsDetails',e);
            res.json({ "status": false });
        }
    },
    async getUserTransactionsDetails (req, res) {
        try {
            let users = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.body.data._id) }, {});
            if (users.status) {
                let limit =req.body.data.limit?parseInt(req.body.data.limit):10;
                let offset =req.body.data.offset? parseInt(req.body.data.offset):0
                let userTransactions = await Transactions.find({userId: mongoose.Types.ObjectId(req.body.data._id)}).sort({_id:-1}).populate("currencyId", "currencyName currencySymbol basecoin").limit(limit).skip(offset);
                let userTransactionscount = await Transactions.find({userId: mongoose.Types.ObjectId(req.body.data._id)}).populate("currencyId", "currencyName currencySymbol basecoin").countDocuments()
                res.json({ "status": true, "getUserTrasactionDetails": userTransactions,"total":userTransactionscount });
            } else {
                res.json({ "status": false,"message":"Invalid userId" });
            }
        } catch (e) {
            console.log('getUserTransactionsDetails',e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async updateTransactions (req, res) {
        try {
            if(common.getSiteDeploy() == 0) {
                let transactions = await Transactions.findOne({_id: mongoose.Types.ObjectId(req.body._id)}).populate("userId", "username email").populate("currencyId", "currencyName currencySymbol decimal curnType cointype basecoin currencyId contractAddress USDvalue");
                if(transactions) {
                    if(transactions.status == 0 || (transactions.type == 'Withdraw' && transactions.status == 3 && req.body.status == 'Reject')) {
                        const orderwith = oArray.indexOf(transactions.userId._id);
                        if(orderwith == -1) {
                            oArray.push(transactions.userId._id.toString())
                            setTimeout( _intervalFunc, 5000, transactions.userId._id);
                            const type = transactions.type+'-'+transactions.currencyId.cointype;
                            const email_data =   await query_helper.findoneData(emailTemplate,{hint: "transaction-status"},{});
                            const mailsend = email_data.msg;
                            switch(type) {
                                case 'Deposit-1':
                                    let updateFiatDepositData = {
                                        status: req.body.status == 'Reject' ? 2 : 1
                                    }
                                    var text = '', text1 = '', preBookStatus = 0;
                                    if(req.body.status == 'Approve') {
                                        let depositType = (typeof transactions.depositType == "string" && (transactions.depositType == "Wallet Balance" || transactions.depositType == "Pre Booking")) ? transactions.depositType : "Wallet Balance";
                                        if(depositType == 'Pre Booking') {
                                            let placeDate = new Date(transactions.createdDate);
                                            placeDate = new Date(placeDate.setDate(placeDate.getDate() + 1));
                                            if(placeDate.getTime() > new Date().getTime()) {
                                                preBookStatus = 1;
                                            }
                                            if(req.userId == '61b325e412730e73e0ca486a') {
                                                preBookStatus = 0;
                                            }
                                        }
                                        if(preBookStatus == 0) {
                                            updateFiatDepositData.rejectReason = '';
                                            text = 'Your '+transactions.currencyId.currencySymbol+'(Fiat) Deposit Approved. Amount Added To Your Wallet. Happy Trading!';
                                            text1 = 'Fiat Deposit Approved';
                                            const userBalance = await commonHelper.getbalance(transactions.userId._id, transactions.currencyId.currencyId);
                                            let curBalance = userBalance.amount;
                                            let userNewBalance = commonHelper.mathRound(curBalance, +transactions.amount, 'addition');
                                            await commonHelper.updateUserBalance(transactions.userId._id, transactions.currencyId.currencyId, userNewBalance, transactions._id, transactions.currencyId.currencySymbol+'(Fiat) Deposit');
                                        }
                                    } else {
                                        updateFiatDepositData.rejectReason = req.body.rejectReason;
                                        text = 'Your '+transactions.currencyId.currencySymbol+'(Fiat) Deposit Rejected!';
                                        text1 = 'Fiat Deposit Rejected';
                                        if(req.body.rejectReason != '') {
                                            text = text + ' Reason is '+req.body.rejectReason;
                                        }
                                    }
                                    if(preBookStatus == 0) {
                                        await query_helper.updateData(Transactions,"one",{_id: mongoose.Types.ObjectId(req.body._id)},updateFiatDepositData);
                                        var etemplate = mailsend.content.replace(/###NAME###/g,transactions.userId.username).replace(/###CONTENT###/g, text).replace(/###AMOUNT###/g, transactions.amount).replace(/###TXNID###/g, transactions.txnId).replace(/###CURRENCY###/g, transactions.currencyId.currencySymbol+(transactions.currencyId.basecoin != 'Coin' ? ' - '+transactions.currencyId.basecoin : ''));
                                        var subject = mailsend.subject.replace(/###TYPE###/g,text1);
                                        mail_helper.sendMail({subject:subject,to:transactions.userId.email,html:etemplate},(mailresult)=>{
                                        });
                                        await commonHelper.adminactivtylog(req, 'Fiat Transaction', req.userId, mongoose.Types.ObjectId(req.body._id), 'User Fiat Transaction', req.body.status == 'Approve' ? transactions.currencyId.currencySymbol+'(Fiat) Deposit Approved Successfully!' : transactions.currencyId.currencySymbol+'(Fiat) Deposit Rejected Successfully!');
                                        res.json({ "status": true, "message": req.body.status == 'Approve' ? transactions.currencyId.currencySymbol+'(Fiat) Deposit Approved Successfully!' : transactions.currencyId.currencySymbol+'(Fiat) Deposit Rejected Successfully!' });
                                    } else {
                                        res.json({ "status": false, "message": "Kindly Approve Pre Booking Deposits After 24 Hours!" });
                                    }
                                    break;
                                case 'Deposit-0':
                                    let updateCryptoDepositData = {
                                        status: req.body.status == 'Reject' ? 2 : 1
                                    }
                                    var text = '', text1 = '';
                                    if(req.body.status == 'Approve') {
                                        updateCryptoDepositData.rejectReason = '';
                                        text = 'Your '+transactions.currencyId.currencySymbol+(transactions.currencyId.basecoin != 'Coin' ? ' - '+transactions.currencyId.basecoin : '')+' Deposit Approved. Amount Added To Your Wallet. Happy Trading!';
                                        text1 = 'Crypto Deposit Approved';
                                        const userBalance = await commonHelper.getbalance(transactions.userId._id, transactions.currencyId.currencyId);
                                        let curBalance = userBalance.amount;
                                        let userNewBalance = commonHelper.mathRound(curBalance, +transactions.amount, 'addition');
                                        await commonHelper.updateUserBalance(transactions.userId._id, transactions.currencyId.currencyId, userNewBalance, transactions._id, transactions.currencyId.currencySymbol+' Deposit');
                                    } else {
                                        updateCryptoDepositData.rejectReason = req.body.rejectReason;
                                        text = 'Your '+transactions.currencyId.currencySymbol+(transactions.currencyId.basecoin != 'Coin' ? ' - '+transactions.currencyId.basecoin : '')+' Deposit Rejected!';
                                        text1 = 'Crypto Deposit Rejected';
                                        if(req.body.rejectReason != '') {
                                            text = text + ' Reason is '+req.body.rejectReason;
                                        }
                                    }
                                    await query_helper.updateData(Transactions,"one",{_id: mongoose.Types.ObjectId(req.body._id)},updateCryptoDepositData);
                                    var etemplate = mailsend.content.replace(/###NAME###/g,transactions.userId.username).replace(/###CONTENT###/g, text).replace(/###AMOUNT###/g, transactions.amount).replace(/###TXNID###/g, transactions.txnId).replace(/###CURRENCY###/g, transactions.currencyId.currencySymbol+(transactions.currencyId.basecoin != 'Coin' ? ' - '+transactions.currencyId.basecoin : ''));
                                    var subject = mailsend.subject.replace(/###TYPE###/g,text1);
                                    mail_helper.sendMail({subject:subject,to:transactions.userId.email,html:etemplate},(mailresult)=>{
                                    });
                                    res.json({ "status": true, "message": req.body.status == 'Approve' ? transactions.currencyId.currencySymbol+(transactions.currencyId.basecoin != 'Coin' ? ' - '+transactions.currencyId.basecoin : '')+' Deposit Approved Successfully!' : transactions.currencyId.currencySymbol+(transactions.currencyId.basecoin != 'Coin' ? ' - '+transactions.currencyId.basecoin : '')+' Deposit Rejected Successfully!' });
                                    break;
                                case 'Withdraw-1':
                                    let updateFiatWithdrawData = {
                                        status: req.body.status == 'Reject' ? 2 : 1
                                    }
                                    var text = '', text1 = '';
                                    if(req.body.status == 'Approve') {
                                        updateFiatWithdrawData.rejectReason = '';
                                        updateFiatWithdrawData.txnId = req.body.rejectReason;
                                        text = 'Your '+transactions.currencyId.currencySymbol+'(Fiat) Withdraw Approved. Amount Added To Your Bank Account!<br/><br/> <strong style="color:red">Not received fund in your account yet ? Kindly wait for next 2 hours as NEFT take 2 hours to reflect fund in your account!</strong>';
                                        text1 = 'Fiat Withdraw Approved';
                                    } else {
                                        updateFiatWithdrawData.rejectReason = req.body.rejectReason;
                                        text = 'Your '+transactions.currencyId.currencySymbol+'(Fiat) Withdraw Rejected!';
                                        text1 = 'Fiat Withdraw Rejected';
                                        if(req.body.rejectReason != '') {
                                            text = text + ' Reason is '+req.body.rejectReason;
                                        }
                                        const userBalance = await commonHelper.getbalance(transactions.userId._id, transactions.currencyId.currencyId);
                                        let curBalance = userBalance.amount;
                                        let userNewBalance = commonHelper.mathRound(curBalance, +transactions.amount, 'addition');
                                        await commonHelper.updateUserBalance(transactions.userId._id, transactions.currencyId.currencyId, userNewBalance, req.body._id, 'Withdraw Cancel');
                                    }
                                    commonHelper.updateHoldAmount(transactions.userId._id, transactions.currencyId.currencyId, -(+transactions.amount));
                                    await query_helper.updateData(Transactions,"one",{_id: mongoose.Types.ObjectId(req.body._id)},updateFiatWithdrawData);
                                    var etemplate = mailsend.content.replace(/###NAME###/g,transactions.userId.username).replace(/###CONTENT###/g, text).replace(/###AMOUNT###/g, transactions.amount).replace(/###TXNID###/g, req.body.status == 'Approve' ? req.body.rejectReason : '').replace(/###CURRENCY###/g, transactions.currencyId.currencySymbol+(transactions.currencyId.basecoin != 'Coin' ? ' - '+transactions.currencyId.basecoin : ''));
                                    var subject = mailsend.subject.replace(/###TYPE###/g,text1);
                                    mail_helper.sendMail({subject:subject,to:transactions.userId.email,html:etemplate},(mailresult)=>{
                                    });
                                    await commonHelper.adminactivtylog(req, 'Fiat Transaction', req.userId, mongoose.Types.ObjectId(req.body._id), 'User Fiat Transaction', req.body.status == 'Approve' ? transactions.currencyId.currencySymbol+'(Fiat) Deposit Approved Successfully!' : transactions.currencyId.currencySymbol+'(Fiat) Deposit Rejected Successfully!');
                                    res.json({ "status": true, "message": req.body.status == 'Approve' ? transactions.currencyId.currencySymbol+'(Fiat) Withdraw Approved Successfully!' : transactions.currencyId.currencySymbol+'(Fiat) Withdraw Rejected Successfully!' });
                                    break;
                                case 'Withdraw-0':
                                    let updateCryptoWithdrawData = {
                                        status: req.body.status == 'Reject' ? 2 : 1
                                    }
                                    var text = '', text1 = '';
                                    if(req.body.status == 'Approve') {
                                        updateCryptoWithdrawData.rejectReason = '';
                                        updateCryptoWithdrawData.status = 5;
                                        text = 'Your '+transactions.currencyId.currencySymbol+(transactions.currencyId.basecoin != 'Coin' ? ' - '+transactions.currencyId.basecoin : '')+' Withdraw Approved. Amount Added To Given Address!';
                                        text1 = 'Crypto Withdraw Approved';
                                        await query_helper.updateData(Transactions,"one",{_id: mongoose.Types.ObjectId(req.body._id)},updateCryptoWithdrawData);
                                        var etemplate = mailsend.content.replace(/###NAME###/g,transactions.userId.username).replace(/###CONTENT###/g, text).replace(/###AMOUNT###/g, transactions.amount).replace(/###TXNID###/g, 'Processing').replace(/###CURRENCY###/g, transactions.currencyId.currencySymbol+(transactions.currencyId.basecoin != 'Coin' ? ' - '+transactions.currencyId.basecoin : ''));
                                        var subject = mailsend.subject.replace(/###TYPE###/g,text1);
                                        mail_helper.sendMail({subject:subject,to:transactions.userId.email,html:etemplate},(mailresult)=>{
                                        });
                                        res.json({ "status": true, "message": req.body.status == 'Approve' ? transactions.currencyId.currencySymbol+(transactions.currencyId.basecoin != 'Coin' ? ' - '+transactions.currencyId.basecoin : '')+' Withdraw Approved Successfully!' : transactions.currencyId.currencySymbol+(transactions.currencyId.basecoin != 'Coin' ? ' - '+transactions.currencyId.basecoin : '')+' Withdraw Rejected Successfully!' });
                                    } else {
                                        updateCryptoWithdrawData.rejectReason = req.body.rejectReason;
                                        text = 'Your '+transactions.currencyId.currencySymbol+(transactions.currencyId.basecoin != 'Coin' ? ' - '+transactions.currencyId.basecoin : '')+' Withdraw Rejected!';
                                        text1 = 'Crypto Withdraw Rejected';
                                        if(req.body.rejectReason != '') {
                                            text = text + ' Reason is '+req.body.rejectReason;
                                        }
                                        const userBalance = await commonHelper.getbalance(transactions.userId._id, transactions.currencyId.currencyId);
                                        let curBalance = userBalance.amount;
                                        let userNewBalance = commonHelper.mathRound(curBalance, +transactions.amount, 'addition');
                                        await commonHelper.updateUserBalance(transactions.userId._id, transactions.currencyId.currencyId, userNewBalance, req.body._id, 'Withdraw Cancel');
                                        commonHelper.updateHoldAmount(transactions.userId._id, transactions.currencyId.currencyId, -(+transactions.amount));
                                        await query_helper.updateData(Transactions,"one",{_id: mongoose.Types.ObjectId(req.body._id)},updateCryptoWithdrawData);
                                        var etemplate = mailsend.content.replace(/###NAME###/g,transactions.userId.username).replace(/###CONTENT###/g, text).replace(/###AMOUNT###/g, transactions.amount).replace(/###TXNID###/g, transactions.txnId).replace(/###CURRENCY###/g, transactions.currencyId.currencySymbol+(transactions.currencyId.basecoin != 'Coin' ? ' - '+transactions.currencyId.basecoin : ''));
                                        var subject = mailsend.subject.replace(/###TYPE###/g,text1);
                                        mail_helper.sendMail({subject:subject,to:transactions.userId.email,html:etemplate},(mailresult)=>{
                                        });
                                        res.json({ "status": true, "message": req.body.status == 'Approve' ? transactions.currencyId.currencySymbol+(transactions.currencyId.basecoin != 'Coin' ? ' - '+transactions.currencyId.basecoin : '')+' Withdraw Approved Successfully!' : transactions.currencyId.currencySymbol+(transactions.currencyId.basecoin != 'Coin' ? ' - '+transactions.currencyId.basecoin : '')+' Withdraw Rejected Successfully!' });
                                    }
                                    break;
                                default:
                                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                            }
                        } else {
                            setTimeout( _intervalFunc, 5000, transactions.userId._id);  
                            res.json({ status: false, msg: "Please wait for 5 seconds before placing another request!" });
                        }
                    } else {
                        res.json({ "status": false, "message": "Transaction already processed! Try other transaction." });
                    }
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }
            } else {
                return res.json({ status: false, message: "Please wait for 5 minutes before placing another request!" }) 
            }
        } catch (e) {
            console.log('updateTransactions',e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async adminTrxnVerification(req, res) {
        try {
            let transactions = await Transactions.findOne({ _id: mongoose.Types.ObjectId(req.body._id) }).populate("userId", "username email").populate("currencyId", "currencyName currencySymbol decimal curnType cointype basecoin currencyId contractAddress USDvalue");
            if (transactions) {
                if (transactions.type == 'Withdraw' && transactions.status == 5 && transactions.adminVerify != 'verified') {
                    if (req.body.extraStatus == 'verified') {
                        let updateCryptoWithdrawData = {
                            adminVerify: req.body.extraStatus
                        }
                        await query_helper.updateData(Transactions, "one", { _id: mongoose.Types.ObjectId(req.body._id) }, updateCryptoWithdrawData);
                        await commonHelper.adminactivtylog(req, 'Crypto Transaction', req.userId, mongoose.Types.ObjectId(req.body._id), 'User Withdraw Transaction', 'Crypto Withdraw Verified by admin sucessfully');
                        res.json({ "status": true, "message": "Transaction  is Verified Sucessfully!" });
                    } else {
                        res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                    }
                } else {
                    res.json({ "status": false, "message": "Transaction already processed! Try other transaction." });
                }
            } else {
                res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
            }
        } catch (e) {
            console.log('adminTrxnVerification', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    }
};
let oArray = [];
function _intervalFunc(orderwith){
    orderwith = orderwith.toString();
    var index = oArray.indexOf(orderwith);
    if (index > -1) {
        oArray.splice(index, 1);
    }
}
module.exports = transactionsController;