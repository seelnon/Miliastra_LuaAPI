// ============================================================================
// MILIASTRA UI CONTROL TRANSFORM INSPECTOR & INTERACTIVE STAGE GIZMOS
// Implements:
//   • [ Basic | Script ] Right Inspector Tabs ([img-2], [img-4], [img-9])
//   • 4-Device Bar + Sync Toggle, Location (X,Y), Size (W,H), Zoom Factor (X,Y),
//     Rotate (Z) + Mirror Left/Right & Mirror Up/Down, Anchor Type (Custom),
//     Waypoint Settings (16-Preset 4x4 Popover Grid [img-4]), Min (X,Y), Max (X,Y),
//     Center / Pivot (X,Y), and Create Settings (Initially Active / Visible)
//   • Interactive Stage Waypoint Triangles (45° inward-pointing corners,
//     clamped non-crossing drag, dashed alignment guides [img-3, 5, 6, 7, 8])
//   • Active Control Cyan/Gold Gizmo Box:
//       - Drag inside box to move
//       - Drag 4 sides or 4 corners to resize with opposite side/corner planted
//         (hold Shift for uniform aspect-locked scaling with opposite side/corner planted)
//       - Drag top rotation spinner handle to rotate around Center/Pivot dot
//       - Drag cyan Center/Pivot dot (◎) independently inside or outside box
// ============================================================================

export const STAGE_WIDTH = 960;
export const STAGE_HEIGHT = 640;

// Ensure a project node has all transform & create-settings properties initialized
export function ensureNodeTransformDefaults(node) {
  if (!node) return node;
  if (node.anchorMinX === undefined) node.anchorMinX = 0.5;
  if (node.anchorMinY === undefined) node.anchorMinY = 0.5;
  if (node.anchorMaxX === undefined) node.anchorMaxX = 0.5;
  if (node.anchorMaxY === undefined) node.anchorMaxY = 0.5;
  if (node.pivotX === undefined) node.pivotX = 0.5;
  if (node.pivotY === undefined) node.pivotY = 0.5;
  if (node.x === undefined) node.x = 0;
  if (node.y === undefined) node.y = 0;
  if (node.width === undefined) node.width = 140;
  if (node.height === undefined) node.height = 44;
  if (node.scaleX === undefined) node.scaleX = 1.0;
  if (node.scaleY === undefined) node.scaleY = 1.0;
  if (node.rotationZ === undefined) node.rotationZ = 0.0;
  if (node.mirrorX === undefined) node.mirrorX = false;
  if (node.mirrorY === undefined) node.mirrorY = false;
  if (node.active === undefined) node.active = true;
  if (node.visible === undefined) node.visible = true;
  if (node.device === undefined) node.device = 'pc';
  if (node.syncDevices === undefined) node.syncDevices = true;
  return node;
}

// 16 Waypoint Presets matching the 4x4 grid in [img-4]:
//   • Rows 1-3, Cols 1-3: 9 Collapsed Point Presets (Top-Left to Bottom-Right)
//   • Rows 1-3, Col 4:    3 Horizontal Stretch Line Presets (Top, Middle, Bottom)
//   • Row 4, Cols 1-3:    3 Vertical Stretch Line Presets (Left, Center, Right)
//   • Row 4, Col 4:       1 Fullscreen Stretch Box Preset (0,0 -> 1,1)
export const WAYPOINT_PRESETS = [
  // Row 1 (Top)
  { id: 'pt-tl', title: 'Top-Left Point (0, 1)', kind: 'point', minX: 0.0, minY: 1.0, maxX: 0.0, maxY: 1.0 },
  { id: 'pt-tc', title: 'Top-Center Point (0.5, 1)', kind: 'point', minX: 0.5, minY: 1.0, maxX: 0.5, maxY: 1.0 },
  { id: 'pt-tr', title: 'Top-Right Point (1, 1)', kind: 'point', minX: 1.0, minY: 1.0, maxX: 1.0, maxY: 1.0 },
  { id: 'hl-top', title: 'Top Horizontal Stretch (X: 0..1, Y: 1)', kind: 'hline', minX: 0.0, minY: 1.0, maxX: 1.0, maxY: 1.0 },

  // Row 2 (Middle)
  { id: 'pt-ml', title: 'Middle-Left Point (0, 0.5)', kind: 'point', minX: 0.0, minY: 0.5, maxX: 0.0, maxY: 0.5 },
  { id: 'pt-mc', title: 'Center Point (0.5, 0.5)', kind: 'point', minX: 0.5, minY: 0.5, maxX: 0.5, maxY: 0.5 },
  { id: 'pt-mr', title: 'Middle-Right Point (1, 0.5)', kind: 'point', minX: 1.0, minY: 0.5, maxX: 1.0, maxY: 0.5 },
  { id: 'hl-mid', title: 'Middle Horizontal Stretch (X: 0..1, Y: 0.5)', kind: 'hline', minX: 0.0, minY: 0.5, maxX: 1.0, maxY: 0.5 },

  // Row 3 (Bottom)
  { id: 'pt-bl', title: 'Bottom-Left Point (0, 0)', kind: 'point', minX: 0.0, minY: 0.0, maxX: 0.0, maxY: 0.0 },
  { id: 'pt-bc', title: 'Bottom-Center Point (0.5, 0)', kind: 'point', minX: 0.5, minY: 0.0, maxX: 0.5, maxY: 0.0 },
  { id: 'pt-br', title: 'Bottom-Right Point (1, 0)', kind: 'point', minX: 1.0, minY: 0.0, maxX: 1.0, maxY: 0.0 },
  { id: 'hl-bot', title: 'Bottom Horizontal Stretch (X: 0..1, Y: 0)', kind: 'hline', minX: 0.0, minY: 0.0, maxX: 1.0, maxY: 0.0 },

  // Row 4 (Vertical Stretches + Fullscreen)
  { id: 'vl-left', title: 'Left Vertical Stretch (X: 0, Y: 0..1)', kind: 'vline', minX: 0.0, minY: 0.0, maxX: 0.0, maxY: 1.0 },
  { id: 'vl-center', title: 'Center Vertical Stretch (X: 0.5, Y: 0..1)', kind: 'vline', minX: 0.5, minY: 0.0, maxX: 0.5, maxY: 1.0 },
  { id: 'vl-right', title: 'Right Vertical Stretch (X: 1, Y: 0..1)', kind: 'vline', minX: 1.0, minY: 0.0, maxX: 1.0, maxY: 1.0 },
  { id: 'box-full', title: 'Fullscreen Stretch (X: 0..1, Y: 0..1)', kind: 'full', minX: 0.0, minY: 0.0, maxX: 1.0, maxY: 1.0 }
];

