const query_helper = require('../query');
var jsonrpc = require("../../Config/rpc");
var getJSON = require('get-json');
let common = require('../common');
const mongoose = require('mongoose');
const Transaction = mongoose.model("Transactions");
const CoinAddress = mongoose.model("CoinAddress");
const Currency = mongoose.model("Currency");
const emailTemplate = mongoose.model("EmailTemplate");
const AdminTransactions = mongoose.model("AdminTransactions");
let fs = require('fs');
const path = require('path');
var mail_helper = require('../mailHelper');
const TronWeb 		= require('tronweb');
const Users = mongoose.model('Users');
const HttpProvider  = TronWeb.providers.HttpProvider;
const eventServer   = jsonrpc.trxconfig.urlType;
const fullNode      = new HttpProvider(eventServer);
const solidityNode  = new HttpProvider(eventServer);

let tronWeb = new TronWeb(
    fullNode,
    solidityNode,
    new HttpProvider(eventServer)
);

const TRONPROAPIKEY = jsonrpc.trxconfig.APIKey;
const TRONPROPRIKEY = jsonrpc.trxconfig.PriKey;

tronWeb.setHeader({ "TRON-PRO-API-KEY": TRONPROAPIKEY });
const tronWebBalance = new TronWeb(
    fullNode,
    solidityNode,
    eventServer,
    TRONPROPRIKEY
);

exports.adminBalance = async function (curncyRes) {
    try {
        let balance;
        if(curncyRes.currencySymbol == 'TRX') {
            balance = await tronWeb.trx.getBalance(jsonrpc.trxconfig.AdminAddress);
        } else {
            let fromAddress = jsonrpc.trxconfig.AdminAddress;
            const res = await balanceAdmin(curncyRes.contractAddress, fromAddress);
            balance = parseInt(res._hex, 16);
        }
        return balance / Math.pow(10, curncyRes.decimal);
    } catch(e) {
        console.log('adminBalance',e, curncyRes.contractAddress);
        return 0;
    }
}

