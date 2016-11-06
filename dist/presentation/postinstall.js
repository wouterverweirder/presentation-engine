'use strict';

const spawnPromised = require(`../../scripts/spawn-promised`),
  childProcess = require(`child_process`),
  pathToElectron = require(`electron`),
  electronRebuild = require(`electron-rebuild`),
  installNodeHeaders = electronRebuild.installNodeHeaders,
  rebuildNativeModules = electronRebuild.rebuildNativeModules;

const init = () => {
  spawnPromised(`echo`, [`Rebuilding node_modules for Electron`])
    .then(() => {
      let electronVersion = childProcess.execSync(`${pathToElectron} --version`, { encoding: `utf8` });
      electronVersion = electronVersion.match(/v(\d+\.\d+\.\d+)/)[1];
      return installNodeHeaders(electronVersion)
        .then(() => rebuildNativeModules(electronVersion, `./node_modules`));
    })
    .then(() => console.log(`done`));
};

init();
