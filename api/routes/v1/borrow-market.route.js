const express = require("express");
const borrowMarketController = require("../../controllers/v1/borrow-market.controller");
const commonHelper = require("../../helpers/common");
const router = express.Router();

router.route("/collateral_coins").get(borrowMarketController.getCollateralCoin);
router.route("/coin_spot").post(borrowMarketController.getBorrowingDetails);
router.route("/create").post(commonHelper.tokenMiddlewareAdmin, borrowMarketController.createBorrowCoin);
router.route("/").get(borrowMarketController.getAllBorrowMarket);
router.route("/:borrowId").get(borrowMarketController.getSingleBorrowMarket);
router.route("/pairs").post(borrowMarketController.getPairsSingledetail);
// router.route("/crypto_loan").post(borrowMarketController.createCryptoLoan);
// router.route("/crypto_loan/USDT").post(borrowMarketController.createCryptoLoanUsdt);
router.route("/crypto_loan").post(commonHelper.tokenMiddlewareAdmin, borrowMarketController.createCryptoLoan);
router.route("/crypto_loan/USDT").post(commonHelper.tokenMiddlewareAdmin, borrowMarketController.createCryptoLoanUsdt);

module.exports = router;
