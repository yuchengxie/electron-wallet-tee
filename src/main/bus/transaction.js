
var bh = require('./bufferhelp');

function compayloadTran(msg) {
    var a = new Buffer(0);
    var b;
    
    for (var name in msg) {
        if (name === 'version') {
            dftNumberI(msg['version']);//4
        }
        else if (name === 'tx_in') {
            dftArrayTxnIn();//147
        } else if (name === 'tx_out') {
            dftArrayTxnOut();//99
        } else if (name === 'lock_time') {
            dftNumberI(msg['lock_time']);//4
        } else if (name === 'sig_raw') {
            dftVarString(msg['sig_raw']);//4
        }
    }

    function dftArrayTxnOut() {
        var num = msg['tx_out'].length;
        if (num < 0xFD) {
            dftNumber1(num);//1+98=99
            var tx_out = msg['tx_out'][i]
            for (var i = 0; i < num; i++) {
                var tx_out = msg['tx_out'][i]
                var value = tx_out['value'];
                dftNumberq(value);//8
                var pk_script = tx_out['pk_script'];
                dftVarString(pk_script);//41
            }

        }
    }

    function dftArrayTxnIn() {
        var num = msg['tx_in'].length;
        if (num < 0xFD) {
            dftNumber1(num);//1
            for (var i = 0; i < num; i++) {
                var tx_in = msg['tx_in'][i];
                var prev_output = tx_in['prev_output'];
                var hash = prev_output.hash;
                dftBytes32(hash);//32
                var index = prev_output.index;
                dftNumberI(index);//4
                var sig_script = tx_in['sig_script'];
                dftVarString(sig_script);//106
                var sequence = tx_in['sequence'];
                dftNumberI(sequence);//4
            }

        }
    }

    function dftVarString(str) {
        var b = bh.hexStrToBuffer(str);
        var len = b.length;

        if (b.length < 0xFD) {
            dftNumber1(len);//1
            a = Buffer.concat([a, b]);//40
        }
    }

    function dftBytes32(hash) {
        // var b = toBuffer(hash);
        // var b=bh.hexStrToBuffer(hash);
        var b = new Buffer(hash, 'hex');
        a = Buffer.concat([a, b]);
    }

    function dftNumber1(n) {
        b = new Buffer(1);
        b.writeUInt8(n);
        a = Buffer.concat([a, b]);
    }

    function dftNumberH(n) {
        b = new Buffer(2);
        b.writeUInt8(n)
        a = Buffer.concat([a, b]);
    }

    function dftNumberI(n) {
        b = new Buffer(4);
        //n转16进制buffer
        b.writeUInt32LE(n);
        a = Buffer.concat([a, b]);
    }

    function dftNumberq(n) {
        b = new Buffer(8);
        var c = n.toString(16);
        // var d = toBuffer(c);
        var d = bh.hexStrToBuffer(c).reverse();
        var j=0;
        for (var i = 0; i < d.length; i++) {
            b[j] = d[i];
            j++;
        }
        // a = Buffer.concat([a, b.reverse()]);
        a = Buffer.concat([a, b]);
    }
    return a;
}


// function toBuffer(hex) {
//     if (hex.length % 2 != 0) {
//         hex = '0' + hex;
//     }
//     var typedArray = new Uint8Array(hex.match(/[\da-f]{2}/gi).map(function (h) {
//         return parseInt(h, 16)
//     }))
//     var buffer = typedArray.buffer
//     buffer = Buffer.from(buffer);
//     return buffer;
// }

module.exports = {
    compayloadTran
}