const gulp = require('gulp');
const electron = require('electron-connect').server.create();
 
gulp.task('watch:electron', function () {
    electron.start();
    gulp.watch(['./index.js'], electron.restart);
    // gulp.watch(['./ui/**/*.{js,css},./ui/index.html'], electron.reload);
    gulp.watch(['*'], electron.reload);
});