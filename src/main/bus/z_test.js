const smartcard = require('smartcard');
const CTime = require('china-time');
const bh = require('./bufferhelp');
const hexify = require('hexify');
const dns = require('dns');
const Iso7816Application = smartcard.Iso7816Application;
// const PseudoWallet = require('./pseudowallet').PseudoWallet;
const PoetClient = require('./mine_client').PoetClient;
const utilkey = require('./utilkey');
const struct = require('./struct');
const co = require('co');

const Devices = smartcard.Devices;

const devices = new Devices();
const CommandApdu = smartcard.CommandApdu;
var application;
var mine_hostname = 'user1-node.nb-chain.net';
// var mine_hostname = 'raw0.nb-chain.net';
var mine_port = 30302;
// var MINING_NODE_ADDR = ['user1-node.nb-chain.net', 30302];

var SELECT = '00A404000ED196300077130010000000020101';
var cmd_pubAddr = '80220200020000';
var cmd_pubkey = '8022000000';
var cmd_pubkeyHash = '8022010000';
var GET_RESPONSE = '0x00c00000';

var __time__ = () => { return `${CTime("YYYY-MM-DD HH:mm:ss")}` };
var pseudoWallet;
// this.pseudoWallet=''

function PseudoWallet(pubKey, pubHash, pubAddr, vcn = 0) {
	// this.pubkey = pubkey;
	this.pub_key = utilkey.compress_public_key(pubKey);
	this.pub_hash = pubHash;
	this.pub_addr = pubAddr;
	var b_pub_hash = bufferhelp.hexStrToBuffer(this.pub_hash);
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

function _startMing() {
	var gPseudoWallet, gPoetClient;
	try {
		pubKey = getPubKey()
		pubHash = getPubKeyHash()
	} catch (err) {
		console.log('warning: start mining failed (invalid account)');
		return;
	}
	//todo
	console.log('mining task starting ...')
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
						query_sheet('', '');
					
						// dns.lookup(mine_hostname, (err, ip_addr, family) => {
						// 	if (err) { console.log('invalid hostname'); return; }
						// 	console.log('dns ip_addr:', ip_addr);
						// 	// this.PEER_ADDR_ = [ip_addr, port];
						// 	var tee = new TeeMiner(pubHash);
						// 	var gPoetClient = new PoetClient([tee], 0, '', 'clinet1');
						// 	gPoetClient.PEER_ADDR_ = [ip_addr, mine_port];
						// 	gPoetClient._last_peer_addr = gPoetClient.PEER_ADDR_;
						// 	//1.获取地址
						// 	// getPubAddr();
						// 	//2.获取
						// 	//1. 挖矿
						// 	gPoetClient._start();
						// 	gPoetClient.set_peer(gPoetClient.PEER_ADDR_);
						// })
					})

					// pseudoWallet.ready = true;
					// this.instance = pseudoWallet;
					// console.log('>>> pseudoWallet:', pseudoWallet);
					
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

function transmit(cmd) {
	if (!application) throw 'card insert err';
	return application.issueCommand(str_commandApdu(cmd)).then(res => {
		var _res = res.data;
		// console.log(`> [${__time__()}] transmit cmd:${cmd},response:${_res} ${_res.length}`);
		if (_res.length < 4) return '';
		if (_res.length > 128) {
			// console.log('>>>>>>>>>>>>>>>>>> get it <<<<<<<<<<<<<<<<<<<<<');
		}
		return res;
	}).catch(err => {
		console.log('err:', err);
	})
}

