
const crypto = require('crypto');

function Encrypt(data, key) {
    console.log('key:',key);
    const cipher = crypto.createCipher('aes-128-ecb', key);
    var crypted = cipher.update(data, 'utf8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
}

function Decrypt(encrypted, key) {
    const decipher = crypto.createDecipher('aes-128-ecb', key);
    var decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

exports.Encrypt=Encrypt
exports.Decrypt=Decrypt

//48b72694350dd82db6c78f73a059729a585c849206cbc849b2251db61d59d2f4cdf4f0e88492f4594fb07d63768805545bd2c7a959e5f96cb725c1758074c481
//48b72694350dd82db6c78f73a059729a585c849206cbc849b2251db61d59d2f4cdf4f0e88492f4594fb07d63768805545bd2c7a959e5f96cb725c1758074c481
// console.log(Decrypt('48b72694350dd82db6c78f73a059729a585c849206cbc849b2251db61d59d2f4cdf4f0e88492f4594fb07d63768805545bd2c7a959e5f96cb725c1758074c481','123!@#abc'))

