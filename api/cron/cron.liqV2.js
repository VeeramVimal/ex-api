const mongoose = require('mongoose');
const query_helper = require('../helpers/query');
const trade = require('../helpers/trade');
const p2pHelper = require('../helpers/p2p');
let common = require('../helpers/common');
const cron = require("node-cron");

let coinDCX = require('../socketFiles/coinDCX');
let bybit = require('../socketFiles/bybit');
// let huobi = require('../socketFiles/huobi');

let config = require("../Config/config");

const customerWalletController = require('../controllers/v1/customerWalletController');

let pairsDB = mongoose.model('Pairs');
const DerivativesPairDB = mongoose.model("DerivativesPairs");

let tradeChartDB = mongoose.model('TradeChart');
let Currency = mongoose.model('Currency');
let getJSON = require('get-json');
let percentageChange = 149;
require('events').defaultMaxListeners = 0;
// var WebSocket = require('ws');
let io = require('socket.io-client');

// const OrderBook = require('../model/OrderBook');
let OrderBookDB = mongoose.model('OrderBook');

// let socketLink = "coindcx";
let socketLink = "bybit";
// let socketLink = "huobi";

let usdtValues = {},
	availablePairs = [],
	availablePairsObj = {},
	unAvailablePairs = [],
	updateExceptPairs_cronInit = 0,
	availablePairsDetails = {},
	socketChannel = [];

async function changeUsdt() {
	await common.setUsdtRateChange();
}

async function liquidityChecking() {
	const getPairOBData = await pairsDB.aggregate([
		{
			$match: {
				autoOrderExecute: 1
			}
		},
		{
			$lookup: {
				from: 'OrderBook',
				let: {
					pairOB: '$pair',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										"$eq":["$pair", "$$pairOB"]
									}
								]
							}
						}
					},
					{
						$project: {
							pair: "$pair",
							liquidityDataTime: "$liquidityDataTime"
						}
					}
				],
				as: 'OrderBookData'
			}
		},
		{
			$project: {
				_id: "$_id",
				pair: "$pair",
				tradeEnable: "$tradeEnable",
				OrderBookData: "$OrderBookData"
			}
		}
	]);
	for (let a = 0; a < getPairOBData.length; a++) {
		const element = getPairOBData[a];

		if(element) {
			let newStatus = 0;
			const tradeEnable = element.tradeEnable;
			if(element.OrderBookData && element.OrderBookData[0]) {
				if(tradeEnable != 0) {
					let seconds = 120;
					if(element.OrderBookData[0].liquidityDataTime) {
						const liquidityDataTime = element.OrderBookData[0].liquidityDataTime
						const endDate = new Date();
						seconds = (endDate.getTime() - liquidityDataTime.getTime()) / 1000;
					}

					if(seconds >= 60) {
						newStatus = 2
					}
					else {
						newStatus = 1
					}
				}
			}
			else {
				newStatus = 2;
			}

			if(socketLink == "coindcx" || socketLink == "bybit") {
				if(tradeEnable != newStatus) {
					await query_helper.updateData(pairsDB, "one", {
						_id: mongoose.Types.ObjectId(element._id)
					}, {
						tradeEnable: newStatus
					});
				}
			}
		}
		
	}
}

