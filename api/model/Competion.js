var mongoose = require('mongoose');
var Schema = mongoose.Schema;


const orderSchema = new Schema({
    rank: Number,
    prizepool: Number
});


var competionSchema = new Schema({
    "currency"   : {type:String,default: ""},
    "prizepool" : {type:Number},
    "prizetoken" : {type:String},
    "tokensymbol" : {type:String},
    "tokenstartdate":{type:String},
    "tokenenddate": {type:String},
    "tokendescription":{type:String},
    "totalwinners":{type:Number},
    "winnerslist":[orderSchema],
    "currencyId":{type:String},
    "competitionimage":{type:String},
    "tradingdashimage":{type:String},
    "winnerstatus" :{type:String},
    "dateTime"   : {type: Date, default: Date.now},
});

module.exports = mongoose.model('Competion', competionSchema, 'Competion');