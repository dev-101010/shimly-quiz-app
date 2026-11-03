'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Brücke ausschließlich für das Hilfefenster (src/renderer/help.html).
contextBridge.exposeInMainWorld('helpApi', {
  t: ipcRenderer.sendSync('app:strings'),
  shortcuts: ipcRenderer.sendSync('help:read'),
  close: () => ipcRenderer.send('help:close'),
});