exports.unAvailablePairsUpdate = async (updatedData = {}, options = {}) => {

	const {
		from = "spot",
		action = "add"
	} = options;

	let OrderBookDBSel;
	let PairDBSel;
	
	if(from == "spot") {
		OrderBookDBSel = OrderBookDB;
		PairDBSel = pairsDB;
	}

	console.log("unAvailablePairsUpdate : ", {updatedData, options});

	if(updatedData.pair) {
		// autoOrderExecute detail correction
		if(updatedData.autoOrderExecute == 1) {
			if(availablePairs.indexOf(updatedData.pair) == -1 ) {
				updatedData.autoOrderExecute = 0;
				await query_helper.updateData(PairDBSel, "one", {
                    _id: mongoose.Types.ObjectId(updatedData._id)
                }, {
					autoOrderExecute: 0
				});
			}
		}

		// Order book table record checking	
		if(updatedData.autoOrderExecute == 0) {
			const findData = { pair: updatedData.pair };
			let getOrderBook = await query_helper.findoneData(OrderBookDBSel, findData, {});
			if(getOrderBook.status === false) {
				let insertData = {
					pair: updatedData.pair,
					bids: [],
					asks: [],
					userbids: [],
					userasks: [],
				};
				await query_helper.insertData(OrderBookDBSel, insertData);
			}
			else {
				let update = { bids: [], asks: [] };
				await query_helper.updateData(OrderBookDB, 'one', { pair: updatedData.pair, }, update);
			}
		}

		// socket checking & avai, un-avail update
		const getPairData = await PairDBSel.aggregate([
			{
				$match: {
					_id: mongoose.Types.ObjectId(updatedData._id)
				}
			},
			{
				$lookup:
				{
					from: 'Currency',
					localField: 'fromCurrency',
					foreignField: '_id',
					as: 'frompair'
				}
			},
			{
				$lookup:
				{
					from: 'Currency',
					localField: 'toCurrency',
					foreignField: '_id',
					as: 'topair'
				}
			},
			{
				$project: {
					"from_symbol_id": "$fromCurrency",
					"to_symbol_id": "$toCurrency",
					"pair": "$pair",
					"decimalValue": "$decimalValue",
					"enableBuySell": "$enableBuySell",
					"change": "$change",
					"volume": "$volume",
					"frompair": "$frompair",
					"topair": "$topair",
					"fromcurrency": "$frompair",
					"tocurrency": "$topair",
					"_id":"$_id",
					"price":"$price",
					"lastPrice":"$lastPrice",
					"marketStatus":"$marketStatus",
					"autoOrderExecute": "$autoOrderExecute",
					"getOldPrice": "$getOldPrice",
					"status":"$status",
					"enableTradeHistory":"$enableTradeHistory",
					"marketPrice":"$marketPrice",
					"changePercentage":"$changePercentage",
					"orderDataMin":"$orderDataMin",
					"orderDataMax":"$orderDataMax",
					"minTrade":"$minTrade",
					"fromusd":{ $arrayElemAt: ["$frompair.USDvalue", 0] },
					"tousd":{ $arrayElemAt: ["$topair.USDvalue", 0] },
					"fromDecimal":{ $arrayElemAt: ["$frompair.siteDecimal", 0] },
					"toDecimal": "$decimalValue",
					"maxLiquidityQuantity": "$maxLiquidityQuantity",
					"quantityLiquidityCorrection": "$quantityLiquidityCorrection",
					"tfhrVolLiquidityCorrection": "$tfhrVolLiquidityCorrection"
				}
			}
		]);
		if(getPairData) {
			if(getPairData.length > 0) {
				getPairData.forEach(element => {
					element.frompair = element.frompair[0];
					element.topair = element.topair[0];

					if(availablePairs.indexOf(element.pair) >= 0) {
						let symbol = element.pair.split('_').join('').toLowerCase();
						availablePairsObj[symbol] = element;
						const ecode = (availablePairsDetails[element.pair] && availablePairsDetails[element.pair].ecode) ? availablePairsDetails[element.pair].ecode : "B";
						let channelName = "";
						if(ecode) {
							channelName = ecode+"-";
						}
						channelName = channelName+element.pair.split('_')[0]+'_'+element.pair.split('_')[1];

						if(element.autoOrderExecute == 1 && element.status == 1) {
							console.log("join : ", {channelName, socketLink});
							if(socketLink == "coindcx") {
								coinDCX.socChannelUpd({channelName, target: "join"});
							}
							else if(socketLink == "bybit") {
								bybit.socChannelUpd({channelName, target: "join"});
							}
						}
						else {
							console.log("leave : ", {channelName, socketLink});
							if(socketLink == "coindcx") {
								coinDCX.socChannelUpd({channelName, target: "leave"});
							}
							else if(socketLink == "bybit") {
								bybit.socChannelUpd({channelName, target: "leave"});
							}
						}
					} else {
						if(updatedData && updatedData._id && unAvailablePairs && unAvailablePairs.length > 0) {
							const idx_unavail = unAvailablePairs.findIndex(e => e._id && e._id.toString() === updatedData._id.toString())
							if(idx_unavail > -1) {
								unAvailablePairs[idx_unavail].autoOrderExecute = updatedData.autoOrderExecute;
							}
							else {
								unAvailablePairs.push(element);
							}
						}
						else {
							unAvailablePairs.push(element);
						}
					}
				});
			}
		}
	}
}

