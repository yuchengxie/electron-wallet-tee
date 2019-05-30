var url = WEB_SERVER_ADDR + '/txn/state/account?addr=' + addr;
console.log('info url:', url);
dhttp(
    {
        url: url,
        method: 'GET'
    }, function (err, res) {
        if (err) throw 'getinfo err';
        var buf = res.body;
        var payload = message.g_parse(buf);
        var msg = message.parseInfo(payload)[1];
        var msg1 = {};
        msg1.account = bh.hexToBuffer(msg['account']).toString('latin1');
        msg1.timestamp = msg['timestamp'];
        msg1.link_no = msg['link_no'];
        var arrfound = [];
        var total = 0;
        for (var i = 0; i < msg['found'].length; i++) {
            var found_item = {};
            var m = msg['found'][i];
            var height = m['height'];
            var value = m['value'];
            var uock = m['uock'];
            //handle uock
            found_item.uock = uock;
            found_item.height = height;
            found_item.value = value;
            arrfound.push(found_item);
            total += value;
        }
        msg1.found = arrfound;
        msg1.total = total;
        console.log('> info msg:', msg1);
        event.sender.send('replyinfo', msg1);
    }
)