const { ipcMain } = require('electron')
const dhttp = require('dhttp');
const smartcard = require('smartcard');
const hexify = require('hexify');
const dns = require('dns');
const bs58 = require('bs58');
const CTime = require('china-time');
const sha256 = require('js-sha256');
const bitcoinjs = require('bitcoinjs-lib');
const dgram = require('dgram');

const message = require('./bus/message')
const gFormat = require('./bus/format');
const bh = require('./bus/bufferhelp');
const opscript = require('./bus/op/script');
var transfer = require('./bus/transfer')
// const PoetClient = require('./bus/mine_client').PoetClient;
const utilkey = require('./bus/utilkey');
const struct = require('./bus/struct');
const Devices = smartcard.Devices;
const Iso7816Application = smartcard.Iso7816Application;

const makesheetbinary = require('./bus/makesheet');
const transbinary = require('./bus/transaction');
const chinaTime = require('china-time');

const devices = new Devices();
const CommandApdu = smartcard.CommandApdu;
var application;
var mine_hostname = 'user1-node.nb-chain.net';
var mine_port = 30302;

var SELECT = '00A404000ED196300077130010000000020101';
var cmd_pubAddr = '80220200020000';
var cmd_pubkey = '8022000000';
var cmd_pubkeyHash = '8022010000';
var GET_RESPONSE = '0x00c00000';
var addr;
var _heartTimer;

var TransType = {};
TransType._record = 0;
TransType._transfer = 1;

var __time__ = () => { return `${CTime("YYYY-MM-DD HH:mm:ss")}` };
var pseudoWallet;
var gPoetClient;

var WEB_SERVER_ADDR = 'http://user1-node.nb-chain.net';
// var WEB_SERVER_ADDR = 'http://raw0.nb-chain.net';
ipcMain.on('teeAddr', function (event, data) {
    event.sender.send('replyteeAddr', pseudoWallet.pub_addr);
});

ipcMain.on('getpass', function (event, data) {
    console.log('>>> getpass:', data);

    if (data) {
        try {
            var scmd = '00200000' + '0' + parseInt(data.length / 2) + data;
            transmit(scmd).then(res => {
                var result = '';
                if (res.data == '9000') {
                    result = 'verify password successful.';
                    // pseudoWallet.pin_code = data[1];
                } else {
                    if (res.data.slice(0, 3) == '63c') {
                        result = 'incorrect password, left try count: ' + res.data.slice(3);
                    } else {
                        result = 'verify password failed.';
                    }
                }
                event.sender.send('replaygetpass', result);
            })
        } catch (error) {

        }
    }
})

ipcMain.on('setpass', function (event, data) {
    var psw = data[0];
    var newPin = data[1];
    var incmd = psw + 'ff' + newPin;
    incmd = '002e0000' + '0' + parseInt(incmd.length / 2) + incmd;
    transmit(incmd).then(res => {
        var result = '';
        if (res.data == '9000') {
            result = 'change password successful.';

        } else {
            if (res.data.slice(0, 3) == '63c') {
                result = 'incorrect password, left try count: ' + res.data.slice(3);
            } else {
                result = 'change password failed.';
            }
        }
        event.sender.send('replysetpass', result);
    })
})

ipcMain.on('save', function (event, data) {
    // console.log(data);
    // if (data.length == 3) {
    //     wallet = new Wallet(data[1], data[2]);
    //     console.log('>>> save data :', data[1], data[2]);
    //     console.log('>>> save after wallet:', wallet);

    //     var addr = wallet.save(data[0]);
    //     console.log(addr);
    //     if (addr) {
    //         event.sender.send('replysave', [addr, data[2]]);
    //     }
    // } else {
    //     throw Error('import wallet data error');
    // }
})

ipcMain.on('create', function (event, data) {
    // console.log(data);
    // if (data.length == 3) {
    //     wallet.password = data[1];
    //     wallet.filename = data[2];
    //     var addr = wallet.create(data[0]);
    //     if (addr) {
    //         event.sender.send('replycreate', [data[2], addr]);
    //     }
    // } else {
    //     throw Error('create wallet data error');
    // }
})

ipcMain.on('block', function (event, data) {
    // block_hash should be str or None
    var block_hash = data[0];
    var block_height = data[1];
    var height = '';
    if (block_height.length == 0) {
        //default heights
        var a = [-1, -2, -3];
        for (var i = 0; i < a.length; i++) {
            height += '&hi=' + a[i];
        }
    } else {
        height = '&hi=' + block_height;
    }
    var _hash = '';
    if (block_hash.length == 0) {
        for (let i = 0; i < 32; i++) {
            _hash += '00';
        }
    } else {
        _hash = block_hash;
        height = '';
    }
    var url = WEB_SERVER_ADDR + '/txn/state/block?&hash=' + _hash + height;
    console.log('url:', url);
    dhttp({
        url: url,
        method: 'GET'
    }, function (err, res) {
        if (err) throw 'getblock err';
        var buf = res.body;
        var payload = message.g_parse(buf);
        var msg = message.parseBlock(payload)[1];
        console.log('> msg:', msg);

        var headers = msg['headers'];
        var blocks = [];
        for (var idx in headers) {
            var _block = {};
            _block.height = msg['heights'][idx];
            _block.txck = msg['txcks'][idx];
            _block.version = headers[idx]['version'];
            _block.link_no = headers[idx]['link_no'];
            _block.prev_block = headers[idx]['prev_block'];
            _block.merkle_root = headers[idx]['merkle_root'];
            _block.timestamp = headers[idx]['timestamp'];
            _block.bits = headers[idx]['bits'];
            _block.nonce = headers[idx]['nonce'];
            _block.miner = headers[idx]['miner'];
            _block.txn_count = headers[idx]['txn_count'];
            _block.hash = getHash(_block);
            blocks.push(_block);
        }
        event.sender.send('replyblock', blocks);
    })
})

