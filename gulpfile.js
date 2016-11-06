'use strict';

const config = {
  presentation: {
    js: {
      src: `./src/presentation/js`,
      dst: `./dist/presentation/js`
    },
    scss: {
      src: `./src/presentation/scss`,
      dst: `./dist/presentation/css`
    }
  },
  server: {
    js: {
      src: `./src/server`,
      dst: `./dist/server`
    }
  },
  mobile: {
    js: {
      src: `./src/mobile/js`,
      dst: `./dist/mobile/js`
    },
    scss: {
      src: `./src/mobile/scss`,
      dst: `./dist/mobile/css`
    }
  }
};

const autoprefixer = require(`autoprefixer`);
const babelify = require(`babelify`);
const babel = require(`gulp-babel`);
const browserify = require(`browserify`);
const buffer = require(`vinyl-buffer`);
const cssnano = require(`gulp-cssnano`);
const gulp = require(`gulp`);
const gutil = require(`gulp-util`);
const postcss = require(`gulp-postcss`);
const sass = require(`gulp-sass`);
const combineMq = require(`gulp-combine-mq`);
const sourcemaps = require(`gulp-sourcemaps`);
const source = require(`vinyl-source-stream`);
const uglify = require(`gulp-uglify`);
const watchify = require(`watchify`);

const stylesTask = function(src, dst) {
  const processors = [
    autoprefixer({browsers: [`IE >= 10`, `last 2 version`], cascade: false}),
  ];
  return gulp.src(`${src  }/**/*.scss`)
    .pipe(sass().on(`error`, sass.logError))
    .pipe(postcss(processors))
    .pipe(combineMq({
      beautify: true
    }))
    .pipe(gutil.env.type === `production` ? cssnano() : gutil.noop())
    .pipe(gulp.dest(dst));
};

const scriptsTask = function(b, watch, name, dst) {
  const bundler = (watch) ? watchify(b) : b;

  function rebundle() {
    console.log(`-> bundling ${  dst  }/${  name}`);
    return bundler.bundle()
      .on(`error`, function(err) { console.error(err); this.emit(`end`); })
      .pipe(source(name))
      .pipe(buffer())
      .pipe(sourcemaps.init({ loadMaps: true }))
      .pipe(gutil.env.type === `production` ? uglify() : gutil.noop())
      .pipe(sourcemaps.write(`./`))
      .pipe(gulp.dest(dst));
  }

  if (watch) {
    bundler.on(`update`, function() {
      rebundle();
    });
  }

  return rebundle();
};

const presentationStylesTask = function() {
  return stylesTask(config.presentation.scss.src, config.presentation.scss.dst);
};

const presentationScriptsTask = function(watch) {
  const b = browserify(`${config.presentation.js.src  }/script.js`, { debug: gutil.env.type !== `production` })
    .require(`${__dirname  }/${  config.presentation.js.src  }/classes/live-code-slide/index.js`, { expose: `LiveCodeSlide`})
    .require(`${__dirname  }/${  config.presentation.js.src  }/classes/video-slide/index.js`, { expose: `VideoSlide`})
    .transform(babelify);

  return scriptsTask(b, watch, `script.js`, config.presentation.js.dst);
};

const presentationVendorsTask = function(watch) {
  const b = browserify(`${config.presentation.js.src  }/vendors.js`, { debug: gutil.env.type !== `production` })
    .transform(babelify);

  return scriptsTask(b, watch, `vendors.js`, config.presentation.js.dst);
};

const mobileStylesTask = function() {
  return stylesTask(config.mobile.scss.src, config.mobile.scss.dst);
};

const mobileScriptsTask = function(watch) {
  const b = browserify(`${config.mobile.js.src  }/script.js`, { debug: gutil.env.type !== `production` })
    .transform(babelify);

  return scriptsTask(b, watch, `script.js`, config.mobile.js.dst);
};

const mobileVendorsTask = function(watch) {
  const b = browserify(`${config.mobile.js.src  }/vendors.js`, { debug: gutil.env.type !== `production` })
    .transform(babelify);

  return scriptsTask(b, watch, `vendors.js`, config.mobile.js.dst);
};

const serverScriptsTask = function() {
  return gulp.src(`${config.server.js.src  }/**/*.js`)
    .pipe(babel())
    .pipe(gulp.dest(config.server.js.dst));
};

gulp.task(`presentation-styles`, presentationStylesTask);
gulp.task(`presentation-scripts`, function() {
  return presentationScriptsTask(false);
});
gulp.task(`presentation-vendors`, function() {
  return presentationVendorsTask(false);
});

gulp.task(`mobile-styles`, mobileStylesTask);
gulp.task(`mobile-scripts`, function() {
  return mobileScriptsTask(false);
});
gulp.task(`mobile-vendors`, function() {
  return mobileVendorsTask(false);
});

gulp.task(`server-scripts`, serverScriptsTask);

gulp.task(`watch`, [`presentation-styles`, `mobile-styles`, `server-scripts`], function() {
  gulp.watch(`${config.presentation.scss.src  }/**/*.scss`, [`presentation-styles`]);
  gulp.watch(`${config.mobile.scss.src  }/**/*.scss`, [`mobile-styles`]);
  gulp.watch(`${config.server.js.src  }/**/*.js`, [`server-scripts`]);
  presentationScriptsTask(true);
  mobileScriptsTask(true);
});

gulp.task(`default`, [`watch`]);