// Render a crisp 36x36 SVG icon for any waypoint configuration (either a preset or custom Min/Max)
export function renderWaypointPresetSVG(minX, minY, maxX, maxY, size = 36) {
  const pad = 4;
  const inner = size - pad * 2;
  const subPad = 10;
  const subInner = size - subPad * 2;

  // Convert normalized [0..1] (bottom-left origin) to SVG coordinates [pad .. size-pad] (top-left origin)
  const toSvgX = (nx) => pad + Math.max(0, Math.min(1, nx)) * inner;
  const toSvgY = (ny) => pad + (1 - Math.max(0, Math.min(1, ny))) * inner;

  const x1 = toSvgX(minX);
  const x2 = toSvgX(maxX);
  const y1 = toSvgY(maxY); // top
  const y2 = toSvgY(minY); // bottom

  const eps = 0.005;
  const isCollapsedX = Math.abs(maxX - minX) < eps;
  const isCollapsedY = Math.abs(maxY - minY) < eps;

  let overlay = '';

  if (isCollapsedX && isCollapsedY) {
    // Collapsed point: crosshair lines + single gold dot at (x1, y1)
    overlay = `
      <line x1="${x1}" y1="${pad}" x2="${x1}" y2="${size - pad}" stroke="#4fc3f7" stroke-width="1.2" />
      <line x1="${pad}" y1="${y1}" x2="${size - pad}" y2="${y1}" stroke="#4fc3f7" stroke-width="1.2" />
      <circle cx="${x1}" cy="${y1}" r="2.6" fill="#f5b82e" />
    `;
  } else if (!isCollapsedX && isCollapsedY) {
    // Horizontal stretch line: cyan line at y1 + 2 gold endpoint dots + horizontal double arrow
    const midY = size * 0.5;
    overlay = `
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y1}" stroke="#4fc3f7" stroke-width="1.5" />
      <circle cx="${x1}" cy="${y1}" r="2.4" fill="#f5b82e" />
      <circle cx="${x2}" cy="${y1}" r="2.4" fill="#f5b82e" />
      <line x1="${subPad + 2}" y1="${midY}" x2="${size - subPad - 2}" y2="${midY}" stroke="#b892e8" stroke-width="1.4" />
      <polyline points="${subPad + 5},${midY - 2.5} ${subPad + 2},${midY} ${subPad + 5},${midY + 2.5}" fill="none" stroke="#b892e8" stroke-width="1.3" />
      <polyline points="${size - subPad - 5},${midY - 2.5} ${size - subPad - 2},${midY} ${size - subPad - 5},${midY + 2.5}" fill="none" stroke="#b892e8" stroke-width="1.3" />
    `;
  } else if (isCollapsedX && !isCollapsedY) {
    // Vertical stretch line: cyan line at x1 + 2 gold endpoint dots + vertical double arrow
    const midX = size * 0.5;
    overlay = `
      <line x1="${x1}" y1="${y1}" x2="${x1}" y2="${y2}" stroke="#4fc3f7" stroke-width="1.5" />
      <circle cx="${x1}" cy="${y1}" r="2.4" fill="#f5b82e" />
      <circle cx="${x1}" cy="${y2}" r="2.4" fill="#f5b82e" />
      <line x1="${midX}" y1="${subPad + 2}" x2="${midX}" y2="${size - subPad - 2}" stroke="#b892e8" stroke-width="1.4" />
      <polyline points="${midX - 2.5},${subPad + 5} ${midX},${subPad + 2} ${midX + 2.5},${subPad + 5}" fill="none" stroke="#b892e8" stroke-width="1.3" />
      <polyline points="${midX - 2.5},${size - subPad - 5} ${midX},${size - subPad - 2} ${midX + 2.5},${size - subPad - 5}" fill="none" stroke="#b892e8" stroke-width="1.3" />
    `;
  } else {
    // Expanded Box / Fullscreen: cyan rectangle + 4 corner gold dots + 4-way stretch arrows
    const midX = size * 0.5;
    const midY = size * 0.5;
    overlay = `
      <rect x="${x1}" y="${y1}" width="${Math.max(2, x2 - x1)}" height="${Math.max(2, y2 - y1)}" fill="rgba(79, 195, 247, 0.1)" stroke="#4fc3f7" stroke-width="1.3" />
      <circle cx="${x1}" cy="${y1}" r="2.2" fill="#f5b82e" />
      <circle cx="${x2}" cy="${y1}" r="2.2" fill="#f5b82e" />
      <circle cx="${x1}" cy="${y2}" r="2.2" fill="#f5b82e" />
      <circle cx="${x2}" cy="${y2}" r="2.2" fill="#f5b82e" />
      <line x1="${subPad + 2}" y1="${midY}" x2="${size - subPad - 2}" y2="${midY}" stroke="#b892e8" stroke-width="1.2" />
      <line x1="${midX}" y1="${subPad + 2}" x2="${midX}" y2="${size - subPad - 2}" stroke="#b892e8" stroke-width="1.2" />
    `;
  }

  return `
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="mw-wp-svg">
      <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="2" fill="#181410" stroke="#5a4b36" stroke-width="1.2" />
      <rect x="${subPad}" y="${subPad}" width="${subInner}" height="${subInner}" rx="1" fill="none" stroke="#463a2a" stroke-width="1" />
      ${overlay}
    </svg>
  `;
}

// Compute stage-space transform for a node on the 960x640 stage
export function getNodeStageGeometry(project, node) {
  ensureNodeTransformDefaults(node);

  // Accumulate parent world offset if nested under a non-root control
  let parentOffsetX = 0;
  let parentOffsetY = 0;
  let currParentKey = node.parentKey;
  while (currParentKey && currParentKey !== 'root') {
    const pNode = project.nodes.find(n => n.key === currParentKey);
    if (!pNode) break;
    ensureNodeTransformDefaults(pNode);
    const pAnchorX = ((pNode.anchorMinX + pNode.anchorMaxX) * 0.5 - 0.5) * STAGE_WIDTH;
    const pAnchorY = ((pNode.anchorMinY + pNode.anchorMaxY) * 0.5 - 0.5) * STAGE_HEIGHT;
    parentOffsetX += pAnchorX + (pNode.x || 0);
    parentOffsetY += pAnchorY + (pNode.y || 0);
    currParentKey = pNode.parentKey;
  }

  const anchorNormX = (node.anchorMinX + node.anchorMaxX) * 0.5;
  const anchorNormY = (node.anchorMinY + node.anchorMaxY) * 0.5;

  // Anchor reference point in stage coordinates [0..960, 0..640] (0,0 = bottom-left)
  const anchorStageX = anchorNormX * STAGE_WIDTH + parentOffsetX;
  const anchorStageY = anchorNormY * STAGE_HEIGHT + parentOffsetY;

  // Pivot (Center ◎) position in stage coordinates [0..960, 0..640]
  const pivotStageX = anchorStageX + (node.x || 0);
  const pivotStageY = anchorStageY + (node.y || 0);

  const absScaleX = Math.max(0.05, Math.abs(node.scaleX !== undefined ? node.scaleX : 1));
  const absScaleY = Math.max(0.05, Math.abs(node.scaleY !== undefined ? node.scaleY : 1));
  const visW = Math.max(12, (node.width || 100) * absScaleX);
  const visH = Math.max(12, (node.height || 40) * absScaleY);

  // Unrotated box bounds in stage coordinates (bottom-left origin)
  const boxLeft = pivotStageX - node.pivotX * visW;
  const boxBottom = pivotStageY - node.pivotY * visH;
  const boxTop = boxBottom + visH;

  // Convert to CSS percentages (top-left origin)
  const leftPct = (boxLeft / STAGE_WIDTH) * 100;
  const topPct = ((STAGE_HEIGHT - boxTop) / STAGE_HEIGHT) * 100;
  const widthPct = (visW / STAGE_WIDTH) * 100;
  const heightPct = (visH / STAGE_HEIGHT) * 100;

  return {
    parentOffsetX,
    parentOffsetY,
    anchorNormX,
    anchorNormY,
    anchorStageX,
    anchorStageY,
    pivotStageX,
    pivotStageY,
    visW,
    visH,
    boxLeft,
    boxBottom,
    boxTop,
    leftPct,
    topPct,
    widthPct,
    heightPct
  };
}

