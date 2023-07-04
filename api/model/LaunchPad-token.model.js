const Mongoose = require('mongoose');
const schema = Mongoose.Schema;
const model = Mongoose.model;
const ObjectId = Mongoose.Schema.Types.ObjectId;

const tokenPurchaseSchema = new schema({
    userId: {
        type: ObjectId, index: true, ref: 'Users',
        required: true
    },
    launchPadId: {
        type: ObjectId, index: true, ref: 'LaunchPadForm',
        required: true
    },
    numberOfToken: {
        type: String,
        default: ""
    },
    amountDeducted: {
        type: String,
        default: ""
    },
    purchaseDate: {
        type: String,
        default: ""
    }
}, {
    collection: 'LaunchPadTokenPurchase',
    timestamps: true
});
module.exports = User = model("LaunchPadTokenPurchase", tokenPurchaseSchema)