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
    minimize: 'Minimieren',
    helpPage: 'Hilfe',
    report: 'Problem melden',
    project: 'Projektseite',
  },

  help: {
    title: 'Hilfe',
    ctrl: 'Strg',
    shift: 'Umschalt',
    // Satzzeichen als Taste sind schlecht zu lesen – deshalb ausgeschrieben.
    keyComma: 'Komma',
    keyPlus: 'Plus',
    keyMinus: 'Minus',

    shortcutsHeading: 'Tastenkürzel',
    scSettings: 'Einstellungen öffnen',
    scFullscreen: 'Vollbild an und aus',
    scExitFullscreen: 'Vollbild verlassen',
    scReload: 'Seite neu laden',
    scHardReload: 'Neu laden ohne Zwischenspeicher',
    scZoomIn: 'Ansicht vergrössern',
    scZoomOut: 'Ansicht verkleinern',
    scZoomReset: 'Ansicht auf Originalgrösse',
    scBack: 'Zurück zur vorigen Seite',
    scClose: 'Wird abgefangen, damit das Fenster nicht mitten in einer Runde zugeht',

    notesHeading: 'Gut zu wissen',
    noteLinksTitle: 'Fremde Links',
    noteLinks:
      'Im Fenster öffnet nur shimly-quiz.de. Jeder andere Link und jeder Download geht in deinen Standardbrowser.',
    noteLoginTitle: 'Angemeldet bleiben',
    noteLogin:
      'Die Anmeldung überlebt Neustarts. Abmelden geht über Einstellungen → Daten → Alle Daten löschen.',
    noteCacheTitle: 'Seite zeigt Veraltetes',
    noteCache:
      'Einstellungen → Daten → Zwischenspeicher leeren. Die Anmeldung bleibt dabei bestehen.',
    noteOfflineTitle: 'Seite nicht erreichbar',
    noteOffline:
      'Bei Verbindungsproblemen erscheint eine Fehlerseite mit „Erneut versuchen". Stürzt die Anzeige ab, lädt die App von selbst neu.',
    noteUnsignedTitle: 'Warnung beim ersten Start',
    noteUnsigned:
      'Die App ist nicht signiert. Windows meldet SmartScreen — dort „Weitere Informationen" und „Trotzdem ausführen". Unter macOS hilft Rechtsklick auf die App und „Öffnen".',

    close: 'Schliessen',
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
    groupData: 'Daten',

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

    restartNotice: 'Diese Änderung greift erst nach einem Neustart der App.',
    restartNow: 'Jetzt neu starten',

    clearCache: 'Zwischenspeicher leeren',
    clearCacheHint: 'Lädt Bilder und Skripte neu. Die Anmeldung bleibt bestehen.',
    clearCacheAction: 'Leeren',
    clearData: 'Alle Daten löschen',
    clearDataHint: 'Entfernt Cookies und gespeicherte Daten — du wirst abgemeldet.',
    clearDataAction: 'Löschen',
    confirmTitle: 'Alle Daten löschen?',
    confirmDetail:
      'Cookies, Anmeldung und lokal gespeicherte Daten von shimly-quiz.de werden entfernt. ' +
      'Die Einstellungen dieser App bleiben erhalten.',
    confirmYes: 'Löschen',
    confirmNo: 'Abbrechen',
    done: 'Erledigt',

    close: 'Schliessen',
  },

  about: {
    title: 'Über',
    version: 'Version',
    electron: 'Electron',
    chrome: 'Chromium',
    node: 'Node',
    platform: 'Plattform',
    url: 'Zielseite',
    hosts: 'Erlaubte Hosts',
    disclaimer:
      'Inoffizieller Client für shimly-quiz.de. Nicht mit dem Betreiber der Seite verbunden.',
    repo: 'Projektseite öffnen',
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
    minimize: 'Minimize',
    helpPage: 'Help',
    report: 'Report a problem',
    project: 'Project page',
  },

  help: {
    title: 'Help',
    ctrl: 'Ctrl',
    shift: 'Shift',
    keyComma: 'Comma',
    keyPlus: 'Plus',
    keyMinus: 'Minus',

    shortcutsHeading: 'Keyboard shortcuts',
    scSettings: 'Open settings',
    scFullscreen: 'Full screen on and off',
    scExitFullscreen: 'Leave full screen',
    scReload: 'Reload the page',
    scHardReload: 'Reload without cache',
    scZoomIn: 'Zoom in',
    scZoomOut: 'Zoom out',
    scZoomReset: 'Reset zoom to actual size',
    scBack: 'Back to the previous page',
    scClose: 'Intercepted so the window cannot close mid-round',

    notesHeading: 'Good to know',
    noteLinksTitle: 'External links',
    noteLinks:
      'Only shimly-quiz.de opens in this window. Every other link and every download goes to your default browser.',
    noteLoginTitle: 'Staying signed in',
    noteLogin:
      'Your sign-in survives restarts. To sign out, use Settings → Data → Clear all data.',
    noteCacheTitle: 'Page shows outdated content',
    noteCache: 'Settings → Data → Clear cache. Your sign-in stays intact.',
    noteOfflineTitle: 'Site unreachable',
    noteOffline:
      'On connection problems an error page with "Try again" appears. If the display crashes, the app reloads by itself.',
    noteUnsignedTitle: 'Warning on first launch',
    noteUnsigned:
      'The app is not signed. Windows shows SmartScreen — choose "More info" and "Run anyway". On macOS, right-click the app and choose "Open".',

    close: 'Close',
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
    groupData: 'Data',

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

    restartNotice: 'This change takes effect after restarting the app.',
    restartNow: 'Restart now',

    clearCache: 'Clear cache',
    clearCacheHint: 'Reloads images and scripts. You stay signed in.',
    clearCacheAction: 'Clear',
    clearData: 'Clear all data',
    clearDataHint: 'Removes cookies and stored data — you will be signed out.',
    clearDataAction: 'Delete',
    confirmTitle: 'Clear all data?',
    confirmDetail:
      'Cookies, your sign-in and locally stored data from shimly-quiz.de will be removed. ' +
      'The settings of this app are kept.',
    confirmYes: 'Delete',
    confirmNo: 'Cancel',
    done: 'Done',

    close: 'Close',
  },

  about: {
    title: 'About',
    version: 'Version',
    electron: 'Electron',
    chrome: 'Chromium',
    node: 'Node',
    platform: 'Platform',
    url: 'Target site',
    hosts: 'Allowed hosts',
    disclaimer: 'Unofficial client for shimly-quiz.de. Not affiliated with the site operator.',
    repo: 'Open project page',
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
