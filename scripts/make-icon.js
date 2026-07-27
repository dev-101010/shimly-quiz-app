'use strict';

/**
 * Baut build/icon.ico aus den Original-Icons der Seite (build/source/).
 * Läuft unter Electron, weil nativeImage das Skalieren übernimmt:
 *   npm run icon
 * Quellen aktualisieren: npm run icon:fetch
 */

const fs = require('fs');
const path = require('path');
const { app, nativeImage } = require('electron');

const SIZES = [16, 24, 32, 48, 64, 128, 256];
const SOURCE_DIR = path.join(__dirname, '..', 'build', 'source');
const OUT = path.join(__dirname, '..', 'build', 'icon.ico');

/** Alle vorhandenen Quell-PNGs mit ihrer Kantenlänge, aufsteigend. */
function loadSources() {
  if (!fs.existsSync(SOURCE_DIR)) {
    throw new Error(`${SOURCE_DIR} fehlt – bitte zuerst "npm run icon:fetch" ausführen.`);
  }

  const sources = fs
    .readdirSync(SOURCE_DIR)
    .filter((name) => name.toLowerCase().endsWith('.png'))
    .map((name) => {
      const image = nativeImage.createFromPath(path.join(SOURCE_DIR, name));
      return { name, image, size: image.getSize().width };
    })
    .filter((entry) => entry.size > 0)
    .sort((a, b) => a.size - b.size);

  if (sources.length === 0) throw new Error(`Keine brauchbaren PNGs in ${SOURCE_DIR}.`);
  return sources;
}

/** Exakte Grösse bevorzugen, sonst vom nächstgrösseren Original herunterrechnen. */
function pickSource(sources, target) {
  return (
    sources.find((s) => s.size === target) ||
    sources.find((s) => s.size > target) ||
    sources[sources.length - 1]
  );
}

/** BGRA (top-down, aus nativeImage) -> BMP-DIB (bottom-up) inkl. AND-Maske. */
function toDib(bgra, size) {
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0); // biSize
  header.writeInt32LE(size, 4); // biWidth
  header.writeInt32LE(size * 2, 8); // biHeight (Farbe + Maske)
  header.writeUInt16LE(1, 12); // biPlanes
  header.writeUInt16LE(32, 14); // biBitCount
  header.writeUInt32LE(0, 16); // BI_RGB

  const stride = size * 4;
  const pixels = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    bgra.copy(pixels, y * stride, (size - 1 - y) * stride, (size - y) * stride);
  }

  // 1-bit AND-Maske, Zeilen auf 4 Byte ausgerichtet; Nullen = überall sichtbar.
  const mask = Buffer.alloc(Math.ceil(size / 32) * 4 * size);

  return Buffer.concat([header, pixels, mask]);
}

function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // Typ: Icon
  header.writeUInt16LE(entries.length, 4);

  const directory = Buffer.alloc(16 * entries.length);
  let offset = header.length + directory.length;

  entries.forEach((entry, index) => {
    const at = index * 16;
    directory[at] = entry.size >= 256 ? 0 : entry.size; // 0 bedeutet 256
    directory[at + 1] = entry.size >= 256 ? 0 : entry.size;
    directory[at + 2] = 0; // Palettenfarben
    directory[at + 3] = 0;
    directory.writeUInt16LE(1, at + 4); // Planes
    directory.writeUInt16LE(32, at + 6); // Bits
    directory.writeUInt32LE(entry.data.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += entry.data.length;
  });

  return Buffer.concat([header, directory, ...entries.map((e) => e.data)]);
}

app.whenReady().then(() => {
  try {
    const sources = loadSources();

    const entries = SIZES.map((size) => {
      const source = pickSource(sources, size);
      const image =
        source.size === size ? source.image : source.image.resize({ width: size, height: size });
      console.log(`${String(size).padStart(3)} px  <-  ${source.name}`);
      return { size, data: toDib(image.toBitmap(), size) };
    });

    fs.writeFileSync(OUT, buildIco(entries));
    console.log(`\nicon.ico geschrieben (${SIZES.join(', ')} px) -> ${OUT}`);
    app.exit(0);
  } catch (err) {
    console.error(err.message);
    app.exit(1);
  }
});
