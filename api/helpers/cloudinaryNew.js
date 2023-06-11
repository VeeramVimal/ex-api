const config = require("../Config/config");
const cloudinary = require('cloudinary');
cloudinary.config({
  cloud_name: config.space.cloud_name,
  api_key: config.space.api_key,
  api_secret: config.space.api_secret,
});


exports.v2uploads = async(file, folder="Images") => {
    const test = await cloudinary.v2.uploader.upload(file, {});
}