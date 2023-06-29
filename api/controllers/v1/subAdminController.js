const query_helper = require('../../helpers/query');
const mongoose = require('mongoose');
const SubAdmin = mongoose.model("Admin");
let common = require('../../helpers/common');
const emailTemplate = mongoose.model("EmailTemplate");
let mail_helper = require('../../helpers/mailHelper');
let config = require("../../Config/config");
const subAdminController = {
    async getSubAdmin (req, res) {
        try {
            let matchQ = {role: 0};
            let {page =1 ,limit= 100 } = req.query 
            let subAdmin = await query_helper.findData(SubAdmin,matchQ,{},{_id:-1},limit,page)
            res.json({ "status": subAdmin.status, "getSubAdminTblDetails": subAdmin.msg });
        } catch (e) {
            console.log('getSubAdmin',e);
            res.json({ "status": false, "message": "Something went wrong! Please try again some other time" });
        }
    },
    async getSubAdminfilter (req, res) {
        try {
            let matchQ = {role: 0};
            let getdata=req.body.formvalue
            if (getdata.status != '') {
                matchQ.status = getdata.status;
            }
            if (getdata.searchQuery != '') {
                var size = Object.keys(matchQ).length;
                let query = { '$and': [{ '$or': [{ "name": { $regex: getdata.searchQuery } }, { "email": { $regex: getdata.searchQuery } }] }] };
                if (size > 0) {
                    for (var key in matchQ) {
                        let objPush = {};
                        objPush[key] = matchQ[key];
                        query['$and'].push(objPush);
                    }
                }
                matchQ = query;
            }
            let limit =req.body.limit?parseInt(req.body.limit):10;
            let offset =req.body.offset? parseInt(req.body.offset):0
            let subAdmin = await query_helper.findDatafilter(SubAdmin,matchQ,{},{_id:-1},limit,offset);
            let subAdmincount = await SubAdmin.countDocuments(matchQ);
            res.json({ "status": subAdmin.status, "getSubAdminTblDetails": subAdmin.msg,
            "total":subAdmincount});
        } catch (e) {
            console.log('getSubAdminfilter',e);
            res.json({ "status": false, "message": "Something went wrong! Please try again some other time" });
        }
    },
    async updateSubAdmin (req, res) {
        let suadminEmail=req.body.email;
        let data = req.body;
        delete data.email;
        delete data.password;
        let subAdmin = await query_helper.updateData(SubAdmin,"one",{_id:mongoose.Types.ObjectId(data._id)},data)
        if(subAdmin.status) {
            await common.adminactivtylog(req,'SubAdminUpdate', req.userId, suadminEmail,'Subadmin', 'Subadmin data Updated');
            res.json({ "status": subAdmin.status, "message": 'Sub Admin Updated Successfully!' });
        } else {
            res.json({ "status": false, "message": subAdmin.msg });
        }
    },
    async addSubAdmin (req, res) {
        let data = req.body;
        data.email = (data.email).toLowerCase();
        let getSubAdmin = await query_helper.findoneData(SubAdmin,{email:data.email},{})
        if(!getSubAdmin.status) {
            const generatePassword = common.generatePassword(8);
            const subAdminData = {
                name: data.name,
                email: data.email,
                roles: data.roles,
                role: 0,
                password: common.encrypt(generatePassword),
                status: 1
            }
            let subAdmin = await query_helper.insertData(SubAdmin,subAdminData);
            if(subAdmin.status) {
                let email_data =   await query_helper.findoneData(emailTemplate,{hint: "sub-admin-registration"},{})
                email_data = email_data.msg;
                 await common.adminactivtylog(req,'New Subadmin', req.userId,data.email,'New Subadmin', 'New Subadmin data Added');
                let etempdataDynamic = email_data.content.replace(/###NAME###/g, data.name).replace(/###EMAILADDRESS###/g, data.email).replace(/###PASSWORD###/g, generatePassword).replace(/###LINK###/g, config.adminEnd+'login');
                mail_helper.sendMail({subject:email_data.subject, to: data.email, html: etempdataDynamic }, function (res1) {
                    res.json({ "status": subAdmin.status, "message": 'Sub Admin Added Successfully!' });
                });
            } else {
                res.json({ "status": false, "message": subAdmin.msg });
            }
        } else {
            res.json({ "status": false, "message": 'Sub Admin Email Address Already Exists!' });
        }
    },
    async getSubAdminById (req, res) {
        try {
            let subAdmin = await query_helper.findoneData(SubAdmin,{_id:mongoose.Types.ObjectId(req.body._id)},{})
            if(subAdmin.status) {
                res.json({ "status": true, "message": subAdmin.msg });
            } else {
                res.json({ "status": false, "message": 'Not a valid Sub Admin!' });
            }
        } catch (e) {
            console.log('getSubAdminById',e);
            res.json({ "status": false, "message": "Not a valid Sub Admin!" });
        }
    },
};
module.exports = subAdminController;