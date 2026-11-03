'use strict';

/**
 * Anwendungsmenü. Unter Windows/Linux hängt es am Fenster, unter macOS liegt es
 * in der Systemleiste und ist dort Pflicht: ohne Menü gäbe es kein Cmd+Q und
 * kein Kopieren/Einfügen.
 */

const { Menu } = require('electron');

const config = require('./config');
const i18n = require('./i18n');

const isMac = process.platform === 'darwin';

/**
 * Menüpunkt, dessen Tastenkürzel nur angezeigt und nicht registriert wird.
 * Die Tasten selbst wertet `attachShortcuts` in main.js aus – dort hängt die
 * Logik (Zoom merken, Vollbild samt Menüleiste, Reload der Fehlerseite). Ohne
 * `registerAccelerator: false` liefe beides gleichzeitig.
 */
function item(label, accelerator, click) {
  return { label, accelerator, registerAccelerator: false, click };
}

function template(actions) {
  const t = i18n.strings().menu;
  const about = `${t.about} ${config.APP_TITLE}`;

  const appMenu = {
    // macOS zieht die Beschriftung des ersten Menüs aus dem Bundle-Namen;
    // dieses Label ist dort nur ein Platzhalter.
    label: config.APP_TITLE,
    submenu: [
      { label: about, click: actions.about },
      { type: 'separator' },
      item(t.settings, 'Cmd+,', actions.settings),
      { type: 'separator' },
      { role: 'hide', label: t.hide },
      { role: 'hideOthers', label: t.hideOthers },
      { role: 'unhide', label: t.unhide },
      { type: 'separator' },
      { role: 'quit', label: t.quit },
    ],
  };

  const fileMenu = {
    label: t.file,
    submenu: [
      item(t.settings, 'F2', actions.settings),
      { type: 'separator' },
      { role: 'quit', label: t.quit },
    ],
  };

  // Nur unter macOS nötig: dort laufen Cmd+C/V/X/A über das Menü. Unter
  // Windows und Linux erledigt Chromium das von sich aus.
  const editMenu = {
    label: t.edit,
    submenu: [
      { role: 'undo', label: t.undo },
      { role: 'redo', label: t.redo },
      { type: 'separator' },
      { role: 'cut', label: t.cut },
      { role: 'copy', label: t.copy },
      { role: 'paste', label: t.paste },
      { role: 'selectAll', label: t.selectAll },
    ],
  };

  const viewMenu = {
    label: t.view,
    submenu: [
      // macOS-Tastaturen haben meist kein F5 – dort Cmd+R, wie in der Hilfe.
      item(t.reload, isMac ? 'Cmd+R' : 'F5', actions.reload),
      // Ein Menüpunkt zeigt nur ein Kürzel – hier das kürzere. Unter macOS
      // gibt es Strg+F5 nicht, dort bleibt Cmd+Umschalt+R.
      item(t.hardReload, isMac ? 'Cmd+Shift+R' : 'Ctrl+F5', actions.hardReload),
      { type: 'separator' },
      item(t.back, isMac ? 'Cmd+Left' : 'Alt+Left', actions.back),
      { type: 'separator' },
      // "CmdOrCtrl++" lässt sich nicht zerlegen – nach dem Trennen am Plus
      // bleibt kein Tastenname übrig, und das Kürzel wird gar nicht angezeigt.
      item(t.zoomIn, 'CmdOrCtrl+Plus', actions.zoomIn),
      item(t.zoomOut, 'CmdOrCtrl+-', actions.zoomOut),
      item(t.zoomReset, 'CmdOrCtrl+0', actions.zoomReset),
      { type: 'separator' },
      // F11 gibt es unter macOS nicht als Vollbild – dort ist es Ctrl+Cmd+F.
      item(t.fullscreen, isMac ? 'Control+Cmd+F' : 'F11', actions.fullscreen),
      // Die Entwicklerwerkzeuge stehen bewusst nicht im Menü: für normale
      // Nutzung sind sie ohne Wert. Die Taste bleibt, siehe attachShortcuts
      // in main.js, dokumentiert ist sie nur in der README.
    ],
  };

  // Bewusst ohne "Fenster schließen": Cmd+W/Strg+W wird abgefangen, damit
  // niemand mitten im Quiz das Fenster wegklickt.
  const windowMenu = {
    label: t.window,
    submenu: [{ role: 'minimize', label: t.minimize }],
  };

  // Unter macOS markiert role 'help' das Menü als Hilfe-Menü (mit Suchfeld).
  // "Über" steht dort schon im App-Menü und fehlt hier deshalb.
  const helpMenu = {
    label: t.help,
    ...(isMac ? { role: 'help' } : {}),
    submenu: [
      // Jede Plattform ihre übliche Taste: F1 unter Windows und Linux,
      // Cmd+? unter macOS.
      item(t.helpPage, isMac ? 'Cmd+?' : 'F1', actions.help),
      { type: 'separator' },
      { label: t.report, click: actions.report },
      { label: t.project, click: actions.project },
      ...(isMac ? [] : [{ type: 'separator' }, { label: about, click: actions.about }]),
    ],
  };

  return isMac
    ? [appMenu, editMenu, viewMenu, windowMenu, helpMenu]
    : [fileMenu, viewMenu, helpMenu];
}

function install(actions) {
  Menu.setApplicationMenu(Menu.buildFromTemplate(template(actions)));
}

module.exports = { install };
