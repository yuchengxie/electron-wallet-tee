// ss = setInterval(() => {
// 	let a = "y"
// 	execute(a, (a) => {
// 		console.log("n:" + a);
// 	});
// 	console.log('v:',v);
// 	clearInterval(ss);
// }, 1000);

// function execute(a, cb) {
// 	// setTimeout(() => {
// 	//     console.log("m:"+a);
// 	//     a = "xxx";
// 	// }, 1000);
// 	console.log("m:" + a);
// 	a = "xxx";
// 	cb(a);
// 	// return cb(a);
// }

ss = setInterval(() => {
	let b = "y"
	let x = 1;
	let y = 2;
	execute(b, (x, y) => {
		console.log("b:" + b);
		console.log("x:" + x);
		console.log("y:" + y);
		x = 3;
		y = 4;
	});
	console.log("x:" + x);
	console.log("y:" + y);
	clearInterval(ss);
}, 1000);

function execute(a, cb) {
	setTimeout(() => {
		console.log("a:" + a);
		a = "xxx";
	}, 1000);
	// console.log("a:"+a);
	// a = "xxx";
	return cb(a, a);
	// return cb("nihao");
}
