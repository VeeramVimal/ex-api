const Mongoose = require("mongoose");
const ObjectId = Mongoose.Types.ObjectId;
const messageUtils = require("../helpers/messageUtils");
const moment = require("moment");
const LanchPadForm = require("../model/LanchPad-form.model");
const mail_helper = require('../helpers/mailHelper');
const query_helper = require("../helpers/query");
const emailTemplate = Mongoose.model("EmailTemplate");
/**
* @description Get SinglePackage by userAddress
* @param {ObjectId<string>} userAddress
* @returns {Promise<LanchPadForm>}
*/
const filterUser = async (userAddress) => {
    const user = await query_helper.findoneData(LanchPadForm, { userAddress }, {});
    if (user.status == true) {
        return { data: user.msg };
    } else return { status: false, message: "Not valid lanchpad form" }
}

/**
 * @description create a new user useraddress
 * @param {Object} userBody
 * @returns {Promise<LanchPadForm>}
 */
const userCreateServices = async (userBody) => {
    const user = await LanchPadForm.create(userBody);
    if (user) {
        var email_data = await query_helper.findoneData(emailTemplate, { hint: 'lanch-user-order-process' }, {})
        if (email_data && email_data.msg && email_data.msg.content) {
            let etempdataDynamic = email_data.msg.content
                .replace(/###NAME###/g, user.userName ? user.userName : "")
                .replace(/###ORDERNO###/g, user._id)
                .replace(/###STATUS###/g, "Processing")
                .replace(/###PROJECTNAME###/g, user.projectName)
            mail_helper.sendMail({ subject: email_data.msg.subject, to: user.email, html: etempdataDynamic }, function (res1) {
            });
        };
        return { data: user, message: messageUtils.USER_SCCESSFULL };
    }

}

/**
* @description Get allPackage set the seperate days
* @param {ObjectId<string} 
* @returns {Promise<LanchPadForm>} Array
*/
const userFormFilterServices = async () => {
    // const userDatas = await LanchPadForm.find();
    return LanchPadForm.find({ active_status: 1 }, { __v: 0, updatedAt: 0, createdAt: 0 }).then(async (userData) => {
        let data = [];
        var past, present, future
        if (userData.length) {
            past = [], present = [], future = [];
            await userData.map((user) => {
                let startDate, endDate, currentDate = moment(new Date).utc().format('YYYY-MM-DD');
                startDate = moment(user.start_date).utc().format('YYYY-MM-DD');
                endDate = moment(user.end_date).utc().format('YYYY-MM-DD');
                if (endDate < currentDate) {
                    past.push(user)
                } else if (startDate <= currentDate && endDate >= currentDate) {
                    present.push(user)
                } else if (startDate > currentDate) {
                    future.push(user)
                }
                return user;
            });
            return { past, present, future }
        }
    })
}

/**
* @description Get SinglePackage by userId
* @param {ObjectId<string} userId
* @returns {Promise<User>}
*/
const getSingleServices = async (userId) => {
    const userData = await LanchPadForm.findById({ _id: ObjectId(userId) });
    if (!userData) throw new Error(messageUtils.USER_NOT_FOUND);
    return userData
};

/**
 * @description Get all lanchPad details
 * @param {}
 * @returns {Promise<LanchPad>}
 */
const getLanchPadServices = async () => {
    const lanchPad = await query_helper.findData(LanchPadForm, {}, {}, { _id: -1 }, 0);
    return { data: lanchPad.msg }
}

/**
* @description Get SinglePackage by userId
* @param {ObjectId<string} userId
* @returns {Promise<User>}
*/
const getSingleAdminServices = async (userBody) => {
    const { userId } = userBody;
    const userData = await query_helper.findoneData(LanchPadForm, { _id: ObjectId(userId) }, {});
    return { data: userData.msg }
};
/**
 * @description update lanchpad data used by userId
 * @param {ObjectId<string>} userId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const updateLanchPadServices = async (userId, updateBody) => {
    const { active_status } = updateBody;
    console.log("active_status===========", active_status);
    const lanchPadData = await getSingleServices(userId);
    if(active_status == 2 && lanchPadData.active_status == 2) throw new Error(messageUtils.ALREADY_LANCHPAD_REJECT);
    else if(active_status == 1 && lanchPadData.active_status == 1) throw new Error(messageUtils.ALREADY_LANCHPAD_APPROVE);
    Object.assign(lanchPadData, updateBody);
    if (active_status == 1) {
        var email_data = await query_helper.findoneData(emailTemplate, { hint: 'lanch-user-order-approved' }, {})
        if (email_data && email_data.msg && email_data.msg.content) {
            let etempdataDynamic = email_data.msg.content
                .replace(/###NAME###/g, lanchPadData.userName ? lanchPadData.userName : "")
                .replace(/###ORDERNO###/g, lanchPadData._id)
                .replace(/###PROJECTNAME###/g, lanchPadData.projectName)
                .replace(/###STATUS###/g, "Approved")
            mail_helper.sendMail({ subject: email_data.msg.subject, to: lanchPadData.email, html: etempdataDynamic }, function (res1) {
            });
        };
    } else if (active_status == 2) {
        var email_data = await query_helper.findoneData(emailTemplate, { hint: 'lanch-user-order-Cancel' }, {})
        if (email_data && email_data.msg && email_data.msg.content) {
            let etempdataDynamic = email_data.msg.content
                .replace(/###NAME###/g, lanchPadData.userName ? lanchPadData.userName : "")
                .replace(/###ORDERNO###/g, lanchPadData._id)
                .replace(/###PROJECTNAME###/g, lanchPadData.projectName)
                .replace(/###REASON###/g, lanchPadData.reject_reason ? lanchPadData.reject_reason : "");
            mail_helper.sendMail({ subject: email_data.msg.subject, to: lanchPadData.email, html: etempdataDynamic }, function (res1) {
            });
        };
    }
    await lanchPadData.save();
    return lanchPadData;
}
module.exports = {
    filterUser,
    userCreateServices,
    userFormFilterServices,
    getSingleServices,
    getLanchPadServices,
    getSingleAdminServices,
    updateLanchPadServices
}