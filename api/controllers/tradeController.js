const query_helper = require('../helpers/query');
const mongoose = require('mongoose');
const Pairs = mongoose.model("Pairs");
let orderDB = mongoose.model('TradeOrders');
let mapDb = mongoose.model('MappingOrders');
let tradeChartDB = mongoose.model('TradeChart');
const CurrencyDb = mongoose.model("Currency");
const Users = mongoose.model("Users");
const tradeHelper = require('../helpers/trade');
let common = require('../helpers/common');
const getJSON = require('get-json');
let url = require('url');
let marketsList = [];
var config = require("../Config/config");

getJSON('https://api.coindcx.com/exchange/v1/markets', function (error, response) {
    if(error) {
        response = [];
    }
    marketsList = response;
});

const tradeController = {
    async getMarketsMismatched (req, res) {
        try {
            orderDB.aggregate([
                {
                    $match: {status:"market", pendingTotal: {$ne: 0}, price: {$lt:1}}
                },
                {
                    "$group": {
                        "_id": "$userId",
                        count: {
                            "$sum": 1
                        },
                        pairName: { $first: '$pairName' }
                    }
                },
                {
                    $lookup:
                    {
                        from: 'Users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'users'
                    }
                },
                { $unwind : "$users" },
                {
                    $project: {
                        "count": "$count",
                        "pairName": "$pairName",
                        "userEmail": "$users.email",
                        "userCountry": "$users.country"
                    },
                },
                {
                    $sort: {
                        "dateTime": -1,
                    }
                }
            ]).exec(async function (err, result) {
                res.json({ "status": false, "data": result });
            });
        } catch (e) {
            console.log('getMarketsMismatched',e);
            res.json({ "status": false, "data": [] });
        }
    },
    async getMarkets (req, res) {
        try {
            const {
                body:reqBody = {}
            } = req;
            const {
                marketCurrency = "",
                filter = ""
            } = reqBody;
            let findData = await tradeHelper.pairFindData(req);
            if(marketCurrency != "") {
                findData.pair = { $regex: marketCurrency };
            }
            let sort = { _id : 1 };
            if (filter != "") {
                if (filter == "topGainers") {
                    sort = { change : -1 };
                } else {
                    sort = { change : 1 }
                }
            }
            const selectData =  { _id:-1, pair: 1, price: 1, lastPrice: 1, usdPrice: 1, change: 1, volume: 1, high: 1, low: 1, decimalValue: 1, makerFee: 1, takerFee: 1, makerFeeWithKYC: 1, takerFeeWithKYC: 1, minTrade: 1, minTrade: 1}
            let pairs = await Pairs.find(
                    findData, 
                    selectData
                )
                .sort(sort)
                .populate("fromCurrency", "currencySymbol image currencyId siteDecimal INRvalue currencySymbolCode")
                .populate("toCurrency", "currencySymbol image currencyId siteDecimal INRvalue currencySymbolCode");
            res.json({ "status": true, "data": pairs });
        } catch (e) {
            console.log('getMarkets',e);
            res.json({ "status": false, "data": [] });
        }
    },
    async getMarketsTab (req, res) {
        try {
            const {
                query: reqQuery = {}
            } = req;

            const {
                exchangeType = "SPOT"
            } = reqQuery;
            let findData = { status: 1, exchangeType };
            let pairs = await Pairs.find(findData, { _id:-1, pair: 1, price: 1, lastPrice: 1, usdprice: 1, change: 1, volume: 1, high: 1, low: 1, decimalValue: 1, makerFee: 1, takerFee: 1, minTrade: 1, minTrade: 1}).sort({_id:1}).populate("fromCurrency", "currencySymbol image currencyId siteDecimal").populate("toCurrency", "currencySymbol image currencyId siteDecimal");
            let pairsData = [], pairObj = {};
            pairs.forEach((entry) => {
                if(entry && entry.toCurrency && entry.toCurrency.currencySymbol) {
                    if(typeof pairObj[entry.toCurrency.currencySymbol] != 'object') {
                        pairObj[entry.toCurrency.currencySymbol] = [];
                    }
                    pairObj[entry.toCurrency.currencySymbol].push(entry);
                }
            });
            for (var key in pairObj) {
                pairsData.push({currency: key, pairs: pairObj[key]});
            }
            res.json({ "status": true, "data": pairsData });
        } catch (e) {
            console.log('getMarketsTab',e);
            res.json({ "status": false, "data": [] });
        }
    },
    async getHomeMarkets (req, res) {
        try {
            const {
                body:reqBody = {}
            } = req;
            const {
                marketCurrency = "",
            } = reqBody;

            let findData = await tradeHelper.pairFindData(req);
            findData.price = { $ne: 0 };
            findData.popularPair = 1;
            
            if(marketCurrency) {
                if(marketCurrency != "all") {
                    findData.pair = { $regex: marketCurrency };
                }
                let marketValues = await Pairs
                .find(
                    findData,
                    { _id:-1, pair: 1, price: 1, lastPrice: 1, usdPrice: 1, change: 1, changeValue: 1, volume: 1, high: 1, low: 1, decimalValue: 1, makerFee: 1, takerFee: 1, minTrade: 1, minTrade: 1, popularPair: 1}
                )
                .sort({pair:1})
                .limit(6)
                .populate("fromCurrency", "siteDecimal image")
                .populate("toCurrency", "siteDecimal image");
                return res.json({ "status": true, "data": marketValues });
            }
            else {
                return res.json({ "status": false, info: "Currency required" });
            }
        } catch (e) {
            console.log('getHomeMarkets',e);
            res.json({ "status": false });
        }
    },
    async getHomeMarketsList (req, res) {
        try {
            const {
                query:reqQuery = {}
            } = req;
            const {
                exchangeType = "SPOT"
            } = reqQuery;
            let limit = 10;
            if (req.body.limit != "" && req.body.limit != undefined) {
                limit = parseInt(req.body.limit);
            }
            let topLosers = await Pairs.find({ status: 1, exchangeType }, { _id:-1, pair: 1, price: 1, lastPrice: 1, usdPrice: 1, change: 1, changeValue: 1, volume: 1, high: 1, low: 1, decimalValue: 1, makerFee: 1, takerFee: 1, minTrade: 1, minTrade: 1}).sort({change:1}).limit(limit).populate("fromCurrency", "siteDecimal image").populate("toCurrency", "siteDecimal image");
            let topGainers = await Pairs.find({ status: 1, exchangeType }, { _id:-1, pair: 1, price: 1, lastPrice: 1, usdPrice: 1, change: 1, changeValue: 1, volume: 1, high: 1, low: 1, decimalValue: 1, makerFee: 1, takerFee: 1, minTrade: 1, minTrade: 1}).sort({change:-1}).limit(limit).populate("fromCurrency", "siteDecimal image").populate("toCurrency", "siteDecimal image");
            let fanTknPairs = await Pairs.find({ "pair": { $regex: config.FanTknSymbol }, status: 1, exchangeType }, { _id:-1, pair: 1, price: 1, lastPrice: 1, usdPrice: 1, change: 1, changeValue: 1, volume: 1, high: 1, low: 1, decimalValue: 1, makerFee: 1, takerFee: 1, minTrade: 1, minTrade: 1}).sort({_id:-1}).limit(limit).populate("fromCurrency", "siteDecimal image").populate("toCurrency", "siteDecimal image");
            res.json({ "status": true, "data": {topLosers, topGainers, fanTknPairs} });
        } catch (e) {
            console.log('getHomeMarkets',e);
            res.json({ "status": false, "data": [] });
        }
    },
    async getHomeTopMarkets (req, res) {
        try {
            const {
                query:reqQuery = {},
                body: reqBody = {}
            } = req;
            const {
                marketCurrency = "USDT"
            } = reqBody;
            const {
                exchangeType = "SPOT"
            } = reqQuery;

            const findData = {
                status: 1,
                exchangeType, 
                pair: { $regex: marketCurrency },
                change: {$ne: 0}
            };
            
            let limit = req.body.limit ? parseInt(req.body.limit) : 10;
            let topLosers = await Pairs.find(findData, { _id:-1, pair: 1, price: 1, lastPrice: 1, usdPrice: 1, change: 1, changeValue: 1, volume: 1, high: 1, low: 1, decimalValue: 1, makerFee: 1, takerFee: 1, minTrade: 1, minTrade: 1}).sort({change:1}).limit(limit).populate("fromCurrency", "siteDecimal image").populate("toCurrency", "siteDecimal image");
            let topGainers = await Pairs.find(findData, { _id:-1, pair: 1, price: 1, lastPrice: 1, usdPrice: 1, change: 1, changeValue: 1, volume: 1, high: 1, low: 1, decimalValue: 1, makerFee: 1, takerFee: 1, minTrade: 1, minTrade: 1}).sort({change:-1}).limit(limit).populate("fromCurrency", "siteDecimal image").populate("toCurrency", "siteDecimal image");
            let fanTknPairs = await Pairs.find({ "pair": { $regex: config.FanTknSymbol }, status: 1, exchangeType }, { _id:-1, pair: 1, price: 1, lastPrice: 1, usdPrice: 1, change: 1, changeValue: 1, volume: 1, high: 1, low: 1, decimalValue: 1, makerFee: 1, takerFee: 1, minTrade: 1, minTrade: 1}).sort({_id:-1}).limit(limit).populate("fromCurrency", "siteDecimal image").populate("toCurrency", "siteDecimal image");
            res.json({ "status": true, "data": {topLosers, topGainers, fanTknPairs} });
        } catch (e) {
            console.log('getHomeMarkets',e);
            res.json({ "status": false, "data": [] });
        }
    },
    async chart (req, res) {
        try {
            var uri = url.parse(req.url, true);
            var action = uri.pathname;
            symbolsDatabase.initGetAllMarketsdata();
            switch (action) {
                case '/chart/config':
                    action = '/config';
                    break;
                case '/chart/time':
                    action = '/time';
                    break;
                case '/chart/symbols':
                    action = '/symbols';
                    break;
                case '/chart/history':
                    action = '/history';
                    break;
            }
            return requestProcessor.processRequest(action, uri.query, res);
        } catch (e) {
            console.log("chart", e);
        }
    },
    async markets (req, res) {
        try {
            let pairarr = [];
            let pairs = await query_helper.findData(Pairs, { status: 1 }, {},{_id:-1},0)
            if(pairs.status && pairs.msg.length > 0) {
                const etempdata = pairs.msg;
                for (let i = 0; i < etempdata.length; i++) {
                    pairarr.push({ name: etempdata[i].pair, description: etempdata[i].pair, exchange: 'Exchange', type: 'crypto', decimal: etempdata[i].decimalValue });
                }
            }
            res.json(pairarr);
        } catch (e) {
            console.log("markets", e);
            res.json(err);
        }
    },
    async chartData (req, res) {
        try {
            var pair = req.query.market;
            var start_date = req.query.start_date;
            var end_date = req.query.end_date;
            var pair_name = pair;
            var pattern = /^([0-9]{4})\-([0-9]{2})\-([0-9]{2})$/;
            if (start_date) {
                if (!pattern.test(start_date)) {
                    res.json({ "message": "Start date is not a valid format" });
                    return false;
                }
            } else {
                res.json({ "message": "Start date parameter not found" });
                return false;
            }
            if (end_date) {
                if (!pattern.test(end_date)) {
                    res.json({ "message": "End date is not a valid format" });
                    return false;
                }
            } else {
                res.json({ "message": "End date parameter not found" });
                return false;
            }
            var sDate = start_date + 'T00:00:00.000Z';
            var eDate = end_date + 'T23:59:59.000Z';
            if (sDate > eDate) {
                res.json({ "message": "Please ensure that the End Date is greater than or equal to the Start Date" });
                return false;
            }
            let getres = await query_helper.findoneData(tradeChartDB, { pairName: pair_name, chartType: 'Chart' }, {});
            let whereCond = {
                pairName: pair_name,
            }
            if(getres.status) {
                whereCond.chartType = 'Chart';
            }
            var project = { _id: 0, Date: "$Date", pair: { $literal: pair_name }, low: "$low", high: "$high", open: "$open", close: "$close", volume: "$volume", exchange: { $literal: "Exchange" } };
            tradeChartDB.aggregate([
                {
                    $match: whereCond
                },
                {
                    "$group": {
                        "_id": {
                            "year": {
                            "$year": "$time"
                          },
                          "month": {
                            "$month": "$time"
                          },
                          "day": {
                            "$dayOfMonth": "$time"
                          }
                        },
                        count: {
                            "$sum": 1
                        },
                        Date: { $first: "$time" },
                        pairName: { $first: '$pairName' },
                        low: { $min: '$low' },
                        high: { $max: '$high' },
                        open: { $first: '$open' },
                        close: { $last: '$close' },
                        volume: { $sum: '$volume' }
                    }
                },
                {
                    $project: project,
                },
                {
                    $sort: {
                        "Date": -1,
                    }
                },
                { $limit : 1000 }
            ]).exec(async function (err, result) {
                if(result.length > 0) {
                    if(result.length > 0) {
                        let getres = await query_helper.findoneData(Pairs, { pair: pair_name }, {price:1});
                        result[0].close = getres.msg.price;
                    }
                    result = result.reverse();
                }
                res.json(result);
            });
        } catch (e) {
            console.log("chartData", e);
            res.json(err);
        }
    },
    async historyChart (req, res) {
        try {
            const pair = req.query.symbol;
            const sDate = new Date(req.query.from);
            const eDate = new Date(req.query.to);
            let groupBy = {};
            if(req.query.resolution == 1 || req.query.resolution == 3 || req.query.resolution == 5 || req.query.resolution == 15 || req.query.resolution == 30 || req.query.resolution == 60) {
                groupBy = {
                    "year": { "$year": "$time" },
                    "dayOfYear": { "$dayOfYear": "$time" },
                    "hour": { "$hour": "$time" },
                    "interval": {
                      "$subtract": [ 
                        { "$minute": "$time" },
                        { "$mod": [{ "$minute": "$time"}, 1] }
                      ]
                    }                    
                }
            } else if (req.query.resolution == 'D') {
                groupBy = {
                 "year": {
                    "$year": "$time"
                  },
                  "month": {
                    "$month": "$time"
                  },
                  "day": {
                    "$dayOfMonth": "$time"
                  }
                }
            } else if (req.query.resolution == 'W') {
                groupBy = {
                    "year": {
                    "$year": "$time"
                  },
                  "month": {
                    "$month": "$time"
                  },
                  "day": {
                    "$dayOfMonth": "$time"
                  },
                  "interval": {
                    "$subtract": [ 
                      { "$day": "$time" },
                      { "$mod": [{ "$day": "$time"}, 7] }
                    ]
                  }
                }
            } else if (req.query.resolution == 'M') {
                groupBy = {
                    "year": {
                    "$year": "$time"
                  },
                  "month": {
                    "$month": "$time"
                  }
                }
            }
            if (sDate.getTime() > eDate.getTime()) {
                res.json({ "message": "Please ensure that the End Date is greater than or equal to the Start Date" });
                return false;
            }
            const getres = await query_helper.findoneData(tradeChartDB, { pairName: pair, chartType: 'Chart' }, {});
            let whereCond = {
                pairName: pair,
            }
            if(getres.status) {
                whereCond.chartType = 'Chart';
            }
            const project = { _id: 0, Date: "$Date", pair: { $literal: pair }, low: "$low", high: "$high", open: "$open", close: "$close", volume: "$volume", exchange: { $literal: "Exchange" } };
            tradeChartDB.aggregate([
                {
                    $match: whereCond
                },
                {
                    "$group": {
                        "_id": groupBy,
                        count: {
                            "$sum": 1
                        },
                        Date: { $first: "$time" },
                        pairName: { $first: '$pairName' },
                        low: { $min: '$low' },
                        high: { $max: '$high' },
                        open: { $first: '$open' },
                        close: { $last: '$close' },
                        volume: { $sum: '$volume' }
                    }
                },
                {
                    $project: project,
                },
                {
                    $sort: {
                        "Date": -1,
                    }
                },
                { $limit : 1000 }
            ]).exec(async function (err, result) {
                let results = [];
                if(result.length > 0) {
                    result = result.reverse();
                    result.forEach(function (row, index) {
                        results[index] = {};
                        results[index].time = new Date(row.Date).getTime() / 1000;
                        results[index].open = row.open;
                        results[index].high = row.high;
                        results[index].low = row.low;
                        results[index].close = row.close;
                        results[index].volume = row.volume;
                    });
                }
                res.json({status: true, data: results});
            });
        } catch (e) {
            console.log("historyChart", e);
            res.json(err);
        }
    },
    async tradeChart (req, res) {
        try {
            let pair_name = req.query.market;
            var project = { _id: 0, Date: "$Date", low: "$low", high: "$high", open: "$open", close: "$close", volume: "$volume" };
            var dateOld = new Date();
            dateOld.setFullYear(dateOld.getFullYear() - 1);
            tradeChartDB.aggregate([
                {
                    $match: {
                        pairName: pair_name,
                        time: { $gte: dateOld }
                    }
                },
                {
                    "$group": {
                        "_id": {
                            'year': { '$year': "$time" },
                            'month': { '$month': "$time" },
                            'day': { '$dayOfMonth': "$time" }
                        },
                        count: {
                            "$sum": 1
                        },
                        Date: { $first: "$time" },
                        low: { $min: '$low' },
                        high: { $max: '$high' },
                        open: { $first: '$open' },
                        close: { $last: '$close' },
                        volume: { $sum: '$volume' }
                    }
                },
                {
                    $project: project,
                },
                {
                    $sort: {
                        "Date": 1,
                    }
                }
            ]).exec(function (err, result) {
                res.json({data:result});
            });
        } catch (e) {
            console.log("tradeChart", e);
            res.json({data:[]});
        }
    },
    async checkPair (req, res) {
        try {
            const reqBody = req.body ? req.body : {}
            const {
                pair = "",
                exchangeType = "SPOT",
            } = reqBody;
            tradeHelper.pairData(pair, (result) => {
                res.json(result);
            }, req);
        } catch (e) {
            console.log('checkPair',e);
            res.json({
                status: false,
                "Message": "No Pairs Available!",
            })
        }
    },
    async exchangeMarketData (req, res) {
        try {
            const reqBody = req.body ? req.body : {}
            const {
                pair = "BTC_USDT"
            } = reqBody;
            tradeHelper.pairData(pair, (result) => {
                if(result && result.Message && result.Message.price) {
                    res.json({
                        status: true,
                        data: {
                            marketPrice: result.Message.price
                        }
                    });
                }
                else {
                    res.json({
                        status: false,
                    })
                }
            }, req);
        } catch (e) {
            console.log('checkPair',e);
            res.json({
                status: false,
                "Message": "No Pairs Available!",
            })
        }
    },
    async cancelOrder (req, res) {
        try {
            tradeHelper.cancelOrder(req.body.orderId, req.userId, (resOrder) => {
                res.json(resOrder);
            });
        } catch (e) {
            console.log('cancelOrder',e);
            res.status(401).send('unauthorized')
        }
    },
    async getTradeHistory (req, res) {
        try {
            let matchQ = {};
            let getdata = req.body.formvalue;
            if(getdata.fromdate != '' && getdata.todate!=''){
                var fromDate= new Date(getdata.fromdate);
                var toDate = new Date(getdata.todate);
                var dateFilter= new Date(fromDate.setTime(fromDate.getTime() + 5.5*60*60*1000));
                var nextDateFilter = new Date(toDate.setTime(toDate.getTime() + 29.49*60*60*1000));
                matchQ.dateTime = {
                    "$gte":dateFilter,
                    "$lt":nextDateFilter
                }
            }
            if(getdata.pairName != '') {
                matchQ.pairName = getdata.pairName;
            }
            if(getdata.orderType != '') {
                matchQ.orderType = getdata.orderType;
            }
            if(getdata.searchQuery != '') {
                var queryvalue=getdata.searchQuery
                let userMatchQ = { "username": new RegExp(queryvalue,"i")}
                let users = await query_helper.findData(Users, userMatchQ, {_id:1}, {}, 0)
                let userIds = [];
                if(users.status && users.msg.length > 0) {
                    users.msg.forEach(function(item) {
                        userIds.push(item._id);
                    });                    
                }
                if(userIds.length > 0) {
                    matchQ['$or'] = [
                        {
                            buyerUserId: { $in: userIds },
                            sellerUserId: { $in: userIds }
                        }
                    ]
                } else {
                    matchQ.pairName = '';
                }
            }
            let limit =req.body.limit?parseInt(req.body.limit):10;
            let offset =req.body.offset? parseInt(req.body.offset):0
            let mapOrders = await mapDb.find(matchQ).sort({_id:-1}).populate("buyerUserId", "username email").populate("sellerUserId", "username email").limit(limit).skip(offset);
            let ordercount= await mapDb.find(matchQ).populate("buyerUserId", "username email").populate("sellerUserId", "username email").countDocuments();
            res.json({ "status": true, "getTradeHistoryTblDetails": mapOrders,"total": ordercount});
        } catch (e) {
            console.log('getTradeHistory',e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getOrderHistory (req, res) {
        try {
            let matchQ = {};
            let getdata=req.body.formvalue;
            if(getdata.fromdate!='' && getdata.todate!=''){
                var fromDate= new Date(getdata.fromdate);
                var toDate = new Date(getdata.todate);
                var dateFilter= new Date(fromDate.setTime(fromDate.getTime() + 5.5*60*60*1000));
                var nextDateFilter = new Date(toDate.setTime(toDate.getTime() + 29.49*60*60*1000));
                matchQ.dateTime = {
                    "$gte":dateFilter,
                    "$lt":nextDateFilter
                }
            }
            if(getdata.pairName != '') {
                matchQ.pairName = getdata.pairName;
            }
            if(getdata.type != '') {
                matchQ.type = getdata.type;
            }
            if(getdata.orderType != '') {
                matchQ.orderType = getdata.orderType;
            }
            if(getdata.status != '') {
                matchQ.status = getdata.status;
            }
            if(getdata.searchQuery != '') {
                let userMatchQ = { '$and': [{ '$or': [{ "username": { $regex: getdata.searchQuery } }, { "email": { $regex: getdata.searchQuery } }] }] };
                let users = await query_helper.findData(Users, userMatchQ, {_id:1}, {}, 0,1)
                let userIds = [];
                if(users.status && users.msg.length > 0) {
                    users.msg.forEach(function(item) {
                        userIds.push(item._id);
                    });                    
                }
                if(userIds.length > 0) {
                    matchQ.userId = {$in: userIds};
                } else {
                    matchQ.searchQuery = '';
                }
            }
            let limit =req.body.limit?parseInt(req.body.limit):10;
            let offset =req.body.offset? parseInt(req.body.offset):0
            let tradeOrders = await orderDB.find(matchQ).sort({_id:-1}).populate("userId", "username email").limit(limit).skip(offset);
            let tradecount = await orderDB.find(matchQ).populate("userId", "username email").countDocuments()
            res.json({ "status": true, "getOrderHistoryTblDetails": tradeOrders,"total":tradecount });
        } catch (e) {
            console.log('getOrderHistory',e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getOrderTradeTDSHistory (req, res) {
        try {
            let matchQ = {};
            let getdata=req.body.formvalue;
            if(getdata.fromdate!='' && getdata.todate!=''){
                var fromDate= new Date(getdata.fromdate);
                var toDate = new Date(getdata.todate);
                var dateFilter= new Date(fromDate.setTime(fromDate.getTime() + 5.5*60*60*1000));
                var nextDateFilter = new Date(toDate.setTime(toDate.getTime() + 29.49*60*60*1000));
                matchQ.dateTime = {
                    "$gte":dateFilter,
                    "$lt":nextDateFilter
                }
            }
            if(getdata.searchQuery != '') {
                let userMatchQ = { '$and': [{ '$or': [{ "username": { $regex: getdata.searchQuery } }, { "email": { $regex: getdata.searchQuery } }] }] };
                let users = await query_helper.findData(Users, userMatchQ, {_id:1}, {}, 0,1)
                let userIds = [];
                if(users.status && users.msg.length > 0) {
                    users.msg.forEach(function(item) {
                        userIds.push(item._id);
                    });                    
                }
                if(userIds.length > 0) {
                    matchQ.sellerUserId = {$in: userIds};
                } else {
                    matchQ.searchQuery = '';
                }
            }
            let limit =req.body.limit?parseInt(req.body.limit):10;
            let offset =req.body.offset? parseInt(req.body.offset):0;
            let mapTradeOrders ;
            if(getdata.searchQuery != '') {
                mapTradeOrders = await mapDb.find(matchQ).sort({_id:-1}).populate("sellerUserId", "username email");  
            }else{
                mapTradeOrders = await mapDb.find(matchQ).sort({_id:-1}).populate("sellerUserId", "username email").limit(limit).skip(offset); 
            }
          
            let tradeTdsMapcount = await mapDb.find(matchQ).populate("sellerUserId", "username email").countDocuments();

            res.json({ "status": true,  "getOrderMapTdsTblDetails":mapTradeOrders , "totalMap":tradeTdsMapcount  });
        } catch (e) {
            console.log('getOrderTradeTDSHistory',e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getOldOhlcData (req, res) {
        let pair = req.query.pair;
        let getres = await query_helper.findoneData(Pairs, { pair: pair }, {});
        if(getres.status) {
            getres = getres.msg;
            if(getres.ohlcUpdated == 0){
                updOhlcData(pair,getres._id,0,res);
            } else {
                res.send('OHLC pair already updated for '+pair);  
            }
        } else {
            res.send('No pairs available');
        }
    },
    async marketData (req, res) {
        // https://api.coindcx.com/api/v1/chart/history_v3?symbol=USDTINR&resolution=60&from=1648252800&to=1652631647
        let ohlcURL = "https://api.coindcx.com/api/v1/chart/history_v3?";
        if(typeof req.body.pair != 'undefined' && typeof req.body.pair != undefined) {
            let pairName = (req.body.pair.split('-')[1].split('_')).join('');
            let result = marketsList.indexOf(pairName);
            if(result >= 0) {
                ohlcURL = ohlcURL+'symbol='+pairName;
                if(req.body.interval == '1h') {
                    req.body.interval = 60;
                } else if(req.body.interval == '1d') {
                    req.body.interval = 'D';
                } else if(req.body.interval == '1w') {
                    req.body.interval = 'W';
                } else if(req.body.interval == '1M') {
                    req.body.interval = 'M';
                } else {
                    if(req.body.interval.indexOf('m') >=0) {
                        req.body.interval = req.body.interval.split('m')[0];
                    }
                }
                if(typeof req.body.interval != 'undefined' && typeof req.body.interval != undefined) {
                    ohlcURL = ohlcURL+'&resolution='+req.body.interval;
                }
                if(typeof req.body.startTime != 'undefined' && typeof req.body.startTime != undefined) {
                    ohlcURL = ohlcURL+'&from='+req.body.startTime/1000;
                }
                if(typeof req.body.endTime != 'undefined' && typeof req.body.endTime != undefined) {
                    ohlcURL = ohlcURL+'&to='+req.body.endTime/1000;
                }
                
                getJSON(ohlcURL, async function (error, response) {
                    if(error || response.s != 'ok') {
                        response = [];
                    } else {
                        response = response.data.reverse();
                    }
                    let records = [], checkRequired = false;
                    if(req.body.interval <= 60) {
                        checkRequired = true;
                    }
                    response.forEach(function (row) {
                        let priceChange = common.getUsdtRateChange();
                        if(priceChange.changeValue > 0) {
                            row.open = priceChange.changePer * (+row.open);
                            row.high = priceChange.changePer * (+row.high);
                            row.low = priceChange.changePer * (+row.low);
                            row.close = priceChange.changePer * (+row.close);
						}
                        if(checkRequired) {
                            let diff = ((row.high - row.open) / row.open) * 100;
                            let diff1 = ((row.open - row.low) / row.open) * 100;
                            if((diff > 10 || diff < -10) || (diff1 > 10 || diff1 < -10)) {
                                if(diff > 10 || diff < -10) {
                                    row.high = row.open > row.close ? row.open : row.close;
                                }
                                if(diff1 > 10 || diff1 < -10) {
                                    row.low = row.open < row.close ? row.open : row.close;
                                }
                            }
                        }
                        row.dateTime = new Date(row.time);
                        records.push(row);
                    });
                    const getres = await query_helper.findoneData(tradeChartDB, { pairName: (req.body.pair.split('-')[1].split('_').join('_')), chartType: 'Wazirx' }, {}, {_id: -1});
                    if(getres.status && records.length > 0) {
                        let firstDate = new Date(getres.msg.time), secondDate = new Date(records[0].time);
                        if(firstDate.getFullYear() == secondDate.getFullYear() && firstDate.getMonth() == secondDate.getMonth() && firstDate.getDate() == secondDate.getDate() && firstDate.getHours() == secondDate.getHours()) {
                            records[0].close = getres.msg.price;
                            records[0].high = records[0].high < getres.msg.price ? getres.msg.price : records[0].high;
                            records[0].low = records[0].low > getres.msg.price ? getres.msg.price : records[0].low;
                        }
                    }
                    res.json(records);
                });
            } else {
                ohlcURL = ohlcURL+'symbol=BTCINR';
                if(req.body.interval == '1h') {
                    req.body.interval = 60;
                } else if(req.body.interval == '1d') {
                    req.body.interval = 'D';
                } else if(req.body.interval == '1w') {
                    req.body.interval = 'W';
                } else if(req.body.interval == '1M') {
                    req.body.interval = 'M';
                } else {
                    if(req.body.interval.indexOf('m') >=0) {
                        req.body.interval = req.body.interval.split('m')[0];
                    }
                }
                if(typeof req.body.interval != 'undefined' && typeof req.body.interval != undefined) {
                    ohlcURL = ohlcURL+'&resolution='+req.body.interval;
                }
                if(typeof req.body.startTime != 'undefined' && typeof req.body.startTime != undefined) {
                    ohlcURL = ohlcURL+'&from='+req.body.startTime/1000;
                }
                if(typeof req.body.endTime != 'undefined' && typeof req.body.endTime != undefined) {
                    ohlcURL = ohlcURL+'&to='+req.body.endTime/1000;
                }
                getJSON(ohlcURL, async function (error, response) {
                    if(error || response.s != 'ok') {
                        response = [];
                    } else {
                        response = response.data.reverse();
                    }
                    const pair = req.body.pair.split('-')[1];
                    const sDate = new Date(req.body.startTime);
                    const eDate = new Date(req.body.endTime);
                    let groupBy = {};
                    // if(req.body.interval == '1h') {
                    //     req.body.interval = 60;
                    // } else if(req.body.interval == '1d') {
                    //     req.body.interval = 'D';
                    // } else if(req.body.interval == '1w') {
                    //     req.body.interval = 'W';
                    // } else if(req.body.interval == '1M') {
                    //     req.body.interval = 'M';
                    // } else {
                    //     if(req.body.interval.indexOf('m') >=0) {
                    //         req.body.interval = req.body.interval.split('m')[0];
                    //     }
                    // }
                    let diffTime = 0;
                    if(req.body.interval <= 60) {
                        diffTime = req.body.interval * 60 * 1000;
                        if(req.body.interval > 1) {
                            groupBy = {
                                "year": { "$year": "$time" },
                                "dayOfYear": { "$dayOfYear": "$time" },
                                "hour": { "$hour": "$time" },
                                "interval": {
                                "$subtract": [ 
                                    { "$minute": "$time" },
                                    { "$mod": [{ "$minute": "$time"}, req.body.interval] }
                                ]
                                }                    
                            }
                        } else {
                            groupBy = {
                                "year": {
                                    "$year": "$time"
                                },
                                "month": {
                                    "$month": "$time"
                                },
                                "day": {
                                    "$dayOfMonth": "$time"
                                }
                            }
                            groupBy = {
                                "year": {
                                    "$year": "$time"
                                },
                                "month": {
                                    "$month": "$time"
                                },
                                "day": {
                                    "$dayOfMonth": "$time"
                                },
                                "hour": { 
                                    "$hour": "$time" 
                                },
                                "minute": { 
                                    "$minute": "$time" 
                                },
                            }
                        }
                    } else if (req.body.interval == 'D') {
                        diffTime = 24 * 60 * 60 * 1000;
                        groupBy = {
                            "year": {
                                "$year": "$time"
                            },
                            "month": {
                                "$month": "$time"
                            },
                            "day": {
                                "$dayOfMonth": "$time"
                            }
                        }
                    } else if (req.body.interval == 'W') {
                        diffTime = 7 * 24 * 60 * 60 * 1000;
                        groupBy = {
                            "year": {
                            "$year": "$time"
                        },
                        "month": {
                            "$month": "$time"
                        },
                        "day": {
                            "$dayOfMonth": "$time"
                        },
                        "interval": {
                            "$subtract": [ 
                                { "$day": "$time" },
                                { "$mod": [
                                        { "$day": "$time" }, 7
                                    ]
                                }
                            ]
                        }
                        }
                    } else if (req.body.interval == 'M') {
                        diffTime = 30 * 24 * 60 * 60 * 1000;
                        groupBy = {
                            "year": {
                                "$year": "$time"
                            },
                            "month": {
                                "$month": "$time"
                            }
                        }
                    }
                    if (sDate.getTime() > eDate.getTime()) {
                        res.json({ "message": "Please ensure that the End Date is greater than or equal to the Start Date" });
                        return false;
                    }
                    const getres = await query_helper.findoneData(tradeChartDB, { pairName: pair, chartType: 'Chart' }, {});
                    let whereCond = {
                        pairName: pair,
                        time: {$gte: sDate, $lte: eDate}
                    }
                    if(getres.status) {
                        whereCond.chartType = 'Chart';
                    }
                    const project = { _id: 0, Date: "$Date", pair: { $literal: pair }, low: "$low", high: "$high", open: "$open", close: "$close", volume: "$volume", exchange: { $literal: "Exchange" } };
                    tradeChartDB.aggregate([
                        {
                            $match: whereCond
                        },
                        {
                            "$group": {
                                "_id": groupBy,
                                count: {
                                    "$sum": 1
                                },
                                Date: { $first: "$time" },
                                pairName: { $first: '$pairName' },
                                low: { $min: '$low' },
                                high: { $max: '$high' },
                                open: { $first: '$open' },
                                close: { $last: '$close' },
                                volume: { $sum: '$volume' }
                            }
                        },
                        {
                            $project: project,
                        },
                        {
                            $sort: {
                                "Date": -1,
                            }
                        },
                        { $limit : 1000 }
                    ]).exec(async function (err, result) {
                        let tradeOrders = [];
                        let tradeOrdersNew = [];
                        if(!err && result.length > 0) {
                            result = result.reverse();
                            let inc = 0;
                            for(let i = 0; i < response.length; i++) {
                                response[i].dateTime = new Date(response[i].time);
                                let flagSet = 0;
                                result.forEach(function (row, index) {
                                    let tradeTime = new Date(new Date(row.Date).setMilliseconds(0)).setSeconds(0);
                                    if(diffTime > (60*60*1000)) {
                                        tradeTime = new Date(tradeTime).setMinutes(0);
                                    }
                                    if(diffTime > (24*60*60*1000)) {
                                        tradeTime = new Date(tradeTime).setHours(0);
                                    }
                                    result[index].time = tradeTime;
                                    result[index].Date = new Date(tradeTime);

                                    let allowChk = false;
                                    const diffChk = tradeTime - response[i].time;
                                    if(tradeTime == response[i].time) {
                                        allowChk = true;
                                    }
                                    else if(
                                        (diffTime === (24*60*60*1000))
                                        &&
                                        (diffChk >= (1*60*60*1000) && diffChk <= (24*60*60*1000))
                                    ) {
                                        allowChk = true;
                                    }
                                    else {
                                        allowChk = false;
                                    }
                                    if(allowChk === true) {
                                        flagSet = 1;
                                        tradeOrders[inc] = {};
                                        tradeOrders[inc].dateTime = new Date(response[i].time);
                                        tradeOrders[inc].time = response[i].time;
                                        tradeOrders[inc].open = row.open;
                                        tradeOrders[inc].high = row.high;
                                        tradeOrders[inc].low = row.low;
                                        tradeOrders[inc].close = row.close;
                                        tradeOrders[inc].volume = row.volume;

                                        tradeOrdersNew.push({
                                            dateTime: new Date(response[i].time),
                                            time: response[i].time,
                                            open: row.open,
                                            high: row.high,
                                            low: row.low,
                                            close: row.close,
                                            volume: row.volume
                                        });
                                    }
                                });
                                if(flagSet == 0) {
                                    if(inc != 0) {
                                        if(typeof tradeOrders[inc-1] == 'object') {
                                            tradeOrders[inc] = tradeOrders[inc-1];
                                            tradeOrders[inc].dateTime = new Date(response[i].time);
                                            tradeOrders[inc].time = response[i].time;
                                        }
                                    }
                                }
                                if(tradeOrders.length > 0) {
                                    inc++;
                                }
                            }
                        }
                        return res.json(tradeOrdersNew);
                        // return res.json(tradeOrders);
                        // return res.json({tradeOrders, tradeOrdersNew, result, response});
                    });
                });
            }
        } else {
            res.json([]);
        }
    },
    async marketDataRevert (req, res) {
        const pair = req.body.pair.split('-')[1];
        const sDate = new Date(req.body.startTime);
        const eDate = new Date(req.body.endTime);
        let groupBy = {};
        if(req.body.interval == '1h') {
            req.body.interval = 60;
        } else if(req.body.interval == '1d') {
            req.body.interval = 'D';
        } else if(req.body.interval == '1w') {
            req.body.interval = 'W';
        } else if(req.body.interval == '1M') {
            req.body.interval = 'M';
        } else {
            if(req.body.interval.indexOf('m') >=0) {
                req.body.interval = req.body.interval.split('m')[0];
            }
        }
        let diffTime = 0;
        if(req.body.interval <= 60) {
            diffTime = req.body.interval * 60 * 1000;
            if(req.body.interval > 1) {
                groupBy = {
                    "year": { "$year": "$time" },
                    "dayOfYear": { "$dayOfYear": "$time" },
                    "hour": { "$hour": "$time" },
                    "interval": {
                    "$subtract": [ 
                        { "$minute": "$time" },
                        { "$mod": [{ "$minute": "$time"}, req.body.interval] }
                    ]
                    }                    
                }
            } else {
                groupBy = {
                    "year": {
                        "$year": "$time"
                    },
                    "month": {
                        "$month": "$time"
                    },
                    "day": {
                        "$dayOfMonth": "$time"
                    }
                }
                groupBy = {
                    "year": {
                        "$year": "$time"
                    },
                    "month": {
                        "$month": "$time"
                    },
                    "day": {
                        "$dayOfMonth": "$time"
                    },
                    "hour": { 
                        "$hour": "$time" 
                    },
                    "minute": { 
                        "$minute": "$time" 
                    },
                }
            }
        } else if (req.body.interval == 'D') {
            diffTime = 24 * 60 * 60 * 1000;
            groupBy = {
                "year": {
                    "$year": "$time"
                },
                "month": {
                    "$month": "$time"
                },
                "day": {
                    "$dayOfMonth": "$time"
                }
            }
        } else if (req.body.interval == 'W') {
            diffTime = 7 * 24 * 60 * 60 * 1000;
            groupBy = {
                "year": {
                "$year": "$time"
            },
            "month": {
                "$month": "$time"
            },
            "day": {
                "$dayOfMonth": "$time"
            },
            "interval": {
                "$subtract": [ 
                    { "$day": "$time" },
                    { "$mod": [
                            { "$day": "$time" }, 7
                        ]
                    }
                ]
            }
            }
        } else if (req.body.interval == 'M') {
            diffTime = 30 * 24 * 60 * 60 * 1000;
            groupBy = {
                "year": {
                    "$year": "$time"
                },
                "month": {
                    "$month": "$time"
                }
            }
        }
        if (sDate.getTime() > eDate.getTime()) {
            res.json({ "message": "Please ensure that the End Date is greater than or equal to the Start Date" });
            return false;
        }
        const getres = await query_helper.findoneData(tradeChartDB, { pairName: pair, chartType: 'Chart' }, {});
        let whereCond = {
            pairName: pair,
            time: {$gte: sDate, $lte: eDate}
        }
        if(getres.status) {
            whereCond.chartType = 'Chart';
        }
        const project = { _id: 0, Date: "$Date", pair: { $literal: pair }, low: "$low", high: "$high", open: "$open", close: "$close", volume: "$volume", exchange: { $literal: "Exchange" } };
        tradeChartDB.aggregate([
            {
                $match: whereCond
            },
            {
                "$group": {
                    "_id": groupBy,
                    count: {
                        "$sum": 1
                    },
                    Date: { $first: "$time" },
                    pairName: { $first: '$pairName' },
                    low: { $min: '$low' },
                    high: { $max: '$high' },
                    open: { $first: '$open' },
                    close: { $last: '$close' },
                    volume: { $sum: '$volume' }
                }
            },
            {
                $project: project,
            },
            {
                $sort: {
                    "Date": -1,
                }
            },
            { $limit : 1000 }
        ]).exec(async function (err, result) {
            let tradeOrders = [];
            if(!err && result.length > 0) {
                result = result.reverse();
                let inc = 0;
                result.forEach(function (row, index) {
                    let tradeTime = new Date(new Date(row.Date).setMilliseconds(0)).setSeconds(0);
                    if(diffTime > (60*60*1000)) {
                        tradeTime = new Date(tradeTime).setMinutes(0);
                    }
                    if(diffTime > (24*60*60*1000)) {
                        tradeTime = new Date(tradeTime).setHours(0);
                    }
                    result[index].time = tradeTime;
                    result[index].Date = new Date(tradeTime);
                        flagSet = 1;
                        tradeOrders[inc] = {};
                        tradeOrders[inc].dateTime = new Date(tradeTime);
                        tradeOrders[inc].time = tradeTime;
                        tradeOrders[inc].open = row.open;
                        tradeOrders[inc].high = row.high;
                        tradeOrders[inc].low = row.low;
                        tradeOrders[inc].close = row.close;
                        tradeOrders[inc].volume = row.volume;
                        inc++;
                });
            }
            res.json(tradeOrders);
        });
    },
    async getOrderWiseAmount (req, res) {
        try {
            const userId = mongoose.Types.ObjectId(req.query.userId);
            let currencyList = await query_helper.findData(CurrencyDb, {}, {},{_id:-1},0);
            let usdtRates = {};
            currencyList.msg.forEach(items => {
                usdtRates[items.currencySymbol] = items.USDvalue;
            });
            let userOrders = await query_helper.findData(orderDB, { userId: userId }, {amount: 1, type: 1, status: 1, pairName: 1},{_id:-1},0);
            let returnOrders = [], inc = 0, usdValue = 0;
            if(userOrders.status && userOrders.msg.length > 0) {
                const userMapOrders = await Promise.all(
                    userOrders.msg.map(async data => {
                        let where = {};
                        if(data.type == 'buy') {
                            where['buyOrderId'] = data._id;
                        } else {
                            where['sellOrderId'] = data._id;
                        }
                        let userMapOrders = await query_helper.findData(mapDb, where, {},{_id:-1},0);
                        return {orderData: data, userMapOrders: (userMapOrders.status && userMapOrders.msg.length > 0) ? userMapOrders.msg : []};
                    })
                );
                userMapOrders.forEach(item => {
                    if(item.userMapOrders.length > 0) {
                        let filledAmount = 0;
                        item.userMapOrders.forEach(item1 => {
                            filledAmount = filledAmount + item1.filledAmount;
                        });
                        if(filledAmount > item.orderData.amount) {
                            let extraAmount = +((filledAmount - item.orderData.amount).toFixed(8));
                            if(extraAmount > 0) {
                                returnOrders[inc] = JSON.parse(JSON.stringify(item.orderData));
                                returnOrders[inc].filledAmount = filledAmount;
                                returnOrders[inc].extraAmount = extraAmount;
                                returnOrders[inc].USDTValue = extraAmount * usdtRates[item.orderData.pairName.split('_')[0]];
                                usdValue = usdValue + returnOrders[inc].USDTValue;
                                inc++;
                            }
                        }
                    }
                });
            }
            res.json({usdValue: +usdValue.toFixed(2), returnOrders})
        } catch(err){
            console.log('err', err)
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    }
};
async function updOhlcData(pair, pairid, toTs, res){
    let pairs = pair.split('_');
    let ohlcURL = "https://min-api.cryptocompare.com/data/v2/histoday?fsym="+pairs[0]+"&tsym="+pairs[1]+"&limit=2000";
    if(toTs > 0){
        ohlcURL += "&toTs="+toTs;
    }
    getJSON(ohlcURL, async function (error, response) {
        if(!error && response && (response.Response == 'Success' || response.Response == "'Success'") && response.Data && response.Data.Data && response.Data.Data.length > 0){
            let datasList = response.Data.Data;
            let firstData = datasList[0];
            let lastData = datasList[(datasList.length-1)];
            if(firstData.time < lastData.time){
                datasList = datasList.reverse();
            }
            if(datasList.length > 0){
                insertOndatabase(pair, pairid, datasList, res);
            } else {
                await query_helper.updateData(Pairs,'one',{ pair: pair }, {ohlcUpdated:2});
                res.send('Pair updated successfully');
            }
        } else {
            await query_helper.updateData(Pairs,'one',{ pair: pair }, {ohlcUpdated:2});
            res.send('Pair updated successfully');
        }
    });
}
async function insertOndatabase(pair, pairid, datasList, res){
    try{
        let doneCheck = false;
        let orders = [];
        let lastList = datasList[datasList.length - 1];
        for(let inc = 0; inc < datasList.length; inc++) {
            let list = datasList[inc];
            if(list.volumefrom != 0 && list.volumeto != 0){
                let ordertype = ['buy', 'sell'];
                let records = {
                    price : list.open,
                    open : list.open,
                    high : list.high,
                    low : list.low,
                    close : list.close,
                    volume : list.volumeto,
                    total : list.volumeto * list.open,
                    type : ordertype[Math.floor(Math.random() * ordertype.length)],
                    pair : pairid,
                    pairName : pair,
                    time : new Date((list.time*1000)),
                    dataFrom: "updOhlcData"
                }
                orders.push(records);
            } else {
                if(list.volumefrom == 0 && list.volumeto == 0 && list.high == 0 && list.low == 0 && list.open == 0 && list.close == 0){
                    doneCheck = true;
                }
            }
        }
        if(orders.length > 0) {
            await query_helper.insertData(tradeChartDB, orders);
            if(!doneCheck) {
                let toTs = lastList.time - 86400;
                updOhlcData(pair,pairid,toTs,res);
            }
        }
        if(doneCheck) {
            await query_helper.updateData(Pairs,'one',{ pair: pair }, {ohlcUpdated:1});
            res.send('Pair updated successfully');
        }
    } catch(e){
        console.log('insertOndatabase',e);
        await query_helper.updateData(Pairs,'one',{ pair: pair }, {ohlcUpdated:1});
        res.send('Pair updated successfully');
    }
}
module.exports = tradeController;