'use strict';

const path = require('path');
const {
  app,
  BrowserWindow,
  shell,
  session,
  powerSaveBlocker,
  ipcMain,
  screen,
} = require('electron');

const config = require('./config');
const settingsWindow = require('./settings-window');
const aboutWindow = require('./about-window');
const helpWindow = require('./help-window');
const menu = require('./menu');
const i18n = require('./i18n');

if (!app) {
  // Passiert nur, wenn ELECTRON_RUN_AS_NODE gesetzt ist (z. B. im VSCode-Terminal):
  // electron.exe startet dann als reines Node und hat keine Fenster-APIs.
  console.error(
    'Electron laeuft im Node-Modus (ELECTRON_RUN_AS_NODE ist gesetzt).\n' +
      'Loesung: in dieser Shell "Remove-Item Env:ELECTRON_RUN_AS_NODE" ausfuehren\n' +
      'oder "npm start" statt "electron ." verwenden.',
  );
  process.exit(1);
}

const isDev = process.argv.includes('--dev');
const isMac = process.platform === 'darwin';
const cfg = config.load();

const SPLASH = path.join(__dirname, '..', 'renderer', 'splash.html');
const ICON = path.join(__dirname, '..', 'renderer', 'icon.png');
const PARTITION = 'persist:shimly'; // Cookies/Login/LocalStorage überleben Neustarts

let mainWindow = null;
let powerBlockerId = null;
let saveTimer = null;

/* ------------------------------------------------------------------ *
 * Chromium-Schalter — müssen vor app.whenReady() gesetzt werden.
 * ------------------------------------------------------------------ */
function applyChromiumFlags() {
  const sw = app.commandLine.appendSwitch.bind(app.commandLine);

  if (cfg.disableHardwareAcceleration) {
    app.disableHardwareAcceleration();
  } else {
    sw('ignore-gpu-blocklist'); // GPU auch auf "nicht freigegebenen" Treibern nutzen
    sw('enable-gpu-rasterization');
    sw('enable-zero-copy');
    sw('canvas-oop-rasterization');
    sw('enable-accelerated-2d-canvas');
  }

  // Kein Drosseln, wenn das Fenster den Fokus verliert oder verdeckt wird –
  // sonst laufen Timer/Animationen im Quiz langsamer.
  sw('disable-background-timer-throttling');
  sw('disable-renderer-backgrounding');
  sw('disable-backgrounding-occluded-windows');
  sw('disable-features', 'CalculateNativeWinOcclusion,IntensiveWakeUpThrottling');

  // Sound darf ohne vorherigen Klick starten.
  sw('autoplay-policy', 'no-user-gesture-required');

  if (cfg.uncapFrameRate) {
    sw('disable-frame-rate-limit');
    sw('disable-gpu-vsync');
  }

  sw('high-dpi-support', '1');
}

/* ------------------------------------------------------------------ *
 * Fensterposition merken (auf sichtbaren Bildschirm geklemmt).
 * ------------------------------------------------------------------ */
function sanitizedBounds() {
  const { width, height, x, y } = cfg.window;
  const bounds = {
    width: Math.max(800, width),
    height: Math.max(600, height),
  };
  if (x === null || y === null) return bounds;

  const area = screen.getDisplayMatching({ x, y, width: bounds.width, height: bounds.height })
    .workArea;
  const onScreen =
    x + bounds.width > area.x &&
    x < area.x + area.width &&
    y + bounds.height > area.y &&
    y < area.y + area.height;

  return onScreen ? { ...bounds, x, y } : bounds;
}

function persistWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isFullScreen() || mainWindow.isMinimized()) return;

  const maximized = mainWindow.isMaximized();
  const b = maximized ? mainWindow.getNormalBounds() : mainWindow.getBounds();
  config.save({ window: { width: b.width, height: b.height, x: b.x, y: b.y, maximized } });
}

function schedulePersist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persistWindowState, 400);
}

/* ------------------------------------------------------------------ *
 * Session: Rechte, Downloads, Fremd-Navigation.
 * ------------------------------------------------------------------ */
