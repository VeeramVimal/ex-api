const { successResponse, errorResponse} = require("../helpers/response");
const userServices = require("../services/user.services");
//** get single user */
//** new user created */
const createUser = async (req, res) => {
    try {
        const user = await userServices.userCreateServices(req.body);
        return successResponse(req, res, user.data, user.message)
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

const getUserDataFilter = async (req, res) =>{
    try {
        const user = await userServices.userFormFilterServices();
        return successResponse(req, res, user)
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}

//** get a single user details */
const getSingleUser = async (req, res) => {
    try {
        const user = await userServices.getSingleServices(req.params.userId);
        return successResponse(req, res, user)
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

//** get all lanchPad details approved  */
const lanchPadList = async (req, res) => {
    try {
        const lanchPad = await userServices.getLanchPadServices();
        return successResponse(req, res, lanchPad.data);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

//** get a single user details */
const lanchPadSingleList = async (req, res) => {
    try {
        const lanchPad = await userServices.getSingleAdminServices(req.body);
        return successResponse(req, res, lanchPad.data);
    } catch (error) {
        return errorResponse(req, res, error.message);
        
    }
};

//** update lanch pad admin */
const lanchPadUpdate = async (req, res) => {
    try {
        const lanchPad = await userServices.updateLanchPadServices(req.params.userId, req.body);
        return successResponse(req, res, lanchPad);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}
module.exports = {
    createUser: createUser,
    getUserDataFilter: getUserDataFilter,
    getSingleUser: getSingleUser,
    lanchPadList: lanchPadList,
    lanchPadSingleList: lanchPadSingleList,
    lanchPadUpdate: lanchPadUpdate
}