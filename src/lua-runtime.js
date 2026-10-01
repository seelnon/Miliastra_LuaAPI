// ============================================================================
// MILIASTRA LUA SIMULATION ENGINE
// Executes real Miliastra Lua game scripts on an HTML5 Canvas / DOM virtual UI
// ============================================================================

import * as fengariWebModule from 'https://cdn.jsdelivr.net/npm/fengari-web/+esm';
import {
  getKeyboardKeyHintMeta,
  getControllerKeyHintMeta,
  getVfxPresetMeta,
  getReferenceTemplateMeta
} from './project-control-settings.js';

// Resolve export object across Vite dev, esbuild, and production bundle environments
const fengariWeb = (fengariWebModule && fengariWebModule.lua)
  ? fengariWebModule
  : (fengariWebModule && fengariWebModule.default && fengariWebModule.default.lua)
    ? fengariWebModule.default
    : (fengariWebModule && fengariWebModule.default)
      ? fengariWebModule.default
      : fengariWebModule;

const { lua, lauxlib, lualib, interop, to_luastring, to_jsstring } = fengariWeb;

const LUA_STR_UPDATE_TWEENS = to_luastring('_UpdateAllTweens');
const LUA_STR_ON_UPDATE = to_luastring('OnUpdate');
const LUA_STR_UPDATE_MOUNTED = to_luastring('_UpdateMountedScripts');
const LUA_STR_DISPATCH_CURSOR = to_luastring('_M_DispatchCursorEvent');
const LUA_STR_DISPATCH_KEY = to_luastring('_M_DispatchKeyEvent');

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

// 72 Genshin Sticker Resource IDs (4 rows x 18 columns in ./lua_examples/img/stickers_genshin.jpg)
export const GENSHIN_STICKER_IDS = [
  // Row 0 (18 stickers: 112001..112018)
  112001, 112002, 112003, 112004, 112005, 112006, 112007, 112008, 112009,
  112010, 112011, 112012, 112013, 112014, 112015, 112016, 112017, 112018,
  // Row 1 (18 stickers: 112019..112036)
  112019, 112020, 112021, 112022, 112023, 112024, 112025, 112026, 112027,
  112028, 112029, 112030, 112031, 112032, 112033, 112034, 112035, 112036,
  // Row 2 (18 stickers: 112037..112054)
  112037, 112038, 112039, 112040, 112041, 112042, 112043, 112044, 112045,
  112046, 112047, 112048, 112049, 112050, 112051, 112052, 112053, 112054,
  // Row 3 (18 stickers: 112055, 112056, 112059..112074)
  112055, 112056, 112059, 112060, 112061, 112062, 112063, 112064, 112065,
  112066, 112067, 112068, 112069, 112070, 112071, 112072, 112073, 112074
];

const STICKER_SPRITE_CACHE = new Map();
let stickerSheetLoading = false;
let stickerSheetLoaded = false;

export function ensureGenshinStickersLoaded() {
  if (stickerSheetLoaded || stickerSheetLoading || typeof document === 'undefined') return;
  stickerSheetLoading = true;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  const candidateUrls = [
    new URL('../lua_examples/img/stickers_genshin.jpg', import.meta.url).href,
    './lua_examples/img/stickers_genshin.jpg',
    'lua_examples/img/stickers_genshin.jpg'
  ];
  let urlIdx = 0;

  img.onload = () => {
    try {
      const sheetW = img.naturalWidth || 1319;
      const sheetH = img.naturalHeight || 293;
      const sheetCanvas = document.createElement('canvas');
      sheetCanvas.width = sheetW;
      sheetCanvas.height = sheetH;
      const sctx = sheetCanvas.getContext('2d', { willReadFrequently: true });
      sctx.drawImage(img, 0, 0);

      // Sample top-left slate-blue background color (approx RGB 43, 46, 61)
      const cornerPx = sctx.getImageData(0, 0, 1, 1).data;
      const bgR = cornerPx[0] || 43;
      const bgG = cornerPx[1] || 46;
      const bgB = cornerPx[2] || 61;

      const cellW = 66;
      const cellH = 66;
      const visited = new Uint8Array(cellW * cellH);
      const queue = new Int32Array(cellW * cellH);

      for (let i = 0; i < GENSHIN_STICKER_IDS.length; i++) {
        const stickerId = GENSHIN_STICKER_IDS[i];
        const row = Math.floor(i / 18);
        const col = i % 18;
        const sx = Math.round(9 + col * 72.72);
        const sy = Math.round(5 + row * 72.5);

        const cellData = sctx.getImageData(sx, sy, cellW, cellH);
        const data = cellData.data;
        visited.fill(0);
        let qHead = 0;
        let qTail = 0;

        const tryEnqueue = (px, py) => {
          if (px < 0 || px >= cellW || py < 0 || py >= cellH) return;
          const idx = py * cellW + px;
          if (visited[idx]) return;
          const p4 = idx * 4;
          const diff = Math.abs(data[p4] - bgR) + Math.abs(data[p4 + 1] - bgG) + Math.abs(data[p4 + 2] - bgB);
          if (diff <= 52) {
            visited[idx] = 1;
            queue[qTail++] = idx;
          }
        };

        // Seed flood-fill from cell perimeter
        for (let x = 0; x < cellW; x++) {
          tryEnqueue(x, 0);
          tryEnqueue(x, cellH - 1);
        }
        for (let y = 1; y < cellH - 1; y++) {
          tryEnqueue(0, y);
          tryEnqueue(cellW - 1, y);
        }

        while (qHead < qTail) {
          const curr = queue[qHead++];
          const cx = curr % cellW;
          const cy = (curr / cellW) | 0;
          data[curr * 4 + 3] = 0; // Transparent background
          tryEnqueue(cx - 1, cy);
          tryEnqueue(cx + 1, cy);
          tryEnqueue(cx, cy - 1);
          tryEnqueue(cx, cy + 1);
        }

        // Soft 1px anti-aliased edge feathering along flood-fill boundary
        for (let y = 1; y < cellH - 1; y++) {
          for (let x = 1; x < cellW - 1; x++) {
            const idx = y * cellW + x;
            if (!visited[idx]) {
              const adjBg = visited[idx - 1] + visited[idx + 1] + visited[idx - cellW] + visited[idx + cellW];
              if (adjBg > 0) {
                const p4 = idx * 4;
                const diff = Math.abs(data[p4] - bgR) + Math.abs(data[p4 + 1] - bgG) + Math.abs(data[p4 + 2] - bgB);
                if (diff < 82) {
                  data[p4 + 3] = Math.min(255, Math.round((diff / 82) * 235));
                }
              }
            }
          }
        }

        const spriteCanvas = document.createElement('canvas');
        spriteCanvas.width = cellW;
        spriteCanvas.height = cellH;
        const cctx = spriteCanvas.getContext('2d');
        cctx.putImageData(cellData, 0, 0);

        // Pre-bake white/gold hit-flash silhouette canvas for zero-allocation combat hit flashes
        const flashCanvas = document.createElement('canvas');
        flashCanvas.width = cellW;
        flashCanvas.height = cellH;
        const fctx = flashCanvas.getContext('2d');
        fctx.drawImage(spriteCanvas, 0, 0);
        fctx.globalCompositeOperation = 'source-in';
        fctx.fillStyle = '#fff9e6';
        fctx.fillRect(0, 0, cellW, cellH);

        STICKER_SPRITE_CACHE.set(stickerId, {
          canvas: spriteCanvas,
          flashCanvas
        });
      }

      stickerSheetLoaded = true;
      stickerSheetLoading = false;
    } catch (e) {
      console.warn('[Sticker Slicer] Failed to slice stickers_genshin.jpg:', e);
      stickerSheetLoading = false;
    }
  };

  img.onerror = () => {
    urlIdx++;
    if (urlIdx < candidateUrls.length) {
      img.src = candidateUrls[urlIdx];
    } else {
      stickerSheetLoading = false;
    }
  };

  img.src = candidateUrls[0];
}

