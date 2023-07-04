var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var CMSSchema = new Schema({
	"link"   : {type:String, default: ""},
	"identify"   : {type:String, default: ""},
	"title"   : {type:String, default: ""},
	"titlelink"   : {type:String, default: ""},
	"description"   : {type:String, default: ""},
	"image": { type: String, default: "" },
	"loaderIcon": { type: String, default: "" },
	"status": { type: Number, default: 1 },
    "dateTime": { type: Date, default: Date.now }
});
module.exports = mongoose.model('CMS', CMSSchema, 'CMS')