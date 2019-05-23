


const parse = (msg) => {
    // console.log('msg:', msg);
    var a = new Buffer(0);
    var b;

    for (var name in msg) {
        if (name === 'version') {
            dftNumberI(msg['version']);
        }
        else if (name === 'tx_in') {
            dftArrayTxnIn();
        }
        else if (name === 'tx_out') {
            dftArrayTxnOut();
        }
        else if (name === 'lock_time') {
            dftNumberI(msg['lock_time']);
        }
    }
    //hash_type_b
    dftNumberI(1);

    function dftArrayTxnIn() {
        var num = msg['tx_in'].length;
        if (num < 0XFD) {
            dftNumber1(num);
            for (var i = 0; i < num; i++) {
                var tx_in = msg['tx_in'][i];
                var prev_output = tx_in.prev_output;
                var hash = prev_output.hash;
                var index = prev_output.index;
                dftBytes32(hash);
                dftNumberI(index);
                var sig_script = tx_in.sig_script;
                var sequence = tx_in.sequence;
                dftVarString(sig_script);
                dftNumberI(sequence);
            }
        }
    }

    function dftVarString(hexStr) {
        var num = hexStr.length / 2;
        // 变长字符串
        if (num < 0xFD) {
            dftNumber1(num);
            b = toBuffer(hexStr);
            a = Buffer.concat([a, b]);
        }
    }

    function dftBytes32(hash) {
        b = toBuffer(hash);
        a = Buffer.concat([a, b]);
    }

    function dftArrayTxnOut() {
        var num = msg['tx_out'].length;
        if (num < 0XFD) {
            dftNumber1(num);
            for (var i = 0; i < num; i++) {
                var tx_out = msg['tx_out'][i];
                var value = tx_out.value;

                dftNumberq(value);
                var pk_script=tx_out.pk_script;
                dftVarString(pk_script);
            }
        }
    }

    function dftNumber1(n) {
        b = new Buffer(1);
        b.writeUInt8(n);
        a = Buffer.concat([a, b]);
    }

    function dftNumberH(n) {
        b = new Buffer(2);
        b.writeUInt16(n)
        a = Buffer.concat([a, b]);
    }

    function dftNumberI(n) {
        b = new Buffer(4);
        b.writeUInt32LE(n);
        a = Buffer.concat([a, b]);
    }

    //重点研究
    function dftNumberq(n) {
        b = new Buffer(8);
        var c = numToBuffer(n).reverse();
        for (let i = 0; i < c.length; i++) {
            const e = c[i];
            b[i] = c[i];

        }
        // 45619996300
        // 00 e1 f5 05 00 00 00 00
        // console.log('n:',n);
        // b = b.reverse();

        a = Buffer.concat([a, b]);
        // a = Buffer.concat([a, b]);
    }
    return a;
}

function toBuffer(hex) {
    var typedArray = new Uint8Array(hex.match(/[\da-f]{2}/gi).map(function (h) {
        return parseInt(h, 16)
    }))
    var buffer = typedArray.buffer
    buffer = Buffer.from(buffer);
    return buffer;
}

function numToBuffer(num) {
    var hexnum = num.toString(16);
    if (hexnum % 2 != 0) {
        hexnum = '0' + hexnum;
    }
    var hex = hexnum;
    var typedArray = new Uint8Array(hex.match(/[\da-f]{2}/gi).map(function (h) {
        return parseInt(h, 16)
    }))
    var buffer = typedArray.buffer
    buffer = Buffer.from(buffer);
    return buffer;
}

// function numberToBuf(num){
//     var hexNum=num.toString(16);
// }
// function bufToNumber(buf) {
//     var t = 0;
//     var arr = hexArr(buf.toString('hex'));
//     for (var i = arr.length - 1; i >= 0; i--) {
//         let b = arr[i];
//         var c = parseInt(b, 16);
//         var d = Math.pow(256, arr.length - i - 1);
//         t += c * d;
//     }
//     return t;
// }

function BufferToString(buf) {
    let s = '';
    buf.forEach(element => {
        let tmp = element.toString(16);
        if (tmp.length == 1) {
            s += '0' + tmp;
        } else {
            s += tmp;
        }
    })
    return s;
}

function FlexTxn() {
    this.version = 0;
    this.tx_in = [];
    this.tx_out = [];
    this.lock_time = 0;
}

function TxnIn() {
    this.prev_output = '';
    this.sig_script = '';
    this.sequence = 0;
}

function OutPoint() {
    this.hash = '';
    this.index = 0;
}

function TxnOut() {
    this.value = 0;
    this.pk_script = '';
}

module.exports = {
    make_payload
}