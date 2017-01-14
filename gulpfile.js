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
  return gulp.src('./server//*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('serve', function() {
  browserSync({
    server: {
      baseDir: 'client'
    }
  });

  gulp.watch(['*.html', 'styles/**/*.css', 'scripts/**/*.js'], {cwd: '.'}, reload);
});
