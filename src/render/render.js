const ipcRenderer = require('electron').ipcRenderer;

var teeAddr = '';

ipcRenderer.send('teeAddr');

ipcRenderer.on('replyteeAddr', (event, data) => {
    teeAddr = data;
})

window.onload = function () {
    var oldpass = getElement('frame_wallet_setpass', 'oldpass');
    var newpass = getElement('frame_wallet_setpass', 'newpass');
    var confirmpass = getElement('frame_wallet_setpass', 'confirmpass');
    var btn_wallet_setpass = getElement('frame_wallet_setpass', 'btn_wallet_setpass');

    btn_wallet_setpass.onclick = function () {
        var v_oldpass = oldpass.value;
        var v_newpass = newpass.value;
        var v_confirmpass = confirmpass.value;
        if (IsEmpty(v_oldpass)) {
            alert('old password can not be empty');
            return;
        } else {
            if (v_oldpass.length < 3 || v_oldpass.length >= 10) {//todo 正则
                alert("invalid password, old password should be 3-10 character of '0'-'9'")
                return;
            } else {
                if (v_oldpass && (v_oldpass.length & 0x01) == 1) {
                    v_oldpass += 'f';
                }
            }
        }
        if (IsEmpty(v_newpass)) {
            alert('new password can not be empty');
            return;
        } else {
            if (v_newpass.length < 3 || v_newpass.length >= 10) {//todo 正则
                alert("invalid password, new password should be 3-10 character of '0'-'9'")
                return;
            } else {
                if (v_newpass && (v_newpass.length & 0x01) == 1) {
                    v_newpass += 'f';
                }
            }
        }
        if (IsEmpty(v_confirmpass)) {
            alert('confirm password can not be empty');
            return;
        } else {
            if (v_confirmpass.length < 3 || v_confirmpass.length >= 10) {//todo 正则
                alert("invalid password, confirm password should be 3-10 character of '0'-'9'")
                return;
            } else {
                if (v_confirmpass && (v_confirmpass.length & 0x01) == 1) {
                    v_confirmpass += 'f';
                }
            }
        }
        if (v_newpass != v_confirmpass) {
            alert('new password should equal confirm password');
            return;
        }
        ipcRenderer.send('setpass', [v_oldpass, v_newpass, v_confirmpass]);
    }

    ipcRenderer.on('replysetpass', function (event, data) {
        alert(data);
    })

    var inputpass = getElement('frame_wallet_getpass', 'inputpass');
    var btn_wallet_getpass = getElement('frame_wallet_getpass', 'btn_wallet_getpass');

    btn_wallet_getpass.onclick = function () {
        var v_inputpass = inputpass.value;
        if (IsEmpty(v_inputpass)) {
            alert('no password, operation will be cancel');
            return;
        }
        if (v_inputpass.length < 3 || v_inputpass.length >= 10) {//todo 正则
            alert("invalid PIN code, it should be 3-10 character of '0'-'9'")
            return;
        }
        if (v_inputpass && (v_inputpass.length & 0x01) == 1) {
            v_inputpass += 'f';
        }
        ipcRenderer.send('getpass', v_inputpass);
    }

    ipcRenderer.on('replaygetpass', function (event, data) {
        alert(data);
    })
    // ipcRenderer.on('transferpasserror', function (event, data) {
    //     console.log('data:',data);
    //     alert('1111');
    // })




    //wallet_create
    var btn_wallet_create = getElement('frame_wallet_create', 'btn_wallet_create');
    var phone = getElement('frame_wallet_create', 'phone');
    var pwd = getElement('frame_wallet_create', 'pwd');
    var create_wallet_name = getElement('frame_wallet_create', 'create_wallet_name');
    var addr_create = getElement('frame_wallet_create', 'addr_create');
    btn_wallet_create.onclick = function () {
        var v_phone = phone.value;
        var v_pwd = pwd.value;
        v_wallet_name = create_wallet_name.value;
        if (IsEmpty(v_pwd)) {
            alert('password can not be empty');
            return;
        };
        if (IsEmpty(v_wallet_name)) {
            alert('filename can not be empty');
            return;
        };
        var v_wallet_name = v_wallet_name + '.cfg';
        console.log("v_walletfilename:", v_wallet_name);
        ipcRenderer.send('create', [v_phone + v_pwd, v_pwd, v_wallet_name]);
    }

    ipcRenderer.on('replycreate', function (event, data) {
        if (data) {
            console.log('replycreate:', data, data.length);
            addr_create.innerText = data[1];
            alert(data[0] + '创建成功');
            //update wallets display
            ipcRenderer.send('getwallets');
        }
    })

    //wallet_import
    var btn_wallet_import = getElement('frame_wallet_import', 'btn_wallet_import');
    var addr_import = getElement('frame_wallet_import', 'addr_import');
    var p_import_pwd = getElement('frame_wallet_import', 'p_import_pwd');
    var import_prvk = getElement('frame_wallet_import', 'import_prvk');
    var import_wallet_name = getElement('frame_wallet_import', 'import_wallet_name');
    btn_wallet_import.onclick = function () {
        var pvk = import_prvk.value;
        var pwd = p_import_pwd.value;
        var wallet_name = import_wallet_name.value + '.cfg';
        if (IsEmpty(pvk)) {
            alert('pvk can not be empty');
            return;
        };
        if (IsEmpty(pwd)) {
            alert('password can not be empty');
            return;
        };
        if (IsEmpty(wallet_name)) {
            alert('filename can not be empty');
            return;
        };
        ipcRenderer.send('save', [pvk, pwd, wallet_name]);
    }

    ipcRenderer.on('replysave', function (event, data) {
        if (data) {
            addr_import.innerText = data[0];
            alert(data[1] + '钱包导入成功');
        }
    })

    //wallet_info
    var btn_wallet_info = getElement('frame_wallet_info', 'btn_wallet_info');
    var info_address = getElement('frame_wallet_info', 'info_address');
    btn_wallet_info.onclick = function () {
        var address = info_address.value.trim();
        console.log('address:', address);
        if (address.length != 0 && address.length != 54) {
            //todo
            alert('address invalid');
            return;
        }
        ipcRenderer.send('info', address);
    }

    var infocard = getElement('frame_wallet_info', 'infocard');
    var infocontent = getElement('frame_wallet_info', 'infocontent');
    ipcRenderer.on('replyinfo', function (event, data) {
        if (data) {
            var d = {};
            d.account = data.account;
            d.total = data.total;
            d.link_no = data.link_no;
            d.search = data.search;
            d.timestamp = data.timestamp;
            d.found = data.found;
            infocard.style.display = 'block';
            var s = JSON.stringify(d, "", "\t");
            infocontent.innerText = s;
        }
    })

    //block
    var block_hash = getElement('frame_block', 'block_hash');
    var block_height = getElement('frame_block', 'block_height');
    var blockcard = getElement('frame_block', 'blockcard');
    var blockcontent = getElement('frame_block', 'blockcontent');
    var btn_block = getElement('frame_block', 'btn_block');
    btn_block.onclick = function () {
        var hash = block_hash.value;
        var height = block_height.value;
        console.log('>> hash:', hash);
        console.log('>> height:', height);
        if (!IsEmpty(hash) && hash.length != 64) {
            alert('hash length must be 64');
            return;
        }
        if (!IsEmpty(height) && !IsInteger(height)) {
            alert('height err');
            return;
        }
        ipcRenderer.send('block', [hash, height]);
    }

    ipcRenderer.on('replyblock', function (event, data) {
        console.log(data);
        if (data) {
            blockcard.style.display = 'block';
            // var s = JSON.stringify(data, null, "\t");
            var s = JSON.stringify(data, null, 4);
            blockcontent.innerText = s;
        }
    })

    //utxo
    var btn_utxo = getElement('frame_utxo', 'btn_utxo');
    var utxocard = getElement('frame_utxo', 'utxocard');
    var utxocontent = getElement('frame_utxo', 'utxocontent');
    btn_utxo.onclick = function () {
        ipcRenderer.send('utxo', 'utxo查询');
    }
    ipcRenderer.on('replyutxo', function (event, data) {
        console.log(data);
        if (data) {
            utxocard.style.display = 'block';
            var s = JSON.stringify(data, null, "\t");
            console.log(s);
            //demo
            utxocontent.innerText = s;
        }
    })

    //transfer
    var addrfrom = getElement('frame_transfer', 'addrfrom');
    addrfrom.value = teeAddr;
    var addrto = getElement('frame_transfer', 'addrto');
    var t_value = getElement('frame_transfer', 't_value');
    var btn_txns = getElement('frame_transfer', 'btn_txns');
    var transferState = getElement('frame_transfer', 'transferState');
    var transferpin = getElement('frame_transfer', 'transferpin');
    
    btn_txns.onclick = function () {
        if (!teeAddr) {
            alert('send addr error');
            return;
        };
        var v_transferpin = transferpin.value.trim();
        console.log('v_transferpin:', v_transferpin);
        if (!v_transferpin || v_transferpin.length > 10 || v_transferpin.length < 3) {
            alert('password err');
            return;
        }
        // var from = addrfrom.value;
        var to = addrto.value;
        var value = t_value.value;
        transferpin.value = '';
        ipcRenderer.send('transfer', [teeAddr, to, value, v_transferpin]);
    }

    ipcRenderer.on('transresult', (event, data) => {
        console.log('transresult:', data);
        transferState.innerText = data;
        console.log('>>> 收到transresult:',data);
    })
    
    //record
    var recordrfrom = getElement('frame_record', 'addrfrom');
    recordrfrom.value = teeAddr;
    var recordState = getElement('frame_record', 'recordState');
    var recordcontent = getElement('frame_record', 'content')
    var recordpin = getElement('frame_record', 'recordpin');
    var btn_record = getElement('frame_record', 'btn_record');
    
    btn_record.onclick = function () {
        if (!teeAddr) {
            alert('send addr error');
            return;
        };
        var v_recordpin = recordpin.value.trim();
        console.log('v_recordpin:', v_recordpin);
        if (!v_recordpin || v_recordpin.length > 10 || v_recordpin.length < 3) {
            alert('password err');
            return;
        }
        var v_content = recordcontent.value.trim();
        recordpin.value = '';
        ipcRenderer.send('record', [v_content, v_recordpin]);
    }

    ipcRenderer.on('recordresult', (event, data) => {
        recordState.innerText = data;
        console.log('>>> 收到recordresult:',data);
    })

    //miner
    var btn_start=getElement('frame_miner', 'btn_start');
    var btn_stop=getElement('frame_miner', 'btn_stop');
    var minerState=getElement('frame_miner', 'minerState');
    btn_start.onclick=function(){
        ipcRenderer.send('start');
    }

    ipcRenderer.on('replyStartMiner', (event, data) => {
        minerState.innerText = data;
    })

    btn_stop.onclick=function(){
        ipcRenderer.send('stop');
    }

    ipcRenderer.on('replystoptMiner', (event, data) => {
        minerState.innerText = data;
    })

}

function getElement(frameId, eleId) {
    var ele = document.getElementById(frameId).contentWindow.document.getElementById(eleId);
    return ele;
}

function IsInteger(str) {
    str = str.trim();
    var reg = new RegExp('^[0-9]*$');
    if (reg.test(str)) {
        return true;
    }
    return false;
}

function IsEmpty(obj) {
    if (typeof obj == "undefined" || obj == null || obj == "") {
        return true;
    } else {
        return false;
    }
}
