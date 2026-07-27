'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Brücke ausschliesslich für das Über-Fenster (src/renderer/about.html).
// Beides synchron, damit die Seite fertig beschriftet erscheint.
contextBridge.exposeInMainWorld('aboutApi', {
  t: ipcRenderer.sendSync('app:strings'),
  info: ipcRenderer.sendSync('about:read'),
  openRepo: () => ipcRenderer.send('about:open-repo'),
  close: () => ipcRenderer.send('about:close'),
});
