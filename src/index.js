// import { app, BrowserWindow } from 'electron';
const { app, Menu, BrowserWindow } = require('electron');
const client = require('electron-connect').client;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

let mainWindow;

app.commandLine.appendSwitch("--disable-http-cache");
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = true

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 650,
    webPreferences: {
      nodeIntegration: true,
    }
  });

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`);
  mainWindow.setTitle('Wallet');
  // Open the DevTools.
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    // createWindow();
    client.create(mainWindow);
  }
});
require('./main/main');