ipcMain.on('info', function (event, data) {
    let pv = false;
    let pb = false;
    let after = 0;
    let before = 0;
    let address = '';
    var addr = data;
    if (addr.length == 0) {
        if (!pseudoWallet) return;
        addr = pseudoWallet.pub_addr;
        console.log('>>> ready read wallet address:', addr);
        if (!addr) {
            return;
        }
    }
    // var url = 'http://raw0.nb-chain.net/txn/state/account?addr=' + addr + '&uock=' + before + '&uock2=' + after;
    // var url = WEB_SERVER_ADDR + '/txn/state/account?addr=' + addr + '&uock=' + before + '&uock2=' + after;
    var url = WEB_SERVER_ADDR + '/txn/state/account?addr=' + addr;
    console.log('info url:', url);
    dhttp(
        {
            url: url,
            method: 'GET'
        }, function (err, res) {
            if (err) throw 'getinfo err';
            var buf = res.body;
            var payload = message.g_parse(buf);
            var msg = message.parseInfo(payload)[1];
            var msg1 = {};
            msg1.account = bh.hexToBuffer(msg['account']).toString('latin1');
            msg1.timestamp = msg['timestamp'];
            msg1.link_no = msg['link_no'];
            var arrfound = [];
            var total = 0;
            for (var i = 0; i < msg['found'].length; i++) {
                var found_item = {};
                var m = msg['found'][i];
                var height = m['height'];
                var value = m['value'];
                var uock = m['uock'];
                //handle uock
                found_item.uock = bh.bufToStr(uock);
                found_item.height = height;
                found_item.value = value;
                arrfound.push(found_item);
                total += value;
            }
            msg1.found = arrfound;
            msg1.total = total;
            console.log('> info msg:', msg1);
            event.sender.send('replyinfo', msg1);
        }
    )
})

ipcMain.on('utxo', function (event, data) {
    // var url = 'http://raw0.nb-chain.net/txn/state/uock?addr=1118hfRMRrJMgSCoV9ztyPcjcgcMZ1zThvqRDLUw3xCYkZwwTAbJ5o&num=2&uock2=[]';
    // var addr = wallet.getAddrFromWallet();
    // var d = wallet.getWalletData();
    if (!pseudoWallet) return;
    var addr = pseudoWallet.pub_addr;
    console.log('>>> ready read wallet address:', addr);
    if (!addr) {
        return;
    }
    // var url = WEB_SERVER_ADDR+'/txn/state/uock?addr=1ABmVkYkHdCKs5FUtU7NUThP24u4YyVBkJuua47wmJ4sV9WDmzBy5f&num=5';
    var url = WEB_SERVER_ADDR + '/txn/state/uock?addr=' + addr + '&num=5';
    console.log('utxo url:', url);
    dhttp(
        {
            url: url,
            method: 'GET'
        }, function (err, res) {
            if (err) throw 'getutxo err';
            console.log('> utxo res:', res.body, res.body.length);
            var buf = res.body;
            var payload = message.g_parse(buf);
            console.log('> res:', payload, payload.length);
            var msg = message.parseUtxo(payload)[1];
            msg = utxoScript(msg);
            console.log('> msg:', msg);
            event.sender.send('replyutxo', msg);
        }
    )
})

var tran_event;
ipcMain.on('transfer', function (event, res) {
    tran_event = event;
    console.log(data);
    //verify password 
    var data = res[3];
    if (data) {
        try {
            var scmd = '00200000' + '0' + parseInt(data.length / 2) + data;
            transmit(scmd).then(res => {
                var result = '';
                if (res.data == '9000') {
                    result = 'verify password successful.';
                    // pseudoWallet.pin_code = data[1];
                    query_sheet('', '');
                } else {
                    if (res.data.slice(0, 3) == '63c') {
                        result = 'incorrect password, left try count: ' + res.data.slice(3);
                    } else {
                        result = 'verify password failed.';
                    }
                    event.sender.send('replaygetpass', result);
                }

            })
        } catch (error) {

        }
    }
    // query_sheet('', '');
    // transfer.query_sheet('', '');
})

var record_event;
ipcMain.on('record', function (event, res) {
    console.log(data);
    record_event = event;
    //verify password 
    var data = res[1];
    var content = res[0];
    if (data) {
        try {
            var scmd = '00200000' + '0' + parseInt(data.length / 2) + data;
            transmit(scmd).then(res => {
                var result = '';
                if (res.data == '9000') {
                    result = 'verify password successful.';
                    record(content);
                } else {
                    if (res.data.slice(0, 3) == '63c') {
                        result = 'incorrect password, left try count: ' + res.data.slice(3);
                    } else {
                        result = 'verify password failed.';
                    }
                    event.sender.send('replaygetpass', result);
                }
            })
        } catch (error) {

        }
    }
})

var startMinerEvent;
ipcMain.on('start', function (event, data) {
    startMinerEvent = event;
    console.log('start miner...');
    dns.lookup(mine_hostname, (err, ip_addr, family) => {
        if (err) { console.log('invalid hostname'); return; }
        console.log('dns ip_addr:', ip_addr);
        var tee = new TeeMiner(pseudoWallet.pub_hash);
        var gPoetClient = new PoetClient([tee], 0, '', 'clinet1');
        gPoetClient.PEER_ADDR_ = [ip_addr, mine_port];
        gPoetClient._last_peer_addr = gPoetClient.PEER_ADDR_;
        gPoetClient._start();
        gPoetClient.set_peer(gPoetClient.PEER_ADDR_);
    })
})

ipcMain.on('stop', function (event, data) {
    if (!gPoetClient) return;
    if (_heartTimer) { clearInterval(_heartTimer); }
    event.sender.send('replystoptMiner','tee stop mining');
    console.log('stop miner...');
})

function getHash(_block) {
    console.log('_block:', _block);
    var version = new Buffer(4);
    version.writeInt32LE(_block['version']);
    var link_no = new Buffer(4);
    link_no.writeInt32LE(_block['link_no']);
    var prev_block = bh.hexStrToBuffer(_block['prev_block']);
    var merkle_root = bh.hexStrToBuffer(_block['merkle_root']);
    var timestamp = new Buffer(4);
    timestamp.writeInt32LE(_block['timestamp']);
    var bits = new Buffer(4);
    bits.writeInt32LE(_block['bits']);
    var nonce = new Buffer(4);
    nonce.writeInt32LE(_block['nonce']);
    var b = Buffer.concat([version, link_no, prev_block, merkle_root, timestamp, bits, nonce]);
    var h = bitcoinjs.crypto.hash256(b);
    return bh.bufToStr(h);
}

function getTotal(msg) {
    var total = 0;
    var found = msg['found'];
    for (var i = 0; i < found.length; i++) {
        total += found[i]['value'];
    }
    return total;
}

function utxoScript(msg) {
    var txns = msg['txns'];
    for (var i = 0; i < txns.length; i++) {
        var tx_outs = txns[i]['tx_out'];
        for (var j = 0; j < tx_outs.length; j++) {
            var pk_script = tx_outs[j]['pk_script'];
            // var t = new Tokenizer(s)._script;
            var s = opscript._process(pk_script);
            tx_outs[j]['pk_script'] = s;
        }
    }
    return msg;
}

