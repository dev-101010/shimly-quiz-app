'use strict';

/**
 * Prüft die Oberflächentexte ohne Electron:
 *   - führen `de` und `en` dieselben Schlüssel?
 *   - hat jeder `data-t`-Platzhalter einer Seite einen Text?
 *   npm run check:i18n
 */

const fs = require('fs');
const path = require('path');
const Module = require('module');

// i18n.js braucht von Electron nur app.getSystemLocale – hier genügt ein Ersatz.
const load = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'electron') return { app: { getSystemLocale: () => 'de' } };
  return load.call(this, request, ...rest);
};

const { dictionaries } = require('../src/main/i18n');

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === 'object' ? flatten(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );

const problems = [];
const [first, ...others] = Object.entries(dictionaries);
const reference = new Set(flatten(first[1]));

for (const [lang, dict] of others) {
  const keys = new Set(flatten(dict));
  for (const k of reference) if (!keys.has(k)) problems.push(`${lang}: fehlt ${k}`);
  for (const k of keys) if (!reference.has(k)) problems.push(`${first[0]}: fehlt ${k}`);
}

// Seite -> Abschnitt im Wörterbuch.
const PAGES = { splash: 'splash', settings: 'settings', about: 'about', help: 'help' };
const RENDERER = path.join(__dirname, '..', 'src', 'renderer');

for (const [page, section] of Object.entries(PAGES)) {
  const html = fs.readFileSync(path.join(RENDERER, `${page}.html`), 'utf8');
  for (const [, key] of html.matchAll(/data-t="([^"]+)"/g)) {
    for (const [lang, dict] of Object.entries(dictionaries)) {
      if (typeof dict[section][key] !== 'string') {
        problems.push(`${page}.html: ${lang}.${section}.${key} fehlt`);
      }
    }
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`Texte vollständig: ${reference.size} Schlüssel je Sprache.`);
