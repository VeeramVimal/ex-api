const query_helper = require('../../helpers/query');
let common = require('../../helpers/common');
const mongoose = require('mongoose');
let speakeasy = require('speakeasy');
const emailTemplate = mongoose.model("EmailTemplate");
const mail_helper = require('../../helpers/mailHelper');
const Users = mongoose.model("Users");
const UserWallet = mongoose.model("UserWallet");
const CoinAddress = mongoose.model("CoinAddress");
const VerifyUsers = mongoose.model("VerifyUsers");
const Currency = mongoose.model("Currency");
const CurrencySymbol = mongoose.model("CurrencySymbol");
const Transactions = mongoose.model("Transactions");
const siteSettings = mongoose.model("SiteSettings");
const Staking = mongoose.model("Staking");
const StakingHistory = mongoose.model("StakingHistory");
const stakeEnableList = mongoose.model("StakingEnabledUser");
const profit = mongoose.model("Profit");
let StakeBonusHistory = mongoose.model('StakeBonusHistory');

const BalanceUpdation = mongoose.model("BalanceUpdation");
const P2PBalanceUpdation = mongoose.model("P2PBalanceUpdation");
const USDMBalanceUpdation = mongoose.model("USDMBalanceUpdation");
let StakeBalanceUpdation = mongoose.model('StakeBalanceUpdation');
let CryptoLoanBalanceUpdation = mongoose.model('CryptoLoanBalanceUpdation');