// device - card
devices.on('device-activated', event => {
    let device = event.device;
    device.on('card-inserted', event => {
        var card = event.card;
        application = new Iso7816Application(card);
        //get tee wallet
        var pubkey, pubHash, pubAddr;
        transmit(SELECT).then(res => {
            transmit(cmd_pubkey).then(res => {
                pubkey = res.data.slice(0, res.data.length - 4);
                // console.log('>>> pubkey:', pubkey);
                transmit(cmd_pubkeyHash).then(res => {
                    pubHash = res.data.slice(0, res.data.length - 4);
                    transmit(cmd_pubAddr).then(res => {
                        pubAddr = res.data.slice(0, res.data.length - 4);
                        pubAddr = bh.hexStrToBuffer(pubAddr).toString('latin1');
                        pseudoWallet = new PseudoWallet(pubkey, pubHash, pubAddr);
                        console.log('>>> pseudoWallet:', pseudoWallet);
                        var tee = new TeeMiner(pubHash);
                        gPoetClient = new PoetClient([tee], 0, '', 'clinet1');
                        // dns.lookup(mine_hostname, (err, ip_addr, family) => {
                        //     if (err) { console.log('invalid hostname'); return; }
                        //     console.log('dns ip_addr:', ip_addr);
                        //     // this.PEER_ADDR_ = [ip_addr, port];
                        //     gPoetClient.PEER_ADDR_ = [ip_addr, mine_port];
                        //     gPoetClient._last_peer_addr = gPoetClient.PEER_ADDR_;
                        //     gPoetClient.start();
                        //     // gPoetClient.set_peer(gPoetClient.PEER_ADDR_);
                        // })
                    })
                });
            });
        })
    })

    device.on('card-removed', event => {
        console.log(`> [${__time__()}] Card remove from '${event.name}'`);
    })
})

devices.on('device-deactivated', event => {
    console.log(`> [${__time__()}] Device '${event.device}' Deactivated`);
})
// }
function WalletTee(_pseudoWallet) {
    this.pseudoWallet = _pseudoWallet;
}

function getPubKey() {
    return pseudoWallet.pubkey;
}

function getPubKeyHash() {
    return pseudoWallet.pub_keyhash;
}

function getPubAddr() {
    return pseudoWallet.pub_addr;
}

function transmit(cmd) {
    if (!application) throw 'card insert err';
    return application.issueCommand(str_commandApdu(cmd)).then(res => {
        // var _res = res.data;
        // console.log(`> [${__time__()}] transmit cmd:${cmd},response:${_res} ${_res.length}`);
        // if (_res.length < 4) return '';
        // if (_res.length > 128) {
        //     console.log('>>>>>>>>>>>>>>>>>> get it <<<<<<<<<<<<<<<<<<<<<');
        // }
        return res;
    }).catch(err => {
        console.log('err:', err);
    })
}


function str_commandApdu(s) {
    return new CommandApdu({ bytes: hexify.toByteArray(s) })
}

function PseudoWallet(pubKey, pubHash, pubAddr, vcn = 0) {
    // this.pubkey = pubkey;
    this.pub_key = utilkey.compress_public_key(pubKey);
    this.pub_hash = pubHash;
    this.pub_addr = pubAddr;
    var b_pub_hash = bh.hexStrToBuffer(this.pub_hash);
    this._vcn = ((b_pub_hash[30]) << 8) + b_pub_hash[31];
    this.coin_type = 0x00; // fixed to '00'
    this.pin_code = '000000'; //always reset to '000000'
    // this.pub_addr2 = utilkey.publickey_to_address(this.pub_key, this._vcn, this.coin_type, 0x00);
}


PseudoWallet.prototype.teeSign = function (payload) {
    var h = bitcoinjs.crypto.hash256(payload);
    var pinLen = parseInt(this.pin_code.length / 2);
    var n1 = pinLen << 5
    var s1 = n1.toString(16);
    if (s1.length < 2) {
        s1 += '0' + s1;
    }
    var s2 = (pinLen + 32).toString(16);
    if (s2.length < 2) {
        s2 += '0' + s;
    }
    sCmd = '802100' + s1 + s2 + this.pin_code + bh.bufToStr(h);
    return transmit(sCmd).then(res => {
        var len = res.data.length;
        return res.data.slice(0, len - 4);
    })
}


PseudoWallet.prototype.address = function () {
    return this.pub_addr;
}

PseudoWallet.prototype.publicHash = function () {
    return this.pub_hash;
}

PseudoWallet.prototype.publicKey = function () {
    return this.pub_key;
}


function TeeMiner(pubHash) {
    this.SUCC_BLOCKS_MAX = 256;
    this.succ_blocks = [];
    this.pub_keyhash = pubHash;
}

TeeMiner.prototype.check_elapsed = function (block_hash, bits, txn_num, curr_tm = '', sig_flag = '00', hi = 0) {
    if (!application) return;
    if (!curr_tm) curr_tm = timest();
    try {
        var sCmd = '8023' + sig_flag + '00';
        sCmd = bh.hexStrToBuffer(sCmd);
        var sBlockInfo = Buffer.concat([bh.hexStrToBuffer(block_hash), struct.pack('<II', [bits, txn_num])]);
        var sData = Buffer.concat([struct.pack('<IB', [curr_tm, sBlockInfo.length]), sBlockInfo]);
        sCmd = Buffer.concat([sCmd, struct.pack('<B', [sData.length]), sData]);
        sCmd = bh.bufToStr(sCmd);
        return transmit(sCmd).then(res => {
            if (res.data.length > 128) {
                this.succ_blocks.push([curr_tm, hi]);
                if (this.succ_blocks.length > this.SUCC_BLOCKS_MAX) {
                    this.succ_blocks.splice(this.SUCC_BLOCKS_MAX, 1);
                }
                return Buffer.concat([bh.hexStrToBuffer(res.buffer), bh.hexStrToBuffer(sig_flag)]);
            } else {
                // return bh.hexStrToBuffer('00');
                return '';
            }
        });
    } catch (err) {
        console.log(err);
    }
}

function timest() {
    var tmp = Date.parse(new Date()).toString();
    tmp = tmp.substr(0, 10);
    return parseInt(tmp);
}

var bindMsg = message.bindMsg;
var seq = 0;
var pks_num = 0;

//国内
var WEB_SERVER_ADDR = 'http://user1-node.nb-chain.net';
// var WEB_SERVER_ADDR = 'http://raw0.nb-chain.net';//路由节点

