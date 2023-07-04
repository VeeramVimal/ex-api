const mongoose = require('mongoose');

const query_helper = require('../../helpers/query');

const Pairs = mongoose.model("Pairs");

const marketMakingController = {
  async createMarketMakingOrder(req, res) {
    console.log("createMarketMakingOrder");

    let matchQ = {
      autoOrderExecute: 1,
      autoOrderExecuteType: "marketMaking",
      "marketMaking.orderTotalCount": {"$gt": 0}
    };

    let marketMakingPairs = await Pairs.find(matchQ).sort({_id:-1}).populate("marketMaking.userId", "email");

    console.log({ marketMakingPairs });

    for (let a = 0; a < marketMakingPairs.length; a++) {
        const element = marketMakingPairs[a];

        const {
            price = 0,
            marketMaking = {}
        } = element;

        const {
            orderTotalCount = 0,
            minimumQuantity = 0,
            maximumQuantity = 0,
            maximumTotalQuantity = 0,
            buyStartPriInPerc = 0,
            buyEndPriInPerc = 0,
            sellStartPriInPerc = 0,
            sellEndPriInPerc = 0,
            userId = {}
        } = marketMaking;

        if(
            orderTotalCount > 0 &&
            minimumQuantity > 0 &&
            maximumQuantity > 0 &&
            maximumTotalQuantity > 0 &&
            buyStartPriInPerc > 0 &&
            buyEndPriInPerc > 0 &&
            sellStartPriInPerc > 0 &&
            sellEndPriInPerc > 0 &&
            userId
        ) {
            // 
        }
    }
    return true;
  },
};

module.exports = marketMakingController;
