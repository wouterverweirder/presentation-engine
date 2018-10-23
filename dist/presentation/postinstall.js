'use strict';

const spawnPromised = require(`../../scripts/spawn-promised`),
  childProcess = require(`child_process`),
  pathToElectron = require(`electron`),
  path = require(`path`),
  rebuild = require(`electron-rebuild`).rebuild;

const init = () => {
  spawnPromised(`echo`, [`Rebuilding node_modules for Electron`])
    .then(() => {
      let electronVersion = childProcess.execSync(`${pathToElectron} --version`, { encoding: `utf8` });
      electronVersion = electronVersion.match(/v(\d+\.\d+\.\d+)/)[1];
      return rebuild({
        electronVersion: electronVersion,
        buildPath: path.resolve(`./`)});
    })
    .catch(e => console.error(e))
    .then(() => console.log(`done`));
};

init();
