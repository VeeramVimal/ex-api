
let config = require("../Config/config");
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const smtpdetails = config.smtpDetails.keys;
const transporter = nodemailer.createTransport(smtpdetails);
const query_helper = require('../helpers/query');
const siteSettings = mongoose.model("SiteSettings");
module.exports = {
	sendMail: async function (values, callback) {
		let admin = await query_helper.findoneData(siteSettings, {}, {})
		const nDate = new Date().toLocaleString('en-US', {
			timeZone: 'Asia/Calcutta'
		});
		let d1 = new Date(nDate);
		let dateInc = d1.getDate();
		let monthInc = d1.getMonth() + 1;
		let yearInc = d1.getFullYear();
		if (dateInc < 10) {
			dateInc = "0" + dateInc;
		}
		if (monthInc < 10) {
			monthInc = "0" + monthInc;
		}
		const setDate = dateInc + "." + monthInc + "." + yearInc;
		const setTime = ((d1.getHours() < 10) ? "0" : "") + d1.getHours() + ":" + ((d1.getMinutes() < 10) ? "0" : "") + d1.getMinutes() + ":" + ((d1.getSeconds() < 10) ? "0" : "") + d1.getSeconds();
		const configAdmin = admin.msg;
		values.html = values.html
			.replace(/###LOGO###/g, configAdmin.siteLogo)
			.replace(/###SITENAME###/g, configAdmin.siteName)
			.replace(/###SUPPORT###/g, configAdmin.supportEmail)
			.replace(/###COPYRIGHT###/g, configAdmin.copyRights)
			.replace(/###DATE###/g, setDate)
			.replace(/###TERMSURL###/g, config.frontEnd + 'assets/terms_condition.pdf')
			.replace(/###PRIVACY###/g, config.frontEnd + 'assets/privacy_policy.pdf');

		values.html = mailHTMLNew
			.replace(/###MAINCONTENT###/g, values.html)
			.replace(/###SITELINK###/g, config.frontEnd)
			.replace(/###GALLERYLINK###/g, config.galleryLink)
			.replace(/###FANTOKENSYMBOL###/g, config.FanTknSymbol)
			.replace(/###COPYRIGHT###/g, configAdmin.copyRights)
			.replace(/###FBLINK###/g, configAdmin.facebookLink)
			.replace(/###TWITTERLINK###/g, configAdmin.twitterLink)
			.replace(/###INSTALINK###/g, configAdmin.instagramLink)
			.replace(/###LINKEDIN###/g, configAdmin.linkedinLink)
			.replace(/undefined/g, "");

		values.subject = values.subject
			.replace(/###SITENAME###/g, configAdmin.siteName)
			.replace(/undefined/g, configAdmin.siteName);

		let mailOptions = {
			from: config.smtpDetails.email,
			to: values.to,
			subject: values.subject + ' @ ' + setDate + ' ' + setTime,
			html: values.html
		};

		if (typeof values.bcc == 'object' && values.bcc.length > 0) {
			let splitVal = chunk(values.bcc, 49);
			splitVal.forEach(element => {
				mailOptions.bcc = element;
				transporter.sendMail(mailOptions, function (error, info) {
					if (error) {
						console.log(error);
					}
				});
			});
		} else {
			transporter.sendMail(mailOptions, function (error, info) {
				if (error) {
					console.log(error);
				}
			});
		}
		callback(true);
	}
};
function chunk(arr, len) {
	var chunks = [],
		i = 0,
		n = arr.length;

	while (i < n) {
		chunks.push(arr.slice(i, i += len));
	}
	return chunks;
}

let mailHTMLNew = '<!DOCTYPE html><html lang="en" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml"><head><title></title><meta content="text/html; charset=utf-8" http-equiv="Content-Type"><meta content="width=device-width,initial-scale=1" name="viewport"><!--[if mso]><xml><o:officedocumentsettings><o:pixelsperinch>96</o:pixelsperinch><o:allowpng></o:officedocumentsettings></xml><![endif]--><!--[if !mso]><!--><link href="https://fonts.googleapis.com/css?family=Ubuntu" rel="stylesheet" type="text/css"><!--<![endif]--><style>*{box-sizing:border-box}body{margin:0;padding:0}a[x-apple-data-detectors]{color:inherit!important;text-decoration:inherit!important}#MessageViewBody a{color:inherit;text-decoration:none}p{line-height:inherit}.desktop_hide,.desktop_hide table{mso-hide:all;display:none;max-height:0;overflow:hidden}.menu_block.desktop_hide .menu-links span{mso-hide:all}@media (max-width:670px){.desktop_hide table.icons-inner{display:inline-block!important}.icons-inner{text-align:center}.icons-inner td{margin:0 auto}.image_block img.big,.row-content{width:100%!important}.mobile_hide{display:none}.stack .column{width:100%;display:block}.mobile_hide{min-height:0;max-height:0;max-width:0;overflow:hidden;font-size:0}.desktop_hide,.desktop_hide table{display:table!important;max-height:none!important}.reverse{display:table;width:100%}.reverse .column.first{display:block!important}.reverse .column.last{display:table-header-group!important}.row-4 td.column.first>table{padding-left:10px;padding-right:10px}.row-4 td.column.first .border,.row-4 td.column.last .border{border-top:0;border-right:0;border-bottom:0;border-left:0}.row-4 td.column.last>table{padding-left:15px;padding-right:15px}.textAlgn{text-align:center!important}.displayBlock{display:block;margin-left:auto;margin-right:auto}.displbutton1{display:block!important}.hideButtonAndtext{display:none}}</style></head><body style="background-color:#efddff;margin:0;padding:0;-webkit-text-size-adjust:none;text-size-adjust:none"><table border="0" cellpadding="0" cellspacing="0" class="nl-container" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;background-color:#efddff" width="100%"><tbody><tr><td><table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-1" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;background-color:#430a77;background-image:url(###GALLERYLINK###gallery/emailTempleteImg/Fondo_Footer_02_epsusv.png);background-position:top center;background-repeat:repeat;background-size:auto" width="100%"><tbody><tr><td><table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;background-size:auto;color:#000;width:650px" width="650"><tbody><tr><td class="column column-1" style="mso-table-lspace:0;mso-table-rspace:0;font-weight:400;text-align:left;vertical-align:top;padding-top:30px;padding-bottom:30px;border-top:0;border-right:0;border-bottom:0;border-left:0" width="100%"><table border="0" cellpadding="0" cellspacing="0" class="image_block block-1" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tr><td class="pad" style="width:100%;padding-right:0;padding-left:0"><div align="center" class="alignment" style="line-height:10px"><img alt="Your Logo" src="###GALLERYLINK###gallery/siteLogo.png" style="display:block;height:auto;border:0;width:135px;max-width:100%" title="Your Logo" width="135"></div></td></tr></table></td></tr></tbody></table></td></tr></tbody></table><table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-2" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;background-color:#430a77;background-size:auto" width="100%"><tbody><tr><td><table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;background-size:auto;color:#000;width:650px" width="650"><tbody><tr><td class="column column-1" style="mso-table-lspace:0;mso-table-rspace:0;font-weight:400;text-align:left;vertical-align:top;border-top:0;border-right:0;border-bottom:0;border-left:0" width="33.333333333333336%"></td><td class="column column-2" style="mso-table-lspace:0;mso-table-rspace:0;font-weight:400;text-align:left;vertical-align:top;border-top:0;border-right:0;border-bottom:0;border-left:0" width="66.66666666666667%"><table border="0" cellpadding="0" cellspacing="0" class="menu_block block-2" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tr><td class="pad" style="color:#fff;font-family:inherit;font-size:14px;text-align:right;padding-top:10px;padding-bottom:10px"><table border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tr><td class="alignment" style="text-align:right;font-size:0"><div class="menu-links"><a href="###SITELINK###my/wallet" style="padding-top:5px;padding-bottom:5px;padding-left:15px;padding-right:15px;display:inline-block;color:#fff;font-family:Ubuntu,Tahoma,Verdana,Segoe,sans-serif;font-size:14px;text-decoration:none;letter-spacing:normal">Your Wallet</a><!--[if mso]><td style="padding-top:5px;padding-right:15px;padding-bottom:5px;padding-left:15px"><![endif]--><!--[if mso]><td style="padding-top:5px;padding-right:15px;padding-bottom:5px;padding-left:15px"><![endif]--><a href="###SITELINK###spot/BTC_USDT" style="padding-top:5px;padding-bottom:5px;padding-left:15px;padding-right:15px;display:inline-block;color:#fff;font-family:Ubuntu,Tahoma,Verdana,Segoe,sans-serif;font-size:14px;text-decoration:none;letter-spacing:normal">Trades</a><!--[if mso]><![endif]--></div></td></tr></table></td></tr></table></td></tr></tbody></table></td></tr></tbody></table><table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-3" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;background-color:#efddff" width="100%"><tbody><tr><td><table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;color:#000;width:650px" width="650"><tbody><tr><td class="column column-1" style="mso-table-lspace:0;mso-table-rspace:0;font-weight:400;text-align:left;vertical-align:top;padding-top:5px;padding-bottom:5px;border-top:0;border-right:0;border-bottom:0;border-left:0" width="100%"><div class="spacer_block" style="height:40px;line-height:40px;font-size:1px"> </div></td></tr></tbody></table></td></tr></tbody></table><table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-4" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;background-color:#efddff" width="100%"><tbody><tr><td><table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;color:#000;width:650px" width="650"><tbody><tr class="reverse"><td class="column column-1 first" style="mso-table-lspace:0;mso-table-rspace:0;font-weight:400;text-align:left;padding-left:10px;padding-right:10px;vertical-align:top;border-top:0;border-right:0;border-bottom:0;border-left:0" width="50%"><div class="border"><table border="0" cellpadding="0" cellspacing="0" class="heading_block block-3" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tr><td class="pad" style="padding-bottom:5px;text-align:center;width:100%;padding-top:25px"><h2 style="margin:0;color:#5d85a9;direction:ltr;font-family:Ubuntu,Tahoma,Verdana,Segoe,sans-serif;font-size:26px;font-weight:700;letter-spacing:normal;line-height:120%;text-align:center;margin-top:0;margin-bottom:0"></h2></td></tr></table><table border="0" cellpadding="0" cellspacing="0" class="heading_block block-4" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tr><td class="pad" style="text-align:center;width:100%"><h1 style="margin:0;color:#18436a!important;direction:ltr;font-family:Ubuntu,Tahoma,Verdana,Segoe,sans-serif;font-size:15px;font-weight:700;letter-spacing:normal;line-height:120%;text-align:center;margin-top:0;margin-bottom:0"><span style="color:#18436a!important" class="tinyMce-placeholder">###MAINCONTENT###</span></h1></td></tr><tr><td class="pad" style="padding-bottom:5px;text-align:center;width:100%;padding-top:25px"><h2 style="margin:0;color:#5d85a9;direction:ltr;font-family:Ubuntu,Tahoma,Verdana,Segoe,sans-serif;font-size:26px;font-weight:700;letter-spacing:normal;line-height:120%;text-align:center;margin-top:0;margin-bottom:0"></h2></td></tr><tr><td width="100%" valign="middle" style="color:#b11717;font-family:Helvetica,Arial,sans-serif,Open Sans;padding:13px;font-size:12px;font-weight:400;line-height:24px;text-align:center;text-transform:none" class="openSans fullLeft">Important Note: Do not share OTP/2FA Code with anyone else. No one from Exchange ever asks OTP/2FA Code.</td></tr></table><table border="0" cellpadding="0" cellspacing="0" class="paragraph_block block-5" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;word-break:break-word" width="100%"><tr><td class="pad" style="padding-bottom:10px;padding-top:10px"><div style="color:#5d85a9;direction:ltr;font-family:Ubuntu,Tahoma,Verdana,Segoe,sans-serif;font-size:16px;font-weight:400;letter-spacing:0;line-height:150%;text-align:left;mso-line-height-alt:24px"><p style="margin:0">.</p></div></td></tr></table></div></td><td class="column column-2 last" style="mso-table-lspace:0;mso-table-rspace:0;font-weight:400;text-align:left;padding-left:15px;padding-right:15px;vertical-align:top;border-top:0;border-right:0;border-bottom:0;border-left:0" width="50%"><div class="border"><table border="0" cellpadding="0" cellspacing="0" class="image_block block-2" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tr><td class="pad" style="width:100%;padding-right:0;padding-left:0;padding-top:5px;padding-bottom:5px"><div align="center" class="alignment" style="line-height:10px"><img alt="Main Image Crypto" src="###GALLERYLINK###gallery/emailTempleteImg/Main_Image_01_ppswcq.png" style="display:block;height:auto;border:0;width:295px;max-width:100%" title="Main Image Crypto" width="295"></div></td></tr></table></div></td></tr></tbody></table></td></tr></tbody></table><table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-5" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;background-color:#efddff" width="100%"><tbody><tr><td><table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;color:#000;width:650px" width="650"><tbody><tr><td class="column column-1" style="mso-table-lspace:0;mso-table-rspace:0;font-weight:400;text-align:left;vertical-align:top;padding-top:5px;padding-bottom:0;border-top:0;border-right:0;border-bottom:0;border-left:0" width="100%"><table border="0" cellpadding="0" cellspacing="0" class="image_block block-2" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tr><td class="pad" style="width:100%;padding-right:0;padding-left:0;padding-top:20px"><div align="center" class="alignment" style="line-height:10px"><img class="big" src="###GALLERYLINK###gallery/emailTempleteImg/SruNln_ttsi8r.png" style="display:block;height:auto;border:0;width:650px;max-width:100%" width="650"></div></td></tr></table></td></tr></tbody></table></td></tr></tbody></table><table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-6" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;background-color:#efddff" width="100%"><tbody><tr><td><table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;background-color:#fff;color:#000;width:650px" width="650"><tbody><tr><td class="column column-1" style="mso-table-lspace:0;mso-table-rspace:0;font-weight:400;text-align:left;vertical-align:top;padding-top:5px;padding-bottom:5px;border-top:0;border-right:0;border-bottom:0;border-left:0" width="100%"><table border="0" cellpadding="0" cellspacing="0" class="divider_block block-2" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tr><td class="pad" style="padding-bottom:10px;padding-left:10px;padding-right:10px;padding-top:35px"><div align="center" class="alignment"><table border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="15%"><tr><td class="divider_inner" style="font-size:1px;line-height:1px;border-top:5px solid #cdaaef"><span> </span></td></tr></table></div></td></tr></table><table border="0" cellpadding="0" cellspacing="0" class="heading_block block-3" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tr><td class="pad" style="text-align:center;width:100%"><h1 style="margin:0;color:#18436a;direction:ltr;font-family:Ubuntu,Tahoma,Verdana,Segoe,sans-serif;font-size:24px;font-weight:700;letter-spacing:1px;line-height:120%;text-align:center;margin-top:0;margin-bottom:0"><span class="tinyMce-placeholder">HIGHLIGHTS</span></h1></td></tr></table><table border="0" cellpadding="0" cellspacing="0" class="paragraph_block block-4" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;word-break:break-word" width="100%"><tr><td class="pad" style="padding-bottom:35px;padding-left:20px;padding-right:20px;padding-top:10px"><div style="color:#5d85a9;direction:ltr;font-family:Ubuntu,Tahoma,Verdana,Segoe,sans-serif;font-size:14px;font-weight:400;letter-spacing:0;line-height:150%;text-align:center;mso-line-height-alt:21px"><p style="margin:0">Crypto Exchange is an advanced trading platform that facilitates in buying, selling and trading of virtual assets using fiat currency as well as other digital assets. Built on by experts with immense knowledge in cryptocurrencies trading,.</p></div></td></tr></table></td></tr></tbody></table></td></tr></tbody></table><table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-7" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tbody><tr><td><table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;color:#000;width:650px" width="650"><tbody><tr><td class="column column-1" style="mso-table-lspace:0;mso-table-rspace:0;font-weight:400;text-align:left;background-color:#fff7e2;padding-left:20px;padding-right:20px;vertical-align:top;border-top:0;border-right:0;border-bottom:0;border-left:0" width="33.333333333333336%"><table border="0" cellpadding="0" cellspacing="0" class="image_block block-2" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tr><td class="pad" style="width:100%;padding-right:0;padding-left:0;padding-top:20px"><div align="left" class="alignment" style="line-height:10px"><img class="displayBlock" alt="Icon Of Coin" src="###GALLERYLINK###gallery/emailTempleteImg/BITCOIN_new_icon_crypto_fjpz3d.png" style="display:block;height:auto;border:0;width:106px;max-width:100%" title="Icon Of Coin" width="106"></div></td></tr></table><table border="0" cellpadding="0" cellspacing="0" class="heading_block block-4" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tr><td class="pad" style="text-align:center;width:100%;padding-top:20px"><h3 class="textAlgn" style="margin:0;color:#18436a;direction:ltr;font-family:Ubuntu,Tahoma,Verdana,Segoe,sans-serif;font-size:20px;font-weight:700;letter-spacing:normal;line-height:120%;text-align:left;margin-top:0;margin-bottom:0"><span class="tinyMce-placeholder">BITCOIN</span></h3></td></tr></table><table border="0" cellpadding="0" cellspacing="0" class="heading_block block-5" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tr><td class="pad" style="text-align:center;width:100%"><h3 class="textAlgn" style="margin:0;color:#5d85a9;direction:ltr;font-family:Ubuntu,Tahoma,Verdana,Segoe,sans-serif;font-size:15px;font-weight:400;letter-spacing:normal;line-height:120%;text-align:left;margin-top:0;margin-bottom:0"><span class="tinyMce-placeholder">BTC/USDT</span></h3></td></tr></table><table border="0" cellpadding="0" cellspacing="0" class="button_block block-10" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tr><td class="pad" style="padding-bottom:20px;padding-top:20px;text-align:left"><div align="left" class="alignment"><!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="###SITELINK###" style="height:28px;width:113px;v-text-anchor:middle" arcsize="36%" stroke="false" fillcolor="#6310b2"><w:anchorlock><v:textbox inset="0px,0px,0px,0px"><center style="color:#fff;font-family:Tahoma,Verdana,sans-serif;font-size:14px"><![endif]--><a class="displbutton1" href="###SITELINK###spot/BTC_USDT" style="text-decoration:none;display:inline-block;color:#fff;background-color:#ffc107;border-radius:10px;width:auto;border-top:1px solid #ffc107;font-weight:400;border-right:1px solid #ffc107;border-bottom:1px solid #ffc107;border-left:1px solid #ffc107;padding-top:0;padding-bottom:0;font-family:Ubuntu,Tahoma,Verdana,Segoe,sans-serif;text-align:center;mso-border-alt:none;word-break:keep-all" target="_blank"><span style="padding-left:15px;padding-right:15px;font-size:14px;display:inline-block;letter-spacing:normal"><span style="word-break:break-word"><span data-mce-style="" style="line-height:28px">SELL OR BUY</span></span></span></a><!--[if mso]><![endif]--></div></td></tr></table></td><td class="column column-2" style="mso-table-lspace:0;mso-table-rspace:0;font-weight:400;text-align:left;background-color:#dff6ef;padding-left:20px;padding-right:20px;vertical-align:top;border-top:0;border-right:0;border-bottom:0;border-left:0" width="33.333333333333336%"><table border="0" cellpadding="0" cellspacing="0" class="image_block block-2" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tr><td class="pad" style="width:100%;padding-right:0;padding-left:0;padding-top:20px"><div align="left" class="alignment" style="line-height:10px"><img alt="Icon Of Coin" class="displayBlock" src="###GALLERYLINK###gallery/emailTempleteImg/TETHERicon_crypto__but9s5.png" style="display:block;height:auto;border:0;width:106px;max-width:100%" title="Icon Of Coin" width="106"></div></td></tr></table><table border="0" cellpadding="0" cellspacing="0" class="heading_block block-4" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tr><td class="pad" style="text-align:center;width:100%;padding-top:20px"><h3 class="textAlgn" style="margin:0;color:#18436a;direction:ltr;font-family:Ubuntu,Tahoma,Verdana,Segoe,sans-serif;font-size:20px;font-weight:700;letter-spacing:normal;line-height:120%;text-align:left;margin-top:0;margin-bottom:0"><span class="tinyMce-placeholder">TETHER</span></h3></td></tr></table><table border="0" cellpadding="0" cellspacing="0" class="heading_block block-5" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tr><td class="pad" style="text-align:center;width:100%"><h3 class="textAlgn" style="margin:0;color:#5d85a9;direction:ltr;font-family:Ubuntu,Tahoma,Verdana,Segoe,sans-serif;font-size:15px;font-weight:400;letter-spacing:normal;line-height:120%;text-align:left;margin-top:0;margin-bottom:0"><span class="tinyMce-placeholder">###FANTOKENSYMBOL###/USDT</span></h3></td></tr></table><table border="0" cellpadding="0" cellspacing="0" class="button_block block-10" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tr><td class="pad" style="padding-bottom:20px;padding-top:20px;text-align:left"><div align="left" class="alignment"><!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="###SITELINK###" style="height:28px;width:113px;v-text-anchor:middle" arcsize="36%" stroke="false" fillcolor="#6310b2"><w:anchorlock><v:textbox inset="0px,0px,0px,0px"><center style="color:#fff;font-family:Tahoma,Verdana,sans-serif;font-size:14px"><![endif]--><a class="displbutton1" href="###SITELINK###spot/###FANTOKENSYMBOL###_USDT" style="text-decoration:none;display:inline-block;color:#fff;background-color:#ffc107;border-radius:10px;width:auto;border-top:1px solid #ffc107;font-weight:400;border-right:1px solid #ffc107;border-bottom:1px solid #ffc107;border-left:1px solid #ffc107;padding-top:0;padding-bottom:0;font-family:Ubuntu,Tahoma,Verdana,Segoe,sans-serif;text-align:center;mso-border-alt:none;word-break:keep-all" target="_blank"><span style="padding-left:15px;padding-right:15px;font-size:14px;display:inline-block;letter-spacing:normal"><span style="word-break:break-word"><span data-mce-style="" style="line-height:28px">SELL OR BUY</span></span></span></a><!--[if mso]><![endif]--></div></td></tr></table></td><td class="column column-3" style="mso-table-lspace:0;mso-table-rspace:0;font-weight:400;text-align:left;background-color:#d6e9ff;padding-left:20px;padding-right:20px;vertical-align:top;border-top:0;border-right:0;border-bottom:0;border-left:0" width="33.333333333333336%"><table border="0" cellpadding="0" cellspacing="0" class="image_block block-2" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tr><td class="pad" style="width:100%;padding-right:0;padding-left:0;padding-top:20px"><div align="left" class="alignment" style="line-height:10px"><img alt="Icon Of Coin" class="displayBlock" src="###GALLERYLINK###gallery/emailTempleteImg/ETHERUMicon_crypto__bmpmbo.png" style="display:block;height:auto;border:0;width:106px;max-width:100%" title="Icon Of Coin" width="106"></div></td></tr></table><table border="0" cellpadding="0" cellspacing="0" class="heading_block block-4" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tr><td class="pad" style="text-align:center;width:100%;padding-top:20px"><h3 class="textAlgn" style="margin:0;color:#18436a;direction:ltr;font-family:Ubuntu,Tahoma,Verdana,Segoe,sans-serif;font-size:20px;font-weight:700;letter-spacing:normal;line-height:120%;text-align:left;margin-top:0;margin-bottom:0"><span class="tinyMce-placeholder">ETHERUM</span></h3></td></tr></table><table border="0" cellpadding="0" cellspacing="0" class="heading_block block-5" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tr><td class="pad" style="text-align:center;width:100%"><h3 class="textAlgn" style="margin:0;color:#5d85a9;direction:ltr;font-family:Ubuntu,Tahoma,Verdana,Segoe,sans-serif;font-size:15px;font-weight:400;letter-spacing:normal;line-height:120%;text-align:left;margin-top:0;margin-bottom:0"><span class="tinyMce-placeholder">ETH/USDT</span></h3></td></tr></table><table border="0" cellpadding="0" cellspacing="0" class="button_block block-10" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tr><td class="pad" style="padding-bottom:20px;padding-top:20px;text-align:left"><div align="left" class="alignment"><!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="###SITELINK###" style="height:28px;width:113px;v-text-anchor:middle" arcsize="36%" stroke="false" fillcolor="#6310b2"><w:anchorlock><v:textbox inset="0px,0px,0px,0px"><center style="color:#fff;font-family:Tahoma,Verdana,sans-serif;font-size:14px"><![endif]--><a class="displbutton1" href="###SITELINK###spot/ETH_USDT" style="text-decoration:none;display:inline-block;color:#fff;background-color:#ffc107;border-radius:10px;width:auto;border-top:1px solid #ffc107;font-weight:400;border-right:1px solid #ffc107;border-bottom:1px solid #ffc107;border-left:1px solid #ffc107;padding-top:0;padding-bottom:0;font-family:Ubuntu,Tahoma,Verdana,Segoe,sans-serif;text-align:center;mso-border-alt:none;word-break:keep-all" target="_blank"><span style="padding-left:15px;padding-right:15px;font-size:14px;display:inline-block;letter-spacing:normal"><span style="word-break:break-word"><span data-mce-style="" style="line-height:28px">SELL OR BUY</span></span></span></a><!--[if mso]><![endif]--></div></td></tr></table></td></tr></tbody></table></td></tr></tbody></table><table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-9" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;background-color:#efddff" width="100%"><tbody><tr><td><table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;background-color:#fff;color:#000;width:650px" width="650"><tbody><tr><td class="column column-1" style="mso-table-lspace:0;mso-table-rspace:0;font-weight:400;text-align:left;vertical-align:top;padding-top:5px;padding-bottom:5px;border-top:0;border-right:0;border-bottom:0;border-left:0" width="100%"><table border="0" cellpadding="0" cellspacing="0" class="button_block block-3" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tr><td class="pad" style="padding-bottom:30px;padding-top:10px;text-align:center"><div align="center" class="alignment"><!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="###SITELINK###" style="height:42px;width:109px;v-text-anchor:middle" arcsize="24%" stroke="false" fillcolor="#6310b2"><w:anchorlock><v:textbox inset="0px,0px,0px,0px"><center style="color:#fff;font-family:Tahoma,Verdana,sans-serif;font-size:16px"><![endif]--><a href="###SITELINK###spot/BTC_USDT" style="text-decoration:none;display:inline-block;color:#fff;background-color:#ffc107;border-radius:10px;width:auto;border-top:1px solid #ffc107;font-weight:400;border-right:1px solid #ffc107;border-bottom:1px solid #ffc107;border-left:1px solid #ffc107;padding-top:5px;padding-bottom:5px;font-family:Ubuntu,Tahoma,Verdana,Segoe,sans-serif;text-align:center;mso-border-alt:none;word-break:keep-all" target="_blank"><span style="padding-left:20px;padding-right:20px;font-size:16px;display:inline-block;letter-spacing:normal"><span style="word-break:break-word;line-height:32px">VIEW ALL (VISIT EXCHANGE)</span></span></a><!--[if mso]><![endif]--></div></td></tr></table></td></tr></tbody></table></td></tr></tbody></table><table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-10" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;background-color:#efddff" width="100%"><tbody><tr><td><table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;color:#000;width:650px" width="650"><tbody><tr><td class="column column-1" style="mso-table-lspace:0;mso-table-rspace:0;font-weight:400;text-align:left;vertical-align:top;padding-top:0;padding-bottom:0;border-top:0;border-right:0;border-bottom:0;border-left:0" width="100%"><table border="0" cellpadding="0" cellspacing="0" class="image_block block-1" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tr><td class="pad" style="width:100%;padding-right:0;padding-left:0;padding-bottom:20px"><div align="center" class="alignment" style="line-height:10px"><img class="big" src="###GALLERYLINK###gallery/emailTempleteImg/SruNln_ttsi8r.png" style="display:block;height:auto;border:0;width:650px;max-width:100%" width="650"></div></td></tr></table></td></tr></tbody></table></td></tr></tbody></table><table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-11" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tbody><tr><td><table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;color:#000;width:650px" width="650"><tbody><tr><td class="column column-1" style="mso-table-lspace:0;mso-table-rspace:0;font-weight:400;text-align:left;vertical-align:top;padding-top:5px;padding-bottom:5px;border-top:0;border-right:0;border-bottom:0;border-left:0" width="100%"><table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-22" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;background-color:#430a77;background-size:auto" width="100%"><tbody><tr><td><table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;background-size:auto;color:#000;width:650px" width="650"><tbody><tr><td class="column column-1" style="mso-table-lspace:0;mso-table-rspace:0;font-weight:400;text-align:left;vertical-align:top;padding-top:5px;padding-bottom:5px;border-top:0;border-right:0;border-bottom:0;border-left:0" width="100%"><table border="0" cellpadding="0" cellspacing="0" class="social_block block-1" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tr><td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;text-align:center"><div class="alignment" style="text-align:center"><table border="0" cellpadding="0" cellspacing="0" class="social-table" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;display:inline-block" width="208px"><tr><td style="padding:0 10px 0 10px"><a href="###FBLINK###" target="_blank"><img alt="Facebook" height="32" src="###GALLERYLINK###gallery/emailTempleteImg/facebook2x_rmresh.png" style="display:block;height:auto;border:0" title="facebook" width="32"></a></td><td style="padding:0 10px 0 10px"><a href="###TWITTERLINK###" target="_blank"><img alt="Twitter" height="32" src="###GALLERYLINK###gallery/emailTempleteImg/twitter2x_smb7tl.png" style="display:block;height:auto;border:0" title="twitter" width="32"></a></td><td style="padding:0 10px 0 10px"><a href="###LINKEDIN###" target="_blank"><img alt="Linkedin" height="32" src="###GALLERYLINK###gallery/emailTempleteImg/linkedin2x_m1yhz8.png" style="display:block;height:auto;border:0" title="linkedin" width="32"></a></td><td style="padding:0 10px 0 10px"><a href="###INSTALINK###" target="_blank"><img alt="Instagram" height="32" src="###GALLERYLINK###gallery/emailTempleteImg/instagram2x_ts9l6t.png" style="display:block;height:auto;border:0" title="instagram" width="32"></a></td></tr></table></div></td></tr></table></td></tr></tbody></table></td></tr></tbody></table><table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-23" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;background-color:#430a77;background-image:url(###GALLERYLINK###gallery/emailTempleteImg/Fondo_Footer_02_epsusv.png);background-repeat:repeat;background-size:auto" width="100%"><tbody><tr><td><table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;background-size:auto;color:#000;width:650px" width="650"><tbody><tr><td class="column column-1" style="mso-table-lspace:0;mso-table-rspace:0;font-weight:400;text-align:left;vertical-align:top;padding-top:0;padding-bottom:0;border-top:0;border-right:0;border-bottom:0;border-left:0" width="100%"><table border="0" cellpadding="0" cellspacing="0" class="text_block block-2" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;word-break:break-word" width="100%"><tr><td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:50px"><div style="font-family:sans-serif"><div class="txtTinyMce-wrapper" style="font-size:12px;mso-line-height-alt:14.399999999999999px;color:#fff;line-height:1.2;font-family:Ubuntu,Tahoma,Verdana,Segoe,sans-serif"><p style="margin:0;font-size:14px;text-align:center"><span style="font-size:12px">Trading cryptocurrencies carries a high level of risk, and may not be suitable for all investors. Before deciding to trade cryptocurrency you should carefully consider your investment objectives, level of experience, and risk appetite.We value you and your hard-earned money therefore it is a sincere request to study the market, do your research and only then invest. Seek advice from a professional financial advisory and only then invest.</span></p></div></div></td></tr></table><table border="0" cellpadding="0" cellspacing="0" class="text_block block-3" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;word-break:break-word" width="100%"><tr><td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px"><div style="font-family:sans-serif"><div class="txtTinyMce-wrapper" style="font-size:12px;mso-line-height-alt:14.399999999999999px;color:#fff;line-height:1.2;font-family:Ubuntu,Tahoma,Verdana,Segoe,sans-serif"><p style="margin:0;font-size:14px;text-align:center"><span style="font-size:12px"><a href="###SITELINK###" rel="noopener" style="text-decoration:underline;color:#fff" target="_blank">VIEW OFFICIAL WEBSITE</a>|<a href="###SITELINK###" rel="noopener" style="text-decoration:underline;color:#fff" target="_blank"></a></span></p></div></div></td></tr></table><table border="0" cellpadding="0" cellspacing="0" class="image_block block-4" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tr><td class="pad" style="padding-bottom:30px;padding-left:20px;padding-right:20px;padding-top:10px;width:100%"><div align="center" class="alignment" style="line-height:10px"><img alt="Your Logo" src="###GALLERYLINK###gallery/siteLogo.png" style="display:block;height:auto;border:0;width:130px;max-width:100%" title="Your Logo" width="130"></div></td></tr></table></td></tr></tbody></table></td></tr></tbody></table><table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-24" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tbody><tr><td><table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;color:#000;width:650px" width="650"><tbody><tr><td class="column column-1" style="mso-table-lspace:0;mso-table-rspace:0;font-weight:400;text-align:left;vertical-align:top;padding-top:5px;padding-bottom:5px;border-top:0;border-right:0;border-bottom:0;border-left:0" width="100%"><table border="0" cellpadding="0" cellspacing="0" class="icons_block block-1" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tr><td class="pad" style="vertical-align:middle;color:#9d9d9d;font-family:inherit;font-size:15px;padding-bottom:5px;padding-top:5px;text-align:center"><table cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0" width="100%"><tr><td class="alignment" style="vertical-align:middle;text-align:center"><!--[if vml]><table align="left" cellpadding="0" cellspacing="0" role="presentation" style="display:inline-block;padding-left:0;padding-right:0;mso-table-lspace:0;mso-table-rspace:0"><![endif]--><!--[if !vml]><!--><table cellpadding="0" cellspacing="0" class="icons-inner" role="presentation" style="mso-table-lspace:0;mso-table-rspace:0;display:inline-block;margin-right:-4px;padding-left:0;padding-right:0"><!--<![endif]--><tr><td style="vertical-align:middle;text-align:center;padding-top:5px;padding-bottom:5px;padding-left:5px;padding-right:6px"><a style="text-decoration:none" target="_blank"></a></td><td style="font-family:Ubuntu,Tahoma,Verdana,Segoe,sans-serif;font-size:15px;color:#9d9d9d;vertical-align:middle;letter-spacing:undefined;text-align:center"><a  style="color:#9d9d9d;text-decoration:none" target="_blank"> ###COPYRIGHT###</a></td></tr></table></td></tr></table></td></tr></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></body></html>';