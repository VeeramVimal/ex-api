const express = require("express");
const borrowMarketController = require("../controllers/borrow-market.controller");
const commonHelper = require("../helpers/common");
const router = express.Router();

router.route("/collateral_coins").get(commonHelper.tokenMiddlewareCustomers,borrowMarketController.getCollateralCoin);
router.route("/coin_spot").post(borrowMarketController.getBorrowingDetails);
router.route("/create").post(commonHelper.tokenMiddlewareCustomers, borrowMarketController.createBorrowCoin);
router.route("/").get(borrowMarketController.getAllBorrowMarket);
router.route("/:borrowId").get(borrowMarketController.getSingleBorrowMarket);
router.route("/pairs").post(borrowMarketController.getPairsSingledetail);
// router.route("/crypto_loan").post(borrowMarketController.createCryptoLoan);
// router.route("/crypto_loan/USDT").post(borrowMarketController.createCryptoLoanUsdt);
router.route("/crypto_loan").post(commonHelper.tokenMiddlewareCustomers, borrowMarketController.createCryptoLoan);
router.route("/crypto_loan/USDT").post(commonHelper.tokenMiddlewareCustomers, borrowMarketController.createCryptoLoanUsdt);

module.exports = router;
