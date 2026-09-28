// ============================================================================
// MILIASTRA EXPLANATIONS & ARCHITECTURE GUIDES (TAB 6)
// Houses Compositional Multi-Script Best Practices (Root Orchestrator / app.lua
// Pattern), Miliastra Multi-Script & ID Architecture Field Guide, and UI Control
// Rules & Workarounds.
// ============================================================================

import { highlightLua } from './syntax-highlighter.js';
import { copyToClipboard } from './ui-components.js';

const GUIDE_ORCHESTRATOR_MAIN_CODE = `---@meta
-- ============================================================================
-- COMPOSITIONAL ARCHITECTURE: MainAppController.lua (Mounted on Root Container)
-- Acts like main.js / app.js: discovers child UI controls & component scripts
-- once in OnStart(), holds shared state, and orchestrates child scripts via :Invoke()
-- ============================================================================

local root = nil
local scoreBanner = nil
local castBtn = nil
local orbActorScript = nil
local playerBarScript = nil

local currentScore = 0
local isGamePaused = false

local function UpdateScoreHUD(pointsDelta)
    currentScore = currentScore + pointsDelta
    if scoreBanner then
        scoreBanner.text = "◈ SCORE: " .. tostring(currentScore) .. " ◈"
    end
end

function OnStart()
    root = script.object

    -- 1. Cache child controls once at startup (never call FindChild every frame in OnUpdate!)
    scoreBanner = root:FindChild("HUDHeader/ScoreBanner") or root:GetChild("PauseBanner")
    castBtn = root:FindChild("ActionBar/CastSkillButton") or root:GetChild("PresetButton")

    local orbCtrl = root:FindChild("Arena/CooldownOrb") or root:GetChild("CooldownOrb")
    if orbCtrl then
        orbActorScript = orbCtrl:GetScripts()[1]
    end

    local barCtrl = root:FindChild("Arena/Container_with_1Pixel") or root:GetChild("Container_with_1Pixel")
    if barCtrl then
        playerBarScript = barCtrl:GetScripts()[1]
    end

    -- 2. Centralize input handling in the main orchestrator and invoke child actors:
    if castBtn then
        castBtn:AddCursorEventListener(Enum.CursorEventType.CursorClick, function()
            if isGamePaused then return end
            UpdateScoreHUD(10)

            if orbActorScript and orbActorScript.alive then
                orbActorScript:Invoke("TriggerSkillPulse")
            end
            if playerBarScript and playerBarScript.alive then
                playerBarScript:Invoke("Bounce")
            end
        end)
    end
end

-- 3. Optional public entrypoints callable by child scripts via root:GetScripts()[1]:Invoke(...)
function NotifyChildEvent(sourceName, eventPayload)
    print("[MainAppController] Child '" .. tostring(sourceName) .. "' reported:", eventPayload)
    UpdateScoreHUD(5)
end`;

const GUIDE_CROSS_SCRIPT_CODE = `---@meta
-- ============================================================================
-- PATTERN 1: Grabbing a Sibling Script WITHOUT Knowing IDs (Recommended)
-- ============================================================================
local function FindSiblingScript(myControl, siblingControlName, optionalScriptPath)
    local parent = myControl.parent
    if not parent then return nil end

    -- 1. Find the UI Control by its layer name in the Editor Hierarchy:
    local targetControl = parent:GetChild(siblingControlName)
    if not targetControl then
        -- Or search recursively / by '/' path:
        targetControl = parent:FindChild(siblingControlName)
    end
    if not targetControl then return nil end

    -- 2. Option A: Grab the first mounted script directly via GetScripts()[1]
    local scripts = targetControl:GetScripts()
    if scripts and scripts[1] then
        return scripts[1]
    end

    -- 3. Option B: Grab by the name registered in 'external_lua_file' settings
    if optionalScriptPath then
        return targetControl:GetScriptByPath(optionalScriptPath)
    end

    return nil
end

-- ============================================================================
-- PATTERN 2: Calling Global Functions Across Scripts via :Invoke()
-- ============================================================================
function OnStart()
    local button = script.object
    local redBarScript = FindSiblingScript(button, "Container_with_1Pixel", "Container_with_1pixel")

    button:AddCursorEventListener(Enum.CursorEventType.CursorClick, function()
        -- Always check .alive before invoking a function on another script!
        if redBarScript and redBarScript.alive then
            redBarScript:Invoke("Bounce")
        end
    end)
end`;

