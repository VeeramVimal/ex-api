const query_helper = require('../../helpers/query');
let common = require('../../helpers/common');
const mongoose = require('mongoose');

const adminCustomerWalletController = {
    async depositEVMBased (req, res) {
        try {
            if(common.getSiteDeploy() == 0) {
                let reqBody = req.body;
                let GetuserID = reqBody.userId;
                cronRunForETHTRX(GetuserID, res);
            }
        } catch (e) {
            console.log("depositETHTRX", e);
            res.json({ status: false, msg : "Invalid User Request" })
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

async function cronRunForETHTRX(GetuserID, res) {
    const orderwith = oArray.indexOf(GetuserID);
    if(orderwith == -1) {
        oArray.push(GetuserID.toString())
        setTimeout( _intervalFunc, 60000, GetuserID);

        await common.Coindeposit('BNB', mongoose.Types.ObjectId(GetuserID));
        await common.TokenDeposit('BNB', mongoose.Types.ObjectId(GetuserID));

        await common.Coindeposit('ETH', mongoose.Types.ObjectId(GetuserID));
        await common.TokenDeposit('ETH', mongoose.Types.ObjectId(GetuserID));

        await common.Coindeposit('TRX', mongoose.Types.ObjectId(GetuserID));
        await common.TokenDeposit('TRX', mongoose.Types.ObjectId(GetuserID));

        return res.json({ status: true });
    } else {
        setTimeout( _intervalFunc, 60000, GetuserID);  
        res.json({ status: false, msg: "You can able to request 60 seconds once" });
    }
}

module.exports = adminCustomerWalletController;