
//数据组包
function compayload(msg) {
    var a = new Buffer(0);
    var b;

    for (var name in msg) {
        if (name === 'vcn') {
            dftNumberH(msg['vcn']);
        } else if (name === 'sequence') {
            dftNumberI(msg['sequence']);
        } else if (name === 'pay_from') {
            dftArrayPayfrom();
        } else if (name === 'pay_to') {
            dftArrayPayto();
        } else if (name === 'scan_count') {
            dftNumberH(msg['scan_count']);
        } else if (name === 'min_utxo') {
            dftNumberq(msg['min_utxo']);
        }
        else if (name === 'max_utxo') {
            dftNumberq(msg['max_utxo']);
        }
        else if (name === 'sort_flag') {
            dftNumberI(msg['sort_flag']);
        } else if (name === 'last_uocks') {
            dftArraylastuocks();
        }
    }

    function dftArraylastuocks() {
        var num = msg['last_uocks'].length;
        if (num < 0xFD) {
            dftNumber1(num);
            for (var i = 0; i < num; i++) {
                var lastuocks = msg['last_uocks'][i];
                dftNumberq(lastuocks);
            }
        }
    }

    function dftArrayPayfrom() {
        var num = msg['pay_from'].length;
        if (num < 0XFD) {
            dftNumber1(num);
            for (var i = 0; i < num; i++) {
                var pay = msg['pay_from'][i];
                var v = pay.value;
                dftNumberq(v);
                var l_addr = pay.address.length;
                // 变长字符串
                if (l_addr < 0xFD) {
                    dftNumber1(l_addr);
                    b = new Buffer(pay.address);
                    a = Buffer.concat([a, b]);
                }
            }
        }
    }

    function dftArrayPayto() {
        var num = msg['pay_to'].length;
        if (num < 0XFD) {
            dftNumber1(num);
            for (var i = 0; i < num; i++) {
                var pay = msg['pay_to'][i];
                var v = pay.value;
                dftNumberq(v);
                var l_addr = pay.address.length;
                // 变长字符串
                if (l_addr < 0xFD) {
                    dftNumber1(l_addr);
                    if (typeof pay.address == 'string') {
                        b = new Buffer(pay.address);
                    } else {//bytes
                        b = pay.address;
                    }
                    // b = new Buffer(pay.address);
                    a = Buffer.concat([a, b]);
                }
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
        // b.writeUInt8(n)
        b.writeInt16LE(n);
        a = Buffer.concat([a, b]);
    }

    function dftNumberI(n) {
        b = new Buffer(4);
        //n转16进制buffer
        // b.writeUInt16LE(n);
        b.writeInt32LE(n);
        a = Buffer.concat([a, b]);
    }

    function dftNumberq(n) {
        b = new Buffer(8);
        b.writeInt32LE(n);
        
        a = Buffer.concat([a, b]);
    }
    return a;
}

function toBuffer(hex) {
    if (hex.length % 2 != 0) {
        hex = '0' + hex;
    }
    var typedArray = new Uint8Array(hex.match(/[\da-f]{2}/gi).map(function (h) {
        return parseInt(h, 16)
    }))
    var buffer = typedArray.buffer
    buffer = Buffer.from(buffer);
    return buffer;
}

module.exports = {
    compayload
}