const GUIDE_SETACTIVE_VS_ENABLED_CODE = `---@meta
-- ============================================================================
-- 1. WHY script.enabled = false DOES NOT WORK FROM OUTSIDE
-- Per library/Script.d.lua: "Modifying script.enabled directly has no effect
-- on lifecycle functions or event handlers."
--
-- 2. CRITICAL ENGINE RULE: CHILD CONTROLS VS. ROOT UI CONTROL (GROUP)
--   • CHILD CONTROLS: Use targetChild:SetActive(bool) and targetChild:SetVisible(bool)
--     freely inside your UI hierarchy.
--   • ROOT UI CONTROL (script.object of the parent experience):
--     NEVER call root:SetActive(false) or root:SetVisible(false) to exit/close!
--     If Lua sets the root UI Control inactive or invisible, Genshin's Node Graph
--     ("Set UI Control (Group) Status") CANNOT override it or make it visible again!
--   • Instead, close the root UI experience by sending a ServerSignal to the
--     Server Node Graph so the server turns off "UI Control Group Status_Off":
-- ============================================================================

local EXIT_SIGNAL_NAME = "NORTH_RACER_EXIT" -- Must be manually created in Genshin Node Graph!

function ExitExperience()
    local root = script.object
    -- Release cursor and notify the Server Node Graph to turn off the Root UI Control Group:
    local exitSignal = game.ServerSignal(EXIT_SIGNAL_NAME)
    if exitSignal then
        exitSignal:SendSignal()
    end
    if root then
        root.showCursor = false
    end
    -- DO NOT call root:SetActive(false) or root:SetVisible(false) here!
end

-- ✅ For CHILD controls inside your UI, SetActive / SetVisible work normally:
local function SetChildNodeActive(rootContainer, childName, isActive)
    local targetCtrl = rootContainer:GetChild(childName)
    if targetCtrl then
        targetCtrl:SetActive(isActive)
        targetCtrl:SetVisible(isActive)
    end
end`;

const GUIDE_BUTTON_BG_WORKAROUND_CODE = `---@meta
-- ============================================================================
-- MILIASTRA UI RULE: PresetButtons DO NOT have background color properties!
-- WORKAROUND: Use a TextBox (1073741849) with bgColor for visual styling,
-- and either attach CursorClick to an overlapping PresetButton (1073741851)
-- or CursorEventArea (1073741856).
-- ============================================================================
local TEXTBOX_TEMPLATE = 1073741849
local PRESET_BUTTON_TEMPLATE = 1073741851

function CreateStyledButton(parent, x, y, w, h, labelText, onClick)
    -- 1. Visual background + text via TextBox bgColor:
    local bgLabel = game.InstantiateClientUIControl(TEXTBOX_TEMPLATE, parent)
    bgLabel:SetAnchorMin(0.5, 0.5)
    bgLabel:SetAnchorMax(0.5, 0.5)
    bgLabel:SetPivot(0.5, 0.5)
    bgLabel:SetAnchoredPosition(x, y)
    bgLabel:SetSizeDelta(w, h)
    bgLabel.bgColor = Color.FromRGBA(46, 40, 33, 240)
    bgLabel.fontColor = Color.FromRGB(238, 217, 171)
    bgLabel.fontSize = 15
    bgLabel.text = labelText

    -- 2. Interactive hit-box via PresetButton:
    local hitBtn = game.InstantiateClientUIControl(PRESET_BUTTON_TEMPLATE, bgLabel)
    hitBtn:SetAnchorMin(0.5, 0.5)
    hitBtn:SetAnchorMax(0.5, 0.5)
    hitBtn:SetPivot(0.5, 0.5)
    hitBtn:SetAnchoredPosition(0, 0)
    hitBtn:SetSizeDelta(w, h)
    hitBtn:AddCursorEventListener(Enum.CursorEventType.CursorClick, function(evt)
        if onClick then onClick(evt) end
    end)

    return bgLabel, hitBtn
end`;

