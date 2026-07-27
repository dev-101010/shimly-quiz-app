'use strict';

/**
 * Holt die Original-Icons von shimly-quiz.de nach build/source/.
 * Danach `npm run icon` ausführen, um daraus build/icon.ico und build/icon.png
 * zu bauen.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ORIGIN = 'https://www.shimly-quiz.de';
const ASSETS = [
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/android-icon-48x48.png',
  '/favicon-96x96.png',
  '/android-icon-144x144.png',
  '/apple-icon-180x180.png',
  '/android-icon-192x192.png',
  '/ms-icon-310x310.png',
];

const OUT_DIR = path.join(__dirname, '..', 'build', 'source');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} für ${url}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks);
          fs.writeFileSync(dest, body);
          resolve(body.length);
        });
      })
      .on('error', reject);
  });
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const asset of ASSETS) {
    const dest = path.join(OUT_DIR, path.basename(asset));
    const bytes = await download(ORIGIN + asset, dest);
    console.log(`${path.basename(asset).padEnd(26)} ${(bytes / 1024).toFixed(1)} KB`);
  }
  console.log(`\nGespeichert in ${OUT_DIR}`);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
