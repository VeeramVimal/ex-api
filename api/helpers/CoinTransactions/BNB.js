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
let nodeUrl = jsonrpc.bnbconfig.host;
let provider = new Web3.providers.HttpProvider(nodeUrl);
const web3 = new Web3(provider)

var each = require('sync-each');
const { AuthRegistrationsCredentialListMappingList } = require('twilio/lib/rest/api/v2010/account/sip/domain/authTypes/authRegistrationsMapping/authRegistrationsCredentialListMapping');

// let datas = '{"version":3,"id":"945b4111-db04-4cd5-b75f-ffe2530e00c3","address":"dc5b2cf09fd458df64d61a97e1c0ce1441eb7b19","crypto":{"ciphertext":"abf446024f9cd2eea6828be3bbc15cdcf0407bb68475d21e9e86bd1bc61f3b5b","cipherparams":{"iv":"0834007579b009c7007757b8cd541d6a"},"cipher":"aes-128-ctr","kdf":"scrypt","kdfparams":{"dklen":32,"salt":"129ebc753cc3f0b963070a05258727bed51e2f3db32c571f7e51349a344426ce","n":8192,"r":8,"p":1},"mac":"a9cf86077e830302cc57b3814c844cd761915962770d6ce8af33a40d2bc9fa41"}}';
// let keyStore = JSON.parse(datas);
// var privateKey = keythereum.recover(jsonrpc.bnbconfig.AdminKey, keyStore);
// privateKey = '0x' + privateKey.toString('hex');

exports.getLatestBlock = async function (curncyRes) {
    try {
        let blockNo = 0;
        if(curncyRes.currencySymbol == 'BNB') {
        } else {
        }
        return blockNo;
    } catch (e) {
        console.log('getLatestBlock', e, curncyRes);
        return 0;
    }
}

