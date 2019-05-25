
var f1 = function (cb) {
    var a = 1, b = 2, c = 3;
    var s = cb(a, b, c);
    return s;
}

var d = f1(function (x, y, z) {
    return x + y + z;
})

// console.log(d);


//堵塞式
// var fs=require('fs');

// var p="/Users/apple/Desktop/HZF/electron-wallet-tee/src/main/bus/z.txt";

// var data=fs.readFileSync(p);

// console.log(data.toString());
// console.log('123');
//非阻塞式
// fs.readFile(p,(err,data)=>{
//     console.log(data);
// })
// console.log('123');
