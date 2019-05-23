const bitcoinjs = require('bitcoinjs-lib');
const ripemd160 = require('ripemd160');
var bs58check = require('bs58check')
const sha512 = require('js-sha512');
const sha256 = require('js-sha256');
const bip32 = require('bip32');
const fs = require('fs');
const path = require('path');
const bs58 = require('bs58')
const AES = require('./aes');
const bufferhelp = require('./bufferhelp');

var default_fp = path.join(__dirname, '../../../data/');
var fp = path.join(__dirname, '../../../data/account/');
var default_fullpath = path.join(__dirname, '../../../data/default.cfg');
var default_file = 'default.cfg';

var pubkey;
var address;

function Wallet(password, filename, type = true) {//Wallet
    this.password = password;
    this.filename = filename == undefined ? default_file : filename;
    this.create = create;
    this.save = save;
    this.sign = sign;
    this.genAddr = genAddr;
    this.getWalletData = getWalletData;
    this.getWalletFileList = getWalletFileList;
    this.dhash256 = dhash256;
    this.changeWallet = changeWallet;
    this.getPubKeyBuf = getPubKeyBuf;
    this.publickey_to_hash = publickey_to_hash;
    mkdirsSync(fp);
}

function WalletData() {
    this.encrypted = true;
    this.type = 'default';
    this.vcn = 0;
    this.coin_type = '0';
    this.testnet = false;
    this.prvkey = '';
    this.pubkey = '';
    this.password = '';
    this.address = '';
}

function create(str) {// create loacl wallet *.cfg file 
    console.log(str);
    if (str.length < 16 || str.length > 32)
        throw new Error('phone+pwd length must be region in 16-32');
    var BIP32 = bip32.fromSeed(Buffer.from(str));
    pubkey = bufferhelp.bufToStr(BIP32.publicKey);
    var wif = BIP32.toWIF();
    var len = (wif.length).toString(16);
    wif = len + wif;
    var encrypt = AES.Encrypt(wif, this.password);
    address = genAddr(BIP32);//generate address
    saveToFile(encrypt, this.filename, this.password);//save to file
    return address;
}

function save(prvKeyStr) {//import prvkey to local *.fgfile
    console.log(prvKeyStr, prvKeyStr.length);
    if (prvKeyStr.length != 64)
        throw Error('length must be 64');
    var BIP32 = bip32.fromPrivateKey(bufferhelp.hexToBuffer(prvKeyStr), new Buffer(32));
    pubkey = bufferhelp.bufToStr(BIP32.publicKey);
    var wif = BIP32.toWIF();
    var len = (wif.length).toString(16);
    wif = len + wif;
    var encrypt = AES.Encrypt(wif, this.password);
    address = genAddr(BIP32);//generate address
    saveToFile(encrypt, this.filename, this.password);//save to file
    return address;
}

function genAddr(BIP32) {// generate address
    var pubbuf = BIP32.publicKey;
    var hashbuf = sha512.array(pubbuf);
    var s1 = new ripemd160().update(Buffer.from(hashbuf.slice(0, 32), 'hex')).digest();
    var s2 = new ripemd160().update(Buffer.from(hashbuf.slice(32, 64), 'hex')).digest();

    //NBC地址
    var version = 0x00;
    var cointype = 0x00;
    var vcn = 0x00;

    var hi = (vcn & 0xffff) / 256;
    var lo = (vcn & 0xffff) % 256;
    var buf0 = bufferhelp.hexToBuffer(sha256(Buffer.concat([s1, s2])));

    var v = Buffer.concat([Buffer.from([version]), Buffer.from([hi, lo]), buf0, Buffer.from([cointype])]);

    var d1buf = bufferhelp.hexToBuffer(sha256(v));
    var checksum = bufferhelp.hexToBuffer(sha256(d1buf)).slice(0, 4);
    var result = Buffer.concat([v, checksum]);
    var addr = bs58.encode(result);
    return addr;
}

function getWalletData() {
    var wd = new WalletData();
    //default file
    var data = readDefaultFile();
    if (!data) {
        console.log('getWalletData default not exist');
        return;
    }
    wd.coin_type = data['coin_type'];
    wd.encrypted = data['encrypted'];
    wd.password = data['password'];
    wd.prvkey = data['prvkey'];
    wd.pubkey = data['pubkey'];
    wd.type = data['type'];
    wd.vcn = data['vcn'];
    wd.testnet = data['testnet'];
    wd.address = data['address'];
    return wd;
}

function changeWallet(filename, password) {
    var isValid = validateCustom(filename, password);
    if (isValid) {
        var data_cus = readCustomFile(filename);
        fs.writeFileSync(default_fullpath, JSON.stringify(data_cus), 'utf-8');
        return true;
    }
    return false;
}

