let environ;
if(process.env.NODE_ENV) {
	environ = process.env.NODE_ENV;
} else {
	environ = 'development';
}

module.exports = require("./"+environ+"_rpc.js");