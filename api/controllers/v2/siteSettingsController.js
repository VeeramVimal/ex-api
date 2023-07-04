const fs = require('fs');
const path = require('path');

const siteSettingsController = {
    async webSettings(req, res){
        var file = path.join(__dirname, '../../public/settings/settings.json');
        fs.readFile(file, function (err, data) {
            if(err) {
                return res.json({status: false, data: {}});
            }
            const datas = JSON.parse(data);
            return res.json({status: true, data: datas.web});
        });
    },
    async appSettings(req, res){
        var file = path.join(__dirname, '../../public/settings/settings.json');
        fs.readFile(file, function (err, data) {
            if(err) {
                return res.json({status: false, data: {}});
            }
            const datas = JSON.parse(data);
            return res.json({status: true, data: datas.app});
        });
    }
};
module.exports = siteSettingsController;