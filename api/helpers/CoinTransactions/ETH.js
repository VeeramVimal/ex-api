const query_helper = require('../query');
var jsonrpc = require("../../Config/rpc");
var getJSON = require('get-json');
let common = require('../common');
let fs = require('fs');
const path = require('path');

const mongoose = require('mongoose');
const Transaction = mongoose.model("Transactions");
const CoinAddress = mongoose.model("CoinAddress");
const Currency = mongoose.model("Currency");
const emailTemplate = mongoose.model("EmailTemplate");
const AdminTransactions = mongoose.model("AdminTransactions");
const Users = mongoose.model('Users');

var mail_helper = require('../mailHelper');
var keythereum = require("keythereum");
const Web3 = require("web3");

let nodeUrl = jsonrpc.ethconfig.host;
let provider = new Web3.providers.HttpProvider(nodeUrl);
const web3 = new Web3(provider)

exports.adminBalance = async function (curncyRes) {
    try {
        let balance;
        if(curncyRes.currencySymbol == 'ETH') {
            balance = await getJSON(jsonrpc.ethconfig.APIUrl + "?module=account&action=balance&address=" + jsonrpc.ethconfig.AdminAddress + "&tag=latest&apikey="+jsonrpc.ethconfig.APIKey);
        } else {
            balance = await getJSON(jsonrpc.ethconfig.APIUrl + "?module=account&action=tokenbalance&contractaddress=" + curncyRes.contractAddress + "&address=" + jsonrpc.ethconfig.AdminAddress + "&tag=latest&apikey="+jsonrpc.ethconfig.APIKey)
        }
        return balance.result / Math.pow(10, curncyRes.decimal);
    } catch (e) {
        console.log('adminBalance',e, curncyRes.contractAddress);
        return 0;
    }
}
exports.getBlockNumber = async function () {
    return await web3.eth.getBlockNumber();
},
exports.listAddress = async function (callback) {
    web3.eth.getAccounts().then(e => { 
        callback(e);
    });
},
exports.CreateAddress = async function (user_id, callback) {
    var account = web3.eth.accounts.create();
    var walletprivate = account["privateKey"];
    var walletaddress = account["address"];
    var phppasswallet = jsonrpc.ethconfig.UserKey;
    var keystore = web3.eth.accounts.encrypt(walletprivate, phppasswallet);
    let baseDir = path.join(__dirname, '../../Keystore/');
    fs.writeFile(baseDir + walletaddress.toLowerCase() + ".json", JSON.stringify(keystore), 'utf8', async function (err) {
        try {
            web3.eth.personal.importRawKey(walletprivate.slice(2), phppasswallet);
            if (err) {
                console.log("CreateAddress : err : ", err);
                callback (false)
            } else {
                let obj = {}
                obj.address = walletaddress
                obj.tag = "";
                obj.encData = JSON.stringify(keystore);
                callback (obj)
            }
        }
        catch(err) {
            console.log("ETH CreateAddress : err : ", err)
        }
    })
}
exports.CreateAdminAddress = async function (callback) {
    var account = web3.eth.accounts.create();
    var walletprivate = account["privateKey"];
    var walletaddress = account["address"];
    var phppasswallet = jsonrpc.ethconfig.AdminKey;
    var keystore = web3.eth.accounts.encrypt(walletprivate, phppasswallet);
    let baseDir = path.join(__dirname, '../../Keystore/');
    fs.writeFile(baseDir + walletaddress.toLowerCase() + ".json", JSON.stringify(keystore), 'utf8', function (err) {
        if (err) {
            console.log("CreateAdminAddress : err : ", err);
            callback (false)
        } else {
            let obj = {}
            obj.address = walletaddress
            obj.encData = JSON.stringify(keystore);
            callback (obj)
        }
    })
}
exports.CoinDeposit = async function (userId) {
    if(common.getSiteDeploy() == 0) {
        let currencyDeposit = await query_helper.findoneData(Currency, { currencySymbol: "ETH", contractAddress: "" }, {})
        if(currencyDeposit.status) {
            if(currencyDeposit.msg.depositEnable == 1) {
                let address_det = await query_helper.findoneData(CoinAddress, { "user_id": userId, currencyname: 'ETH' }, {})
                try {
                    if (address_det.status) {
                        address_det = address_det.msg;
                        let account = address_det.address;
                        let blockNumber = address_det.ethBlock;
                        let ethblockNumber = blockNumber.eth;
                        if (ethblockNumber > 0) {
                            ethblockNumber = (ethblockNumber - 10000);
                        }
                        if(ethblockNumber < 0) {
                            ethblockNumber = 0;
                        }
                        // UpdateAdminTransactions(currencyDeposit,ethblockNumber);
                        let reqUrl = jsonrpc.ethconfig.APIUrl + "?module=account&action=txlist&address=" + account + "&startblock=" +blockNumber.eth+ "&endblock=latest";
                        const response = await getJSON(reqUrl);
                        try {
                            if (response.result && response.result.length > 0) {
                                let transactions = [];
                                let inc = 0;
                                for (let i = 0; i < response.result.length; i++) {
                                    if (response.result[i].blockNumber > blockNumber.eth) {
                                        transactions[inc] = response.result[i];
                                        inc++;
                                    }
                                }
                                UpdateDeposit(transactions, userId, account, blockNumber);
                                return(true);
                            } else {
                                return(false);
                            }
                        } catch (e) {
                            console.log('CoinDeposit', e)
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
async function UpdateAdminTransactions(currencyDeposit,ethblockNumber) {
    try {
        if(common.getSiteDeploy() == 0) {
            const adminAddress = jsonrpc.ethconfig.AdminAddress;
            const currencyResp = await getJSON(jsonrpc.ethconfig.APIUrl + "?module=account&action=txlist&address=" + adminAddress + "&startblock=" +ethblockNumber+ "&endblock=latest");
            try {
                if (currencyResp.status == 1 && currencyResp.result.length > 0) {
                    let transactions = [];
                    let transaction = currencyResp.result;
                    for(let tr = 0; tr < transaction.length; tr++) {
                        const value = transaction[tr].value;
                        let toAddress = transaction[tr].to;
                        let txnHash = transaction[tr].hash;
                        let alreadyCheckTxn = await query_helper.findoneData(AdminTransactions, { "txnId": txnHash }, {})
                        if (!alreadyCheckTxn.status) {
                            if (adminAddress.toLowerCase() == toAddress.toLowerCase()) {
                                if (value > 0) {
                                    let decimal = 1000000000000000000;
                                    var amount = (value / decimal);
                                    let currencyName = currencyDeposit.msg.currencyName;
                                    let currencyId = currencyDeposit.msg.currencyId;
                                    let object = {
                                        currency: currencyName,
                                        currencyId: currencyId,
                                        fromaddress: toAddress,
                                        amount: amount,
                                        txnId: txnHash,
                                        status: 1
                                    }
                                    transactions.push(object);
                                }
                            }
                        }
                    }
                let txnData = await query_helper.insertData(AdminTransactions, transactions);
                }
            } catch(err) {}
        
            const tokenResp = await getJSON(jsonrpc.ethconfig.APIUrl + "?module=account&action=tokentx&address=" + adminAddress + "&startblock=" +ethblockNumber+ "&endblock=latest");
            try {
                if (tokenResp.status == 1 && tokenResp.result.length > 0) {
                    let tokenTransactions = [];
                    let transaction = tokenResp.result;
                    for(let tr = 0; tr < transaction.length; tr++) {
                        const value = transaction[tr].value;
                        let toAddress = transaction[tr].to;
                        if (adminAddress.toLowerCase() == toAddress.toLowerCase()) {
                            let contractAddress = transaction[tr].contractAddress;
                            let tokenSymbol  = transaction[tr].tokenSymbol;
                            let txnHash = transaction[tr].hash;
                            let checkTrx = await query_helper.findoneData(AdminTransactions, { "txnId": txnHash }, {})
                            if (!checkTrx.status) {
                                let tokenStatus = await query_helper.findoneData(Currency, { currencySymbol: tokenSymbol, contractAddress: contractAddress }, {})
                                if (tokenStatus.status) {
                                    let decimal = tokenStatus.msg.decimal;
                                    let currencyName = tokenStatus.msg.currencyName;
                                    let currencyId = tokenStatus.msg.currencyId;
                                    if (value > 0) {
                                        var amount = (value / Math.pow(10, decimal));
                                        let object = {
                                            currency: currencyName,
                                            currencyId: currencyId,
                                            fromaddress:toAddress,
                                            amount: amount,
                                            txnId: txnHash,
                                            status: 1
                                        }
                                        tokenTransactions.push(object);
                                    }   
                                }   
                            }
                        }
                    }
                let txnData = await query_helper.insertData(AdminTransactions, tokenTransactions);
                }
            } catch(err) {}
        }
    } catch(err) {}
}
exports.getPaymentData = async function (address, contract, block, currency) {
    let txnLink = '';
    if(contract == '') {
        txnLink = jsonrpc.ethconfig.APIUrl + "?module=account&action=txlist&address=" + address + "&startblock=" +block.coin+ "&endblock=latest&apikey="+jsonrpc.ethconfig.APIKey;
    } else {
        txnLink = jsonrpc.ethconfig.APIUrl + "?module=account&action=tokentx&address=" + address + "&startblock=" + block.token + "&endblock=latest&apikey="+jsonrpc.ethconfig.APIKey;
    }
    const adminAddress = jsonrpc.ethconfig.AdminAddress;
    const response = await getJSON(txnLink);
    let transactions = [];
    if(response.status == 1 && response.result.length > 0) {
        let transaction = response.result;
        for(let tr = 0; tr < transaction.length; tr++) {
            if(contract == '') {
                const value = transaction[tr].value;
                let fromAddress = transaction[tr].from;
                let toAddress = transaction[tr].to;
                let txnWithdraw = await query_helper.findoneData(Transaction, { "txnId": transaction[tr].hash, "type": "Withdraw" }, {})
                if((fromAddress.toLowerCase() != adminAddress.toLowerCase()) || (fromAddress.toLowerCase() == adminAddress.toLowerCase() && txnWithdraw.status)) {
                    if(toAddress.toLowerCase() == address.toLowerCase()) {
                        if (value > 0) {
                            var amount = (value / 1000000000000000000);
                            let object = {
                                txnId: transaction[tr].hash,
                                value: amount,
                                blockNumber: transaction[tr].blockNumber,
                                moveCur: 'ETH'
                            }
                            transactions.push(object);
                        }
                    }
                }
            } else {
                const contractAddress = transaction[tr].contractAddress;
                if(contractAddress == contract || contractAddress.toLowerCase() == contract.toLowerCase()) {
                    var toAddress = transaction[tr].to;
                    var value = transaction[tr].value;
                    if (address.toLowerCase() == toAddress.toLowerCase() && value > 0) {
                        var amount = (value / Math.pow(10, currency.decimal));
                        let object = {
                            txnId: transaction[tr].hash,
                            value: amount,
                            blockNumber: transaction[tr].blockNumber,
                            moveCur: 'ETH-TOKEN'
                        }
                        transactions.push(object);
                    }
                }
            }
        }
    }
    return transactions;
}
async function UpdateDeposit(transaction, user_id, userethaddress, blockNumber) {
    if(common.getSiteDeploy() == 0) {
        for (var trr = 0; trr < transaction.length; trr++) {
            // (async function () {
                var tr = trr;
                // var newKey = tr + 1;
                // setTimeout(async function () {
                    var block_number = transaction[tr].blockNumber;
                    var address = transaction[tr].to;
                    var fromAddress = transaction[tr].from;
                    var txid = transaction[tr].hash;
                    var value = transaction[tr].value;
                    var amount = (value / 1000000000000000000);
                    let txnWithdraw = await query_helper.findoneData(Transaction, { "txnId": txid, "type": "Withdraw" }, {})
                    if(address.toLowerCase() == userethaddress.toLowerCase() && ((fromAddress.toLowerCase() != jsonrpc.ethconfig.AdminAddress.toLowerCase()) || (fromAddress.toLowerCase() == jsonrpc.ethconfig.AdminAddress.toLowerCase() && txnWithdraw.status))) {
                    // if (address.toLowerCase() == userethaddress.toLowerCase() && transaction[tr].from.toLowerCase() != jsonrpc.ethconfig.AdminAddress.toLowerCase()) {
                        let userresult = await query_helper.findoneData(Transaction, { "txnId": txid, "type": "Deposit" }, {})
                        if (!userresult.status) {
                            userresult = userresult.msg
                            let payments = {};
                            let currency = await query_helper.findoneData(Currency, { "currencySymbol": 'ETH' }, {})
                            if (currency.status) {
                                currency = currency.msg;
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
                                        "moveCur": 'ETH'
                                    }
                                    const siteData = await query_helper.insertData(Transaction, payments)
                                    if (siteData.status) {
                                        blockNumber.eth = block_number;
                                        await query_helper.updateData(CoinAddress, "one", { "user_id": user_id, currencyname: 'ETH' }, { ethBlock: blockNumber });
                                        let balances = await common.getbalance(user_id, curr_id)
                                        let curbal = +balances.amount;
                                        let finbal = curbal + +amount
                                        await common.updateUserBalance(user_id, curr_id, finbal, siteData._id, 'Deposit');
                                        let userresult=  await query_helper.findoneData(Users, { _id: user_id }, {})
                                        userresult = userresult.msg;
                                        let configresult = await query_helper.findoneData(emailTemplate, { hint: 'user-deposit' }, {});
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
            //     }, newKey * 1000);
            // })()
        }
    }
}
exports.Coinwithdraw = async function (symbol, transRes, callback) {
    try {
        if(common.getSiteDeploy() == 0) {
            let AdminAddress = jsonrpc.ethconfig.AdminAddress;
            let baseDir = path.join(__dirname, '../../Keystore/');
            fs.readFile(baseDir + AdminAddress.toLowerCase() + ".json", "utf-8", async function (err, datas) {
                if(!err && datas){
                    let keyStore = JSON.parse(datas);
                    var privateKey = keythereum.recover(jsonrpc.ethconfig.AdminKey, keyStore);
                    privateKey = '0x' + privateKey.toString('hex');
                    if(symbol == 'ETH') {
                    amountTransfer(privateKey, transRes.receiveAmount, transRes.address, function (configresult) {
                        callback (configresult);
                    });
                    } else {
                        let currency = await query_helper.findoneData(Currency, { "currencySymbol": symbol, basecoin: "ERC20" }, {})
                        if(currency.status) {
                            currency = currency.msg;
                            const response = await getJSON(jsonrpc.ethconfig.APIUrl + "?module=proxy&action=eth_gasPrice&apikey="+jsonrpc.ethconfig.APIKey);
                            try {
                                amountTokenTransfer(privateKey, transRes.receiveAmount * Math.pow(10, currency.decimal), transRes.address, currency.contractAddress, response.result, function (configresult) {
                                    callback(configresult);
                                });
                            } catch (e) {
                                console.log('Coinwithdraw',e);
                                callback(false);
                            }
                        } else {
                            callback(false)
                        }
                    }
                }
            });
        } else {
            callback(false)
        }
    } catch (e) {
        console.log('Coinwithdraw',e);
        callback(false)
    }
}
async function getTransactionCount(address) {
    const response = await getJSON(jsonrpc.ethconfig.APIUrl + "?module=proxy&action=eth_getTransactionCount&address="+address+"&tag=latest&apikey="+jsonrpc.ethconfig.APIKey);
    try {
        return response.result;
    } catch(e) {
        console.log('getTransactionCount',e)
        return "0x" + ((10000).toString(16))
    }
}
async function amountTransfer(privateKey, amount, toAddress, callback) {
    if(common.getSiteDeploy() == 0) {
        var account = web3.eth.accounts.privateKeyToAccount(privateKey.substring(2));
        const response = await getJSON(jsonrpc.ethconfig.APIUrl + "?module=proxy&action=eth_gasPrice&apikey="+jsonrpc.ethconfig.APIKey);
        try {
            let nonce = await web3.eth.getTransactionCount(account.address)
            var value = parseInt(amount * 1000000000000000000);
            value = toPlainString(value);
            var gas = response.result;
            const rawTx = {
                nonce: nonce,
                gasPrice: gas,
                gasLimit: web3.utils.toHex("100000"),
                from: account.address,
                to: toAddress,
                value: web3.utils.toHex(value)
            }
            web3.eth.accounts.signTransaction(rawTx, privateKey.substring(2)).then(signed => {
                web3.eth.sendSignedTransaction(signed.rawTransaction, function (err, hash) {
                    console.log(err, hash);
                    if (!err) {
                        callback(hash);
                    } else {
                        callback(false);
                    }
                });
            });
        } catch (e) {
            console.log('amountTransfer', e)
            callback(false);
        }
    } else {
        callback(false);
    }
}

//token functionality

exports.TokenDeposit = async function (userId) {
    if(common.getSiteDeploy() == 0) {
        let address_det = await query_helper.findoneData(CoinAddress, { "user_id": userId, currencyname: 'ETH' }, {})
        try {
            if (address_det.status) {
            address_det = address_det.msg;
            let account = address_det.address;
            let blockNumber = address_det.ethBlock;
            if (blockNumber.token > 0) {
            blockNumber.token = (blockNumber.token - 10000);
            }
            if(blockNumber.token<0) {
            blockNumber.token = 0;
            }
            const response = await getJSON(jsonrpc.ethconfig.APIUrl + "?module=account&action=tokentx&address=" + account + "&startblock=" + blockNumber.token + "&endblock=latest&apikey="+jsonrpc.ethconfig.APIKey);
            try {
            if (response.result.length > 0) {
            let transactions = [];
            let inc = 0;
            for (let i = 0; i < response.result.length; i++) {
            if (response.result[i].blockNumber > blockNumber.token) {
            transactions[inc] = response.result[i];
            inc++;
            }
            }
            UpdateTokenDeposit(transactions, userId, account, blockNumber);
            return(true);
            } else {
            return(false);
            }
            } catch (e) {
            console.log('TokenDeposit', e)
            return(false);
            }
            } else {
                return(false);
            }
        } catch (e) {
            console.log('TokenDeposit', e)
            return(false);
        }
    } else {
        return(false);
    }
}

async function UpdateTokenDeposit(transaction, user_id, userethaddress, blockNumber) {
    try {
        if(common.getSiteDeploy() == 0) {
            for (var trr = 0; trr < transaction.length; trr++) {
                // (async function () {
                    var tr = trr;
                    // var newKey = tr + 1;
                    // setTimeout(async function () {
                        var block_number = transaction[tr].blockNumber;
                        var address = transaction[tr].to;
                        var txid = transaction[tr].hash;
                        var value = transaction[tr].value;
                        var contractAddress = transaction[tr].contractAddress.toLowerCase();
                        if (address.toLowerCase() == userethaddress.toLowerCase()) {
                            let txnresult = await query_helper.findoneData(Transaction, { "txnId": txid, "type": "Deposit" }, {})
                            if (!txnresult.status) {
                                let payments = {};
                                let currency = await query_helper.findoneData(Currency, { "contractAddress": { $in: [contractAddress, transaction[tr].contractAddress] } }, {})
                                if (currency.status) {
                                    currency = currency.msg;
                                    if (currency.depositEnable == 1) {
                                        let amount = (value / Math.pow(10, currency.decimal));
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
                                                "moveCur": 'TOKEN'
                                            }
                                            const siteData = await query_helper.insertData(Transaction, payments)
                                            if (siteData.status) {
                                                blockNumber.token = block_number;
                                                await query_helper.updateData(CoinAddress, "one", { "user_id": user_id, currencyname: 'ETH' }, { ethBlock: blockNumber });
                                                let balances = await common.getbalance(user_id, curr_id)
                                                let curbal = +balances.amount;
                                                let finbal = curbal + +amount
                                                await common.updateUserBalance(user_id, curr_id, finbal, siteData._id, 'Deposit')
                                                let userresult = await query_helper.findoneData(Users, { _id: user_id }, {})
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
                        }
                //     }, newKey * 1000);
                // })()
            }
        }
    } catch (e) {
        console.log('UpdateTokenDeposit', e)
        return(false);
    }
}

exports.AdminMoveProcess = function () {
    try {
        console.log("ETH AdminMoveProcess : ");
        if(common.getSiteDeploy() == 0) {
            Transaction.aggregate([
                {
                    $match: { moveCur: 'ETH', adminMove: {$ne: '5'} }
                },
                {
                    "$group": {
                        "_id": {
                            "userId": "$userId",
                            "currencyId": "$currencyId"
                        },
                        "address": { "$first": "$address" }
                    }
                },
                // { $limit: 3 }
            ]).exec(function (err, resData) {
                for (let i = 0; i < resData.length; i++) {
                    setTimeout(async() => {
                        await movingProcess(resData[i]);
                    }, i*10000);
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
        let address = response.address;
        let baseDir = path.join(__dirname, '../../Keystore/');
        console.log("movingProcess : ");
        fs.readFile(baseDir + address.toLowerCase() + ".json", "utf-8", async function (err, datas) {
            if(!err && datas){
                console.log("movingProcess : datas : ", datas);
                let keyStore = JSON.parse(datas);
                var privateKey = keythereum.recover(jsonrpc.ethconfig.UserKey, keyStore);
                var pk = '0x' + privateKey.toString('hex');
                const response1 = await getJSON(jsonrpc.ethconfig.APIUrl + "?module=proxy&action=eth_gasPrice&apikey="+jsonrpc.ethconfig.APIKey);
                try {
                    var yourNumber = parseInt(response1.result, 16);
                    const response2 = await getJSON(jsonrpc.ethconfig.APIUrl + "?module=account&action=balance&address=" + address + "&tag=latest&apikey="+jsonrpc.ethconfig.APIKey);
                    try {
                        if(response2.status == '1') {
                            if (response2.result > 0) {
                                let amount = response2.result / 1000000000000000000;
                                let fees = 100000 * (yourNumber + 1000000000) / 1000000000000000000;
                                amount = amount - fees;
                                if (amount > 0) {
                                    amountTransfer(pk, amount, jsonrpc.ethconfig.AdminAddress, async function (configresult) {
                                        if (configresult) {
                                            await query_helper.updateData(Transaction, "many", { "userId": mongoose.Types.ObjectId(userId), moveCur: 'ETH' }, { adminMove: '5' });//configresult
                                        }
                                    });
                                } else {
                                    await query_helper.updateData(Transaction, "many", { "userId": mongoose.Types.ObjectId(userId), moveCur: 'ETH' }, { adminMove: '5' });
                                }
                            } else {
                                await  query_helper.updateData(Transaction, "many", { "userId": mongoose.Types.ObjectId(userId), moveCur: 'ETH' }, { adminMove: '5' });
                            }
                        }
                    } catch (e) {
                        console.log('movingProcess',e);
                    }
                } catch (e) {
                    console.log('movingProcess',e);
                }
            }
            else {
                console.log("movingProcess : err : ", err);
            }
        })
    }
}

exports.AdminTokenMoveProcess = function () {
    try {
        if(common.getSiteDeploy() == 0) {
            Transaction.aggregate([
                {
                    $match: { moveCur: 'TOKEN', adminMove: { $ne: '5' } }
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
                        "address": { "$first": "$address" },
                        "currency" : { "$first": "$currency" }
                    }
                },
                // { $limit: 3 }
            ]).exec(function (err, resData) {
                if(resData.length > 0){
                    for (let i = 0; i < resData.length; i++) {
                        setTimeout(async() => {
                            await tokenMovingProcess(resData[i]);
                        }, i*10000);
                    }
                }
            });
        }
    }
    catch (e) {
        console.log('AdminTokenMoveProcess', e)
    }
}

async function tokenMovingProcess(response) {
    if(common.getSiteDeploy() == 0) {
        let userId = response._id.userId;
        let currencyId = response._id.currencyId;
        let address = response.address;
        let currency = response.currency;
        let baseDir = path.join(__dirname, '../../Keystore/');
        fs.readFile(baseDir + address.toLowerCase() + ".json", "utf-8", async function (err, datas) {
            if(!err && datas){
                let keyStore = JSON.parse(datas);
                var privateKey = keythereum.recover(jsonrpc.ethconfig.UserKey, keyStore);
                var pk = '0x' + privateKey.toString('hex');
                let response1 =  await getJSON(jsonrpc.ethconfig.APIUrl + "?module=proxy&action=eth_gasPrice&apikey="+jsonrpc.ethconfig.APIKey)
                    try {
                        var yourNumber = response1.result;
                        let response2 = await getJSON(jsonrpc.ethconfig.APIUrl + "?module=account&action=tokenbalance&contractaddress=" + currency.contractAddress + "&address=" + address + "&tag=latest&apikey="+jsonrpc.ethconfig.APIKey)
                        try {
                            if(response2.status == '1') {
                                if (response2.result > 0) {
                                    let response3 = await getJSON(jsonrpc.ethconfig.APIUrl + "?module=account&action=balance&address=" + address + "&tag=latest&apikey="+jsonrpc.ethconfig.APIKey);
                                    try {
                                        let amount = response3.result;
                                        let minBal = 0.0005;
                                        let minBal1 = minBal * Math.pow(10, 18);
                                        if (amount >= minBal1) {
                                            amountTokenTransfer(pk, response2.result, jsonrpc.ethconfig.AdminAddress, currency.contractAddress,yourNumber, async function (configresult) {
                                                if (configresult) {
                                                await query_helper.updateData(Transaction, "many", { "userId": mongoose.Types.ObjectId(userId), "currencyId": mongoose.Types.ObjectId(currencyId), moveCur: 'TOKEN' }, { adminMove: '5' });//configresult
                                                }
                                            });
                                        } else {
                                            let AdminAddress = jsonrpc.ethconfig.AdminAddress;
                                            let baseDir = path.join(__dirname, '../../Keystore/');
                                            fs.readFile(baseDir + AdminAddress.toLowerCase() + ".json", "utf-8", async function (err, datas) {
                                                if(!err && datas){
                                                    let keyStore = JSON.parse(datas);
                                                    var privateKey = keythereum.recover(jsonrpc.ethconfig.AdminKey, keyStore);
                                                    privateKey = '0x' + privateKey.toString('hex');
                                                    amountTransfer(privateKey, minBal, address, async function (configresult) {
                                                        if(configresult) {
                                                            await query_helper.updateData(Transaction, "many", { "userId": mongoose.Types.ObjectId(userId), "currencyId": mongoose.Types.ObjectId(currencyId), moveCur: 'TOKEN' }, { adminMove: '3', fundsMove: configresult });
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    } catch (e) {
                                        console.log('tokenMovingProcess',e);
                                    }
                                } else {
                                    await query_helper.updateData(Transaction, "many", { "userId": mongoose.Types.ObjectId(userId), "currencyId": mongoose.Types.ObjectId(currencyId), moveCur: 'TOKEN' }, { adminMove: '5' });
                                }
                            }
                        } catch (e) {
                            console.log('tokenMovingProcess',e);
                        }
                    } catch (e) {
                        console.log('tokenMovingProcess',e);
                    }
            }
        });
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
async function amountTokenTransfer(privateKey, amount, toAddress, contractAddress, yourNumber, callback) {
    if(common.getSiteDeploy() == 0) {
        var account = web3.eth.accounts.privateKeyToAccount(privateKey.substring(2));
        amount = toPlainString(amount);
        let response= await getJSON(jsonrpc.ethconfig.APIUrl + "?module=contract&action=getabi&address=" + contractAddress + "&apikey="+jsonrpc.ethconfig.APIKey)
        if (response.message == 'OK' && response.result != '') {
            const abi = JSON.parse(response.result);
            const myContract = new web3.eth.Contract(abi, contractAddress, { from: account.address });
            let nonce = await web3.eth.getTransactionCount(account.address)
            var gaslimit = 100000;
            const rawTx = {
                nonce: nonce,
                gasPrice: yourNumber,
                gasLimit: "0x" + ((parseFloat(gaslimit)).toString(16)),
                from: account.address,
                to: contractAddress,
                value: "0x0",
                data: myContract.methods.transfer(toAddress, amount).encodeABI()
            }
            let signed = await  web3.eth.accounts.signTransaction(rawTx, privateKey.substring(2))
            let hash = await web3.eth.sendSignedTransaction(signed.rawTransaction)
            if (hash) {
                callback(hash.transactionHash);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    } else {
        callback(false);
    }
}