const activityDB = mongoose.model('UserActivity');
let updateInternal = 0;
let stakeBonuses = {};
const customerWalletController = {
    async getWalletCurrency(req, res) {
        try {
            let where = { currencySymbol: 'INR' };
            let currencyINR = await query_helper.findoneData(Currency, where, {})
            let inrValue = (currencyINR.status && currencyINR.msg.USDvalue > 0) ? currencyINR.msg.USDvalue : 0;
            let walletHistory = await query_helper.findData(UserWallet, { userId: mongoose.Types.ObjectId(req.userId) }, {}, { _id: -1 }, 0);
            let walletBalances = {};
            if (walletHistory.status && walletHistory.msg.length > 0) {
                for (const wallet of walletHistory.msg) {
                    walletBalances[wallet.currencyId] = { amount: wallet.amount, hold: 0, stakingAmount: wallet.stakingAmount, stakingHold: 0, p2pAmount: wallet.p2pAmount, p2pHold: wallet.p2pHold, perpetualAmount: wallet.perpetualAmount, perpetualHold: wallet.perpetualHold };
                }
            }
            let estimateINR = 0;
            let estimateUSD = 0;
            let currency = await query_helper.findData(Currency, { status: 1 }, {}, { currencySymbol: 1 }, 0);
            let responseData = [];
            let checkExist = {};
            let countInc = 0;
            currency.msg.forEach((entry) => {
                if (typeof checkExist[entry.currencyId] == 'number') {
                    let entryData = JSON.parse(JSON.stringify(responseData[checkExist[entry.currencyId]]));
                    entryData.count = entryData.count + 1;
                    entryData.ids.push({ _id: entry._id, basecoin: entry.basecoin, depositEnable: entry.depositEnable, withdrawEnable: entry.withdrawEnable });
                    responseData[checkExist[entry.currencyId]] = entryData;
                } else {
                    checkExist[entry.currencyId] = countInc;
                    let entryData = JSON.parse(JSON.stringify(entry));
                    if (typeof walletBalances[entry.currencyId] == 'object') {
                        entryData.balance = walletBalances[entry.currencyId].amount;
                        entryData.hold = walletBalances[entry.currencyId].hold;
                        entryData.stakingAmount = walletBalances[entry.currencyId].stakingAmount;
                        entryData.stakingHold = walletBalances[entry.currencyId].stakingHold;
                        entryData.p2pHold = walletBalances[entry.currencyId].p2pHold;
                        entryData.p2pAmount = walletBalances[entry.currencyId].p2pAmount;
                        entryData.perpetualHold = walletBalances[entry.currencyId].perpetualHold;
                        entryData.perpetualAmount = walletBalances[entry.currencyId].perpetualAmount;
                    } else {
                        entryData.balance = 0;
                        entryData.hold = 0;
                        entryData.stakingAmount = 0;
                        entryData.stakingHold = 0;
                        entryData.p2pAmount = 0;
                        entryData.p2pHold = 0;
                        entryData.perpetualAmount = 0;
                        entryData.perpetualHold = 0;
                    }

                    if (entryData.balance > 0) {
                        const curAllBal = (entryData.balance + entryData.stakingAmount + entryData.p2pAmount + entryData.perpetualAmount);
                        const usdSpot = (curAllBal > 0 && entryData.USDvalue > 0 ? entryData.USDvalue * curAllBal : 0);
                        estimateUSD = estimateUSD + usdSpot;

                        entryData.inrValue = (curAllBal) * (inrValue > 0 ? entryData.USDvalue / inrValue : 0);
                        estimateINR = estimateINR + entryData.inrValue;
                    }

                    entryData.count = 1;
                    entryData.ids = [{ _id: entryData._id, basecoin: entryData.basecoin, depositEnable: entry.depositEnable, withdrawEnable: entry.withdrawEnable }];
                    responseData[countInc] = entryData;
                    countInc++;
                }
            });
            responseData.sort(function (a, b) {
                return b.inrValue - a.inrValue;
            });
            res.json({
                "status": true,
                "data": responseData,
                estimateINR,
                estimateUSD,
                isDisable: {
                    estimateINR: true,
                    estimateUSD: false
                }
            });
        } catch (e) {
            console.log('getWalletCurrency', e);
            res.json({
                "status": false,
                "data": [],
                estimateINR: 0,
                estimateUSD: 0,
                isDisable: {
                    estimateINR: true,
                    estimateUSD: false
                }
            });
        }
    },
    async getHistory(req, res) {
        try {
            const transactionHistory = await Transactions
                .find({ userId: mongoose.Types.ObjectId(req.userId) })
                .sort({ _id: -1 })
                .populate("currencyId", "currencySymbol image siteDecimal");
            res.json({ "status": true, "data": transactionHistory });
        } catch (e) {
            console.log('getHistory', e);
            res.json({ "status": false, "data": [] });
        }
    },
    async getHistoryWithFilter(req, res) {
        try {
            const {
                body: reqBody = {},
                userId
            } = req;
            const {
                filter = {}
            } = reqBody;
            const {
                tab = "Crypto",
                type = "Deposit",
                currencySymbol = ""
            } = filter;

            let match = {
                userId: mongoose.Types.ObjectId(userId)
            };
            let currencyMatch = {};
            if (type) {
                match.type = type;
            }
            if (tab === 'Crypto' || tab === 'Fiat') {
                currencyMatch['currencyDet.curnType'] = tab;
            }

            if (currencySymbol != "" && currencySymbol != "All") {
                currencyMatch['currencyDet.currencySymbol'] = currencySymbol;
            }

            let sort = { createdDate: -1 }
            let limit = req.body.limit ? parseInt(req.body.limit) : 10;
            let offset = req.body.offset ? parseInt(req.body.offset) : 0;
            let tradecount = await Transactions.find(match).countDocuments();

            Transactions.aggregate([
                {
                    $match: match
                },
                { "$sort": sort },
                { "$limit": offset + limit },
                { "$skip": offset },
                {
                    $lookup: {
                        from: 'Currency',
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
                                    currencySymbol: 1,
                                    image: 1,
                                    siteDecimal: 1,
                                    curnType: 1
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
                    $match: currencyMatch
                },
            ]).exec(async function (err, result) {
                if (result) {
                    res.json({ "status": true, "data": result, "total": tradecount });
                } else {
                    res.json({ "status": true, "data": [], "total": 0 });
                }
            });
        } catch (e) {
            console.log('getHistory', e);
            res.json({ "status": false, "data": [] });
        }
    },
    async getPostHistory(req, res) {
        try {
            let where = { userId: mongoose.Types.ObjectId(req.userId) };
            if (req.body.type != '') {
                if (req.body.type == 'Withdraw') {
                    where.type = req.body.type;
                } else {
                    where.type = 'Deposit';
                }
            }
            if(typeof req.body.currencySymbol == 'string' && req.body.currencySymbol != '') {
                let currency = await query_helper.findoneData(Currency, {currencySymbol: req.body.currencySymbol}, {});
                if(currency.status) {
                    where.walletCurrencyId = currency.msg.currencyId;
                }
            }
            else if(typeof req.body.currencyType == 'string' && req.body.currencyType != '') {
                let currency = await query_helper.findoneData(Currency, {currencySymbol: 'INR'}, {});
                if(currency.status) {
                    if(req.body.currencyType == 'Fiat') {
                        where.walletCurrencyId = currency.msg.currencyId;
                    } else {
                        where.walletCurrencyId = {$ne: currency.msg.currencyId};
                    }
                }
            }
            if(typeof req.body.currencyId == 'string' && req.body.currencyId != '') {
                where.walletCurrencyId = mongoose.Types.ObjectId(req.body.currencyId);
            }
            let sort = { createdDate: -1 }
            let limit = req.body.limit ? parseInt(req.body.limit) : 10;
            let offset = req.body.offset ? parseInt(req.body.offset) : 0;

            // const transactionHistory = await Transactions
            // .find(where)
            // .sort({_id:-1})
            // .populate("currencyId", "currencySymbol image siteDecimal");
            let ordercount = await Transactions.find(where).countDocuments();
            Transactions.aggregate([
                {
                    $match: where
                },
                { "$sort": sort },
                { "$limit": offset + limit },
                { "$skip": offset },
                {
                    $lookup:
                    {
                        from: 'Currency',
                        localField: 'currencyId',
                        foreignField: '_id',
                        as: 'currencyId'
                    }
                },
                { $unwind: "$currencyId" },
                {
                    $project: {
                        "currencyId": "$currencyId",
                        "address": "$address",
                        "adminMove": "$adminMove",
                        "walletCurrencyId": "$walletCurrencyId",
                        "userId": "$userId",
                        "usdAmount": "$usdAmount",
                        "type": "$type",
                        "txnId": "$txnId",
                        "status": "$status",
                        "tag": "$tag",
                        "rejectReason": "$rejectReason",
                        "referenceId": "$referenceId",
                        "receiveAmount": "$receiveAmount",
                        "moveCur": "$moveCur",
                        "fundsMove": "$fundsMove",
                        "fees": "$fees",
                        "depositType": "$depositType",
                        "createdDate": "$createdDate",
                        "bonusData": "$bonusData",
                        "attachment": "$attachment",
                        "amount": "$amount",
                        "adminVerify": "$adminVerify",
                    },
                },
            ]).exec(async function (err, result) {
                if (result) {
                    res.json({ "status": true, "data": result, "total": ordercount });
                    // res.json({ "status": true, "message": "Order details listed", data: result,total: ordercount });
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }
            });
        } catch (e) {
            console.log('getPostHistory', e);
            res.json({ "status": false, "data": [] });
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
    async getCurrency(req, res) {
        try {
            let currency = await query_helper.findData(Currency, { $or: [{ status: 0 }, { status: 1 },] }, { _id: -1, currencySymbol: 1, basecoin: 1, withdrawLevel: 1, siteDecimal: 1, image: 1, curnType: 1, depositEnable: 1, withdrawEnable: 1, tradeEnable: 1, status: 1 }, { _id: -1 }, 0)
            res.json({ "status": true, "data": currency.msg });
        } catch (e) {
            console.log('getCurrency', e);
            res.json({ "status": false, "data": [] });
        }
    },
    async getactiveCoinStatus(req, res) {
        try {
            let currency = await query_helper.findData(Currency, { status: 1 }, { _id: -1, currencySymbol: 1, basecoin: 1, withdrawLevel: 1, siteDecimal: 1, image: 1, curnType: 1, depositEnable: 1, withdrawEnable: 1, tradeEnable: 1, status: 1 }, { _id: -1 }, 0)
            res.json({ "status": true, "data": currency.msg });
        } catch (e) {
            console.log('getCurrency', e);
            res.json({ "status": false, "data": [] });
        }
    },
    async getParticularCurrency(req, res) {
        try {
            const {
                currencySymbol = "INR"
            } = req.body;
            let where = { currencySymbol };
            if ((typeof req.body.CurrencyID == 'string' && req.body.CurrencyID != '') && mongoose.Types.ObjectId.isValid(req.body.CurrencyID)) {
                where = { _id: mongoose.Types.ObjectId(req.body.CurrencyID) }
            }
            let currency = await query_helper.findoneData(Currency, where, {})
            res.json({ "status": currency.status, "data": currency.msg });
        } catch (e) {
            console.log('getParticularCurrency', e);
            res.json({ "status": false, "data": [] });
        }
    },
    async createAddress(req, res) {
        try {
            let GetuserID = req.userId;
            let CurrencyID = req.body.CurrencyID;
            if ((typeof CurrencyID == 'string' && CurrencyID != '') && mongoose.Types.ObjectId.isValid(CurrencyID)) {
                let userDet = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(GetuserID) }, {})
                if (userDet.status == 1) {
                    userDet = userDet.msg;
                    let CurDet = await query_helper.findoneData(Currency, { _id: mongoose.Types.ObjectId(CurrencyID) }, {})
                    if (CurDet.status) {
                        CurDet = CurDet.msg;
                        if (CurDet.depositEnable == 1) {
                            let AddressDet = await query_helper.findoneData(CoinAddress, { currencyid: mongoose.Types.ObjectId(CurrencyID), user_id: mongoose.Types.ObjectId(GetuserID) }, {})
                            if (AddressDet.status && AddressDet.msg && AddressDet.msg.address) {
                                AddressDet = AddressDet.msg;
                                let obj = {}
                                obj.address = AddressDet.address
                                obj.tag = AddressDet.tag
                                obj.symbol = CurDet.currencySymbol
                                obj.tagType = CurDet.tagContent;
                                res.json({ "status": true, "data": obj });
                            } else if (CurDet.basecoin != "Coin") {
                                let ParCoin = await query_helper.findoneData(CoinAddress, { currencyname: common.currencyToken(CurDet.basecoin), user_id: mongoose.Types.ObjectId(GetuserID) }, {});
                                if (ParCoin.status) {
                                    let obj = {}
                                    obj.address = ParCoin.msg.address;
                                    obj.symbol = CurDet.currencySymbol
                                    obj.tag = ParCoin.msg.tag
                                    obj.tagType = ParCoin.msg.tagType;
                                    res.json({ "status": true, "data": obj });
                                } else {
                                    const checkSymbol = CurDet.basecoin != "Coin" ? common.currencyToken(CurDet.basecoin) : CurDet.currencySymbol;
                                    let CurDet1 = await query_helper.findoneData(Currency, { currencySymbol: checkSymbol }, {});
                                    CurDet1 = CurDet1.msg;

                                    let EvmBasedCoin = { status: false };

                                    if (CurDet.basecoin == "BEP20" || CurDet.basecoin == "ERC20" || CurDet.basecoin == "TRC20") {
                                        EvmBasedCoin = await query_helper.findoneData(CoinAddress, {
                                            "$or": [{ currencyname: "ETH" }, { currencyname: "BNB" }, { currencyname: "MATIC" }],
                                            user_id: mongoose.Types.ObjectId(GetuserID)
                                        }, {});
                                    }

                                    if (CurDet.basecoin != "TRC20" && EvmBasedCoin.status) {
                                        let AddressCreate = EvmBasedCoin.msg;
                                        let insObj = {}
                                        insObj.user_id = GetuserID;
                                        insObj.currencyid = CurDet1._id;
                                        insObj.currencyname = common.currencyToken(CurDet.basecoin);
                                        insObj.address = AddressCreate.address;
                                        insObj.encData = AddressCreate.encData;
                                        insObj.tag = AddressCreate.tag;
                                        if (AddressCreate.tag != '') {
                                            insObj.tagType = CurDet1.tagContent;
                                        }
                                        let CoinAddrIns = await query_helper.insertData(CoinAddress, insObj)
                                        if (CoinAddrIns) {
                                            let obj = {}
                                            obj.address = AddressCreate.address
                                            obj.symbol = CurDet.currencySymbol
                                            obj.tag = AddressCreate.tag
                                            obj.tagType = CurDet1.tagContent;
                                            res.json({ "status": true, "data": obj });
                                        } else {
                                            res.json({ "status": false, "data": "Error occured while creating an address.Please try again later", pl: 1 });
                                        }
                                    }
                                    else {
                                        common.CreateAddress(checkSymbol, GetuserID, async function (AddressCreate) {
                                            if (AddressCreate && AddressCreate.address) {
                                                let insObj = {}
                                                insObj.user_id = GetuserID;
                                                insObj.currencyid = CurDet1._id;
                                                insObj.currencyname = common.currencyToken(CurDet.basecoin);
                                                insObj.address = AddressCreate.address;
                                                insObj.encData = AddressCreate.encData;
                                                insObj.tag = AddressCreate.tag;
                                                if (AddressCreate.tag != '') {
                                                    insObj.tagType = CurDet1.tagContent;
                                                }
                                                let CoinAddrIns = await query_helper.insertData(CoinAddress, insObj)
                                                if (CoinAddrIns) {
                                                    let obj = {}
                                                    obj.address = AddressCreate.address
                                                    obj.symbol = CurDet.currencySymbol
                                                    obj.tag = AddressCreate.tag
                                                    obj.tagType = CurDet1.tagContent;
                                                    res.json({ "status": true, "data": obj });
                                                } else {
                                                    res.json({ "status": false, "data": "Error occured while creating an address.Please try again later", pl: 1 });
                                                }
                                            } else {
                                                res.json({ "status": false, "data": "Error occured while creating an address.Please try again later", pl: 2 });
                                            }
                                        });
                                    }
                                }
                            } else {

                                let EvmBasedCoin = { status: false };

                                if (CurDet.currencySymbol == "BNB" || CurDet.currencySymbol == "ETH" || CurDet.currencySymbol == "MATIC") {
                                    EvmBasedCoin = await query_helper.findoneData(CoinAddress, {
                                        "$or": [{ currencyname: "ETH" }, { currencyname: "BNB" }, { currencyname: "MATIC" }],
                                        user_id: mongoose.Types.ObjectId(GetuserID)
                                    }, {});
                                }

                                if (EvmBasedCoin.status) {
                                    let AddressCreate = EvmBasedCoin.msg;

                                    let insObj = {}
                                    insObj.user_id = GetuserID
                                    insObj.currencyid = CurrencyID
                                    insObj.currencyname = CurDet.currencySymbol
                                    insObj.address = AddressCreate.address
                                    insObj.encData = AddressCreate.encData;
                                    insObj.tag = AddressCreate.tag
                                    if (AddressCreate.tag != '') {
                                        insObj.tagType = CurDet.tagContent;
                                    }
                                    let CoinAddrIns = await query_helper.insertData(CoinAddress, insObj)
                                    if (CoinAddrIns) {
                                        let obj = {}
                                        obj.address = AddressCreate.address
                                        obj.symbol = CurDet.currencySymbol
                                        obj.tag = AddressCreate.tag;
                                        obj.tagType = CurDet.tagContent;
                                        res.json({ "status": true, "data": obj });
                                    } else {
                                        res.json({ "status": false, "data": "Error occured while creating an address.Please try again later", pl: 3 });
                                    }
                                }
                                else {
                                    common.CreateAddress(CurDet.currencySymbol, GetuserID, async function (AddressCreate) {
                                        if (AddressCreate && AddressCreate.address) {
                                            let insObj = {}
                                            insObj.user_id = GetuserID
                                            insObj.currencyid = CurrencyID
                                            insObj.currencyname = CurDet.currencySymbol
                                            insObj.address = AddressCreate.address
                                            insObj.encData = AddressCreate.encData;
                                            insObj.tag = AddressCreate.tag
                                            if (AddressCreate.tag != '') {
                                                insObj.tagType = CurDet.tagContent;
                                            }
                                            let CoinAddrIns = await query_helper.insertData(CoinAddress, insObj)
                                            if (CoinAddrIns) {
                                                let obj = {}
                                                obj.address = AddressCreate.address
                                                obj.symbol = CurDet.currencySymbol
                                                obj.tag = AddressCreate.tag;
                                                obj.tagType = CurDet.tagContent;
                                                res.json({ "status": true, "data": obj });
                                            } else {
                                                res.json({ "status": false, "data": "Error occured while creating an address.Please try again later", pl: 3 });
                                            }
                                        } else {
                                            res.json({ "status": false, "data": "Error occured while creating an address.Please try again later", pl: 4 });
                                        }
                                    });
                                }
                            }
                        } else {
                            res.json({ "status": false, "data": "Wallet Maintenance, Deposit Suspended" });
                        }
                    } else {
                        res.json({ "status": false, "data": "Invalid currency details" });
                    }
                } else {
                    res.json({ "status": false, "data": "You are deactivated by admin" });
                }
            } else {
                res.json({ "status": false, "data": "Invalid currency id" });
            }
        } catch (e) {
            console.log('createAddress', e);
            res.json({ "status": false, "data": [] });
        }
    },
    async submitStaking(req, res) {
        try {
            if (common.getSiteDeploy() == 0) {
                let data = req.body;
                let userId = mongoose.Types.ObjectId(req.userId);
                const orderwith = oArray.indexOf(userId.toString());
                if (orderwith == -1) {
                    oArray.push(userId.toString())
                    setTimeout(_intervalFunc, 5000, userId.toString());
                    let stakingResult = await query_helper.findoneData(Staking, { _id: mongoose.Types.ObjectId(data.stakingId) }, {})
                    if (stakingResult.status) {
                        stakingResult = stakingResult.msg;
                        if (stakingResult.status == 1) {
                            if (data.amount > 0 && data.package >= 0) {
                                let currencyResult = await query_helper.findoneData(Currency, { _id: mongoose.Types.ObjectId(stakingResult.currencyId) }, {});
                                if (currencyResult.status) {
                                    currencyResult = currencyResult.msg;
                                    if (currencyResult.status == 1) {
                                        let userResult = await query_helper.findoneData(Users, { _id: userId }, {});
                                        if (userResult.status) {
                                            userResult = userResult.msg;
                                            if (userResult.kycstatus == 1) {
                                                if (typeof stakingResult.packages[data.package] == 'object') {
                                                    const selPackage = stakingResult.packages[data.package];
                                                    if (+(selPackage.from) <= +(data.amount) && +(selPackage.to) >= +(data.amount)) {
                                                        let walletOutput = await common.getbalance(userId, stakingResult.walletCurrencyId)
                                                        if (walletOutput) {
                                                            if (walletOutput.stakingAmount < data.amount) {
                                                                return res.json({ status: false, message: "Insufficient balance" })
                                                            } else {
                                                                let someDate = new Date(), someDate1 = new Date(), someDate2 = new Date();
                                                                const maturityDate = someDate.setDate(someDate.getDate() + (+(stakingResult.maturityDays) + +(selPackage.tenureDays)));
                                                                const nextBonusDay = someDate1.setDate(someDate1.getDate() + +(selPackage.interestUnlockDays));
                                                                const lastDay = someDate2.setDate(someDate2.getDate() + +(selPackage.tenureDays));
                                                                let sendAmount = +data.amount;
                                                                let newstakebal = (+walletOutput.stakingAmount) - (sendAmount);
                                                                let values = {
                                                                    userId: userId,
                                                                    stakingId: stakingResult._id,
                                                                    package: selPackage,
                                                                    amount: sendAmount,
                                                                    status: 0,
                                                                    maturityDate: maturityDate,
                                                                    nextBonusDay: nextBonusDay,
                                                                    lastDay: lastDay,
                                                                    maturedDays: stakingResult.maturityDays,
                                                                    currency: currencyResult.currencySymbol,
                                                                    walletCurrencyId: stakingResult.walletCurrencyId
                                                                }
                                                                let insertedOutput = await query_helper.insertData(StakingHistory, values);
                                                                if (insertedOutput.status) {
                                                                    await common.updateStakeHoldAmount(userId, stakingResult.walletCurrencyId, +sendAmount);
                                                                    insertedOutput = insertedOutput.msg
                                                                    await common.updateStakeAmount(userId, stakingResult.walletCurrencyId, +newstakebal, insertedOutput._id, 'Staking-Creation');
                                                                    common.userNotification(userId, 'New Staking Created', 'You have Created New Staking Value Of ' + sendAmount + ' ' + currencyResult.currencySymbol);
                                                                    insertedOutput = insertedOutput.msg
                                                                    let configResult = await query_helper.findoneData(emailTemplate, { hint: 'user-staking' }, {})
                                                                    if (configResult.status) {
                                                                        configResult = configResult.msg;
                                                                        let emailtemplate = configResult.content.replace(/###NAME###/g, userResult.username).replace(/###CURRENCY###/g, currencyResult.currencySymbol).replace(/###AMOUNT###/g, common.roundValuesMail(+data.amount, 8));
                                                                        mail_helper.sendMail({ subject: configResult.subject + " - " + selPackage.packageName, to: userResult.email, html: emailtemplate }, (aftermail) => {
                                                                        })
                                                                    }
                                                                    const resData = await query_helper.findoneData(siteSettings, {}, {})
                                                                    const stakingEmail = (resData.status && resData.msg.stakingEmail != '') ? resData.msg.stakingEmail : '';
                                                                    if (stakingEmail != '') {
                                                                        const stakingEmails = stakingEmail.split(',');
                                                                        let configResult1 = await query_helper.findoneData(emailTemplate, { hint: 'staking-notify' }, {})
                                                                        if (configResult1.status) {
                                                                            configResult1 = configResult1.msg;
                                                                            let emailtemplate = configResult1.content.replace(/###USEREMAIL###/g, userResult.email).replace(/###PLAN###/g, selPackage.packageName).replace(/###CURRENCY###/g, currencyResult.currencySymbol).replace(/###AMOUNT###/g, common.roundValuesMail(+data.amount, 8));
                                                                            mail_helper.sendMail({ subject: configResult1.subject + " " + currencyResult.currencySymbol + " - " + selPackage.packageName, to: stakingEmails[0], html: emailtemplate, bcc: stakingEmails }, (aftermail) => {
                                                                            })
                                                                        }
                                                                    }
                                                                    res.json({ status: true, message: "Amount staked successfully!" })
                                                                } else {
                                                                    res.json({ status: false, message: "Oops! Something went wrong. Please try again" })
                                                                }
                                                            }
                                                        } else {
                                                            res.json({ status: false, message: "Oops! Something went wrong. Please try again" })
                                                        }
                                                    } else {
                                                        res.json({ status: false, message: 'Please enter value between ' + selPackage.from + " to " + selPackage.to + " " + currencyResult.currencySymbol })
                                                    }
                                                } else {
                                                    res.json({ status: false, message: "Please select valid package" })
                                                }
                                            } else {
                                                res.json({ status: false, message: "Please complete your KYC to add staking" })
                                            }
                                        } else {
                                            res.json({ status: false, message: "Not a valid user" })
                                        }
                                    } else {
                                        res.json({ status: false, message: "Currency disabled by admin" })
                                    }
                                } else {
                                    res.json({ status: false, message: "Not a valid currency" })
                                }
                            } else {
                                res.json({ status: false, message: "Please enter valid amount" })
                            }
                        } else {
                            res.json({ status: false, message: "Staking disabled by admin" })
                        }
                    } else {
                        res.json({ status: false, message: "Not a valid currency" })
                    }
                } else {
                    setTimeout(_intervalFunc, 5000, userId);
                    res.json({ status: false, message: "Please wait for 5 seconds before placing another request!" });
                }
            } else {
                return res.json({ status: false, message: "Please wait for 5 minutes before placing another request!" })
            }
        } catch (e) {
            console.log('submitStaking', e);
            res.json({ "status": false, "message": "Something went wrong" });
        }
    },
    async submitTransfer(req, res) {
        try {
            if (common.getSiteDeploy() == 0) {
                let data = req.body;
                let userId = mongoose.Types.ObjectId(req.userId);
                const orderwith = oArray.indexOf(userId.toString());
                if (orderwith == -1) {
                    oArray.push(userId.toString())
                    let currencyResult = await query_helper.findoneData(Currency, { currencyId: mongoose.Types.ObjectId(data.currencyId), status: 1 }, {});
                    if (currencyResult.status) {
                        currencyResult = currencyResult.msg;
                        currencyResult.USDvalue = currencyResult.currencySymbol == 'USDT' ? 1 : currencyResult.USDvalue;
                        if (currencyResult.status == 1) {
                            let sendAmount = +data.amount;
                            if (sendAmount > 0) {
                                if (currencyResult.transferEnable == 1 || currencyResult.perpetualTransferEnable == 1 || currencyResult.cryptoLoanTransferEnable) {

                                    const walletFindData = {
                                        userId: mongoose.mongo.ObjectId(userId),
                                        currencyId: mongoose.mongo.ObjectId(currencyResult.currencyId),
                                    }

                                    let userResult = await query_helper.findoneData(Users, { _id: userId }, {});
                                    if (userResult.status) {
                                        userResult = userResult.msg;
                                       if(Number.isInteger(sendAmount) == false){
                                        return retMessage({
                                            res,
                                            userId: req.userId,
                                            retData : { status: false, message: "Please enter the correct value"}
                                        });
                                       }
                                        let walletOutput = await common.getbalance(userId, currencyResult.currencyId);

                                        if(walletOutput) {

                                            if(currencyResult.transferEnable != 1 &&
                                                (
                                                    (data.fromAccount == 'Main Wallet' && data.toAccount == 'P2P Wallet')
                                                    ||
                                                    (data.fromAccount == 'P2P Wallet' && data.toAccount == 'Main Wallet')
                                                )
                                            ) {
                                                let errMessage = 'P2P Wallet Transfer Disabled By Admin';
                                                return retMessage({
                                                    res,
                                                    userId: req.userId,
                                                    retData : { status: false, message: errMessage}
                                                });
                                            }
                                            else if(currencyResult.perpetualTransferEnable != 1 &&
                                                (
                                                    (data.fromAccount == 'Main Wallet' && data.toAccount == 'USD-M Wallet')
                                                    ||
                                                    (data.fromAccount == 'USD-M Wallet' && data.toAccount == 'Main Wallet')
                                                )
                                            )
                                            {
                                                let errMessage = 'USD-M Wallet Transfer Disabled By Admin';
                                                return retMessage({
                                                    res,
                                                    userId: req.userId,
                                                    retData : { status: false, message: errMessage}
                                                });
                                            }
                                            else if(currencyResult.cryptoLoanTransferEnable != 1 && data.fromAccount == 'Loan Wallet' && data.toAccount == 'Main Wallet') {
                                                let errMessage = 'Loan Wallet Transfer Disabled By Admin';
                                                return retMessage({
                                                    res,
                                                    userId: req.userId,
                                                    retData : { status: false, message: errMessage}
                                                });
                                            }

                                            let curFromBalance = 0;
                                            let curToBalance = 0;
                                            if(data.fromAccount == 'Main Wallet' && data.toAccount == 'P2P Wallet') {
                                                curFromBalance = walletOutput.amount;
                                                curToBalance = walletOutput.p2pAmount;
                                            }
                                            else if(data.fromAccount == 'P2P Wallet' && data.toAccount == 'Main Wallet') {
                                                curFromBalance = walletOutput.p2pAmount;
                                                curToBalance = walletOutput.amount;
                                            }
                                            else if(data.fromAccount == 'Main Wallet' && data.toAccount == 'USD-M Wallet') {
                                                curFromBalance = walletOutput.amount;
                                                curToBalance = walletOutput.perpetualAmount;
                                            }
                                            else if(data.fromAccount == 'USD-M Wallet' && data.toAccount == 'Main Wallet') {
                                                curFromBalance = walletOutput.perpetualAmount;
                                                curToBalance = walletOutput.amount;
                                            }
                                            else if(data.fromAccount == 'Loan Wallet' && data.toAccount == 'Main Wallet') {
                                                curFromBalance = walletOutput.cryptoLoanAmount;
                                                curToBalance = walletOutput.amount;
                                            }

                                            if (curFromBalance < sendAmount) {
                                                return retMessage({
                                                    res,
                                                    userId: req.userId,
                                                    retData : { status: false, message: "Insufficient balance" }
                                                });
                                            }
                                            else if (currencyResult.minWalletTransfer > sendAmount) {
                                                return retMessage({
                                                    res,
                                                    userId: req.userId,
                                                    retData : { status: false, message: "Minimum amount to transfer is "+ (currencyResult.minWalletTransfer) + " "+ currencyResult.currencySymbol }
                                                });
                                            }
                                            else {

                                                let values = {
                                                    userId: userId,
                                                    type: "Wallet Transfer",
                                                    txnId: data.fromAccount + " To " + data.toAccount,
                                                    amount: sendAmount,
                                                    receiveAmount: sendAmount,
                                                    usdAmount: sendAmount,
                                                    status: 1,
                                                    currencyId: currencyResult._id,
                                                    walletCurrencyId: currencyResult.currencyId
                                                }
                                                let insertedOutput = await query_helper.insertData(Transactions, values);

                                                if (insertedOutput.status) {
                                                    insertedOutput = insertedOutput.msg;
                                                    let lastId = insertedOutput._id;

                                                    let fromBalUpdTable;
                                                    let fromBalUpdation = {
                                                        userId: mongoose.mongo.ObjectId(userId),
                                                        currencyId: mongoose.mongo.ObjectId(currencyResult.currencyId),
                                                        lastId: lastId,
                                                        type: 'From '+data.fromAccount+" To "+data.toAccount,
                                                        notes: "from",
                                                        difference: common.roundValues(-sendAmount, currencyResult.decimal),
                                                        oldBalance : common.roundValues(curFromBalance, currencyResult.decimal),
                                                    };

                                                    let toBalUpdTable;
                                                    let toBalUpdation = {
                                                        userId: mongoose.mongo.ObjectId(userId),
                                                        currencyId: mongoose.mongo.ObjectId(currencyResult.currencyId),
                                                        lastId: lastId,
                                                        type: 'From '+data.fromAccount+" To "+data.toAccount,
                                                        notes: "to",
                                                        difference: common.roundValues(+sendAmount, currencyResult.decimal),
                                                        oldBalance : common.roundValues(curToBalance, currencyResult.decimal),
                                                    };

                                                    let updData = {};

                                                    let fromAmountField = "";
                                                    let toAmountField = "";

                                                    if(data.fromAccount == 'Main Wallet' && data.toAccount == 'P2P Wallet') {
                                                        fromBalUpdTable = BalanceUpdation;
                                                        toBalUpdTable = P2PBalanceUpdation;

                                                        fromAmountField = "amount";
                                                        toAmountField = "p2pAmount";

                                                        updData = {
                                                            "$inc": {
                                                                'amount': -sendAmount,
                                                                'p2pAmount': sendAmount
                                                            }
                                                        };
                                                    }
                                                    else if(data.fromAccount == 'P2P Wallet' && data.toAccount == 'Main Wallet') {
                                                        fromBalUpdTable = P2PBalanceUpdation;
                                                        toBalUpdTable = BalanceUpdation;
                                                        
                                                        fromAmountField = "p2pAmount";
                                                        toAmountField = "amount";

                                                        updData = {
                                                            "$inc": {
                                                                'p2pAmount': -sendAmount,
                                                                'amount': sendAmount
                                                            }
                                                        };
                                                    }
                                                    else if(data.fromAccount == 'Main Wallet' && data.toAccount == 'USD-M Wallet') {
                                                        fromBalUpdTable = BalanceUpdation;
                                                        toBalUpdTable = USDMBalanceUpdation;

                                                        fromAmountField = "amount";
                                                        toAmountField = "perpetualAmount";

                                                        updData = {
                                                            "$inc": {
                                                                'amount': -sendAmount,
                                                                'perpetualAmount': sendAmount
                                                            }
                                                        };
                                                    }
                                                    else if(data.fromAccount == 'USD-M Wallet' && data.toAccount == 'Main Wallet') {
                                                        fromBalUpdTable = USDMBalanceUpdation;
                                                        toBalUpdTable = BalanceUpdation;

                                                        fromAmountField = "perpetualAmount";
                                                        toAmountField = "amount";

                                                        updData = {
                                                            "$inc": {
                                                                'perpetualAmount': -sendAmount,
                                                                'amount': sendAmount
                                                            }
                                                        };
                                                    }
                                                    else if(data.fromAccount == 'Loan Wallet' && data.toAccount == 'Main Wallet') {
                                                        fromBalUpdTable = CryptoLoanBalanceUpdation;
                                                        toBalUpdTable = BalanceUpdation;
                                                        
                                                        fromAmountField = "cryptoLoanAmount";
                                                        toAmountField = "amount";

                                                        updData = {
                                                            "$inc": {
                                                                'cryptoLoanAmount': -sendAmount,
                                                                'amount': sendAmount
                                                            }
                                                        };
                                                    }

                                                    const fromBalUpdationId = await query_helper.insertData(fromBalUpdTable, fromBalUpdation);
                                                    const toBalUpdationId = await query_helper.insertData(toBalUpdTable, toBalUpdation);

                                                    let updateBalance = {};

                                                    if(fromBalUpdationId.status && toBalUpdationId.status) {
                                                        const options = { new: true };
                                                        updateBalance = await UserWallet.findOneAndUpdate(walletFindData, updData, options);
                                                    }

                                                    if (updateBalance._id) {

                                                        await fromBalUpdTable.findOneAndUpdate({
                                                            _id: fromBalUpdationId.msg._id
                                                        }, {
                                                            amount : updateBalance[fromAmountField]
                                                        });
                                                        await toBalUpdTable.findOneAndUpdate({
                                                            _id: toBalUpdationId.msg._id
                                                        }, {
                                                            amount : updateBalance[toAmountField]
                                                        });

                                                        let configResult = await query_helper.findoneData(emailTemplate, { hint: 'user-transfer' }, {})
                                                        if (configResult.status) {
                                                            configResult = configResult.msg;
                                                            let emailtemplate = configResult.content.replace(/###NAME###/g, userResult.username).replace(/###CURRENCY###/g, currencyResult.currencySymbol).replace(/###AMOUNT###/g, common.roundValuesMail(+data.amount, 8));
                                                            mail_helper.sendMail({ subject: configResult.subject+" - "+data.fromAccount+" To "+data.toAccount, to: userResult.email, html: emailtemplate }, (aftermail) => {
                                                            });
                                                        }
                                                        return retMessage({
                                                            res,
                                                            userId: req.userId,
                                                            retData : { status: true, message: "Amount transferred successfully!"}
                                                        });
                                                    } else {
                                                        return retMessage({
                                                            res,
                                                            userId: req.userId,
                                                            retData : { status: false, message: "Oops! Something went wrong. Please try again!"}
                                                        });
                                                    }
                                                }
                                                else {
                                                    return retMessage({
                                                        res,
                                                        userId: req.userId,
                                                        retData : { status: false, message: "Wallet transferred failed. Please try again"}
                                                    });
                                                }
                                            }
                                        } else {
                                            return retMessage({
                                                res,
                                                userId: req.userId,
                                                retData : { status: false, message: "Oops! Something went wrong. Please try again"}
                                            });
                                        }
                                    } else {
                                        return retMessage({
                                            res,
                                            userId: req.userId,
                                            retData : { status: false, message: "Invalid user."}
                                        });
                                    }
                                }
                                else {
                                    return retMessage({
                                        res,
                                        userId: req.userId,
                                        retData : { status: false, message: "Transfer for this currency is disabled"}
                                    });
                                }
                            } else {
                                return retMessage({
                                    res,
                                    userId: req.userId,
                                    retData : { status: false, message: "Please enter valid amount"}
                                });
                            }
                        } else {
                            return retMessage({
                                res,
                                userId: req.userId,
                                retData : { status: false, message: "Currency status is not in active state"}
                            });
                        }
                    } else {
                        return retMessage({
                            res,
                            userId: req.userId,
                            retData : { status: false, message: "Not a valid currency" }
                        });
                    }
                } else {
                    console.log({oArray})
                    return res.json({ status: false, message: "Please wait your previous request has not been completed!" });
                }
            } else {
                return res.json({ status: false, message: "Please wait for 5 minutes before placing another request!" })
            }
        } catch (e) {
            console.log('submitTransfer', e);
            return retMessage({
                res,
                userId: req.userId,
                retData : { "status": false, "message": "Something went wrong" }
            });
        }            
    },
    async submitTransferOld(req, res) {
        try {
            if (common.getSiteDeploy() == 0) {
                let data = req.body;
                let userId = mongoose.Types.ObjectId(req.userId);
                const orderwith = oArray.indexOf(userId.toString());
                if (orderwith == -1) {
                    oArray.push(userId.toString())
                    setTimeout(_intervalFunc, 5000, userId.toString());
                    let currencyResult = await query_helper.findoneData(Currency, { currencyId: mongoose.Types.ObjectId(data.currencyId), status: 1 }, {});
                    if (currencyResult.status) {
                        currencyResult = currencyResult.msg;
                        currencyResult.USDvalue = currencyResult.currencySymbol == 'USDT' ? 1 : currencyResult.USDvalue;
                        if (currencyResult.status == 1) {
                            if (data.amount > 0) {
                                if (currencyResult.transferEnable == 1 || currencyResult.perpetualTransferEnable == 1) {
                                    if (
                                        (data.fromAccount == 'Main Wallet' && currencyResult.transferEnable == 1 && data.toAccount == 'P2P Wallet')
                                        ||
                                        (data.fromAccount == 'P2P Wallet' && currencyResult.transferEnable == 1 && data.toAccount == 'Main Wallet')
                                    ) {
                                        let userResult = await query_helper.findoneData(Users, { _id: userId }, {});
                                        if (userResult.status) {
                                            userResult = userResult.msg;
                                            let walletOutput = await common.getbalance(userId, currencyResult.currencyId)
                                            if (walletOutput) {
                                                let fromType = '', toType = '';
                                                if (data.fromAccount == 'Main Wallet') {
                                                    fromType = 'amount';
                                                    toType = 'p2pAmount';
                                                } else {
                                                    fromType = 'p2pAmount';
                                                    toType = 'amount';
                                                }
                                                if (walletOutput[fromType] < data.amount) {
                                                    return res.json({ status: false, message: "Insufficient balance" })
                                                } else {
                                                    if (currencyResult.minWalletTransfer > data.amount) {
                                                        return res.json({ status: false, message: "Minimum amount to transfer is "+ (currencyResult.minWalletTransfer) + " "+ currencyResult.currencySymbol })
                                                    }
                                                    let sendAmount = +data.amount;
                                                    let values = {
                                                        userId: userId,
                                                        type: "Wallet Transfer",
                                                        txnId: data.fromAccount + " To " + data.toAccount,
                                                        amount: sendAmount,
                                                        receiveAmount: sendAmount,
                                                        usdAmount: sendAmount,
                                                        status: 1,
                                                        currencyId: currencyResult._id,
                                                        walletCurrencyId: currencyResult.currencyId
                                                    }
                                                    let insertedOutput = await query_helper.insertData(Transactions, values)
                                                    if (insertedOutput.status) {
                                                        insertedOutput = insertedOutput.msg
                                                        common.userNotification(userId, 'Wallet Transfer', 'You have Transferred '+sendAmount+' '+currencyResult.currencySymbol+ ' From '+data.fromAccount+" To "+data.toAccount);
                                                        let activity = common.activity(req);
                                                        activity.browser = (typeof activity.browser == 'string') ? activity.browser : loginType + ' Application';
                                                        common.userNotify({
                                                            userId: req.userId,
                                                            reason: 'Wallet Transfer',
                                                            activity,
                                                            detail: {
                                                                transferId : insertedOutput._id,
                                                                amount: sendAmount,
                                                                currencySymbol: currencyResult.currencySymbol,
                                                                fromAccount: data.fromAccount,
                                                                toAccount: data.toAccount
                                                            }
                                                        });
                                                        let newbal = 0;
                                                        if(fromType == 'amount') {
                                                            newbal = (+walletOutput.amount) - (+data.amount)
                                                            newp2pbal = (+walletOutput.p2pAmount) + (+data.amount)
                                                        } else {
                                                            newbal = (+walletOutput.amount) + (+data.amount)
                                                            newp2pbal = (+walletOutput.p2pAmount) - (+data.amount)
                                                        }
                                                        await common.updatep2pAmount(userId, currencyResult.currencyId, +newp2pbal,insertedOutput._id,' From '+data.fromAccount+" To "+data.toAccount);
                                                        let updateBalance = await common.updateUserBalance(userId, currencyResult.currencyId, newbal, insertedOutput._id, data.fromAccount+" To "+data.toAccount);
                                                        let configResult = await query_helper.findoneData(emailTemplate, { hint: 'user-transfer' }, {})
                                                        if (updateBalance) {
                                                            if (configResult.status) {
                                                                configResult = configResult.msg;
                                                                let emailtemplate = configResult.content.replace(/###NAME###/g, userResult.username).replace(/###CURRENCY###/g, currencyResult.currencySymbol).replace(/###AMOUNT###/g, common.roundValuesMail(+data.amount, 8));
                                                                mail_helper.sendMail({ subject: configResult.subject+" - "+data.fromAccount+" To "+data.toAccount, to: userResult.email, html: emailtemplate }, (aftermail) => {
                                                                })
                                                            }
                                                            return res.json({ status: true, message: "Amount transferred successfully!" })
                                                        } else {
                                                            res.json({ status: false, message: "Oops! Something went wrong. Please try again" })
                                                        }
                                                        res.json({ status: true, message: "Amount transferred successfully!" })
                                                    } else {
                                                        res.json({ status: false, message: "Oops! Something went wrong. Please try again" })
                                                    }
                                                }
                                            } else {
                                                res.json({ status: false, message: "Oops! Something went wrong. Please try again" })
                                            }
                                        } else {
                                            res.json({ status: false, message: "Not a valid User" })
                                        }

                                    } else if (
                                        (data.fromAccount == 'Main Wallet' && currencyResult.perpetualTransferEnable == 1 && data.toAccount == 'USD-M Wallet')
                                        ||
                                        (data.fromAccount == 'USD-M Wallet' && currencyResult.perpetualTransferEnable == 1 && data.toAccount == 'Main Wallet')
                                    ) {
                                        let userResult = await query_helper.findoneData(Users, { _id: userId }, {});
                                        if (userResult.status) {
                                            userResult = userResult.msg;
                                            let walletOutput = await common.getbalance(userId, currencyResult.currencyId)
                                            if (walletOutput) {
                                                let fromType = '', toType = '';
                                                if (data.fromAccount == 'Main Wallet') {
                                                    fromType = 'amount';
                                                    toType = 'perpetualAmount';
                                                } else {
                                                    fromType = 'perpetualAmount';
                                                    toType = 'amount';
                                                }
                                                if (walletOutput[fromType] < data.amount) {
                                                    return res.json({ status: false, message: "Insufficient balance" })
                                                } else {
                                                    let sendAmount = +data.amount;
                                                    let values = {
                                                        userId: userId,
                                                        type: "Wallet Transfer",
                                                        txnId: data.fromAccount + " To " + data.toAccount,
                                                        amount: sendAmount,
                                                        receiveAmount: sendAmount,
                                                        usdAmount: sendAmount,
                                                        status: 1,
                                                        currencyId: currencyResult._id,
                                                        walletCurrencyId: currencyResult.currencyId
                                                    }
                                                    let insertedOutput = await query_helper.insertData(Transactions, values)
                                                    if (insertedOutput.status) {
                                                        common.userNotification(userId, 'Wallet Transfer', 'You have Transferred '+sendAmount+' '+currencyResult.currencySymbol+ ' From '+data.fromAccount+" To "+data.toAccount);
                                                        insertedOutput = insertedOutput.msg
                                                        let activity = common.activity(req);
                                                        activity.browser = (typeof activity.browser == 'string') ? activity.browser : loginType + ' Application';
                                                        let userActData = await query_helper.findoneData(activityDB, { userId: req.userId, ip: activity.ip, type: "Wallet Transfer" }, {})
                                                        if (!userActData.status) {
                                                            common.userNotify({
                                                                userId: req.userId,
                                                                reason: 'Wallet Transfer',
                                                                activity,
                                                                detail: {
                                                                    transferId : insertedOutput._id,
                                                                    amount: sendAmount,
                                                                    currencySymbol: currencyResult.currencySymbol,
                                                                    fromAccount: data.fromAccount,
                                                                    toAccount: data.toAccount
                                                                }
                                                            });
                                                        }
                                                        let newbal = 0;
                                                        if(fromType == 'amount') {
                                                            newbal = (+walletOutput.amount) - (+data.amount)
                                                            newp2pbal = (+walletOutput.perpetualAmount) + (+data.amount)
                                                        } else {
                                                            newbal = (+walletOutput.amount) + (+data.amount)
                                                            newp2pbal = (+walletOutput.perpetualAmount) - (+data.amount)
                                                        }
                                                        await common.updateperpetualAmount(userId, currencyResult.currencyId, +newp2pbal,insertedOutput._id,' From '+data.fromAccount+" To "+data.toAccount);
                                                        let updateBalance = await common.updateUserBalance(userId, currencyResult.currencyId, newbal, insertedOutput._id, data.fromAccount+" To "+data.toAccount);
                                                        let configResult = await query_helper.findoneData(emailTemplate, { hint: 'user-transfer' }, {})
                                                        if (updateBalance) {
                                                            if (configResult.status) {
                                                                configResult = configResult.msg;
                                                                let emailtemplate = configResult.content.replace(/###NAME###/g, userResult.username).replace(/###CURRENCY###/g, currencyResult.currencySymbol).replace(/###AMOUNT###/g, common.roundValuesMail(+data.amount, 8));
                                                                mail_helper.sendMail({ subject: configResult.subject+" - "+data.fromAccount+" To "+data.toAccount, to: userResult.email, html: emailtemplate }, (aftermail) => {
                                                                })
                                                            }
                                                            return res.json({ status: true, message: "Amount transferred successfully!" })
                                                        } else {
                                                            res.json({ status: false, message: "Oops! Something went wrong. Please try again" })
                                                        }
                                                        res.json({ status: true, message: "Amount transferred successfully!" })
                                                    } else {
                                                        res.json({ status: false, message: "Oops! Something went wrong. Please try again" })
                                                    }
                                                }
                                            } else {
                                                res.json({ status: false, message: "Oops! Something went wrong. Please try again" })
                                            }

                                        } else {
                                            res.json({ status: false, message: "Not a valid User" })
                                        }

                                    } else if (
                                        data.fromAccount == 'Loan Wallet' && currencyResult.perpetualTransferEnable == 1 && data.toAccount == 'Main Wallet'
                                    ) {
                                        //** crypto loan amount transfer to wallet amount functionalities*/
                                        let userResult = await query_helper.findoneData(Users, { _id: userId }, {});
                                        if (userResult.status) {
                                            userResult = userResult.msg;
                                            let walletOutput = await common.getbalance(userId, currencyResult.currencyId); //** user wallet details fetch */
                                            // console.log("walletOutput=============", walletOutput);
                                            if (walletOutput) {
                                                let fromType = '', toType = '';
                                                if (data.fromAccount == 'Loan Wallet') {
                                                    fromType = 'cryptoLoanAmount';
                                                    toType = 'amount';
                                                }
                                                if (walletOutput[fromType] < data.amount) {
                                                    return res.json({ status: false, message: "Insufficient balance" })
                                                } else {
                                                    let sendAmount = +data.amount;
                                                    let values = {
                                                        userId: userId,
                                                        type: "Wallet Transfer",
                                                        txnId: data.fromAccount + " To " + data.toAccount,
                                                        amount: sendAmount,
                                                        receiveAmount: sendAmount,
                                                        usdAmount: sendAmount,
                                                        status: 1,
                                                        currencyId: currencyResult._id,
                                                        walletCurrencyId: currencyResult.currencyId
                                                    };
                                                    let insertedOutput = await query_helper.insertData(Transactions, values); //** transaction create */
                                                    if (insertedOutput.status) {
                                                        common.userNotification(userId, 'Wallet Transfer', 'You have Transferred ' + sendAmount + ' ' + currencyResult.currencySymbol + ' From ' + data.fromAccount + " To " + data.toAccount);
                                                        //** loan notification functions */
                                                        let activity = common.activity(req);
                                                        activity.browser = (typeof activity.browser == 'string') ? activity.browser : loginType + ' Application';
                                                        let userActData = await query_helper.findoneData(activityDB, { userId: req.userId, ip: activity.ip, type: "Wallet Transfer" }, {})
                                                        if (!userActData.status) {
                                                            common.userNotify({
                                                                userId: req.userId,
                                                                reason: 'Wallet Transfer',
                                                                detail: {
                                                                    browser: activity.browser,
                                                                    ip: activity.ip,
                                                                    amount: sendAmount,
                                                                    currencySymbol: currencyResult.currencySymbol,
                                                                    fromAccount: data.fromAccount,
                                                                    toAccount: data.toAccount
                                                                }
                                                            });
                                                        }
                                                        insertedOutput = insertedOutput.msg
                                                        let newbal = 0;
                                                        // console.log("walletOutput=============", +walletOutput);
                                                        if (fromType == 'amount') {
                                                            newbal = (+walletOutput.amount) - (+data.amount);
                                                            newLoanBal = (+walletOutput.cryptoLoanAmount) + (+data.amount)
                                                        } else {
                                                            newbal = (+walletOutput.amount) + (+data.amount);
                                                            newLoanBal = (+walletOutput.cryptoLoanAmount) - (+data.amount)
                                                        }
                                                        await common.updateCryptoLoanAmount(userId, currencyResult.currencyId, +newLoanBal, insertedOutput._id, ' From ' + data.fromAccount + " To " + data.toAccount);
                                                        let updateBalance = await common.updateUserBalance(userId, currencyResult.currencyId, newbal, insertedOutput._id, data.fromAccount + " To " + data.toAccount);
                                                        let configResult = await query_helper.findoneData(emailTemplate, { hint: 'user-transfer' }, {});
                                                        if (updateBalance) {
                                                            if (configResult.status) {
                                                                configResult = configResult.msg;
                                                                let emailtemplate = configResult.content.replace(/###NAME###/g, userResult.username).replace(/###CURRENCY###/g, currencyResult.currencySymbol).replace(/###AMOUNT###/g, common.roundValuesMail(+data.amount, 8));
                                                                mail_helper.sendMail({ subject: configResult.subject + " - " + data.fromAccount + " To " + data.toAccount, to: userResult.email, html: emailtemplate }, (aftermail) => {
                                                                });
                                                            }
                                                            res.json({ status: true, message: "Amount transferred successfully!" });
                                                        } else {
                                                            res.json({ status: false, message: "Oops! Something went wrong. Please try again" })
                                                        }
                                                    } else {
                                                        res.json({ status: false, message: "Oops! Something went wrong. Please try again" })
                                                    }
                                                }
                                            } else {
                                                res.json({ status: false, message: "Oops! Something went wrong. Please try again" })
                                            }
                                        } else {
                                            res.json({ status: false, message: "Not a valid User" })
                                        }
                                    }
                                    else {
                                        let message = data.fromAccount == 'Main Wallet' ? 'Main Wallet Transfer Disabled By Admin' : 'Wallet Transfer Disabled By Admin';
                                        res.json({ status: false, message: message })
                                    }
                                }
                                else {
                                    res.json({ status: false, message: "Transfer for this currency is disabled" })
                                }
                            } else {
                                res.json({ status: false, message: "Please enter valid amount" })
                            }
                        } else {
                            res.json({ status: false, message: "Currency status is not in active state" })
                        }
                    } else {
                        res.json({ status: false, message: "Not a valid currency" })
                    }
                } else {
                    setTimeout(_intervalFunc, 5000, userId);
                    res.json({ status: false, message: "Please wait for 5 seconds before placing another request!" });
                }
            } else {
                return res.json({ status: false, message: "Please wait for 5 minutes before placing another request!" })
            }
        } catch (e) {
            console.log('submitTransfer', e);
            res.json({ "status": false, "message": "Something went wrong" });
        }
    },
    async submitWithdraw(req, res) {
        let errMsg = "";
        try {
            if (common.getSiteDeploy() == 0) {
                let data = req.body;
                const orderwith = oArray.indexOf(req.userId.toString());
                let userId = mongoose.Types.ObjectId(req.userId);
                if (orderwith == -1) {
                    oArray.push(userId.toString())
                    setTimeout(_intervalFunc, 5000, userId.toString());
                    let currencyResult = await query_helper.findoneData(Currency, { _id: mongoose.Types.ObjectId(data.currencyId) }, {});
                    if (currencyResult.status) {
                        currencyResult = currencyResult.msg;
                        currencyResult.USDvalue = currencyResult.currencySymbol == 'USDT' ? 1 : currencyResult.USDvalue;
                        if (currencyResult.status == 1) {
                            if (data.amount > 0) {
                                let checkUser = await query_helper.findoneData(stakeEnableList, { userId: userId }, {});
                                if (currencyResult.withdrawEnable == 1) {
                                    if (checkUser.status == true) {
                                        res.json({ status: false, message: "Withdrawal suspended!", type: 0 })
                                    } else {
                                        let userResult = await query_helper.findoneData(Users, { _id: userId }, {});
                                        if (userResult.status) {
                                            userResult = userResult.msg;
                                            userResult.withdrawDisable = typeof userResult.withdrawDisable == 'number' ? userResult.withdrawDisable : 0;
                                            if (userResult.withdrawDisable == 0) {
                                                if (userResult.kycstatus == 1 && typeof userResult.tfaenablekey != "undefined" && typeof userResult.tfaenablekey != undefined && typeof userResult.tfaenablekey != '' && userResult.tfaenablekey != '') {
                                                    let validatorSymbol = currencyResult.currencySymbol;
                                                    if (currencyResult.basecoin != 'Coin') {
                                                        validatorSymbol = common.currencyToken(currencyResult.basecoin);
                                                    }
                                                    let addressContent = '';
                                                    // let addressContent = data.address;
                                                    if (currencyResult.curnType == 'Crypto') {
                                                        addressContent = '<p>Withdraw Address:   <b>' + data.address + '</b></p>';
                                                        let valid = common.addressvalidator(data.address, validatorSymbol)
                                                        if (!valid) {
                                                            res.json({ status: false, message: "Invalid Address", type: 0 });
                                                            return false;
                                                        }

                                                        if (data.address) {
                                                            let AddressDet = await query_helper.findoneData(CoinAddress, { currencyid: mongoose.Types.ObjectId(data.currencyId), user_id: userId }, {})
                                                            if (AddressDet.status && AddressDet.msg && AddressDet.msg.address) {
                                                                AddressDet = AddressDet.msg;
                                                                if (AddressDet.address.toString() == data.address.toString()) {
                                                                    res.json({ status: false, message: "Please enter valid Address", type: 0 });
                                                                    return false;
                                                                }
                                                            }
                                                        }
                                                        else {
                                                            res.json({ status: false, message: "Please enter valid Address", type: 0 });
                                                            return false;
                                                        }
                                                    } else {
                                                        addressContent = '';
                                                        // if(userResult.bankstatus != 1) {
                                                        //     res.json({ status: false, message: "Please Verify Bank to Continue Fiat Withdraw!", type:4 });
                                                        //     return false;
                                                        // }
                                                    }

                                                    // currencyId: currencyResult._id,
                                                    if (validatorSymbol == "INR") {
                                                        let txnOld = await query_helper.findoneData(Transactions, { userId, type: "Withdraw", status: 0, currencyId: mongoose.Types.ObjectId(data.currencyId) }, {}, {});
                                                        if (txnOld.status) {
                                                            return res.json({ "status": false, "message": 'Your previous INR Withdraw request is Pending!' });
                                                        }
                                                    }

                                                    userResult.level = typeof userResult.level == 'number' ? userResult.level : 1;
                                                    const feeData = (typeof currencyResult.withdrawLevel == 'object' && typeof currencyResult.withdrawLevel['level' + userResult.level] == 'object') ? currencyResult.withdrawLevel['level' + userResult.level] : ((typeof currencyResult.withdrawLevel['level1'] == 'object') ? currencyResult.withdrawLevel['level1'] : { fees: 0, feetype: 0, minwithamt: 0 });
                                                    if (feeData.minwithamt <= data.amount) {
                                                        let dailyDate = new Date();
                                                        dailyDate.setDate(dailyDate.getDate() - 1);
                                                        let monthlyDate = new Date();
                                                        monthlyDate.setMonth(monthlyDate.getMonth() - 1);
                                                        Transactions.aggregate([
                                                            {
                                                                $match: {
                                                                    userId: userId,
                                                                    type: "Withdraw",
                                                                    status: { $in: [0, 1, 3, 5, 6] },
                                                                    createdDate: { $gte: dailyDate }
                                                                }
                                                            },
                                                            {
                                                                "$group": {
                                                                    "_id": '$userId',
                                                                    volume: { $sum: '$usdAmount' }
                                                                }
                                                            },
                                                            {
                                                                $project: { volume: "$volume" },
                                                            }
                                                        ]).exec(async function (err, result) {
                                                            let totalDailyVolume = 0;
                                                            try {
                                                                if (result.length > 0) {
                                                                    if (result[0].volume > 0) {
                                                                        totalDailyVolume = result[0].volume;
                                                                    }
                                                                }
                                                            } catch (e) {
                                                                console.log('submitWithdraw', e);

                                                            }
                                                            Transactions.aggregate([
                                                                {
                                                                    $match: {
                                                                        userId: userId,
                                                                        type: "Withdraw",
                                                                        status: { $in: [0, 1, 3, 5, 6] },
                                                                        createdDate: { $gte: monthlyDate }
                                                                    }
                                                                },
                                                                {
                                                                    "$group": {
                                                                        "_id": '$userId',
                                                                        volume: { $sum: '$usdAmount' }
                                                                    }
                                                                },
                                                                {
                                                                    $project: { volume: "$volume" },
                                                                }
                                                            ]).exec(async function (err, result1) {
                                                                let totalMonthlyVolume = 0;
                                                                try {
                                                                    if (result1.length > 0) {
                                                                        if (result1[0].volume > 0) {
                                                                            totalMonthlyVolume = result1[0].volume;
                                                                        }
                                                                    }
                                                                } catch (e) {
                                                                    console.log('submitWithdraw', e);
                                                                }
                                                                let resdata = await query_helper.findoneData(siteSettings, {}, {});
                                                                resdata = resdata.msg;
                                                                const curVolume = data.amount * currencyResult.USDvalue;
                                                                const totalDailyVolume1 = totalDailyVolume + curVolume;
                                                                const limit = (typeof resdata.withdrawLevel == 'object' && typeof resdata.withdrawLevel['level'+userResult.level] == 'object') ? resdata.withdrawLevel['level'+userResult.level] : {dailyVolume: 0, monthlyVolume:0};
                                                                // if(totalDailyVolume1 <= 100000000000) {}
                                                                if(totalDailyVolume1 <= limit.dailyVolume || limit.dailyVolume == 0) {
                                                                    const totalMonthlyVolume1 = totalMonthlyVolume + curVolume;
                                                                    if (totalMonthlyVolume1 <= limit.monthlyVolume || limit.monthlyVolume == 0) {
                                                                        let walletOutput = await common.getbalance(userId, currencyResult.currencyId)
                                                                        if (walletOutput) {
                                                                            if (walletOutput.amount < data.amount) {
                                                                                return res.json({ status: false, message: "Insufficient balance", type: 0 })
                                                                            } else {
                                                                                if (
                                                                                    (typeof data.withdrawOTP != 'undefined' && typeof data.withdrawOTP != undefined && data.withdrawOTP != '')
                                                                                    &&
                                                                                    (typeof data.tfaCode != undefined && typeof data.tfaCode != 'undefined')
                                                                                ) {
                                                                                    const verifyOTP = await query_helper.findData(VerifyUsers, { email: userResult.email, type: 'withdraw' }, { otp: 1, otpTime: 1, dateTime: 1 }, { _id: -1 }, 0);
                                                                                    if (verifyOTP.status && verifyOTP.msg.length > 0) {
                                                                                        if (data.withdrawOTP == verifyOTP.msg[0].otp) {
                                                                                            let otpExpireStatus = common.otpExpireCheck({ start: verifyOTP.msg[0].otpTime })
                                                                                            if (otpExpireStatus === false) {
                                                                                                return res.json({ status: false, message: 'Your withdraw verification code has expired' });
                                                                                            }
                                                                                            let token = speakeasy.totp.verify({
                                                                                                secret: userResult.tfaenablekey,
                                                                                                encoding: 'base32',
                                                                                                token: data.tfaCode
                                                                                            });
                                                                                            if (token) {
                                                                                                if (currencyResult.currencySymbol == 'XRP' && (typeof data.tag == 'string' && data.tag == 'false')) {
                                                                                                    return res.json({ "status": false, "message": "XRP Withdrawals Disabled on Application, Kindly Try Withdrawal on Website", type: 0 });
                                                                                                } else {
                                                                                                    let sendAmount = 0, fee = 0;
                                                                                                    if (feeData.feetype == 0) {
                                                                                                        fee = feeData.fees;
                                                                                                        sendAmount = (+data.amount) - (+fee)
                                                                                                    } else {
                                                                                                        fee = (+data.amount) * (+feeData.fees) / 100;
                                                                                                        sendAmount = (+data.amount) - (+fee);
                                                                                                    }
                                                                                                    let values = {
                                                                                                        userId: userId,
                                                                                                        address: typeof data.address == 'string' ? data.address : '',
                                                                                                        type: "Withdraw",
                                                                                                        txnId: "",
                                                                                                        amount: data.amount,
                                                                                                        usdAmount: curVolume,
                                                                                                        tag: typeof data.tag == 'string' ? data.tag : '',
                                                                                                        fees: common.roundValuesMail(fee, 8),
                                                                                                        receiveAmount: common.roundValuesMail(sendAmount, 8),
                                                                                                        currencyId: currencyResult._id,
                                                                                                        walletCurrencyId: currencyResult.currencyId,
                                                                                                        paymentId: data.paymentId
                                                                                                    }
                                                                                                    if (currencyResult.curnType == 'Crypto' && currencyResult.autoWithdraw == 1) {
                                                                                                        values.status = 5;
                                                                                                        values.adminVerify = "verified";
                                                                                                        values.autoWithdraw = 1;
                                                                                                    } else {
                                                                                                        values.status = 0;
                                                                                                    }
                                                                                                    let insertedOutput = await query_helper.insertData(Transactions, values);
                                                                                                    if (insertedOutput.status) {
                                                                                                        insertedOutput = insertedOutput.msg
                                                                                                        let activity = common.activity(req);
                                                                                                        activity.browser = (typeof activity.browser == 'string') ? activity.browser : loginType + ' Application';
                                                                                                        let userActData = await query_helper.findoneData(activityDB, { userId: req.userId, ip: activity.ip, type: "Login" }, {})
                                                                                                        if (!userActData.status) {
                                                                                                            common.userNotification(userId, 'Withdraw Requested', 'You have Requested Withdraw '+(+data.amount)+' '+currencyResult.currencySymbol+ '. Address: '+(typeof data.address == 'string' ? data.address : ''));
                                                                                                            common.userNotify({
                                                                                                                userId: req.userId,
                                                                                                                reason: 'Withdraw Requested',
                                                                                                                activity,
                                                                                                                detail: {
                                                                                                                    currencyId: insertedOutput._id,
                                                                                                                    amount: data.amount,
                                                                                                                    currencySymbol: currencyResult.currencySymbol,
                                                                                                                    address: (typeof data.address == 'string') ? data.address : ''
                                                                                                                }
                                                                                                            });
                                                                                                        }
                                                                                                        let newbal = (+walletOutput.amount) - (+data.amount)
                                                                                                        common.updateHoldAmount(userId, currencyResult.currencyId, +data.amount);
                                                                                                        let updateBalance = await common.updateUserBalance(userId, currencyResult.currencyId, newbal, insertedOutput._id, 'Withdraw')
                                                                                                        if (updateBalance) {
                                                                                                            let email_data = await query_helper.findoneData(emailTemplate, { hint: 'withdraw-completion' }, {})
                                                                                                            if (email_data.status) {
                                                                                                                let etempdataDynamic = email_data.msg.content
                                                                                                                    .replace(/###CURRENCY###/g, currencyResult.currencySymbol)
                                                                                                                    .replace(/###NAME###/g, userResult.username)
                                                                                                                    .replace(/###ADDRESS###/g, addressContent)
                                                                                                                    .replace(/###AMOUNT###/g, data.amount);
                                                                                                                mail_helper.sendMail({ subject: email_data.msg.subject, to: userResult.email, html: etempdataDynamic }, function (res1) {
                                                                                                                });
                                                                                                            }
                                                                                                            res.json({ status: true, message: "Withdraw request processed successfully", type: 3 })
                                                                                                        } else {
                                                                                                            res.json({ status: false, message: "Oops! Unable to update balance. Please try again", type: 0 })
                                                                                                        }
                                                                                                    } else {
                                                                                                        res.json({ status: false, message: "Oops! Unable to insert transactions. Please try again", type: 0 })
                                                                                                    }
                                                                                                }
                                                                                            }
                                                                                            else {
                                                                                                res.json({ status: false, message: "Invalid 2FA Code", type: 0 })
                                                                                            }
                                                                                        } else {
                                                                                            return res.json({ "status": false, "message": "Please enter valid email OTP", type: 0 });
                                                                                        }
                                                                                    } else {
                                                                                        return res.json({ "status": false, "message": "Please enter valid email OTP", type: 0 });
                                                                                    }
                                                                                } else {
                                                                                    let genotp = await common.getOTPCode({ from: "user", userData: userResult });
                                                                                    if (userResult.email) {
                                                                                        let verifyOtp = await query_helper.updateData(
                                                                                            VerifyUsers,
                                                                                            "one",
                                                                                            { email: userResult.email },
                                                                                            { email: userResult.email, otp: genotp, otpTime: new Date(), type: 'withdraw' },
                                                                                            { upsert: true, new: true }
                                                                                        )
                                                                                        if (verifyOtp.status) {
                                                                                            let email_data = await query_helper.findoneData(emailTemplate, { hint: 'withdraw-otp' }, {})
                                                                                            if (email_data.status) {
                                                                                                // await query_helper.updateData(Users, "one", { _id: userResult._id }, { withdraw_otp: genotp, withdraw_otpTime: new Date() });
                                                                                                let etempdataDynamic = email_data.msg.content
                                                                                                    .replace(/###CURRENCY###/g, currencyResult.currencySymbol)
                                                                                                    .replace(/###NAME###/g, userResult.username)
                                                                                                    .replace(/###OTP###/g, genotp)
                                                                                                    .replace(/###ADDRESS###/g, addressContent)
                                                                                                    .replace(/###AMOUNT###/g, data.amount);
                                                                                                mail_helper.sendMail({ subject: email_data.msg.subject, to: userResult.email, html: etempdataDynamic }, function (res1) {
                                                                                                });
                                                                                            }
                                                                                            return res.json({ status: true, message: "OTP sent successfully, Please check your email.", type: 1 })
                                                                                        } else {
                                                                                            res.json({ "status": false, "message": "Something went wrong! Please try again someother time", type: 0 });
                                                                                        }
                                                                                    }
                                                                                    else {
                                                                                        // send sms - need to work - rajams
                                                                                        return res.json({ status: true, message: "OTP sent successfully, Please check your email.", type: 1 })
                                                                                    }
                                                                                }
                                                                            }
                                                                        } else {
                                                                            res.json({ status: false, message: "Oops! unable to find wallet balance. Please try again", type: 0 })
                                                                        }
                                                                    } else {
                                                                        errMsg = "You have existing monthly withdrawal limit! Available limit is " + (limit.monthlyVolume - totalMonthlyVolume).toFixed(2) + " USD.";
                                                                        if (userResult.level == 1) {
                                                                            errMsg = errMsg + " Please verify your KYC."
                                                                        }
                                                                        res.json({ status: false, message: errMsg, type: 0 })
                                                                    }
                                                                } else {
                                                                    errMsg = "You have existing daily withdrawal limit! Available limit is " + (limit.dailyVolume - totalDailyVolume).toFixed(2) + " USD.";
                                                                    if (userResult.level == 1) {
                                                                        errMsg = errMsg + " Please verify your KYC."
                                                                    }
                                                                    res.json({ status: false, message: errMsg, type: 0 })
                                                                }
                                                            });
                                                        });
                                                    } else {
                                                        res.json({ status: false, message: "You should withdraw minimum " + feeData.minwithamt + " " + currencyResult.currencySymbol, type: 0 })
                                                    }
                                                } else {
                                                    res.json({ status: false, message: "Please complete " + (userResult.kycstatus != 1 ? "KYC" : "2FA") + " to process withdraw.", type: 4 })
                                                }
                                            } else {
                                                res.json({ status: false, message: "Your account disabled for withdraw. Kindly contact admin!", type: 0 })
                                            }
                                        } else {
                                            res.json({ status: false, message: "Not a valid user", type: 0 })
                                        }
                                    }
                                } else {
                                    res.json({ status: false, message: "Withdraw for this currency is disabled", type: 0 })
                                }
                            } else {
                                res.json({ status: false, message: "Please enter valid amount", type: 0 })
                            }
                        } else {
                            res.json({ status: false, message: "Currency status is not in active state", type: 0 })
                        }
                    } else {
                        res.json({ status: false, message: "Not a valid currency", type: 0 })
                    }
                } else {
                    setTimeout(_intervalFunc, 5000, req.userId);
                    res.json({ status: false, message: "Please wait for 5 seconds before placing another request!", type: 0 });
                }
            } else {
                return res.json({ status: false, message: "Please wait for 5 minutes before placing another request!" })
            }
        } catch (e) {
            console.log('submitWithdraw', e);
            res.json({ "status": false, "message": "Something went wrong", type: 0 });
        }
    },
    async processWithdrawal() {
        try {
            if (common.getSiteDeploy() == 0) {
                let transresult = await Transactions.find({ status: 5, adminVerify: 'verified' }).sort({ _id: 1 }).populate("userId", "username email").populate("currencyId", "currencyName currencySymbol decimal curnType cointype basecoin currencyId contractAddress");
                if (transresult && transresult.length > 0) {
                    let allOrders = [];
                    transresult.forEach(element => {
                        allOrders.push(element._id);
                    });
                    await query_helper.updateData(Transactions, 'many', { _id: { $in: allOrders } }, { status: 6 });
                    processUserWithdrawal(transresult, 0);
                }
            }
        } catch (e) {
            console.log('processWithdrawal', e);
        }
    },
    async getWithdrawCurrency(req, res) {
        try {
            let currencyList = await query_helper.findData(Currency, { status: 1, withdrawEnable: 1, curnType: 'Crypto' }, { currencySymbol: 1, basecoin: 1, INRvalue: 1 }, { _id: -1 }, 0);
            let responseData = [];
            if (currencyList.status && currencyList.msg.length > 0) {
                currencyList.msg.forEach((entry) => {
                    const obj = {
                        _id: entry._id,
                        INRvalue: entry.INRvalue,
                        currencySymbol: entry.currencySymbol + (entry.basecoin != 'Coin' ? ' - ' + entry.basecoin : '')
                    }
                    responseData.push(obj);
                });
                res.json({ status: true, data: responseData });
            }
        } catch (e) {
            console.log('getWithdrawCurrency', e);
            res.json({ status: false, errMsg: "Something went wrong" });
        }
    },
    async depositFiat(req, res) {
        try {
            if (common.getSiteDeploy() == 0) {
                let profile = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.userId) }, {});
                if (profile.status) {
                    if (profile.msg.kycstatus == 1 && profile.msg.bankstatus == 1) {
                        if (typeof req.body.amount != 'undefined' && typeof req.body.amount != undefined && req.body.amount > 0 && typeof req.body.transactionNumber != 'undefined' && typeof req.body.transactionNumber != undefined && req.body.transactionNumber != '' && typeof req.body.attachment != 'undefined' && typeof req.body.attachment != undefined && req.body.attachment != '' && req.body.attachment.trim() != '') {
                            let txnOld = await query_helper.findoneData(Transactions, { "userId": mongoose.Types.ObjectId(req.userId), type: "Deposit", status: 0 }, {}, {});
                            if (txnOld.status) {
                                return res.json({ "status": false, "message": 'Your previous INR deposit request is Pending!' });
                            }
                            else {
                                let txn = await query_helper.findoneData(Transactions, { type: "Deposit", txnId: req.body.transactionNumber.trim().toLowerCase(), status: { $in: [0, 1, 3] } }, {}, {});
                                if (!txn.status) {
                                    let currency = await query_helper.findoneData(Currency, { currencySymbol: "INR" }, {});
                                    let walletCurrency = await query_helper.findoneData(CurrencySymbol, { currencySymbol: "INR" }, {});
                                    if (currency.status) {
                                        let currencyResult = currency.msg;
                                        if (currencyResult.status == 1) {
                                            if (currencyResult.depositEnable == 1) {
                                                let resData = await query_helper.findoneData(siteSettings, {}, {});
                                                resData = resData.msg;
                                                if (resData.minDeposit <= req.body.amount) {
                                                    let depositType = (typeof req.body.depositType == "string" && (req.body.depositType == "Wallet Balance" || req.body.depositType == "Pre Booking")) ? req.body.depositType : "Wallet Balance";
                                                    let typeStatus = 0;
                                                    if (depositType == "Pre Booking") {
                                                        if (resData.preBookingStatus == 1) {
                                                            let curDate = new Date();
                                                            curDate = new Date(curDate.setMinutes(curDate.getMinutes() + 330));
                                                            let hour = curDate.getHours();
                                                            const timeList = resData.preBookingTime.split(",");
                                                            timeList.forEach((element) => {
                                                                let preBookingTime = element.split('-');
                                                                preBookingTime = preBookingTime.length == 2 ? preBookingTime : [10, 12];
                                                                if (hour >= preBookingTime[0] && hour <= preBookingTime[1]) {
                                                                    typeStatus = 1;
                                                                }
                                                            });
                                                        }
                                                    } else {
                                                        typeStatus = 1;
                                                    }
                                                    if (typeStatus == 1) {
                                                        let objInsert = {
                                                            "userId": mongoose.Types.ObjectId(req.userId),
                                                            "currencyId": currency.msg._id,
                                                            "walletCurrencyId": walletCurrency.msg._id,
                                                            "type": 'Deposit',
                                                            "txnId": req.body.transactionNumber.trim().toLowerCase(),
                                                            "attachment": req.body.attachment,
                                                            "amount": req.body.amount,
                                                            "receiveAmount": req.body.amount,
                                                            "status": 0,
                                                            "depositType": depositType
                                                        }
                                                        let txnIns = await query_helper.insertData(Transactions, objInsert);
                                                        let activity = common.activity(req);
                                                        activity.browser = (typeof activity.browser == 'string') ? activity.browser : loginType + ' Application';
                                                        let userActData = await query_helper.findoneData(activityDB, { userId: req.userId, ip: activity.ip, type: "Deposit Fiat" }, {})
                                                        if (!userActData.status) {
                                                            common.userNotify({
                                                                userId: req.userId,
                                                                reason: 'Deposit Fiat',
                                                                activity,
                                                                detail: {
                                                                    currencyId: currency.msg._id,
                                                                    amount: req.body.amount,
                                                                    currencySymbol: currencyResult.currencySymbol,
                                                                }
                                                            });
                                                        }
                                                        if (txnIns) {
                                                            res.json({ "status": true, "message": "Deposit Request Submitted Successfully!" });
                                                        } else {
                                                            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                                                        }
                                                    } else {
                                                        res.json({ "status": false, "message": "Pre Booking Disabled As of now, Please Try Wallet Balance" });
                                                    }
                                                } else {
                                                    res.json({ "status": false, "message": "Minimum deposit amount is " + resData.minDeposit + " INR" });
                                                }
                                            } else {
                                                res.json({ status: false, message: "Deposit for this currency is disabled", type: 0 })
                                            }
                                        }
                                        else {
                                            res.json({ status: false, message: "Currency status is not in active state" })
                                        }
                                    } else {
                                        res.json({ "status": false, "message": 'Not a valid currency!' });
                                    }
                                } else {
                                    res.json({ "status": false, "message": 'Transaction Id Already Exists!' });
                                }
                            }
                        } else {
                            const text = 'Please submit valid details!';
                            res.json({ "status": false, "message": text });
                        }
                    } else {
                        const text = profile.msg.kycstatus == 1 ? 'Bank details not verified yet!' : 'KYC Documents not verified yet!';
                        res.json({ "status": false, "message": text });
                    }
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }
            } else {
                return res.json({ status: false, message: "Please wait for 5 minutes before placing another request!" })
            }
        } catch (e) {
            console.log('depositFiat', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async depositETHTRX(req, res) {
        try {
            if (common.getSiteDeploy() == 0) {
                let GetuserID = req.userId;
                cronRunForETHTRX(GetuserID, res);
            }
        } catch (e) {
            console.log("depositETHTRX", e);
            res.json({ status: false, msg: "Invalid User Request" })
        }
    },
    async depositBNB(req, res) {
        try {
            if (common.getSiteDeploy() == 0) {
                let GetuserID = req.userId;
                const reqBody = req.body;
                apiRunForBNB(GetuserID, reqBody, res);
            }
        } catch (e) {
            console.log("depositETHTRX err : ", e);
            res.json({ status: false, msg: "Invalid User Request" })
        }
    },
    async userDepositETHTRX(req, res) {
        try {
            if (common.getSiteDeploy() == 0) {
                if (typeof req.query.userId == 'string' && req.query.userId != '') {
                    let GetuserID = req.query.userId;
                    cronRunForETHTRX(GetuserID, res);
                } else {
                    res.json({ status: false, msg: "Invalid User Request" })
                }
            } else {
                return res.json({ status: false, msg: "Please wait for 5 minutes before placing another request!" })
            }
        } catch (e) {
            console.log("userDepositETHTRX err : ", e);
            res.json({ status: false, msg: "Invalid User Request" })
        }
    },
    async CreateAdminAddress(req, res) {
        const {
            Cursymbol
        } = req.body;
        const GetCoin = require('../../helpers/CoinTransactions/' + Cursymbol + '.js');
        GetCoin.CreateAdminAddress(function (addressDet) {
            res.json({ addressDet });
        });
    },
    async listAddress(req, res) {
        const getCoin = require('../../helpers/CoinTransactions/ETH.js');
        getCoin.listAddress(async function (resp) {
            res.json({ status: true, data: resp })
        });
    },
    async getAddressBalance(req, res) {
        try {
            console.log("getAddressBalance : ");
            const getCoin = require('../../helpers/CoinTransactions/' + req.query.currency + '.js');
            getCoin.getBalance(req.query.address, async function (resp) {
                res.json({ status: true, balance: resp })
            });
        } catch (e) {
            console.log("getAddressBalance", e);
            res.json({ status: true, balance: 0 })
        }
    },
    async GetInfo(req, res) {
        const getCoin = require('../../helpers/CoinTransactions/BTC.js');
        getCoin.GetInfo(async function (resp) {
            res.json({ status: true, data: resp })
        });
    }
};
let oArray = [];

function retMessage(data = {}) {
    setTimeout(_intervalFunc, 300, data.userId.toString());
    return data.res.json(data.retData);
}

function _intervalFunc(orderwith) {
    orderwith = orderwith.toString();
    var index = oArray.indexOf(orderwith);
    if (index > -1) {
        oArray.splice(index, 1);
    }
}
async function cronRunForETHTRX(GetuserID, res) {
    const orderwith = oArray.indexOf(GetuserID);
    if (orderwith == -1) {
        oArray.push(GetuserID.toString())
        setTimeout(_intervalFunc, 60000, GetuserID);

        // console.log("Coindeposit : BNB");
        await common.Coindeposit('BNB', mongoose.Types.ObjectId(GetuserID));
        // console.log("TokenDeposit : BNB");
        await common.TokenDeposit('BNB', mongoose.Types.ObjectId(GetuserID));

        // console.log("Coindeposit : ETH");
        await common.Coindeposit('ETH', mongoose.Types.ObjectId(GetuserID));
        // console.log("TokenDeposit : ETH");
        await common.TokenDeposit('ETH', mongoose.Types.ObjectId(GetuserID));

        // console.log("Coindeposit : TRX");
        await common.Coindeposit('TRX', mongoose.Types.ObjectId(GetuserID));
        // console.log("TokenDeposit : TRX");
        await common.TokenDeposit('TRX', mongoose.Types.ObjectId(GetuserID));

        // await common.Coindeposit('MATIC', mongoose.Types.ObjectId(GetuserID));
        // await common.TokenDeposit('MATIC', mongoose.Types.ObjectId(GetuserID));

        return res.json({ status: true });

        // const userDepositList = await query_helper.findData(Transactions,{userId: mongoose.Types.ObjectId(GetuserID)},{},{_id:-1},0);
        // const userDepositListData = (userDepositList && userDepositList.msg) ? userDepositList.msg : [];

        // res.json({ status: true, userDepositList : userDepositListData });
    } else {
        setTimeout(_intervalFunc, 60000, GetuserID);
        res.json({ status: false, msg: "You can able to request 60 seconds once" });
    }
}
async function apiRunForBNB(GetuserID, reqBody, res) {
    // return true;
    const orderwith = oArray.indexOf(GetuserID);
    if (orderwith == -1) {
        oArray.push(GetuserID.toString())
        setTimeout(_intervalFunc, 60000, GetuserID);
        const depositTrxByBlock = await common.Coindeposit('BNB', mongoose.Types.ObjectId(GetuserID), reqBody);
        if (depositTrxByBlock && depositTrxByBlock.status === false && depositTrxByBlock.error) {
            return res.json({ status: false, error: depositTrxByBlock.error });
        }
        else if (!depositTrxByBlock) {
            res.json({ status: false });
        }
        // const userDepositList = await query_helper.findData(Transactions,{userId: mongoose.Types.ObjectId(GetuserID)},{},{_id:-1},0);
        // const userDepositListData = (userDepositList && userDepositList.msg) ? userDepositList.msg : [];
        // userDepositList : userDepositListData
        res.json({ status: true, depositTrxByBlock });
    } else {
        setTimeout(_intervalFunc, 60000, GetuserID);
        res.json({ status: false, msg: "You can able to request 60 seconds once" });
    }
}
async function processUserWithdrawal(transactions, autoInc) {
    try {
        let transresult = transactions[autoInc];
        let userId = transresult.userId._id;
        let userresult = await query_helper.findoneData(Users, { _id: userId }, {})
        if (userresult.status) {
            userresult = userresult.msg;
            let resdata = await query_helper.findoneData(siteSettings, {}, {});
            resdata = resdata.msg;
            let curnResult = await query_helper.findoneData(Currency, { _id: mongoose.Types.ObjectId(transresult.currencyId._id) }, {});
            if (curnResult.status) {
                curnResult = curnResult.msg;
                if (curnResult.curnType == 'Crypto') {
                    common.CoinWithdraw(curnResult.currencySymbol, transresult, curnResult, async function (txnId) {
                        if (txnId.status) {
                            common.updateHoldAmount(userId, transresult.walletCurrencyId, -(+transresult.amount));
                            let updateddata = await query_helper.updateData(Transactions, 'one', { _id: transresult._id }, { status: txnId.Tstatus, txnId: txnId.txnId })
                            if (updateddata.status) {
                                if (txnId.Tstatus == 1 && txnId.txnId != '') {
                                    let profitToAdmin = {
                                        type: 'Withdraw',
                                        userId: userId,
                                        currencyId: transresult.currencyId._id,
                                        fees: transresult.fees,
                                        usdFees: transresult.fees * curnResult.USDvalue
                                    }
                                    await query_helper.insertData(profit, profitToAdmin);
                                    autoInc = autoInc + 1;
                                    if (typeof transactions[autoInc] == 'object') {
                                        processUserWithdrawal(transactions, autoInc);
                                    }
                                } else {
                                    await query_helper.updateData(Transactions, 'one', { _id: transresult._id }, { status: 5 });
                                    autoInc = autoInc + 1;
                                    if (typeof transactions[autoInc] == 'object') {
                                        processUserWithdrawal(transactions, autoInc);
                                    }
                                }
                            } else {
                                await query_helper.updateData(Transactions, 'one', { _id: transresult._id }, { status: 5 });
                                autoInc = autoInc + 1;
                                if (typeof transactions[autoInc] == 'object') {
                                    processUserWithdrawal(transactions, autoInc);
                                }
                            }
                        } else {
                            await query_helper.updateData(Transactions, 'one', { _id: transresult._id }, { status: 5 });
                            autoInc = autoInc + 1;
                            if (typeof transactions[autoInc] == 'object') {
                                processUserWithdrawal(transactions, autoInc);
                            }
                        }
                    });
                } else {
                    await query_helper.updateData(Transactions, 'one', { _id: transresult._id }, { status: 5 });
                    autoInc = autoInc + 1;
                    if (typeof transactions[autoInc] == 'object') {
                        processUserWithdrawal(transactions, autoInc);
                    }
                }
            } else {
                await query_helper.updateData(Transactions, 'one', { _id: transresult._id }, { status: 5 });
                autoInc = autoInc + 1;
                if (typeof transactions[autoInc] == 'object') {
                    processUserWithdrawal(transactions, autoInc);
                }
            }
        } else {
            await query_helper.updateData(Transactions, 'one', { _id: transresult._id }, { status: 5 });
            autoInc = autoInc + 1;
            if (typeof transactions[autoInc] == 'object') {
                processUserWithdrawal(transactions, autoInc);
            }
        }
    } catch (e) {
        console.log('processUserWithdrawal', e)
    }
}
module.exports = customerWalletController;