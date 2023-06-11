const query_helper = require('../helpers/query');
const mongoose = require('mongoose');
const { cat } = require('shelljs');
const CMS = mongoose.model("CMS");
const cmsController = {
    async getCMS (req, res) {
        try {
            const reqBody = req.body;

            const {
                from= "",
                identify= "",
                type= "",
                formvalue = {}
            } = reqBody;

            let find = {};
            if(from === 'home') {
                find = {
                    status: 1,
                    identify: {
                        $in: [
                            'homeIntro',
                            'adBanner',
                            'adBanner1',
                            'adBanner2',
                            'section1',
                            'section2',
                            'section3',
                            'section4',
                            'section5',
                            'trade-simple-steps',
                            'our-benefits',
                            'future1',
                            'future2',
                            'tradeApps',
                            'marketTrading',
                        ]
                    }
                }
            } else if (from == "p2p-home") {
                find = {
                    status: 1,
                    identify: {
                        $in: [
                            'advantagesofP2P',
                            'p2psection1',
                            'p2psection2',
                            'how-p2p-works-buy',
                            'how-p2p-works-sell',
                            'how-p2p-works'
                        ]
                    }
                }
            } else if (from == "footer") {
                find = {
                    status: 1,
                    identify: "CMS"
                }
            } else if (identify == "terms" || identify == "about" || identify == "privacy" || identify == "contactus") {
                find = {
                    status: 1,
                    identify: identify
                }
            } else if(identify != ""){
                find = {
                    status: 1,
                    identify: "CMS",
                }
                if(type == "dyn") {
                    find.link = identify;
                }
                else {
                    find.title = identify;
                }
            }

            if (formvalue.status != '') {
                find.status = formvalue.status;
            }
            if(formvalue.searchQuery != '') {
                var queryvalue = formvalue.searchQuery
                find.title = new RegExp(queryvalue,"i")
            }
            let limit = reqBody.limit?parseInt(reqBody.limit):10;
            let offset = reqBody.offset? parseInt(reqBody.offset):0
            let cms = await query_helper.findDatafilter(CMS,find,{},{_id:-1},limit,offset)
            let cmscount = await CMS.countDocuments(find)
            res.json({ "status": cms.status, "getcmsDetails": cms.msg, "total" : cmscount });
        } catch (e) {
            console.log("getCMS",e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getCMSById (req, res) {
        try {
            let cms = await query_helper.findoneData(CMS,{_id:mongoose.Types.ObjectId(req.body._id)},{})
            if(cms.status) {
                res.json({ "status": true, "getCMSTblDetails": cms.msg });
            } else {
                res.json({ "status": false, "message": 'Not a valid cms!' });
            }
        } catch (e) {
            console.log("getCMSById",e);
            res.json({ "status": false, "message": "Not a valid cms!" });
        }
    },
    async addCMS (req, res) {
       try {
        let data = req.body;
        let cms = await query_helper.insertData(CMS,data)
        res.json({ "status": cms.status, "message": "CMS added successfully" });
       } catch (err) {
           console.log("errr:",err)
       }
    },
    async updateCMS (req, res) {
       try {
        let data = req.body;
        let cmsData = await query_helper.findoneData(CMS,{_id:mongoose.Types.ObjectId(data._id)},{})
        if(cmsData.status) {
            cmsData = cmsData.msg;
            await query_helper.updateData(CMS,"one",{_id:mongoose.Types.ObjectId(data._id)},data)
            res.json({ "status": true, "message": "CMS updated successfully" });
        } else {
            res.json({ "status": false, "message": 'Not a valid cms!' });
        }
       } catch (err) {
           console.log("err:",err)
       }
    },
    async deleteCMS (req, res) {
        try {
            let data = req.body;
            let cms = await query_helper.findoneData(CMS,{_id:mongoose.Types.ObjectId(data.cmsId)},{})
            if(cms.status) {
                cms = cms.msg;
                let cmsResult = await query_helper.DeleteOne(CMS,{_id:mongoose.Types.ObjectId(data.cmsId)});
                res.json({ "status": cms.status, "message": "CMS deleted successfully",data:cmsResult });
            } else {
                res.json({ "status": false, "message": 'Not a valid cms!' });
            }
        } catch (err) {}
    },
    async changeStatus (req,res) {
        try {
            let data = req.body;
            let cms = await query_helper.findoneData(CMS,{_id:mongoose.Types.ObjectId(data.cmsId)},{})
            if(cms.status) {
                cms = cms.msg;
                let status = 0;
                if (cms.status == 1) {
                    status = 0;
                } else {
                    status = 1;
                }
                let text = status == 1 ? "enabled" : "disabled";
                await query_helper.updateData(CMS,"one",{_id:mongoose.Types.ObjectId(data.cmsId)},{ status: status})
                res.json({ "status": cms.status, "message": "CMS " + text + " successfully",data:cms });
            } else {
                res.json({ "status": false, "message": 'Not a valid cms!' });
            }

        } catch (err) {}
    }
};
module.exports = cmsController;