exports.CreateAddress = async function (user_id, callback) {
    try{
        let newAddress = await tronWeb.createAccount();
        if(typeof newAddress.address != 'undefined' && typeof newAddress.address != undefined){
            let walletaddress = newAddress.address.base58;
            let baseDir = path.join(__dirname, '../../Keystore/');
            fs.writeFile(baseDir + walletaddress + ".json", common.encrypt(JSON.stringify(newAddress)), 'utf8', function (err) {
                if (err) {
                    console.log('err',err)
                    callback(false)
                } else {
                    let obj = {}
                    obj.address = walletaddress
                    obj.tag = "";
                    obj.encData = common.encrypt(JSON.stringify(newAddress));
                    callback(obj)
                }
            })
        } else {
            callback(false)
        }
    } catch(e) {
        callback(false)
        console.log('CreateAddress',e)
    }
}
exports.CreateAdminAddress = async function (callback) {
    try{
        let newAddress = await tronWeb.createAccount();
        if(typeof newAddress.address != 'undefined' && typeof newAddress.address != undefined){
            let walletaddress = newAddress.address.base58;
            let baseDir = path.join(__dirname, '../../Keystore/');
            console.log({newAddress});
            fs.writeFile(baseDir + walletaddress + ".json", common.encrypt(JSON.stringify(newAddress)), 'utf8', function (err) {
                if (err) {
                    console.log('err',err)
                    callback(false)
                } else {
                    let obj = {}
                    obj.address = walletaddress
                    obj.tag = "";
                    obj.encData = common.encrypt(JSON.stringify(newAddress));
                    callback(obj)
                }
            })
        } else {
            callback(false)
        }
    } catch(e) {
        callback(false)
        console.log('CreateAddress',e)
    }
}
exports.CoinDeposit = async function (userId) {
    if(common.getSiteDeploy() == 0) {
        let currencyDeposit = await query_helper.findoneData(Currency, { currencySymbol: "TRX", contractAddress: "" }, {})
        if(currencyDeposit.status) {
            if(currencyDeposit.msg.depositEnable == 1) {
                let address_det = await  query_helper.findoneData(CoinAddress, { "user_id": userId, currencyname: 'TRX' }, {})
                try {
                    if (address_det.status) {
                        address_det = address_det.msg;
                        let account = address_det.address;
                        let blockNumber = address_det.trxBlock;
                        let  trxblockNumber = blockNumber.trx;
                        if (trxblockNumber > 0) {
                            trxblockNumber = (trxblockNumber - 10000);
                        }
                        if(trxblockNumber < 0) {
                            trxblockNumber = 0;
                        }
                        // UpdateAdminTransactions(currencyDeposit,trxblockNumber);
                        const response = await getJSON(jsonrpc.trxconfig.APIUrl + account + "/transactions?only_confirmed=true&only_to=true&limit=200&min_timestamp=" +blockNumber.trx);
                        try {
                            if (response.data.length > 0) {
                                let transactions = [];
                                response.data.forEach(element => {
                                    try {
                                        if(typeof element.raw_data != 'undefined' && typeof element.raw_data != undefined) {
                                            if(typeof element.raw_data.contract != 'undefined' && typeof element.raw_data.contract != undefined) {
                                                if(element.raw_data.contract.length > 0) {
                                                    if(element.raw_data.contract[0].parameter.value.amount > 0) {
                                                        if(typeof element.raw_data.contract[0].parameter.value.asset_name != 'string') {
                                                            transactions.push(element);
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    } catch(e) {
                                        console.log('CoinDeposit',e);
                                    }
                                });
                                if(transactions.length > 0) {
                                    UpdateDeposit(transactions, userId, account, blockNumber);
                                }
                                return(true);
                            } else {
                                return(false);
                            }
                        } catch (e) {
                            console.log('CoinDeposit',e);
                            return(false);
                        }
                    } else {
                        return(false);
                    }
                } catch (e) {
                    console.log('CoinDeposit', e)
                    return(false);
                }
            }
        }
    }
}
async function UpdateAdminTransactions(currencyDeposit,trxblockNumber) {
    try {
        const adminAddress = jsonrpc.trxconfig.AdminAddress;
        const currencyResp = await getJSON(jsonrpc.trxconfig.APIUrl + adminAddress + "/transactions?only_confirmed=true&only_to=true&limit=200&min_timestamp=" +trxblockNumber);
        try {
            if (currencyResp.success && currencyResp.data.length > 0) {
                let transaction = currencyResp.data;
                let transactions = [];
                for(let tr = 0; tr < transaction.length; tr++) {
                    const value = transaction[tr].raw_data.contract[0].parameter.value.amount;
                    let fromAddress = tronWeb.address.fromHex(transaction[tr].raw_data.contract[0].parameter.value.owner_address);
                    let toAddress = tronWeb.address.fromHex(transaction[tr].raw_data.contract[0].parameter.value.to_address);
                        if(toAddress.toLowerCase() == adminAddress.toLowerCase()) {
                            let alreadyCheckTrx = await query_helper.findoneData(AdminTransactions, { "txnId": transaction[tr].txID }, {})
                            if (!alreadyCheckTrx.status) {
                                if (value > 0) {
                                    let decimal = currencyDeposit.msg.decimal;
                                    var amount = (value / Math.pow(10, decimal));
                                    let currencyName = currencyDeposit.msg.currencyName;
                                    let currencyId = currencyDeposit.msg.currencyId;
                                    let object = {
                                        currency: currencyName,
                                        currencyId: currencyId,
                                        fromaddress: toAddress,
                                        amount: amount,
                                        txnId: transaction[tr].txID,
                                        status: 1
                                    }
                                    transactions.push(object);
                                }
                            }
                        }
                }
                let txnData = await query_helper.insertData(AdminTransactions, transactions);
            } else {
                return(false);
            }
        } catch (err) {}

        const tokenResp = await getJSON(jsonrpc.trxconfig.APIUrl + adminAddress + "/transactions/trc20?only_confirmed=true&only_to=true&limit=200&min_timestamp=" +trxblockNumber);
        try {
            if (tokenResp.success && tokenResp.data.length > 0) {
                let transaction = tokenResp.data;
                let tokenTransactions = [];
                for(let tr = 0; tr < transaction.length; tr++) {
                    const value = transaction[tr].value;
                    let fromAddress = tronWeb.address.fromHex(transaction[tr].from);
                    let toAddress = tronWeb.address.fromHex(transaction[tr].to);
                    let tokenSymbol = transaction[tr].name;
                    let transaction_id = transaction[tr].transaction_id;
                    let contractAddress = transaction[tr].address;
                        if(toAddress.toLowerCase() == adminAddress.toLowerCase()) {
                            let alreadyCheckTrx = await query_helper.findoneData(AdminTransactions, { "txnId": transaction_id }, {})
                            if (!alreadyCheckTrx.status) {
                                let tokenStatus = await query_helper.findoneData(Currency, { currencySymbol: tokenSymbol, contractAddress: contractAddress }, {})
                                if (tokenStatus.status) {
                                    if (value > 0) {
                                        let decimal = currencyDeposit.msg.decimal;
                                        var amount = (value / Math.pow(10, decimal));
                                        let currencyName = currencyDeposit.msg.currencyName;
                                        let currencyId = currencyDeposit.msg.currencyId;
                                        let object = {
                                            currency: currencyName,
                                            currencyId: currencyId,
                                            fromaddress: toAddress,
                                            amount: amount,
                                            txnId: transaction_id,
                                            status: 1
                                        }
                                        tokenTransactions.push(object);
                                    }
                                }
                            }
                        }
                }
                let txnData = await query_helper.insertData(AdminTransactions, tokenTransactions);
            } else {
                return(false);
            }
        } catch (err) {}

    } catch(err) {}
}
exports.getPaymentData = async function (address, contract, block, currency) {
    let txnLink = '';
    if(contract == '') {
        txnLink = jsonrpc.trxconfig.APIUrl + address + "/transactions?only_confirmed=true&only_to=true&limit=200&min_timestamp=" +block.coin;
    } else {
        txnLink = jsonrpc.trxconfig.APIUrl + address + "/transactions/trc20?only_confirmed=true&only_to=true&limit=200&min_timestamp=" +block.token;
    }
    const adminAddress = jsonrpc.trxconfig.AdminAddress;
    const response = await getJSON(txnLink);
    let transactions = [];
    try {
        if(response.success && response.data.length > 0) {
            let transaction = response.data;
            for(let tr = 0; tr < transaction.length; tr++) {
                if(contract == '') {
                    const value = transaction[tr].raw_data.contract[0].parameter.value.amount;
                    let fromAddress = tronWeb.address.fromHex(transaction[tr].raw_data.contract[0].parameter.value.owner_address);
                    let toAddress = tronWeb.address.fromHex(transaction[tr].raw_data.contract[0].parameter.value.to_address);
                    let txnWithdraw = await query_helper.findoneData(Transaction, { "txnId": transaction[tr].txID, "type": "Withdraw" }, {})
                    if((fromAddress.toLowerCase() != adminAddress.toLowerCase()) || (fromAddress.toLowerCase() == adminAddress.toLowerCase() && txnWithdraw.status)) {
                        if(toAddress.toLowerCase() == address.toLowerCase()) {
                            if (value > 0) {
                                var amount = (value / Math.pow(10, currency.decimal));
                                let object = {
                                    txnId: transaction[tr].txID,
                                    value: amount,
                                    blockNumber: transaction[tr].block_timestamp,
                                    moveCur: 'TRX'
                                }
                                transactions.push(object);
                            }
                        }
                    }
                } else {
                    const contractAddress = transaction[tr].token_info.address;
                    if(contractAddress == contract || contractAddress.toLowerCase() == contract.toLowerCase()) {
                        var toAddress = transaction[tr].to;
                        var value = transaction[tr].value;
                        if (address.toLowerCase() == toAddress.toLowerCase() && value > 0) {
                            var amount = (value / Math.pow(10, currency.decimal));
                            let object = {
                                txnId: transaction[tr].transaction_id,
                                value: amount,
                                blockNumber: transaction[tr].block_timestamp,
                                moveCur: 'TRX-TOKEN'
                            }
                            transactions.push(object);
                        }
                    }
                }
            }
        }
    } catch(e) {
        console.log('getPaymentData',e);
    }
    return transactions;
}
async function UpdateDeposit(transaction, user_id, usertrxaddress, blockNumber) {
    if(common.getSiteDeploy() == 0) {
        for (var trr = 0; trr < transaction.length; trr++) {
            // (async function () {
                var tr = trr;
                // var newKey = tr + 1;
                // setTimeout(async function () {
                    try {
                        var block_number = transaction[tr].block_timestamp;
                        var txid = transaction[tr].txID;
                        var value = transaction[tr].raw_data.contract[0].parameter.value.amount;
                        let fromAddress = tronWeb.address.fromHex(transaction[tr].raw_data.contract[0].parameter.value.owner_address);
                        let toAddress = tronWeb.address.fromHex(transaction[tr].raw_data.contract[0].parameter.value.to_address);
                        let txnWithdraw = await query_helper.findoneData(Transaction, { "txnId": txid, "type": "Withdraw" }, {})
                        if((fromAddress.toLowerCase() != jsonrpc.trxconfig.AdminAddress.toLowerCase()) || (fromAddress.toLowerCase() == jsonrpc.trxconfig.AdminAddress.toLowerCase() && txnWithdraw.status)) {
                            var address = usertrxaddress;
                            if(toAddress.toLowerCase() == address.toLowerCase()) {
                                if (value > 0) {
                                    let userresult = await query_helper.findoneData(Transaction, { "txnId": txid, "type": "Deposit" }, {})
                                    if (!userresult.status) {
                                        let payments = {};
                                        let currency = await query_helper.findoneData(Currency, { "currencySymbol": 'TRX' }, {})
                                        if (currency.status) {
                                            currency = currency.msg;
                                            let curr_id = currency.currencyId;
                                            var amount = (value / Math.pow(10, currency.decimal));
                                            if(amount >= currency.minCurDeposit) {
                                                payments = {
                                                    "userId": user_id,
                                                    "address": address,
                                                    "amount": +amount,
                                                    "currencyId": currency._id,
                                                    "walletCurrencyId": curr_id,
                                                    "type": "Deposit",
                                                    "txnId": txid,
                                                    "status": 1,
                                                    "moveCur": 'TRX'
                                                }
                                                let siteData = await query_helper.insertData(Transaction, payments);
                                                if (siteData.status) {
                                                    blockNumber.trx = block_number;
                                                    await query_helper.updateData(CoinAddress, "one", { "user_id": user_id, currencyname: 'TRX' }, { trxBlock: blockNumber });
                                                    let balances = await common.getbalance(user_id, curr_id);
                                                    let curbal = +balances.amount;
                                                    let finbal = curbal + +amount;
                                                    await common.updateUserBalance(user_id, curr_id, finbal, siteData._id, 'Deposit');
                                                    let userresult= await query_helper.findoneData(Users, { _id: user_id }, {});
                                                    userresult = userresult.msg;
                                                    let configresult = await query_helper.findoneData(emailTemplate, { hint: 'user-deposit' }, {})
                                                    if (configresult.status) {
                                                        configresult = configresult.msg;
                                                        let emailtemplate = configresult.content.replace(/###NAME###/g, userresult.username).replace(/###AMOUNT###/g, amount+' '+currency.currencySymbol+' ');
                                                        mail_helper.sendMail({ subject: configresult.subject, to: userresult.email, html: emailtemplate }, (aftermail) => {
                                                        })
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } catch(e) {
                        console.log('UpdateDeposit',e);
                    }
            //     }, newKey * 1000);
            // })()
        }
    }
}
exports.Coinwithdraw = async function (symbol, transRes, callback) {
    try {
        if(common.getSiteDeploy() == 0) {
            let AdminAddress = jsonrpc.trxconfig.AdminAddress;
            let baseDir = path.join(__dirname, '../../Keystore/');
            fs.readFile(baseDir + AdminAddress + ".json", "utf-8", async function (err, datas) {
                if(!err && datas){
                    let privateKey = common.decrypt(datas)
                    privateKey = JSON.parse(privateKey).privateKey;
                    if(symbol == 'TRX') {
                        amountTransfer(privateKey, (transRes.receiveAmount)*Math.pow(10, transRes.currencyId.decimal), transRes.address, AdminAddress, function (configresult) {
                            callback(configresult);
                        });
                    } else {
                        try {
                            amountTokenTransfer(privateKey, transRes.receiveAmount*Math.pow(10, transRes.currencyId.decimal), transRes.address, transRes.currencyId.contractAddress, function (configresult) {
                                callback(configresult);
                            });
                        } catch (e) {
                            console.log('Coinwithdraw',e)
                            callback(false);
                        }
                    }
                } else {
                    callback(false)
                }
            });
        } else {
            callback(false);
        }
    } catch (e) {
        console.log('Coinwithdraw',e)
        callback(false)
    }
}
function toPlainString(num) {
    let amount = toPlainString1(num);
    return amount.split('.')[0];
}
function toPlainString1(num) {
    return (''+ +num).replace(/(-?)(\d*)\.?(\d*)e([+-]\d+)/,
      function(a,b,c,d,e) {
        return e < 0
          ? b + '0.' + Array(1-e-c.length).join(0) + c + d
          : b + c + d + Array(e-d.length+1).join(0);
      });
}
async function amountTransfer(privateKey, Amount, toAddress, fromAddress, callback) {
    try {
        if(common.getSiteDeploy() == 0) {
            Amount = toPlainString(Amount);
            let tradeobj = await tronWeb.transactionBuilder.sendTrx(toAddress, Amount, fromAddress);
            let signedtxn = await tronWeb.trx.sign(tradeobj, privateKey);
            let receipt = await tronWeb.trx.sendRawTransaction(signedtxn);
            if(receipt.result) {
                var transaction_id = receipt.transaction.txID;
                callback(transaction_id);
            } else {
                callback(false)
            }
        } else {
            callback(false)
        }
    } catch (e) {
        console.log('amountTransfer',e);
        callback(false);
    }
}
//token functionality
exports.TokenDeposit = async function (userId) {
    if(common.getSiteDeploy() == 0) {
        let address_det = await query_helper.findoneData(CoinAddress, { "user_id": userId, currencyname: 'TRX' }, {})
        try {
            if (address_det.status) {
                address_det = address_det.msg;
                let account = address_det.address;
                let blockNumber = address_det.trxBlock;
                if (blockNumber.token > 0) {
                    blockNumber.token = (blockNumber.token - 10000);
                }
                if(blockNumber.token < 0) {
                    blockNumber.token = 0;
                }
                const response = await getJSON(jsonrpc.trxconfig.APIUrl + account + "/transactions/trc20?only_confirmed=true&only_to=true&limit=200&min_timestamp=" +blockNumber.token);
                try {
                    if (response.data.length > 0) {
                        UpdateTokenDeposit(response.data, userId, account, blockNumber);
                    }
                    else {
                        return(false);
                    }
                } catch (e) {
                    console.log('TokenDeposit',e);
                    return(false);
                }
            } else {
                return(false);
            }
        } catch (e) {
            console.log('TokenDeposit', e);
            return(false);
        }
    } else {
        return(false);
    }
}
async function getContractDetails(data){
    const response = await getJSON(jsonrpc.trxconfig.APIUrl1 + "transaction-info?hash=" + data.transaction_id);
    try {
        if(!error && response){
            data.contractAddress = response.toAddress;
            return({status:true,data:data});
        } else {
            return({status:false});
        }
    } catch(e) {
        console.log('getContractDetails', e);
        return({status:false});
    }
}
async function UpdateTokenDeposit(transaction, user_id, usertrxaddress, blockNumber) {
    if(common.getSiteDeploy() == 0) {
        for (var trr = 0; trr < transaction.length; trr++) {
            // (async function () {
                var tr = trr;
                // var newKey = tr + 1;
                // setTimeout(async function () {
                    var block_number = transaction[tr].block_timestamp;
                    var address = transaction[tr].to;
                    var txid = transaction[tr].transaction_id;
                    var value = transaction[tr].value;
                    var contractAddress = transaction[tr].token_info.address;
                    if (address.toLowerCase() == usertrxaddress.toLowerCase() && value > 0) {
                        let userresult = await query_helper.findoneData(Transaction, { "txnId": txid, "type": "Deposit" }, {})
                            if (!userresult.status) {
                            let payments = {};
                            let currency = await  query_helper.findoneData(Currency, { "contractAddress": contractAddress }, {})
                                if (currency.status) {
                                    currency = currency.msg;
                                    if (currency.depositEnable == 1) {
                                        var amount = (value / Math.pow(10, transaction[tr].token_info.decimals));
                                        if(amount >= currency.minCurDeposit) {
                                            let curr_id = currency.currencyId;
                                            payments = {
                                                "userId": user_id,
                                                "address": address,
                                                "amount": +amount,
                                                "currencyId": currency._id,
                                                "walletCurrencyId": curr_id,
                                                "type": "Deposit",
                                                "txnId": txid,
                                                "status": 1,
                                                "moveCur": 'TRX-TOKEN'
                                            }
                                            blockNumber.token = block_number;
                                            await query_helper.updateData(CoinAddress, "one", { "user_id": user_id, currencyname: 'TRX' }, { trxBlock: blockNumber });
                                            let siteData = await query_helper.insertData(Transaction, payments)
                                            if (siteData.status) {
                                                let balances = await common.getbalance(user_id, curr_id)
                                                let curbal = +balances.amount;
                                                let finbal = curbal + +amount;
                                                await common.updateUserBalance(user_id, curr_id, finbal, siteData._id, 'Deposit')
                                                let userresult = await query_helper.findoneData(Users, { _id: user_id }, {})
                                                userresult = userresult.msg;
                                                let configresult = await query_helper.findoneData(emailTemplate, { hint: 'user-deposit' }, {})
                                                if (configresult.status) {
                                                    configresult = configresult.msg;
                                                    let emailtemplate = configresult.content.replace(/###NAME###/g, userresult.username).replace(/###AMOUNT###/g, amount+' '+currency.currencySymbol+' ');
                                                    mail_helper.sendMail({ subject: configresult.subject, to: userresult.email, html: emailtemplate }, (aftermail) => {
                                                    })
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                    }
            //     }, newKey * 1000);
            // })()
        }
    }
}
async function amountTokenTransfer(privateKey, Amount, toAddress, contractAddress, callback) {
    try {
        if(common.getSiteDeploy() == 0) {
            let tronWeb1 = new TronWeb(fullNode, solidityNode, eventServer, privateKey);
            tronWeb1.setHeader({ "TRON-PRO-API-KEY": TRONPROAPIKEY });
            try {
                Amount = toPlainString(Amount);
                let contract = await tronWeb1.contract().at(contractAddress);
                await contract.transfer(toAddress, Amount).send({
                    feeLimit: 30000000
                }).then(output => {
                    callback(output);
                });
            } catch(e) {
                console.log('amountTokenTransfer',e)
                callback(false);
            }
        } else {
            callback(false);
        }
    } catch(e) {
        console.log('amountTokenTransfer',e)
        callback(false);
    }
}
exports.AdminMoveProcess = function () {
    try {
        if(common.getSiteDeploy() == 0) {
            Transaction.aggregate([
                {
                    $match: { moveCur: 'TRX', adminMove: '' }
                },
                {
                    $lookup:
                    {
                    from: 'Currency',
                    localField: 'currencyId',
                    foreignField: '_id',
                    as: 'currency'
                    }
                },
                { $limit: 3 },
                { "$unwind": "$currency" },
                {
                    "$group": {
                        "_id": {
                            "userId": "$userId",
                            "currencyId": "$currencyId"
                        },
                        "address": { "$first": "$address" },
                        "currency" : { "$first": "$currency" }
                    }
                }
            ]).exec(function (err, resData) {
                if(resData.length > 0){
                    for (let i = 0; i < resData.length; i++) {
                        movingProcess(resData[i]);
                    }
                }
            });
        }
    }
    catch (e) {
        console.log('AdminMoveProcess', e)
    }
}
async function movingProcess(response) {
    if(common.getSiteDeploy() == 0) {
        let userId = response._id.userId;
        let fromAddress = response.address;
        let currency = response.currency;
        let minBal = 10 * Math.pow(10, currency.decimal);
        tronWeb.trx.getBalance(fromAddress).then(async function (result) {
            if(result > 0){
                const amount = result - minBal;
                if (amount > 0) {
                    let toAddress = jsonrpc.trxconfig.AdminAddress;
                    let baseDir = path.join(__dirname, '../../Keystore/');
                    fs.readFile(baseDir + fromAddress + ".json", "utf-8", async function (err, datas) {
                        if(!err && datas){
                            let privatekey = common.decrypt(datas)
                            privatekey = JSON.parse(privatekey).privateKey;
                            amountTransfer(privatekey, amount, toAddress,fromAddress, async function (configresult) {
                                if (configresult) {
                                    await query_helper.updateData(Transaction, "many", { "userId": mongoose.Types.ObjectId(userId), moveCur: 'TRX' }, { adminMove: configresult });
                                }
                            });
                        } else {
                            console.log('unable to read file')
                        }
                    })
                } else {
                    await query_helper.updateData(Transaction, "many", { "userId": mongoose.Types.ObjectId(userId), moveCur: 'TRX' }, { adminMove: '1' });
                }
            } else {
                await query_helper.updateData(Transaction, "many", { "userId": mongoose.Types.ObjectId(userId), moveCur: 'TRX' }, { adminMove: '1' });
            }
        })
    }
}
exports.AdminTokenMoveProcess = function () {
    try {
        if(common.getSiteDeploy() == 0) {
            Transaction.aggregate([
                {
                    $match: { moveCur: 'TRX-TOKEN', adminMove: { $in: [ '', '3'] } }
                },
                {
                    $lookup:
                    {
                    from: 'Currency',
                    localField: 'currencyId',
                    foreignField: '_id',
                    as: 'currency'
                    }
                },
                { "$unwind": "$currency" },
                {
                    "$group": {
                        "_id": {
                            "userId": "$userId",
                            "currencyId": "$currencyId"
                        },
                        "amount": { "$max": "$amount" },
                        "address": { "$first": "$address" },
                        "currency" : { "$first": "$currency" }
                    }
                },
                { "$sort": { "amount": -1 } },
                { "$limit": 3 }
            ]).exec(function (err, resData) {
                if(resData.length > 0){
                    for (let i = 0; i < resData.length; i++) {
                        tokenMovingProcess(resData[i]);
                    }
                }
            });
        }
    }
    catch (e) {
        console.log('AdminTokenMoveProcess', e);
    }
}
async function tokenMovingProcess(response) {
    if(common.getSiteDeploy() == 0) {
        let userId = response._id.userId;
        let currencyId = response._id.currencyId;
        let fromAddress = response.address;
        let currency = response.currency;
        try {
            let baseDir = path.join(__dirname, '../../Keystore/');
            let toAddress = jsonrpc.trxconfig.AdminAddress;
            fs.readFile(baseDir + fromAddress + ".json", "utf-8", async function (err, datas) {
                if(!err && datas) {
                    let privatekey = common.decrypt(datas)
                    const privateKey = JSON.parse(privatekey).privateKey;
                    balanceGet(currency.contractAddress, fromAddress, async function (res) {
                        if(res) {
                            const amount = parseInt(res._hex, 16);
                            if (amount > 0) {
                                tronWeb.trx.getBalance(fromAddress).then(async function (result) {
                                    let minBal = 4 * Math.pow(10, 6);
                                    if(result >= minBal) {
                                        amountTokenTransfer(privateKey, res, toAddress, currency.contractAddress, async function (configresult) {
                                            if (configresult) {
                                                await query_helper.updateData(Transaction, "many", { "userId": mongoose.Types.ObjectId(userId), moveCur: 'TRX-TOKEN', currencyId: mongoose.Types.ObjectId(currencyId), adminMove: { $ne: '5' }  }, { adminMove: configresult });
                                            }
                                        });
                                    } else {
                                        let AdminAddress = jsonrpc.trxconfig.AdminAddress;
                                        let baseDir = path.join(__dirname, '../../Keystore/');
                                        fs.readFile(baseDir + AdminAddress + ".json", "utf-8", async function (err, datas) {
                                            if(!err && datas){
                                                let privateKey = common.decrypt(datas)
                                                privateKey = JSON.parse(privateKey).privateKey;
                                                amountTransfer(privateKey, 15*Math.pow(10, 6), fromAddress, AdminAddress, async function (configresult) {
                                                    if(configresult) {
                                                        await query_helper.updateData(Transaction, "many", { "userId": mongoose.Types.ObjectId(userId), moveCur: 'TRX-TOKEN', currencyId: mongoose.Types.ObjectId(currencyId), adminMove: { $ne: '5' }  }, { adminMove: '3', fundsMove: configresult });
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            } else {
                                await query_helper.updateData(Transaction, "many", { "userId": mongoose.Types.ObjectId(userId), moveCur: 'TRX-TOKEN', currencyId: mongoose.Types.ObjectId(currencyId), adminMove: { $ne: '5' }  }, { adminMove: '1' });
                            }
                        }
                    });
                }else{
                    console.log('unable to read file', fromAddress)
                }
            })
        } catch(e) {
            console.log('tokenMovingProcess',e);
        }
    }
}
let listOfContracts = {};
async function balanceGet(contractAddress, fromAddress, callback){
    try {
        if(typeof listOfContracts[contractAddress] == 'undefined' || typeof listOfContracts[contractAddress] == undefined) {
            contract = await tronWebBalance.contract().at(contractAddress);
            listOfContracts[contractAddress] = contract;
        } else {
            contract = listOfContracts[contractAddress];
        }
        const resp = await contract.balanceOf(fromAddress).call();
        callback(resp);
    } catch(e) {
        console.log('balanceGet',e);
        callback(false);
    }
}
async function balanceAdmin(contractAddress, fromAddress){
    let contract = await tronWebBalance.contract().at(contractAddress);
    const resp = await contract.balanceOf(fromAddress).call();
    return(resp);
}