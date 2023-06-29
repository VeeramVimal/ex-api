const query_helper = require('../../helpers/query');
const mongoose = require('mongoose');
const Staking = mongoose.model("Staking");
const StakingHistory = mongoose.model("StakingHistory");
const StakeBonusHistory = mongoose.model("StakeBonusHistory");
const Currency = mongoose.model("Currency");
let ReferralDB = mongoose.model('ReferralCommission');
const Users = mongoose.model("Users");
let common = require('../../helpers/common');
const UserWallet = mongoose.model("UserWallet");
const Transactions = mongoose.model("Transactions");
var fs = require('fs');
var pdf = require('html-pdf');
let path = require('path');
const stakingController = {
    async getStaking (req, res) {
        try {
            let {page =1 ,limit= 100 } = req.query 
            let staking = await Staking.find().sort({_id:-1}).populate("currencyId", "currencySymbol").limit(limit*1).skip((page-1)*limit);
            res.json({ "status": true, "getStakingTblDetails": staking });
        } catch (e) {
            console.log('getStaking',e);
            res.json({ "status": false, "message": "Something went wrong! Please try again some other time" });
        }
    },
    async stakingdetails(req,res){
        try {
            let users = await query_helper.findoneData(Users, { _id: mongoose.Types.ObjectId(req.body.data._id) }, {});
            if (users.status) {
                let limit =req.body.data.limit?parseInt(req.body.data.limit):10;
                let offset =req.body.data.offset? parseInt(req.body.data.offset):0
                let stakeHistory = await StakingHistory.find({userId:mongoose.Types.ObjectId(req.body.data._id)}).sort({createdDate:-1}).populate("userId", "username email").limit(limit).skip(offset);
                let stakeHistorycount = await StakingHistory.find({userId:mongoose.Types.ObjectId(req.body.data._id)}).populate("userId", "username email").countDocuments();
                res.json({ "status": true, "getstakingHistoryTblDetails": stakeHistory,"total":stakeHistorycount});
            } else {
                res.json({ "status": false,"message":"Invalid userId" });
            }
        } catch(e) {
            console.log('getStakingHistoryList',e);
            res.json({ "status": false, "message": "Something went wrong! Please try again some other time" });
        }
    },
    async getStakingfilter (req, res) {
        try {
            let matchQ ={}
            let getdata= req.body.formvalue
            if(getdata.status!= '') {
                matchQ.status = getdata.status
            }
            if(getdata.currencySymbol != '') {
                var queryvalue=getdata.currencySymbol
                let userMatchQ = { "currencySymbol": new RegExp(queryvalue,"i")}
                let users = await query_helper.findData(Currency, userMatchQ, {_id:1}, {})
                let currencyIds = [];
                if(users.status && users.msg.length > 0) {
                    users.msg.forEach(function(item) {
                        currencyIds.push(item._id);
                    });                    
                }
                if(currencyIds.length > 0) {
                    matchQ.currencyId = {$in: currencyIds};
                } else {
                    matchQ.currencySymbol = '';
                }
            }
            let limit =req.body.limit?parseInt(req.body.limit):10;
            let offset =req.body.offset? parseInt(req.body.offset):0
            let staking = await Staking.find(matchQ).sort({_id:-1}).populate("currencyId", "currencySymbol").limit(limit).skip(offset);
            let stakingcount = await Staking.find(matchQ).sort({_id:-1}).populate("currencyId", "currencySymbol").countDocuments();
            res.json({ "status": true, "getStakingTblDetails": staking,"total": stakingcount});
        } catch (e) {
            console.log('getStakingfilter',e);
            res.json({ "status": false, "message": "Something went wrong! Please try again some other time" });
        }
    },
    async updateStaking (req, res) {
        let data = req.body;
        delete data.currencyId;
        let staking = await query_helper.updateData(Staking,"one",{_id:mongoose.Types.ObjectId(data._id)},data)
        if(staking.status) {
            res.json({ "status": staking.status, "message": 'Staking Updated Successfully!' });
             await common.adminactivtylog(req,'update staking', req.userId,'NA','staking', 'staking data updated');
        } else {
            res.json({ "status": false, "message": staking.msg });
        }
    },
    async addStaking (req, res) {
        let data = req.body;
        let currency = await query_helper.findoneData(Currency,{_id: mongoose.Types.ObjectId(data.currencyId)},{currencyId:1})
        if(currency.status) {
            let getStaking = await query_helper.findoneData(Staking,{walletCurrencyId: mongoose.Types.ObjectId(currency.msg.currencyId)},{})
            if(!getStaking.status) {
                data.walletCurrencyId = currency.msg.currencyId;
                let staking = await query_helper.insertData(Staking,data);
                if(staking.status) {
                    res.json({ "status": staking.status, "message": 'Staking Added Successfully!' });
                     await common.adminactivtylog(req,' New staking', req.userId,'NA','new stacking', 'new staking Currency Added');
                } else {
                    res.json({ "status": false, "message": staking.msg });
                }
            } else {
                res.json({ "status": false, "message": 'Staking Currency Already Exists!' });
            }
        } else {
            res.json({ "status": false, "message": 'Not a valid currency!' });
        }
    },
    async getStakingById (req, res) {
        try {
            let staking = await query_helper.findoneData(Staking,{_id:mongoose.Types.ObjectId(req.body._id)},{})
            if(staking.status) {
                res.json({ "status": true, "message": staking.msg });
            } else {
                res.json({ "status": false, "message": 'Not a valid Staking!' });
            }
        } catch (e) {
            console.log('getStakingById',e);
            res.json({ "status": false, "message": "Not a valid Staking!" });
        }
    },
    async checkStakingPair (req, res) {
        try {
            let currency = await query_helper.findoneData(Currency,{currencySymbol: req.body.currency},{currencyId:1})
            if(currency.status) {
                let staking = await query_helper.findoneData(Staking,{walletCurrencyId:currency.msg.currencyId, status: 1},{})
                if(staking.status) {
                    res.json({ "status": true, "message": staking.msg });
                } else {
                    res.json({ "status": false, "message": 'Not a valid Staking!' });
                }
            } else {
                res.json({ "status": false, "message": 'Not a valid Staking!' });
            }
        } catch (e) {
            console.log('checkStakingPair',e);
            res.json({ "status": false, "message": "Not a valid Staking!" });
        }
    },
    async getStakingHistory (req, res) {
        try {
            let userId = mongoose.Types.ObjectId(req.userId);
            let where = {stakingId: mongoose.Types.ObjectId(req.body._id), userId: userId};
            let staking = await query_helper.findData(StakingHistory,where,{},{_id:-1},0);
            res.json({ "status": staking.status, "data": staking.msg });
        } catch (e) {
            console.log('getStakingHistory',e);
            res.json({ "status": false, "message": "Something went wrong! Please try again some other time" });
        }
    },
    async getStakingTableDetailsSum(req, res) {
        try {
            let stakingsumDetails = { "totalActiveStaking": "0", "totalActiveBonus": "0", "totalClosedStaking": "0", "totalClosedBonus": "0" }
            let matchQ = {};
            if(req.body.status != '') {
                matchQ.status = req.body.status == 0 ? { $in: [0,3] } : req.body.status;
            }
            if(req.body.currency != '') {
                matchQ.currency = req.body.currency;
            }
            if (req.body.selectPackage != '') {
                let sPack=({'package.packageName':req.body.selectPackage})
                 matchQ= sPack
             }
            if(req.body.maturityfrom != '') {
                let startDate = new Date(req.body.maturityfrom);
                startDate = new Date((startDate.setTime(startDate.getTime() - 5.5*60*60*1000)));
                let endDate = new Date(req.body.maturityto);
                endDate = new Date(endDate.setTime(endDate.getTime() + 29.49*60*60*1000));
                matchQ.maturityDate = {$gte: startDate, $lt: endDate};
            }
            if(req.body.Bonusfrom != '') {
                let startDate1 = new Date(req.body.Bonusfrom);
                startDate1 = new Date((startDate1.setTime(startDate1.getTime() - 5.5*60*60*1000)));
                let endDate1 = new Date(req.body.Bonusto);
                endDate1 = new Date(endDate1.setTime(endDate1.getTime() + 29.49*60*60*1000));
                matchQ.nextBonusDay = {$gte: startDate1, $lt: endDate1};
                matchQ.status = 0;
            }
            if(req.body.searchQuery != '') {
                let userMatchQ = { '$and': [{ '$or': [{ "username": { $regex: req.body.searchQuery } }, { "email": { $regex: req.body.searchQuery } }] }] };
                let users = await query_helper.findData(Users, userMatchQ, {_id:1}, {}, 0)
                let userIds = [];
                if(users.status && users.msg.length > 0) {
                    users.msg.forEach(function(item) {
                        userIds.push(item._id);
                    });                    
                }
                if(userIds.length > 0) {
                    matchQ.userId = {$in: userIds};
                } else {
                    matchQ.currency = '';
                }
            }
            if(req.body.searchQuery1 != '') {
                let userMatchQ = { '$and': [{ '$or': [{ "username": { $regex: req.body.searchQuery1 } }, { "email": { $regex: req.body.searchQuery1 } }] }] };
                let users = await query_helper.findData(Users, userMatchQ, {_id:1}, {}, 0)
                let userIds = [];
                if(users.status && users.msg.length > 0) {
                    users.msg.forEach(function(item) {
                        userIds.push(item._id);
                    });                    
                }
                let referUsers = await query_helper.findData(Users, {referUser: {$in: userIds}}, {_id:1}, {}, 0)
                let referUserIds = [];
                if(referUsers.status && referUsers.msg.length > 0) {
                    referUsers.msg.forEach(function(item) {
                        referUserIds.push(item._id);
                    });                    
                }
                if(referUserIds.length > 0) {
                    matchQ.userId = {$in: referUserIds};
                } else {
                    matchQ.currency = '';
                }
            }
            const commissionEarned = await StakingHistory.aggregate(
                [
                    {
                        $match: matchQ
                    },
                  {
                    $group:
                      {
                        _id: '$status',
                        totalAmount: { $sum: "$amount" },
                        totalBonusAmount: { $sum: "$bonus" }
                      }
                  }
                ]
            );
            if(commissionEarned && commissionEarned.length > 0) {
                commissionEarned.forEach(function(item) {
                    if(item._id == 0) {
                        stakingsumDetails.totalActiveStaking = item.totalAmount;
                        stakingsumDetails.totalActiveBonus = item.totalBonusAmount;
                    } else {
                        stakingsumDetails.totalClosedStaking = item.totalAmount;
                        stakingsumDetails.totalClosedBonus = item.totalBonusAmount;
                    }
                });
            }
            res.json({ "status": true, "data": stakingsumDetails });
        } catch (e) {
            console.log('getStakingTableDetailsSum',e);
            res.json({ "status": false, "message": "Something went wrong! Please try again some other time" });
        }
    },
    async getStakingHistoryList (req, res) {
        try {
            let matchQ = {};
            let getdata= req.body.formvalue;
            if(getdata.status != '') {
                matchQ.status = getdata.status == 0 ? { $in: [0,3] } : getdata.status;
            }
            if(getdata.currency != '') {
                matchQ.currency = getdata.currency;
            }
            if (getdata.selectPackage != '') {
                let sPack=({'package.packageName':getdata.selectPackage})
                 matchQ= sPack
             }
            if(getdata.maturityfrom!='' && getdata.maturityto!=''){
                let fromDate = new Date(getdata.maturityfrom);
                let toDate = new Date(getdata.maturityto);
                var dateFilter= new Date(fromDate.setTime(fromDate.getTime() + 5.5*60*60*1000));
                var nextDateFilter = new Date(toDate.setTime(toDate.getTime() + 29.49*60*60*1000));
               
                matchQ.maturityDate = {
                    "$gte":dateFilter,
                    "$lt":nextDateFilter
                }
            }
            if(getdata.Bonusfrom!='' && getdata.Bonusto!=''){
                let fromDate = new Date(getdata.Bonusfrom);
                let toDate = new Date(getdata.Bonusto);
                var dateFilter= new Date(fromDate.setTime(fromDate.getTime() + 5.5*60*60*1000));
                var nextDateFilter = new Date(toDate.setTime(toDate.getTime() + 29.49*60*60*1000));
                matchQ.nextBonusDay = {
                    "$gte":dateFilter,
                    "$lt":nextDateFilter
                }
            }
            if(getdata.searchQuery != '') {
                let userMatchQ = { '$and': [{ '$or': [{ "username": { $regex: getdata.searchQuery } }, { "email": { $regex: getdata.searchQuery } }] }] };
                let users = await query_helper.findData(Users, userMatchQ, {_id:1}, {}, 0)
                let userIds = [];
                if(users.status && users.msg.length > 0) {
                    users.msg.forEach(function(item) {
                        userIds.push(item._id);
                    });                    
                }
                if(userIds.length > 0) {
                    matchQ.userId = {$in: userIds};
                } else {
                    matchQ.currency = '';
                }
            }
            if(getdata.searchQuery1 != '') {
                let userMatchQ = { '$and': [{ '$or': [{ "username": { $regex:getdata.searchQuery1 } }, { "email": { $regex: getdata.searchQuery1 } }] }] };
                let users = await query_helper.findData(Users, userMatchQ, {_id:1}, {}, 0)
                let userIds = [];
                if(users.status && users.msg.length > 0) {
                    users.msg.forEach(function(item) {
                        userIds.push(item._id);
                    });                    
                }
                let referUsers = await query_helper.findData(Users, {referUser: {$in: userIds}}, {_id:1}, {}, 0)
                let referUserIds = [];
                if(referUsers.status && referUsers.msg.length > 0) {
                    referUsers.msg.forEach(function(item) {
                        referUserIds.push(item._id);
                    });                    
                }
                if(referUserIds.length > 0) {
                    matchQ.userId = {$in: referUserIds};
                } else {
                    matchQ.searchQuery1 = '';
                }
            }
            let limit =req.body.limit?parseInt(req.body.limit):10;
            let offset =req.body.offset? parseInt(req.body.offset):0
            let stakeHistory = await StakingHistory.find(matchQ).sort({createdDate:-1}).populate("userId", "username email").limit(limit).skip(offset);
            let stakeHistorycount = await StakingHistory.find(matchQ).populate("userId", "username email").countDocuments();
            res.json({ "status": true, "getstakingHistoryTblDetails": stakeHistory,"total":stakeHistorycount});
        } catch (e) {
            console.log('getStakingHistoryList',e);
            res.json({ "status": false, "message": "Something went wrong! Please try again some other time" });
        }
    },
    async getStakingHistoryDetails (req, res) {
        try {
            let stakeHistory = await StakingHistory.findOne({_id: mongoose.Types.ObjectId(req.body._id)}).populate("userId", "username email");
            let stakingBonus = await StakeBonusHistory.find({stakeId: mongoose.Types.ObjectId(req.body._id)}).sort({_id:-1});
            res.json({ "status": stakeHistory ? true : false, "data": stakeHistory, "stakingBonus": stakingBonus });
        } catch (e) {
            console.log('getStakingHistoryDetails',e);
            res.json({ "status": false });
        }
    },
    async getRefstakingComissionAdmin(req , res){
        try {
            let stakCommisionReport = await ReferralDB.find({}).sort({_id:-1}).populate("userId", "username email").populate("refUser", "username email").populate("stakingId","amount").populate("currencyId","currencySymbol ");
            res.json({"status": true , "data": stakCommisionReport });
        } catch(e) {
            console.log('getRefstakingComissionAdmin',e);
            res.json({ "status": false });
        }
    },
    async getRefstakingComissionAdminfilter(req , res){
        try {
            let userMatchQ ={}
            let getdata=req.body.formvalue;
            if(getdata.currency!=''){
                var queryvalue=getdata.currency
               userMatchQ = { "currencyName": new RegExp(queryvalue,"i")}
            }
            if(getdata.email != '') {
                let MatchQ = { "email":  { $regex: getdata.email }}
                let users = await query_helper.findData(Users, MatchQ, {_id:1}, {}, 0)
                let userIds = [];
                if(users.status && users.msg.length > 0) {
                    users.msg.forEach(function(item) {
                        userIds.push(item._id);
                    });                    
                }
                if(userIds.length > 0) {
                    userMatchQ.userId = {$in: userIds};
                } else {
                    userMatchQ.email = '';
                }
            }
            if(getdata.referral != '') { 
                var queryvalue=getdata.referral
                let MatchQ = { "email": new RegExp(queryvalue,"i")}
                let users = await query_helper.findData(Users, MatchQ, {_id:1}, {}, 0)
                let userIds = [];
                if(users.status && users.msg.length > 0) {
                    users.msg.forEach(function(item) {
                        userIds.push(item._id);
                    });                    
                }
                let referUsers = await query_helper.findData(Users, {referUser: {$in: userIds}}, {_id:1}, {}, 0)
                let referUserIds = [];
                if(referUsers.status && referUsers.msg.length > 0) {
                    referUsers.msg.forEach(function(item) {
                        referUserIds.push(item._id);
                    });                    
                }
                if(referUserIds.length > 0) {
                    userMatchQ.userId = {$in: referUserIds};
                } else {
                    userMatchQ.referral = '';
                }      
            }
            if(getdata.fromdate!='' && getdata.todate!=''){
                var fromDate= new Date(getdata.fromdate);
                var toDate = new Date(getdata.todate);
                var dateFilter= new Date(fromDate.setTime(fromDate.getTime() + 5.5*60*60*1000));
                var nextDateFilter = new Date(toDate.setTime(toDate.getTime() + 29.49*60*60*1000));
                userMatchQ.dateTime = {
                    "$gte":dateFilter,
                    "$lt":nextDateFilter
                }
            }
            let limit =req.body.limit?parseInt(req.body.limit):10;
            let offset =req.body.offset? parseInt(req.body.offset):0
            let stakCommisionReport = await ReferralDB.find(userMatchQ).sort({_id:-1}).populate("userId", "username email").populate("refUser", "username email").populate("stakingId","amount").populate("currencyId","currencySymbol ").limit(limit).skip(offset);
            let stakCommisioncount = await ReferralDB.find(userMatchQ).populate("userId", "username email").populate("refUser", "username email").populate("stakingId","amount").populate("currencyId","currencySymbol ").countDocuments();
            res.json({"status": true , "data": stakCommisionReport ,"total":stakCommisioncount});
        }
        catch(e) {
            console.log('getRefstakingComissionAdminfilter',e);
            res.json({ "status": false });
        }
    }    
};
module.exports = stakingController;