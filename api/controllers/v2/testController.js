const query_helper = require('../../helpers/query');
const mongoose = require('mongoose');
const UserWallet = mongoose.model("UserWallet");
let CurrencyDb = mongoose.model('Currency');

const customerController = {
    async welcome(req, res) {
        return res.json({status: true, data: "welcome"});
    },
    async getUserBalanceByCurrencyId(req, res) {
        console.log("getUserBalanceByCurrencyId");
        const {
            body: reqBody = {}
        } = req;
        const {
            currencySymbol = "INR",
            currency_id = "",
            currencyId = ""
        } = reqBody;

        let initMatch = {
            amount: {"$gt":0}
        }

        if(currency_id) {
            let resData = await query_helper.findoneData(CurrencyDb, {_id: mongoose.Types.ObjectId(currency_id)}, {});
            if (resData.status) {
                console.log({resData});
                initMatch.currencyId = mongoose.Types.ObjectId(resData.msg.currencyId);
            }
        }
        if(currencyId) {
            initMatch.currencyId = mongoose.Types.ObjectId(currencyId);
        }

        const userWalletQuery = [
            {
                $match: initMatch,
            },
            {
                $lookup: {
                    from: 'Users',
                    let: {
                        userId: '$userId',
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    "$eq": ["$_id", "$$userId"]
                                }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                email: 1
                            }
                        }
                    ],
                    as: 'userDet'
                },
            },
            {
                $unwind: "$userDet"
            },
            {
                $lookup: {
                    from: 'CurrencySymbol',
                    let: {
                        currencyId: '$currencyId',
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    "$eq": ["$_id", "$$currencyId"]
                                }
                            }
                        },
                        {
                            $project: {
                                // _id: 0,
                                currencySymbol: 1
                            }
                        }
                    ],
                    as: 'currencyDet'
                },
            },
            {
                $unwind: "$currencyDet"
            },
            {
                $sort: {
                    amount: -1
                }
            },
            {
                $project: {
                    _id: 0,
                    amount: 1,
                    hold: 1,
                    userEmaisl: "$userDet.email",
                    currencySymbol: "$currencyDet.currencySymbol",
                    // userDet: 1,
                    // currencyDet: 1,
                }
            }
        ];

        const walletResult = await UserWallet.aggregate(userWalletQuery);

        res.json({walletResult});
    },
};

module.exports = customerController;