// Render the 4 Waypoint Triangles + Dashed Alignment Lines + Active Control Gizmo Overlay on the Stage
export function renderStageGizmoOverlayHTML(project, selectedNode, showDashedGuides = false) {
  if (!selectedNode || selectedNode.key === 'root') {
    return '';
  }
  ensureNodeTransformDefaults(selectedNode);

  const minX = Math.max(0, Math.min(1, selectedNode.anchorMinX));
  const minY = Math.max(0, Math.min(1, selectedNode.anchorMinY));
  const maxX = Math.max(minX, Math.min(1, selectedNode.anchorMaxX));
  const maxY = Math.max(minY, Math.min(1, selectedNode.anchorMaxY));

  const wpLeftPct = minX * 100;
  const wpRightPct = maxX * 100;
  const wpTopPct = (1 - maxY) * 100;
  const wpBottomPct = (1 - minY) * 100;
  const wpWidthPct = Math.max(0, wpRightPct - wpLeftPct);
  const wpHeightPct = Math.max(0, wpBottomPct - wpTopPct);

  const isExpandedX = (maxX - minX) > 0.002;
  const isExpandedY = (maxY - minY) > 0.002;
  const showLines = showDashedGuides || isExpandedX || isExpandedY;

  return `
    <!-- WAYPOINT ALIGNMENT OVERLAY ([img-3, 5, 6, 7, 8]) -->
    <div class="mw-waypoint-layer" id="mw-waypoint-layer">
      <!-- Full-stage dashed alignment lines when expanded or dragging -->
      <div class="mw-wp-dashed-v ${showLines ? 'visible' : ''}" id="mw-wp-line-minx" style="left: ${wpLeftPct.toFixed(2)}%;"></div>
      <div class="mw-wp-dashed-v ${showLines && isExpandedX ? 'visible' : ''}" id="mw-wp-line-maxx" style="left: ${wpRightPct.toFixed(2)}%;"></div>
      <div class="mw-wp-dashed-h ${showLines ? 'visible' : ''}" id="mw-wp-line-maxy" style="top: ${wpTopPct.toFixed(2)}%;"></div>
      <div class="mw-wp-dashed-h ${showLines && isExpandedY ? 'visible' : ''}" id="mw-wp-line-miny" style="top: ${wpBottomPct.toFixed(2)}%;"></div>

      <!-- Waypoint Connecting Box / Line -->
      <div class="mw-wp-rect ${(isExpandedX || isExpandedY) ? 'visible' : ''}" id="mw-wp-rect"
           style="left: ${wpLeftPct.toFixed(2)}%; top: ${wpTopPct.toFixed(2)}%; width: ${wpWidthPct.toFixed(2)}%; height: ${wpHeightPct.toFixed(2)}%;"></div>

      <!-- 4 Inward-Pointing 45° Waypoint Corner Triangles (sharp tips pointing directly INTO the corner) -->
      <!-- Top-Left (minX, maxY) sits outside top-left and points down-right ↘ into (15,15) -->
      <div class="mw-wp-tri tl" data-wp-corner="tl" title="Waypoint Top-Left (Min.X: ${minX.toFixed(2)}, Max.Y: ${maxY.toFixed(2)}) — Drag to adjust"
           style="left: ${wpLeftPct.toFixed(2)}%; top: ${wpTopPct.toFixed(2)}%;">
        <svg viewBox="0 0 16 16" width="15" height="15">
          <polygon points="15,15 2,8 8,2" fill="rgba(28, 24, 20, 0.88)" stroke="#e6dcc8" stroke-width="1.6" stroke-linejoin="round" />
        </svg>
      </div>

      <!-- Top-Right (maxX, maxY) sits outside top-right and points down-left ↙ into (1,15) -->
      <div class="mw-wp-tri tr" data-wp-corner="tr" title="Waypoint Top-Right (Max.X: ${maxX.toFixed(2)}, Max.Y: ${maxY.toFixed(2)}) — Drag to adjust"
           style="left: ${wpRightPct.toFixed(2)}%; top: ${wpTopPct.toFixed(2)}%;">
        <svg viewBox="0 0 16 16" width="15" height="15">
          <polygon points="1,15 8,2 14,8" fill="rgba(28, 24, 20, 0.88)" stroke="#e6dcc8" stroke-width="1.6" stroke-linejoin="round" />
        </svg>
      </div>

      <!-- Bottom-Left (minX, minY) sits outside bottom-left and points up-right ↗ into (15,1) -->
      <div class="mw-wp-tri bl" data-wp-corner="bl" title="Waypoint Bottom-Left (Min.X: ${minX.toFixed(2)}, Min.Y: ${minY.toFixed(2)}) — Drag to adjust"
           style="left: ${wpLeftPct.toFixed(2)}%; top: ${wpBottomPct.toFixed(2)}%;">
        <svg viewBox="0 0 16 16" width="15" height="15">
          <polygon points="15,1 8,14 2,8" fill="rgba(28, 24, 20, 0.88)" stroke="#e6dcc8" stroke-width="1.6" stroke-linejoin="round" />
        </svg>
      </div>

      <!-- Bottom-Right (maxX, minY) sits outside bottom-right and points up-left ↖ into (1,1) -->
      <div class="mw-wp-tri br" data-wp-corner="br" title="Waypoint Bottom-Right (Max.X: ${maxX.toFixed(2)}, Min.Y: ${minY.toFixed(2)}) — Drag to adjust"
           style="left: ${wpRightPct.toFixed(2)}%; top: ${wpBottomPct.toFixed(2)}%;">
        <svg viewBox="0 0 16 16" width="15" height="15">
          <polygon points="1,1 14,8 8,14" fill="rgba(28, 24, 20, 0.88)" stroke="#e6dcc8" stroke-width="1.6" stroke-linejoin="round" />
        </svg>
      </div>
    </div>
  `;
}

// Render the interactive cyan gizmo handles inside the selected control element on stage ([img-3, 5, 6, 7, 8])
export function renderSelectedControlGizmoHandlesHTML(node) {
  ensureNodeTransformDefaults(node);
  const pivotLeftPct = node.pivotX * 100;
  const pivotTopPct = (1 - node.pivotY) * 100;

  return `
    <div class="mw-ctrl-gizmo-frame">
      <!-- 4 Grabbable Edge Bars (with opposite side locked; Shift = uniform) -->
      <div class="mw-edge-handle top" data-resize-dir="t" title="Drag to extend Top side (Hold Shift for uniform scale with Bottom planted)"></div>
      <div class="mw-edge-handle bottom" data-resize-dir="b" title="Drag to extend Bottom side (Hold Shift for uniform scale with Top planted)"></div>
      <div class="mw-edge-handle left" data-resize-dir="l" title="Drag to extend Left side (Hold Shift for uniform scale with Right planted)"></div>
      <div class="mw-edge-handle right" data-resize-dir="r" title="Drag to extend Right side (Hold Shift for uniform scale with Left planted)"></div>

      <!-- 4 White Circular Corner Handles (with opposite corner locked; Shift = uniform) -->
      <div class="mw-corner-dot tl" data-resize-dir="tl" title="Drag Top-Left corner (Hold Shift for uniform scale with Bottom-Right planted)"></div>
      <div class="mw-corner-dot tr" data-resize-dir="tr" title="Drag Top-Right corner (Hold Shift for uniform scale with Bottom-Left planted)"></div>
      <div class="mw-corner-dot bl" data-resize-dir="bl" title="Drag Bottom-Left corner (Hold Shift for uniform scale with Top-Right planted)"></div>
      <div class="mw-corner-dot br" data-resize-dir="br" title="Drag Bottom-Right corner (Hold Shift for uniform scale with Top-Left planted)"></div>

      <!-- Top Rotation Spinner Stem & Handle ([img-3, 5, 6, 7, 8]) -->
      <div class="mw-rot-stem"></div>
      <div class="mw-rot-handle" data-gizmo-rotate="true" title="Drag to spin around Center/Anchor point (${Math.round(node.rotationZ || 0)}°)">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
          <path d="M 6 9 A 7 7 0 0 1 18 9" stroke="#e6dcc8" stroke-width="1.8" stroke-linecap="round"/>
          <polyline points="15.5,6.5 18.5,9.2 15.2,10.8" fill="none" stroke="#e6dcc8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M 18 15 A 7 7 0 0 1 6 15" stroke="#e6dcc8" stroke-width="1.8" stroke-linecap="round"/>
          <polyline points="8.5,17.5 5.5,14.8 8.8,13.2" fill="none" stroke="#e6dcc8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="12" cy="12" r="2.4" fill="#ffffff" />
        </svg>
      </div>

      <!-- Draggable Cyan Center / Pivot Point Ring (◎) ([img-3, 5, 7, 8]) -->
      <div class="mw-pivot-dot" data-gizmo-pivot="true"
           style="left: ${pivotLeftPct.toFixed(2)}%; top: ${pivotTopPct.toFixed(2)}%;"
           title="Center / Pivot Point (X: ${node.pivotX.toFixed(2)}, Y: ${node.pivotY.toFixed(2)}) — Drag independently (can move outside box)">
      </div>
    </div>
  `;
}

// Device SVGs for the 4-Device Bar in [img-2]
const DEVICE_ICONS = {
  pc: `<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="3" width="16" height="11" rx="1.5"/><line x1="7" y1="17" x2="13" y2="17"/><line x1="10" y1="14" x2="10" y2="17"/></svg>`,
  mobile: `<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="14" height="10" rx="1.5"/><circle cx="14.5" cy="10" r="1" fill="currentColor"/></svg>`,
  console: `<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="3" width="16" height="10" rx="1.5"/><path d="M6 16h8l1.5 2h-11z"/></svg>`,
  handheld: `<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="2" width="10" height="7" rx="1"/><rect x="4" y="11" width="12" height="7" rx="2"/><circle cx="7.5" cy="14.5" r="0.8" fill="currentColor"/><circle cx="12.5" cy="14.5" r="0.8" fill="currentColor"/></svg>`
};

const MIRROR_H_SVG = `<svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="9" y1="2" x2="9" y2="16" stroke-dasharray="2 1.5"/><polygon points="2,4 7,9 2,14" fill="none"/><polygon points="16,4 11,9 16,14" fill="currentColor"/></svg>`;
const MIRROR_V_SVG = `<svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="2" y1="9" x2="16" y2="9" stroke-dasharray="2 1.5"/><polygon points="4,2 9,7 14,2" fill="none"/><polygon points="4,16 9,11 14,16" fill="currentColor"/></svg>`;

// Render a styled axis number box with custom Elden-Gold/Coffee ▲/▼ stepper buttons
function renderAxisNumBox(axis, axisClass, id, value, step = 1, min = undefined, max = undefined, extraStyle = '') {
  const minAttr = min !== undefined ? `min="${min}"` : '';
  const maxAttr = max !== undefined ? `max="${max}"` : '';
  return `
    <div class="mw-axis-box" ${extraStyle ? `style="${extraStyle}"` : ''}>
      <span class="mw-axis-tag ${axisClass}" data-scrub-for="${id}" title="Drag horizontally to scrub ${axis}">${axis}</span>
      <input type="number" step="${step}" ${minAttr} ${maxAttr} id="${id}" value="${Number(value).toFixed(2)}" />
      <div class="mw-num-spin">
        <button type="button" class="mw-spin-btn up" data-spin-for="${id}" data-spin-dir="1" tabindex="-1" title="Step Up (+${step})">▲</button>
        <button type="button" class="mw-spin-btn down" data-spin-for="${id}" data-spin-dir="-1" tabindex="-1" title="Step Down (-${step})">▼</button>
      </div>
    </div>
  `;
}

