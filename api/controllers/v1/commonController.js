const query_helper = require('../../helpers/query');
const mongoose = require('mongoose');
const Docs = mongoose.model("Docs");
const siteSettings = mongoose.model("SiteSettings");
let Country = require('country-state-city').Country;
let State = require('country-state-city').State;
let City = require('country-state-city').City;
const emailTemplate = mongoose.model("EmailTemplate");
const mail_helper = require('../../helpers/mailHelper');
const commonController = {
    async getCountry (req, res) {
        try {
            let countries = Country.getAllCountries();
            let country = [];
            countries.forEach((entry) => {
                country.push({name: entry.name})
            });
            res.json({ "status": true, "message": country });
        } catch (e) {
            console.log('getCountry',e);
            res.json({ "status": false, "message": [] });
        }
    },
    async getState (req, res) {
        try {
            let countryName = req.body.country;
            let countries = Country.getAllCountries();
            let countryIsoCode;
            countries.forEach((entry) => {
                if(entry.name == countryName) {
                    countryIsoCode = entry.isoCode;
                }
            });
            let statesList = State.getStatesOfCountry(countryIsoCode);
            let states = [];
            statesList.forEach((entry) => {
                states.push({name: entry.name})
            });
            res.json({ "status": true, "message": states });
        } catch (e) {
            console.log('getState',e);
            res.json({ "status": false, "message": [] });
        }
    },
    async getCity (req, res) {
        try {
            let countryName = req.body.country;
            let stateName = req.body.state;
            let countries = Country.getAllCountries();
            let countryIsoCode, stateIsoCode;
            countries.forEach((entry) => {
                if(entry.name == countryName) {
                    countryIsoCode = entry.isoCode;
                }
            });
            let statesList = State.getStatesOfCountry(countryIsoCode);
            statesList.forEach((entry) => {
                if(entry.name == stateName) {
                    stateIsoCode = entry.isoCode;
                }
            });
            let cities = City.getCitiesOfState(countryIsoCode, stateIsoCode);
            let city = [];
            cities.forEach((entry) => {
                city.push({name: entry.name})
            });
            res.json({ "status": true, "message": city });
        } catch (e) {
            console.log('getCity',e);
            res.json({ "status": false, "message": [] });
        }
    },
    async siteSettings (req, res) {
        try {
            // let settings = await query_helper.findoneData(siteSettings, {}, {})
            // res.json({ "status": settings.status, "message": settings.msg });
            let settings = await siteSettings.findOne({}).populate({path:"tradeFeeDiscountCurrency", select: "currencySymbol" });
            res.json({ "status": true, "message": settings });
        } catch (e) {
            console.log('siteSettings',e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getBlogs (req, res) {
        try {
            let docs = await query_helper.findData(Docs,{},{},{_id:-1},0)
            res.json({ "status": docs.status, "message": docs.msg });
        } catch (e) {
            console.log('getBlogs',e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async recentBlogs (req, res) {
        try {
            let where = {}, limit = 3;
            if(typeof req.body._id == 'string' && req.body._id != '') {
                where = {link:{ $ne:req.body._id}};
                limit = 4;
            }
            let docs = await query_helper.findData(Docs,where,{},{_id:-1},limit)
            res.json({ "status": docs.status, "message": docs.msg });
        } catch (e) {
            console.log('recentBlogs',e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async recentBlogsByLink (req, res) {
        try {
            let where = {}, limit = 4;
            if(typeof req.body.link == 'string' && req.body.link != '') {
                where = { link: { $ne:req.body.link } };
            }
            let docs = await query_helper.findData(Docs, where, {}, { _id: -1 }, limit)
            res.json({ "status": docs.status, "message": docs.msg });
        } catch (e) {
            console.log('recentBlogsByLink',e);
            res.json({ "status": false, "message": "Something went wrong! Please try again someother time" });
        }
    },
    async getBlogById (req, res) {
        try {
            let docs = await query_helper.findoneData(Docs,{link:req.body._id},{})
            if(docs.status) {
                res.json({ "status": true, "message": docs.msg });
            } else {
                res.json({ "status": false, "message": 'Not a valid docs!' });
            }
        } catch (e) {
            console.log('getBlogById',e);
            res.json({ "status": false, "message": "Not a valid docs!" });
        }
    },
    async getBlogByLink (req, res) {
        try {
            let docs = await query_helper.findoneData(Docs, { link:req.body.link }, {})
            if(docs.status) {
                res.json({ "status": true, "message": docs.msg });
            } else {
                res.json({ "status": false, "message": 'Not a valid docs!' });
            }
        } catch (e) {
            console.log('getBlogByLink',e);
            res.json({ "status": false, "message": "Not a valid docs!" });
        }
    }
};
module.exports = commonController;