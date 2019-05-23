// /** 
//  * Created by xieyucheng on 19/3/12 
//  * 创建文件夹帮助类 
//  */
// var fs = require("fs");
// var path = require("path");

// //递归创建目录 异步方法  
// function mkdirs(dirname, callback) {
//     fs.exists(dirname, function (exists) {
//         if (exists) {
//             callback();
//         } else {
//             mkdirs(path.dirname(dirname), function () {
//                 fs.mkdir(dirname, callback);
//             });
//         }
//     });
// }

// //递归创建目录 同步方法  
// function mkdirsSync(dirname) {
//     console.log(dirname);  
//     if (fs.existsSync(dirname)) {
//         return true;
//     } else {
//         if (mkdirsSync(path.dirname(dirname))) {
//             fs.mkdirSync(dirname);
//             return false;
//         }
//     }
// }

// //遍历文件夹

// function readDirSync(filepath){
//     var files=[];
//     var pa=fs.readdirSync(filepath);
//     pa.forEach(function(ele,index){
//         var info=fs.statSync(filepath+ele);
//         if(info.isFile){
//             files.push(ele);
//         }
//     })
//     return files;
// }

// //遍历文件夹-递归
// var fileCount = 0;
// function getFilesCount(filepath) {
//     fs.readdir(filepath, function (err, files) {
//         if (err) {
//             console.warn(err);
//         } else {
//             files.forEach(function (filename) {
//                 var filedir = path.join(filepath, filename);
//                 fs.stat(filedir, function (err, stats) {
//                     if (err) {
//                         console.warn('获取文件stats失败')
//                     } else {
//                         var isFile = stats.isFile();
//                         var isDir = stats.isDirectory();
//                         if (isFile) {
//                             fileCount++;
//                         }
//                         if (isDir) {
//                             getAllFiles(filedir);
//                         }
//                     }
//                 })
//             })
//         }
//     })
// }

// module.exports.mkdirs = mkdirs;
// module.exports.mkdirsSync = mkdirsSync;
// module.exports.readDirSync=readDirSync;