const GUIDE_KEYHINT_DYNAMIC_BIND_CODE = `---@meta
-- ============================================================================
-- MILIASTRA UI RULE: NEVER hardcode static key names like "Press R" in TextBox!
-- WHY: If the stage author has Craftsperson Key 7 bound to 'R', but a player
-- remapped that action to '[' in their Game Settings (or plays on a Gamepad
-- with LB + Action Top), static text ("Press R to Reload") lies to the player!
--
-- SOLUTION: Pair a ClientUIKeyHintControl (1073741858) with a label TextBox.
--   • KeyHintControl automatically queries the player's live keybind table and
--     renders their actual bound keycap ('R', '[', etc.) or Gamepad glyph!
--   • Enum.KeyboardKeyCode (59 items: Invalid=0 + 58 semantic PC actions 1..58)
--   • Enum.ControllerKeyCode (25 items: Invalid=0 + 24 Gamepad buttons/combos 1..24)
--   • Enum.KeyEventType (164 items: 58 Keyboard Up/Down + 24 Controller Up/Down)
-- ============================================================================

local keyHintBadge = nil
local actionLabel = nil

function OnStart()
    local root = script.object

    -- 1. Grab the KeyHintControl & companion TextBox (contains only the action verb!)
    keyHintBadge = root:FindChild("KeyHintControl")
    actionLabel  = root:FindChild("ActionVerbLabel")

    if keyHintBadge then
        -- Bind semantic slot: Craftsperson Key 7 (Default 'R' on PC, or whatever key
        -- the player rebound it to, e.g. '[') + LB + Action Top on Gamepad:
        keyHintBadge.keyboardKeyCode   = Enum.KeyboardKeyCode.KeyboardCraftspersonKey7
        keyHintBadge.controllerKeyCode = Enum.ControllerKeyCode.ControllerComboAction4
    end

    if actionLabel then
        -- Notice we DO NOT write "Press R to Activate Mechanism" here!
        -- The KeyHintControl badge beside this label shows 'R' or '[' or 'LB + ▲' dynamically.
        actionLabel.text = "Activate Mechanism"
    end

    -- 2. Listen to the matching semantic KeyEventType for BOTH Keyboard & Controller:
    game.AddKeyEventListener(
        Enum.KeyEventType.KeyboardCraftspersonKey7KeyDown,
        function()
            print("[Input] Triggered via player's bound PC key (even if rebound to '[')!")
        end
    )

    game.AddKeyEventListener(
        Enum.KeyEventType.ControllerComboAction4KeyDown,
        function()
            print("[Input] Triggered via Gamepad (LB + Action Top)!")
        end
    )
end`;

