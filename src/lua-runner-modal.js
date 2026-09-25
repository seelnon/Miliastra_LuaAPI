// ============================================================================
// MILIASTRA LUA RUNNER & GAME SIMULATOR MODAL
// Dynamic Scalable 60FPS Virtual Game Engine Simulation
// Features: Undockable/Floating Window, Dynamic Viewport Scaling,
//           Resolution Presets, Manual Custom Dimensions & Live Code Reload
// ============================================================================

import { MiliastraSimulator } from './lua-runtime.js';

let activeSimulator = null;
let modalContainer = null;
let resizeObserver = null;

const RESOLUTION_PRESETS = [
  { id: '960x640', width: 960, height: 640, label: '960 × 640 (Default 3:2)' },
  { id: '960x720', width: 960, height: 720, label: '960 × 720 (4:3 Classic)' },
  { id: '960x960', width: 960, height: 960, label: '960 × 960 (1:1 High View)' },
  { id: '960x1200', width: 960, height: 1200, label: '960 × 1200 (4:5 Taller)' },
  { id: '1280x720', width: 1280, height: 720, label: '1280 × 720 (16:9 HD)' },
  { id: '1280x960', width: 1280, height: 960, label: '1280 × 960 (4:3 HD Tall)' },
  { id: '1600x900', width: 1600, height: 900, label: '1600 × 900 (16:9+ HD)' },
  { id: '1920x1080', width: 1920, height: 1080, label: '1920 × 1080 (16:9 FHD)' },
  { id: '1080x1080', width: 1080, height: 1080, label: '1080 × 1080 (1:1 FHD Square)' },
  { id: '720x1280', width: 720, height: 1280, label: '720 × 1280 (9:16 Mobile)' },
  { id: '1080x1920', width: 1080, height: 1920, label: '1080 × 1920 (9:16 Mobile Tall)' },
  { id: 'dynamic', width: 0, height: 0, label: '⚡ Dynamic (Fit Window Size)' },
  { id: 'custom', width: 0, height: 0, label: '✏️ Custom Dimensions...' }
];

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

function getAspectRatioString(w, h) {
  if (!w || !h) return '—';
  const divisor = gcd(w, h);
  const rw = Math.round(w / divisor);
  const rh = Math.round(h / divisor);
  if (rw <= 32 && rh <= 32) {
    return `${rw}:${rh}`;
  }
  return `${(w / h).toFixed(2)}:1`;
}