//交易测试

var command_type = 'makesheet';
var magic = Buffer.from([0xf9, 0x6e, 0x62, 0x74]);

var sequence = 0, makesheet, orgsheetMsg, _wait_submit = [], SHEET_CACHE_SIZE = 16, txn_binary, hash_, state_info, sn, tx_ins2 = [], tx_ins_len, pks_out0, hash_type = 1, submit = true;

function verify(addr) {
    if (addr.length <= 32) {
        throw Error('invalid address');
        return false;
    };
    for (var i = 0; i < addr.length; i++) {
        var ch = addr[i];
        if (_BASE58_CHAR.indexOf(ch) == -1) {
            throw Error('invalid address');
        }
    }
    return true;
}

function FlexTxn() {
    this.version = 0;
    this.tx_in = [];
    this.tx_out = [];
    this.lock_time = 0;
}

function Transaction() {
    this.version = 0;
    this.tx_in = [];
    this.tx_out = [];
    this.lock_time = 0;
    this.sig_raw = '';
}

function TxnIn() {
    this.prev_output = '';
    this.sig_script = '';
    this.sequence = 0;
}

function MakeSheet() {
    this.vcn = 0;
    this.sequence = 0;
    this.pay_from = [];
    this.pay_to = [];
    this.scan_count = 0;
    this.min_utxo = 0;
    this.max_utxo = 0;
    this.sort_flag = 0;
    this.last_uocks = [];
}

function PayFrom() {
    this.value = 0;
    this.address = '';
}
function PayTo() {
    this.value = 0;
    this.address = '';
}

function getWaitSubmit(res, _type) {
    var resbuf = res.body;
    var s = bh.bufToStr(resbuf);
    console.log('>>> 接收数据1:', resbuf, s, s.length);
    var payload = message.g_parse(resbuf);
    // console.log('payload:', payload, payload.length);
    var msg = new bindMsg(gFormat.orgsheet);

    orgsheetMsg = msg.parse(payload, 0)[1];
    console.log('>>>>>> orgsheetMsg:', orgsheetMsg);
    var pubHash = pseudoWallet.pub_hash;
    var coin_hash = Buffer.concat([bh.hexStrToBuffer(pubHash), Buffer([0x00])]);
    var d = {};
    var payto = makesheet.pay_to;
    if (_type == TransType._transfer) {
        for (var i = 0; i < payto.length; i++) {
            var p = payto[i];
            if (p.value != 0 || p.address.slice(0, 1) != 0x6a) {
                // console.log('>>> p.address:', p.address);
                var ret = decode_check(p.address);
                ret = bh.bufToStr(ret);
                d[ret] = p.value;
            }
        }
    }

    for (var idx = 0; idx < orgsheetMsg.tx_out.length; idx++) {
        var item = orgsheetMsg.tx_out[idx];
        if (item.value == 0 && item.pk_script.slice(0, 1) == '') {
            continue;
        }
        var tokenzier = new opscript.Tokenizer(item.pk_script, null);
        var addr = tokenzier.get_script_address();
        if (!addr) {
            console.log('Error: invalid output address (idx=)', idx);
        } else {
            var value_ = d[addr];

            if (item.value != value_) {
                if (value_ == undefined && addr.slice(4) == bh.bufToStr(coin_hash)) {

                } else {
                    console.log('Error: invalid output value (idx=)', idx);
                    // return 0;
                }
            }
            delete d[addr];

        }
    }

    for (var k in d) {
        console.log(k, d[k]);
        // if (coin_hash != addr.slice(2)) {
        //     console.log('Error: unknown output address');
        // }
        // return 0;
    }

    // pks_out0 = orgsheetMsg.pks_out;
    // pks_num = orgsheetMsg.pks_out.length;
    var pks_out = orgsheetMsg.pks_out;
    pks_out0 = [];
    for (var v in pks_out) {
        pks_out0.push(pks_out[v]['items']);
    }
    pks_num = pks_out0.length;
    // pks_num = orgsheetMsg.pks_out.length;

    var tx_In = orgsheetMsg.tx_in;
    var _len = tx_In.length;

    getAllSingedTxns(0, signEachTxn);

    function getAllSingedTxns(len, cb) {
        if (len >= 0 && len < _len && cb) {
            return cb(len).then(ret => {
                getAllSingedTxns(len + 1, cb);
                return ret;
            });
        } else {
            // console.log('tx_ins2:', tx_ins2, tx_ins2.length);
            _m1();
            // console.log('_type:', _type);
            _m2(_type);
        }
    }

    function signEachTxn(i) {
        var tx = tx_In[i];
        var _tx = new TxnIn();
        hash_type = 1;

        var _payload = make_payload(pks_out0[i], orgsheetMsg.version, tx_In, orgsheetMsg.tx_out, 0, i, hash_type);
        var h = bitcoinjs.crypto.sha256(_payload);
        var pinLen = parseInt(pseudoWallet.pin_code.length / 2);
        var n1 = pinLen << 5;
        var s1 = n1.toString(16);
        if ((s1.length & 0x01) == 1) {
            s1 += '0' + s1;
        }
        var s2 = (pinLen + 32).toString(16);
        if ((s2.length & 0x01) == 0x01) {
            s2 += '0' + s2;
        }
        var sCmd = '802100' + s1 + s2 + pseudoWallet.pin_code + bh.bufToStr(h);
        return transmit(sCmd).then(res => {
            var len = res.data.length;
            var _sig = res.data.slice(0, len - 4);  // should conside 9000
            var sig = Buffer.concat([bh.hexStrToBuffer(_sig), CHR(hash_type)]);
            var pub_key = pseudoWallet.pub_key;
            console.log('pub_key:', pub_key, pub_key.length);
            var sig_script = Buffer.concat([CHR(sig.length), sig, CHR(pub_key.length), pub_key]);
            count++;
            // tx.sig_script = bh.bufToStr(sig_script);
            _tx.sig_script = bh.bufToStr(sig_script);
            // _tx.sig_script = sig_script;
            _tx.prev_output = tx.prev_output;
            _tx.sequence = tx.sequence;
            // console.log('>>>>>>> 第' + count + '次签名', 'tx:', _tx);
            tx_ins2.push(_tx);
        })
    }
}

var _loop_timer;

