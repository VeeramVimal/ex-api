let common = require('../../helpers/common');
const query_helper = require('../../helpers/query');
const mongoose = require('mongoose');
let mail_helper = require('../../helpers/mailHelper');
const emailTemplate = mongoose.model("EmailTemplate");
const Admin = mongoose.model("WalletAdmin");
let config = require("../../Config/config");
const Currency = mongoose.model("Currency");
const siteSettings = mongoose.model("SiteSettings");
const WalletWithdraw = mongoose.model("WalletWithdraw");
const AdminAddress = mongoose.model("AdminAddress");
const VerifyWalletWithdraw = mongoose.model("VerifyWalletWithdraw");
const ProfitDB = mongoose.model("Profit");
const ETHCOIN = require('../../helpers/CoinTransactions/ETH.js');
const TRXCOIN = require('../../helpers/CoinTransactions/TRX.js');
const BNBCOIN = require('../../helpers/CoinTransactions/BNB.js');
// const MATICCOIN = require('../../helpers/CoinTransactions/MATIC.js');
let async = require('async');
const adminControllerOld = {
    async getSiteSettings (req, res) {
        try {
            let settings = await query_helper.findoneData(siteSettings,{},{})
            res.json({ "status": settings.status, "message": settings.msg });
        } catch (e) {
            console.log('getSiteSettings',e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async login (req, res) {
        try {
            let getdet = req.body;
            if(typeof getdet.otp == 'undefined' || typeof getdet.otp == undefined) {
                getdet.otp = 0;
            }
            getdet.email = (getdet.email).toLowerCase();
            let checkencrypt = common.encrypt(getdet.password);            
            let UserRes = await query_helper.findoneData(Admin,{email: getdet.email, password: checkencrypt},{})
            if(UserRes.status){
                UserRes=UserRes.msg;
                if ((getdet.otp != 0 && UserRes.otp == getdet.otp)) {  
                    let now = new Date();
                    now.setMinutes(now.getMinutes() - UserRes.otptiming);
                    const currenttime = now;
                    if(UserRes.OTPTime<=currenttime) {
                        return res.json({status:false,message:"Your OTP is expired"})
                    }
                    await query_helper.updateData(Admin,"one",{_id:UserRes._id},{otp:0})
                    let origin = common.createPayloadAdmin(UserRes._id);
                    delete UserRes._id;
                    res.json({ "status": true, "message": "Login successfully", type: 1, "token": origin });
                } else {
                    if (getdet.otp != 0) {
                        res.json({ "status": false, "message": "Invalid OTP" });
                    } else {
                        let genotp = await common.getOTPCode({from:"admin"});
                        await  query_helper.updateData(Admin,"one",{_id:UserRes._id},{otp:genotp,OTPTime:new Date()})
                        let email_data =   await query_helper.findoneData(emailTemplate,{hint: "admin-otp"},{})
                        if(email_data) {
                            email_data=email_data.msg;
                            let etempdataDynamic = email_data.content.replace(/###OTP###/g, genotp).replace(/###NAME###/g, UserRes.name);
                            mail_helper.sendMail({subject:email_data.subject, to: getdet.email, html: etempdataDynamic }, function (res1) {
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
            console.log('login',e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async forgotPassword (req, res) {
        try {
            let getdet = req.body;
            getdet.email = (getdet.email).toLowerCase();
            let UserRes = await query_helper.findoneData(Admin,{email: getdet.email},{})
            if(UserRes.status) {
                UserRes=UserRes.msg
                let forgotId = Math.floor(100000000000 + Math.random() * 900000000000);
                let otpup_data = await query_helper.updateData(Admin,"one",{_id:UserRes._id},{forgotId:forgotId,forgotDate:new Date()})
                if(otpup_data.status) {
                    let email_data = await query_helper.findoneData(emailTemplate,{hint: "admin-forgot-password"},{})
                    if(email_data.status) {
                        email_data = email_data.msg;
                        let etempdataDynamic = email_data.content.replace(/###LINK###/g, config.adminWalletEnd+'set-password/'+forgotId).replace(/###NAME###/g, UserRes.name);
                        mail_helper.sendMail({subject:email_data.subject, to: getdet.email, html: etempdataDynamic }, function (res1) {
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
            console.log('forgotPassword',e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        } 
    },
    async forgotPasswordCheck (req, res) {
        try {
            let resetPasswordCode = req.body.resetPasswordCode;
            let resData = await query_helper.findoneData(siteSettings,{},{})
            if(resData.status) {
                resData=resData.msg;
                let now = new Date();
                now.setMinutes(now.getMinutes() - resData.linkExpireTiming);
                const currenttime = now;
                let UserRes = await query_helper.findoneData(Admin,{forgotId: resetPasswordCode,forgotDate:{ $gte: currenttime }},{})
                if(UserRes.status) {
                    UserRes=UserRes.msg
                    res.json({ "status": true, "message": "Valid reset password URL!" });
                } else {
                    res.json({ "status": false, "message": "Not a valid reset password URL" });
                }
            } else {
                res.json({status:false,message:"Oops! Something went wrong. Please try again"})
            }
        } catch (e) {
            console.log("forgotPasswordCheck",e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async changePassword (req, res) {
        try {
            if(req.body.newPassword == req.body.newPasswordAgain) {
                let checkencrypt = common.encrypt(req.body.oldPassword);
                let UserRes = await query_helper.findoneData(Admin,{_id: mongoose.Types.ObjectId(req.userId), password:checkencrypt},{})
                if(UserRes.status) {
                    UserRes=UserRes.msg;
                    let checkencryptnew = common.encrypt(req.body.newPassword);
                    let otpup_data = await query_helper.updateData(Admin,"one",{_id:UserRes._id},{forgotId:0,password:checkencryptnew})
                    if(otpup_data) {
                        let email_data =   await query_helper.findoneData(emailTemplate,{hint: "admin-change-password"},{})
                        if(email_data.status) {
                            email_data = email_data.msg;
                            let etempdataDynamic = email_data.content.replace(/###NAME###/g, UserRes.name);
                            mail_helper.sendMail({subject:email_data.subject, to: UserRes.email, html: etempdataDynamic }, function (res1) {
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
                res.json({ "status": false, "message": "Password and new password not a identical" });
            }
        } catch (e) {
            console.log("changePassword",e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async resetPassword (req, res) {
        try {
            let resetPasswordCode = req.body.resetPasswordCode;
            let newPassword = req.body.newPassword;
            let UserRes = await query_helper.findoneData(Admin,{forgotId: resetPasswordCode},{})
            if(UserRes.status) {
                UserRes=UserRes.msg;
                let checkencrypt = common.encrypt(newPassword);
                let otpup_data = await query_helper.updateData(Admin,"one",{_id:UserRes._id},{forgotId:0,password:checkencrypt})
                if(otpup_data) {
                    let email_data =   await query_helper.findoneData(emailTemplate,{hint: "admin-reset-password"},{})
                    if(email_data.status) {
                        email_data = email_data.msg;
                        let etempdataDynamic = email_data.content.replace(/###NAME###/g, UserRes.name);
                        mail_helper.sendMail({subject:email_data.subject, to: UserRes.email, html: etempdataDynamic }, function (res1) {
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
            console.log("resetPassword",e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getCurrencyBalance (req, res) {
        try {
            let currencyList = await query_helper.findData(Currency,{curnType : "Crypto"},{},{},0);
            currencyList = currencyList.msg;
            let empArr = [];
            for(let i=0; i < currencyList.length; i++) {
                let currencyBalance = await common.walletBalance(currencyList[i])
                empArr[i]={symbol:currencyList[i].currencySymbol,image:currencyList[i].image,decimal:currencyList[i].siteDecimal,basecoin:currencyList[i].basecoin,balance:currencyBalance}
            }
            res.json({ "status": true, "data": empArr });
        } catch (e) {
            console.log("getCurrencyBalance",e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async createAddress (req, res) {
        try {
            let symbol = req.query.symbol;
            if(symbol != '') {
                let CurDet = await query_helper.findoneData(Currency, { currencySymbol: symbol, basecoin: "Coin" }, {})
                if(CurDet.status) {
                    CurDet = CurDet.msg;
                    const checkSymbol = CurDet.basecoin != "Coin" ? common.currencyToken(CurDet.basecoin) : CurDet.currencySymbol;
                    let CurDet1 = await query_helper.findoneData(Currency, { currencySymbol: checkSymbol }, {});
                    CurDet1 = CurDet1.msg;
                    let adminAddressCheck = await query_helper.findoneData(AdminAddress, { currency: checkSymbol }, {})
                    if(!adminAddressCheck.status) {
                        try {
                            common.CreateAdminAddress(checkSymbol, async function (AddressCreate) {
                                if (AddressCreate) {
                                    let insObj = {}
                                    insObj.currency = checkSymbol;
                                    insObj.address = AddressCreate.address;
                                    insObj.encData = AddressCreate.encData;
                                    let CoinAddrIns = await query_helper.insertData(AdminAddress, insObj)
                                    if (CoinAddrIns) {
                                        let obj = {}
                                        obj.address = AddressCreate.address
                                        obj.symbol = checkSymbol
                                        res.json({ "status": true, "data": obj });
                                    } else {
                                        res.json({ "status": false, "data": "Error occured while creating an address.Please try again later" });
                                    }
                                } else {
                                    res.json({ "status": false, "data": "Error occured while creating an address.Please try again later" });
                                }
                            });
                        } catch(e) {
                            console.log('createAddress',e)
                            res.json({ "status": false, "message": "Not a valid request!" });
                        }
                    } else {
                        res.json({ "status": false, "message": "Address already exists!" });
                    }
                } else {
                    res.json({ "status": false, "message": "Not a valid request!" });
                }
            } else {
                res.json({ "status": false, "message": "Not a valid request!" });
            }
        } catch(e) {
            console.log("createAddress",e);
            res.json({ "status": false, "message": "Not a valid request!" });
        }
    },
    async withdrawWallet (req, res) {
        try {
            let getdet = req.body;
            let UserRes = await query_helper.findoneData(Admin,{_id: mongoose.Types.ObjectId(req.userId)},{})
            if(UserRes.status) {
                UserRes = UserRes.msg;
                let currencyData =  await query_helper.findoneData(Currency,{_id:mongoose.Types.ObjectId(getdet.currency)},{})
                if(currencyData.status) {
                    if(getdet.otp != '' && getdet.otp > 0) {
                        let OTPRes = await query_helper.findoneData(VerifyWalletWithdraw,{adminId: mongoose.Types.ObjectId(req.userId), status: 0},{},{_id:-1})
                        if(OTPRes.status) {
                            OTPRes = OTPRes.msg;
                            if (OTPRes.otp == getdet.otp) {
                                let now = new Date();
                                now.setMinutes(now.getMinutes() - 1);
                                const currenttime = now;
                                if(OTPRes.dateTime <= currenttime) {
                                    await query_helper.updateData(VerifyWalletWithdraw,"many",{adminId: mongoose.Types.ObjectId(req.userId), status: 0},{status: 2})
                                    return res.json({status:false, message: "Your OTP is expired"})
                                } else {
                                    let validatorSymbol = currencyData.msg.currencySymbol;
                                    if(currencyData.msg.basecoin != 'Coin'){
                                        validatorSymbol = common.currencyToken(currencyData.msg.basecoin);
                                    }
                                    let valid = common.addressvalidator(getdet.address, validatorSymbol)
                                    if (!valid) {
                                        res.json({ status: false, message: "Invalid Address", type:0 });
                                        return false;
                                    } else {
                                        delete getdet.otp;
                                        let objData = OTPRes.data;
                                        objData.adminId = mongoose.Types.ObjectId(req.userId);
                                        let txnData = await query_helper.insertData(WalletWithdraw, objData);
                                        if(txnData.status) {
                                            txnData = txnData.msg;
                                            let transactions = await WalletWithdraw.findOne({_id: mongoose.Types.ObjectId(txnData._id)}).populate("adminId", "name email").populate("currencyId", "currencyName currencySymbol decimal curnType cointype basecoin currencyId contractAddress USDvalue");
                                            common.CoinWithdraw(transactions.currencyId.currencySymbol, transactions, transactions.currencyId, async function (txnId) {
                                                if(txnId.status && txnId.txnId != '') {
                                                    await query_helper.updateData(VerifyWalletWithdraw,"many",{adminId: mongoose.Types.ObjectId(req.userId), status: 0},{status: 1})
                                                    await query_helper.updateData(WalletWithdraw,"one",{_id: mongoose.Types.ObjectId(txnData._id)},{txnId:txnId.txnId,status: 1});
                                                    res.json({ "status": true, "message": "Amount withdraw successfully", type: 1});
                                                } else {
                                                    await query_helper.updateData(WalletWithdraw,"one",{_id: mongoose.Types.ObjectId(txnData._id)},{status: 0});
                                                    await query_helper.updateData(VerifyWalletWithdraw,"many",{adminId: mongoose.Types.ObjectId(req.userId), status: 0},{status: 2})
                                                    res.json({ "status": false, "message": "Unable to access wallet" });
                                                }
                                            });
                                        } else {
                                            await query_helper.updateData(VerifyWalletWithdraw,"many",{adminId: mongoose.Types.ObjectId(req.userId), status: 0},{status: 2})
                                            res.json({ "status": false, "message": "Invalid OTP" });
                                        }
                                    }
                                }
                            } else {
                                res.json({ "status": false, "message": "Invalid OTP" });
                            }
                        } else {
                            res.json({ "status": false, "message": "Invalid OTP" });
                        }
                    } else {
                        if(getdet.amount > 0) {
                            let currencyBalance = await common.walletBalance(currencyData.msg);
                            if(currencyBalance >= getdet.amount) {
                                let genotp = await common.getOTPCode({from:"admin"});
                                const data = {
                                    currencyId: getdet.currency,
                                    address: getdet.address,
                                    amount: getdet.amount,
                                    receiveAmount: getdet.amount,
                                    tag: getdet.tag
                                };
                                let insObj = {
                                    adminId: mongoose.Types.ObjectId(req.userId),
                                    otp: genotp,
                                    data: data
                                }
                                let verifySend = await query_helper.insertData(VerifyWalletWithdraw, insObj)
                                if(verifySend.status){
                                    let email_data = await query_helper.findoneData(emailTemplate, { hint: 'wallet-withdraw-otp' }, {});
                                    if(email_data.status) {
                                        let etempdataDynamic = email_data.msg.content.replace(/###OTP###/g, genotp).replace(/###NAME###/g, UserRes.name).replace(/###AMOUNT###/g, getdet.amount+' '+currencyData.msg.currencySymbol);
                                        mail_helper.sendMail({subject:email_data.msg.subject, to: UserRes.email, html: etempdataDynamic }, function (res1) {
                                            res.json({ "status": true, "message": "OTP sent successfully , Please check your email.", type: 0 });
                                        });
                                    } else {
                                        res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                                    }
                                } else {
                                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                                }
                            } else {
                                res.json({ "status": false, "message": "Please enter less than wallet balance!" });
                            }
                        } else {
                            res.json({ "status": false, "message": "Not a valid currency!" });
                        }
                    }
                } else {
                    res.json({ "status": false, "message": "Not a valid currency!" });
                }
            } else {
                res.json({ "status": false, "message": "Invalid user" });
            }
        } catch (e) {
            console.log("withdrawWallet",e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getParCurrencyBalance (req, res) {
        try {
           let currencyData =  await query_helper.findoneData(Currency,{_id:mongoose.Types.ObjectId(req.body.currency)},{})
           if(currencyData.status) {
            let currencyBalance = await common.walletBalance(currencyData.msg);  
            res.json({ "status": true, "data": currencyBalance, "symbol": currencyData.msg.currencySymbol });
           } else {
            res.json({ "status": false, "message": "Invalid currency" });
           }
        } catch (e) {
            console.log("getParCurrencyBalance",e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getMyProfile (req, res) {
        try {
            let profile = await query_helper.findoneData(Admin,{_id:mongoose.Types.ObjectId(req.userId)},{})
            res.json({ "status": profile.status, "getProfileDetails": profile.msg });
        } catch (e) {
            console.log("getMyProfile",e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async updateMyProfile (req, res) {
        let data = req.body;
        let profile = await query_helper.updateData(Admin,"one",{_id:mongoose.Types.ObjectId(req.userId)},data)
        res.json({ "status": profile.status, "message": "My Profile updated successfully" });
    },
    async changePassword (req, res) {
        let data = req.body;
        let adminProfile = await query_helper.findoneData(Admin,{},{});
        if(adminProfile.status && adminProfile.msg.password == common.encrypt(data.oldPassword)) {
            let newPassword = common.encrypt(data.newPassword);
            await query_helper.updateData(Admin,"one",{_id:mongoose.Types.ObjectId(req.userId)},{password: newPassword})
            res.json({ "status": true, "message": "Password changed successfully!" });
        } else {
            res.json({ "status": false, "message": "Not a valid Old Password" });
        }
    },
    async getCurrency (req, res) {
        try {
            const Currencydata = await query_helper.findData(Currency,{curnType : "Crypto"},{},{},0);
            res.json({ "status": Currencydata.status, "message": Currencydata.msg });
        } catch (e) {
            console.log("getCurrency",e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getDepositAddress (req, res) {
        try {
            let Currencydata = await query_helper.findData(AdminAddress,{},{},{},0);
            Currencydata = Currencydata.status ? Currencydata.msg : [];
            let currencyList = await query_helper.findData(Currency,{curnType : "Crypto"},{},{},0);
            currencyList = currencyList.msg;
            let empArr = [];
            for(let i=0; i < currencyList.length; i++) {
                let addressData = Currencydata.filter(curData => (curData.currency == currencyList[i].currencySymbol || curData.currency == common.currencyToken(currencyList[i].basecoin)));
                const address = addressData.length > 0 ? addressData[0].address : '';
                empArr[i]={currency:currencyList[i].currencySymbol,basecoin:currencyList[i].basecoin,address:address}
            }
            res.json({ "status": true, "message": empArr });
        } catch (e) {
            console.log("getDepositAddress",e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getAdminWithdraw (req, res) {
        try {
            async.parallel({
                walletTransactions: function (cb) {
                    WalletWithdraw.aggregate([
                        {
                            $lookup:
                            {
                                from: 'Currency',
                                localField: 'currencyId',
                                foreignField: '_id',
                                as: 'currencydet'
                            },
                        },
                        {
                            $project: {
                                "address": "$address",
                                "amount": "$amount",
                                "txnId": "$txnId",
                                "status": "$status",
                                "createdDate": "$createdDate",
                                "currencySymbol": { $arrayElemAt: ["$currencydet.currencySymbol", 0] },
                                "basecoin": { $arrayElemAt: ["$currencydet.basecoin", 0] },
                            }
                        },
                        { $sort: { createdDate: -1 } }
                    ]).exec(cb);
                }
            }, function (err, results) {
                if (err) {
                    res.json({ message: [], status: false })
                } else {
                    res.json({ message: results.walletTransactions, status: true});
                }
            });
        } catch (e) {
            console.log("getAdminWithdraw",e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getProfit(req,res) {
        try {
            async.parallel({
                Profit: function (cb) {
                    ProfitDB.aggregate([
                        {
                            $lookup:
                            {
                                from: 'Currency',
                                localField: 'currencyId',
                                foreignField: '_id',
                                as: 'currencydet'
                            },
                        },
                        {
                            $lookup:
                            {
                                from: 'Users',
                                localField: 'userId',
                                foreignField: '_id',
                                as: 'usersdet'
                            },
                        },
                        {
                            $project: {
                                "date": "$date",
                                "fees": "$fees",
                                "type": "$type",
                                "email": { $arrayElemAt: ["$usersdet.email", 0] },
                                "username": { $arrayElemAt: ["$usersdet.username", 0] },
                                "currencySymbol": { $arrayElemAt: ["$currencydet.currencySymbol", 0] },
                            }
                        },
                        { $sort: { date: -1 } }
                    ]).exec(cb);
                }
            }, function (err, results) {
                if (err) {
                    res.json({ message: [], status: false })
                } else {
                        res.json({ message: results.Profit, status: true});
                   
                }
            });
        }
        catch (e) {
            console.log("getProfit",e);
            res.json({ message: [], status: false })
        }
    },
    async updateImages (req, res) {
        const uploader = async (path) => await cloudinary.uploads(path, 'Images');
        const urls = [];
        const files = req.files;
        for (const file of files) {
            const { path, originalname } = file;
            let fileName = originalname.split('.')[0];
            const newPath = await uploader(path);
            urls.push({name:fileName,location:newPath.url})
        }
        if(urls.length > 0) {
            if(req.query.type == 'settings') {
                let updateObj = {};
                let settings = await query_helper.findoneData(siteSettings,{},{});
                settings = settings.msg;
                let socialIcons = settings.socialIcons;
                for (const files of urls) {
                    let name = files.name;
                    if(name == 'favIcon' || name == 'siteLogo') {
                        updateObj[name] = files.location;
                    } else {
                        socialIcons[name] = files.location;
                    }
                }
                updateObj.socialIcons = socialIcons;
                await query_helper.updateData(siteSettings,"one",{},updateObj);
                res.json({ status: true, message: "Files uploaded successfully" });
            } else {
                res.json({ status: true, message: urls });
            }
        } else {
            res.json({ status: true, message: "No files uploaded" });
        }
    },
    async adminMoveProcess (req, res) {
        const orderwith = oArray.indexOf('adminCoin');
        if(orderwith == -1) {
            oArray.push('adminCoin');
            setTimeout( _intervalFunc, 5000, 'adminCoin');
            ETHCOIN.AdminMoveProcess();
            TRXCOIN.AdminMoveProcess();
            BNBCOIN.AdminMoveProcess();
            // MATICCOIN.AdminMoveProcess();
            res.json({ status: true, message: "Admin coin moving started" });
        } else {
            res.json({ status: false, message: "Please wait for 5 seconds before placing another request!" });
        }
    },
    async adminTokenMoveProcess (req, res) {
        const orderwith = oArray.indexOf('adminToken');
        if(orderwith == -1) {
            oArray.push('adminToken');
            setTimeout( _intervalFunc, 5000, 'adminToken');
            ETHCOIN.AdminTokenMoveProcess();
            TRXCOIN.AdminTokenMoveProcess();
            BNBCOIN.AdminTokenMoveProcess();
            // MATICCOIN.AdminTokenMoveProcess();
            res.json({ status: true, message: "Admin token moving started" });
        } else {
            res.json({ status: false, message: "Please wait for 5 seconds before placing another request!" });
        }
    },
    async checkETHBlock (req, res) {
        try {
            let blockNumber = await ETHCOIN.getBlockNumber();
            res.json({ status: true, message: blockNumber });
        } catch(e) {
            console.log("checkETHBlock",e);
            res.json({data: e});
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
module.exports = adminControllerOld;