window.focusAPI.onStart(({ intent, minutes }) => {
  const intentDiv = document.getElementById('intent');
  const timeDiv = document.getElementById('time');

  intentDiv.textContent = intent;
  let remainingSeconds = minutes * 60;

  function updateTimer() {
    const min = Math.ceil(remainingSeconds / 60);
    timeDiv.textContent = `${min} min`;
    const container = document.getElementById('container');
    if (remainingSeconds < 10) {
      container.style.background = 'red';
    } else if (remainingSeconds < 60) {
      container.style.background = 'orange';
    } else {
      container.style.background = '#000';
    }
  }

  updateTimer();
  const interval = setInterval(() => {
    remainingSeconds--;
    updateTimer();
    if (remainingSeconds <= 0) {
      clearInterval(interval);
      window.focusAPI.focusEnded();
    }
  }, 1000);
});

function createFocusBar(intent, minutes) {
  if (focusBar) {
    focusBar.close();
  }

  const { width } = screen.getPrimaryDisplay().workAreaSize;
  const barWidth = 400 * 0.75;
  const barHeight = 80 * 0.75;

  focusBar = new BrowserWindow({
    width: barWidth,
    height: barHeight,
    x: Math.round((width - barWidth) / 2),
    y: 100,
    alwaysOnTop: true,
    frame: false,
    resizable: false,
    transparent: false,
    backgroundColor: '#3498db',
    webPreferences: {
      preload: path.join(__dirname, 'focusbar-preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
  });

  focusBar.setAlwaysOnTop(true, 'screen-saver');
  focusBar.loadFile('focusbar.html');
  focusBar.webContents.session.clearCache();
  focusBar.webContents.session.clearStorageData();

  focusBar.once('ready-to-show', () => {
    focusBar.webContents.send('start-focus', { intent, minutes });
  });

  focusBar.on('closed', () => {
    focusBar = null;
  });
}

ipcMain.on('focus-ended', () => {
  if (focusBar) focusBar.close();
  if (!mainWindow) {
    createMainWindow();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
});

// IPC-Event: Focusbar soll sich selbst schließen
if (window.electron && window.electron.ipcRenderer) {
  window.electron.ipcRenderer.on('force-close-focusbar', () => {
    window.close();
  });
} else if (window.focusAPI && window.focusAPI.onForceClose) {
  window.focusAPI.onForceClose(() => window.close());
}

// ALT+n: Neue Session anfordern
window.addEventListener('keydown', (e) => {
  if (e.altKey && (e.key === 'n' || e.key === 'N')) {
    console.log('ALT+n pressed (focusbar)');
    e.preventDefault();
    window.close(); // Focusbar schließt sich selbst
    if (window.focusAPI && window.focusAPI.newSessionRequest) {
      console.log('IPC sent (focusbar)');
      window.focusAPI.newSessionRequest();
    }
  }
});