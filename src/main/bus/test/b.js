const CTime = require("china-time");
// var t_now=CTime("YYYY-MM-DD HH:mm:ss");
// console.log(CTime("YYYY-MM-DD HH:mm:ss")); // 2018-02-07 13:08:17

// function runAsync1() {
//   var promise = new Promise(function(resolve, reject) {
//     setTimeout(function() {
//       console.log("异步1完成");
//       resolve("xxx1");
//     }, 1000);
//   });
//   return promise;
// }

// function runAsync2() {
//   var promise = new Promise(function(resolve, reject) {
//     setTimeout(function() {
//       console.log("异步2完成");
//       resolve("xxx2");
//     }, 2000);
//   });
//   return promise;
// }

// function runAsync3() {
//   var promise = new Promise(function(resolve, reject) {
//     setTimeout(function() {
//       console.log("异步3完成");
//       resolve("xxx3");
//     }, 2000);
//   });
//   return promise;
// }

// runAsync1()
// 	.then(function (data) {
// 		console.log('runAsync1 拿到数据:', data);
// 		return runAsync2();
// 	})
// 	.then(function (data) {
// 		console.log('runAsync2 拿到数据:', data);
// 		return runAsync3();
// 	})
// 	.then(function (data) {
// 		console.log('runAsync3 拿到数据:', data);
// 	});
// runAsync1();
// runAsync2();
// runAsync3();

//不是顺序执行
// runAsync1().then(res => {
// 	console.log('res1');
// });
// runAsync2().then(res => {
// 	console.log('res2');
// });
// runAsync3().then(res => {
// 	console.log('res3');
// });
var confirmsg = { arg: 123456 };
var hi = confirmsg["arg"] & 0xffffffff;
var num = (confirmsg["arg"] >> 32) & 0xffff;
var idx = (confirmsg["arg"] >> 48) & 0xffff;
// console.log(hi);
// console.log(num);
// console.log(idx);
// var bt=require('bitcoinjs-lib');
// var s=bt.crypto.hash256('nihao');
// console.log(s,s.length);
// var bh=require('../bufferhelp');
// var n=52;
// var b=bh.numToBuf(n,false,1);
// var c=bh.bufToStr(b);
// console.log(c);

const Wallet = require("../wallet");
const bh = require("../bufferhelp");
const bitcoin = require("bitcoinjs-lib");
const js_hash256 = require("js-sha256");
const bip32=require('bip32');

// var b = new Buffer("abcd123");
// console.log(b);
var i = 0;
var current_sign;

// var time1 = setInterval(() => {
//   ttt();
// }, 1);

var s =
  "010000000131a66dd0de9f7f68936a1058ecc1c6c623018f73deca93744b4124ed9fb6aa0f010000002876b8230000db83cf42e02199d4fa29d14a197a167ade519298f0c2f98ec5478092497bcd5c00b7acffffffff0200e1f505000000002876b8230000e5c7b20d5b5037f86e9861cd8795be42e8093c61bd36256a2b5a22df6508a8ba00b7aca0ff2d6f090000002876b8230000db83cf42e02199d4fa29d14a197a167ade519298f0c2f98ec5478092497bcd5c00b7ac0000000001000000";
var buf = bh.hexStrToBuffer(s);

ttt();

function ttt() {
  var wallet = new Wallet("xieyc", "default.cfg");
  var sign = wallet.sign(buf);

  // if (bh.bufToStr(sign) != current_sign) {
  //   current_sign = bh.bufToStr(sign);
  //   if (i > 0) {
  //     clearInterval(time1);
  //   }
  // }

//   console.log(">>> h:\n", hash2, hash2.length, bh.bufToStr(hash2));
  var t_now = CTime("YYYY-MM-DD HH:mm:ss");
  i++;
  console.log(
    t_now + " num=" + i,
    "\n>>> sign:\n",
    sign.length,
    bh.bufToStr(sign)
  );
//   verify(sign.toString("hex"));
}

// function verify(signAsStr) {
//   let signAsBuffer = Buffer.from(signAsStr, "hex"),
//     signature = bitcoin.ECSignature.fromDER(signAsBuffer), // ECSignature对象
//     hash = bitcoin.crypto.sha256(s);
//   (pubKeyAsStr =
//     "0359ab7f9706f12f046363ce126c63ab8b6d9ab27285f933b3f00df330782dd5d8"),
//     (pubKeyAsBuffer = Buffer.from(pubKeyAsStr, "hex")),
//     (pubKeyOnly = bitcoin.ECPair.fromPublicKeyBuffer(pubKeyAsBuffer)); // 从public key构造ECPair
//   // 验证签名:
//   let result = pubKeyOnly.verify(hash, signature);
//   console.log("Verify result: " + result);
// }
