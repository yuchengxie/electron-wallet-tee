// const sha256 = require('js-sha256');
// const bs58 = require('bs58')
// const sha512 = require('js-sha512');
// const bip32 = require('bip32')
// const ripemd160 = require('ripemd160');
// const wif = require('wif');
// const AES = require('./aes')
// const bitcoin = require('bitcoinjs-lib');

// const key = 'xieyc';

// function saveWallet(prvKeyStr) {
//     if (prvKeyStr.length != 64) throw Error('长度须为64');
//     let prvKeyBuf = toBuffer(prvKeyStr);
//     console.log('prvKeyBuf', prvKeyBuf, prvKeyBuf.length);
//     let BIP32 = bip32.fromPrivateKey(prvKeyBuf, new Buffer(32));
//     console.log('BIP32:', BIP32);
//     let keyWIF = toWIF(prvKeyStr);
//     console.log('> keyWIF:', keyWIF, keyWIF.length);
//     //加密私钥
//     let encrypt_prvKey = AES.Encrypt(keyWIF, key);
//     console.log('save encrypt_prvKey', encrypt_prvKey, encrypt_prvKey.length);
//     //生成NBC地址
//     genAddr(BIP32);
//     return encrypt_prvKey;
// }

// function createWallet(str) {
//     console.log('> str:' + str, str.length);
//     if (str.length < 16 || str.length > 32) throw new Error('长度必须16到32之间');
//     let BIP32 = bip32.fromSeed(Buffer.from(str));
//     let prvKeyBuf = BIP32.privateKey;

//     // var buf='123';
//     // var hash=bitcoin.crypto.sha256(buf);
//     // var signature=BIP32.sign(hash);

//     // console.log('signature:',signature,signature.length);

//     // var result= BIP32.verify(hash.slice(1),signature);
//     // console.log('result:',result);




//     console.log('> prvKeyBuf:', prvKeyBuf, prvKeyBuf.length);
//     let prvKeyStr = BufferToString(prvKeyBuf);
//     console.log('> prvKeyStr:', prvKeyStr, prvKeyStr.length);
//     let keyWIF = toWIF(prvKeyStr);
//     console.log('> keyWIF:', keyWIF, keyWIF.length);
//     //给私钥作AES加密
//     let encrypt_prvKey = AES.Encrypt(keyWIF, key);
//     // let encrypt_prvKey = AES.Encrypt(keyWIF,key);
//     console.log("> encrypt_prvKey:", encrypt_prvKey, encrypt_prvKey.length);
//     let decrypt_prvKey = AES.Decrypt(encrypt_prvKey, key);
//     console.log("> decrypt_prvKey:", decrypt_prvKey, decrypt_prvKey.length);
//     //生成NBC地址
//     let addr = genAddr(BIP32);
//     let data = {
//         encrypt_prvKey: encrypt_prvKey,
//         addr: addr
//     }
//     return data;
// }

// var BIP32;
// function sign(buf) {
//     console.log(BIP32);
//     console.log('buf:', buf, buf.length);
//     var b = BIP32.sign(new Buffer('123123'));
//     return b;
// }

// function testgetBIP32FromCfg(cfg, passphrase) {
//     return '';
// }

// function sign(BIP32,buf){
//     var hash=bitcoin.crypto.sha256(buf);
//     var s=BIP32.sign(hash);
//     return s;
// }

// function verify(BIP32,data){
// }

// //改装
// function getPubKey(prvKeyBuf) {
//     BIP32 = bip32.fromPrivateKey(prvKeyBuf, new Buffer(32));
//     return BIP32.publicKey;
// }

// //改装
// function getBIP32(prvKeyBuf) {
//     BIP32 = bip32.fromPrivateKey(prvKeyBuf, new Buffer(32));
//     return BIP32;
// }

// //根据私钥生成公钥
// function genAddr(BIP32) {
//     let pubbuf = BIP32.publicKey;
//     let hashbuf = sha512.array(pubbuf);
//     let s1 = new ripemd160().update(Buffer.from(hashbuf.slice(0, 32), 'hex')).digest();
//     let s2 = new ripemd160().update(Buffer.from(hashbuf.slice(32, 64), 'hex')).digest();
//     //NBC地址
//     let version = 0x00;
//     let cointype = 0x00;
//     let vcn = 0x00;
//     let hi = (vcn & 0xffff) / 256;
//     let lo = (vcn & 0xffff) % 256;
//     let buf0 = toBuffer(sha256(Buffer.concat([s1, s2])));

//     let v = Buffer.concat([Buffer.from([version]), Buffer.from([hi, lo]), buf0, Buffer.from([cointype])]);

//     let d1buf = toBuffer(sha256(v));
//     let checksum = toBuffer(sha256(d1buf)).slice(0, 4);
//     let result = Buffer.concat([v, checksum]);
//     let addr = bs58.encode(result);
//     console.log('>>> addr:', addr);
//     return addr;
// }

// // 对私钥编码:
// function toWIF(privateKeyStr) {
//     let encoded = wif.encode(
//         0x80, // 0x80前缀
//         Buffer.from(privateKeyStr, 'hex'), // 转换为字节
//         true // 非压缩格式
//     );
//     let len = (encoded.length).toString(16);
//     encoded = len + encoded;
//     return encoded;
// }

// function genAddrFromCfg(cfg, passphrase) {
//     let prvkey = cfg['prvkey'];
//     if (prvkey) {
//         if (cfg['encrypted']) {
//             prvkey = AES.Decrypt(prvkey, passphrase);
//             prvkey = prvkey.substring(2, prvkey.length);
//             prvkey = bs58.decode(prvkey);
//             prvkey = prvkey.slice(1, 33);
//             let BIP32 = bip32.fromPrivateKey(prvkey, new Buffer(32));
//             var addr = genAddr(BIP32);
//             return addr;
//         }
//     }
// }

// function BufferToString(buf) {
//     let s = '';
//     buf.forEach(element => {
//         let tmp = element.toString(16);
//         if (tmp.length == 1) {
//             s += '0' + tmp;
//         } else {
//             s += tmp;
//         }
//     })
//     return s;
// }

// function toBuffer(hex) {
//     var typedArray = new Uint8Array(hex.match(/[\da-f]{2}/gi).map(function (h) {
//         return parseInt(h, 16)
//     }))
//     var buffer = typedArray.buffer
//     buffer = Buffer.from(buffer);
//     return buffer;
// }

// exports.saveWallet = saveWallet
// exports.createWallet = createWallet
// exports.getPubKey = getPubKey
// exports.genAddrFromCfg = genAddrFromCfg
// exports.getBIP32 = getBIP32
// exports.sign = sign
// exports.verify = verify
// exports.testgetBIP32FromCfg = testgetBIP32FromCfg
