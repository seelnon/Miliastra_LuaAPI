// ============================================================================
// MILIASTRA LUA SCRATCHPAD & RUNTIME SCRIPTER
// Interactive code editor with live syntax highlighting, line gutter & export
// ============================================================================

import { copyToClipboard, showToast } from './ui-components.js';
import { highlightLua } from './syntax-highlighter.js';
import { openLuaRunnerModal } from './lua-runner-modal.js';

export const SNIPPETS = [
  {
    name: "Tween Sequence Bounce",
    code: `local image = script.object
local seq = game.TweenSequence()

seq:Append(game.Tween(image, {
    anchoredPositionY = 150,
    localScaleX = 0.9,
    localScaleY = 1.1
}, 0.4):SetEase(Enum.EaseType.OutQuad))

seq:Append(game.Tween(image, {
    anchoredPositionY = 0,
    localScaleX = 1.1,
    localScaleY = 0.9
}, 0.25):SetEase(Enum.EaseType.InQuad))

seq:Append(game.Tween(image, {
    localScaleX = 1.0,
    localScaleY = 1.0
}, 0.15):SetEase(Enum.EaseType.OutBack))

seq:Play()`
  },
  {
    name: "Key Event Listener",
    code: `function OnStart()
    local button = script.object
    button:AddKeyEventListener(Enum.KeyEventType.KeyboardJumpKeyDown, function()
        print("Jump key pressed! Consuming event.")
        return true -- Mark event as handled/consumed
    end)
end`
  },
  {
    name: "Full Lifecycle Script",
    code: `function OnInit()
    print("OnInit called")
end

function OnEnable()
    print("OnEnable called")
end

function OnStart()
    print("OnStart called")
    script:EnableUpdate(true)
end

function OnUpdate(deltaTime)
    -- Called each frame with delta time in seconds
end

function OnLevelUpdate(levelDeltaTime)
    -- Pauses when level time pauses
end

function OnDisable()
    print("OnDisable called")
end

function OnDestroy()
    print("OnDestroy called")
end`
  },
  {
    name: "Custom Variable Watcher",
    code: `function OnStart()
    script:RegisterCustomVariableChangedHandler(
        Enum.CustomVariableEntityType.Level,
        "Score",
        function(entity, varName)
            local val = game.GetGlobalCustomVariableValue(entity, varName)
            print("Score changed to:", val)
        end
    )
end`
  },
  {
    name: "Server Signal Dispatch",
    code: `local signal = game.ServerSignal("STAGE_CLEAR")
signal:AddInt(100)
signal:AddString("VICTORY")
signal:SendSignal()`
  },
  {
    name: "Color & Vector Math",
    code: `local col = Color(255, 200, 100, 255)
local hex = col:ToHex()
print("Color Hex:", hex)

local width, height = game.GetUICanvasSize()
print("Canvas viewport size:", width, "x", height)`
  }
];

