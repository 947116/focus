const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  submitFocus: (intent, minutes) => ipcRenderer.send('focus-submitted', { intent, minutes }),
  onUsageData: (callback) => ipcRenderer.on('usage-data', (_, data) => callback(data)),
  newSessionRequest: () => ipcRenderer.send('new-session-request'),
});
