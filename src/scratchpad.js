// ============================================================================
// MILIASTRA LUA SCRATCHPAD & RUNTIME SCRIPTER
// Interactive code editor with live syntax highlighting, line gutter & export
// ============================================================================

import { copyToClipboard, showToast } from './ui-components.js';
import { highlightLua } from './syntax-highlighter.js';
import { openLuaRunnerModal } from './lua-runner-modal.js';

export const SNIPPETS = [
  {
    name: "Tween Sequence Squash & Stretch",
    code: `-- Template IDs:
local IMAGE_TEMPLATE = 1073741850
local CIRCLE_ASSET = 100002

function OnStart()
    local root = script.object
    local width, height = game.GetUICanvasSize()

    -- 1. Instantiate test ImageControl at viewport center
    local image = game.InstantiateClientUIControl(IMAGE_TEMPLATE, root)
    image.name = "BouncingOrb"
    image:SetAnchorMin(0.5, 0.5)
    image:SetAnchorMax(0.5, 0.5)
    image:SetPivot(0.5, 0.5)
    image:SetAnchoredPosition(0, -50)
    image:SetSizeDelta(120, 120)
    image:SetImage(Enum.ImageSource.StaticReference, CIRCLE_ASSET)
    image.imageColor = Color(220, 180, 85, 255)

    print("Instantiated", image.name, "ID:", image.id)

    -- 2. Build continuous squash-and-stretch bounce sequence
    local seq = game.TweenSequence()
    seq:Append(game.Tween(image, {
        anchoredPositionY = 150,
        localScaleX = 0.85,
        localScaleY = 1.25
    }, 0.45):SetEase(Enum.EaseType.OutQuad))

    seq:Append(game.Tween(image, {
        anchoredPositionY = -50,
        localScaleX = 1.35,
        localScaleY = 0.65
    }, 0.35):SetEase(Enum.EaseType.InQuad))

    seq:Append(game.Tween(image, {
        localScaleX = 1.0,
        localScaleY = 1.0
    }, 0.18):SetEase(Enum.EaseType.OutBack))

    seq:SetLoops(-1) -- Repeat infinitely
    seq:Play()
    print("Bounce sequence playing at 60 FPS.")
end`
  },
  {
    name: "1s Color Pulse (Pure Color API)",
    code: `-- Template IDs:
local IMAGE_TEMPLATE = 1073741850
local TEXTBOX_TEMPLATE = 1073741849
local CIRCLE_ASSET = 100002

local orb = nil
local label = nil
local timer = 0

local function GetRandomColor()
    local r = math.random(60, 255)
    local g = math.random(60, 255)
    local b = math.random(60, 255)
    return Color.FromRGBA(r, g, b, 255)
end

function OnStart()
    local root = script.object
    local width, height = game.GetUICanvasSize()
    math.randomseed(os.time())

    -- 1. Instantiate glowing color orb
    orb = game.InstantiateClientUIControl(IMAGE_TEMPLATE, root)
    orb.name = "ColorPulseOrb"
    orb:SetAnchorMin(0.5, 0.5)
    orb:SetAnchorMax(0.5, 0.5)
    orb:SetPivot(0.5, 0.5)
    orb:SetAnchoredPosition(0, 40)
    orb:SetSizeDelta(140, 140)
    orb:SetImage(Enum.ImageSource.StaticReference, CIRCLE_ASSET)

    -- 2. Instantiate descriptive text HUD
    label = game.InstantiateClientUIControl(TEXTBOX_TEMPLATE, root)
    label.name = "ColorHUD"
    label:SetAnchorMin(0.5, 0.5)
    label:SetAnchorMax(0.5, 0.5)
    label:SetPivot(0.5, 0.5)
    label:SetAnchoredPosition(0, -70)
    label:SetSizeDelta(460, 50)
    label.fontSize = 17
    label.fontColor = Color.FromRGB(238, 217, 171)

    -- Set initial color using standard Miliastra Color.FromRGB
    local initCol = Color.FromRGB(201, 160, 89)
    orb.imageColor = initCol
    local r, g, b, a = Color.ToRGBA(initCol)
    label.text = string.format("COLOR: RGBA(%d, %d, %d, %d)", r, g, b, a)
    print(string.format("[Init] Color set to RGBA(%d, %d, %d, %d)", r, g, b, a))

    script:EnableUpdate(true)
end

function OnUpdate(deltaTime)
    timer = timer + deltaTime
    if timer >= 1.0 then
        timer = timer - 1.0
        local nextCol = GetRandomColor()
        orb.imageColor = nextCol
        
        local r, g, b, a = Color.ToRGBA(nextCol)
        label.text = string.format("COLOR: RGBA(%d, %d, %d, %d)", r, g, b, a)
        print(string.format("[1s Color Pulse] New Color -> RGBA(%d, %d, %d, %d)", r, g, b, a))

        -- Punch scale on color shift
        game.Tween(orb, { localScaleX = 1.15, localScaleY = 1.15 }, 0.1)
            :SetEase(Enum.EaseType.OutQuad)
            :SetOnComplete(function()
                game.Tween(orb, { localScaleX = 1.0, localScaleY = 1.0 }, 0.2)
                    :SetEase(Enum.EaseType.OutBack)
            end)
    end
end`
  },
  {
    name: "Interactive Button (Click & Key)",
    code: `-- Template IDs:
local PRESET_BUTTON_TEMPLATE = 1073741851
local TEXTBOX_TEMPLATE = 1073741849

function OnStart()
    local root = script.object

    -- 1. Instantiate interactive button
    local btn = game.InstantiateClientUIControl(PRESET_BUTTON_TEMPLATE, root)
    btn.name = "TestButton"
    btn:SetAnchorMin(0.5, 0.5)
    btn:SetAnchorMax(0.5, 0.5)
    btn:SetPivot(0.5, 0.5)
    btn:SetAnchoredPosition(0, 0)
    btn:SetSizeDelta(280, 68)
    btn.imageColor = Color(52, 42, 30, 255)
    btn.interactable = true
    btn.raycastTarget = true

    -- 2. Button Label
    local label = game.InstantiateClientUIControl(TEXTBOX_TEMPLATE, btn)
    label:SetAnchorMin(0.5, 0.5)
    label:SetAnchorMax(0.5, 0.5)
    label:SetPivot(0.5, 0.5)
    label:SetAnchoredPosition(0, 0)
    label:SetSizeDelta(280, 68)
    label.fontSize = 15
    label.fontColor = Color(238, 217, 171, 255)
    label.text = "CLICK ME OR PRESS SPACE"

    local clicks = 0
    local function HandleAction(source)
        clicks = clicks + 1
        label.text = "ACTIVATED x" .. clicks .. " (" .. source .. ")"
        print("[Interaction]", source, "count:", clicks)

        -- Punch button scale
        game.Tween(btn, { localScaleX = 1.15, localScaleY = 1.15 }, 0.08)
            :SetEase(Enum.EaseType.OutQuad)
            :SetOnComplete(function()
                game.Tween(btn, { localScaleX = 1.0, localScaleY = 1.0 }, 0.15)
                    :SetEase(Enum.EaseType.OutBack)
            end)
    end

    btn:AddCursorEventListener(Enum.CursorEventType.CursorClick, function(eventData)
        HandleAction("Mouse Click")
    end)

    btn:AddKeyEventListener(Enum.KeyEventType.KeyboardJumpKeyDown, function()
        HandleAction("Space Key")
        return true
    end)

    print("Interactive button ready. Click or hit [Space]!")
end`
  },
  {
    name: "Multi-Object Orbit Simulation",
    code: `-- Template IDs:
local IMAGE_TEMPLATE = 1073741850
local CIRCLE_ASSET = 100002

local satellites = {}
local currentAngle = 0

function OnStart()
    local root = script.object

    -- Center Star
    local star = game.InstantiateClientUIControl(IMAGE_TEMPLATE, root)
    star:SetAnchorMin(0.5, 0.5)
    star:SetAnchorMax(0.5, 0.5)
    star:SetPivot(0.5, 0.5)
    star:SetAnchoredPosition(0, 0)
    star:SetSizeDelta(84, 84)
    star:SetImage(Enum.ImageSource.StaticReference, CIRCLE_ASSET)
    star.imageColor = Color(230, 185, 75, 255)

    -- 4 Orbiting Satellites
    for i = 1, 4 do
        local sat = game.InstantiateClientUIControl(IMAGE_TEMPLATE, root)
        sat:SetAnchorMin(0.5, 0.5)
        sat:SetAnchorMax(0.5, 0.5)
        sat:SetPivot(0.5, 0.5)
        sat:SetSizeDelta(32, 32)
        sat:SetImage(Enum.ImageSource.StaticReference, CIRCLE_ASSET)
        sat.imageColor = Color(120 + i * 30, 80 + i * 35, 210, 255)
        table.insert(satellites, sat)
    end

    print("Orbit simulation instantiated with 4 satellites.")
    script:EnableUpdate(true)
end

function OnUpdate(dt)
    currentAngle = currentAngle + dt * 2.5
    local radius = 140
    for i, sat in ipairs(satellites) do
        local offset = currentAngle + (i - 1) * (math.pi * 0.5)
        local px = math.cos(offset) * radius
        local py = math.sin(offset) * radius
        sat:SetAnchoredPosition(px, py)
    end
end`
  },
  {
    name: "Lifecycle & Real-Time FPS HUD",
    code: `local TEXTBOX_TEMPLATE = 1073741849
local totalTime = 0
local frameCount = 0
local hud = nil

function OnInit()
    print("[Lifecycle] OnInit executed")
end

function OnEnable()
    print("[Lifecycle] OnEnable executed")
end

function OnStart()
    print("[Lifecycle] OnStart executed. Enabling 60FPS updates.")
    local root = script.object
    
    hud = game.InstantiateClientUIControl(TEXTBOX_TEMPLATE, root)
    hud.name = "LifecycleHUD"
    hud:SetAnchorMin(0.5, 0.5)
    hud:SetAnchorMax(0.5, 0.5)
    hud:SetPivot(0.5, 0.5)
    hud:SetAnchoredPosition(0, 0)
    hud:SetSizeDelta(480, 80)
    hud.fontSize = 17
    hud.fontColor = Color(220, 190, 120, 255)
    hud.text = "Initializing runtime loop..."

    script:EnableUpdate(true)
end

function OnUpdate(deltaTime)
    totalTime = totalTime + deltaTime
    frameCount = frameCount + 1
    if hud then
        local fps = math.floor(1 / math.max(deltaTime, 0.0001))
        hud.text = string.format("FRAME: %d  |  TIME: %.2fs  |  DT: %.4fs  |  %d FPS", frameCount, totalTime, deltaTime, fps)
    end
end

function OnDisable()
    print("[Lifecycle] OnDisable executed")
end

function OnDestroy()
    print("[Lifecycle] OnDestroy executed")
end`
  },
  {
    name: "Server Signal Dispatch Banner",
    code: `-- Template IDs:
local IMAGE_TEMPLATE = 1073741850
local TEXTBOX_TEMPLATE = 1073741849

function OnStart()
    local root = script.object

    -- 1. Instantiate banner card
    local card = game.InstantiateClientUIControl(IMAGE_TEMPLATE, root)
    card:SetAnchorMin(0.5, 0.5)
    card:SetAnchorMax(0.5, 0.5)
    card:SetPivot(0.5, 0.5)
    card:SetAnchoredPosition(0, 0)
    card:SetSizeDelta(420, 90)
    card.imageColor = Color(40, 32, 24, 255)

    -- 2. Banner text
    local txt = game.InstantiateClientUIControl(TEXTBOX_TEMPLATE, card)
    txt:SetAnchorMin(0.5, 0.5)
    txt:SetAnchorMax(0.5, 0.5)
    txt:SetPivot(0.5, 0.5)
    txt:SetAnchoredPosition(0, 0)
    txt:SetSizeDelta(400, 80)
    txt.fontSize = 15
    txt.fontColor = Color(240, 215, 140, 255)
    txt.text = "DISPATCHING SERVER SIGNAL..."

    -- 3. Construct and send signal
    local signal = game.ServerSignal("STAGE_CLEARED")
    signal:AddInt(101)
    signal:AddString("VICTORY")
    signal:AddFloat(99.4)
    signal:SendSignal()

    txt.text = "SIGNAL 'STAGE_CLEARED' DISPATCHED!\\n[Int: 101  |  Str: 'VICTORY'  |  Float: 99.4]"
    print("Signal 'STAGE_CLEARED' dispatched successfully.")
end`
  }
];

