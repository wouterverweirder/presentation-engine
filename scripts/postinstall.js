'use strict';

const path = require(`path`),
  spawnPromised = require(`./spawn-promised`),
  isLocal = process.platform === `darwin`; //quick check, we don't need to install presentation dependencies on heroku

const init = () => {
  const packageManager = `npm`; //yarn does not work very well with native modules
  const packageManagerArgs = (packageManager === `npm`) ? [`install`] : [];
  console.log(`packageManager: ${packageManager}`);
  spawnPromised(`echo`, [`Installing Presentation Dependencies`])
    .then(() => spawnPromised(packageManager, packageManagerArgs, path.resolve(__dirname, `..`, `dist`, `presentation`)));
};

if(isLocal) {
  init();
}
