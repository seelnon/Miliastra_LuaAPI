// ============================================================================
// MILIASTRA LUA SCRATCHPAD & RUNTIME SCRIPTER
// Pure Native ES Module — Zero Vite / Bundler Dependencies (No import.meta.glob)
// Features:
//   • Full-Width Editor Workspace (No left search bar or top hero header)
//   • Compact Attached Status & Metrics Footer Bar
//   • Native Floating Find Widget ([img-2]) with Match Highlighting & Navigation
//   • VSCode-Style Lua IntelliSense / Autocomplete Popup ([img-3] & [img-4])
// ============================================================================

import { copyToClipboard, showToast } from './ui-components.js';
import { highlightLua } from './syntax-highlighter.js';
import { openLuaRunnerModal } from './lua-runner-modal.js';
import { getLuaCompletionsAtCursor, renderAutocompleteListHTML } from './lua-autocomplete.js';

// In-memory cache for fetched scratchpad .lua files
const scratchpadCache = new Map();
let snippetsLoadPromise = null;

/**
 * Fetches a raw .lua file from /lua_scratchpad/ using standard Web APIs
 * (new URL(..., import.meta.url) and fetch()), working seamlessly across
 * GitHub Pages repository subpaths and root domains.
 */
export async function grabScratchpadFile(fileName) {
  const cleanName = fileName.replace(/^(\/|lua_scratchpad\/)/, '');

  if (scratchpadCache.has(cleanName)) {
    return scratchpadCache.get(cleanName);
  }

  const encodedName = encodeURIComponent(cleanName);

  const candidateUrls = Array.from(new Set([
    new URL(`../lua_scratchpad/${cleanName}`, import.meta.url).href,
    new URL(`../lua_scratchpad/${encodedName}`, import.meta.url).href,
    new URL(`./lua_scratchpad/${cleanName}`, window.location.href).href,
    new URL(`./lua_scratchpad/${encodedName}`, window.location.href).href,
    `./lua_scratchpad/${cleanName}`,
    `lua_scratchpad/${cleanName}`
  ]));

  for (const targetUrl of candidateUrls) {
    try {
      const response = await fetch(targetUrl);
      if (response.ok) {
        const text = await response.text();
        if (text && !text.trim().startsWith('<!doctype') && !text.trim().startsWith('<html')) {
          const cleanText = text.replace(/^\uFEFF/, '');
          scratchpadCache.set(cleanName, cleanText);
          return cleanText;
        }
      }
    } catch {
      // Continue to next candidate URL
    }
  }

  console.warn(`[Lua Scratchpad] Could not fetch static source for: ${fileName}`);
  return null;
}

/**
 * Curated Scratchpad Lua templates in /lua_scratchpad/
 */
export const snippetDefinitions = [
  {
    id: 'all_ui_controls_api_ref',
    name: '★ UI Control Types & API Reference',
    filename: 'lua_scratchpad/All_UI_Controls_API_Reference.lua'
  },
  {
    id: 'tween_sequence_squash_stretch',
    name: 'Tween Sequence Squash & Stretch',
    filename: 'lua_scratchpad/Tween_Sequence_Squash_Stretch.lua'
  },
  {
    id: 'color_pulse_1s',
    name: '1s Color Pulse (Pure Color API)',
    filename: 'lua_scratchpad/Color_Pulse_1s.lua'
  },
  {
    id: 'interactive_button',
    name: 'Interactive Button (Click & Key)',
    filename: 'lua_scratchpad/Interactive_Button.lua'
  },
  {
    id: 'multi_object_orbit',
    name: 'Multi-Object Orbit Simulation',
    filename: 'lua_scratchpad/Multi_Object_Orbit.lua'
  },
  {
    id: 'lifecycle_fps_hud',
    name: 'Lifecycle & Real-Time FPS HUD',
    filename: 'lua_scratchpad/Lifecycle_FPS_HUD.lua'
  },
  {
    id: 'server_signal_banner',
    name: 'Server Signal Dispatch Banner',
    filename: 'lua_scratchpad/Server_Signal_Banner.lua'
  },
  {
    id: 'image_control_demo',
    name: 'ImageControl Bounce & Velocity (Image_Control.lua)',
    filename: 'lua_scratchpad/Image_Control.lua'
  },
  {
    id: 'button_to_control_image_bounce',
    name: 'Cross-Script Button Controller (Button_toControl_Image_Bounce.lua)',
    filename: 'lua_scratchpad/Button_toControl_Image_Bounce.lua'
  }
];

