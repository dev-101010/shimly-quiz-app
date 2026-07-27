'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Nur diese Brücke steht der Seite zur Verfügung – Node bleibt komplett aussen vor.
contextBridge.exposeInMainWorld('shimlyApp', {
  retry: () => ipcRenderer.send('app:retry'),
  quit: () => ipcRenderer.send('app:quit'),
  // Texte für die Lade-/Fehlerseite; synchron, damit dort nichts nachspringt.
  t: ipcRenderer.sendSync('app:strings'),
});

// Rechtsklick-Menü von Chromium stört im Vollbild-Quiz; Eingabefelder bleiben
// bewusst ausgenommen, damit Einfügen weiter funktioniert. Der Wert kommt aus
// den Einstellungen und lässt sich dort im laufenden Betrieb umschalten.
let contextMenuBlocked = false;

ipcRenderer.invoke('app:context-menu-blocked').then((blocked) => {
  contextMenuBlocked = blocked;
});
ipcRenderer.on('app:context-menu-blocked', (_event, blocked) => {
  contextMenuBlocked = blocked;
});

window.addEventListener(
  'contextmenu',
  (event) => {
    if (!contextMenuBlocked) return;
    const el = event.target;
    const editable =
      el instanceof HTMLElement &&
      (el.isContentEditable || ['INPUT', 'TEXTAREA'].includes(el.tagName));
    if (!editable) event.preventDefault();
  },
  { capture: true },
);

// Ein versehentlicher Wisch/Ctrl+Scroll soll das Layout mitten im Quiz nicht
// verziehen – Zoom läuft ausschliesslich über Ctrl +/- im Hauptprozess.
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