// Start preloading sticker sheet immediately in browser
if (typeof window !== 'undefined') {
  ensureGenshinStickersLoaded();
}

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
    this._fontColorCss = 'rgba(255, 255, 255, 1)';
    this.bgColor = { r: 0, g: 0, b: 0, a: 0 };
    this._bgColorCss = 'rgba(0, 0, 0, 0)';
    this.imageColor = { r: 255, g: 255, b: 255, a: 0 };
    this._imageColorCss = 'rgba(255, 255, 255, 0)';
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
    this.hasCursorListeners = false;
    this.disableCursorEventPassthrough = false;
    this.disableKeyEventPassthrough = false;
    this.showCursor = true;
    this.cursorListeners = {};
    this.keyListeners = {};

    // Reusable screen bounds struct to avoid per-frame GC allocations
    this._bounds = {
      left: 0,
      bottom: 0,
      width: 0,
      height: 0,
      right: 0,
      top: 0,
      centerX: 0,
      centerY: 0,
      pivotScreenX: 0,
      pivotScreenY: 0,
      worldScaleX: 1,
      worldScaleY: 1
    };

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
      this.imageColor.r = 255;
      this.imageColor.g = 255;
      this.imageColor.b = 255;
      this.imageColor.a = 255;
      this._imageColorCss = 'rgba(255, 255, 255, 1)';
    }
  }

  SetImageColor(r, g, b, a = 255) {
    this._explicitImageColor = true;
    if (typeof r === 'object' || typeof r === 'function') {
      this.imageColor = normalizeColor(r, 255);
    } else {
      this.imageColor.r = Number(r) || 0;
      this.imageColor.g = Number(g) || 0;
      this.imageColor.b = Number(b) || 0;
      this.imageColor.a = a !== undefined ? Number(a) : 255;
    }
    const ic = this.imageColor;
    this._imageColorCss = `rgba(${ic.r}, ${ic.g}, ${ic.b}, ${ic.a / 255})`;
  }

  SetBgColor(r, g, b, a = 0) {
    if (typeof r === 'object' || typeof r === 'function') {
      this.bgColor = normalizeColor(r, 0);
    } else {
      this.bgColor.r = Number(r) || 0;
      this.bgColor.g = Number(g) || 0;
      this.bgColor.b = Number(b) || 0;
      this.bgColor.a = a !== undefined ? Number(a) : 0;
    }
    const bc = this.bgColor;
    this._bgColorCss = `rgba(${bc.r}, ${bc.g}, ${bc.b}, ${bc.a / 255})`;
  }

  SetFontColor(r, g, b, a = 255) {
    if (typeof r === 'object' || typeof r === 'function') {
      this.fontColor = normalizeColor(r, 255);
    } else {
      this.fontColor.r = Number(r) || 0;
      this.fontColor.g = Number(g) || 0;
      this.fontColor.b = Number(b) || 0;
      this.fontColor.a = a !== undefined ? Number(a) : 255;
    }
    const fc = this.fontColor;
    this._fontColorCss = `rgba(${fc.r}, ${fc.g}, ${fc.b}, ${fc.a / 255})`;
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
    this.hasCursorListeners = false;
  }

  RemoveCursorEventListeners(eventType) {
    const key = Number(eventType) || eventType;
    delete this.cursorListeners[key];
    this.hasCursorListeners = Object.keys(this.cursorListeners).length > 0;
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
    this.hasCursorListeners = true;
    if (typeof window !== 'undefined' && window.__miliastra_sim) {
      window.__miliastra_sim.hasAnyCursorListeners = true;
    }
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
  getScreenBounds(canvasWidth, canvasHeight, precomputedParentBounds = null, forCanvasRender = false) {
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
      const pBounds = precomputedParentBounds || this.parent.getScreenBounds(canvasWidth, canvasHeight, null, forCanvasRender);
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

    const anchorCenterX = (this.anchorMinX + (this.anchorMaxX !== undefined ? this.anchorMaxX : this.anchorMinX)) * 0.5;
    const anchorCenterY = (this.anchorMinY + (this.anchorMaxY !== undefined ? this.anchorMaxY : this.anchorMinY)) * 0.5;

    if (hasParent) {
      // Local coordinate relative to parent's pivot before scaling:
      const anchorRelX = (anchorCenterX - parentPivotX) * parentWidth;
      const anchorRelY = (anchorCenterY - parentPivotY) * parentHeight;
      const localX = anchorRelX + this.anchoredPositionX;
      const localY = anchorRelY + this.anchoredPositionY;

      // When rendering on Canvas2D, ancestor negative scale (mirroring) is already applied
      // on the Canvas context transform stack around the ancestor's pivot, so we only scale
      // offsets by the positive magnitude Math.abs(parentScale) to avoid double-flipping.
      const effParentScaleX = forCanvasRender ? Math.abs(parentScaleX) : parentScaleX;
      const effParentScaleY = forCanvasRender ? Math.abs(parentScaleY) : parentScaleY;
      pivotScreenX = parentPivotScreenX + localX * effParentScaleX;
      pivotScreenY = parentPivotScreenY + localY * effParentScaleY;
    } else {
      pivotScreenX = anchorCenterX * canvasWidth + this.anchoredPositionX;
      pivotScreenY = anchorCenterY * canvasHeight + this.anchoredPositionY;
    }

    const width = this.sizeDeltaX * Math.abs(worldScaleX);
    const height = this.sizeDeltaY * Math.abs(worldScaleY);

    const left = pivotScreenX - this.pivotX * width;
    const bottom = pivotScreenY - this.pivotY * height;

    const b = this._bounds;
    b.left = left;
    b.bottom = bottom;
    b.width = width;
    b.height = height;
    b.right = left + width;
    b.top = bottom + height;
    b.centerX = left + width * 0.5;
    b.centerY = bottom + height * 0.5;
    b.pivotScreenX = pivotScreenX;
    b.pivotScreenY = pivotScreenY;
    b.worldScaleX = worldScaleX;
    b.worldScaleY = worldScaleY;
    return b;
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
    this.hasAnyCursorListeners = false;
    this.nextControlId = 100;
    this.isMouseDown = false;
    this.isDragging = false;
    this.lastClickTime = 0;
    this.lastDownTime = 0;
    this.lastAttackKeyTime = 0;
    this.lastSentSignal = null;
    this.onCloseRequest = null;

    this.setupDOMEvents();
  }

  requestCloseFromLua(controlName = 'script.object') {
    const sigNote = this.lastSentSignal ? ` (after ServerSignal "${this.lastSentSignal}")` : '';
    this.log(`[SetActive(false)] Deactivated ${controlName}${sigNote} — closing simulation window.`, 'info');
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (typeof this.onCloseRequest === 'function') {
      const cb = this.onCloseRequest;
      this.onCloseRequest = null;
      const lastSig = this.lastSentSignal;
      setTimeout(() => {
        cb(controlName, lastSig);
      }, 0);
    }
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

      if (!this.hasAnyCursorListeners && this.hoveredControls.length === 0) {
        return;
      }

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
      this.updateButtonStateMachines();
    };

    const handleMouseDown = (e) => {
      const pos = getCanvasPos(e);
      this.isMouseDown = true;
      this.isDragging = false;

      const hits = this.hitTestControls(pos.x, pos.y);
      this.hoveredControls = hits;
      this.updateButtonStateMachines();
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
      this.hoveredControls = hits;
      this.updateButtonStateMachines();
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

  // Update ClientUIPresetButtonControl 1-tier child status nodes (Normal / Hover / Pressed / Disabled)
  updateButtonStateMachines() {
    for (const ctrl of this.controlsById.values()) {
      if (ctrl.className !== 'ClientUIPresetButtonControl' || !ctrl._hasStateMachine) continue;

      let stateMode = 'normal';
      if (ctrl.interactable === false) {
        stateMode = 'disabled';
      } else if (this.isMouseDown && this.hoveredControls.includes(ctrl)) {
        stateMode = 'pressed';
      } else if (this.hoveredControls.includes(ctrl)) {
        stateMode = 'hover';
      }

      let activeChild = ctrl.normalStatusCtrl;
      if (stateMode === 'hover') {
        activeChild = ctrl.hoverStatusCtrl || ctrl.normalStatusCtrl;
      } else if (stateMode === 'pressed') {
        activeChild = ctrl.pressedStatusCtrl || ctrl.hoverStatusCtrl || ctrl.normalStatusCtrl;
      } else if (stateMode === 'disabled') {
        activeChild = ctrl.disabledStatusCtrl || ctrl.normalStatusCtrl;
      }

      for (const statusChild of ctrl._statusChildList) {
        const isTarget = statusChild === activeChild;
        statusChild.active = isTarget;
        statusChild.visible = isTarget;
      }
    }
  }

  // Hit test for controls from top to bottom (zero-allocation single accumulator pass)
  hitTestControls(x, y, control = this.rootControl, parentBounds = null, hits = []) {
    if (!control.visible || !control.alive || control.active === false) return hits;
    const bounds = control.getScreenBounds(this.width, this.height, parentBounds);
    const inside = x >= bounds.left && x <= bounds.right && y >= bounds.bottom && y <= bounds.top;

    const children = control.children;
    if (children && children.length > 0) {
      if (this.hasMountedScripts) {
        // In Interface Layout Editor (layered ordering), index 0 is the topmost layer
        for (let i = 0; i < children.length; i++) {
          this.hitTestControls(x, y, children[i], bounds, hits);
        }
      } else {
        // In procedural single-file scripts, last-created child is topmost
        for (let i = children.length - 1; i >= 0; i--) {
          this.hitTestControls(x, y, children[i], bounds, hits);
        }
      }
    }

    if (inside && (control.raycastTarget || control.hasCursorListeners)) {
      hits.push(control);
    }
    return hits;
  }

  dispatchLuaCursorCallback(callbackId, x, y) {
    if (!this.L) return;
    try {
      lua.lua_getglobal(this.L, LUA_STR_DISPATCH_CURSOR);
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
      lua.lua_getglobal(this.L, LUA_STR_DISPATCH_KEY);
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

    // Trailing cooldown gates for physical user canvas clicks (allow explicit targetControls to always fire)
    if (!targetControls) {
      if (eventType === 1) { // CursorClick
        if (now - this.lastClickTime < 60) return;
        this.lastClickTime = now;
      } else if (eventType === 2) { // CursorDown
        if (now - this.lastDownTime < 60) return;
        this.lastDownTime = now;
      }
    }

    const controls = targetControls || this.hitTestControls(x, y);

    let handled = false;
    for (const ctrl of controls) {
      if (eventType === 1 && ctrl.clickAudioId && ctrl.clickAudioId > 0) {
        this.playAudioEffect(ctrl.clickAudioId);
      }
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

  playAudioEffect(audioId) {
    const id = Number(audioId) || 0;
    if (id <= 0) return;
    try {
      if (!this._audioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this._audioCtx = new AudioCtx();
        }
      }
      if (!this._audioCtx) return;
      if (this._audioCtx.state === 'suspended') {
        this._audioCtx.resume();
      }
      const ctx = this._audioCtx;
      const now = ctx.currentTime;

      if (id === 50870) { // Button_Press_Heavy (Block Placement / Shoot)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (id === 40256 || id === 30006 || id === 30065) { // Combat_Hit_Impact_2 (Block Settle / Lock in Grid)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (id === 40230 || id === 40143) { // Combat_Hit_Impact_1 (Line Clear)
        [523.25, 659.25, 783.99].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.03);
          gain.gain.setValueAtTime(0.22, now + i * 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25 + i * 0.03);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.03);
          osc.stop(now + 0.28 + i * 0.03);
        });
      } else if (id === 40237) { // Combat_Hit_Impact_3 (Tetris Quad Clear)
        const sub = ctx.createOscillator();
        const subGain = ctx.createGain();
        sub.type = 'triangle';
        sub.frequency.setValueAtTime(140, now);
        sub.frequency.exponentialRampToValueAtTime(35, now + 0.35);
        subGain.gain.setValueAtTime(0.5, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        sub.connect(subGain);
        subGain.connect(ctx.destination);
        sub.start(now);
        sub.stop(now + 0.35);

        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.04);
          gain.gain.setValueAtTime(0.25, now + i * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.04);
          osc.stop(now + 0.48);
        });
      } else if (id === 50923) { // Block Spawned on Top (Panic Timer Expired)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(540, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.18);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);

        const sub = ctx.createOscillator();
        const subGain = ctx.createGain();
        sub.type = 'triangle';
        sub.frequency.setValueAtTime(160, now + 0.06);
        sub.frequency.exponentialRampToValueAtTime(50, now + 0.22);
        subGain.gain.setValueAtTime(0.35, now + 0.06);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        sub.connect(subGain);
        subGain.connect(ctx.destination);
        sub.start(now + 0.06);
        sub.stop(now + 0.22);
      } else if (id === 50926) { // Timer in the Red Reminder ID (Crisp, subtle dual alert chime)
        const freqs = [880, 1174.66];
        freqs.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.07);
          gain.gain.setValueAtTime(0.18, now + i * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.06);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.07);
          osc.stop(now + i * 0.07 + 0.065);
        });
      } else if (id === 50920) { // Game Over Alert
        [392.00, 349.23, 329.63, 261.63].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + i * 0.11);
          gain.gain.setValueAtTime(0.22, now + i * 0.11);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.11 + 0.24);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.11);
          osc.stop(now + i * 0.11 + 0.25);
        });
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.05);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      }
    } catch {}
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

      if (handled) {
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

    // Register direct C-API fast-path bridge functions to bypass fengari-interop proxy & UTF-8 string decoding
    const pushCFunc = lua.lua_pushcfunction || lua.lua_pushjsfunction;
    if (typeof pushCFunc === 'function') {
      const regFast = (name, fn) => {
        pushCFunc(this.L, fn);
        lua.lua_setglobal(this.L, to_luastring(name));
      };
      regFast('_M_FastSetPos', (L) => {
        const ctrl = this.controlsById.get(lua.lua_tointeger(L, 1));
        if (ctrl) {
          ctrl.anchoredPositionX = lua.lua_tonumber(L, 2) || 0;
          ctrl.anchoredPositionY = lua.lua_tonumber(L, 3) || 0;
        }
        return 0;
      });
      regFast('_M_FastSetSize', (L) => {
        const ctrl = this.controlsById.get(lua.lua_tointeger(L, 1));
        if (ctrl) {
          ctrl.sizeDeltaX = lua.lua_tonumber(L, 2) || 0;
          ctrl.sizeDeltaY = lua.lua_tonumber(L, 3) || 0;
        }
        return 0;
      });
      regFast('_M_FastSetVis', (L) => {
        const ctrl = this.controlsById.get(lua.lua_tointeger(L, 1));
        if (ctrl) {
          ctrl.visible = Boolean(lua.lua_toboolean(L, 2));
        }
        return 0;
      });
      regFast('_M_FastSetScale', (L) => {
        const ctrl = this.controlsById.get(lua.lua_tointeger(L, 1));
        if (ctrl) {
          ctrl.localScaleX = lua.lua_tonumber(L, 2);
          ctrl.localScaleY = lua.lua_tonumber(L, 3);
          ctrl.localScaleZ = lua.lua_tonumber(L, 4);
        }
        return 0;
      });
      regFast('_M_FastSetRot', (L) => {
        const ctrl = this.controlsById.get(lua.lua_tointeger(L, 1));
        if (ctrl) {
          ctrl.localRotationX = lua.lua_tonumber(L, 2) || 0;
          ctrl.localRotationY = lua.lua_tonumber(L, 3) || 0;
          ctrl.localRotationZ = lua.lua_tonumber(L, 4) || 0;
        }
        return 0;
      });
      regFast('_M_FastSetAnchorMin', (L) => {
        const ctrl = this.controlsById.get(lua.lua_tointeger(L, 1));
        if (ctrl) {
          ctrl.anchorMinX = lua.lua_tonumber(L, 2) || 0;
          ctrl.anchorMinY = lua.lua_tonumber(L, 3) || 0;
        }
        return 0;
      });
      regFast('_M_FastSetAnchorMax', (L) => {
        const ctrl = this.controlsById.get(lua.lua_tointeger(L, 1));
        if (ctrl) {
          ctrl.anchorMaxX = lua.lua_tonumber(L, 2) || 0;
          ctrl.anchorMaxY = lua.lua_tonumber(L, 3) || 0;
        }
        return 0;
      });
      regFast('_M_FastSetPivot', (L) => {
        const ctrl = this.controlsById.get(lua.lua_tointeger(L, 1));
        if (ctrl) {
          ctrl.pivotX = lua.lua_tonumber(L, 2) || 0;
          ctrl.pivotY = lua.lua_tonumber(L, 3) || 0;
        }
        return 0;
      });
      regFast('_M_FastSetImage', (L) => {
        const ctrl = this.controlsById.get(lua.lua_tointeger(L, 1));
        if (ctrl) {
          ctrl.SetImage(lua.lua_tointeger(L, 2) || 1, lua.lua_tointeger(L, 3) || 100001);
        }
        return 0;
      });
      regFast('_M_FastSetImgCol', (L) => {
        const ctrl = this.controlsById.get(lua.lua_tointeger(L, 1));
        if (ctrl) {
          ctrl.SetImageColor(
            lua.lua_tonumber(L, 2) || 0,
            lua.lua_tonumber(L, 3) || 0,
            lua.lua_tonumber(L, 4) || 0,
            lua.lua_tonumber(L, 5)
          );
        }
        return 0;
      });
      regFast('_M_FastSetBgCol', (L) => {
        const ctrl = this.controlsById.get(lua.lua_tointeger(L, 1));
        if (ctrl) {
          ctrl.SetBgColor(
            lua.lua_tonumber(L, 2) || 0,
            lua.lua_tonumber(L, 3) || 0,
            lua.lua_tonumber(L, 4) || 0,
            lua.lua_tonumber(L, 5)
          );
        }
        return 0;
      });
      regFast('_M_FastSetFontCol', (L) => {
        const ctrl = this.controlsById.get(lua.lua_tointeger(L, 1));
        if (ctrl) {
          ctrl.SetFontColor(
            lua.lua_tonumber(L, 2) || 0,
            lua.lua_tonumber(L, 3) || 0,
            lua.lua_tonumber(L, 4) || 0,
            lua.lua_tonumber(L, 5)
          );
        }
        return 0;
      });
      regFast('_M_FastSetOutlineCol', (L) => {
        const ctrl = this.controlsById.get(lua.lua_tointeger(L, 1));
        if (ctrl) {
          const r = lua.lua_tonumber(L, 2) || 0;
          const g = lua.lua_tonumber(L, 3) || 0;
          const b = lua.lua_tonumber(L, 4) || 0;
          const a = lua.lua_tonumber(L, 5);
          ctrl.outlineColor = { r, g, b, a: a !== null && a !== undefined ? a : 255 };
        }
        return 0;
      });
      regFast('_M_FastSetText', (L) => {
        const ctrl = this.controlsById.get(lua.lua_tointeger(L, 1));
        if (ctrl) {
          ctrl.text = getLuaStackString(L, 2);
        }
        return 0;
      });
      regFast('_M_FastSetFontSize', (L) => {
        const ctrl = this.controlsById.get(lua.lua_tointeger(L, 1));
        if (ctrl) {
          ctrl.fontSize = lua.lua_tonumber(L, 2) || 14;
        }
        return 0;
      });
      regFast('_M_FastGetCanvasSize', (L) => {
        lua.lua_pushnumber(L, this.width);
        lua.lua_pushnumber(L, this.height);
        return 2;
      });
      regFast('_M_FastGetCursorPos', (L) => {
        lua.lua_pushnumber(L, this.cursorX);
        lua.lua_pushnumber(L, this.cursorY);
        return 2;
      });
    }

    const bootstrapLua = `
      local js = require "js"
      local sim = js.global.__miliastra_sim
      local _FastSetPos = _M_FastSetPos
      local _FastSetSize = _M_FastSetSize
      local _FastSetVis = _M_FastSetVis
      local _FastSetScale = _M_FastSetScale
      local _FastSetRot = _M_FastSetRot
      local _FastSetAnchorMin = _M_FastSetAnchorMin
      local _FastSetAnchorMax = _M_FastSetAnchorMax
      local _FastSetPivot = _M_FastSetPivot
      local _FastSetImage = _M_FastSetImage
      local _FastSetImgCol = _M_FastSetImgCol
      local _FastSetBgCol = _M_FastSetBgCol
      local _FastSetFontCol = _M_FastSetFontCol
      local _FastSetOutlineCol = _M_FastSetOutlineCol
      local _FastSetText = _M_FastSetText
      local _FastSetFontSize = _M_FastSetFontSize
      local _FastGetCanvasSize = _M_FastGetCanvasSize
      local _FastGetCursorPos = _M_FastGetCursorPos

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

      -- 1. Miliastra Color Library (Memoized for 60FPS Zero-Allocation Loops)
      Color = {}
      Color.__index = Color
      local _ColorCache = {}

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
        r = tonumber(r) or 255
        g = tonumber(g) or 255
        b = tonumber(b) or 255
        a = a ~= nil and tonumber(a) or 255
        local key = ((r * 256 + g) * 256 + b) * 256 + a
        local cached = _ColorCache[key]
        if cached then return cached end
        local val = {
          r = r,
          g = g,
          b = b,
          a = a,
          _key = key,
          __isColor = true
        }
        setmetatable(val, ColorValueMeta)
        _ColorCache[key] = val
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
          Invalid = 0,
          CharacterSkill1Key = 23,
          CharacterSkill2Key = 24,
          CharacterSkill3Key = 11,
          CharacterSkill4Key = 5,
          MoveForwardKey = 27,
          MoveBackwardKey = 28,
          MoveLeftKey = 29,
          MoveRightKey = 30,
          NormalAttackKey = 21,
          SprintKey = 22,
          JumpKey = 20,
          InteractKey = 19,
          DropKey = 53,
          OpenShortcutWheelKey = 41,
          SwitchToWalkOrRunKey = 25,
          CraftspersonKey1 = 1, CraftspersonKey2 = 2, CraftspersonKey3 = 3, CraftspersonKey4 = 4, CraftspersonKey5 = 6,
          CraftspersonKey6 = 7, CraftspersonKey7 = 8, CraftspersonKey8 = 9, CraftspersonKey9 = 10, CraftspersonKey10 = 14,
          CraftspersonKey11 = 22, CraftspersonKey12 = 48, CraftspersonKey13 = 37, CraftspersonKey14 = 12, CraftspersonKey15 = 17,
          CraftspersonKey16 = 23, CraftspersonKey17 = 24, CraftspersonKey18 = 25, CraftspersonKey19 = 36, CraftspersonKey20 = 18,
          CraftspersonKey21 = 38, CraftspersonKey22 = 42, CraftspersonKey23 = 60, CraftspersonKey24 = 61, CraftspersonKey25 = 62,
          CraftspersonKey26 = 63, CraftspersonKey27 = 64, CraftspersonKey28 = 65, CraftspersonKey29 = 13, CraftspersonKey30 = 15,
          CraftspersonKey31 = 16, CraftspersonKey32 = 26, CraftspersonKey33 = 51, CraftspersonKey34 = 52, CraftspersonKey35 = 53,
          CraftspersonKey36 = 70, CraftspersonKey37 = 71, CraftspersonKey38 = 72, CraftspersonKey39 = 73, CraftspersonKey40 = 25,
          CraftspersonKey41 = 22, CraftspersonKey42 = 14, CraftspersonKey43 = 80,
          ESC = 31,
          Number1 = 1, Number2 = 2, Number3 = 3, Number4 = 4, Number5 = 6,
          Number6 = 7, Number7 = 8, Number8 = 9, Number9 = 10, Number0 = 14,
          Minus = 15, Equal = 16, BackSpace = 14, Tab = 41,
          Q = 24, W = 27, E = 23, R = 11, T = 5, Y = 37, U = 22, I = 23, O = 24, P = 25,
          LeftBracket = 26, RightBracket = 27, Enter = 38, LeftCtrl = 25,
          A = 29, S = 28, D = 30, F = 19, G = 12, H = 17, J = 36, K = 18, L = 38,
          Semicolon = 39, Quote = 40, Backquote = 13, LeftShift = 22, Backslash = 43,
          Z = 48, X = 53, C = 33, V = 42, B = 32, N = 49, M = 34,
          Comma = 51, Period = 52, Slash = 53, RightShift = 22, LeftAlt = 40, Space = 20,
          RightAlt = 40, RightCtrl = 25,
          KeyW = 27, KeyA = 29, KeyS = 28, KeyD = 30, KeyE = 23, KeyF = 19, KeyQ = 24, KeyR = 11, KeyX = 53
        },
        ControllerKeyCode = {
          None = 0,
          Invalid = 0,
          JumpKey = 1,
          NormalAttackKey = 2,
          InteractKey = 3,
          SprintKey = 12,
          CharacterSkill1Key = 14,
          CharacterSkill2Key = 4,
          CharacterSkill3Key = 5,
          CharacterSkill4Key = 6,
          CraftspersonKey1 = 5,
          CraftspersonKey2 = 6,
          CraftspersonKey3 = 13,
          CraftspersonKey4 = 4,
          CraftspersonKey5 = 3,
          CraftspersonKey6 = 1,
          CraftspersonKey7 = 5,
          CraftspersonKey8 = 8,
          CraftspersonKey9 = 7,
          CraftspersonKey10 = 6,
          CraftspersonKey11 = 12,
          CraftspersonKey12 = 13,
          CraftspersonKey13 = 14,
          CraftspersonKey14 = 9,
          MenuConfirmKey = 1,
          MenuBackKey = 2,
          DPadUp = 5, DPadDown = 6, DPadLeft = 7, DPadRight = 8,
          ActionTop = 4, ActionBottom = 1, ActionLeft = 3, ActionRight = 2,
          LeftStick = 9, RightStick = 10, LeftBumper = 11, RightBumper = 12,
          SpecialLeft = 13, SpecialRight = 14,
          LeftTrigger = 13, RightTrigger = 14,
          ButtonSouth = 1, ButtonEast = 2, ButtonWest = 3, ButtonNorth = 4, LeftShoulder = 11, RightShoulder = 12
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
          KeyboardCraftspersonKey1Down = 31, KeyboardCraftspersonKey2Down = 32, KeyboardCraftspersonKey3Down = 33,
          KeyboardCraftspersonKey4Down = 34, KeyboardCraftspersonKey5Down = 35, KeyboardCraftspersonKey6Down = 36,
          KeyboardCraftspersonKey7Down = 37, KeyboardCraftspersonKey8Down = 38, KeyboardCraftspersonKey9Down = 39,
          KeyboardCraftspersonKey10Down = 40, KeyboardCraftspersonKey11Down = 41, KeyboardCraftspersonKey12Down = 42,
          KeyboardCraftspersonKey13Down = 43, KeyboardCraftspersonKey14Down = 44, KeyboardCraftspersonKey15Down = 45,
          KeyboardCraftspersonKey16Down = 46, KeyboardCraftspersonKey17Down = 47, KeyboardCraftspersonKey18Down = 48,
          KeyboardCraftspersonKey19Down = 49, KeyboardCraftspersonKey20Down = 50, KeyboardCraftspersonKey21Down = 51,
          KeyboardCraftspersonKey22Down = 52, KeyboardCraftspersonKey23Down = 53, KeyboardCraftspersonKey24Down = 54,
          KeyboardCraftspersonKey25Down = 55, KeyboardCraftspersonKey26Down = 56, KeyboardCraftspersonKey27Down = 57,
          KeyboardCraftspersonKey28Down = 58, KeyboardCraftspersonKey29Down = 59, KeyboardCraftspersonKey30Down = 60,
          KeyboardCraftspersonKey31Down = 61, KeyboardCraftspersonKey32Down = 62, KeyboardCraftspersonKey33Down = 63,
          KeyboardCraftspersonKey34Down = 64, KeyboardCraftspersonKey35Down = 65, KeyboardCraftspersonKey36Down = 66,
          KeyboardCraftspersonKey37Down = 67, KeyboardCraftspersonKey38Down = 68, KeyboardCraftspersonKey39Down = 69,
          KeyboardCraftspersonKey40Down = 70, KeyboardCraftspersonKey41Down = 71, KeyboardCraftspersonKey42Down = 72,
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
          ControllerCharacterSkill4KeyDown = 93,
          KeyboardNumber1KeyDown = 1002, KeyboardNumber1KeyUp = 2002,
          KeyboardNumber2KeyDown = 1003, KeyboardNumber2KeyUp = 2003,
          KeyboardNumber3KeyDown = 1004, KeyboardNumber3KeyUp = 2004,
          KeyboardNumber4KeyDown = 1005, KeyboardNumber4KeyUp = 2005,
          KeyboardNumber5KeyDown = 1006, KeyboardNumber5KeyUp = 2006,
          KeyboardNumber6KeyDown = 1007, KeyboardNumber6KeyUp = 2007,
          KeyboardNumber7KeyDown = 1008, KeyboardNumber7KeyUp = 2008,
          KeyboardNumber8KeyDown = 1009, KeyboardNumber8KeyUp = 2009,
          KeyboardNumber9KeyDown = 1010, KeyboardNumber9KeyUp = 2010,
          KeyboardNumber0KeyDown = 1011, KeyboardNumber0KeyUp = 2011,
          KeyboardMinusKeyDown = 1012, KeyboardMinusKeyUp = 2012,
          KeyboardEqualKeyDown = 1013, KeyboardEqualKeyUp = 2013,
          KeyboardBackSpaceKeyDown = 1014, KeyboardBackSpaceKeyUp = 2014,
          KeyboardTabKeyDown = 1015, KeyboardTabKeyUp = 2015,
          KeyboardQKeyDown = 1016, KeyboardQKeyUp = 2016,
          KeyboardWKeyDown = 1017, KeyboardWKeyUp = 2017,
          KeyboardEKeyDown = 1018, KeyboardEKeyUp = 2018,
          KeyboardRKeyDown = 1019, KeyboardRKeyUp = 2019,
          KeyboardTKeyDown = 1020, KeyboardTKeyUp = 2020,
          KeyboardYKeyDown = 1021, KeyboardYKeyUp = 2021,
          KeyboardUKeyDown = 1022, KeyboardUKeyUp = 2022,
          KeyboardIKeyDown = 1023, KeyboardIKeyUp = 2023,
          KeyboardOKeyDown = 1024, KeyboardOKeyUp = 2024,
          KeyboardPKeyDown = 1025, KeyboardPKeyUp = 2025,
          KeyboardLeftBracketKeyDown = 1026, KeyboardLeftBracketKeyUp = 2026,
          KeyboardRightBracketKeyDown = 1027, KeyboardRightBracketKeyUp = 2027,
          KeyboardEnterKeyDown = 1028, KeyboardEnterKeyUp = 2028,
          KeyboardLeftCtrlKeyDown = 1029, KeyboardLeftCtrlKeyUp = 2029,
          KeyboardAKeyDown = 1030, KeyboardAKeyUp = 2030,
          KeyboardSKeyDown = 1031, KeyboardSKeyUp = 2031,
          KeyboardDKeyDown = 1032, KeyboardDKeyUp = 2032,
          KeyboardFKeyDown = 1033, KeyboardFKeyUp = 2033,
          KeyboardGKeyDown = 1034, KeyboardGKeyUp = 2034,
          KeyboardHKeyDown = 1035, KeyboardHKeyUp = 2035,
          KeyboardJKeyDown = 1036, KeyboardJKeyUp = 2036,
          KeyboardKKeyDown = 1037, KeyboardKKeyUp = 2037,
          KeyboardLKeyDown = 1038, KeyboardLKeyUp = 2038,
          KeyboardSemicolonKeyDown = 1039, KeyboardSemicolonKeyUp = 2039,
          KeyboardQuoteKeyDown = 1040, KeyboardQuoteKeyUp = 2040,
          KeyboardBackquoteKeyDown = 1041, KeyboardBackquoteKeyUp = 2041,
          KeyboardLeftShiftKeyDown = 1042, KeyboardLeftShiftKeyUp = 2042,
          KeyboardBackslashKeyDown = 1043, KeyboardBackslashKeyUp = 2043,
          KeyboardZKeyDown = 1044, KeyboardZKeyUp = 2044,
          KeyboardXKeyDown = 1045, KeyboardXKeyUp = 2045,
          KeyboardCKeyDown = 1046, KeyboardCKeyUp = 2046,
          KeyboardVKeyDown = 1047, KeyboardVKeyUp = 2047,
          KeyboardBKeyDown = 1048, KeyboardBKeyUp = 2048,
          KeyboardNKeyDown = 1049, KeyboardNKeyUp = 2049,
          KeyboardMKeyDown = 1050, KeyboardMKeyUp = 2050,
          KeyboardCommaKeyDown = 1051, KeyboardCommaKeyUp = 2051,
          KeyboardPeriodKeyDown = 1052, KeyboardPeriodKeyUp = 2052,
          KeyboardSlashKeyDown = 1053, KeyboardSlashKeyUp = 2053,
          KeyboardRightShiftKeyDown = 1054, KeyboardRightShiftKeyUp = 2054,
          KeyboardLeftAltKeyDown = 1056, KeyboardLeftAltKeyUp = 2056,
          KeyboardSpaceKeyDown = 1057, KeyboardSpaceKeyUp = 2057,
          KeyboardRightAltKeyDown = 1184, KeyboardRightAltKeyUp = 2184,
          KeyboardRightCtrlKeyDown = 1157, KeyboardRightCtrlKeyUp = 2157,
          ControllerDPadUpKeyDown = 3001, ControllerDPadUpKeyUp = 4001,
          ControllerDPadDownKeyDown = 3002, ControllerDPadDownKeyUp = 4002,
          ControllerDPadLeftKeyDown = 3003, ControllerDPadLeftKeyUp = 4003,
          ControllerDPadRightKeyDown = 3004, ControllerDPadRightKeyUp = 4004,
          ControllerActionTopKeyDown = 3005, ControllerActionTopKeyUp = 4005,
          ControllerActionBottomKeyDown = 3006, ControllerActionBottomKeyUp = 4006,
          ControllerActionLeftKeyDown = 3007, ControllerActionLeftKeyUp = 4007,
          ControllerActionRightKeyDown = 3008, ControllerActionRightKeyUp = 4008,
          ControllerLeftStickKeyDown = 3009, ControllerLeftStickKeyUp = 4009,
          ControllerRightStickKeyDown = 3010, ControllerRightStickKeyUp = 4010,
          ControllerLeftBumperKeyDown = 3011, ControllerLeftBumperKeyUp = 4011,
          ControllerRightBumperKeyDown = 3012, ControllerRightBumperKeyUp = 4012,
          ControllerSpecialLeftKeyDown = 3013, ControllerSpecialLeftKeyUp = 4013,
          ControllerSpecialRightKeyDown = 3014, ControllerSpecialRightKeyUp = 4014,
          ControllerLeftTriggerKeyDown = 3015, ControllerLeftTriggerKeyUp = 4015,
          ControllerRightTriggerKeyDown = 3016, ControllerRightTriggerKeyUp = 4016,
          ControllerLeftStickUpKeyDown = 3017, ControllerLeftStickUpKeyUp = 4017,
          ControllerLeftStickDownKeyDown = 3018, ControllerLeftStickDownKeyUp = 4018,
          ControllerLeftStickLeftKeyDown = 3019, ControllerLeftStickLeftKeyUp = 4019,
          ControllerLeftStickRightKeyDown = 3020, ControllerLeftStickRightKeyUp = 4020,
          ControllerRightStickUpKeyDown = 3021, ControllerRightStickUpKeyUp = 4021,
          ControllerRightStickDownKeyDown = 3022, ControllerRightStickDownKeyUp = 4022,
          ControllerRightStickLeftKeyDown = 3023, ControllerRightStickLeftKeyUp = 4023,
          ControllerRightStickRightKeyDown = 3024, ControllerRightStickRightKeyUp = 4024
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
          x = tonumber(x) or 0
          y = tonumber(y) or 0
          if self._ancMinX == x and self._ancMinY == y then return end
          self._ancMinX = x
          self._ancMinY = y
          _FastSetAnchorMin(self._id, x, y)
        end,
        SetAnchorMax = function(self, x, y)
          x = tonumber(x) or 0
          y = tonumber(y) or 0
          if self._ancMaxX == x and self._ancMaxY == y then return end
          self._ancMaxX = x
          self._ancMaxY = y
          _FastSetAnchorMax(self._id, x, y)
        end,
        SetPivot = function(self, x, y)
          x = tonumber(x) or 0
          y = tonumber(y) or 0
          if self._pivX == x and self._pivY == y then return end
          self._pivX = x
          self._pivY = y
          _FastSetPivot(self._id, x, y)
        end,
        SetAnchoredPosition = function(self, x, y)
          x = tonumber(x) or 0
          y = tonumber(y) or 0
          if self._posX == x and self._posY == y then return end
          self._posX = x
          self._posY = y
          _FastSetPos(self._id, x, y)
        end,
        SetSizeDelta = function(self, w, h)
          w = tonumber(w) or 0
          h = tonumber(h) or 0
          if self._sizeW == w and self._sizeH == h then return end
          self._sizeW = w
          self._sizeH = h
          _FastSetSize(self._id, w, h)
        end,
        SetLocalScale = function(self, x, y, z)
          x = x ~= nil and tonumber(x) or 1
          y = y ~= nil and tonumber(y) or 1
          z = z ~= nil and tonumber(z) or 1
          if self._scaleX == x and self._scaleY == y and self._scaleZ == z then return end
          self._scaleX = x
          self._scaleY = y
          self._scaleZ = z
          _FastSetScale(self._id, x, y, z)
        end,
        SetLocalRotation = function(self, x, y, z)
          x = x ~= nil and tonumber(x) or 0
          y = y ~= nil and tonumber(y) or 0
          z = z ~= nil and tonumber(z) or 0
          if self._rotX == x and self._rotY == y and self._rotZ == z then return end
          self._rotX = x
          self._rotY = y
          self._rotZ = z
          _FastSetRot(self._id, x, y, z)
        end,
        SetActive = function(self, active)
          local raw = self._raw
          local wasActive = raw.active ~= false
          local nextActive = not not active
          raw:SetActive(nextActive)
          if wasActive ~= nextActive then
            local scripts = _ControlScripts[tostring(self._id)]
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
          if not nextActive and (raw == sim.scriptHost or raw == sim.rootControl or not sim.hasMountedScripts) then
            sim:requestCloseFromLua(tostring(raw.name or "script.object"))
          end
        end,
        SetImage = function(self, src, resId)
          src = tonumber(src) or 1
          resId = tonumber(resId) or 100001
          if self._imgSrc == src and self._resId == resId then return end
          self._imgSrc = src
          self._resId = resId
          _FastSetImage(self._id, src, resId)
        end,
        SetVisible = function(self, vis)
          local v = not not vis
          if self._vis == v then return end
          self._vis = v
          _FastSetVis(self._id, v)
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
          sim.hasAnyCursorListeners = true
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
          local raw = self._raw
          local count = math.max(0, math.floor(tonumber(itemCount) or 0))
          raw.itemCount = count

          -- Destroy previously managed list items
          if raw._gridItems then
            for i = 1, #raw._gridItems do
              local oldItem = raw._gridItems[i]
              if oldItem and oldItem.Destroy then
                oldItem:Destroy()
              end
            end
          end
          raw._gridItems = {}
          raw._hasRefreshedItems = true

          local boxW = math.max(40, tonumber(raw.sizeDeltaX) or 240)
          local boxH = math.max(40, tonumber(raw.sizeDeltaY) or 120)
          local itemW = math.max(12, tonumber(raw.itemWidth) or 56)
          local itemH = math.max(12, tonumber(raw.itemHeight) or 36)
          local spaceX = math.max(0, tonumber(raw.spacingX) or 6)
          local spaceY = math.max(0, tonumber(raw.spacingY) or 6)
          local padT = math.max(0, tonumber(raw.paddingTop) or 6)
          local padL = math.max(0, tonumber(raw.paddingLeft) or 6)
          local padR = math.max(0, tonumber(raw.paddingRight) or 6)
          local padB = math.max(0, tonumber(raw.paddingBottom) or 6)
          local isVert = (raw.scrollDirection == nil or raw.scrollDirection == 1)
          local isFixed = (raw.layoutConstraint == 1)
          local sbRes = (raw.showScrollBar ~= false) and 10 or 0

          local crossCount = 1
          if isFixed then
            crossCount = math.max(1, math.floor(tonumber(raw.layoutConstraintFixedCount) or 3))
          else
            if isVert then
              local availW = math.max(itemW, boxW - padL - padR - sbRes)
              crossCount = math.max(1, math.floor((availW + spaceX) / (itemW + spaceX)))
            else
              local availH = math.max(itemH, boxH - padT - padB - sbRes)
              crossCount = math.max(1, math.floor((availH + spaceY) / (itemH + spaceY)))
            end
          end

          for idx = 0, count - 1 do
            local itemCtrl = sim:createControl(raw.itemPrefabIndex or 1073741954, raw)
            local col = isVert and (idx % crossCount) or math.floor(idx / crossCount)
            local row = isVert and math.floor(idx / crossCount) or (idx % crossCount)
            local cellLeft = padL + col * (itemW + spaceX)
            local cellTop = padT + row * (itemH + spaceY)

            -- Anchor each cell relative to top-left (0, 1) of the GridScroller
            itemCtrl.anchorMinX = 0
            itemCtrl.anchorMinY = 1
            itemCtrl.anchorMaxX = 0
            itemCtrl.anchorMaxY = 1
            itemCtrl.pivotX = 0
            itemCtrl.pivotY = 1
            itemCtrl.anchoredPositionX = cellLeft
            itemCtrl.anchoredPositionY = -cellTop
            itemCtrl.sizeDeltaX = itemW
            itemCtrl.sizeDeltaY = itemH
            itemCtrl.raycastTarget = true
            itemCtrl._gridItemIndex = idx
            itemCtrl._gridOwner = raw
            table.insert(raw._gridItems, itemCtrl)

            if callback then
              callback(wrapControl(itemCtrl), idx)
            end
          end
        end,
        GetItemIndex = function(self, control)
          if not control or not control._raw then return -1 end
          local itemRaw = control._raw
          if itemRaw._gridOwner == self._raw and itemRaw._gridItemIndex ~= nil then
            return itemRaw._gridItemIndex
          end
          return -1
        end,
        GetItemSize = function(self)
          local raw = self._raw
          return tonumber(raw.itemWidth) or 56, tonumber(raw.itemHeight) or 36
        end,
        GetItemSpacing = function(self)
          local raw = self._raw
          return tonumber(raw.spacingX) or 6, tonumber(raw.spacingY) or 6
        end,
        GetPadding = function(self)
          local raw = self._raw
          return tonumber(raw.paddingTop) or 6, tonumber(raw.paddingBottom) or 6, tonumber(raw.paddingLeft) or 6, tonumber(raw.paddingRight) or 6
        end,
        ScrollToItemAt = function(self, index, scrollAlignType)
          local raw = self._raw
          local count = math.max(1, tonumber(raw.itemCount) or 1)
          local clamped = math.max(0, math.min(count - 1, math.floor(tonumber(index) or 0)))
          raw.scrollProgress = count > 1 and (clamped / (count - 1)) or 0
        end,
        GetContentLength = function(self)
          local raw = self._raw
          local count = math.max(0, tonumber(raw.itemCount) or 0)
          if count == 0 then return 0 end
          local isVert = (raw.scrollDirection == nil or raw.scrollDirection == 1)
          local itemW = tonumber(raw.itemWidth) or 56
          local itemH = tonumber(raw.itemHeight) or 36
          local spaceX = tonumber(raw.spacingX) or 6
          local spaceY = tonumber(raw.spacingY) or 6
          local padT = tonumber(raw.paddingTop) or 6
          local padB = tonumber(raw.paddingBottom) or 6
          local padL = tonumber(raw.paddingLeft) or 6
          local padR = tonumber(raw.paddingRight) or 6
          if isVert then
            local baseLen = padT + padB - spaceY
            return baseLen + (itemH + spaceY) * count
          else
            local baseLen = padL + padR - spaceX
            return baseLen + (itemW + spaceX) * count
          end
        end,
        PlayAnimation = function(self)
          self._raw._animPlaying = true
          self._raw._animRestartCount = (self._raw._animRestartCount or 0) + 1
        end,
        StopAnimation = function(self)
          self._raw._animPlaying = false
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
        name = function(t, v) t._raw.name = v end,
        parent = function(t, v)
          local jsCtrl = t._raw
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
        text = function(t, v)
          local s = tostring(v)
          if t._text == s then return end
          t._text = s
          _FastSetText(t._id, s)
        end,
        fontSize = function(t, v)
          local sz = tonumber(v) or 14
          if t._fontSize == sz then return end
          t._fontSize = sz
          _FastSetFontSize(t._id, sz)
        end,
        fontColor = function(t, v)
          if type(v) == "table" then
            local key = v._key
            if key and t._fontColKey == key then return end
            t._fontColKey = key
            _FastSetFontCol(t._id, tonumber(v.r) or 255, tonumber(v.g) or 255, tonumber(v.b) or 255, v.a ~= nil and tonumber(v.a) or 255)
          else
            t._fontColKey = nil
            t._raw.fontColor = v
          end
        end,
        bgColor = function(t, v)
          if type(v) == "table" then
            local key = v._key
            if key and t._bgColKey == key then return end
            t._bgColKey = key
            _FastSetBgCol(t._id, tonumber(v.r) or 0, tonumber(v.g) or 0, tonumber(v.b) or 0, v.a ~= nil and tonumber(v.a) or 0)
          else
            t._bgColKey = nil
            t._raw.bgColor = v
          end
        end,
        imageColor = function(t, v)
          if type(v) == "table" then
            local key = v._key
            if key and t._imgColKey == key then return end
            t._imgColKey = key
            _FastSetImgCol(t._id, tonumber(v.r) or 255, tonumber(v.g) or 255, tonumber(v.b) or 255, v.a ~= nil and tonumber(v.a) or 255)
          else
            t._imgColKey = nil
            t._raw.imageColor = v
          end
        end,
        outlineColor = function(t, v)
          if type(v) == "table" then
            _FastSetOutlineCol(t._id, tonumber(v.r) or 0, tonumber(v.g) or 0, tonumber(v.b) or 0, v.a ~= nil and tonumber(v.a) or 255)
          end
        end,
        enableOutline = function(t, v) t._raw.enableOutline = not not v end,
        minimumFontSize = function(t, v) t._raw.minimumFontSize = tonumber(v) or 10 end,
        imageType = function(t, v)
          local it = tonumber(v) or 4
          if t._imageType == it then return end
          t._imageType = it
          t._raw.imageType = it
        end,
        resourceId = function(t, v)
          local rid = tonumber(v) or v or 100001
          if t._resId == rid then return end
          t._resId = rid
          t._raw.resourceId = rid
          if t._raw.imageColor.a == 0 and not t._raw._explicitImageColor then
            _FastSetImgCol(t._id, 255, 255, 255, 255)
          end
        end,
        imageId = function(t, v)
          local rid = tonumber(v) or v or 100001
          if t._resId == rid then return end
          t._resId = rid
          t._raw.resourceId = rid
          if t._raw.imageColor.a == 0 and not t._raw._explicitImageColor then
            _FastSetImgCol(t._id, 255, 255, 255, 255)
          end
        end,
        anchoredPositionX = function(t, v)
          local x = tonumber(v) or 0
          if t._posX == x then return end
          t._posX = x
          local y = t._posY
          if y == nil then
            y = t._raw.anchoredPositionY or 0
            t._posY = y
          end
          _FastSetPos(t._id, x, y)
        end,
        anchoredPositionY = function(t, v)
          local y = tonumber(v) or 0
          if t._posY == y then return end
          t._posY = y
          local x = t._posX
          if x == nil then
            x = t._raw.anchoredPositionX or 0
            t._posX = x
          end
          _FastSetPos(t._id, x, y)
        end,
        sizeDeltaX = function(t, v)
          local w = tonumber(v) or 0
          if t._sizeW == w then return end
          t._sizeW = w
          local h = t._sizeH
          if h == nil then
            h = t._raw.sizeDeltaY or 0
            t._sizeH = h
          end
          _FastSetSize(t._id, w, h)
        end,
        sizeDeltaY = function(t, v)
          local h = tonumber(v) or 0
          if t._sizeH == h then return end
          t._sizeH = h
          local w = t._sizeW
          if w == nil then
            w = t._raw.sizeDeltaX or 0
            t._sizeW = w
          end
          _FastSetSize(t._id, w, h)
        end,
        localScaleX = function(t, v)
          local x = tonumber(v) ~= nil and tonumber(v) or 1
          if t._scaleX == x then return end
          t._scaleX = x
          local y = t._scaleY ~= nil and t._scaleY or (t._raw.localScaleY or 1)
          local z = t._scaleZ ~= nil and t._scaleZ or (t._raw.localScaleZ or 1)
          t._scaleY = y
          t._scaleZ = z
          _FastSetScale(t._id, x, y, z)
        end,
        localScaleY = function(t, v)
          local y = tonumber(v) ~= nil and tonumber(v) or 1
          if t._scaleY == y then return end
          t._scaleY = y
          local x = t._scaleX ~= nil and t._scaleX or (t._raw.localScaleX or 1)
          local z = t._scaleZ ~= nil and t._scaleZ or (t._raw.localScaleZ or 1)
          t._scaleX = x
          t._scaleZ = z
          _FastSetScale(t._id, x, y, z)
        end,
        localScaleZ = function(t, v)
          local z = tonumber(v) ~= nil and tonumber(v) or 1
          if t._scaleZ == z then return end
          t._scaleZ = z
          local x = t._scaleX ~= nil and t._scaleX or (t._raw.localScaleX or 1)
          local y = t._scaleY ~= nil and t._scaleY or (t._raw.localScaleY or 1)
          t._scaleX = x
          t._scaleY = y
          _FastSetScale(t._id, x, y, z)
        end,
        localRotationX = function(t, v)
          local x = tonumber(v) ~= nil and tonumber(v) or 0
          if t._rotX == x then return end
          t._rotX = x
          local y = t._rotY ~= nil and t._rotY or (t._raw.localRotationY or 0)
          local z = t._rotZ ~= nil and t._rotZ or (t._raw.localRotationZ or 0)
          _FastSetRot(t._id, x, y, z)
        end,
        localRotationY = function(t, v)
          local y = tonumber(v) ~= nil and tonumber(v) or 0
          if t._rotY == y then return end
          t._rotY = y
          local x = t._rotX ~= nil and t._rotX or (t._raw.localRotationX or 0)
          local z = t._rotZ ~= nil and t._rotZ or (t._raw.localRotationZ or 0)
          _FastSetRot(t._id, x, y, z)
        end,
        localRotationZ = function(t, v)
          local z = tonumber(v) ~= nil and tonumber(v) or 0
          if t._rotZ == z then return end
          t._rotZ = z
          local x = t._rotX ~= nil and t._rotX or (t._raw.localRotationX or 0)
          local y = t._rotY ~= nil and t._rotY or (t._raw.localRotationY or 0)
          _FastSetRot(t._id, x, y, z)
        end,
        anchorMinX = function(t, v) t._raw.anchorMinX = tonumber(v) or 0 end,
        anchorMinY = function(t, v) t._raw.anchorMinY = tonumber(v) or 0 end,
        anchorMaxX = function(t, v) t._raw.anchorMaxX = tonumber(v) or 0 end,
        anchorMaxY = function(t, v) t._raw.anchorMaxY = tonumber(v) or 0 end,
        pivotX = function(t, v) t._raw.pivotX = tonumber(v) or 0.5 end,
        pivotY = function(t, v) t._raw.pivotY = tonumber(v) or 0.5 end,
        visible = function(t, v)
          local vis = not not v
          if t._vis == vis then return end
          t._vis = vis
          _FastSetVis(t._id, vis)
        end,
        alive = function(t, v) t._raw.alive = not not v end,
        active = function(t, v) t._raw.active = not not v end,
        interactable = function(t, v) t._raw.interactable = not not v end,
        raycastTarget = function(t, v) t._raw.raycastTarget = not not v end,
        adaptiveFontSize = function(t, v) t._raw.adaptiveFontSize = not not v end,
        horizontalAlignment = function(t, v) t._raw.horizontalAlignment = tonumber(v) or 1 end,
        verticalAlignment = function(t, v) t._raw.verticalAlignment = tonumber(v) or 1 end,
        canControllerFocus = function(t, v) t._raw.canControllerFocus = not not v end,
        isolateNavigation = function(t, v) t._raw.isolateNavigation = not not v end,
        disableCursorEventPassthrough = function(t, v) t._raw.disableCursorEventPassthrough = not not v end,
        disableKeyEventPassthrough = function(t, v) t._raw.disableKeyEventPassthrough = not not v end,
        showCursor = function(t, v) t._raw.showCursor = not not v end,
        enableMask = function(t, v) t._raw.enableMask = not not v end,
        enableSoftEdge = function(t, v) t._raw.enableSoftEdge = not not v end,
        softEdgeWidthX = function(t, v) t._raw.softEdgeWidthX = tonumber(v) or 0 end,
        softEdgeWidthY = function(t, v) t._raw.softEdgeWidthY = tonumber(v) or 0 end,
        horizontalSoftRange = function(t, v) t._raw.horizontalSoftRange = tonumber(v) or 0 end,
        verticalSoftRange = function(t, v) t._raw.verticalSoftRange = tonumber(v) or 0 end,
        softEdgeMode = function(t, v) t._raw.softEdgeMode = tonumber(v) or 1 end,
        reverseMaskArea = function(t, v) t._raw.reverseMaskArea = not not v end,
        fillType = function(t, v) t._raw.fillType = tonumber(v) or 0 end,
        fillHorizontalType = function(t, v) t._raw.fillHorizontalType = tonumber(v) or 0 end,
        fillVerticalType = function(t, v) t._raw.fillVerticalType = tonumber(v) or 0 end,
        fillRadial90Type = function(t, v) t._raw.fillRadial90Type = tonumber(v) or 0 end,
        fillRadialType = function(t, v) t._raw.fillRadialType = tonumber(v) or 0 end,
        fillAmount = function(t, v) t._raw.fillAmount = tonumber(v) or 1 end,
        showScrollBar = function(t, v) t._raw.showScrollBar = not not v end,
        clickAudioId = function(t, v) t._raw.clickAudioId = tonumber(v) or 0 end,
        itemPrefabIndex = function(t, v) t._raw.itemPrefabIndex = tonumber(v) or 1073741852 end,
        scrollProgress = function(t, v) t._raw.scrollProgress = tonumber(v) or 0 end,
        animationId = function(t, v)
          local nextId = tonumber(v) or 0
          t._raw.animationId = nextId
          t._raw._animPlaying = nextId > 0
          t._raw._animRestartCount = (t._raw._animRestartCount or 0) + 1
        end,
        playSoundEffect = function(t, v) t._raw.playSoundEffect = not not v end,
        layer = function(t, v) t._raw.layer = tonumber(v) or 0 end,
        keyboardKeyCode = function(t, v)
          t._raw.className = "ClientUIKeyHintControl"
          t._raw.keyboardKeyCode = tonumber(v) or 0
        end,
        controllerKeyCode = function(t, v)
          t._raw.className = "ClientUIKeyHintControl"
          t._raw.controllerKeyCode = tonumber(v) or 0
        end
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
            s(t, v)
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

        local obj = {
          _raw = jsCtrl,
          _id = jsCtrl.id,
          SetAnchorMin = _ControlMethods.SetAnchorMin,
          SetAnchorMax = _ControlMethods.SetAnchorMax,
          SetPivot = _ControlMethods.SetPivot,
          SetAnchoredPosition = _ControlMethods.SetAnchoredPosition,
          SetSizeDelta = _ControlMethods.SetSizeDelta,
          SetLocalScale = _ControlMethods.SetLocalScale,
          SetLocalRotation = _ControlMethods.SetLocalRotation,
          SetActive = _ControlMethods.SetActive,
          SetImage = _ControlMethods.SetImage,
          SetVisible = _ControlMethods.SetVisible,
          SetSoftEdgeWidth = _ControlMethods.SetSoftEdgeWidth,
          SetAsLastSibling = _ControlMethods.SetAsLastSibling,
          SetAsFirstSibling = _ControlMethods.SetAsFirstSibling
        }
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
        if next(_ActiveTweens) ~= nil then
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
        end

        if next(_ActiveSequences) ~= nil then
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
        GetUICanvasSize = _FastGetCanvasSize,
        GetCanvasSize = _FastGetCanvasSize,
        GetScreenResolution = _FastGetCanvasSize,
        GetWindowResolution = _FastGetCanvasSize,
        GetUISize = _FastGetCanvasSize,
        GetScreenWidth = function()
          local w, _ = _FastGetCanvasSize()
          return w
        end,
        GetScreenHeight = function()
          local _, h = _FastGetCanvasSize()
          return h
        end,

        GetCursorUIPos = _FastGetCursorPos,

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
          sim:playAudioEffect(id)
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
              local sigName = tostring(name or "")
              sim.lastSentSignal = sigName
              sim:log("[ServerSignal: " .. sigName .. "] Dispatched with " .. tostring(#params) .. " params", "info")
              local upperName = string.upper(sigName)
              if string.find(upperName, "EXIT", 1, true) or string.find(upperName, "CLOSE", 1, true) or string.find(upperName, "QUIT", 1, true) then
                sim:log("[Node Graph] Signal '" .. sigName .. "' -> Set UI Control (Group) Status: UI Control Group Status_Off", "info")
                sim:requestCloseFromLua("ServerSignal('" .. sigName .. "') -> UI Control Group Status_Off")
              end
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
      const mirrorSignX = node.mirrorX ? -1 : 1;
      const mirrorSignY = node.mirrorY ? -1 : 1;
      ctrl.localScaleX = mirrorSignX * (node.scaleX !== undefined ? node.scaleX : 1);
      ctrl.localScaleY = mirrorSignY * (node.scaleY !== undefined ? node.scaleY : 1);
      ctrl.localRotationZ = node.rotationZ || 0;
      ctrl.interactable = node.interactable !== false;
      ctrl.raycastTarget = Boolean(node.raycastTarget);
      ctrl.active = node.active !== false;
      ctrl.visible = node.visible !== false && node.active !== false;

      if (node.resourceId) {
        ctrl.resourceId = Number(node.resourceId) || 100001;
      }
      if (node.bgColor) {
        ctrl.SetBgColor(node.bgColor);
      }
      if (node.imageColor) {
        ctrl.SetImageColor(node.imageColor);
      }
      if (node.text !== undefined) {
        ctrl.text = node.text;
        ctrl.fontSize = node.fontSize || 14;
        ctrl.adaptiveFontSize = Boolean(node.adaptiveFontSize);
        ctrl.minFontSize = node.minFontSize || 12;
        ctrl.enableOutline = Boolean(node.enableOutline);
        ctrl.outlineColor = node.outlineColor || null;
        if (node.alignH) {
          ctrl.horizontalAlignment = node.alignH === 'center' ? 1 : (node.alignH === 'right' ? 2 : 0);
        }
        if (node.alignV) {
          ctrl.verticalAlignment = node.alignV === 'middle' ? 1 : (node.alignV === 'bottom' ? 2 : 0);
        }
        if (node.fontColor) ctrl.SetFontColor(node.fontColor);
      }
      if (node.enableMask) {
        ctrl.enableMask = true;
        ctrl.enableSoftEdge = Boolean(node.enableSoftEdge);
        ctrl.softMode = node.softMode || 'Percentage';
        ctrl.softRangeH = node.softRangeH ?? 43.11;
        ctrl.softRangeV = node.softRangeV ?? 39.67;
        ctrl.softEdgeWidthX = node.softEdgeWidthX || 12;
        ctrl.softEdgeWidthY = node.softEdgeWidthY || 12;
        ctrl.enableFillByProgress = Boolean(node.enableFillByProgress);
        ctrl.fillShape = node.fillShape || 'Vertical';
        ctrl.fillDirection = node.fillDirection || 'From Bottom to Top';
        ctrl.fillStartLocation = node.fillStartLocation || 'Top';
        ctrl.fillAmount = node.fillAmount !== undefined ? node.fillAmount : 100;
        ctrl.invertMask = Boolean(node.invertMask);
      } else if (node.enableSoftEdge) {
        ctrl.enableSoftEdge = true;
        ctrl.softEdgeWidthX = node.softEdgeWidthX || 8;
        ctrl.softEdgeWidthY = node.softEdgeWidthY || 8;
      }
      if (node.referencedPrefabIndex) {
        ctrl.referencedPrefabIndex = node.referencedPrefabIndex;
      }
      if (node.className === 'ClientUITextWindowControl') {
        ctrl.interactable = node.interactable !== false;
        ctrl.showScrollBar = node.showScrollBar !== false;
      }
      if (node.className === 'ClientUIContainerControl') {
        ctrl.isolateNavigation = Boolean(node.isolateNavigation);
        ctrl.disableKeyEventPassthrough = Boolean(node.disableKeyEventPassthrough);
        ctrl.disableCursorEventPassthrough = Boolean(node.disableCursorEventPassthrough);
        ctrl.showCursor = Boolean(node.showCursor);
      }
      if (node.className === 'ClientUICursorEventAreaControl') {
        ctrl.persistentAreaPreview = Boolean(node.persistentAreaPreview);
        ctrl.raycastTarget = Boolean(node.raycastTarget);
      }
      if (node.className === 'ClientUIGridScrollerControl') {
        ctrl.interactable = node.interactable !== false;
        ctrl.showScrollBar = node.showScrollBar !== false;
        ctrl.raycastTarget = node.raycastTarget !== false;
        ctrl.scrollDirection = (node.scrollDirection === 'Horizontal' || node.scrollDirection === 0) ? 0 : 1;
        ctrl.layoutConstraint = (node.layoutConstraint === 'Fixed' || node.layoutConstraint === 1) ? 1 : 0;
        ctrl.layoutConstraintFixedCount = ctrl.layoutConstraint === 1 ? Math.max(1, Number(node.layoutConstraintFixedCount) || 3) : 0;
        ctrl.itemPrefabIndex = Number(node.itemPrefabIndex) !== undefined ? Number(node.itemPrefabIndex) : 1073741954;
        ctrl.itemCount = Math.max(0, Number(node.itemCount) ?? 12);
        ctrl.itemWidth = Math.max(12, Number(node.itemWidth) || 56);
        ctrl.itemHeight = Math.max(12, Number(node.itemHeight) || 36);
        ctrl.spacingX = Math.max(0, Number(node.spacingX) ?? 6);
        ctrl.spacingY = Math.max(0, Number(node.spacingY) ?? 6);
        ctrl.paddingTop = Math.max(0, Number(node.paddingTop) ?? 6);
        ctrl.paddingBottom = Math.max(0, Number(node.paddingBottom) ?? 6);
        ctrl.paddingLeft = Math.max(0, Number(node.paddingLeft) ?? 6);
        ctrl.paddingRight = Math.max(0, Number(node.paddingRight) ?? 6);
        ctrl.scrollProgress = Math.max(0, Math.min(1, Number(node.scrollProgress) || 0));
        ctrl.gridPreviewMode = node.gridPreviewMode || 'template';
      }
      if (node.className === 'ClientUIFullscreenAnimationControl' || node.className === 'ClientUIAnimationControl') {
        ctrl.animationId = Number(node.animationId) || 0;
        ctrl.playSoundEffect = Boolean(node.playSoundEffect);
        ctrl.layer = Number(node.layer) || 0;
        ctrl._animPlaying = ctrl.animationId > 0;
        ctrl._animStartTime = performance.now();
        ctrl._animLastRestart = 0;
      }
      if (node.className === 'ClientUIKeyHintControl') {
        ctrl.keyboardKeyCode = node.keyboardKeyCode !== undefined ? Number(node.keyboardKeyCode) : 2;
        ctrl.controllerKeyCode = node.controllerKeyCode !== undefined ? Number(node.controllerKeyCode) : 6;
        ctrl.previewKeyHintDevice = node.previewKeyHintDevice || 'keyboard';
        ctrl.playerCustomKeyOverride = node.playerCustomKeyOverride || '';
      }
      if (node.className === 'ClientUIPresetButtonControl') {
        ctrl.clickAudioId = node.clickAudioId !== undefined ? node.clickAudioId : 1001;
        ctrl.normalStatusNodeKey = node.normalStatusNodeKey || '';
        ctrl.hoverStatusNodeKey = node.hoverStatusNodeKey || '';
        ctrl.pressedStatusNodeKey = node.pressedStatusNodeKey || '';
        ctrl.disabledStatusNodeKey = node.disabledStatusNodeKey || '';
      }

      this.controlsById.set(ctrl.id, ctrl);
      createdControls.set(node.key || node.name, ctrl);

      if (node.script && node.script.code) {
        mountScriptHelper(ctrl, node.script);
      }
    }

    // Wire 1-tier direct child status nodes for all ClientUIPresetButtonControl instances
    for (const ctrl of this.controlsById.values()) {
      if (ctrl.className !== 'ClientUIPresetButtonControl') continue;
      const resolveDirectChild = (keyOrName) => {
        if (!keyOrName) return null;
        const c = createdControls.get(keyOrName);
        if (c && c.parent === ctrl) return c;
        return ctrl.children.find(ch => ch.name === keyOrName) || null;
      };
      ctrl.normalStatusCtrl = resolveDirectChild(ctrl.normalStatusNodeKey);
      ctrl.hoverStatusCtrl = resolveDirectChild(ctrl.hoverStatusNodeKey);
      ctrl.pressedStatusCtrl = resolveDirectChild(ctrl.pressedStatusNodeKey);
      ctrl.disabledStatusCtrl = resolveDirectChild(ctrl.disabledStatusNodeKey);
      ctrl._statusChildList = [
        ctrl.normalStatusCtrl,
        ctrl.hoverStatusCtrl,
        ctrl.pressedStatusCtrl,
        ctrl.disabledStatusCtrl
      ].filter((v, i, arr) => v && arr.indexOf(v) === i);
      ctrl._hasStateMachine = ctrl._statusChildList.length > 0;
      if (ctrl._hasStateMachine) {
        this.hasAnyCursorListeners = true;
      }
    }
    this.updateButtonStateMachines();

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
    this.hasMountedScripts = Boolean(resolvedScene);
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
      if (elapsed <= 0) {
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
        lua.lua_getglobal(this.L, LUA_STR_UPDATE_TWEENS);
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
          lua.lua_getglobal(this.L, LUA_STR_ON_UPDATE);
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
        if (this.hasMountedScripts) {
          lua.lua_getglobal(this.L, LUA_STR_UPDATE_MOUNTED);
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
    if (!ctrl || !ctrl.visible || !ctrl.alive || ctrl.active === false) return;

    const ctx = this.ctx;
    const bounds = ctrl.getScreenBounds(this.width, this.height, parentBounds, true);
    const canvasY = this.height - bounds.top; // Convert bottom-left to top-left for Canvas2D
    const rotZ = ctrl.localRotationZ || 0;
    const mirrorSignX = (ctrl.localScaleX !== undefined && ctrl.localScaleX < 0) ? -1 : 1;
    const mirrorSignY = (ctrl.localScaleY !== undefined && ctrl.localScaleY < 0) ? -1 : 1;
    const hasTransform = rotZ !== 0 || mirrorSignX < 0 || mirrorSignY < 0;

    if (hasTransform) {
      ctx.save();
      const pivotCanvasX = bounds.pivotScreenX !== undefined ? bounds.pivotScreenX : (bounds.left + bounds.width / 2);
      const pivotCanvasY = bounds.pivotScreenY !== undefined ? (this.height - bounds.pivotScreenY) : (canvasY + bounds.height / 2);
      ctx.translate(pivotCanvasX, pivotCanvasY);
      if (rotZ !== 0) {
        ctx.rotate((-rotZ * Math.PI) / 180);
      }
      if (mirrorSignX < 0 || mirrorSignY < 0) {
        ctx.scale(mirrorSignX, mirrorSignY);
      }
      ctx.translate(-pivotCanvasX, -pivotCanvasY);
    }

    // 1. Draw Background / Shape (with special Keycap / Gamepad badge renderer for ClientUIKeyHintControl)
    if (ctrl.className === 'ClientUIKeyHintControl') {
      const kbMeta = getKeyboardKeyHintMeta(ctrl.keyboardKeyCode ?? 2);
      const ctrlMeta = getControllerKeyHintMeta(ctrl.controllerKeyCode ?? 6);
      const isGamepad = this.currentDevice === 2 || this.currentDevice === 4 || ctrl.previewKeyHintDevice === 'gamepad';
      const customKey = String(ctrl.playerCustomKeyOverride || '').trim();
      const labelStr = isGamepad ? (ctrlMeta.badgeText || 'A') : (customKey || kbMeta.badgeText || '1');
      const isRebound = !isGamepad && Boolean(customKey && customKey !== kbMeta.badgeText);

      ctx.save();
      const r = isGamepad ? Math.max(4, Math.min(bounds.height * 0.36, 12)) : 4;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(bounds.left, canvasY, Math.max(2, bounds.width), Math.max(2, bounds.height), r);
      } else {
        ctx.rect(bounds.left, canvasY, Math.max(2, bounds.width), Math.max(2, bounds.height));
      }
      if (isGamepad) {
        ctx.fillStyle = '#24201b';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#c8a86b';
        ctx.stroke();
        ctx.fillStyle = '#f5e6c4';
      } else {
        ctx.fillStyle = isRebound ? '#f7e4b2' : '#f2efe9';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = isRebound ? '#c2881b' : '#9c9488';
        ctx.stroke();
        ctx.fillStyle = '#181410';
      }
      const fontPx = Math.max(9, Math.min(28, Math.round(bounds.height * 0.48)));
      ctx.font = `800 ${fontPx}px "JetBrains Mono", "Segoe UI Symbol", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelStr, bounds.left + bounds.width / 2, canvasY + bounds.height / 2 + 0.5);
      ctx.restore();

      if (hasTransform) {
        ctx.restore();
      }
      for (const child of ctrl.children) {
        this.renderControlNode(child, bounds);
      }
      return;
    }

    // 1B. ClientUIFullscreenAnimationControl (10002xxx) & ClientUIAnimationControl (10001xxx) ([img-1]..[img-5])
    if (ctrl.className === 'ClientUIFullscreenAnimationControl' || ctrl.className === 'ClientUIAnimationControl') {
      const isFull = ctrl.className === 'ClientUIFullscreenAnimationControl';
      const vfx = getVfxPresetMeta(ctrl.animationId, ctrl.className);
      if (vfx.id > 0 && ctrl._animPlaying !== false) {
        const nowMs = performance.now();
        if (ctrl._animRestartCount && ctrl._animRestartCount !== ctrl._animLastRestart) {
          ctrl._animLastRestart = ctrl._animRestartCount;
          ctrl._animStartTime = nowMs;
        }
        if (!ctrl._animStartTime) ctrl._animStartTime = nowMs;
        const elapsedSec = (nowMs - ctrl._animStartTime) / 1000;

        if (!isFull) {
          // Localized Particle Effects around control/cursor area (10001001..10001160)
          const rx = bounds.left;
          const ry = canvasY;
          const rw = Math.max(8, bounds.width);
          const rh = Math.max(8, bounds.height);
          const cx = rx + rw * 0.5;
          const cy = ry + rh * 0.5;
          const baseRadius = Math.max(18, Math.min(rw, rh) * 0.48);

          if (vfx.looping) {
            ctx.save();
            // Soft pulsing particle aura
            const pulse = 0.75 + 0.25 * Math.sin(elapsedSec * 3.2);
            const auraGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, baseRadius * 1.15);
            auraGrad.addColorStop(0, vfx.color + '66');
            auraGrad.addColorStop(0.6, vfx.color + '28');
            auraGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = auraGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, baseRadius * 1.15, 0, Math.PI * 2);
            ctx.fill();

            // 10 Orbiting & rising particle motes around the control/cursor area
            for (let pi = 0; pi < 10; pi++) {
              const angle = elapsedSec * (1.4 + (pi % 3) * 0.45) + (pi * Math.PI * 2) / 10;
              const orbitR = baseRadius * (0.32 + 0.55 * ((Math.sin(elapsedSec * 2.1 + pi * 1.3) + 1) * 0.5));
              const px = cx + Math.cos(angle) * orbitR;
              const py = cy + Math.sin(angle) * orbitR - Math.sin(elapsedSec * 2.6 + pi) * 4;
              const pSize = 2 + (pi % 3) * 1.1 * pulse;
              ctx.globalAlpha = 0.55 + 0.4 * Math.sin(elapsedSec * 4 + pi);
              ctx.fillStyle = pi % 3 === 0 ? '#ffffff' : vfx.color;
              ctx.beginPath();
              ctx.arc(px, py, pSize, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.globalAlpha = 1;

            // Compact ID tag showing the summoned looping particle ID
            const tagText = `✦ #${vfx.id} [LOOP]`;
            ctx.font = '700 9.5px "JetBrains Mono", monospace';
            const tw = ctx.measureText(tagText).width + 10;
            const bx = cx - tw * 0.5;
            const by = cy - 9;
            ctx.fillStyle = 'rgba(16, 13, 10, 0.84)';
            ctx.fillRect(bx, by, tw, 18);
            ctx.strokeStyle = vfx.color;
            ctx.lineWidth = 1;
            ctx.strokeRect(bx + 0.5, by + 0.5, tw - 1, 17);
            ctx.fillStyle = '#f5e6c4';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(tagText, bx + 5, by + 9.5);
            ctx.restore();
          } else {
            // Non-looping localized particle burst (plays once for 1.5s and disappears automatically!)
            const duration = 1.5;
            if (elapsedSec <= duration) {
              const prog = elapsedSec / duration;
              const fade = 1 - prog;
              ctx.save();

              // Expanding shockwave ring
              ctx.globalAlpha = fade * 0.85;
              ctx.strokeStyle = vfx.color;
              ctx.lineWidth = 2 * fade + 0.5;
              ctx.beginPath();
              ctx.arc(cx, cy, baseRadius * (0.25 + prog * 1.05), 0, Math.PI * 2);
              ctx.stroke();

              // 12 Outward-flying particle sparks
              for (let pi = 0; pi < 12; pi++) {
                const ang = (pi * Math.PI * 2) / 12 + (pi % 2) * 0.18;
                const speedFactor = 0.65 + (pi % 3) * 0.25;
                const dist = baseRadius * 1.25 * Math.pow(prog, 0.7) * speedFactor;
                const px = cx + Math.cos(ang) * dist;
                const py = cy + Math.sin(ang) * dist + prog * prog * 10;
                const pRad = Math.max(1, (3.2 - prog * 2.2) * (pi % 2 === 0 ? 1.15 : 0.85));
                ctx.globalAlpha = fade;
                ctx.fillStyle = pi % 3 === 0 ? '#ffffff' : vfx.color;
                ctx.beginPath();
                ctx.arc(px, py, pRad, 0, Math.PI * 2);
                ctx.fill();
              }

              // Summoned ID indicator during the burst (auto-disappears when burst completes)
              const tagText = `💥 #${vfx.id} [1-SHOT]`;
              ctx.globalAlpha = Math.min(1, fade * 1.35);
              ctx.font = '700 9.5px "JetBrains Mono", monospace';
              const tw = ctx.measureText(tagText).width + 10;
              const bx = cx - tw * 0.5;
              const by = cy - 9;
              ctx.fillStyle = 'rgba(16, 13, 10, 0.86)';
              ctx.fillRect(bx, by, tw, 18);
              ctx.strokeStyle = vfx.color;
              ctx.lineWidth = 1;
              ctx.strokeRect(bx + 0.5, by + 0.5, tw - 1, 17);
              ctx.fillStyle = '#fff4ec';
              ctx.textAlign = 'left';
              ctx.textBaseline = 'middle';
              ctx.fillText(tagText, bx + 5, by + 9.5);
              ctx.restore();
            } else {
              // Auto-finish and go away by themselves after the 1-shot cycle ends
              ctrl._animPlaying = false;
            }
          }
        } else {
          // FullscreenUIAnimationControl (10002001..10002037)
          const rx = 0;
          const ry = 0;
          const rw = this.width;
          const rh = this.height;

          ctx.save();
          if (vfx.looping) {
            // Looping bokeh / corner dimming vignette effect ([img-1])
            const cx = rx + rw / 2;
            const cy = ry + rh / 2;
            const maxRad = Math.hypot(rw, rh) * 0.55;
            const pulse = 0.72 + 0.22 * Math.sin(elapsedSec * 2.4);
            const grad = ctx.createRadialGradient(cx, cy, maxRad * 0.35, cx, cy, maxRad);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.72, `rgba(12,10,8,${(0.35 * pulse).toFixed(2)})`);
            grad.addColorStop(1, vfx.color + '88');
            ctx.fillStyle = grad;
            ctx.fillRect(rx, ry, rw, rh);

            // Corner bokeh motes
            ctx.fillStyle = vfx.color;
            const motes = [
              { x: rx + rw * 0.08, y: ry + rh * 0.12, r: 6 },
              { x: rx + rw * 0.92, y: ry + rh * 0.14, r: 5 },
              { x: rx + rw * 0.10, y: ry + rh * 0.88, r: 7 },
              { x: rx + rw * 0.90, y: ry + rh * 0.86, r: 6 }
            ];
            for (let mi = 0; mi < motes.length; mi++) {
              const m = motes[mi];
              const driftY = Math.sin(elapsedSec * 1.8 + mi * 1.5) * 6;
              ctx.globalAlpha = 0.35 + 0.25 * Math.sin(elapsedSec * 2.5 + mi);
              ctx.beginPath();
              ctx.arc(m.x, m.y + driftY, m.r, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.globalAlpha = 1;

            // Validation indicator badge
            const tagText = `⛶ Fullscreen VFX #${vfx.id} (${vfx.name} • Looping)`;
            ctx.font = '700 10px "JetBrains Mono", monospace';
            const tw = ctx.measureText(tagText).width + 14;
            const bx = rx + 12;
            const by = ry + 10;
            ctx.fillStyle = 'rgba(16, 13, 10, 0.84)';
            ctx.fillRect(bx, by, tw, 20);
            ctx.strokeStyle = vfx.color;
            ctx.lineWidth = 1;
            ctx.strokeRect(bx + 0.5, by + 0.5, tw - 1, 19);
            ctx.fillStyle = '#f5e6c4';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(tagText, bx + 7, by + 10.5);
          } else {
            // Non-looping 1.8s fullscreen glitch / impact burst effect ([img-1])
            const duration = 1.8;
            const activeBurst = elapsedSec <= duration;
            if (activeBurst) {
              const t = 1 - elapsedSec / duration;
              ctx.fillStyle = `rgba(255, 94, 126, ${(0.18 * t).toFixed(3)})`;
              ctx.fillRect(rx, ry, rw, rh);
              // Glitch scanline slices
              const sliceCount = 6;
              for (let si = 0; si < sliceCount; si++) {
                const sy = ry + ((Math.sin(elapsedSec * 28 + si * 3.7) * 0.5 + 0.5) * (rh - 14));
                const sh = 4 + (si % 3) * 4;
                ctx.fillStyle = si % 2 === 0 ? `rgba(56, 182, 255, ${(0.35 * t).toFixed(2)})` : `rgba(255, 94, 126, ${(0.38 * t).toFixed(2)})`;
                ctx.fillRect(rx, sy, rw, sh);
              }
              const tagText = `⚡ VFX #${vfx.id} (${vfx.name}) • PLAYING 1-SHOT GLITCH`;
              ctx.font = '700 10px "JetBrains Mono", monospace';
              const tw = ctx.measureText(tagText).width + 14;
              const bx = rx + 12;
              const by = ry + 10;
              ctx.fillStyle = 'rgba(16, 13, 10, 0.86)';
              ctx.fillRect(bx, by, tw, 20);
              ctx.strokeStyle = '#ff5e7e';
              ctx.lineWidth = 1;
              ctx.strokeRect(bx + 0.5, by + 0.5, tw - 1, 19);
              ctx.fillStyle = '#ffe0e6';
              ctx.textAlign = 'left';
              ctx.textBaseline = 'middle';
              ctx.fillText(tagText, bx + 7, by + 10.5);
            } else {
              ctrl._animPlaying = false;
            }
          }
          ctx.restore();
        }
      }
      if (hasTransform) ctx.restore();
      for (const child of ctrl.children) {
        this.renderControlNode(child, bounds);
      }
      return;
    }

    // 1C. ClientUIReferenceControl ([img-2])
    if (ctrl.className === 'ClientUIReferenceControl') {
      const tpl = getReferenceTemplateMeta(ctrl.referencedPrefabIndex);
      ctx.save();
      ctx.fillStyle = 'rgba(34, 44, 58, 0.85)';
      ctx.fillRect(bounds.left, canvasY, Math.max(4, bounds.width), Math.max(4, bounds.height));
      ctx.strokeStyle = 'rgba(130, 180, 235, 0.75)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(bounds.left + 0.5, canvasY + 0.5, Math.max(2, bounds.width - 1), Math.max(2, bounds.height - 1));
      ctx.fillStyle = '#e3f0ff';
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`🔗 ${tpl.name} (${tpl.index || 'None'})`, bounds.left + bounds.width / 2, canvasY + bounds.height / 2);
      ctx.restore();
      if (hasTransform) ctx.restore();
      for (const child of ctrl.children) {
        this.renderControlNode(child, bounds);
      }
      return;
    }

    // 1D. ClientUIGridScrollerControl ([img-1], [img-2])
    if (ctrl.className === 'ClientUIGridScrollerControl') {
      ctx.save();
      // Outer GridScroller Box & Clip Region
      ctx.fillStyle = 'rgba(24, 20, 16, 0.78)';
      ctx.fillRect(bounds.left, canvasY, Math.max(4, bounds.width), Math.max(4, bounds.height));
      ctx.strokeStyle = 'rgba(196, 160, 89, 0.62)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(bounds.left + 0.5, canvasY + 0.5, Math.max(2, bounds.width - 1), Math.max(2, bounds.height - 1));

      ctx.beginPath();
      ctx.rect(bounds.left + 1, canvasY + 1, Math.max(2, bounds.width - 2), Math.max(2, bounds.height - 2));
      ctx.clip();

      const isVert = ctrl.scrollDirection === undefined || ctrl.scrollDirection === 1 || ctrl.scrollDirection === 'Vertical';
      const isFixed = ctrl.layoutConstraint === 1 || ctrl.layoutConstraint === 'Fixed';
      const itemW = Math.max(12, Number(ctrl.itemWidth) || 56);
      const itemH = Math.max(12, Number(ctrl.itemHeight) || 36);
      const spaceX = Math.max(0, Number(ctrl.spacingX) ?? 6);
      const spaceY = Math.max(0, Number(ctrl.spacingY) ?? 6);
      const padT = Math.max(0, Number(ctrl.paddingTop) ?? 6);
      const padB = Math.max(0, Number(ctrl.paddingBottom) ?? 6);
      const padL = Math.max(0, Number(ctrl.paddingLeft) ?? 6);
      const padR = Math.max(0, Number(ctrl.paddingRight) ?? 6);
      const sbRes = ctrl.showScrollBar !== false ? 10 : 0;

      // If RefreshItems was called in Lua, render the live instantiated slot controls inside the clipped region
      if (ctrl._hasRefreshedItems && ctrl.children && ctrl.children.length > 0) {
        const count = Math.max(0, Number(ctrl.itemCount) ?? ctrl.children.length);
        let crossCount = 1;
        if (isFixed) {
          crossCount = Math.max(1, Math.round(Number(ctrl.layoutConstraintFixedCount) || 3));
        } else if (isVert) {
          const availW = Math.max(itemW, bounds.width - padL - padR - sbRes);
          crossCount = Math.max(1, Math.floor((availW + spaceX) / (itemW + spaceX)));
        } else {
          const availH = Math.max(itemH, bounds.height - padT - padB - sbRes);
          crossCount = Math.max(1, Math.floor((availH + spaceY) / (itemH + spaceY)));
        }
        const scrollLines = count > 0 ? Math.ceil(count / crossCount) : 0;
        const contentLen = scrollLines > 0
          ? (isVert ? (padT + padB - spaceY + (itemH + spaceY) * scrollLines) : (padL + padR - spaceX + (itemW + spaceX) * scrollLines))
          : 0;
        const maxScroll = Math.max(0, contentLen - (isVert ? bounds.height : bounds.width));
        const prog = Math.max(0, Math.min(1, Number(ctrl.scrollProgress) || 0));
        const scrollPx = maxScroll * prog;
        const scrolledBounds = {
          ...bounds,
          left: bounds.left - (!isVert ? scrollPx : 0),
          right: bounds.right - (!isVert ? scrollPx : 0),
          top: bounds.top + (isVert ? scrollPx : 0),
          bottom: bounds.bottom + (isVert ? scrollPx : 0)
        };
        for (let i = 0; i < ctrl.children.length; i++) {
          const child = ctrl.children[i];
          if (child.visible && child.alive) {
            this.renderControlNode(child, scrolledBounds);
          }
        }
      } else {
        // Otherwise draw the Editor Content Template repeating copies ([img-2])
        const tpl = getReferenceTemplateMeta(ctrl.itemPrefabIndex ?? 1073741954);
        const count = Math.max(0, Number(ctrl.itemCount) ?? 12);
        let crossCount = 1;
        if (isFixed) {
          crossCount = Math.max(1, Math.round(Number(ctrl.layoutConstraintFixedCount) || 3));
        } else if (isVert) {
          const availW = Math.max(itemW, bounds.width - padL - padR - sbRes);
          crossCount = Math.max(1, Math.floor((availW + spaceX) / (itemW + spaceX)));
        } else {
          const availH = Math.max(itemH, bounds.height - padT - padB - sbRes);
          crossCount = Math.max(1, Math.floor((availH + spaceY) / (itemH + spaceY)));
        }

        const scrollLines = count > 0 ? Math.ceil(count / crossCount) : 0;
        const contentLen = scrollLines > 0
          ? (isVert ? (padT + padB - spaceY + (itemH + spaceY) * scrollLines) : (padL + padR - spaceX + (itemW + spaceX) * scrollLines))
          : 0;
        const maxScroll = Math.max(0, contentLen - (isVert ? bounds.height : bounds.width));
        const prog = Math.max(0, Math.min(1, Number(ctrl.scrollProgress) || 0));
        const scrollPx = maxScroll * prog;

        for (let idx = 0; idx < count; idx++) {
          const col = isVert ? (idx % crossCount) : Math.floor(idx / crossCount);
          const row = isVert ? Math.floor(idx / crossCount) : (idx % crossCount);
          const cx = bounds.left + padL + col * (itemW + spaceX) - (!isVert ? scrollPx : 0);
          const cy = canvasY + padT + row * (itemH + spaceY) - (isVert ? scrollPx : 0);

          ctx.fillStyle = 'rgba(46, 56, 72, 0.78)';
          ctx.fillRect(cx, cy, itemW, itemH);
          ctx.strokeStyle = 'rgba(145, 190, 242, 0.7)';
          ctx.lineWidth = 1;
          ctx.strokeRect(cx + 0.5, cy + 0.5, itemW - 1, itemH - 1);
          ctx.fillStyle = '#eaf4ff';
          ctx.font = '700 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`[${idx}] ${tpl.icon}`, cx + itemW / 2, cy + itemH / 2);
        }
      }

      // Draw Scrollbar (Vertical on right or Horizontal on bottom) when showScrollBar is true
      if (ctrl.showScrollBar !== false) {
        const prog = Math.max(0, Math.min(1, Number(ctrl.scrollProgress) || 0));
        if (isVert) {
          const sbW = 5;
          const sbX = bounds.right - sbW - 3;
          const sbTop = canvasY + 10;
          const sbH = Math.max(10, bounds.height - 20);
          ctx.fillStyle = 'rgba(15, 18, 22, 0.62)';
          ctx.fillRect(sbX, sbTop, sbW, sbH);
          const thumbH = Math.max(8, sbH * 0.44);
          const thumbY = sbTop + (sbH - thumbH) * prog;
          ctx.fillStyle = '#dce1e7';
          ctx.fillRect(sbX + 0.5, thumbY, sbW - 1, thumbH);
        } else {
          const sbH = 5;
          const sbY = canvasY + bounds.height - sbH - 3;
          const sbLeft = bounds.left + 10;
          const sbW = Math.max(10, bounds.width - 20);
          ctx.fillStyle = 'rgba(15, 18, 22, 0.62)';
          ctx.fillRect(sbLeft, sbY, sbW, sbH);
          const thumbW = Math.max(8, sbW * 0.44);
          const thumbX = sbLeft + (sbW - thumbW) * prog;
          ctx.fillStyle = '#dce1e7';
          ctx.fillRect(thumbX, sbY + 0.5, thumbW, sbH - 1);
        }
      }

      ctx.restore();
      if (hasTransform) ctx.restore();
      return;
    }

    const imgCol = ctrl.imageColor;
    const bgCol = ctrl.bgColor;

    if (bgCol && bgCol.a > 0) {
      ctx.fillStyle = ctrl._bgColorCss || `rgba(${bgCol.r}, ${bgCol.g}, ${bgCol.b}, ${bgCol.a / 255})`;
      ctx.fillRect(bounds.left, canvasY, bounds.width, bounds.height);
      if (ctrl.className === 'ClientUIPresetButtonControl' || ctrl.raycastTarget) {
        ctx.strokeStyle = 'rgba(196, 160, 89, 0.65)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bounds.left + 0.5, canvasY + 0.5, Math.max(0, bounds.width - 1), Math.max(0, bounds.height - 1));
      }
    }

    if (imgCol && imgCol.a > 0) {
      const stickerEntry = (ctrl.resourceId >= 112001 && ctrl.resourceId <= 112074)
        ? STICKER_SPRITE_CACHE.get(ctrl.resourceId)
        : null;

      if (stickerEntry) {
        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha = prevAlpha * (imgCol.a / 255);
        ctx.drawImage(
          stickerEntry.canvas,
          bounds.left,
          canvasY,
          Math.max(1, bounds.width),
          Math.max(1, bounds.height)
        );
        // If tinted for hit-flash (e.g. bright white/yellow flash or red damage flash), overlay flash silhouette
        if (
          (imgCol.r >= 245 && imgCol.g >= 245 && imgCol.b >= 210 && imgCol.b < 250) ||
          (imgCol.r >= 240 && imgCol.g < 160 && imgCol.b < 160)
        ) {
          ctx.globalAlpha = prevAlpha * 0.68;
          ctx.drawImage(
            stickerEntry.flashCanvas,
            bounds.left,
            canvasY,
            Math.max(1, bounds.width),
            Math.max(1, bounds.height)
          );
        }
        ctx.globalAlpha = prevAlpha;
      } else {
        const colorStr = ctrl._imageColorCss || `rgba(${imgCol.r}, ${imgCol.g}, ${imgCol.b}, ${imgCol.a / 255})`;
        const shape = ASSET_SHAPES[ctrl.resourceId] || 'rectangle';
        const hasProgressMask = Boolean(ctrl.enableMask && (ctrl.enableFillByProgress || ctrl.invertMask));
        const hasMaskSoftEdge = Boolean(ctrl.enableMask && ctrl.enableSoftEdge);

      // Fast path for standard rectangles (avoids ctx.save/restore overhead across hundreds of grid cells)
      if (!hasProgressMask && !hasMaskSoftEdge && shape === 'rectangle' && (!ctrl.enableSoftEdge || (ctrl.softEdgeWidthX <= 0 && ctrl.softEdgeWidthY <= 0))) {
        ctx.fillStyle = colorStr;
        ctx.fillRect(bounds.left, canvasY, Math.max(1, bounds.width), Math.max(1, bounds.height));
      } else {
        ctx.save();
        if (hasProgressMask) {
          const rawPct = ctrl.enableFillByProgress ? Math.max(0, Math.min(100, Number(ctrl.fillAmount) ?? 100)) : 100;
          const visStart = ctrl.invertMask ? rawPct / 100 : 0;
          const visEnd = ctrl.invertMask ? 1 : rawPct / 100;
          ctx.beginPath();
          if (visEnd > visStart + 0.001) {
            const fShape = ctrl.fillShape || 'Vertical';
            const fDir = ctrl.fillDirection || 'From Bottom to Top';
            if (fShape === 'Horizontal') {
              const x0 = fDir === 'From Right to Left' ? bounds.left + bounds.width * (1 - visEnd) : bounds.left + bounds.width * visStart;
              const wClip = bounds.width * (visEnd - visStart);
              ctx.rect(x0, canvasY, wClip, bounds.height);
            } else if (fShape === 'Vertical') {
              const y0 = fDir === 'From Top to Bottom' ? canvasY + bounds.height * visStart : canvasY + bounds.height * (1 - visEnd);
              const hClip = bounds.height * (visEnd - visStart);
              ctx.rect(bounds.left, y0, bounds.width, hClip);
            } else {
              const maxRad = (fShape === 'Radial90' ? 0.5 : (fShape === 'Radial180' ? 1 : 2)) * Math.PI;
              const locMap = { Top: -Math.PI / 2, Right: 0, Bottom: Math.PI / 2, Left: Math.PI };
              const baseRad = locMap[ctrl.fillStartLocation || 'Top'] ?? -Math.PI / 2;
              const isCCW = fDir === 'Counterclockwise';
              const cx = bounds.left + bounds.width / 2;
              const cy = canvasY + bounds.height / 2;
              const rClip = Math.hypot(bounds.width, bounds.height);
              ctx.moveTo(cx, cy);
              if (!isCCW) {
                ctx.arc(cx, cy, rClip, baseRad + visStart * maxRad, baseRad + visEnd * maxRad, false);
              } else {
                ctx.arc(cx, cy, rClip, baseRad - visStart * maxRad, baseRad - visEnd * maxRad, true);
              }
              ctx.closePath();
            }
          }
          ctx.clip();
        }

        if (hasMaskSoftEdge) {
          const cx = bounds.left + bounds.width / 2;
          const cy = canvasY + bounds.height / 2;
          const rx = Math.max(1, bounds.width / 2);
          const ry = Math.max(1, bounds.height / 2);
          const maxR = Math.max(rx, ry);
          let softFraction = 0.4;
          if (ctrl.softMode === 'Pixels' || ctrl.softMode === 'Pixel') {
            const avgPx = ((ctrl.softEdgeWidthX || 12) + (ctrl.softEdgeWidthY || 12)) * 0.5;
            softFraction = Math.min(0.95, Math.max(0.05, avgPx / maxR));
          } else {
            const avgPct = ((ctrl.softRangeH ?? 43.11) + (ctrl.softRangeV ?? 39.67)) * 0.5;
            softFraction = Math.min(0.95, Math.max(0.05, avgPct / 100));
          }
          const innerR = Math.max(0.1, maxR * (1 - softFraction));
          const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, maxR);
          grad.addColorStop(0, colorStr);
          grad.addColorStop(1, `rgba(${imgCol.r}, ${imgCol.g}, ${imgCol.b}, 0)`);
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = colorStr;
        }

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

          if (ctrl.enableSoftEdge && !ctrl.enableMask) {
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
          const innerRx = rx * 0.62;
          const innerRy = ry * 0.62;

          ctx.beginPath();
          if (typeof ctx.ellipse === 'function') {
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2, false);
            ctx.ellipse(cx, cy, innerRx, innerRy, 0, 0, Math.PI * 2, true);
          } else {
            const radius = Math.min(rx, ry);
            ctx.arc(cx, cy, radius, 0, Math.PI * 2, false);
            ctx.arc(cx, cy, radius * 0.62, 0, Math.PI * 2, true);
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
          const rx = Math.max(0.5, bounds.width / 2);
          const ry = Math.max(0.5, bounds.height / 2);

          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4 - Math.PI / 2;
            const scale = (i % 2 === 0) ? 1 : 0.36;
            const px = cx + Math.cos(angle) * rx * scale;
            const py = cy + Math.sin(angle) * ry * scale;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
        } else if (shape === 'star5') {
          const cx = bounds.left + bounds.width / 2;
          const cy = canvasY + bounds.height / 2;
          const rx = Math.max(0.5, bounds.width / 2);
          const ry = Math.max(0.5, bounds.height / 2);

          ctx.beginPath();
          for (let i = 0; i < 10; i++) {
            const angle = (i * Math.PI) / 5 - Math.PI / 2;
            const scale = (i % 2 === 0) ? 1 : 0.40;
            const px = cx + Math.cos(angle) * rx * scale;
            const py = cy + Math.sin(angle) * ry * scale;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
        } else if (ctrl.enableSoftEdge && !ctrl.enableMask) {
          // Rounded Rectangle with softEdgeWidth (used by standalone scripts like 8-Ball Pool)
          const cornerR = Math.min(bounds.width / 2, bounds.height / 2, Math.max(ctrl.softEdgeWidthX, 4));
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(bounds.left, canvasY, Math.max(1, bounds.width), Math.max(1, bounds.height), cornerR);
          } else {
            ctx.rect(bounds.left, canvasY, Math.max(1, bounds.width), Math.max(1, bounds.height));
          }
          ctx.fill();
        } else {
          ctx.fillRect(bounds.left, canvasY, Math.max(1, bounds.width), Math.max(1, bounds.height));
        }
        ctx.restore();
      }
      }
    }

    // 2. Draw Text if present (supports plain text fast path + Rich Text tags <color>, <size>, <b>, <i>)
    if (ctrl.text && ctrl.text !== '') {
      ctx.save();
      const fCol = ctrl.fontColor;
      const defaultFillStyle = ctrl._fontColorCss || `rgba(${fCol.r}, ${fCol.g}, ${fCol.b}, ${fCol.a / 255})`;
      ctx.fillStyle = defaultFillStyle;
      const scaleFactor = Math.min(Math.abs(bounds.worldScaleX || 1), Math.abs(bounds.worldScaleY || 1));
      const rawText = String(ctrl.text).replace(/\u265F(?!\uFE0E)/g, '\u265F\uFE0E');
      const hasRichTags = /<\/?(?:b|i|color(?:=[^>]*)?|size(?:=[^>]*)?)>/i.test(rawText);
      const cleanText = hasRichTags ? rawText.replace(/<\/?(?:b|i|color(?:=[^>]*)?|size(?:=[^>]*)?)>/gi, '') : rawText;

      let baseFontSize = ctrl.fontSize || 14;
      if (ctrl.adaptiveFontSize && cleanText.length > 0) {
        const minSz = Math.max(6, Math.min(baseFontSize, ctrl.minFontSize || 12));
        const longestLineLen = Math.max(1, ...cleanText.split(/\r?\n/).map(l => l.length));
        const fitW = Math.max(12, bounds.width - 8) / (longestLineLen * 0.6);
        const fitH = Math.max(12, bounds.height - 6) * 0.82;
        baseFontSize = Math.max(minSz, Math.min(baseFontSize, Math.floor(Math.min(fitW, fitH))));
      }
      const fontSize = Math.max(6, Math.round(baseFontSize * scaleFactor * 2) * 0.5);
      const lineHeight = Math.round(fontSize * 1.2 * 2) * 0.5;

      if (!hasRichTags) {
        ctx.font = `${fontSize}px "JetBrains Mono", "Segoe UI Symbol", "Noto Sans Symbols 2", "Noto Sans Symbols", "DejaVu Sans", "Arial Unicode MS", sans-serif`;
        let textX = bounds.left + 4;
        if (ctrl.horizontalAlignment === 1) { // Middle
          ctx.textAlign = 'center';
          textX = bounds.left + bounds.width / 2;
        } else if (ctrl.horizontalAlignment === 2) { // Right
          ctx.textAlign = 'right';
          textX = bounds.right - 4;
        } else {
          ctx.textAlign = 'left';
        }

        // Split into lines (and wrap if adaptiveFontSize is OFF and text exceeds box width)
        const maxLineW = Math.max(12, bounds.width - 8);
        const rawLines = cleanText.split(/\r?\n/);
        const lines = [];
        if (ctrl.adaptiveFontSize) {
          lines.push(rawLines.join(' '));
        } else {
          for (const rLine of rawLines) {
            if (!rLine || ctx.measureText(rLine).width <= maxLineW) {
              lines.push(rLine);
            } else {
              const words = rLine.split(' ');
              let currLine = '';
              for (const w of words) {
                const testLine = currLine ? `${currLine} ${w}` : w;
                if (currLine && ctx.measureText(testLine).width > maxLineW) {
                  lines.push(currLine);
                  currLine = w;
                } else {
                  currLine = testLine;
                }
              }
              if (currLine) lines.push(currLine);
            }
          }
        }

        const totalTextH = lines.length * lineHeight;
        let startY = canvasY + (bounds.height - totalTextH) * 0.5 + lineHeight * 0.5;
        if (ctrl.verticalAlignment === 0) { // Top
          startY = canvasY + 4 + lineHeight * 0.5;
        } else if (ctrl.verticalAlignment === 2) { // Bottom
          startY = canvasY + bounds.height - 4 - totalTextH + lineHeight * 0.5;
        }
        ctx.textBaseline = 'middle';

        for (let li = 0; li < lines.length; li++) {
          const ly = startY + li * lineHeight;
          if (ctrl.enableOutline && ctrl.outlineColor) {
            const oc = ctrl.outlineColor;
            ctx.strokeStyle = `rgba(${oc.r}, ${oc.g}, ${oc.b}, ${(oc.a ?? 200) / 255})`;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.miterLimit = 2;
            ctx.lineWidth = Math.max(2.2, fontSize * 0.085);
            ctx.strokeText(lines[li], textX, ly);
          }
          ctx.fillText(lines[li], textX, ly);
        }
      } else {
        let textY = canvasY + bounds.height / 2;
        if (ctrl.verticalAlignment === 0) { // Top
          ctx.textBaseline = 'top';
          textY = canvasY + 4;
        } else if (ctrl.verticalAlignment === 2) { // Bottom
          ctx.textBaseline = 'bottom';
          textY = canvasY + bounds.height - 4;
        } else {
          ctx.textBaseline = 'middle';
        }

        // Rich text segment parser for <color=#...>, <size=21>, <b>, <i>
        const segments = [];
        const colorStack = [defaultFillStyle];
        const sizeStack = [fontSize];
        let boldDepth = 0;
        let italicDepth = 0;
        const tagRegex = /<(\/?)(b|i|color|size)(?:=([^>]*))?>/gi;
        let lastIdx = 0;
        let match;
        while ((match = tagRegex.exec(rawText)) !== null) {
          if (match.index > lastIdx) {
            segments.push({
              text: rawText.slice(lastIdx, match.index),
              color: colorStack[colorStack.length - 1],
              size: sizeStack[sizeStack.length - 1],
              bold: boldDepth > 0,
              italic: italicDepth > 0
            });
          }
          const isClose = match[1] === '/';
          const tag = match[2].toLowerCase();
          const val = match[3];
          if (!isClose) {
            if (tag === 'b') boldDepth++;
            else if (tag === 'i') italicDepth++;
            else if (tag === 'color' && val) colorStack.push(val.trim());
            else if (tag === 'size' && val) {
              const parsedSz = Math.max(6, Math.min(160, (parseFloat(val) || baseFontSize) * scaleFactor));
              sizeStack.push(parsedSz);
            }
          } else {
            if (tag === 'b') boldDepth = Math.max(0, boldDepth - 1);
            else if (tag === 'i') italicDepth = Math.max(0, italicDepth - 1);
            else if (tag === 'color' && colorStack.length > 1) colorStack.pop();
            else if (tag === 'size' && sizeStack.length > 1) sizeStack.pop();
          }
          lastIdx = tagRegex.lastIndex;
        }
        if (lastIdx < rawText.length) {
          segments.push({
            text: rawText.slice(lastIdx),
            color: colorStack[colorStack.length - 1],
            size: sizeStack[sizeStack.length - 1],
            bold: boldDepth > 0,
            italic: italicDepth > 0
          });
        }

        ctx.textAlign = 'left';
        let totalW = 0;
        for (const seg of segments) {
          const stylePrefix = `${seg.italic ? 'italic ' : ''}${seg.bold ? 'bold ' : ''}`;
          seg.font = `${stylePrefix}${seg.size}px "JetBrains Mono", "Segoe UI Symbol", "Apple Color Emoji", sans-serif`;
          ctx.font = seg.font;
          seg.width = ctx.measureText(seg.text).width;
          totalW += seg.width;
        }

        let cursorX = bounds.left + 4;
        if (ctrl.horizontalAlignment === 1) {
          cursorX = bounds.left + (bounds.width - totalW) * 0.5;
        } else if (ctrl.horizontalAlignment === 2) {
          cursorX = bounds.right - 4 - totalW;
        }

        for (const seg of segments) {
          ctx.font = seg.font;
          if (ctrl.enableOutline && ctrl.outlineColor) {
            const oc = ctrl.outlineColor;
            ctx.strokeStyle = `rgba(${oc.r}, ${oc.g}, ${oc.b}, ${(oc.a ?? 200) / 255})`;
            ctx.lineWidth = 2.2;
            ctx.strokeText(seg.text, cursorX, textY);
          }
          ctx.fillStyle = seg.color;
          ctx.fillText(seg.text, cursorX, textY);
          cursorX += seg.width;
        }
      }
      ctx.restore();
    }

    // 3. Draw Vertical Scrollbar for ClientUITextWindowControl when showScrollBar is enabled ([img-5], [img-6])
    if (ctrl.className === 'ClientUITextWindowControl' && ctrl.showScrollBar !== false) {
      ctx.save();
      const sbW = 5;
      const sbX = bounds.right - sbW - 4;
      const sbTop = canvasY + 11;
      const sbH = Math.max(10, bounds.height - 22);
      // Up / Down arrows
      ctx.fillStyle = 'rgba(210, 215, 220, 0.5)';
      ctx.font = '7px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('▲', sbX + sbW * 0.5, canvasY + 6);
      ctx.fillText('▼', sbX + sbW * 0.5, canvasY + bounds.height - 6);
      // Track
      ctx.fillStyle = 'rgba(15, 18, 22, 0.58)';
      ctx.fillRect(sbX, sbTop, sbW, sbH);
      // Thumb
      const thumbH = Math.max(8, sbH * 0.52);
      ctx.fillStyle = '#dce1e7';
      ctx.fillRect(sbX + 0.5, sbTop + 2, sbW - 1, thumbH);
      ctx.restore();
    }

    // Render children in order, passing precomputed parent bounds to avoid O(N * depth) recalculation
    const children = ctrl.children;
    if (children && children.length > 0) {
      if (this.hasMountedScripts) {
        // In Interface Layout Editor (layered ordering), bottom of list (len - 1) is drawn first (in back)
        // and top of list (index 0) is drawn last (on top)!
        for (let i = children.length - 1; i >= 0; i--) {
          const child = children[i];
          if (child.visible && child.alive) {
            this.renderControlNode(child, bounds);
          }
        }
      } else {
        for (let i = 0, len = children.length; i < len; i++) {
          const child = children[i];
          if (child.visible && child.alive) {
            this.renderControlNode(child, bounds);
          }
        }
      }
    }

    if (hasTransform) {
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
