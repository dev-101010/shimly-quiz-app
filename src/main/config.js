'use strict';

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const APP_TITLE = 'Shimly Quiz (Third Party)';
const APP_URL = 'https://www.shimly-quiz.de/';
const REPO_URL = 'https://github.com/dev-101010/shimly-quiz-app';
// Rückmeldungen sammeln sich im Forum, nicht auf GitHub – dorthin zeigt
// "Problem melden".
const FORUM_URL = 'https://www.shimly-forum.de/thread-1498.html';

// Nur diese Hosts werden im Fenster geöffnet. Alles andere geht in den
// Standardbrowser des Systems.
const ALLOWED_HOSTS = ['shimly-quiz.de', 'www.shimly-quiz.de'];

const DEFAULTS = {
  // Fenster
  startFullscreen: false,
  window: { width: 1600, height: 900, x: null, y: null, maximized: false },

  // Leistung
  uncapFrameRate: false, // rAF/Compositor ohne 60-Hz-Deckel (mehr FPS, mehr Last)
  preventDisplaySleep: false, // true = Standby blockieren, solange die App läuft
  disableHardwareAcceleration: false, // Notausgang bei GPU-Treiber-Problemen

  // Bedienung
  blockContextMenu: true,
  zoomFactor: 1,
};

let cachedPath = null;
function configPath() {
  if (!cachedPath) cachedPath = path.join(app.getPath('userData'), 'settings.json');
  return cachedPath;
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function merge(base, override) {
  const out = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    if (!(key in base)) continue;
    out[key] = isPlainObject(base[key]) && isPlainObject(value) ? merge(base[key], value) : value;
  }
  return out;
}

let current = null;

function load() {
  if (current) return current;
  try {
    current = merge(DEFAULTS, JSON.parse(fs.readFileSync(configPath(), 'utf8')));
  } catch {
    current = merge(DEFAULTS, {});
  }
  return current;
}

function save(patch) {
  current = merge(load(), patch);
  try {
    fs.writeFileSync(configPath(), JSON.stringify(current, null, 2), 'utf8');
  } catch (err) {
    console.error('[config] Speichern fehlgeschlagen:', err.message);
  }
  return current;
}

function isAllowedUrl(url) {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== 'https:' && protocol !== 'http:') return false;
    return ALLOWED_HOSTS.includes(hostname.toLowerCase());
  } catch {
    return false;
  }
}

module.exports = {
  APP_TITLE,
  APP_URL,
  REPO_URL,
  FORUM_URL,
  ALLOWED_HOSTS,
  DEFAULTS,
  load,
  save,
  configPath,
  isAllowedUrl,
};
