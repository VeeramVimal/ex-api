const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
let config = require("../Config/config");
cloudinary.config({
  cloud_name: config.space.cloud_name,
  api_key: config.space.api_key,
  api_secret: config.space.api_secret,
});
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'admin',
    public_id: (req, file) => {
      return (
          new Date().toISOString().replace(/:/g, "-") + file.originalname
      );
    }
  },
});
const imageFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF)$/)) {
    req.fileValidationError = 'Only image files are allowed!';
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};
const fileFilter=(req,file,cb)=>{
  if(
    file.mimetype==='image/png'||
    file.mimetype==='image/jpg'||
    file.mimetype==='image/jpeg'||
    file.mimetype==='image/svg'||
    file.mimetype==='image/svg+xml')
  {
    cb(null,true);
  }
  else{
    cb(null,false);
  }
};
let upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 },fileFilter:fileFilter })
let uploads = {s3:'',upload:upload,imageFilter:imageFilter};
module.exports = uploads;