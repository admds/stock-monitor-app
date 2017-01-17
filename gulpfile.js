var gulp = require('gulp');
var browserSync = require('browser-sync');
var jshint = require('gulp-jshint');
var cached = require('gulp-cached');
var remember = require('gulp-remember');
var concat = require('gulp-concat');
var reload = browserSync.reload;

gulp.task('default', function() {

});

gulp.task('lint', function() {
    return gulp.src(['./server/*.js', './client/*.js', './cli/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('serve', function(callback) {
    var spawn = require('child_process').spawn;
    spawn('node', ['server/app.js'], { stdio: 'inherit' });

    browserSync({
        proxy: 'localhost:5555'
    });

    gulp.watch(['/client/*.html', 'client/*.js'], {cwd: '.'}, reload);
});
