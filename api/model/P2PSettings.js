var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var p2pSettingsSchema = new Schema({
	minPercentage:  {type:Number, default: 0},
	maxPercentage:  {type:Number, default: 0},
	selectionLimit:  {type:Number, default: 0},
	creationLimit:  {type:Number, default: 0},
	registeredDays:  {type:Number, default: 0},
    createdDate   : {type:Date, default: Date.now}
});
module.exports = mongoose.model('P2PSettings', p2pSettingsSchema, 'P2PSettings')