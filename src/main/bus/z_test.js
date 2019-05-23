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
const Devices = smartcard.Devices;

const devices = new Devices();
const CommandApdu = smartcard.CommandApdu;
var application;
var mine_hostname = 'user1-node.nb-chain.net';
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

function PseudoWallet(pubkey, pubHash, pubAddr, vcn = 0) {
	this.pubkey = pubkey;
	this.pub_hash = pubHash;
	this.pub_addr = pubAddr;
	this._vcn = vcn;
	this.coin_type = 0x00; // fixed to '00'
	this.pin_code = '000000'; //always reset to '000000'
}

PseudoWallet.prototype.teeSign = function (payload) {
	var h = bitcoinjs.crypto.hash256(payload);
	var pinLen = parseInt(this.pin_code.length / 2);
	sCmd = '802100' + '50000' + (pinLen + 32) + this.pin_code + h;
	return transmit(sCmd).then(res => {
		return res.data;
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
				console.log('>>> pubkey:', pubkey);
				transmit(cmd_pubkeyHash).then(res => {
					pubHash = res.data.slice(0, res.data.length - 4);
					transmit(cmd_pubAddr).then(res => {
						pubAddr = res.data.slice(0, res.data.length - 4);
						pubAddr = bh.hexStrToBuffer(pubAddr).toString('latin1');
						pseudoWallet = new PseudoWallet(pubkey, pubHash, pubAddr);
						console.log('>>> pseudoWallet:', pseudoWallet);
					})

					// pseudoWallet.ready = true;
					// this.instance = pseudoWallet;
					// console.log('>>> pseudoWallet:', pseudoWallet);
					// var tee = new TeeMiner(pubHash);
					// var gPoetClient = new PoetClient([tee], 0, '', 'clinet1');
					// dns.lookup(mine_hostname, (err, ip_addr, family) => {
					//     if (err) { console.log('invalid hostname'); return; }
					//     console.log('dns ip_addr:', ip_addr);
					//     // this.PEER_ADDR_ = [ip_addr, port];
					//     gPoetClient.PEER_ADDR_ = [ip_addr, mine_port];
					//     gPoetClient._last_peer_addr = gPoetClient.PEER_ADDR_;
					//     //1.获取地址
					//     getPubAddr();
					//     //2.获取
					//     //1. 挖矿
					//     // gPoetClient.start();
					//     // gPoetClient.set_peer(gPoetClient.PEER_ADDR_);
					// })
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
        console.log(`> [${__time__()}] transmit cmd:${cmd},response:${_res} ${_res.length}`);
        if (_res.length < 4) return '';
        if (_res.length > 128) {
            console.log('>>>>>>>>>>>>>>>>>> get it <<<<<<<<<<<<<<<<<<<<<');
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