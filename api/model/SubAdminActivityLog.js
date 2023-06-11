var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var subAdminActivityLogSchema = new Schema({
	"Id": { type: mongoose.Schema.Types.ObjectId, index: true },
	"ip": { type: String , default: ''},
	"browser": { type: String, default: '' },
	"type": { type: String, default: '' },
	"adminuserid": { type: mongoose.Schema.Types.ObjectId, ref:'Admin' },
	"lastId"   : {type: String, index:true},
	"remark": { type: String, default: '' },
	"comment": { type: String, default: '' },
	"dateTime": { type: Date, default: Date.now }
});
module.exports = mongoose.model('SubAdminActivityLog', subAdminActivityLogSchema, 'SubAdminActivityLog')