export function openLuaRunnerModal(luaCode, scriptTitle = 'Miliastra Lua Simulation', getLatestCodeFn = null) {
  closeLuaRunnerModal();

  let currentCode = luaCode;
  let simWidth = 960;
  let simHeight = 640;
  let isMaximized = false;
  let isScaleFit = true;
  let isConsoleCollapsed = false;
  let activePresetId = '960x640';
  let isToolbarOpen = false;

  // Retrieve undocked persistence state
  const shouldStartUndocked = localStorage.getItem('miliastra_sim_undocked') === 'true';
  let isUndocked = shouldStartUndocked;

  modalContainer = document.createElement('div');
  modalContainer.className = `sim-modal-backdrop${isUndocked ? ' undocked' : ''}`;
  modalContainer.innerHTML = `
    <div class="sim-modal-window${isUndocked ? ' undocked' : ''}" id="sim-window">
      <!-- Window Titlebar -->
      <div class="sim-modal-header" id="sim-header">
        <div class="sim-header-left">
          <span class="sim-status-dot"></span>
          <span class="sim-title">[ MILIASTRA SIMULATION ] ${escapeHtml(scriptTitle)}</span>
        </div>
        <div class="sim-header-controls">
          <button class="brutal-btn sim-settings-btn" id="sim-settings-btn" title="Toggle Viewport & Resolution Settings">⚙</button>
          <button class="brutal-btn sim-restart-btn" id="sim-restart-btn" title="Re-run Simulation with latest code (↺)">⟲</button>
          <button class="brutal-btn sim-pause-btn" id="sim-pause-btn" title="Pause / Resume Simulation">❚❚</button>
          <button class="brutal-btn sim-undock-btn" id="sim-undock-btn" title="${isUndocked ? 'Dock window' : 'Undock into floating resizable window'}">${isUndocked ? '🗖' : '🗗'}</button>
          <button class="brutal-btn sim-maximize-btn" id="sim-maximize-btn" title="Fullscreen / Maximize">⛶</button>
          <button class="brutal-btn brutal-btn-danger sim-close-btn" id="sim-close-btn" title="Close Simulation (Esc)">✕</button>
        </div>
      </div>

      <!-- Collapsible Viewport Toolbar: Resolution & Scaling Controls -->
      <div class="sim-viewport-toolbar" id="sim-viewport-toolbar">
        <div class="sim-tool-group">
          <span class="sim-tool-label">VIEWPORT:</span>
          <select class="sim-select" id="sim-res-select">
            ${RESOLUTION_PRESETS.map(p => `
              <option value="${p.id}" ${p.id === activePresetId ? 'selected' : ''}>${p.label}</option>
            `).join('')}
          </select>
        </div>

        <div class="sim-tool-group">
          <span class="sim-tool-label">W:</span>
          <input type="number" id="sim-input-w" class="sim-num-input" value="${simWidth}" min="200" max="3840" step="10" title="Custom Viewport Width (200-3840px)">
          <span class="sim-dim-x">×</span>
          <span class="sim-tool-label">H:</span>
          <input type="number" id="sim-input-h" class="sim-num-input" value="${simHeight}" min="200" max="2160" step="10" title="Custom Viewport Height (200-2160px)">
          <button class="brutal-btn sim-apply-res-btn" title="Apply Custom Resolution" style="padding: 2px 8px; font-size: 11px;">APPLY</button>
          <button class="brutal-btn sim-swap-res-btn" title="Swap Width & Height (Landscape ⇄ Portrait)" style="padding: 2px 6px; font-size: 11px;">⇄</button>
        </div>

        <div class="sim-separator">|</div>

        <div class="sim-tool-group">
          <button class="brutal-btn sim-scale-mode-btn" title="Toggle Scale: Fit to Window (letterboxed) vs Native 1:1" style="padding: 2px 8px; font-size: 11px;">MODE: FIT</button>
          <button class="brutal-btn sim-toggle-logs-btn" title="Toggle Logs Drawer" style="padding: 2px 8px; font-size: 11px;">☰ LOGS</button>
          <button class="brutal-btn sim-clear-logs-btn" title="Clear Console Logs" style="padding: 2px 8px; font-size: 11px;">CLEAR LOGS</button>
        </div>
      </div>

      <!-- Main Canvas Viewport Area (Clean without overlay help notes) -->
      <div class="sim-viewport-body">
        <div class="sim-canvas-wrapper" id="sim-canvas-panel">
          <canvas id="miliastra-sim-canvas" class="mode-fit" width="${simWidth}" height="${simHeight}" tabindex="0"></canvas>
        </div>

        <!-- Right Interactive Console Drawer -->
        <div class="sim-console-drawer" id="sim-console-drawer">
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
          <span>Viewport: <strong id="sim-res-indicator">${simWidth} × ${simHeight}</strong> (<span id="sim-aspect-indicator">${getAspectRatioString(simWidth, simHeight)}</span>)</span>
          <span class="sim-separator">|</span>
          <span>Scale: <strong id="sim-scale-indicator">Fit to Window</strong></span>
          <span class="sim-separator">|</span>
          <span id="sim-dock-indicator">${isUndocked ? 'Floating / Undocked' : 'Docked'}</span>
        </div>
        <div class="sim-footer-right">
          <span id="sim-fps-indicator">FPS: 60</span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalContainer);

  const windowEl = document.getElementById('sim-window');
  const headerEl = document.getElementById('sim-header');
  const canvas = document.getElementById('miliastra-sim-canvas');
  const canvasPanel = document.getElementById('sim-canvas-panel');
  const consoleDrawer = document.getElementById('sim-console-drawer');
  const viewportToolbar = document.getElementById('sim-viewport-toolbar');

  const settingsBtn = document.getElementById('sim-settings-btn');
  const undockBtn = document.getElementById('sim-undock-btn');
  const maximizeBtn = document.getElementById('sim-maximize-btn');
  const pauseBtn = document.getElementById('sim-pause-btn');
  const restartBtn = document.getElementById('sim-restart-btn');
  const clearLogsBtn = modalContainer.querySelector('.sim-clear-logs-btn');
  const closeBtn = document.getElementById('sim-close-btn');

  const resSelect = document.getElementById('sim-res-select');
  const inputW = document.getElementById('sim-input-w');
  const inputH = document.getElementById('sim-input-h');
  const applyResBtn = modalContainer.querySelector('.sim-apply-res-btn');
  const swapResBtn = modalContainer.querySelector('.sim-swap-res-btn');
  const scaleModeBtn = modalContainer.querySelector('.sim-scale-mode-btn');
  const toggleLogsBtn = modalContainer.querySelector('.sim-toggle-logs-btn');

  const resIndicator = document.getElementById('sim-res-indicator');
  const aspectIndicator = document.getElementById('sim-aspect-indicator');
  const scaleIndicator = document.getElementById('sim-scale-indicator');
  const dockIndicator = document.getElementById('sim-dock-indicator');
  const fpsIndicator = document.getElementById('sim-fps-indicator');

  const logsContainer = document.getElementById('sim-console-logs');
  const logCountSpan = modalContainer.querySelector('.sim-log-count');
  let logEntriesCount = 1;

  // Center window if started undocked
  if (isUndocked) {
    headerEl.classList.add('draggable');
    const targetW = Math.min(window.innerWidth - 60, 1020);
    const targetH = Math.min(window.innerHeight - 60, 720);
    const left = Math.max(20, Math.floor((window.innerWidth - targetW) / 2));
    const top = Math.max(20, Math.floor((window.innerHeight - targetH) / 2));
    windowEl.style.width = `${targetW}px`;
    windowEl.style.height = `${targetH}px`;
    windowEl.style.left = `${left}px`;
    windowEl.style.top = `${top}px`;
    windowEl.style.right = 'auto';
  }

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

  const updateStatusDisplay = () => {
    if (resIndicator) resIndicator.textContent = `${simWidth} × ${simHeight}`;
    if (aspectIndicator) aspectIndicator.textContent = getAspectRatioString(simWidth, simHeight);
    if (inputW) inputW.value = simWidth;
    if (inputH) inputH.value = simHeight;
    if (scaleIndicator) scaleIndicator.textContent = isScaleFit ? 'Fit to Window' : '1:1 Native';
    if (dockIndicator) {
      if (isMaximized) dockIndicator.textContent = 'Fullscreen';
      else if (isUndocked) dockIndicator.textContent = 'Floating / Undocked';
      else dockIndicator.textContent = 'Docked';
    }
  };

  const applyResolution = (w, h, presetId = null) => {
    const clampedW = Math.max(200, Math.min(3840, Math.round(Number(w) || 960)));
    const clampedH = Math.max(200, Math.min(2160, Math.round(Number(h) || 640)));
    simWidth = clampedW;
    simHeight = clampedH;

    if (presetId) {
      activePresetId = presetId;
      if (resSelect) resSelect.value = presetId;
    } else {
      const match = RESOLUTION_PRESETS.find(p => p.width === simWidth && p.height === simHeight);
      activePresetId = match ? match.id : 'custom';
      if (resSelect) resSelect.value = activePresetId;
    }

    if (activeSimulator) {
      activeSimulator.setResolution(simWidth, simHeight);
    } else {
      canvas.width = simWidth;
      canvas.height = simHeight;
      canvas.style.aspectRatio = `${simWidth} / ${simHeight}`;
    }

    updateStatusDisplay();
  };

  // FPS monitor hook
  let fpsInterval = setInterval(() => {
    if (activeSimulator && fpsIndicator) {
      fpsIndicator.textContent = `FPS: ${activeSimulator.fps || 60}`;
    }
  }, 500);

  const startSimulation = (codeToRun = currentCode) => {
    if (activeSimulator) {
      activeSimulator.destroy();
      activeSimulator = null;
    }
    activeSimulator = new MiliastraSimulator(canvas, appendLog, simWidth, simHeight);
    activeSimulator.run(codeToRun);
    updateStatusDisplay();
    if (canvas) canvas.focus();
  };

  startSimulation();

  // Helper to fetch latest live code from editor
  const fetchLiveCode = () => {
    if (typeof getLatestCodeFn === 'function') {
      const live = getLatestCodeFn();
      if (live && live.trim()) return live;
    }
    const scratchpad = document.getElementById('scratchpad-textarea');
    if (scratchpad && scratchpad.value && scratchpad.value.trim()) {
      return scratchpad.value;
    }
    return currentCode;
  };

  // --- Toggle Settings Toolbar ---
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      isToolbarOpen = !isToolbarOpen;
      if (viewportToolbar) {
        viewportToolbar.classList.toggle('open', isToolbarOpen);
      }
      settingsBtn.classList.toggle('active', isToolbarOpen);
    });
  }

  // --- Resolution Selection ---
  if (resSelect) {
    resSelect.addEventListener('change', () => {
      const val = resSelect.value;
      if (val === 'dynamic') {
        activePresetId = 'dynamic';
        syncDynamicViewport();
      } else if (val === 'custom') {
        activePresetId = 'custom';
        inputW.focus();
      } else {
        const p = RESOLUTION_PRESETS.find(item => item.id === val);
        if (p) {
          applyResolution(p.width, p.height, p.id);
        }
      }
    });
  }

  // --- Manual Resolution Inputs ---
  if (applyResBtn) {
    applyResBtn.addEventListener('click', () => {
      const w = parseInt(inputW.value, 10);
      const h = parseInt(inputH.value, 10);
      applyResolution(w, h, 'custom');
      appendLog(`Custom resolution applied: ${simWidth} × ${simHeight}`, 'info');
    });
  }

  [inputW, inputH].forEach(input => {
    if (!input) return;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const w = parseInt(inputW.value, 10);
        const h = parseInt(inputH.value, 10);
        applyResolution(w, h, 'custom');
        appendLog(`Custom resolution applied: ${simWidth} × ${simHeight}`, 'info');
      }
    });
  });

  // --- Swap W & H ---
  if (swapResBtn) {
    swapResBtn.addEventListener('click', () => {
      const prevW = simWidth;
      const prevH = simHeight;
      applyResolution(prevH, prevW);
      appendLog(`Swapped dimensions: ${simWidth} × ${simHeight}`, 'info');
    });
  }

  // --- Scale Mode Toggle (Fit vs Native 1:1) ---
  const setScaleMode = (fit) => {
    isScaleFit = fit;
    if (isScaleFit) {
      canvas.className = 'mode-fit';
      if (canvasPanel) canvasPanel.classList.remove('allow-scroll');
      if (scaleModeBtn) scaleModeBtn.textContent = 'MODE: FIT';
    } else {
      canvas.className = 'mode-native';
      if (canvasPanel) canvasPanel.classList.add('allow-scroll');
      if (scaleModeBtn) scaleModeBtn.textContent = 'MODE: 1:1';
    }
    updateStatusDisplay();
  };

  if (scaleModeBtn) {
    scaleModeBtn.addEventListener('click', () => {
      setScaleMode(!isScaleFit);
      appendLog(`Display scale mode set to: ${isScaleFit ? 'Fit to Window' : '1:1 Native'}`, 'info');
    });
  }

  // --- Toggle Logs Drawer ---
  if (toggleLogsBtn) {
    toggleLogsBtn.addEventListener('click', () => {
      isConsoleCollapsed = !isConsoleCollapsed;
      if (consoleDrawer) {
        consoleDrawer.classList.toggle('collapsed', isConsoleCollapsed);
      }
      toggleLogsBtn.textContent = isConsoleCollapsed ? '☰ LOGS: OFF' : '☰ LOGS';
    });
  }

  // --- Dynamic Viewport Sync ---
  const syncDynamicViewport = () => {
    if (!canvasPanel) return;
    const rect = canvasPanel.getBoundingClientRect();
    const availableW = Math.max(200, Math.floor(rect.width - 24));
    const availableH = Math.max(200, Math.floor(rect.height - 24));
    applyResolution(availableW, availableH, 'dynamic');
  };

  if (window.ResizeObserver && canvasPanel) {
    resizeObserver = new ResizeObserver(() => {
      if (activePresetId === 'dynamic') {
        syncDynamicViewport();
      }
    });
    resizeObserver.observe(canvasPanel);
  }

  // --- Undock / Dock Floating Window with Persistence ---
  const setUndocked = (undocked, center = false) => {
    isUndocked = undocked;
    localStorage.setItem('miliastra_sim_undocked', isUndocked ? 'true' : 'false');

    if (isUndocked) {
      modalContainer.classList.add('undocked');
      windowEl.classList.add('undocked');
      headerEl.classList.add('draggable');
      if (undockBtn) {
        undockBtn.textContent = '🗖';
        undockBtn.title = 'Dock window to center modal';
      }

      if (center) {
        const targetW = Math.min(window.innerWidth - 60, 1020);
        const targetH = Math.min(window.innerHeight - 60, 720);
        const left = Math.max(20, Math.floor((window.innerWidth - targetW) / 2));
        const top = Math.max(20, Math.floor((window.innerHeight - targetH) / 2));
        windowEl.style.width = `${targetW}px`;
        windowEl.style.height = `${targetH}px`;
        windowEl.style.left = `${left}px`;
        windowEl.style.top = `${top}px`;
        windowEl.style.right = 'auto';
      }
      appendLog('Simulation window undocked into floating resizable mode.', 'info');
    } else {
      modalContainer.classList.remove('undocked');
      windowEl.classList.remove('undocked');
      headerEl.classList.remove('draggable');
      windowEl.style.top = '';
      windowEl.style.left = '';
      windowEl.style.right = '';
      windowEl.style.width = '';
      windowEl.style.height = '';
      if (undockBtn) {
        undockBtn.textContent = '🗗';
        undockBtn.title = 'Undock into floating resizable window';
      }
      appendLog('Simulation window docked.', 'info');
    }
    updateStatusDisplay();
  };

  if (undockBtn) {
    undockBtn.addEventListener('click', () => {
      if (isMaximized) setMaximized(false);
      setUndocked(!isUndocked, true);
    });
  }

  // --- Maximize / Fullscreen ---
  const setMaximized = (maximized) => {
    isMaximized = maximized;
    if (isMaximized) {
      windowEl.classList.add('maximized');
      if (maximizeBtn) {
        maximizeBtn.textContent = '❐';
        maximizeBtn.title = 'Restore Window Size';
      }
    } else {
      windowEl.classList.remove('maximized');
      if (maximizeBtn) {
        maximizeBtn.textContent = '⛶';
        maximizeBtn.title = 'Fullscreen / Maximize';
      }
    }
    updateStatusDisplay();
  };

  if (maximizeBtn) {
    maximizeBtn.addEventListener('click', () => {
      setMaximized(!isMaximized);
    });
  }

  // --- Draggable Header Handling (when undocked) ---
  let isDraggingHeader = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let winStartX = 0;
  let winStartY = 0;

  headerEl.addEventListener('mousedown', (e) => {
    if (!isUndocked || isMaximized) return;
    if (e.target.closest('button, select, input, a')) return;

    isDraggingHeader = true;
    headerEl.classList.add('dragging');
    const rect = windowEl.getBoundingClientRect();
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    winStartX = rect.left;
    winStartY = rect.top;

    const onMouseMove = (moveEvent) => {
      if (!isDraggingHeader) return;
      const dx = moveEvent.clientX - dragStartX;
      const dy = moveEvent.clientY - dragStartY;
      windowEl.style.left = `${Math.max(0, winStartX + dx)}px`;
      windowEl.style.top = `${Math.max(0, winStartY + dy)}px`;
      windowEl.style.right = 'auto';
    };

    const onMouseUp = () => {
      isDraggingHeader = false;
      headerEl.classList.remove('dragging');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });

  // --- Re-run Simulation with live latest code ---
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      const latestCode = fetchLiveCode();
      currentCode = latestCode;
      appendLog('↺ Re-running simulation with latest code from editor...', 'info');
      startSimulation(currentCode);
      if (pauseBtn) pauseBtn.textContent = '❚❚';
      if (canvas) canvas.focus();
    });
  }

  // --- Pause / Resume Simulation ---
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      if (!activeSimulator) return;
      if (activeSimulator.isPaused) {
        activeSimulator.resume();
        pauseBtn.textContent = '❚❚';
        pauseBtn.title = 'Pause Simulation';
      } else {
        activeSimulator.pause();
        pauseBtn.textContent = '▶';
        pauseBtn.title = 'Resume Simulation';
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

  // Click outside to close (only if docked)
  modalContainer.addEventListener('mousedown', (e) => {
    if (!isUndocked && e.target === modalContainer) {
      closeLuaRunnerModal();
    }
  });

  const escHandler = (e) => {
    if (e.key === 'Escape') {
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        document.activeElement.blur();
        return;
      }
      closeLuaRunnerModal();
    }
  };
  window.addEventListener('keydown', escHandler);

  modalContainer._escHandler = escHandler;
  modalContainer._fpsInterval = fpsInterval;
}

export function closeLuaRunnerModal() {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }

  if (activeSimulator) {
    activeSimulator.destroy();
    activeSimulator = null;
  }

  if (modalContainer) {
    if (modalContainer._escHandler) {
      window.removeEventListener('keydown', modalContainer._escHandler);
    }
    if (modalContainer._fpsInterval) {
      clearInterval(modalContainer._fpsInterval);
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
