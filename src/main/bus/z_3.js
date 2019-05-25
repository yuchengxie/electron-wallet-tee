
function a(cb) {
	console.log('a');
	var v;
	setTimeout(() => {
		console.log('a的延迟');
		if (cb) { v = cb(); }
	}, 1000);
	return v;
}

function b() {
	console.log('b');
	return '123';
}

// a();
// b();
var s = a(b);
console.log(s);