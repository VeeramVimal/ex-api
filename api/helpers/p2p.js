const mongoose = require('mongoose');
var query_helper = require('./query');
let common = require('./common');
const P2PTransactions = mongoose.model("P2PTransactions");
const P2POrder = mongoose.model("P2POrder");
const P2PPair = mongoose.model("P2PPair");
const Users = mongoose.model("Users");
const emailTemplate = mongoose.model("EmailTemplate");
const P2PAppealHistory = mongoose.model("P2PAppealHistory");
const mail_helper = require('../helpers/mailHelper');
var mapP2P = function () { };
let _p2pMap = new mapP2P();
var socket = 0;

exports.SocketInit = function (socketIO) {
  socket = socketIO;
}

exports.settingsUpdate = function (result) {
    siteSettingData = result;
    socket.sockets.emit('settingsUpdate', result);
}

mapP2P.prototype._intervalFunc = (orderwith) => {
    var index = oArray.indexOf(orderwith);
    if (index > -1) {
        oArray.splice(index, 1);
    }
}

let createp2pOrder = exports.createp2pOrder = async function (values, placeType, res) {
    _p2pMap._createp2pOrder(values, placeType, res);
}

let createp2pAppeal = exports.createp2pAppeal = async function (values, placeType, res) {
    _p2pMap._createp2pAppeal(values, placeType, res);
}

exports.cronCancelOrder = async function () {
    const findQ = { status: 3, selectedCancel: 0, verifyStep: 1, orderEndDate: {$lt: new Date()} };
    let userRecords = await query_helper.findData(P2PTransactions, findQ, {}, { _id: 1 }, 0);
    if(userRecords.status && userRecords.msg.length > 0) {
        let ids = [];
        userRecords.msg.forEach(element => {
            ids.push(element._id);
        });
        await query_helper.updateData(P2PTransactions, 'one', { _id: {$in: ids} }, { selectedCancel: 1 });
        const placeType = "cron";
        cancelOneOrder(userRecords.msg, 0, placeType);
    }
}

exports.p2pOrderClose = async function (data = {}) {
    const orderID = data.orderId;
    let ordersData = await P2POrder.aggregate([
        {
            $match: {
                _id: mongoose.Types.ObjectId(orderID),
                status: 1,
                usdtPrice: 0,
                orderAmount: {
                    "$gt": 0
                }
            }
        },
        {
            $lookup: {
              from: 'P2PTransactions',
              let: {
                orderId: '$_id',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { "$eq": ["$orderId", "$$orderId"] },
                        { "$eq": ["$status", 3] },
                      ]
                    }
                  }
                },
                {
                  $limit: 1
                }
              ],
              as: "P2PTransactionsDet"
            }
        }
    ]);
    if (ordersData && ordersData.length > 0) {
        let ids = [];
        ordersData.forEach(element => {
            if (element.P2PTransactionsDet && element.P2PTransactionsDet.length == 0) {
                ids.push(element._id);
            }
        });
        await query_helper.updateData(P2POrder, 'one', { _id: {$in: ids} }, { status: 0, reason: "Order completed" });
    }

    return true;
}

exports.cronadminCancelOrder = async function () {
    let userRecords = await query_helper.findData(P2PTransactions, { status: 3, selectedCancel: 0, verifyStep: 1, orderEndDate: {$lt: new Date()} }, {}, { _id: 1 }, 0);
    if(userRecords.status && userRecords.msg.length > 0) {
        let ids = [];
        userRecords.msg.forEach(element => {
            ids.push(element._id);
        });
        await query_helper.updateData(P2PTransactions, 'one', { _id: {$in: ids} }, { selectedCancel: 1 });
        admincancelOneOrder(userRecords.msg, 0);
    }
}

let cancelOneOrder = exports.cancelOneOrder = async function (userRecords, inc, placeType = "") {
    let userId = userRecords[inc].orderType == 'buy' ? userRecords[inc].ownerId : userRecords[inc].userId;
    let resp = await cancelOrder(userRecords[inc].orderNo, userId, {status: 2, cancelReason: 'Timer expiration'}, placeType);
    inc = inc + 1;
    if(userRecords.length > inc) {
        cancelOneOrder(userRecords, inc, placeType);
    }
}

