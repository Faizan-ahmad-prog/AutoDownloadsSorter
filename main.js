const { app, BrowserWindow, Tray, Menu, ipcMain, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const DownloadsSorter = require('./sorter');
const { sendNotification } = require('./notifier');

// CRITICAL FOR WINDOWS 10/11 TOAST NOTIFICATIONS!
if (process.platform === 'win32') {
  app.setAppUserModelId('com.autodownloadssorter.app');
}

let mainWindow = null;
let tray = null;
let sorter = null;
let isQuitting = false;
let configPath = path.join(app.getPath('userData'), 'sorter-config.json');

// Default config persistence
let userConfig = {
  autoStart: true,
  showNotifications: true,
  customMappings: null
};

// Load saved user configuration if available
try {
  if (fs.existsSync(configPath)) {
    userConfig = { ...userConfig, ...fs.readJsonSync(configPath) };
  }
} catch (e) {
  console.error('Failed to load user config:', e);
}

function saveUserConfig() {
  try {
    fs.writeJsonSync(configPath, userConfig, { spaces: 2 });
  } catch (e) {
    console.error('Failed to save config:', e);
  }
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function notifyFileMoved(record) {
  if (!userConfig.showNotifications) return;
  sendNotification(
    `File Auto-Sorted 🚀`,
    `Moved "${record.fileName}" to "${record.folderName}" folder`,
    record.destPath
  );
}

function createMainWindow() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    title: 'Auto Downloads Sorter',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    frame: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    if (!process.argv.includes('--hidden')) {
      mainWindow.show();
    }
  });

  // Intercept window close to minimize to App Tray running in background
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      
      if (!userConfig.hasSeenTrayNotice) {
        userConfig.hasSeenTrayNotice = true;
        saveUserConfig();
        sendNotification(
          'Running in System Tray',
          'Auto Downloads Sorter is active in your background app tray.'
        );
      }
    }
    return false;
  });
}

function createSystemTray() {
  const trayIcoPath = path.join(__dirname, 'assets', 'tray-icon.ico');
  const trayPngPath = path.join(__dirname, 'assets', 'tray-icon.png');
  const iconPath = fs.existsSync(trayIcoPath) ? trayIcoPath : trayPngPath;

  tray = new Tray(iconPath);
  tray.setToolTip('Auto Downloads Sorter (Running in Background)');

  updateTrayContextMenu();

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function updateTrayContextMenu() {
  if (!tray) return;

  const isEnabled = sorter ? sorter.enabled : true;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Auto Downloads Sorter',
      enabled: false
    },
    { type: 'separator' },
    {
      label: isEnabled ? '🟢 Status: Active' : '🟡 Status: Paused',
      enabled: false
    },
    {
      label: '⚡ Sort Existing Downloads Now',
      click: async () => {
        if (sorter) {
          const moved = await sorter.sortExistingDownloads();
          if (moved.length > 0) {
            sendNotification(
              'Downloads Sorted 🚀',
              `Organized ${moved.length} files in your Downloads folder!`
            );
          } else {
            sendNotification(
              'Downloads Clean ✨',
              'No unorganized files found in Downloads folder.'
            );
          }
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('status-changed', {
              stats: sorter.stats,
              enabled: sorter.enabled
            });
          }
        }
      }
    },
    {
      label: '🔔 Send Test Notification',
      click: () => {
        sendNotification(
          'Auto Sorter Test Notification 🔔',
          'Notifications are working properly on your computer!'
        );
      }
    },
    {
      label: '📂 Open Downloads Folder',
      click: () => {
        shell.openPath(sorter.downloadsDir);
      }
    },
    { type: 'separator' },
    {
      label: isEnabled ? '⏸️ Pause Auto-Sorter' : '▶️ Resume Auto-Sorter',
      click: () => {
        if (sorter) {
          if (sorter.enabled) {
            sorter.stopWatching();
          } else {
            sorter.startWatching();
          }
          updateTrayContextMenu();
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('status-changed', {
              stats: sorter.stats,
              enabled: sorter.enabled
            });
          }
        }
      }
    },
    {
      label: '🖥️ Open Dashboard',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: '🚀 Start with Windows',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (menuItem) => {
        app.setLoginItemSettings({
          openAtLogin: menuItem.checked,
          openAsHidden: true
        });
        userConfig.autoStart = menuItem.checked;
        saveUserConfig();
      }
    },
    { type: 'separator' },
    {
      label: '❌ Exit Sorter',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

// Initialize Application Lifecycle
app.whenReady().then(() => {
  sorter = new DownloadsSorter({
    customMappings: userConfig.customMappings || undefined,
    onFileMovedCallback: (record) => {
      notifyFileMoved(record);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('file-moved', record);
      }
    }
  });

  sorter.startWatching();

  createMainWindow();
  createSystemTray();

  if (userConfig.autoStart) {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep running in tray background
  }
});

// IPC Handlers
ipcMain.handle('get-status', () => {
  return {
    downloadsDir: sorter.downloadsDir,
    enabled: sorter.enabled,
    stats: sorter.stats,
    mappings: sorter.customMappings,
    history: sorter.history
  };
});

ipcMain.handle('toggle-watcher', () => {
  if (sorter.enabled) {
    sorter.stopWatching();
  } else {
    sorter.startWatching();
  }
  updateTrayContextMenu();
  return { enabled: sorter.enabled };
});

ipcMain.handle('sort-now', async () => {
  const movedRecords = await sorter.sortExistingDownloads();
  if (movedRecords.length > 0) {
    sendNotification(
      'Downloads Sorted 🚀',
      `Organized ${movedRecords.length} files in your Downloads folder!`
    );
  } else {
    sendNotification(
      'Downloads Clean ✨',
      'No unorganized files found in Downloads folder.'
    );
  }
  return {
    movedCount: movedRecords.length,
    records: movedRecords,
    stats: sorter.stats
  };
});

ipcMain.handle('open-downloads-folder', () => {
  shell.openPath(sorter.downloadsDir);
  return true;
});

ipcMain.handle('open-category-folder', (event, folderName) => {
  const targetFolder = path.join(sorter.downloadsDir, folderName);
  if (fs.existsSync(targetFolder)) {
    shell.openPath(targetFolder);
  } else {
    shell.openPath(sorter.downloadsDir);
  }
  return true;
});

ipcMain.handle('get-history', () => {
  return sorter.history;
});

ipcMain.handle('clear-history', () => {
  sorter.history = [];
  return true;
});

ipcMain.handle('get-autostart-status', () => {
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('toggle-autostart', (event, enable) => {
  app.setLoginItemSettings({
    openAtLogin: enable,
    openAsHidden: true
  });
  userConfig.autoStart = enable;
  saveUserConfig();
  updateTrayContextMenu();
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('save-mappings', (event, newMappings) => {
  sorter.customMappings = newMappings;
  userConfig.customMappings = newMappings;
  saveUserConfig();
  return true;
});

ipcMain.handle('send-test-notification', () => {
  sendNotification(
    'Auto Sorter Test Notification 🔔',
    'Notifications are working properly on your computer!'
  );
  return true;
});

ipcMain.handle('minimize-to-tray', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
  return true;
});
