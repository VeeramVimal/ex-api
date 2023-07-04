var Config = require('../Config/config');
const USDTPerpetualV1_socket = require("./socket.USDTPerpetualV1")
require("./cron.USDTPerpetualV1");

exports.initialCall = async function () {
  if(Config.sectionStatus.derivativeCron !== "Disable") {
    USDTPerpetualV1_socket.initialCall();
  }
}

exports.SocketInit = async function (socketIO) {
  console.log("USDM : SocketInit");
  if(Config.sectionStatus.derivativeCron !== "Disable") {
    USDTPerpetualV1_socket.SocketInit(socketIO);
  }
}