async function tickerUpdate() {
	try {
		// console.log("tickerUpdate : ");
		const resData = await getJSON("https://api.coindcx.com/exchange/ticker");
		if(resData) {
			let priceChange = common.getUsdtRateChange();
			for (var key in resData) {
				let element = resData[key];
				if(Object.keys(availablePairsObj).length > 0) {
					let pair = availablePairsObj[element.market.toLowerCase()];
					if(pair && Object.keys(pair).length > 0) {
						if(typeof pair == 'object') {
							if(pair.topair.currencySymbol == 'usdt') {
								usdtValues[pair.frompair.currencySymbol.toLowerCase()] = element.last_price;
							}
							let open = element.last_price - ((element.last_price * element.change_24_hour)/100);
							if(priceChange.changeValue > 0) {
								open = priceChange.changePer * +(open);
								element.high = priceChange.changePer * +(element.high);
								element.low = priceChange.changePer * +(element.low);
								element.last_price = priceChange.changePer * +(element.last_price);
							}
							const openPrice = +open;
							const newChange = (((+element.last_price - openPrice) / openPrice) * 100)
							const changeValue = (!isNaN(+element.last_price - openPrice) ? +element.last_price - openPrice : 0)
							// availablePairsObj[element.market.toLowerCase()].change = newChange;
							// if(+element.q > 0) {
							// 	availablePairsObj[element.s].volume = +(+((+element.q * 115)/100).toFixed(pair.fromDecimal));
							// }

							let maxLiquidityQuantity = pair.maxLiquidityQuantity > 0 ? pair.maxLiquidityQuantity : 0;
							// let quantityLiquidityCorrection = pair.quantityLiquidityCorrection > 0 ? pair.quantityLiquidityCorrection : 0;
							let tfhrVolLiquidityCorrection = pair.tfhrVolLiquidityCorrection > 0 ? pair.tfhrVolLiquidityCorrection : 0;

							if(maxLiquidityQuantity > 0 && tfhrVolLiquidityCorrection > 0) {
								if(element.volume > maxLiquidityQuantity) {
									element.volume = element.volume * (tfhrVolLiquidityCorrection/100);
								}
							}
							const volume_fromCur = element.volume / element.last_price;

							availablePairsObj[element.market.toLowerCase()].change = newChange;
							availablePairsObj[element.market.toLowerCase()].changeValue = changeValue;
							availablePairsObj[element.market.toLowerCase()].price = element.last_price;
							availablePairsObj[element.market.toLowerCase()].lastPrice = pair.price;
							availablePairsObj[element.market.toLowerCase()].high = pair.high;
							availablePairsObj[element.market.toLowerCase()].low = pair.low;
							availablePairsObj[element.market.toLowerCase()].volume = element.volume;
							availablePairsObj[element.market.toLowerCase()].volume_fromCur = volume_fromCur;

							pair = availablePairsObj[element.market.toLowerCase()];

							await query_helper.updateData(pairsDB, 'many', { pair: pair.pair }, {change: newChange, changeValue: changeValue, price: element.last_price, lastPrice: pair.price, high: element.high, low: element.low, volume: element.volume, volume_fromCur})
							// await query_helper.updateData(pairsDB, 'many', { pair: pair.pair }, {change: 0, changeValue: 0, price: 0, lastPrice: 0, high: 0, low: 0})
						}
					}
				}
			}
			common.setUsdtValues(usdtValues);
		}
	} catch(e) {
		console.log('tickerUpdate', e);
	}
}

