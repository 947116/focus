const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow;
let focusBar;
let usageDataFile = path.join(app.getPath('userData'), 'usage-data.json');
let usageData = { date: '', computerUsage: 0, sessionTime: 0 };
let tray = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
    resizable: false,
    frame: false,
    backgroundColor: '#000',
    alwaysOnTop: false,
  });

  mainWindow.loadFile('index.html');

  // Nach dem Laden des Fensters Usage-Daten schicken
  mainWindow.webContents.on('did-finish-load', () => {
    sendUsageData();
  });
}

function createFocusBar(intent, minutes) {
  if (focusBar) {
    focusBar.close();
  }

  // Position aus Datei laden
  const positionFile = path.join(__dirname, 'focusbar-position.json');
  let x, y;
  if (fs.existsSync(positionFile)) {
    try {
      const pos = JSON.parse(fs.readFileSync(positionFile, 'utf-8'));
      x = pos.x;
      y = pos.y;
    } catch (e) {
      x = undefined;
      y = undefined;
    }
  }
  const { width } = screen.getPrimaryDisplay().workAreaSize;
  const barWidth = 160 * 0.75;
  const barHeight = 80 * 0.75;

  focusBar = new BrowserWindow({
    width: barWidth,
    height: barHeight,
    x: typeof x === 'number' ? x : Math.round((width - barWidth) / 2),
    y: typeof y === 'number' ? y : 100,
    alwaysOnTop: true,
    frame: false,
    resizable: false,
    skipTaskbar: true, // Focusbar nicht in Taskleiste anzeigen
    transparent: true, // Damit der Fensterrand wirklich eckig ist
    roundedCorners: false, // Windows 11: keine abgerundeten Ecken
    webPreferences: {
      preload: path.join(__dirname, 'focusbar-preload.js'),
    },
  });

  focusBar.setAlwaysOnTop(true, 'screen-saver');
  focusBar.loadFile('focusbar.html');

  focusBar.once('ready-to-show', () => {
    focusBar.webContents.send('start-focus', { intent, minutes });
  });

  // Position speichern, wenn verschoben
  focusBar.on('move', () => {
    const [newX, newY] = [focusBar.getBounds().x, focusBar.getBounds().y];
    fs.writeFileSync(positionFile, JSON.stringify({ x: newX, y: newY }));
  });

  focusBar.on('closed', () => {
    focusBar = null;
  });
}

function loadUsageData() {
  try {
    if (fs.existsSync(usageDataFile)) {
      const data = JSON.parse(fs.readFileSync(usageDataFile, 'utf-8'));
      if (data.date === new Date().toISOString().slice(0, 10)) {
        usageData = data;
      } else {
        usageData = { date: new Date().toISOString().slice(0, 10), computerUsage: 0, sessionTime: 0 };
      }
    } else {
      usageData = { date: new Date().toISOString().slice(0, 10), computerUsage: 0, sessionTime: 0 };
    }
  } catch (e) {
    usageData = { date: new Date().toISOString().slice(0, 10), computerUsage: 0, sessionTime: 0 };
  }
}

function saveUsageData() {
  fs.writeFileSync(usageDataFile, JSON.stringify(usageData));
}

let usageInterval = null;

function startUsageTracking() {
  if (usageInterval) clearInterval(usageInterval);
  usageInterval = setInterval(() => {
    loadUsageData();
    usageData.computerUsage += 1;
    saveUsageData();
  }, 60000); // jede Minute
}

function sendUsageData() {
  if (mainWindow) {
    mainWindow.webContents.send('usage-data', {
      computerUsage: Math.floor(os.uptime() / 60),
      sessionTime: usageData.sessionTime
    });
  }
}

app.whenReady().then(() => {
  // Autostart beim Systemstart aktivieren
  app.setLoginItemSettings({
    openAtLogin: true,
    path: process.execPath
  });

  loadUsageData();
  startUsageTracking();

  createMainWindow();

  // Tray-Icon erstellen
  if (!tray) {
    // Versuche ein eigenes Icon zu laden, sonst Electron-Standardicon
    let iconPath = path.join(__dirname, 'icon.png');
    let trayIcon;
    if (fs.existsSync(iconPath)) {
      trayIcon = nativeImage.createFromPath(iconPath);
    } else {
      trayIcon = nativeImage.createEmpty(); // schwarzes Quadrat als Platzhalter
      trayIcon = trayIcon.resize({ width: 16, height: 16 });
    }
    tray = new Tray(trayIcon);
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Hauptfenster öffnen',
        click: () => {
          if (focusBar) {
            focusBar.close();
          }
          if (!mainWindow) {
            createMainWindow();
          } else {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Beenden',
        click: () => {
          app.quit();
        }
      }
    ]);
    tray.setToolTip('Focus App');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
      if (focusBar) {
        focusBar.close();
      }
      if (!mainWindow) {
        createMainWindow();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

function showMainWindowAndSendUsage() {
  if (!mainWindow) {
    createMainWindow();
  } else {
    mainWindow.show();
    mainWindow.setAlwaysOnTop(true);
    mainWindow.focus();
    setTimeout(() => mainWindow.setAlwaysOnTop(false), 100); // optional, damit es nicht immer "on top" bleibt
  }
  sendUsageData();
}

ipcMain.on('focus-submitted', (event, { intent, minutes }) => {
  startSessionTimer(minutes);
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(false);
    mainWindow.hide();
  }
  createFocusBar(intent, minutes);
});

ipcMain.on('focus-ended', () => {
  if (focusBar) focusBar.close();
  // Session time speichern
  usageData.sessionTime = usageData.sessionTime || 0;
  if (usageData.sessionTime === 0) {
    usageData.sessionTime = 0;
  }
  saveUsageData();
  showMainWindowAndSendUsage();
});

// ALT+n: Neue Session (Main-Fenster anzeigen)
ipcMain.on('new-session-request', () => {
  console.log('IPC received (main)');
  // Broadcast an alle Fenster, damit sich Focusbar selbst schließt
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('force-close-focusbar');
  });
  if (focusBar) {
    console.log('Focusbar exists, closing...');
    focusBar.close();
  } else {
    console.log('No focusbar to close.');
  }
  showMainWindowAndSendUsage();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Session time setzen, wenn Focusbar gestartet wird
function startSessionTimer(minutes) {
  usageData.sessionTime = minutes;
  saveUsageData();
}