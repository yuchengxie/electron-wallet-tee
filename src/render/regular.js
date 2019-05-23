
// function IsNull() {
//     var str = document.getElementById('str').value.trim();
//     if (str.length == 0) {
//         alert('对不起，文本框不能为空或者为空格!');//请将“文本框”改成你需要验证的属性名称!    
//     }
// }

//判断输入的字符是否为整数    
function IsInteger(str) {
    str=str.trim();
    if (value.length != 0) {
        reg = /^[-+]?\d*$/;
        return reg.test(value);
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


module.exports={
    IsInteger,IsEmpty
}

//test
// var s=IsInteger('123a');
// console.log(s);

// var b='   111 123123   ';
// var a='   111 123123   '.trim();
// console.log(b);
// console.log(a);