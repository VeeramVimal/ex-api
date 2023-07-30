const query_helper = require('../../helpers/query');
const mongoose = require('mongoose');
const leadTrader = mongoose.model("LeadTrader");
const copyTraderRequest = mongoose.model("CopyTraderRequest");
const tradeOrders = mongoose.model("TradeOrders");
//var Config = require('../../Config/config');
//let common = require('./common');
const tradeHelper = require('../../helpers/trade');
const comHelper = require('../../helpers/common');
const { log } = require('async');

const copyTradeController = {

    async CreateLeadTrader(req, res) {
        try {
            let data = req.body;
            let addLeadtrader = await query_helper.insertData(leadTrader, data);
            if (addLeadtrader.status) {
                res.json({ "status": true, "message": "Lead trader added successfully", "data": addLeadtrader.msg });
            } else {
                res.json({ "status": false, "message": "Lead trader added faild" });
            }
        } catch (err) {
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },

    async getAllTraderDetails(req, res) {
        try {
            let trader_status = req.body.trader_status;
            let trader_details = await leadTrader.find({ status: trader_status }).sort({ _id: -1 });
            if (trader_details && trader_details.length > 0) {

                let get_traders_details = trader_details.filter(final_data => {
                    if (final_data.trader_id != req.body.userId) {
                        return final_data;
                    }
                });
                res.json({ "status": true, "message": "Traders Details listed", data: get_traders_details });
            } else {
                res.json({ "status": false, "message": "No records found!" });
            }
        } catch (err) { }
    },

    async updateTraderDetails(req, res) {
        try {
            let data = req.body;
            let update_trader = await query_helper.updateData(leadTrader, "one", { _id: mongoose.Types.ObjectId(data._id) }, data);
            if (update_trader.status) {
                res.json({ "status": update_trader.status, "message": "Trader Details updated successfully" });
            } else {
                res.json({ "status": update_trader.status, "message": "Trader Details updated failed" });
            }
        } catch (err) { }
    },

    // async getTraderDetail(req, res) {
    //     try {
    //         let data = req.body;
    //         let trader_details = await query_helper.findoneData(leadTrader,{"status": data.status},{});
    //         res.json({ "status": trader_details.status, "message": trader_details.msg, data:trader_details.data });
    //     } catch (e) {
    //         res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
    //     }
    // },


    async createCopyTraderRequest(req, res) {
        try {
            let data = req.body;
            let addLeadtrader = await query_helper.insertData(copyTraderRequest, data);
            if (addLeadtrader.status) {
                res.json({ "status": true, "message": "Request added successfully", "data": addLeadtrader.msg });
            } else {
                res.json({ "status": false, "message": "Request added faild" });
            }
        } catch (err) {
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },


    async createOrder(data, res) {
        let leader_details = data.body.leader_details;
        let copy_user_details = data.body.copy_user_details;

        let findData = await tradeHelper.createCopyTradeOrder(leader_details, copy_user_details);

        // try {
        //   console.log('entryyyyyycreateorderrrrisakkkkkkkkkkkkkkkkkk')
        //   var response = {};
        //   // var dataa = {
        //   //   amount: 0.00001,
        //   //   price: 27514.9,
        //   //   stopPrice: 0,
        //   //   pair: '6136485308c26b4025024ce1',
        //   //   orderType: 'limit',
        //   //   type: 'sell',
        //   //   userId: '6453550ca9a6dd29f823498c'
        //   //   }            
        //     data['amount'] = 0.00001;
        //     data['price'] = 27514.9
        //     data['stopPrice'] = 0;
        //     data['[pair'] = '6136485308c26b4025024ce1'
        //     data['orderType'] = 'limit';
        //     data['type'] = 'sell';


        //   let user_ids = ['6453550ca9a6dd29f823498c','645cb2da0975f5339832459d'];
        //   user_ids.map(user_id=>{

        //   response['status'] = 0,
        //   response['type'] = data['type'],
        //   response['msg'] = '',
        //   response['orderType'] = data['orderType'],
        //   response['placeType'] = placeType,
        //   response['pair'] = data['pair'],
        //   response['userId'] = user_id; //[6453550ca9a6dd29f823498c,645cb2da0975f5339832459d]
        //   response['res'] = res;
        //   if(Config.sectionStatus && Config.sectionStatus.spotTrade == "Disable") {
        //     response['msg'] = 'Trade disabled. Kindly contact admin!';
        //     _tradeMap._createResponse(response);
        //   }
        //   else {
        //     console.log('elseeeeeeeeee')
        //     if(common.getSiteDeploy() == 0) {
        //       const orderwith = oArray.indexOf(user_id);
        //       if (orderwith == -1) {
        //         oArray.push(user_id)
        //         setTimeout(_tradeMap._intervalFunc, 5000, user_id);
        //         var amount = data['amount'],
        //           userId = user_id,
        //           price = data['price'],
        //           pair = data['pair'],
        //           orderType = data['orderType'],
        //           type = data['type'];
        //         var check = validator.isObject()
        //           .withRequired('userId', validator.isString())
        //           .withOptional('amount', validator.isNumber())
        //           .withOptional('price', validator.isNumber())
        //           .withOptional('pair', validator.isString())
        //           .withOptional('orderType', validator.isString())
        //           .withOptional('type', validator.isString())
        //           .withOptional('stopPrice', validator.isNumber());
        //         validator.run(check, data, async function (errorCount, errors) {
        //           if (errorCount == 0) {
        //             where = { "frompair.status": 1, "topair.status": 1, "status": 1, "_id": mongoose.Types.ObjectId(pair) };
        //             const getUser = await query_helper.findoneData(usersDB, { "_id": mongoose.Types.ObjectId(userId) }, {});//, "kycstatus": 1
        //             if (getUser.status) {
        //               const userResult = getUser.msg;
        //               userResult.tradeDisable = typeof userResult.tradeDisable == 'number' ? userResult.tradeDisable : 0;
        //               if (userResult.tradeDisable == 0) {
        //                 pairsDB.aggregate([
        //                   {
        //                     $lookup:
        //                     {
        //                       from: 'Currency',
        //                       localField: 'fromCurrency',
        //                       foreignField: '_id',
        //                       as: 'frompair'
        //                     }
        //                   },
        //                   {
        //                     $lookup:
        //                     {
        //                       from: 'Currency',
        //                       localField: 'toCurrency',
        //                       foreignField: '_id',
        //                       as: 'topair'
        //                     }
        //                   },
        //                   {
        //                     $project: {
        //                       "from_symbol_id": "$fromCurrency",
        //                       "to_symbol_id": "$toCurrency",
        //                       "min_trade_amount": "$minTrade",
        //                       "fees": "$fee",
        //                       "price": "$price",
        //                       "pair": "$pair",
        //                       "takerFee": "$takerFee",
        //                       "makerFee": "$makerFee",
        //                       "makerFeeWithKYC": "$makerFeeWithKYC",
        //                       "takerFeeWithKYC": "$takerFeeWithKYC",
        //                       "status": "$status",
        //                       "decimalValue": "$decimalValue",
        //                       "autoOrderExecute": "$autoOrderExecute",
        //                       "_id": "$_id",
        //                       "topair": "$topair",
        //                       "frompair": "$frompair",
        //                       "fromcurrency": "$frompair",
        //                       "tocurrency": "$topair",
        //                       "tradeEnable": "$tradeEnable",
        //                     }
        //                   },
        //                   {
        //                     $match: where
        //                   },
        //                 ]).exec(async function (err, resData) {
        //                   if (resData.length == 1) {
        //                     let pair_details = resData[0];
        //                     if(pair_details.tradeEnable == 1){
        //                       var nowDateT = new Date();
        //                       var checkDate = new Date();
        //                       var prevnowDateT = new Date(checkDate.setDate(checkDate.getDate() - 1));
        //                       let matchQ = {};
        //                       matchQ.userId= user_id;
        //                       matchQ.dateTime = {
        //                         "$gte":prevnowDateT,
        //                         "$lt":nowDateT
        //                       }
        //                       let ordercount = await orderDB.find(matchQ).countDocuments();
        //                       let settings = await query_helper.findoneData(siteSettings, {}, {})
        //                       siteSettingData = settings.msg;

        //                       if(ordercount <= siteSettingData.userMaxTradeCount) {
        //                         pair_details.frompair = pair_details.frompair[0];
        //                         pair_details.topair = pair_details.topair[0];
        //                         const checkFiat = (pair_details.frompair.curnType == 'Fiat' || pair_details.topair.curnType == 'Fiat') ? true : false;

        //                         const kycNotVerifiedFiatTrade = "allow";
        //                         if (kycNotVerifiedFiatTrade === "allow" || checkFiat == false || (checkFiat == true && userResult.kycstatus == 1)) {
        //                           var min_trade_amount = pair_details.min_trade_amount;
        //                           if (orderType == 'market') {
        //                             price = pair_details.price;
        //                           }
        //                           var total = amount * price;
        //                           if (total < min_trade_amount) {
        //                             response['msg'] = "Enter trade total must be more than " + min_trade_amount + " " + pair_details.tocurrency[0].currencySymbol;
        //                             _tradeMap._createResponse(response);
        //                           } else {
        //                             const markerResponse = await getOrderValue(orderType, pair_details._id, type, price);
        //                             if (markerResponse.status) {
        //                               const currency = type == "buy" ? pair_details.tocurrency[0] : pair_details.fromcurrency[0];
        //                               if (amount == 0 || price == 0 || amount == "" || price == "") {
        //                                 response['msg'] = "Please enter valid amount and price";
        //                                 _tradeMap._createResponse(response);
        //                               } else {

        //                                 let allowTrade = "yes";
        //                                 let usdPrice = price * pair_details.tocurrency[0].USDvalue;
        //                                 const usdTotal_cur = amount * usdPrice;

        //                                 if(userResult.kycstatus != 1) {
        //                                   var usdTotal_old = await getOldTradeUsdval({userId});
        //                                   // console.log({usdTotal_old});
        //                                   let userTradeUsdPrice = usdTotal_cur + usdTotal_old;
        //                                   const levelBasedLimit = (siteSettingData.withdrawLevel && siteSettingData.withdrawLevel['level1']) ? siteSettingData.withdrawLevel['level1'] : {
        //                                     tradeMaxLimit: 0
        //                                   }
        //                                   if(userTradeUsdPrice > levelBasedLimit.tradeMaxLimit) {
        //                                     allowTrade = "no";
        //                                     response['msg'] = "Your Daily Trade Limit exceeds..For more Trade Please complete your KYC...!";
        //                                     // console.log({
        //                                     //   userTradeUsdPrice,
        //                                     //   usdTotal_cur,
        //                                     //   usdTotal_old,
        //                                     //   amount,
        //                                     //   usdPrice
        //                                     // });
        //                                     _tradeMap._createResponse(response);
        //                                   }
        //                                 }

        //                                 if(allowTrade == "yes") {
        //                                   var da_te = new Date();
        //                                   var ye_ar = da_te.getFullYear();
        //                                   var str_year = ye_ar.toString();
        //                                   var str_length = str_year.length;
        //                                   var st_r_year = str_year.substr(str_length - 2, str_length);
        //                                   var millis = Date.now();
        //                                   var orderId = "O-" + st_r_year + "-" + millis;

        //                                   const balance = await tradeCheckBalance(userId, currency.currencyId, total, type, orderType, amount, price, orderId, response, 0);
        //                                   if (balance.status) {
        //                                     let status = '';
        //                                     let stopPrice = 0;
        //                                     if (orderType == 'stop') {
        //                                       status = "stoporder";
        //                                       stopPrice = data.stopPrice;
        //                                     } else if (orderType == 'market') {
        //                                       status = "market";
        //                                     } else {
        //                                       status = "active";
        //                                     }

        //                                     let fee = 0;
        //                                     let usdFee = 0;
        //                                     if (type == "buy") {
        //                                       fee = (amount * pair_details.takerFee) / 100;
        //                                       usdFee = fee * pair_details.fromcurrency[0].USDvalue;
        //                                     } else {
        //                                       fee = (amount * price * pair_details.takerFee) / 100;
        //                                       usdFee = fee * pair_details.tocurrency[0].USDvalue;
        //                                     }

        //                                     let makerFeeUser = pair_details.makerFee;
        //                                     let takerFeeUser = pair_details.takerFee;

        //                                     if(userResult.kycstatus == 1) {
        //                                       makerFeeUser = pair_details.makerFeeWithKYC;
        //                                       takerFeeUser = pair_details.takerFeeWithKYC;
        //                                     }

        //                                     let orderJson = {
        //                                       userId: userId,
        //                                       amount: amount,
        //                                       price: price,
        //                                       type: type,
        //                                       makerFee: makerFeeUser,
        //                                       takerFee: takerFeeUser,
        //                                       total: total,
        //                                       pendingTotal: total,
        //                                       orderType: orderType,
        //                                       pair: pair_details._id,
        //                                       status: status,
        //                                       orderId: orderId,
        //                                       usdPrice: usdPrice,
        //                                       sumFee: +fee,
        //                                       usdSumFee: +usdFee,
        //                                       stopPrice: +stopPrice,
        //                                       pairName: pair_details.fromcurrency[0].currencySymbol + '_' + pair_details.tocurrency[0].currencySymbol,

        //                                       usdTotal: usdTotal_cur
        //                                     }

        //                                     const insertTrade = await query_helper.insertData(orderDB, orderJson);
        //                                     if(insertTrade.status) {
        //                                       common.insertActivity(userId, type + " Order has been created", 'Create Order', "user", "");
        //                                       response['status'] = 1;
        //                                       response['amount'] = amount;
        //                                       response['price'] = price;
        //                                       response['type'] = type;
        //                                       response['insertId'] = insertTrade.msg._id;
        //                                       response['order'] = insertTrade.msg;
        //                                       response['msg'] = "Order Created Successfully";
        //                                       _tradeMap._createResponse(response, pair_details);
        //                                     } else {
        //                                       // console.log('insertTrade', insertTrade)
        //                                       response['msg'] = "Please try after 5 seconds";
        //                                       _tradeMap._createResponse(balance.response);
        //                                     }  
        //                                   } else {
        //                                     _tradeMap._createResponse(balance.response);
        //                                   }
        //                                 }

        //                               }
        //                             } else {
        //                               response['msg'] = markerResponse.msg;
        //                               _tradeMap._createResponse(response);
        //                             }
        //                           }
        //                         } else {
        //                           response['msg'] = 'Your Kyc is not verified. Please verify kyc for trade Fiat Currency!';
        //                           _tradeMap._createResponse(response);
        //                         }
        //                       } else {
        //                         response['msg'] = 'You tried maximum order attempt of day, Try after 24 hours!';
        //                         _tradeMap._createResponse(response);
        //                       }
        //                     }
        //                     else {
        //                       response['msg'] = pair_details.pair+" disabled for trade.";
        //                       _tradeMap._createResponse(response);
        //                     }
        //                   } else {
        //                     response['msg'] = "Not a valid pair";
        //                     _tradeMap._createResponse(response);
        //                   }
        //                 })
        //               } else {
        //                 response['msg'] = 'Your account disabled for trade. Kindly contact admin!';
        //                 _tradeMap._createResponse(response);
        //               }
        //             } else {
        //               response['msg'] = 'Not a valid user!';
        //               _tradeMap._createResponse(response);
        //             }
        //           } else {
        //             console.log('e', errorCount, errors)
        //             response['msg'] = "Please fill all fields";
        //             _tradeMap._createResponse(response);
        //           }
        //         });
        //       } else {
        //         response['success'] = false;
        //         response['msg'] = "Please try after 5 seconds";
        //         _tradeMap._createResponse(response);
        //       }
        //     } else {
        //       response['msg'] = "Please wait for 5 minutes before placing another request!";
        //       _tradeMap._createResponse(response);
        //     }
        //   }
        // })
        // } catch (e) {
        //   console.log('createOrder', e);
        //   // response['msg'] = "Please fill all fields";
        //   // _tradeMap._createResponse(response);
        // }
    },

    async getUserBalance(req, res) {

        let data = req.body;
        const balance = await comHelper.getbalance(data.userId, data.currency_id);

        if (balance) {
            res.json({ "status": true, "message": "Balance details get successfully", "data": balance });
        } else {
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },

    async getAllCopyUsers(req, res) {
        try {
            let trader_id = req.body.trader_id;
            let trader_details = await copyTraderRequest.find({ trader_id: trader_id }).sort({ _id: -1 });
            if (trader_details && trader_details.length > 0) {
                res.json({ "status": true, "message": "Copy Traders Details listed", data: trader_details });
            } else {
                res.json({ "status": false, "message": "No records found!" });
            }
        } catch (err) { }
    },


    async getCopyUserTrade(req, res) {
        try {
            let copyTradeID = req.body.copyTradeID;
            let trader_details = await tradeOrders.find({ copyTradeID: copyTradeID }).sort({ _id: -1 });
            if (trader_details && trader_details.length > 0) {
                let get_traders_details = trader_details.filter(final_data => {
                    if (final_data.status != "cancelled") {
                        return final_data;
                    }
                });

                res.json({ "status": true, "message": "Copy Traders Details listed", data: get_traders_details });
            } else {
                res.json({ "status": false, "message": "No records found!" });
            }
        } catch (err) { }
    },

    async cancelOrder(req, res) {
        try {
            await tradeHelper.cancelCopyTradeOrder(req.body.cancelOrderDetails, (resOrder) => {
                console.log('resOrderresOrder.....', resOrder);
                res.json(resOrder);
            });
        } catch (err) {
            console.log('cancelOrder', err);
            res.status(401).send('unauthorized')
        }
    },

}
module.exports = copyTradeController;