const resolvePackageManager = () => {
  let packageManager = `npm`;
  try {
    require(`child_process`).execSync(`npm list -g yarn`, { encoding: `utf8` });
    packageManager = `yarn`;
  } catch (ex) {
    console.log(`yarn not available, using npm instead`);
  }
  return packageManager;
};

module.exports = resolvePackageManager;
