'use strict';

/** Angaben für das Über-Fenster. Reine Lesewerte, nichts davon ist einstellbar. */

const { app } = require('electron');

const config = require('./config');

function info() {
  return {
    name: config.APP_TITLE,
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: `${process.platform}-${process.arch}`,
    url: config.APP_URL,
    hosts: config.ALLOWED_HOSTS.join(', '),
  };
}

module.exports = { info };
