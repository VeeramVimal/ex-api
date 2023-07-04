var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var DocsSchema = new Schema({
	"name"   : {type:String, required: true, index: true},
	"document"   : {type:String,required: true},
	"link"   : {type:String,required: true, index: true},
	"image"   : {type:String,required: true},
	"flag"   : {type:String,required: true},
	"metaTitle"   : {type:String,required: true},
	"metaKeyword"   : {type:String,required: true},
	"metaDescription"   : {type:String,required: true},
    "dateTime": { type: Date, default: Date.now }
});
module.exports = mongoose.model('Docs', DocsSchema, 'Docs')