const Mongoose = require('mongoose');
const schema = Mongoose.Schema;
const model = Mongoose.model;

const idoFormSchema = new schema({
    userName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    projectName: {
        type: String,
        required: true
    },
    projectInfo: {
        type: String,
        required: true
    },
    blockChainSelect: {
        type: String,
        required: true
    },
    tokenName: {
        type: String,
        required: true
    },
    userTeam: {
        type: String,
        required: true
    },
    investors: {
        type: String,
        required: true
    },
    smartContractAudited: {
        type: String,
        required: true
    },
    paper_link: {
        type: String,
        required: true
    },
    websiteLink: {
        type: String,
        required: true
    },
    gitLink: {
        type: String,
        required: true
    },
    twitterLink: {
        type: String,
        required: true
    },
    telegramGrpLink: {
        type: String,
        required: true
    },
    telegramUserName: {
        type: String,
        required: true
    },
    token_supply: {
        type: Number,
        required: true
    },
    initial_supply: {
        type: Number,
        required: true
    },
    token_price: {
        type: Number,
        required: true
    },
    start_date: {
        type: String,
        required: true
    },
    end_date: {
        type: String,
        required: true
    },
    hard_cap_value: {
        type: String,
        required: true
    },
    soft_cap_value: {
        type: String,
        required: true
    },
    contact_address: {
        type: String,
        required: true
    },
    active_status: {
        type: Number,
        default: 0
    },
    reject_reason: {
        type: String,
        default: ""
    },
    total_whitelisted_users: {
        type: Number,
        default: 0
    },
    total_user_participated: {
        type: Number,
        default: 0
    },
    total_funds_swapped: {
        type: String,
        default: ""
    },
    access_type_level: {
        type: Number,
        default: 0
    },
    token_listing_date: {
        type: String,
        default: ""
    }, 
    market_cap_listing: {
        type: String,
        default: ""
    },
    distributed: {
        type: String,
        default: "Fibit Pro Lanchpad" 
    },
    vesting_unlock: {
        type: String,
        default: ""
    },
    vesting_start_date: {
        type: String,
        default: ""
    },
    vesting_end_date: {
        type: String,
        default: ""
    }
}, {
    collection: 'LaunchPadForm',
    timestamps: true
});
module.exports = User = model("LaunchPadForm", idoFormSchema)