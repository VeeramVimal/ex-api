var jsonrpc = require("../../Config/main/rpc");
var getJSON = require('get-json');
let common = require('../common');

let fs = require('fs');
const path = require('path');
const TronWeb 		= require('tronweb');
const HttpProvider  = TronWeb.providers.HttpProvider;
const eventServer   = jsonrpc.trxconfigPG.urlType;
const fullNode      = new HttpProvider(eventServer);
const solidityNode  = new HttpProvider(eventServer);

let tronWeb = new TronWeb(
    fullNode,
    solidityNode,
    new HttpProvider(eventServer)
);

const TRONPROAPIKEY = jsonrpc.trxconfigPG.APIKey;

tronWeb.setHeader({ "TRON-PRO-API-KEY": TRONPROAPIKEY });

exports.CreateAdminAddressPG = async function (callback) {
    try{
        let newAddress = await tronWeb.createAccount();
        if(typeof newAddress.address != 'undefined' && typeof newAddress.address != undefined){
            let walletaddress = newAddress.address.base58;
            let baseDir = path.join(__dirname, '../../Keystore/pg/');
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

exports.CreateAddressPG = async function (user_id, callback) {
    try{
        let newAddress = await tronWeb.createAccount();
        if(typeof newAddress.address != 'undefined' && typeof newAddress.address != undefined){
            let walletaddress = newAddress.address.base58;
            let baseDir = path.join(__dirname, '../../Keystore/pg/');
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

exports.getBlockNumberPG = async function (reqBody = {}) {
    console.log("getBlockNumberPG : ");
    const getCurrentBlock = await tronWeb.trx.getCurrentBlock();
    const currentBlockNumber = getCurrentBlock && getCurrentBlock.block_header && getCurrentBlock.block_header.raw_data && getCurrentBlock.block_header.raw_data.number ? getCurrentBlock.block_header.raw_data.number : 0;
    return {
        status: true,
        currentBlockNumber,
        blockDetail : getCurrentBlock
    }
}

exports.CoinDepositPG = async function (reqBody) {
    try {
        console.log("CoinDepositPG : ");
        let retData = {};
        let {
            fromBlock: min_timestamp = 0,
            toBlock: max_timestamp = 0,
            account = "",
            coinDeposit = false,
            coinMove = false,
            tokenDeposit = false,
            tokenMove = false,
            tokenContracts = []
        } = reqBody;

        let transactions = [];
        let tokenTransactions = [];

        if (account != "") {

            let reqURL = jsonrpc.trxconfigPG.APIUrl + account + "/transactions?only_confirmed=true&only_to=true&limit=200&min_timestamp=" +min_timestamp;
            if(max_timestamp) {
                reqURL = reqURL+"&max_timestamp="+max_timestamp;
            }

            retData = {
                status: true,
                transactions: [],
                tokenTransactions: [],
                transactionsCount: 0,
                tokenTransactionsCount: 0,
            }

            if(coinDeposit || coinMove) {
                const response = await getJSON(reqURL);
                try {
                    if (response.data.length > 0) {
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
                    }
                } catch (e) {
                    console.log('CoinDeposit',e);
                    return(false);
                }
                if(coinDeposit && transactions.length > 0) {
                    retData = {
                        transactions: transactions,
                        transactionsCount: transactions.length,
                    }
                }
            }

            if(tokenDeposit || tokenMove) {
                try {
                    reqURL = jsonrpc.trxconfigPG.APIUrl + account + "/transactions/trc20?only_confirmed=true&only_to=true&limit=200&min_timestamp=" +min_timestamp;
                    if(max_timestamp) {
                        reqURL = reqURL+"&max_timestamp="+max_timestamp;
                    }
                    const responseToken = await getJSON(reqURL);
                    if(responseToken.data && responseToken.data.length > 0) {
                        for (var trr = 0; trr < responseToken.data.length; trr++) {
                            var cur_contractAddress = responseToken.data[trr].token_info.address;
                            if(tokenContracts[0] == "all" || tokenContracts.findIndex(e => e.toLowerCase() === cur_contractAddress) > -1) {
                                tokenTransactions.push(responseToken.data[trr]);
                            }
                        }
                    }
                } catch (e) {
                    console.log('CoinDeposit',e);
                    return(false);
                }
                if(tokenDeposit && tokenTransactions.length > 0) {
                    retData.tokenTransactions = tokenTransactions;
                    retData.tokenTransactionsCount = tokenTransactions.length;
                }
            }

            if(coinMove) {
                const passData = {
                    fromAddress: account,
                    currencyDecimal: 6
                };
                await movingProcess(passData);
            }

            if(tokenMove) {
                for (let tmove = 0; tmove < tokenTransactions.length; tmove++) {
                    const passData = {
                        fromAddress: account,
                        currencyDecimal: 6,
                        contractAddress: tokenTransactions[tmove].token_info.address
                    };
                    await tokenMovingProcess(passData);
                }
            }

            return retData;
        } else {
            return(false);
        }
    } catch (e) {
        console.log('CoinDeposit', e)
        return(false);
    }
}

exports.BalanceCheckPG = async function (symbol, transRes, callback) {
    let {
        fromAddress: address = "",
        contractAddress = "",
        amount: sendAmt = 0,
        decimal = 6
    } = transRes;
    sendAmt = sendAmt * Math.pow(10, decimal);

    if(address == "") {
        address = jsonrpc.bnbconfigPG.AdminAddress;
    }
    if(contractAddress == "") {
        tronWeb.trx.getBalance(address).then(async function (result) {
            if(result) {
                let bal = result;
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
        });
    }
    else if(contractAddress != "") {
        balanceGet(contractAddress, address, async function (res) {
            if(res) {
                const bal = parseInt(res._hex, 16);
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
        })
    }
}

exports.CoinwithdrawPG = async function (symbol, transRes, callback) {
    try {
        if(common.getSiteDeployPG() == 0) {
            let AdminAddress = jsonrpc.trxconfigPG.AdminAddress;
            let baseDir = path.join(__dirname, '../../Keystore/pg/');

            fs.readFile(baseDir + AdminAddress + ".json", "utf-8", async function (err, datas) {
                if(!err && datas){
                    let privateKey = common.decrypt(datas)
                    privateKey = JSON.parse(privateKey).privateKey;
                    if(symbol == 'TRX') {
                        amountTransfer(privateKey, (transRes.amount)*Math.pow(10, transRes.decimal), transRes.toAddress, AdminAddress, function (configresult) {
                            callback(configresult);
                        });
                    } else {
                        try {
                            amountTokenTransfer(privateKey, parseInt(transRes.amount*Math.pow(10, transRes.decimal)), transRes.toAddress, transRes.contractAddress, function (configresult) {
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

async function amountTransfer(privateKey, Amount, toAddress, fromAddress, callback) {
    try {
        if(common.getSiteDeployPG() == 0) {
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

async function amountTokenTransfer(privateKey, Amount, toAddress, contractAddress, callback) {
    try {
        if(common.getSiteDeployPG() == 0) {
            let tronWeb1 = new TronWeb(fullNode, solidityNode, eventServer, privateKey);
            tronWeb1.setHeader({ "TRON-PRO-API-KEY": TRONPROAPIKEY });
            try {
                Amount = toPlainString(Amount);
                let contract = await tronWeb1.contract().at(contractAddress);
                await contract.transfer(toAddress, Amount).send({
                    feeLimit: 15000000
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

async function movingProcess(response) {
    if(common.getSiteDeployPG() == 0) {
        let fromAddress = response.fromAddress;
        let currencyDecimal = response.currencyDecimal;
        let minBal = 10 * Math.pow(10, currencyDecimal);
        tronWeb.trx.getBalance(fromAddress).then(async function (result) {
            if(result > 0){
                const amount = result - minBal;
                if (amount > 0) {
                    let toAddress = jsonrpc.trxconfigPG.AdminAddress;
                    let baseDir = path.join(__dirname, '../../Keystore/pg/');
                    fs.readFile(baseDir + fromAddress + ".json", "utf-8", async function (err, datas) {
                        if(!err && datas){
                            let privatekey = common.decrypt(datas)
                            privatekey = JSON.parse(privatekey).privateKey;
                            amountTransfer(privatekey, amount, toAddress,fromAddress, async function (configresult) {
                                if (configresult) {
                                    return configresult;
                                }
                            });
                        } else {
                            console.log('unable to read file')
                        }
                    })
                } else {
                    return "";
                }
            } else {
                return "";
            }
        })
    }
    else {
        return;
    }
}

async function tokenMovingProcess(response) {
    if(common.getSiteDeployPG() == 0) {

        let fromAddress = response.fromAddress;
        let contractAddress = response.contractAddress;
        let currencyDecimal = response.currencyDecimal;

        try {
            let baseDir = path.join(__dirname, '../../Keystore/');
            let toAddress = jsonrpc.trxconfigPG.AdminAddress;
            fs.readFile(baseDir + fromAddress + ".json", "utf-8", async function (err, datas) {
                if(!err && datas) {
                    let privatekey = common.decrypt(datas)
                    const privateKey = JSON.parse(privatekey).privateKey;
                    balanceGet(contractAddress, fromAddress, async function (res) {
                        if(res) {
                            const amount = parseInt(res._hex, 16);
                            if (amount > 0) {
                                tronWeb.trx.getBalance(fromAddress).then(async function (result) {
                                    let minBal = 4 * Math.pow(10, 6);
                                    if(result >= minBal) {
                                        amountTokenTransfer(privateKey, res, toAddress, contractAddress, async function (configresult) {
                                            if (configresult) {
                                                return configresult;
                                            }
                                        });
                                    } else {
                                        let AdminAddress = jsonrpc.trxconfigPG.AdminAddress;
                                        let baseDir = path.join(__dirname, '../../Keystore/');
                                        fs.readFile(baseDir + AdminAddress + ".json", "utf-8", async function (err, datas) {
                                            if(!err && datas){
                                                let privateKey = common.decrypt(datas)
                                                privateKey = JSON.parse(privateKey).privateKey;
                                                amountTransfer(privateKey, 15*Math.pow(10, 6), fromAddress, AdminAddress, async function (configresult) {
                                                    if(configresult) {
                                                        return configresult;
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            } else {
                                return;
                            }
                        }
                    });
                } else {
                    return;
                }
            })
        } catch(e) {
            console.log('tokenMovingProcess',e);
            return;
        }
    }
    else {
        return;
    }
}

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