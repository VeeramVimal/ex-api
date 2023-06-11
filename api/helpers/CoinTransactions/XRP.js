const query_helper = require('../query');
const mongoose = require('mongoose');
let common = require('../common');
let config = require("../../Config/config");
var getJSON = require('get-json');
const RippleAPI = require('ripple-lib').RippleAPI;
var jsonrpc = require("../../Config/rpc");
const Adminaddress = mongoose.model("AdminAddress");
const CoinAddress = mongoose.model("CoinAddress");
var mail_helper = require('../mailHelper');
const emailTemplate = mongoose.model("EmailTemplate");
let Transaction = mongoose.model('Transactions');
const Currency = mongoose.model("Currency");
const Users = mongoose.model('Users');
const siteSettings = mongoose.model("SiteSettings");
const AdminTransactions = mongoose.model("AdminTransactions");
let urlType = jsonrpc.xrpconfig.urlType;
const Ripple = new RippleAPI({server: urlType});
exports.getBalance = async function (address, callback) {
    try {
        Ripple.connect().then(function () {
            try {
                Ripple.getAccountInfo(address).then(info => {
                    try {
                        callback(+info.xrpBalance);
                    } catch(e) {
                        console.log('getBalance',e);
                        callback(0);
                    }
                }).catch(()=>{
                    callback(0);
                });
            } catch(e) {
                console.log('getBalance',e);
                callback(0);
            }
        }).catch(()=>{
            callback(0);
        });
    } catch(e) {
        console.log('getBalance',e);
        callback(0);
    }
};
exports.adminBalance = async function (curncyRes) {
    try {
        const CurDet = await query_helper.findoneData(Adminaddress, {currency: "XRP"},{});
        if(CurDet.status){
            const responseBalance = await getJSON(config.backEnd+'v1/wallet/getAddressBalance?currency=XRP&address='+CurDet.msg.address);
            return responseBalance.balance;
        } else {
            return 0;
        }
    } catch(e) {
        console.log('adminBalance err : ',e);
        return 0;
    }
}
exports.CreateAdminAddress = async function (callback) {
    const CurDet = await query_helper.findoneData(Adminaddress, {currency: "XRP"},{});
    if(!CurDet.status){
        try {
            Ripple.connect().then(async function () {
            return Ripple.getServerInfo();
            }).then(async function (server_info) {
                var rippleAddress = Ripple.generateAddress();
                let address = {address:rippleAddress.address,encData:common.encrypt(JSON.stringify({secret:rippleAddress.secret})),currency:'XRP'};
                callback(address);
            });
        } catch (e) {
            console.log('CreateAddress',e);
            callback (false)
        }
    } else {
        callback(false)
    }
}
exports.CreateAddress = async function (user_id, callback) {
    const CurDet = await query_helper.findoneData(Adminaddress, {currency: "XRP"},{});
    if(!CurDet.status){
        try {
            Ripple.connect().then(async function () {
            return Ripple.getServerInfo();
            }).then(async function (server_info) {
                var rippleAddress = Ripple.generateAddress();
                let address = {address:rippleAddress.address,encData:common.encrypt(JSON.stringify({secret:rippleAddress.secret})),currency:'XRP'};
                await query_helper.insertData(Adminaddress,address);
                var getdate = new Date();
                var randomTime = getdate.getTime();
                var s1 = randomTime.toString();
                var s2 = s1.substr(5);
                let finRandom = 1+s2;
                let obj = {}
                obj.address = address.address
                obj.tag = finRandom
                Ripple.disconnect();
                callback(obj)
            });
        } catch (e) {
            console.log('CreateAddress',e);
            callback (false)
        }
    } else {
        var getdate = new Date();
        var randomTime = getdate.getTime();
        var s1 = randomTime.toString();
        var s2 = s1.substr(5);
        let finRandom = 1+s2;
        let obj = {}
        obj.address = CurDet.msg.address
        obj.tag = finRandom;
        callback(obj)
    }
}
exports.CoinDeposit =  async function () {
    console.log("CoinDeposit : XRP : ");
    if(common.getSiteDeploy() == 0) {
        const resData = await query_helper.findoneData(Adminaddress,{currency: "XRP"},{});
        if(resData.status){
            let currencyDeposit = await query_helper.findoneData(Currency, { currencySymbol: "XRP", contractAddress: "" }, {})
            if(currencyDeposit.status) {
                if(currencyDeposit.msg.depositEnable == 1) {
                    var rippleAddress = resData.msg.address;
                    try {
                        let resdata1 = await query_helper.findoneData(siteSettings, {}, {})
                        resdata1 = resdata1.msg;
                        Ripple.connect().then(function () {
                            return Ripple.getServerInfo();
                        }).then(function (server_info) {
                            var version = server_info.validatedLedger.ledgerVersion - 18640;
                            Ripple.getTransactions(rippleAddress, { "minLedgerVersion": parseInt(version) }).then(function (transaction_user) {
                                if (transaction_user.length > 0) {
                                    return UpdateDeposit_xrp(transaction_user, rippleAddress, resdata1, 0);
                                }
                            });
                        });
                    } catch (e) {
                        console.log('CoinDeposit', e)
                    }
                }
            }
        }
    }
}
async function UpdateDeposit_xrp(transaction, addressxrp, resdata, inc) {
    if(common.getSiteDeploy() == 0) {
        var tr = inc;
        var address = transaction[tr].specification.destination.address;
        var checkaddress = address.toLowerCase();
        var checkaddress1 = addressxrp.toLowerCase();
        if (transaction[tr].outcome.result == 'tesSUCCESS' && checkaddress == checkaddress1) {
            var txid = transaction[tr].id;
            var value = transaction[tr].specification.source.maxAmount.value
            value = +value;
            if (typeof transaction[tr].specification.destination.tag == 'number') {
                let userdata = await query_helper.findoneData(CoinAddress, { currencyname: "XRP", tag: transaction[tr].specification.destination.tag.toString() }, {});
                if (userdata.status) {
                    const user_id = userdata.msg.user_id;
                    const userdeposit_table = { "txnId": txid, "type": "Deposit" }
                    let xrpPaymentData = await query_helper.findoneData(Transaction, userdeposit_table, {})
                    if (!xrpPaymentData.status) {
                        let currency = await query_helper.findoneData(Currency, { "currencySymbol": 'XRP' }, {});
                        if (currency.status) {
                            currency = currency.msg;
                            let curr_id = currency.currencyId;
                            var amount = +value
                            // const totINR = (+amount) * currency.INRvalue;
                            // if(totINR >= resdata.minDeposit) {}
                            if(amount >= currency.minCurDeposit) {
                                let payments = {
                                    "userId": mongoose.mongo.ObjectId(user_id),
                                    "address": address,
                                    "amount": +amount,
                                    "currencyId": currency._id,
                                    "walletCurrencyId": curr_id,
                                    "type": "Deposit",
                                    "txnId": txid,
                                    "tag": transaction[tr].specification.destination.tag,
                                    "status": 1
                                }
                                let siteData = await query_helper.insertData(Transaction, payments);
                                if (siteData.status) {
                                    let balances = await common.getbalance(user_id, curr_id)
                                    let curbal = +balances.amount;
                                    let finbal = curbal + +amount;
                                    await common.updateUserBalance(user_id, curr_id, finbal, curbal, siteData._id, 'Deposit')
                                    let userresult = await query_helper.findoneData(Users, { _id: mongoose.mongo.ObjectId(user_id) }, {})
                                    userresult = userresult.msg;
                                    let configresult = await query_helper.findoneData(emailTemplate, { hint: 'user-deposit' }, {})
                                    if (configresult.status) {
                                        configresult = configresult.msg;
                                        let emailtemplate = configresult.content.replace(/###NAME###/g, userresult.username).replace(/###AMOUNT###/g, amount+' '+currency.currencySymbol+' ');
                                        mail_helper.sendMail({ subject: configresult.subject, to: userresult.email, html: emailtemplate }, (aftermail) => {
                                        })
                                    }
                                }
                            } else {
                                inc = inc + 1;
                                if (inc < transaction.length) {
                                    UpdateDeposit_xrp(transaction, addressxrp, resdata, inc);
                                }
                            }
                        } else {
                            inc = inc + 1;
                            if (inc < transaction.length) {
                                UpdateDeposit_xrp(transaction, addressxrp, resdata, inc);
                            }
                        }
                    } else {
                        inc = inc + 1;
                        if (inc < transaction.length) {
                            UpdateDeposit_xrp(transaction, addressxrp, resdata, inc);
                        }
                    }
                } else {
                    const resData = await query_helper.findoneData(Adminaddress,{currency: "XRP"},{});
                    if(resData.status) {
                        let alreadyCheckTxn = await query_helper.findoneData(AdminTransactions, { "txnId": txid }, {})
                        if (!alreadyCheckTxn.status) {
                            let currency = resData.msg.currency;
                            let currencyId = resData.msg._id;
                            let adminTxnData = {
                                "currency" : currency,
                                "currencyId": currencyId,
                                "fromaddress": address,
                                "amount": value,
                                "txnId": txid,
                                "status": 1
                            }
                            await query_helper.insertData(AdminTransactions, adminTxnData);
                        }
                    }
                    inc = inc + 1;
                    if (inc < transaction.length) {
                        UpdateDeposit_xrp(transaction, addressxrp, resdata, inc);
                    }
                }
            } else {
                inc = inc + 1;
                if (inc < transaction.length) {
                    UpdateDeposit_xrp(transaction, addressxrp, resdata, inc);
                }
            }
        } else {
            inc = inc + 1;
            if (inc < transaction.length) {
                UpdateDeposit_xrp(transaction, addressxrp, resdata, inc);
            }
        }
    }
}
exports.Coinwithdraw = async function (symbol, transRes, callback) {
    try {
        if(common.getSiteDeploy() == 0) {
            let instructions = {
                maxLedgerVersionOffset: 5
            };
            var amount = parseInt(transRes.receiveAmount);
            amount = amount.toString();
            let resData_adwal = await query_helper.findoneData(Adminaddress,{currency: "XRP"},{});
            if(resData_adwal.status) {
                const secretKey = JSON.parse(common.decrypt(resData_adwal.msg.encData)).secret;
                resData_adwal = resData_adwal.msg;
                let payment = {}, txnError = 0;
                if(transRes.tag == "") {
                    payment = {
                        source: {
                            address: resData_adwal.address,
                            maxAmount: {
                                value: amount,
                                currency: symbol
                            }
                        },
                        destination: {
                            address: transRes.address,
                            amount: {
                                value: amount,
                                currency: symbol
                            },
                        }
                    };
                } else {
                    if(transRes.tag > 0) {
                        payment = {
                            source: {
                                address: resData_adwal.address,
                                maxAmount: {
                                    value: amount,
                                    currency: symbol
                                }
                            },
                            destination: {
                                address: transRes.address,
                                amount: {
                                    value: amount,
                                    currency: symbol
                                },
                                tag: +transRes.tag
                            }
                        };
                    } else {
                        txnError = 1;
                    }
                }
                if(txnError == 0) {
                    Ripple.connect().then(function () {
                        Ripple.preparePayment(resData_adwal.address, payment, instructions).then(function (prepared) {
                            var signed = Ripple.sign(prepared.txJSON, secretKey);
                            var transaction_id = signed.id;
                            Ripple.submit(signed.signedTransaction).then(function (trasn_submit) {
                                transaction_id = transaction_id.toString();
                                callback(transaction_id);
                            });
                        });
                    }).catch(console.error);
                } else {
                    console.log('ripple destination tag issue')
                    callback(false);
                }
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    } catch(e) {
        console.log('Coinwithdraw',e)
        callback(false);
    }
}