window.addEventListener('DOMContentLoaded', () => {
  const form         = document.getElementById('intentForm');
  const intentInput  = document.getElementById('intent');
  const minutesInput = document.getElementById('minutes');

  // remember last valid minutes (fallback)
  let lastMinutes = parseInt(minutesInput.value.trim(), 10) || 25;

  function start() {
    const intent  = intentInput.value.trim();
    let minutes   = parseInt(minutesInput.value.trim(), 10);

    if (isNaN(minutes) || minutes < 1 || minutes > 99) minutes = lastMinutes;
    if (!intent) return; // no empty intent

    lastMinutes = minutes;
    window.electronAPI.submitFocus(intent, minutes);
  }

  // -------- helper: bring focus back to intent field --------
  function focusIntent() {
    intentInput.focus();
    if (intentInput.select) intentInput.select();
  }

  // set initial focus on load
  focusIntent();

  // ----------------------------------------------------------
  // native form submit (enter inside any field/button)
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    start();
  });

  // catch ENTER even when nothing is focused (or body focus)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      start();
    }
  });

  // minutes field: allow only digits + clamp 1–99
  minutesInput.addEventListener('input', () => {
    let val = minutesInput.value.replace(/[^0-9]/g, '');
    if (val.length > 2) val = val.slice(0, 2);
    let num = parseInt(val, 10);
    if (isNaN(num)) num = '';
    else if (num < 1) num = 1;
    else if (num > 99) num = 99;
    minutesInput.value = num;
  });

  // block wheel-change on number input (prevents accidental tweaks)
  minutesInput.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });

  // prevent arrow repeat beyond bounds
  minutesInput.addEventListener('keydown', (e) => {
    if ((e.key === 'ArrowUp'   && minutesInput.value >= 99) ||
        (e.key === 'ArrowDown' && minutesInput.value <= 1)) {
      e.preventDefault();
    }
  });

  // ALT + n → force‑new session (kept as before)
  window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'n' || e.key === 'N')) {
      e.preventDefault();
      if (window.electronAPI?.newSessionRequest) {
        window.electronAPI.newSessionRequest();
      } else if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.send('new-session-request');
      }
    }
  });
});

// ------- usage data callback -------
window.electronAPI.onUsageData((data) => {
  const usageDiv   = document.getElementById('computerUsage');
  const sessionDiv = document.getElementById('sessionTime');

  usageDiv.textContent = `computer usage: ${data.computerUsage} minutes`;

  if (data.sessionTime > 0) {
    sessionDiv.style.display = '';
    sessionDiv.textContent = `session time: ${data.sessionTime} minutes`;
  } else {
    sessionDiv.style.display = 'none';
    // when session ended & main shown again → focus on intent
    const intent = document.getElementById('intent');
    if (intent) { intent.focus(); intent.select?.(); }
  }
});
