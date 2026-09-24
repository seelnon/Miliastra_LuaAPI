// ============================================================================
// MILIASTRA LUA RUNNER ENGINE (WebAssembly / Native Lua Virtual Machine)
// Ultra-fast client-side execution with captured stdout, exit codes & Miliastra mocks
// ============================================================================

import * as fengariWebModule from 'fengari-web';

const fengariWeb = (fengariWebModule && fengariWebModule.lua)
  ? fengariWebModule
  : (fengariWebModule && fengariWebModule.default && fengariWebModule.default.lua)
    ? fengariWebModule.default
    : (fengariWebModule && fengariWebModule.default)
      ? fengariWebModule.default
      : fengariWebModule;

const { lua, lauxlib, lualib, interop, to_luastring, to_jsstring } = fengariWeb;

function safeLuaToJsString(raw) {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string') return raw;
  if (raw instanceof Uint8Array) {
    if (typeof to_jsstring === 'function') {
      try {
        return to_jsstring(raw);
      } catch {
        // fallback
      }
    }
    try {
      return new TextDecoder().decode(raw);
    } catch {
      return String.fromCharCode.apply(null, raw);
    }
  }
  if (Array.isArray(raw) || (typeof raw === 'object' && typeof raw.length === 'number')) {
    try {
      const u8 = new Uint8Array(raw);
      return new TextDecoder().decode(u8);
    } catch {}
  }
  return String(raw);
}

function getLuaStackString(L, index = -1) {
  if (!L) return '';
  try {
    if (lua && typeof lua.lua_tojsstring === 'function') {
      const res = lua.lua_tojsstring(L, index);
      if (res !== null && res !== undefined) return String(res);
    }
    if (lua && typeof lua.lua_tostring === 'function') {
      const raw = lua.lua_tostring(L, index);
      return safeLuaToJsString(raw);
    }
  } catch (e) {
    return String(e && e.message ? e.message : e);
  }
  return '';
}

/**
 * Executes raw Lua code in an isolated VM, capturing all print() output and return values.
 * @param {string} code - The Lua source code to execute
 * @param {number} [timeout=5] - Maximum execution time in seconds
 * @returns {Promise<{ success: boolean, stdout: string, exit_code: number, return_val: any, durationMs: number, error: string|null }>}
 */
export async function executeLuaWasm(code, timeout = 5) {
  const startTime = performance.now();
  const stdoutBuffer = [];

  try {
    const L = lauxlib.luaL_newstate();
    if (!L) {
      throw new Error('Failed to allocate Lua Virtual Machine state');
    }

    lualib.luaL_openlibs(L);
    lauxlib.luaL_requiref(L, to_luastring('js'), interop.luaopen_js, 1);
    lua.lua_pop(L, 1);

    // Setup global stdout sink for this execution context
    const runnerId = `__lua_wasm_runner_${Math.floor(Math.random() * 1000000)}`;
    const globalContext = (typeof window !== 'undefined' ? window : globalThis);
    globalContext[runnerId] = {
      writeStdout: (...args) => {
        const line = args.map(arg => {
          if (arg === null || arg === undefined) return 'nil';
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        }).join('  ');
        stdoutBuffer.push(line);
      }
    };

    const interceptHarness = `
      local js = require "js"
      local runner = js.global["${runnerId}"]

      local orig_print = print
      function print(...)
        local parts = {...}
        local n = select("#", ...)
        local strParts = {}
        for i = 1, n do
          local v = select(i, ...)
          table.insert(strParts, tostring(v))
        end
        local fullStr = table.concat(strParts, "  ")
        runner:writeStdout(fullStr)
      end

      if not io then io = {} end
      function io.write(...)
        local parts = {...}
        local str = ""
        for _, p in ipairs(parts) do
          str = str .. tostring(p)
        end
        runner:writeStdout(str)
      end
    `;

    const harnessStatus = lauxlib.luaL_dostring(L, to_luastring(interceptHarness));
    if (harnessStatus !== lua.LUA_OK) {
      const err = getLuaStackString(L, -1);
      lua.lua_close(L);
      delete globalContext[runnerId];
      throw new Error(`Harness initialization failed: ${err}`);
    }

    // Execute user code
    const loadStatus = lauxlib.luaL_loadstring(L, to_luastring(code));
    if (loadStatus !== lua.LUA_OK) {
      const compileErr = getLuaStackString(L, -1);
      lua.lua_close(L);
      delete globalContext[runnerId];
      const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
      return {
        success: false,
        stdout: stdoutBuffer.join('\n'),
        exit_code: 1,
        return_val: null,
        durationMs,
        error: `Syntax/Load Error: ${compileErr}`
      };
    }

    // Execute loaded chunk with protected call
    const pcallStatus = lua.lua_pcall(L, 0, lua.LUA_MULTRET, 0);
    const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

    if (pcallStatus !== lua.LUA_OK) {
      const runtimeErr = getLuaStackString(L, -1);
      lua.lua_close(L);
      delete globalContext[runnerId];
      return {
        success: false,
        stdout: stdoutBuffer.join('\n'),
        exit_code: pcallStatus,
        return_val: null,
        durationMs,
        error: `Runtime Error: ${runtimeErr}`
      };
    }

    // Check return values
    let returnVal = null;
    const numReturns = lua.lua_gettop(L);
    if (numReturns > 0) {
      returnVal = getLuaStackString(L, -1);
    }

    lua.lua_close(L);
    delete globalContext[runnerId];

    return {
      success: true,
      stdout: stdoutBuffer.join('\n'),
      exit_code: 0,
      return_val: returnVal,
      durationMs,
      error: null
    };
  } catch (err) {
    const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
    return {
      success: false,
      stdout: stdoutBuffer.join('\n'),
      exit_code: -1,
      return_val: null,
      durationMs,
      error: err && err.message ? err.message : String(err)
    };
  }
}

