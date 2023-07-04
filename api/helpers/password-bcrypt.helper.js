var bcrypt = require('bcrypt');
const saltRounds = 10;

exports.getPasswordHash = async(data = {}) => {
    return bcrypt
    .genSalt(saltRounds)
    .then(async salt => {
        // console.log('1 Salt: ', salt)
        return await bcrypt.hash(data.passwordVal, salt);
    })
    .then(hash => {
        // console.log('2 hash: ', hash)
        return {status: true, hash};
    })
    .catch(err => console.error(err.message))
}

exports.passwordChk = async(reqBody) => {
    // console.log({reqBody});
    return bcrypt
    .compare(reqBody.password, reqBody.hash)
    .then(resp => {
        console.log({resp});
        if(resp) {
            console.log(1);
            return {status:true, resp};
        }
        else {
            console.log(2);
            return {status:false};
        }
    })
    .catch(err => console.error(err.message));
}