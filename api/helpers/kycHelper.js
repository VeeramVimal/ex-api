var config = require("../Config/config");
var axios = require('axios');

exports.bankVerify = async function (passData = {}) {
    // console.log("bankVerify : ", {passData});
    try {
        let {
            accountNo,
            ifscCode
        } = passData;

        const {
            era_domain = "",
            token: kycToken = "",
            bankApi = "",
            panLite = "",
            upiApi = ""
        } = config.kyc;
        const optUrl = era_domain+bankApi;
        const optUPIUrl = era_domain+upiApi;

        var data = JSON.stringify({
            "id_number": accountNo,
            "ifsc": ifscCode
        });
        
        var axiosConfig = {
            method: 'post',
            url: optUrl,
            headers: { 
            'Authorization': 'Bearer '+kycToken, 
            'Content-Type': 'application/json'
            },
            data : data
        };

        let response = await axios(axiosConfig);
        return response;
    }
    catch (err) {
        return {status: false}
    }
};

exports.upiVerify = async function (passData = {}) {
    // console.log("upiVerify : ", {passData});
    try{
        let {
            UPIID
        } = passData;

        const {
            era_domain = "",
            token: kycToken = "",
            bankApi = "",
            panLite = "",
            upiApi = ""
        } = config.kyc;
        const optUrl = era_domain+bankApi;
        const optUPIUrl = era_domain+upiApi;

        var data = JSON.stringify({
            "upi_id": UPIID,
        });
        
        var axiosConfig = {
            method: 'post',
            url: optUPIUrl,
            headers: { 
            'Authorization': 'Bearer '+kycToken, 
            'Content-Type': 'application/json'
            },
            data : data
        };

        let response = await axios(axiosConfig);
        return response;
    }
    catch (err) {
        return {status: false}
    }
};