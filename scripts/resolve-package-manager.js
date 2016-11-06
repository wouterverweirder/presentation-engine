const resolvePackageManager = () => {
  let packageManager = `npm`;
  try {
    require(`child_process`).execSync(`yarn --version`, { encoding: `utf8` });
    packageManager = `yarn`;
  } catch (ex) {
    console.log(`yarn not available, using npm instead`);
  }
  return packageManager;
};

module.exports = resolvePackageManager;
