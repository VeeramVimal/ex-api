const express = require('express');
const router = express.Router();
const commonController = require('../../controllers/v1/commonController')
router.get('/getCountry', commonController.getCountry);
router.post('/getState', commonController.getState);
router.post('/getCity', commonController.getCity);
router.get('/getBlogs', commonController.getBlogs);
router.post('/recentBlogs', commonController.recentBlogs);
router.post('/recentBlogsByLink', commonController.recentBlogsByLink);
router.post('/getBlogById', commonController.getBlogById);
router.post('/getBlogByLink', commonController.getBlogByLink);
router.get('/siteSettings', commonController.siteSettings);
module.exports = router;