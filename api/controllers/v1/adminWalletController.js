const ETHCOIN = require('../../helpers/CoinTransactions/ETH.js');
const TRXCOIN = require('../../helpers/CoinTransactions/TRX.js');
const BNBCOIN = require('../../helpers/CoinTransactions/BNB.js');
// const MATICCOIN = require('../../helpers/CoinTransactions/MATIC.js');
const query_helper = require('../../helpers/query');
let common = require('../../helpers/common');

const mongoose = require('mongoose');
const Currency = mongoose.model("Currency");
const AdminAddress = mongoose.model("AdminAddress");

let async = require('async');

const adminController = {
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
                                if (AddressCreate && AddressCreate.address) {
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
                            res.json({ "status": false, "message": "Not a valid request! 4" });
                        }
                    } else {
                        res.json({ "status": false, "message": "Address already exists!" });
                    }
                } else {
                    res.json({ "status": false, "message": "Not a valid request! 1" });
                }
            } else {
                res.json({ "status": false, "message": "Not a valid request! 2" });
            }
        } catch(e) {
            console.log("createAddress",e);
            res.json({ "status": false, "message": "Not a valid request! 3" });
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
            res.json({ status: true, message: "Admin token moving started" });
        } else {
            res.json({ status: false, message: "Please wait for 5 seconds before placing another request!" });
        }
    },
    async getCurrencyBalance (req, res) {
        try {
            let currencyList = await query_helper.findData(Currency,{
                curnType : { "$ne": "Fiat"},
                basecoin : { "$ne": "MATIC20"}
            },{},{},0);
            currencyList = currencyList.msg;
            let empArr = [];
            for(let i=0; i < currencyList.length; i++) {
                let currencyAdminDet = await common.getAdminAdress(currencyList[i]);
                let currencyBalance = await common.walletBalance(currencyList[i]);
                empArr[i] = {
                    address: currencyAdminDet.address,
                    symbol:currencyList[i].currencySymbol,
                    image:currencyList[i].image,
                    decimal:currencyList[i].siteDecimal,
                    basecoin:currencyList[i].basecoin,
                    balance:currencyBalance
                };
            }
            res.json({ "status": true, "data": empArr });
        } catch (e) {
            console.log("getCurrencyBalance",e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
};

let oArray = [];
function _intervalFunc(orderwith){
    orderwith = orderwith.toString();
    var index = oArray.indexOf(orderwith);
    if (index > -1) {
        oArray.splice(index, 1);
    }
}
module.exports = adminController;