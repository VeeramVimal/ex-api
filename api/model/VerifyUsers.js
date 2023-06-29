var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var verifyUsersSchema = new Schema({
   "email": {type:String, index: true, lowercase: true},
   "phoneno": {type:String},
   "type": { type: String, default: '' },
   "otp": { type: String, default: '' },
   "otpTime": { type: Date, default: Date.now},
   "dateTime": {type: Date, default: Date.now}
});
module.exports = mongoose.model('VerifyUsers', verifyUsersSchema, 'VerifyUsers')