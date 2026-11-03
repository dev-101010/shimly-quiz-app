'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Dieselbe Preload läuft für die eigene Lade-/Fehlerseite und für
// shimly-quiz.de. Die Brücke braucht nur die eigene Seite – shimly-quiz.de
// bekommt gar nichts, Node bleibt ohnehin komplett außen vor.
if (location.protocol === 'file:') {
  contextBridge.exposeInMainWorld('shimlyApp', {
    retry: () => ipcRenderer.send('app:retry'),
    quit: () => ipcRenderer.send('app:quit'),
    // Texte für die Lade-/Fehlerseite; synchron, damit dort nichts nachspringt.
    t: ipcRenderer.sendSync('app:strings'),
  });
}

function isEditable(el) {
  return (
    el instanceof HTMLElement &&
    (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
  );
}

// macOS: Cmd+← ist dort Zurück, in Textfeldern aber "an den Zeilenanfang".
// Nur hier ist bekannt, was den Fokus hat – deshalb entscheidet die Preload
// und nicht before-input-event im Hauptprozess. Hat die Seite die Taste
// selbst verwendet (preventDefault), bleibt es ebenfalls dabei.
if (process.platform === 'darwin') {
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' || !event.metaKey) return;
    if (event.altKey || event.ctrlKey || event.shiftKey) return;
    if (event.defaultPrevented || isEditable(event.target)) return;
    event.preventDefault();
    ipcRenderer.send('app:back');
  });
}

// Rechtsklick-Menü von Chromium stört im Vollbild-Quiz; Eingabefelder bleiben
// bewusst ausgenommen, damit Einfügen weiter funktioniert. Der Wert steht in
// der settings.json und wird beim Laden einmal abgefragt – im
// Einstellungsfenster gibt es dafür bewusst keinen Schalter.
let contextMenuBlocked = false;

ipcRenderer.invoke('app:context-menu-blocked').then((blocked) => {
  contextMenuBlocked = blocked;
});

window.addEventListener(
  'contextmenu',
  (event) => {
    if (!contextMenuBlocked) return;
    if (!isEditable(event.target)) event.preventDefault();
  },
  { capture: true },
);

// Ein versehentlicher Wisch/Ctrl+Scroll soll das Layout mitten im Quiz nicht
// verziehen – Zoom läuft ausschließlich über Ctrl +/- im Hauptprozess.
window.addEventListener(
  'wheel',
  (event) => {
    if (event.ctrlKey) event.preventDefault();
  },
  { passive: false, capture: true },
);

// Datei-Drops ins Fenster würden sonst die Seite durch die Datei ersetzen.
for (const type of ['dragover', 'drop']) {
  window.addEventListener(type, (event) => event.preventDefault(), { capture: true });
}
