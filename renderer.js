window.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('intentForm');
    const intentInput = document.getElementById('intent');
    const minutesInput = document.getElementById('minutes');
  
    // Zusätzliche Validierung für Minutenfeld
    minutesInput.addEventListener('input', (e) => {
      let val = minutesInput.value.replace(/[^0-9]/g, '');
      if (val.length > 2) val = val.slice(0, 2);
      let num = parseInt(val, 10);
      if (isNaN(num)) num = '';
      else if (num < 1) num = 1;
      else if (num > 99) num = 99;
      minutesInput.value = num;
    });
    // Scrollen mit Mausrad verhindern
    minutesInput.addEventListener('wheel', (e) => {
      e.preventDefault();
    });
    // Scrollen mit Pfeiltasten verhindern, wenn außerhalb Bereich
    minutesInput.addEventListener('keydown', (e) => {
      if ((e.key === 'ArrowUp' && minutesInput.value >= 99) || (e.key === 'ArrowDown' && minutesInput.value <= 1)) {
        e.preventDefault();
      }
    });
  
    intentInput.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        minutesInput.focus();
      }
    });
  
    minutesInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const intent = intentInput.value.trim();
        const minutes = parseInt(minutesInput.value.trim()) || 0;
        if (intent && minutes >= 1 && minutes <= 99) {
          window.electronAPI.submitFocus(intent, minutes);
        }
      }
    });
  
    // ALT+n: Neue Session anfordern
    window.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        console.log('ALT+n pressed (main)');
        e.preventDefault();
        if (window.electronAPI && window.electronAPI.newSessionRequest) {
          console.log('IPC sent (main)');
          window.electronAPI.newSessionRequest();
        } else if (window.electron && window.electron.ipcRenderer) {
          console.log('IPC sent (main, fallback)');
          window.electron.ipcRenderer.send('new-session-request');
        }
      }
    });
  });
  
window.electronAPI.onUsageData((data) => {
  const usageDiv = document.getElementById('computerUsage');
  const sessionDiv = document.getElementById('sessionTime');
  usageDiv.textContent = `computer usage: ${data.computerUsage} minutes`;
  if (data.sessionTime > 0) {
    sessionDiv.style.display = '';
    sessionDiv.textContent = `session time: ${data.sessionTime} minutes`;
  } else {
    sessionDiv.style.display = 'none';
  }
});
  