async function getChannelName() {
	let allowNext = false;
	let responseObj = {};
	usdtValues['usdt'] = 1;

	if(socketLink == "coindcx") {
		const response1 = await getJSON("https://api.coindcx.com/exchange/ticker");
		const response2 = await getJSON("https://api.coindcx.com/exchange/v1/markets_details");
		if(response1.length > 0 && response2.length > 0) {
			response2.map(function(response2data){
				responseObj[response2data.coindcx_name] = {
					from: response2data.target_currency_short_name,
					to: response2data.base_currency_short_name,
					ecode: response2data.ecode
				}
			});
			response1.map(function(response1data){
				if(typeof responseObj[response1data.market] == 'object') {
					const fromTo = responseObj[response1data.market].from+'_'+responseObj[response1data.market].to;
					availablePairs.push(fromTo);
					availablePairsDetails[fromTo] = responseObj[response1data.market];
					if(responseObj[response1data.market].to == 'USDT') {
						usdtValues[responseObj[response1data.market].from.toLowerCase()] = response1data.last_price;
					}
					if(responseObj[response1data.market].to == 'INR' && responseObj[response1data.market].from == 'USDT') {
						usdtValues[responseObj[response1data.market].to.toLowerCase()] = 1/response1data.last_price;
					}
				}
			});
			common.setUsdtValues(usdtValues);
			allowNext = true;
		}
	}
	else if(socketLink == "bybit") {
		const response1 = await getJSON("https://api.bybit.com/spot/v3/public/quote/ticker/price");
		const response2 = await getJSON("https://api.bybit.com/spot/v1/symbols");
		if(
			(response2 && response2.result && response2.result.length)
			&&
			(response1 && response1.result && response1.result.list && response1.result.list.length > 0)
		) {
			response2.result.map(function(response2data){
				responseObj[response2data.name] = {
					from: response2data.baseCurrency,
					to: response2data.quoteCurrency,
					ecode: ""
				}
			});
			response1.result.list.map(function(response1data){
				if(typeof responseObj[response1data.symbol] == 'object') {
					const fromTo = responseObj[response1data.symbol].from+'_'+responseObj[response1data.symbol].to;
					availablePairs.push(fromTo);
					availablePairsDetails[fromTo] = responseObj[response1data.symbol];
					if(responseObj[response1data.symbol].to == 'USDT') {
						usdtValues[responseObj[response1data.symbol].from.toLowerCase()] = response1data.last_price;
					}
					if(responseObj[response1data.symbol].to == 'INR' && responseObj[response1data.symbol].from == 'USDT') {
						usdtValues[responseObj[response1data.symbol].to.toLowerCase()] = 1/response1data.last_price;
					}
				}
			});
			common.setUsdtValues(usdtValues);
			allowNext = true;
		}
	}

	if(allowNext === true) {
		pairsDB.aggregate([
			{
				$match: {
					status: 1
				}
			},
			{
				$lookup:
				{
					from: 'Currency',
					localField: 'fromCurrency',
					foreignField: '_id',
					as: 'frompair'
				}
			},
			{
				$lookup:
				{
					from: 'Currency',
					localField: 'toCurrency',
					foreignField: '_id',
					as: 'topair'
				}
			},
			{
				$project: {
					"from_symbol_id": "$fromCurrency",
					"to_symbol_id": "$toCurrency",
					"pair": "$pair",
					"decimalValue": "$decimalValue",
					"enableBuySell": "$enableBuySell",
					"change": "$change",
					"volume": "$volume",
					"frompair": "$frompair",
					"topair": "$topair",
					"fromcurrency": "$frompair",
					"tocurrency": "$topair",
					"_id":"$_id",
					"price":"$price",
					"lastPrice":"$lastPrice",
					"marketStatus":"$marketStatus",
					"autoOrderExecute": "$autoOrderExecute",
					"getOldPrice": "$getOldPrice",
					"status":"$status",
					"enableTradeHistory":"$enableTradeHistory",
					"marketPrice":"$marketPrice",
					"changePercentage":"$changePercentage",
					"orderDataMin":"$orderDataMin",
					"orderDataMax":"$orderDataMax",
					"minTrade":"$minTrade",
					"fromusd":{ $arrayElemAt: ["$frompair.USDvalue", 0] },
					"tousd":{ $arrayElemAt: ["$topair.USDvalue", 0] },
					"fromDecimal":{ $arrayElemAt: ["$frompair.siteDecimal", 0] },
					"toDecimal": "$decimalValue",
					"maxLiquidityQuantity": "$maxLiquidityQuantity",
					"quantityLiquidityCorrection": "$quantityLiquidityCorrection",
					"tfhrVolLiquidityCorrection": "$tfhrVolLiquidityCorrection"
				}
			}
		],async (err,getPairData)=>{
			if(!err) {
				// console.log("availablePairs", availablePairs.length, availablePairs);
				availablePairsObj = {};
				unAvailablePairs = [];
				if(getPairData.length > 0) {
					getPairData.forEach(element => {
						element.frompair = element.frompair[0];
						element.topair = element.topair[0];
						// console.log("element.pair", element.pair);
						if(availablePairs.indexOf(element.pair) >=0) {
							// console.log("if");
							let symbol = element.pair.split('_').join('').toLowerCase();
							availablePairsObj[symbol] = element;
							let pairName = element.pair.split('_')[0]+'_'+element.pair.split('_')[1];
							const ecode = availablePairsDetails[element.pair] ? availablePairsDetails[element.pair].ecode : "";
							let channelName = ecode ? ecode +"-"+pairName : pairName;
							if(updateExceptPairs_cronInit === 0) {
								if(element.autoOrderExecute == 1) {
									let index = socketChannel.indexOf(channelName);
									if(index == -1) {
										socketChannel.push(channelName);
									}
								}
							}
						} else {
							// console.log("else");
							unAvailablePairs.push(element);
						}
					});
					connectWS();
					updateExceptPairs_cronInit = 1;
				}
			}
		});
	}
}