function _m2(_type) {
    if (submit) {
        var unsign_num = orgsheetMsg.tx_in.length - pks_num
        if (unsign_num != 0) { // leaving to sign
            console.log('Warning: some input not signed: %i', unsign_num);
            //return 0
        } else {
            var URL = WEB_SERVER_ADDR + '/txn/sheets/txn';
            dhttp({
                method: 'POST',
                url: URL,
                body: txn_binary
            }, function (err, res) {
                if (err) throw ('err txn/sheets/txn');
                // console.log('txn_binary:', txn_binary, txn_binary.length, bh.bufToStr(txn_binary));
                // console.log('>>> msg3', res.body);
                if (res.statusCode && res.statusCode == 200) {
                    var txn_hash = getTxnHash(res);
                } else {
                    console.log('err 400 txn/sheets/txn');
                    return;
                }

                if (txn_hash) {
                    var url = WEB_SERVER_ADDR + '/txn/sheets/state?hash=' + txn_hash;
                    // var url = WEB_SERVER_ADDR + '/txn/sheets/state?hash=' + txn_hash + '&detail=1';
                    _loop_timer = setInterval(() => {
                        dhttp({
                            method: 'GET',
                            url: url,
                        }, function (err, res) {
                            // console.log(res.body);
                            loop_query_tran(res, _type);
                        })
                    }, 3000);
                }
            })
        }
    }
}

function _m1() {
    var txn = new Transaction();
    txn.version = orgsheetMsg.version;
    txn.tx_in = tx_ins2;
    txn.tx_out = orgsheetMsg.tx_out;
    txn.lock_time = orgsheetMsg.lock_time;
    txn.sig_raw = '';
    // console.log('>>> txn msg:', txn);
    //Transaction binary2
    var txn_payload = transbinary.compayloadTran(txn);
    // var m = new bindMsg(gFormat.transaction);
    // var msg3 = m.binary(payload, 0)[1];

    //txn payload magic
    txn_binary = message.g_binary(txn_payload, 'tx');
    // console.log('>>> txn_binary:', txn_binary, bh.bufToStr(txn_binary), bh.bufToStr(txn_binary).length);
    //payload  hashds excludes raw_script
    hash_ = bitcoinjs.crypto.sha256(bitcoinjs.crypto.sha256(txn_binary.slice(24, txn_binary.length - 1)));
    // console.log('>>> hash_:', hash_, hash_.length, bh.bufToStr(hash_));
    state_info = [orgsheetMsg.sequence, txn, 'requested', hash_, orgsheetMsg.last_uocks];
    _wait_submit.push(state_info);
    while (_wait_submit.length > SHEET_CACHE_SIZE) {
        _wait_submit.remove(_wait_submit[0]);
    }
}

var count = 0;

//参数n为休眠时间，单位为毫秒:
function sleep(n) {
    var start = new Date().getTime();
    //  console.log('休眠前：' + start);
    while (true) {
        if (new Date().getTime() - start > n) {
            break;
        }
    }
}

function getTxnHash(res) {
    var payload = message.g_parse(res.body);
    var m = new bindMsg(gFormat.udpconfirm);
    var msg3 = m.parse(payload, 0)[1];
    // console.log('msg3:', msg3);
    // console.log('msg3[hash]:', msg3['hash'], msg3['hash'].length);
    // console.log('>>> hash_:', hash_, hash_.length, bh.bufToStr(hash_));
    if (msg3['hash'] == bh.bufToStr(hash_)) {
        state_info[2] = 'submited';
        seq = orgsheetMsg.sequence;
        sn = seq;
        if (sn) {
            var info = submit_info(sn);
            var state = info[2];
            var txn_hash = bh.bufToStr(info[3]);
            var last_uocks = bh.bufToStr(info[4][0]);
            if (state == 'submited' && txn_hash) {
                var sDesc = '\nTransaction state:' + state;
                if (last_uocks) {
                    sDesc += ',last uock: ' + last_uocks;
                    console.log(sDesc);
                    console.log('Transaction hash:', txn_hash);
                }
            }
            return txn_hash;
        }
    }
}

function loop_query_tran(res, _type) {
    if (!res || !res.hasOwnProperty('body') || !res.hasOwnProperty('statusCode'))
        return
    var state = '';
    // if (res.statusCode && res.statusCode == 200) {
    //todo
    var command = message.getCommand(res.body);
    var payload = message.g_parse(res.body);
    if (command == 'reject') {
        var msg = new bindMsg(gFormat.udpreject);
        var rejectmsg = msg.parse(payload, 0)[1];
        var sErr = bh.hexStrToBuffer(rejectmsg.message).toString('latin1');
        if (sErr == 'in pending state') {
            state = '[' + chinaTime('YYYY-MM-DD HH:mm:ss') + ']\n' + ' pending';
            console.log(state);
        } else {
            state = 'Error:' + sErr;
            console.log('Error:', sErr);
        }
    } else if (command == 'confirm') {
        var msg = new bindMsg(gFormat.udpconfirm);
        var confirmsg = msg.parse(payload, 0)[1];
        if (confirmsg.hash == bh.bufToStr(hash_)) {
            var args = confirmsg['args'];
            var height = bh.bufToNumer(args.slice(4, 8));
            var confirm = bh.bufToNumer(args.slice(2, 4));
            var index = bh.bufToNumer(args.slice(0, 2));
            state = '[' + chinaTime('YYYY-MM-DD HH:mm:ss') + ']\n' + 'hash=' + bh.bufToStr(hash_) + ' confirm=' + confirm + ' height=' + height + ' idx=' + index;
            console.log(state);

        }
    }

    if (_type == TransType._transfer) {
        tran_event.sender.send('transresult', state);
    } else if (_type == TransType._record) {
        record_event.sender.send('recordresult', state);
    }
}

function query_sheet(pay_to, from_uocks) {
    var ext_in = null;
    var submit = true;
    var scan_count = 0;
    var min_utxo = 0;
    var max_utxo = 0;
    var sort_flag = 0;
    var from_uocks = null;
    var submit = true;
    var buf = prepare_txn1_(pay_to, ext_in, submit, scan_count, min_utxo, max_utxo, sort_flag, from_uocks);

    console.log('>>> 发送数据1:', buf, buf.length, bh.bufToStr(buf))
    // submit_txn_(buf, submit)

    var URL = WEB_SERVER_ADDR + '/txn/sheets/sheet';
    dhttp({
        method: 'POST',
        url: URL,
        body: buf
    }, function (err, res) {
        if (err) {
            seq = 0;
            return;
        };
        getWaitSubmit(res, TransType._transfer);
    })
}