function configureSession(ses) {
  // Vollbild/Pointer-Lock/Audio erlauben, den Rest nicht.
  const allowed = new Set(['fullscreen', 'pointerLock', 'media', 'clipboard-sanitized-write']);
  ses.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(allowed.has(permission));
  });
  ses.setPermissionCheckHandler((_wc, permission) => allowed.has(permission));

  ses.on('will-download', (event, item) => {
    event.preventDefault();
    shell.openExternal(item.getURL()).catch(() => {});
  });
}

function hardenNavigation(contents) {
  // Links auf fremde Ziele im Systembrowser öffnen, nicht in der App.
  contents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });

  contents.on('will-navigate', (event, url) => {
    if (url.startsWith('file://')) return; // eigene Splash-/Fehlerseite
    if (config.isAllowedUrl(url)) return;
    event.preventDefault();
    shell.openExternal(url).catch(() => {});
  });

  contents.on('will-attach-webview', (event) => event.preventDefault());
}

/* ------------------------------------------------------------------ *
 * Tastatur: Gaming-taugliche Shortcuts, störende blockieren.
 * ------------------------------------------------------------------ */
function attachShortcuts(win) {
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const { alt, shift, key } = input;
    const k = (key || '').toLowerCase();

    // Auf macOS liegen dieselben Kürzel auf Cmd, und Zurück ist Cmd+← statt Alt+←.
    const control = isMac ? input.meta : input.control;
    const back = isMac ? control : alt;

    const consume = (fn) => {
      event.preventDefault();
      fn();
    };

    // Vollbild: F11 ist die Windows-/Linux-Konvention, macOS nutzt Ctrl+Cmd+F.
    // F11 bleibt dort zusätzlich erlaubt, liegt aber meist schon auf Mission
    // Control und erreicht die App dann gar nicht.
    const fullscreenKey = k === 'f11' || (isMac && input.control && input.meta && k === 'f');
    if (fullscreenKey) return consume(() => setFullScreen(win, !win.isFullScreen()));

    if (k === 'escape' && win.isFullScreen()) return consume(() => setFullScreen(win, false));
    // Neu laden: F5 und Ctrl+R weich, Ctrl+F5, Umschalt+F5 und Ctrl+Umschalt+R
    // ohne Zwischenspeicher – so machen es die Browser.
    if (k === 'f5' || (control && k === 'r')) {
      const hard = k === 'f5' ? control || shift : shift;
      return consume(() => reload(win, hard));
    }
    if (control && (k === '0' || k === 'numpad0')) return consume(() => setZoom(win, 1));
    if (control && (k === '+' || k === '=')) return consume(() => stepZoom(win, +0.1));
    if (control && (k === '-' || k === '_')) return consume(() => stepZoom(win, -0.1));
    if (back && k === 'arrowleft') {
      const history = win.webContents.navigationHistory;
      if (history.canGoBack()) return consume(() => history.goBack());
    }
    // DevTools: Windows/Linux Ctrl+Shift+I, macOS Cmd+Alt+I. F12 fehlt
    // absichtlich – zu leicht versehentlich getroffen für etwas, das normale
    // Nutzung nicht braucht.
    const devToolsKey = isMac ? control && alt && k === 'i' : control && shift && k === 'i';
    if (devToolsKey) return consume(() => win.webContents.toggleDevTools());
    if (control && k === ',') return consume(() => settingsWindow.open(win));
    // Hilfe: F1 unter Windows und Linux, Cmd+? unter macOS. Dort liegt F1
    // meist auf der Helligkeit und kommt gar nicht erst an.
    // Geprüft wird auf das erzeugte Zeichen, nicht auf die Taste – auf
    // deutschen Tastaturen liegt das Fragezeichen auf Shift+ß statt Shift+7.
    const helpKey = k === 'f1' || (isMac && input.meta && k === '?');
    if (helpKey) return consume(() => helpWindow.open(win));

    // Ctrl+W / Ctrl+Shift+W schließen sonst mitten im Quiz das Fenster.
    if (control && k === 'w') event.preventDefault();
  });
}

function setFullScreen(win, on) {
  win.setFullScreen(on);
  // Im Vollbild stört die Menüleiste; danach muss sie wieder auftauchen.
  win.setMenuBarVisibility(!on);
}

