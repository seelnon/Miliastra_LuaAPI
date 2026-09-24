// ============================================================================
// MILIASTRA LUA RUNNER & GAME SIMULATOR MODAL
// Miliastra Virtual 60FPS Canvas Game Engine Simulation
// ============================================================================

import { MiliastraSimulator } from './lua-runtime.js';

let activeSimulator = null;
let modalContainer = null;

export function openLuaRunnerModal(luaCode, scriptTitle = 'Miliastra Lua Simulation') {
  closeLuaRunnerModal();

  modalContainer = document.createElement('div');
  modalContainer.className = 'sim-modal-backdrop';
  modalContainer.innerHTML = `
    <div class="sim-modal-window">
      <!-- Window Titlebar -->
      <div class="sim-modal-header">
        <div class="sim-header-left">
          <span class="sim-status-dot"></span>
          <span class="sim-title">[ MILIASTRA SIMULATION ] ${escapeHtml(scriptTitle)}</span>
        </div>
        <div class="sim-header-controls">
          <button class="brutal-btn sim-restart-btn" title="Restart / Re-execute">[ ⟲ RE-RUN ]</button>
          <button class="brutal-btn sim-pause-btn" title="Pause / Resume Simulation">[ ❚❚ PAUSE ]</button>
          <button class="brutal-btn sim-clear-logs-btn" title="Clear Console Logs">[ CLEAR LOGS ]</button>
          <button class="brutal-btn brutal-btn-danger sim-close-btn" title="Close">[ ✕ CLOSE ]</button>
        </div>
      </div>

      <!-- Main Canvas Viewport Area -->
      <div class="sim-viewport-body">
        <!-- Canvas Game Viewport -->
        <div class="sim-canvas-wrapper" id="sim-canvas-panel">
          <canvas id="miliastra-sim-canvas" width="960" height="640" tabindex="0"></canvas>
          <div class="sim-canvas-overlay-help">
            <span>🖱️ Mouse: Aim / Click / Drag</span>
            <span>⌨️ WASD / Arrows / Keybinds</span>
          </div>
        </div>

        <!-- Right Interactive Console Drawer -->
        <div class="sim-console-drawer">
          <div class="sim-console-header">
            <span>LOGS & EVENTS</span>
            <span class="sim-log-count">0 ENTRIES</span>
          </div>
          <div class="sim-console-logs" id="sim-console-logs">
            <div class="sim-log-row info">
              <span class="sim-log-time">[00:00:00]</span>
              <span class="sim-log-text">Miliastra Lua Virtual Engine 1.0 initialized.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer / Statusbar -->
      <div class="sim-modal-footer">
        <div class="sim-footer-left">
          <span id="sim-engine-indicator">Engine: Miliastra Virtual Runtime 60FPS</span>
          <span class="sim-separator">|</span>
          <span>Viewport: 960 × 640 Native</span>
        </div>
        <div class="sim-footer-right">
          <span id="sim-fps-indicator">FPS: 60</span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalContainer);

  const canvas = document.getElementById('miliastra-sim-canvas');
  const pauseBtn = modalContainer.querySelector('.sim-pause-btn');
  const restartBtn = modalContainer.querySelector('.sim-restart-btn');
  const clearLogsBtn = modalContainer.querySelector('.sim-clear-logs-btn');
  const closeBtn = modalContainer.querySelector('.sim-close-btn');

  const logsContainer = document.getElementById('sim-console-logs');
  const logCountSpan = modalContainer.querySelector('.sim-log-count');
  let logEntriesCount = 1;

  const appendLog = (message, type = 'info') => {
    if (!logsContainer) return;
    const row = document.createElement('div');
    row.className = `sim-log-row ${type}`;
    const now = new Date();
    const timeStr = `[${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}]`;
    row.innerHTML = `<span class="sim-log-time">${timeStr}</span> <span class="sim-log-text">${escapeHtml(message)}</span>`;
    logsContainer.appendChild(row);
    logsContainer.scrollTop = logsContainer.scrollHeight;
    logEntriesCount++;
    if (logCountSpan) logCountSpan.textContent = `${logEntriesCount} ENTRIES`;
  };

  const startSimulation = () => {
    if (activeSimulator) {
      activeSimulator.destroy();
      activeSimulator = null;
    }
    activeSimulator = new MiliastraSimulator(canvas, appendLog);
    activeSimulator.run(luaCode);
    if (canvas) canvas.focus();
  };

  startSimulation();

  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      appendLog('↺ Restarting simulation...', 'info');
      if (activeSimulator) activeSimulator.run(luaCode);
      if (pauseBtn) pauseBtn.textContent = '[ ❚❚ PAUSE ]';
      if (canvas) canvas.focus();
    });
  }

  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      if (!activeSimulator) return;
      if (activeSimulator.isPaused) {
        activeSimulator.resume();
        pauseBtn.textContent = '[ ❚❚ PAUSE ]';
      } else {
        activeSimulator.pause();
        pauseBtn.textContent = '[ ▶ RESUME ]';
      }
      if (canvas) canvas.focus();
    });
  }

  if (clearLogsBtn) {
    clearLogsBtn.addEventListener('click', () => {
      if (logsContainer) {
        logsContainer.innerHTML = '';
        logEntriesCount = 0;
        if (logCountSpan) logCountSpan.textContent = `0 ENTRIES`;
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      closeLuaRunnerModal();
    });
  }

  modalContainer.addEventListener('mousedown', (e) => {
    if (e.target === modalContainer) {
      closeLuaRunnerModal();
    }
  });

  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeLuaRunnerModal();
      window.removeEventListener('keydown', escHandler);
    }
  };
  window.addEventListener('keydown', escHandler);

  modalContainer._escHandler = escHandler;
}

export function closeLuaRunnerModal() {
  if (activeSimulator) {
    activeSimulator.destroy();
    activeSimulator = null;
  }

  if (modalContainer) {
    if (modalContainer._escHandler) {
      window.removeEventListener('keydown', modalContainer._escHandler);
    }
    modalContainer.remove();
    modalContainer = null;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
