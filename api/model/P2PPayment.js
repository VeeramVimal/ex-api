var mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
var Schema = mongoose.Schema;

var p2ppaymentSchema = new Schema({
    userId : { type: mongoose.Schema.Types.ObjectId, ref: 'Users', 'index':true},
    methods: [{ 
        userId : { type: mongoose.Schema.Types.ObjectId, ref: 'Users', 'index':true},
        adminId : { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
        paymentmethodId: { type: mongoose.Schema.Types.ObjectId, ref: 'P2PAllPayments', 'index':true},
        paymenttype: { type: String,default: ''}, 
        attachment: { type: String,default: ''}, 
        holderName: { type: String,default: ''},
        accountNo: { type: String,default: ''},
        ifscCode: { type: String,default: ''},
        bankName: { type: String,default: ''},
        accountType: { type: String,default: ''},
        upiId: { type: String,default: ''},   
        branch: { type: String,default: ''}, 
        type: { type: String,default: 'p2p'},   
        rejectReason: { type: String,default: ''},   
        status : {type: Number,default: 0},  ///0 waiting for approval, 1 verified, 2 rejected, 5 disabled, 4 Deleted
        createdDate: {type:Date, default: Date.now},
        updatedDate: {type:Date, default: Date.now},
    }],
    "createdDate": {type:Date, default: Date.now}
});
module.exports = mongoose.model('P2PPayment', p2ppaymentSchema, 'P2PPayment')
