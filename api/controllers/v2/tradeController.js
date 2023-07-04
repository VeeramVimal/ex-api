const query_helper = require('../../helpers/query');
let common = require('../../helpers/common');
const mongoose = require('mongoose');
const emailTemplate = mongoose.model("EmailTemplate");

const mapDb = mongoose.model("MappingOrders");
const UserDB = mongoose.model("Users");
const profitDB = mongoose.model("Profit");
const orderDB = mongoose.model('TradeOrders');

var config = require("../../Config/config");

const tradeController = {
  async getOrderDetail(req, res) {
    try {
      const {
        body: reqBody = {},
        userId
      } = req;
      const {
        orderId = 0
      } = reqBody;
      let findData = {
        _id: mongoose.Types.ObjectId(orderId),
        userId: mongoose.Types.ObjectId(userId),
      };
      const resData = await orderDB.aggregate([
        {
          $match: findData
        },

        {
          $lookup: {
            from: 'Pairs',
            let: {
              pairId: '$pair',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { "$eq": ["$_id", "$$pairId"] }
                    ]
                  }
                }
              },
              {
                $project: {
                  amountDecimal: 1,
                  priceDecimal: 1,
                  totalDecimal: 1
                }
              }
            ],
            as: "pairDetails"
          }
        },
        {
          $unwind: {
            "path": "$pairDetails",
            "preserveNullAndEmptyArrays": true
          }
        },

        {
          $lookup: {
            from: 'BalanceUpdation',
            let: {
              mainOrdId: '$orderId',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { "$eq": ["$lastId", "$$mainOrdId"] },
                      // mapordId: {'$toString':'$_id'},
                      { "$eq": ["$userId", userId] },
                      { "$eq": ["$type", "Trade - Creation"] },
                    ]
                  }
                }
              },
            ],
            as: "debitDetails"
          }
        },
        // {
        //   $unwind: {
        //     "path": "$debitDetails",
        //     "preserveNullAndEmptyArrays": true
        //   }
        // },

        {
          $lookup: {
            from: 'MappingOrders',
            let: {
              ordDbId: '$_id',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $or: [
                          { "$eq": ["$sellOrderId", "$$ordDbId"] },
                          { "$eq": ["$buyOrderId", "$$ordDbId"] }
                        ]
                      },
                      {
                        $or: [
                          { "$eq": ["$sellerUserId", mongoose.Types.ObjectId(userId)] },
                          { "$eq": ["$buyerUserId", mongoose.Types.ObjectId(userId)] }
                        ]
                      },
                    ]
                  }
                }
              },

              {
                $lookup: {
                  from: 'Profit',
                  let: {
                    mapordId: '$_id',
                  },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            { "$eq": ["$mappingOrderId", "$$mapordId"] },
                            { "$eq": ["$userId", mongoose.Types.ObjectId(userId)] },
                          ]
                        }
                      }
                    },

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
                                  { "$eq": ["$currencyId", "$$currencyId"] },
                                ]
                              }
                            }
                          },
                          {
                            $limit: 1
                          }
                        ],
                        as: "currencyIdDet"
                      }
                    },
                    {
                      $unwind: {
                        "path": "$currencyIdDet",
                        "preserveNullAndEmptyArrays": true
                      }
                    },

                  ],
                  as: "Profit"
                }
              },
              // {
              //   $unwind: {
              //     "path": "$Profit",
              //     "preserveNullAndEmptyArrays": true
              //   }
              // },

              {
                $lookup: {
                  from: 'BalanceUpdation',
                  let: {
                    mapordId: {'$toString':'$_id'},
                    // orderType: { $concat: [ "Mapping", " ", "$orderType" ] },
                    orderTypeeee: {
                      $concat: [
                        "Mapping",
                        " ",
                        // "Sell"
                        {
                          $toUpper: "$orderType"
                        }
                      ]
                    }
                  },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            { "$eq": ["$lastId", "$$mapordId"] },
                            { "$eq": ["$userId", userId] },
                            {
                              $or: [
                                { "$eq": ["$type", "Mapping Buy"] },
                                { "$eq": ["$type", "Mapping Sell"] },
                                // { "$eq": ["$type", "$$orderTypeeee"] },
                                // { "$eq": ["$type", "$orderType"] },
                                { "$eq": ["$type", "cancel order"] },
                              ]
                            }
                          ]
                        }
                      }
                    },
                    {
                      $sort: {
                        _id: -1
                      }
                    },

                    {
                      $lookup: {
                        from: 'Currency',
                        let: {
                          // currencyId: {'$toObjectId':'$currencyId'},
                          currencyId: '$currencyId',
                        },
                        pipeline: [
                          {
                            $match: {
                              $expr: {
                                $and: [
                                  { "$eq": ["$currencyId", "$$currencyId"] },
                                ]
                              }
                            }
                          },
                          {
                            $limit: 1
                          }
                        ],
                        as: "currencyIdDet"
                      }
                    },
                    {
                      $unwind: {
                        "path": "$currencyIdDet",
                        "preserveNullAndEmptyArrays": true
                      }
                    },

                  ],
                  as: "BalanceUpdation"
                }
              },

            ],
            as: "MappingOrders"
          }
        }
      ]);

      let orderDetails = {};
      let partialOrders = [];

      if (resData && resData[0]) {
        const result = resData[0];
        const pairDetails = result.pairDetails;
        const pairName = result.pairName;
        const pairNameArr = pairName.split("_");
        let Progress = 0;

        let {
          amountDecimal = 0,
          priceDecimal = 0,
          totalDecimal = 0
        } = pairDetails;

        if (result.pendingTotal == 0) {
          Progress = 100;
        }
        else if(result.total > 0){
          const pendingProgress = (100 * result.pendingTotal) / result.total;
          if(pendingProgress > 0) {
            Progress = (100 - pendingProgress).toFixed(2);
          }
        }

        let updatedAt = result.dateTime;

        const side = result.orderType;

        let debitBal = {before: 0, after: 0};
        if(result.debitDetails && result.debitDetails[0] && result.debitDetails[0].oldBalance != undefined) {
          let debitDetails = result.debitDetails[0];
          debitBal = {
            before: debitDetails.oldBalance,
            after: debitDetails.amount,
          }
          if(result.debitDetails.length > 1) {
            const lastRes = result.debitDetails[result.debitDetails.length - 1];
            if(lastRes.amount != undefined) {
              debitBal.after = lastRes.amount;
            }
          }
        }

        const fromCurrency = pairNameArr && pairNameArr[0] ? pairNameArr[0] : "";
        const toCurrency = pairNameArr && pairNameArr[1] ? pairNameArr[1] : "";
        const debitCurrency = result.type == "buy" ? toCurrency : fromCurrency;

        orderDetails = {
          'Order type': result.orderType,
          'Trade type': result.type,
          'Amount': result.amount > 0 ? parseFloat(result.amount).toFixed(amountDecimal) : 0,
          'Created at': result.dateTime,
          'From currency': fromCurrency,
          'To currency': toCurrency,
          'Order ID': result.orderId,
          'Price': result.price > 0 ? parseFloat(result.price).toFixed(priceDecimal) : 0,
          'Progress': Progress + " %",
          'Updated at': updatedAt,
          'Status': result.status,
          'Pair name': result.pairName,
          'Before debit': debitBal.before,
          'After debit': debitBal.after,
          'Debit currency': debitCurrency,
        }

        const MappingOrders = result.MappingOrders;
        let orderType = result.type;
        if (MappingOrders && MappingOrders.length > 0) {
          if (MappingOrders[MappingOrders.length - 1].dateTime) {
            updatedAt = MappingOrders[MappingOrders.length - 1].dateTime;
          }

          for (let i = 0; i < MappingOrders.length; i++) {
            const element = MappingOrders[i];

            const {
              _id: orderId = "",
              role="",
              status = "filled",
              dateTime = "",
              filledAmount = 0,
              tradePrice = 0,
            } = element;

            let partialOrder = {
              'Price': tradePrice > 0 ? parseFloat(tradePrice).toFixed(priceDecimal) : 0,
              'Amount': filledAmount > 0 ? parseFloat(filledAmount).toFixed(amountDecimal) : 0,
              'Executed Date': dateTime,
              'Status': status,
              'Order ID': orderId,
              'Role': role,
            }

            if(element.Profit && element.Profit[0]) {

              let profitData = element.Profit[0];

              const mapType = "trade "+orderType;              
              const Idx = element.Profit.findIndex(e => e.type === mapType);
              if(Idx > -1) {
                profitData = element.Profit[Idx];
              }

              const {
                currencyIdDet: profitCurrency = {},
                totalFees = 0,
              } = profitData;
              let {
                userFeeReduced = 0,
              } = profitData;
              const {
                currencySymbol: profit_currencySymbol = "",
                siteDecimal: profit_siteDecimal = ""
              } = profitCurrency;
              const feesDecimal = (userFeeReduced !== "tradeFeeVoucher" && userFeeReduced !== "fanToken")
                ?
                profit_siteDecimal
                :
                side == "buy"
                  ?
                  amountDecimal
                  :
                  priceDecimal;

              if (userFeeReduced == "tradeFeeVoucher") {
                userFeeReduced = "Voucher";
              }
              else if (userFeeReduced == "fanToken") {
                userFeeReduced = config.FanTknSymbol;
              }
              else if (userFeeReduced == "respective") {
                userFeeReduced = "Respective";
              }

              partialOrder['fees'] = {
                feesDecimal,
                totalFees,
                value: totalFees.toFixed(4),
                currency: profit_currencySymbol,
                type: userFeeReduced,
              };
            }

            if(element.BalanceUpdation && element.BalanceUpdation[0]) {
              let balDetuct = element.BalanceUpdation[0];
              if(orderType) {
                orderType = orderType.charAt(0).toUpperCase() + orderType.slice(1);
                let mapType = "Mapping "+orderType;              
                const Idx = element.BalanceUpdation.findIndex(e => e.type === mapType);
                if(Idx > -1) {
                  balDetuct = element.BalanceUpdation[Idx];
                }
              }
              if(balDetuct){
                partialOrder['execute'] = {
                  oldBalance: balDetuct.oldBalance,
                  amount: balDetuct.amount,
                  difference: balDetuct.difference,
                  currency: ""
                };
                if(balDetuct.currencyIdDet && balDetuct.currencyIdDet.currencySymbol) {
                  partialOrder['execute'].currency = balDetuct.currencyIdDet.currencySymbol;
                }
              }
            }
            partialOrders.push(partialOrder);
          }
        }

      }

      return res.json({ status: true, resData, response: { orderDetails, partialOrders } });
    }
    catch (err) {
      console.log("getOrderDetail : err : ", err);
      return res.json({ status: false });
    }
  },
  async getProfitList(req, res) {
    try {
      const {
        userId
      } = req;
      let limit = req.body.limit ? parseInt(req.body.limit) : 25;
      let offset = req.body.offset ? parseInt(req.body.offset) : 0;

      const findData = {
        "$and": [
          { userId: mongoose.Types.ObjectId(userId) },
        ]
      };

      let queryAgg = [
        {
          $match: findData
        },

        {
          $lookup: {
            from: 'MappingOrders',
            let: {
              ordId: '$_id',
              useId: '$userId',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $or: [
                          { "$eq": ["$buyOrderId", "$$ordId"] },
                          { "$eq": ["$sellOrderId", "$$ordId"] },
                        ]
                      },
                      {
                        $or: [
                          { "$eq": ["$buyerUserId", "$$useId"] },
                          { "$eq": ["$sellerUserId", "$$useId"] },
                        ]
                      }
                    ]
                  }
                }
              },

              {
                $lookup:
                {
                  from: 'Pairs',
                  localField: 'pair',
                  foreignField: '_id',
                  as: 'pair'
                }
              },
              {
                $unwind: {
                  "path": "$pair",
                  "preserveNullAndEmptyArrays": true
                }
              },






              {
                $lookup: {
                  from: 'Profit',
                  let: {
                    mapordId: '$_id',
                  },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            { "$eq": ["$mappingOrderId", "$$mapordId"] },
                            { "$eq": ["$userId", mongoose.Types.ObjectId(userId)] },
                          ]
                        }
                      }
                    },

                    {
                      $lookup: {
                        from: 'Currency',
                        let: {
                          curId: '$currencyId',
                        },
                        pipeline: [
                          {
                            $match: {
                              $expr: {
                                $and: [
                                  { "$eq": ["$currencyId", "$$curId"] },
                                ]
                              }
                            }
                          },
                          {
                            $limit: 1
                          }
                        ],
                        as: 'currency'
                      },
                    },
                    {
                      $unwind: {
                        "path": "$currency",
                        "preserveNullAndEmptyArrays": true
                      }
                    },

                  ],
                  as: 'Profit'
                },
              },





            ],
            as: 'MappingOrders'
          },
        },

        {
          $unwind: {
            "path": "$MappingOrders",
            // "preserveNullAndEmptyArrays": true
          }
        },

      ];
      const resDataCount = await orderDB.aggregate(queryAgg).exec();
      queryAgg.push({ "$sort": { _id: -1 } });
      queryAgg.push({ "$limit": offset + limit });
      queryAgg.push({ "$skip": offset });
      const resData = await orderDB.aggregate(queryAgg).exec();

      const count = resDataCount && resDataCount.length > 0 ? resDataCount.length : 0;

      // const countChk = await mapDb.find(findData);
      // const count = countChk && countChk.length > 0 ? countChk.length : 0;

      return res.json({ "status": true, list: resData ? resData : [], count });
    } catch (e) {
      console.log('getProfitList : ', e);
      res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
    }
  },
}

module.exports = tradeController;