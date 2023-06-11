const query_helper = require('../../helpers/query');
let common = require('../../helpers/common');
const mongoose = require('mongoose');
const Users = mongoose.model("Users");
const Admin = mongoose.model("Admin");
const UserWallet = mongoose.model("UserWallet");
const VerifyUsers = mongoose.model("VerifyUsers");
let CurrencyDb = mongoose.model('Currency');
const CurrencySymbolDb = mongoose.model("CurrencySymbol");
const Transaction = mongoose.model("Transactions");

const fs = require("fs");
let path = require('path');
var each = require('sync-each');
var {phone} = require('phone');

var bcrypt = require('bcrypt');
const saltRounds = 10;

var jsonrpc = require("../../Config/rpc");
var keythereum = require("keythereum");

const customerController = {
    async testtt(req, res) {
        return res.json({status: true, 1:1});
    },
    async feesCalculationChecking(req, res) {
        let orderFee = 0;
        if (fees > 0 && orderType == "buy") {
            orderFee = common.mathRound((common.mathRound(amount, fees, 'multiplication')), 100, 'division');
        }
        if (fees > 0 && orderType == "sell") {
            orderFee = common.mathRound((common.mathRound(filledPrice, fees, 'multiplication')), 100, 'division');
        }
        res.json({
            status: true,
            orderFee
        });
    },
    async getUserAccessToken(req, res) {
        const {
            body: bodyData = {}
        } = req;
        let emailegt = (bodyData.email).toLowerCase();

        bodyData.testsecur = "lo2ahnOG76d4hgYnbvFnmo&bbv@fbn80mJfJNddfghrFfSGGF4ad23dq2@sdgdsa";
        let userFindData = {};
        userFindData['$or'] = [
            {
                email: { $eq: emailegt },
            },
            {
                phoneno: { $eq: bodyData.email }
            }
        ];
        let resData = await query_helper.findoneData(Users, userFindData, {});
        if (resData.status) {
            resData = resData.msg;
            let origin = common.createPayloadCustomers(resData._id, resData.securityKey);
            res.json({
                status: true,
                token: origin,
                message: "Test Logged In successfully",
                resData: resData
            });
        }
        else {
            res.json({
                status: false,
                message: "User not found"
            });
        }
    },
    async getAdminAccessToken(req, res) {
        const {
            body: bodyData = {}
        } = req;
        let emailegt = (bodyData.aemail).toLowerCase();

        bodyData.testadminsecur = "fo2ahnOG76dYnbddvFnmDbaAQfffadbvfbn80msEs2ddede1dffd12sDgds1w";
        let userFindData = {};
        userFindData['$or'] = [
            {
                email: { $eq: emailegt }
            }
        ];
        let resData = await query_helper.findoneData(Admin, userFindData, {});
        if (resData.status) {
            resData = resData.msg;
            let origin = common.createPayloadAdmin(resData._id);
            res.json({
                status: true,
                token: origin,
                message: "Admin Test Logged In successfully",
                resData: resData
            });
        }
        else {
            res.json({
                status: false,
                message: "User not found"
            });
        }
    },
    async importCurrencySymbol(req, res) {
        console.log("importCurrency");
        let insertData = {
            users: [],
            Currency: [],
            CurrencySymbol: [],
        }
        let baseDir = path.join(__dirname, '../../public/fibitJson/');
        fs.readFile(baseDir+"currencies.json", "utf-8", async function(errC, readdataC) {
            if(!errC && readdataC){
                let currenciesData = JSON.parse(readdataC);
                let a = 1;
                currenciesData.forEach(async (curUserData) => {
                    insertData.CurrencySymbol.push({
                        currencySymbol: curUserData.ticker
                    });
                    if(currenciesData.length === a){
                        const insertStatus = await query_helper.insertManyData(CurrencySymbolDb, insertData.CurrencySymbol);
                        res.json({status: true, insertData, insertStatus});
                    }
                    a++;
                });
            }
        });
    },
    async importCurrency(req, res) {
        console.log("importCurrency");
        let insertData = {
            users: [],
            Currency: [],
            CurrencySymbol: [],
        }
        let baseDir = path.join(__dirname, '../../public/fibitJson/');

        fs.readFile(baseDir+"currencies.json", "utf-8", async function(errC, readdataC) {
            if(!errC && readdataC){
                let currenciesData = JSON.parse(readdataC);
                let a = 1;
                currenciesData.forEach(async (curUserData) => {

                    let findData = {currencySymbol: curUserData.ticker};

                    let CurrencySymbolData = await query_helper.findoneData(CurrencySymbolDb, findData, {});
                    if(CurrencySymbolData.status) {
                        const CurrencySymbolDatas = CurrencySymbolData.msg;

                        let currencySymbolCode  = "";
                        let basecoin  = "";
                        let contractAddress  = "";
                        let curnType  = "Crypto";

                        if(curUserData.is_fiat == "1") {
                            basecoin = "Fiat";
                            curnType = "Fiat";
                        }
                        if(curUserData.ticker == "inr") {
                            currencySymbolCode = "₹";
                            basecoin = "Fiat";
                            curnType = "Fiat";
                        }
                        else if(curUserData.ticker == "usdt" || curUserData.ticker == "busd") {
                            currencySymbolCode = "$";
                            if(curUserData.ticker == "usdt") {
                                basecoin = "TRC20";
                                contractAddress = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
                            }
                            else if(curUserData.ticker == "busd") {
                                basecoin = "BEP20";
                                contractAddress = "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56";
                            }
                        }
                        else {
                            currencySymbolCode = curUserData.ticker;
                        }
                        
                        insertData.Currency.push({
                            "currencyName" : curUserData.name,
                            "curnType" : curnType,
                            "currencySymbol" : curUserData.ticker,
                            "autoWithdraw" : 0,
                            "status" : 1,
                            "depositEnable" : 0,
                            "basecoin" : basecoin,
                            "apiid" : curUserData.coin_gecko_id,
                            "image" : curUserData.icon,
                            "tradeEnable" : 1,
                            "withdrawEnable" : 0,
                            "decimal" : parseInt(curUserData.blockchain_precision),
                            "siteDecimal" : parseInt(curUserData.visual_precision),
                            "cointype" : curUserData.ticker == "inr" ? 1 : 0,
                            "contractAddress" : contractAddress,
                            "currencyId" : CurrencySymbolDatas._id,
                            "currencySymbolCode" : currencySymbolCode,
                            "withdrawLevel": {
                                level1:{fees:0,feetype:1,minwithamt: CurrencySymbolData.CurrencySymbolData},
                                level2:{fees:0,feetype:1,minwithamt: CurrencySymbolData.CurrencySymbolData},
                                level2:{fees:0,feetype:1,minwithamt: CurrencySymbolData.CurrencySymbolData}
                            }
                        });
                        if(currenciesData.length === a){
                            insertStatus = await query_helper.insertManyData(CurrencyDb, insertData.Currency);
                            res.json({status: true, insertData, insertStatus});
                        }
                    }
                    a++;
                });
            }
        });
    },
    async importBalances(req, res) {
        console.log("importBalances 1");
        let resData = await query_helper.findData(CurrencySymbolDb, {}, {}, { _id: -1 }, 0);
        // console.log("importBalances 2");
        let resUsers = await query_helper.findData(Users, {userIdOld : {"$ne": "New"}}, {userIdOld: 1, _id: 1}, { _id: -1 }, 0);
        // console.log("importBalances 3");
        if (resData.status && resUsers.status) {
            const CurrencySymbolData = resData.msg;
            const userData = resUsers.msg;
            let insertData = {
                balance: []
            }
            let baseDir = path.join(__dirname, '../../public/fibitJson/');
            
            // console.log("bef read");
            console.log("userData len : ", userData.length);
            console.log("CurrencySymbolData len : ", CurrencySymbolData.length);

            fs.readFile(baseDir+"balance.json", "utf-8", async function(errD, readdataD) {
                // console.log("aft read");
                if(!errD && readdataD){
                    let balanceData = JSON.parse(readdataD);
                    let u = 1;
                    // console.log({
                    //     CurrencySymbolData: CurrencySymbolData.length,
                    //     userData: userData.length,
                    // });
                    userData.forEach(async (curUserData) => {
                        // console.log({u});
                        let c = 1;
                        CurrencySymbolData.forEach(async (curSymData) => {
                            // console.log({c});
                            const userIdOld = curUserData.userIdOld;
                            const iDx = balanceData.findIndex(e => (e.user_id == userIdOld && e.currency.toUpperCase() == curSymData.currencySymbol.toUpperCase()));
                            console.log({
                                iDx,
                                userIdOld,
                                currencySymbol: curSymData.currencySymbol
                            })
                            if(iDx > 0) {
                                insertData.balance.push({
                                    userId: curUserData._id,
                                    currencyId: curSymData._id,
                                    amount: balanceData[iDx].total_balance,
                                });
                            }

                            // console.log({
                            //     chk1: userData.length == u,
                            //     chk2: CurrencySymbolData.length == c,
                            //     userData: userData.length,
                            //     CurrencySymbolData: CurrencySymbolData.length
                            // });

                            if(userData.length == u && CurrencySymbolData.length == c) {
                                // console.log("before insert :");
                                // insertStatus = await query_helper.insertManyData(UserWallet, insertData.balance);
                                // console.log({insertStatus});
                                res.json({status: true, insertData});
                            }
                            else {
                                console.log("else", userData.length, u, CurrencySymbolData.length, c);
                            }
                            // console.log({c});
                            c++;
                        });
                        // console.log({u});
                        u++;
                    });
                }
                else {
                    console.log("errD : ", errD);
                }
            });
        }
        else {
            console.log("else : ");
        }
    },
    async importBalancesV2(req, res) {
        const reqBody = req.body;
        const {
            startCount = 0,
            endCount = 0
        } = reqBody;
        let insertData = {
            balanceData: []
        }
        let baseDir = path.join(__dirname, '../../public/fibitJson/test/');
        fs.readFile(baseDir+"balancetest2.json", "utf-8", async function(errA, readdataA) {
            if(!errA && readdataA){
                let balData = JSON.parse(readdataA);
                let a = 1;
                console.log("---- : ", balData.length);
                balData.forEach(async (curUserData) => {
                    if(startCount <= a && endCount >= a) {
                        // console.log("if",{a}, curUserData.amount);
                        if(curUserData.amount.search("NaN") > -1) {
                            insertData.balanceData.push({
                                userId: curUserData.userId,
                                currencyId: curUserData.currencyId,
                                amount: 0
                            });
                        }
                        if(curUserData.amount.search("-") > -1 && curUserData.amount.search("E") == -1 && curUserData.amount.search("e") == -1) {
                            insertData.balanceData.push({
                                userId: curUserData.userId,
                                currencyId: curUserData.currencyId,
                                amount: 0
                            });
                        }
                        else if(curUserData.amount.search("-") > -1 || curUserData.amount.search("E") > -1 || curUserData.amount.search("e") > -1) {
                            insertData.balanceData.push({
                                userId: curUserData.userId,
                                currencyId: curUserData.currencyId,
                                amount: parseFloat(curUserData.amount).toFixed(14)
                            });
                        }
                        else if(parseFloat(curUserData.amount) <= 0) {
                            insertData.balanceData.push({
                                userId: curUserData.userId,
                                currencyId: curUserData.currencyId,
                                amount: 0
                            });
                            // console.log({
                            //     userId: curUserData.userId,
                            //     currencyId: curUserData.currencyId,
                            //     amount: 0
                            // });
                        }
                        else {
                            insertData.balanceData.push({
                                userId: curUserData.userId,
                                currencyId: curUserData.currencyId,
                                amount: parseFloat(curUserData.amount).toFixed(14)
                            });
                            // insertData.balanceData.push(curUserData);
                            // console.log(curUserData);
                        }
                    }
                    if(a === endCount) {
                        // const insertStatus = 11;
                        const insertStatus = await query_helper.insertManyData(UserWallet, insertData.balanceData);
                        res.json({data: insertData.balanceData, insertStatus});
                    }
                    a++;
                });
            }
        });
    },
    async importBalancesV3(req, res) {
        const reqBody = req.body;
        const {
            startCount = 0,
            endCount = 0,
            pageNo = 1
        } = reqBody;

        console.log("importBalances 1");
        let resData = await query_helper.findData(CurrencySymbolDb, {}, {}, { _id: -1 }, 0);
        console.log("importBalances 2");
        let resUsers = await query_helper.findData(Users, {}, {userIdOld: 1, _id: 1}, { _id: -1 }, 0);
        console.log("importBalances 3");
        if (resData.status && resUsers.status) {
            const CurrencySymbolData = resData.msg;
            const userData = resUsers.msg;
            let insertData = {
                balance: []
            }
            let baseDir = path.join(__dirname, '../../public/fibitJson/');

            console.log("bef read");

            fs.readFile(baseDir+"balance.json", "utf-8", async function(errD, readdataD) {
                console.log("aft read");
                if(!errD && readdataD){
                    let balanceData = JSON.parse(readdataD);
                    let u = 1;
                    console.log({
                        CurrencySymbolData: CurrencySymbolData.length,
                        userData: userData.length,
                    });
                    userData.forEach(async (curUserData) => {
                        console.log({u});
                        let c = 1;
                        // if(startCount <= c && endCount >= c) {
                            CurrencySymbolData.forEach(async (curSymData) => {
                                console.log({c});
                                const userIdOld = curUserData.userIdOld;
                                const iDx = balanceData.findIndex(e => (e.user_id == userIdOld && e.currency.toLowerCase() == curSymData.currencySymbol.toLowerCase()));
                                if(iDx > 0) {
                                    // insertData.balance.push({
                                    //     userId: curUserData._id,
                                    //     currencyId: curSymData._id,
                                    //     amount: balanceData[iDx].available_balance,
                                    // });

                                    const amtt = balanceData[iDx].total_balance;

                                    let dd = {};

                                    if(amtt.search("NaN") > -1) {
                                        dd = {
                                            userId: curUserData._id,
                                            currencyId: curSymData._id,
                                            amount: 0
                                        };
                                    }
                                    else if(amtt.search("-") > -1 && amtt.search("E") == -1 && amtt.search("e") == -1) {
                                        dd = {
                                            userId: curUserData.userId,
                                            currencyId: curUserData.currencyId,
                                            amount: 0
                                        };
                                    }
                                    else if(amtt.search("-") > -1 || amtt.search("E") > -1 || amtt.search("e") > -1) {
                                        dd = {
                                            userId: curUserData.userId,
                                            currencyId: curUserData.currencyId,
                                            amount: parseFloat(amtt).toFixed(14)
                                        };
                                    }
                                    else if(parseFloat(curUserData.amount) <= 0) {
                                        dd = {
                                            userId: curUserData.userId,
                                            currencyId: curUserData.currencyId,
                                            amount: 0
                                        };
                                    }
                                    else {
                                        // const dd = curUserData;
                                        dd = {
                                            userId: curUserData.userId,
                                            currencyId: curUserData.currencyId,
                                            amount: parseFloat(amtt).toFixed(14)
                                        };
                                    }
                                    insertData.balance.push(dd);
                                }

                                console.log({
                                    chk1: userData.length == u,
                                    chk2: CurrencySymbolData.length == c,
                                    userData: userData.length,
                                    CurrencySymbolData: CurrencySymbolData.length
                                });

                                if(userData.length == u && CurrencySymbolData.length == c) {
                                    // console.log("before insert :");
                                    // insertStatus = await query_helper.insertManyData(UserWallet, insertData.balance);
                                    // console.log({insertStatus});
                                    res.json({status: true, insertData});
                                }
                                else {
                                    console.log("else", userData.length, u, CurrencySymbolData.length, c);
                                }
                                console.log({c});
                                c++;
                            });
                        // }
                        // console.log({u});
                        u++;
                    });
                }
                else {
                    console.log("errD : ", errD);
                }
            });
        }
        else {
            console.log("else : ");
        }
    },
    async importUser(req, res) {
        console.log("importUser");
        const chk = [
            "7f2ea0ff-23ec-4b51-abf0-c447b5237580",
            "2bfc3f29-6416-4fc3-aa21-0067e10f7c20"
        ];
        const allowAllUser = "yes";
        let insertData = {
            users: [],
            Currency: [],
            CurrencySymbol: [],
        }
        let baseDir = path.join(__dirname, '../../public/fibitJson/');
        fs.readFile(baseDir+"user.json", "utf-8", async function(errA, readdataA) {
            if(!errA && readdataA){
                fs.readFile(baseDir+"kycs.json", "utf-8", async function(errB, readdataB) {
                    if(!errB && readdataB){
                        let userData = JSON.parse(readdataA);
                        let kycData = JSON.parse(readdataB);
                        let newUser = {};
                        let a = 1;
                        userData.forEach(async (curUserData) => {
                            const randomIdA = Math.floor(Math.random() * 90000);
                            const randomIdB = Math.floor(Math.random() * 90000);
                            const getTime = new Date().getTime();
                            let curKycData = {};
                            const kycIndex = kycData.findIndex(e => e.user_id == curUserData.user_id);

                            if(chk.findIndex(e => e == curUserData.user_id) > -1 || allowAllUser === "yes") {
                                newUser = {
                                    userId: randomIdA+"-"+a+"-"+randomIdB,
                                    userIdOld: curUserData.user_id,
                                    email: curUserData.email,
                                    password: curUserData.password,
                                    email_confirmed: curUserData.email_confirmed,
                                    curKycData: curKycData,
                                    registerOn: curUserData.created_at,
                                    updatedOn: curUserData.updated_at,
                                };
                                if(curUserData.blocked == "1" || curUserData.email_confirmed == "0") {
                                    newUser.status = 0;
                                }
                                else {
                                    newUser.status = 1;
                                }
                                if(curUserData.blocked_reason) {
                                    newUser.blockStatus = curUserData.blocked_reason;
                                }
                                if(kycIndex > -1) {
                                    curKycData = kycData[kycIndex];
                                    if(curKycData.kyc_status == "1") {
                                        newUser.kycstatus = 1;
                                        newUser.kycStatusDetail = {
                                            pan: {
                                                status: 1, mode: "Online"
                                            },
                                            aadhaar: {
                                                status: 1, mode: "Online"
                                            },
                                            selfie: {
                                                status: 1, mode: "Online"
                                            },
                                        }
                                        newUser.kycOnline = {
                                            pan: {
                                                status: 1,
                                                details: {},
                                                number: "",
                                                reject_reason: "",
                                            },
                                            aadhaar: {
                                                status: 1,
                                                details: {},
                                                number: "",
                                                image: "",
                                                image_local: "",
                                                reject_reason: "",
                                            },
                                            selfie: {
                                                status: 1,
                                                details: {},
                                                image:  "",
                                                image_local: "",
                                                reject_reason: "",
                                            },
                                        }
                                        newUser.username = curKycData.first_name+curKycData.last_name;
                                        if(curKycData.country_code && curKycData.mobile_number) {
                                            newUser.phoneno = "+"+curKycData.country_code+curKycData.mobile_number;

                                            const phoneDetail = phone(newUser.phoneno, { country: "" });
                                            newUser.country = phoneDetail.countryIso3 ? phoneDetail.countryIso3 : phoneDetail.countryIso2;
                                        }
                                        if(curKycData.kyc_status == "1") {
                                            newUser.kycV1 = {
                                                status: 1,
                                                details: curKycData
                                            };
                                        }
                                    }
                                }
                                insertData.users.push(newUser);
                            }

                            if(userData.length === a){
                                const insertStatus = await query_helper.insertManyData(Users, insertData.users);
                                res.json({status: true, insertData, insertStatus});
                            }
                            a++;
                        });
                    }
                });
            }
            else {
                res.json({status: false, err});
            }
        });

        // var userOldDb = require("../../public/fibitJson/user.json");
        // res.json({userOldDb});

        // let baseDir = './public/fibitJson/C7D0EDAD-9668-443D-8CCB-FC52A87063FB.jpg';
        // await fs.unlinkSync(baseDir);
    },
    async getPasswordHash(req, res) {
        bcrypt
        .genSalt(saltRounds)
        .then(async salt => {
            console.log('1 Salt: ', salt)
            return await bcrypt.hash("Raja@123", salt);
        })
        .then(hash => {
            console.log('2 hash: ', hash)
            res.json({status: 2,message: hash});
        })
        .catch(err => console.error(err.message))
    },
    async passwordChk(req, res) {
        const reqBody = req.body;
        bcrypt
        .compare(reqBody.password, reqBody.hash)
        .then(resp => {
            res.json({status:true, resp});
        })
        .catch(err => console.error(err.message));
    },
    async VerifyUsersData(req, res) {
        let insertData = {
            verData: []
        }
        let resUsers = await query_helper.findData(Users, {}, {email: 1, phoneno: 1, _id: 1}, { _id: -1 }, 0);
        console.log(resUsers.status);
        if (resUsers.status && resUsers.msg) {
            console.log(resUsers.msg.length);
            let a = 1;
            resUsers.msg.forEach(async (vData) => {
                let insData = {};
                if(vData.email) {
                    insData.email = vData.email;
                }
                if(vData.phoneno) {
                    insData.phoneno = vData.phoneno;
                }
                if(vData.email || vData.phoneno) {
                    insertData.verData.push(insData);
                }
                console.log(a);
                if(a === resUsers.msg.length) {
                    const insertStatus = await query_helper.insertManyData(VerifyUsers, insertData.verData);
                    res.json({status: true, insertData, insertStatus});
                }
                a++;
            });
        }
    },
    async iconUpdate(req, res) {
        let baseDir = path.join(__dirname, '../../public/fibitJson/');
        fs.readFile(baseDir+"currencies.json", "utf-8", async function(errC, readdataC) {
            if(!errC && readdataC){
                let currenciesData = JSON.parse(readdataC);
                let a = 1;
                currenciesData.forEach(async (curUserData) => {
                    console.log({curUserData});
                    await query_helper.updateData(CurrencyDb, "one", { "currencyName" : curUserData.name }, { image: curUserData.icon })
                });
            }
        });
    },
    async levelUpdate(req, res) {
        // const ss = await query_helper.updateData(Users, "many", { "kycstatus" : 1 }, { level: 2 });
        const ss = await query_helper.updateData(CurrencyDb, "many", {}, { depositEnable: 0, withdrawEnable: 0 });
        res.json({ss});
    },
    async newkycDetUpdate(req, res) {
        let resUsers = await query_helper.findData(Users, {
            userIdOld: {"$eq" : "New"},
            "kycOnline.pan.status" : {"$eq" : 0},
        }, {}, { _id: -1 }, 0);
    },
    async kycDetUpdate(req, res) {
        console.log("kycDetUpdate : ");
        let baseDir = path.join(__dirname, '../../public/fibitJson/');
        fs.readFile(baseDir+"kycs.json", "utf-8", async function(errK, readdataK) {
            if(!errK && readdataK) {
                let kycsData = JSON.parse(readdataK);
                let resUsers = await query_helper.findData(Users, {kycstatus: 1, userIdOld: {"$ne" : "New"}}, {kycstatus: 1, userIdOld: 1, user_id: 1}, { _id: -1 }, 10000, 2);
                if (resUsers.status && resUsers.msg && resUsers.msg.length > 0) {
                    let a = 1;
                    console.log("ssss : ", resUsers.msg.length);
                    resUsers.msg.forEach(async (vData) => {
                        const userIdOld = vData.userIdOld;
                        const iDx = await kycsData.findIndex(e => e.user_id == userIdOld);
                        if(iDx > -1) {
                            const kycsDetail = kycsData[iDx];
                            let updData = {
                                kycOnline: {
                                    pan: {
                                        status: 3,
                                        details: {},
                                        number: "",
                                        reject_reason: "",
                                    },
                                    aadhaar: {
                                        status: 3,
                                        details: {},
                                        number: "",
                                        image: "",
                                        image_local: "",
                                        reject_reason: "",
                                    },
                                    selfie: {
                                        status: 1,
                                        details: {},
                                        image:  "",
                                        image_local: "",
                                        reject_reason: "",
                                    },
                                },
                                kycOffline: {
                                    pan: {
                                       status: 3,
                                       details: {},
                                       number: "",
                                       image: "",
                                       reject_reason: "",
                                    },      
                                    aadhaar: {
                                       status: 3,
                                       details: {},
                                       number: 0,
                                       image: "",
                                       image_back: "",
                                       image_local: "",
                                       reject_reason: "",
                                    },
                                    selfie: {
                                       status: 3,
                                       image: "",
                                       reject_reason: "",
                                    }
                                },
                                kycStatusDetail: {
                                    pan: {
                                        status: 1, mode: "Online"
                                    },
                                    aadhaar: {
                                        status: 1, mode: "Online"
                                    },
                                    selfie: {
                                        status: 1, mode: "Online"
                                    },
                                }
                            };

                            if(kycsDetail.id_validation == "automatic") {
                                updData.kycOnline.aadhaar = {
                                    status: 1,
                                    details: {
                                        first_name: kycsDetail.first_name,
                                        last_name: kycsDetail.last_name ? kycsDetail.last_name : "",
                                        address: kycsDetail.address
                                    },
                                    number: kycsDetail.id_number,
                                    image: "",
                                    image_local: "",
                                    reject_reason: "",
                                };
                                if(kycsDetail.last_name) {
                                    updData.kycOnline.aadhaar.details.last_name = kycsDetail.last_name;
                                }
                            }
                            else if(kycsDetail.id_validation == "manual") {
                                updData.kycStatusDetail.aadhaar.mode = "Offline";
                                updData.kycOffline.aadhaar = {
                                    status: 1,
                                    details: {
                                        first_name: kycsDetail.first_name,
                                        last_name: kycsDetail.last_name ? kycsDetail.last_name : "",
                                        address: kycsDetail.address
                                    },
                                    number: kycsDetail.id_number,
                                    image: "",
                                    image_back: "",
                                    image_local: "",
                                    reject_reason: "",
                                }
                            }
                            
                            updData.kycOnline.pan = {
                                status: 1,
                                details: {},
                                number: kycsDetail.pan_number,
                                reject_reason: "",
                            }

                            const ss = await query_helper.updateData(Users, "one", { userIdOld }, updData);
                            console.log("if : ", {a, userIdOld});
                            if(resUsers.msg.length === a) {
                                res.json({status: true, updData, 0: resUsers.msg[0], 1: resUsers.msg[1]});
                            }
                        }
                        else {
                            console.log("else : ", {a});
                        }
                        a++;
                    });
                }
            }
        });
    },
    async execTest(req, res) {
        let transaction = [1,2,3]
        for (var trr = 0; trr < transaction.length; trr++) {
            var tr = trr;
            var newKey = tr + 1;
            setTimeout(async function () {
                console.log("date time 1", new Date());
                await console.log({tr, newKey});
                let txid = "123";
                let transresult1 = await query_helper.findoneData(Transaction, { "txnId": txid, "type": "Deposit" }, {});
                console.log({newKey, transresult1});
                let transresult2 = await query_helper.findoneData(Transaction, { "txnId": txid, "type": "Deposit" }, {});
                console.log({newKey, transresult2});
                let transresult3 = await query_helper.findoneData(Transaction, { "txnId": txid, "type": "Deposit" }, {});
                console.log({newKey, transresult3});
                let transresult4 = await query_helper.findoneData(Transaction, { "txnId": txid, "type": "Deposit" }, {});
                console.log({newKey, transresult4});
                let transresult5 = await query_helper.findoneData(Transaction, { "txnId": txid, "type": "Deposit" }, {});
                console.log({newKey, transresult5});
            }, newKey * 1000);
        }
    },
    async commonDecrypt(req, res) {
        const {
            body: reqBody = {}
        } = req;

        const datas = reqBody.value;
        let dec = common.decrypt(datas);
        dec = JSON.parse(dec);
        return res.json({dec});
    },
    async balRemove(req, res) {
        const {
            body: reqBody = {}
        } = req;
        const {
            userId = "",
            currency = ""
        } = reqBody;

        // await common.updateUserBalance(userId, currency, 0, "0", 'Balance - Remove');
        // await common.updateUserBalance(userId, currency, 0, "0", 'p2pWallet');
        // await common.updatep2pAmount(userId, currency, 46, "7301477345622681", 'P2P Order complete By admin : 7301477345622681', {notes: "P2P Order complete By admin : 7301477345622681"});

        res.json({"status": true});
    },
    async getUserBalanceByCurrencyId(req, res) {
        console.log("getUserBalanceByCurrencyId");
        const {
            body: reqBody = {}
        } = req;
        const {
            currencySymbol = "INR",
            currency_id = "",
            currencyId = ""
        } = reqBody;

        let initMatch = {
            amount: {"$gt":0}
        }

        if(currency_id) {
            let resData = await query_helper.findoneData(CurrencyDb, {_id: mongoose.Types.ObjectId(currency_id)}, {});
            if (resData.status) {
                console.log({resData});
                initMatch.currencyId = mongoose.Types.ObjectId(resData.msg.currencyId);
            }
        }
        if(currencyId) {
            initMatch.currencyId = mongoose.Types.ObjectId(currencyId);
        }

        const userWalletQuery = [
            {
                $match: initMatch,
            },
            {
                $lookup: {
                    from: 'Users',
                    let: {
                        userId: '$userId',
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    "$eq": ["$_id", "$$userId"]
                                }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                email: 1
                            }
                        }
                    ],
                    as: 'userDet'
                },
            },
            {
                $unwind: "$userDet"
            },
            {
                $lookup: {
                    from: 'CurrencySymbol',
                    let: {
                        currencyId: '$currencyId',
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    "$eq": ["$_id", "$$currencyId"]
                                }
                            }
                        },
                        {
                            $project: {
                                // _id: 0,
                                currencySymbol: 1
                            }
                        }
                    ],
                    as: 'currencyDet'
                },
            },
            {
                $unwind: "$currencyDet"
            },
            {
                $sort: {
                    amount: -1
                }
            },
            {
                $project: {
                    _id: 0,
                    amount: 1,
                    hold: 1,
                    userEmaisl: "$userDet.email",
                    currencySymbol: "$currencyDet.currencySymbol",
                    // userDet: 1,
                    // currencyDet: 1,
                }
            }
        ];

        const walletResult = await UserWallet.aggregate(userWalletQuery);

        res.json({walletResult});
    },
    async decChk(req, res) {
        const keyStore = {"version":3,"id":"53cdc615-edd8-43d8-9542-d37c33bd5641","address":"86a92d0b804715c1f1abdaae77d6575ed43143d8","crypto":{"ciphertext":"7d26e143ac33c2978b5dc3d9b38dab31726fb4844569d1b451fadeec4aee93ca","cipherparams":{"iv":"806f254206b43e4833fd0c85a6469d35"},"cipher":"aes-128-ctr","kdf":"scrypt","kdfparams":{"dklen":32,"salt":"48233e5fd288c89ad2681b5fc7f2e39d6d2dea6f82a551142bb1246b3546e464","n":8192,"r":8,"p":1},"mac":"c17c6e56fe57b42e4bebe0d5c5a012b34ed9f1c7ae2a6dc164d3c5a267f03783"}};
        let privateKeyETH = "";
        try {
            privateKeyETH = keythereum.recover(jsonrpc.ethconfig.UserKey, keyStore);
        } catch (error) {
        }
        let privateKeyBNB = "";
        try {
            privateKeyBNB = keythereum.recover(jsonrpc.bnbconfig.UserKey, keyStore);
        } catch (error) {
        }
        res.json({privateKeyETH, privateKeyBNB})
    }
};

module.exports = customerController;