const query_helper = require('../../helpers/query');
const mongoose = require('mongoose');
const Currency = mongoose.model("Currency");
const Pairs = mongoose.model("Pairs");
const DerivativesPairDB = mongoose.model("DerivativesPairs");
let OrderBookDB = mongoose.model('OrderBook');

const commonHelper = require('../../helpers/common');
const cronFile = require('../../cron/cron.liq');
const { cat } = require('shelljs');

const pairsController = {
    async getPairs (req, res) {
        try {
            let matchQ = {};        
            let page = 1;
            let limit = 100;
            let pairs = await query_helper.findData(Pairs,matchQ,{},{_id:-1},limit,page)
            res.json({ "status": pairs.status, "getPairsTblDetails": pairs.msg });
        } catch (e) {
            console.log('getPairs',e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getPairsfilter (req, res) {
        try {
            let matchQ = {};
            let getdata = req.body.formvalue;
            if(getdata.pair!=''){
                var queryvalue = getdata.pair
                matchQ.pair = new RegExp(queryvalue,"i");
            }
            if(getdata.status!=''){
                var queryvalue = getdata.status
                matchQ.status = Number(queryvalue)
            }
            if(getdata.autoOrderExecute!=''){
                var queryvalue = getdata.autoOrderExecute
                matchQ.autoOrderExecute = Number(queryvalue)
            }
            if(getdata.tradeEnable != undefined && getdata.tradeEnable!=''){
                var queryvalue = getdata.tradeEnable;
                matchQ.tradeEnable = Number(queryvalue)
            }
            matchQ.exchangeType = 'SPOT';
            let limit =req.body.limit?parseInt(req.body.limit):10;
            let offset =req.body.offset? parseInt(req.body.offset):0
            let pairs = await query_helper.findDatafilter(Pairs,matchQ,{},{_id:-1},limit,offset)
            let pairscount = await Pairs.countDocuments(matchQ)
            res.json({ "status": pairs.status, "getPairsTblDetails": pairs.msg, "total":pairscount});
        } catch (e) {
            console.log('getPairsfilter',e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async addPairs (req, res) {
        let data = req.body;
        let fromCurrency = await query_helper.findoneData(Currency,{_id: mongoose.Types.ObjectId(data.fromCurrency)},{});
        let toCurrency = await query_helper.findoneData(Currency,{_id: mongoose.Types.ObjectId(data.toCurrency)},{});
        if(fromCurrency.status && toCurrency.status) {
            data.pair = fromCurrency.msg.currencySymbol+'_'+toCurrency.msg.currencySymbol
            let getPairs = await query_helper.findoneData(Pairs,{fromCurrency: mongoose.Types.ObjectId(data.fromCurrency), toCurrency: mongoose.Types.ObjectId(data.toCurrency), exchangeType : "SPOT"},{})
            if(!getPairs.status) {
                if(data.autoOrderExecute == 1 || data.autoOrderExecute == "1") {
                    await query_helper.DeleteOne(OrderBookDB,{pair:getPairs.msg.pair});
                }
                data.exchangeType = 'SPOT';
                let pairs = await query_helper.insertData(Pairs, data);
                if(pairs.msg && pairs.msg._id) {
                    data._id = pairs.msg._id
                }
                cronFile.unAvailablePairsUpdate(data, {from: "spot", action: "add"});
                if(pairs.status) {
                    await commonHelper.adminactivtylog(req, 'Pair Added', req.userId, mongoose.Types.ObjectId(data._id), 'New Pair', 'New Pair Added Successfully');
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
    async updatePairs (req, res) {
        let data = req.body;
        let getPairs = await query_helper.findoneData(
            Pairs,
            {
                fromCurrency: mongoose.Types.ObjectId(data.fromCurrency),
                toCurrency: mongoose.Types.ObjectId(data.toCurrency),
                exchangeType : "SPOT",
                _id: { $ne: mongoose.Types.ObjectId(data._id) }
            },
            {}
        );
        if(!getPairs.status) {
            
            let getPairs = await query_helper.findoneData(
                Pairs,
                {
                    fromCurrency: mongoose.Types.ObjectId(data.fromCurrency),
                    toCurrency: mongoose.Types.ObjectId(data.toCurrency),
                    _id: mongoose.Types.ObjectId(data._id)
                },
                {}
            );
            if(getPairs.status) {
                delete data.fromCurrency;
                delete data.toCurrency;

                // if(data.autoOrderExecute == 1) {
                //     const delResp = await query_helper.DeleteOne(OrderBookDB,{pair:getPairs.msg.pair});
                //     console.log("updatePairs delResp --- : ", delResp);
                // }

                let pairs = await query_helper.updateData(Pairs,"one",{
                    _id:mongoose.Types.ObjectId(data._id)
                }, data, {new: true});
                if(pairs.status) {
                    getPairs.msg.autoOrderExecute = data.autoOrderExecute;
                    cronFile.unAvailablePairsUpdate(getPairs.msg, {from: "spot", action: "update"});
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
    async popularPair(req,res){
        try {
            let reqBody = req.body;
            let getPairs = await query_helper.findoneData(Pairs,{ _id: mongoose.Types.ObjectId(reqBody.pairId) },{})
            if (getPairs.status) {
                getPairs =  getPairs.msg;
                let popularPair = 0;
                if (getPairs.popularPair == 0) {
                    popularPair = 1;
                } else {
                    popularPair = 0;
                }
                let pairs = await query_helper.updateData(Pairs,"one",{ _id:mongoose.Types.ObjectId(reqBody.pairId)}, { popularPair : popularPair }, {new: true});
                if(pairs.status) {
                    let text = (popularPair == 1) ? "Enabled" : "Disabled";
                    await commonHelper.adminactivtylog(req, 'Popular Pair Status Updated', req.userId, mongoose.Types.ObjectId(reqBody.pairId), 'Popular Pair Status Updated', ' Popular Pair Status Changed Successfully');
                    res.json({ "status": pairs.status, "message": 'Popular Pair ' + text + ' Successfully!', data : getPairs });
                } else {
                    res.json({ "status": false, "message": pairs.msg });
                }
            } else {
                res.json({ "status": false, "message": 'Invalid pair' });
            }
        } catch (err) {
            console.log("errr",err)
            res.json({ "status": false, "message": 'Something went wrong' });
        }
    }
};
module.exports = pairsController;