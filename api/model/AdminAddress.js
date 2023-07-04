var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var AdminAddressSchema = new Schema({
  "currency": {type: String, index:true},
	"encData" : {type: String, default: ''},
  "address": { type: String, default: "" }
});

module.exports = mongoose.model('AdminAddress', AdminAddressSchema, 'AdminAddress')