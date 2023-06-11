const cloudinary = require('cloudinary');
let config = require("../Config/config");
cloudinary.config({
  cloud_name: config.space.cloud_name,
  api_key: config.space.api_key,
  api_secret: config.space.api_secret,
});

exports.uploads = (file, folder) => {
    return new Promise(resolve => {
        cloudinary.uploader.upload(file, (result) => {
            resolve({
                url: result.secure_url,
                id: result.public_id
            })
        }, {
            resource_type: "auto",
            folder: folder
        })
    })
}

exports.v2uploads = async(file, folder="Images") => {
    const uplresp = await cloudinary.v2.uploader.upload(file, {});
    return uplresp;
}