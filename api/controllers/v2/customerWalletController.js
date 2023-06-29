const mongoose = require('mongoose');
let speakeasy = require('speakeasy');

const UserWallet = mongoose.model("UserWallet");
const Currency = mongoose.model("Currency");

const query_helper = require('../../helpers/query');
let common = require('../../helpers/common');
const mail_helper = require('../../helpers/mailHelper');

let updateInternal = 0;
let stakeBonuses = {};

const customerWalletController = {
    async getWalletCurrency (req, res) {
        try {
            let where = {currencySymbol: 'INR'};
            let currencyINR = await query_helper.findoneData(Currency, where, {})
            let inrValue = (currencyINR.status && currencyINR.msg.USDvalue > 0) ? currencyINR.msg.USDvalue : 0;
            let walletHistory = await query_helper.findData(UserWallet,{userId: mongoose.Types.ObjectId(req.userId)},{},{amount:1},0);
            let walletBalances = {};
            if(walletHistory.status && walletHistory.msg.length > 0) {
                for (const wallet of walletHistory.msg) {
                    walletBalances[wallet.currencyId] = {
                        amount: wallet.amount, 
                        hold: 0, 
                        stakingAmount: wallet.stakingAmount, 
                        stakingHold: 0, 
                        p2pAmount:wallet.p2pAmount, 
                        p2pHold:wallet.p2pHold, 
                        perpetualAmount:wallet.perpetualAmount, 
                        perpetualHold:wallet.perpetualHold,
                        cryptoLoanAmount: wallet.cryptoLoanAmount,
                        cryptoLoanHold: wallet.cryptoLoanHold
                    };
                }
            }
            let estimateINR = 0;
            let estimateUSD = 0;
            let estimatep2pINR = 0;
            let estimatep2pUSD = 0;

            // let currency = await query_helper.findData(Currency,{status:1},{},{currencySymbol:1},0);
            // let currencyList = currency.msg;

            const currencyList = await Currency.aggregate([
                {
                    $match: {
                        status:1,
                    }
                },
                {
                    $sort: {
                        currencySymbol: 1
                    }
                },
                {
                    $lookup: {
                        from: 'Pairs',
                        let: {
                            currencySymbol: '$currencySymbol',
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                $regexMatch: {
                                                    input: "$pair",
                                                    regex: "$$currencySymbol",
                                                    options: "i"
                                                }
                                            },
                                            {
                                                status: 1
                                            }
                                        ]
                                    }
                                }
                            },                        
                            {
                                $limit: 1
                            },
                            {
                                $project: {
                                    pair: 1
                                }
                            }
                        ],
                        as: 'firstTradePair'
                    }
                },
                {
                    $unwind: {
                      "path": "$firstTradePair",
                      "preserveNullAndEmptyArrays": true
                    }
                  },
            ]);

            let responseData = [];
            let checkExist = {};
            let countInc = 0;
            currencyList.forEach((entry) => {
                if(typeof checkExist[entry.currencyId] == 'number') {
                    let entryData = JSON.parse(JSON.stringify(responseData[checkExist[entry.currencyId]]));
                    entryData.count = entryData.count+1;
                    entryData.ids.push({_id: entry._id, basecoin: entry.basecoin, depositEnable: entry.depositEnable, withdrawEnable: entry.withdrawEnable});
                    responseData[checkExist[entry.currencyId]] = entryData;
                } else {
                    checkExist[entry.currencyId] = countInc;
                    let entryData = JSON.parse(JSON.stringify(entry));
                    if(typeof walletBalances[entry.currencyId] == 'object') {
                        entryData.balance = walletBalances[entry.currencyId].amount;
                        entryData.hold = walletBalances[entry.currencyId].hold;
                        entryData.stakingAmount = walletBalances[entry.currencyId].stakingAmount;
                        entryData.stakingHold = walletBalances[entry.currencyId].stakingHold;
                        entryData.p2pHold = walletBalances[entry.currencyId].p2pHold;
                        entryData.p2pAmount=  walletBalances[entry.currencyId].p2pAmount;
                        entryData.perpetualAmount=  walletBalances[entry.currencyId].perpetualAmount;
                        entryData.perpetualHold=  walletBalances[entry.currencyId].perpetualHold;
                        entryData.cryptoLoanAmount = walletBalances[entry.currencyId].cryptoLoanAmount;
                        entryData.cryptoLoanHold = walletBalances[entry.currencyId].cryptoLoanHold;

                    } else {
                        entryData.balance = 0;
                        entryData.hold = 0;
                        entryData.stakingAmount = 0;
                        entryData.stakingHold = 0;
                        entryData.p2pAmount = 0;
                        entryData.p2pHold = 0;
                        entryData.perpetualAmount = 0;
                        entryData.perpetualHold = 0;
                        entryData.cryptoLoanAmount = 0;
                        entryData.cryptoLoanHold = 0;
                    }
                    
                    if(entryData.balance > 0) {
                        const usdSpot = (entryData.balance > 0 && entryData.USDvalue > 0 ? entryData.USDvalue * entryData.balance : 0);
                        estimateUSD = estimateUSD + usdSpot;

                        const inrSpot = entryData.balance ? (entryData.balance) * (inrValue > 0 ? entryData.USDvalue / inrValue : 0) : 0;
                        estimateINR = estimateINR + inrSpot;
                    }

                    if(entryData.p2pAmount > 0) {
                        const usdP2P = (entryData.p2pAmount > 0 && entryData.USDvalue > 0 ? entryData.USDvalue * entryData.p2pAmount : 0);
                        estimatep2pUSD = estimatep2pUSD + usdP2P;

                        const inrP2P = (entryData.p2pAmount) * (inrValue > 0 ? entryData.USDvalue / inrValue : 0);
                        estimatep2pINR = estimatep2pINR + inrP2P;
                    }

                    entryData.count = 1;
                    entryData.ids = [{_id: entryData._id, basecoin: entryData.basecoin, depositEnable: entry.depositEnable, withdrawEnable: entry.withdrawEnable}];
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
                estimatep2pINR,
                estimatep2pUSD,
                isDisable: {
                    estimateINR: true,
                    estimateUSD: false,
                    estimatep2pINR: true,
                    estimatep2pUSD: false
                }
            });
        } catch (e) {
            console.log('getWalletCurrency', e);
            res.json({
                "status": false,
                "data": [],
                estimateINR: 0,
                estimateUSD: 0,
                estimatep2pINR: 0,
                estimatep2pUSD: 0,
                isDisable: {
                    estimateINR: true,
                    estimateUSD: false,
                    estimatep2pINR: true,
                    estimatep2pUSD: false
                }
            });
        }
    },
    async getSpotHoldings (req, res) {
        try {
            const {
                query: reqQuery = {},
            } = req;
            let {
                holdChk = "spot"
            } = reqQuery;

            if(holdChk === "spot") {
                holdChk = "amount"
            }
            else if(holdChk === "p2p") {
                holdChk = "p2pAmount"
            }
            let where = {currencySymbol: 'INR'};
            let currencyINR = await query_helper.findoneData(Currency, where, {})
            let inrValue = (currencyINR.status && currencyINR.msg.USDvalue > 0) ? currencyINR.msg.USDvalue : 0;
            let walletHistory = await query_helper.findData(UserWallet,{userId: mongoose.Types.ObjectId(req.userId)},{},{_id:-1},0);
            let walletBalances = {};
            if(walletHistory.status && walletHistory.msg.length > 0) {
                for (const wallet of walletHistory.msg) {
                    walletBalances[wallet.currencyId] = {amount: wallet.amount, hold: 0, stakingAmount: wallet.stakingAmount, stakingHold: 0, p2pAmount:wallet.p2pAmount, p2pHold:wallet.p2pHold, perpetualAmount:wallet.perpetualAmount, perpetualHold:wallet.perpetualHold};
                }
            }
            let estimateINR = 0;
            let estimateUSD = 0;
            let currency = await query_helper.findData(Currency,{status:1},{},{currencySymbol:1},0);
            let responseData = [];
            let checkExist = {};
            let countInc = 0;

            currency.msg.forEach((entry) => {
                if(walletBalances && walletBalances[entry.currencyId] && walletBalances[entry.currencyId][holdChk] > 0) {
                    if(typeof checkExist[entry.currencyId] == 'number') {
                        let entryData = JSON.parse(JSON.stringify(responseData[checkExist[entry.currencyId]]));
                        entryData.count = entryData.count+1;
                        entryData.ids.push({_id: entry._id, basecoin: entry.basecoin, depositEnable: entry.depositEnable, withdrawEnable: entry.withdrawEnable});
                        responseData[checkExist[entry.currencyId]] = entryData;
                    } else {
                        checkExist[entry.currencyId] = countInc;
                        let entryData = JSON.parse(JSON.stringify(entry));
                        if(typeof walletBalances[entry.currencyId] == 'object') {
                            entryData.balance = walletBalances[entry.currencyId].amount;
                            entryData.hold = walletBalances[entry.currencyId].hold;
                            entryData.stakingAmount = walletBalances[entry.currencyId].stakingAmount;
                            entryData.stakingHold = walletBalances[entry.currencyId].stakingHold;
                            entryData.p2pHold = walletBalances[entry.currencyId].p2pHold;
                            entryData.p2pAmount=  walletBalances[entry.currencyId].p2pAmount;
                            entryData.perpetualHold = walletBalances[entry.currencyId].perpetualHold;
                            entryData.perpetualAmount=  walletBalances[entry.currencyId].perpetualAmount;
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
                        entryData.inrValue = (entryData.balance + entryData.stakingAmount) * (inrValue > 0 ? entryData.USDvalue / inrValue : 0);
                        estimateINR = estimateINR + entryData.inrValue;
                        estimateUSD = estimateUSD + entryData.USDvalue;
                        entryData.count = 1;
                        entryData.ids = [{_id: entryData._id, basecoin: entryData.basecoin, depositEnable: entry.depositEnable, withdrawEnable: entry.withdrawEnable}];
                        responseData[countInc] = entryData;
                        countInc++;
                    }
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
    }
}

module.exports = customerWalletController;