function reload(win, hard) {
  if (win.webContents.getURL().startsWith('file://')) return loadSite(win);
  hard ? win.webContents.reloadIgnoringCache() : win.webContents.reload();
}

function setZoom(win, factor) {
  const clamped = Math.min(3, Math.max(0.4, Number(factor.toFixed(2))));
  win.webContents.setZoomFactor(clamped);
  settingsWindow.notifyChanged(config.save({ zoomFactor: clamped }));
}

function stepZoom(win, delta) {
  setZoom(win, win.webContents.getZoomFactor() + delta);
}

/* ------------------------------------------------------------------ *
 * Menü – greift auf dieselben Funktionen zu wie die Tastenkürzel.
 * Alle Punkte zielen bewusst auf das Hauptfenster, auch wenn unter macOS
 * gerade das Einstellungsfenster den Fokus hat.
 * ------------------------------------------------------------------ */
function installMenu() {
  const onMain = (fn) => () => {
    if (mainWindow && !mainWindow.isDestroyed()) fn(mainWindow);
  };

  menu.install({
    settings: onMain((win) => settingsWindow.open(win)),
    about: onMain((win) => aboutWindow.open(win)),
    help: onMain((win) => helpWindow.open(win)),
    report: () => shell.openExternal(config.FORUM_URL).catch(() => {}),
    project: () => shell.openExternal(config.REPO_URL).catch(() => {}),
    reload: onMain((win) => reload(win, false)),
    hardReload: onMain((win) => reload(win, true)),
    back: onMain((win) => {
      const history = win.webContents.navigationHistory;
      if (history.canGoBack()) history.goBack();
    }),
    zoomIn: onMain((win) => stepZoom(win, +0.1)),
    zoomOut: onMain((win) => stepZoom(win, -0.1)),
    zoomReset: onMain((win) => setZoom(win, 1)),
    fullscreen: onMain((win) => setFullScreen(win, !win.isFullScreen())),
  });
}

/* ------------------------------------------------------------------ *
 * Laden + Fehlerbehandlung.
 * ------------------------------------------------------------------ */
function loadSite(win) {
  win.loadURL(config.APP_URL).catch(() => {});
}

function showError(win, code, description) {
  const q = new URLSearchParams({ state: 'error', code: String(code), message: description || '' });
  win.loadFile(SPLASH, { search: q.toString() }).catch(() => {});
}

/* ------------------------------------------------------------------ *
 * Fenster.
 * ------------------------------------------------------------------ */
function createWindow() {
  const ses = session.fromPartition(PARTITION);
  configureSession(ses);

  const win = new BrowserWindow({
    ...sanitizedBounds(),
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: '#0c0b0a',
    icon: ICON,
    fullscreen: cfg.startFullscreen,
    title: config.APP_TITLE,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      partition: PARTITION,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: false, // Quiz-Timer laufen auch unfokussiert weiter
      devTools: true,
      webviewTag: false,
    },
  });

  // hardenNavigation läuft zentral über app.on('web-contents-created').
  // Das Menü bleibt dank autoHideMenuBar eingeklappt und kommt erst auf Alt.
  attachShortcuts(win);

  // Der Fenstertitel bleibt der App-Titel; die Seite darf ihn nicht ersetzen.
  win.on('page-title-updated', (event) => event.preventDefault());

  win.once('ready-to-show', () => {
    if (cfg.window.maximized && !cfg.startFullscreen) win.maximize();
    win.show();
    win.focus();
  });

  win.webContents.on('did-finish-load', () => {
    if (cfg.zoomFactor !== 1) win.webContents.setZoomFactor(cfg.zoomFactor);
  });

  win.webContents.on('did-fail-load', (_e, code, description, url, isMainFrame) => {
    // -3 = ERR_ABORTED (z. B. durch eigene Weiterleitung ausgelöst)
    if (!isMainFrame || code === -3 || url.startsWith('file://')) return;
    showError(win, code, description);
  });

  win.webContents.on('render-process-gone', () => loadSite(win));

  win.on('resize', schedulePersist);
  win.on('move', schedulePersist);
  win.on('close', persistWindowState);
  win.on('closed', () => {
    mainWindow = null;
  });

  // Ladebildschirm zuerst, damit kein weißes Fenster aufblitzt.
  win.loadFile(SPLASH, { search: 'state=loading' }).then(() => loadSite(win));

  if (isDev) win.webContents.openDevTools({ mode: 'detach' });

  return win;
}

