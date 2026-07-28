'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Brücke ausschliesslich für das Einstellungsfenster (src/renderer/settings.html).
contextBridge.exposeInMainWorld('settingsApi', {
  // Synchron geholt, damit die Seite ihre Beschriftungen sofort setzen kann.
  t: ipcRenderer.sendSync('app:strings'),
  read: () => ipcRenderer.invoke('settings:read'),
  write: (patch) => ipcRenderer.invoke('settings:write', patch),
  clearCache: () => ipcRenderer.invoke('settings:clear-cache'),
  clearData: () => ipcRenderer.invoke('settings:clear-data'),
  relaunch: () => ipcRenderer.send('settings:relaunch'),
  close: () => ipcRenderer.send('settings:close'),
  onChanged: (fn) => ipcRenderer.on('settings:changed', (_event, cfg) => fn(cfg)),
});
