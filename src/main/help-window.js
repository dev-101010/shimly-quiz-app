'use strict';

/**
 * Hilfefenster: Tastenkürzel und die Eigenheiten, die man dieser App nicht
 * ansieht. Die Kürzel werden hier erzeugt und nicht ins Markup geschrieben,
 * damit sie zur Plattform passen — unter macOS liegen sie auf Cmd, und
 * Vollbild sowie DevTools haben dort ganz andere Tasten.
 */

const path = require('path');
const { BrowserWindow, ipcMain } = require('electron');

const config = require('./config');
const i18n = require('./i18n');
const place = require('./window-place');

const PAGE = path.join(__dirname, '..', 'renderer', 'help.html');
const ICON = path.join(__dirname, '..', 'renderer', 'icon.png');

const isMac = process.platform === 'darwin';

let win = null;

/**
 * Jede Zeile besteht aus Gruppen gleichwertiger Tastenfolgen: innerhalb einer
 * Gruppe werden die Tasten zusammen gedrückt, mehrere Gruppen sind
 * Alternativen. Die Seite setzt daraus einzelne Tastenfelder – deshalb hier
 * einzelne Namen statt einer fertigen Zeichenkette.
 */
function shortcuts() {
  const t = i18n.strings().help;
  const mod = isMac ? 'Cmd' : t.ctrl;
  const shift = isMac ? 'Shift' : t.shift;

  return [
    { groups: [[mod, t.keyComma]], text: t.scSettings },
    { groups: isMac ? [['Ctrl', 'Cmd', 'F']] : [['F11']], text: t.scFullscreen },
    { groups: [['Esc']], text: t.scExitFullscreen },
    { groups: [['F5'], [mod, 'R']], text: t.scReload },
    { groups: [[mod, shift, 'R']], text: t.scHardReload },
    // Bewusst drei Zeilen: als "Strg + Plus / Minus / 0" sieht es aus, als
    // kaemen Minus und 0 ohne die Modifikatortaste aus.
    { groups: [[mod, t.keyPlus]], text: t.scZoomIn },
    { groups: [[mod, t.keyMinus]], text: t.scZoomOut },
    { groups: [[mod, '0']], text: t.scZoomReset },
    { groups: [[isMac ? 'Cmd' : 'Alt', '←']], text: t.scBack },
    // Entwicklerwerkzeuge fehlen hier absichtlich – siehe menu.js.
    { groups: [[mod, 'W']], text: t.scClose },
  ];
}

function open(parent) {
  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) win.restore();
    win.focus();
    return win;
  }

  win = new BrowserWindow({
    ...place.centeredOn(parent, 580, 720),
    minWidth: 460,
    minHeight: 420,
    parent,
    show: false,
    backgroundColor: '#0c0b0a',
    icon: ICON,
    autoHideMenuBar: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: `${i18n.strings().help.title} — ${config.APP_TITLE}`,
    webPreferences: {
      preload: path.join(__dirname, 'help-preload.js'),
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
  ipcMain.on('help:read', (event) => {
    event.returnValue = shortcuts();
  });

  ipcMain.on('help:close', (event) => {
    const sender = BrowserWindow.fromWebContents(event.sender);
    if (sender && !sender.isDestroyed()) sender.close();
  });
}

module.exports = { open, registerIpc };
