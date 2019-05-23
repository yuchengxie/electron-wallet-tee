let http = require('http');
var dhttp = require('dhttp');
var message = require('./message');
var gFormat = require('./format');
var wallet = require('./wallet');
const bh = require('./bufferhelp');
const sha256 = require('js-sha256');
const bs58 = require('bs58')
const bitcoinjs = require('bitcoinjs-lib');
const opscript = require('./op/script');
var WEB_SERVER_ADDR = 'http://user1-node.nb-chain.net';
var bindMsg = message.bindMsg;



//binary测试
// 00 00 00 00 5f b8 ac 5c 36 31 31 31 38 4d 69 35 58 78 71 6d 71 54 42 70 37 54 6e 50 51 64 31 48 6b 
// 39 58 59 61 67 4a 51 70 44 63 5a 75 36 45 69 47 45 ...
// var m = {
//     link_no: 1,
//     timestamp: 1554798165,
//     account: '1118Mi5XxqmqTBp7TnPQd1Hk9XYagJQpDcZu6EiGE1VbXHAw9iZGPV',
//     search: 1024,
//     found: [
//         {
//             uock: 111,
//             value: 222,
//             height: 333
//         }
//     ]
// }
// console.log(m);
// var buf = new Buffer(0);
// msg = new bindMsg(gFormat.info);
// var b = msg.binary(m, buf);
// msg = new bindMsg(gFormat.info);
// var b = msg.parse(payload, 0);
// console.log('b:', b);


//parse测试
// var testBuf = Buffer('\x02\x11\x00\x00\x00\x11\x00\x00\x00');
// var testBuf = Buffer.from('02020101010101010100102a040201030502030203aa0d01001020304050607070201000000001010101020202', 'hex');
// console.log(testBuf, testBuf.length);
//测试数组
// var msg = new bindMsg(gFormat.txns)
// console.log(msg);
// var b = msg.parse(testBuf, 0);
// console.log(b);
//测试固定长度字符串
// var msg = new bindMsg(gFormat.S);
// var b = msg.parse(testBuf, 0);
// console.log(msg);
// console.log(b);
//测试变长字符串
// var msg = new bindMsg(gFormat.S);
// var b = msg.parse(testBuf, 0);
// console.log(b);
//测试一个对象
// msg = new bindMsg(gFormat.test1);
// var b = msg.parse(testBuf, 0);
// console.log('b:', b);


// 测试info
// var URL = 'http://raw0.nb-chain.net/txn/state/account?addr=1118Mi5XxqmqTBp7TnPQd1Hk9XYagJQpDcZu6EiGE1VbXHAw9iZGPV&uock=0&uock2=0';
// dhttp({
//     method: 'GET',
//     url: URL,
// }, function (err, res) {
//     if (err) throw err;
//     buf = res.body;
//     var payload = message.g_parse(buf);
//     var msg = message.parseInfo(payload)[1];
//     var msg1 = {};
//     msg1.account = bh.hexToBuffer(msg['account']).toString('latin1');
//     msg1.timestamp = msg['timestamp'];
//     msg1.link_no = msg['link_no'];
//     var arrfound = [];
//     var total = 0;
//     for (var i = 0; i < msg['found'].length; i++) {
//         var found_item = {};
//         var m = msg['found'][i];
//         var height = m['height'];
//         var value = m['value'];
//         var uock = m['uock'];
//         found_item.uock = uock;
//         found_item.height = height;
//         found_item.value = value;
//         arrfound.push(found_item);
//         total += value;
//     }
//     msg1.found = arrfound;
//     msg1.total = total;
//     console.log('> info msg:', msg1);

//     // event.sender.send('replyinfo', msg1);
// })

// function getTotal(msg) {
//     var total = 0;
//     var found = msg['found'];
//     for (var i = 0; i < found.length; i++) {
//         total += found[i]['value'];
//     }
//     return total;
// }

//测试utxo
var URL = 'http://raw0.nb-chain.net/txn/state/account?addr=1118Mi5XxqmqTBp7TnPQd1Hk9XYagJQpDcZu6EiGE1VbXHAw9iZGPV&uock=0&uock2=0';
var URL = 'http://raw0.nb-chain.net/txn/state/uock?addr=1118Mi5XxqmqTBp7TnPQd1Hk9XYagJQpDcZu6EiGE1VbXHAw9iZGPV&num=5&uock2=[]'
var URL = 'http://raw0.nb-chain.net/txn/state/uock?addr=1118Mi5XxqmqTBp7TnPQd1Hk9XYagJQpDcZu6EiGE1VbXHAw9iZGPV&num=5&uock2=[]'
dhttp({
    method: 'GET',
    url: URL,
}, function (err, res) {
    if (err) throw err;
    var buf = res.body;
    console.log('> res:', buf, buf.length);
    var payload = message.g_parse(buf);
    console.log('> res:', payload, payload.length);
    var msg = message.parseUtxo(payload)[1];
    msg = utxoScript(msg);

    console.log('> msg:', msg);
})

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

