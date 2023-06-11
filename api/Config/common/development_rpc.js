module.exports = {
	btcconfig : {
    	protocol:'',
    	host:'',
    	user:'',
    	password:'',
    	port: '',
		method:'',
		txnLink:'',
		AdminAddress:"",
	},
	bnbconfig: {
		// bk
		// host:'https://bsc-dataseed1.binance.org/',
		// host:'https://bsc-dataseed1.ninicoin.io/',
		// AdminAddress:"0xAD02eDD9806C20C121cdb0706E5e6639F1708c4f",
		// APIUrl: "https://bscscan.com/api/",

		// testnet
		host:'https://data-seed-prebsc-1-s1.binance.org:8545/',
		UserKey:"CryPtoAExChangeTnBWallEt",
		AdminAddress:"0xd68B680b6B1F37601f9d09101ccDCCCa0E12AF0A",
		AdminKey:"CryPtoBackoffIceNTWallEtZn",
		APIKey:"8PG249DSXRZFMUR1H5I5Q4Z92J8DY6777Z",
		APIUrl:'https://api-testnet.bscscan.com/api/',
		txnLink:'https://bscscan.com/tx/'
	},
    ethconfig:{
        protocol:'',
    	host:'https://sepolia.infura.io/v3/496a616f51b947fab7c67f87b7715522',
    	user:'',
    	password:'',
    	port: '',
		method:'',
		UserKey:"CryPtoAExChangeTnBWallEt",
		AdminAddress:"0xd68B680b6B1F37601f9d09101ccDCCCa0E12AF0A",
		AdminKey:"CryPtoBackoffIceNTWallEtZn",
		APIKey:"RMX41XP7X42GXYUW9HXI61GWXDVKCJJSR7",
		APIUrl:'https://api-sepolia.etherscan.io/api',
		txnLink:'https://sepolia.etherscan.io/tx/'
	},
	Oldethconfig:{
        protocol:'',
    	// host:'https://goerli.infura.io/v3/496a616f51b947fab7c67f87b7715522',
    	host:'https://sepolia.infura.io/v3/496a616f51b947fab7c67f87b7715522',
    	user:'',
    	password:'',
    	port: '',
		method:'',
		UserKey:"CryPtoAExChangeEhTWallEt",
		AdminAddress:"0xf97006ef034cce6a56706d6c1af972f434b9c340",
		// AdminKey:"CryPtoAExChangeAdmEhTWallEt",
		AdminKey:"CryPtoBackoffIceNTWallEtZn",
		// APIKey:"496a616f51b947fab7c67f87b7715522",
		APIKey:"RMX41XP7X42GXYUW9HXI61GWXDVKCJJSR7",
		APIUrl:'https://api-sepolia.etherscan.io/api',
		txnLink:'https://sepolia.etherscan.io/tx/'
	},
	xrpconfig:{
		// testnet
		urlType : 'wss://s.altnet.rippletest.net:51233',
		txnLink:'https://test.bithomp.com/explorer/',
		AdminAddress: "",
		// mainnet
		// urlType : 'wss://s2.ripple.com',
		// txnLink:'https://bithomp.com/explorer/'
	},
	trxconfig:{
		// urlType : '',
		// AdminAddress : '',
		// txnLink:'',
		// APIUrl:'',
		// APIUrl1:''

		// testnet
		urlType : 'https://api.shasta.trongrid.io',
		AdminAddress : 'TSiJjmkQbtacWp427pMyjaEAwZVwDihZPS',
		txnLink:'https://shasta.tronscan.org/#/transaction/',
		APIUrl:'https://api.shasta.trongrid.io/v1/accounts/',
		APIUrl1:'https://api.shasta.tronscan.org/api/',
		APIKey: "5253023b-ba69-4985-9d4e-8163b881bafe",
		PriKey: "CDC53A7A01C14EEB319799F4C36075CAF11767C27EBEC90EBFE791DF0B2FB6BC"

		// mainnet
		// urlType : 'https://api.trongrid.io',
		// AdminAddress : '',
		// txnLink:'https://tronscan.org/#/transaction/',
		// APIUrl:'https://api.trongrid.io/v1/accounts/',
		// APIUrl1:'https://api.tronscan.org/api/'
	}
}