export function renderScratchpad(container, initialCode = '') {
  const defaultCode = initialCode || `-- Template IDs:
local IMAGE_TEMPLATE = 1073741850
local TEXTBOX_TEMPLATE = 1073741849
local CIRCLE_ASSET = 100002

function OnStart()
    local root = script.object
    local width, height = game.GetUICanvasSize()
    print("Canvas Initialized:", width, "x", height)

    -- 1. Instantiate a test ImageControl at center of screen
    local orb = game.InstantiateClientUIControl(IMAGE_TEMPLATE, root)
    orb.name = "CenterOrb"
    orb:SetAnchorMin(0.5, 0.5)
    orb:SetAnchorMax(0.5, 0.5)
    orb:SetPivot(0.5, 0.5)
    orb:SetAnchoredPosition(0, 20)
    orb:SetSizeDelta(110, 110)
    orb:SetImage(Enum.ImageSource.StaticReference, CIRCLE_ASSET)
    orb.imageColor = Color(212, 175, 85, 255)

    -- 2. Instantiate label
    local label = game.InstantiateClientUIControl(TEXTBOX_TEMPLATE, root)
    label:SetAnchorMin(0.5, 0.5)
    label:SetAnchorMax(0.5, 0.5)
    label:SetPivot(0.5, 0.5)
    label:SetAnchoredPosition(0, -65)
    label:SetSizeDelta(400, 40)
    label.fontSize = 16
    label.fontColor = Color(238, 217, 171, 255)
    label.text = "Miliastra 60 FPS Simulation Ready"

    -- 3. Live scale pulse tween
    game.Tween(orb, { localScaleX = 1.3, localScaleY = 1.3 }, 0.55)
        :SetEase(Enum.EaseType.InOutQuad)
        :SetLoops(-1)

    print("Simulation active! Press [SIMULATE (60 FPS)] to run.")
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
      openLuaRunnerModal(code, 'Scratchpad Simulation (60 FPS)', () => textarea.value);
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