function submit_info(sn) {
    // var state_info = [orgsheetMsg.sequence, txn, 'requested', hash_, orgsheetMsg.last_uocks];
    for (var i = 0; i < _wait_submit.length; i++) {
        var info = _wait_submit[i];
        if (info[0] == sn) {
            return info;
        }
    }
}


function prepare_txn1_(pay_to, ext_in, submit, scan_count, min_utxo, max_utxo, sort_flag, from_uocks) {
    sequence += 1;
    var pay_from = [];
    var pay_from1 = new PayFrom();
    pay_from1.value = 0;
    pay_from1.address = pseudoWallet.pub_addr;
    pay_from.push(pay_from1);

    var pay_to = [];
    var pay_to1 = new PayTo();
    pay_to1.value = 1 * Math.pow(10, 8);
    pay_to1.address = '1118hfRMRrJMgSCoV9ztyPcjcgcMZ1zThvqRDLUw3xCYkZwwTAbJ5o';
    pay_to.push(pay_to1);

    makesheet = new MakeSheet();
    makesheet.vcn = pseudoWallet._vcn;
    makesheet.sequence = sequence;
    makesheet.pay_from = pay_from;
    makesheet.pay_to = pay_to;
    makesheet.scan_count = scan_count;
    makesheet.min_utxo = min_utxo;
    makesheet.max_utxo = max_utxo;
    makesheet.sort_flag = sort_flag;
    // makesheet.from_uocks=from_uocks;
    makesheet.last_uocks = [0];
    // console.log('>>> 发送msg1:', makesheet);
    return submit_txn_(makesheet, submit);
}

//将makesheet对象转二进制流
function submit_txn_(msg, submit) {
    //0-4
    const magic = Buffer.from([0xf9, 0x6e, 0x62, 0x74]);
    //4-16
    var command = new Buffer(12);
    command.write('makesheet', 0);
    console.log('> msg:', msg);

    var payload = makesheetbinary.compayload(msg);

    // console.log('makesheet to payload buf\n:', payload, bh.bufToStr(payload), payload.length);
    //16-20 payload length
    var len_buf = new Buffer(4);
    var len = payload.length;
    len_buf.writeInt32LE(len);
    // //20-24 checksum
    var checksum = bh.hexToBuffer(sha256(bh.hexToBuffer(sha256(payload)))).slice(0, 4);
    var b = Buffer.concat([magic, command, len_buf, checksum, payload]);
    return b;
}

//流的转换
function make_payload(subscript, txns_ver, txns_in, txns_out, lock_time, input_index, hash_type) {
    var tx_outs;
    var tx_ins = [];
    // SIGHASH_ALL
    if ((hash_type & 0x1F) == 0x01) {
        for (var index = 0; index < txns_in.length; index++) {
            var tx_in = txns_in[index];
            var script = '';
            if (index == input_index) {
                script = subscript;
            }
            // console.log('>>> script:', script, script.length);

            tx_in.sig_script = script;
            tx_ins.push(tx_in);
        }
        tx_outs = txns_out;
    }

    // console.log('tx_outs:', tx_outs);
    if (tx_ins == null || tx_outs == null) {
        throw Error('invalid signature type');
    }

    var tx_copy = new FlexTxn();
    tx_copy.version = txns_ver;
    tx_copy.tx_in = tx_ins;
    tx_copy.tx_out = tx_outs;
    tx_copy.lock_time = lock_time;

    // console.log('>>> tx_copy msg:', tx_copy);
    // var payload = parse(tx_copy);
    // var msg = new bindMsg(gFormat.flextxn);
    // var payload = msg.binary(tx_copy, new Buffer(0));

    var payload = transbinary.compayloadTran(tx_copy);

    // console.log('>>> tx_copy payload:', bh.bufToStr(payload), bh.bufToStr(payload).length);
    //hash_type to I
    var hash_type_buf = bh.numToBuf(hash_type, false, 4);
    // var s=bh.bufToStr(hash_type_buf);
    var b = Buffer.concat([payload, hash_type_buf]);

    // console.log('tx_copy payload:', b, bh.bufToStr(b), b.length);
    return b;
}

function decode_check(v) {
    // if(Buffer.isBuffer(v)){
    //     v=bh.bufToStr(v);
    // }
    var a = bs58.decode(v);
    var ret = a.slice(0, a.length - 4);
    var check = a.slice(a.length - 4);
    var checksum = bh.hexToBuffer(sha256(bh.hexToBuffer((sha256(ret)))));
    if (checksum.compare(check) == 1) {
        return ret.slice(1);
    }
}

function CHR(n) {
    var buf = new Buffer(1);
    buf.writeUIntLE(n);
    return buf;
}

function record(content, hash, proof = false) {
    var where = "0", from_uock = 0, state = '', txn_hash, sn;
    if (hash) {
        txn_hash = hash;
    } else {
        if (!content) {
            console.log('warning: nothing to record');
        }
        // content = addn(content);
    }
    if (proof) {
        // sn = query_sheet_ex(0, ["PROOF", where, content], from_uock);
        sn = query_sheet_ex(0, ["PROOF", where, content], true);
    } else {
        // sn = query_sheet_ex(0, ["MSG", where, content], from_uock);
        sn = query_sheet_ex(0, ["MSG", where, content], true);
    }

    //todo
    // if (sn) {

    // }
}

function query_sheet_ex(protocol_id, str_list, submit = true, scan_count = 0, min_utxo = 0, max_utxo = 0, sort_flag = 0, from_uock = 0) {
    var msg = prepare_txn2_(protocol_id, str_list, scan_count, min_utxo, max_utxo,
        sort_flag, from_uock
    );
    // console.log('>>> 发送数据msg:', msg);
    var buf = getmakesheetbuf(msg);
    console.log('>>> 发送数据1:', buf, buf.length, bh.bufToStr(buf));
    var URL = WEB_SERVER_ADDR + '/txn/sheets/sheet';
    dhttp({
        method: 'POST',
        url: URL,
        body: buf
    }, function (err, res) {
        if (err) {
            seq = 0;
            return;
        };
        getWaitSubmit(res, TransType._record);
    })
}

