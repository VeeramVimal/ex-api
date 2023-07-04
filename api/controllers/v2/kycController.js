const mongoose = require("mongoose");
const Users = mongoose.model("Users");
const SiteSettings = mongoose.model("SiteSettings");
const Currency = mongoose.model("Currency");
const VoucherDB = mongoose.model("Voucher");
const emailTemplate = mongoose.model("EmailTemplate");

const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const base64ToImage = require("base64-to-image");

const query_helper = require("../../helpers/query");
const common = require("../../helpers/common");
const cloudinary = require("../../helpers/cloudinary");
const config = require("../../Config/config");

let request = require("request");

const kycController = {
  async updUserDataTemp(req, res) {
    const { userId = "", body = {} } = req;
    if (body.user_id && body.user_id != "") {
      const findData = {
        _id: mongoose.Types.ObjectId(body.user_id),
      };
      const updData = {
        kycstatus: 3,
        level: 1,
        kycMode: "Offline",
        kycStatusDetail: {
          pan: {
            status: 3,
            mode: "Offline",
          },
          aadhaar: {
            status: 3,
            mode: "Offline",
          },
          selfie: {
            status: 3,
            mode: "Offline",
          },
        },
        kycOnline: {
          pan: {
            status: 3,
            number: "",
            details: {},
            reject_reason: "",
          },
          aadhaar: {
            status: 3,
            number: "",
            details: {},
            image: "",
            image_local: "",
            reject_reason: "",
          },
          selfie: {
            status: 3,
            image: "",
            image_local: "",
            details: {},
            reject_reason: "",
          },
        },
        kycOffline: {
          pan: {
            status: 3,
            number: "",
            details: {},
            image: "",
            image_back: "",
            reject_reason: "",
          },
          aadhaar: {
            status: 3,
            number: 0,
            details: {},
            image: "",
            image_local: "",
            reject_reason: "",
          },
          selfie: {
            status: 3,
            image: "",
            image_local: "",
            reject_reason: "",
          },
        },
      };
      const updUser = await query_helper.updateData(
        Users,
        "many",
        findData,
        updData
      );
      return res.json({ status: true, message: "KYC reset successfull" });
    } else {
      return res.json({ status: false, message: "KYC reset failed" });
    }
  },
  // Upload
  async updateImages(req, res) {
    const uploader = async (path) => await cloudinary.uploads(path, "Images");
    const urls = [];
    const files = req.files;
    if (files) {
      for (const file of files) {
        const { path, originalname } = file;
        let fileName = originalname.split(".")[0];
        const newPath = await uploader(path);
        urls.push({ name: fileName, location: newPath.url });
      }
    }
    return urls;
  },
  // Online
  async verifyPanOnline(req, res) {
    try {
      const { body: reqBody = {}, userId = "" } = req;

      const { type = "", pan_number = "" } = reqBody;

      const {
        era_domain = "",
        token: kycToken = "",
        panLite = "",
      } = config.kyc;

      if (type == "panVerify") {
        let findAlready = {
          _id: {
            $ne: mongoose.Types.ObjectId(userId),
          },
        };
        findAlready["$or"] = [
          {
            "kycOnline.pan.number": pan_number,
            "kycOnline.pan.status": { $ne: 2 },
          },
          {
            "kycOffline.pan.number": pan_number,
            "kycOffline.pan.status": { $ne: 2 },
          },
          // {
          //   "kycV1.details.pan_number": pan_number,
          //   "kycV1.details.pan_status": { $eq: "2" },
          // },
        ];
        let alreadyChk = await query_helper.findoneData(Users, findAlready, {});
        if (alreadyChk.status === true && alreadyChk.msg) {
          return res.json({
            status: false,
            message: "Pan number already exists",
          });
        }
        let usersData = await query_helper.findoneData(
          Users,
          { _id: mongoose.Types.ObjectId(userId) },
          {}
        );
        if (usersData.status === false) {
          return res.json({
            status: false,
            message: "Oops! Something went wrong.Please try again",
          });
        } else if (usersData.status === true) {
          const options = {
            method: "POST",
            url: era_domain + panLite,
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + kycToken,
            },
            followRedirect: false,
            body: JSON.stringify({
              id_number: pan_number,
            }),
          };
          request(options, async function (error, response) {
            try {
              if (response) {
                const resp = JSON.parse(response.body);
                if (resp.data == null) {
                  return res.json({
                    status: false,
                    message: "Oops! Something went wrong.Please try again",
                  });
                } else if (resp.success == false) {
                  return res.json({
                    status: false,
                    message: "Invalid Pan. Please Check your Pan no.",
                  });
                } else if (
                  !resp.data.pan_number ||
                  resp.data.pan_number === null
                ) {
                  return res.json({
                    status: false,
                    message: "Invalid Pan. Please Check your Pan no.",
                  });
                } else if (resp.data.pan_number !== null) {
                  let updValues = {};
                  updValues["username"] = resp.data.full_name
                    ? resp.data.full_name.toLowerCase()
                    : "";

                  updValues["kycMode"] = "Online";
                  updValues["kycOnlineAPI.aadhaarClientId"] = 0;

                  updValues["kycOnline.pan.number"] = resp.data.pan_number;
                  updValues["kycOnline.pan.details"] = resp.data;
                  updValues["kycOnline.pan.status"] = 1;

                  updValues["kycStatusDetail.pan.status"] = 1;
                  updValues["kycStatusDetail.pan.mode"] = "Online";

                  await query_helper.updateData(
                    Users,
                    "one",
                    { _id: mongoose.Types.ObjectId(userId) },
                    updValues
                  );
                  return res.json({
                    status: true,
                    message: "Pan number verification successfully completed.",
                  });
                } else {
                  return res.json({
                    status: false,
                    message: "Oops! Something went wrong.Please try again",
                  });
                }
              } else {
                return res.json({
                  status: false,
                  message: "Oops! Something went wrong.Please try again",
                });
              }
            } catch (e) {
              console.log("verifyAadhaar 2", e);
              return res.json({
                status: false,
                message: "Oops! Something went wrong.Please try again",
              });
            }
          });
        }
      }
    } catch (e) {
      console.log("verifyAadhaar 1", e);
      res.json({
        status: false,
        message: "Oops! Something went wrong.Please try again",
      });
    }
  },
  async verifyAadhaarOnline(req, res) {
    try {
      const { body: reqBody = {}, userId = "" } = req;
      const { type = "", aadhaar_number = "", aadhaarOtp = 0 } = reqBody;

      const {
        era_domain = "",
        token: kycToken = "",
        aadhaarV2GenerateOtp = "",
        aadhaarV2SubmitOtp = "",
      } = config.kyc;

      if (type == "generateOtp") {
        let findAlready = {
          _id: {
            $ne: mongoose.Types.ObjectId(userId),
          },
        };
        findAlready["$or"] = [
          {
            "kycOnline.aadhaar.number": aadhaar_number,
            "kycOnline.aadhaar.status": { $ne: 2 },
          },
          {
            "kycOffline.aadhaar.number": aadhaar_number,
            "kycOffline.aadhaar.status": { $ne: 2 },
          },
          // {
          //   "kycV1.details.id_number": aadhaar_number,
          //   "kycV1.details.id_status": { $eq: "2" },
          // },
        ];
        let alreadyChk = await query_helper.findoneData(Users, findAlready, {});
        if (alreadyChk.status === true && alreadyChk.msg) {
          return res.json({
            status: false,
            message: "Aadhaar number already exists",
          });
        }
        const options = {
          method: "POST",
          url: era_domain + aadhaarV2GenerateOtp,
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + kycToken,
          },
          body: JSON.stringify({
            id_number: aadhaar_number,
          }),
        };
        request(options, async function (error, response) {
          try {
            if (response.body) {
              const resp = JSON.parse(response.body);
              if (resp.data == null) {
                return res.json({
                  status: false,
                  message: "Oops! Something went wrong.Please try again",
                });
              } else if (resp.data.if_number === false) {
                return res.json({
                  status: false,
                  message:
                    "Aadhaar Card id Invalid. Please Check your aadhar no.",
                });
              } else if (
                resp.data.if_number === true &&
                resp.data.otp_sent === true
              ) {
                const aadhaarClientId = resp.data.client_id;
                let updValues = {};
                updValues["kycOnlineAPI.aadhaarClientId"] = aadhaarClientId;
                await query_helper.updateData(
                  Users,
                  "one",
                  { _id: mongoose.Types.ObjectId(userId) },
                  updValues
                );
                return res.json({
                  status: true,
                  message:
                    "OTP for Aadhaar verification has been sent to your registered mobile number.",
                });
              } else {
                return res.json({
                  status: false,
                  message: "Oops! Something went wrong.Please try again",
                });
              }
            } else {
              return res.json({
                status: false,
                message: "Oops! Something went wrong.Please try again",
              });
            }
          } catch (e) {
            console.log("verifyAadhaar 2", e);
            return res.json({
              status: false,
              message: "Oops! Something went wrong.Please try again",
            });
          }
        });
      } else if (type == "submitOtp") {
        let usersData = await query_helper.findoneData(
          Users,
          { _id: mongoose.Types.ObjectId(userId) },
          {
            kycOnlineAPI: 1,
            kycStatusDetail: 1,
            kycOnline: 1,
            kycOffline: 1,
          }
        );
        if (usersData.status === false) {
          return res.json({
            status: false,
            message: "Oops! Something went wrong.Please try again",
          });
        }
        if (!aadhaarOtp || aadhaarOtp == "") {
          return res.json({ status: false, message: "Please enter valid OTP" });
        } else if (usersData.status === true) {
          usersData = usersData.msg;
          const kycOnlineAPI = usersData.kycOnlineAPI
            ? usersData.kycOnlineAPI
            : {};

          // aadhaar_details full_name

          if (kycOnlineAPI.aadhaarClientId) {
            const aadhaarClientId = kycOnlineAPI.aadhaarClientId;
            const options = {
              method: "POST",
              url: era_domain + aadhaarV2SubmitOtp,
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + kycToken,
              },
              body: JSON.stringify({
                client_id: aadhaarClientId,
                otp: aadhaarOtp,
                // "mobile_number": "9988776655"
              }),
            };
            request(options, async function (error, response) {
              try {
                if (response.body) {
                  const resp = JSON.parse(response.body);

                  if (resp.data == null) {
                    return res.json({
                      status: false,
                      message: "Oops! Something went wrong.Please try again",
                    });
                  } else if (
                    !resp.data.aadhaar_number ||
                    resp.data.aadhaar_number === null
                  ) {
                    return res.json({
                      status: false,
                      message: "OTP Invalid. Please Check your OTP.",
                    });
                  } else if (resp.data.aadhaar_number !== null) {
                    const aadhaarClientId = resp.data.client_id;
                    let updValues = {};
                    updValues["kycMode"] = "Online";
                    updValues["kycOnlineAPI.aadhaarClientId"] = 0;
                    updValues["kycOnline.aadhaar.number"] =
                      resp.data.aadhaar_number;
                    updValues["kycOnline.aadhaar.details"] = resp.data;

                    updValues["kycStatusDetail.aadhaar.mode"] = "Online";

                    updValues["kycOnline.aadhaar.status"] = 1;
                    updValues["kycStatusDetail.aadhaar.status"] = 1;

                    if (usersData.kycStatusDetail.pan.status != 1) {
                      return res.json({
                        status: false,
                        usersData,
                        message: "Pan not verified",
                      });
                    }

                    let panName = "";
                    if (usersData.kycStatusDetail.pan.mode == "Online") {
                      panName = usersData.kycOnline.pan.details.full_name;
                    } else if (
                      usersData.kycStatusDetail.pan.mode == "Offline"
                    ) {
                      panName = usersData.kycOffline.pan.details.full_name;
                    }

                    const aadhaarName = resp.data.full_name
                      ? resp.data.full_name
                      : "";

                    if (panName == "") {
                      return res.json({
                        status: false,
                        message: "Pan not verified",
                      });
                    }

                    let panNameChk = panName
                      ? panName.replace(/ /g, "").replace(/\./g, "")
                      : "";
                    panNameChk = panNameChk.toLowerCase();

                    let aadhaarNameChk = aadhaarName
                      ? aadhaarName.replace(/ /g, "").replace(/\./g, "")
                      : "";
                    aadhaarNameChk = aadhaarNameChk.toLowerCase();

                    if (panNameChk != aadhaarNameChk || aadhaarNameChk == "") {
                      updValues["kycstatus"] = 0;
                      updValues["kycOnline.aadhaar.status"] = 0;
                      updValues["kycStatusDetail.aadhaar.status"] = 0;
                      // return res.json({ status: false, message: "rejected" });
                    }

                    // return res.json({ status: false, message: "testing" });

                    if (resp.data.profile_image) {
                      const base64Str_profileimage =
                        "data:image/png;base64," + resp.data.profile_image;

                      const uploadResponse = await cloudinary.v2uploads(
                        base64Str_profileimage,
                        {}
                      );
                      const secure_url =
                        uploadResponse && uploadResponse.secure_url
                          ? uploadResponse.secure_url
                          : "";
                      updValues["kycOnline.aadhaar.image"] = secure_url;

                      const image_path = "./public/aadhaar_image/";
                      const imageInfo = base64ToImage(
                        base64Str_profileimage,
                        image_path,
                        {}
                      ); // optionalObj
                      const fileName =
                        imageInfo && imageInfo.fileName
                          ? imageInfo.fileName
                          : "";
                      updValues["kycOnline.aadhaar.image_local"] = fileName;
                    } else {
                      return res.json({
                        status: false,
                        message: "Oops! Something went wrong.Please try again",
                      });
                    }

                    await query_helper.updateData(
                      Users,
                      "one",
                      { _id: mongoose.Types.ObjectId(userId) },
                      updValues
                    );
                    return res.json({
                      status: true,
                      message: "Aadhaar verification successfully completed.",
                    });
                  } else {
                    return res.json({
                      status: false,
                      message: "Oops! Something went wrong.Please try again",
                    });
                  }
                } else {
                  return res.json({
                    status: false,
                    message: "Oops! Something went wrong.Please try again",
                  });
                }
              } catch (err) {
                console.log({ err });
                return res.json({
                  status: false,
                  message: "Oops! Something went wrong.Please try again",
                });
              }
            });
          }
        }
      } else {
        return res.json({
          status: false,
          message: "Oops! Something went wrong.Please try again",
        });
      }
    } catch (e) {
      console.log("verifyAadhaar 1", e);
      return res.json({
        status: false,
        message: "Oops! Something went wrong.Please try again",
      });
    }
  },
  async verifySelfieOnline(req, res) {
    try {
      let { files: file = [], query: reqQuery = {} } = req;

      const { type = "selfieSubmit" } = reqQuery;

      if (!file || !file[0]) {
        return res.json({
          status: true,
          message:
            "Please choose your selfie image to submit for selfie verification.",
        });
      }

      const { filename, mimetype } = file[0];
      const filePath = "./" + file[0].path;

      const { body: reqBody = {}, userId = "" } = req;

      const {
        era_domain = "",
        token: kycToken = "",
        faceMatch = "",
      } = config.kyc;

      const findUser = {
        _id: {
          $eq: mongoose.Types.ObjectId(userId),
        },
      };
      let userData = await query_helper.findoneData(Users, findUser, {});
      let aadhaar_status = 3;
      let aadhaar_image_local = "";

      if (userData && userData.msg && userData.msg.kycOnline) {
        userData = userData.msg;

        if (userData.kycStatusDetail.aadhaar.status != 1) {
          return res.json({
            status: false,
            userData,
            message: "Aadhaar not verified",
          });
        }

        aadhaar_status = userData.kycStatusDetail.aadhaar.status;

        if (userData.kycStatusDetail.aadhaar.mode == "Online") {
          aadhaar_image_local = userData.kycOnline.aadhaar.image_local
            ? userData.kycOnline.aadhaar.image_local
            : "";
        } else if (userData.kycStatusDetail.aadhaar.mode == "Offline") {
          aadhaar_image_local = userData.kycOffline.aadhaar.image_local
            ? userData.kycOffline.aadhaar.image_local
            : "";
        }
      }

      if (aadhaar_image_local == "") {
        return res.json({
          status: false,
          userData,
          message:
            "Please complete your aadhaar verification then only you will verify selfie.",
        });
      }

      const urls = await kycController.updateImages(req, res);

      const selfie_img = fs.createReadStream(filePath);
      const id_card_img = fs.createReadStream(
        "./public/aadhaar_image/" + aadhaar_image_local
      );

      const aadhaar_image_arr = aadhaar_image_local.split(".");

      const id_card_filename = aadhaar_image_local;
      let id_card_mimetype = "image/";

      if (aadhaar_image_arr && aadhaar_image_arr > 0) {
        id_card_mimetype =
          id_card_mimetype + aadhaar_image_arr[aadhaar_image_arr.length - 1];
      }

      const options = {
        method: "POST",
        url: era_domain + faceMatch,
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: "Bearer " + kycToken,
        },
        formData: {
          selfie: {
            value: selfie_img,
            options: {
              filename: filename,
              contentType: mimetype,
            },
          },
          id_card: {
            value: id_card_img,
            options: {
              filename: id_card_filename,
              contentType: id_card_mimetype,
            },
          },
        },
      };

      request(options, async function (error, response) {
        try {
          if (response) {
            const resp = JSON.parse(response.body);
            if (resp && resp.data && resp.data.confidence != undefined) {
              const confidence = resp.data.confidence;

              if (confidence >= 65 || type === "selfieSubmit") {
                let updValues = {};
                updValues["kycMode"] = "Online";
                updValues["kycOnline.selfie.image_local"] = filename;
                updValues["kycOnline.selfie.image"] =
                  urls && urls[0] && urls[0].location ? urls[0].location : "";
                updValues["kycOnline.selfie.details"] = resp.data;
                if (confidence >= 65) {
                  updValues["level"] = 2;
                  updValues["kycstatus"] = 1;
                  updValues["kycOnline.selfie.status"] = 1;
                  updValues["kycStatusDetail.selfie.status"] = 1;
                  updValues["kycStatusDetail.selfie.mode"] = "Online";

                  const filePathAadhaar = "./public/aadhaar_image/" + aadhaar_image_local;
                  await fs.unlinkSync(filePathAadhaar);
                  const filePathSelfie = "./public/userSelfie/" + filename;
                  await fs.unlinkSync(filePathSelfie);

                } else {
                  // updValues['kycOnline.selfie.status'] = 3;
                  // updValues['kycStatusDetail.selfie.status'] = 3;
                  // updValues['kycStatusDetail.selfie.mode'] = "Online";

                  updValues["kycstatus"] = 0;
                  updValues["kycMode"] = "Online";
                  updValues["kycOnline.selfie.status"] = 0;

                  updValues["kycStatusDetail.selfie.status"] = 0;
                  updValues["kycStatusDetail.selfie.mode"] = "Online";
                }
                await query_helper.updateData(
                  Users,
                  "one",
                  { _id: mongoose.Types.ObjectId(userId) },
                  updValues
                );
                let users = await query_helper.findoneData(
                  Users,
                  { _id: mongoose.Types.ObjectId(userId) },
                  {}
                );
                kycController.afterKYCApproval({
                  users,
                  req,
                  userId,
                });
                return res.json({
                  status: true,
                  message: "Selfie verification successfully completed.",
                });
              } else {
                return res.json({
                  status: false,
                  message: "Please choose your correct selfie image.",
                  uploadedChk: true,
                });
              }
            }
            return res.json({
              status: false,
              resp,
              message: "Oops! Something went wrong.Please try again",
            });
          } else {
            console.log("error : ", error);
            return res.json({
              status: false,
              message:
                "Something went wrong. Please try again & Upload correct image",
              file: file,
              response: response,
            });
          }
        } catch (e) {
          console.log("verifySelfie 2", e);
          return res.json({
            status: false,
            message: "Oops! Something went wrong.Please try again",
          });
        }
      });
    } catch (e) {
      console.log("verifySelfie 1", e);
      res.json({
        status: false,
        message: "Oops! Something went wrong.Please try again",
      });
    }
  },
  async verifySelfieFromAdminOnline(req, res) {
    try {
      const { userId = "" } = req;

      const findUser = {
        _id: {
          $eq: mongoose.Types.ObjectId(userId),
        },
      };
      const userData = await query_helper.findoneData(Users, findUser, {});

      let kycstatus = 3;
      let selfie_status = 3;

      if (
        userData &&
        userData.msg &&
        userData.msg.kycOnline &&
        userData.msg.kycOnline.selfie.details &&
        userData.msg.kycOnline.selfie.details.confidence != undefined
      ) {
        selfie_status = userData.msg.kycOnline.selfie.status;
        kycstatus = userData.msg.kycstatus;

        if (kycstatus === 1) {
          return res.json({
            status: false,
            message: "Already KYC verification completed",
          });
        }

        if (selfie_status == 0) {
          return res.json({
            status: false,
            message: "Selfie vefication already sent.",
          });
        } else if (selfie_status == 1) {
          return res.json({
            status: false,
            message: "Already selfiecation completed",
          });
        } else if (selfie_status == 2) {
          return res.json({
            status: false,
            message: "Please choose your correct selfie image",
          });
        } else if (selfie_status === 3) {
          let updValues = {};
          updValues["kycstatus"] = 0;
          updValues["kycMode"] = "Online";
          updValues["kycOnline.selfie.status"] = 0;

          updValues["kycStatusDetail.selfie.status"] = 0;
          updValues["kycStatusDetail.selfie.mode"] = "Online";

          await query_helper.updateData(
            Users,
            "one",
            { _id: mongoose.Types.ObjectId(userId) },
            updValues
          );
          return res.json({
            status: true,
            message: "Selfie verification submitted",
          });
        }
      } else {
        return res.json({
          status: false,
          message: "Oops! Something went wrong.Please try again",
        });
      }
    } catch (e) {
      console.log("verifySelfie 1", e);
      res.json({
        status: false,
        message: "Oops! Something went wrong.Please try again",
      });
    }
  },
  // Offline
  async verifyPanOffline(req, res) {
    try {
      const urls = await kycController.updateImages(req, res);
      const { body: reqBody = {}, userId = "", reqUserData = {} } = req;
      const { type = "", pan_number = "", pan_name: full_name = "" } = reqBody;

      const kycUserType = (reqUserData && reqUserData.country && reqUserData.country == "IND") ? reqUserData.country : "International";

      const sectionType = kycUserType === "IND" ? "pan" : "passport";

      let errMsg = {};
      if(sectionType === "pan") {
        errMsg = {
          required: "Please enter your pan number",
          already: "Pan number already exists"
        };
      }
      else {
        errMsg = {
          required: "Please enter your passport number",
          already: "Passport number already exists"
        };
      }

      const pan_details = {
        full_name,
      };

      if (type == "panVerify") {
        const pan_image =
          urls && urls[0] && urls[0].location ? urls[0].location : "";

        if (pan_image == "") {
          return res.json({
            status: false,
            message: errMsg.required
          });
        }

        let findAlready = {
          _id: {
            $ne: mongoose.Types.ObjectId(userId),
          },
        };
        findAlready["$or"] = [
          {
            "kycOnline.pan.number": pan_number,
            "kycOnline.pan.status": { $ne: 2 },
          },
          {
            "kycOffline.pan.number": pan_number,
            "kycOffline.pan.status": { $ne: 2 },
          },
          // {
          //   "kycV1.details.pan_number": pan_number,
          //   "kycV1.details.pan_status": { $eq: "2" },
          // },
        ];
        let alreadyChk = await query_helper.findoneData(Users, findAlready, {});
        if (alreadyChk.status === true && alreadyChk.msg) {
          return res.json({
            status: false,
            message: errMsg.already
          });
        }

        let usersData = await query_helper.findoneData(
          Users,
          { _id: mongoose.Types.ObjectId(userId) },
          {}
        );
        if (usersData.status === false) {
          return res.json({
            status: false,
            message: "Verification failed. Please check your verification detail.",
            // message: "Oops! Something went wrong. Please try again.",
          });
        } else if (usersData.status === true) {
          let updValues = {};
          updValues["username"] = pan_details.full_name
            ? pan_details.full_name.toLowerCase()
            : "";

          updValues["kycMode"] = "Offline";

          updValues["kycOffline.pan.number"] = pan_number;
          updValues["kycOffline.pan.details"] = pan_details;
          updValues["kycOffline.pan.status"] = 0;
          updValues["kycOffline.pan.image"] = pan_image;

          updValues["kycStatusDetail.pan.status"] = 0;
          updValues["kycStatusDetail.pan.mode"] = "Offline";

          updValues["kycstatus"] = 0;

          await query_helper.updateData(
            Users,
            "one",
            { _id: mongoose.Types.ObjectId(userId) },
            updValues
          );
          return res.json({
            status: true,
            message: "Your "+sectionType+" verification successfully submitted.",
          });
        }
      }
    } catch (e) {
      console.log("verifyAadhaar 1", e);
      res.json({
        status: false,
        message: "Oops! Something went wrong.Please try again",
      });
    }
  },
  async verifyAadhaarOffline(req, res) {
    try {
      var file = req.files;

      const { body: reqBody = {}, userId = "", reqUserData = {} } = req;

      const kycUserType = (reqUserData && reqUserData.country && reqUserData.country == "IND") ? reqUserData.country : "International";

      const sectionType = kycUserType === "IND" ? "aadhaar" : "identity";

      let errMsg = {};
      if(sectionType === "aadhaar") {
        errMsg = {
          required: "Please enter your aadhaar number",
          already: "Aadhaar number already exists"
        };
      }
      else {
        errMsg = {
          required: "Please enter your identification number",
          already: "Identification number already exists"
        };
      }

      if (!file || !file[0]) {
        return res.json({
          status: true,
          message:
            "Please choose your "+sectionType+" image to submit for "+sectionType+" verification.",
        });
      }

      let aadhaar_image_local = "";
      const { filename } = file[0];
      aadhaar_image_local = filename;

      if (!file[1]) {
        const filePathFront = "./" + file[0].path;
        await fs.unlinkSync(filePathFront);
        return res.json({
          status: true,
          message:
            "Please choose your "+sectionType+" back image to submit for "+sectionType+" verification.",
        });
      }
      const { filename: aadhaar_image_back_local } = file[1];

      const urls = await kycController.updateImages(req, res);
      const filePathBack = "./" + file[1].path;
      await fs.unlinkSync(filePathBack);

      const {
        type = "",
        aadhaar_number = "",
        aadhaar_name: full_name = "",
        aadhaar_address: address = "",
        aadhaar_pincode: pincode = "",
      } = reqBody;

      const aadhaar_details = {
        full_name,
        address,
        pincode,
      };

      if (type == "aadhaarVerify") {
        const aadhaar_image =
          urls && urls[0] && urls[0].location ? urls[0].location : "";
        if (aadhaar_image == "") {
          return res.json({
            status: false,
            message: "Please select your "+sectionType+" front image.",
          });
        }

        const aadhaar_image_back =
          urls[1] && urls[1].location ? urls[1].location : "";
        if (aadhaar_image_back == "") {
          return res.json({
            status: false,
            message: "Please select your "+sectionType+" back image.",
          });
        }

        let findAlready = {
          _id: {
            $ne: mongoose.Types.ObjectId(userId),
          },
        };
        findAlready["$or"] = [
          {
            "kycOnline.aadhaar.number": aadhaar_number,
            "kycOnline.aadhaar.status": { $ne: 2 },
          },
          {
            "kycOffline.aadhaar.number": aadhaar_number,
            "kycOffline.aadhaar.status": { $ne: 2 },
          },
          // {
          //   "kycV1.details.id_number": aadhaar_number,
          //   "kycV1.details.id_status": { $eq: "2" },
          // },
        ];
        let alreadyChk = await query_helper.findoneData(Users, findAlready, {});
        if (alreadyChk.status === true && alreadyChk.msg) {
          return res.json({
            status: false,
            message: errMsg.already
          });
        }

        let usersData = await query_helper.findoneData(
          Users,
          { _id: mongoose.Types.ObjectId(userId) },
          {}
        );
        if (usersData.status === false) {
          return res.json({
            status: false,
            message: "Oops! Something went wrong. Please try again",
          });
        } else if (usersData.status === true) {
          let updValues = {};
          updValues["kycMode"] = "Offline";

          updValues["kycOffline.aadhaar.number"] = aadhaar_number;
          updValues["kycOffline.aadhaar.details"] = aadhaar_details;
          updValues["kycOffline.aadhaar.image"] = aadhaar_image;
          updValues["kycOffline.aadhaar.image_local"] = aadhaar_image_local;
          updValues["kycOffline.aadhaar.image_back"] = aadhaar_image_back;
          updValues["kycOffline.aadhaar.status"] = 0;

          updValues["kycStatusDetail.aadhaar.status"] = 0;
          updValues["kycStatusDetail.aadhaar.mode"] = "Offline";

          updValues["kycstatus"] = 0;

          await query_helper.updateData(
            Users,
            "one",
            { _id: mongoose.Types.ObjectId(userId) },
            updValues
          );
          return res.json({
            status: true,
            message: "Your "+sectionType+" verification successfully submitted.",
          });
        }
      }
    } catch (e) {
      console.log("verifyAadhaar 1", e);
      res.json({
        status: false,
        message: "Oops! Something went wrong. Please try again.",
      });
    }
  },
  async verifySelfieOffline(req, res) {
    try {
      const urls = await kycController.updateImages(req, res);
      const { body: reqBody = {}, userId = "", query = {}, reqUserData = {} } = req;
      const { type = "" } = query;

      const sectionType = "selfie";

      if (type == "selfieVerify") {
        const selfie_image =
          urls && urls[0] && urls[0].location ? urls[0].location : "";

        if (selfie_image == "") {
          return res.json({
            status: false,
            message: "Please select your "+sectionType+" image.",
          });
        }

        let usersData = await query_helper.findoneData(
          Users,
          { _id: mongoose.Types.ObjectId(userId) },
          {}
        );

        if (usersData.status === false) {
          return res.json({
            status: false,
            message: "Oops! Something went wrong. Please try again",
          });
        } else if (usersData.status === true) {
          let updValues = {};
          updValues["kycMode"] = "Offline";
          updValues["kycstatus"] = 0;

          updValues["kycOffline.selfie.image"] = selfie_image;
          updValues["kycOffline.selfie.status"] = 0;

          updValues["kycStatusDetail.selfie.status"] = 0;
          updValues["kycStatusDetail.selfie.mode"] = "Offline";

          await query_helper.updateData(
            Users,
            "one",
            { _id: mongoose.Types.ObjectId(userId) },
            updValues
          );
          return res.json({
            status: true,
            message: "Your "+sectionType+" verification successfully submitted.",
          });
        }
      }
    } catch (e) {
      console.log("verifySelfie offline", e);
      res.json({
        status: false,
        message: "Oops! Something went wrong.Please try again",
      });
    }
  },
  // After KYC
  async afterKYCApproval(data = {}) {
    try {
      const { users = {}, req = {}, userId: login_userId = "" } = data;
      if (login_userId) {
        await common.adminactivtylog(
          req,
          "User KYC Approve",
          login_userId,
          mongoose.Types.ObjectId(login_userId),
          "User KYC Approve",
          "User KYC Approve Successfully!"
        );
      }

      const parentUserType = users.msg.referUser ? "user" : "promoter";
      const parentUserId = users.msg.referUser
        ? users.msg.referUser
        : users.msg.referPromoter;

      if (users.msg && users.msg.registerBonusStatus == 0) {
        const resData = await query_helper.findoneData(SiteSettings, {}, {});
        if (resData.status) {
          const referralBonusCurrency = resData.msg.referralBonusCurrency;
          if (referralBonusCurrency != "") {
            const currencyData = await query_helper.findoneData(
              Currency,
              { _id: referralBonusCurrency },
              {}
            );
            if (currencyData.status) {
              const currencyId = currencyData.msg.currencyId;

              let dbDate = new Date();
              if (
                typeof resData.msg.registerBonusDate == "string" &&
                resData.msg.registerBonusDate != ""
              ) {
                dbDate = new Date(resData.msg.registerBonusDate);
              }
              let registerOn = new Date(users.msg.registerOn);
              if (registerOn.getTime() <= dbDate.getTime()) {
                if (resData.msg.registerBonusStatus === 1) {
                  if (resData.msg.registerBonus > 0) {
                    let registerBonus = +resData.msg.registerBonus;

                    let VoucherInsert = {
                      userId: login_userId,
                      childUserId: login_userId,
                      type: "KYC Bonus",
                      voucherType: "tradeFee",
                      currencyId: currencyId,
                      amount: registerBonus,
                      balance: registerBonus,
                      beforeAmount: 0,
                      afterAmount: 0,
                      claim: 0,
                      expirePeriod: resData.msg.bonusExpiredPeriod,
                      expirePeriodType: "days",
                      givenDate: new Date(),
                    };
                    if (parentUserId) {
                      VoucherInsert.parentUserId = parentUserId;
                      VoucherInsert.parentUserType = parentUserType;
                    }
                    await query_helper.insertData(VoucherDB, VoucherInsert);

                    await query_helper.updateData(
                      Users,
                      "one",
                      { _id: mongoose.Types.ObjectId(login_userId) },
                      { registerBonusStatus: 1 }
                    );
                    const email_data = await query_helper.findoneData(
                      emailTemplate,
                      { hint: "registration-bonus" },
                      {}
                    );
                    const mailsendBonus = email_data.msg;
                    if (mailsendBonus && mailsendBonus.content) {
                      var etemplate = mailsendBonus.content
                        .replace(/###NAME###/g, users.msg.username)
                        .replace(
                          /###AMOUNT###/g,
                          resData.msg.registerBonus +
                            " " +
                            currencyData.msg.currencySymbol
                        );
                      const subject = mailsendBonus.subject.replace(
                        /###AMOUNT###/g,
                        resData.msg.registerBonus +
                          " " +
                          currencyData.msg.currencySymbol
                      );
                      mail_helper.sendMail(
                        {
                          subject: subject,
                          to: users.msg.email,
                          html: etemplate,
                        },
                        (mailresult) => {}
                      );
                    }
                  }
                }
                if (resData.msg.referralBonusStatus === 1) {
                  if (resData.msg.referralBonus > 0 && parentUserId != "") {
                    let referralBonus = +resData.msg.referralBonus;
                    let VoucherInsert = {
                      userId: parentUserId,
                      type: "referral bonus",
                      voucherType: "tradeFee",
                      currencyId: currencyId,
                      amount: referralBonus,
                      balance: referralBonus,
                      beforeAmount: 0,
                      afterAmount: 0,
                      claim: 0,
                      expirePeriod: resData.msg.bonusExpiredPeriod,
                      expirePeriodType: "days",
                      givenDate: new Date(),
                      parentUserId: parentUserId,
                      childUserId: login_userId,
                      parentUserType: parentUserType,
                    };
                    await query_helper.insertData(VoucherDB, VoucherInsert);
                  }
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("afterKYCApproval : err : ", err);
    }
    return true;
  },
};

module.exports = kycController;