/**
 * Executes Lua code with complete Miliastra reference mock prelude in Wasm/Native VM
 * @param {string} code - User Lua code
 * @param {number} [timeout=5] - Execution timeout in seconds
 * @returns {Promise<any>}
 */
export async function executeMiliastraWasm(code, timeout = 5) {
  const miliastraPrelude = `
-- ============================================================================
-- Miliastra Standard API Harness for Fast Unit-Testing & Headless Execution
-- ============================================================================

Color = {}
Color.__index = Color

function Color.FromRGBA(r, g, b, a)
  return { r = r or 255, g = g or 255, b = b or 255, a = a or 255 }
end

function Color.FromRGB(r, g, b)
  return Color.FromRGBA(r, g, b, 255)
end

function Color.ToRGBA(c)
  if type(c) == "table" then
    return c.r or 255, c.g or 255, c.b or 255, c.a or 255
  end
  return 255, 255, 255, 255
end

setmetatable(Color, {
  __call = function(self, r, g, b, a)
    return Color.FromRGBA(r, g, b, a)
  end
})

Enum = {
  ImageSource = {
    StaticReference = 1,
    Currency = 2,
    Equipment = 3,
    Faction = 4,
    Item = 5,
    Prefab = 6,
    Skill = 7,
    UnitStatus = 8,
    Dynamic = 9
  },
  ImageType = {
    Simple = 0,
    Sliced = 1,
    Tiled = 2,
    Filled = 3,
    Stretch = 4
  },
  ImageMaskSoftEdgeMode = {
    Absolute = 0,
    Percentage = 1
  },
  TextHorizontalAlignment = {
    Left = 0,
    Middle = 1,
    Center = 1,
    Right = 2
  },
  TextVerticalAlignment = {
    Top = 0,
    Middle = 1,
    Center = 1,
    Bottom = 2
  },
  CursorEventType = {
    CursorClick = 1,
    CursorDown = 2,
    CursorUp = 3,
    CursorEnter = 4,
    CursorExit = 5,
    CursorBeginDrag = 6,
    CursorDrag = 7,
    CursorEndDrag = 8
  },
  KeyEventType = {
    KeyboardMoveForwardKeyDown = 1,
    KeyboardMoveForwardKeyUp = 2,
    KeyboardMoveLeftKeyDown = 3,
    KeyboardMoveLeftKeyUp = 4,
    KeyboardMoveBackwardKeyDown = 5,
    KeyboardMoveBackwardKeyUp = 6,
    KeyboardMoveRightKeyDown = 7,
    KeyboardMoveRightKeyUp = 8,
    KeyboardJumpKeyDown = 9,
    KeyboardJumpKeyUp = 10,
    KeyboardNormalAttackKeyDown = 11,
    KeyboardNormalAttackKeyUp = 12,
    KeyboardSprintKeyDown = 13,
    KeyboardSprintKeyUp = 14,
    KeyboardInteractKeyDown = 15,
    KeyboardInteractKeyUp = 16,
    KeyboardDropKeyDown = 17,
    KeyboardDropKeyUp = 18,
    KeyboardCharacterSkill1KeyDown = 19,
    KeyboardCharacterSkill1KeyUp = 20,
    KeyboardCharacterSkill2KeyDown = 21,
    KeyboardCharacterSkill2KeyUp = 22,
    KeyboardCharacterSkill3KeyDown = 23,
    KeyboardCharacterSkill3KeyUp = 24,
    KeyboardCharacterSkill4KeyDown = 25,
    KeyboardCharacterSkill4KeyUp = 26,
    KeyboardOpenShortcutWheelKeyDown = 27,
    KeyboardOpenShortcutWheelKeyUp = 28,
    KeyboardSwitchToWalkOrRunKeyDown = 29,
    KeyboardSwitchToWalkOrRunKeyUp = 30,
    KeyboardCraftspersonKey36Down = 36,
    KeyboardCraftspersonKey37Down = 37,
    KeyboardCraftspersonKey38Down = 38,
    KeyboardCraftspersonKey39Down = 39,
    KeyboardCraftspersonKey40Down = 40,
    KeyboardCraftspersonKey41Down = 71
  },
  EaseType = {
    Linear = 0,
    InQuad = 1, OutQuad = 2, InOutQuad = 3,
    InCubic = 4, OutCubic = 5, InOutCubic = 6,
    InQuart = 7, OutQuart = 8, InOutQuart = 9,
    InQuint = 10, OutQuint = 11, InOutQuint = 12,
    InSine = 13, OutSine = 14, InOutSine = 15,
    InExpo = 16, OutExpo = 17, InOutExpo = 18,
    InCirc = 19, OutCirc = 20, InOutCirc = 21,
    InElastic = 22, OutElastic = 23, InOutElastic = 24,
    InBack = 25, OutBack = 26, InOutBack = 27,
    InBounce = 28, OutBounce = 29, InOutBounce = 30
  }
}

local nextMockId = 2000000
local function createMockControl(templateId, parent, name)
  nextMockId = nextMockId + 1
  local ctrl = {
    id = nextMockId,
    name = name or ("Control_" .. nextMockId),
    prefabIndex = templateId,
    parent = parent,
    children = {},
    visible = true,
    alive = true,
    interactable = true,
    raycastTarget = false,
    text = "",
    fontSize = 14,
    fontColor = Color.FromRGBA(255, 255, 255, 255),
    bgColor = Color.FromRGBA(0, 0, 0, 0),
    imageColor = Color.FromRGBA(255, 255, 255, 255),
    imageType = 4,
    resourceId = 100001,
    anchoredPositionX = 0,
    anchoredPositionY = 0,
    sizeDeltaX = 100,
    sizeDeltaY = 100,
    localScaleX = 1,
    localScaleY = 1,
    localScaleZ = 1,
    localRotationX = 0,
    localRotationY = 0,
    localRotationZ = 0,
    anchorMinX = 0, anchorMinY = 0,
    anchorMaxX = 0, anchorMaxY = 0,
    pivotX = 0.5, pivotY = 0.5
  }

  function ctrl:SetAnchorMin(x, y) self.anchorMinX = x; self.anchorMinY = y end
  function ctrl:SetAnchorMax(x, y) self.anchorMaxX = x; self.anchorMaxY = y end
  function ctrl:SetPivot(x, y) self.pivotX = x; self.pivotY = y end
  function ctrl:SetAnchoredPosition(x, y) self.anchoredPositionX = x; self.anchoredPositionY = y end
  function ctrl:SetSizeDelta(w, h) self.sizeDeltaX = w; self.sizeDeltaY = h end
  function ctrl:SetImage(source, resId) self.imageSource = source; self.resourceId = resId end
  function ctrl:SetVisible(v) self.visible = not not v end
  function ctrl:SetInteractable(v) self.interactable = not not v end
  function ctrl:SetSoftEdgeWidth(w, h) end
  function ctrl:SetAsLastSibling() end
  function ctrl:SetAsFirstSibling() end
  function ctrl:Destroy() self.alive = false; self.visible = false end
  function ctrl:GetParent() return self.parent end
  function ctrl:GetControl() return self end
  function ctrl:GetChildren() return self.children end
  function ctrl:FindChild(path) return nil end
  function ctrl:GetChild(name) return nil end
  function ctrl:AddCursorEventListener(t, cb) end
  function ctrl:AddKeyEventListener(t, cb) end

  if parent and parent.children then
    table.insert(parent.children, ctrl)
  end

  return ctrl
end

local rootMock = createMockControl(1, nil, "UIRoot")
local hostMock = createMockControl(2, rootMock, "ScriptHost")

local MockTween = {}
MockTween.__index = MockTween
function MockTween.new(target, targetValues, duration)
  return setmetatable({ target = target, targetValues = targetValues, duration = duration or 0 }, MockTween)
end
function MockTween:SetEase(e) return self end
function MockTween:SetLoops(l) return self end
function MockTween:SetRelative(r) return self end
function MockTween:SetOnComplete(cb) self.onComplete = cb; return self end
function MockTween:SetOnStepComplete(cb) return self end
function MockTween:Play() return self end
function MockTween:Pause() return self end
function MockTween:Resume() return self end
function MockTween:Restart() return self end
function MockTween:Complete() if self.onComplete then self.onComplete() end end
function MockTween:Kill(complete) if complete and self.onComplete then self.onComplete() end end
function MockTween:Stop() end

local MockSequence = {}
MockSequence.__index = MockSequence
function MockSequence.new() return setmetatable({ items = {} }, MockSequence) end
function MockSequence:Append(t) return self end
function MockSequence:Join(t) return self end
function MockSequence:AppendInterval(d) return self end
function MockSequence:AppendCallback(cb) return self end
function MockSequence:Insert(t, tw) return self end
function MockSequence:InsertCallback(t, cb) return self end
function MockSequence:Play() return self end
function MockSequence:Pause() return self end
function MockSequence:Resume() return self end
function MockSequence:Restart() return self end
function MockSequence:Complete() if self.onComplete then self.onComplete() end end
function MockSequence:Kill(complete) if complete and self.onComplete then self.onComplete() end end
function MockSequence:SetLoops(l) return self end
function MockSequence:SetOnComplete(cb) self.onComplete = cb; return self end

game = {
  GetUICanvasSize = function() return 960, 640 end,
  GetCursorUIPos = function() return 480, 320 end,
  GetClientUIControl = function(id) return hostMock end,
  GetClientUIRoots = function() return { rootMock } end,
  FindClientUIRoot = function(name) return rootMock end,
  InstantiateClientUIControl = function(templateId, parent)
    return createMockControl(templateId, parent or rootMock)
  end,
  Tween = function(ctrl, targetValues, duration)
    return MockTween.new(ctrl, targetValues, duration)
  end,
  TweenSequence = function()
    return MockSequence.new()
  end,
  PlayAudio2D = function(id) return 1001 end,
  StopAudio = function(id) end,
  IsAudioAlive = function(id) return false end,
  IsTestPlay = function() return true end,
  PauseLevelTime = function(p) end,
  IsLevelTimePaused = function() return false end,
  SetControllerFocus = function(c) end,
  PrintClientUITree = function() end,
  ServerSignal = function(name)
    return {
      Connect = function(self, fn) end,
      Fire = function(self, ...) end,
      AddBool = function(self, v) end,
      AddInt = function(self, v) end,
      AddFloat = function(self, v) end,
      AddString = function(self, v) end,
      AddVector3 = function(self, v) end
    }
  end
}

script = {
  object = hostMock,
  parent = hostMock,
  GetControl = function(self) return hostMock end,
  GetParent = function(self) return hostMock end,
  EnableUpdate = function(self, enabled) end,
  SetUpdateEnabled = function(self, enabled) end,
  RegisterCustomVariableChangedHandler = function(self, var, handler) end,
  RegisterServerSignalHandler = function(self, sig, cb) end,
  UnregisterCustomVariableChangedHandler = function(self, var) end,
  UnregisterServerSignalHandler = function(self, sig) end,
  GetParam = function(self, name) return nil end,
  Invoke = function(self, fn, ...) return nil end
}
`;

  return executeLuaWasm(miliastraPrelude + '\n' + code, timeout);
}