// Render the shared Basic Transform & Create Settings tab content ([img-2], [img-4], [img-9])
export function renderBasicInspectorTabHTML(project, selectedNode, isWaypointPopoverOpen = false, transformCollapsed = false, createCollapsed = false) {
  ensureNodeTransformDefaults(selectedNode);

  // Display Location in Miliastra 1600x900 design coordinates when centered (800, 450) OR stage offset
  // Notice in [img-2]: center (0.5, 0.5) with offset (0, 0) displays Location X = 800.00, Y = 450.00!
  // Let's compute both the 1600x900 canvas position and keep 1:1 bidirectional binding with node.x / node.y
  const locX = 800 + (selectedNode.x || 0) * (1600 / STAGE_WIDTH);
  const locY = 450 + (selectedNode.y || 0) * (900 / STAGE_HEIGHT);

  const wVal = selectedNode.width !== undefined ? selectedNode.width : 100;
  const hVal = selectedNode.height !== undefined ? selectedNode.height : 40;
  const scaleX = selectedNode.scaleX !== undefined ? selectedNode.scaleX : 1;
  const scaleY = selectedNode.scaleY !== undefined ? selectedNode.scaleY : 1;
  const rotZ = selectedNode.rotationZ !== undefined ? selectedNode.rotationZ : 0;

  const minX = selectedNode.anchorMinX;
  const minY = selectedNode.anchorMinY;
  const maxX = selectedNode.anchorMaxX;
  const maxY = selectedNode.anchorMaxY;
  const pivX = selectedNode.pivotX;
  const pivY = selectedNode.pivotY;

  return `
    <!-- TRANSFORM ACCORDION CARD ([img-2]) -->
    <div class="mw-basic-card">
      <div class="mw-basic-card-header" id="mw-toggle-transform-sec">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="mw-sec-caret">${transformCollapsed ? '▸' : '▾'}</span>
          <span class="mw-sec-title-text">Transform</span>
        </div>
        <button type="button" class="mw-sec-menu-btn" id="mw-reset-transform-btn" title="Reset Transform to Defaults">☰</button>
      </div>

      ${!transformCollapsed ? `
        <div class="mw-basic-card-body">
          <!-- Device Selector Row ([img-2]) -->
          <div class="mw-field-group">
            <div class="mw-basic-label">Device</div>
            <div class="mw-device-seg">
              ${['pc', 'mobile', 'console', 'handheld'].map(dev => `
                <button type="button" class="mw-device-btn ${selectedNode.device === dev ? 'active' : ''}" data-device="${dev}" title="Device Layout: ${dev.toUpperCase()}">
                  ${DEVICE_ICONS[dev]}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Sync Information to All Devices Toggle ([img-2]) -->
          <div class="mw-toggle-row">
            <span class="mw-basic-label" style="margin: 0;">Sync Information to All<br/>Devices</span>
            <button type="button" class="mw-switch ${selectedNode.syncDevices !== false ? 'on' : ''}" id="mw-toggle-sync-devices" role="switch" aria-checked="${selectedNode.syncDevices !== false}">
              <span class="mw-switch-knob"></span>
            </button>
          </div>

          <!-- Location (X, Y) ([img-2]) -->
          <div class="mw-field-group">
            <div class="mw-basic-label">Location</div>
            <div class="mw-dual-inputs">
              ${renderAxisNumBox('X', 'x', 'mw-inp-loc-x', locX, 1)}
              ${renderAxisNumBox('Y', 'y', 'mw-inp-loc-y', locY, 1)}
            </div>
          </div>

          <!-- Size (W, H) ([img-2]) -->
          <div class="mw-field-group">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="mw-basic-label">Size</span>
              <span class="mw-size-hint-icon" title="Hold Shift while dragging stage handles for uniform aspect-locked sizing">✥</span>
            </div>
            <div class="mw-dual-inputs">
              ${renderAxisNumBox('W', 'w', 'mw-inp-size-w', wVal, 1, 4)}
              ${renderAxisNumBox('H', 'h', 'mw-inp-size-h', hVal, 1, 4)}
            </div>
          </div>

          <!-- Zoom Factor (X, Y) ([img-2]) -->
          <div class="mw-field-group">
            <div class="mw-basic-label">Zoom Factor</div>
            <div class="mw-dual-inputs">
              ${renderAxisNumBox('X', 'x', 'mw-inp-scale-x', scaleX, 0.05, 0.05, 10)}
              ${renderAxisNumBox('Y', 'y', 'mw-inp-scale-y', scaleY, 0.05, 0.05, 10)}
            </div>
          </div>

          <!-- Rotate (Z) + Mirror Left/Right & Mirror Up/Down ([img-2], [img-4]) -->
          <div class="mw-field-group">
            <div class="mw-basic-label">Rotate</div>
            <div class="mw-rotate-row">
              ${renderAxisNumBox('Z', 'z', 'mw-inp-rot-z', rotZ, 1, undefined, undefined, 'flex: 1;')}
              <button type="button" class="mw-mirror-btn ${selectedNode.mirrorX ? 'active' : ''}" id="mw-btn-mirror-h" title="Mirror Left / Right (Horizontal Flip)">
                ${MIRROR_H_SVG}
              </button>
              <button type="button" class="mw-mirror-btn ${selectedNode.mirrorY ? 'active' : ''}" id="mw-btn-mirror-v" title="Mirror Up / Down (Vertical Flip)">
                ${MIRROR_V_SVG}
              </button>
            </div>
          </div>

          <!-- Anchor Type (Custom only, as specified) ([img-2]) -->
          <div class="mw-field-group">
            <div class="mw-basic-label">Anchor Type</div>
            <select class="mw-basic-select" id="mw-inp-anchor-type" disabled title="Custom proportional screen waypoints">
              <option value="custom" selected>Custom</option>
            </select>
          </div>

          <!-- Waypoint Settings + 4x4 Preset Popover ([img-2], [img-4]) -->
          <div class="mw-waypoint-settings-row" style="position: relative;">
            <span class="mw-basic-label" style="margin: 0;">Waypoint Settings</span>
            <button type="button" class="mw-wp-trigger-btn ${isWaypointPopoverOpen ? 'open' : ''}" id="mw-wp-popover-btn" title="Click to choose from 16 Waypoint Alignment Presets">
              ${renderWaypointPresetSVG(minX, minY, maxX, maxY, 42)}
            </button>

            ${isWaypointPopoverOpen ? `
              <div class="mw-wp-popover" id="mw-wp-popover">
                <div class="mw-wp-popover-title">WAYPOINT ALIGNMENT PRESETS (9 Points · 6 Lines · Fullscreen)</div>
                <div class="mw-wp-preset-grid">
                  ${WAYPOINT_PRESETS.map(preset => {
                    const isActive =
                      Math.abs(preset.minX - minX) < 0.01 &&
                      Math.abs(preset.minY - minY) < 0.01 &&
                      Math.abs(preset.maxX - maxX) < 0.01 &&
                      Math.abs(preset.maxY - maxY) < 0.01;
                    return `
                      <button type="button" class="mw-wp-preset-cell ${isActive ? 'active' : ''}"
                              data-wp-preset="${preset.id}"
                              title="${preset.title}">
                        ${renderWaypointPresetSVG(preset.minX, preset.minY, preset.maxX, preset.maxY, 38)}
                      </button>
                    `;
                  }).join('')}
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Min. (X, Y) ([img-2], [img-9]) -->
          <div class="mw-field-group">
            <div class="mw-basic-label">Min.</div>
            <div class="mw-dual-inputs">
              ${renderAxisNumBox('X', 'x', 'mw-inp-min-x', minX, 0.01, 0, 1)}
              ${renderAxisNumBox('Y', 'y', 'mw-inp-min-y', minY, 0.01, 0, 1)}
            </div>
          </div>

          <!-- Max. (X, Y) ([img-2], [img-9]) -->
          <div class="mw-field-group">
            <div class="mw-basic-label">Max.</div>
            <div class="mw-dual-inputs">
              ${renderAxisNumBox('X', 'x', 'mw-inp-max-x', maxX, 0.01, 0, 1)}
              ${renderAxisNumBox('Y', 'y', 'mw-inp-max-y', maxY, 0.01, 0, 1)}
            </div>
          </div>

          <!-- Center / Pivot (X, Y) — can go outside [0..1] e.g. 3.0, -1.2 ([img-2], [img-9]) -->
          <div class="mw-field-group">
            <div class="mw-basic-label" title="Normalized attachment pivot relative to box (0,0 = bottom-left, 1,1 = top-right; can exceed 0..1)">Center</div>
            <div class="mw-dual-inputs">
              ${renderAxisNumBox('X', 'x', 'mw-inp-piv-x', pivX, 0.05)}
              ${renderAxisNumBox('Y', 'y', 'mw-inp-piv-y', pivY, 0.05)}
            </div>
          </div>
        </div>
      ` : ''}
    </div>

    <!-- CREATE SETTINGS ACCORDION CARD ([img-2]) -->
    <div class="mw-basic-card">
      <div class="mw-basic-card-header" id="mw-toggle-create-sec">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="mw-sec-caret">${createCollapsed ? '▸' : '▾'}</span>
          <span class="mw-sec-title-text">Create Settings</span>
        </div>
        <span class="mw-sec-menu-btn">☰</span>
      </div>

      ${!createCollapsed ? `
        <div class="mw-basic-card-body">
          <div class="mw-toggle-row">
            <span class="mw-basic-label" style="margin: 0;">Initially Active</span>
            <button type="button" class="mw-switch ${selectedNode.active !== false ? 'on' : ''}" id="mw-toggle-init-active" role="switch" aria-checked="${selectedNode.active !== false}">
              <span class="mw-switch-knob"></span>
            </button>
          </div>
          <div class="mw-toggle-row" style="margin-top: 6px;">
            <span class="mw-basic-label" style="margin: 0;">Initially Visible</span>
            <button type="button" class="mw-switch ${selectedNode.visible !== false ? 'on' : ''}" id="mw-toggle-init-visible" role="switch" aria-checked="${selectedNode.visible !== false}">
              <span class="mw-switch-knob"></span>
            </button>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// Helper to keep child status nodes/compositions sized in sync when a parent Button or Container is resized
export function syncDescendantDimensionsOnResize(project, parentNode, prevW, prevH, nextW, nextH) {
  if (!project || !parentNode || (parentNode.className !== 'ClientUIPresetButtonControl' && parentNode.className !== 'ClientUIContainerControl')) {
    return;
  }
  for (const n of project.nodes) {
    if (n.key === parentNode.key || n.key === 'root') continue;
    let currKey = n.parentKey;
    let isDesc = false;
    while (currKey && currKey !== 'root') {
      if (currKey === parentNode.key) {
        isDesc = true;
        break;
      }
      const pObj = project.nodes.find(x => x.key === currKey);
      currKey = pObj ? pObj.parentKey : null;
    }
    if (isDesc) {
      if (Math.abs((n.width || 100) - prevW) <= 2) {
        n.width = nextW;
      }
      if (Math.abs((n.height || 40) - prevH) <= 2) {
        n.height = nextH;
      }
    }
  }
}

// Helper to update a stage element's inline style and inspector inputs during 60fps interactive dragging
function syncActiveNodeDOM(container, project, node) {
  const geom = getNodeStageGeometry(project, node);
  const presetEl = container.querySelector(`[data-stage-drag-key="${node.key}"]`);
  if (presetEl) {
    presetEl.style.left = `${geom.leftPct.toFixed(2)}%`;
    presetEl.style.top = `${geom.topPct.toFixed(2)}%`;
    presetEl.style.width = `${geom.widthPct.toFixed(2)}%`;
    presetEl.style.height = `${geom.heightPct.toFixed(2)}%`;
    presetEl.style.transformOrigin = `${(node.pivotX * 100).toFixed(2)}% ${((1 - node.pivotY) * 100).toFixed(2)}%`;
    presetEl.style.transform = `rotate(${-(node.rotationZ || 0)}deg)`;

    // Keep TextBox font size synced live during resize / Zoom Factor (scaleX/scaleY) changes
    const tbSurface = presetEl.querySelector('.mw-stage-textbox-surface');
    if (tbSurface) {
      const scaleFactor = Math.min(
        Math.abs(node.scaleX !== undefined ? node.scaleX : 1),
        Math.abs(node.scaleY !== undefined ? node.scaleY : 1)
      );
      let baseSz = Math.max(6, Number(node.fontSize) || 20);
      if (node.adaptiveFontSize) {
        const plain = String(node.text || '').replace(/<\/?(?:b|i|color(?:=[^>]*)?|size(?:=[^>]*)?)>/gi, '');
        const longestLineLen = Math.max(1, ...plain.split(/\r?\n/).map(l => l.length));
        const boxW = Math.max(12, geom.visW - 8);
        const boxH = Math.max(12, geom.visH - 6);
        const fitW = boxW / (longestLineLen * 0.6);
        const fitH = boxH * 0.82;
        const minSz = Math.max(6, Math.min(baseSz, Number(node.minFontSize) || 12));
        baseSz = Math.max(minSz, Math.floor(Math.min(baseSz, fitW, fitH)));
        tbSurface.style.fontSize = `${baseSz}px`;
      } else {
        const effSz = Math.max(6, Math.round(baseSz * scaleFactor * 2) * 0.5);
        tbSurface.style.fontSize = `${effSz}px`;
      }
    }
  }

  // Sync top-level active selection gizmo overlay if present
  const activeGizmoEl = container.querySelector('#mw-active-selection-gizmo');
  if (activeGizmoEl && activeGizmoEl.dataset.gizmoNodeKey === node.key) {
    activeGizmoEl.style.left = `${geom.leftPct.toFixed(2)}%`;
    activeGizmoEl.style.top = `${geom.topPct.toFixed(2)}%`;
    activeGizmoEl.style.width = `${geom.widthPct.toFixed(2)}%`;
    activeGizmoEl.style.height = `${geom.heightPct.toFixed(2)}%`;
    activeGizmoEl.style.transformOrigin = `${(node.pivotX * 100).toFixed(2)}% ${((1 - node.pivotY) * 100).toFixed(2)}%`;
    activeGizmoEl.style.transform = `rotate(${-(node.rotationZ || 0)}deg)`;

    const pivotDot = activeGizmoEl.querySelector('.mw-pivot-dot');
    if (pivotDot) {
      pivotDot.style.left = `${(node.pivotX * 100).toFixed(2)}%`;
      pivotDot.style.top = `${((1 - node.pivotY) * 100).toFixed(2)}%`;
    }
  }

  // Also sync any descendant controls on stage (e.g. child status containers/visuals inside a Button or Container)
  for (const childNode of project.nodes) {
    if (childNode.key === node.key || childNode.key === 'root') continue;
    let pKey = childNode.parentKey;
    let isDesc = false;
    while (pKey && pKey !== 'root') {
      if (pKey === node.key) {
        isDesc = true;
        break;
      }
      const pObj = project.nodes.find(n => n.key === pKey);
      pKey = pObj ? pObj.parentKey : null;
    }
    if (isDesc) {
      const cGeom = getNodeStageGeometry(project, childNode);
      const cEl = container.querySelector(`[data-stage-drag-key="${childNode.key}"]`);
      if (cEl) {
        cEl.style.left = `${cGeom.leftPct.toFixed(2)}%`;
        cEl.style.top = `${cGeom.topPct.toFixed(2)}%`;
        cEl.style.width = `${cGeom.widthPct.toFixed(2)}%`;
        cEl.style.height = `${cGeom.heightPct.toFixed(2)}%`;
      }
    }
  }

  // Update Waypoint Layer DOM if present
  const minX = Math.max(0, Math.min(1, node.anchorMinX));
  const minY = Math.max(0, Math.min(1, node.anchorMinY));
  const maxX = Math.max(minX, Math.min(1, node.anchorMaxX));
  const maxY = Math.max(minY, Math.min(1, node.anchorMaxY));

  const wpLeftPct = minX * 100;
  const wpRightPct = maxX * 100;
  const wpTopPct = (1 - maxY) * 100;
  const wpBottomPct = (1 - minY) * 100;
  const wpWidthPct = Math.max(0, wpRightPct - wpLeftPct);
  const wpHeightPct = Math.max(0, wpBottomPct - wpTopPct);

  const wpRect = container.querySelector('#mw-wp-rect');
  if (wpRect) {
    wpRect.style.left = `${wpLeftPct.toFixed(2)}%`;
    wpRect.style.top = `${wpTopPct.toFixed(2)}%`;
    wpRect.style.width = `${wpWidthPct.toFixed(2)}%`;
    wpRect.style.height = `${wpHeightPct.toFixed(2)}%`;
    wpRect.classList.toggle('visible', (maxX - minX) > 0.002 || (maxY - minY) > 0.002);
  }

  const lineMinX = container.querySelector('#mw-wp-line-minx');
  const lineMaxX = container.querySelector('#mw-wp-line-maxx');
  const lineMaxY = container.querySelector('#mw-wp-line-maxy');
  const lineMinY = container.querySelector('#mw-wp-line-miny');
  if (lineMinX) lineMinX.style.left = `${wpLeftPct.toFixed(2)}%`;
  if (lineMaxX) lineMaxX.style.left = `${wpRightPct.toFixed(2)}%`;
  if (lineMaxY) lineMaxY.style.top = `${wpTopPct.toFixed(2)}%`;
  if (lineMinY) lineMinY.style.top = `${wpBottomPct.toFixed(2)}%`;

  const triTL = container.querySelector('.mw-wp-tri.tl');
  const triTR = container.querySelector('.mw-wp-tri.tr');
  const triBL = container.querySelector('.mw-wp-tri.bl');
  const triBR = container.querySelector('.mw-wp-tri.br');
  if (triTL) { triTL.style.left = `${wpLeftPct.toFixed(2)}%`; triTL.style.top = `${wpTopPct.toFixed(2)}%`; }
  if (triTR) { triTR.style.left = `${wpRightPct.toFixed(2)}%`; triTR.style.top = `${wpTopPct.toFixed(2)}%`; }
  if (triBL) { triBL.style.left = `${wpLeftPct.toFixed(2)}%`; triBL.style.top = `${wpBottomPct.toFixed(2)}%`; }
  if (triBR) { triBR.style.left = `${wpRightPct.toFixed(2)}%`; triBR.style.top = `${wpBottomPct.toFixed(2)}%`; }

  // Update numeric inputs in Right Inspector if visible
  const locX = 800 + (node.x || 0) * (1600 / STAGE_WIDTH);
  const locY = 450 + (node.y || 0) * (900 / STAGE_HEIGHT);
  const setVal = (sel, val) => {
    const el = container.querySelector(sel);
    if (el && document.activeElement !== el) {
      el.value = Number(val).toFixed(2);
    }
  };
  setVal('#mw-inp-loc-x', locX);
  setVal('#mw-inp-loc-y', locY);
  setVal('#mw-inp-size-w', node.width);
  setVal('#mw-inp-size-h', node.height);
  setVal('#mw-inp-scale-x', node.scaleX);
  setVal('#mw-inp-scale-y', node.scaleY);
  setVal('#mw-inp-rot-z', node.rotationZ);
  setVal('#mw-inp-min-x', node.anchorMinX);
  setVal('#mw-inp-min-y', node.anchorMinY);
  setVal('#mw-inp-max-x', node.anchorMaxX);
  setVal('#mw-inp-max-y', node.anchorMaxY);
  setVal('#mw-inp-piv-x', node.pivotX);
  setVal('#mw-inp-piv-y', node.pivotY);

  const wpTriggerBtn = container.querySelector('#mw-wp-popover-btn');
  if (wpTriggerBtn) {
    wpTriggerBtn.innerHTML = renderWaypointPresetSVG(node.anchorMinX, node.anchorMinY, node.anchorMaxX, node.anchorMaxY, 42);
  }
}

// Bind all interactive events for the Basic Inspector Tab & Stage Gizmos
export function bindTransformAndStageGizmoEvents({
  container,
  getActiveProject,
  getSelectedNode,
  setSelectedNodeKey,
  clearActiveLuaFile,
  isDescendantOf,
  normalizeProjectHierarchy,
  state,
  render,
  showToast
}) {
  const project = getActiveProject();
  const selectedNode = getSelectedNode();
  if (!selectedNode) return;
  ensureNodeTransformDefaults(selectedNode);

  // 1. Accordion toggles & Reset Transform button
  const toggleTransformSec = container.querySelector('#mw-toggle-transform-sec');
  if (toggleTransformSec) {
    toggleTransformSec.addEventListener('click', (e) => {
      if (e.target.closest('#mw-reset-transform-btn')) return;
      state.transformCollapsed = !state.transformCollapsed;
      render();
    });
  }

  const resetTransformBtn = container.querySelector('#mw-reset-transform-btn');
  if (resetTransformBtn) {
    resetTransformBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedNode.x = 0;
      selectedNode.y = 0;
      selectedNode.scaleX = 1.0;
      selectedNode.scaleY = 1.0;
      selectedNode.rotationZ = 0.0;
      selectedNode.mirrorX = false;
      selectedNode.mirrorY = false;
      selectedNode.anchorMinX = 0.5;
      selectedNode.anchorMinY = 0.5;
      selectedNode.anchorMaxX = 0.5;
      selectedNode.anchorMaxY = 0.5;
      selectedNode.pivotX = 0.5;
      selectedNode.pivotY = 0.5;
      render();
      showToast(`Reset Transform on ${selectedNode.name}`);
    });
  }

  const toggleCreateSec = container.querySelector('#mw-toggle-create-sec');
  if (toggleCreateSec) {
    toggleCreateSec.addEventListener('click', () => {
      state.createCollapsed = !state.createCollapsed;
      render();
    });
  }

  // 3. Device selector & Sync toggle
  container.querySelectorAll('.mw-device-btn[data-device]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedNode.device = btn.dataset.device;
      render();
    });
  });

  const syncSwitch = container.querySelector('#mw-toggle-sync-devices');
  if (syncSwitch) {
    syncSwitch.addEventListener('click', () => {
      selectedNode.syncDevices = !(selectedNode.syncDevices !== false);
      render();
    });
  }

  // 4. Numeric Transform Inputs (Location, Size, Zoom Factor, Rotate, Min, Max, Center)
  const bindNumInput = (selector, onValue) => {
    const el = container.querySelector(selector);
    if (!el) return;
    const handler = () => {
      const val = parseFloat(el.value);
      if (!Number.isNaN(val)) {
        onValue(val);
        syncActiveNodeDOM(container, project, selectedNode);
      }
    };
    el.addEventListener('input', handler);
    el.addEventListener('change', () => {
      handler();
      render();
    });
  };

  bindNumInput('#mw-inp-loc-x', (val) => {
    selectedNode.x = Math.round(((val - 800) * (STAGE_WIDTH / 1600)) * 100) / 100;
  });
  bindNumInput('#mw-inp-loc-y', (val) => {
    selectedNode.y = Math.round(((val - 450) * (STAGE_HEIGHT / 900)) * 100) / 100;
  });
  bindNumInput('#mw-inp-size-w', (val) => {
    const prevW = selectedNode.width || 100;
    const prevH = selectedNode.height || 40;
    const nextW = Math.max(8, Math.round(val * 100) / 100);
    selectedNode.width = nextW;
    syncDescendantDimensionsOnResize(project, selectedNode, prevW, prevH, nextW, prevH);
  });
  bindNumInput('#mw-inp-size-h', (val) => {
    const prevW = selectedNode.width || 100;
    const prevH = selectedNode.height || 40;
    const nextH = Math.max(8, Math.round(val * 100) / 100);
    selectedNode.height = nextH;
    syncDescendantDimensionsOnResize(project, selectedNode, prevW, prevH, prevW, nextH);
  });
  bindNumInput('#mw-inp-scale-x', (val) => {
    selectedNode.scaleX = Math.max(0.05, Math.min(10, Math.round(val * 100) / 100));
  });
  bindNumInput('#mw-inp-scale-y', (val) => {
    selectedNode.scaleY = Math.max(0.05, Math.min(10, Math.round(val * 100) / 100));
  });
  bindNumInput('#mw-inp-rot-z', (val) => {
    selectedNode.rotationZ = Math.round(val * 100) / 100;
  });

  // Waypoint Min/Max numeric inputs: keep visual box stationary while updating anchorMin/Max
  const updateWaypointKeepingVisualPos = (mutator) => {
    const geomBefore = getNodeStageGeometry(project, selectedNode);
    mutator();
    const newAnchorNormX = (selectedNode.anchorMinX + selectedNode.anchorMaxX) * 0.5;
    const newAnchorNormY = (selectedNode.anchorMinY + selectedNode.anchorMaxY) * 0.5;
    selectedNode.x = Math.round((geomBefore.pivotStageX - (newAnchorNormX * STAGE_WIDTH + geomBefore.parentOffsetX)) * 100) / 100;
    selectedNode.y = Math.round((geomBefore.pivotStageY - (newAnchorNormY * STAGE_HEIGHT + geomBefore.parentOffsetY)) * 100) / 100;
  };

  bindNumInput('#mw-inp-min-x', (val) => {
    updateWaypointKeepingVisualPos(() => {
      selectedNode.anchorMinX = Math.max(0, Math.min(selectedNode.anchorMaxX, val));
    });
  });
  bindNumInput('#mw-inp-min-y', (val) => {
    updateWaypointKeepingVisualPos(() => {
      selectedNode.anchorMinY = Math.max(0, Math.min(selectedNode.anchorMaxY, val));
    });
  });
  bindNumInput('#mw-inp-max-x', (val) => {
    updateWaypointKeepingVisualPos(() => {
      selectedNode.anchorMaxX = Math.max(selectedNode.anchorMinX, Math.min(1, val));
    });
  });
  bindNumInput('#mw-inp-max-y', (val) => {
    updateWaypointKeepingVisualPos(() => {
      selectedNode.anchorMaxY = Math.max(selectedNode.anchorMinY, Math.min(1, val));
    });
  });

  // Center / Pivot (X, Y) numeric inputs: allow values outside 0..1 (e.g. 3.0, -1.2) and keep box stationary
  bindNumInput('#mw-inp-piv-x', (val) => {
    const geom = getNodeStageGeometry(project, selectedNode);
    const oldPivX = selectedNode.pivotX;
    const nextPivX = Math.round(val * 100) / 100;
    const rad = ((selectedNode.rotationZ || 0) * Math.PI) / 180;
    const localDx = (nextPivX - oldPivX) * geom.visW;
    selectedNode.pivotX = nextPivX;
    selectedNode.x = Math.round((selectedNode.x + localDx * Math.cos(rad)) * 100) / 100;
    selectedNode.y = Math.round((selectedNode.y + localDx * Math.sin(rad)) * 100) / 100;
  });
  bindNumInput('#mw-inp-piv-y', (val) => {
    const geom = getNodeStageGeometry(project, selectedNode);
    const oldPivY = selectedNode.pivotY;
    const nextPivY = Math.round(val * 100) / 100;
    const rad = ((selectedNode.rotationZ || 0) * Math.PI) / 180;
    const localDy = (nextPivY - oldPivY) * geom.visH;
    selectedNode.pivotY = nextPivY;
    selectedNode.x = Math.round((selectedNode.x - localDy * Math.sin(rad)) * 100) / 100;
    selectedNode.y = Math.round((selectedNode.y + localDy * Math.cos(rad)) * 100) / 100;
  });

  // Custom ▲ / ▼ Stepper Buttons inside each number box
  container.querySelectorAll('.mw-spin-btn[data-spin-for]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const inputId = btn.dataset.spinFor;
      const dir = parseFloat(btn.dataset.spinDir) || 1;
      const inputEl = container.querySelector(`#${inputId}`);
      if (!inputEl) return;

      const step = parseFloat(inputEl.getAttribute('step')) || 1;
      const mult = e.shiftKey ? 5 : 1;
      const curr = parseFloat(inputEl.value) || 0;
      let next = curr + dir * step * mult;

      const minAttr = inputEl.getAttribute('min');
      const maxAttr = inputEl.getAttribute('max');
      if (minAttr !== null && minAttr !== '' && !Number.isNaN(parseFloat(minAttr))) {
        next = Math.max(parseFloat(minAttr), next);
      }
      if (maxAttr !== null && maxAttr !== '' && !Number.isNaN(parseFloat(maxAttr))) {
        next = Math.min(parseFloat(maxAttr), next);
      }

      inputEl.value = next.toFixed(2);
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  // Drag-scrubbing horizontally on X / Y / W / H / Z axis labels
  container.querySelectorAll('.mw-axis-tag[data-scrub-for]').forEach(tag => {
    tag.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const inputId = tag.dataset.scrubFor;
      const inputEl = container.querySelector(`#${inputId}`);
      if (!inputEl) return;
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startVal = parseFloat(inputEl.value) || 0;
      const step = parseFloat(inputEl.getAttribute('step')) || 1;
      const minAttr = inputEl.getAttribute('min');
      const maxAttr = inputEl.getAttribute('max');

      const onMove = (moveEvt) => {
        const dx = moveEvt.clientX - startX;
        let next = startVal + Math.round(dx / 2) * step;
        if (minAttr !== null && minAttr !== '' && !Number.isNaN(parseFloat(minAttr))) {
          next = Math.max(parseFloat(minAttr), next);
        }
        if (maxAttr !== null && maxAttr !== '' && !Number.isNaN(parseFloat(maxAttr))) {
          next = Math.min(parseFloat(maxAttr), next);
        }
        inputEl.value = next.toFixed(2);
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  });

  // 5. Mirror Left/Right and Mirror Up/Down Buttons ([img-2], [img-4])
  const mirrorHBtn = container.querySelector('#mw-btn-mirror-h');
  if (mirrorHBtn) {
    mirrorHBtn.addEventListener('click', () => {
      selectedNode.mirrorX = !selectedNode.mirrorX;
      render();
    });
  }

  const mirrorVBtn = container.querySelector('#mw-btn-mirror-v');
  if (mirrorVBtn) {
    mirrorVBtn.addEventListener('click', () => {
      selectedNode.mirrorY = !selectedNode.mirrorY;
      render();
    });
  }

  // 6. Waypoint Preset 4x4 Popover ([img-4])
  const wpPopoverBtn = container.querySelector('#mw-wp-popover-btn');
  if (wpPopoverBtn) {
    wpPopoverBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.waypointPopoverOpen = !state.waypointPopoverOpen;
      render();
    });
  }

  container.querySelectorAll('[data-wp-preset]').forEach(cell => {
    cell.addEventListener('click', (e) => {
      e.stopPropagation();
      const preset = WAYPOINT_PRESETS.find(p => p.id === cell.dataset.wpPreset);
      if (!preset) return;
      updateWaypointKeepingVisualPos(() => {
        selectedNode.anchorMinX = preset.minX;
        selectedNode.anchorMinY = preset.minY;
        selectedNode.anchorMaxX = preset.maxX;
        selectedNode.anchorMaxY = preset.maxY;
      });
      state.waypointPopoverOpen = false;
      render();
      showToast(`Waypoint preset: ${preset.title}`);
    });
  });

  // 7. Create Settings Switches (Initially Active / Initially Visible)
  const initActiveSwitch = container.querySelector('#mw-toggle-init-active');
  if (initActiveSwitch) {
    initActiveSwitch.addEventListener('click', () => {
      selectedNode.active = !(selectedNode.active !== false);
      render();
    });
  }

  const initVisibleSwitch = container.querySelector('#mw-toggle-init-visible');
  if (initVisibleSwitch) {
    initVisibleSwitch.addEventListener('click', () => {
      selectedNode.visible = !(selectedNode.visible !== false);
      render();
    });
  }

  // ==========================================================================
  // INTERACTIVE CENTER STAGE GIZMOS (Waypoints, Move, Edges/Corners, Rotate, Pivot)
  // ==========================================================================
  const stageFrame = container.querySelector('#mw-stage-frame');
  if (!stageFrame) return;

  // A. Dragging any of the 4 Waypoint Corner Triangles ([img-3, 5, 6, 7, 8])
  container.querySelectorAll('.mw-wp-tri[data-wp-corner]').forEach(triEl => {
    triEl.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();

      const corner = triEl.dataset.wpCorner; // 'tl' | 'tr' | 'bl' | 'br'
      const rect = stageFrame.getBoundingClientRect();
      const geomStart = getNodeStageGeometry(project, selectedNode);

      // Show dashed guide lines while dragging
      container.querySelectorAll('.mw-wp-dashed-v, .mw-wp-dashed-h').forEach(l => l.classList.add('visible'));

      const onMouseMove = (moveEvt) => {
        if (rect.width <= 0 || rect.height <= 0) return;
        const nx = Math.max(0, Math.min(1, (moveEvt.clientX - rect.left) / rect.width));
        const ny = Math.max(0, Math.min(1, 1 - (moveEvt.clientY - rect.top) / rect.height));

        // Clamp strictly so the dragged corner never crosses past the other 3 corners
        if (corner === 'tl') {
          selectedNode.anchorMinX = Math.round(Math.min(nx, selectedNode.anchorMaxX) * 100) / 100;
          selectedNode.anchorMaxY = Math.round(Math.max(ny, selectedNode.anchorMinY) * 100) / 100;
        } else if (corner === 'tr') {
          selectedNode.anchorMaxX = Math.round(Math.max(nx, selectedNode.anchorMinX) * 100) / 100;
          selectedNode.anchorMaxY = Math.round(Math.max(ny, selectedNode.anchorMinY) * 100) / 100;
        } else if (corner === 'bl') {
          selectedNode.anchorMinX = Math.round(Math.min(nx, selectedNode.anchorMaxX) * 100) / 100;
          selectedNode.anchorMinY = Math.round(Math.min(ny, selectedNode.anchorMaxY) * 100) / 100;
        } else if (corner === 'br') {
          selectedNode.anchorMaxX = Math.round(Math.max(nx, selectedNode.anchorMinX) * 100) / 100;
          selectedNode.anchorMinY = Math.round(Math.min(ny, selectedNode.anchorMaxY) * 100) / 100;
        }

        // Keep control's visual screen position planted while waypoints move ([img-8])
        const newAnchorNormX = (selectedNode.anchorMinX + selectedNode.anchorMaxX) * 0.5;
        const newAnchorNormY = (selectedNode.anchorMinY + selectedNode.anchorMaxY) * 0.5;
        selectedNode.x = Math.round((geomStart.pivotStageX - (newAnchorNormX * STAGE_WIDTH + geomStart.parentOffsetX)) * 100) / 100;
        selectedNode.y = Math.round((geomStart.pivotStageY - (newAnchorNormY * STAGE_HEIGHT + geomStart.parentOffsetY)) * 100) / 100;

        syncActiveNodeDOM(container, project, selectedNode);
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        render();
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  });

  // B. Dragging the Cyan Center / Pivot Ring Dot (◎) ([img-3, 5, 7, 8])
  const pivotHandle = container.querySelector('[data-gizmo-pivot="true"]');
  if (pivotHandle) {
    pivotHandle.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();

      const rect = stageFrame.getBoundingClientRect();
      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const startPivotX = selectedNode.pivotX;
      const startPivotY = selectedNode.pivotY;
      const startNodeX = selectedNode.x || 0;
      const startNodeY = selectedNode.y || 0;
      const geomStart = getNodeStageGeometry(project, selectedNode);
      const rad = ((selectedNode.rotationZ || 0) * Math.PI) / 180;
      const cosR = Math.cos(rad);
      const sinR = Math.sin(rad);

      const onMouseMove = (moveEvt) => {
        if (rect.width <= 0 || rect.height <= 0) return;
        const dxStage = ((moveEvt.clientX - startMouseX) / rect.width) * STAGE_WIDTH;
        const dyStage = -((moveEvt.clientY - startMouseY) / rect.height) * STAGE_HEIGHT;

        // Project stage delta into rotated box local axes
        const localDx = dxStage * cosR + dyStage * sinR;
        const localDy = -dxStage * sinR + dyStage * cosR;

        const nextPivX = Math.round((startPivotX + localDx / geomStart.visW) * 100) / 100;
        const nextPivY = Math.round((startPivotY + localDy / geomStart.visH) * 100) / 100;

        const actualLocalDx = (nextPivX - startPivotX) * geomStart.visW;
        const actualLocalDy = (nextPivY - startPivotY) * geomStart.visH;

        const worldShiftX = actualLocalDx * cosR - actualLocalDy * sinR;
        const worldShiftY = actualLocalDx * sinR + actualLocalDy * cosR;

        selectedNode.pivotX = nextPivX;
        selectedNode.pivotY = nextPivY;
        selectedNode.x = Math.round((startNodeX + worldShiftX) * 100) / 100;
        selectedNode.y = Math.round((startNodeY + worldShiftY) * 100) / 100;

        syncActiveNodeDOM(container, project, selectedNode);
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        render();
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }

  // C. Dragging the Top Rotation Spinner Handle (spins around Center/Pivot dot ◎)
  const rotHandle = container.querySelector('[data-gizmo-rotate="true"]');
  if (rotHandle) {
    rotHandle.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();

      const rect = stageFrame.getBoundingClientRect();
      const geomStart = getNodeStageGeometry(project, selectedNode);
      const startRot = selectedNode.rotationZ || 0;

      const getAngleDeg = (clientX, clientY) => {
        const mx = ((clientX - rect.left) / rect.width) * STAGE_WIDTH;
        const my = (1 - (clientY - rect.top) / rect.height) * STAGE_HEIGHT;
        return (Math.atan2(my - geomStart.pivotStageY, mx - geomStart.pivotStageX) * 180) / Math.PI;
      };

      const startMouseAngle = getAngleDeg(e.clientX, e.clientY);

      const onMouseMove = (moveEvt) => {
        if (rect.width <= 0 || rect.height <= 0) return;
        const currAngle = getAngleDeg(moveEvt.clientX, moveEvt.clientY);
        let nextRot = startRot + (currAngle - startMouseAngle);
        while (nextRot > 180) nextRot -= 360;
        while (nextRot < -180) nextRot += 360;
        if (moveEvt.shiftKey) {
          nextRot = Math.round(nextRot / 15) * 15;
        }
        selectedNode.rotationZ = Math.round(nextRot * 100) / 100;
        syncActiveNodeDOM(container, project, selectedNode);
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        render();
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }

  // D. Dragging any of the 4 Sides or 4 Corners to Resize (with opposite side/corner planted; Shift = uniform)
  container.querySelectorAll('[data-resize-dir]').forEach(handleEl => {
    handleEl.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();

      const dir = handleEl.dataset.resizeDir; // 't' | 'b' | 'l' | 'r' | 'tl' | 'tr' | 'bl' | 'br'
      const rect = stageFrame.getBoundingClientRect();
      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const startW = Math.max(12, selectedNode.width || 100);
      const startH = Math.max(12, selectedNode.height || 40);
      const scaleX = Math.max(0.05, Math.abs(selectedNode.scaleX || 1));
      const scaleY = Math.max(0.05, Math.abs(selectedNode.scaleY || 1));
      const aspect = startW / startH;
      const startNodeX = selectedNode.x || 0;
      const startNodeY = selectedNode.y || 0;
      const pivX = selectedNode.pivotX;
      const pivY = selectedNode.pivotY;
      const rad = ((selectedNode.rotationZ || 0) * Math.PI) / 180;
      const cosR = Math.cos(rad);
      const sinR = Math.sin(rad);

      const onMouseMove = (moveEvt) => {
        if (rect.width <= 0 || rect.height <= 0) return;
        const dxStage = ((moveEvt.clientX - startMouseX) / rect.width) * STAGE_WIDTH;
        const dyStage = -((moveEvt.clientY - startMouseY) / rect.height) * STAGE_HEIGHT;

        // Convert stage delta to unscaled local box delta along rotated axes
        const localDx = (dxStage * cosR + dyStage * sinR) / scaleX;
        const localDy = (-dxStage * sinR + dyStage * cosR) / scaleY;

        let left = 0;
        let right = startW;
        let bottom = 0;
        let top = startH;

        const minSize = 14;

        if (dir.includes('r')) {
          right = Math.max(minSize, startW + localDx);
        }
        if (dir.includes('l')) {
          left = Math.min(startW - minSize, localDx);
        }
        if (dir.includes('t')) {
          top = Math.max(minSize, startH + localDy);
        }
        if (dir.includes('b')) {
          bottom = Math.min(startH - minSize, localDy);
        }

        // If Shift is held, enforce uniform aspect-locked resize while keeping the opposite side/corner planted!
        if (moveEvt.shiftKey) {
          if (dir === 'l' || dir === 'r') {
            const newW = right - left;
            const newH = Math.max(minSize, newW / aspect);
            const midY = startH * 0.5;
            bottom = midY - newH * 0.5;
            top = midY + newH * 0.5;
          } else if (dir === 't' || dir === 'b') {
            const newH = top - bottom;
            const newW = Math.max(minSize, newH * aspect);
            const midX = startW * 0.5;
            left = midX - newW * 0.5;
            right = midX + newW * 0.5;
          } else {
            // Corner drag with opposite corner planted
            const rawW = right - left;
            const rawH = top - bottom;
            const uniformScale = Math.max(minSize / startW, minSize / startH, Math.max(rawW / startW, rawH / startH));
            const newW = startW * uniformScale;
            const newH = startH * uniformScale;
            if (dir.includes('r')) {
              right = newW;
            } else {
              left = startW - newW;
            }
            if (dir.includes('t')) {
              top = newH;
            } else {
              bottom = startH - newH;
            }
          }
        }

        const newW = Math.max(minSize, right - left);
        const newH = Math.max(minSize, top - bottom);

        // Compute how far the normalized pivot (pivX, pivY) shifted in local space
        // so the planted opposite side/corner stays 100% locked in stage space
        const shiftLocalX = (left + newW * pivX - startW * pivX) * scaleX;
        const shiftLocalY = (bottom + newH * pivY - startH * pivY) * scaleY;

        const worldShiftX = shiftLocalX * cosR - shiftLocalY * sinR;
        const worldShiftY = shiftLocalX * sinR + shiftLocalY * cosR;

        const prevW = selectedNode.width || startW;
        const prevH = selectedNode.height || startH;
        const nextW = Math.round(newW * 100) / 100;
        const nextH = Math.round(newH * 100) / 100;
        selectedNode.width = nextW;
        selectedNode.height = nextH;
        selectedNode.x = Math.round((startNodeX + worldShiftX) * 100) / 100;
        selectedNode.y = Math.round((startNodeY + worldShiftY) * 100) / 100;
        syncDescendantDimensionsOnResize(project, selectedNode, prevW, prevH, nextW, nextH);

        syncActiveNodeDOM(container, project, selectedNode);
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        render();
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  });
}

