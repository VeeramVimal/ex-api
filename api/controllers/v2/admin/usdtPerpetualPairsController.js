const query_helper = require('../../../helpers/query');

// import package
const mongoose = require('mongoose');
const Currency = mongoose.model("Currency");
const Pairs = mongoose.model("USDTPerpetualPair");
const DerivativesPairDB = mongoose.model("DerivativesPairs");
let USDTPerpetualPositionDB = mongoose.model('USDTPerpetualPosition');
let USDTPerpetualTradeDB = mongoose.model('USDTPerpetualTrade');
let USDTPerpetualOrderDB = mongoose.model('USDTPerpetualOrder');
let UsersDB = mongoose.model('Users');

const commonHelper = require('../../../helpers/common');
const { cat } = require('shelljs');

const pairsController = {
    async getPairs(req, res) {
        try {
            let matchQ = {};
            let page = 1;
            let limit = 100;
            let pairs = await query_helper.findData(Pairs, matchQ, {}, { _id: -1 }, limit, page)
            res.json({ "status": pairs.status, "getPairsTblDetails": pairs.msg });
        } catch (e) {
            console.log('getPairs', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getPairsfilter(req, res) {
        try {
            let matchQ = {};
            let getdata = req.body.formvalue;
            if (getdata.pair != '') {
                var queryvalue = getdata.pair
                matchQ.pair = new RegExp(queryvalue, "i");
            }
            if (getdata.status != '') {
                var queryvalue = getdata.status
                matchQ.status = queryvalue;
            }
            let limit = req.body.limit ? parseInt(req.body.limit) : 10;
            let offset = req.body.offset ? parseInt(req.body.offset) : 0
            let pairs = await query_helper.findDatafilter(Pairs, matchQ, {}, { _id: -1 }, limit, offset)
            let pairscount = await Pairs.countDocuments(matchQ)
            res.json({ "status": pairs.status, "getPairsTblDetails": pairs.msg, "total": pairscount });
        } catch (e) {
            console.log('getPairsfilter', e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    /** 
     * fromCurrency, toCurrency, takerFee, decimalValue, priceDecimal, MMR, status(active)
    */
    async addPairs(req, res) {
        let data = req.body;
        let fromCurrency = await query_helper.findoneData(Currency, { _id: mongoose.Types.ObjectId(data.fromCurrency) }, {});
        let toCurrency = await query_helper.findoneData(Currency, { _id: mongoose.Types.ObjectId(data.toCurrency) }, {});
        if (fromCurrency.status && toCurrency.status) {
            data.pair = fromCurrency.msg.currencySymbol + '_' + toCurrency.msg.currencySymbol
            let getPairs = await query_helper.findoneData(Pairs, { fromCurrency: mongoose.Types.ObjectId(data.fromCurrency), toCurrency: mongoose.Types.ObjectId(data.toCurrency) }, {})
            if (!getPairs.status) {
                let pairs = await query_helper.insertData(Pairs, data);
                if (pairs.msg && pairs.msg._id) {
                    data._id = pairs.msg._id
                }
                if (pairs.status) {
                    res.json({ "status": pairs.status, "message": 'Pair Added Successfully!' });
                } else {
                    res.json({ "status": false, "message": pairs.msg });
                }
            } else {
                res.json({ "status": false, "message": 'Pair Already Exists' });
            }
        } else {
            res.json({ "status": false, "message": 'Not a valid from and to currency' });
        }
    },
    async updatePairs(req, res) {
        let data = req.body;
        let getPairs = await query_helper.findoneData(
            Pairs,
            {
                fromCurrency: mongoose.Types.ObjectId(data.fromCurrency),
                toCurrency: mongoose.Types.ObjectId(data.toCurrency),
                _id: { $ne: mongoose.Types.ObjectId(data._id) }
            },
            {}
        );
        if (!getPairs.status) {

            let getPairs = await query_helper.findoneData(
                Pairs,
                {
                    fromCurrency: mongoose.Types.ObjectId(data.fromCurrency),
                    toCurrency: mongoose.Types.ObjectId(data.toCurrency),
                    _id: mongoose.Types.ObjectId(data._id)
                },
                {}
            );
            if (getPairs.status) {
                delete data.fromCurrency;
                delete data.toCurrency;

                // if(data.autoOrderExecute == 1) {
                //     const delResp = await query_helper.DeleteOne(OrderBookDB,{pair:getPairs.msg.pair});
                //     console.log("updatePairs delResp --- : ", delResp);
                // }

                let pairs = await query_helper.updateData(Pairs, "one", {
                    _id: mongoose.Types.ObjectId(data._id)
                }, data, { new: true });
                if (pairs.status) {
                    getPairs.msg.autoOrderExecute = data.autoOrderExecute;
                    await commonHelper.adminactivtylog(req, 'Pair Updated', req.userId, mongoose.Types.ObjectId(data._id), 'Pair Updated', ' Pair Updated Successfully');
                    res.json({ "status": pairs.status, "message": 'Pair Updated Successfully!' });
                } else {
                    res.json({ "status": false, "message": pairs.msg });
                }
            }
            else {
                res.json({ "status": false, "message": 'Pair Not Found' });
            }

        } else {
            res.json({ "status": false, "message": 'Pair Already Exists' });
        }
    },
    async popularPair(req, res) {
        try {
            let reqBody = req.body;
            let getPairs = await query_helper.findoneData(Pairs, { _id: mongoose.Types.ObjectId(reqBody.pairId) }, {})
            if (getPairs.status) {
                getPairs = getPairs.msg;
                let popularPair = 0;
                if (getPairs.popularPair == 0) {
                    popularPair = 1;
                } else {
                    popularPair = 0;
                }
                let pairs = await query_helper.updateData(Pairs, "one", { _id: mongoose.Types.ObjectId(reqBody.pairId) }, { popularPair: popularPair }, { new: true });
                if (pairs.status) {
                    let text = (popularPair == 1) ? "Enabled" : "Disabled";
                    await commonHelper.adminactivtylog(req, 'Popular Pair Status Updated', req.userId, mongoose.Types.ObjectId(reqBody.pairId), 'Popular Pair Status Updated', ' Popular Pair Status Changed Successfully');
                    res.json({ "status": pairs.status, "message": 'Popular Pair ' + text + ' Successfully!', data: getPairs });
                } else {
                    res.json({ "status": false, "message": pairs.msg });
                }
            } else {
                res.json({ "status": false, "message": 'Invalid pair' });
            }
        } catch (err) {
            console.log("errr", err)
            res.json({ "status": false, "message": 'Something went wrong' });
        }
    },
    async getPositionHistory(req,res) {
        try {
            let query = {};
            let getdata = req.body.formvalue;
            let sort = { createdAt: -1 }
            if(getdata.fromdate != '' && getdata.todate!=''){
                var fromDate= new Date(getdata.fromdate);
                var toDate = new Date(getdata.todate);
                var dateFilter= new Date(fromDate.setTime(fromDate.getTime() + 5.5*60*60*1000));
                var nextDateFilter = new Date(toDate.setTime(toDate.getTime() + 29.49*60*60*1000));
                query.createdAt = {
                    "$gte":dateFilter,
                    "$lt":nextDateFilter
                }
            }
            if (getdata.searchQuery != '') {
                let userMatchQ = { '$and': [{ '$or': [{ "username": { $regex: getdata.searchQuery } }, { "email": { $regex: getdata.searchQuery } }] }] };
                let users = await query_helper.findData(UsersDB, userMatchQ, { _id: 1 }, {}, 0, 1)
                let userIds = [];
                if (users.status && users.msg.length > 0) {
                    users.msg.forEach(function (item) {
                        userIds.push(item._id);
                    });
                }
                if (userIds.length > 0) {
                    query.userId = { $in: userIds };
                } else {
                    query.searchQuery = '';
                }
            }
            let limit = req.body.limit ? parseInt(req.body.limit) : 10;
            let offset = req.body.offset ? parseInt(req.body.offset) : 0

            if (req.body.formvalue && req.body.formvalue.type != '') {
                query.type = req.body.formvalue.type;
            }
            if (req.body.formvalue && req.body.formvalue.status != '') {
                query.status = req.body.formvalue.status;
            }
            let ordercount= await USDTPerpetualPositionDB.find(query).countDocuments();
            USDTPerpetualPositionDB.aggregate([
                {
                    $match: query
                },
                { "$sort": sort },
                { "$limit": offset+ limit },
                { "$skip": offset },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'userDet'
                    }
                },
                { $unwind: "$userDet" },
                {
                    $lookup:
                    {
                        from: 'USDTPerpetualPair',
                        localField: 'pair',
                        foreignField: '_id',
                        as: 'pairDet'
                    }
                },
                { $unwind: "$pairDet" },
                {
                    $project: {
                        "username":"$userDet.username",
                        "userId":"$userDet._id",
                        "email":"$userDet.email",
                        "pairDet":"$pairDet",
                        "pair": "$pair",
                        "type": "$type",
                        "userId": "$userId",
                        "filled": "$filled",
                        "leverage":"$leverage",
                        "pairName":"$pairName",
                        "totalAmount":"$totalAmount",
                        "fromCurrency": "$fromCurrency",
                        "toCurrency": "$toCurrency",
                        "liquidityPrice": "$liquidityPrice",
                        "createdAt": "$createdAt",
                    },
                },
            ]).exec(async function (err, result) {
                console.log("result:",result)
                if (result) {
                    res.json({ "status": true, "message": "Order details listed", "getOrderHistoryTblDetails": result, "total": ordercount});
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }
            });
        } catch (err){
            console.log("err",err)
        }
    },
    async getUSDMPositionsDetails(req,res){
        try {
            let reqBody = req.body;
            let query = { "_id" : mongoose.Types.ObjectId(reqBody._id) };
            USDTPerpetualPositionDB.aggregate([
                {
                    $match: query
                },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'userDet'
                    }
                },
                { $unwind: "$userDet" },
                {
                    $lookup:
                    {
                        from: 'USDTPerpetualPair',
                        localField: 'pair',
                        foreignField: '_id',
                        as: 'pairDet'
                    }
                },
                { $unwind: "$pairDet" },
                {
                    $project: {
                        "username":"$userDet.username",
                        "userId":"$userDet._id",
                        "email":"$userDet.email",
                        "pairDet":"$pairDet",
                        "pair": "$pair",
                        "type": "$type",
                        "userId": "$userId",
                        "filled": "$filled",
                        "leverage":"$leverage",
                        "pairName":"$pairName",
                        "totalAmount":"$totalAmount",
                        "fromCurrency": "$fromCurrency",
                        "toCurrency": "$toCurrency",
                        "liquidityPrice": "$liquidityPrice",
                        "createdAt": "$createdAt",
                    },
                },
            ]).exec(async function (err, result) {
                console.log("result:",result)
                if (result) {
                    res.json({ "status": true, "message": "USD-M Position details listed", "getPositionViewTblDetails": result });
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }
            });
            console.log("@@@@@@@@@")
        } catch(err){
            console.log("err",err)
            res.json({ "status": false, "message": 'Something went wrong' });
        }
    },
    async getTradeHistory(req,res) {
        try {
            let query = {};
            let getdata = req.body.formvalue;
            let sort = { dateTime: -1 };
            if (getdata) {
                if(getdata.fromdate != '' && getdata.todate!=''){
                    var fromDate= new Date(getdata.fromdate);
                    var toDate = new Date(getdata.todate);
                    var dateFilter= new Date(fromDate.setTime(fromDate.getTime() + 5.5*60*60*1000));
                    var nextDateFilter = new Date(toDate.setTime(toDate.getTime() + 29.49*60*60*1000));
                    query.createdAt = {
                        "$gte":dateFilter,
                        "$lt":nextDateFilter
                    }
                }
                if (getdata.type != '') {
                    query.type = getdata.type;
                }
            }
          
            let limit = req.body.limit ? parseInt(req.body.limit) : 10;
            let offset = req.body.offset ? parseInt(req.body.offset) : 0

            let ordercount = await USDTPerpetualTradeDB.find(query).populate("buyUserId", "username email").populate("sellUserId", "username email").countDocuments();
            USDTPerpetualTradeDB.aggregate([
                {
                    $match: query
                },
                { "$sort": sort },
                { "$limit": offset+ limit },
                { "$skip": offset },
                
                
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'buyUserId',
                        foreignField: '_id',
                        as: 'buyUserDet'
                    }
                },
                { 
                    $unwind: {
                        "path": "$buyUserDet",
                        "preserveNullAndEmptyArrays": true
                    } 
                },
                {
                    $lookup:
                    {
                        from: 'Admin',
                        localField: 'sellUserId',
                        foreignField: '_id',
                        as: 'sellUserDet'
                    }
                },
                { 
                    $unwind: {
                        "path": "$sellUserDet",
                        "preserveNullAndEmptyArrays": true
                    } 
                },
                {
                    $project: {
                        "buyerName":"$buyUserDet.username",
                        "buyerUserId":"$buyUserDet._id",
                        "buyerEmail":"$buyUserDet.email",
                        "buyerPhoneno":"$buyUserDet.phoneno",
                        "sellerName":"$sellUserDet.name",
                        "sellerUserId":"$sellUserDet._id",
                        "sellerUserEmail":"$sellUserDet.email",
                        "pairName": "$pairName",
                        "type": "$type",
                        "amount": "$amount",
                        "price": "$price",
                        "total":"$total",
                        "sumFee":"$sumFee",
                        "makerFee":"$makerFee",
                        "takerFee":"$takerFee",
                        "buyOrderId": "$buyOrderId",
                        "sellOrderId": "$sellOrderId",
                        "dateTime": "$dateTime",
                    },
                },
            ]).exec(async function (err, result) {
                if (result) {
                    res.json({ "status": true, "message": "Order details listed", "getTradeHistoryTblDetails": result, "total": ordercount});
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }
            });
        } catch (err){
            console.log("err",err)
        }
    },
    async getUSDMOpenOrders(req,res) {
        try {
            let query = {};
            let reqBody = req.body;
            let sort = { dateTime: -1 };
            let limit = reqBody.limit ? parseInt(reqBody.limit) : 10;
            let offset = reqBody.offset ? parseInt(reqBody.offset) : 0

            if (reqBody.formvalue) {
                let getdata = reqBody.formvalue;
                if(getdata.fromdate != '' && getdata.todate!=''){
                    var fromDate= new Date(getdata.fromdate);
                    var toDate = new Date(getdata.todate);
                    var dateFilter= new Date(fromDate.setTime(fromDate.getTime() + 5.5*60*60*1000));
                    var nextDateFilter = new Date(toDate.setTime(toDate.getTime() + 29.49*60*60*1000));
                    query.dateTime = {
                        "$gte":dateFilter,
                        "$lt":nextDateFilter
                    }
                }
                if (getdata.searchQuery != '') {
                    let userMatchQ = { '$and': [{ '$or': [{ "username": { $regex: getdata.searchQuery } }, { "email": { $regex: getdata.searchQuery } }] }] };
                    let users = await query_helper.findData(UsersDB, userMatchQ, { _id: 1 }, {}, 0, 1)
                    let userIds = [];
                    if (users.status && users.msg.length > 0) {
                        users.msg.forEach(function (item) {
                            userIds.push(item._id);
                        });
                    }
                    if (userIds.length > 0) {
                        query.userId = { $in: userIds };
                    } else {
                        query.searchQuery = '';
                    }
                }
    
                if (getdata.orderType != '') {
                    query.orderType = getdata.orderType;
                }
    
                if (getdata.type != '') {
                    query.type = getdata.type;
                }
                
                if (getdata.pairName != '') {
                    query.pairName = getdata.pairName;
                }
    
                if (getdata.status != '') {
                    query.status = getdata.status;
                }
                else {
                    query.status = { "$in": ['active', 'partially', 'conditional'] }
                }
            }
           
            let ordercount = await USDTPerpetualOrderDB.find(query).populate("userId", "username email").countDocuments();
            USDTPerpetualOrderDB.aggregate([
                {
                    $match: query
                },
                { "$sort": sort },
                { "$limit": offset+ limit },
                { "$skip": offset },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'UserDet'
                    }
                },
                { 
                    $unwind: {
                        "path": "$UserDet",
                        "preserveNullAndEmptyArrays": true
                    } 
                },
                {
                    $project: {
                        "userName":"$UserDet.username",
                        "UserId":"$UserDet._id",
                        "Email":"$UserDet.email",
                        "Phoneno":"$UserDet.phoneno",
                        "pairName": "$pairName",
                        "type": "$type",
                        "orderType": "$orderType",
                        "amount": "$amount",
                        "price": "$price",
                        "total":"$total",
                        "leverage": "$leverage",
                        "action":"$action",
                        "method": "$method",
                        "status":"$status",
                        "tpSlType":"$tpSlType",
                        "filledAmount": "$filledAmount",
                        "filledAmount": "$filledAmount",
                        "dateTime": "$dateTime",
                    },
                },
            ]).exec(async function (err, result) {
                if (result) {
                    res.json({ "status": true, "message": "Order details listed", "getTradeHistoryTblDetails": result, "total": ordercount});
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }
            });
        } catch (err){
            console.log("err",err)
        }
    },
    async getUSDMOrdersHistory(req,res) {
        try {
            let query = {};
            let reqBody = req.body;
            let sort = { dateTime: -1 };
            let limit = reqBody.limit ? parseInt(reqBody.limit) : 10;
            let offset = reqBody.offset ? parseInt(reqBody.offset) : 0

            if (reqBody.formvalue) {
                let getdata = reqBody.formvalue;
                if(getdata.fromdate != '' && getdata.todate!=''){
                    var fromDate= new Date(getdata.fromdate);
                    var toDate = new Date(getdata.todate);
                    var dateFilter= new Date(fromDate.setTime(fromDate.getTime() + 5.5*60*60*1000));
                    var nextDateFilter = new Date(toDate.setTime(toDate.getTime() + 29.49*60*60*1000));
                    query.dateTime = {
                        "$gte":dateFilter,
                        "$lt":nextDateFilter
                    }
                }
                if (getdata.searchQuery != '') {
                    let userMatchQ = { '$and': [{ '$or': [{ "username": { $regex: getdata.searchQuery } }, { "email": { $regex: getdata.searchQuery } }] }] };
                    let users = await query_helper.findData(UsersDB, userMatchQ, { _id: 1 }, {}, 0, 1)
                    let userIds = [];
                    if (users.status && users.msg.length > 0) {
                        users.msg.forEach(function (item) {
                            userIds.push(item._id);
                        });
                    }
                    if (userIds.length > 0) {
                        query.userId = { $in: userIds };
                    } else {
                        query.searchQuery = '';
                    }
                }
    
                if (getdata.orderType != '') {
                    query.orderType = getdata.orderType;
                }
    
                if (getdata.type != '') {
                    query.type = getdata.type;
                }
                
                if (getdata.pairName != '') {
                    query.pairName = getdata.pairName;
                }
    
                if (getdata.status != '') {
                    query.status = getdata.status;
                }
                else {
                    query.status = { "$in": ['partially', 'filled', 'cancelled'] }
                }
            }
           
            let ordercount = await USDTPerpetualOrderDB.find(query).populate("userId", "username email").countDocuments();
            USDTPerpetualOrderDB.aggregate([
                {
                    $match: query
                },
                { "$sort": sort },
                { "$limit": offset+ limit },
                { "$skip": offset },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'UserDet'
                    }
                },
                { 
                    $unwind: {
                        "path": "$UserDet",
                        "preserveNullAndEmptyArrays": true
                    } 
                },
                {
                    $project: {
                        "userName":"$UserDet.username",
                        "UserId":"$UserDet._id",
                        "Email":"$UserDet.email",
                        "Phoneno":"$UserDet.phoneno",
                        "pairName": "$pairName",
                        "type": "$type",
                        "orderType": "$orderType",
                        "amount": "$amount",
                        "price": "$price",
                        "total":"$total",
                        "leverage": "$leverage",
                        "action":"$action",
                        "method": "$method",
                        "status":"$status",
                        "tpSlType":"$tpSlType",
                        "filledAmount": "$filledAmount",
                        "filledAmount": "$filledAmount",
                        "dateTime": "$dateTime",
                    },
                },
            ]).exec(async function (err, result) {
                if (result) {
                    res.json({ "status": true, "message": "Order details listed", "getTradeHistoryTblDetails": result, "total": ordercount});
                } else {
                    res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
                }
            });
        } catch (err){
            console.log("err",err)
        }
    },
};
module.exports = pairsController;