async function connectWS() {
	try {
		// console.log("connectWS", {socketLink});
		// console.log("connectWS", {socketChannel});
		if(socketLink == "coindcx") {
			coinDCX.connectWS({socketChannel, availablePairsObj});
		}
		else if(socketLink == "bybit") {
			bybit.connectWS({socketChannel, availablePairsObj});
		}
		else if(socketLink == "huobi") {
			// huobi.connectWS({socketChannel});
		}
		// bybit.connectWS_recentTrade(socketChannel);
	}
	catch(err) {
		console.log("connectWS : ", err);
	}
}

let cronPairs = [];
function insertNewData() {
	try {
		pairsDB.aggregate([
		{
			$match: {
				status: 1,
				enableTradeHistory: {$ne: 0}
			}
		},
		{
			$lookup:
			{
				from: 'Currency',
				localField: 'fromCurrency',
				foreignField: '_id',
				as: 'frompair'
			}
		},
		{
			$lookup:
			{
				from: 'Currency',
				localField: 'toCurrency',
				foreignField: '_id',
				as: 'topair'
			}
		},
		{
			$project: {
				"from_symbol_id": "$fromCurrency",
				"to_symbol_id": "$toCurrency",
				"pair": "$pair",
				"decimalValue": "$decimalValue",
				"enableBuySell": "$enableBuySell",
				"change": "$change",
				"frompair": "$frompair",
				"topair": "$topair",
				"fromcurrency": "$frompair",
				"tocurrency": "$topair",
				"_id":"$_id",
				"price":"$price",
				"lastPrice":"$lastPrice",
				"marketStatus":"$marketStatus",
				"autoOrderExecute": "$autoOrderExecute",
				"getOldPrice": "$getOldPrice",
				"status":"$status",
				"enableTradeHistory":"$enableTradeHistory",
				"marketPrice":"$marketPrice",
				"changePercentage":"$changePercentage",
				"orderDataMin":"$orderDataMin",
				"orderDataMax":"$orderDataMax",
				"fromusd":{ $arrayElemAt: ["$frompair.USDvalue", 0] },
				"tousd":{ $arrayElemAt: ["$topair.USDvalue", 0] }
			}
		}
		],async (err,result)=>{
			if(result.length > 0) {
				let symbols = {};
				let symbolValue = '';
				cronPairs = [];
				result.forEach(element => {
					symbols[element.fromcurrency[0].currencySymbol] = element.fromcurrency[0].apiid;
					symbolValue += symbolValue == '' ? element.fromcurrency[0].apiid : ','+element.fromcurrency[0].apiid;
					cronPairs.push({ pair: element.pair, price: element.price, lastPrice: element.lastPrice, decimalValue: element.decimalValue, _id: element._id, change: element.change, enableBuySell: element.enableBuySell, changePercentage: element.changePercentage, fromCurrency: {siteDecimal: element.fromcurrency[0].siteDecimal}});
				});
				const response1 = await getJSON("https://api.wazirx.com/api/v2/tickers");
				if(response1) {
					let wazirxPrice = {};
					let ownPairs = {};
					for (var key in response1) {
						ownPairs[key] = response1[key].last;
						if(response1[key].quote_unit == 'usdt' || key == 'usdtinr') {
							if(response1[key].last > 0) {
								if(key == 'usdtinr') {
									wazirxPrice.inr = (1 / response1[key].last).toFixed(8);
								} else {
									wazirxPrice[response1[key].base_unit] = response1[key].last;
								}
							}
						}
					}
					trade.updateOrderPrice(result, symbols, wazirxPrice, ownPairs, 0);
				}
			}
		});
	} catch(e) {
		console.log('insertNewData',e);
	}
}