/* ------------------------------------------------------------------ *
 * IPC (aus der Splash-/Fehlerseite).
 * ------------------------------------------------------------------ */
ipcMain.on('app:retry', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) loadSite(win);
});

ipcMain.on('app:quit', () => app.quit());

ipcMain.handle('app:context-menu-blocked', () => cfg.blockContextMenu);

// Oberflächentexte für die Renderer. Bewusst synchron: so stehen die Texte
// schon beim ersten Rendern fest und nichts springt sichtbar um.
ipcMain.on('app:strings', (event) => {
  event.returnValue = i18n.strings();
});

/**
 * Übernimmt Änderungen aus dem Einstellungsfenster, soweit sie ohne Neustart
 * greifen können. `startFullscreen` wirkt erst beim nächsten Start, die
 * Chromium-Schalter erst nach einem Neustart – darauf weist der Dialog hin.
 */
function applySettings(patch, next) {
  const live = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;

  if ('preventDisplaySleep' in patch) setDisplaySleepBlocked(next.preventDisplaySleep);
  if ('zoomFactor' in patch && live) live.webContents.setZoomFactor(next.zoomFactor);
}

/**
 * Leert nur Zwischenspeicher, ohne abzumelden.
 *
 * Zwei getrennte Töpfe: `clearCache` räumt den HTTP-Cache, `cachestorage` ist
 * der Speicher der Cache-API, aus dem ein Service Worker seine Dateien
 * ausliefert. Der ist bei shimly-quiz.de der weitaus grössere — ohne ihn
 * bliebe die Seite trotz "geleert" auf altem Stand.
 */
async function clearCaches() {
  const ses = session.fromPartition(PARTITION);
  await ses.clearCache();
  await ses.clearStorageData({ storages: ['cachestorage', 'shadercache'] });
}

/**
 * Meldet ab und räumt die Partition leer: Cookies, LocalStorage, IndexedDB,
 * Service Worker und den Zwischenspeicher. Die settings.json bleibt unberührt,
 * die liegt ausserhalb der Session.
 */
async function clearBrowsingData() {
  const ses = session.fromPartition(PARTITION);
  await ses.clearStorageData();
  await ses.clearCache();
  // Frisch laden statt neu laden – nach dem Abmelden ist die alte Adresse
  // womöglich nicht mehr erreichbar.
  if (mainWindow && !mainWindow.isDestroyed()) loadSite(mainWindow);
}

function setDisplaySleepBlocked(on) {
  const running = powerBlockerId !== null && powerSaveBlocker.isStarted(powerBlockerId);
  if (on && !running) {
    powerBlockerId = powerSaveBlocker.start('prevent-display-sleep');
  } else if (!on && running) {
    powerSaveBlocker.stop(powerBlockerId);
    powerBlockerId = null;
  }
}

/* ------------------------------------------------------------------ *
 * Lifecycle.
 * ------------------------------------------------------------------ */
applyChromiumFlags();

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  // Muss vor dem ersten Fenster stehen – greift auch für DevTools-Contents.
  app.on('web-contents-created', (_e, contents) => hardenNavigation(contents));

  // Auf macOS bleibt die App üblicherweise im Dock, bis der Benutzer Cmd+Q
  // drückt; 'activate' baut das Fenster dann wieder auf.
  app.on('window-all-closed', () => {
    if (!isMac) app.quit();
  });

  app.on('will-quit', () => {
    if (powerBlockerId !== null && powerSaveBlocker.isStarted(powerBlockerId)) {
      powerSaveBlocker.stop(powerBlockerId);
    }
  });

  aboutWindow.registerIpc();
  helpWindow.registerIpc();

  settingsWindow.registerIpc({
    applySettings,
    clearCache: clearCaches,
    clearData: clearBrowsingData,
  });

  app.whenReady().then(() => {
    app.setAppUserModelId('de.shimly.quiz');

    installMenu();
    setDisplaySleepBlocked(cfg.preventDisplaySleep);

    mainWindow = createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow();
    });
  });
}
