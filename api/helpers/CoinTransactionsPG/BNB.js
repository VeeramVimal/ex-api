var jsonrpc = require("../../Config/main/rpc");
var getJSON = require('get-json');
let common = require('../common');
let fs = require('fs');
const path = require('path');

var keythereum = require("keythereum");
const Web3 = require("web3");

let nodeUrlPG = jsonrpc.bnbconfigPG.host;
let providerPG = new Web3.providers.HttpProvider(nodeUrlPG);
const web3PG = new Web3(providerPG)

exports.CreateAddressPG = async function (user_id, callback) {
    var account;
    var walletprivate;
    var walletaddress;
    var phppasswallet;
    var keystore;

    let baseDir;
    account = web3PG.eth.accounts.create();
    walletprivate = account["privateKey"];
    walletaddress = account["address"];
    phppasswallet = jsonrpc.bnbconfigPG.UserKey;
    keystore = web3PG.eth.accounts.encrypt(walletprivate, phppasswallet);
    baseDir = path.join(__dirname, '../../Keystore/pg/');

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

exports.CreateAdminAddressPG = async function (callback) {
    var account = web3PG.eth.accounts.create();
    var walletprivate = account["privateKey"];
    var walletaddress = account["address"];
    var phppasswallet = jsonrpc.bnbconfigPG.AdminKey;
    var keystore = web3PG.eth.accounts.encrypt(walletprivate, phppasswallet);
    let baseDir = path.join(__dirname, '../../Keystore/pg/');
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

exports.getBlockNumberPG = async function (reqBody = {}) {
    const currentBlockNumber = await web3PG.eth.getBlockNumber();
    return {
        status: true,
        currentBlockNumber
    }
}

exports.CoinDepositPG = async function (reqBody = {}) {
    try {
        console.log("CoinDepositPGByAccount : ");
        const currentBlockNumber = await web3PG.eth.getBlockNumber();

        let {
            fromBlock = currentBlockNumber - 500,
            toBlock = currentBlockNumber,
            account = "",
            coinDeposit = false,
            tokenDeposit = false,
            coinMove = false,
            tokenMove = false,
            tokenContracts = []
        } = reqBody;

        if(reqBody && reqBody.fromBlock && reqBody.toBlock) {
            fromBlock = reqBody.fromBlock;
            toBlock = reqBody.toBlock;

            if(!fromBlock || Number.isInteger(fromBlock) === false) {
                return({
                    status: false,
                    error: {
                        fromBlock: "From Block is not a correct value"
                    }
                });
            }

            if(toBlock === "latest") {
                toBlock = currentBlockNumber;
            }

            if(!toBlock || Number.isInteger(toBlock) === false) {
                return({
                    status: false,
                    error: {
                        toBlock: "To Block is not a correct value"
                    }
                });
            }
            else if(toBlock < fromBlock) {
                return({
                    status: false,
                    error: {
                        toBlock: "To Block is not a correct value"
                    }
                });
            }
            else if(currentBlockNumber < toBlock) {
                return({
                    status: false,
                    error: {
                        toBlock: "Block not reached, Current Block : "+currentBlockNumber
                    }
                });
            }
        }
        else {
            return({
                status: false,
                error: {
                    toBlock: "Please send correct values"
                }
            });
        }

        let retData = {
            status: true
        };

        let transactions = [];

        if((coinDeposit || coinMove) && account) {
            const reqUrl = jsonrpc.bnbconfigPG.APIUrl + "?module=account&action=txlist&address=" + account + "&startblock=" +fromBlock+ "&endblock=" + toBlock+"&apikey="+jsonrpc.bnbconfigPG.APIKey;
            const response = await getJSON(reqUrl);
            console.log({reqUrl, response});

            if(response.result && response.result.length) {
                console.log("result : ", response.result.length);
            }
            if (response.result && response.result.length > 0) {
                for (let p = 0; p < response.result.length; p++) {
                    const curTr = response.result[p];
                    if(curTr.to.toLowerCase() === account.toLowerCase() && curTr.value != "0") {
                        transactions.push(curTr);
                    }
                }
                retData.transactions = transactions;
                retData.transactionsCount = transactions.length;
            }
        }
        
        let tokenTransactions = [];
        if((tokenDeposit || tokenMove) && account) {
            try {
                if(tokenContracts && tokenContracts.length > 0 && tokenContracts[0] != "") {
                    try {
                        const reqUrl = jsonrpc.bnbconfigPG.APIUrl + "?module=account&action=tokentx&address=" + account + "&startblock=" + fromBlock + "&endblock="+toBlock+"&apikey="+jsonrpc.bnbconfigPG.APIKey;
                        const response = await getJSON(reqUrl);
                        if (response.result.length > 0) {
                            for (let m = 0; m < response.result.length; m++) {
                                if(tokenTransactions && tokenTransactions.findIndex(e => e.hash == response.result[m].hash) == -1 && response.result[m].contractAddress) {
                                    const cur_contractAddress = response.result[m].contractAddress.toLowerCase();
                                    const cur_to = response.result[m].to.toLowerCase();

                                    if(account && cur_to === account.toLowerCase()) {
                                        if(tokenContracts[0] == "all" || tokenContracts.findIndex(e => e.toLowerCase() === cur_contractAddress) > -1) {
                                            tokenTransactions.push(response.result[m]);
                                        }
                                    }

                                }
                            }
                        }

                    } catch (e) {
                        console.log('TokenDeposit PG', e)
                    }
                }

                retData.tokenTransactions = tokenTransactions;
                retData.tokenTransactionsCount = tokenTransactions.length;
            }
            catch(err) {
                console.log('tkn err : ', err);
            }
        }

        if(coinMove && transactions.length > 0) {
            const passData = {
                fromAddress: account,
                currencyDecimal: 6
            };
            await movingProcess(passData);
        }

        if(tokenMove && tokenTransactions.length > 0) {
            let tknDone = {};
            for (let tmove = 0; tmove < tokenTransactions.length; tmove++) {
                console.log({tokenTransactions});
                if(
                    tokenTransactions[tmove].contractAddress
                ) {
                    let passData = {
                        fromAddress: account,
                        currencyDecimal: tokenTransactions[tmove].tokenDecimal,
                        contractAddress: tokenTransactions[tmove].contractAddress
                    };
                    if(tknDone[passData.contractAddress] === undefined) {
                        tknDone[passData.contractAddress] = true;
                        await tokenMovingProcess(passData);
                    }
                }
            }
        }

        return retData;
    }
    catch (e) {
        console.log('CoinDeposit',e);
        return({
            status: false
        });
    }
}


exports.BalanceCheckPG = async function (symbol, transRes, callback) {
    let {
        fromAddress: address = "",
        contractAddress = "",
        amount: sendAmt = 0,
        decimal = 18
    } = transRes;
    sendAmt = sendAmt * Math.pow(10, decimal);

    if(address == "") {
        address = jsonrpc.bnbconfigPG.AdminAddress;
    }
    if(contractAddress == "") {
        let response3 = await getJSON(jsonrpc.bnbconfigPG.APIUrl + "?module=account&action=balance&address=" + address + "&tag=latest&apikey="+jsonrpc.bnbconfigPG.APIKey);
        if(response3.result > 0) {
            let bal = response3.result;
            if(bal >= sendAmt) {
                callback (bal, bal/Math.pow(10, decimal));
            }
            else {
                callback (false, bal/Math.pow(10, decimal));
            }
        }
        else {
            callback (false, 0);
        }
    }
    else if(contractAddress != "") {
        let response2 = await getJSON(jsonrpc.bnbconfigPG.APIUrl + "?module=account&action=tokenbalance&contractaddress=" + contractAddress + "&address=" + address + "&tag=latest&apikey="+jsonrpc.bnbconfigPG.APIKey);
        if(response2.status == '1' && response2.result > 0) {
            let bal = response2.result;
            if(bal >= sendAmt) {
                callback (bal, bal/Math.pow(10, decimal));
            }
            else {
                callback (false, bal/Math.pow(10, decimal));
            }
        }
        else {
            callback (false, 0);
        }
    }
}

exports.CoinwithdrawPG = async function (symbol, transRes, callback) {
    try {
        let {
            fromAddress = "",
            contractAddress = ""
        } = transRes;

        if(fromAddress == "") {
            fromAddress = jsonrpc.bnbconfigPG.AdminAddress;
        }

        let baseDir = path.join(__dirname, '../../Keystore/pg/');
        fs.readFile(baseDir + fromAddress.toLowerCase() + ".json", "utf-8", async function (err, datas) {
            if(!err && datas){
                let keyStore = JSON.parse(datas);
                var privateKey = keythereum.recover(jsonrpc.bnbconfigPG.AdminKey, keyStore);
                privateKey = '0x' + privateKey.toString('hex');
                if(contractAddress == "") {
                    amountTransferPG(privateKey, (transRes.amount)*Math.pow(10, transRes.decimal), transRes.toAddress, function (configresult) {
                        callback (configresult);
                    });
                }
                else if(contractAddress != "") {
                    let response1 =  await getJSON(jsonrpc.bnbconfigPG.APIUrl + "?module=proxy&action=eth_gasPrice&apikey="+jsonrpc.bnbconfigPG.APIKey)
                    var yourNumber = response1.result;
                    amountTokenTransferPG(privateKey, transRes.amount*Math.pow(10, transRes.decimal), transRes.toAddress, contractAddress, yourNumber, function (configresult) {
                        callback (configresult);
                    });
                }
                else {
                    callback(false)
                }
            } else  {
                callback(false)
            }
        });
    } catch (e) {
        console.log('Coinwithdraw',e);
        callback(false)
    }
}

async function amountTransferPG(privateKey, amount, toAddress, callback) {
    var account = web3PG.eth.accounts.privateKeyToAccount(privateKey.substring(2));
    const response = await getJSON(jsonrpc.bnbconfigPG.APIUrl + "?module=proxy&action=eth_gasPrice&apikey="+jsonrpc.bnbconfigPG.APIKey);
    try {
        web3PG.eth.getTransactionCount(account.address, function (err, nonce) {
            if(err) {
                callback(false);
            }
            else {
                var value = parseInt(amount * 1000000000000000000);
                value = toPlainString(value);
                var gas = response.result;
                const rawTx = {
                    nonce: web3PG.utils.toHex(nonce),
                    gasPrice: gas,
                    gasLimit: web3PG.utils.toHex("50000"),
                    from: account.address,
                    to: toAddress,
                    value: web3PG.utils.toHex(value)
                }
                web3PG.eth.accounts.signTransaction(rawTx, privateKey.substring(2)).then(signed => {
                    web3PG.eth.sendSignedTransaction(signed.rawTransaction, function (err, hash) {
                        if (!err) {
                            callback(hash);
                        } else {
                            console.log('amountTransfer PG', err)
                            callback(false);
                        }
                    });
                });
            }
        });
    } catch (e) {
        console.log('amountTransfer', e)
        callback(false);
    }
}

async function amountTokenTransferPG(privateKey, amount, toAddress, contractAddress, yourNumber, callback) {
    try {
        if(common.getSiteDeployPG() == 0) {
            var account = web3PG.eth.accounts.privateKeyToAccount(privateKey.substring(2));
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
            const myContract = new web3PG.eth.Contract(abi, contractAddress, { from: account.address });
            let nonce= await web3PG.eth.getTransactionCount(account.address)
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
            let signed = await  web3PG.eth.accounts.signTransaction(rawTx, privateKey.substring(2))
            let hash = await web3PG.eth.sendSignedTransaction(signed.rawTransaction)
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

async function movingProcess(response) {
    if(common.getSiteDeployPG() == 0) {
        let fromAddress = response.fromAddress;
        let currencyDecimal = response.currencyDecimal;
        let baseDir = path.join(__dirname, '../../Keystore/pg/');
        fs.readFile(baseDir + fromAddress.toLowerCase() + ".json", "utf-8", async function (err, datas) {
            if(!err && datas){
                let keyStore = JSON.parse(datas);
                var privateKey = keythereum.recover(jsonrpc.bnbconfigPG.UserKey, keyStore);
                var pk = '0x' + privateKey.toString('hex');
                const response1 = await getJSON(jsonrpc.bnbconfigPG.APIUrl + "?module=proxy&action=eth_gasPrice&apikey="+jsonrpc.bnbconfigPG.APIKey);
                try {
                    var yourNumber = parseInt(response1.result, 16);
                    const response2 = await getJSON(jsonrpc.bnbconfigPG.APIUrl + "?module=account&action=balance&address=" + fromAddress + "&tag=latest&apikey="+jsonrpc.bnbconfigPG.APIKey);
                    try {
                        if(response2.status == '1') {
                            if (response2.result > 0) {
                                let amount = response2.result / 1000000000000000000;
                                let fees = 100000 * (yourNumber + 1000000000) / 1000000000000000000;
                                amount = amount - fees;
                                if (amount > 0) {
                                    amountTransferPG(pk, amount, jsonrpc.bnbconfigPG.AdminAddress, async function (configresult) {
                                        if (configresult) {
                                            return configresult;
                                        }
                                    });
                                } else {
                                    return;
                                }
                            } else {
                                return;
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

exports.tokenMovingProcess_exports = async function (response) {
    return await tokenMovingProcess(response);
}

async function tokenMovingProcess(response) {
    console.log("tokenMovingProcess", common.getSiteDeployPG());
    console.log("t 1");
    if(common.getSiteDeployPG() == 0) {
        let toAdddr = jsonrpc.bnbconfigPG.AdminAddress;
        // let toAdddr = "0x7cc44544413cd08d6f515A939E1bcb0A7B6461EB";
        console.log("t 2");
        let fromAddress = response.fromAddress;
        let contractAddress = response.contractAddress;
        
        let baseDir = path.join(__dirname, '../../Keystore/pg/');
        fs.readFile(baseDir + fromAddress.toLowerCase() + ".json", "utf-8", async function (err, datas) {
            console.log("t 3");
            if(!err && datas){
                console.log("t 4");
                let keyStore = JSON.parse(datas);
                var privateKey = keythereum.recover(jsonrpc.bnbconfigPG.UserKey, keyStore);
                var pk = '0x' + privateKey.toString('hex');
                console.log({privateKey});
                try {
                    let response2 = await getJSON(jsonrpc.bnbconfigPG.APIUrl + "?module=account&action=tokenbalance&contractaddress=" + contractAddress + "&address=" + fromAddress + "&tag=latest&apikey="+jsonrpc.bnbconfigPG.APIKey)
                    try {
                        console.log("t 6");
                        console.log({response2, fromAddress});
                        console.log("t 7");
                        if(response2.status == '1') {
                            if (response2.result > 0) {
                                let response3 = await getJSON(jsonrpc.bnbconfigPG.APIUrl + "?module=account&action=balance&address=" + fromAddress + "&tag=latest&apikey="+jsonrpc.bnbconfigPG.APIKey);
                                try {
                                    let amount = response3.result;
                                    let fundBal = 0.0008;
                                    let minBal = 0.0005;
                                    let minBal1 = minBal * Math.pow(10, 18);


                                    let response1 = await getJSON(jsonrpc.bnbconfigPG.APIUrl + "?module=proxy&action=eth_gasPrice&apikey="+jsonrpc.bnbconfigPG.APIKey)
                                    try {
                                        var yourNumber = response1.result;
                                        if (amount >= minBal1) {
                                            console.log("Send 1 : ", response2.result);
                                            amountTokenTransferPG(pk, response2.result, toAdddr, contractAddress, yourNumber, async function (configresult) {
                                                if (configresult) {
                                                    return configresult;
                                                }
                                            });
                                        } else {
                                            let AdminAddress = jsonrpc.bnbconfigPG.AdminAddress;
                                            let baseDir = path.join(__dirname, '../../Keystore/pg/');
                                            fs.readFile(baseDir + AdminAddress.toLowerCase() + ".json", "utf-8", async function (err, datas) {
                                                if(!err && datas){
                                                    let keyStore = JSON.parse(datas);
                                                    var privateKey = keythereum.recover(jsonrpc.bnbconfigPG.AdminKey, keyStore);
                                                    privateKey = '0x' + privateKey.toString('hex');
                                                    amountTransferPG(privateKey, fundBal, fromAddress, async function (configresult) {
                                                        if(configresult) {
                                                            try {
                                                                setTimeout(async() => {
                                                                    response3 = await getJSON(jsonrpc.bnbconfigPG.APIUrl + "?module=account&action=balance&address=" + fromAddress + "&tag=latest&apikey="+jsonrpc.bnbconfigPG.APIKey);
                                                                    amount = response3.result;
                                                                    minBal = 0.0005;
                                                                    minBal1 = minBal * Math.pow(10, 18);
                                                                    if (amount >= minBal1) {
                                                                        console.log("Send 2 : ", response2.result);
                                                                        amountTokenTransferPG(pk, response2.result, toAdddr, contractAddress, yourNumber, async function (configresult) {
                                                                            console.log({configresult});
                                                                            // if (configresult) {
                                                                            //     return configresult;
                                                                            // }
                                                                        });
                                                                    }
                                                                }, 10000);
                                                            } catch (e) {
                                                                console.log('tokenMovingProcess 2 : ',e);
                                                            }
                                                            return configresult;
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    } catch (e) {
                                        console.log('tokenMovingProcess',e);
                                    }
                                } catch (e) {
                                    console.log('tokenMovingProcess',e);
                                }
                            } else {
                                return;
                            }
                        }
                    } catch (e) {
                        console.log('tokenMovingProcess',e);
                    }
                } catch (e) {
                    console.log('tokenMovingProcess',e);
                }
            }
            else {
                console.log({err});
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
