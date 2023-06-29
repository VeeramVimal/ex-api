var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var P2PFaqSchema = new Schema({
  "title"     : { type: String, default: '' },
  "description"     : { type: String, default: '' },
  "type"            : { type: String, default: '' },
  "status"          : { type: Number, default: 1 },
  "createdDate"     : { type: Date, default: Date.now },
});

module.exports = mongoose.model('P2PFaq', P2PFaqSchema, 'P2PFaq')