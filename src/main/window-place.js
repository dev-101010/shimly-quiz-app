'use strict';

/**
 * Platzierung von Kindfenstern.
 *
 * `parent` regelt in Electron nur die Über-/Unterordnung, nicht die Position:
 * ohne eigene Koordinaten setzt das System das Fenster auf seinen Standardplatz
 * und damit bei mehreren Monitoren auf den primären – auch wenn das
 * Hauptfenster ganz woanders steht.
 */

const { screen } = require('electron');

/**
 * Reine Rechnung, ohne Electron – deshalb prüfbar.
 *
 * Mittig über dem Elternrechteck, aber vollständig innerhalb der nutzbaren
 * Fläche. Passt der Dialog nicht hinein, wird er verkleinert statt über den
 * Rand geschoben; das kann auf kleinen oder stark skalierten Bildschirmen
 * vorkommen, wo die Fläche in DIP deutlich kleiner ist als die Pixelzahl
 * vermuten lässt.
 *
 * Alle Angaben in DIP, wie Electron sie für Bildschirme und Fenster verwendet.
 * Negative Koordinaten sind normal – Monitore links vom primären liegen dort.
 *
 * @param {{x:number,y:number,width:number,height:number}} area nutzbare Fläche
 * @param {{x:number,y:number,width:number,height:number}} parent Elternfenster
 */
function fitInto(area, parent, width, height) {
  const w = Math.min(width, area.width);
  const h = Math.min(height, area.height);

  const center = (start, span, size, min, extent) =>
    Math.round(Math.max(min, Math.min(start + (span - size) / 2, min + extent - size)));

  return {
    x: center(parent.x, parent.width, w, area.x, area.width),
    y: center(parent.y, parent.height, h, area.y, area.height),
    width: w,
    height: h,
  };
}

/**
 * Wie `fitInto`, aber holt Bildschirm und Elternmasse selbst. Ohne
 * Elternfenster wird auf dem primären Bildschirm zentriert.
 */
function centeredOn(parent, width, height) {
  const alive = parent && !parent.isDestroyed();

  // Minimiert liefert getBounds auf manchen Systemen Platzhalterwerte weit
  // ausserhalb; getNormalBounds gibt die letzte echte Grösse.
  const bounds = alive
    ? parent.isMinimized()
      ? parent.getNormalBounds()
      : parent.getBounds()
    : screen.getPrimaryDisplay().workArea;

  const area = screen.getDisplayMatching(bounds).workArea;
  return fitInto(area, bounds, width, height);
}

module.exports = { centeredOn, fitInto };
