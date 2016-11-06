'use strict';

const spawnPromised = (command, args = [], cwd = __dirname) => {
  return new Promise(resolve => {
    const spawn = require(`child_process`).spawn,
      spawnedProcess = spawn(command, args, { cwd: cwd });

    spawnedProcess.stdout.on(`data`, data => {
      console.log(data.toString());
    });

    spawnedProcess.stderr.on(`data`, data => {
      console.log(data.toString());
    });

    spawnedProcess.on(`exit`, () => {
      resolve();
    });
  });
};

module.exports = spawnPromised;
