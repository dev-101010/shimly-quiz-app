'use strict';

/**
 * Oberflächentexte in Deutsch und Englisch. Ausgewählt wird nach der Sprache
 * des Systems: alles Deutschsprachige bekommt Deutsch, alles andere Englisch.
 *
 * Einzige Quelle für sichtbare Texte – die Renderer holen sich das passende
 * Wörterbuch über den Kanal `app:strings` (siehe main.js) und füllen damit
 * ihre `data-t`-Elemente.
 */

const { app } = require('electron');

const de = {
  lang: 'de',

  menu: {
    file: 'Datei',
    edit: 'Bearbeiten',
    view: 'Ansicht',
    window: 'Fenster',
    help: 'Hilfe',
    about: 'Über', // + Programmname
    settings: 'Einstellungen…',
    quit: 'Beenden',
    hide: 'Ausblenden',
    hideOthers: 'Andere ausblenden',
    unhide: 'Alle einblenden',
    undo: 'Widerrufen',
    redo: 'Wiederholen',
    cut: 'Ausschneiden',
    copy: 'Kopieren',
    paste: 'Einfügen',
    selectAll: 'Alles auswählen',
    reload: 'Neu laden',
    hardReload: 'Neu laden ohne Cache',
    back: 'Zurück',
    zoomIn: 'Vergrössern',
    zoomOut: 'Verkleinern',
    zoomReset: 'Originalgrösse',
    fullscreen: 'Vollbild',
    devTools: 'Entwicklerwerkzeuge',
    minimize: 'Minimieren',
  },

  splash: {
    loadingTitle: 'Shimly Quiz wird geladen…',
    loadingText: 'Verbindung zu shimly-quiz.de wird aufgebaut.',
    errorTitle: 'Seite nicht erreichbar',
    errorText: 'Bitte Internetverbindung prüfen.',
    errorCode: 'Fehlercode', // + Nummer
    retry: 'Erneut versuchen',
    quit: 'Beenden',
  },

  settings: {
    title: 'Einstellungen',

    groupWindow: 'Fenster',
    groupPerformance: 'Leistung',
    groupControls: 'Bedienung',
    groupInfo: 'Informationen',

    startFullscreen: 'Vollbild beim Start',
    startFullscreenHint: 'Gilt ab dem nächsten Start. Umschalten jederzeit mit F11.',
    zoom: 'Zoom',
    zoomHint: 'Entspricht Strg +/− im Fenster.',
    uncapFrameRate: 'FPS-Deckel aufheben',
    uncapFrameRateHint: 'Mehr Bilder pro Sekunde ohne VSync — mehr Last, evtl. Tearing.',
    disableHardwareAcceleration: 'Hardwarebeschleunigung deaktivieren',
    disableHardwareAccelerationHint: 'Notausgang bei Grafiktreiber-Problemen.',
    preventDisplaySleep: 'Standby verhindern',
    preventDisplaySleepHint: 'Bildschirm bleibt an, solange die App läuft.',
    blockContextMenu: 'Rechtsklick-Menü blockieren',
    blockContextMenuHint: 'Eingabefelder bleiben ausgenommen, Einfügen funktioniert weiter.',

    restartNotice: 'Diese Änderung greift erst nach einem Neustart der App.',
    restartNow: 'Jetzt neu starten',

    infoVersion: 'Version',
    infoElectron: 'Electron',
    infoChrome: 'Chromium',
    infoNode: 'Node',
    infoPlatform: 'Plattform',
    infoUrl: 'Zielseite',
    infoHosts: 'Erlaubte Hosts',
    infoConfig: 'Einstellungen',
    revealFolder: 'Ordner öffnen',

    disclaimer:
      'Inoffizieller Client für shimly-quiz.de. Nicht mit dem Betreiber der Seite verbunden.',
    close: 'Schliessen',
  },
};

const en = {
  lang: 'en',

  menu: {
    file: 'File',
    edit: 'Edit',
    view: 'View',
    window: 'Window',
    help: 'Help',
    about: 'About',
    settings: 'Settings…',
    quit: 'Quit',
    hide: 'Hide',
    hideOthers: 'Hide Others',
    unhide: 'Show All',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    selectAll: 'Select All',
    reload: 'Reload',
    hardReload: 'Reload Without Cache',
    back: 'Back',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    zoomReset: 'Actual Size',
    fullscreen: 'Full Screen',
    devTools: 'Developer Tools',
    minimize: 'Minimize',
  },

  splash: {
    loadingTitle: 'Loading Shimly Quiz…',
    loadingText: 'Connecting to shimly-quiz.de.',
    errorTitle: 'Site unreachable',
    errorText: 'Please check your internet connection.',
    errorCode: 'Error code',
    retry: 'Try again',
    quit: 'Quit',
  },

  settings: {
    title: 'Settings',

    groupWindow: 'Window',
    groupPerformance: 'Performance',
    groupControls: 'Controls',
    groupInfo: 'Information',

    startFullscreen: 'Start in full screen',
    startFullscreenHint: 'Applies from the next start. Toggle any time with F11.',
    zoom: 'Zoom',
    zoomHint: 'Same as Ctrl +/− in the window.',
    uncapFrameRate: 'Remove frame rate cap',
    uncapFrameRateHint: 'More frames per second without VSync — more load, possible tearing.',
    disableHardwareAcceleration: 'Disable hardware acceleration',
    disableHardwareAccelerationHint: 'Escape hatch for graphics driver trouble.',
    preventDisplaySleep: 'Prevent standby',
    preventDisplaySleepHint: 'Keeps the display awake while the app runs.',
    blockContextMenu: 'Block right-click menu',
    blockContextMenuHint: 'Input fields stay exempt, pasting keeps working.',

    restartNotice: 'This change takes effect after restarting the app.',
    restartNow: 'Restart now',

    infoVersion: 'Version',
    infoElectron: 'Electron',
    infoChrome: 'Chromium',
    infoNode: 'Node',
    infoPlatform: 'Platform',
    infoUrl: 'Target site',
    infoHosts: 'Allowed hosts',
    infoConfig: 'Settings file',
    revealFolder: 'Open folder',

    disclaimer: 'Unofficial client for shimly-quiz.de. Not affiliated with the site operator.',
    close: 'Close',
  },
};

let cached = null;

/** Wörterbuch für die Systemsprache. Ergebnis wird gemerkt. */
function strings() {
  if (cached) return cached;

  // getSystemLocale ist die Sprache des Betriebssystems; getLocale wäre die
  // von Chromium aufgelöste und steht erst nach app.whenReady bereit.
  let locale = '';
  try {
    locale = app.getSystemLocale() || app.getLocale() || '';
  } catch {
    locale = '';
  }

  cached = locale.toLowerCase().startsWith('de') ? de : en;
  return cached;
}

// `dictionaries` liegt offen, damit sich prüfen lässt, dass beide Sprachen
// dieselben Schlüssel führen.
module.exports = { strings, dictionaries: { de, en } };