function prepare_txn2_(protocol_id, str_list, scan_count, min_utxo, max_utxo, sort_flag, from_uock) {
    var str_list2 = [];
    var ii = 0, s;
    for (var i = 0; i < str_list.length; i++) {
        s = str_list[i];
        if (s.length > 75) {
            console.log('Error: item of RETURN list should be short than 75 bytes')
            return;
        }
        ii += s.length + 2;
        if (ii > 84) {
            console.log('Error: RETURN list exceed max byte length');
            return;
        }
        str_list2.push(s);
    }
    sequence += 1;
    // wallet = new Wallet('xieyc', 'default.cfg');

    var pay_from = [];
    var pay_from1 = new PayFrom();
    pay_from1.value = 0;
    // pay_from1.address = wallet.getAddrFromWallet();
    // pay_from1.address = wallet.getWalletData()['address'];
    pay_from1.address = pseudoWallet.pub_addr;
    pay_from.push(pay_from1);

    // var ex_format = '';

    //106, 4,protocol_id
    var b0 = bh.numToBuf(106, false, 1);
    var b1 = bh.numToBuf(4, false, 1);
    var b2 = bh.numToBuf(protocol_id, false, 4);
    //6a0400000000
    var ex_msg_buf = Buffer.concat([b0, b1, b2]);
    // var b3=Buffer.concat([b0, b1, b2]);
    // var ex_msg_buf = bh.bufToStr(b3);

    for (var i = 0; i < str_list2.length; i++) {
        s = str_list2[i];
        // var arg = [76, s.length, s];// 0x4c = 76 is OP_PUSHDATA1
        var l01 = bh.numToBuf(76, false, 1);
        var l02 = bh.numToBuf(s.length, false, 1);
        var l03 = Buffer.from(s);
        ex_msg_buf = Buffer.concat([ex_msg_buf, l01, l02, l03]);
    }

    var pay_to = [];
    var pay_to1 = new PayTo();
    pay_to1.value = 0;
    // pay_to1.address = bh.bufToStr(ex_msg_buf);
    pay_to1.address = ex_msg_buf;
    pay_to.push(pay_to1);

    makesheet = new MakeSheet();
    makesheet.vcn = 0;
    makesheet.sequence = sequence;
    makesheet.pay_from = pay_from;
    makesheet.pay_to = pay_to;
    makesheet.scan_count = scan_count;
    makesheet.min_utxo = min_utxo;
    makesheet.max_utxo = max_utxo;
    makesheet.sort_flag = sort_flag;
    makesheet.last_uocks = [from_uock];

    return makesheet;
}

function PoetClient(miners, link_no, coin, name = '') {
    this.POET_POOL_HEARTBEAT = 5 * 1000;    // heartbeat every 5 seconds, can be 5 sec ~ 50 min (3000 sec)
    this.PEER_ADDR_ = [];          // ('192.168.1.103',30303)
    this._active = false;
    this.miners = miners;
    this._name = name + '>';
    this._link_no = link_no;
    this._coin = coin;
    this._last_peer_addr = null;
    this._recv_buffer = '';
    this._last_rx_time = 0
    this._last_pong_time = 0
    this._reject_count = 0
    this._last_taskid = 0
    this._time_taskid = 0
    this._compete_src = [];
    this.socket = dgram.createSocket('udp4');
    this.set_peer = set_peer;
}

function set_peer(peer_addr) {
    var s = this.PEER_ADDR_;
    var ip = peer_addr[0], port = peer_addr[1];
    var _isIP = isIP(ip);
    if (_isIP) {
        //todo
        // this.PEER_ADDR_=[]
    } else {
        var ip = '';
        // dns.lookup(hostname, (err, ip_addr, family) => {
        //     if (err) { console.log('invalid hostname'); return; }
        //     console.log('ip_addr:', ip_addr);
        //     this.PEER_ADDR_ = [ip_addr, port];
        //     this._last_peer_addr = this.PEER_ADDR_;
        // })
    }
}

function isIP(ip) {
    var re = /^(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])$/
    return re.test(ip);
}

//负责发送数据包
PoetClient.prototype._start = function () {
    this._active = true;
    _heartTimer = setInterval(() => {
        if (this._active) {
            try {
                this.heartbeat();
                startMinerEvent.sender.send('replyStartMiner','tee mining...');
            } catch (error) {
                console.log('heartbeat error:', error);
            }
        }
    }, this.POET_POOL_HEARTBEAT);
}

PoetClient.prototype.invalid_command = function () {
    console.log('');
}

PoetClient.prototype.heartbeat = function () {
    if (this.PEER_ADDR_.length == 0) return;
    var now = timest();
    if ((now - this._time_taskid) > 1800) {
        this._last_taskid = 0;
    }
    if (this._reject_count > 120) {
        this._reject_count = 0;
        this._last_taskid = 0;
    }
    if ((now - this._last_rx_time) > 1800 && this._last_peer_addr) {
        try {
            var sock = dgram.createSocket('udp4');
            this.socket.close();
            this.socket = sock;
            this.set_peer(this._last_peer_addr);
        } catch (error) {
            console.log('renew socket err:', error);
        }
    }

    var compete_src = this._compete_src;
    if (compete_src.length == 6) {
        var miners = this.miners;
        var sn = compete_src[0], block_hash = compete_src[1], bits = compete_src[2], txn_num = compete_src[3], link_no = compete_src[4], hi = compete_src[5];
        var succ_miner = '', succ_sig = '';
        for (var i in miners) {
            miners[i].check_elapsed(block_hash, bits, txn_num, now, '00', hi).then(sig => {
                console.log('>>> sig:', sig);
                if (sig) {
                    succ_miner = miners[i];
                    succ_sig = sig;
                }
                if (succ_miner) {
                    this._compete_src = [];
                    var msg = new PoetResult(link_no, sn, succ_miner.pub_keyhash, bh.bufToStr(succ_sig));
                    var payload = dftPoetResult(msg);
                    var command = 'poetresult';
                    var msg_buf = message.g_binary(payload, command);
                    this.send_message(msg_buf, this.PEER_ADDR_);
                    console.log('>>>>>>>>>>>> success mining <<<<<<<<<<<<<<');
                    console.log(`${this._name} success mining: link=${link_no}, height=${hi}, sn=${sn}, miner=${succ_miner.pub_keyhash}'`);
                    sleep(this.POET_POOL_HEARTBEAT);
                }
            })
        }
    }

    if (now >= (this._last_rx_time + this.POET_POOL_HEARTBEAT / 1000)) {
        var msg = new GetPoetTask(this._link_no, this._last_taskid, this._time_taskid);
        var buf = new Buffer(0);
        var _bindMsg = new bindMsg(gFormat.poettask);
        var b = _bindMsg.binary(msg, buf);
        var command = 'poettask';
        var msg_buf = message.g_binary(b, command);
        this.send_message(msg_buf, this.PEER_ADDR_);
    }
}


