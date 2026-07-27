'use strict';

/**
 * Eigenes Fenster für Einstellungen und Programminfos. Bewusst ein separates
 * Fenster statt einer Overlay-Oberfläche in der Seite: so kollidiert nichts mit
 * dem Markup oder der CSP von shimly-quiz.de.
 */

const path = require('path');
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');

const config = require('./config');
const i18n = require('./i18n');
const place = require('./window-place');

const PAGE = path.join(__dirname, '..', 'renderer', 'settings.html');
const ICON = path.join(__dirname, '..', 'renderer', 'icon.png');

// Chromium-Startschalter – die stehen bereits fest, wenn das erste Fenster
// entsteht, und greifen daher erst nach einem Neustart.
const NEEDS_RESTART = ['uncapFrameRate', 'disableHardwareAcceleration'];

let win = null;

// Stand der Neustart-Optionen beim Programmstart. Der Dialog vergleicht dagegen,
// damit der Hinweis auch nach Schliessen und erneutem Öffnen stehen bleibt.
const startup = {};

function open(parent) {
  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) win.restore();
    win.focus();
    return win;
  }

  win = new BrowserWindow({
    ...place.centeredOn(parent, 560, 700),
    minWidth: 460,
    minHeight: 480,
    parent, // wird mit dem Hauptfenster geschlossen
    show: false,
    backgroundColor: '#0c0b0a',
    icon: ICON,
    autoHideMenuBar: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: `${i18n.strings().settings.title} — ${config.APP_TITLE}`,
    webPreferences: {
      preload: path.join(__dirname, 'settings-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  win.setMenu(null);

  // Der Titel kommt aus der Konfiguration – wie beim Hauptfenster soll ihn die
  // Seite nicht überschreiben.
  win.on('page-title-updated', (event) => event.preventDefault());

  win.once('ready-to-show', () => win.show());
  win.on('closed', () => {
    win = null;
  });

  win.loadFile(PAGE).catch(() => {});
  return win;
}

/** Hält den offenen Dialog aktuell, wenn z. B. der Zoom per Tastenkürzel läuft. */
function notifyChanged(cfg) {
  if (win && !win.isDestroyed()) win.webContents.send('settings:changed', cfg);
}

/**
 * @param {object} actions
 * @param {(patch: object, next: object) => void} actions.applySettings
 *   Wird nach dem Speichern aufgerufen, damit der Hauptprozess die Änderungen
 *   anwendet, die sofort greifen können.
 * @param {() => Promise<void>} actions.clearCache
 * @param {() => Promise<void>} actions.clearData
 *   Beide gehören in den Hauptprozess, weil dort die Session des Fensters liegt.
 */
function registerIpc(actions) {
  const onChange = actions.applySettings;
  const atStart = config.load();
  for (const key of NEEDS_RESTART) startup[key] = atStart[key];

  ipcMain.handle('settings:read', () => ({
    config: config.load(),
    configPath: config.configPath(),
    startup,
  }));

  ipcMain.handle('settings:write', (_event, patch) => {
    const next = config.save(patch && typeof patch === 'object' ? patch : {});
    onChange(patch || {}, next);
    return next;
  });

  ipcMain.handle('settings:reveal-config', () => {
    config.save({}); // legt die Datei an, falls noch nie gespeichert wurde
    shell.showItemInFolder(config.configPath());
  });

  ipcMain.handle('settings:clear-cache', async () => {
    await actions.clearCache();
    return true;
  });

  // Rückfrage, weil das die Anmeldung mitnimmt und nicht umkehrbar ist.
  ipcMain.handle('settings:clear-data', async (event) => {
    const t = i18n.strings().settings;
    const sender = BrowserWindow.fromWebContents(event.sender);
    const { response } = await dialog.showMessageBox(sender, {
      type: 'warning',
      buttons: [t.confirmYes, t.confirmNo],
      defaultId: 1, // Abbrechen vorausgewählt
      cancelId: 1,
      message: t.confirmTitle,
      detail: t.confirmDetail,
      noLink: true,
    });
    if (response !== 0) return false;

    await actions.clearData();
    return true;
  });

  ipcMain.on('settings:relaunch', () => {
    app.relaunch();
    app.exit(0);
  });

  ipcMain.on('settings:close', (event) => {
    const sender = BrowserWindow.fromWebContents(event.sender);
    if (sender && !sender.isDestroyed()) sender.close();
  });
}

module.exports = { open, registerIpc, notifyChanged };
