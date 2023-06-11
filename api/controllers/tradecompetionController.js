const query_helper = require("../helpers/query");
const mongoose = require("mongoose");
const Competion = mongoose.model("Competion");
const TradingCompetitionBalanceUpdation = mongoose.model(
  "TradingCompetitionBalanceUpdation"
);
let orderDB = mongoose.model("TradeOrders");
const Currency = mongoose.model("Currency");
const coinPair = mongoose.model("Pairs");
const UserWallet = mongoose.model("UserWallet");
const Users = mongoose.model("Users");
const tradeHelper = require("../helpers/trade");
let common = require("../helpers/common");
const CMS = mongoose.model("CMS");
const Pairs = mongoose.model("Pairs");

let url = require("url");
let marketsList = [];

const tradecompetionController = {
  async addwinnerlist(req, res) {
    try {
      const competionsid = await Competion.findById({
        _id: req.body.id,
      }).exec();
      var winnerlistarr = competionsid.winnerslist;
      if (winnerlistarr.length == 0) {
        if (competionsid.prizepool >= req.body.formsval.prizepool) {
          Competion.updateOne(
            { _id: req.body.id },
            { $push: { winnerslist: req.body.formsval } },
            function (err, result) {
              if (err) throw err;
              else {
                res.json({ status: true, message: "Add list successfull" });
              }
            }
          );
        } else {
          res.json({ status: false, message: "prizepool Amount is low" });
        }
      } else {
        const lenarr = winnerlistarr[winnerlistarr.length - 1].rank;
        const totalAmount = winnerlistarr.reduce(
          (accumulator, currentValue) => {
            return accumulator + currentValue.prizepool;
          },
          0
        );
        const totalamounts = competionsid.prizepool - totalAmount;
        if (
          totalamounts >= req.body.formsval.prizepool &&
          lenarr < competionsid.totalwinners
        ) {
          Competion.updateOne(
            { _id: req.body.id },
            { $push: { winnerslist: req.body.formsval } },
            function (err, result) {
              if (err) throw err;
              else {
                res.json({ status: true, message: "Add list successfull" });
              }
            }
          );
        } else {
          res.json({ status: false, message: "prizepool Amount is low" });
        }
      }
    } catch (e) {
      res.json({ status: false });
    }
  },
  async getwinnerlist(req, res) {
    try {
      const competionsid = await Competion.find({ _id: req.body.id }).exec();
      res.json({ status: true, data: competionsid });
    } catch (e) {
      res.json({ status: false });
    }
  },

  async removewinnerid(req, res) {
    try {
      const { findpairid, id } = req.body;
      const competionsid = await Competion.findById({
        _id: findpairid,
      }).then(async (data) => {
        if (data.winnerslist.length) {
          var getData = data.winnerslist.find((ele) => ele._id == id);
          getData.remove({ _id: id });
        }
        return data.save();
      });
      res.json({ status: true, message: "successfully deleted" });
    } catch (e) {
      res.json({ status: false });
    }
  },

  async editwinnerlist(req, res) {
    try {
      const { findpairid, id, formsval } = req.body;
      const competionsid = await Competion.updateOne(
        { _id: findpairid, "winnerslist._id": id },
        {
          $set: {
            "winnerslist.$.rank": formsval.rank,
            "winnerslist.$.prizepool": formsval.prizepool,
          },
        }
      ).exec();
      res.json({ status: true, message: "Update successfully" });
    } catch (e) {
      res.json({ status: false });
    }
  },

  async getwinnerbyid(req, res) {
    try {
      const { findpairid, id } = req.body;
      const competionsid = await Competion.findById({
        _id: findpairid,
      }).then((data) => {
        if (data.winnerslist.length) {
          var getData = data.winnerslist.find((ele) => ele._id == id);
          res.json({ status: true, data: getData });
        }
      });
    } catch (e) {
      res.json({ status: false });
    }
  },

  async getcurrencypair(req, res) {
    try {
      const competionsid = await Competion.find({}).exec();
      res.json({ status: true, data: competionsid });
    } catch (e) {
      res.json({ status: false });
    }
  },
  async findonecurrencypair(req, res) {
    try {
      const competionsid = await Competion.find({ _id: req.body.id }).exec();
      res.json({ status: true, data: competionsid });
    } catch (e) {
      res.json({ status: false });
    }
  },
  async newcompetitionadd(req, res) {
    const pdata = req.body;
    var currencyfindid = await Currency.findOne({
      currencyName: pdata.prizetoken,
    }).exec();
    const pair = pdata.currency;
    const coin = pair.split("_")[0];
    try {
      var competition_new = new Competion({
        currency: pdata.currency,
        prizepool: pdata.prizepool,
        prizetoken: pdata.prizetoken,
        tokensymbol: coin,
        tokenstartdate: pdata.tokenstartdate,
        tokenenddate: pdata.tokenenddate,
        tokendescription: pdata.tokendescription,
        totalwinners: pdata.totalwinners,
        currencyId: currencyfindid.currencyId,
        competitionimage: pdata.competitionimage,
        tradingdashimage: pdata.tradingdashimage,
        winnerstatus: "Enable",
      });
      competition_new.save({}, function (conerr, conupdate) {
        if (!conerr) {
          res.json({ status: true, message: "Add Pair successfully" });
        } else {
          res.json({ status: false, message: conerr });
        }
      });
    } catch (e) {
      res.json({ status: false, message: e });
    }
  },

  async competionpairdelete(req, res) {
    try {
      var competionsid = await Competion.findOne({
        _id: req.body.competionId,
      }).exec();
      Competion.deleteOne({ _id: competionsid._id }).exec(function (
        uperr,
        resUpdate
      ) {
        if (!uperr) {
          res.json({ status: true, message: "successfully deleted" });
        } else {
          res.json({ status: false, message: "Error" });
        }
      });
    } catch (e) {
      res.json({ status: false });
    }
  },

  async updatecurrencypair(req, res) {
    var updatecompetion = req.body.competionId;
    var formvalues = req.body.formvalue;
    var pair = formvalues.currency;
    var currencyfindid = await Currency.findOne({
      currencyName: formvalues.prizetoken,
    }).exec();
    const coin = pair.split("_")[0];
    try {
      await Competion.findOneAndUpdate(
        { _id: updatecompetion },
        {
          $set: {
            currency: formvalues.currency,
            prizepool: formvalues.prizepool,
            prizetoken: formvalues.prizetoken,
            tokenstartdate: formvalues.tokenstartdate,
            tokenenddate: formvalues.tokenenddate,
            tokendescription: formvalues.tokendescription,
            totalwinners: formvalues.totalwinners,
            currencyId: currencyfindid.currencyId,
            tokensymbol: coin,
            competitionimage: formvalues.competitionimage,
            tradingdashimage: formvalues.tradingdashimage,
            winnerstatus: "Enable",
          },
        }
      ).exec(async function (uperr, results) {
        if (!uperr) {
          res.json({
            status: true,
            data: results,
            message: "Pair update Successfully",
          });
        } else {
          res.json({ status: false });
        }
      });
    } catch (e) {
      res.json({ status: false });
    }
  },

  async getcurrencycompetion(req, res) {
    try {
      await Competion.aggregate([
        {
          $lookup: {
            from: "Currency",
            localField: "prizetoken",
            foreignField: "currencyName",
            as: "matched_docs",
          },
        },
        {
          $unwind: "$matched_docs",
        },
        {
          $project: {
            _id: 0,
            currencyName: "$matched_docs.currencyName",
            image: "$matched_docs.image",
            currency: "$currency",
            prizepool: "$prizepool",
            prizetoken: "$prizetoken",
            totalwinners: "$totalwinners",
            tokenstartdate: "$tokenstartdate",
            tokenenddate: "$tokenenddate",
            tokensymbol: "$tokensymbol",
            competitionimage: "$competitionimage",
            tradingdashimage: "$tradingdashimage",
          },
        },
      ])
        .then((tradeData) => {
          res.json(tradeData);
        })
        .catch((err) => console.log(err));
    } catch (e) {
      res.json({ status: false, error: e });
    }
  },

  async getcurrencycompdash(req, res) {
    try {
      const getcomp = await Competion.find({
        tokensymbol: req.body.currencySymbol,
      }).exec();
      const getCurrency = await Currency.find({
        currencySymbol: req.body.currencySymbol,
      }).exec();
      res.json({ comp: getcomp, curren: getCurrency });
    } catch (e) {
      res.json({ status: false, error: e });
    }
  },

  async getcmstandc(req, res) {
    try {
      const getcms = await CMS.find({ identify: "trading-cms" }).exec();
      res.json(getcms);
    } catch (e) {
      res.json({ status: false, error: e });
    }
  },

  async gettotalvolume(req, res) {
    try {
      const totalvolume = await orderDB.aggregate([
        {
          $match: {
            status: {
              $nin: ["Active", "Cancelled", "Closed"],
            },
          },
        },
        {
          $lookup: {
            from: "Competion",
            localField: "pairName",
            foreignField: "currency",
            as: "matched_docs",
          },
        },
        {
          $unwind: "$matched_docs",
        },
        {
          $project: {
            _id: 0,
            amount: "$amount",
            usdPrice: "$usdPrice",
            userId: "$userId",
            pairName: "$pairName",
            tokensymbol: "$matched_docs.tokensymbol",
            dateTime: "$dateTime",
            tokenenddate: "$matched_docs.tokenenddate",
            tokenstartdate: "$matched_docs.tokenstartdate",
          },
        },
      ]);
      res.json(totalvolume);
    } catch (e) {
      res.json({ status: false });
    }
  },

  async gettotaltradesperpair(req, res) {
    try {
      var competionsid = await Competion.findOne({
        currency: req.body.currencypair,
      }).exec();
      const totalvolume = await orderDB.aggregate([
        {
          $match: {
            status: {
              $nin: ["Active", "Cancelled", "Closed"],
            },
            pairName: req.body.currencypair,
          },
        },
        {
          $lookup: {
            from: "Users",
            localField: "userId",
            foreignField: "_id",
            as: "matched_docs",
          },
        },
        {
          $unwind: "$matched_docs",
        },
        {
          $project: {
            _id: 0,
            totalvolumeuser: { $add: ["$amount", "$usdPrice"] },
            email: "$matched_docs.email",
            username: "$matched_docs.username",
            dateTime: "$dateTime",
          },
        },
      ]);
      res.json({ totalvol: totalvolume, compeid: competionsid });
    } catch (e) {
      res.json({ status: false });
    }
  },

  async getAllPair(req, res) {
    try {
      const currencyPair = await coinPair.find().exec();
      res.json({ Pairs: currencyPair });
    } catch (err) {
      res.json({ status: false });
    }
  },

  async getAllCurrency(req, res) {
    try {
      const currency = await Currency.find().exec();
      res.json({ currencyList: currency });
    } catch (err) {
      res.json({ status: false });
    }
  },

  async gettotalvolumeemail(req, res) {
    try {
      const totalvolume = await orderDB.aggregate([
        {
          $match: {
            status: {
              $nin: ["active", "cancelled", "closed"],
            },
            pairName: req.body.currencypair,
          },
        },
        {
          $lookup: {
            from: "Competion",
            localField: "pairName",
            foreignField: "currency",
            as: "matched_docs",
          },
        },
        {
          $unwind: "$matched_docs",
        },
        {
          $project: {
            _id: 0,
            totalvolumeuser: { $multiply: ["$amount", "$usdPrice"] },
            currencyId: "$matched_docs.currencyId",
            dateTime: "$dateTime",
            userId: "$userId",
            prizetoken: "$matched_docs.prizetoken",
            winnerslist: "$matched_docs.winnerslist",
            tokenstartdate: "$matched_docs.tokenstartdate",
            tokenenddate: "$matched_docs.tokenenddate",
          },
        },
      ]);
      const totaltradepush = [];
      for (var i = 0; i < totalvolume.length; i++) {
        var car = {};
        const istOffset = 5.5 * 60 * 60;
        const tokensuserstart =
          new Date(totalvolume[i].dateTime).getTime() / 1000;
        const mytokenstartDates =
          new Date(totalvolume[i].tokenstartdate).getTime() / 1000;
        const mytokenendDates =
          new Date(totalvolume[i].tokenenddate).getTime() / 1000;
        const mytokenstartDate = mytokenstartDates - istOffset;
        const mytokenendDate = mytokenendDates - istOffset;
        if (
          tokensuserstart >= mytokenstartDate &&
          tokensuserstart <= mytokenendDate
        ) {
          var getuseremail = await Users.findOne({
            _id: totalvolume[i].userId,
          });
          car["totalvolumeuser"] = totalvolume[i].totalvolumeuser;
          car["userid"] = totalvolume[i].userId;
          car["winnerslist"] = totalvolume[i].winnerslist;
          car["currencyId"] = totalvolume[i].currencyId;
          car["useremail"] = getuseremail.email;
          car["prizetoken"] = totalvolume[i].prizetoken;
          totaltradepush.push(car);
        }
      }
      const countObj = totaltradepush.reduce((acc, curr) => {
        if (acc[curr.useremail]) {
          acc[curr.useremail].totalvolumeuser += curr.totalvolumeuser;
          acc[curr.useremail].count++;
        } else {
          acc[curr.useremail] = {
            totalvolumeuser: curr.totalvolumeuser,
            count: 1,
          };
        }
        return acc;
      }, {});
      const countArr = Object.entries(countObj).map(
        ([useremail, { totalvolumeuser, count }]) => ({
          useremail,
          totalvolumeuser,
          count,
        })
      );
      const emailTotals = Object.values(
        totaltradepush.reduce((acc, cur) => {
          const { totalvolumeuser, userid, currencyId, useremail, prizetoken } =
            cur;
          if (acc.hasOwnProperty(userid)) {
            acc[userid].totalvolumeuser += totalvolumeuser;
          } else {
            acc[userid] = {
              userid,
              currencyId,
              totalvolumeuser: totalvolumeuser,
              useremail,
              prizetoken,
            };
          }
          return acc;
        }, {})
      );
      const arraysvol = emailTotals.sort(
        (a, b) => b.totalvolumeuser - a.totalvolumeuser
      );
      res.json({
        arraysvol: arraysvol,
        winnerlist: totaltradepush[0].winnerslist,
        countarrs: countArr,
      });
    } catch (e) {
      res.json({ status: false });
    }
  },

  async winnersendtoken(req, res) {
    const { winner, currencypairid } = req.body;
    var winneramountsend = req.body.winner;
    var competionsid = await Competion.findOne({
      _id: req.body.currencypairid,
    }).exec();
    const istOffset = 5.5 * 60 * 60;
    const mytokenendDates =
      new Date(competionsid.tokenenddate).getTime() / 1000;
    const mytokenendDate = mytokenendDates - istOffset;
    const currentUnixTime = Math.floor(Date.now() / 1000);
    if (currentUnixTime > mytokenendDate) {
      for (let i = 0; i < winneramountsend.length; i++) {
        const finduserid = await UserWallet.findOne({
          userId: mongoose.mongo.ObjectId(winneramountsend[i].userid),
          currencyId: mongoose.mongo.ObjectId(winneramountsend[0].currencyId),
        });
        if (finduserid == null) {
            var userWallet_new = new UserWallet({
              amount: winneramountsend[i].prizepool,
              userId: mongoose.mongo.ObjectId(winneramountsend[i].userid),
              currencyId: mongoose.mongo.ObjectId(winneramountsend[i].currencyId),
            })
          await userWallet_new.save()
            const userWallet = await common.getbalance(winneramountsend[i].userid, winneramountsend[i].currencyId);
            var TradingCompetitionBalanceUpdation_new = new TradingCompetitionBalanceUpdation({
              oldBalance: userWallet.amount,
              amount: winneramountsend[i].prizepool,
              userId: mongoose.mongo.ObjectId(winneramountsend[i].userid),
              currencyId: mongoose.mongo.ObjectId(winneramountsend[i].currencyId),
              type:"Trading-competition"
            })
            TradingCompetitionBalanceUpdation_new.save()
        } else {
            const userWallet = await common.getbalance(winneramountsend[i].userid, winneramountsend[i].currencyId);
            UserWallet.updateOne({
              userId: mongoose.mongo.ObjectId(winneramountsend[i].userid),
              currencyId: mongoose.mongo.ObjectId(winneramountsend[i].currencyId),
            },
            { $inc: { amount: winneramountsend[i].prizepool } },
            { multi: true }).exec();
            const newbalance = userWallet.amount + winneramountsend[i].prizepool;
            var TradingCompetitionBalanceUpdation_new = new TradingCompetitionBalanceUpdation({
              oldBalance: userWallet.amount,
              amount: newbalance,
              userId: mongoose.mongo.ObjectId(winneramountsend[i].userid),
              currencyId: mongoose.mongo.ObjectId(winneramountsend[i].currencyId),
              type:"Trading-competition"
            })
            TradingCompetitionBalanceUpdation_new.save()
        }
      }
      await Competion.findOneAndUpdate(
        { _id: req.body.currencypairid },
        { $set: { winnerstatus: "Disable" } }
      ).exec();
      res.json({ status: "true", message: "coin send success" });
    } else {
      res.json({ status: "false", message: "Date not end" });
    }
  },
  async getpairs(req, res) {
    try {
      var pairsid = await Pairs.find({ status: 1 }).exec();
      res.json(pairsid);
    } catch (e) {
      res.json({
        status: false,
        message: "Something went wrong! Please try again someother time",
      });
    }
  },
  async getcompetitiontransaction(req, res) {
    try {
      const datas = await TradingCompetitionBalanceUpdation.aggregate([
        {
          $lookup: {
            from: "Currency",
            localField: "currencyId",
            foreignField: "currencyId",
            as: "currencydet",
          },
        },
        {
          $project: {
            currencySymbol: {
              $arrayElemAt: ["$currencydet.currencySymbol", 0],
            },
            amount: "$amount",
            oldBalance: "$oldBalance",
            userId: "$userId",
            type: "$type",
            datetime: "$dateTime",
          },
        },
      ]);
      const competitionlists = [];
      for (var i = 0; i < datas.length; i++) {
        var competitionlist = {};
        var getuseremail = await Users.find({ _id: datas[i].userId });
        var obj = {
          currencysymbol: datas[i].currencySymbol,
          amount: datas[i].amount,
          oldbalance: datas[i].oldBalance,
          type: datas[i].type,
          email:
            getuseremail && getuseremail.length > 0 && getuseremail[0].email,
          datetime: datas[i].datetime,
        };
        competitionlists.push(obj);
      }
      res.json({ status: true, complist: competitionlists });
    } catch (e) {
      res.json({ status: false, message: "something went wrong" });
    }
  },

  async gettotaluservolumeemail(req, res) {
    try {
      const tradedata = await Competion.find({}).exec();
      var tradespushalldata = [];
      for (var i = 0; i < tradedata.length; i++) {
        const totalvolumeemails = await orderDB.aggregate([
          {
            $match: {
              status: {
                $nin: ["active", "cancelled", "closed"],
              },
              pairName: tradedata[i].currency,
            },
          },
          {
            $lookup: {
              from: "Competion",
              localField: "pairName",
              foreignField: "currency",
              as: "matched_docs",
            },
          },
          {
            $unwind: "$matched_docs",
          },
          {
            $project: {
              _id: 0,
              totalvolumeuser: { $multiply: ["$amount", "$usdPrice"] },
              currencyId: "$matched_docs.currencyId",
              dateTime: "$dateTime",
              userId: "$userId",
              currencypair: "$matched_docs.currency",
              prizetoken: "$matched_docs.prizetoken",
              winnerslist: "$matched_docs.winnerslist",
              tokenstartdate: "$matched_docs.tokenstartdate",
              tokenenddate: "$matched_docs.tokenenddate",
            },
          },
        ]);
        const totaltradepush = [];
        for (var j = 0; j < totalvolumeemails.length; j++) {
          var car = {};
          const istOffset = 5.5 * 60 * 60;
          const tokensuserstart =
            new Date(totalvolumeemails[j].dateTime).getTime() / 1000;
          const mytokenstartDates =
            new Date(totalvolumeemails[j].tokenstartdate).getTime() / 1000;
          const mytokenendDates =
            new Date(totalvolumeemails[j].tokenenddate).getTime() / 1000;
          const mytokenstartDate = mytokenstartDates - istOffset;
          const mytokenendDate = mytokenendDates - istOffset;
          if (
            tokensuserstart >= mytokenstartDate &&
            tokensuserstart <= mytokenendDate
          ) {
            var getuseremail = await Users.findOne({
              _id: totalvolumeemails[j].userId,
            });
            car["totalvolumeuser"] = totalvolumeemails[j].totalvolumeuser;
            car["userid"] = totalvolumeemails[j].userId;
            car["winnerslist"] = totalvolumeemails[j].winnerslist;
            car["currencyId"] = totalvolumeemails[j].currencyId;
            car["currencypair"] = totalvolumeemails[j].currencypair;
            car["useremail"] = getuseremail.email;
            car["prizetoken"] = totalvolumeemails[j].prizetoken;
            totaltradepush.push(car);
          }
        }
        const countObj = totaltradepush.reduce((acc, curr) => {
          if (acc[curr.useremail]) {
            acc[curr.useremail].totalvolumeuser += curr.totalvolumeuser;
            acc[curr.useremail].count++;
          } else {
            acc[curr.useremail] = {
              totalvolumeuser: curr.totalvolumeuser,
              count: 1,
              currencypair: curr.currencypair,
            };
          }
          return acc;
        }, {});
        const countArr = Object.entries(countObj).map(
          ([useremail, { totalvolumeuser, count, currencypair }]) => ({
            useremail,
            totalvolumeuser,
            count,
            currencypair,
          })
        );
        const emailTotals = Object.values(
          totaltradepush.reduce((acc, cur) => {
            const {
              totalvolumeuser,
              userid,
              currencyId,
              useremail,
              prizetoken,
              currencypair,
            } = cur;
            if (acc.hasOwnProperty(userid)) {
              acc[userid].totalvolumeuser += totalvolumeuser;
            } else {
              acc[userid] = {
                userid,
                currencyId,
                totalvolumeuser: totalvolumeuser,
                useremail,
                prizetoken,
                currencypair,
              };
            }
            return acc;
          }, {})
        );
        const arraysvol = emailTotals.sort(
          (a, b) => b.totalvolumeuser - a.totalvolumeuser
        );
        tradespushalldata.push({ arrays: arraysvol, counts: countArr });
      }
      res.json({
        tradesdata: tradespushalldata,
        upcomingtradedatas: tradedata,
      });
    } catch (e) {
      res.json({ status: false });
    }
  },
};
module.exports = tradecompetionController;
