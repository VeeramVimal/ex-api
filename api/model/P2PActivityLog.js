var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var P2PActivityLogSchema = new Schema({
	"userId" : {type: String, index: true, default: ''},
	"ownerId" : {type: String, index: true, default: ''},
	"orderNo" : { type: String, default: 0 },
	"orderId" : { type: String, index: true, default: '' },
	"type": { type: String, default: '' },
	"comment": { type: String, default: '' },
	"dateTime": { type: Date, default: Date.now }
});
module.exports = mongoose.model('P2PActivityLog', P2PActivityLogSchema, 'P2PActivityLog')