export function renderScratchpad(container, initialCode = '') {
  const defaultCode = initialCode || `-- Miliastra Lua Scratchpad
-- Interactive script editor with real-time syntax highlighting

function OnStart()
    local control = script.object
    print("Mounted control ID:", control.id)
    
    local width, height = game.GetUICanvasSize()
    print("Canvas viewport:", width, "x", height)
end`;

  container.innerHTML = `
    <div class="scratchpad-container">
      <div class="doc-hero" style="margin-bottom: 0;">
        <div class="doc-hero-top">
          <span class="doc-tag">INTERACTIVE SCRATCHPAD</span>
          <span class="doc-source-file">Client Script Workspace</span>
        </div>
        <div class="doc-title">Lua Code Editor</div>
        <div class="doc-subtitle">Draft, inspect, and export scripts with instant template injection and syntax highlighting.</div>
      </div>

      <div class="scratchpad-toolbar">
        <span style="font-size: 11px; font-weight: 700; color: var(--text-primary);">SNIPPETS:</span>
        <select id="snippet-select" class="brutal-btn" style="padding: 4px 8px; font-size: 11px; background: var(--bg-workspace);">
          <option value="">Select a template snippet...</option>
          ${SNIPPETS.map((s, idx) => `<option value="${idx}">${s.name}</option>`).join('')}
        </select>
        <button id="scratchpad-sim-btn" class="brutal-btn brutal-btn-gold" title="Launch 60FPS Miliastra Game Simulation">[ ◈ SIMULATE (60 FPS) ]</button>
        <button id="scratchpad-copy-btn" class="brutal-btn">[ COPY CODE ]</button>
        <button id="scratchpad-clear-btn" class="brutal-btn">[ CLEAR ]</button>
        <button id="scratchpad-download-btn" class="brutal-btn">[ EXPORT .LUA ]</button>
      </div>

      <div class="editor-wrapper">
        <div class="editor-gutter" id="editor-gutter"></div>
        <div class="editor-code-container" id="editor-code-container">
          <pre class="editor-highlight-layer" id="editor-highlight-layer" aria-hidden="true"><code id="editor-code-output"></code></pre>
          <textarea id="scratchpad-textarea" class="editor-interactive-textarea" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off">${defaultCode}</textarea>
        </div>
      </div>

      <div class="scratchpad-output">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px; font-weight: 700; color: var(--text-primary); border-bottom: 1px solid var(--border-gold); padding-bottom: 4px;">
          <span>STATUS & METRICS</span>
          <span id="scratchpad-metrics">Lines: 0 | Chars: 0</span>
        </div>
        <div style="font-size: 11.5px; color: var(--text-muted);">
          Compatible with Miliastra Lua 5.1 runtime. Press [Tab] to indent 4 spaces.
        </div>
      </div>
    </div>
  `;

  const textarea = container.querySelector('#scratchpad-textarea');
  const codeOutput = container.querySelector('#editor-code-output');
  const highlightLayer = container.querySelector('#editor-highlight-layer');
  const gutter = container.querySelector('#editor-gutter');
  const metrics = container.querySelector('#scratchpad-metrics');
  const select = container.querySelector('#snippet-select');
  const wasmBtn = container.querySelector('#scratchpad-wasm-btn');
  const simBtn = container.querySelector('#scratchpad-sim-btn');
  const copyBtn = container.querySelector('#scratchpad-copy-btn');
  const clearBtn = container.querySelector('#scratchpad-clear-btn');
  const downloadBtn = container.querySelector('#scratchpad-download-btn');

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
    // We add a trailing space or newline if ending with newline so height matches
    const codeToHighlight = val.endsWith('\n') ? val + ' ' : val;
    codeOutput.innerHTML = highlightLua(codeToHighlight, false);

    // Update metrics
    metrics.textContent = `Lines: ${lineCount} | Characters: ${val.length}`;
  };

  const syncScroll = () => {
    highlightLayer.scrollTop = textarea.scrollTop;
    highlightLayer.scrollLeft = textarea.scrollLeft;
    gutter.scrollTop = textarea.scrollTop;
  };

  textarea.addEventListener('input', () => {
    updateEditor();
    syncScroll();
  });

  textarea.addEventListener('scroll', syncScroll);

  // Tab key & auto-indent support
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (!e.shiftKey) {
        // Insert 4 spaces
        textarea.value = textarea.value.substring(0, start) + '    ' + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      } else {
        // Shift+Tab unindent
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

  // Initial update
  updateEditor();

  select.addEventListener('change', () => {
    const val = select.value;
    if (val !== '') {
      textarea.value = SNIPPETS[parseInt(val)].code;
      updateEditor();
      syncScroll();
      showToast(`[ Injected Template: ${SNIPPETS[parseInt(val)].name} ]`);
    }
  });

  if (simBtn) {
    simBtn.addEventListener('click', () => {
      const code = textarea.value;
      if (!code || code.trim() === '') {
        showToast('[ Error: Scratchpad is empty ]');
        return;
      }
      openLuaRunnerModal(code, 'Scratchpad Simulation (60 FPS)');
    });
  }

  copyBtn.addEventListener('click', () => {
    copyToClipboard(textarea.value, 'Code');
  });

  clearBtn.addEventListener('click', () => {
    textarea.value = '';
    updateEditor();
    syncScroll();
  });

  downloadBtn.addEventListener('click', () => {
    const blob = new Blob([textarea.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'miliastra_script.lua';
    a.click();
    URL.revokeObjectURL(a);
    showToast('[ Exported miliastra_script.lua ]');
  });
}
