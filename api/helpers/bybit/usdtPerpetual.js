exports.initialMargin = (price, amount, leverage) => {
    try {
        price = parseFloat(price)
        amount = parseFloat(amount)
        leverage = parseFloat(leverage)
        return (price * amount) / leverage
    } catch (err) {
        return 0
    }
}

exports.feeToOpen = (price, amount, takerFee) => {
    try {
        price = parseFloat(price)
        amount = parseFloat(amount)
        takerFee = parseFloat(takerFee)
        return amount * price * (takerFee / 100)
    } catch (err) {
        return 0
    }
}

exports.feeToClose = (price, amount, takerFee, leverage, type) => {
    try {
        price = parseFloat(price)
        amount = parseFloat(amount)
        takerFee = parseFloat(takerFee)

        return amount * bankruptyPrice(price, amount, leverage, type) * (takerFee / 100)
    } catch (err) {
        return 0
    }
}

exports.bankruptyPrice = (price, amount, leverage, type) => {
    try {
        price = parseFloat(price)
        amount = parseFloat(amount)
        if (type == 'buy') {
            return price * (leverage - 1) / leverage
        } else if (type == 'sell') {
            return price * (leverage + 1) / leverage
        }
        return 0
    } catch (err) {
        return 0
    }
}

exports.orderCost = (price, amount, leverage, takerFee, type) => {
    try {
        price = parseFloat(price)
        amount = parseFloat(amount)
        leverage = parseFloat(leverage)
        takerFee = parseFloat(takerFee)

        return (
            this.initialMargin(price, amount, leverage)
            +
            this.feeToOpen(price, amount, takerFee)
            +
            this.feeToClose(price, amount, takerFee, leverage, type)
        )
    } catch (err) {
        return 0
    }
}

exports.pnl = (entryPrice, exitPrice, amount, type) => {
    try {
        entryPrice = parseFloat(entryPrice);
        exitPrice = parseFloat(exitPrice);
        amount = parseFloat(amount);
        if (entryPrice > 0 && exitPrice > 0 && amount > 0) {
            if (type == "buy") {
                return amount * (exitPrice - entryPrice);
            } else if (type == "sell") {
                return amount * (entryPrice - exitPrice);
            }
        }
        return 0;
    } catch (err) {
        return 0;
    }
}

exports.averagePrice = (contracts) => {
    try {
        if (contracts && Array.isArray(contracts)) {
            let totalAmt = 0, totalContract = 0;
            for (let item of contracts) {
                if (item.amount > 0 && item.price > 0) {
                    totalContract = totalContract + (item.amount * item.price);
                    totalAmt = totalAmt + item.amount;
                }
            }

            if (totalAmt > 0 && totalContract > 0) {
                return totalContract / totalAmt;
            }

            return 0;
        }
        return 0;
    } catch (err) {
        return 0;
    }
};

/** 
 * MMR - Maintenance Margin Rate
*/
exports.liquidityPrice = (price, leverage, MMR, type) => {
    let liqPrice = 0;
    price = parseFloat(price)
    leverage = parseFloat(leverage)
    MMR = parseFloat(MMR)

    if (type == 'buy') {
        liqPrice = price * (1 - (1 / leverage) + (MMR / 100))
    } else if (type == 'sell') {
        liqPrice = price * (1 + (1 / leverage) - (MMR / 100))
    }
    return liqPrice;
}