exports.adminBalance = async function (curncyRes) {
    try {
        let balance;
        if(curncyRes.currencySymbol == 'BNB') {
            balance = await getJSON(jsonrpc.bnbconfig.APIUrl + "?module=account&action=balance&address=" + jsonrpc.bnbconfig.AdminAddress + "&tag=latest&apikey="+jsonrpc.bnbconfig.APIKey);
        } else {
            balance = await getJSON(jsonrpc.bnbconfig.APIUrl + "?module=account&action=tokenbalance&contractaddress=" + curncyRes.contractAddress + "&address=" + jsonrpc.bnbconfig.AdminAddress + "&tag=latest&apikey="+jsonrpc.bnbconfig.APIKey)
        }
        return balance.result / Math.pow(10, curncyRes.decimal);
    } catch (e) {
        console.log('adminBalance', e, curncyRes.contractAddress);
        return 0;
    }
}
exports.listAddress = async function (callback) {
    web3.eth.getAccounts().then(e => { 
        callback(e);
    });
},
exports.CreateAddress = async function (user_id, callback) {
    var account;
    var walletprivate;
    var walletaddress;
    var phppasswallet;
    var keystore;

    let baseDir;
    account = web3.eth.accounts.create();
    walletprivate = account["privateKey"];
    walletaddress = account["address"];
    phppasswallet = jsonrpc.bnbconfig.UserKey;
    keystore = web3.eth.accounts.encrypt(walletprivate, phppasswallet);
    baseDir = path.join(__dirname, '../../Keystore/');
    fs.writeFile(baseDir + walletaddress.toLowerCase() + ".json", JSON.stringify(keystore), 'utf8', function (err) {
        if (err) {
            callback (false)
        } else {
            let obj = {}
            obj.address = walletaddress
            obj.tag = "";
            obj.encData = JSON.stringify(keystore);
            callback (obj)
        }
    })
}
exports.CreateAdminAddress = async function (callback) {
    var account = web3.eth.accounts.create();
    var walletprivate = account["privateKey"];
    var walletaddress = account["address"];
    var phppasswallet = jsonrpc.bnbconfig.AdminKey;
    var keystore = web3.eth.accounts.encrypt(walletprivate, phppasswallet);
    let baseDir = path.join(__dirname, '../../Keystore/');
    fs.writeFile(baseDir + walletaddress.toLowerCase() + ".json", JSON.stringify(keystore), 'utf8', function (err) {
        if (err) {
            callback (false)
        } else {
            let obj = {}
            obj.address = walletaddress
            obj.encData = JSON.stringify(keystore);
            callback (obj)
        }
    })
}
exports.CoinDeposit = async function (userId, reqBody = {}) {
    if(common.getSiteDeploy() == 0) {
        let currencyDeposit = await query_helper.findoneData(Currency, { "currencySymbol": 'BNB', contractAddress: "" }, {})
        if(currencyDeposit.status) {
            if(currencyDeposit.msg.depositEnable == 1) {
                let address_det = await query_helper.findoneData(CoinAddress, { "user_id": userId, currencyname: 'BNB' }, {})
                try {
                    if (address_det.status) {
                        address_det = address_det.msg;
                        if(address_det.address) {

                            let account = address_det.address;
                            let blockNumber = address_det.bnbBlock;
                            let bnbBlockNumber = blockNumber.bnb;
                            if (bnbBlockNumber > 0) {
                                bnbBlockNumber = (bnbBlockNumber - 10000);
                            }
                            if(bnbBlockNumber < 0) {
                                bnbBlockNumber = 0;
                            }

                            let fromBlock = bnbBlockNumber;
                            let toBlock = "latest";

                            // UpdateAdminTransactions(currencyDeposit,bnbBlockNumber)
                            const response = await getJSON(jsonrpc.bnbconfig.APIUrl + "?module=account&action=txlist&address=" + account + "&startblock=" +blockNumber.bnb+ "&endblock=latest");
                            try {
                                if (response.result && response.result.length > 0) {
                                    let transactions = [];
                                    let inc = 0;
                                    for (let i = 0; i < response.result.length; i++) {
                                        if (response.result[i].blockNumber > fromBlock) {
                                            transactions[inc] = response.result[i];
                                            inc++;
                                        }
                                    }
                                    UpdateDeposit(transactions, userId, account, blockNumber);
                                    const transactionsCount = transactions.length;
                                    return({
                                        fromBlock,
                                        toBlock,
                                        transactions,
                                        transactionsCount
                                    });
                                } else {
                                    let transactions = [];
                                    const transactionsCount = transactions.length;
                                    return({
                                        fromBlock,
                                        toBlock,
                                        transactions,
                                        transactionsCount
                                    });
                                }
                            } catch (e) {
                                console.log('CoinDeposit',e);
                                return(false);
                            }
                        }
                        else {
                            return(false);
                        }
                    } else {
                        return(false);
                    }
                } catch (e) {
                    console.log('CoinDeposit',e);
                    return(false);
                }
            }
        }
    }
}



