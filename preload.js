const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getStatus: () => ipcRenderer.invoke('get-status'),
  toggleWatcher: () => ipcRenderer.invoke('toggle-watcher'),
  sortNow: () => ipcRenderer.invoke('sort-now'),
  openDownloadsFolder: () => ipcRenderer.invoke('open-downloads-folder'),
  openCategoryFolder: (folderName) => ipcRenderer.invoke('open-category-folder', folderName),
  getHistory: () => ipcRenderer.invoke('get-history'),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  toggleAutoStart: (enable) => ipcRenderer.invoke('toggle-autostart', enable),
  getAutoStartStatus: () => ipcRenderer.invoke('get-autostart-status'),
  saveMappings: (mappings) => ipcRenderer.invoke('save-mappings', mappings),
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  sendTestNotification: () => ipcRenderer.invoke('send-test-notification'),

  // Event Listeners from Main process to UI
  onFileMoved: (callback) => ipcRenderer.on('file-moved', (event, data) => callback(data)),
  onStatusChanged: (callback) => ipcRenderer.on('status-changed', (event, data) => callback(data))
});
