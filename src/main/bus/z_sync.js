
//test
var _timer = setInterval(() => {
	var _total = [{ 'name': 'xyc', 'age': 18 }, { 'name': 'zjm', 'age': 20 }];
	var _len = _total.length;
	var tx_ins2 = [];
	if (application) {

		function a(tx, cb) {
			// console.log('执行a函数 _tx:', _tx);
			return transmit(cmd_pubAddr).then(res => {
				tx.sig = res.data;
				var v = cb && cb(tx);
				return v;
			});
		}

		function b(tx) {
			// console.log('执行b函数 _tx:', tx);
			tx_ins2.push(tx);
			return tx_ins2;
		}

		function m(i) {
			return a(_total[i], b).then(r => {
				return r;
			});
		}

		function c(len, cb) {
			if (len >= 0 && len < _len && cb) {
				return cb(len).then(ret => {
					// console.log('>>> 执行c里的回调函数最终结果:', ret);
					c(len + 1, cb);
					return ret;
				});
			} else {
				console.log('循环异步完成结果:',tx_ins2,tx_ins2.length);
				main1();
				main2();
				main3();
				main4();

				for(var i=0;i<3;i++){
					console.log('循环 i:',i);
				}
			}
		}

		function main1() {
			console.log('main1...');
		}

		function main2() {
			console.log('main2...');
		}

		function main3() {
			console.log('main3...');
		}

		function main4() {
			console.log('main4...');
		}

		c(0, m);

		clearInterval(_timer);
	}
}, 2000);