export function enrichSnippet(def) {
  const cleanName = def.filename.replace(/^(\/|lua_scratchpad\/)/, '');
  const cached = scratchpadCache.get(cleanName);
  return {
    ...def,
    code: cached || `-- Loading ${def.filename}...\nfunction OnStart()\n    print("Loading ${def.filename}...")\nend`,
    _loaded: Boolean(cached)
  };
}

export const SNIPPETS = snippetDefinitions.map(enrichSnippet);

export function getScratchpadSnippets() {
  if (!snippetsLoadPromise) {
    snippetsLoadPromise = Promise.all(
      SNIPPETS.map(async (snip) => {
        const fetched = await grabScratchpadFile(snip.filename);
        if (fetched) {
          snip.code = fetched;
          snip._loaded = true;
        }
      })
    ).then(() => SNIPPETS);
  }
  return snippetsLoadPromise;
}

getScratchpadSnippets();

function escapeHtmlPlain(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const SEARCH_SVG_ICON = `<svg viewBox="0 -2 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" style="vertical-align: -2px; margin-right: 4px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

let activeScratchpadKeydownHandler = null;

export function renderScratchpad(container, initialCode = '') {
  const defaultSnippet = SNIPPETS[0];
  const defaultCode = initialCode || defaultSnippet.code;
  const initialSourceLabel = initialCode ? 'Custom Script Buffer' : defaultSnippet.filename;

  container.innerHTML = `
    <div class="scratchpad-container scratchpad-full-shell">
      <!-- COMPACT TOP TOOLBAR -->
      <div class="scratchpad-toolbar">
        <span style="font-size: 11px; font-weight: 700; color: var(--text-primary);">SNIPPETS:</span>
        <select id="snippet-select" class="brutal-btn" style="padding: 4px 8px; font-size: 11px; background: var(--bg-workspace);">
          <option value="">Select a template snippet...</option>
          ${SNIPPETS.map((s, idx) => `<option value="${idx}" ${!initialCode && idx === 0 ? 'selected' : ''}>${s.name}</option>`).join('')}
        </select>
        <button id="scratchpad-sim-btn" class="brutal-btn brutal-btn-gold" title="Launch 60FPS Miliastra Game Simulation">[ ◈ SIMULATE (60 FPS) ]</button>
        <button id="scratchpad-copy-btn" class="brutal-btn">[ COPY CODE ]</button>
        <button id="scratchpad-clear-btn" class="brutal-btn">[ CLEAR ]</button>
        <button id="scratchpad-download-btn" class="brutal-btn">[ EXPORT .LUA ]</button>
        <button id="scratchpad-find-toggle-btn" class="brutal-btn" title="Find in Script (Ctrl+F / F3)">[ ${SEARCH_SVG_ICON}FIND ]</button>
        <span class="scratchpad-source-pill" id="scratchpad-source-file">${initialSourceLabel}</span>
      </div>

      <!-- CODE EDITOR + ATTACHED FOOTER -->
      <div class="editor-frame-shell">
        <div class="editor-wrapper">
          <div class="editor-gutter" id="editor-gutter"></div>
          <div class="editor-code-container" id="editor-code-container">
            <!-- Native Find Match Highlight Backdrop -->
            <pre class="editor-find-layer" id="editor-find-layer" aria-hidden="true"></pre>
            <!-- Lua Syntax Highlight Layer -->
            <pre class="editor-highlight-layer" id="editor-highlight-layer" aria-hidden="true"><code id="editor-code-output"></code></pre>
            <!-- Interactive Textarea -->
            <textarea id="scratchpad-textarea" class="editor-interactive-textarea" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off">${defaultCode}</textarea>

            <!-- NATIVE FIND BAR ([img-2]) -->
            <div id="scratchpad-find-bar" class="sp-find-bar" style="display: none;">
              <span class="sp-find-icon-wrap">${SEARCH_SVG_ICON}</span>
              <input type="text" id="sp-find-input" class="sp-find-input" placeholder="Find..." spellcheck="false" autocomplete="off" />
              <span id="sp-find-count" class="sp-find-count">0/0</span>
              <button type="button" id="sp-find-prev" class="sp-find-nav-btn" title="Previous Match (Shift+Enter / Shift+F3)">↑</button>
              <button type="button" id="sp-find-next" class="sp-find-nav-btn" title="Next Match (Enter / F3)">↓</button>
              <button type="button" id="sp-find-close" class="sp-find-nav-btn" title="Close Find (Esc)">✕</button>
            </div>

            <!-- VSCODE-STYLE LUA AUTOCOMPLETE POPUP ([img-3] & [img-4]) -->
            <div id="sp-autocomplete-popup" class="sp-autocomplete-popup" style="display: none;"></div>
          </div>
        </div>

        <!-- COMPACT ATTACHED STATUS & METRICS FOOTER -->
        <div class="editor-status-footer">
          <div class="editor-footer-left">
            <span class="editor-footer-tag">STATUS & METRICS</span>
            <span class="editor-footer-hint">Miliastra Lua 5.1 Runtime • <code>lua_scratchpad/</code> • [Ctrl+F / F3] Find • [Ctrl+Space] Suggestions</span>
          </div>
          <div class="editor-footer-right">
            <span id="scratchpad-cursor-pos">Ln 1, Col 1</span>
            <span class="editor-footer-sep">|</span>
            <span id="scratchpad-metrics">Lines: 0 | Characters: 0</span>
          </div>
        </div>
      </div>
    </div>
  `;

  const textarea = container.querySelector('#scratchpad-textarea');
  const codeOutput = container.querySelector('#editor-code-output');
  const highlightLayer = container.querySelector('#editor-highlight-layer');
  const findLayer = container.querySelector('#editor-find-layer');
  const codeContainer = container.querySelector('#editor-code-container');
  const gutter = container.querySelector('#editor-gutter');
  const metrics = container.querySelector('#scratchpad-metrics');
  const cursorPosEl = container.querySelector('#scratchpad-cursor-pos');
  const select = container.querySelector('#snippet-select');
  const sourceFileEl = container.querySelector('#scratchpad-source-file');
  const simBtn = container.querySelector('#scratchpad-sim-btn');
  const copyBtn = container.querySelector('#scratchpad-copy-btn');
  const clearBtn = container.querySelector('#scratchpad-clear-btn');
  const downloadBtn = container.querySelector('#scratchpad-download-btn');
  const findToggleBtn = container.querySelector('#scratchpad-find-toggle-btn');

  // Native Find Widget elements
  const findBar = container.querySelector('#scratchpad-find-bar');
  const findInput = container.querySelector('#sp-find-input');
  const findCountEl = container.querySelector('#sp-find-count');
  const findPrevBtn = container.querySelector('#sp-find-prev');
  const findNextBtn = container.querySelector('#sp-find-next');
  const findCloseBtn = container.querySelector('#sp-find-close');

  // Autocomplete Popup element
  const acPopup = container.querySelector('#sp-autocomplete-popup');

  let userEdited = Boolean(initialCode);

  // Find state
  let isFindOpen = false;
  let findMatches = []; // Array of { start, end }
  let activeFindIndex = -1;

  // Autocomplete state
  let completionState = null; // { replaceStart, replaceEnd, prefix, items }
  let acSelectedIndex = 0;

  // Compute cursor Ln / Col
  const updateCursorStatus = () => {
    const pos = textarea.selectionStart || 0;
    const before = textarea.value.slice(0, pos);
    const linesBefore = before.split('\n');
    const ln = linesBefore.length;
    const col = linesBefore[linesBefore.length - 1].length + 1;
    if (cursorPosEl) {
      cursorPosEl.textContent = `Ln ${ln}, Col ${col}`;
    }
    return { ln, col, lineText: linesBefore[linesBefore.length - 1] };
  };

  // Render Find Match Highlight Layer
  const renderFindHighlights = () => {
    const query = isFindOpen ? findInput.value : '';
    if (!isFindOpen || !query) {
      findMatches = [];
      activeFindIndex = -1;
      findLayer.innerHTML = '';
      findCountEl.textContent = '0/0';
      return;
    }

    const text = textarea.value;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const qLen = query.length;

    const matches = [];
    let searchFrom = 0;
    while (searchFrom <= lowerText.length - qLen) {
      const idx = lowerText.indexOf(lowerQuery, searchFrom);
      if (idx === -1) break;
      matches.push({ start: idx, end: idx + qLen });
      searchFrom = idx + Math.max(1, qLen);
    }

    findMatches = matches;
    if (matches.length === 0) {
      activeFindIndex = -1;
      findCountEl.textContent = '0/0';
      findLayer.innerHTML = '';
      return;
    }

    if (activeFindIndex < 0 || activeFindIndex >= matches.length) {
      activeFindIndex = 0;
    }

    findCountEl.textContent = `${activeFindIndex + 1}/${matches.length}`;

    // Build backdrop HTML with <mark> around matched slices
    let html = '';
    let cursor = 0;
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      if (m.start > cursor) {
        html += escapeHtmlPlain(text.slice(cursor, m.start));
      }
      const cls = i === activeFindIndex ? 'sp-find-mark active' : 'sp-find-mark';
      html += `<mark class="${cls}">${escapeHtmlPlain(text.slice(m.start, m.end))}</mark>`;
      cursor = m.end;
    }
    if (cursor < text.length) {
      html += escapeHtmlPlain(text.slice(cursor));
    }
    if (text.endsWith('\n')) {
      html += ' ';
    }
    findLayer.innerHTML = html;
  };

  const scrollToActiveFindMatch = () => {
    if (activeFindIndex < 0 || activeFindIndex >= findMatches.length) return;
    const match = findMatches[activeFindIndex];
    const before = textarea.value.slice(0, match.start);
    const lineIndex = before.split('\n').length - 1;
    const targetScrollTop = Math.max(0, lineIndex * 20 - textarea.clientHeight * 0.35);
    textarea.scrollTop = targetScrollTop;
    syncScroll();
  };

  const stepFindMatch = (delta) => {
    if (findMatches.length === 0) return;
    activeFindIndex = (activeFindIndex + delta + findMatches.length) % findMatches.length;
    renderFindHighlights();
    scrollToActiveFindMatch();
  };

  const openFindBar = () => {
    isFindOpen = true;
    findBar.style.display = 'flex';
    // Pre-fill with selected text if short single-line selection
    const selStart = textarea.selectionStart;
    const selEnd = textarea.selectionEnd;
    if (selEnd > selStart && selEnd - selStart < 64) {
      const selectedText = textarea.value.slice(selStart, selEnd);
      if (!selectedText.includes('\n')) {
        findInput.value = selectedText;
      }
    }
    renderFindHighlights();
    if (findMatches.length > 0) {
      scrollToActiveFindMatch();
    }
    findInput.focus();
    findInput.select();
  };

  const closeFindBar = () => {
    isFindOpen = false;
    findBar.style.display = 'none';
    findLayer.innerHTML = '';
    textarea.focus();
  };

  // Autocomplete Popup management
  const closeAutocomplete = () => {
    completionState = null;
    acSelectedIndex = 0;
    acPopup.style.display = 'none';
    acPopup.innerHTML = '';
  };

  const positionAndRenderAutocomplete = () => {
    if (!completionState || !completionState.items || completionState.items.length === 0) {
      closeAutocomplete();
      return;
    }

    acPopup.innerHTML = renderAutocompleteListHTML(completionState, acSelectedIndex);
    acPopup.style.display = 'block';

    // Compute caret pixel coordinates inside .editor-code-container
    const pos = textarea.selectionStart || 0;
    const before = textarea.value.slice(0, pos);
    const lines = before.split('\n');
    const lineIdx = lines.length - 1;
    const colIdx = lines[lineIdx].length;

    const charWidth = 7.82; // 13px JetBrains Mono character width
    const lineHeight = 20;
    const padding = 12;

    const rawTop = padding + (lineIdx + 1) * lineHeight - textarea.scrollTop + 2;
    const rawLeft = padding + colIdx * charWidth - textarea.scrollLeft;

    const containerW = codeContainer.clientWidth || 600;
    const containerH = codeContainer.clientHeight || 400;
    const popupW = Math.min(380, containerW - 16);
    const popupH = Math.min(240, acPopup.scrollHeight || 200);

    const clampedLeft = Math.max(8, Math.min(rawLeft, containerW - popupW - 12));
    // Flip above line if near bottom of viewport
    const clampedTop = (rawTop + popupH > containerH - 8)
      ? Math.max(8, rawTop - lineHeight - popupH - 4)
      : Math.max(8, rawTop);

    acPopup.style.left = `${Math.round(clampedLeft)}px`;
    acPopup.style.top = `${Math.round(clampedTop)}px`;

    // Ensure selected item is visible inside the popup scroll
    const activeRow = acPopup.querySelector('.ac-item-row.active');
    if (activeRow) {
      activeRow.scrollIntoView({ block: 'nearest' });
    }
  };

  const triggerAutocompleteCheck = () => {
    if (textarea.selectionStart !== textarea.selectionEnd) {
      closeAutocomplete();
      return;
    }
    const nextState = getLuaCompletionsAtCursor(textarea.value, textarea.selectionStart);
    if (!nextState) {
      closeAutocomplete();
      return;
    }
    completionState = nextState;
    acSelectedIndex = 0;
    positionAndRenderAutocomplete();
  };

  const acceptAutocompleteSelection = (indexToAccept = acSelectedIndex) => {
    if (!completionState || !completionState.items[indexToAccept]) return false;
    const chosen = completionState.items[indexToAccept];
    const { replaceStart, replaceEnd } = completionState;
    const val = textarea.value;
    const insertStr = chosen.insertText || chosen.name;

    textarea.value = val.slice(0, replaceStart) + insertStr + val.slice(replaceEnd);
    const nextCaret = replaceStart + insertStr.length;
    textarea.selectionStart = textarea.selectionEnd = nextCaret;

    userEdited = true;
    closeAutocomplete();
    updateEditor();
    syncScroll();
    textarea.focus();
    return true;
  };

  // Mouse click on autocomplete item
  acPopup.addEventListener('mousedown', (e) => {
    const row = e.target.closest('.ac-item-row');
    if (row) {
      e.preventDefault();
      const idx = parseInt(row.dataset.acIndex, 10) || 0;
      acceptAutocompleteSelection(idx);
    }
  });

  const updateEditor = () => {
    const val = textarea.value;
    const lines = val.split('\n');
    const lineCount = lines.length;

    // Update gutter line numbers
    let gutterHtml = '';
    for (let i = 1; i <= lineCount; i++) {
      gutterHtml += `<div class="gutter-line">${i}</div>`;
    }
    gutter.innerHTML = gutterHtml;

    // Update syntax highlighting layer
    const codeToHighlight = val.endsWith('\n') ? val + ' ' : val;
    codeOutput.innerHTML = highlightLua(codeToHighlight, false);

    // Update find highlights if find bar is open
    if (isFindOpen) {
      renderFindHighlights();
    }

    // Update metrics & cursor position
    metrics.textContent = `Lines: ${lineCount} | Characters: ${val.length}`;
    updateCursorStatus();
  };

  const syncScroll = () => {
    highlightLayer.scrollTop = textarea.scrollTop;
    highlightLayer.scrollLeft = textarea.scrollLeft;
    findLayer.scrollTop = textarea.scrollTop;
    findLayer.scrollLeft = textarea.scrollLeft;
    gutter.scrollTop = textarea.scrollTop;
    if (completionState) {
      positionAndRenderAutocomplete();
    }
  };

  textarea.addEventListener('input', () => {
    userEdited = true;
    updateEditor();
    syncScroll();
    triggerAutocompleteCheck();
  });

  textarea.addEventListener('scroll', syncScroll);
  textarea.addEventListener('click', () => {
    updateCursorStatus();
    closeAutocomplete();
  });
  textarea.addEventListener('keyup', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
      updateCursorStatus();
      closeAutocomplete();
    }
  });

  // Keyboard handling for Autocomplete, Find (Ctrl+F), Ctrl+Space, and Tab indentation
  textarea.addEventListener('keydown', (e) => {
    // 1. Ctrl+F / Cmd+F -> Open Native Find Bar
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      openFindBar();
      return;
    }

    // 2. Ctrl+Space -> Force trigger Autocomplete
    if (e.ctrlKey && e.code === 'Space') {
      e.preventDefault();
      triggerAutocompleteCheck();
      return;
    }

    // 3. When Autocomplete Popup is open, handle ArrowDown / ArrowUp / Enter / Tab / Escape
    if (completionState && completionState.items && completionState.items.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        acSelectedIndex = (acSelectedIndex + 1) % completionState.items.length;
        positionAndRenderAutocomplete();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        acSelectedIndex = (acSelectedIndex - 1 + completionState.items.length) % completionState.items.length;
        positionAndRenderAutocomplete();
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        acceptAutocompleteSelection(acSelectedIndex);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeAutocomplete();
        return;
      }
    }

    // 4. Close Find bar on Escape if open
    if (e.key === 'Escape' && isFindOpen) {
      e.preventDefault();
      closeFindBar();
      return;
    }

    // 5. Standard Tab key & Shift+Tab indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      userEdited = true;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (!e.shiftKey) {
        textarea.value = textarea.value.substring(0, start) + '    ' + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      } else {
        const before = textarea.value.substring(0, start);
        const lastNewline = before.lastIndexOf('\n');
        const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
        const linePrefix = textarea.value.substring(lineStart, lineStart + 4);
        if (linePrefix === '    ') {
          textarea.value = textarea.value.substring(0, lineStart) + textarea.value.substring(lineStart + 4);
          textarea.selectionStart = Math.max(lineStart, start - 4);
          textarea.selectionEnd = Math.max(lineStart, end - 4);
        }
      }
      updateEditor();
      syncScroll();
    }
  });

  // Find Bar Events
  findToggleBtn.addEventListener('click', () => {
    if (isFindOpen) {
      closeFindBar();
    } else {
      openFindBar();
    }
  });

  findInput.addEventListener('input', () => {
    activeFindIndex = 0;
    renderFindHighlights();
    if (findMatches.length > 0) {
      scrollToActiveFindMatch();
    }
  });

  findInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      stepFindMatch(e.shiftKey ? -1 : 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeFindBar();
    }
  });

  findPrevBtn.addEventListener('click', () => stepFindMatch(-1));
  findNextBtn.addEventListener('click', () => stepFindMatch(1));
  findCloseBtn.addEventListener('click', closeFindBar);

  // Intercept Ctrl+F / Cmd+F and F3 / Shift+F3 at window capture level when Scratchpad is active
  if (activeScratchpadKeydownHandler) {
    window.removeEventListener('keydown', activeScratchpadKeydownHandler, true);
  }
  activeScratchpadKeydownHandler = (e) => {
    if (!document.body.contains(textarea)) return;
    // Do not hijack if simulator modal is open on top
    if (document.querySelector('.sim-modal-overlay.active')) return;

    const isCtrlF = (e.ctrlKey || e.metaKey) && e.key && e.key.toLowerCase() === 'f';
    const isF3 = e.key === 'F3' || e.code === 'F3';

    if (isCtrlF) {
      e.preventDefault();
      e.stopPropagation();
      openFindBar();
    } else if (isF3) {
      e.preventDefault();
      e.stopPropagation();
      if (!isFindOpen) {
        openFindBar();
      } else {
        stepFindMatch(e.shiftKey ? -1 : 1);
      }
    }
  };
  window.addEventListener('keydown', activeScratchpadKeydownHandler, true);

  // Initial update
  updateEditor();

  // Populate default snippet once static fetch finishes
  if (!initialCode && !defaultSnippet._loaded) {
    grabScratchpadFile(defaultSnippet.filename).then((fetched) => {
      if (fetched && !userEdited && document.body.contains(textarea)) {
        defaultSnippet.code = fetched;
        defaultSnippet._loaded = true;
        textarea.value = fetched;
        updateEditor();
        syncScroll();
      }
    });
  }

  select.addEventListener('change', async () => {
    const val = select.value;
    if (val !== '') {
      const idx = parseInt(val, 10);
      const selectedSnippet = SNIPPETS[idx];
      if (!selectedSnippet) return;

      if (sourceFileEl) {
        sourceFileEl.textContent = selectedSnippet.filename;
      }

      const freshCode = await grabScratchpadFile(selectedSnippet.filename);
      if (freshCode) {
        selectedSnippet.code = freshCode;
        selectedSnippet._loaded = true;
      }

      textarea.value = selectedSnippet.code;
      userEdited = false;
      closeAutocomplete();
      updateEditor();
      textarea.scrollTop = 0;
      syncScroll();
      showToast(`Loaded: ${selectedSnippet.name}`);
    }
  });

  simBtn.addEventListener('click', () => {
    const selectedIdx = select.value !== '' ? parseInt(select.value, 10) : 0;
    const currentSnippet = SNIPPETS[selectedIdx];
    const titleLabel = currentSnippet ? currentSnippet.name : 'Scratchpad Script';
    openLuaRunnerModal(textarea.value, titleLabel, () => textarea.value);
  });

  copyBtn.addEventListener('click', () => {
    copyToClipboard(textarea.value, 'Scratchpad Script');
  });

  clearBtn.addEventListener('click', () => {
    userEdited = true;
    textarea.value = '---@meta\n\nfunction OnStart()\n    local control = script.object\n    \nend\n';
    select.value = '';
    if (sourceFileEl) {
      sourceFileEl.textContent = 'Custom Script Buffer';
    }
    closeAutocomplete();
    updateEditor();
    syncScroll();
    showToast('Scratchpad Cleared');
  });

  downloadBtn.addEventListener('click', () => {
    const blob = new Blob([textarea.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'miliastra_script.lua';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Exported miliastra_script.lua');
  });
}
