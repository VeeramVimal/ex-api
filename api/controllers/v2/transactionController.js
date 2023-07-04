const mongoose = require('mongoose');
const Transactions = mongoose.model("Transactions");

const transactionController = {
    async withdrawLevelDetail(req, res) {
        const {
            userId = ""
        } = req;
        let dailyDate = new Date();
        dailyDate.setDate(dailyDate.getDate() - 1);

        let monthlyDate = new Date();
        monthlyDate.setMonth(monthlyDate.getMonth() - 1);

        Transactions.aggregate([
            {
                $match: {
                    userId: userId,
                    type: "Withdraw",
                    status: { $in: [0,1,3,5,6] },
                    createdDate: { $gte: dailyDate }
                }
            },
            {
                "$group": {
                    "_id": '$userId',
                    volume: { $sum: '$usdAmount' }
                }
            },
            {
                $project: {volume: "$volume"},
            }
        ]).exec(async function (err, result) {
            let totalDailyVolume = 0;
            try {
                if(result.length > 0) {
                    if(result[0].volume > 0) {
                        totalDailyVolume = result[0].volume;
                    }
                }
            } catch(e){
                console.log('getLevelDetail',e);
                return res.json({ status: false });
            }
            Transactions.aggregate([
                {
                    $match: {
                        userId: userId,
                        type: "Withdraw",
                        status: { $in: [0,1,3,5,6] },
                        createdDate: { $gte: monthlyDate }
                    }
                },
                {
                    "$group": {
                        "_id": '$userId',
                        volume: { $sum: '$usdAmount' }
                    }
                },
                {
                    $project: {volume: "$volume"},
                }
            ]).exec(async function (err, result1) {
                let totalMonthlyVolume = 0;
                try {
                    if(result1.length > 0) {
                        if(result1[0].volume > 0) {
                            totalMonthlyVolume = result1[0].volume;
                        }
                    }
                    return res.json({status: true, data: {totalDailyVolume, totalMonthlyVolume } });
                } catch(e){
                    console.log('getLevelDetail',e);
                    return res.json({status: false, data: {totalDailyVolume} });
                }
            });
        });
    }
}

let oArray = [];
function _intervalFunc(orderwith) {
    orderwith = orderwith.toString();
    var index = oArray.indexOf(orderwith);
    if (index > -1) {
        oArray.splice(index, 1);
    }
}
module.exports = transactionController;