function validateCustom(filename, password) {
    var data = readCustomFile(filename, password);
    var pwd = '';
    if (data) {
        pwd = data['password'];
        if (pwd == password) {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}

function getWalletFileList() {
    return readDirSync(fp);
}

function readDefaultFile() {
    return readFileSync(default_fullpath);
}

function readCustomFile(customFileName) {
    return readFileSync(fp + customFileName);
}

function readFileSync(filepath) {
    if (fs.existsSync(filepath)) {
        const data = fs.readFileSync(filepath, 'utf-8');
        if (data && data.length > 0) {
            return JSON.parse(data);
        } else {
            console.log(filepath + ' read data error');
            return null;
        }
    } else {
        console.log(filepath + ' not exist');
        return null;
    }
}

function getBIP32() {
    var data = readDefaultFile();
    if (data) {
        var encrypt_prvkey = data['prvkey'];
        var pwd = data['password'];
        var s = AES.Decrypt(encrypt_prvkey, pwd);
        var n = bs58check.decode(s.slice(2));
        var prvKeyBuf = n.slice(1, 33);
        var BIP32 = bip32.fromPrivateKey(prvKeyBuf, new Buffer(32));
        console.log('>>> getBIP32:', BIP32);
        return BIP32;
    } else {
        throw 'wallet err,can not sign';
    }
}

function getPubKeyBuf() {
    var b = getBIP32();
    return b.publicKey;
}

//私钥对消息进行签名
function sign(buf) {
    var hash = bitcoinjs.crypto.hash256(buf);
    var b = getBIP32();
    var wif = b.toWIF();
    // L2JVe4yQvo3Phr2kjh9YUjHxN2d7v4Uc1QjihcLFv8VxyNMoVRyj
    var keyPair = bitcoinjs.ECPair.fromWIF(wif);//sign with prvkey
    // var signature = keyPair.sign(hash).toDER(); // ECSignature对象
    var signature = keyPair.sign(hash).toDER(); // ECSignature对象

    console.log('>>> sign', signature, bufferhelp.bufToStr(signature));
    console.log('>>> payload转换hash:\n', hash.length, bufferhelp.bufToStr(hash));
    console.log('>>> 公钥:\n', keyPair.getPublicKeyBuffer().toString('hex'));
    return signature;
}

function publickey_to_hash(publicKey, vcn = 0) {
    if (vcn == null) {
        return bitcoinjs.crypto.hash256(publicKey);
    } else {
        var pubHash = sha512(publicKey);
        var pubbuf = bufferhelp.hexStrToBuffer(pubHash);
        var s1 = bitcoinjs.crypto.ripemd160(pubbuf.slice(0, 32));
        var s2 = bitcoinjs.crypto.ripemd160(pubbuf.slice(32, 64));
        return bitcoinjs.crypto.sha256(Buffer.concat([s1, s2]));
    }
}

function dhash256(buf) {
    return bitcoinjs.crypto.hash256(bitcoinjs.crypto.hash256(buf));
}

function saveToFile(encrypt, filename, password) {//save file format *.cfg
    var data = {
        'encrypted': true,
        "type": "default",
        "vcn": 0,
        "coin_type": "00",
        "testnet": false,
        "prvkey": encrypt,
        "pubkey": pubkey == undefined ? '' : pubkey,
        "password": password,
        "address": address == undefined ? '' : address,
    }

    mkdirs(fp, function () {
        data = JSON.stringify(data);
        fs.writeFile(fp + filename, data, (err) => {
            if (err) {
                throw Error('write file err');
            }
        })
        fs.writeFile(default_fp + 'default.cfg', data, (err) => {
            if (err) {
                throw Error('write file err');
            }
        })
    })
}

//递归创建目录 同步方法  
function mkdirsSync(dirname) {
    console.log(dirname);
    if (fs.existsSync(dirname)) {
        return true;
    } else {
        if (mkdirsSync(path.dirname(dirname))) {
            fs.mkdirSync(dirname);
            return true;
        }
    }
}

function mkdirs(dirname, callback) {//create dirs
    fs.exists(dirname, function (exists) {
        if (exists) {
            callback();
        } else {
            mkdirs(path.dirname(dirname), function () {
                fs.mkdir(dirname, callback);
            });
        }
    });
}

//遍历文件夹
function readDirSync(filepath) {
    var files = [];
    var pa = fs.readdirSync(filepath);
    pa.forEach(function (ele, index) {
        var info = fs.statSync(filepath + ele);
        if (info.isFile) {
            files.push(ele);
        }
    })
    return files;
}

module.exports = Wallet;