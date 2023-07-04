const Mongoose = require("mongoose");
const ObjectId = Mongoose.Types.ObjectId;
const messageUtils = require("../helpers/messageUtils");
const moment = require("moment");
const LaunchPadForm = require("../model/LaunchPad-form.model");
const LaunchTokenPurchase = require("../model/LaunchPad-token.model");
const LaunchPadBalanceUpdate = require("../model/LaunchPad-balanceUpdation.model");
const mail_helper = require('../helpers/mailHelper');
const query_helper = require("../helpers/query");
const emailTemplate = Mongoose.model("EmailTemplate");
/**
* @description Get SinglePackage by userAddress
* @param {ObjectId<string>} userAddress
* @returns {Promise<LaunchPadForm>}
*/
const filterUser = async (userAddress) => {
    const user = await query_helper.findoneData(LaunchPadForm, { userAddress }, {});
    if (user.status == true) {
        return { data: user.msg };
    } else return { status: false, message: "Not valid lanchpad form" }
}

/**
 * @description create a new user useraddress
 * @param {Object} userBody
 * @returns {Promise<LaunchPadForm>}
 */
const userCreateServices = async (userBody) => {
    const user = await LaunchPadForm.create(userBody);
    if (user) {
        var email_data = await query_helper.findoneData(emailTemplate, { hint: 'launch-user-order-process' }, {})
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
* @returns {Promise<LaunchPadForm>} Array
*/
const userFormFilterServices = async () => {
    return LaunchPadForm.find({ active_status: 1 }, { __v: 0, updatedAt: 0, createdAt: 0 })
    .then(async (userData) => {
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
    const userData = await LaunchPadForm.findById({ _id: ObjectId(userId) });
    if (!userData) throw new Error(messageUtils.USER_NOT_FOUND);
    return userData
};

/**
 * @description Get all lanchPad details
 * @param {}
 * @returns {Promise<LanchPad>}
 */
const getLanchPadServices = async () => {
    const lanchPad = await query_helper.findData(LaunchPadForm, {}, {}, { _id: -1 }, 0);
    return { data: lanchPad.msg }
}

/**
* @description Get SinglePackage by userId
* @param {ObjectId<string} userId
* @returns {Promise<User>}
*/
const getSingleAdminServices = async (userBody) => {
    const { userId } = userBody;
    const userData = await query_helper.findoneData(LaunchPadForm, { _id: ObjectId(userId) }, {});
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
    const launchPadData = await getSingleServices(userId);
    if(active_status == 2 && launchPadData.active_status == 2) throw new Error(messageUtils.ALREADY_LAUNCHPAD_REJECT);
    else if(active_status == 1 && launchPadData.active_status == 1) throw new Error(messageUtils.ALREADY_LAUNCHPAD_APPROVE);
    Object.assign(launchPadData, updateBody);
    if (active_status == 1) {
        var email_data = await query_helper.findoneData(emailTemplate, { hint: 'launch-user-order-approved' }, {})
        if (email_data && email_data.msg && email_data.msg.content) {
            let etempdataDynamic = email_data.msg.content
                .replace(/###NAME###/g, launchPadData.userName ? launchPadData.userName : "")
                .replace(/###ORDERNO###/g, launchPadData._id)
                .replace(/###PROJECTNAME###/g, launchPadData.projectName)
                .replace(/###STATUS###/g, "Approved")
            mail_helper.sendMail({ subject: email_data.msg.subject, to: launchPadData.email, html: etempdataDynamic }, function (res1) {
            });
        };
    } else if (active_status == 2) {
        var email_data = await query_helper.findoneData(emailTemplate, { hint: 'launch-user-order-Cancel' }, {})
        if (email_data && email_data.msg && email_data.msg.content) {
            let etempdataDynamic = email_data.msg.content
                .replace(/###NAME###/g, launchPadData.userName ? launchPadData.userName : "")
                .replace(/###ORDERNO###/g, launchPadData._id)
                .replace(/###PROJECTNAME###/g, launchPadData.projectName)
                .replace(/###REASON###/g, launchPadData.reject_reason ? launchPadData.reject_reason : "");
            mail_helper.sendMail({ subject: email_data.msg.subject, to: launchPadData.email, html: etempdataDynamic }, function (res1) {
            });
        };
    }
    await launchPadData.save();
    return launchPadData;
};

/**
 * @description user purchase launchpad token
 * @param {Object} tokenBody
 * @returns {Promise<LaunchPadForm>}
 */
const tokentaken = async () => {

}
const launchPadTokenBuyServices = async (tokenBody) => {
    const { userId } = tokenBody;
    const orderwith = oArray.indexOf(userId.toString());
    if(orderwith == -1){
        oArray.push(userId.toString());
        setTimeout(_intervalFunc, 5000, userId.toString());
        // const purchaseToken = await LaunchTokenPurchase.create(tokenBody);
        const purchaseToken = await query_helper.insertData(LaunchTokenPurchase, tokenBody);
        return purchaseToken;
    } else {
        setTimeout(_intervalFunc, 5000, userId.toString());
        throw new Error(messageUtils.SET_TIME_INTERVAL);
    }

};

//** time interval managed based on userId or userDetails */
let oArray = [];
const  _intervalFunc = (orderwith) => {
    orderwith = orderwith.toString();
    var index = oArray.indexOf(orderwith);
    if (index > -1) {
        oArray.splice(index, 1);
    }
}
module.exports = {
    filterUser,
    userCreateServices,
    userFormFilterServices,
    getSingleServices,
    getLanchPadServices,
    getSingleAdminServices,
    updateLanchPadServices,
    launchPadTokenBuyServices
}