let admincancelOneOrder = exports.admincancelOneOrder = async function (userRecords, inc) {
    let userId = userRecords[inc].orderType == 'buy' ? userRecords[inc].ownerId : userRecords[inc].userId;
    let resp = await admincancelOrder(userRecords[inc].orderNo, userId, {status: 2, cancelReason: 'Timer expiration'});
    inc = inc + 1;
    if(userRecords.length > inc) {
        admincancelOneOrder(userRecords, inc);
    }
}

let cancelOrder = exports.cancelOrder = async function ( orderNo, userId, data, placeType = "") {
    try {
        let checkData = await P2PTransactions.findOne({ orderNo: orderNo, status: 3 });
        if (checkData && (checkData.buyerUserId.toString() == userId.toString() || checkData.sellerUserId.toString() == userId.toString()) && (checkData.verifyStep == 1 || checkData.verifyStep == 2) && checkData.status == 3) {

            if(placeType != "cron") {
                let oneday = new Date(Date.now() - 24*60*60 * 1000);
                let cancelOrderData = await P2PTransactions.find({ buyerUserId: mongoose.Types.ObjectId(userId),status: 2, createdDate: {$gt: oneday} });
                if (cancelOrderData && cancelOrderData.length == 3) {
                    return { "status": false, "message": '3 accountable cancellations in a day.', data: cancelOrderData };
                }
            }

            let orderData = await query_helper.findoneData(P2POrder, { _id: mongoose.Types.ObjectId(checkData.orderId) }, {});
            if (orderData.status) {
                orderData = orderData.msg;
                const newval = (+orderData.usdtPrice) + (+checkData.totalPrice);
                await query_helper.updateData(P2POrder, "one", { _id: mongoose.Types.ObjectId(checkData.orderId) }, { usdtPrice: newval });
                await query_helper.updateData(P2PTransactions, "one", { orderNo: orderNo }, data);
                let checkTxn = await query_helper.findoneData(P2PTransactions, { orderNo: orderNo }, {});
                if (checkTxn.status) {
                    checkTxn = checkTxn.msg;
                    await query_helper.updateData(P2PTransactions, "one", { orderNo: orderNo }, { status: 2, verifyStep: 4 });
                    await query_helper.updateData(P2PAppealHistory, "one", { orderNo: orderNo }, { status: 2 });

                    if(orderData.orderType == 'buy') {
                        let sellerUser = checkTxn.userId;
                        let pairs = await P2PPair.findOne({ _id: mongoose.Types.ObjectId(checkTxn.pairId) }).sort({ _id: 1 }).populate("fromCurrency").populate("toCurrency");
                        if (pairs) {
                            let fromCurrency = pairs.fromCurrency;
                            let walletOutput = await common.getbalance(sellerUser, fromCurrency.currencyId);
                            if (walletOutput) {
                                let newbal = (+walletOutput.p2pAmount) + (+checkTxn.totalPrice);
                                await common.updatep2pAmount(sellerUser, fromCurrency.currencyId, newbal, checkTxn._id, 'P2P - Cancellation', {notes:'P2P - Cancellation'});
                                await common.updatep2pAmountHold(sellerUser, fromCurrency.currencyId, -(checkTxn.totalPrice));
                            }
                        }
                    }
                    let userResult = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(userId) }, {});
                    let userStatus = userResult.msg;
                    let smsTemplate =  "[ Exchange ] P2P Order"+ checkData.orderNo.slice(- 4) + " has been cancelled.";
                    await common.mobileSMS(userStatus.phoneno, smsTemplate, {section: "p2p"});
                    let email_data = await query_helper.findoneData(emailTemplate, { hint: 'p2p-order-Cancel' }, {});
                    await common.p2pactivtylog(checkTxn.userId, checkTxn.ownerId, checkTxn.orderNo, "", (checkTxn.orderType) +' Order cancelled', 'Order Cancelled successfully');
                    let etempdataDynamic = email_data.msg.content.replace(/###NAME###/g, userStatus.username).replace(/###ORDERNO###/g, orderNo).replace(/###REASON###/g, data.cancelReason);
                    mail_helper.sendMail({ subject: email_data.msg.subject, to: userStatus.email, html: etempdataDynamic }, function (res1) {
                    });
                }
                createp2pOrder(checkData, "socket", "");
                return { "status": true, "message": 'You will be accountable for this order cancellation.', data: checkData };
            } else {
                return { "status": false, "message": 'Order Not Cancelled' };
            }
        } else {
            return { "status": false, "message": 'Order Not Cancelled' };
        }
    }
    catch(err) {
        console.log("err : cancelOrder : ", err)
    }
}

