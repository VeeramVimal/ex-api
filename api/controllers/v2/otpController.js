const query_helper = require('../../helpers/query');
let common = require('../../helpers/common');
const mongoose = require('mongoose');
let speakeasy = require('speakeasy');
const emailTemplate = mongoose.model("EmailTemplate");
const mail_helper = require('../../helpers/mailHelper');
const Users = mongoose.model("Users");
const VerifyUsers = mongoose.model("VerifyUsers");
const SiteSettings = mongoose.model("SiteSettings");
let ReferralDB = mongoose.model('ReferralCommission');
const activityDB = mongoose.model('UserActivity');
let CurrencyDb = mongoose.model('Currency');
let Notification = mongoose.model('Notification');
var config = require("../../Config/config");
var request = require('request');

const otpController = {
    async getCode(req, res) {
        try {
            const {
                body: reqBody = {},
                userId = ''
            } = req;

            const {
                pageName= '',
                target= ''
            } = reqBody;

            let {
                newEmail: email= '',
                newPhoneno: phoneno= '',
            } = reqBody;
            const random = Math.floor(100000 + Math.random() * 900000);

            const userDetailsResp = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(userId) }, {});
            let userDetails = {};
            if(userDetailsResp && userDetailsResp.status && userDetailsResp.msg){
                userDetails = userDetailsResp.msg;
            }
            else {
                return res.json({ status: false, message: "Oops! Something went wrong. Please try again" })
            }

            let updValues = {};

            if(target == 'newPhoneOTP' || target == 'oldPhoneOTP') {

                let chkPhNoVal = "";
                if(target == 'newPhoneOTP' && phoneno) {
                    chkPhNoVal = target+phoneno;
                }
                else if(target == 'oldPhoneOTP' && userDetails.phoneno) {
                    chkPhNoVal = target+userDetails.phoneno;
                }
                const orderwith = oArray.indexOf(chkPhNoVal);
                if(orderwith == -1) {
                    oArray.push(chkPhNoVal.toString())
                    setTimeout( _intervalFunc, 60000, chkPhNoVal);
                }
                else {
                    setTimeout( _intervalFunc, 60000, chkPhNoVal);
                    return res.json({ status: false, msg: "You can able to request 60 seconds once" });
                }

                if(target == 'newPhoneOTP') {
                    updValues['userOTP.newPhone'] = random;
                    updValues['userOTP.newPhoneTime'] = new Date();
                    if(phoneno === "") {
                        return res.json({ status: false, message: "Please enter the phoneno" })
                    }

                    let alreadyCheck = await query_helper.findoneData(Users, { phoneno: phoneno }, {});
                    if (alreadyCheck && alreadyCheck.status) {
                        return res.json({ "status": false, message: "Phone number already exists!" });
                    }
                }
                else if(target == 'oldPhoneOTP') {
                    updValues['userOTP.oldPhone'] = random;
                    updValues['userOTP.oldPhoneTime'] = new Date();
                    phoneno = userDetails.phoneno;
                }

                let tempMsgContent = '';
                if(pageName == 'changePhoneNumber') {
                    tempMsgContent = "Verification Code: ###OTP###. You are trying to change your phone number";
                }
                else if(pageName == 'changeEmail') {
                    tempMsgContent = "Verification Code: ###OTP###. You are trying to change your email address";
                }
                else {
                    tempMsgContent = "Verification Code: ###OTP###. You are trying to change your phone number";
                }
                
                tempMsgContent = tempMsgContent
                .replace(/###OTP###/g, random);
                const resp = await common.mobileSMS(phoneno, tempMsgContent);
                await query_helper.updateData(Users, 'one', { _id: mongoose.Types.ObjectId(userId) }, updValues);
                return res.json({ status: true, message: "Verification code sent to your phone" })
            }
            else if(target == 'newEmailOTP' || target == 'oldEmailOTP') {
                if(target == 'newEmailOTP') {
                    updValues['userOTP.newEmail'] = random;
                    updValues['userOTP.newEmailTime'] = new Date();
                    if(email == '') {
                        return res.json({ status: false, message: "Please enter the email address" })
                    }
                    let checkValidEmail = common.checkValidEmail(email)
                    if (!checkValidEmail) {
                        return res.json({ "status": false, "message": "Your email-id is not allow in our site. Kindly use another email-id!" });
                    }
                    let alreadyCheck = await query_helper.findoneData(Users, { _id: {"$ne": userDetails._id}, email: email }, {});
                    if (alreadyCheck && alreadyCheck.status) {
                        return res.json({ "status": false, message: "Email is already exists!" });
                    }
                }
                else if(target == 'oldEmailOTP') {
                    updValues['userOTP.oldEmail'] = random;
                    updValues['userOTP.oldEmailTime'] = new Date();
                    email = userDetails.email;
                }
                
                let hint = '';
                if(pageName == 'changePhoneNumber') {
                    hint = "user-verify-phone";
                }
                else if(pageName == 'changeEmail') {
                    hint = "user-verify-email";
                }
                
                let email_data = await query_helper.findoneData(emailTemplate, { hint }, {});
                if (email_data.status) {
                    const username = userDetails.username ? userDetails.username : "";
                    const toEmail = email;
                    let etemplate = email_data.msg.content.replace(/###OTP###/g, random).replace(/###NAME###/g, username)
                    mail_helper.sendMail({ subject: email_data.msg.subject, to: toEmail, html: etemplate }, async(mailresult) => {
                        common.insertActivity(userDetails._id, 'User Verify Phoneno', 'Phoneno Verification', 'user', req);
                        await query_helper.updateData(Users, 'one', { _id: mongoose.Types.ObjectId(userId) }, updValues);
                        return res.json({ status: true, message: "Verification code sent to email" })
                    });
                } else {
                    await query_helper.updateData(Users, 'one', { _id: mongoose.Types.ObjectId(userId) }, updValues);
                    return res.json({ status: false, message: "Oops! Something went wrong.Please try again" })
                }
            }
        } catch (e) {
            console.log('otpSend', e);
            res.json({ status: false, message: "Oops! Something went wrong.Please try again" })
        }
    },
};

let oArray = [];
function _intervalFunc(orderwith) {
    orderwith = orderwith.toString();
    var index = oArray.indexOf(orderwith);
    if (index > -1) {
        oArray.splice(index, 1);
    }
}
module.exports = otpController;