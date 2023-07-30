const p2pHelper = require("../helpers/p2p");
const cron = require("node-cron");

let cronCancelOrderRunning = false;
cron.schedule("*/5 * * * * *", async (req, res) => {
  if (cronCancelOrderRunning) {
    return true;
  }
  cronCancelOrderRunning = true;
  await p2pHelper.cronCancelOrder();
  cronCancelOrderRunning = false;
});
