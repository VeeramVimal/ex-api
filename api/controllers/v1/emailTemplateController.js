const query_helper = require('../../helpers/query');
const mongoose = require('mongoose');
const EmailTemplate = mongoose.model("EmailTemplate");
const emailTemplateController = {
    async getemailTemplate (req, res) {
        try {
            let find = {}
            if (req.body.formvalue.status != '') {
                find.status = req.body.formvalue.status;
            }
            if(req.body.formvalue.searchQuery != '') {
                var queryvalue = req.body.formvalue.searchQuery
                find.subject = new RegExp(queryvalue,"i")
            }
            let limit = req.body.limit?parseInt(req.body.limit):10;
            let offset = req.body.offset? parseInt(req.body.offset):0
            let cms = await query_helper.findDatafilter(EmailTemplate,find,{},{_id:-1},limit,offset)
            let count = await EmailTemplate.countDocuments(find)
            res.json({ "status": cms.status, "getemailtemplateDetails": cms.msg,"total" : count });
        } catch (e) {
            console.log("getCMS",e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async addEmailTemplate (req, res) {
       try {
        let data = req.body;
        let cms = await query_helper.insertData(EmailTemplate,data);
        if (cms.status) {
            res.json({ "status": cms.status, "message": "Email Template added successfully" });
        } else {
            res.json({ "status": cms.status, "message": "Email Template added failed" });
        }
       } catch (err) {
           console.log("errr:",err)
       }
    },
    async updateEmailTemplate (req, res) {
        try {
            let data = req.body;
            let emailTemplate = await query_helper.updateData(EmailTemplate,"one",{_id:mongoose.Types.ObjectId(data._id)},data);
            if (emailTemplate.status) { 
                res.json({ "status": emailTemplate.status, "message": "Email Template updated successfully" });
            } else {
                res.json({ "status": emailTemplate.status, "message": "Email Template updated failed" });
            }
        } catch (err) {}
    }
}
module.exports = emailTemplateController;