function deleteOldData(){
  try {
		var d = new Date();
		d.setDate(d.getDate()-5);	   
		var project = { _id: 0, Date: "$Date", low: "$low", high: "$high", open: "$open", close: "$close", volume: "$volume", pairName: "$pairName", pair: "$pair", count: "$count" };
		tradeChartDB.aggregate([
			{
				"$match": {
					"time": {
						"$lt": d
					}
				 }
			},
			{
				"$group": {
					_id: {
						"year": {
                        "$year": "$time"
                      },
                      "month": {
                        "$month": "$time"
                      },
                      "day": {
                        "$dayOfMonth": "$time"
                      },
					  'pairName': '$pairName'
					},
					count: {
						"$sum": 1
					},
					pairName: { $first: "$pairName" },
					pair: { $first: "$pair" },
					Date: { $first: "$time" },
					low: { $min: '$price' },
					high: { $max: '$price' },
					open: { $first: '$price' },
					close: { $last: '$price' },
					volume: { $sum: '$price' }
				}
			},
			{
				$project: project,
			},
			{
				$sort: {
					"Date": -1,
				}
			}
		]).exec(function (err, result) {
			if(!err && result.length > 0){
				let inc = 0;
				for(let i=0;i<result.length;i++){
					if(result[i].count > 1){
						const d = new Date(result[i].Date);
						let yesterday = new Date(result[i].Date);
						let today = new Date(d.setDate(d.getDate() + 1));
						yesterday.setHours(0);
						yesterday.setMinutes(0);
						yesterday.setSeconds(0);
						yesterday.getMilliseconds(0);
						today.setHours(0);
						today.setMinutes(0);
						today.setSeconds(0);
						today.getMilliseconds(0);
						deleteAndUpdatePairData(result[i],yesterday,today)
					}
				}
			}
		});
	} catch (e) {
		console.log("deleteOldData",e);
	}
}

async function deleteOldWazirxData(){
  try {
		var d = new Date();
		d.setMinutes(d.getMinutes()-10);
		await query_helper.DeleteMany(tradeChartDB, {time: { $lt: d }, chartType: "Wazirx"});
	} catch (e) {
		console.log("deleteOldWazirxData",e);
	}
}

function deleteAndUpdatePairData(list,time,today){
	try {
		let pair = list.pairName;
		let pairid = list.pair;
		let ordertype = ['buy', 'sell'];
		let records = {
			price : list.open,
			open : list.open,
			high : list.high,
			low : list.low,
			close : list.close,
			volume : list.volume,
			total : list.volume * list.open,
			type : ordertype[Math.floor(Math.random() * ordertype.length)],
			pair : pairid,
			pairName : pair,
			time : time
		}
		tradeChartDB.deleteMany({time: { $gte: time,$lt: today },pairName: pair}).exec(function (err, delData) {
			tradeChartDB.create(records, function (Err, resData) {
			});
		});
	} catch(e) {
		console.log("deleteAndUpdatePairData",e);
	}
}

function fixedState(value,decimal){
	return (parseFloat(value)).toFixed(decimal);
}

