let commonPG = require('../../../helpers/commonPG');

const walletController = {
    async getBlockNumberBNB (req, res) {
        const Cursymbol = "BNB";
        const getBlockNumberResp = await commonPG.getBlockNumberPG('BNB', {Cursymbol});
        if(getBlockNumberResp.status) {
            return res.json({status: true, currentBlockNumber: getBlockNumberResp.currentBlockNumber});
        }
        else {
            return res.json({status: false});
        }
    },
    async getBlockNumber (req, res) {
        const {
            currencySymbol = "BNB"
        } = req.query;
        const getBlockNumberResp = await commonPG.getBlockNumberPG(currencySymbol, {currencySymbol});
        if(getBlockNumberResp.status) {
            let retData = {status: true, currentBlockNumber: getBlockNumberResp.currentBlockNumber};
            if(getBlockNumberResp.blockDetail) {
                retData.blockDetail = getBlockNumberResp.blockDetail;
            }
            return res.json(retData);
        }
        else {
            return res.json({status: false});
        }
    },
    async CreateAdminAddress (req, res) {
        const {
            currencySymbol = "BNB"
        } = req.query;
        commonPG.CreateAdminAddressPG(currencySymbol, "pg", async function (AddressCreate) {
            if (AddressCreate) {
                return res.json({ "status": true, "data": AddressCreate });
            }
            else {
                return res.json({ "status": false });
            }
        });
    },
    async createNewAddress (req, res) {
        const {
            currencySymbol = "BNB"
        } = req.query;
        commonPG.CreateAddressPG(currencySymbol, "pg", async function (AddressCreate) {
            if (AddressCreate) {
                return res.json({ "status": true, "data": AddressCreate });
            }
            else {
                return res.json({ "status": false });
            }
        });
    },
    async deposit (req, res) {
        try {
            const reqBody = req.body;
            apiRunForEVM("pg", reqBody, res);
        } catch (e) {
            console.log("deposit pg : ", e);
            return res.json({ status: false, msg : "Invalid User Request" })
        }
    },
    async getbalance (req, res) {
        console.log("getbalance");
        const {
            fromAddress = "",
            contractAddress = "",
            currencySymbol = "BNB",
            decimal = 6
        } = req.body;

        const transresult = {
            decimal,
            currencySymbol,
            fromAddress,
            contractAddress
        };

        commonPG.BalanceCheckPG(transresult, async function (txnId) {
            if (txnId.status) {
                return res.json({ status: true, txn: txnId })
            }
            else {
                return res.json({ status: false, msg : txnId.message ? txnId.message : "Transaction failed", txn: txnId })
            }
        });
    },
    async withdraw (req, res) {
        const {
            amount = 0,
            fromAddress = "",
            toAddress = "",
            contractAddress = "",
            currencySymbol = "BNB",
            decimal = 6
        } = req.body;

        const transresult = {
            decimal,
            currencySymbol,
            amount,
            fromAddress,
            toAddress,
            contractAddress
        };

        commonPG.CoinWithdrawPG(transresult, async function (txnId) {
            if (txnId.status) {
                return res.json({ status: true, txn: txnId })
            }
            else {
                return res.json({ status: false, msg : txnId.message ? txnId.message : "Transaction failed", txn: txnId })
            }
        });
    },
}

async function apiRunForEVM(GetuserID, reqBody, res) {
    const {
        currencySymbol = "BNB"
    } = reqBody;
    const depositTrxByBlock = await commonPG.CoinDepositPG(currencySymbol, GetuserID, reqBody);
    if(depositTrxByBlock && depositTrxByBlock.status === false && depositTrxByBlock.error) {
        return res.json({ status: false, error: depositTrxByBlock.error ? depositTrxByBlock.error : "Getting error" });
    }
    else if(!depositTrxByBlock) {
        return res.json({ status: false });
    }
    res.json({ status: true, depositTrxByBlock });
}

let oArray = [];
function _intervalFunc(orderwith){
    orderwith = orderwith.toString();
    var index = oArray.indexOf(orderwith);
    if (index > -1) {
        oArray.splice(index, 1);
    }
}

module.exports = walletController;