let common = require('./common');
const subadminactivitycontroller = {
    async  subadminactivitylog(req, res){
        let adminlog = await common.adminactivtylog(req.body.type,req.body.adminuserid,req.body.username,req.body.remark,req.body.comment);
        if (adminlog){
            res.json({ "status": true, "message": 'Recorded' });
        } else {
            res.json({ "status": true, "message": 'Error in record' });
        }
    }
};
module.exports = subadminactivitycontroller;