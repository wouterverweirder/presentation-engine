'use strict';

var fs = require('fs'),
  path = require('path');

var config = {
  presentation: {
    js: {
      src: './src/presentation/js',
      dst: './dist/presentation/js'
    },
    scss: {
      src: './src/presentation/scss',
      dst: './dist/presentation/css'
    }
  },
  server: {
    js: {
      src: './src/server',
      dst: './dist/server'
    }
  },
  mobile: {
    js: {
      src: './src/mobile/js',
      dst: './dist/mobile/js'
    },
    scss: {
      src: './src/mobile/scss',
      dst: './dist/mobile/css'
    }
  }
};

var autoprefixer = require('autoprefixer');
var babelify = require('babelify');
var babel = require('gulp-babel');
var browserify = require('browserify');
var buffer = require('vinyl-buffer');
var cssnano = require('gulp-cssnano');
var gulp = require('gulp');
var gutil = require('gulp-util');
var postcss = require('gulp-postcss');
var sass = require('gulp-sass');
var combineMq = require('gulp-combine-mq');
var sourcemaps = require('gulp-sourcemaps');
var source = require('vinyl-source-stream');
var uglify = require('gulp-uglify');
var watchify = require('watchify');

var stylesTask = function(src, dst) {
  var processors = [
    autoprefixer({browsers: ['IE >= 10', 'last 2 version'], cascade: false}),
  ];
  return gulp.src(src + '/**/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(postcss(processors))
    .pipe(combineMq({
      beautify: true
    }))
    .pipe(gutil.env.type === 'production' ? cssnano() : gutil.noop())
    .pipe(gulp.dest(dst));
};

var scriptsTask = function(b, watch, name, dst) {
  var bundler = (watch) ? watchify(b) : b;

  function rebundle() {
    console.log('-> bundling ' + dst + '/' + name);
    return bundler.bundle()
      .on('error', function(err) { console.error(err); this.emit('end'); })
      .pipe(source(name))
      .pipe(buffer())
      .pipe(sourcemaps.init({ loadMaps: true }))
      .pipe(gutil.env.type === 'production' ? uglify() : gutil.noop())
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest(dst));
  }

  if (watch) {
    bundler.on('update', function() {
      rebundle();
    });
  }

  return rebundle();
};

var presentationStylesTask = function() {
  return stylesTask(config.presentation.scss.src, config.presentation.scss.dst);
};

var presentationScriptsTask = function(watch) {
  var b = browserify(config.presentation.js.src + '/script.js', { debug: gutil.env.type !== 'production' })
    .require(__dirname + '/' + config.presentation.js.src + '/classes/live-code-slide/index.js', { expose: 'LiveCodeSlide'})
    .require(__dirname + '/' + config.presentation.js.src + '/classes/video-slide/index.js', { expose: 'VideoSlide'})
    .require(__dirname + '/' + config.presentation.js.src + '/classes/shake-your-phones-slide/index.js', { expose: 'ShakeYourPhonesSlide'})
    .transform(babelify);

  return scriptsTask(b, watch, 'script.js', config.presentation.js.dst);
};

var presentationVendorsTask = function(watch) {
  var b = browserify(config.presentation.js.src + '/vendors.js', { debug: gutil.env.type !== 'production' })
    .transform(babelify);

  return scriptsTask(b, watch, 'vendors.js', config.presentation.js.dst);
};

var mobileStylesTask = function() {
  return stylesTask(config.mobile.scss.src, config.mobile.scss.dst);
};

var mobileScriptsTask = function(watch) {
  var b = browserify(config.mobile.js.src + '/script.js', { debug: gutil.env.type !== 'production' })
    .require(__dirname + '/' + config.mobile.js.src + '/classes/shake-your-phones-slide/index.js', { expose: 'ShakeYourPhonesSlide'})
    .transform(babelify);

  return scriptsTask(b, watch, 'script.js', config.mobile.js.dst);
};

var mobileVendorsTask = function(watch) {
  var b = browserify(config.mobile.js.src + '/vendors.js', { debug: gutil.env.type !== 'production' })
    .transform(babelify);

  return scriptsTask(b, watch, 'vendors.js', config.mobile.js.dst);
};

var serverScriptsTask = function() {
  return gulp.src(config.server.js.src + '/**/*.js')
    .pipe(babel())
    .pipe(gulp.dest(config.server.js.dst));
};

gulp.task('presentation-styles', presentationStylesTask);
gulp.task('presentation-scripts', function() {
  return presentationScriptsTask(false);
});
gulp.task('presentation-vendors', function() {
  return presentationVendorsTask(false);
});

gulp.task('mobile-styles', mobileStylesTask);
gulp.task('mobile-scripts', function() {
  return mobileScriptsTask(false);
});
gulp.task('mobile-vendors', function() {
  return mobileVendorsTask(false);
});

gulp.task('server-scripts', serverScriptsTask);

gulp.task('watch', ['presentation-styles', 'mobile-styles', 'server-scripts'], function() {
  gulp.watch(config.presentation.scss.src + '/**/*.scss', ['presentation-styles']);
  gulp.watch(config.mobile.scss.src + '/**/*.scss', ['mobile-styles']);
  gulp.watch(config.server.js.src + '/**/*.js', ['server-scripts']);
  presentationScriptsTask(true);
  mobileScriptsTask(true);
});

gulp.task('default', ['watch']);
