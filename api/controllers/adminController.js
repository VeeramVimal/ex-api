let common = require('../helpers/common');
const query_helper = require('../helpers/query');
const mongoose = require('mongoose');
let mail_helper = require('../helpers/mailHelper');
const emailTemplate = mongoose.model("EmailTemplate");
const Admin = mongoose.model("Admin");
const Users = mongoose.model("Users");
const adminactivity = mongoose.model("SubAdminActivityLog");
let config = require("../Config/config");
const siteSettings = mongoose.model("SiteSettings");
const stakeEnableList = mongoose.model("StakingEnabledUser");
const tradeHelper = require('../helpers/trade');
const adminBank = mongoose.model("AdminBank");
const Docs = mongoose.model("Docs");
const Transactions = mongoose.model("Transactions");
const cloudinary = require('../helpers/cloudinary');
const Currency = mongoose.model("Currency");
const ManualBalance = mongoose.model("ManualBalance");
const Notification = mongoose.model("Notification");
const fs = require('fs');
const path = require('path');
var request = require('request');

const adminController = {
    async setSiteDeploy(req, res) {
        if (typeof req.query.type != 'undefined' && typeof req.query.type != undefined && (req.query.type == 0 || req.query.type == 1)) {
            common.setSiteDeploy(+req.query.type);
        }
        res.json({ "status": true, "message": "Deploy changes updated successfully!", value: common.getSiteDeploy() });
    },
    async getLogs(req, res) {
        var file = path.join(__dirname, '../pm2logs/out.log');
        fs.readFile(file, "utf8", function (err, data) {
            res.send(data);
        });
    },
    async deleteLogs(req, res) {
        var file = path.join(__dirname, '../pm2logs/out.log');
        fs.writeFile(file, '', (err) => {
            res.send('data');
        });
    },
    async getErrLogs(req, res) {
        var file = path.join(__dirname, '../pm2logs/err.log');
        fs.readFile(file, "utf8", function (err, data) {
            res.send(data);
        });
    },
    async deleteErrLogs(req, res) {
        var file = path.join(__dirname, '../pm2logs/err.log');
        fs.writeFile(file, '', (err) => {
            res.send('data');
        });
    },
    async login(req, res) {
        try {
            let getdet = req.body;
            if (typeof getdet.otp == 'undefined' || typeof getdet.otp == undefined) {
                getdet.otp = 0;
            }
            getdet.email = (getdet.email).toLowerCase();
            let checkencrypt = common.encrypt(getdet.password);
            let UserRes = await query_helper.findoneData(Admin, { email: getdet.email, password: checkencrypt }, {})
            if (UserRes.status) {
                UserRes = UserRes.msg;
                if ((getdet.otp != 0 && UserRes.otp == getdet.otp)) {
                    let now = new Date();
                    now.setMinutes(now.getMinutes() - UserRes.otptiming);
                    const currenttime = now;
                    if (UserRes.OTPTime <= currenttime) {
                        return res.json({ status: false, message: "Your OTP is expired" })
                    }
                    await query_helper.updateData(Admin, "one", { _id: UserRes._id }, { otp: 0 })
                    let origin = common.createPayloadAdmin(UserRes._id);
                    delete UserRes._id;
                    res.json({ "status": true, "message": "Login successfully", type: 1, "token": origin, adminDetails: UserRes });
                    await common.adminactivtylog(req, 'Login', UserRes._id, getdet.email, 'Login', 'Login Into Admin Panel');
                } else {
                    if (getdet.otp != 0) {
                        res.json({ "status": false, "message": "Invalid OTP" });
                    } else {
                        let genotp = await common.getOTPCode({ from: "admin" });
                        await query_helper.updateData(Admin, "one", { _id: UserRes._id }, { otp: genotp, OTPTime: new Date() })
                        let email_data = await query_helper.findoneData(emailTemplate, { hint: "admin-otp" }, {})
                        if (email_data) {
                            email_data = email_data.msg;
                            let etempdataDynamic = email_data.content.replace(/###OTP###/g, genotp).replace(/###NAME###/g, UserRes.name);
                            mail_helper.sendMail({ subject: email_data.subject, to: getdet.email, html: etempdataDynamic }, function (res1) {
                                res.json({ "status": true, "message": "Login details verified successfully! Please enter OTP to continue." });
                            });
                        } else {
                            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                        }
                    }
                }
            } else {
                res.json({ "status": false, "message": "Invalid Login Credentials" });
            }
        } catch (e) {
            console.log('login', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async forgotPassword(req, res) {
        try {
            let getdet = req.body;
            getdet.email = (getdet.email).toLowerCase();
            let UserRes = await query_helper.findoneData(Admin, { email: getdet.email }, {})
            if (UserRes.status) {
                UserRes = UserRes.msg
                let forgotId = Math.floor(100000000000 + Math.random() * 900000000000);
                let otpup_data = await query_helper.updateData(Admin, "one", { _id: UserRes._id }, { forgotId: forgotId, forgotDate: new Date() })
                if (otpup_data.status) {
                    let email_data = await query_helper.findoneData(emailTemplate, { hint: "admin-forgot-password" }, {})
                    if (email_data.status) {
                        email_data = email_data.msg;
                        let etempdataDynamic = email_data.content.replace(/###LINK###/g, config.adminEnd + 'set-password/' + forgotId).replace(/###NAME###/g, UserRes.name);
                        mail_helper.sendMail({ subject: email_data.subject, to: getdet.email, html: etempdataDynamic }, function (res1) {
                            res.json({ "status": true, "message": "Password Reset Email Sent Successfully!" });
                        });
                    } else {
                        res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                    }
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }
            } else {
                res.json({ "status": false, "message": "Your email does not exists" });
            }
        } catch (e) {
            console.log('forgotPassword', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async forgotPasswordCheck(req, res) {
        try {
            let resetPasswordCode = req.body.resetPasswordCode;
            let resData = await query_helper.findoneData(siteSettings, {}, {})
            if (resData.status) {
                resData = resData.msg;
                let now = new Date();
                now.setMinutes(now.getMinutes() - resData.linkExpireTiming);
                const currenttime = now;
                let UserRes = await query_helper.findoneData(Admin, { forgotId: resetPasswordCode, forgotDate: { $gte: currenttime } }, {})
                if (UserRes.status) {
                    UserRes = UserRes.msg
                    res.json({ "status": true, "message": "Valid reset password URL!" });
                } else {
                    res.json({ "status": false, "message": "Not a valid reset password URL" });
                }
            } else {
                res.json({ status: false, message: "Oops! Something went wrong. Please try again" })
            }
        } catch (e) {
            console.log('forgotPasswordCheck', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async changePassword(req, res) {
        try {
            if (req.body.newPassword != req.body.oldPassword) {
                let checkencrypt = common.encrypt(req.body.oldPassword);
                let UserRes = await query_helper.findoneData(Admin, { _id: mongoose.Types.ObjectId(req.userId), password: checkencrypt }, {})
                if (UserRes.status) {
                    UserRes = UserRes.msg;
                    let checkencryptnew = common.encrypt(req.body.newPassword);
                    let otpup_data = await query_helper.updateData(Admin, "one", { _id: UserRes._id }, { forgotId: 0, password: checkencryptnew })
                    if (otpup_data) {
                        let email_data = await query_helper.findoneData(emailTemplate, { hint: "admin-change-password" }, {})
                        if (email_data.status) {
                            email_data = email_data.msg;
                            let etempdataDynamic = email_data.content.replace(/###NAME###/g, UserRes.name);
                            mail_helper.sendMail({ subject: email_data.subject, to: UserRes.email, html: etempdataDynamic }, function (res1) {
                                common.adminactivtylog(req, 'Login', req.userId, 'NA', 'Password', 'Password Changed');
                                res.json({ "status": true, "message": "Password changed successfully!" });
                            });
                        } else {
                            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                        }
                    } else {
                        res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                    }
                } else {
                    res.json({ "status": false, "message": "Invalid old password" });
                }
            } else {
                res.json({ "status": false, "message": "Old Password and new password not a identical" });
            }
        } catch (e) {
            console.log('changePassword', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async resetPassword(req, res) {
        try {
            let resetPasswordCode = req.body.resetPasswordCode;
            let newPassword = req.body.newPassword;
            let UserRes = await query_helper.findoneData(Admin, { forgotId: resetPasswordCode }, {})
            if (UserRes.status) {
                UserRes = UserRes.msg;
                let checkencrypt = common.encrypt(newPassword);
                let otpup_data = await query_helper.updateData(Admin, "one", { _id: UserRes._id }, { forgotId: 0, password: checkencrypt })
                if (otpup_data) {
                    await common.adminactivtylog(req, 'Admin Password Reset', UserRes._id, mongoose.Types.ObjectId(UserRes._id), 'Admin Password', 'password reset successfully');
                    let email_data = await query_helper.findoneData(emailTemplate, { hint: "admin-reset-password" }, {})
                    if (email_data.status) {
                        email_data = email_data.msg;
                        let etempdataDynamic = email_data.content.replace(/###NAME###/g, UserRes.name);
                        mail_helper.sendMail({ subject: email_data.subject, to: UserRes.email, html: etempdataDynamic }, function (res1) {
                            res.json({ "status": true, "message": "Your password reset successfully!" });
                        });
                    } else {
                        res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                    }
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }
            } else {
                res.json({ "status": false, "message": "Not a valid reset password URL" });
            }
        } catch (e) {
            console.log('resetPassword', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getSiteSettings(req, res) {
        try {
            let settings = await query_helper.findoneData(siteSettings, {}, {})
            res.json({ "status": settings.status, "message": settings.msg });
        } catch (e) {
            console.log('getSiteSettings', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async UpdateSiteSettings(req, res) {
        try {
            let data = req.body;
            await query_helper.updateData(siteSettings, "one", {}, data);
            await common.setUsdtRateChange();
            let settings = await query_helper.findoneData(siteSettings, {}, {})
            tradeHelper.settingsUpdate(settings.msg);
            res.json({ "status": true, "message": "Site settings updated successfully", "data": settings.msg });
            await common.adminactivtylog(req, 'sitesetting', req.userId, 'NA', 'websitesetting', 'SettingUpdated');
        } catch (e) {
            console.log('UpdateSiteSettings', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getBankDetails(req, res) {
        try {
            let bankDetails = await query_helper.findoneData(adminBank, {}, {})
            res.json({ "status": bankDetails.status, "message": bankDetails.msg });
        } catch (e) {
            console.log('getBankDetails', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async updateBankDetails(req, res) {
        try {
            let data = req.body;
            await query_helper.updateData(adminBank, "one", {}, data)
            let bankDetails = await query_helper.findoneData(adminBank, {}, {})
            res.json({ "status": true, "message": "Admin Bank Details Updated successfully", "data": bankDetails.msg });
            await common.adminactivtylog(req, 'AdminBankDetails', req.userId, 'NA', 'AdminBankDetails', 'Bank Details Updated');
        } catch (e) {
            console.log('updateBankDetails', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getDocs(req, res) {
        try {
            let docs = await query_helper.findData(Docs, {}, {}, { _id: -1 }, 0)
            res.json({ "status": docs.status, "getDocsTblDetails": docs.msg });
        } catch (e) {
            console.log('getDocs', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getDocsById(req, res) {
        try {
            let docs = await query_helper.findoneData(Docs, { _id: mongoose.Types.ObjectId(req.body._id) }, {})
            if (docs.status) {
                res.json({ "status": true, "getDocsTblDetails": docs.msg });
            } else {
                res.json({ "status": false, "message": 'Not a valid blog!' });
            }
        } catch (e) {
            console.log('getDocsById', e);
            res.json({ "status": false, "message": "Not a valid blog!" });
        }
    },
    async addDocs(req, res) {
        let data = req.body;
        let docs = await query_helper.insertData(Docs, data)
        await common.adminactivtylog(req, 'BlogAdd', req.userId, 'NA', 'blogAdd', 'blog Details Added');
        res.json({ "status": docs.status, "message": "Blog added successfully" });
    },
    async updateDocs(req, res) {
        let data = req.body;
        let docs = await query_helper.updateData(Docs, "one", { _id: mongoose.Types.ObjectId(data._id) }, data)
        await common.adminactivtylog(req, 'blogupdate', req.userId, 'NA', 'blogupdate', 'blog Details Updated');
        res.json({ "status": docs.status, "message": "Blog updated successfully" });
    },
    async deleteDocs(req, res) {
        let data = req.body;
        let docs = await query_helper.DeleteOne(Docs, { _id: mongoose.Types.ObjectId(data._id) })
        await common.adminactivtylog(req, 'Blog', req.userId, 'NA', 'Blog', 'blog Details Delete');
        res.json({ "status": docs.status, "message": "Blog deleted successfully" });
    },
    async getDashboardCount(req, res) {
        try {
            let kycPendingUsers = await Users.countDocuments({ kycstatus: 0 });
            let bankPendingUsers = await Users.countDocuments({ bankstatus: 0 });
            let depositPendingUsers = await Transactions.countDocuments({ type: 'Deposit', status: 0 });
            let withdrawPendingUsers = await Transactions.countDocuments({ type: 'Withdraw', status: { $in: [0, 3] } });
            let bnbc = await Transactions.countDocuments({ moveCur: 'BNB', adminMove: { $ne: '5' } });
            let bnbt = await Transactions.countDocuments({ moveCur: 'BNB-TOKEN', adminMove: { $ne: '5' } });
            let trxc = await Transactions.countDocuments({ moveCur: 'TRX', adminMove: '' });
            let trxt = await Transactions.countDocuments({ moveCur: 'TRX-TOKEN', adminMove: { $in: ['', '3'] } });
            let ethc = await Transactions.countDocuments({ moveCur: 'ETH', adminMove: { $ne: '5' } });
            let etht = await Transactions.countDocuments({ moveCur: 'ETH-TOKEN', adminMove: { $ne: '5' } });
            let adminMoveCount = {
                "BnbCoin": bnbc,
                "BnbToken": bnbt,
                "TrxCoin": trxc,
                "TrxToken": trxt,
                "EthCoin": ethc,
                "EthToken": etht
            };
            res.json({
                "status": true,
                data: {
                    "kycPendingUsers": kycPendingUsers,
                    "bankPendingUsers": bankPendingUsers,
                    "depositPendingUsers": depositPendingUsers,
                    "withdrawPendingUsers": withdrawPendingUsers,
                    "adminMoveDashCount": adminMoveCount
                }
            });
        } catch (e) {
            console.log('getDashboardCount', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async updateImages(req, res) {
        const uploader = async (path) => await cloudinary.uploads(path, 'Images');
        const urls = [];
        const files = req.files;
        for (const file of files) {
            const { path, originalname } = file;
            let fileName = originalname.split('.')[0];
            const newPath = await uploader(path);
            urls.push({ name: fileName, location: newPath.url })
        }
        if (urls.length > 0 || req.query.type == 'kyc' || req.query.type == 'kycPassPort') {
            if (req.query.type == 'settings') {
                let updateObj = {};
                let settings = await query_helper.findoneData(siteSettings, {}, {});
                settings = settings.msg;
                let socialIcons = settings.socialIcons;
                for (const files of urls) {
                    let name = files.name;
                    if (name == 'favIcon' || name == 'siteLogo') {
                        updateObj[name] = files.location;
                    } else {
                        socialIcons[name] = files.location;
                    }
                }
                updateObj.socialIcons = socialIcons;
                await query_helper.updateData(siteSettings, "one", {}, updateObj);
                res.json({ status: true, message: "Files uploaded successfully" });
            } else if (req.query.type == 'kyc') {
                const getUserId = common.tokenImageCustomers(req);
                let updateObj = {};
                // pan_number
                // aadhaar_number
                // firstname
                // lastname
                let usersData = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(getUserId) }, {});
                let usersExistingData = await query_helper.findoneData(Users, {
                    _id: { "$ne": mongoose.Types.ObjectId(getUserId) },
                    "$or": [
                        {
                            pan_number: req.query.pan_number
                        },
                        {
                            aadhaar_number: req.query.aadhaar_number
                        }
                    ]
                }, {});
                if (usersData.status) {
                    let checkExist = true;
                    if (usersExistingData.status) {
                        if (usersExistingData.msg._id.toString() != usersData.msg._id.toString()) {
                            checkExist = false;
                        }
                    }
                    if (checkExist) {
                        let kyc = typeof usersData.msg.kyc == 'object' ? usersData.msg.kyc : {};
                        for (const files of urls) {
                            let name = files.name;
                            kyc[name] = { type: 'image', value: files.location };
                        }
                        // kyc['Pan Card'] = { type: 'string', value: req.query.pan_number };

                        updateObj = {
                            "kycOffline.aadhaar_number": req.query.aadhaar_number ? req.query.aadhaar_number.trim().toLowerCase() : "",
                            "kycOffline.pan_number": req.query.pan_number ? req.query.pan_number.trim().toLowerCase() : "",
                            "kycOffline.firstname": req.query.firstname ? req.query.firstname.trim() : "",
                            "kycOffline.lastname": req.query.lastname ? req.query.lastname.trim() : "",
                            "kycOffline.address": req.query.address ? req.query.address.trim() : "",
                            kyc: kyc,
                            kycMode: "Offline",
                            kycstatus: 0,
                            updatedOn: new Date()
                        };

                        if (usersData.msg.email) {
                            let email_data = await query_helper.findoneData(emailTemplate, { hint: "kyc-submission" }, {})
                            email_data = email_data.msg;
                            let etempdataDynamic = email_data.content.replace(/###NAME###/g, usersData.msg.username);
                            mail_helper.sendMail({ subject: email_data.subject, to: usersData.msg.email, html: etempdataDynamic }, function (res1) {
                            });
                        }
                        await query_helper.updateData(Users, "one", { _id: mongoose.Types.ObjectId(getUserId) }, updateObj);
                        res.json({ status: true, message: "KYC Files Uploaded Successfully!" });
                    } else {
                        res.json({ status: false, message: "Provided Pan card already exists!" });
                    }
                } else {
                    res.json({ status: true, message: "ID number has already been registered" });
                    // res.json({ status: true, message: "Something went wrong! Please try again someother time" });
                }
            } else {
                res.json({ status: true, message: urls });
            }
        } else {
            res.json({ status: true, message: "No files uploaded" });
        }
    },
    async addStakingEnabled(req, res) {
        try {
            let stakEnaleEmail = req.body;
            if (stakEnaleEmail.userEmail != "") {
                let profile = await query_helper.findoneData(Users, { email: stakEnaleEmail.userEmail }, {});
                if (profile.status) {
                    let isUserExit = await query_helper.findoneData(stakeEnableList, { userId: mongoose.Types.ObjectId(profile.msg._id) }, {});
                    if (!isUserExit.status) {
                        let insertStake = await query_helper.insertData(stakeEnableList, { userId: mongoose.Types.ObjectId(profile.msg._id) });
                        if (insertStake) {
                            await common.adminactivtylog(req, 'User Stake Enabled', req.userId, profile.msg._id, 'Stake Transfer', 'Stake Transfer User Added');
                            res.json({ "status": true, "message": 'Email Added Sucessfully' });
                        } else {
                            res.json({ "status": false, "message": 'Email not a Added' });
                        }
                    } else {
                        res.json({ "status": false, "message": 'Email Already Added' });
                    }
                } else {
                    res.json({ "status": false, "message": "Invalid User Email." });
                }

            } else {
                res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
            }
        } catch (e) {
            console.log('addStakingEnabled', e);
            res.json({ "status": false, "message": "Oops !Something went wrong! Please try again someother time" });
        }
    },
    async getStakeEnableUser(req, res) {
        try {
            let limit = req.body.limit;
            let offset = req.body.offset;
            let stakeUser = await stakeEnableList.find().sort({ _id: -1 }).populate("userId", "email").limit(limit).skip(offset);
            let stakeCount = await stakeEnableList.find().populate("userId", "email").countDocuments();
            res.json({ "status": true, "getDocsTblDetails": stakeUser, "total": stakeCount });
        } catch (e) {
            console.log('getStakeEnableUser', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async deleteEnabledUser(req, res) {
        try {
            let data = req.body;
            let isUserExit = await query_helper.findoneData(stakeEnableList, { _id: mongoose.Types.ObjectId(data._id) }, {});
            let deleteUserId = isUserExit.msg.userId;
            await common.adminactivtylog(req, 'User Stake Transfer', req.userId, deleteUserId, 'Stake Transfer ', 'Stake Transfer User Deleted');
            let docs = await query_helper.DeleteOne(stakeEnableList, { _id: mongoose.Types.ObjectId(data._id) });
            res.json({ "status": docs.status, "message": "User deleted successfully" });
        } catch (e) {
            console.log('deleteEnabledUser', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getUserBalanceSetView(req, res) {
        try {
            let matchQ = {};
            let getdata = req.body.formvalue;
            if (getdata.type != '') {
                matchQ.walletType = getdata.type;
            }
            if (getdata.searchQuery != '') {
                var size = Object.keys(matchQ).length;
                let query = { '$and': [{ '$or': [{ "name": { $regex: getdata.searchQuery } }, { "email": { $regex: getdata.searchQuery } }] }] };
                let getUser = await query_helper.findData(Users, query, { _id: 1 }, {});
                let userId = [];
                if (getUser) {
                    if (getUser.status && getUser.msg.length > 0) {
                        getUser.msg.forEach(function (item) {
                            userId.push(item._id);
                        });
                    }
                    if (userId.length > 0) {
                        matchQ.userId = { $in: userId };
                    } else {
                        matchQ.userId = '';
                    }
                }
            }
            if (getdata.fromdate != '' && getdata.todate != '') {
                var fromDate = new Date(getdata.fromdate);
                var toDate = new Date(getdata.todate);
                var dateFilter = new Date(fromDate.setTime(fromDate.getTime() + 5.5 * 60 * 60 * 1000));
                var nextDateFilter = new Date(toDate.setTime(toDate.getTime() + 29.49 * 60 * 60 * 1000));
                matchQ.dateTime = {
                    "$gte": dateFilter,
                    "$lt": nextDateFilter
                }
            }
            let limit = req.body.limit ? parseInt(req.body.limit) : 10;
            let offset = req.body.offset ? parseInt(req.body.offset) : 0;
            let transactions = await ManualBalance.find(matchQ).sort({ _id: -1 }).populate({ path: "userId", select: "username email" }).populate({ "path": "currencyId", select: "currencySymbol" }).populate({ path: "adminId", select: "email name" }).limit(limit).skip(offset);
            let countval = await ManualBalance.find(matchQ).sort({ _id: -1 }).populate({ path: "userId", select: "username email" }).populate({ "path": "currencyId", select: "currencySymbol " }).populate({ path: "adminId", select: "email name" }).countDocuments();
            res.json({ "status": true, "total": countval, "BalanceSetTblDetails": transactions });
        } catch (e) {
            console.log('getUserBalanceSetView', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }

    },
    async updateUserBalanceManualy(req, res) {
        try {
            let reqBody = req.body;
            let profile = await query_helper.findoneData(Users, { email: reqBody.userEmail }, {});
            if (profile.status) {
                let user_id = profile.msg._id;
                let currency = await query_helper.findoneData(Currency, { _id: mongoose.Types.ObjectId(reqBody.currencyId) }, {});
                let currSymbol = currency.msg.currencySymbol;
                if (currency.status) {
                    if (reqBody.walletType == 'mainWallet' && reqBody.currencyId != undefined && reqBody.currencyId != '') {
                        let curr_id = currency.msg.currencyId;
                        const userWallet = await common.getbalance(user_id, curr_id);
                        if (userWallet) {
                            let getOldAmount = userWallet.amount;
                            let finbal = getOldAmount + (+reqBody.userAmount);
                            let UpdateBalance = await common.updateUserBalance(user_id, curr_id, finbal, curr_id, reqBody.walletType, reqBody.userDecription);
                            const updations = {
                                walletType: reqBody.walletType == 'mainWallet' ? "Main Wallet" : "Staking Wallet",
                                userId: mongoose.mongo.ObjectId(user_id),
                                adminId: mongoose.mongo.ObjectId(req.userId),
                                currencyId: mongoose.mongo.ObjectId(curr_id),
                                amount: reqBody.userAmount,
                                oldBalance: getOldAmount,
                                newBalance: finbal,
                                lastId: curr_id,
                                reason: reqBody.userDecription
                            }
                            await query_helper.insertData(ManualBalance, updations);
                            await common.adminactivtylog(req, 'Balance Update', req.userId, user_id, 'User Balance Update Curr:' + curr_id, 'User Balance Updated');
                            if (UpdateBalance) {
                                res.json({ "status": true, "message": "Wallet Balance Updated Successfully!" });
                            } else {
                                res.json({ "status": false, "message": "Issue in update Balance!" });
                            }
                        } else {
                            res.json({ "status": false, "message": "Invalid User Wallet" });
                        }
                    } else if (reqBody.walletType == 'p2pWallet' && reqBody.currencyId != undefined && reqBody.currencyId != '') {
                        let curr_id = currency.msg.currencyId;
                        const userWallet = await common.getbalance(user_id, curr_id);
                        if (userWallet) {
                            let getOldAmount = userWallet.p2pAmount;
                            let finbal = getOldAmount + (+reqBody.userAmount);
                            let UpdateBalance = await common.updateUserBalance(user_id, curr_id, finbal, curr_id, reqBody.walletType, reqBody.userDecription);
                            const updations = {
                                walletType: reqBody.walletType == 'p2pWallet' ? "P2P Wallet" : "Main Wallet",
                                userId: mongoose.mongo.ObjectId(user_id),
                                adminId: mongoose.mongo.ObjectId(req.userId),
                                currencyId: mongoose.mongo.ObjectId(curr_id),
                                amount: reqBody.userAmount,
                                oldBalance: getOldAmount,
                                newBalance: finbal,
                                lastId: curr_id,
                                reason: reqBody.userDecription
                            }
                            await query_helper.insertData(ManualBalance, updations);
                            await common.adminactivtylog(req, 'Balance Update', req.userId, user_id, 'User Balance Update Curr:' + curr_id, 'User Balance Updated');
                            if (UpdateBalance) {
                                res.json({ "status": true, "message": "Wallet Balance Updated Successfully!" });
                            } else {
                                res.json({ "status": false, "message": "Issue in update Balance!" });
                            }
                        } else {
                            res.json({ "status": false, "message": "Invalid User Wallet" });
                        }
                    } else if (reqBody.walletType == 'usdmWallet' && reqBody.currencyId != undefined && reqBody.currencyId != '') {
                        let curr_id = currency.msg.currencyId;
                        const userWallet = await common.getbalance(user_id, curr_id);
                        if (userWallet) {
                            let getOldAmount = userWallet.perpetualAmount;
                            let finbal = getOldAmount + (+reqBody.userAmount);
                            let UpdateBalance = await common.updateUserBalance(user_id, curr_id, finbal, curr_id, reqBody.walletType, reqBody.userDecription);
                            const updations = {
                                walletType: reqBody.walletType == 'usdmWallet' ? "USD-M Wallet" : "Main Wallet",
                                userId: mongoose.mongo.ObjectId(user_id),
                                adminId: mongoose.mongo.ObjectId(req.userId),
                                currencyId: mongoose.mongo.ObjectId(curr_id),
                                amount: reqBody.userAmount,
                                oldBalance: getOldAmount,
                                newBalance: finbal,
                                lastId: curr_id,
                                reason: reqBody.userDecription
                            }
                            await query_helper.insertData(ManualBalance, updations);
                            await common.adminactivtylog(req, 'Balance Update', req.userId, user_id, 'User Balance Update Curr:' + curr_id, 'User Balance Updated');
                            if (UpdateBalance) {
                                res.json({ "status": true, "message": "Wallet Balance Updated Successfully!" });
                            } else {
                                res.json({ "status": false, "message": "Issue in update Balance!" });
                            }
                        } else {
                            res.json({ "status": false, "message": "Invalid User Wallet" });
                        }
                    } else {
                        res.json({ "status": false, "message": "Please select a Wallet Type" });
                    }
                } else {
                    res.json({ "status": false, "message": "Invalid Currency" });
                }
            } else {
                res.json({ "status": false, "message": "Not a Valid User" });
            }
        } catch (e) {
            console.log('updateUserBalanceManualy', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getMyProfile(req, res) {
        try {
            let profile = await query_helper.findoneData(Admin, { _id: mongoose.Types.ObjectId(req.userId) }, {})
            res.json({ "status": profile.status, "getProfileDetails": profile.msg });
        } catch (e) {
            console.log('getMyProfile', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    // async sendPushNotification(req, res) {
    //     let pushNotification = req.body;
    //     console.log(pushNotification, "pushNotification");
    //     // let notifiy = await query_helper.insertData(Notification, pushNotification);
    //     // res.json({ "status": notifiy.status, "message": "pushNotification added successfully" });
    //     await Notification.create({
    //         type: pushNotification.type,
    //         notificationType: 'admin',
    //         title: pushNotification.subject,
    //         message: pushNotification.content,
    //         link: pushNotification.url
    //     }).then((response) => {
    //         return res.send({ status: true, message: "push notification sent" });
    //     }).catch((err) => {
    //         console.log(err);
    //     })

    //     // if (pushNotification.type=="mobile") {
    //     //     await common.adminactivtylog(req, 'Push Notification', req.userId, mongoose.Types.ObjectId(req.userId), pushNotification.subject, pushNotification.content );
    //     //     res.json('{ "status": true, "message": "Push Notification Sent !", "pushApiData": "" }');
    //     // } else {
    //     //     res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
    //     // }
    //     // { type: 'mobile', content: 'new message', subject: 'new title' }

    // },
    async updateMyProfile(req, res) {
        let data = req.body;
        let profile = await query_helper.updateData(Admin, "one", { _id: mongoose.Types.ObjectId(req.userId) }, data)
        await common.adminactivtylog(req, 'Admin Profile', req.userId, mongoose.Types.ObjectId(req.userId), 'Admin Profile', 'Admin Profile Updated successfully');
        res.json({ "status": profile.status, "message": "My Profile updated successfully" });
    },

    async sendPushNotification(req, res) {
        try {
            let pushNotification = req.body;
            if (pushNotification.type == "mobile") {
                await common.adminactivtylog(req, 'Push Notification', req.userId, mongoose.Types.ObjectId(req.userId), 'Push Notification', 'Push Notification Sent successfully');
                res.json({ "status": true, "message": "Push Notification Sent !", "pushApiData": "" });
            } else {
                res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
            }
        } catch (e) {
            console.log('sendPushNotification', e);
            res.json({ "status": false, "message": "Oops !Something went wrong! Please try again someother time" });
        }
    },
    async sendNewsLetter(req, res) {
        try {
            let getdet = req.body;
            let where = {};
            switch (getdet.type) {
                case 'Active Users':
                    where.status = 1;
                    break;
                case 'De-Active Users':
                    where.status = 0;
                    break;
                case 'KYC Verified Users':
                    where.kycstatus = 1;
                    break;
                case 'KYC Not Verified Users':
                    where.kycstatus = 0;
                    break;
                case 'Bank Verified Users':
                    where.bankstatus = 1;
                    break;
                case 'Bank Not Verified Users':
                    where.bankstatus = 0;
                    break;
            }
            let userList = await query_helper.findData(Users, where, { email: 1 }, { _id: -1 }, 0);
            if (userList.status) {
                let toAddress = config.smtpDetails.email;
                let bccAddress = [];
                userList.msg.forEach(element => {
                    if (toAddress == '') {
                        toAddress = element.email;
                    } else {
                        bccAddress.push(element.email);
                    }
                });
                let email_data = await query_helper.findoneData(emailTemplate, { hint: "news-letter" }, {})
                if (email_data) {
                    email_data = email_data.msg;
                    let etempdataDynamic = email_data.content.replace(/###CONTENT###/g, getdet.content);
                    await common.adminactivtylog(req, 'newsletter', req.userId, toAddress, 'news letter', 'news letter sent');
                    mail_helper.sendMail({ subject: getdet.subject, to: toAddress, html: etempdataDynamic, bcc: bccAddress }, function (res1) {
                        res.json({ "status": true, "message": "NewsLetter send to " + getdet.type });
                    });
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }
            } else {
                res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
            }
        } catch (e) {
            console.log('sendNewsLetter', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getactivitylogadmin(req, res) {
        try {
            let matchQ = {};
            let getdata = req.body.formvalue;
            if (getdata.type != '') {
                var queryvalue = getdata.type
                matchQ.type = new RegExp(queryvalue, "i")
            }
            if (getdata.searchQuery != '') {
                var size = Object.keys(matchQ).length;
                let query = { '$and': [{ '$or': [{ "name": { $regex: getdata.searchQuery } }, { "email": { $regex: getdata.searchQuery } }] }] };
                let admin = await query_helper.findData(Admin, query, { _id: 1 }, {});
                let adminuserid = [];
                if (admin) {
                    if (admin.status && admin.msg.length > 0) {
                        admin.msg.forEach(function (item) {
                            adminuserid.push(item._id);
                        });
                    }
                    if (adminuserid.length > 0) {
                        matchQ.adminuserid = { $in: adminuserid };
                    } else {
                        matchQ.adminuserid = '';
                    }
                }
                // matchQ = query;
            }
            if (getdata.fromdate != '' && getdata.todate != '') {
                var fromDate = new Date(getdata.fromdate);
                var toDate = new Date(getdata.todate);
                var dateFilter = new Date(fromDate.setTime(fromDate.getTime() + 5.5 * 60 * 60 * 1000));
                var nextDateFilter = new Date(toDate.setTime(toDate.getTime() + 29.49 * 60 * 60 * 1000));
                matchQ.dateTime = {
                    "$gte": dateFilter,
                    "$lt": nextDateFilter
                }
            }
            let limit = req.body.limit ? parseInt(req.body.limit) : 10;
            let offset = req.body.offset ? parseInt(req.body.offset) : 0;
            let activitylog = await adminactivity.find(matchQ).sort({ _id: -1 }).populate({ path: "adminuserid", select: "email name" }).limit(limit).skip(offset)
            let countval = await adminactivity.find(matchQ).populate({ path: "adminuserid", select: "_id email" }).countDocuments()
            res.json({ "status": true, "total": countval, "getActivityLogTblDetails": activitylog });
        } catch (e) {
            console.log('getactivitylogadmin', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getCurrencyBalance(req, res) {
        try {
            if ((typeof req.body.currencyId == 'string' && req.body.currencyId != '') && mongoose.Types.ObjectId.isValid(req.body.currencyId)) {
                let walletOutput = await common.getbalance(mongoose.Types.ObjectId(req.userId), mongoose.Types.ObjectId(req.body.currencyId))
                res.json({ "status": true, "data": walletOutput });
            } else {
                res.json({ "status": true, "data": { amount: 0, hold: 0, stakingAmount: 0, stakingHold: 0 } });
            }
        } catch (e) {
            console.log('getCurrencyBalance', e);
            res.json({ "status": false });
        }
    },
};
module.exports = adminController;