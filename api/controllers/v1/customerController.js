const query_helper = require('../../helpers/query');
let common = require('../../helpers/common');
let passwordBcrypt = require('../../helpers/password-bcrypt.helper');

const mongoose = require('mongoose');
let speakeasy = require('speakeasy');
const bankController = require('../v2/bankController');
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
const P2PAllPayments = mongoose.model("P2PAllPayments");

var config = require("../../Config/config");
let request = require('request');
var axios = require('axios');

const customerController = {
    async getServerTime(req, res) {
        let d1 = new Date();
        let dateInc = d1.getDate();
        let monthInc = d1.getMonth() + 1;
        let yearInc = d1.getFullYear();
        if (dateInc < 10) {
            dateInc = "0" + dateInc;
        }
        if (monthInc < 10) {
            monthInc = "0" + monthInc;
        }
        const setDate = dateInc + "." + monthInc + "." + yearInc;
        const setTime = ((d1.getHours() < 10) ? "0" : "") + d1.getHours() + ":" + ((d1.getMinutes() < 10) ? "0" : "") + d1.getMinutes() + ":" + ((d1.getSeconds() < 10) ? "0" : "") + d1.getSeconds();
        const nDate = new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Calcutta'
        });
        res.json({ "time": setDate + ' ' + setTime, nDate: nDate, nDate1: new Date(nDate) })
    },
    async login(req, res) {
        try {
            let req_data = req.body;
            if (
               ( (typeof req_data.email != 'undefined' && typeof req_data.email != undefined && req_data.email != null && req_data.email != '') 
                || 
                (typeof req_data.phoneno != 'undefined' && typeof req_data.phoneno != undefined && req_data.phoneno != null && req_data.phoneno != '') )
                &&
                (typeof req_data.password != 'undefined' && typeof req_data.password != undefined && req_data.password != null && req_data.password != '')
            ) {
                let loginType = 'Web';
                if (typeof req_data.type != 'undefined' && typeof req_data.type != undefined && typeof req_data.device_key != 'undefined' && typeof req_data.device_key != undefined) {
                    loginType = req_data.type;
                }

                let emailOrPhoneno = isNaN(req_data.email) === false ? "phoneno" : "email";

                let recaptcha = '';
                if (typeof req_data.captcha_value != 'undefined' && typeof req_data.captcha_value != undefined) {
                    recaptcha = req_data.captcha_value;
                }
                const response = common.checkCaptcha(recaptcha);
                if (response) {
                    let emailegt = "";
                    if(req_data.email) {
                        emailegt = (req_data.email).toLowerCase();
                        emailegt = emailegt.replace(/ /g, "");
                    }
                    let userFindData = {};
                    let userVerifyChk = {type: "register"};
                    if(emailegt) {
                        userVerifyChk.email = emailegt;
                        userFindData.email = emailegt;
                    }
                    else {
                        userVerifyChk.phoneno = req_data.phoneno;
                        userFindData.phoneno = req_data.phoneno;
                    }

                    let chkOrderwith = req_data.email ? req_data.email.toString() : req_data.phoneno ? req_data.phoneno.toString() : "";
                    const orderwith = oArray.indexOf(chkOrderwith);
                    if (orderwith == -1) {
                        oArray.push(chkOrderwith);
                        setTimeout(_intervalFunc, 5000, chkOrderwith);
                        let resData = await query_helper.findoneData(Users, userFindData, {});
                        if (resData.status) {
                            resData = resData.msg;
    
                            let checkencrypt = await passwordBcrypt.passwordChk({
                                password: req_data.password,
                                hash: resData.password
                            });
                            if(!checkencrypt.status || !checkencrypt.resp) {
                                return res.json({ "status": false, "message": "Invalid password" });
                            }
    
                            if (resData.status == 1) {
                                if (typeof req_data.otp != 'undefined' && typeof req_data.otp != undefined && req_data.otp != '') {
                                    let verified = false;
                                    let type = '';
                                    if (resData.tfaenablekey == '') {
                                        type = 'OTP';
                                        if (req_data.otp == resData.otp) {
                                            let otpExpireStatus = common.otpExpireCheck({ start: resData.otpTime })
                                            if(otpExpireStatus === false) {
                                                return res.json({ status: false, message: 'Your verification code has expired' });
                                            }
                                            verified = true;
                                        }
                                        else {
                                            return res.json({ "status": false, "message": 'Please enter valid verification code!' });
                                        }
                                    } else {
                                        type = '2FA';
                                        verified = speakeasy.totp.verify({
                                            secret: resData.tfaenablekey,
                                            encoding: 'base32',
                                            token: req_data.otp,
                                            window: 6
                                        });
                                    }
                                    if (verified == true) {
                                        let updData = { otp: 0, otpTime: null, lastLoginTime: new Date() };
                                        if(resData.email) {
                                            updData.lastLoginBy = {
                                                from: "Email",
                                                val: resData.email
                                            }
                                        }
                                        else {
                                            updData.lastLoginBy = {
                                                from: "Phone",
                                                val: resData.phoneno
                                            }
                                        }
    
                                        let securityKey = 0;
                                        if(resData.securityKey) {
                                            securityKey = resData.securityKey;
                                        }
                                        else if(!resData.securityKey) {
                                            securityKey = Math.floor(Math.random() * 100000000);
                                            updData.securityKey = securityKey;
                                        }
    
                                        await query_helper.updateData(Users, "one", { _id: resData._id }, updData);
    
                                        let activity = common.activity(req);
                                        activity.browser = (typeof activity.browser == 'string') ? activity.browser : loginType + ' Application';
                                        let userActData = await query_helper.findoneData(activityDB, { userId: resData._id, ip: activity.ip, type: "Login" }, {})

                                        let reason = "";
                                        if (!userActData.status) {
                                            reason = "New Device Login";
                                        }
                                        else {
                                            reason = "User Login";
                                        }
                                        
                                        if(reason == "New Device Login") {
                                            if(resData.email) {
                                                let email_data = await query_helper.findoneData(emailTemplate, { hint: 'new-device-login' }, {})
                                                if (email_data.status) {
                                                    let etempdataDynamic = email_data.msg.content.replace(/###NAME###/g, resData.username ? resData.username : "").replace(/###IP###/g, activity.ip).replace(/###BROWSER###/g, activity.browser);
                                                    mail_helper.sendMail({ subject: email_data.msg.subject, to: emailegt, html: etempdataDynamic }, function (res1) {
                                                    });
                                                }
                                            }
                                            // common.userNotification(resData._id, reason, 'You have logged in new device. Browser: ' + activity.browser + ' , IP: ' + activity.ip);
                                            common.userNotify({
                                                userId: resData._id,
                                                reason: reason,
                                                activity,
                                                detail: {
                                                }
                                            });
                                        }
                                        let d = new Date().getTime();
                                        let origin = common.createPayloadCustomers(resData._id, securityKey);
                                        common.insertActivity(resData._id, 'Login', d, 'user', req);
                                        res.json({
                                            status: true,
                                            type: 0,
                                            kycstatus: resData.kycstatus == 1 ? true : false,
                                            token: origin,
                                            message: "Logged In successfully"
                                        });
                                    } else {
                                        return res.json({ "status": false, "message": 'Please enter valid ' + type + ' code!' });
                                    }
                                } else {
                                    let msg = 'Enter your 2FA code to continue';
                                    let type = 2;
                                    if (resData.tfaenablekey == '') {
                                        let genotp = await common.getOTPCode({from:"user", userData: resData});
                                        await query_helper.updateData(Users, "one", { _id: resData._id }, { otp: genotp, otpTime: new Date() });
                                        if(resData.email && emailOrPhoneno === 'email') {
                                            let email_data = await query_helper.findoneData(emailTemplate, { hint: 'user-login-otp' }, {})
                                            if (email_data.status) {
                                                let etempdataDynamic = email_data.msg.content.replace(/###NAME###/g, resData.username ? resData.username : "").replace(/###OTP###/g, genotp);
                                                mail_helper.sendMail({ subject: email_data.msg.subject, to: emailegt, html: etempdataDynamic }, function (res1) {
                                                });
                                            }
                                            msg = 'OTP sent successfully , Please check your email.';
                                        }
                                        else if(resData.phoneno && emailOrPhoneno === 'phoneno') {
                                            let tempMsgContent = "Your account login verification code: ###OTP###";
                                            tempMsgContent = tempMsgContent
                                                .replace(/###OTP###/g, genotp);
                                            await common.mobileSMS(resData.phoneno, tempMsgContent);
                                            msg = 'OTP sent successfully , Please check your phone.';
                                        }
                                        type = 1;
                                    }
                                    return res.status(200).json({
                                        type: type,
                                        "message": msg,
                                        "status":true
                                    })
                                }
                            } else {
                                return res.json({ "status": false, message: "Your account is de-activated by admin" })
                            }
                        }
                        else {
                            let verResData = await query_helper.findoneData(VerifyUsers, userVerifyChk, {});
                            console.log({verResData});
                            if(verResData.status && verResData.msg && verResData.msg.type) {
                                if(userVerifyChk.email) {
                                    return res.json({ status: false, message: "Your E-Mail not verified" });
                                }
                                else {
                                    return res.json({ status: false, message: "Your Mobile number not verified" });
                                }
                            }
                            else {
                                return res.json({ status: false, message: "Invalid User details" });
                            }
                            // if(isNaN(emailegt) === false) {
                            //     if(emailegt.includes("+") === false) {
                            //         return res.json({ status: false, message: "Invalid User details, Please enter phone number with country code." });
                            //     }
                            //     else {
                            //         return res.json({ status: false, message: "Invalid User details" });
                            //     }
                            // }
                            // else {
                            //     return res.json({ status: false, message: "Invalid User details" });
                            // }
                        }
                    }
                    else {
                        setTimeout(_intervalFunc, 5000, chkOrderwith);
                        return res.json({ status: false, message: "Please wait for 5 seconds before placing another request!" });
                    }

                } else {
                    res.send({ status: false, message: "Invalid Captcha." });
                }
            } else {
                res.send({ status: false, message: "Invalid Fields." });
            }
        } catch (e) {
            console.log('login', e);
            res.send({ status: false, message: "Invalid Fields." });
        }
    },
    async forgotPassword(req, res) {
        try {
            let data = req.body;
            let recaptcha = '';
            if (typeof data.captcha_value != 'undefined' && typeof data.captcha_value != undefined) {
                recaptcha = data.captcha_value;
            }
            const response = common.checkCaptcha(recaptcha);
            if (response) {
                let findemailresult = await query_helper.findoneData(Users, { email: data.email.toLowerCase() }, {})
                if (findemailresult.status) {
                    findemailresult = findemailresult.msg;
                    if (findemailresult.status == 1) {
                        let random = Math.floor(100000000000 + Math.random() * 900000000000);
                        const updaterandom = await query_helper.updateData(Users, 'one', { _id: findemailresult._id }, { forgotId: random, forgotDate: new Date() });
                        if (updaterandom.status) {
                            let email_data = await query_helper.findoneData(emailTemplate, { hint: 'user-forgot-password' }, {});
                            if (email_data.status) {
                                let etemplate = email_data.msg.content.replace(/###LINK###/g, config.frontEnd + 'reset/' + random).replace(/###NAME###/g, findemailresult.username)
                                mail_helper.sendMail({ subject: email_data.msg.subject, to: data.email, html: etemplate }, (mailresult) => {
                                    common.insertActivity(findemailresult._id, 'User Forgot password', 'Forgot Password', 'user', req);
                                    res.json({ status: true, message: "Password reset mail sent successfully" })
                                })
                            } else {
                                res.json({ status: false, message: "Oops! Something went wrong.Please try again" })
                            }
                        } else {
                            res.json({ status: false, message: "Oops! Something went wrong.Please try again" })
                        }
                    } else {
                        res.json({ status: false, message: "Your account is de-activated by admin" })
                    }
                } else {
                    res.json({ status: false, message: "The email doesn't exists" })
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
                let data = req.body.resetPasswordCode;
                let now = new Date();
                now.setMinutes(now.getMinutes() - resData.msg.linkexpiretiming);
                const current = now;
                const validUser = await query_helper.findoneData(Users, { forgotId: data, forgotDate: { $gte: current } }, {});
                if (validUser.status) {
                    res.json({ status: true, message: "Valid URL" });
                } else {
                    res.json({ status: false, message: "Forgot link has been expired!" })
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
        try {
            let recaptcha = '';
            if (typeof data.captcha_value != 'undefined' && typeof data.captcha_value != undefined) {
                recaptcha = data.captcha_value;
            }
            const response = common.checkCaptcha(recaptcha);
            if (response) {
                let findUser = await query_helper.findoneData(Users, { forgotId: data.resetPasswordCode }, {});
                if (findUser.status) {
                    let newencrypt = await passwordBcrypt.getPasswordHash({passwordVal: data.newPassword});
                    const securityKey = Math.floor(Math.random() * 100000000);
                    const updateUser = await query_helper.updateData(Users, 'one', { _id: findUser.msg._id }, { forgotId: 0, password: newencrypt.hash, securityKey });
                    if (updateUser.status) {
                        common.insertActivity(findUser.msg._id, 'User Reset Password', 'Reset password', 'user', req);
                        let email_data = await query_helper.findoneData(emailTemplate, { hint: 'user-reset-password' }, {});
                        if (email_data.status) {
                            let emailtemplate = email_data.msg.content.replace(/###NAME###/g, findUser.msg.username);
                            mail_helper.sendMail({ subject: email_data.msg.subject, to: findUser.msg.email, html: emailtemplate }, (aftermail) => {
                                res.json({ status: true, message: "Your password changed successfully" })
                            })
                        } else {
                            res.json({ status: false, message: "Oops! Something went wrong. Please try again" })
                        }
                    } else {
                        res.json({ status: false, message: "Oops! Something went wrong. Please try again" })
                    }
                } else {
                    res.send({ status: false, message: "Not a valid request!" });
                }
            } else {
                res.send({ status: false, msg: "Invalid Captcha." });
            }
        } catch (e) {
            console.log('resetPassword', e);
            res.json({ status: false, message: "Oops! Something went wrong. Please try again." })
        }
    },
    async register(req, res) {
        try {
            let getdet = req.body;
            let recaptcha = '';
            if (typeof getdet.captcha_value != 'undefined' && typeof getdet.captcha_value != undefined) {
                recaptcha = getdet.captcha_value;
            }
            let tabName = getdet.email ? 'email' : getdet.phoneno ? 'phoneno' : "";
            let tabNameShow = getdet.email ? 'email' : getdet.phoneno ? 'phone number' : "";
            let chkOrderwith = getdet.email ? getdet.email.toString() : getdet.phoneno ? getdet.phoneno.toString() : "";
            const orderwith = oArray.indexOf(chkOrderwith);
            if (orderwith == -1) {
                oArray.push(chkOrderwith);
                setTimeout(_intervalFunc, 5000, chkOrderwith);
                const response = common.checkCaptcha(recaptcha);
                if (response) {
                    if (typeof getdet.otp == 'undefined' || typeof getdet.otp == undefined || getdet.otp == '') {
                        getdet.otp = 0;
                    }
                    if(getdet.email) {
                        getdet.email = (getdet.email).toLowerCase();
                        getdet.email = getdet.email.replace(/ /g, "");
                        // const emailArr = getdet.email.split("@");
                        // getdet.username = (getdet.name) ? getdet.name : (emailArr && emailArr[0]) ? emailArr[0] : "";
                        let emailCheck = await query_helper.findoneData(Users, { email: getdet.email }, {});
                        if (emailCheck && emailCheck.status) {
                            return res.json({ "status": false, "message": "Email address already exists!" });
                        }
                        let checkValidEmail = common.checkValidEmail(getdet.email)
                        if (!checkValidEmail) {
                            return res.json({ "status": false, "message": "Your email-id is not allow in our site. Kindly use another email-id!" });
                        }
                    }
                    else if(getdet.phoneno) {
                        getdet.phoneno = getdet.phoneno.replace(/ /g, "");
                        // getdet.phoneno = getdet.phonecode+getdet.phoneno;
                        let phonenoCheck = await query_helper.findoneData(Users, { phoneno: getdet.phoneno }, {});
                        if (phonenoCheck && phonenoCheck.status) {
                            return res.json({ "status": false, "message": "Phone number already exists!" });
                        }
                    }
                    else {
                        return res.json({ "status": false, "message": "Invalid User Data!"});
                    }

                    // if (typeof getdet.referralId == 'string' && getdet.referralId != '') {
                    //     if (!mongoose.Types.ObjectId.isValid(getdet.referralId)) {
                    //         return res.json({ "status": false, "message": "Invalid Referral Code!" });
                    //     }
                    // }
                    if (getdet.otp != 0) {
                        let verifyOTPUserFind;
                        if(getdet.email) {
                            verifyOTPUserFind = { email: getdet.email, type: 'register' };
                        }
                        else if(getdet.phoneno) {
                            verifyOTPUserFind = { phoneno: getdet.phoneno, type: 'register' }
                        }
                        let verifyOTPUser = await query_helper.findData(VerifyUsers, verifyOTPUserFind, { otp: 1, otpTime: 1, dateTime: 1 }, { _id: -1 }, 0);
                        if (verifyOTPUser.status && verifyOTPUser.msg.length > 0) {
                            if (getdet.otp == verifyOTPUser.msg[0].otp) {
                                let otpExpireStatus = common.otpExpireCheck({ start: verifyOTPUser.msg[0].otpTime })
                                if(otpExpireStatus === false) {
                                    return res.json({ status: false, message: 'Your '+tabNameShow+' verification code has expired' });
                                }

                                let referrerCode = '';
                                let referPromoter = '';
                                if (typeof getdet.referralId == 'string' && getdet.referralId != '') {
                                    
                                    let referCheckFind = {}
                                    if(mongoose.Types.ObjectId.isValid(getdet.referralId)) {
                                        referCheckFind = { _id: mongoose.Types.ObjectId(getdet.referralId) };
                                    }
                                    else {
                                        referCheckFind = { referCode: getdet.referralId };
                                    }
                                    const referCheck = await query_helper.findoneData(Users, referCheckFind, { _id: 1, referCode: 1 });

                                    if (!referCheck.status) {
                                        return res.json({ "status": false, "message": "Invalid Referral Code!" });
                                    }

                                    if(referCheck.status && referCheck.msg && referCheck.msg._id) {
                                        if(referCheck.msg.referCode && referCheck.msg.referCode == getdet.referralId) {
                                            referPromoter = referCheck.msg._id;
                                        }
                                        else {
                                            referrerCode = getdet.referralId;
                                        }
                                    }
                                }

                                let password = await passwordBcrypt.getPasswordHash({passwordVal: getdet.password});
                                if(password.hash != "") { 
                                    let insertUserData = {
                                        referUser: referrerCode,
                                        referPromoter: referPromoter,
                                        password: password.hash,
                                        status: 1,
                                        country: getdet.country
                                    };

                                    if(getdet.email && getdet.email != null) {
                                        insertUserData.email = getdet.email;
                                    }
                                    else if(getdet.phoneno) {
                                        insertUserData.phoneno = getdet.phoneno;
                                    }

                                    const securityKey = Math.floor(Math.random() * 100000000);
                                    insertUserData.securityKey = securityKey;

                                    let insertUser = await query_helper.insertData(Users, insertUserData);
                                    if (insertUser.status) {
                                        common.insertActivity(insertUser.msg._id, 'User Registration', 'Registration', 'user', req);
                                        if(getdet.phoneno) {
                                            return res.json({ "status": true, "message": "Phone number verified successfully. You can log in now.", "type": 1 });
                                        }
                                        else {
                                            return res.json({ "status": true, "message": "Email verified successfully. You can log in now.", "type": 1 });
                                        }
                                    } else {
                                        return res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                                    }
                                }
                                else {
                                    return res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                                }
                            } else {
                                return res.json({ "status": false, "message": "Please enter valid "+tabNameShow+" OTP" });
                            }
                        } else {
                            return res.json({ "status": false, "message": "Please enter valid "+tabNameShow+" OTP" });
                        }
                    }
                    else {
                        let genotp = await common.getOTPCode({from:"user"});
                        let insertVerifyData = { otp: genotp, otpTime: new Date(), type: 'register' };

                        let otpWhere = {};
                        if(getdet.email) {
                            otpWhere.email = getdet.email;
                            insertVerifyData.email = getdet.email;
                        }
                        else if(getdet.phoneno) {
                            otpWhere.phoneno = getdet.phoneno;
                            insertVerifyData.phoneno = getdet.phoneno;
                        }
                        let verifySend = await query_helper.insertData(VerifyUsers, insertVerifyData);
                        // let verifySend = await query_helper.updateData(VerifyUsers, "one", otpWhere, insertVerifyData, { upsert: true });

                        if (verifySend.status) {
                            let tempMsgContent = "";
                            if(tabName === 'email') {
                                let email_data = await query_helper.findoneData(emailTemplate, { hint: 'user-register-otp' }, {});
                                if (email_data.status) {
                                    tempMsgContent = email_data.msg.content;
                                    tempMsgContent = tempMsgContent.replace(/###OTP###/g, genotp).replace(/###NAME###/g, getdet.name);
                                    mail_helper.sendMail({ subject: email_data.msg.subject, to: getdet.email, html: tempMsgContent }, function (res1) {
                                    });
                                    return res.json({ "status": true, "message": "OTP sent successfully , Please check your email.", type: 0 });
                                } else {
                                    return res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                                }
                            }
                            else if(tabName === 'phoneno') {
                                let tempMsgContent = "Your ###SITENAME### account activation code: ###OTP###";
                                tempMsgContent = tempMsgContent
                                    .replace(/###OTP###/g, genotp)
                                    .replace(/###SITENAME###/g, config.siteName);
                                await common.mobileSMS(getdet.phoneno, tempMsgContent);
                                return res.json({ "status": true, "message": "OTP sent successfully , Please check your phone number.", type: 0 });
                            }
                            else {
                                return res.json({ "status": false, "message": "Enter correct values" });
                            }
                        } else {
                            return res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                        }
                    }
                } else {
                    return res.send({ status: false, msg: "Invalid Captcha." });
                }
            } else {
                // setTimeout(_intervalFunc, 5000, chkOrderwith);
                return res.json({ status: false, message: "Please wait for 5 seconds before placing another request!" });
            }
        } catch (e) {
            console.log('register', e);
            return res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async changePassword(req, res) {
        try {
            const orderwith = oArray.indexOf(req.userId.toString());
            if (orderwith == -1) {
                oArray.push(req.userId.toString())
                setTimeout(_intervalFunc, 5000, req.userId.toString());
                if (req.body.newPassword == req.body.confirmNewPassword) {
                    let UserRes = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.userId) }, {})
                    if (UserRes.status) {
                        UserRes = UserRes.msg;
                        
                        let checkencrypt = await passwordBcrypt.passwordChk({
                            password: req.body.oldPassword,
                            hash: UserRes.password
                        });
                        if(!checkencrypt.status || !checkencrypt.resp) {
                            return res.json({ "status": false, "message": "Invalid old password" });
                        }
                        let checkencryptnew = await passwordBcrypt.getPasswordHash({passwordVal: req.body.newPassword});
                        const securityKey = Math.floor(Math.random() * 100000000);
                        const updData = {
                            securityKey,
                            forgotId: 0,
                            password: checkencryptnew.hash
                        }
                        let otpup_data = await query_helper.updateData(Users, "one", { _id: UserRes._id }, updData);
                        if (otpup_data) {
                            let email_data = await query_helper.findoneData(emailTemplate, { hint: "user-change-password" }, {})
                            if (email_data.status) {
                                email_data = email_data.msg;
                                let etempdataDynamic = email_data.content.replace(/###NAME###/g, UserRes.username);
                                mail_helper.sendMail({ subject: email_data.subject, to: UserRes.email, html: etempdataDynamic }, function (res1) {
                                    res.json({ "status": true, "message": "Password changed successfully!" });
                                });
                            } else {
                                res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                            }
                        } else {
                            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                        }
                    } else {
                        res.json({ "status": false, "message": "User not found." });
                    }
                } else {
                    res.json({ "status": false, "message": "Password and new password not a identical" });
                }
            } else {
                setTimeout(_intervalFunc, 5000, req.userId.toString());
                res.json({ status: false, message: "Please wait for 5 seconds before placing another request!" });
            }
        } catch (e) {
            console.log('changePassword', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getMyProfile(req, res) {
        try {
            let profile = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.userId) }, {
                password: 0,

                otp: 0,
                otpTime: 0,

                userOTP: 0,

                forgotId: 0,
                forgotDate: 0,

                // withdraw_otp: 0,
                // withdraw_otpTime: 0,
            });
            if (profile.status) {
                let secretKey = '';
                if (profile.msg.tfaenablekey == '') {
                    const secret = speakeasy.generateSecret({ length: 10 });
                    secretKey = secret.base32;
                }

                // const kycLength = Object.keys(profile.msg.kyc).length;
                // let kycArr = {};
                // let kycDumObj = {
                //     "Aadhaar or Passport - (Front)": 'aadharFront',
                //     "Aadhaar or Passport - (Back)": 'aadharBack',
                //     "Pan or Identity Card - (Front)": 'panCardPhoto',
                //     "Selfie - (By holding aadhar card or Passport)": 'selfieWithCard',
                //     "Pan or Identity Card": 'panCard',
                //     "Reject Reason": 'rejectReason'
                // }
                // if (kycLength > 0) {
                //     for (key in profile.msg.kyc) {
                //         kycArr[kycDumObj[key]] = profile.msg.kyc[key].value;
                //     }
                // } else {
                //     for (key in kycDumObj) {
                //         kycArr[kycDumObj[key]] = '';
                //     }
                // }

                const bankLength = Object.keys(profile.msg.bankdetails).length;
                let bankArr = [];
                let bankDumObj = {
                    "Beneficiary Name": "beneficiaryName",
                    "Bank Name": "bankName",
                    "Account Number": "accountNumber",
                    "IFSC Code": "ifscCode",
                    "Account Type": "accountType"
                };
                if (bankLength > 0) {
                    for (key in profile.msg.bankdetails) {
                        bankArr.push({ text: key, type: bankDumObj[key], value: profile.msg.bankdetails[key] });
                    }
                } else {
                    for (key in bankDumObj) {
                        bankArr.push({ text: key, type: bankDumObj[key], value: "" });
                    }
                }
                const resData = await query_helper.findoneData(SiteSettings, {}, {})
                let profileMsg = JSON.parse(JSON.stringify(profile.msg));
                profileMsg.bankArr = bankArr;
                // profileMsg.kycArr = kycArr;
                profileMsg.secretKey = secretKey;
                profileMsg.supportEmail = (resData.status && resData.msg.supportEmail != '') ? resData.msg.supportEmail : '';
                profileMsg.tradeText = (resData.status && resData.msg.tradeText != '') ? resData.msg.tradeText : '';
                profileMsg.referralCommission = (resData.status && resData.msg.referralCommission != '') ? resData.msg.referralCommission : 0;
                var key = "blockStatus";
                delete profileMsg[key];
                res.json({ "status": profile.status, "data": profileMsg, "secretKey": secretKey });
            } else {
                res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
            }
        } catch (e) {
            console.log('getMyProfile', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getReferralData(req, res) {
        try {
            let profile = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.userId) }, {});
            if (profile.status) {
                profile = profile.msg;
                let userDetails = {};
                userDetails._id = profile._id;
                userDetails.email = profile.email;
                userDetails.username = profile.username;
                userDetails.phoneno = profile.phoneno;
                userDetails.referCode = profile.referCode;
                userDetails.referCommission = profile.referCommission;
                userDetails.referPromoter = profile.referPromoter;
                userDetails.referUser = profile.referUser;
                userDetails.registerBonusStatus = profile.registerBonusStatus;
                userDetails.referPercentage = profile.referPercentage;
                userDetails.referUsers = profile.referUsers;
                userDetails.userType = profile.userType;
                userDetails.level = profile.level;
                userDetails.testUser = profile.testUser;
                userDetails.status = profile.status;
                userDetails.dateTime = profile.dateTime;
                const {
                    query = {}
                } = req;

                let findRefer = {};
                let findRefer2 = {};
                if(query.userType == "user") {
                    findRefer = { referUser: req.userId };
                    findRefer2 = { "refUser.referUser": {"$ne": ""} };
                }
                else if(query.userType == "promoter") {
                    findRefer = { referPromoter: req.userId };
                    findRefer2 = { "refUser.referPromoter": {"$ne": ""} };
                }

                const referUsers = await query_helper.findData(Users, findRefer, {}, { _id: -1 }, 0);

                const commissionHistory = await ReferralDB.aggregate([
                    {
                        $match: {
                            userId: mongoose.Types.ObjectId(req.userId),
                            // refType: query.userType
                        }
                    },
                    {
                        $lookup: {
                            from: 'Users',
                            let: {
                                refUser: '$refUser',
                            },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                {
                                                    "$eq":["$_id", "$$refUser"]
                                                }
                                            ]
                                        }
                                    }
                                },
                                {
                                    $project: {
                                        email: 1,
                                        phoneno: 1,
                                        referUser: 1,
                                        referPromoter: 1,
                                        referUser: 1,
                                        referPromoter: 1
                                    }
                                }
                            ],
                            as: 'refUser'
                        }
                    },
                    {"$unwind":"$refUser"},
                    {
                        $lookup: {
                            from: 'Currency',
                            let: {
                                currencyName: '$currencyName',
                            },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                {
                                                    "$eq":["$currencySymbol", "$$currencyName"]
                                                },
                                            ]
                                        }
                                    }
                                },
                                {
                                    $project: {
                                        currencySymbol: 1,
                                        siteDecimal: 1
                                    }
                                }
                            ],
                            as: 'Currency'
                        }
                    },
                    {"$unwind":"$Currency"},
                    {
                        $match: findRefer2
                    },
                    {
                        $sort: {
                            _id: -1
                        }
                    }
                ]);


                const commissionEarned = await ReferralDB.aggregate(
                    [
                        {
                            $match: {
                                userId: mongoose.Types.ObjectId(req.userId)
                            }
                        },
                        {
                            $group:
                            {
                                _id: null,
                                totalAmount: { $sum: "$convertedAmount" }
                            }
                        }
                    ]
                );
                let commissionUSD = 0, commissionINR = 0;
                if (commissionEarned.length > 0) {
                    commissionUSD = commissionEarned[0].totalAmount;
                }
                const currencyData = await query_helper.findoneData(CurrencyDb, { currencySymbol: 'INR' }, {})
                if (currencyData.status) {
                    commissionINR = commissionUSD * (1 / currencyData.msg.USDvalue);
                }
                let referPercentage = 0;
                const resData = await query_helper.findoneData(SiteSettings, {}, {})
                if (resData.status) {
                    referPercentage = resData.msg.referralCommission;
                }
                res.json({ "status": profile.status, "data": { profile: userDetails, referPercentage: referPercentage, siteName: resData.msg.siteName, stakingreferralBonus: resData.msg.stakingreferralBonus, referUsers: referUsers.status ? referUsers.msg : [], commissionHistory: commissionHistory, commissionUSD: commissionUSD, commissionINR: commissionINR, inrPrice: currencyData.status ? (1 / currencyData.msg.USDvalue) : 0 } });
            } else {
                res.json({ "status": false, "message": "Not a valid user" });
            }
        } catch (e) {
            console.log('getReferralData', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async updateMyProfile(req, res) {
        try {
            const orderwith = oArray.indexOf(req.userId.toString());
            if (orderwith == -1) {
                oArray.push(req.userId.toString())
                setTimeout(_intervalFunc, 5000, req.userId.toString());
                let profile = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.userId) }, {});
                if (profile.status) {
                    let updateObj = {};
                    const currDate = new Date();
                    if (typeof req.body.username == 'string') {
                        updateObj.username = req.body.username;
                    }
                    if (typeof req.body.address == 'string') {
                        updateObj.address = req.body.address;
                    }
                    if (typeof req.body.zipcode == 'string') {
                        updateObj.zipcode = req.body.zipcode;
                    }
                    if (typeof req.body.phoneno == 'string') {
                        updateObj.phoneno = req.body.phoneno;
                    }
                    let countryChanged = 0;
                    if(profile.msg.kycstatus == 3 || profile.msg.kycstatus == 2) {
                        if (typeof req.body.country == 'string') {
                            updateObj.country = req.body.country;
                        }
                        if (typeof req.body.state == 'string') {
                            updateObj.state = req.body.state;
                        }
                        if (typeof req.body.city == 'string') {
                            updateObj.city = req.body.city;
                        }
                    } else {
                        if (typeof req.body.country == 'string' && req.body.country != profile.msg.country) {
                            countryChanged = 1;
                        }
                        if (typeof req.body.state == 'string' && req.body.state != profile.msg.state) {
                            countryChanged = 1;
                        }
                        if (typeof req.body.city == 'string' && req.body.city != profile.msg.city) {
                            countryChanged = 1;
                        }
                    }
                    if (typeof req.body.profileimage == 'string') {
                        updateObj.profileimage = req.body.profileimage;
                    }
                    
                    updateObj.updatedOn = currDate;
                    if(countryChanged == 0) {
                        const updateStatus = await query_helper.updateData(Users, 'one', { _id: mongoose.Types.ObjectId(req.userId) }, updateObj);
                        if (updateStatus.status) {
                            res.json({ status: true, message: "Profile Updated Successfully!" })
                        } else {
                            res.json({ status: false, message: "Oops! Something went wrong. Please try again" })
                        }
                    } else {
                        res.json({ status: false, message: "Unable to change Country/State/City After KYC Completion" })
                    }
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }
            } else {
                setTimeout(_intervalFunc, 5000, req.userId.toString());
                res.json({ status: false, message: "Please wait for 5 seconds before placing another request!" });
            }
        } catch (e) {
            console.log('updateMyProfile', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async updateMyBank(req, res) {
        try {
            const {
                body: reqBody = {}
            } = req;
            const orderwith = oArray.indexOf(req.userId.toString());
            if (orderwith == -1) {
                oArray.push(req.userId.toString())
                setTimeout(_intervalFunc, 5000, req.userId.toString());
                let profile = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.userId) }, {});
                if (profile.status) {
                    let bankdetails = typeof profile.msg.bankdetails == 'object' ? profile.msg.bankdetails : {};
                    const bankLength = Object.keys(bankdetails).length;

                    if (typeof req.body.bankdetails == 'object') {
                    }
                    else {
                        return res.json({ "status": false, "message": "Please enter correct bank details!" });
                    }

                    const {
                        era_domain = "",
                        token: kycToken = "",
                        bankApi = "",
                        panLite = "",
                    } = config.kyc;

                    const bank_Name = reqBody.bankdetails["Bank Name"];
                    const accNum = reqBody.bankdetails["Account Number"];
                    const ifscCode = reqBody.bankdetails["IFSC Code"]
                    const accType = reqBody.bankdetails["Account Type"]
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
            
                            let bankstatus = 0;

                            if(username == bankName) {
                                bankstatus = 1;
                            }

                            let paymentData = {};
                            let payment = await query_helper.findoneData(P2PAllPayments, { name: "Bank" }, {})
                            if (payment.status) {
                                paymentData = payment.msg;
                            }
                            let updateData = {};
                            updateData = {
                                userId: req.userId,
                                methods: {
                                    userId: req.userId,
                                    paymenttype: paymentData.name,
                                    bankName: bank_Name,
                                    holderName: response.data.data.full_name,
                                    accountNo: accNum,
                                    ifscCode: ifscCode,
                                    accountType: accType,
                                    status: bankstatus,
                                    paymentmethodId: paymentData._id,
                                    type:"user",
                                    createdDate: new Date()
                                }
                            }
                            let paymentStatus = await query_helper.findoneData(P2PPayment, { userId: mongoose.Types.ObjectId(req.userId) }, {})
                            if (paymentStatus.status) {
                                paymentStatus = paymentStatus.msg;
                                if (paymentStatus && paymentStatus.methods && paymentStatus.methods.length > 0) {  
                                    const alreadyExits = paymentStatus.methods.filter(elem => elem.accountNo == accNum && elem.status == 1);
                                    if (alreadyExits && alreadyExits.length > 0 ){
                                       return res.json({ status: false, message: "This bank details are already exits", data: alreadyExits });
                                    }
                                    const userRejectedPayment = paymentStatus.methods.filter(elem => elem.status == 2);
                                    if (userRejectedPayment && userRejectedPayment.length == 3) {
                                       return res.json({ status: true, message: "You cant upload the Bank Details from User panel. To upload Document again, please Contact Support", data: userRejectedPayment });
                                    }
                                }
                                const updatedData = await P2PPayment.findOneAndUpdate({ userId: mongoose.Types.ObjectId(req.userId) }, { $addToSet: { methods: updateData.methods } }, { upsert: true, new: true });
                                if (updatedData) {
                                    await bankController.afterBankDetailUpd(req, res);
                                    return res.json({ status: true, message: "Document Uploaded Successfully...!", data: updatedData });
                                } else {
                                    return res.json({ status: false, message: "Payment Added Failed" })
                                }
                            } else {
                                let payment = await query_helper.insertData(P2PPayment, updateData);
                                if (payment) {
                                    await bankController.afterBankDetailUpd(req, res);
                                    return res.json({ status: true, message: "Document Uploaded Successfully...!", data: payment.msg });
                                } else {
                                    return res.json({ status: false, message: "Uploaded Failed", data:[] });
                                }
                            }
                        }
                        else {
                            return res.json({ "status": false, "message": "Verification failed, Please enter correct bank details." });; 
                        }
                    })
                    .catch(function (error) {
                        console.log("error updateMyBank : ", error);
                        if (error && error.response && error.response.data && error.response.data.success == false) {
                            if (error && error.response && error.response.data && error.response.data.message == 'Verification Failed.') {
                                res.json({ "status": false, "message":  "Verification Failed,Please check your bank details"});
                            } else {
                                res.json({ "status": false, "message":  error.response.data.message});
                            }
                        }
                    });
                } else {
                    res.json({ "status": false, "message": "Invalid user " });
                }
            } else {
                setTimeout(_intervalFunc, 5000, req.userId.toString());
                res.json({ status: false, message: "Please wait for 5 seconds before placing another request!" });
            }
        } catch (e) {
            console.log('updateMyBank', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time-error code :606" });
        }
    },
    async updateTFA(req, res) {
        try {
            const userResult = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.userId) }, {});
            if (userResult.status) {
                if (userResult.msg.tfaenablekey == '') {
                    if (typeof req.body.secret != undefined && typeof req.body.secret != 'undefined' && typeof req.body.code != undefined && typeof req.body.code != 'undefined') {
                        let token = speakeasy.totp.verify({
                            secret: req.body.secret,
                            encoding: 'base32',
                            token: req.body.code
                        });
                        if (token) {
                            const securityKey = Math.floor(Math.random() * 100000000);
                            const updateStatus = await query_helper.updateData(Users, 'one', { _id: mongoose.Types.ObjectId(req.userId) }, { tfaStatus: 1, tfaenablekey: req.body.secret, securityKey });
                            if (updateStatus.status) {
                                res.json({ status: true, message: "Two factor authentication enabled",type:1 })
                            } else {
                                res.json({ status: false, message: "Oops! Something went wrong. Please try again." })
                            }
                        } else {
                            res.json({ status: false, message: "Invalid 2FA Code" })
                        }
                    } else {
                        res.json({ status: false, message: "Invalid 2FA Code" })
                    }
                } else {
                    let tokendisable = speakeasy.totp.verify({
                        secret: userResult.msg.tfaenablekey,
                        encoding: 'base32',
                        token: req.body.code
                    });
                    if (tokendisable) {
                        // const securityKey = Math.floor(Math.random() * 100000000);
                        const updateStatus = await query_helper.updateData(Users, 'one', { _id: mongoose.Types.ObjectId(req.userId) }, { tfaStatus: 0, tfaenablekey: "" });
                        if (updateStatus.status) {
                            res.json({ status: true, message: "Two factor authentication disabled",type:0 })
                        } else {
                            res.json({ status: false, message: "Oops! Something went wrong. Please try again" })
                        }
                    } else {
                        res.json({ status: false, message: "Invalid 2FA Code" })
                    }
                }
            } else {
                res.json({ status: false, message: "Oops! Something went wrong. Please try again" })
            }
        } catch (e) {
            console.log('updateTFA', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
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