let admincancelOrder = exports.admincancelOrder = async function (orderNo, userId, data) {
    let checkData = await P2PTransactions.findOne({ orderNo: orderNo, status: 3 });
    // && checkData.buyerUserId.toString() == userId.toString()
    if (checkData && (checkData.verifyStep == 1 || checkData.verifyStep == 2) && checkData.status == 3) {
        let orderData = await query_helper.findoneData(P2POrder, { _id: mongoose.Types.ObjectId(checkData.orderId) }, {});
        if (orderData.status) {
            orderData = orderData.msg;
            const newval = (+orderData.usdtPrice) + (+checkData.totalPrice);
            await query_helper.updateData(P2POrder, "one", { _id: mongoose.Types.ObjectId(checkData.orderId) }, { usdtPrice: newval });
            await query_helper.updateData(P2PTransactions, "one", { orderNo: orderNo }, data);
            let checkTxn = await query_helper.findoneData(P2PTransactions, { orderNo: orderNo }, {});
            if (checkTxn.status) {
                checkTxn = checkTxn.msg;
                await query_helper.updateData(P2PTransactions, "one", { orderNo: orderNo }, { status: 2, verifyStep: 4 });
                await query_helper.updateData(P2PAppealHistory, "one", { orderNo: orderNo }, { status: 2 });

                if(orderData.orderType == 'buy') {
                    let sellerUser = checkTxn.userId;
                    let pairs = await P2PPair.findOne({ _id: mongoose.Types.ObjectId(checkTxn.pairId) }).sort({ _id: 1 }).populate("fromCurrency").populate("toCurrency");
                    if (pairs) {
                        let fromCurrency = pairs.fromCurrency;
                        let walletOutput = await common.getbalance(sellerUser, fromCurrency.currencyId);
                        if (walletOutput) {
                            let newbal = (+walletOutput.p2pAmount) + (+checkTxn.totalPrice); 
                            await common.updatep2pAmount(sellerUser, fromCurrency.currencyId, newbal, checkTxn._id, 'P2P - Cancellation', {notes:'P2P - Cancellation'});
                            await common.updatep2pAmountHold(sellerUser, fromCurrency.currencyId, -(checkTxn.totalPrice));
                        }
                    }
                }
                let userResult = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(userId) }, {});
                let userStatus = userResult.msg;
                let smsTemplate =  "[ Exchange ] P2P Order"+ checkData.orderNo.slice(- 4) + " has been cancelled by admin.";
                await common.mobileSMS(userStatus.phoneno, smsTemplate, {section: "p2p"});
                let email_data = await query_helper.findoneData(emailTemplate, { hint: 'p2p-admin-order-Cancel' }, {});
                if(email_data && email_data.msg && email_data.msg.content) {
                    let etempdataDynamic = email_data.msg.content
                        .replace(/###NAME###/g, userStatus.username ? userStatus.username : "")
                        .replace(/###ORDERNO###/g, orderNo)
                        .replace(/###REASON###/g, data.cancelReason ? data.cancelReason : "");
                    mail_helper.sendMail({ subject: email_data.msg.subject, to: userStatus.email, html: etempdataDynamic }, function (res1) {
                    });
                }
            }
            createp2pOrder(checkData, "socket", "");
            return { "status": true, "message": 'You will be accountable for this order cancellation.', data: checkData };
        } else {
            return { "status": false, "message": 'Order Not Cancelled1' };
        }
    } else {
        return { "status": false, "message": 'Order Not Cancelled2' };
    }
}

mapP2P.prototype._createp2pOrder = async function (data, placeType, res) {
    try {
        let txnStatus = await query_helper.findoneData(P2PTransactions, { orderNo: data.orderNo }, {});
        if (txnStatus.status) {
            txnStatus = txnStatus.msg;
            P2PTransactions.aggregate([
                {
                    $match: { 
                        orderNo : data.orderNo 
                    }
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
                { $unwind : "$usersDet" },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'ownerId',
                        foreignField: '_id',
                        as: 'ownerDet'
                    }
                },
                { $unwind : "$ownerDet" },
                {
                    $lookup:
                    {
                        from: 'P2PFeedBack',
                        localField: '_id',
                        foreignField: 'orderId',
                        as: 'feedbackDet'
                    }
                },
                { $unwind : "$ownerDet" },
                {
                    $lookup:
                    {
                        from: 'P2POrder',
                        localField: 'orderId',
                        foreignField: '_id',
                        as: 'orderDet'
                    }
                },
                { $unwind : "$orderDet" },
                {
                    $lookup:
                    {
                        from: 'P2PPayment',
                        localField: 'ownerId',
                        foreignField: 'userId',
                        as: 'ownerPaymentDet'
                    }
                },
                { $unwind : "$ownerPaymentDet" },
                {
                    $project: {
                        "ownerPaymentDet" : "$ownerPaymentDet",
                        "ownerOrderCount" : "$ownerOrderCount",
                        "paymentDet" : "$paymentDet",
                        "paymentId" : "$paymentId",
                        "feedbackDet" : "$feedbackDet",
                        "holderName" : "$paymentDet.methods.holderName",
                        "accountNo" : "$paymentDet.methods.accountNo",
                        "ifscCode" : "$paymentDet.methods.ifscCode",
                        "bankName" : "$paymentDet.methods.bankName",
                        "accountType" : "$paymentDet.methods.accountType",
                        "branch" : "$paymentDet.methods.branch",
                        "orderDet" : "$orderDet",
                        "ownerEmail" : "$ownerDet.email",
                        "ownerName" : "$ownerDet.username",
                        "email" : "$usersDet.email",
                        "username" : "$usersDet.username",
                        "orderPrice" : "$orderDet.price",
                        "pairName" : "$orderDet.pairName",
                        "verifyStep" : "$verifyStep",
                        "price" : "$price",
                        "qunatity" : "$totalPrice",
                        "orderNo" : "$orderNo",
                        "ownerId" : "$ownerId",
                        "totalcount" : "$totalcount",
                        "userId" : "$userId",
                        "orderLimit" : "$orderLimit",
                        "status" : "$status",
                        "orderType" : "$orderType",
                        "orderEndDate" : "$orderEndDate",
                        "paymentEndDate" : "$paymentEndDate",
                        "chattingHistory" : "$chattingHistory",
                        "createdDate" : "$createdDate",
                    },
                },
            ]).exec(async function (err, result) {
                if (result) {
                    if (placeType == "socket") {
                        socket.sockets.emit('orderResponse', result);
                    } else {
                        res.json(result);
                    }
                } else {
                }
            });
        } else {
            return { "status": false, "message": 'No records' };
        }
    } catch(e) {
        console.log('_createp2pOrder', e)
    }
}

mapP2P.prototype._createp2pAppeal = async function (data, placeType, res) {
    try {
        let txnStatus = await query_helper.findoneData(P2PTransactions, { orderNo: data.orderNo }, {});
        if (txnStatus.status) {
            txnStatus = txnStatus.msg;
            P2PAppealHistory.aggregate([
                {
                    $match: {
                        orderNo: data.orderNo,
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
                        "createdDate": "$createdDate",
                        "appealEndDate": "$appealEndDate"
                    },
                },
    
            ]).exec(async function (err, result) {
                if (result) {
                    if (placeType == "socket") {
                        socket.sockets.emit('p2pappealResponse', result);
                    } else {
                        res.json(result);
                    }
                } else {
                }
            });
        }
    } catch (err) {
        console.log('getappealHistory', err);
    }
}