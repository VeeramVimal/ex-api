const mongoose = require('mongoose');
const Users = mongoose.model("Users");
const SiteSettings = mongoose.model("SiteSettings");
const Currency = mongoose.model("Currency");
const VoucherDB = mongoose.model("Voucher");
const emailTemplate = mongoose.model("EmailTemplate");
const P2PPayment = mongoose.model("P2PPayment");

const fs = require("fs");
const axios = require('axios');
const FormData = require('form-data');
const base64ToImage = require('base64-to-image');

const query_helper = require('../../helpers/query');
const common = require('../../helpers/common');
const cloudinary = require('../../helpers/cloudinary');
const config = require("../../Config/config");

let request = require('request');
const { cat } = require('shelljs');

const bankController = {
    async afterBankDetailUpd(req, res){
        const {
            body: reqBody = {},
        } = req;

        let userId = reqBody.userId ? reqBody.userId : req.userId ? req.userId : "";

        if(userId) {
            let paymentDetail = await query_helper.findoneData(P2PPayment, { userId: mongoose.Types.ObjectId(userId) }, {});
            if (paymentDetail.status) {
                paymentDetail = paymentDetail.msg;

                let approvedCount = 0;
                let pendingCount = 0;
                let rejectedCount = 0;
                let notUploadedCount = 0;

                if(paymentDetail.methods) {
                    if(paymentDetail.methods.length === 0) {
                        notUploadedCount++;
                    }
                    else {
                        for (let p = 0; p < paymentDetail.methods.length; p++) {
                            const element = paymentDetail.methods[p];
                            if(element.status == 0) {
                                pendingCount++;
                            }
                            else if(element.status == 1) {
                                approvedCount++;
                            }
                            else if(element.status == 2) {
                                rejectedCount++;
                            }
                        }
                    }

                    let bankStatus = 3;

                    // 0 pen
                    // 1 app
                    // 2 rej
                    // 3 not upl

                    if(notUploadedCount > 0) {
                        bankStatus = 3;
                    }
                    else if(pendingCount > 0) {
                        bankStatus = 0;
                    }
                    else if(approvedCount > 0) {
                        bankStatus = 1;
                    }
                    else if(rejectedCount > 0) {
                        bankStatus = 2;
                    }
                    await query_helper.updateData(Users, 'one', { _id: mongoose.Types.ObjectId(userId) }, { bankstatus: bankStatus });
                    // return res.json({userId, bankStatus});
                }
            }
        }
    },
    async afterBankApproval({data, req}){
        try {
           await query_helper.updateData(Users, 'one', { _id: mongoose.Types.ObjectId(req.userId) }, { bankstatus : 1 });
        } catch(err){}
    },
    async afteradminBankApproval({data,userId}){
        try {
           await query_helper.updateData(Users, 'one', { _id: mongoose.Types.ObjectId(userId) }, { bankstatus : 1 });
        } catch(err){}
    },
};
module.exports = bankController;