const dbName = 'cryptoExchange';
const dbUser = "commonuser";
const dbPwd = "FkQ2tjE0sMqq0nVV";
const dbCluster = "cluster0.nwfdn.mongodb.net";

let envname = process.env.NODE_ENV;


module.exports = {
	env: envname,
	dbName: dbName,
	dbconnection: `mongodb+srv://${dbUser}:${dbPwd}@${dbCluster}/${dbName}?retryWrites=true&w=majority`,
	caPath: "",
	port: 3004,
	passPhrase: 'T1Bt0Lx5jPu5L6AJ8523IAv0anRd03Ya',
	algorithm: 'aes-256-ctr',
	iv: 'bLMjTTIuNUpWe345',
	jwtTokenAdmin: 'ExAdMin',
	jwtTokenCustomers: 'userExPan',
	smtpDetails: {
		keys: {
			host: 'smtppro.zoho.in',
			port: 465,
			secure: true,
			auth: {
				user: 'do-not-reply@fibitpro.com',
				pass: 'Donotreply@133471'
			}
		},
		email: 'do-not-reply@fibitpro.com'
	},
	serverType: 'http',
	options: {
		// 
	},
	adminEnd: 'https://fibitexchange-backoffice.fibitpro.com/',
	frontEnd: 'https://fibitexchange.fibitpro.com/',
	backEnd: "https://fibitexchange-api-new.fibitpro.com/api/",
	galleryLink: "https://fibitexchange-api-new.fibitpro.com/",
	siteName: 'Fibit Pro',
	url: "localhost",
	space: {
		cloud_name: "dweqs7aoz",
		api_key: "258912212842725",
		api_secret: "8xX6owGyYI5wYbd4vM05seJwyBI"
	},
	sendSMS: {
		enable: true,
		name: "plivo",
		sectionStatus: {
			p2p: "Disable"
		}
	},
	twilio:{
		accountSid: "AC6c0d807be2f07004232bc335db4da271",
		authToken: "5ce7e645ac3c3bae6353fb3a45f31470",
		phone: "+15855412576",
	},
	plivo:{
		authID: "MAMDMWOTMYNZA4M2I3OT",
		authToken: "NDJiNDE5NDVlNjAxNGMzNGNlMGQzMjZhOTkwNDM2",
		senderId: "Fibitpro",
	},
	kyc: {
		era_domain: "https://kyc-api.aadhaarkyc.io",
		token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTY0ODA5OTAxNywianRpIjoiZjRlOGVkMmEtMDkxZC00NjRjLWI4NGItYzJiNDQwNTM0NTcwIiwidHlwZSI6ImFjY2VzcyIsImlkZW50aXR5IjoiZGV2LmZpYml0cHJvQGFhZGhhYXJhcGkuaW8iLCJuYmYiOjE2NDgwOTkwMTcsImV4cCI6MTk2MzQ1OTAxNywidXNlcl9jbGFpbXMiOnsic2NvcGVzIjpbInJlYWQiXX19.8KRREWtDIyKyHa-2Yztqc8PemGVtyelExZ7P5SZlNcI",
		aadhaarV2GenerateOtp: "/api/v1/aadhaar-v2/generate-otp",
		aadhaarV2SubmitOtp: "/api/v1/aadhaar-v2/submit-otp",
		faceMatch: "/api/v1/face/face-match",
		panLite: "/api/v1/pan/pan",
		bankApi: "/api/v1/bank-verification",
		bankVerifyStatus : 'Enable',
		upiApi: "/api/v1/bank-verification/upi-verification",
		upiVerifyStatus : 'Enable',
	},

	google: {
        recaptcha: {
            TEST_SECRET_KEY: "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe",
            ROBO_SECRET_KEY: "6LeOTbwlAAAAABsOTmepbI01QWtZv6J5ptZ3_z2j",
			INVI_SECRET_KEY: "6LduBL0lAAAAAGM45Zz886OL6LT4o5jG4IIR98QW",
			V3_SITE_KEY: "6Lc0McAlAAAAAP_rAaTZICanvxoygETlLfuUBbrG",
            SECRET_KEY: "6LduBL0lAAAAAGM45Zz886OL6LT4o5jG4IIR98QW",
        }
    },

	timer: {
        resendOtp: 120
    },

	FanTknSymbol: "FBT",

	sectionStatus: {
		p2p: "Enable",
		captcha: "Enable",
		cryptoLoan: "Enable",
		spotTrade: "Enable",
		spotTradeCron: "Enable",
		spotTradeSocket: "Disable",
		perpetualTrade: "Enable",
		derivativeCron: "Disable",
		pushNotification: "Enable",
		activityNotification: "Disable"
	}

}