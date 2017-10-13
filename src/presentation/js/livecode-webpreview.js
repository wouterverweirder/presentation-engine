require(`browser-es-module-loader/src/babel-browser-build.js`);
require(`browser-es-module-loader`);

{
  window.onerror = (msg, url, line) => {
    console.error(`${msg} (line: ${line})`);
  };
}
