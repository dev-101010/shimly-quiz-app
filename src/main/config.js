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

/**
 * Passt `value` zum Typ des Standardwerts? Maßstab ist immer DEFAULTS, nicht
 * der aktuelle Stand – sonst ließe sich z. B. `x` nach einer Zahl nie wieder
 * auf `null` zurücksetzen. `null` als Standard steht für „Zahl oder null“.
 */
function compatible(reference, value) {
  if (reference === null) return value === null || Number.isFinite(value);
  if (typeof reference === 'number') return Number.isFinite(value);
  return typeof value === typeof reference;
}

/**
 * Übernimmt aus `override` nur bekannte Schlüssel mit passendem Typ. Eine von
 * Hand verbogene settings.json (z. B. `"zoomFactor": "1.5"`) fällt so still
 * auf den bisherigen Wert zurück, statt später in Electron zu werfen.
 */
function merge(base, override, schema = DEFAULTS) {
  const out = { ...base };
  if (!isPlainObject(override)) return out;
  for (const [key, value] of Object.entries(override)) {
    if (!(key in schema)) continue;
    if (isPlainObject(schema[key])) {
      if (isPlainObject(value)) out[key] = merge(base[key], value, schema[key]);
    } else if (compatible(schema[key], value)) {
      out[key] = value;
    }
  }
  return out;
}

const ZOOM_MIN = 0.4;
const ZOOM_MAX = 3;

function clampZoom(factor) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(factor.toFixed(2))));
}

function normalize(cfg) {
  return { ...cfg, zoomFactor: clampZoom(cfg.zoomFactor) };
}

let current = null;

/**
 * Aktueller Stand. Jedes `save` legt ein neues Objekt an – den Rückgabewert
 * deshalb nicht dauerhaft festhalten, sondern bei Bedarf neu abfragen.
 */
function load() {
  if (current) return current;
  try {
    current = normalize(merge(DEFAULTS, JSON.parse(fs.readFileSync(configPath(), 'utf8'))));
  } catch {
    current = normalize(merge(DEFAULTS, {}));
  }
  return current;
}

function save(patch) {
  current = normalize(merge(load(), patch));
  try {
    fs.writeFileSync(configPath(), JSON.stringify(current, null, 2), 'utf8');
  } catch (err) {
    console.error('[config] Speichern fehlgeschlagen:', err.message);
  }
  return current;
}

// Was an den Systembrowser bzw. das System weitergereicht werden darf. Andere
// Schemata (ms-msdt:, search-ms:, file: …) starten unter Umständen beliebige
// Programme – die Electron-Sicherheits-Checkliste warnt ausdrücklich davor.
const EXTERNAL_PROTOCOLS = ['https:', 'http:', 'mailto:'];

function isSafeExternalUrl(url) {
  try {
    return EXTERNAL_PROTOCOLS.includes(new URL(url).protocol);
  } catch {
    return false;
  }
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
  clampZoom,
  configPath,
  isAllowedUrl,
  isSafeExternalUrl,
};
