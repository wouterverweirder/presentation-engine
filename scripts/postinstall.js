'use strict';

const path = require(`path`),
  resolvePackageManager = require(`./resolve-package-manager`),
  spawnPromised = require(`./spawn-promised`),
  isLocal = process.platform === `darwin`; //quick check, we don't need to install presentation dependencies on heroku

const init = () => {
  const packageManager = resolvePackageManager();
  const packageManagerArgs = (packageManager === `npm`) ? [`install`] : [];
  console.log(`packageManager: ${packageManager}`);
  spawnPromised(`echo`, [`Installing Presentation Dependencies`])
    .then(() => spawnPromised(packageManager, packageManagerArgs, path.resolve(__dirname, `..`, `dist`, `presentation`)));
};

if(isLocal) {
  init();
}