//测试block
// var url = 'http://raw0.nb-chain.net/txn/state/block?&hash=0000000000000000000000000000000000000000000000000000000000000000&hi=20299'
// dhttp({
//     url: url,
//     method: 'GET'
// }, function (err, res) {
//     if (err) throw 'getinfo err';
//     var buf = res.body;
//     console.log('> res:', buf, buf.length);
//     var payload = message.g_parse(buf);
//     var msg = message.parseBlock(payload)[1];
//     console.log('> msg:', msg);
// })

// var height = 20299;
// var hash = '00...';
// var URL = 'http://raw0.nb-chain.net/txn/state/block?&hash=0000000000000000000000000000000000000000000000000000000000000000&hi=20299'

// console.log('URL:', URL);
// http.get(URL, function (req) {
//     req.headers = {
//         'Content-Type': 'application/x-www-form-urlencoded',
//     }
//     req.timeout = 30;
//     // var arr = [];
//     var buf=new Buffer(0);
//     req.on('data', function (chunk) {
//         // arr.push(chunk);
//         buf=Buffer.concat([buf,chunk]);
//     });
//     req.on('end', function () {
//         console.log('> buf:',buf,buf.length);
//         var payload = message.g_parse(buf);
//         var msg = message.parseBlock(payload);
//         // var msg = message.parseBlock(payload);
//         console.log('> msg:', msg[1],msg[0]);
//     });
// });


// var url = WEB_SERVER_ADDR + '/txn/state/block?&hash=0000000000000000000000000000000000000000000000000000000000000000&hi=-1&hi=-2';
// dhttp({
//     url: url,
//     method: 'GET'
// }, function (err, res) {
//     if (err) throw 'getblock err';
//     var buf = res.body;
//     var payload = message.g_parse(buf);
//     var msg = message.parseBlock(payload)[1];
//     console.log('> msg:', msg);

//     var headers = msg['headers'];
//     var blocks = [];
//     for (var idx in headers) {
//         var _block = {};
//         _block.height = msg['heights'][idx];
//         _block.txck = msg['txcks'][idx];

//         _block.version = headers[idx]['version'];
//         _block.link_no = headers[idx]['link_no'];
//         _block.prev_block = headers[idx]['prev_block'];
//         _block.merkle_root = headers[idx]['merkle_root'];
//         _block.timestamp = headers[idx]['timestamp'];
//         _block.bits = headers[idx]['bits'];
//         _block.nonce = headers[idx]['nonce'];


//         _block.miner = headers[idx]['miner'];
//         _block.txn_count = headers[idx]['txn_count'];
//         _block.hash = getHash(_block);

//         blocks.push(_block);

//         console.log('>>> _block:', _block);
//     }
//     console.log('>>> blocks:', blocks);


//     // event.sender.send('replyblock', msg);
// })

// function getHash(_block) {
//     console.log('_block:', _block);
//     var version = new Buffer(4);
//     version.writeInt32LE(_block['version']);
//     var link_no = new Buffer(4);
//     link_no.writeInt32LE(_block['link_no']);
//     var prev_block = bh.hexStrToBuffer(_block['prev_block']);
//     var merkle_root = bh.hexStrToBuffer(_block['merkle_root']);
//     var timestamp = new Buffer(4);
//     timestamp.writeInt32LE(_block['timestamp']);
//     var bits = new Buffer(4);
//     bits.writeInt32LE(_block['bits']);
//     var nonce = new Buffer(4);
//     nonce.writeInt32LE(_block['nonce']);
//     var b = Buffer.concat([version, link_no, prev_block, merkle_root, timestamp, bits, nonce]);
//     console.log('get b:', b, bh.bufToStr(b));
//     var h = bitcoinjs.crypto.hash256(b);
//     return bh.bufToStr(h);
// }

// const Wallet=require('./wallet');

// var wallet =new Wallet();
// wallet.changeWallet('111.cfg','123456');
// var a=1;