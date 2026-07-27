'use strict';

/**
 * Über-Fenster: Version, Unterbau und wohin die App überhaupt verbindet.
 * Bewusst getrennt von den Einstellungen — hier gibt es nichts zu ändern.
 */

const path = require('path');
const { BrowserWindow, ipcMain, shell } = require('electron');

const config = require('./config');
const i18n = require('./i18n');
const appInfo = require('./app-info');

const PAGE = path.join(__dirname, '..', 'renderer', 'about.html');
const ICON = path.join(__dirname, '..', 'renderer', 'icon.png');

let win = null;

function open(parent) {
  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) win.restore();
    win.focus();
    return win;
  }

  win = new BrowserWindow({
    width: 460,
    height: 620,
    parent,
    show: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    backgroundColor: '#0c0b0a',
    icon: ICON,
    autoHideMenuBar: true,
    title: `${i18n.strings().about.title} ${config.APP_TITLE}`,
    webPreferences: {
      preload: path.join(__dirname, 'about-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  win.setMenu(null);
  win.on('page-title-updated', (event) => event.preventDefault());
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => {
    win = null;
  });

  win.loadFile(PAGE).catch(() => {});
  return win;
}

function registerIpc() {
  ipcMain.on('about:read', (event) => {
    event.returnValue = appInfo.info();
  });

  ipcMain.on('about:open-repo', () => {
    shell.openExternal(config.REPO_URL).catch(() => {});
  });

  ipcMain.on('about:close', (event) => {
    const sender = BrowserWindow.fromWebContents(event.sender);
    if (sender && !sender.isDestroyed()) sender.close();
  });
}

module.exports = { open, registerIpc };
