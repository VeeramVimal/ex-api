const query_helper = require('../../helpers/query');
const mongoose = require('mongoose');
const Currency = mongoose.model("Currency");
const CurrencySymbol = mongoose.model("CurrencySymbol");
const Pairs = mongoose.model("Pairs");
let common = require('../../helpers/common');
const currencyController = {
    async getCurrency (req, res) {
        try {
            const matchQ = {}, page = 1, limit = 100;
            let currency = await query_helper.findData(Currency,matchQ,{},{_id:-1},limit,page)
            res.json({ "status": currency.status, "getCurrencyTblDetails": currency.msg });
        } catch (e) {  
            console.log('getCurrency',e);        
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getCurrencyfilter (req, res) {
        try {
            let matchQ = {};
            let getdata=req.body.formvalue;
            if(getdata.currency!=''){
                var queryvalue=getdata.currency
                matchQ.currencyName = new RegExp(queryvalue,"i");
            }
            if(getdata.symbol!=''){
                var queryvalue=getdata.symbol
                matchQ.currencySymbol = new RegExp(queryvalue,"i");
            }
            if(getdata.basecoin!=''){
                var queryvalue=getdata.basecoin
                matchQ.basecoin = new RegExp(queryvalue,"i");
            }
            let limit =req.body.limit?parseInt(req.body.limit):10;
            let offset =req.body.offset? parseInt(req.body.offset):0
            let currency = await query_helper.findDatafilter(Currency,matchQ,{},{_id:-1},limit,offset)
            let currencycount = await Currency.countDocuments(matchQ)
            res.json({ "status": currency.status, "getCurrencyTblDetails": currency.msg,
            "total":currencycount });
        } catch (e) { 
            console.log('getCurrencyfilter',e);             
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async updateCurrency (req, res) {
        let data = req.body;
        let getCurrency = await query_helper.findoneData(Currency,{name:data.currencyName, basecoin: data.basecoin, _id: { $ne: mongoose.Types.ObjectId(data._id) }},{})
        if(!getCurrency.status) {
            let getCurrency1 = await query_helper.findoneData(Currency,{currencySymbol:data.currencySymbol, basecoin: data.basecoin, _id: { $ne: mongoose.Types.ObjectId(data._id) }},{})
            if(!getCurrency1.status) {
                await query_helper.updateData(Currency, "many", { currencySymbol: data.currencySymbol }, { transferEnable: data.transferEnable, stakingTransferEnable: data.stakingTransferEnable })
                delete data.currencyName;
                delete data.currencySymbol;
                let currency = await query_helper.updateData(Currency,"one",{_id:mongoose.Types.ObjectId(data._id)}, data);
                // query_helper.updateData(Pairs,"many",{fromCurrency: mongoose.Types.ObjectId(data._id)}, {amountDecimal: data.siteDecimal});
                // query_helper.updateData(Pairs,"many",{toCurrency: mongoose.Types.ObjectId(data._id)}, {priceDecimal: data.siteDecimal});
                // let currencyList = await query_helper.findData(Currency, {}, {currencySymbol: 1, siteDecimal: 1}, {_id:-1}, 0, 0);
                // if(currencyList.status && currencyList.msg.length > 0) {
                //     currencyList.msg.map(function(record) {
                //         query_helper.updateData(Pairs,"many",{pair: { $regex: record.currencySymbol+'_' }}, {amountDecimal: record.siteDecimal});
                //         query_helper.updateData(Pairs,"many",{pair: { $regex: '_'+record.currencySymbol }}, {priceDecimal: record.siteDecimal});
                //     });
                // }
                await common.adminactivtylog(req,'updatecurrency', req.userId,'NA','update currency', 'Currency Data Updated');
                if(currency.status) {
                    res.json({ "status": currency.status, "message": 'Currency Updated Successfully!' });
                } else {
                    res.json({ "status": false, "message": currency.msg });
                }
            } else {
                res.json({ "status": false, "message": 'Currency Symbol Already Exists' });
            }
        } else {
            res.json({ "status": false, "message": 'Currency Name Already Exists' });
        }
    },
    async addCurrency (req, res) {
        let data = req.body;
        let getCurrency = await query_helper.findoneData(Currency,{currencyName:data.currencyName, basecoin:data.basecoin},{})
        if(!getCurrency.status) {
            let getCurrency1 = await query_helper.findoneData(Currency,{currencySymbol:data.currencySymbol, basecoin:data.basecoin},{})
            if(!getCurrency1.status) {
                let getCurrencySymbol = await query_helper.findoneData(CurrencySymbol,{currencySymbol:data.currencySymbol},{})
                if(!getCurrencySymbol.status) {
                    getCurrencySymbol = await query_helper.insertData(CurrencySymbol,{currencySymbol:data.currencySymbol});
                }
                data.currencyId = getCurrencySymbol.msg._id;
                let currency = await query_helper.insertData(Currency,data);
                if(currency.status) {
                     await common.adminactivtylog(req,'New Currency', req.userId,'NA','New currency', 'Added New Currency Data ');
                    res.json({ "status": currency.status, "message": 'Currency Added Successfully!' });
                } else {
                    res.json({ "status": false, "message": currency.msg });
                }
            } else {
                res.json({ "status": false, "message": 'Currency Symbol Already Exists!' });
            }
        } else {
            res.json({ "status": false, "message": 'Currency Name Already Exists!' });
        }
    },
    async getCurrencyById (req, res) {
        try {
            let currency = await query_helper.findoneData(Currency,{_id:mongoose.Types.ObjectId(req.body._id)},{})
            if(currency.status) {
                res.json({ "status": true, "message": currency.msg });
            } else {
                res.json({ "status": false, "message": 'Not a valid Currency!' });
            }
        } catch (e) {
            console.log('getCurrencyById',e); 
            res.json({ "status": false, "message": "Not a valid Currency!" });
        }
    },
};
module.exports = currencyController;