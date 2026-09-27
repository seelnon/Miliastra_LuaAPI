// ============================================================================
// MILIASTRA LUA SIMULATION ENGINE
// Executes real Miliastra Lua game scripts on an HTML5 Canvas / DOM virtual UI
// ============================================================================

import * as fengariWebModule from 'https://cdn.jsdelivr.net/npm/fengari-web/+esm';

// Resolve export object across Vite dev, esbuild, and production bundle environments
const fengariWeb = (fengariWebModule && fengariWebModule.lua)
  ? fengariWebModule
  : (fengariWebModule && fengariWebModule.default && fengariWebModule.default.lua)
    ? fengariWebModule.default
    : (fengariWebModule && fengariWebModule.default)
      ? fengariWebModule.default
      : fengariWebModule;

const { lua, lauxlib, lualib, interop, to_luastring, to_jsstring } = fengariWeb;

export function safeLuaToJsString(raw) {
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

export function getLuaStackString(L, index = -1) {
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

// Asset shapes lookup
export const ASSET_SHAPES = {
  100001: 'rectangle',
  100002: 'circle',
  100003: 'triangle',
  100004: 'star4',
  100005: 'star5',
  100006: 'hollow_circle',
  rectangle: 'rectangle',
  circle: 'circle',
  triangle: 'triangle',
  star4: 'star4',
  star5: 'star5',
  hollow_circle: 'hollow_circle'
};

/**
 * Normalizes color objects from plain JS or Fengari Lua proxies into { r, g, b, a }
 */
export function normalizeColor(c, defaultAlpha = 255) {
  if (!c) return { r: 255, g: 255, b: 255, a: defaultAlpha };
  let r = 255, g = 255, b = 255, a = defaultAlpha;

  if (typeof c === 'object' || typeof c === 'function') {
    if (typeof c.get === 'function') {
      const cr = c.get('r');
      const cg = c.get('g');
      const cb = c.get('b');
      const ca = c.get('a');
      r = cr !== undefined && cr !== null ? Number(cr) : 255;
      g = cg !== undefined && cg !== null ? Number(cg) : 255;
      b = cb !== undefined && cb !== null ? Number(cb) : 255;
      a = ca !== undefined && ca !== null ? Number(ca) : defaultAlpha;
    } else {
      r = c.r !== undefined && c.r !== null ? Number(c.r) : 255;
      g = c.g !== undefined && c.g !== null ? Number(c.g) : 255;
      b = c.b !== undefined && c.b !== null ? Number(c.b) : 255;
      a = c.a !== undefined && c.a !== null ? Number(c.a) : defaultAlpha;
    }
  }

  if (isNaN(r)) r = 255;
  if (isNaN(g)) g = 255;
  if (isNaN(b)) b = 255;
  if (isNaN(a)) a = defaultAlpha;

  return {
    r: Math.max(0, Math.min(255, Math.round(r))),
    g: Math.max(0, Math.min(255, Math.round(g))),
    b: Math.max(0, Math.min(255, Math.round(b))),
    a: Math.max(0, Math.min(255, Math.round(a)))
  };
}

// Miliastra UI Control Mock Object
export class VirtualUIControl {
  constructor(id, parent = null, name = 'Control') {
    this.id = id || Math.floor(1000000000 + Math.random() * 900000000);
    this.parent = parent;
    this.children = [];
    this.name = name;
    this.alive = true;
    this.visible = true;

    // Transform properties (Miliastra standard)
    this.anchorMinX = 0;
    this.anchorMinY = 0;
    this.anchorMaxX = 0;
    this.anchorMaxY = 0;
    this.pivotX = 0.5;
    this.pivotY = 0.5;
    this.anchoredPositionX = 0;
    this.anchoredPositionY = 0;
    this.sizeDeltaX = 100;
    this.sizeDeltaY = 100;
    this.localScaleX = 1;
    this.localScaleY = 1;
    this.localScaleZ = 1;
    this.localRotationX = 0;
    this.localRotationY = 0;
    this.localRotationZ = 0;

    // Visuals & Styling - default alpha = 0 for transparent backdrop on text / containers
    this.text = '';
    this.fontSize = 16;
    this.fontColor = { r: 255, g: 255, b: 255, a: 255 };
    this.bgColor = { r: 0, g: 0, b: 0, a: 0 };
    this.imageColor = { r: 255, g: 255, b: 255, a: 0 };
    this.imageType = 4; // Stretch
    this.resourceId = 100001;
    this._explicitImageColor = false;
    this.enableSoftEdge = false;
    this.softEdgeMode = 1;
    this.softEdgeWidthX = 0;
    this.softEdgeWidthY = 0;
    this.horizontalSoftRange = 0;
    this.verticalSoftRange = 0;
    this.adaptiveFontSize = false;
    this.horizontalAlignment = 1; // Middle
    this.verticalAlignment = 1; // Middle

    // Interaction & Events
    this.interactable = true;
    this.raycastTarget = false;
    this.disableCursorEventPassthrough = false;
    this.disableKeyEventPassthrough = false;
    this.showCursor = true;
    this.cursorListeners = {};
    this.keyListeners = {};

    if (parent && parent.children) {
      parent.children.push(this);
    }
  }

  SetAnchorMin(x, y) {
    this.anchorMinX = Number(x) || 0;
    this.anchorMinY = Number(y) || 0;
  }

  SetAnchorMax(x, y) {
    this.anchorMaxX = Number(x) || 0;
    this.anchorMaxY = Number(y) || 0;
  }

  SetPivot(x, y) {
    this.pivotX = Number(x) || 0;
    this.pivotY = Number(y) || 0;
  }

  SetAnchoredPosition(x, y) {
    this.anchoredPositionX = Number(x) || 0;
    this.anchoredPositionY = Number(y) || 0;
  }

  SetSizeDelta(w, h) {
    this.sizeDeltaX = Number(w) || 0;
    this.sizeDeltaY = Number(h) || 0;
  }

  SetLocalScale(x, y, z) {
    this.localScaleX = x !== undefined && !isNaN(Number(x)) ? Number(x) : 1;
    this.localScaleY = y !== undefined && !isNaN(Number(y)) ? Number(y) : 1;
    this.localScaleZ = z !== undefined && !isNaN(Number(z)) ? Number(z) : 1;
  }

  SetLocalRotation(x, y, z) {
    this.localRotationX = x !== undefined && !isNaN(Number(x)) ? Number(x) : 0;
    this.localRotationY = y !== undefined && !isNaN(Number(y)) ? Number(y) : 0;
    this.localRotationZ = z !== undefined && !isNaN(Number(z)) ? Number(z) : 0;
  }

  SetActive(active) {
    this.active = !!active;
  }

  GetLocalScale() {
    return [this.localScaleX, this.localScaleY, this.localScaleZ];
  }

  GetLocalRotation() {
    return [this.localRotationX, this.localRotationY, this.localRotationZ];
  }

  SetImage(source, resourceId) {
    this.imageSource = source;
    if (typeof resourceId === 'object' && resourceId !== null && typeof resourceId.get === 'function') {
      this.resourceId = 100001;
    } else {
      this.resourceId = Number(resourceId) || resourceId || 100001;
    }
    if (this.imageColor.a === 0 && !this._explicitImageColor) {
      this.imageColor = { r: 255, g: 255, b: 255, a: 255 };
    }
  }

  SetImageColor(r, g, b, a = 255) {
    this._explicitImageColor = true;
    if (typeof r === 'object' || typeof r === 'function') {
      this.imageColor = normalizeColor(r, 255);
    } else if (this.imageColor && typeof this.imageColor === 'object') {
      this.imageColor.r = Number(r) || 0;
      this.imageColor.g = Number(g) || 0;
      this.imageColor.b = Number(b) || 0;
      this.imageColor.a = a !== undefined ? Number(a) : 255;
    } else {
      this.imageColor = {
        r: Number(r) || 0,
        g: Number(g) || 0,
        b: Number(b) || 0,
        a: a !== undefined ? Number(a) : 255
      };
    }
  }

  SetBgColor(r, g, b, a = 0) {
    if (typeof r === 'object' || typeof r === 'function') {
      this.bgColor = normalizeColor(r, 0);
    } else if (this.bgColor && typeof this.bgColor === 'object') {
      this.bgColor.r = Number(r) || 0;
      this.bgColor.g = Number(g) || 0;
      this.bgColor.b = Number(b) || 0;
      this.bgColor.a = a !== undefined ? Number(a) : 0;
    } else {
      this.bgColor = {
        r: Number(r) || 0,
        g: Number(g) || 0,
        b: Number(b) || 0,
        a: a !== undefined ? Number(a) : 0
      };
    }
  }

  SetFontColor(r, g, b, a = 255) {
    if (typeof r === 'object' || typeof r === 'function') {
      this.fontColor = normalizeColor(r, 255);
    } else if (this.fontColor && typeof this.fontColor === 'object') {
      this.fontColor.r = Number(r) || 0;
      this.fontColor.g = Number(g) || 0;
      this.fontColor.b = Number(b) || 0;
      this.fontColor.a = a !== undefined ? Number(a) : 255;
    } else {
      this.fontColor = {
        r: Number(r) || 0,
        g: Number(g) || 0,
        b: Number(b) || 0,
        a: a !== undefined ? Number(a) : 255
      };
    }
  }

  SetVisible(v) {
    this.visible = !!v;
  }

  SetInteractable(v) {
    this.interactable = !!v;
  }

  SetSoftEdgeWidth(w, h) {
    this.softEdgeWidthX = Number(w) || 0;
    this.softEdgeWidthY = Number(h) || 0;
  }

  SetAsLastSibling() {
    if (this.parent && this.parent.children) {
      const idx = this.parent.children.indexOf(this);
      if (idx !== -1) {
        this.parent.children.splice(idx, 1);
        this.parent.children.push(this);
      }
    }
  }

  SetAsFirstSibling() {
    if (this.parent && this.parent.children) {
      const idx = this.parent.children.indexOf(this);
      if (idx !== -1) {
        this.parent.children.splice(idx, 1);
        this.parent.children.unshift(this);
      }
    }
    return true;
  }

  SetSiblingIndex(index) {
    if (this.parent && this.parent.children) {
      const idx = this.parent.children.indexOf(this);
      if (idx !== -1) {
        this.parent.children.splice(idx, 1);
        const clamped = Math.max(0, Math.min(this.parent.children.length, Math.floor(Number(index) || 0)));
        this.parent.children.splice(clamped, 0, this);
      }
    }
    return true;
  }

  GetSiblingIndex() {
    if (!this.parent || !this.parent.children) return -1;
    return this.parent.children.indexOf(this);
  }

  RemoveAllCursorEventListeners() {
    this.cursorListeners = {};
  }

  RemoveCursorEventListeners(eventType) {
    const key = Number(eventType) || eventType;
    delete this.cursorListeners[key];
  }

  RemoveAllKeyEventListeners() {
    this.keyListeners = {};
  }

  RemoveKeyEventListeners(eventType) {
    const key = Number(eventType) || eventType;
    delete this.keyListeners[key];
  }

  AddCursorEventListener(eventType, callbackId) {
    const key = Number(eventType) || eventType;
    if (!this.cursorListeners[key]) {
      this.cursorListeners[key] = [];
    }
    this.cursorListeners[key].push(callbackId);
  }

  AddKeyEventListener(eventType, callbackId) {
    const key = Number(eventType) || eventType;
    if (!this.keyListeners[key]) {
      this.keyListeners[key] = [];
    }
    this.keyListeners[key].push(callbackId);
  }

  GetChildren() {
    return this.children.slice();
  }

  FindChild(path) {
    if (!path) return null;
    const parts = String(path).split('/');
    let current = this;
    for (const part of parts) {
      if (!current || !current.children) return null;
      current = current.children.find(c => c.name === part);
    }
    return current;
  }

  GetChild(name) {
    return this.children.find(c => c.name === name) || null;
  }

  Destroy() {
    this.alive = false;
    this.visible = false;
    if (this.parent && this.parent.children) {
      const idx = this.parent.children.indexOf(this);
      if (idx !== -1) {
        this.parent.children.splice(idx, 1);
      }
    }
    this.children = [];
  }

  GetParent() {
    return this.parent;
  }

  // Calculate screen bounding box in Canvas coordinates (0,0 is bottom-left)
  getScreenBounds(canvasWidth, canvasHeight, precomputedParentBounds = null) {
    let parentWidth = canvasWidth;
    let parentHeight = canvasHeight;
    let parentScaleX = 1;
    let parentScaleY = 1;
    let parentPivotScreenX = 0;
    let parentPivotScreenY = 0;
    let parentPivotX = 0;
    let parentPivotY = 0;
    let hasParent = false;

    if (this.parent && (precomputedParentBounds || this.parent.getScreenBounds)) {
      const pBounds = precomputedParentBounds || this.parent.getScreenBounds(canvasWidth, canvasHeight);
      parentWidth = this.parent.sizeDeltaX || pBounds.width;
      parentHeight = this.parent.sizeDeltaY || pBounds.height;
      parentScaleX = pBounds.worldScaleX !== undefined ? pBounds.worldScaleX : 1;
      parentScaleY = pBounds.worldScaleY !== undefined ? pBounds.worldScaleY : 1;
      parentPivotScreenX = pBounds.pivotScreenX !== undefined ? pBounds.pivotScreenX : pBounds.centerX;
      parentPivotScreenY = pBounds.pivotScreenY !== undefined ? pBounds.pivotScreenY : pBounds.centerY;
      parentPivotX = this.parent.pivotX !== undefined ? this.parent.pivotX : 0.5;
      parentPivotY = this.parent.pivotY !== undefined ? this.parent.pivotY : 0.5;
      hasParent = true;
    }

    const selfScaleX = this.localScaleX !== undefined ? this.localScaleX : 1;
    const selfScaleY = this.localScaleY !== undefined ? this.localScaleY : 1;
    const worldScaleX = parentScaleX * selfScaleX;
    const worldScaleY = parentScaleY * selfScaleY;

    let pivotScreenX = 0;
    let pivotScreenY = 0;

    if (hasParent) {
      // Local coordinate relative to parent's pivot before scaling:
      const anchorRelX = (this.anchorMinX - parentPivotX) * parentWidth;
      const anchorRelY = (this.anchorMinY - parentPivotY) * parentHeight;
      const localX = anchorRelX + this.anchoredPositionX;
      const localY = anchorRelY + this.anchoredPositionY;

      // Scaled by parent's world scale around parent's pivot:
      pivotScreenX = parentPivotScreenX + localX * parentScaleX;
      pivotScreenY = parentPivotScreenY + localY * parentScaleY;
    } else {
      pivotScreenX = this.anchorMinX * canvasWidth + this.anchoredPositionX;
      pivotScreenY = this.anchorMinY * canvasHeight + this.anchoredPositionY;
    }

    const width = this.sizeDeltaX * Math.abs(worldScaleX);
    const height = this.sizeDeltaY * Math.abs(worldScaleY);

    const left = pivotScreenX - this.pivotX * width;
    const bottom = pivotScreenY - this.pivotY * height;

    return {
      left,
      bottom,
      width,
      height,
      right: left + width,
      top: bottom + height,
      centerX: left + width * 0.5,
      centerY: bottom + height * 0.5,
      pivotScreenX,
      pivotScreenY,
      worldScaleX,
      worldScaleY
    };
  }
}

// Miliastra Lua Runtime Runner
export class MiliastraSimulator {
  constructor(canvas, logCallback = null, initialWidth = 960, initialHeight = 640) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.logCallback = logCallback || console.log;

    this.width = Math.max(200, Math.min(3840, Math.round(Number(initialWidth) || 960)));
    this.height = Math.max(200, Math.min(2160, Math.round(Number(initialHeight) || 640)));
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.aspectRatio = `${this.width} / ${this.height}`;

    this.cursorX = this.width / 2;
    this.cursorY = this.height / 2;

    this.rootControl = new VirtualUIControl(1, null, 'UIRoot');
    this.rootControl.sizeDeltaX = this.width;
    this.rootControl.sizeDeltaY = this.height;
    this.rootControl.pivotX = 0;
    this.rootControl.pivotY = 0;

    this.scriptHost = new VirtualUIControl(2, this.rootControl, 'ScriptHost');
    this.scriptHost.sizeDeltaX = this.width;
    this.scriptHost.sizeDeltaY = this.height;
    this.scriptHost.pivotX = 0;
    this.scriptHost.pivotY = 0;

    this.controlsById = new Map();
    this.controlsById.set(1, this.rootControl);
    this.controlsById.set(2, this.scriptHost);

    this.isRunning = false;
    this.isPaused = false;
    this.updateEnabled = true;
    this.animationFrameId = null;
    this.lastTime = 0;
    this.fps = 60;
    this.fpsTimer = 0;
    this.framesCount = 0;

    this.L = null;
    this.hoveredControls = [];
    this.isMouseDown = false;
    this.isDragging = false;
    this.lastClickTime = 0;
    this.lastDownTime = 0;
    this.lastAttackKeyTime = 0;

    this.setupDOMEvents();
  }

  log(msg, type = 'info') {
    if (this.logCallback) {
      this.logCallback(msg, type);
    }
  }

  setResolution(newWidth, newHeight) {
    const w = Math.max(200, Math.min(3840, Math.round(Number(newWidth) || 960)));
    const h = Math.max(200, Math.min(2160, Math.round(Number(newHeight) || 640)));
    if (this.width === w && this.height === h) return;

    const oldWidth = this.width;
    const oldHeight = this.height;

    this.width = w;
    this.height = h;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.aspectRatio = `${this.width} / ${this.height}`;

    if (this.rootControl) {
      this.rootControl.sizeDeltaX = this.width;
      this.rootControl.sizeDeltaY = this.height;
    }
    // Only resize scriptHost if the Lua script has NOT anchored/centered it as a fixed design container
    if (
      this.scriptHost &&
      this.scriptHost.sizeDeltaX === oldWidth &&
      this.scriptHost.sizeDeltaY === oldHeight &&
      this.scriptHost.anchorMinX === 0 &&
      this.scriptHost.anchorMinY === 0 &&
      this.scriptHost.pivotX === 0 &&
      this.scriptHost.pivotY === 0
    ) {
      this.scriptHost.sizeDeltaX = this.width;
      this.scriptHost.sizeDeltaY = this.height;
    }
    this.log(`Viewport updated to ${this.width} × ${this.height}`, 'info');
    if (this.isRunning) {
      this.renderCanvas();
    }
  }

  setupDOMEvents() {
    const getCanvasPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.width / rect.width;
      const scaleY = this.height / rect.height;
      const clientX = (e.clientX - rect.left) * scaleX;
      const clientY = this.height - (e.clientY - rect.top) * scaleY; // Invert to Miliastra bottom-left (0,0)
      return { x: clientX, y: clientY };
    };

    const handleMouseMove = (e) => {
      const pos = getCanvasPos(e);
      this.cursorX = pos.x;
      this.cursorY = pos.y;
      
      const currentHits = this.hitTestControls(pos.x, pos.y);

      // Check exits
      for (const ctrl of this.hoveredControls) {
        if (!currentHits.includes(ctrl)) {
          this.dispatchCursorEvent(5, pos.x, pos.y, [ctrl]); // CursorExit
        }
      }

      // Check enters
      for (const ctrl of currentHits) {
        if (!this.hoveredControls.includes(ctrl)) {
          this.dispatchCursorEvent(4, pos.x, pos.y, [ctrl]); // CursorEnter
        }
      }

      // If mouse is held down, dispatch dragging
      if (this.isMouseDown) {
        if (!this.isDragging) {
          this.isDragging = true;
          this.dispatchCursorEvent(6, pos.x, pos.y, currentHits); // CursorBeginDrag
        }
        this.dispatchCursorEvent(7, pos.x, pos.y, currentHits); // CursorDrag
      }

      this.hoveredControls = currentHits;
    };

    const handleMouseDown = (e) => {
      const pos = getCanvasPos(e);
      this.isMouseDown = true;
      this.isDragging = false;

      const hits = this.hitTestControls(pos.x, pos.y);
      this.dispatchCursorEvent(2, pos.x, pos.y, hits); // CursorDown

      if (e.button === 0) {
        // Left Mouse Button -> KeyboardNormalAttackKeyDown
        this.dispatchKeyEvent([11]);
      } else if (e.button === 2) {
        // Right Mouse Button -> KeyboardSprintKeyDown
        this.dispatchKeyEvent([13]);
      }
    };

    const handleMouseUp = (e) => {
      const pos = getCanvasPos(e);
      const hits = this.hitTestControls(pos.x, pos.y);

      if (this.isDragging) {
        this.dispatchCursorEvent(8, pos.x, pos.y, hits); // CursorEndDrag
      }
      this.dispatchCursorEvent(3, pos.x, pos.y, hits); // CursorUp

      if (e.button === 0) {
        this.dispatchKeyEvent([12]); // KeyboardNormalAttackKeyUp
      } else if (e.button === 2) {
        this.dispatchKeyEvent([14]); // KeyboardSprintKeyUp
      }

      this.isMouseDown = false;
      this.isDragging = false;
    };

    const handleClick = (e) => {
      const pos = getCanvasPos(e);
      const hits = this.hitTestControls(pos.x, pos.y);
      this.dispatchCursorEvent(1, pos.x, pos.y, hits); // CursorClick
    };

    const handleKeyDown = (e) => {
      const targetTag = e.target && e.target.tagName;
      if (targetTag === 'TEXTAREA' || targetTag === 'INPUT' || (e.target && e.target.isContentEditable)) {
        return;
      }
      if (document.activeElement && (
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.isContentEditable
      )) {
        return;
      }

      const keyMapDown = {
        'KeyW': [1, 36], // KeyboardMoveForwardKeyDown, KeyboardCraftspersonKey36Down (Up)
        'ArrowUp': [1, 36],
        'KeyA': [3, 38], // KeyboardMoveLeftKeyDown, KeyboardCraftspersonKey38Down (Left)
        'ArrowLeft': [3, 38],
        'KeyS': [5, 37], // KeyboardMoveBackwardKeyDown, KeyboardCraftspersonKey37Down (Down)
        'ArrowDown': [5, 37],
        'KeyD': [7, 39], // KeyboardMoveRightKeyDown, KeyboardCraftspersonKey39Down (Right)
        'ArrowRight': [7, 39],
        'Space': [9], // KeyboardJumpKeyDown
        'KeyF': [15], // KeyboardInteractKeyDown
        'KeyX': [17], // KeyboardDropKeyDown
        'KeyE': [19], // KeyboardCharacterSkill1KeyDown
        'KeyQ': [21], // KeyboardCharacterSkill2KeyDown
        'KeyR': [23], // KeyboardCharacterSkill3KeyDown
        'KeyT': [25], // KeyboardCharacterSkill4KeyDown
        'Tab': [27], // KeyboardOpenShortcutWheelKeyDown
        'ControlLeft': [29], // KeyboardSwitchToWalkOrRunKeyDown
        'ControlRight': [40], // KeyboardCraftspersonKey40Down
        'ShiftLeft': [71, 13], // KeyboardCraftspersonKey41Down (71) first, then KeyboardSprintKeyDown (13)
        'ShiftRight': [71, 13],
        'Digit1': [31], 'Digit2': [32], 'Digit3': [33], 'Digit4': [34], 'Digit5': [35],
        'Digit6': [36], 'Digit7': [37], 'Digit8': [38], 'Digit9': [39], 'Digit0': [40]
      };

      const codes = keyMapDown[e.code];
      if (codes && codes.length > 0) {
        this.dispatchKeyEvent(codes);
      }
    };

    const handleKeyUp = (e) => {
      const targetTag = e.target && e.target.tagName;
      if (targetTag === 'TEXTAREA' || targetTag === 'INPUT' || (e.target && e.target.isContentEditable)) {
        return;
      }
      if (document.activeElement && (
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.isContentEditable
      )) {
        return;
      }

      const keyMapUp = {
        'KeyW': [2, 136],
        'ArrowUp': [2, 136],
        'KeyA': [4, 138],
        'ArrowLeft': [4, 138],
        'KeyS': [6, 137],
        'ArrowDown': [6, 137],
        'KeyD': [8, 139],
        'ArrowRight': [8, 139],
        'Space': [10],
        'KeyF': [16],
        'KeyX': [18],
        'KeyE': [20],
        'KeyQ': [22],
        'KeyR': [24],
        'KeyT': [26],
        'Tab': [28],
        'ControlLeft': [30],
        'ControlRight': [140],
        'ShiftLeft': [14],
        'ShiftRight': [14]
      };

      const codes = keyMapUp[e.code];
      if (codes && codes.length > 0) {
        this.dispatchKeyEvent(codes);
      }
    };

    this.canvas.addEventListener('mousemove', handleMouseMove);
    this.canvas.addEventListener('mousedown', handleMouseDown);
    this.canvas.addEventListener('mouseup', handleMouseUp);
    this.canvas.addEventListener('click', handleClick);
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    this.cleanupListeners = () => {
      this.canvas.removeEventListener('mousemove', handleMouseMove);
      this.canvas.removeEventListener('mousedown', handleMouseDown);
      this.canvas.removeEventListener('mouseup', handleMouseUp);
      this.canvas.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }

  // Hit test for controls from top to bottom
  hitTestControls(x, y, control = this.rootControl, parentBounds = null) {
    if (!control.visible || !control.alive) return [];
    const hits = [];
    const bounds = control.getScreenBounds(this.width, this.height, parentBounds);
    const inside = x >= bounds.left && x <= bounds.right && y >= bounds.bottom && y <= bounds.top;

    if (control.children) {
      // Check children in reverse order (topmost first)
      for (let i = control.children.length - 1; i >= 0; i--) {
        const childHits = this.hitTestControls(x, y, control.children[i], bounds);
        hits.push(...childHits);
      }
    }

    if (inside && (control.raycastTarget || Object.keys(control.cursorListeners).length > 0)) {
      hits.push(control);
    }
    return hits;
  }

  dispatchLuaCursorCallback(callbackId, x, y) {
    if (!this.L) return;
    try {
      lua.lua_getglobal(this.L, to_luastring('_M_DispatchCursorEvent'));
      lua.lua_pushinteger(this.L, callbackId);
      lua.lua_pushnumber(this.L, x);
      lua.lua_pushnumber(this.L, y);
      const res = lua.lua_pcall(this.L, 3, 0, 0);
      if (res !== lua.LUA_OK) {
        const err = getLuaStackString(this.L, -1);
        lua.lua_pop(this.L, 1);
        this.log(`[Lua Event Error]: ${err}`, 'error');
      }
    } catch (e) {
      this.log(`[Lua Event Error]: ${e && (e.message || String(e))}`, 'error');
    }
  }

  dispatchLuaKeyCallback(callbackId) {
    if (!this.L) return false;
    try {
      lua.lua_getglobal(this.L, to_luastring('_M_DispatchKeyEvent'));
      lua.lua_pushinteger(this.L, callbackId);
      const res = lua.lua_pcall(this.L, 1, 1, 0);
      if (res !== lua.LUA_OK) {
        const err = getLuaStackString(this.L, -1);
        lua.lua_pop(this.L, 1);
        this.log(`[Lua Key Event Error]: ${err}`, 'error');
        return false;
      }
      const handled = lua.lua_toboolean(this.L, -1);
      lua.lua_pop(this.L, 1);
      return !!handled;
    } catch (e) {
      this.log(`[Lua Key Event Error]: ${e && (e.message || String(e))}`, 'error');
      return false;
    }
  }

  dispatchCursorEvent(eventType, x, y, targetControls = null) {
    if (!this.isRunning || this.isPaused) return;
    const now = performance.now();

    // Independent trailing cooldown gates per event type (instant initial press, suppress rapid spam)
    if (eventType === 1) { // CursorClick
      if (now - this.lastClickTime < 60) return;
      this.lastClickTime = now;
    } else if (eventType === 2) { // CursorDown
      if (now - this.lastDownTime < 60) return;
      this.lastDownTime = now;
    }

    const controls = targetControls || this.hitTestControls(x, y);

    let handled = false;
    for (const ctrl of controls) {
      const listeners = ctrl.cursorListeners[eventType];
      if (listeners && listeners.length > 0) {
        for (const cbId of listeners) {
          this.dispatchLuaCursorCallback(cbId, x, y);
          handled = true;
        }
      }
      // Stop bubbling if handled on topmost interactive control or passthrough disabled
      if (handled || ctrl.disableCursorEventPassthrough) {
        break;
      }
    }
  }

  dispatchKeyEvent(eventTypes) {
    if (!this.isRunning || this.isPaused) return;
    const codes = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
    const now = performance.now();

    // Gate mouse-attack key down (code 11) to avoid duplicate spamming
    if (codes.includes(11)) {
      if (now - this.lastAttackKeyTime < 60) return;
      this.lastAttackKeyTime = now;
    }

    const queue = [this.rootControl];

    while (queue.length > 0) {
      const ctrl = queue.shift();
      let handled = false;

      for (const eventType of codes) {
        if (ctrl.keyListeners && ctrl.keyListeners[eventType]) {
          for (const cbId of ctrl.keyListeners[eventType]) {
            if (this.dispatchLuaKeyCallback(cbId)) {
              handled = true;
              break;
            }
          }
        }
        if (handled) break;
      }

      if (handled || ctrl.disableKeyEventPassthrough) {
        continue;
      }

      if (ctrl.children) {
        queue.push(...ctrl.children);
      }
    }
  }

  // Build the Lua environment with Fengari
  setupLuaEnvironment() {
    this.L = lauxlib.luaL_newstate();
    lualib.luaL_openlibs(this.L);
    lauxlib.luaL_requiref(this.L, to_luastring('js'), interop.luaopen_js, 1);
    lua.lua_pop(this.L, 1);

    // Make simulator instance accessible to Lua bridges
    window.__miliastra_sim = this;

    const bootstrapLua = `
      local js = require "js"
      local sim = js.global.__miliastra_sim

      -- Polyfill math.pow for Lua 5.3+ environments (Fengari)
      math.pow = math.pow or function(x, y) return x ^ y end

      -- Internal Lua Callback Registry
      _M_CursorCallbacks = {}
      _M_KeyCallbacks = {}
      _M_NextCallbackId = 1

      function _M_DispatchCursorEvent(callbackId, cursorX, cursorY)
        local cb = _M_CursorCallbacks[callbackId]
        if cb then
          local eventData = {
            dragging = false,
            touchId = -1,
            GetUIPos = function(self)
              return cursorX, cursorY
            end,
            GetPressUIPos = function(self)
              return cursorX, cursorY
            end,
            GetUIPosDelta = function(self)
              return 0, 0
            end,
            uipos = { x = cursorX, y = cursorY },
            cursorX = cursorX,
            cursorY = cursorY
          }
          local status, err = pcall(cb, eventData)
          if not status then
            sim:log("[Lua Event Error]: " .. tostring(err), "error")
          end
        end
      end

      function _M_DispatchKeyEvent(callbackId)
        local cb = _M_KeyCallbacks[callbackId]
        if cb then
          local status, res = pcall(cb)
          if not status then
            sim:log("[Lua Key Event Error]: " .. tostring(res), "error")
            return false
          end
          return res == true
        end
        return false
      end

      -- 1. Miliastra Color Library
      Color = {}
      Color.__index = Color

      local ColorValueMeta = {
        __tostring = function(self)
          return string.format("Color(%d, %d, %d, %d)", math.floor(self.r or 255), math.floor(self.g or 255), math.floor(self.b or 255), math.floor(self.a or 255))
        end,
        __eq = function(a, b)
          if type(a) ~= "table" or type(b) ~= "table" then return false end
          return (a.r or 255) == (b.r or 255) and (a.g or 255) == (b.g or 255) and (a.b or 255) == (b.b or 255) and (a.a or 255) == (b.a or 255)
        end
      }

      function Color.FromRGBA(r, g, b, a)
        local val = {
          r = tonumber(r) or 255,
          g = tonumber(g) or 255,
          b = tonumber(b) or 255,
          a = a ~= nil and tonumber(a) or 255,
          __isColor = true
        }
        setmetatable(val, ColorValueMeta)
        return val
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
      Color.toRGBA = Color.ToRGBA
      Color.fromRGB = Color.FromRGB
      Color.fromRGBA = Color.FromRGBA

      setmetatable(Color, {
        __call = function(self, r, g, b, a)
          return Color.FromRGBA(r, g, b, a)
        end
      })

      -- Miliastra Vector3 Library
      Vector3 = {}
      local Vector3Meta = {
        __index = {
          Magnitude = function(self)
            return math.sqrt(self.x * self.x + self.y * self.y + self.z * self.z)
          end,
          magnitude = function(self)
            return self:Magnitude()
          end,
          Normalize = function(self)
            local mag = self:Magnitude()
            if mag > 0.00001 then
              return Vector3.new(self.x / mag, self.y / mag, self.z / mag)
            end
            return Vector3.new(0, 0, 0)
          end,
          normalize = function(self)
            return self:Normalize()
          end,
          Dot = function(self, other)
            return self.x * (other.x or 0) + self.y * (other.y or 0) + self.z * (other.z or 0)
          end,
          dot = function(self, other)
            return self:Dot(other)
          end,
          Cross = function(self, other)
            return Vector3.new(
              self.y * (other.z or 0) - self.z * (other.y or 0),
              self.z * (other.x or 0) - self.x * (other.z or 0),
              self.x * (other.y or 0) - self.y * (other.x or 0)
            )
          end,
          cross = function(self, other)
            return self:Cross(other)
          end,
          ToString = function(self)
            return string.format("Vector3(%.2f, %.2f, %.2f)", self.x, self.y, self.z)
          end,
          toString = function(self)
            return self:ToString()
          end
        },
        __add = function(a, b)
          return Vector3.new((a.x or 0) + (b.x or 0), (a.y or 0) + (b.y or 0), (a.z or 0) + (b.z or 0))
        end,
        __sub = function(a, b)
          return Vector3.new((a.x or 0) - (b.x or 0), (a.y or 0) - (b.y or 0), (a.z or 0) - (b.z or 0))
        end,
        __mul = function(a, b)
          if type(b) == "number" then return Vector3.new(a.x * b, a.y * b, a.z * b) end
          if type(a) == "number" then return Vector3.new(a * b.x, a * b.y, a * b.z) end
          return Vector3.new(a.x * (b.x or 1), a.y * (b.y or 1), a.z * (b.z or 1))
        end,
        __div = function(a, b)
          if type(b) == "number" then return Vector3.new(a.x / b, a.y / b, a.z / b) end
          return Vector3.new(a.x / (b.x or 1), a.y / (b.y or 1), a.z / (b.z or 1))
        end,
        __unm = function(self)
          return Vector3.new(-self.x, -self.y, -self.z)
        end,
        __tostring = function(self)
          return string.format("Vector3(%.2f, %.2f, %.2f)", self.x, self.y, self.z)
        end
      }

      function Vector3.new(x, y, z)
        local v = { x = tonumber(x) or 0, y = tonumber(y) or 0, z = tonumber(z) or 0 }
        setmetatable(v, Vector3Meta)
        return v
      end

      Vector3.zero = Vector3.new(0, 0, 0)
      Vector3.one = Vector3.new(1, 1, 1)
      Vector3.up = Vector3.new(0, 1, 0)
      Vector3.right = Vector3.new(1, 0, 0)
      Vector3.forward = Vector3.new(0, 0, 1)

      setmetatable(Vector3, {
        __call = function(self, x, y, z)
          return Vector3.new(x, y, z)
        end
      })

      -- 2. Miliastra Comprehensive Enum Definitions
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
          Basic = 0,
          Simple = 0,
          Sliced = 1,
          Tiled = 2,
          Filled = 3,
          Stretch = 4
        },
        ImageFillType = {
          Unused = 0,
          Horizontal = 1,
          Vertical = 2,
          Radial90 = 3,
          Radial180 = 4,
          Radial360 = 5
        },
        ImageFillHorizontalType = {
          Left = 0,
          Right = 1
        },
        ImageFillVerticalType = {
          Bottom = 0,
          Top = 1
        },
        ImageFillRadial90Type = {
          BottomLeft = 0,
          TopLeft = 1,
          TopRight = 2,
          BottomRight = 3
        },
        ImageFillRadialType = {
          Bottom = 0,
          Top = 1,
          Left = 2,
          Right = 3
        },
        ImageMaskSoftEdgeMode = {
          Pixel = 0,
          Absolute = 0,
          Percentage = 1
        },
        ScrollDirection = {
          Horizontal = 0,
          Vertical = 1
        },
        ScrollLayoutConstraint = {
          AutoWrap = 0,
          Fixed = 1
        },
        ScrollAlignType = {
          Top = 0,
          Center = 1,
          Bottom = 2,
          Left = 0,
          Right = 2
        },
        UIAnimationLayer = {
          BelowAllControls = 0,
          AboveAllControls = 1
        },
        ControllerNavigationDir = {
          Up = 0,
          Down = 1,
          Left = 2,
          Right = 3
        },
        ControllerNavigationMode = {
          None = 0,
          Automatic = 1,
          Specified = 2
        },
        ControllerNavigationEventType = {
          NavigateIn = 0,
          NavigateOut = 1,
          ConfirmDown = 2,
          ConfirmUp = 3,
          CancelDown = 4,
          CancelUp = 5
        },
        KeyboardKeyCode = {
          None = 0,
          Space = 32,
          KeyW = 87,
          KeyA = 65,
          KeyS = 83,
          KeyD = 68,
          KeyE = 69,
          KeyF = 70,
          KeyQ = 81,
          KeyR = 82
        },
        ControllerKeyCode = {
          None = 0,
          ButtonSouth = 1,
          ButtonEast = 2,
          ButtonWest = 3,
          ButtonNorth = 4,
          LeftShoulder = 5,
          RightShoulder = 6
        },
        StageMode = {
          Beyond = 1,
          Classic = 2
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
          KeyboardCraftspersonKey1Down = 31,
          KeyboardCraftspersonKey2Down = 32,
          KeyboardCraftspersonKey3Down = 33,
          KeyboardCraftspersonKey4Down = 34,
          KeyboardCraftspersonKey5Down = 35,
          KeyboardCraftspersonKey6Down = 36,
          KeyboardCraftspersonKey7Down = 37,
          KeyboardCraftspersonKey8Down = 38,
          KeyboardCraftspersonKey9Down = 39,
          KeyboardCraftspersonKey10Down = 40,
          KeyboardCraftspersonKey11Down = 41,
          KeyboardCraftspersonKey12Down = 42,
          KeyboardCraftspersonKey13Down = 43,
          KeyboardCraftspersonKey14Down = 44,
          KeyboardCraftspersonKey15Down = 45,
          KeyboardCraftspersonKey16Down = 46,
          KeyboardCraftspersonKey17Down = 47,
          KeyboardCraftspersonKey18Down = 48,
          KeyboardCraftspersonKey19Down = 49,
          KeyboardCraftspersonKey20Down = 50,
          KeyboardCraftspersonKey21Down = 51,
          KeyboardCraftspersonKey22Down = 52,
          KeyboardCraftspersonKey23Down = 53,
          KeyboardCraftspersonKey24Down = 54,
          KeyboardCraftspersonKey25Down = 55,
          KeyboardCraftspersonKey26Down = 56,
          KeyboardCraftspersonKey27Down = 57,
          KeyboardCraftspersonKey28Down = 58,
          KeyboardCraftspersonKey29Down = 59,
          KeyboardCraftspersonKey30Down = 60,
          KeyboardCraftspersonKey31Down = 61,
          KeyboardCraftspersonKey32Down = 62,
          KeyboardCraftspersonKey33Down = 63,
          KeyboardCraftspersonKey34Down = 64,
          KeyboardCraftspersonKey35Down = 65,
          KeyboardCraftspersonKey36Down = 36,
          KeyboardCraftspersonKey37Down = 37,
          KeyboardCraftspersonKey38Down = 38,
          KeyboardCraftspersonKey39Down = 39,
          KeyboardCraftspersonKey40Down = 40,
          KeyboardCraftspersonKey41Down = 71,
          KeyboardCraftspersonKey42Down = 72,
          KeyboardCraftspersonKey43Down = 73,
          ControllerJumpKeyDown = 80,
          ControllerJumpKeyUp = 81,
          ControllerNormalAttackKeyDown = 82,
          ControllerNormalAttackKeyUp = 83,
          ControllerInteractKeyDown = 84,
          ControllerInteractKeyUp = 85,
          ControllerSprintKeyDown = 86,
          ControllerSprintKeyUp = 87,
          ControllerCharacterSkill1KeyDown = 88,
          ControllerCharacterSkill1KeyUp = 89,
          ControllerCharacterSkill2KeyDown = 90,
          ControllerCharacterSkill2KeyUp = 91,
          ControllerCharacterSkill3KeyDown = 92,
          ControllerCharacterSkill4KeyDown = 93
        },
        Device = {
          KeyboardAndMouse = 1,
          Controller = 2,
          Mobile = 3,
          MobileController = 4
        },
        CustomVariableEntityType = {
          Level = 1,
          PlayerSelf = 2,
          AvatarSelf = 3
        },
        LanguageType = {
          LanguageEng = 1,
          LanguageChs = 2,
          LanguageCht = 3,
          LanguageJpn = 4,
          LanguageKor = 5,
          LanguageDeu = 6,
          LanguageFra = 7,
          LanguageSpa = 8,
          LanguagePor = 9,
          LanguageRus = 10,
          LanguageIta = 11,
          LanguageInd = 12,
          LanguageTha = 13,
          LanguageTur = 14,
          LanguageVie = 15,
          LanguageNone = 0
        },
        ParamType = {
          Bool = 1, BoolList = 2, Int = 3, IntList = 4,
          Float = 5, FloatList = 6, String = 7, StringList = 8,
          Vector3 = 9, Vector3List = 10, ConfigId = 11, ConfigIdList = 12,
          Entity = 13, EntityList = 14, Guid = 15, GuidList = 16,
          PrefabId = 17, PrefabIdList = 18
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

      -- 3. Print / Printerr redirection
      local orig_print = print
      function print(...)
        local parts = {...}
        local str = ""
        for i, p in ipairs(parts) do
          str = str .. (i > 1 and "  " or "") .. tostring(p)
        end
        sim:log(str, "info")
      end

      function printerr(...)
        local parts = {...}
        local str = ""
        for i, p in ipairs(parts) do
          str = str .. (i > 1 and "  " or "") .. tostring(p)
        end
        sim:log("[ERR] " .. str, "error")
      end

      -- 4. Wrap JS Control in Lua Metatable (Cached + Pre-allocated Method Table for 60FPS Zero-Allocation Calls)
      local _ControlWrapCache = {}
      local _ControlScripts = {}
      local _AllMountedScripts = {}
      local wrapControl

      local _ControlMethods = {
        SetAnchorMin = function(self, x, y)
          local raw = self._raw
          raw.anchorMinX = tonumber(x) or 0
          raw.anchorMinY = tonumber(y) or 0
        end,
        SetAnchorMax = function(self, x, y)
          local raw = self._raw
          raw.anchorMaxX = tonumber(x) or 0
          raw.anchorMaxY = tonumber(y) or 0
        end,
        SetPivot = function(self, x, y)
          local raw = self._raw
          raw.pivotX = tonumber(x) or 0
          raw.pivotY = tonumber(y) or 0
        end,
        SetAnchoredPosition = function(self, x, y)
          local raw = self._raw
          raw.anchoredPositionX = tonumber(x) or 0
          raw.anchoredPositionY = tonumber(y) or 0
        end,
        SetSizeDelta = function(self, w, h)
          local raw = self._raw
          raw.sizeDeltaX = tonumber(w) or 0
          raw.sizeDeltaY = tonumber(h) or 0
        end,
        SetLocalScale = function(self, x, y, z)
          self._raw:SetLocalScale(x, y, z)
        end,
        SetLocalRotation = function(self, x, y, z)
          self._raw:SetLocalRotation(x, y, z)
        end,
        SetActive = function(self, active)
          local raw = self._raw
          local wasActive = raw.active ~= false
          local nextActive = not not active
          raw:SetActive(nextActive)
          if wasActive ~= nextActive then
            local scripts = _ControlScripts[tostring(raw.id)]
            if scripts then
              for _, s in ipairs(scripts) do
                if s.alive and s._env then
                  local hookName = nextActive and "OnEnable" or "OnDisable"
                  local fn = rawget(s._env, hookName)
                  if type(fn) == "function" then
                    local ok, err = pcall(fn)
                    if not ok then
                      printerr("[" .. tostring(s.path) .. " " .. hookName .. " Error]: " .. tostring(err))
                    end
                  end
                end
              end
            end
          end
        end,
        SetImage = function(self, src, resId)
          self._raw:SetImage(src, resId)
        end,
        SetVisible = function(self, vis)
          self._raw.visible = not not vis
        end,
        SetInteractable = function(self, inter)
          self._raw.interactable = not not inter
        end,
        SetSoftEdgeWidth = function(self, w, h)
          local raw = self._raw
          raw.softEdgeWidthX = tonumber(w) or 0
          raw.softEdgeWidthY = tonumber(h) or 0
        end,
        SetAsLastSibling = function(self)
          self._raw:SetAsLastSibling()
          return true
        end,
        SetAsFirstSibling = function(self)
          self._raw:SetAsFirstSibling()
          return true
        end,
        SetSiblingIndex = function(self, index)
          self._raw:SetSiblingIndex(index)
          return true
        end,
        GetSiblingIndex = function(self)
          return self._raw:GetSiblingIndex()
        end,
        Destroy = function(self)
          local raw = self._raw
          local scripts = _ControlScripts[tostring(raw.id)]
          if scripts then
            for _, s in ipairs(scripts) do
              if s.alive and s._env then
                local onDis = rawget(s._env, "OnDisable")
                if type(onDis) == "function" then pcall(onDis) end
                local onDes = rawget(s._env, "OnDestroy")
                if type(onDes) == "function" then pcall(onDes) end
              end
              s.alive = false
            end
          end
          raw:Destroy()
        end,
        GetParent = function(self)
          return wrapControl(self._raw:GetParent())
        end,
        GetControl = function(self)
          return self
        end,
        GetScript = function(self, scriptPrefabIndex)
          local targetIdx = tonumber(scriptPrefabIndex)
          local scripts = _ControlScripts[tostring(self._raw.id)]
          if scripts and targetIdx then
            for _, s in ipairs(scripts) do
              if s.prefabIndex == targetIdx or s.id == targetIdx then
                return s
              end
            end
          end
          return nil
        end,
        GetScriptByPath = function(self, path)
          if not path then return nil end
          local clean = tostring(path):gsub("%.lua$", "")
          local lower = string.lower(clean)
          local scripts = _ControlScripts[tostring(self._raw.id)]
          if scripts then
            for _, s in ipairs(scripts) do
              if s.path == clean or string.lower(s.path) == lower then
                return s
              end
              if s._aliases and (s._aliases[clean] or s._aliases[lower]) then
                return s
              end
            end
          end
          return nil
        end,
        GetScripts = function(self)
          local scripts = _ControlScripts[tostring(self._raw.id)]
          local out = {}
          if scripts then
            for i = 1, #scripts do
              out[i] = scripts[i]
            end
          end
          return out
        end,
        GetAnchorMin = function(self)
          local raw = self._raw
          return raw.anchorMinX or 0, raw.anchorMinY or 0
        end,
        GetAnchorMax = function(self)
          local raw = self._raw
          return raw.anchorMaxX or 0, raw.anchorMaxY or 0
        end,
        GetPivot = function(self)
          local raw = self._raw
          return raw.pivotX or 0.5, raw.pivotY or 0.5
        end,
        GetAnchoredPosition = function(self)
          local raw = self._raw
          return raw.anchoredPositionX or 0, raw.anchoredPositionY or 0
        end,
        GetSizeDelta = function(self)
          local raw = self._raw
          return raw.sizeDeltaX or 0, raw.sizeDeltaY or 0
        end,
        GetLocalScale = function(self)
          local raw = self._raw
          return raw.localScaleX or 1, raw.localScaleY or 1, raw.localScaleZ or 1
        end,
        GetLocalRotation = function(self)
          local raw = self._raw
          return raw.localRotationX or 0, raw.localRotationY or 0, raw.localRotationZ or 0
        end,
        AddCursorEventListener = function(self, eventType, luaCallback)
          local id = _M_NextCallbackId
          _M_NextCallbackId = _M_NextCallbackId + 1
          _M_CursorCallbacks[id] = luaCallback
          self._raw:AddCursorEventListener(eventType, id)
        end,
        RemoveCursorEventListener = function(self, eventType, luaCallback)
          self._raw:RemoveCursorEventListeners(eventType)
        end,
        RemoveCursorEventListeners = function(self, eventType)
          self._raw:RemoveCursorEventListeners(eventType)
        end,
        RemoveAllCursorEventListeners = function(self)
          self._raw:RemoveAllCursorEventListeners()
        end,
        SimulateCursorClick = function(self)
          local bounds = self._raw:getScreenBounds(sim.width, sim.height)
          local cx = (bounds.left + bounds.right) * 0.5
          local cy = (bounds.bottom + bounds.top) * 0.5
          sim:dispatchCursorEvent(2, cx, cy, { self._raw })
          sim:dispatchCursorEvent(3, cx, cy, { self._raw })
          sim:dispatchCursorEvent(1, cx, cy, { self._raw })
        end,
        AddKeyEventListener = function(self, keyType, luaCallback)
          local id = _M_NextCallbackId
          _M_NextCallbackId = _M_NextCallbackId + 1
          _M_KeyCallbacks[id] = luaCallback
          self._raw:AddKeyEventListener(keyType, id)
        end,
        RemoveKeyEventListener = function(self, keyType, luaCallback)
          self._raw:RemoveKeyEventListeners(keyType)
        end,
        RemoveKeyEventListeners = function(self, keyType)
          self._raw:RemoveKeyEventListeners(keyType)
        end,
        RemoveAllKeyEventListeners = function(self)
          self._raw:RemoveAllKeyEventListeners()
        end,
        AddNavigationEventListener = function(self, eventType, luaCallback)
        end,
        RemoveNavigationEventListener = function(self, eventType, luaCallback)
        end,
        RemoveNavigationEventListeners = function(self, eventType)
        end,
        RemoveAllNavigationEventListeners = function(self)
        end,
        SetControllerNavigation = function(self, navDir, navMode, navTarget)
        end,
        GetControllerNavigation = function(self, navDir)
          return 0, nil
        end,
        SetFillUnused = function(self)
          self._raw.fillType = 0
        end,
        SetFillHorizontal = function(self, fillHorizType, fillAmount)
          self._raw.fillType = 1
          self._raw.fillHorizontalType = tonumber(fillHorizType) or 0
          self._raw.fillAmount = tonumber(fillAmount) or 1
        end,
        SetFillVertical = function(self, fillVertType, fillAmount)
          self._raw.fillType = 2
          self._raw.fillVerticalType = tonumber(fillVertType) or 0
          self._raw.fillAmount = tonumber(fillAmount) or 1
        end,
        SetFillRadial90 = function(self, fillRad90Type, fillAmount)
          self._raw.fillType = 3
          self._raw.fillRadial90Type = tonumber(fillRad90Type) or 0
          self._raw.fillAmount = tonumber(fillAmount) or 1
        end,
        SetFillRadial180 = function(self, fillRadType, fillAmount)
          self._raw.fillType = 4
          self._raw.fillRadialType = tonumber(fillRadType) or 0
          self._raw.fillAmount = tonumber(fillAmount) or 1
        end,
        SetFillRadial360 = function(self, fillRadType, fillAmount)
          self._raw.fillType = 5
          self._raw.fillRadialType = tonumber(fillRadType) or 0
          self._raw.fillAmount = tonumber(fillAmount) or 1
        end,
        RefreshItems = function(self, itemCount, callback)
          local count = math.max(0, math.floor(tonumber(itemCount) or 0))
          self._raw.itemCount = count
          if callback then
            for idx = 0, count - 1 do
              local itemCtrl = sim:createControl(self._raw.itemPrefabIndex or 1073741852, self._raw)
              callback(wrapControl(itemCtrl), idx)
            end
          end
        end,
        GetItemIndex = function(self, control)
          return 0
        end,
        GetItemSize = function(self)
          return 100, 100
        end,
        GetItemSpacing = function(self)
          return 8, 8
        end,
        GetPadding = function(self)
          return 8, 8, 8, 8
        end,
        ScrollToItemAt = function(self, index, scrollAlignType)
        end,
        GetContentLength = function(self)
          return (self._raw.itemCount or 0) * 108
        end,
        PlayAnimation = function(self)
        end,
        StopAnimation = function(self)
        end,
        GetChildren = function(self)
          local jsChildren = self._raw:GetChildren()
          local t = {}
          for i = 0, jsChildren.length - 1 do
            table.insert(t, wrapControl(jsChildren[i]))
          end
          return t
        end,
        FindChild = function(self, path)
          return wrapControl(self._raw:FindChild(path))
        end,
        GetChild = function(self, name)
          return wrapControl(self._raw:GetChild(name))
        end
      }

      local _ControlGetters = {
        name = function(jsCtrl) return jsCtrl.name end,
        text = function(jsCtrl) return jsCtrl.text end,
        fontSize = function(jsCtrl) return jsCtrl.fontSize end,
        fontColor = function(jsCtrl)
          local fc = jsCtrl.fontColor
          return fc and Color.FromRGBA(fc.r, fc.g, fc.b, fc.a) or Color.FromRGBA(255, 255, 255, 255)
        end,
        bgColor = function(jsCtrl)
          local bc = jsCtrl.bgColor
          return bc and Color.FromRGBA(bc.r, bc.g, bc.b, bc.a) or Color.FromRGBA(0, 0, 0, 0)
        end,
        imageColor = function(jsCtrl)
          local ic = jsCtrl.imageColor
          return ic and Color.FromRGBA(ic.r, ic.g, ic.b, ic.a) or Color.FromRGBA(255, 255, 255, 255)
        end,
        imageType = function(jsCtrl) return jsCtrl.imageType end,
        resourceId = function(jsCtrl) return jsCtrl.resourceId end,
        imageId = function(jsCtrl) return jsCtrl.resourceId end,
        imageSource = function(jsCtrl) return jsCtrl.imageSource or 1 end,
        anchoredPositionX = function(jsCtrl) return jsCtrl.anchoredPositionX end,
        anchoredPositionY = function(jsCtrl) return jsCtrl.anchoredPositionY end,
        sizeDeltaX = function(jsCtrl) return jsCtrl.sizeDeltaX end,
        sizeDeltaY = function(jsCtrl) return jsCtrl.sizeDeltaY end,
        localScaleX = function(jsCtrl) return jsCtrl.localScaleX or 1 end,
        localScaleY = function(jsCtrl) return jsCtrl.localScaleY or 1 end,
        localScaleZ = function(jsCtrl) return jsCtrl.localScaleZ or 1 end,
        localRotationX = function(jsCtrl) return jsCtrl.localRotationX or 0 end,
        localRotationY = function(jsCtrl) return jsCtrl.localRotationY or 0 end,
        localRotationZ = function(jsCtrl) return jsCtrl.localRotationZ or 0 end,
        anchorMinX = function(jsCtrl) return jsCtrl.anchorMinX or 0 end,
        anchorMinY = function(jsCtrl) return jsCtrl.anchorMinY or 0 end,
        anchorMaxX = function(jsCtrl) return jsCtrl.anchorMaxX or 0 end,
        anchorMaxY = function(jsCtrl) return jsCtrl.anchorMaxY or 0 end,
        pivotX = function(jsCtrl) return jsCtrl.pivotX or 0.5 end,
        pivotY = function(jsCtrl) return jsCtrl.pivotY or 0.5 end,
        visible = function(jsCtrl) return jsCtrl.visible end,
        alive = function(jsCtrl) return jsCtrl.alive end,
        active = function(jsCtrl) return jsCtrl.active ~= false end,
        activeInHierarchy = function(jsCtrl) return jsCtrl.active ~= false end,
        interactable = function(jsCtrl) return jsCtrl.interactable end,
        raycastTarget = function(jsCtrl) return jsCtrl.raycastTarget end,
        adaptiveFontSize = function(jsCtrl) return jsCtrl.adaptiveFontSize end,
        minimumFontSize = function(jsCtrl) return jsCtrl.minimumFontSize or 10 end,
        enableOutline = function(jsCtrl) return jsCtrl.enableOutline == true end,
        outlineColor = function(jsCtrl)
          local oc = jsCtrl.outlineColor
          return oc and Color.FromRGBA(oc.r, oc.g, oc.b, oc.a) or Color.FromRGBA(0, 0, 0, 255)
        end,
        horizontalAlignment = function(jsCtrl) return jsCtrl.horizontalAlignment end,
        verticalAlignment = function(jsCtrl) return jsCtrl.verticalAlignment end,
        prefabIndex = function(jsCtrl) return jsCtrl.templateId or jsCtrl.id end,
        id = function(jsCtrl) return jsCtrl.id end,
        parent = function(jsCtrl) return wrapControl(jsCtrl.parent) end,
        canControllerFocus = function(jsCtrl) return jsCtrl.canControllerFocus ~= false end,
        enableMask = function(jsCtrl) return jsCtrl.enableMask == true end,
        enableSoftEdge = function(jsCtrl) return jsCtrl.enableSoftEdge == true end,
        softEdgeMode = function(jsCtrl) return jsCtrl.softEdgeMode or 1 end,
        softEdgeWidthX = function(jsCtrl) return jsCtrl.softEdgeWidthX or 0 end,
        softEdgeWidthY = function(jsCtrl) return jsCtrl.softEdgeWidthY or 0 end,
        horizontalSoftRange = function(jsCtrl) return jsCtrl.horizontalSoftRange or 0 end,
        verticalSoftRange = function(jsCtrl) return jsCtrl.verticalSoftRange or 0 end,
        reverseMaskArea = function(jsCtrl) return jsCtrl.reverseMaskArea == true end,
        fillType = function(jsCtrl) return jsCtrl.fillType or 0 end,
        fillHorizontalType = function(jsCtrl) return jsCtrl.fillHorizontalType or 0 end,
        fillVerticalType = function(jsCtrl) return jsCtrl.fillVerticalType or 0 end,
        fillRadial90Type = function(jsCtrl) return jsCtrl.fillRadial90Type or 0 end,
        fillRadialType = function(jsCtrl) return jsCtrl.fillRadialType or 0 end,
        fillAmount = function(jsCtrl) return jsCtrl.fillAmount ~= nil and jsCtrl.fillAmount or 1 end,
        showScrollBar = function(jsCtrl) return jsCtrl.showScrollBar ~= false end,
        clickAudioId = function(jsCtrl) return jsCtrl.clickAudioId or 0 end,
        itemCount = function(jsCtrl) return jsCtrl.itemCount or 0 end,
        itemPrefabIndex = function(jsCtrl) return jsCtrl.itemPrefabIndex or 1073741852 end,
        scrollDirection = function(jsCtrl) return jsCtrl.scrollDirection or 1 end,
        layoutConstraint = function(jsCtrl) return jsCtrl.layoutConstraint or 0 end,
        layoutConstraintFixedCount = function(jsCtrl) return jsCtrl.layoutConstraintFixedCount or 0 end,
        scrollProgress = function(jsCtrl) return jsCtrl.scrollProgress or 0 end,
        isolateNavigation = function(jsCtrl) return jsCtrl.isolateNavigation == true end,
        disableKeyEventPassthrough = function(jsCtrl) return jsCtrl.disableKeyEventPassthrough == true end,
        disableCursorEventPassthrough = function(jsCtrl) return jsCtrl.disableCursorEventPassthrough == true end,
        showCursor = function(jsCtrl) return jsCtrl.showCursor ~= false end,
        animationId = function(jsCtrl) return jsCtrl.animationId or 0 end,
        playSoundEffect = function(jsCtrl) return jsCtrl.playSoundEffect ~= false end,
        layer = function(jsCtrl) return jsCtrl.layer or 0 end,
        keyboardKeyCode = function(jsCtrl) return jsCtrl.keyboardKeyCode or 0 end,
        controllerKeyCode = function(jsCtrl) return jsCtrl.controllerKeyCode or 0 end,
        referencedPrefabIndex = function(jsCtrl) return jsCtrl.referencedPrefabIndex or jsCtrl.templateId or 0 end
      }

      local _ControlSetters = {
        name = function(jsCtrl, v) jsCtrl.name = v end,
        parent = function(jsCtrl, v)
          local newParent = v and v._raw or nil
          if jsCtrl.parent and jsCtrl.parent.children then
            local idx = jsCtrl.parent.children:indexOf(jsCtrl)
            if idx ~= -1 then jsCtrl.parent.children:splice(idx, 1) end
          end
          jsCtrl.parent = newParent
          if newParent and newParent.children then
            newParent.children:push(jsCtrl)
          end
        end,
        text = function(jsCtrl, v) jsCtrl.text = tostring(v) end,
        fontSize = function(jsCtrl, v) jsCtrl.fontSize = tonumber(v) or 14 end,
        fontColor = function(jsCtrl, v)
          if type(v) == "table" then
            jsCtrl:SetFontColor(tonumber(v.r) or 255, tonumber(v.g) or 255, tonumber(v.b) or 255, v.a ~= nil and tonumber(v.a) or 255)
          else
            jsCtrl.fontColor = v
          end
        end,
        bgColor = function(jsCtrl, v)
          if type(v) == "table" then
            jsCtrl:SetBgColor(tonumber(v.r) or 0, tonumber(v.g) or 0, tonumber(v.b) or 0, v.a ~= nil and tonumber(v.a) or 0)
          else
            jsCtrl.bgColor = v
          end
        end,
        imageColor = function(jsCtrl, v)
          if type(v) == "table" then
            jsCtrl:SetImageColor(tonumber(v.r) or 255, tonumber(v.g) or 255, tonumber(v.b) or 255, v.a ~= nil and tonumber(v.a) or 255)
          else
            jsCtrl.imageColor = v
          end
        end,
        outlineColor = function(jsCtrl, v)
          if type(v) == "table" then
            jsCtrl.outlineColor = { r = tonumber(v.r) or 0, g = tonumber(v.g) or 0, b = tonumber(v.b) or 0, a = v.a ~= nil and tonumber(v.a) or 255 }
          end
        end,
        enableOutline = function(jsCtrl, v) jsCtrl.enableOutline = not not v end,
        minimumFontSize = function(jsCtrl, v) jsCtrl.minimumFontSize = tonumber(v) or 10 end,
        imageType = function(jsCtrl, v) jsCtrl.imageType = tonumber(v) or 4 end,
        resourceId = function(jsCtrl, v) jsCtrl.resourceId = tonumber(v) or v or 100001 end,
        anchoredPositionX = function(jsCtrl, v) jsCtrl.anchoredPositionX = tonumber(v) or 0 end,
        anchoredPositionY = function(jsCtrl, v) jsCtrl.anchoredPositionY = tonumber(v) or 0 end,
        sizeDeltaX = function(jsCtrl, v) jsCtrl.sizeDeltaX = tonumber(v) or 0 end,
        sizeDeltaY = function(jsCtrl, v) jsCtrl.sizeDeltaY = tonumber(v) or 0 end,
        localScaleX = function(jsCtrl, v) jsCtrl.localScaleX = tonumber(v) ~= nil and tonumber(v) or 1 end,
        localScaleY = function(jsCtrl, v) jsCtrl.localScaleY = tonumber(v) ~= nil and tonumber(v) or 1 end,
        localScaleZ = function(jsCtrl, v) jsCtrl.localScaleZ = tonumber(v) ~= nil and tonumber(v) or 1 end,
        localRotationX = function(jsCtrl, v) jsCtrl.localRotationX = tonumber(v) ~= nil and tonumber(v) or 0 end,
        localRotationY = function(jsCtrl, v) jsCtrl.localRotationY = tonumber(v) ~= nil and tonumber(v) or 0 end,
        localRotationZ = function(jsCtrl, v) jsCtrl.localRotationZ = tonumber(v) ~= nil and tonumber(v) or 0 end,
        anchorMinX = function(jsCtrl, v) jsCtrl.anchorMinX = tonumber(v) or 0 end,
        anchorMinY = function(jsCtrl, v) jsCtrl.anchorMinY = tonumber(v) or 0 end,
        anchorMaxX = function(jsCtrl, v) jsCtrl.anchorMaxX = tonumber(v) or 0 end,
        anchorMaxY = function(jsCtrl, v) jsCtrl.anchorMaxY = tonumber(v) or 0 end,
        pivotX = function(jsCtrl, v) jsCtrl.pivotX = tonumber(v) or 0.5 end,
        pivotY = function(jsCtrl, v) jsCtrl.pivotY = tonumber(v) or 0.5 end,
        visible = function(jsCtrl, v) jsCtrl.visible = not not v end,
        alive = function(jsCtrl, v) jsCtrl.alive = not not v end,
        active = function(jsCtrl, v) jsCtrl.active = not not v end,
        interactable = function(jsCtrl, v) jsCtrl.interactable = not not v end,
        raycastTarget = function(jsCtrl, v) jsCtrl.raycastTarget = not not v end,
        adaptiveFontSize = function(jsCtrl, v) jsCtrl.adaptiveFontSize = not not v end,
        horizontalAlignment = function(jsCtrl, v) jsCtrl.horizontalAlignment = tonumber(v) or 1 end,
        verticalAlignment = function(jsCtrl, v) jsCtrl.verticalAlignment = tonumber(v) or 1 end,
        canControllerFocus = function(jsCtrl, v) jsCtrl.canControllerFocus = not not v end,
        isolateNavigation = function(jsCtrl, v) jsCtrl.isolateNavigation = not not v end,
        disableCursorEventPassthrough = function(jsCtrl, v) jsCtrl.disableCursorEventPassthrough = not not v end,
        disableKeyEventPassthrough = function(jsCtrl, v) jsCtrl.disableKeyEventPassthrough = not not v end,
        showCursor = function(jsCtrl, v) jsCtrl.showCursor = not not v end,
        enableMask = function(jsCtrl, v) jsCtrl.enableMask = not not v end,
        enableSoftEdge = function(jsCtrl, v) jsCtrl.enableSoftEdge = not not v end,
        softEdgeWidthX = function(jsCtrl, v) jsCtrl.softEdgeWidthX = tonumber(v) or 0 end,
        softEdgeWidthY = function(jsCtrl, v) jsCtrl.softEdgeWidthY = tonumber(v) or 0 end,
        horizontalSoftRange = function(jsCtrl, v) jsCtrl.horizontalSoftRange = tonumber(v) or 0 end,
        verticalSoftRange = function(jsCtrl, v) jsCtrl.verticalSoftRange = tonumber(v) or 0 end,
        softEdgeMode = function(jsCtrl, v) jsCtrl.softEdgeMode = tonumber(v) or 1 end,
        reverseMaskArea = function(jsCtrl, v) jsCtrl.reverseMaskArea = not not v end,
        fillType = function(jsCtrl, v) jsCtrl.fillType = tonumber(v) or 0 end,
        fillHorizontalType = function(jsCtrl, v) jsCtrl.fillHorizontalType = tonumber(v) or 0 end,
        fillVerticalType = function(jsCtrl, v) jsCtrl.fillVerticalType = tonumber(v) or 0 end,
        fillRadial90Type = function(jsCtrl, v) jsCtrl.fillRadial90Type = tonumber(v) or 0 end,
        fillRadialType = function(jsCtrl, v) jsCtrl.fillRadialType = tonumber(v) or 0 end,
        fillAmount = function(jsCtrl, v) jsCtrl.fillAmount = tonumber(v) or 1 end,
        showScrollBar = function(jsCtrl, v) jsCtrl.showScrollBar = not not v end,
        clickAudioId = function(jsCtrl, v) jsCtrl.clickAudioId = tonumber(v) or 0 end,
        itemPrefabIndex = function(jsCtrl, v) jsCtrl.itemPrefabIndex = tonumber(v) or 1073741852 end,
        scrollProgress = function(jsCtrl, v) jsCtrl.scrollProgress = tonumber(v) or 0 end,
        animationId = function(jsCtrl, v) jsCtrl.animationId = tonumber(v) or 0 end,
        playSoundEffect = function(jsCtrl, v) jsCtrl.playSoundEffect = not not v end,
        layer = function(jsCtrl, v) jsCtrl.layer = tonumber(v) or 0 end,
        keyboardKeyCode = function(jsCtrl, v) jsCtrl.keyboardKeyCode = tonumber(v) or 0 end,
        controllerKeyCode = function(jsCtrl, v) jsCtrl.controllerKeyCode = tonumber(v) or 0 end
      }

      local _ControlMeta = {
        __index = function(t, k)
          local m = _ControlMethods[k]
          if m then return m end
          local g = _ControlGetters[k]
          if g then return g(t._raw) end
          return nil
        end,
        __newindex = function(t, k, v)
          local s = _ControlSetters[k]
          if s then
            s(t._raw, v)
          else
            rawset(t, k, v)
          end
        end,
        __tostring = function(t)
          local raw = t._raw
          if not raw then return "ClientUIBaseControl:0" end
          local clsName = raw.className or "ClientUIImageControl"
          local handle = raw.userdataHandle or raw.id or 75
          return tostring(clsName) .. ":" .. tostring(handle)
        end
      }

      wrapControl = function(jsCtrl)
        if not jsCtrl then return nil end
        local cached = _ControlWrapCache[jsCtrl]
        if cached then return cached end

        local obj = { _raw = jsCtrl }
        setmetatable(obj, _ControlMeta)
        _ControlWrapCache[jsCtrl] = obj
        return obj
      end

      -- 5. Comprehensive Tweening Engine & Easing Curves
      local function getEaseProgress(easeType, t)
        if t <= 0 then return 0 end
        if t >= 1 then return 1 end
        if easeType == 0 or not easeType then return t end
        if easeType == 1 then return t * t end
        if easeType == 2 then return 1 - (1 - t) * (1 - t) end
        if easeType == 3 then
          return t < 0.5 and 2 * t * t or 1 - ((-2 * t + 2) ^ 2) / 2
        end
        if easeType == 4 then return t * t * t end
        if easeType == 5 then return 1 - ((1 - t) ^ 3) end
        if easeType == 6 then
          return t < 0.5 and 4 * t * t * t or 1 - ((-2 * t + 2) ^ 3) / 2
        end
        if easeType == 7 then return t * t * t * t end
        if easeType == 8 then return 1 - ((1 - t) ^ 4) end
        if easeType == 9 then
          return t < 0.5 and 8 * t * t * t * t or 1 - ((-2 * t + 2) ^ 4) / 2
        end
        if easeType == 10 then return t * t * t * t * t end
        if easeType == 11 then return 1 - ((1 - t) ^ 5) end
        if easeType == 12 then
          return t < 0.5 and 16 * (t ^ 5) or 1 - ((-2 * t + 2) ^ 5) / 2
        end
        if easeType == 13 then return 1 - math.cos((t * math.pi) / 2) end
        if easeType == 14 then return math.sin((t * math.pi) / 2) end
        if easeType == 15 then return -(math.cos(math.pi * t) - 1) / 2 end
        if easeType == 16 then return 2 ^ (10 * t - 10) end
        if easeType == 17 then return 1 - (2 ^ (-10 * t)) end
        if easeType == 18 then
          return t < 0.5 and (2 ^ (20 * t - 10)) / 2 or (2 - (2 ^ (-20 * t + 10))) / 2
        end
        if easeType == 19 then return 1 - math.sqrt(math.max(0, 1 - (t ^ 2))) end
        if easeType == 20 then return math.sqrt(math.max(0, 1 - ((t - 1) ^ 2))) end
        if easeType == 21 then
          return t < 0.5 and (1 - math.sqrt(math.max(0, 1 - ((2 * t) ^ 2)))) / 2 or (math.sqrt(math.max(0, 1 - ((-2 * t + 2) ^ 2))) + 1) / 2
        end
        local c4 = (2 * math.pi) / 3
        local c5 = (2 * math.pi) / 4.5
        if easeType == 22 then
          return -(2 ^ (10 * t - 10)) * math.sin((t * 10 - 10.75) * c4)
        end
        if easeType == 23 then
          return (2 ^ (-10 * t)) * math.sin((t * 10 - 0.75) * c4) + 1
        end
        if easeType == 24 then
          return t < 0.5 and -((2 ^ (20 * t - 10)) * math.sin((20 * t - 11.125) * c5)) / 2 or ((2 ^ (-20 * t + 10)) * math.sin((20 * t - 11.125) * c5)) / 2 + 1
        end
        local c1 = 1.70158
        local c3 = c1 + 1
        local c2 = c1 * 1.525
        if easeType == 25 then return c3 * t * t * t - c1 * t * t end
        if easeType == 26 then return 1 + c3 * ((t - 1) ^ 3) + c1 * ((t - 1) ^ 2) end
        if easeType == 27 then
          return t < 0.5 and (((2 * t) ^ 2) * ((c2 + 1) * 2 * t - c2)) / 2 or (((2 * t - 2) ^ 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2
        end
        local function outBounce(x)
          local n1 = 7.5625
          local d1 = 2.75
          if x < 1 / d1 then
            return n1 * x * x
          elseif x < 2 / d1 then
            x = x - 1.5 / d1
            return n1 * x * x + 0.75
          elseif x < 2.5 / d1 then
            x = x - 2.25 / d1
            return n1 * x * x + 0.9375
          else
            x = x - 2.625 / d1
            return n1 * x * x + 0.984375
          end
        end
        if easeType == 28 then return 1 - outBounce(1 - t) end
        if easeType == 29 then return outBounce(t) end
        if easeType == 30 then
          return t < 0.5 and (1 - outBounce(1 - 2 * t)) / 2 or (1 + outBounce(2 * t - 1)) / 2
        end
        return t
      end

      local _ActiveTweens = {}
      local _ActiveSequences = {}
      local _NextTweenId = 1
      local _NextSeqId = 1

      local TweenClass = {}
      TweenClass.__index = TweenClass

      function TweenClass.new(target, targetValues, duration)
        local tw = {
          id = _NextTweenId,
          target = target,
          targetValues = targetValues or {},
          startValues = {},
          duration = math.max(tonumber(duration) or 0, 0.0001),
          elapsed = 0,
          ease = 0,
          loops = 1,
          loopCount = 0,
          isRelative = false,
          onComplete = nil,
          onStepComplete = nil,
          isPlaying = true,
          isCompleted = false,
          isKilled = false,
          hasCapturedStart = false
        }
        _NextTweenId = _NextTweenId + 1
        setmetatable(tw, TweenClass)
        _ActiveTweens[tw.id] = tw
        return tw
      end

      function TweenClass:SetEase(easeType)
        self.ease = tonumber(easeType) or 0
        return self
      end

      function TweenClass:SetLoops(count)
        self.loops = tonumber(count) or 1
        return self
      end

      function TweenClass:SetRelative(rel)
        self.isRelative = not not rel
        return self
      end

      function TweenClass:SetOnComplete(cb)
        self.onComplete = cb
        return self
      end

      function TweenClass:SetOnStepComplete(cb)
        self.onStepComplete = cb
        return self
      end

      function TweenClass:Play()
        self.isPlaying = true
        if not _ActiveTweens[self.id] and not self.isKilled and not self.isCompleted then
          _ActiveTweens[self.id] = self
        end
        return self
      end

      function TweenClass:Pause()
        self.isPlaying = false
        return self
      end

      function TweenClass:Resume()
        self.isPlaying = true
        return self
      end

      function TweenClass:Restart()
        self.elapsed = 0
        self.loopCount = 0
        self.isCompleted = false
        self.isPlaying = true
        self.hasCapturedStart = false
        _ActiveTweens[self.id] = self
        return self
      end

      function TweenClass:ApplyProgress(p)
        if not self.target then return end
        if not self.hasCapturedStart then
          self.hasCapturedStart = true
          for k, _ in pairs(self.targetValues) do
            local startVal = self.target[k]
            if type(startVal) == "number" then
              self.startValues[k] = startVal
            elseif type(startVal) == "table" and startVal.r ~= nil then
              self.startValues[k] = { r = startVal.r, g = startVal.g, b = startVal.b, a = startVal.a }
            else
              self.startValues[k] = 0
            end
          end
        end

        local easedP = getEaseProgress(self.ease, p)

        for k, targetVal in pairs(self.targetValues) do
          local startVal = self.startValues[k] or 0
          if type(targetVal) == "number" then
            local endVal = self.isRelative and (startVal + targetVal) or targetVal
            self.target[k] = startVal + (endVal - startVal) * easedP
          elseif type(targetVal) == "table" and targetVal.r ~= nil and type(startVal) == "table" then
            local r = (startVal.r or 0) + ((targetVal.r or 0) - (startVal.r or 0)) * easedP
            local g = (startVal.g or 0) + ((targetVal.g or 0) - (startVal.g or 0)) * easedP
            local b = (startVal.b or 0) + ((targetVal.b or 0) - (startVal.b or 0)) * easedP
            local a = (startVal.a or 255) + ((targetVal.a or 255) - (startVal.a or 255)) * easedP
            self.target[k] = Color.FromRGBA(r, g, b, a)
          end
        end
      end

      function TweenClass:Complete()
        if self.isKilled or self.isCompleted then return end
        self:ApplyProgress(1)
        self.isCompleted = true
        self.isPlaying = false
        _ActiveTweens[self.id] = nil
        if self.onComplete then
          local ok, err = pcall(self.onComplete)
          if not ok then printerr("[Tween OnComplete Error]: " .. tostring(err)) end
        end
      end

      function TweenClass:Kill(complete)
        if complete then
          self:Complete()
        else
          self.isKilled = true
          self.isPlaying = false
          _ActiveTweens[self.id] = nil
        end
      end

      function TweenClass:Stop()
        self:Kill(false)
      end

      function TweenClass:Update(dt)
        if not self.isPlaying or self.isKilled or self.isCompleted then return end
        self.elapsed = self.elapsed + dt
        local rawP = math.min(self.elapsed / self.duration, 1)
        self:ApplyProgress(rawP)

        if self.elapsed >= self.duration then
          self.loopCount = self.loopCount + 1
          if self.onStepComplete then
            local ok, err = pcall(self.onStepComplete)
            if not ok then printerr("[Tween OnStepComplete Error]: " .. tostring(err)) end
          end

          if self.loops == -1 or self.loopCount < self.loops then
            self.elapsed = self.elapsed - self.duration
            self:ApplyProgress(0)
          else
            self.isCompleted = true
            self.isPlaying = false
            _ActiveTweens[self.id] = nil
            if self.onComplete then
              local ok, err = pcall(self.onComplete)
              if not ok then printerr("[Tween OnComplete Error]: " .. tostring(err)) end
            end
          end
        end
      end

      local SequenceClass = {}
      SequenceClass.__index = SequenceClass

      function SequenceClass.new()
        local seq = {
          id = _NextSeqId,
          items = {},
          totalDuration = 0,
          elapsed = 0,
          isPlaying = true,
          isCompleted = false,
          isKilled = false,
          loops = 1,
          loopCount = 0,
          onComplete = nil,
          executedCallbacks = {}
        }
        _NextSeqId = _NextSeqId + 1
        setmetatable(seq, SequenceClass)
        _ActiveSequences[seq.id] = seq
        return seq
      end

      function SequenceClass:Append(tween)
        if tween then
          tween.isPlaying = false
          _ActiveTweens[tween.id] = nil
          local dur = tween.duration or 0
          table.insert(self.items, {
            type = "tween",
            time = self.totalDuration,
            duration = dur,
            target = tween
          })
          self.totalDuration = self.totalDuration + dur
        end
        return self
      end

      function SequenceClass:Join(tween)
        if tween then
          tween.isPlaying = false
          _ActiveTweens[tween.id] = nil
          local prevTime = 0
          if #self.items > 0 then
            prevTime = self.items[#self.items].time
          end
          local dur = tween.duration or 0
          table.insert(self.items, {
            type = "tween",
            time = prevTime,
            duration = dur,
            target = tween
          })
          self.totalDuration = math.max(self.totalDuration, prevTime + dur)
        end
        return self
      end

      function SequenceClass:AppendInterval(duration)
        local dur = math.max(tonumber(duration) or 0, 0)
        table.insert(self.items, {
          type = "interval",
          time = self.totalDuration,
          duration = dur
        })
        self.totalDuration = self.totalDuration + dur
        return self
      end

      function SequenceClass:AppendCallback(callback)
        if callback then
          table.insert(self.items, {
            type = "callback",
            time = self.totalDuration,
            duration = 0,
            target = callback
          })
        end
        return self
      end

      function SequenceClass:Insert(timeOffset, tween)
        if tween then
          tween.isPlaying = false
          _ActiveTweens[tween.id] = nil
          local t = tonumber(timeOffset) or 0
          local dur = tween.duration or 0
          table.insert(self.items, {
            type = "tween",
            time = t,
            duration = dur,
            target = tween
          })
          self.totalDuration = math.max(self.totalDuration, t + dur)
        end
        return self
      end

      function SequenceClass:InsertCallback(timeOffset, callback)
        if callback then
          local t = tonumber(timeOffset) or 0
          table.insert(self.items, {
            type = "callback",
            time = t,
            duration = 0,
            target = callback
          })
          self.totalDuration = math.max(self.totalDuration, t)
        end
        return self
      end

      function SequenceClass:Play()
        self.isPlaying = true
        if not _ActiveSequences[self.id] and not self.isKilled and not self.isCompleted then
          _ActiveSequences[self.id] = self
        end
        return self
      end

      function SequenceClass:Pause()
        self.isPlaying = false
        return self
      end

      function SequenceClass:Resume()
        self.isPlaying = true
        return self
      end

      function SequenceClass:Restart()
        self.elapsed = 0
        self.loopCount = 0
        self.isCompleted = false
        self.isPlaying = true
        self.executedCallbacks = {}
        for _, item in ipairs(self.items) do
          item.completed = false
          if item.type == "tween" and item.target then
            item.target:Restart()
            item.target.isPlaying = false
            _ActiveTweens[item.target.id] = nil
          end
        end
        _ActiveSequences[self.id] = self
        return self
      end

      function SequenceClass:Kill(complete)
        if complete then
          self:Complete()
        else
          self.isKilled = true
          self.isPlaying = false
          _ActiveSequences[self.id] = nil
        end
      end

      function SequenceClass:SetLoops(loops)
        self.loops = tonumber(loops) or 1
        return self
      end

      function SequenceClass:SetOnComplete(cb)
        self.onComplete = cb
        return self
      end

      function SequenceClass:Complete()
        if self.isKilled or self.isCompleted then return end
        for _, item in ipairs(self.items) do
          if item.type == "tween" and item.target then
            item.target:Complete()
          elseif item.type == "callback" and item.target and not self.executedCallbacks[item] then
            self.executedCallbacks[item] = true
            pcall(item.target)
          end
        end
        self.isCompleted = true
        self.isPlaying = false
        _ActiveSequences[self.id] = nil
        if self.onComplete then
          local ok, err = pcall(self.onComplete)
          if not ok then printerr("[Sequence OnComplete Error]: " .. tostring(err)) end
        end
      end

      function SequenceClass:Update(dt)
        if not self.isPlaying or self.isKilled or self.isCompleted then return end
        self.elapsed = self.elapsed + dt

        for _, item in ipairs(self.items) do
          if item.type == "tween" and item.target then
            local tw = item.target
            if self.elapsed >= item.time and not item.completed then
              local localElapsed = self.elapsed - item.time
              if localElapsed >= item.duration then
                item.completed = true
                tw:ApplyProgress(1)
              else
                local p = math.min(localElapsed / math.max(item.duration, 0.0001), 1)
                tw:ApplyProgress(p)
              end
            end
          elseif item.type == "callback" and item.target then
            if self.elapsed >= item.time and not self.executedCallbacks[item] then
              self.executedCallbacks[item] = true
              local ok, err = pcall(item.target)
              if not ok then printerr("[Sequence Callback Error]: " .. tostring(err)) end
            end
          end
        end

        if self.elapsed >= self.totalDuration then
          self.loopCount = self.loopCount + 1
          if self.loops == -1 or self.loopCount < self.loops then
            self.elapsed = self.elapsed - self.totalDuration
            self.executedCallbacks = {}
            for _, item in ipairs(self.items) do
              item.completed = false
              if item.type == "tween" and item.target then
                item.target.hasCapturedStart = false
              end
            end
          else
            self.isCompleted = true
            self.isPlaying = false
            _ActiveSequences[self.id] = nil
            if self.onComplete then
              local ok, err = pcall(self.onComplete)
              if not ok then printerr("[Sequence OnComplete Error]: " .. tostring(err)) end
            end
          end
        end
      end

      function _UpdateAllTweens(dt)
        local tweenList = {}
        for _, tw in pairs(_ActiveTweens) do
          table.insert(tweenList, tw)
        end
        for i = 1, #tweenList do
          local tw = tweenList[i]
          if tw and tw.Update and not tw.isKilled then
            tw:Update(dt)
          end
        end

        local seqList = {}
        for _, seq in pairs(_ActiveSequences) do
          table.insert(seqList, seq)
        end
        for i = 1, #seqList do
          local seq = seqList[i]
          if seq and seq.Update and not seq.isKilled then
            seq:Update(dt)
          end
        end
      end

      -- Math Extensions
      math.isinf = function(n)
        return n == math.huge or n == -math.huge
      end
      math.isnan = function(n)
        return n ~= n
      end

      -- Runtime typeof inspector
      function typeof(val)
        local t = type(val)
        if t == "table" then
          if val.__isColor then return "ColorValue" end
          if val._raw then return "ClientUIControl" end
          if val.id and val.ApplyProgress then return "Tween" end
          if val.id and val.items then return "TweenSequence" end
          return "table"
        end
        return t
      end

      -- 6. Global Game Engine Object
      game = {
        GetUICanvasSize = function()
          return sim.width, sim.height
        end,

        GetCursorUIPos = function()
          return sim.cursorX, sim.cursorY
        end,

        InstantiateClientUIControl = function(templateId, parent)
          local pRaw = parent and parent._raw or sim.rootControl
          local ctrl = sim:createControl(templateId, pRaw)
          return wrapControl(ctrl)
        end,

        DestroyClientUIControl = function(control)
          if control and control._raw then
            control._raw:Destroy()
          elseif control and control.Destroy then
            control:Destroy()
          end
        end,

        GetClientUIControl = function(id)
          local ctrl = sim.controlsById:get(id)
          if ctrl then return wrapControl(ctrl) end
          return nil
        end,

        GetClientUIRoots = function()
          return { wrapControl(sim.rootControl) }
        end,

        FindClientUIRoot = function(name)
          if sim.rootControl.name == name then
            return wrapControl(sim.rootControl)
          end
          return wrapControl(sim.rootControl)
        end,

        Tween = function(control, targetValues, duration)
          return TweenClass.new(control, targetValues, duration)
        end,

        TweenSequence = function()
          return SequenceClass.new()
        end,

        PlayAudio2D = function(id)
          return math.random(1000, 9999)
        end,

        StopAudio = function(id)
        end,

        IsAudioAlive = function(id)
          return false
        end,

        IsTestPlay = function()
          return true
        end,

        PauseLevelTime = function(pause)
        end,

        IsLevelTimePaused = function()
          return false
        end,

        SetControllerFocus = function(control)
        end,

        GetControllerFocus = function()
          return nil
        end,

        GetControllerLeftStickAxis = function()
          return 0, 0
        end,

        GetControllerRightStickAxis = function()
          return 0, 0
        end,

        GetDevice = function()
          return Enum.Device.KeyboardAndMouse
        end,

        GetLanguageType = function()
          return Enum.LanguageType.LanguageEng
        end,

        GetStageMode = function()
          return 1
        end,

        GetText = function(textMappingId)
          return tostring(textMappingId or "")
        end,

        GetGlobalCustomVariableValue = function(entity, varName)
          return nil
        end,

        PrintClientUITree = function()
          sim:log("Client UI Hierarchy tree dumped", "info")
        end,

        ServerSignal = function(name)
          local params = {}
          return {
            Connect = function(self, fn) end,
            Fire = function(self, ...) end,
            SendSignal = function(self)
              sim:log("[ServerSignal: " .. tostring(name) .. "] Dispatched with " .. tostring(#params) .. " params", "info")
            end,
            AddBool = function(self, v) table.insert(params, not not v) end,
            AddBoolList = function(self, list) for _, v in ipairs(list or {}) do table.insert(params, not not v) end end,
            AddInt = function(self, v) table.insert(params, math.floor(tonumber(v) or 0)) end,
            AddIntList = function(self, list) for _, v in ipairs(list or {}) do table.insert(params, math.floor(tonumber(v) or 0)) end end,
            AddFloat = function(self, v) table.insert(params, tonumber(v) or 0) end,
            AddFloatList = function(self, list) for _, v in ipairs(list or {}) do table.insert(params, tonumber(v) or 0) end end,
            AddString = function(self, v) table.insert(params, tostring(v or "")) end,
            AddStringList = function(self, list) for _, v in ipairs(list or {}) do table.insert(params, tostring(v or "")) end end,
            AddVector3 = function(self, v) table.insert(params, v) end,
            AddVector3List = function(self, list) for _, v in ipairs(list or {}) do table.insert(params, v) end end,
            AddConfigId = function(self, v) table.insert(params, math.floor(tonumber(v) or 0)) end,
            AddEntity = function(self, v) table.insert(params, math.floor(tonumber(v) or 0)) end,
            AddGuid = function(self, v) table.insert(params, math.floor(tonumber(v) or 0)) end,
            AddPrefabId = function(self, v) table.insert(params, math.floor(tonumber(v) or 0)) end,
            AddParam = function(self, pType, val) table.insert(params, val) end
          }
        end
      }

      -- 7. Global Script Object & Multi-Script Mounting Engine
      local scriptHostControl = wrapControl(sim.scriptHost)
      script = {
        alive = true,
        id = 1,
        prefabIndex = 1073741860,
        path = "Scratchpad",
        enabled = true,
        object = scriptHostControl,
        parent = scriptHostControl,
        _updateEnabled = false,
        _env = _G,
        _aliases = { Scratchpad = true, scratchpad = true },
        GetControl = function(self) return self.object end,
        GetParent = function(self) return self.object end,
        EnableUpdate = function(self, enabled)
          self._updateEnabled = not not enabled
          sim.updateEnabled = not not enabled
        end,
        SetUpdateEnabled = function(self, enabled)
          self._updateEnabled = not not enabled
          sim.updateEnabled = not not enabled
        end,
        RegisterCustomVariableChangedHandler = function(self, entityOrVar, varName, handler)
        end,
        RegisterServerSignalHandler = function(self, signalName, callback)
        end,
        UnregisterCustomVariableChangedHandler = function(self, entityOrVar, varName)
        end,
        UnregisterServerSignalHandler = function(self, signalName)
        end,
        GetParam = function(self, name)
          return nil
        end,
        Invoke = function(self, funcName, ...)
          if not self.alive then return nil end
          local env = self._env or _G
          local fn = rawget(env, funcName) or _G[funcName]
          if type(fn) == "function" then
            return fn(...)
          end
          return nil
        end
      }
      _ControlScripts[tostring(sim.scriptHost.id)] = { script }

      function _ResetMountedScripts()
        _ControlScripts = {}
        _AllMountedScripts = {}
      end

      -- Mounts an isolated Lua script instance onto a specific UI Control
      function _MountScriptOnControl(hostCtrlRaw, scriptId, scriptPath, scriptPrefabIndex, luaCode, aliasList)
        local hostWrapped = wrapControl(hostCtrlRaw)
        local scriptEnv = setmetatable({}, { __index = _G })
        local aliases = {}
        local cleanPrimary = tostring(scriptPath or "Script"):gsub("%.lua$", "")
        aliases[cleanPrimary] = true
        aliases[string.lower(cleanPrimary)] = true
        if type(aliasList) == "table" then
          for _, a in ipairs(aliasList) do
            local ca = tostring(a):gsub("%.lua$", "")
            aliases[ca] = true
            aliases[string.lower(ca)] = true
          end
        end

        local scriptInstance = {
          alive = true,
          id = tonumber(scriptId) or (#_AllMountedScripts + 1),
          prefabIndex = tonumber(scriptPrefabIndex) or (1073741860 + #_AllMountedScripts + 1),
          path = cleanPrimary,
          enabled = true,
          object = hostWrapped,
          parent = hostWrapped,
          _updateEnabled = false,
          _env = scriptEnv,
          _aliases = aliases,
          GetControl = function(self) return hostWrapped end,
          GetParent = function(self) return hostWrapped end,
          EnableUpdate = function(self, enabled)
            self._updateEnabled = not not enabled
          end,
          SetUpdateEnabled = function(self, enabled)
            self._updateEnabled = not not enabled
          end,
          RegisterCustomVariableChangedHandler = function(self, entityOrVar, varName, handler) end,
          RegisterServerSignalHandler = function(self, signalName, callback) end,
          UnregisterCustomVariableChangedHandler = function(self, entityOrVar, varName) end,
          UnregisterServerSignalHandler = function(self, signalName) end,
          GetParam = function(self, name) return nil end,
          Invoke = function(self, funcName, ...)
            if not self.alive then
              printerr("[Invoke Warning] Attempted to Invoke '" .. tostring(funcName) .. "' on dead script: " .. tostring(self.path))
              return nil
            end
            local fn = rawget(scriptEnv, funcName)
            if type(fn) == "function" then
              sim:log("[Cross-Script Invoke] " .. tostring(self.path) .. ":Invoke('" .. tostring(funcName) .. "')", "info")
              return fn(...)
            end
            printerr("[Invoke Warning] Function '" .. tostring(funcName) .. "' not found on script '" .. tostring(self.path) .. "'")
            return nil
          end
        }

        scriptEnv.script = scriptInstance
        scriptEnv._G = scriptEnv

        local ctrlKey = tostring(hostCtrlRaw.id)
        if not _ControlScripts[ctrlKey] then
          _ControlScripts[ctrlKey] = {}
        end
        table.insert(_ControlScripts[ctrlKey], scriptInstance)
        table.insert(_AllMountedScripts, scriptInstance)

        local chunk, compileErr
        if setfenv then
          local loader = loadstring or load
          chunk, compileErr = loader(luaCode, "@" .. cleanPrimary)
          if chunk then
            setfenv(chunk, scriptEnv)
          end
        else
          chunk, compileErr = load(luaCode, "@" .. cleanPrimary, "t", scriptEnv)
        end
        if not chunk then
          printerr("[Compile Error in " .. cleanPrimary .. "]: " .. tostring(compileErr))
          return nil
        end
        local ok, execErr = pcall(chunk)
        if not ok then
          printerr("[Exec Error in " .. cleanPrimary .. "]: " .. tostring(execErr))
          return nil
        end
        return scriptInstance
      end

      -- Executes Stage Start Lifecycle Order (OnInit -> OnEnable -> OnStart) across all mounted scripts
      function _StartMountedScripts()
        -- 1. OnInit across hierarchy
        for _, s in ipairs(_AllMountedScripts) do
          if s.alive and s.object._raw.active ~= false then
            local fn = rawget(s._env, "OnInit")
            if type(fn) == "function" then
              local ok, err = pcall(fn)
              if not ok then printerr("[" .. s.path .. " OnInit Error]: " .. tostring(err)) end
            end
          end
        end
        -- 2. OnEnable across hierarchy
        for _, s in ipairs(_AllMountedScripts) do
          if s.alive and s.object._raw.active ~= false then
            local fn = rawget(s._env, "OnEnable")
            if type(fn) == "function" then
              local ok, err = pcall(fn)
              if not ok then printerr("[" .. s.path .. " OnEnable Error]: " .. tostring(err)) end
            end
          end
        end
        -- 3. OnStart across hierarchy
        for _, s in ipairs(_AllMountedScripts) do
          if s.alive and s.object._raw.active ~= false then
            local fn = rawget(s._env, "OnStart")
            if type(fn) == "function" then
              local ok, err = pcall(fn)
              if not ok then
                printerr("[" .. s.path .. " OnStart Error]: " .. tostring(err))
              else
                sim:log("✓ [" .. s.path .. "] OnStart() executed on " .. tostring(s.object) .. " (control.id=" .. tostring(s.object.id) .. ", script.id=" .. tostring(s.id) .. ")", "info")
              end
            end
          end
        end
      end

      -- Executes per-frame OnUpdate and OnLevelUpdate across all mounted scripts with EnableUpdate(true)
      function _UpdateMountedScripts(dt)
        for _, s in ipairs(_AllMountedScripts) do
          if s.alive and s.object._raw.alive and s.object._raw.active ~= false and s._updateEnabled then
            local fn = rawget(s._env, "OnUpdate")
            if type(fn) == "function" then
              local ok, err = pcall(fn, dt)
              if not ok then printerr("[" .. s.path .. " OnUpdate Error]: " .. tostring(err)) end
            end
            local lfn = rawget(s._env, "OnLevelUpdate")
            if type(lfn) == "function" then
              local ok, err = pcall(lfn, dt)
              if not ok then printerr("[" .. s.path .. " OnLevelUpdate Error]: " .. tostring(err)) end
            end
          end
        end
      end
    `;

    const status = lauxlib.luaL_dostring(this.L, to_luastring(bootstrapLua));
    if (status !== lua.LUA_OK) {
      const err = getLuaStackString(this.L, -1);
      this.log(`Bootstrap error: ${err}`, 'error');
    }
  }

  createControl(templateId, parent) {
    const nextId = Math.floor(1000000000 + Math.random() * 900000000);
    const ctrl = new VirtualUIControl(nextId, parent);
    ctrl.templateId = Number(templateId) || 1073741850;
    ctrl.prefabIndex = ctrl.templateId;

    // Note: Miliastra automatically generates template IDs per project, so any template ID
    // can represent an Image, TextBox, PresetButton, Container, or CursorEventArea.
    // VirtualUIControl adapts dynamically based on the properties/methods called on it.
    this.controlsById.set(ctrl.id, ctrl);
    return ctrl;
  }

  // Build a pre-configured multi-control, multi-script scene hierarchy
  mountSceneHierarchy(sceneConfig) {
    // Remove default single-file scriptHost so rootControl only contains scene hierarchy children
    this.rootControl.children = [];
    this.controlsById.clear();

    this.rootControl.id = sceneConfig.rootId || 1;
    this.rootControl.name = sceneConfig.rootName || 'ContainerControl';
    this.rootControl.className = 'ClientUIContainerControl';
    this.rootControl.templateId = sceneConfig.rootPrefabIndex || 1073741852;
    this.rootControl.prefabIndex = this.rootControl.templateId;
    this.rootControl.userdataHandle = 1;
    this.rootControl.sizeDeltaX = this.width;
    this.rootControl.sizeDeltaY = this.height;
    this.controlsById.set(this.rootControl.id, this.rootControl);

    lua.lua_getglobal(this.L, to_luastring('_ResetMountedScripts'));
    if (lua.lua_isfunction(this.L, -1)) {
      lua.lua_pcall(this.L, 0, 0, 0);
    } else {
      lua.lua_pop(this.L, 1);
    }

    const mountScriptHelper = (ctrl, scriptDef) => {
      if (!scriptDef || !scriptDef.code) return;
      lua.lua_getglobal(this.L, to_luastring('_MountScriptOnControl'));
      if (lua.lua_isfunction(this.L, -1)) {
        interop.push(this.L, ctrl);
        lua.lua_pushnumber(this.L, scriptDef.id || 1);
        lua.lua_pushstring(this.L, to_luastring(scriptDef.path || ctrl.name));
        lua.lua_pushnumber(this.L, scriptDef.prefabIndex || 1073741860);
        lua.lua_pushstring(this.L, to_luastring(scriptDef.code));

        const aliases = scriptDef.aliases || [scriptDef.path || ctrl.name, ctrl.name];
        lua.lua_newtable(this.L);
        aliases.forEach((alias, idx) => {
          lua.lua_pushstring(this.L, to_luastring(alias));
          lua.lua_rawseti(this.L, -2, idx + 1);
        });

        if (lua.lua_pcall(this.L, 6, 1, 0) !== lua.LUA_OK) {
          const err = getLuaStackString(this.L, -1);
          this.log(`[Mount Error (${scriptDef.path})]: ${err}`, 'error');
        } else {
          lua.lua_pop(this.L, 1);
          this.log(`[Mounted Script] external_lua_file/${scriptDef.path} -> ${ctrl.className}:${ctrl.userdataHandle} (control.id=${ctrl.id}, prefabIndex=${ctrl.prefabIndex}, script.id=${scriptDef.id})`, 'info');
        }
      } else {
        lua.lua_pop(this.L, 1);
      }
    };

    const createdControls = new Map();
    createdControls.set('root', this.rootControl);
    createdControls.set(this.rootControl.name, this.rootControl);

    this.log(`[Hierarchy Root] ${this.rootControl.name} (id=${this.rootControl.id}, prefabIndex=${this.rootControl.prefabIndex})`, 'info');

    const orderedNodes = [...(sceneConfig.nodes || [])].sort((a, b) => (a.depth || 0) - (b.depth || 0));

    for (const node of orderedNodes) {
      // Skip duplicating the root container node if it is listed at depth 0 in sceneConfig.nodes
      if (node.key === 'root' || node.depth === 0) {
        if (node.script && node.script.code) {
          mountScriptHelper(this.rootControl, node.script);
        }
        continue;
      }

      const parentCtrl = (node.parentKey && createdControls.get(node.parentKey)) || this.rootControl;
      const ctrl = new VirtualUIControl(node.id, parentCtrl, node.name);
      ctrl.templateId = node.prefabIndex || 1073741850;
      ctrl.prefabIndex = ctrl.templateId;
      ctrl.className = node.className || 'ClientUIImageControl';
      ctrl.userdataHandle = node.userdataHandle || node.id;
      ctrl.anchorMinX = node.anchorMinX !== undefined ? node.anchorMinX : 0.5;
      ctrl.anchorMinY = node.anchorMinY !== undefined ? node.anchorMinY : 0.5;
      ctrl.anchorMaxX = node.anchorMaxX !== undefined ? node.anchorMaxX : 0.5;
      ctrl.anchorMaxY = node.anchorMaxY !== undefined ? node.anchorMaxY : 0.5;
      ctrl.pivotX = node.pivotX !== undefined ? node.pivotX : 0.5;
      ctrl.pivotY = node.pivotY !== undefined ? node.pivotY : 0.5;
      ctrl.anchoredPositionX = node.x || 0;
      ctrl.anchoredPositionY = node.y || 0;
      ctrl.sizeDeltaX = node.width !== undefined ? node.width : 100;
      ctrl.sizeDeltaY = node.height !== undefined ? node.height : 40;
      ctrl.interactable = node.interactable !== false;
      ctrl.raycastTarget = Boolean(node.raycastTarget);
      ctrl.visible = node.visible !== false;

      if (node.bgColor) {
        ctrl.bgColor = { ...node.bgColor };
      }
      if (node.imageColor) {
        ctrl.imageColor = { ...node.imageColor };
        ctrl._explicitImageColor = true;
      }
      if (node.text !== undefined) {
        ctrl.text = node.text;
        ctrl.fontSize = node.fontSize || 14;
        if (node.fontColor) ctrl.fontColor = { ...node.fontColor };
      }
      if (node.enableSoftEdge) {
        ctrl.enableSoftEdge = true;
        ctrl.softEdgeWidthX = node.softEdgeWidthX || 8;
        ctrl.softEdgeWidthY = node.softEdgeWidthY || 8;
      }
      if (node.referencedPrefabIndex) {
        ctrl.referencedPrefabIndex = node.referencedPrefabIndex;
      }

      this.controlsById.set(ctrl.id, ctrl);
      createdControls.set(node.key || node.name, ctrl);

      if (node.script && node.script.code) {
        mountScriptHelper(ctrl, node.script);
      }
    }

    lua.lua_getglobal(this.L, to_luastring('_StartMountedScripts'));
    if (lua.lua_isfunction(this.L, -1)) {
      if (lua.lua_pcall(this.L, 0, 0, 0) !== lua.LUA_OK) {
        const err = getLuaStackString(this.L, -1);
        this.log(`[Hierarchy Lifecycle Error]: ${err}`, 'error');
      }
    } else {
      lua.lua_pop(this.L, 1);
    }
  }

  // Programmatically trigger a click on a named or ID-matched UI control
  triggerControlClick(nameOrId) {
    if (!this.isRunning) return false;
    let target = null;
    for (const ctrl of this.controlsById.values()) {
      if (ctrl.id === nameOrId || ctrl.name === nameOrId) {
        target = ctrl;
        break;
      }
    }
    if (!target) return false;
    const bounds = target.getScreenBounds(this.width, this.height);
    const cx = (bounds.left + bounds.right) * 0.5;
    const cy = (bounds.bottom + bounds.top) * 0.5;
    this.lastDownTime = 0;
    this.lastClickTime = 0;
    this.dispatchCursorEvent(2, cx, cy, [target]);
    this.dispatchCursorEvent(3, cx, cy, [target]);
    this.dispatchCursorEvent(1, cx, cy, [target]);
    return true;
  }

  buildDefaultCrossScriptBounceScene(activeCode) {
    const isButtonScript = activeCode.includes('GetScriptByPath("Container_with_1pixel")') || activeCode.includes('BounceImage');
    const isImageScript = !isButtonScript && (activeCode.includes('function Bounce()') && activeCode.includes('function SetMoveLeft('));
    if (!isButtonScript && !isImageScript) return null;

    const defaultButtonLua = `local controllerScript = nil

local function BounceImage()
    if controllerScript and controllerScript.alive then
        controllerScript:Invoke("Bounce")
    end
end

local function SetImageMovement(direction, held)
    if controllerScript and controllerScript.alive then
        controllerScript:Invoke(direction, held)
    end
end

local function FindController(control)
    local parent = control.parent
    for depth = 1, 2 do
        if not parent then return nil end
        for _, child in ipairs(parent:GetChildren()) do
            local candidate = child:GetScriptByPath("Container_with_1pixel")
            if candidate then return candidate end
        end
        parent = parent.parent
    end
    return nil
end

function OnStart()
    local button = script.object
    controllerScript = FindController(button)

    button:AddCursorEventListener(Enum.CursorEventType.CursorClick, function()
        BounceImage()
    end)

    button:AddKeyEventListener(Enum.KeyEventType.KeyboardJumpKeyDown, function()
        BounceImage()
        return true
    end)

    button:AddKeyEventListener(Enum.KeyEventType.KeyboardMoveLeftKeyDown, function()
        SetImageMovement("SetMoveLeft", true)
        return true
    end)

    button:AddKeyEventListener(Enum.KeyEventType.KeyboardMoveRightKeyDown, function()
        SetImageMovement("SetMoveRight", true)
        return true
    end)

    button:AddKeyEventListener(Enum.KeyEventType.KeyboardMoveLeftKeyUp, function()
        SetImageMovement("SetMoveLeft", false)
        return true
    end)

    button:AddKeyEventListener(Enum.KeyEventType.KeyboardMoveRightKeyUp, function()
        SetImageMovement("SetMoveRight", false)
        return true
    end)
end`;

    const defaultImageLua = `local image = nil
local bounce = nil
local isBouncing = false
local moveLeftHeld = false
local moveRightHeld = false
local horizontalVelocity = 0

local horizontalAcceleration = 1800
local horizontalFriction = 2200
local maxHorizontalSpeed = 420

function OnStart()
    image = script.object
    script:EnableUpdate(true)
    image.imageColor = Color.FromRGB(255, 0, 0)
end

function Bounce()
    if not image or isBouncing then return end
    isBouncing = true

    local baseY = image.anchoredPositionY
    local baseScaleX = image.localScaleX
    local baseScaleY = image.localScaleY

    bounce = game.TweenSequence()
    bounce:Append(game.Tween(image, {
        anchoredPositionY = baseY + 140,
        localScaleX = baseScaleX * 0.92,
        localScaleY = baseScaleY * 1.08
    }, 0.45):SetEase(Enum.EaseType.OutQuad))

    bounce:Append(game.Tween(image, {
        anchoredPositionY = baseY,
        localScaleX = baseScaleX * 1.15,
        localScaleY = baseScaleY * 0.82
    }, 0.28):SetEase(Enum.EaseType.InQuad))

    bounce:Append(game.Tween(image, {
        localScaleX = baseScaleX,
        localScaleY = baseScaleY
    }, 0.12):SetEase(Enum.EaseType.OutBack))

    bounce:SetOnComplete(function()
        isBouncing = false
        bounce = nil
    end)

    bounce:Play()
end

function SetMoveLeft(held)
    moveLeftHeld = held
end

function SetMoveRight(held)
    moveRightHeld = held
end

function OnUpdate(deltaTime)
    if not image then return end
    local direction = 0
    if moveLeftHeld then direction = direction - 1 end
    if moveRightHeld then direction = direction + 1 end

    if direction ~= 0 then
        horizontalVelocity = horizontalVelocity + direction * horizontalAcceleration * deltaTime
        horizontalVelocity = math.max(-maxHorizontalSpeed, math.min(maxHorizontalSpeed, horizontalVelocity))
    elseif horizontalVelocity > 0 then
        horizontalVelocity = math.max(0, horizontalVelocity - horizontalFriction * deltaTime)
    elseif horizontalVelocity < 0 then
        horizontalVelocity = math.min(0, horizontalVelocity + horizontalFriction * deltaTime)
    end

    image.anchoredPositionX = image.anchoredPositionX + horizontalVelocity * deltaTime
end`;

    return {
      rootName: 'ContainerControl',
      rootPrefabIndex: 1073741852,
      nodes: [
        {
          id: 2,
          userdataHandle: 42,
          name: 'PresetButton',
          className: 'ClientUIPresetButtonControl',
          prefabIndex: 1073741851,
          x: -340,
          y: 230,
          width: 132,
          height: 38,
          raycastTarget: true,
          interactable: true,
          bgColor: { r: 46, g: 40, b: 33, a: 235 },
          text: 'Press it!',
          fontSize: 15,
          fontColor: { r: 245, g: 238, b: 220, a: 255 },
          script: {
            id: 1,
            path: 'Button_toControl_Image_Bounce',
            prefabIndex: 1073741861,
            aliases: ['Button_toControl_Image_Bounce'],
            code: isButtonScript ? activeCode : defaultButtonLua
          }
        },
        {
          id: 3,
          userdataHandle: 58,
          name: 'ReferenceControl',
          className: 'ClientUIReferenceControl',
          prefabIndex: 1073741859,
          referencedPrefabIndex: 1073741850,
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          visible: false
        },
        {
          id: 4,
          userdataHandle: 75,
          name: 'Container_with_1Pixel',
          className: 'ClientUIImageControl',
          prefabIndex: 1073741853,
          x: 0,
          y: 0,
          width: 190,
          height: 40,
          enableSoftEdge: true,
          softEdgeWidthX: 10,
          softEdgeWidthY: 10,
          imageColor: { r: 255, g: 0, b: 0, a: 255 },
          script: {
            id: 2,
            path: 'Container_with_1pixel',
            prefabIndex: 1073741862,
            aliases: ['Container_with_1pixel', 'Image_Control', 'Container_with_1Pixel'],
            code: isImageScript ? activeCode : defaultImageLua
          }
        },
        {
          id: 5,
          userdataHandle: 89,
          name: 'KeyHintControl',
          className: 'ClientUIKeyHintControl',
          prefabIndex: 1073741858,
          x: 300,
          y: 195,
          width: 28,
          height: 22,
          bgColor: { r: 245, g: 245, b: 245, a: 255 },
          text: '1',
          fontSize: 13,
          fontColor: { r: 24, g: 20, b: 16, a: 255 }
        },
        {
          id: 6,
          userdataHandle: 94,
          name: 'CrossScriptHUDHint',
          className: 'ClientUITextBoxControl',
          prefabIndex: 1073741849,
          x: 0,
          y: -265,
          width: 780,
          height: 34,
          bgColor: { r: 28, g: 24, b: 20, a: 210 },
          text: "CROSS-SCRIPT ACTIVE: Click 'Press it!' or [SPACE] to Invoke('Bounce')  |  Hold [A] / [D] to Invoke('SetMoveLeft/Right')",
          fontSize: 12,
          fontColor: { r: 201, g: 168, b: 106, a: 255 }
        }
      ]
    };
  }

  // Load and execute Lua code (or multi-script scene project)
  run(luaCode, sceneConfig = null) {
    this.stop();
    this.resetState();
    this.setupLuaEnvironment();
    this.isRunning = true;
    this.isPaused = false;
    this.updateEnabled = true;

    this.log('═══════════════════════════════════════', 'info');
    this.log('⚡ Initializing Miliastra Lua Simulation', 'info');
    this.log(`Canvas Viewport: ${this.width} x ${this.height}`, 'info');

    const resolvedScene = sceneConfig || this.buildDefaultCrossScriptBounceScene(luaCode || '');
    if (resolvedScene) {
      this.log('◈ Mounting Multi-Script Editor Hierarchy Scene...', 'info');
      this.mountSceneHierarchy(resolvedScene);
      this.lastTime = performance.now();
      this.loop();
      return true;
    }

    // Execute Single-File User Script
    const status = lauxlib.luaL_dostring(this.L, to_luastring(luaCode));
    if (status !== lua.LUA_OK) {
      const err = getLuaStackString(this.L, -1);
      this.log(`[Compile/Exec Error]: ${err}`, 'error');
      return false;
    }

    for (const hook of ['OnInit', 'OnEnable', 'OnStart']) {
      lua.lua_getglobal(this.L, to_luastring(hook));
      if (lua.lua_isfunction(this.L, -1)) {
        if (lua.lua_pcall(this.L, 0, 0, 0) !== lua.LUA_OK) {
          const err = getLuaStackString(this.L, -1);
          this.log(`[${hook} Error]: ${err}`, 'error');
        } else if (hook === 'OnStart') {
          this.log('✓ OnStart() executed successfully', 'info');
        }
      } else {
        lua.lua_pop(this.L, 1);
      }
    }

    // Start Game Render Loop
    this.lastTime = performance.now();
    this.loop();
    return true;
  }

  loop() {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame((now) => {
      const elapsed = now - this.lastTime;
      if (elapsed < 11.0) {
        this.loop();
        return;
      }

      const dt = Math.min(elapsed / 1000, 0.1);
      this.lastTime = now;

      this.framesCount++;
      this.fpsTimer += dt;
      if (this.fpsTimer >= 0.5) {
        this.fps = Math.round(this.framesCount / this.fpsTimer);
        this.framesCount = 0;
        this.fpsTimer = 0;
      }

      if (!this.isPaused && this.L) {
        // 1. Update active tweens and sequences in Lua
        lua.lua_getglobal(this.L, to_luastring('_UpdateAllTweens'));
        if (lua.lua_isfunction(this.L, -1)) {
          lua.lua_pushnumber(this.L, dt);
          if (lua.lua_pcall(this.L, 1, 0, 0) !== lua.LUA_OK) {
            const err = getLuaStackString(this.L, -1);
            this.log(`[Tween Engine Error]: ${err}`, 'error');
          }
        } else {
          lua.lua_pop(this.L, 1);
        }

        // 2. Call global OnUpdate(dt) in Lua if enabled
        if (this.updateEnabled) {
          lua.lua_getglobal(this.L, to_luastring('OnUpdate'));
          if (lua.lua_isfunction(this.L, -1)) {
            lua.lua_pushnumber(this.L, dt);
            if (lua.lua_pcall(this.L, 1, 0, 0) !== lua.LUA_OK) {
              const err = getLuaStackString(this.L, -1);
              this.log(`[OnUpdate Error]: ${err}`, 'error');
            }
          } else {
            lua.lua_pop(this.L, 1);
          }
        }

        // 3. Call per-control mounted scripts OnUpdate(dt) / OnLevelUpdate(dt)
        lua.lua_getglobal(this.L, to_luastring('_UpdateMountedScripts'));
        if (lua.lua_isfunction(this.L, -1)) {
          lua.lua_pushnumber(this.L, dt);
          if (lua.lua_pcall(this.L, 1, 0, 0) !== lua.LUA_OK) {
            const err = getLuaStackString(this.L, -1);
            this.log(`[Mounted Script Update Error]: ${err}`, 'error');
          }
        } else {
          lua.lua_pop(this.L, 1);
        }
      }

      this.renderCanvas();
      this.loop();
    });
  }

  renderCanvas() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Draw Dark Brown Paper / Elden background
    ctx.fillStyle = '#1c1814';
    ctx.fillRect(0, 0, this.width, this.height);

    // Subtle grid pattern for backdrop
    ctx.strokeStyle = 'rgba(74, 62, 49, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < this.width; x += 40) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
    }
    for (let y = 0; y < this.height; y += 40) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
    }
    ctx.stroke();

    // Render control tree recursively
    this.renderControlNode(this.rootControl);

    // Draw FPS and resolution watermark
    ctx.fillStyle = 'rgba(161, 138, 94, 0.4)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${this.width}×${this.height} | ${this.fps} FPS`, this.width - 12, 18);
  }

  renderControlNode(ctrl, parentBounds = null) {
    if (!ctrl || !ctrl.visible || !ctrl.alive) return;

    const ctx = this.ctx;
    const bounds = ctrl.getScreenBounds(this.width, this.height, parentBounds);
    const canvasY = this.height - bounds.top; // Convert bottom-left to top-left for Canvas2D
    const rotZ = ctrl.localRotationZ || 0;

    if (rotZ !== 0) {
      ctx.save();
      const pivotCanvasX = bounds.pivotScreenX !== undefined ? bounds.pivotScreenX : (bounds.left + bounds.width / 2);
      const pivotCanvasY = bounds.pivotScreenY !== undefined ? (this.height - bounds.pivotScreenY) : (canvasY + bounds.height / 2);
      const scaleSign = (bounds.worldScaleX < 0 ? -1 : 1) * (bounds.worldScaleY < 0 ? -1 : 1);
      ctx.translate(pivotCanvasX, pivotCanvasY);
      ctx.rotate((-rotZ * scaleSign * Math.PI) / 180);
      ctx.translate(-pivotCanvasX, -pivotCanvasY);
    }

    // 1. Draw Background / Shape
    const imgCol = (ctrl.imageColor && typeof ctrl.imageColor.r === 'number') ? ctrl.imageColor : normalizeColor(ctrl.imageColor, 0);
    const bgCol = (ctrl.bgColor && typeof ctrl.bgColor.r === 'number') ? ctrl.bgColor : normalizeColor(ctrl.bgColor, 0);

    if (bgCol.a > 0) {
      ctx.fillStyle = `rgba(${bgCol.r}, ${bgCol.g}, ${bgCol.b}, ${bgCol.a / 255})`;
      ctx.fillRect(bounds.left, canvasY, bounds.width, bounds.height);
      if (ctrl.className === 'ClientUIPresetButtonControl' || ctrl.raycastTarget) {
        ctx.strokeStyle = 'rgba(196, 160, 89, 0.65)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bounds.left + 0.5, canvasY + 0.5, Math.max(0, bounds.width - 1), Math.max(0, bounds.height - 1));
      }
    }

    if (imgCol.a > 0) {
      const colorStr = `rgba(${imgCol.r}, ${imgCol.g}, ${imgCol.b}, ${imgCol.a / 255})`;
      const shape = ASSET_SHAPES[ctrl.resourceId] || 'rectangle';

      // Fast path for standard rectangles (avoids ctx.save/restore overhead across hundreds of grid cells)
      if (shape === 'rectangle' && (!ctrl.enableSoftEdge || (ctrl.softEdgeWidthX <= 0 && ctrl.softEdgeWidthY <= 0))) {
        ctx.fillStyle = colorStr;
        ctx.fillRect(bounds.left, canvasY, Math.max(1, bounds.width), Math.max(1, bounds.height));
      } else {
        ctx.save();
        ctx.fillStyle = colorStr;

        if (shape === 'circle') {
        const rx = Math.max(0.5, bounds.width / 2);
        const ry = Math.max(0.5, bounds.height / 2);
        const cx = bounds.left + bounds.width / 2;
        const cy = canvasY + bounds.height / 2;

        ctx.beginPath();
        if (typeof ctx.ellipse === 'function') {
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        } else {
          ctx.arc(cx, cy, Math.min(rx, ry), 0, Math.PI * 2);
        }

        if (ctrl.enableSoftEdge) {
          if (imgCol.r === 0 && imgCol.g === 0 && imgCol.b === 0) {
            // Shadow soft edge gradient
            const grad = ctx.createRadialGradient(cx, cy, Math.max(0.1, Math.min(rx, ry) * 0.1), cx, cy, Math.max(rx, ry));
            grad.addColorStop(0, `rgba(0, 0, 0, ${imgCol.a / 255})`);
            grad.addColorStop(0.7, `rgba(0, 0, 0, ${imgCol.a * 0.5 / 255})`);
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.fill();
          } else {
            // 3D Ball / Spherical highlight shading for billiard balls
            const avgR = Math.min(rx, ry);
            const grad = ctx.createRadialGradient(cx - rx * 0.32, cy - ry * 0.32, Math.max(0.1, avgR * 0.05), cx, cy, Math.max(rx, ry));
            const hlR = Math.min(255, Math.round(imgCol.r + 70));
            const hlG = Math.min(255, Math.round(imgCol.g + 70));
            const hlB = Math.min(255, Math.round(imgCol.b + 70));
            const shR = Math.max(0, Math.round(imgCol.r - 50));
            const shG = Math.max(0, Math.round(imgCol.g - 50));
            const shB = Math.max(0, Math.round(imgCol.b - 50));
            grad.addColorStop(0, `rgba(${hlR}, ${hlG}, ${hlB}, ${imgCol.a / 255})`);
            grad.addColorStop(0.65, colorStr);
            grad.addColorStop(1, `rgba(${shR}, ${shG}, ${shB}, ${imgCol.a / 255})`);
            ctx.fillStyle = grad;
            ctx.fill();
          }
        } else {
          ctx.fill();
        }
      } else if (shape === 'hollow_circle') {
        const rx = Math.max(0.5, bounds.width / 2);
        const ry = Math.max(0.5, bounds.height / 2);
        const cx = bounds.left + bounds.width / 2;
        const cy = canvasY + bounds.height / 2;
        const innerRx = rx * 0.65;
        const innerRy = ry * 0.65;

        ctx.beginPath();
        if (typeof ctx.ellipse === 'function') {
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2, false);
          ctx.ellipse(cx, cy, innerRx, innerRy, 0, 0, Math.PI * 2, true);
        } else {
          const radius = Math.min(rx, ry);
          ctx.arc(cx, cy, radius, 0, Math.PI * 2, false);
          ctx.arc(cx, cy, radius * 0.65, 0, Math.PI * 2, true);
        }
        ctx.closePath();
        ctx.fill();
      } else if (shape === 'triangle') {
        const cx = bounds.left + bounds.width / 2;
        ctx.beginPath();
        ctx.moveTo(cx, canvasY);
        ctx.lineTo(bounds.right, canvasY + bounds.height);
        ctx.lineTo(bounds.left, canvasY + bounds.height);
        ctx.closePath();
        ctx.fill();
      } else if (shape === 'star4') {
        const cx = bounds.left + bounds.width / 2;
        const cy = canvasY + bounds.height / 2;
        const outerR = Math.min(bounds.width, bounds.height) / 2;
        const innerR = outerR * 0.38;

        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4 - Math.PI / 2;
          const r = (i % 2 === 0) ? outerR : innerR;
          const px = cx + Math.cos(angle) * r;
          const py = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      } else if (shape === 'star5') {
        const cx = bounds.left + bounds.width / 2;
        const cy = canvasY + bounds.height / 2;
        const outerR = Math.min(bounds.width, bounds.height) / 2;
        const innerR = outerR * 0.42;

        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const r = (i % 2 === 0) ? outerR : innerR;
          const px = cx + Math.cos(angle) * r;
          const py = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        } else {
          // Rounded Rectangle with softEdgeWidth
          const cornerR = Math.min(bounds.width / 2, bounds.height / 2, Math.max(ctrl.softEdgeWidthX, 4));
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(bounds.left, canvasY, Math.max(1, bounds.width), Math.max(1, bounds.height), cornerR);
          } else {
            ctx.rect(bounds.left, canvasY, Math.max(1, bounds.width), Math.max(1, bounds.height));
          }
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // 2. Draw Text if present
    if (ctrl.text && ctrl.text !== '') {
      ctx.save();
      const fCol = normalizeColor(ctrl.fontColor, 255);
      ctx.fillStyle = `rgba(${fCol.r}, ${fCol.g}, ${fCol.b}, ${fCol.a / 255})`;
      const scaleFactor = Math.min(Math.abs(bounds.worldScaleX || 1), Math.abs(bounds.worldScaleY || 1));
      const fontSize = Math.max(6, (ctrl.fontSize || 14) * scaleFactor);
      ctx.font = `${fontSize}px "JetBrains Mono", "Segoe UI Symbol", "Apple Color Emoji", sans-serif`;

      let textX = bounds.left;
      if (ctrl.horizontalAlignment === 1) { // Middle
        ctx.textAlign = 'center';
        textX = bounds.left + bounds.width / 2;
      } else if (ctrl.horizontalAlignment === 2) { // Right
        ctx.textAlign = 'right';
        textX = bounds.right;
      } else {
        ctx.textAlign = 'left';
      }

      ctx.textBaseline = 'middle';
      const textY = canvasY + bounds.height / 2;

      ctx.fillText(ctrl.text, textX, textY);
      ctx.restore();
    }

    // Render children in order, passing precomputed parent bounds to avoid O(N * depth) recalculation
    if (ctrl.children && ctrl.children.length > 0) {
      for (const child of ctrl.children) {
        this.renderControlNode(child, bounds);
      }
    }

    if (rotZ !== 0) {
      ctx.restore();
    }
  }

  resetState() {
    this.controlsById.clear();
    this.rootControl = new VirtualUIControl(1, null, 'UIRoot');
    this.rootControl.sizeDeltaX = this.width;
    this.rootControl.sizeDeltaY = this.height;
    this.rootControl.pivotX = 0;
    this.rootControl.pivotY = 0;

    this.scriptHost = new VirtualUIControl(2, this.rootControl, 'ScriptHost');
    this.scriptHost.sizeDeltaX = this.width;
    this.scriptHost.sizeDeltaY = this.height;
    this.scriptHost.pivotX = 0;
    this.scriptHost.pivotY = 0;

    this.controlsById.set(1, this.rootControl);
    this.controlsById.set(2, this.scriptHost);
  }

  setSize(newWidth, newHeight) {
    this.setResolution(newWidth, newHeight);
  }

  pause() {
    this.isPaused = true;
    this.log('[Simulation Paused]', 'info');
  }

  resume() {
    this.isPaused = false;
    this.lastTime = performance.now();
    this.log('[Simulation Resumed]', 'info');
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.isRunning && this.L) {
      lua.lua_getglobal(this.L, to_luastring('OnDestroy'));
      if (lua.lua_isfunction(this.L, -1)) {
        lua.lua_pcall(this.L, 0, 0, 0);
      } else {
        lua.lua_pop(this.L, 1);
      }
      lua.lua_close(this.L);
      this.L = null;
    }

    this.isRunning = false;
    this.isPaused = false;
  }

  destroy() {
    this.stop();
    if (this.cleanupListeners) {
      this.cleanupListeners();
    }
  }
}