async function UpdateAdminTransactions(currencyDeposit,bnbBlockNumber) {
    try {
        const adminAddress = jsonrpc.bnbconfig.AdminAddress;
        const currencyResp = await getJSON(jsonrpc.bnbconfig.APIUrl + "?module=account&action=txlist&address=" + adminAddress + "&startblock=" +bnbBlockNumber+ "&endblock=latest");
        try {
            if (currencyResp.status == 1 && currencyResp.result.length > 0) {
                let transactions = [];
                let transaction = currencyResp.result;
                for(let tr = 0; tr < transaction.length; tr++) {
                    const value = transaction[tr].value;
                    let toAddress = transaction[tr].to;
                    let txnHash = transaction[tr].hash;
                    if (adminAddress.toLowerCase() == toAddress.toLowerCase()) {
                        let alreadyCheckTxn = await query_helper.findoneData(AdminTransactions, { "txnId": txnHash }, {})
                        if (!alreadyCheckTxn.status) {
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

        const tokenResp = await getJSON(jsonrpc.bnbconfig.APIUrl + "?module=account&action=tokentx&address=" + adminAddress + "&startblock=" +bnbBlockNumber+ "&endblock=latest");
        try {
            if (tokenResp.status == 1 && tokenResp.result.length > 0) {
                let transactions = [];
                let transaction = tokenResp.result;
                for(let tr = 0; tr < transaction.length; tr++) {
                    const value = transaction[tr].value;
                    let toAddress = transaction[tr].to;
                    let txnHash = transaction[tr].hash;
                    let contractAddress = transaction[tr].contractAddress;
                    let tokenSymbol  = transaction[tr].tokenSymbol;
                    if (adminAddress.toLowerCase() == toAddress.toLowerCase()) {
                        let alreadyCheckTxn = await query_helper.findoneData(AdminTransactions, { "txnId": txnHash }, {})
                        if (!alreadyCheckTxn.status) {
                            let tokenStatus = await query_helper.findoneData(Currency, { currencySymbol: tokenSymbol, contractAddress: contractAddress }, {})
                            if (tokenStatus.status) {
                                if (value > 0) {
                                    let decimal = tokenStatus.msg.decimal;
                                    var amount = (value / Math.pow(10, decimal));
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
                }
            let txnData = await query_helper.insertData(AdminTransactions, transactions);
            }
        } catch(err) {}
    } catch (err) {}
}
exports.getPaymentData = async function (address, contract, block, currency) {
    let txnLink = '';
    if(contract == '') {
        txnLink = jsonrpc.bnbconfig.APIUrl + "?module=account&action=txlist&address=" + address + "&startblock=" +block.coin+ "&endblock=latest&apikey="+jsonrpc.bnbconfig.APIKey;
    } else {
        txnLink = jsonrpc.bnbconfig.APIUrl + "?module=account&action=tokentx&address=" + address + "&startblock=" + block.token + "&endblock=latest&apikey="+jsonrpc.bnbconfig.APIKey;
    }
    const adminAddress = jsonrpc.bnbconfig.AdminAddress;
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
                                moveCur: 'BNB'
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
                            moveCur: 'BNB-TOKEN'
                        }
                        transactions.push(object);
                    }
                }
            }
        }
    }
    return transactions;
}
async function UpdateDeposit(transaction, user_id, userbnbaddress, blockNumber) {
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
                    if(address.toLowerCase() == userbnbaddress.toLowerCase() && ((fromAddress.toLowerCase() != jsonrpc.bnbconfig.AdminAddress.toLowerCase()) || (fromAddress.toLowerCase() == jsonrpc.bnbconfig.AdminAddress.toLowerCase() && txnWithdraw.status))) {
                    // if (address.toLowerCase() == userbnbaddress.toLowerCase() && transaction[tr].from.toLowerCase() != jsonrpc.bnbconfig.AdminAddress.toLowerCase()) {
                        let transresult = await query_helper.findoneData(Transaction, { "txnId": txid, "type": "Deposit" }, {})
                        if (!transresult.status) {
                            transresult = transresult.msg
                            let payments = {};
                            let currency = await query_helper.findoneData(Currency, { "currencySymbol": 'BNB' }, {})
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
                                        "moveCur": 'BNB'
                                    }
                                    const siteData = await query_helper.insertData(Transaction, payments)
                                    if (siteData.status) {
                                        blockNumber.bnb = block_number;
                                        await query_helper.updateData(CoinAddress, "one", { "user_id": user_id, currencyname: 'BNB' }, { bnbBlock: blockNumber });
                                        let balances = await common.getbalance(user_id, curr_id)
                                        let curbal = +balances.amount;
                                        let finbal = curbal + +amount
                                        await common.updateUserBalance(user_id, curr_id, finbal, siteData._id, 'Deposit');
                                        let userresult = await query_helper.findoneData(Users, { _id: user_id }, {username: 1, email: 1})
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
            let AdminAddress = jsonrpc.bnbconfig.AdminAddress;
            let baseDir = path.join(__dirname, '../../Keystore/');
            fs.readFile(baseDir + AdminAddress.toLowerCase() + ".json", "utf-8", async function (err, datas) {
                if(!err && datas){
                    let keyStore = JSON.parse(datas);
                    var privateKey = keythereum.recover(jsonrpc.bnbconfig.AdminKey, keyStore);
                    privateKey = '0x' + privateKey.toString('hex');
                    if(symbol == 'BNB') {
                        amountTransfer(privateKey, transRes.receiveAmount, transRes.address, function (configresult) {
                            callback (configresult);
                        });
                    } else {
                        let currency = await query_helper.findoneData(Currency, { "currencySymbol": symbol, basecoin: "BEP20" }, {})
                        if(currency.status) {
                            currency = currency.msg;
                            const response = await getJSON(jsonrpc.bnbconfig.APIUrl + "?module=proxy&action=eth_gasPrice&apikey="+jsonrpc.bnbconfig.APIKey);
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
                } else  {
                    callback(false)
                }
            });
        } else {
            callback(false);
        }
    } catch (e) {
        console.log('Coinwithdraw',e);
        callback(false)
    }
}

async function amountTransfer(privateKey, amount, toAddress, callback) {
    if(common.getSiteDeploy() == 0) {
        var account = web3.eth.accounts.privateKeyToAccount(privateKey.substring(2));
        const response = await getJSON(jsonrpc.bnbconfig.APIUrl + "?module=proxy&action=eth_gasPrice&apikey="+jsonrpc.bnbconfig.APIKey);
        try {
            web3.eth.getTransactionCount(account.address, function (err, nonce) {
                var value = parseInt(amount * 1000000000000000000);
                value = toPlainString(value);
                var gas = response.result;
                const rawTx = {
                    nonce: web3.utils.toHex(nonce),
                    gasPrice: gas,
                    gasLimit: web3.utils.toHex("50000"),
                    from: account.address,
                    to: toAddress,
                    value: web3.utils.toHex(value)
                }
                // console.log('rawTx', rawTx)
                web3.eth.accounts.signTransaction(rawTx, privateKey.substring(2)).then(signed => {
                    web3.eth.sendSignedTransaction(signed.rawTransaction, function (err, hash) {
                        if (!err) {
                            callback(hash);
                        } else {
                            console.log('amountTransfer', err)
                            callback(false);
                        }
                    });
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

// token functionality

exports.TokenDeposit = async function (userId) {
    if(common.getSiteDeploy() == 0) {
        let address_det = await query_helper.findoneData(CoinAddress, { "user_id": userId, currencyname: 'BNB' }, {})
        try {
            if (address_det.status) {
                address_det = address_det.msg;
                let account = address_det.address;
                let blockNumber = address_det.bnbBlock;
                if (blockNumber.token > 0) {
                    blockNumber.token = (blockNumber.token - 10000);
                }
                if(blockNumber.token<0) {
                    blockNumber.token = 0;
                }
                const depAPIUrl = jsonrpc.bnbconfig.APIUrl + "?module=account&action=tokentx&address=" + account + "&startblock=" + blockNumber.token + "&endblock=latest&apikey="+jsonrpc.bnbconfig.APIKey;
                const response = await getJSON(depAPIUrl);
                console.log({depAPIUrl})
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

async function UpdateTokenDeposit(transaction, user_id, userbnbaddress, blockNumber) {
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
                    if (address.toLowerCase() == userbnbaddress.toLowerCase()) {
                        let transresult = await query_helper.findoneData(Transaction, { "txnId": txid, "type": "Deposit" }, {})
                        if (!transresult.status) {
                            transresult = transresult.msg;
                            let payments = {};
                            let currency = await query_helper.findoneData(Currency, { "contractAddress": { $in: [contractAddress, transaction[tr].contractAddress] } }, {})
                            if (currency.status) {
                                currency = currency.msg;
                                if (currency.depositEnable == 1) {
                                    let amount = 0;
                                    if(currency.decimal > 10) {
                                        amount = (value / Math.pow(10, 10));
                                        amount = (amount / Math.pow(10, currency.decimal-10));
                                    }
                                    else {
                                        amount = (value / Math.pow(10, currency.decimal));
                                    }
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
                                            "moveCur": 'BNB-TOKEN'
                                        }
                                        const siteData = await query_helper.insertData(Transaction, payments)
                                        if (siteData.status) {
                                            blockNumber.token = block_number;
                                            await query_helper.updateData(CoinAddress, "one", { "user_id": user_id, currencyname: 'BNB' }, { bnbBlock: blockNumber });
                                            let balances = await common.getbalance(user_id, curr_id);
                                            let curbal = +balances.amount;
                                            let finbal = curbal + +amount
                                            await common.updateUserBalance(user_id, curr_id, finbal, siteData._id, 'Deposit');
                                            let userresult = await query_helper.findoneData(Users, { _id: user_id }, {username: 1, email: 1})
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
                // }, newKey * 100);
            // })()
        }
    }
}

exports.AdminMoveProcess = function () {
    try {
        if(common.getSiteDeploy() == 0) {
            Transaction.aggregate([
                {
                    $match: { moveCur: 'BNB', adminMove: {$ne: '5'} }
                },
                {
                    "$group": {
                        "_id": {
                            "userId": "$userId",
                            "currencyId": "$currencyId"
                        },
                        "address": { "$first": "$address" }
                    }
                }
            ]).exec(function (err, resData) {
                for (let i = 0; i < resData.length; i++) {
                    setTimeout(() => {
                        movingProcess(resData[i]);
                    }, i*1000);
                }
            });
        }
    } catch (e) {
        console.log('AdminMoveProcess', e);
    }
}

async function movingProcess(response) {
    if(common.getSiteDeploy() == 0) {
        let userId = response._id.userId;
        let address = response.address;
        let baseDir = path.join(__dirname, '../../Keystore/');
        // console.log({baseDir});
        fs.readFile(baseDir + address.toLowerCase() + ".json", "utf-8", async function (err, datas) {
            if(!err && datas){
                let keyStore = JSON.parse(datas);
                // console.log({keyStore});
                var privateKey = keythereum.recover(jsonrpc.bnbconfig.UserKey, keyStore);
                var pk = '0x' + privateKey.toString('hex');
                const response1 = await getJSON(jsonrpc.bnbconfig.APIUrl + "?module=proxy&action=eth_gasPrice&apikey="+jsonrpc.bnbconfig.APIKey);
                // console.log({response1});
                try {
                    var yourNumber = parseInt(response1.result, 16);
                    const response2 = await getJSON(jsonrpc.bnbconfig.APIUrl + "?module=account&action=balance&address=" + address + "&tag=latest&apikey="+jsonrpc.bnbconfig.APIKey);
                    try {
                        if(response2.status == '1') {
                            if (response2.result > 0) {
                                let amount = response2.result / 1000000000000000000;
                                let fees = 100000 * (yourNumber + 1000000000) / 1000000000000000000;
                                amount = amount - fees;
                                if (amount > 0) {
                                    amountTransfer(pk, amount, jsonrpc.bnbconfig.AdminAddress, async function (configresult) {
                                        if (configresult) {
                                            await  query_helper.updateData(Transaction, "many", { "userId": mongoose.Types.ObjectId(userId), moveCur: 'BNB' }, { adminMove: '5' });//configresult
                                        }
                                    });
                                } else {
                                    await query_helper.updateData(Transaction, "many", { "userId": mongoose.Types.ObjectId(userId), moveCur: 'BNB' }, { adminMove: '5' });
                                }
                            } else {
                                await  query_helper.updateData(Transaction, "many", { "userId": mongoose.Types.ObjectId(userId), moveCur: 'BNB' }, { adminMove: '5' });
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
                    $match: { moveCur: 'BNB-TOKEN', adminMove: { $ne: '5' } }
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
                }
            ]).exec(function (err, resData) {
                if(resData.length > 0){
                    for (let i = 0; i < resData.length; i++) {
                        setTimeout(() => {
                            tokenMovingProcess(resData[i]);
                        }, i*1000);
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
    // console.log("tokenMovingProcess : ");
    if(common.getSiteDeploy() == 0) {
        let userId = response._id.userId;
        let currencyId = response._id.currencyId;
        let address = response.address;
        let currency = response.currency;
        let baseDir = path.join(__dirname, '../../Keystore/');
        fs.readFile(baseDir + address.toLowerCase() + ".json", "utf-8", async function (err, datas) {
            if(!err && datas){
                let keyStore = JSON.parse(datas);
                var privateKey = keythereum.recover(jsonrpc.bnbconfig.UserKey, keyStore);
                var pk = '0x' + privateKey.toString('hex');
                let response1 =  await getJSON(jsonrpc.bnbconfig.APIUrl + "?module=proxy&action=eth_gasPrice&apikey="+jsonrpc.bnbconfig.APIKey)
                try {
                    var yourNumber = response1.result;
                    let response2 = await getJSON(jsonrpc.bnbconfig.APIUrl + "?module=account&action=tokenbalance&contractaddress=" + currency.contractAddress + "&address=" + address + "&tag=latest&apikey="+jsonrpc.bnbconfig.APIKey)
                    try {
                        if(response2.status == '1') {
                            // console.log({tokenbalance: response2.result});
                            if (response2.result > 0) {
                                let response3 = await getJSON(jsonrpc.bnbconfig.APIUrl + "?module=account&action=balance&address=" + address + "&tag=latest&apikey="+jsonrpc.bnbconfig.APIKey);
                                try {
                                    let amount = response3.result;
                                    let minBal = 0.0005;
                                    let minBal1 = minBal * Math.pow(10, 18);
                                    // console.log({minBal1, amount});
                                    if (amount >= minBal1) {
                                        // console.log("amountTokenTransfer : ");
                                        amountTokenTransfer(pk, response2.result, jsonrpc.bnbconfig.AdminAddress, currency.contractAddress,yourNumber, async function (configresult) {
                                            // console.log({configresult});
                                            if (configresult) {
                                                await query_helper.updateData(Transaction, "many", { "userId": mongoose.Types.ObjectId(userId),"currencyId": mongoose.Types.ObjectId(currencyId), moveCur: 'BNB-TOKEN', adminMove: { $ne: '5' } }, { adminMove: '5' });//configresult
                                            }
                                        });
                                    } else {
                                        let AdminAddress = jsonrpc.bnbconfig.AdminAddress;
                                        let baseDir = path.join(__dirname, '../../Keystore/');
                                        fs.readFile(baseDir + AdminAddress.toLowerCase() + ".json", "utf-8", async function (err, datas) {
                                            if(!err && datas){
                                                let keyStore = JSON.parse(datas);
                                                var privateKey = keythereum.recover(jsonrpc.bnbconfig.AdminKey, keyStore);
                                                privateKey = '0x' + privateKey.toString('hex');
                                                amountTransfer(privateKey, minBal, address, async function (configresult) {
                                                    if(configresult) {
                                                        await query_helper.updateData(Transaction, "many", { "userId": mongoose.Types.ObjectId(userId), "currencyId": mongoose.Types.ObjectId(currencyId), moveCur: 'BNB-TOKEN', adminMove: { $ne: '5' }, fundsMove: "" }, { adminMove: '3', fundsMove: configresult });
                                                    }
                                                });
                                            }
                                        });
                                    }
                                } catch (e) {
                                    console.log('tokenMovingProcess',e);
                                }
                            } else {
                                await query_helper.updateData(Transaction, "many", { "userId": mongoose.Types.ObjectId(userId),"currencyId": mongoose.Types.ObjectId(currencyId), moveCur: 'BNB-TOKEN', adminMove: { $ne: '5' } }, { adminMove: '5' });
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
    try {
        if(common.getSiteDeploy() == 0) {
            var account = web3.eth.accounts.privateKeyToAccount(privateKey.substring(2));
            amount = toPlainString(amount);
            const abi = [{
                "constant": false,
                "inputs": [{
                    "name": "_to",
                    "type": "address"
                }, {
                    "name": "_value",
                    "type": "uint256"
                }],
                "name": "transfer",
                "outputs": [{
                    "name": "",
                    "type": "bool"
                }],
                "payable": false,
                "stateMutability": "nonpayable",
                "type": "function"
            }];
            const myContract = new web3.eth.Contract(abi, contractAddress, { from: account.address });
            let nonce= await web3.eth.getTransactionCount(account.address)
            var gaslimit = 100000;
            const rawTx = {
                nonce: "0x" + ((parseFloat(nonce)).toString(16)),
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
    } catch (e) {
        console.log('amountTokenTransfer', e)
        callback(false);
    }
}