function str_commandApdu(s) {
	return new CommandApdu({ bytes: hexify.toByteArray(s) })
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



var dhttp = require('dhttp');
var message = require('./message2');
var gFormat = require('./format2');
var Wallet = require('./wallet');
const bufferhelp = require('./bufferhelp');
const sha256 = require('js-sha256');
const bitcoinjs = require('bitcoinjs-lib')
const bs58 = require('bs58');
const makesheetbinary = require('./makesheet');
const transbinary = require('./transaction');
const chinaTime = require('china-time');
const opscript = require('./op/script');

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

function getWaitSubmit(res) {
	var resbuf = res.body;
	var s = bufferhelp.bufToStr(resbuf);
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
	for (var i = 0; i < payto.length; i++) {
		var p = payto[i];
		if (p.value != 0 || p.address.slice(0, 1) != 0x6a) {
			var ret = decode_check(p.address);
			ret = bufferhelp.bufToStr(ret);
			d[ret] = p.value;
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
			value_ = d[addr];

			if (item.value != value_) {
				if (value_ == undefined && addr.slice(4) == bufferhelp.bufToStr(coin_hash)) {

				} else {
					console.log('Error: invalid output value (idx=)', idx);
					// return 0;
				}
			}
			delete d[addr];

		}
	}

	for (k in d) {
		console.log(k, d[k]);
		if (coin_hash != addr.slice(2)) {
			console.log('Error: unknown output address');
		}
		return 0;
	}

	// pks_out0 = orgsheetMsg.pks_out;
	// pks_num = orgsheetMsg.pks_out.length;
	var pks_out = orgsheetMsg.pks_out;
	pks_out0 = [];
	for (v in pks_out) {
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
			console.log('tx_ins2:', tx_ins2, tx_ins2.length);
			_m1();
			_m2();
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
		sCmd = '802100' + s1 + s2 + pseudoWallet.pin_code + bh.bufToStr(h);
		return transmit(sCmd).then(res => {
			var len = res.data.length;
			var _sig = res.data.slice(0, len - 4);  // should conside 9000
			var sig = Buffer.concat([bh.hexStrToBuffer(_sig), CHR(hash_type)]);
			var pub_key = pseudoWallet.pub_key;
			console.log('pub_key:', pub_key, pub_key.length);
			var sig_script = Buffer.concat([CHR(sig.length), sig, CHR(pub_key.length), pub_key]);
			count++;
			// tx.sig_script = bufferhelp.bufToStr(sig_script);
			_tx.sig_script = bufferhelp.bufToStr(sig_script);
			// _tx.sig_script = sig_script;
			_tx.prev_output = tx.prev_output;
			_tx.sequence = tx.sequence;
			console.log('>>>>>>> 第' + count + '次签名', 'tx:', _tx);
			tx_ins2.push(_tx);
		})
	}
}

// function getAllSingedTxns(len, cb) {
// 	if (len >= 0 && len < _len && cb) {
// 		return cb(len).then(ret => {
// 			getAllSingedTxns(len + 1, cb);
// 			return ret;
// 		});
// 	} else {
// 		console.log('tx_ins2:', tx_ins2, tx_ins2.length);
// 		_m1();
// 		_m2();
// 	}
// }

function _m2() {
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
				console.log('txn_binary:', txn_binary, txn_binary.length, bufferhelp.bufToStr(txn_binary));
				console.log('>>> msg3', res.body);
				if (res.statusCode == 200) {
					var txn_hash = getTxnHash(res);
				} else {
					console.log('err 400 txn/sheets/txn');
					return;
				}

				if (txn_hash) {
					var url = WEB_SERVER_ADDR + '/txn/sheets/state?hash=' + txn_hash;
					setInterval(() => {
						dhttp({
							method: 'GET',
							url: url,
						}, function (err, res) {
							loop_query_tran(res);
						})
					}, 10000);
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
	console.log('>>> txn msg:', txn);
	//Transaction binary2
	var txn_payload = transbinary.compayloadTran(txn);
	// var m = new bindMsg(gFormat.transaction);
	// var msg3 = m.binary(payload, 0)[1];

	//txn payload magic
	txn_binary = message.g_binary(txn_payload, 'tx');
	console.log('>>> txn_binary:', txn_binary, bufferhelp.bufToStr(txn_binary), bufferhelp.bufToStr(txn_binary).length);
	//payload  hashds excludes raw_script
	hash_ = bitcoinjs.crypto.sha256(bitcoinjs.crypto.sha256(txn_binary.slice(24, txn_binary.length - 1)));
	// console.log('>>> hash_:', hash_, hash_.length, bufferhelp.bufToStr(hash_));
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
	console.log('msg3:', msg3);
	console.log('msg3[hash]:', msg3['hash'], msg3['hash'].length);
	console.log('>>> hash_:', hash_, hash_.length, bufferhelp.bufToStr(hash_));
	if (msg3['hash'] == bufferhelp.bufToStr(hash_)) {
		state_info[2] = 'submited';
		seq = orgsheetMsg.sequence;
		sn = seq;
		if (sn) {
			var info = submit_info(sn);
			var state = info[2];
			var txn_hash = bufferhelp.bufToStr(info[3]);
			var last_uocks = bh.bufToNumer(info[4][0]);
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

function loop_query_tran(res) {
	if (res.statusCode = 200) {
		//todo
		var command = message.getCommand(res.body);
		var payload = message.g_parse(res.body);
		if (command == 'reject') {
			var msg = new bindMsg(gFormat.udpreject);
			var rejectmsg = msg.parse(payload, 0)[1];
			var sErr = bh.hexStrToBuffer(rejectmsg.message).toString('latin1');
			if (sErr == 'in pending state') {
				console.log('Transaction state :pending...')
			} else {
				console.log('Error:', sErr);
			}
		}
		if (command == 'confirm') {
			var msg = new bindMsg(gFormat.udpconfirm);
			var confirmsg = msg.parse(payload, 0)[1];
			if (confirmsg.hash == bufferhelp.bufToStr(hash_)) {
				// Transaction state: confirm=106, height=35208, index=1
				var args = confirmsg['args'];
				// var height = (args & 0xffffffff);
				var height = bufferhelp.bufToNumer(args.slice(4, 8));
				// var confirm = ((args >> 32) & 0xffff);
				var confirm = bufferhelp.bufToNumer(args.slice(2, 4));
				// var index = ((args >> 48) & 0xffff);
				var index = bufferhelp.bufToNumer(args.slice(0, 2));
				var state = '[' + chinaTime('YYYY-MM-DD HH:mm:ss') + '] ' + 'tran_hash=' + bufferhelp.bufToStr(hash_) + ' confirm=' + confirm + ' height=' + height + ' idx=' + index;
				console.log(state);
			}
		}
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

	console.log('>>> 发送数据1:', buf, buf.length, bufferhelp.bufToStr(buf))
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
		getWaitSubmit(res);
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
	console.log('>>> 发送msg1:',makesheet);
	return submit_txn_(makesheet, submit);
}

//将makesheet对象转二进制流
function submit_txn_(msg, submit) {
	//0-4
	const magic = Buffer.from([0xf9, 0x6e, 0x62, 0x74]);
	//4-16
	var command = new Buffer(12);
	command.write('makesheet', 0);

	// var payload = makesheetbinary.compayload(msg);//165个字节
	var _bind=new bindMsg(gFormat.makesheet);
	var payload=_bind.binary(msg,Buffer.from(''));

	console.log('makesheet to payload buf\n:', payload, bufferhelp.bufToStr(payload), payload.length);
	//16-20 payload length
	var len_buf = new Buffer(4);
	var len = payload.length;
	len_buf.writeInt32LE(len);
	// //20-24 checksum
	var checksum = bufferhelp.hexToBuffer(sha256(bufferhelp.hexToBuffer(sha256(payload)))).slice(0, 4);
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
			console.log('>>> script:', script, script.length);

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

	console.log('>>> tx_copy msg:', tx_copy);
	// var payload = parse(tx_copy);
	// var msg = new bindMsg(gFormat.flextxn);
	// var payload = msg.binary(tx_copy, new Buffer(0));

	var payload = transbinary.compayloadTran(tx_copy);

	console.log('>>> tx_copy payload:', bh.bufToStr(payload), bh.bufToStr(payload).length);
	//hash_type to I
	var hash_type_buf = bufferhelp.numToBuf(hash_type, false, 4);
	// var s=bufferhelp.bufToStr(hash_type_buf);
	var b = Buffer.concat([payload, hash_type_buf]);

	// console.log('tx_copy payload:', b, bufferhelp.bufToStr(b), b.length);
	return b;
}

function decode_check(v) {
	var a = bs58.decode(v);
	var ret = a.slice(0, a.length - 4);
	var check = a.slice(a.length - 4);
	var checksum = bufferhelp.hexToBuffer(sha256(bufferhelp.hexToBuffer((sha256(ret)))));
	if (checksum.compare(check) == 1) {
		return ret.slice(1);
	}
}

function CHR(n) {
	var buf = new Buffer(1);
	buf.writeUIntLE(n);
	return buf;
}



//test
// var _timer = setInterval(() => {
// 	var _total = [{ 'name': 'xyc', 'age': 18 }, { 'name': 'zjm', 'age': 20 }];
// 	// var _len = _total.length;
// 	// var tx_ins2 = [];
// 	// tx_ins_len=orgsheetMsg.tx_in.length;
// 	if (application) {

// 		function a(tx, cb) {
// 			// console.log('执行a函数 _tx:', _tx);
// 			return transmit(cmd_pubAddr).then(res => {
// 				tx.sig = res.data;
// 				var v = cb && cb(tx);
// 				return v;
// 			});
// 		}

// 		function b(tx) {
// 			console.log('执行b函数 _tx:', tx);
// 			tx_ins2.push(tx);
// 			// return tx_ins2;
// 		}

// 		function m(i) {
// 			return a(_total[i], b).then(r => {
// 				return r;
// 			});
// 		}

// 		function c(len, cb) {
// 			if (len >= 0 && len < _total.length && cb) {
// 				return cb(len).then(ret => {
// 					// console.log('>>> 执行c里的回调函数最终结果:', ret);
// 					c(len + 1, cb);
// 					return ret;
// 				});
// 			} else {
// 				console.log('循环异步完成结果:', tx_ins2, tx_ins2.length);
// 				main1();
// 				main2();
// 				main3();
// 				main4();

// 				for (var i = 0; i < 3; i++) {
// 					console.log('循环 i:', i);
// 				}
// 			}
// 		}

// 		function main1() {
// 			console.log('main1...');
// 		}

// 		function main2() {
// 			console.log('main2...');
// 		}

// 		function main3() {
// 			console.log('main3...');
// 		}

// 		function main4() {
// 			console.log('main4...');
// 		}

// 		// c(0, m);

// 		clearInterval(_timer);
// 	}
// }, 2000);
