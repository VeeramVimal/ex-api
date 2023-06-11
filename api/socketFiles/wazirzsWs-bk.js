// ws.on('message', function(data, flags) {
// 	if(typeof JSON.parse(data.toString()).stream == 'string') {
// 		let stream = JSON.parse(data.toString()).stream;
// 		let resData = JSON.parse(data.toString()).data;
// 		let priceChange = common.getUsdtRateChange();
// 		if(typeof resData == 'object') {
// 			if(stream.split('@')[1] == 'trades' || stream.split('@')[1] == 'depth') {
// 				let pair = availablePairsObj[stream.split('@')[0]];
// 				if(stream.split('@')[1] == 'trades') {
// 					pair.lastPrice = pair.price;
// 					if(pair.pair == 'USDT_INR') {
// 						common.setUsdtRate(+(resData.trades[0].p));
// 					}
// 					if(priceChange.changeValue > 0) {
// 						let changeVal = priceChange.changePer * resData.trades[0].p;
// 						resData.trades[0].p = +(changeVal);
// 					}
// 					pair.price = +((resData.trades[0].p));
// 					availablePairsObj[stream.split('@')[0]] = pair;
// 					resData.trades[0].q = (+resData.trades[0].q * percentageChange)/100;
// 					trade.updateWazirxTrades('trades', pair, resData.trades, percentageChange);
// 				} else {
// 					resData.a.forEach(async (pairElement, key) => {
// 						if(priceChange.changeValue > 0) {
// 							let changeVal = priceChange.changePer * resData.a[key][0];
// 							resData.a[key][0] = +(changeVal);
// 						}
// 					});
// 					resData.b.forEach(async (pairElement1, key1) => {
// 						if(priceChange.changeValue > 0) {
// 							let changeVal = priceChange.changePer * resData.b[key1][0];
// 							resData.b[key1][0] = +(changeVal);
// 						}
// 					});
// 					if(common.getSiteDeploy() == 0) {
// 						runningWazirxCronPairs[pair] = {
// 							ask: +resData.a[0][0],
// 							bid: +resData.b[0][0]
// 						}
// 					}
// 					trade.updateWazirxTrades('depth', pair, resData, percentageChange);
// 				}
// 			} else {
// 				if(stream == '!ticker@arr') {
// 					resData.forEach(async element => {
// 						if(element.U == 'usdt') {
// 							usdtValues[element.u] = element.c;
// 						}
// 						let pair = availablePairsObj[element.s];
// 						if(typeof pair == 'object') {
// 							if(priceChange.changeValue > 0) {
// 								element.o = priceChange.changePer * +(element.o);
// 								element.h = priceChange.changePer * +(element.h);
// 								element.l = priceChange.changePer * +(element.l);
// 								element.c = priceChange.changePer * +(element.c);
// 							}
// 							const openPrice = +element.o;
// 							const newChange = (((+element.c - openPrice) / openPrice) * 100)
// 							const changeValue = (!isNaN(+element.c - openPrice) ? +element.c - openPrice : 0)
// 							availablePairsObj[element.s].change = newChange;
// 							if(+element.q > 0) {
// 								availablePairsObj[element.s].volume = +(+((+element.q * 115)/100).toFixed(pair.fromDecimal));
// 							}
// 							const orderwith = orderedPairs.indexOf(pair.pair);
// 							if (orderwith == -1) {
// 								orderedPairs.push(pair.pair);
// 								setTimeout(_intervalFunc, 15000, pair.pair);
// 								await query_helper.updateData(pairsDB, 'many', { pair: pair.pair }, {change: newChange, changeValue: changeValue, price: element.c, lastPrice: pair.price, high: element.h, low: element.l})
// 							}
// 						}
// 					});
// 					common.setUsdtValues(usdtValues);
// 				}
// 			}
// 		}
// 	}
// });
// ws.onclose = function(e) {  
// 	console.log('wazirx socket closed try again'); 
// 	setTimeout(function() {
// 		connectWS();
// 	}, 1000);	  
// }
// ws.onerror = function(err) {
// 	console.error('wazirx socket errored', err)
// 	ws.close();
// };