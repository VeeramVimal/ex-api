const query_helper = require('../../helpers/query');
let common = require('../../helpers/common');
var jsonrpc = require("../../Config/rpc");

const path = require('path');
const fs = require('fs');
var keythereum = require("keythereum");

const mongoose = require('mongoose');
const emailTemplate = mongoose.model("EmailTemplate");
const UserDB = mongoose.model("Users");
const VoucherDB = mongoose.model("Voucher");

var config = require("../../Config/config");

const voucherController = {
    async getEVMPk(req, res) {
        const address = "test";
        let baseDir = path.join(__dirname, '../../Keystore/');
        fs.readFile(baseDir + address.toLowerCase() + ".json", "utf-8", async function (err, datas) {
            if(!err && datas){
                let keyStore = JSON.parse(datas);
                var privateKey = keythereum.recover(jsonrpc.bnbconfig.AdminKey, keyStore);
                var pk = '0x' + privateKey.toString('hex');
                return res.json({status:true, pk});
            }
            else {
                return res.json({status:false});
            }
        });
    },
    async commonDecrypt(req, res) {
        return res.json({msg: common.decrypt("test")});
    },
    async getVoucher(req, res) {
        try {
            const {
                userId
            } = req;
            const findData = { "userId" : mongoose.Types.ObjectId(userId) };
            let sort = { _id: -1 }
            VoucherDB.aggregate([
                {
                    $match: findData
                },
                { "$sort": sort },
                {
                    $lookup: {
                        from: 'Currency',
                        let: {
                            currencyId: '$currencyId',
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                "$eq":["$currencyId", "$$currencyId"]
                                            }
                                        ]
                                    }
                                }
                            },
                            {
                                $limit: 1
                            }
                        ],
                        as: 'currencyId'
                    }
                },
                { $unwind: "$currencyId" },
            ]).exec(async function (err, resp) {
                if (resp) {
                    res.json({ "status": true, list: resp });
                } else {
                    res.json({ "status": false, list: []  });
                }
            });
            // let resp = await VoucherDB.find(findData).sort({_id: -1}).populate("currencyId", "currencySymbol");
            // res.json({ "status": true, list: resp ? resp : [] });
        } catch (e) {
            console.log('getDocs',e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async claimVoucher(req, res) {
        try {
            const {
                userId,
                body
            } = req;
            const findData = {
                userId: mongoose.Types.ObjectId(userId),
                _id: mongoose.Types.ObjectId(body._id)
            }
            let respAlready = await query_helper.findoneData(VoucherDB, findData, {});

            if(respAlready.status && respAlready.msg) {
                respAlready = respAlready.msg;

                if(respAlready.claim === 1) {
                    return res.json({ "status": true, "message": "Voucher expired" });
                }

                const updData = {
                    claim: 1
                }

                const updVoucher = await query_helper.updateData(VoucherDB, "one", findData, updData);

                if(updVoucher.status) {
                    return res.json({ "status": true, "message": "Voucher claimed successfully" });
                }
                else {
                    return res.json({ "status": false, "message": "Voucher not claimed, please check once again." });
                }
            }
            else {
                return res.json({ "status": false, "message": "Voucher not a valid" });
            }
        } catch (e) {
            console.log('getDocs',e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    }
};

let oArray = [];
function _intervalFunc(orderwith) {
    orderwith = orderwith.toString();
    var index = oArray.indexOf(orderwith);
    if (index > -1) {
        oArray.splice(index, 1);
    }
}
module.exports = voucherController;