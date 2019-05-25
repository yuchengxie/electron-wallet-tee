var fs = require('fs');

var p = '/Users/apple/Desktop/HZF/electron-wallet-tee/src/main/bus/z.txt';

var c=0;
var tx=[]

function f(x){
	tx.push(x);
	console.log(tx);
}

function writefile(callback){
	fs.readFile(p,(err,data)=>{
		if(!err){
			c=1;
			console.log('read file:',data.toString());
			callback && callback(c);
		}
	})
}

writefile(f);
// f(c);