function dftPoetResult(msg) {
    var a = new Buffer(0);
    var b;

    for (var name in msg) {
        if (name === 'link_no') {
            dftNumberI(msg['link_no']);//4
        }
        else if (name === 'curr_id') {
            dftNumberI(msg['curr_id']);//4
        } else if (name === 'miner') {
            dftBytes32(msg['miner']);
        } else if (name === 'sig_tee') {
            dftVarString(msg['sig_tee']);//4
        }
    }

    function dftBytes32(hash) {
        // var b = toBuffer(hash);
        // var b=bh.hexStrToBuffer(hash);
        var b = new Buffer(hash, 'hex');
        a = Buffer.concat([a, b]);
    }

    function dftNumberI(n) {
        b = new Buffer(4);
        //n转16进制buffer
        b.writeUInt32LE(n);
        a = Buffer.concat([a, b]);
    }

    function dftVarString(str) {
        var b = bh.hexStrToBuffer(str);
        var len = b.length;

        if (b.length < 0xFD) {
            dftNumber1(len);//1
            a = Buffer.concat([a, b]);
        }
    }

    function dftNumber1(n) {
        b = new Buffer(1);
        b.writeUInt8(n);
        a = Buffer.concat([a, b]);
    }

    return a;
}

PoetClient.prototype.send_message = function (msg, peer_addr) {
    var that = this;
    //msg->binary
    this.socket.send(msg, 0, msg.length, this.PEER_ADDR_[1], this.PEER_ADDR_[0], function (err, bytes) {
        if (err) {
            console.log('send err');
        } else {
            console.log('>>> send data:', bh.bufToStr(msg), bh.bufToStr(msg).length);
        }
    });

    this.socket.on('message', function (msg, rinfo) {
        console.log('>>> res data', bh.bufToStr(msg), bh.bufToStr(msg).length);
        that._recv_buffer = msg;
        that._last_rx_time = timest();
        that.command = message.getCommand(msg);
        addr = rinfo;

        if (that._recv_buffer) {
            var len = first_msg_len(that._recv_buffer);
            if (len && len <= that._recv_buffer.length) {
                var data = that._recv_buffer.slice(0);
                try {
                    var payload = message.g_parse(data);
                    that._recv_buffer = that._recv_buffer.slice(len);
                    len = first_msg_len(that._recv_buffer);
                    that._msg_ = payload;
                    try {
                        that.handle_message(payload, that);
                    } catch (error) {
                        // console.log('handle_message err');
                    }
                } catch (error) {
                    console.log('handle err:', error);

                }
            }
        }
    })

}

PoetClient.prototype.handle_message = function (payload, that) {
    // var sCmd = message.getCommand(payload);
    var sCmd = that.command;
    console.log('>>> sCmd:', sCmd);
    if (sCmd == 'poetinfo') {
        var _bindMsg = new bindMsg(gFormat.poetinfo);
        var msg = _bindMsg.parse(payload, 0)[1];
        // console.log('>>> sCmd:%s\n>>> msg:%o',sCmd,msg);

        // console.log('>>> sCmd:%s', sCmd);
        if (msg.curr_id > that._last_taskid) {
            // this._compete_src = ;
            that._compete_src = [msg.curr_id, msg.block_hash, msg.bits, msg.txn_num, msg.link_no, msg.height];
            that._last_taskid = msg.curr_id;
            that._time_taskid = that._last_rx_time;
            that._reject_count = 0;
            console.log('>>> (%s) receive a task: link=%d,height=%d,sn=%d', that._name, msg.link_no, msg.height, msg.curr_id);
        }
    } else if (sCmd = 'poetreject') {//状态未更新ok
        var _bindMsg = new bindMsg(gFormat.poetreject);
        var msg = _bindMsg.parse(payload, 0)[1];
        if (msg.timestamp == that._time_taskid) {
            var b = bh.hexStrToBuffer(msg.reason);
            var reason = b.toString('latin1');
            // console.log('>>> sCmd:%s %s\n>>> msg:%o',sCmd,reason,msg);
            console.log('>>> sCmd:%s %s', sCmd, reason);
            //missed task old
            //invalid current task not exist
            if (reason == 'missed' && that._last_taskid == msg.sequence) {

            } else {
                //invalid
                that._compete_src = [];
                that._reject_count += 1;
            }
        }
        that._last_pong_time = that._last_rx_time;
    } else if (sCmd == 'pong') {
        console.log('>>> sCmd:%s\n>>> msg:%o', sCmd, msg);
        that._last_pong_time = that._last_rx_time;
    }
}

function GetPoetTask(link_no, curr_id, timestamp) {
    this.link_no = link_no;
    this.curr_id = curr_id;
    this.timestamp = timestamp;
}

function PoetResult(link_no, curr_id, miner, sig_tee) {
    this.link_no = link_no;
    this.curr_id = curr_id;
    this.miner = miner;
    this.sig_tee = sig_tee;
}

function first_msg_len(data) {
    if (data == undefined) return 0;
    if (data.length < 20) {// not enough to determine payload size yet
        return 0;
    }
    return data.length;
    //todo
    // return struct.unpack('<I', data.slic)[0] + 24
}

function exit() {
    var s = this._recv_buffer;
    console.log(s);
}

function sleep(delay) {
    var startTime = new Date().getTime();
    while (new Date().getTime() < startTime + delay) {
        //堵塞
    }
}

function timest() {
    var tmp = Date.parse(new Date()).toString();
    tmp = tmp.substr(0, 10);
    return parseInt(tmp);
}

function getmakesheetbuf(msg) {
    //0-4
    const magic = Buffer.from([0xf9, 0x6e, 0x62, 0x74]);
    //4-16
    var command = new Buffer(12);
    command.write('makesheet', 0);
    // console.log('> msg:', msg);
    var payload = makesheetbinary.compayload(msg);
    console.log('makesheet to payload buf\n:', payload, bh.bufToStr(payload), payload.length);
    //16-20 payload length
    var len_buf = new Buffer(4);
    var len = payload.length;
    len_buf.writeInt32LE(len);
    // //20-24 checksum
    var checksum = bh.hexToBuffer(sha256(bh.hexToBuffer(sha256(payload)))).slice(0, 4);
    var b = Buffer.concat([magic, command, len_buf, checksum, payload]);
    return b;
}

function addn(str) {
    var t = '';
    for (var i = 0; i < str.length; i++) {
        if (i < str.length - 1) {
            t += str[i] + '\n';
        } else {
            t += str[i];
        }
    }
    return t;
}