async function updateCronPrice() {
	let reqUrl = "";
	try {
		reqUrl = "https://api.wazirx.com/sapi/v1/ticker/24hr?symbol=usdtinr";
		let usdtusdPrice = 1;
		const usdtTickers = await getJSON(reqUrl);
		if(usdtTickers) {
			let usdtPrice = usdtTickers.lastPrice;
			let inrPrice = 1 / usdtTickers.lastPrice;
			let pairDetail = [];
			const pairData = await query_helper.findData(pairsDB,{status:1},{},{_id:-1},0)

			if(pairData.status && pairData.msg && pairData.msg.length > 0) {
				pairDetail = pairData.msg;
			}

			let resData = await query_helper.findData(Currency,{status:1},{},{_id:-1},0)
			if(resData.status && resData.msg.length > 0) {
				resData = resData.msg;
				let cryptoIds = [];
				let cryptoNoIds = [];
				let fiatIds = [];
				let clists = {};
				let tetherId = 0;
				for (var i = 0; i < resData.length; i++) {
					if(resData[i].curnType == 'Crypto') {
						if(resData[i].apiid != '' && resData[i].apiid != "noapiid" && resData[i].apiid != "NA") {
							cryptoIds.push(resData[i].apiid);
							clists[resData[i].apiid] = i;
						} else {
							cryptoNoIds.push(resData[i].currencySymbol);
							clists[resData[i].currencySymbol] = i;
						}
					} else {
						clists[resData[i].currencySymbol] = i;
						fiatIds.push(resData[i].currencySymbol);
					}
					if(resData[i].currencySymbol == 'USDT') {
						tetherId = i;
					}
				}
				if(cryptoIds.length > 0) {
					try {
						reqUrl = "https://api.coingecko.com/api/v3/simple/price?ids="+cryptoIds.join(',')+"&vs_currencies=USD,BTC,ETH,INR";
						const response = await getJSON(reqUrl);
						if(response){
							for(let j = 0; j<cryptoIds.length; j++) {
								if(typeof response[cryptoIds[j]] != 'undefined' && typeof response[cryptoIds[j]] != undefined) {
									let values = response[cryptoIds[j]];
									if(cryptoIds[j] == "tether") {
										usdtusdPrice = values.usd;
									}
									let curValUpd = {
										USDvalue:fixedState(values.usd,8),
										INRvalue:fixedState(values.usd*usdtPrice,8),
										BTCvalue:fixedState(values.btc,8),
										ETHvalue:fixedState(values.eth,8)
									};
									query_helper.updateData(Currency,'many',{apiid: cryptoIds[j]}, curValUpd);
								}
							}
						}
					}
					catch(e) {
						console.log('updateCronPrice',e);
					}
					reqUrl = "https://api.coingecko.com/api/v3/simple/price?ids=tether,bitcoin,ethereum&vs_currencies="+fiatIds.join(',');
					// console.log("updateCronPrice 3 : ", {reqUrl});
					const response1 = await getJSON(reqUrl);
					try {
						if(response1){
							for(let j = 0; j<fiatIds.length; j++) {
								let upd = {};
								if(typeof response1['tether'][fiatIds[j].toLowerCase()] != 'undefined' && typeof response1['tether'][fiatIds[j].toLowerCase()] != undefined) {
									if(fiatIds[j].toLowerCase() != 'inr') {
										upd.USDvalue = fixedState(1/response1['tether'][fiatIds[j].toLowerCase()],8);
									} else {
										upd.USDvalue = inrPrice;
									}
								}
								if(typeof response1['bitcoin'][fiatIds[j].toLowerCase()] != 'undefined' && typeof response1['bitcoin'][fiatIds[j].toLowerCase()] != undefined) {
									upd.BTCvalue = fixedState(1/response1['bitcoin'][fiatIds[j].toLowerCase()],8);
								}
								if(typeof response1['ethereum'][fiatIds[j].toLowerCase()] != 'undefined' && typeof response1['ethereum'][fiatIds[j].toLowerCase()] != undefined) {
									upd.ETHvalue = fixedState(1/response1['ethereum'][fiatIds[j].toLowerCase()],8);
								}
								await query_helper.updateData(Currency,'many',{currencySymbol:fiatIds[j]},upd);
								if(typeof clists[fiatIds[j]] != 'undefined' && typeof clists[fiatIds[j]] != undefined && resData[clists[cryptoIds[j]]] != undefined) {
									if(typeof upd.USDvalue != 'undefined' && typeof upd.USDvalue != undefined){
										resData[clists[cryptoIds[j]]].USDvalue = upd.USDvalue;
									}
									if(typeof upd.BTCvalue != 'undefined' && typeof upd.BTCvalue != undefined){
										resData[clists[cryptoIds[j]]].BTCvalue = upd.BTCvalue;
									}
									if(typeof upd.ETHvalue != 'undefined' && typeof upd.ETHvalue != undefined){
										resData[clists[cryptoIds[j]]].ETHvalue = upd.ETHvalue;
									}
								}
							}
						}
					}
					catch(e) {
						console.log('updateCronPrice',e);
					}

					if(cryptoNoIds.length > 0 && tetherId && resData[tetherId]){
						let tetherValue = resData[tetherId];
						if(tetherValue) {
							for(let j = 0; j<cryptoNoIds.length; j++) {
								if(typeof clists[cryptoNoIds[j]] != 'undefined' && typeof clists[cryptoNoIds[j]] != undefined) { 
									let upd = {};
									
									let eqValue = 1/resData[clists[cryptoNoIds[j]]].USDvalue;
									const currencySymbol = resData[clists[cryptoNoIds[j]]].currencySymbol;
									const usdtPairIndex = pairDetail.findIndex(e => e.pair == currencySymbol+"_USDT");

									if(usdtPairIndex > 0) {
										eqValue = pairDetail[usdtPairIndex].price * usdtusdPrice;
										upd.USDvalue = eqValue;
									}
									else {
										const pairIndex = pairDetail.findIndex(e => e.pair == currencySymbol+"_INR");
										if(pairIndex > 0) {
											eqValue = (pairDetail[pairIndex].price * usdtusdPrice) /usdtPrice;
											upd.USDvalue = eqValue;
										}
									}

									if(eqValue) {
										upd.BTCvalue = tetherValue.BTCvalue*eqValue;
										upd.ETHvalue = tetherValue.ETHvalue*eqValue;
										upd.INRvalue = tetherValue.INRvalue*eqValue;
										query_helper.updateData(Currency,'many',{currencySymbol:cryptoNoIds[j]},upd)
									}
								}
							}
						}
					}
				}
			}
		}
	}
	catch (e) {
		console.log('updateCronPrice 1', e)
	}
}

