const query_helper = require('../../helpers/query');
let common = require('../../helpers/common');
let passwordBcrypt = require('../../helpers/password-bcrypt.helper');

const mongoose = require('mongoose');
let speakeasy = require('speakeasy');
let ipInfo = require('ipinfo');
const emailTemplate = mongoose.model("EmailTemplate");
const mail_helper = require('../../helpers/mailHelper');
const Users = mongoose.model("Users");
const VerifyUsers = mongoose.model("VerifyUsers");
const SiteSettings = mongoose.model("SiteSettings");
let ReferralDB = mongoose.model('ReferralCommission');
const activityDB = mongoose.model('UserActivity');
let CurrencyDb = mongoose.model('Currency');
let Notification = mongoose.model('Notification');
const P2PPayment = mongoose.model("P2PPayment");
var config = require("../../Config/config");
var request = require('request');

const customerController = {
    async forgotPassword(req, res) {
        try {
            let data = req.body;
            let recaptcha = '';
            if (typeof data.captcha_value != 'undefined' && typeof data.captcha_value != undefined) {
                recaptcha = data.captcha_value;
            }
            const response = common.checkCaptcha(recaptcha);
            if (response) {
                let emailegt = "";
                if (common.isEmpty(data.email) == false){
                    emailegt = (data.email).toLowerCase();
                }
                let userFindData = {};
                let userUningEmailOrPhno = "email";
                if(isNaN(emailegt)) {
                    userFindData.email = { $eq: emailegt };
                }
                else {
                    userFindData.phoneno = { $eq: data.phoneno };
                    userUningEmailOrPhno = "phoneno";
                }
                let findUserResult = await query_helper.findoneData(Users, userFindData, {})
                if (findUserResult.status) {
                    findUserResult = findUserResult.msg;
                    if (findUserResult.status == 1) {
                        // let random = Math.floor(100000000000 + Math.random() * 900000000000);
                        const random = Math.floor(100000 + Math.random() * 900000);
                        const updaterandom = await query_helper.updateData(Users, 'one', { _id: findUserResult._id }, { forgotId: random, forgotDate: new Date() });
                        if (updaterandom.status) {
                            if(userUningEmailOrPhno === 'email') {
                                let email_data = await query_helper.findoneData(emailTemplate, { hint: 'user-forgot-password' }, {});
                                if (email_data.status) {
                                    const username = findUserResult.username ? findUserResult.username : "";
                                    let etemplate = email_data.msg.content.replace(/###OTP###/g, random).replace(/###NAME###/g, username)
                                    mail_helper.sendMail({ subject: email_data.msg.subject, to: data.email, html: etemplate }, (mailresult) => {
                                        common.insertActivity(findUserResult._id, 'User Forgot password', 'Forgot Password', 'user', req);
                                        return res.json({ status: true, message: "Password reset OTP mail sent successfully" })
                                    })
                                } else {
                                    return res.json({ status: false, message: "Oops! Something went wrong.Please try again" })
                                }
                            }
                            else {
                                let tempMsgContent = "Dear customer, ###OTP### is OTP for your account password reset request initiated through Fibit Platform";
                                tempMsgContent = tempMsgContent
                                    .replace(/###OTP###/g, random);
                                await common.mobileSMS(findUserResult.phoneno, tempMsgContent);
                                res.json({ status: true, message: "Password reset OTP sent to your phone" })
                            }
                        } else {
                            res.json({ status: false, message: "Oops! Something went wrong. Please try again" })
                        }
                    } else {
                        res.json({ status: false, message: "Your account is de-activated by admin" })
                    }
                } else {
                    if(userUningEmailOrPhno === 'email') {
                        res.json({ status: false, message: "The email doesn't exists. Please check if your number is correct" });
                    }
                    else {
                        res.json({ status: false, message: "The phone number doesn't exists. Please check if your number is correct" });
                    }
                }
            } else {
                res.send({ status: false, msg: "Invalid Captcha." });
            }
        } catch (e) {
            console.log('forgotPassword', e);
            res.json({ status: false, message: "Oops! Something went wrong.Please try again" })
        }
    },
    async forgotPasswordCheck(req, res) {
        try {
            let resData = await query_helper.findoneData(SiteSettings, {}, {});
            if (resData.status) {
                const bodyData = req.body;
                let forgotId = req.body.resetPasswordCode;
                let emailegt = "";
                if (common.isEmpty(bodyData.email) == false) {
                    emailegt = (bodyData.email).toLowerCase();
                }
                let userFindData = { forgotId };

                if(isNaN(emailegt)) {
                    userFindData.email = emailegt;
                }
                else {
                    userFindData.phoneno = bodyData.phoneno;
                }
                const validUser = await query_helper.findoneData(Users, userFindData, {});

                if (validUser.status && validUser.msg) {
                    let otpExpireStatus = common.otpExpireCheck({ start: validUser.msg.forgotDate })
                    if(otpExpireStatus === false) {
                        return res.json({ status: false, message: 'Forgot verification code has expired' });
                    }
                    res.json({ status: true, message: "Success" });
                } else {
                    res.json({ status: false, message: "Forgot verification code is incorrect!" })
                }
            } else {
                res.json({ status: false, message: "Oops! Something went wrong. Please try again" })
            }
        } catch (e) {
            console.log('forgotPasswordCheck', e);
            res.json({ status: false, message: "Oops! Something went wrong. Please try again" })
        }
    },
    async resetPassword(req, res) {
        let data = req.body;
        const bodyData = req.body;
        const {
            resetPasswordCode= '',
            newPassword= '',
            confirmPassword= ''
        } = bodyData;
        try {
            if(newPassword !== confirmPassword) {
                return res.json({ status: false, message: "Password and Confirm Passwords does not match" })
            }
            let recaptcha = '';
            if (typeof data.captcha_value != 'undefined' && typeof data.captcha_value != undefined) {
                recaptcha = data.captcha_value;
            }

            let resData = await query_helper.findoneData(SiteSettings, {}, {});
            if (resData.status === false) {
                return res.json({ status: false, message: "Oops! Something went wrong. Please try again" })
            }
            const response = common.checkCaptcha(recaptcha);
            if (response) {
                // let now = new Date();
                // now.setMinutes(now.getMinutes() - resData.msg.linkExpireTiming);
                // const current = now;
                let emailegt = "";
                if (common.isEmpty(bodyData.email) == false) {
                    emailegt = (bodyData.email).toLowerCase();
                }
                let userFindData = {
                    forgotId: resetPasswordCode,
                    // forgotDate: { $gte: current }
                };
                let userUningEmailOrPhno = "email";
                if(isNaN(emailegt)) {
                    userFindData.email = emailegt;
                }
                else {
                    userFindData.phoneno = bodyData.phoneno;
                    userUningEmailOrPhno = "phoneno";
                }
                let findUser = await query_helper.findoneData(Users, userFindData, {});
                if (findUser.status && findUser.msg) {
                    let checkencryptOld = await passwordBcrypt.passwordChk({
                        password: data.newPassword,
                        hash: findUser.msg.password
                    });
                    if(checkencryptOld.status && checkencryptOld.resp) {
                        return res.json({ status: false, message: "New password must be different than the old one" })
                    }

                    let newencrypt = await passwordBcrypt.getPasswordHash({passwordVal: data.newPassword});
                    const updateUser = await query_helper.updateData(Users, 'one', { _id: findUser.msg._id }, { forgotId: 0, forgotDate: null, password: newencrypt.hash });
                    if (updateUser.status) {
                        common.insertActivity(findUser.msg._id, 'User Reset Password', 'Reset password', 'user', req);

                        if(userUningEmailOrPhno === 'email') {
                            let email_data = await query_helper.findoneData(emailTemplate, { hint: 'user-reset-password' }, {});
                            if (email_data.status) {
                                const username = (findUser.msg && findUser.msg.username) ? findUser.msg.username : "";
                                let emailtemplate = email_data.msg.content.replace(/###NAME###/g, username);
                                mail_helper.sendMail({ subject: email_data.msg.subject, to: findUser.msg.email, html: emailtemplate }, (aftermail) => {
                                    res.json({ status: true, message: "Your password changed successfully" })
                                })
                            } else {
                                res.json({ status: false, message: "Oops! Something went wrong. Please try again" })
                            }
                        }
                        else {
                            return res.json({ status: true, message: "Your password changed successfully" })
                        }
                    } else {
                        res.json({ status: false, message: "Oops! Something went wrong. Please try again" })
                    }
                } else {
                    res.send({ status: false, message: "Not a valid request!" });
                }
            }
            else {
                res.send({ status: false, msg: "Invalid Captcha." });
            }
        } catch (e) {
            console.log('resetPassword', e);
            res.json({ status: false, message: "Oops! Something went wrong. Please try again." })
        }
    },
    async changeVerificationDetail(req, res) {
        // email & phoneno
        const {
            body: reqBody = {},
            userId = ''
        } = req;

        const {
            newEmail= '',
            newPhoneno= '',
            oldPhonenoOTP= '',
            newPhonenoOTP= '',
            oldEmailOTP= '',
            newEmailOTP= '',
            pageName= ''
        } = reqBody;
        const userDetailsResp = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(userId) }, {});
        let userDetails = {};

        if(userDetailsResp && userDetailsResp.status && userDetailsResp.msg){
            userDetails = userDetailsResp.msg;
            const userOTP = userDetails.userOTP ? userDetails.userOTP : {};

            if(pageName === 'changePhoneNumber') {
                if(!newPhoneno || newPhoneno == '' || ! newPhonenoOTP) {
                    return res.json({ status: false, message: 'Please enter all required details' });
                }

                if(!userOTP.newPhone || newPhonenoOTP != userOTP.newPhone) {
                    return res.json({ status: false, message: 'Your new phone number verification code is incorrect' });
                }
                else {
                    let otpExpireStatus = common.otpExpireCheck({ start: userOTP.newPhoneTime })
                    if(otpExpireStatus === false) {
                        return res.json({ status: false, message: 'Your new phone number verification code has expired' });
                    }
                }

                if(userDetails.phoneno) {
                    if(!oldPhonenoOTP) {
                        return res.json({ status: false, message: 'Please enter all required details' });
                    }
                    if(!userOTP.oldPhone || oldPhonenoOTP != userOTP.oldPhone) {
                        return res.json({ status: false, message: 'Your phone number verification code is incorrect' });
                    }
                    else {
                        let otpExpireStatus = common.otpExpireCheck({ start: userOTP.oldPhoneTime })
                        if(otpExpireStatus === false) {
                            return res.json({ status: false, message: 'Your phone number verification code has expired' });
                        }
                    }
                    if(userDetails.phoneno == newPhoneno) {
                        return res.json({ status: false, message: 'New phone number must be a different from the old one' });
                    }
                }

                if(userDetails.email) {
                    if(!oldEmailOTP || oldEmailOTP == '') {
                        return res.json({ status: false, message: 'Please enter all required details' });
                    }
                    if(!userOTP.oldEmail || oldEmailOTP != userOTP.oldEmail) {
                        return res.json({ status: false, message: 'Your email verification code is incorrect' });
                    }
                    else {
                        let otpExpireStatus = common.otpExpireCheck({ start: userOTP.oldEmailTime })
                        if(otpExpireStatus === false) {
                            return res.json({ status: false, message: 'Your email verification code has expired' });
                        }
                    }
                }

                let alreadyCheck = await query_helper.findoneData(Users, { _id: {"$ne": userDetails._id}, phoneno: newPhoneno }, {});
                if (alreadyCheck && alreadyCheck.status) {
                    return res.json({ "status": false, message: "Phone number already exists!" });
                }

                let updValues = {
                    phoneno: newPhoneno,
                    userOTP: {
                        oldEmail: 0,
                        oldEmailTime: "",
                        oldPhone: 0,
                        oldPhoneTime: "",
                        newEmail: 0,
                        newEmailTime: "",
                        newPhone: 0,
                        newPhoneTime: ""
                    }
                };
                if(reqBody.country != "") {
                    updValues.country = reqBody.country;
                }
                if(updValues.country == "IND") {
                    updValues.kycMode = "Online";
                }
                await query_helper.updateData(Users, 'one', { _id: mongoose.Types.ObjectId(userId) }, updValues);
                let activity = common.activity(req);
                activity.browser = (typeof activity.browser == 'string') ? activity.browser : loginType + ' Application';
                let userActData = await query_helper.findoneData(activityDB, { userId: req.userId, ip: activity.ip, type: "Phoneno Updation" }, {})
                if (!userActData.status) {
                    common.userNotify({
                        userId: req.userId,
                        reason: 'Phoneno Updation',
                        activity,
                        detail: {
                           oldPhoneno: userDetails.phoneno,
                           newPhoneno: newPhoneno
                        }
                    });
                }
                return res.json({ status: true, message: "Phone number updated successfully" });
            }
            else if(pageName === 'changeEmail') {
                if(!newEmail || newEmail == '' || !newEmailOTP || newEmailOTP == '') {
                    return res.json({ status: false, message: 'Please enter all required details' });
                }
                if(!userOTP.newEmail || newEmailOTP != userOTP.newEmail) {
                    return res.json({ status: false, message: 'Your email verification code is incorrect' });
                }
                else {
                    let otpExpireStatus = common.otpExpireCheck({ start: userOTP.newEmailTime })
                    if(otpExpireStatus === false) {
                        return res.json({ status: false, message: 'Your new email verification code has expired' });
                    }
                }

                if(userDetails.email) {
                    if(!oldEmailOTP || oldEmailOTP == '') {
                        return res.json({ status: false, message: 'Please enter all required details' });
                    }
                    if(!userOTP.oldEmail || oldEmailOTP != userOTP.oldEmail) {
                        return res.json({ status: false, message: 'Your email verification code is incorrect' });
                    }
                    else {
                        let otpExpireStatus = common.otpExpireCheck({ start: userOTP.oldEmailTime })
                        if(otpExpireStatus === false) {
                            return res.json({ status: false, message: 'Your email verification code has expired' });
                        }
                    }
                    if(userDetails.email == newEmail) {
                        return res.json({ status: false, message: 'Your new email address must be a different from the old one' });
                    }
                }

                if(userDetails.phoneno) {
                    if(!oldPhonenoOTP || oldPhonenoOTP == '') {
                        return res.json({ status: false, message: 'Please enter all required details' });
                    }
                    if(!userOTP.oldPhone || oldPhonenoOTP != userOTP.oldPhone) {
                        return res.json({ status: false, message: 'Your phone number verification code is incorrect' });
                    }
                    else {
                        let otpExpireStatus = common.otpExpireCheck({ start: userOTP.oldPhoneTime })
                        if(otpExpireStatus === false) {
                            return res.json({ status: false, message: 'Your phone number verification code has expired' });
                        }
                    }
                }

                let alreadyCheck = await query_helper.findoneData(Users, { _id: {"$ne": userDetails._id}, email: newEmail }, {});
                if (alreadyCheck && alreadyCheck.status) {
                    return res.json({ "status": false, message: "Email address already exists!" });
                }

                const updValues = {
                    email: newEmail,
                    userOTP: {
                        oldEmail: 0,
                        oldEmailTime: "",
                        oldPhone: 0,
                        oldPhoneTime: "",
                        newEmail: 0,
                        newEmailTime: "",
                        newPhone: 0,
                        newPhoneTime: ""
                    }
                };
                await query_helper.updateData(Users, 'one', { _id: mongoose.Types.ObjectId(userId) }, updValues);
                let activity = common.activity(req);
                activity.browser = (typeof activity.browser == 'string') ? activity.browser : loginType + ' Application';
                let userActData = await query_helper.findoneData(activityDB, { userId: req.userId, ip: activity.ip, type: "Email Updation" }, {})
                if (!userActData.status) {
                    common.userNotify({
                        userId: req.userId,
                        reason: 'Email Updation',
                        activity,
                        detail: {
                            oldEmail: userDetails.email,
                            newEmail: newEmail
                        }
                    });
                }
                return res.json({ status: true, message: "Email updated successfully" });
            }
        }
        else {
            return res.json({ status: false, message: "Oops! Something went wrong. Please try again" })
        }
    },
    async changeEmail(req, res) {
    },
    async tradeFanTknFeesAuth(req, res) {
        const {
            userId = ''
        } = req;

        let retData = {
            status: false,
            message: ""
        };

        let settResp = await query_helper.findoneData(SiteSettings, {}, {});
        if(settResp.status) {
            settResp = settResp.msg; 
            const tradeFeeDiscount = settResp.tradeFeeDiscount ? settResp.tradeFeeDiscount : 0;
            let findUserResult = await query_helper.findoneData(Users, {_id: mongoose.Types.ObjectId(userId)}, {});
            if (findUserResult.status) {
                findUserResult = findUserResult.msg;
                let updData = {};
                if (findUserResult.tradeFanTknFees === 0) {
                    updData.tradeFanTknFees = 1;
                    retData = {
                        status: true, message: "Fees settings activated successfully. Avail "+tradeFeeDiscount+"% more off while paying fees in "+config.FanTknSymbol+" for all pairs."
                    };
                }
                else {
                    updData.tradeFanTknFees = 0;
                    retData = {
                        status: true, message: "Fees settings deactivated successfully."
                    };
                }
                const updUser = await query_helper.updateData(Users, 'one', { _id: mongoose.Types.ObjectId(userId) }, updData);
            }
            else {
                retData = {
                    status: false, message: "User not found"
                };
            }
        }
        else {
            retData = {
                status: false, message: "Oops! Something went wrong. Please try again"
            };
        }

        return res.json(retData);
    },
    async loginHistory(req, res) {
        let limit = req.body.limit?parseInt(req.body.limit):10;
        let offset = req.body.offset? parseInt(req.body.offset):0
        let matchQ = {
            "userId" : req.userId
        } 
        let history = await activityDB.find(matchQ).sort({_id:-1}).limit(limit).skip(offset);
        let activitiesTotal = await activityDB.find(matchQ).sort({_id:-1}).countDocuments();
        return res.json({ status: true, history, activitiesTotal});
    },
    async getBankPayments(req,res){
        try {
            let findUserResult = await query_helper.findoneData(Users, {_id: mongoose.Types.ObjectId(req.userId)}, {});
            if (findUserResult.status) {
                let payment = await query_helper.findoneData(P2PPayment, { userId: mongoose.Types.ObjectId(req.userId) }, {})
                if (payment.status) {
                    if (payment.msg && payment.msg.methods.length > 0) {
                        const userActivePayment = payment.msg.methods.filter(elem => elem.paymenttype == "Bank")
                        res.json({ "status": true, "message": 'payment details', data: userActivePayment });
                    }
                } else {
                    res.json({ "status": false, "message": 'No payment details',data: [] });
                }
            } else{
                res.json({ "status": false, "message": 'Not valid user',data:[] });
            }
           
        } catch (e) {
            console.log('getPayment', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time!" });
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
module.exports = customerController;