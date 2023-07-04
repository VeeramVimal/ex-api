let config = require("../Config/config");

const liqSocketCronVer = config.liqSocketCronVer ? config.liqSocketCronVer : "V1";
module.exports = require("./cron.liq"+liqSocketCronVer+".js");