if(config.env !== "local") {
	// cron start
	changeUsdt();
	connectWS();
	getChannelName();

	let cronprocessWithdrawalRunning = false;
	cron.schedule("*/5 * * * *", async(req,res)=>{
		if (cronprocessWithdrawalRunning) {
			return true;
		}
		cronprocessWithdrawalRunning = true;
		await customerWalletController.processWithdrawal();
		cronprocessWithdrawalRunning = false;
	});

	let cronliquidityCheckingRunning = false;
	cron.schedule("* * * * *", async(req,res)=>{
		if (cronliquidityCheckingRunning) {
			return true;
		}
		cronliquidityCheckingRunning = true;
		await tickerUpdate();
		await liquidityChecking();
		cronliquidityCheckingRunning = false;
	});

	let updateCronPriceRunning = false;
	cron.schedule("* * * * *", async(req,res)=>{
		if (updateCronPriceRunning) {
			return true;
		}
		updateCronPriceRunning = true;
		await updateCronPrice();
		updateCronPriceRunning = false;
	});

	let cronCancelOrderRunning = false;
	cron.schedule("*/5 * * * * *", async (req,res)=>{
		if (cronCancelOrderRunning) {
			return true;
		}
		cronCancelOrderRunning = true;
		await p2pHelper.cronCancelOrder();
		cronCancelOrderRunning = false;
	});

	cron.schedule("*/10 * * * * *", (req,res)=>{
		deleteOldWazirxData();
	});

	cron.schedule("0 0 */3 * * *", (req,res)=>{
		deleteOldData();
	});

    // cron.schedule("*/30 * * * * *",(req,res)=>{
    //     if(unAvailablePairs.length > 0 && updateExceptPairs_cronInit === 0) {
    //         unAvailablePairs.forEach(element => {
	// 			trade.updateExceptPairs(element, percentageChange);
    //         });
    //     }
    // });

	setTimeout(function(){
		// changeUsdt();
		// connectWS();
		updateCronPrice();
	}, 10000);

	// production
	// const BTCXRPCoinChkEnv = "development";
	// if(process.env.NODE_ENV == BTCXRPCoinChkEnv) {
	// 	const BTCCOIN = require('../helpers/CoinTransactions/BTC.js');
	// 	const XRPCOIN = require('../helpers/CoinTransactions/XRP.js');
	// 	setInterval(function(){
	// 		if(common.getSiteDeploy() == 0) {
	// 			BTCCOIN.CoinDeposit();
	// 			XRPCOIN.CoinDeposit();
	// 		}
	// 	}, 60000);
	// }

	// cron end
}