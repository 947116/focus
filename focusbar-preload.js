const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('focusAPI', {
  onInit: (callback) => ipcRenderer.on('init-focus', (event, data) => callback(data)),
  onStart: (callback) => ipcRenderer.on('start-focus', (event, data) => callback(data)),
  focusEnded: () => ipcRenderer.send('focus-ended'),
  newSessionRequest: () => ipcRenderer.send('new-session-request'),
});
