const express = require('express');
const router = express.Router();
const testController = require('../../controllers/v2/testController');
const bankController = require('../../controllers/v2/bankController');

// router.post('/getUserAccessToken', testController.getUserAccessToken);
// router.post('/getAdminAccessToken', testController.getAdminAccessToken);
// router.post('/feesCalculationChecking', testController.feesCalculationChecking);

// router.post('/import/currencysymbol', testController.importCurrencySymbol);
// router.post('/import/currency', testController.importCurrency);
// router.post('/import/user', testController.importUser);
// router.post('/import/balance', testController.importBalances);
// router.post('/import/balancesV2', testController.importBalancesV2);
// router.post('/import/balancesV3', testController.importBalancesV3);
// router.post('/import/VerifyUsersData', testController.VerifyUsersData);
// router.post('/import/iconUpdate', testController.iconUpdate);
// router.post('/levelUpdate', testController.levelUpdate);
// router.post('/kycDetUpdate', testController.kycDetUpdate);
// router.post('/newkycDetUpdate', testController.newkycDetUpdate);
// router.post('/getPasswordHash', testController.getPasswordHash);
// router.post('/passwordChk', testController.passwordChk);
// router.post('/commonDecrypt', testController.commonDecrypt);
// router.get('/execTest', testController.execTest);
// router.post('/balRemove', testController.balRemove);
// router.post('/afterBankDetailUpd', bankController.afterBankDetailUpd);

router.post('/testtt', testController.testtt);
router.post('/getUserBalanceByCurrencyId', testController.getUserBalanceByCurrencyId);
// router.get('/decChk', testController.decChk);

module.exports = router;