export function renderGuidesView(container, onOpenInScratchpad = null) {
  container.innerHTML = `
    <div class="doc-hero">
      <div class="doc-hero-top">
        <span class="doc-tag">ARCHITECTURE & FIELD GUIDES</span>
        <span class="doc-source-file">library/Script.d.lua • BaseControl.d.lua • game.d.lua</span>
      </div>
      <div class="doc-title">Explanations, Best Practices & Multi-Script Architecture</div>
      <div class="doc-subtitle">Complete technical reference on compositional project design (the <code>main.lua</code> / <code>app.lua</code> Root Orchestrator pattern), runtime creation IDs vs. Template PrefabIndex, <code>external_lua_file</code> paths, <code>SetActive()</code> lifecycles, and UI control constraints.</div>
    </div>

    <!-- SECTION 1: COMPOSITIONAL ARCHITECTURE BEST PRACTICES -->
    <div class="section-header" style="margin-top: 20px;">
      <span>1. Compositional Best Practices: The Root Orchestrator Pattern (main.lua / app.lua)</span>
      <span class="sub-count">PROJECT ARCHITECTURE</span>
    </div>

    <div class="matrix-grid" style="grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); margin-bottom: 18px;">
      <div class="matrix-card" style="cursor: default;">
        <div class="card-name">1. One Main Orchestrator Script (like main.js / app.js)</div>
        <div class="card-val">Mount MainController.lua on Root ContainerControl</div>
        <div class="card-desc">
          Instead of having dozens of sibling scripts blindly searching for each other, mount <strong>one main orchestrator script</strong> (like <code>main.js</code> / <code>app.js</code>) on the Root <code>ContainerControl</code>.<br><br>
          The Root Orchestrator discovers child controls and child scripts once in <code>OnStart()</code>, owns the central game state (score, timers, phase), and dispatches commands downward to smaller component scripts via <strong><code>childScript:Invoke(...)</code></strong>.
        </div>
      </div>

      <div class="matrix-card" style="cursor: default;">
        <div class="card-name">2. Focused Child Component Scripts</div>
        <div class="card-val">Keep Leaf Scripts Specialized & Self-Contained</div>
        <div class="card-desc">
          Child scripts mounted on specific UI widgets (like <code>Image_Control.lua</code> on a bar or <code>SkillCooldownOrb.lua</code> on an icon) should act like reusable UI components:<br><br>
          • They animate only their own <code>script.object</code> (or nested children via <code>script.object:GetChild(...)</code>).<br>
          • They expose clear global functions (<code>Bounce()</code>, <code>TriggerSkillPulse()</code>, <code>ResetState()</code>) for the Root Orchestrator to invoke.
        </div>
      </div>

      <div class="matrix-card" style="cursor: default;">
        <div class="card-name">3. Cache Lookups in OnStart() — Never in OnUpdate()</div>
        <div class="card-val">Protect Your Frame Execution Budget</div>
        <div class="card-desc">
          Tree traversal calls like <code>root:FindChild("A/B")</code>, <code>parent:GetChildren()</code>, and <code>ctrl:GetScripts()</code> should <strong>always be cached in <code>local</code> variables inside <code>OnStart()</code></strong>.<br><br>
          Never traverse the hierarchy every frame inside <code>OnUpdate(deltaTime)</code>—use your cached references so 60 FPS animations and physics stay ultra-fast.
        </div>
      </div>
    </div>

    <div class="code-block-wrapper" style="margin-bottom: 24px;">
      <div class="code-block-header">
        <span class="code-block-title">ARCHITECTURAL BLUEPRINT: ROOT ORCHESTRATOR (MAIN.LUA / APP.LUA) DRIVING CHILD SCRIPTS</span>
        <div style="display: flex; gap: 6px;">
          <button class="brutal-btn guide-open-scratchpad-btn" data-code="${encodeURIComponent(GUIDE_ORCHESTRATOR_MAIN_CODE)}" style="padding: 2px 8px; font-size: 10px;">[ OPEN IN SCRATCHPAD ]</button>
          <button class="brutal-btn guide-copy-btn" data-code="${encodeURIComponent(GUIDE_ORCHESTRATOR_MAIN_CODE)}" style="padding: 2px 8px; font-size: 10px;">[ COPY LUA ]</button>
        </div>
      </div>
      <div class="code-container">
        <pre>${highlightLua(GUIDE_ORCHESTRATOR_MAIN_CODE, true)}</pre>
      </div>
    </div>

    <!-- SECTION 2: MULTI-SCRIPT & ID ARCHITECTURE FIELD GUIDE -->
    <div class="section-header">
      <span>2. Miliastra Multi-Script & ID Architecture Field Guide</span>
      <span class="sub-count">CORE ENGINE INTERNALS</span>
    </div>

    <div class="matrix-grid" style="grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); margin-bottom: 22px;">
      <div class="matrix-card" style="cursor: default;">
        <div class="card-name">1. Why id=1, id=2, id=3 Feel Out of Order</div>
        <div class="card-val">control.id vs. control.prefabIndex vs. :75</div>
        <div class="card-desc">
          • <strong><code>control.id</code> (1, 2, 3...)</strong> is assigned in the chronological order layers were originally created in the Miliastra Editor—<em>not</em> their current top-to-bottom visual order in the hierarchy! That is why <code>game.GetClientUIControl(3)</code> can return <code>ReferenceControl</code> while <code>id=1</code> returns <code>ContainerControl</code>.<br><br>
          • <strong><code>control.prefabIndex</code> (e.g. 1073741853)</strong> is the static Template / Prefab ID shown in the Inspector header (<code>Index 1073741853</code>). Used <strong>only</strong> with <code>game.InstantiateClientUIControl(prefabIndex, parent)</code>.<br><br>
          • <strong><code>ClientUIImageControl:75</code></strong> (from <code>tostring(script.object)</code>) is the internal Lua userdata pointer counter.
        </div>
      </div>

      <div class="matrix-card" style="cursor: default;">
        <div class="card-name">2. Grabbing Scripts Without Knowing IDs</div>
        <div class="card-val">:GetScripts()[1] vs. :GetScriptByPath()</div>
        <div class="card-desc">
          Instead of guessing <code>control.id</code> or <code>script.id</code>, navigate the UI tree by control name using <code>script.object.parent:GetChild("ControlName")</code> or <code>root:FindChild("Folder/ControlName")</code>.<br><br>
          Once you have the control:<br>
          • Call <strong><code>targetControl:GetScripts()[1]</code></strong> to grab its attached script without needing any ID or path!<br>
          • Or call <strong><code>targetControl:GetScriptByPath("NameInExternalLuaFile")</code></strong> using the script name in Miliastra's <code>external_lua_file</code> settings.
        </div>
      </div>

      <div class="matrix-card" style="cursor: default;">
        <div class="card-name">3. Why Separate Scripts Act Together via :Invoke()</div>
        <div class="card-val">Global Entrypoints vs. Local Helpers</div>
        <div class="card-desc">
          In Miliastra, <code>require</code> is disabled. Each mounted script has its own <code>script</code> object (<code>script.object</code> points to the control it is mounted on).<br><br>
          To call a function in Script B from Script A, declare the target function as <strong>global</strong> in Script B (<code>function Bounce()</code>) and call <strong><code>scriptB:Invoke("Bounce", arg1)</code></strong>. Keep internal helpers <strong><code>local function</code></strong> so names never collide across files!
        </div>
      </div>

      <div class="matrix-card" style="cursor: default;">
        <div class="card-name">4. Child control:SetActive() vs. The Root UI Group Trap</div>
        <div class="card-val">Never Call SetActive(false) / SetVisible(false) on Root!</div>
        <div class="card-desc">
          Per <code>library/Script.d.lua</code>, changing <strong><code>script.enabled = false</code></strong> directly has <strong>no effect</strong> on lifecycle functions.<br><br>
          • For <strong>child controls</strong> inside your UI, use <strong><code>childCtrl:SetActive(bool)</code></strong> and <strong><code>childCtrl:SetVisible(bool)</code></strong>.<br>
          • <strong>CRITICAL:</strong> Never call <code>root:SetActive(false)</code> or <code>root:SetVisible(false)</code> on the <strong>root parent script container</strong>! Doing so locks the root control so Genshin's Node Graph can <strong>never make it visible again</strong>.
        </div>
      </div>

      <div class="matrix-card" style="cursor: default; border-color: var(--border-gold-bright);">
        <div class="card-name">5. Why KeyHintControl Is Mandatory (Never Hardcode "Press R"!)</div>
        <div class="card-val">ClientUIKeyHintControl + Enum.KeyEventType (164 Events)</div>
        <div class="card-desc">
          <strong>The Static Text Trap:</strong> If a stage creator writes <code>"Press R to Reload"</code> inside a <code>TextBoxControl</code> because they have <em>Craftsperson Key 7</em> bound to <code>R</code>, any player who remapped that slot to <strong><code>'['</code></strong> in their Game Settings (or plays on a Gamepad) sees a broken prompt that doesn't match their controls!<br><br>
          <strong>The Solution:</strong> Always use <strong><code>ClientUIKeyHintControl</code></strong> (<code>1073741858</code>) for key/button prompts! It queries the player's live keybind table and automatically renders their actual bound keycap (e.g. <code>[</code> instead of <code>R</code>) on PC via <code>Enum.KeyboardKeyCode</code> (59 items) or their Gamepad button via <code>Enum.ControllerKeyCode</code> (25 items), pairing 1:1 with <code>Enum.KeyEventType</code> (164 total events: 116 Keyboard + 48 Controller).
        </div>
      </div>

      <div class="matrix-card" style="cursor: default; border-color: #b8c94a;">
        <div class="card-name">6. Launching & Closing Root UI via Node Graph & ServerSignal</div>
        <div class="card-val">Set UI Control (Group) Status ↔ game.ServerSignal(name):SendSignal()</div>
        <div class="card-desc">
          In Genshin Node Graphs, the <strong>only way</strong> to launch or close a top-level UI parent group is the <strong><code>Set UI Control (Group) Status</code></strong> node (labeled <em>Display Status: UI Control Group Status_On / Off</em> in the UI, which actually controls group activation and triggers <code>OnStart()</code>, but <strong>cannot</strong> override Lua's <code>SetActive</code> / <code>SetVisible</code>!).<br><br>
          <strong>How to close a UI experience from Lua:</strong><br>
          1. Set <code>root.showCursor = false</code> and call <code>game.ServerSignal("YOUR_EXIT_SIGNAL"):SendSignal()</code>.<br>
          2. <strong>Signals are not auto-created:</strong> You must know the exact signal name and manually create a matching Signal in the Genshin Server Node Graph, wired to <strong><code>Set UI Control (Group) Status → UI Control Group Status_Off</code></strong> on your parent UI Control (Group) Index (e.g. <code>1073741845</code>).<br><br>
          <div style="background: #1a1c20; border: 1px solid #869936; border-radius: 6px; overflow: hidden; font-family: var(--font-mono); font-size: 11px; margin-top: 6px;">
            <div style="background: #b8c94a; color: #181a14; font-weight: 800; padding: 5px 10px; display: flex; align-items: center; gap: 6px;">
              <span>⑂</span> <span>Set UI Control (Group) Status</span>
            </div>
            <div style="padding: 8px 10px; display: flex; flex-direction: column; gap: 6px; color: #dcd0ba;">
              <div><span style="color: #6ca0f6;">●</span> <strong>Target Player:</strong> <span style="background: #162234; color: #7cb3ff; padding: 1px 6px; border-radius: 3px; font-size: 10px;">Get Player Entity to Which the Character Belongs - Affiliated Player Entity</span></div>
              <div><span style="color: #9aa0a6;">○</span> <strong>UI Control (Group) Index:</strong> <code style="background: #252830; padding: 1px 6px; border-radius: 3px; color: #fff;">1073741845</code></div>
              <div><span style="color: #9aa0a6;">○</span> <strong>Display Status:</strong> <code style="background: #252830; padding: 1px 6px; border-radius: 3px; color: #f5b82e;">UI Control Group Status_On</code> / <code style="background: #252830; padding: 1px 6px; border-radius: 3px; color: #ff8a80;">UI Control Group Status_Off</code></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SECTION 3: COMPARISON TABLE OF ALL ID TYPES -->
    <div class="section-header">
      <span>3. Complete Comparison: Runtime ID vs. PrefabIndex vs. Userdata vs. Script Path</span>
      <span class="sub-count">LOOKUP CHEATSHEET</span>
    </div>

    <div class="ledger-table-wrapper" style="margin-bottom: 22px;">
      <table class="ledger-table">
        <thead>
          <tr>
            <th style="width: 22%;">IDENTIFIER / PROPERTY</th>
            <th style="width: 22%;">EXAMPLE VALUE</th>
            <th style="width: 26%;">WHERE IT COMES FROM</th>
            <th>WHICH API FUNCTION USES IT</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>control.id</code></td>
            <td><span class="inline-rune">1</span>, <span class="inline-rune">2</span>, <span class="inline-rune">3</span>, <span class="inline-rune">4</span></td>
            <td>Assigned in chronological order when controls are created in the Editor Interface Layout (or spawned at runtime).</td>
            <td><code>game.GetClientUIControl(id)</code> — e.g. <code>game.GetClientUIControl(1)</code> returns Root <code>ContainerControl</code>.</td>
          </tr>
          <tr>
            <td><code>control.prefabIndex</code></td>
            <td><span class="inline-rune">1073741853</span></td>
            <td>The static Template / Prefab Index shown at the top-right of the Miliastra Inspector (<code>Index 1073741853</code>).</td>
            <td><code>game.InstantiateClientUIControl(prefabIndex, parent)</code> — spawns a new copy of that template.</td>
          </tr>
          <tr>
            <td><code>tostring(script.object)</code></td>
            <td><span class="inline-rune">ClientUIImageControl:75</span></td>
            <td>Internal C++/Lua userdata wrapper counter (<code>:75</code>).</td>
            <td>Debugging / logging only. Cannot be passed to <code>GetClientUIControl()</code>.</td>
          </tr>
          <tr>
            <td><code>control.name</code></td>
            <td><span class="inline-rune">"Container_with_1Pixel"</span></td>
            <td>The layer name in the left Hierarchy tree of the Miliastra Editor.</td>
            <td><code>parent:GetChild("Container_with_1Pixel")</code> or <code>root:FindChild("SubFolder/Container_with_1Pixel")</code>.</td>
          </tr>
          <tr>
            <td><code>script.path</code></td>
            <td><span class="inline-rune">"Container_with_1pixel"</span></td>
            <td>The script entry name inside Miliastra's <code>external_lua_file</code> registry.</td>
            <td><code>control:GetScriptByPath("Container_with_1pixel")</code> — or skip paths entirely with <code>control:GetScripts()[1]</code>!</td>
          </tr>
          <tr>
            <td><code>script.id</code> / <code>script.prefabIndex</code></td>
            <td><span class="inline-rune">2</span> / <span class="inline-rune">1073741862</span></td>
            <td>Creation order of the script binding / script asset index.</td>
            <td><code>control:GetScript(scriptPrefabIndex)</code></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- SECTION 4: COPYABLE CODE PATTERNS -->
    <div class="section-header">
      <span>4. Production Multi-Script & UI Workaround Recipes</span>
      <span class="sub-count">LUA PATTERNS</span>
    </div>

    <div class="code-block-wrapper" style="margin-bottom: 18px;">
      <div class="code-block-header">
        <span class="code-block-title">RECIPE A: CROSS-SCRIPT LOOKUP & :INVOKE() WITHOUT HARDCODED IDS</span>
        <div style="display: flex; gap: 6px;">
          <button class="brutal-btn guide-open-scratchpad-btn" data-code="${encodeURIComponent(GUIDE_CROSS_SCRIPT_CODE)}" style="padding: 2px 8px; font-size: 10px;">[ OPEN IN SCRATCHPAD ]</button>
          <button class="brutal-btn guide-copy-btn" data-code="${encodeURIComponent(GUIDE_CROSS_SCRIPT_CODE)}" style="padding: 2px 8px; font-size: 10px;">[ COPY LUA ]</button>
        </div>
      </div>
      <div class="code-container">
        <pre>${highlightLua(GUIDE_CROSS_SCRIPT_CODE, true)}</pre>
      </div>
    </div>

    <div class="code-block-wrapper" style="margin-bottom: 18px;">
      <div class="code-block-header">
        <span class="code-block-title">RECIPE B: ENABLING / DISABLING SCRIPTS VIA control:SetActive(bool) VS. script:EnableUpdate(bool)</span>
        <div style="display: flex; gap: 6px;">
          <button class="brutal-btn guide-open-scratchpad-btn" data-code="${encodeURIComponent(GUIDE_SETACTIVE_VS_ENABLED_CODE)}" style="padding: 2px 8px; font-size: 10px;">[ OPEN IN SCRATCHPAD ]</button>
          <button class="brutal-btn guide-copy-btn" data-code="${encodeURIComponent(GUIDE_SETACTIVE_VS_ENABLED_CODE)}" style="padding: 2px 8px; font-size: 10px;">[ COPY LUA ]</button>
        </div>
      </div>
      <div class="code-container">
        <pre>${highlightLua(GUIDE_SETACTIVE_VS_ENABLED_CODE, true)}</pre>
      </div>
    </div>

    <div class="code-block-wrapper" style="margin-bottom: 18px;">
      <div class="code-block-header">
        <span class="code-block-title">RECIPE C: BUTTON BACKGROUND WORKAROUND (TEXTBOX bgColor + PRESETBUTTON HITBOX)</span>
        <div style="display: flex; gap: 6px;">
          <button class="brutal-btn guide-open-scratchpad-btn" data-code="${encodeURIComponent(GUIDE_BUTTON_BG_WORKAROUND_CODE)}" style="padding: 2px 8px; font-size: 10px;">[ OPEN IN SCRATCHPAD ]</button>
          <button class="brutal-btn guide-copy-btn" data-code="${encodeURIComponent(GUIDE_BUTTON_BG_WORKAROUND_CODE)}" style="padding: 2px 8px; font-size: 10px;">[ COPY LUA ]</button>
        </div>
      </div>
      <div class="code-container">
        <pre>${highlightLua(GUIDE_BUTTON_BG_WORKAROUND_CODE, true)}</pre>
      </div>
    </div>

    <div class="code-block-wrapper" style="margin-bottom: 24px;">
      <div class="code-block-header">
        <span class="code-block-title">RECIPE D: DYNAMIC KEYBIND SHOWCASE (KEYHINTCONTROL VS. STATIC "PRESS R" TRAP)</span>
        <div style="display: flex; gap: 6px;">
          <button class="brutal-btn guide-open-scratchpad-btn" data-code="${encodeURIComponent(GUIDE_KEYHINT_DYNAMIC_BIND_CODE)}" style="padding: 2px 8px; font-size: 10px;">[ OPEN IN SCRATCHPAD ]</button>
          <button class="brutal-btn guide-copy-btn" data-code="${encodeURIComponent(GUIDE_KEYHINT_DYNAMIC_BIND_CODE)}" style="padding: 2px 8px; font-size: 10px;">[ COPY LUA ]</button>
        </div>
      </div>
      <div class="code-container">
        <pre>${highlightLua(GUIDE_KEYHINT_DYNAMIC_BIND_CODE, true)}</pre>
      </div>
    </div>
  `;

  container.querySelectorAll('.guide-copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      copyToClipboard(decodeURIComponent(btn.dataset.code), 'Lua Recipe');
    });
  });

  container.querySelectorAll('.guide-open-scratchpad-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof onOpenInScratchpad === 'function') {
        onOpenInScratchpad(decodeURIComponent(btn.dataset.code));
      }
    });
  });
}
