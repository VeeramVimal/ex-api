const mongoose = require('mongoose');
var query_helper = require('./query');
let common = require('./common');
const Notification = mongoose.model("Notification");
var mapNotification = function () { };
let _notificationMap = new mapNotification();
var socket = 0;

exports.SocketInit = function(socketIO){
    socket = socketIO
}

// mapNotification.prototype._

exports.sendNotification = async function () {
    try {
        const findQ = { notificationType: "admin" }
        const notification = await query_helper.findData(Notification, findQ, 0, { _id: -1 });
        return notification;
    } catch (err) {
        console.log("notification err", err);
    }
}

exports.getUserId = async function(userId) {  
    try {
        // console.log('userId==help==>',userId)
        const findQ = { notificationType: "admin", $or: [
            { userList: { $size: 0 } }, // userList is empty
            { userList: { $not: { $elemMatch: { usersId: userId } } } } // userList does not contain the specified user ID
          ] }
        const notification = await query_helper.findData(Notification, findQ, 0, { _id: -1 });
        // console.log("notification ref--->",notification);
        return notification;
        // 
    } catch (err) {
        console.log("notification err", err);
    }
}

// mapNotification.prototype._send  Notification = async function () {
//     try {
//         const 
//     } catch (err) {
//         console.log("notification err", err);
//     }
// }