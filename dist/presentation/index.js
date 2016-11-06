'use strict';

const path = require('path');

const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

const argv = require('minimist')(process.argv.slice(2));

let debug = (argv.env === 'dev');

const tty = require('tty.js');

let ttyServer = tty.createServer({
  shell: 'bash',
  port: 3000,
  localOnly: true,
  static: path.resolve(__dirname, 'vendors', 'tty'),
  cwd: path.resolve(__dirname)
});

ttyServer.listen();

let mainWindow;

global.__dirname = __dirname;

function createWindow () {
  mainWindow = new BrowserWindow({
    "width": 1280,
    "height": 700,
    "fullscreen": true,
    "kiosk": false,
    "autoHideMenuBar": true
  });
  mainWindow.loadURL('file://' + __dirname + '/index.html');
  if(debug) {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.on('closed', function() {
    mainWindow = null;
  });
}
app.on('ready', createWindow);
app.on('window-all-closed', function () {
  // if (process.platform !== 'darwin') {
    app.quit();
  // }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
