var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var genSchema = new Schema({
  "userId"   : { type: mongoose.Schema.Types.ObjectId, unique: true, ref: 'Users' },
  "status"   : { type: Number, default: 1 }
});

module.exports = mongoose.model('StakingEnabledUser', genSchema, 'StakingEnabledUser')