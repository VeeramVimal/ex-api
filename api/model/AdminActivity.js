var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var adminActivitySchema = new Schema({
	"userId"   : {type: mongoose.Schema.Types.ObjectId, index:true, ref: 'admin'},
	"ip"   : {type:String},
	"browser"   : {type:String},
	"type"   : {type:String},
	"comment"   : {type:String},
	"dateTime"   : {type: Date, default: Date.now},
});
module.exports = mongoose.model('AdminActivity', adminActivitySchema, 'AdminActivity')