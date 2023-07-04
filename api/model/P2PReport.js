var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var p2preportSchema = new Schema({
    userId    : { type: mongoose.Schema.Types.ObjectId, ref: 'Users'},
    pairName  : {type:String, 'index':true},
    orderNo : {type: String, default: 0},
    advertiserNo : {type: mongoose.Schema.Types.ObjectId},
    reason : {type:String, 'index':true},
    description : {type:String, 'index':true},
    email   : {type:String, 'index':true},
    attachment   : {type:String, 'index':true},
    type    : {type:String, 'index':true},
    status : {type: Number, default: 0},
    createdDate   : {type:Date, default: Date.now}
});
module.exports = mongoose.model('P2PReport', p2preportSchema, 'P2PReport')
