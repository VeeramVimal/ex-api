var jsonrpc = require("../../Config/rpc");
let config = require("../../Config/config");
var getJSON = require('get-json');
const rpc = require('node-json-rpc2');
const query_helper = require('../query');
var bitcoin_rpc  = require('node-bitcoin-rpc');
let common = require('../common');
const mongoose = require('mongoose');
const Transaction = mongoose.model("Transactions");
const Adminaddress = mongoose.model("AdminAddress");
const CoinAddress = mongoose.model("CoinAddress");
const Currency = mongoose.model("Currency");
const siteSettings = mongoose.model("SiteSettings");
const emailTemplate = mongoose.model("EmailTemplate");
const AdminTransactions = mongoose.model("AdminTransactions");
var mail_helper = require('../mailHelper');
var btchost     = jsonrpc.btcconfig.host;
var btcport     = jsonrpc.btcconfig.port;
var btcusername = jsonrpc.btcconfig.user;
var btcpassword = jsonrpc.btcconfig.password;
bitcoin_rpc.init(btchost, btcport, btcusername, btcpassword)
exports.GetAccounts = function (callback) {
    bitcoin_rpc.call('listlabels',[], function (err, address) {
      callback(address)
    });
}
exports.GetInfo = function (callback) {
    bitcoin_rpc.call('getwalletinfo',[], function (err, getwalletinfo) {
      callback(getwalletinfo)
    });
}
exports.getBalance = function (address, callback) {
    try {
        bitcoin_rpc.call('getwalletinfo',[], function (err, getwalletinfo) {
            try {
                callback(getwalletinfo.result.balance)
            } catch(e) {
                callback(0);
            }
        });
    } catch(e) {
        console.log('getBalance',e);
        callback(0);
    }
}
exports.adminBalance = async function (curncyRes) {
    try {
        const responseBalance = await getJSON(config.backEnd+'v1/wallet/getAddressBalance?currency=BTC&address=');
        return responseBalance.balance;
    } catch(e) {
        console.log('adminBalance',e);
        return 0;
    }
}
exports.CreateAddress = async function (user_id, callback) {
    rpcclient = new rpc.Client(jsonrpc.btcconfig);    
    var method = 'getnewaddress';
    rpcclient.call({method:method,id:'1',jsonrpc:'2.0'},(err,btc_address)=>{
        bitcoin_rpc.call('setlabel',[btc_address.result,user_id], function (err, resAddress) {
            var tcaddress = btc_address.result;
            let obj = {}
            obj.address = tcaddress
            obj.tag = "";
            obj.encData = '';
            callback (obj)
        });
    })
}
exports.CoinDeposit = async function (userId, callback) {
  try {
    if(common.getSiteDeploy() == 0) {
        let currencyDeposit = await query_helper.findoneData(Currency, { currencySymbol: "BTC", contractAddress: "" }, {})
        if(currencyDeposit.status) {
            if(currencyDeposit.msg.depositEnable == 1) {
                // let resdata = await query_helper.findoneData(siteSettings, {}, {})
                // resdata = resdata.msg;
                let resData_adwal = await query_helper.findoneData(Adminaddress, { currencySymbol: "BTC" }, {})
                resData_adwal = resData_adwal.msg;
                bitcoin_rpc.call('listtransactions', ['*', 1000], function (err, address) {
                    if (err === null) {
                        var trans = address.result;
                        trans.map(async function (val, key) {
                            try {
                                var confirmations = val.confirmations;
                                var trans_txid = val.txid;
                                var amount = val.amount;
                                var btc_addr = val.address;
                                var category = val.category;
                                if (category == "receive" && btc_addr != resData_adwal.address) {
                                    var user_add_whr = { "address": btc_addr };
                                    let user_det = await query_helper.findoneData(CoinAddress, user_add_whr, {})
                                    if (user_det.status) {
                                        user_det = user_det.msg;
                                        if (confirmations > 3) {
                                            let user_id = user_det.user_id;
                                            let user_dep_whr = { "userId": mongoose.mongo.ObjectId(user_id), "txnId": trans_txid, "type": "Deposit" };
                                            let dep_det = await query_helper.findoneData(Transaction, user_dep_whr, {})
                                            if (!dep_det.status) {
                                                dep_det = dep_det.msg;
                                                let currency = await query_helper.findoneData(Currency, { "currencySymbol": 'BTC' }, {})
                                                if (currency.status) {
                                                    currency = currency.msg;
                                                    // const totINR = (+amount) * currency.INRvalue;
                                                    // if(totINR >= resdata.minDeposit) {
                                                    // }
                                                    if(amount >= currency.minCurDeposit) {
                                                        let curr_id = currency.currencyId;
                                                        let payments = {
                                                            "userId": mongoose.mongo.ObjectId(user_id),
                                                            "address": btc_addr,
                                                            "amount": +amount,
                                                            "currencyId": currency._id,
                                                            "walletCurrencyId": curr_id,
                                                            "type": "Deposit",
                                                            "txnId": trans_txid,
                                                            "status": 1
                                                        }
                                                        const siteData = await query_helper.insertData(Transaction, payments)
                                                        if (siteData.status) {
                                                            let balances = await common.getbalance(user_id, curr_id)
                                                            let curbal = +balances.amount;
                                                            let finbal = curbal + +amount                  
                                                            await common.updateUserBalance(user_id, curr_id, finbal, siteData._id, 'Deposit')
                                                            let userresult = await query_helper.findoneData(users, { _id: user_det.user_id }, {})
                                                            userresult = userresult.msg;
                                                            let configresult = await query_helper.findoneData(emailTemplate, { hint: 'user-deposit' }, {})
                                                            if (configresult.status) {
                                                                configresult=configresult.msg;
                                                                let emailtemplate = configresult.content.replace(/###NAME###/g, userresult.username).replace(/###AMOUNT###/g, amount+' '+currency.currencySymbol+' ');
                                                                mail_helper.sendMail({ subject: configresult.subject, to: userresult.email, html: emailtemplate }, (aftermail) => {
                                                                })
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    } else {
                                        let alreadyCheckTxn = await query_helper.findoneData(AdminTransactions, { "txnId": trans_txid }, {})
                                        if (!alreadyCheckTxn.status) {
                                            let payments = {
                                                "currency" : resData_adwal.currency,
                                                "currencyId": resData_adwal._id,
                                                "fromaddress": btc_addr,
                                                "amount": +amount,
                                                "txnId": trans_txid,
                                                "status": 1
                                            }
                                            await query_helper.insertData(AdminTransactions, payments);
                                        }
                                    }
                                }
                            } catch (e) {
                                console.log('CoinDeposit',e)
                            }
                        });
                    }
                });
            }
        }
    }
  } catch (e) {
    console.log('CoinDeposit',e)
  }
}
exports.Coinwithdraw =  function (symbol, transRes, callback) {
    if(common.getSiteDeploy() == 0) {
        bitcoin_rpc.call('sendtoaddress', [transRes.address, transRes.receiveAmount], function (err, res) {
            if (err !== null) {
                callback (false)
            } else {
                var transaction_id = res.result;
                transaction_id = transaction_id.toString();
                if(transaction_id!='') {
                    callback(transaction_id)
                } else {
                    callback (false)
                }
            }
        })
    } else {
        callback (false)
    }
}