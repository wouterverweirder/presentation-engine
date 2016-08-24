'use strict';

let isLocal = process.platform === 'darwin'; //quick check, we don't need to install presentation dependencies on heroku

if(isLocal) {
  //install the presentation dependencies
  let path = require('path'),
    spawn = require('child_process').spawn,
    cwd = path.resolve(__dirname, '..', 'dist', 'presentation'),
    install = spawn('npm', ['install'], { cwd: cwd });

  install.stdout.on('data', function (data) {
    console.log(data.toString());
  });

  install.stderr.on('data', function (data) {
    console.log(data.toString());
  });

  install.on('exit', function (code) {
    console.log('done');
  });
}
