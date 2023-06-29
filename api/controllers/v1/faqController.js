const query_helper = require('../../helpers/query');
let common = require('../../helpers/common');
const mongoose = require('mongoose');
let speakeasy = require('speakeasy');
const commonHelper = require('../../helpers/common');
let getJSON = require('get-json');
const P2PFaqDb = mongoose.model("P2PFaq");

const faqController = {
async getFaq (req, res) {
    try {
        let faqStatus = await P2PFaqDb.find({type: req.body.type, status: 1}).sort({_id:-1});
        if (faqStatus && faqStatus.length > 0) {
            res.json({ "status": true, "message": "Faq Details listed", data: faqStatus });
        } else {
            res.json({ "status": false, "message": "No records found!", data: [] });
        }
    } catch (e) {
        console.log('getFaq',e);
        res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
    }
},
}
module.exports = faqController;