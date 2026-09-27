// ============================================================================
// MILIASTRA VSCODE-STYLE LUA INTELLISENSE & AUTOCOMPLETE ENGINE
// Zero-dependency, instant completion provider built from API_CLASSES &
// ENUM_DEFINITIONS + live document identifier scanner.
// Matches VSCode Lua Language Server behavior ([img-3] & [img-4]).
// ============================================================================

import { API_CLASSES } from './data/api-data.js';
import { ENUM_DEFINITIONS } from './data/enum-data.js';

// SVG icons matching VSCode completion item kinds ([img-3] & [img-4])
const KIND_ICONS = {
  field: `<svg class="ac-icon ac-icon-field" viewBox="0 0 16 16" width="14" height="14"><path fill="currentColor" d="M14.45 4.5l-6-3a.99.99 0 0 0-.9 0l-6 3A1 1 0 0 0 1 5.39v5.22a1 1 0 0 0 .55.89l6 3a.99.99 0 0 0 .9 0l6-3a1 1 0 0 0 .55-.89V5.39a1 1 0 0 0-.55-.89zM8 2.38l4.89 2.44L8 7.26 3.11 4.82 8 2.38zm-5.5 3.6l5 2.5v4.88l-5-2.5V5.98zm6 7.38V8.48l5-2.5v4.88l-5 2.5z"/></svg>`,
  method: `<svg class="ac-icon ac-icon-method" viewBox="0 0 16 16" width="14" height="14"><path fill="currentColor" d="M13.5 4.1L8.4 1.55a.9.9 0 0 0-.8 0L2.5 4.1a.9.9 0 0 0-.5.8v6.2c0 .34.19.65.5.8l5.1 2.55a.9.9 0 0 0 .8 0l5.1-2.55a.9.9 0 0 0 .5-.8V4.9a.9.9 0 0 0-.5-.8zM8 2.55l4.25 2.12L8 6.8 3.75 4.67 8 2.55zM3 5.48l4.5 2.25v5.32L3 10.8V5.48zm5.5 7.57V7.73L13 5.48v5.32l-4.5 2.25z"/></svg>`,
  enum: `<svg class="ac-icon ac-icon-enum" viewBox="0 0 16 16" width="14" height="14"><path fill="currentColor" d="M14 3H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1zm0 9H2V4h12v8zM4 6h8v1H4V6zm0 3h5v1H4V9z"/></svg>`,
  word: `<span class="ac-icon ac-icon-word">abc</span>`,
  keyword: `<span class="ac-icon ac-icon-kw">kw</span>`
};

// Format method signature into (self, param1, param2) for dot access vs (param1, param2) for colon access
function formatMethodLabel(method, isDotAccess) {
  const paramNames = (method.params || []).map(p => p.name);
  if (isDotAccess) {
    const withSelf = ['self', ...paramNames];
    return `${method.name}(${withSelf.join(', ')})`;
  }
  return `${method.name}(${paramNames.join(', ')})`;
}

// Build pre-indexed completion tables from API_CLASSES and ENUM_DEFINITIONS
function buildCompletionCatalog() {
  const scriptFields = [
    { name: 'alive', kind: 'field', detail: 'boolean', insertText: 'alive' },
    { name: 'enabled', kind: 'field', detail: 'boolean', insertText: 'enabled' },
    { name: 'id', kind: 'field', detail: 'integer', insertText: 'id' },
    { name: 'object', kind: 'field', detail: 'ClientUIBaseControl', insertText: 'object' },
    { name: 'path', kind: 'field', detail: 'string', insertText: 'path' },
    { name: 'prefabIndex', kind: 'field', detail: 'integer', insertText: 'prefabIndex' }
  ];

  const scriptClass = API_CLASSES.find(c => c.id === 'script');
  const scriptMethodsDot = [];
  const scriptMethodsColon = [];
  if (scriptClass && scriptClass.methods) {
    for (const m of scriptClass.methods) {
      scriptMethodsDot.push({
        name: m.name,
        displayLabel: formatMethodLabel(m, true),
        kind: 'method',
        detail: m.returns || '',
        insertText: m.name
      });
      scriptMethodsColon.push({
        name: m.name,
        displayLabel: formatMethodLabel(m, false),
        kind: 'method',
        detail: m.returns || '',
        insertText: m.name
      });
    }
  }

  // game.* methods
  const gameClass = API_CLASSES.find(c => c.id === 'game');
  const gameMembers = [];
  if (gameClass && gameClass.methods) {
    for (const m of gameClass.methods) {
      gameMembers.push({
        name: m.name,
        displayLabel: formatMethodLabel(m, false),
        kind: 'method',
        detail: m.returns || '',
        insertText: m.name
      });
    }
  }

  // Color.* methods
  const colorClass = API_CLASSES.find(c => c.id === 'Color');
  const colorMembers = [];
  if (colorClass && colorClass.methods) {
    for (const m of colorClass.methods) {
      if (m.name === 'Color()') continue;
      colorMembers.push({
        name: m.name,
        displayLabel: formatMethodLabel(m, false),
        kind: 'method',
        detail: m.returns || 'ColorValue',
        insertText: m.name
      });
    }
  }

  // Enum.* namespaces and Enum.<Type>.* items
  const enumNamespaces = [];
  const enumItemsByType = new Map();
  for (const ed of ENUM_DEFINITIONS) {
    const shortName = ed.name.replace(/^Enum\./, '');
    enumNamespaces.push({
      name: shortName,
      displayLabel: shortName,
      kind: 'enum',
      detail: 'Enum',
      insertText: shortName
    });
    const items = (ed.items || []).map(item => ({
      name: item.name,
      displayLabel: item.name,
      kind: 'enum',
      detail: item.defaultBind ? `[${item.defaultBind}]` : shortName,
      insertText: item.name
    }));
    enumItemsByType.set(shortName, items);
  }

  // Collect all UI Control + Tween + Sequence + Event + Signal + Vector3 fields & methods
  const controlFieldMap = new Map();
  const controlMethodDotMap = new Map();
  const controlMethodColonMap = new Map();
  const allMethodNamesMap = new Map();

  for (const cls of API_CLASSES) {
    if (cls.fields) {
      for (const f of cls.fields) {
        if (!controlFieldMap.has(f.name)) {
          controlFieldMap.set(f.name, {
            name: f.name,
            displayLabel: f.name,
            kind: 'field',
            detail: f.type || '',
            insertText: f.name
          });
        }
      }
    }
    if (cls.methods) {
      for (const m of cls.methods) {
        const cleanName = m.name.replace(/\(\)$/, '');
        if (!allMethodNamesMap.has(cleanName)) {
          allMethodNamesMap.set(cleanName, {
            name: cleanName,
            displayLabel: cleanName,
            kind: 'word',
            detail: cls.name,
            insertText: cleanName
          });
        }
        if (cls.id !== 'game' && cls.id !== 'Color' && cls.id !== 'Lifecycles' && cls.id !== 'MathGlobals') {
          if (!controlMethodDotMap.has(cleanName)) {
            controlMethodDotMap.set(cleanName, {
              name: cleanName,
              displayLabel: formatMethodLabel({ ...m, name: cleanName }, true),
              kind: 'method',
              detail: m.returns || '',
              insertText: cleanName
            });
          }
          if (!controlMethodColonMap.has(cleanName)) {
            controlMethodColonMap.set(cleanName, {
              name: cleanName,
              displayLabel: formatMethodLabel({ ...m, name: cleanName }, false),
              kind: 'method',
              detail: m.returns || '',
              insertText: cleanName
            });
          }
        }
      }
    }
  }

  const globalKeywordsAndBuiltins = [
    { name: 'script', displayLabel: 'script', kind: 'field', detail: 'LuaScript', insertText: 'script' },
    { name: 'game', displayLabel: 'game', kind: 'field', detail: 'GameNamespace', insertText: 'game' },
    { name: 'Color', displayLabel: 'Color', kind: 'field', detail: 'ColorNamespace', insertText: 'Color' },
    { name: 'Enum', displayLabel: 'Enum', kind: 'enum', detail: 'EnumNamespace', insertText: 'Enum' },
    { name: 'Vector3', displayLabel: 'Vector3(x, y, z)', kind: 'method', detail: 'Vector3', insertText: 'Vector3' },
    { name: 'OnInit', displayLabel: 'OnInit()', kind: 'method', detail: 'Lifecycle', insertText: 'OnInit' },
    { name: 'OnEnable', displayLabel: 'OnEnable()', kind: 'method', detail: 'Lifecycle', insertText: 'OnEnable' },
    { name: 'OnStart', displayLabel: 'OnStart()', kind: 'method', detail: 'Lifecycle', insertText: 'OnStart' },
    { name: 'OnUpdate', displayLabel: 'OnUpdate(deltaTime)', kind: 'method', detail: 'Lifecycle', insertText: 'OnUpdate' },
    { name: 'OnLevelUpdate', displayLabel: 'OnLevelUpdate(levelDeltaTime)', kind: 'method', detail: 'Lifecycle', insertText: 'OnLevelUpdate' },
    { name: 'OnDisable', displayLabel: 'OnDisable()', kind: 'method', detail: 'Lifecycle', insertText: 'OnDisable' },
    { name: 'OnDestroy', displayLabel: 'OnDestroy()', kind: 'method', detail: 'Lifecycle', insertText: 'OnDestroy' },
    { name: 'typeof', displayLabel: 'typeof(value)', kind: 'method', detail: 'string', insertText: 'typeof' },
    { name: 'print', displayLabel: 'print(...)', kind: 'method', detail: 'void', insertText: 'print' },
    { name: 'printerr', displayLabel: 'printerr(...)', kind: 'method', detail: 'void', insertText: 'printerr' },
    { name: 'local', displayLabel: 'local', kind: 'keyword', detail: 'keyword', insertText: 'local' },
    { name: 'function', displayLabel: 'function', kind: 'keyword', detail: 'keyword', insertText: 'function' },
    { name: 'return', displayLabel: 'return', kind: 'keyword', detail: 'keyword', insertText: 'return' },
    { name: 'ipairs', displayLabel: 'ipairs(t)', kind: 'method', detail: 'iterator', insertText: 'ipairs' },
    { name: 'pairs', displayLabel: 'pairs(t)', kind: 'method', detail: 'iterator', insertText: 'pairs' },
    { name: 'tostring', displayLabel: 'tostring(v)', kind: 'method', detail: 'string', insertText: 'tostring' },
    { name: 'tonumber', displayLabel: 'tonumber(v)', kind: 'method', detail: 'number', insertText: 'tonumber' }
  ];

  return {
    scriptDot: [...scriptFields, ...scriptMethodsDot],
    scriptColon: [...scriptMethodsColon],
    gameMembers,
    colorMembers,
    enumNamespaces,
    enumItemsByType,
    controlFields: Array.from(controlFieldMap.values()),
    controlMethodsDot: Array.from(controlMethodDotMap.values()),
    controlMethodsColon: Array.from(controlMethodColonMap.values()),
    allMethodWords: Array.from(allMethodNamesMap.values()),
    globalKeywordsAndBuiltins
  };
}

const CATALOG = buildCompletionCatalog();

// Extract unique identifier words from the active Lua document
function extractDocumentWords(code, currentPrefix) {
  const wordSet = new Set();
  const regex = /\b([A-Za-z_][A-Za-z0-9_]{2,})\b/g;
  let match;
  while ((match = regex.exec(code)) !== null) {
    const w = match[1];
    if (w !== currentPrefix) {
      wordSet.add(w);
    }
  }
  return Array.from(wordSet).map(w => ({
    name: w,
    displayLabel: w,
    kind: 'word',
    detail: '',
    insertText: w
  }));
}

function filterAndScoreItems(items, prefix) {
  if (!prefix) return items.slice(0, 24);
  const lowerPrefix = prefix.toLowerCase();
  const scored = [];

  for (const item of items) {
    const lowerName = item.name.toLowerCase();
    if (lowerName.startsWith(lowerPrefix)) {
      scored.push({ item, score: item.name.startsWith(prefix) ? 100 : 90 });
    } else if (lowerName.includes(lowerPrefix)) {
      scored.push({ item, score: 50 });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.item.name.localeCompare(b.item.name);
  });

  // Deduplicate by name
  const seen = new Set();
  const result = [];
  for (const s of scored) {
    if (!seen.has(s.item.name)) {
      seen.add(s.item.name);
      result.push(s.item);
      if (result.length >= 20) break;
    }
  }
  return result;
}

// Highlight matched prefix inside the suggestion label (like [img-3])
function highlightMatchLabel(displayLabel, prefix) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (!prefix) return esc(displayLabel);

  const idx = displayLabel.toLowerCase().indexOf(prefix.toLowerCase());
  if (idx === -1) return esc(displayLabel);

  const before = displayLabel.slice(0, idx);
  const match = displayLabel.slice(idx, idx + prefix.length);
  const after = displayLabel.slice(idx + prefix.length);
  return `${esc(before)}<span class="ac-match-hl">${esc(match)}</span>${esc(after)}`;
}

/**
 * Queries context-aware completion suggestions at the cursor offset in `code`.
 */
export function getLuaCompletionsAtCursor(code, cursorOffset) {
  const beforeCursor = code.slice(0, cursorOffset);
  const lastNewline = beforeCursor.lastIndexOf('\n');
  const currentLineBeforeCursor = beforeCursor.slice(lastNewline + 1);

  // Do not trigger inside a line comment
  if (/^\s*--/.test(currentLineBeforeCursor)) {
    return null;
  }

  // 1. Check Enum.<EnumType>.<prefix>
  const enumSubMatch = currentLineBeforeCursor.match(/\bEnum\.([A-Za-z0-9_]+)\.([A-Za-z0-9_]*)$/);
  if (enumSubMatch) {
    const enumType = enumSubMatch[1];
    const prefix = enumSubMatch[2] || '';
    const enumItems = CATALOG.enumItemsByType.get(enumType) || [];
    const items = filterAndScoreItems(enumItems, prefix);
    if (items.length === 0) return null;
    return {
      replaceStart: cursorOffset - prefix.length,
      replaceEnd: cursorOffset,
      prefix,
      items
    };
  }

  // 2. Check <receiver><sep><prefix> (e.g., script., script:, game., Color., Enum., control:Find, image.)
  const memberMatch = currentLineBeforeCursor.match(/([A-Za-z_][A-Za-z0-9_.]*)\s*([.:])([A-Za-z0-9_]*)$/);
  if (memberMatch) {
    const receiver = memberMatch[1];
    const sep = memberMatch[2];
    const prefix = memberMatch[3] || '';

    let candidates = [];
    if (receiver === 'script') {
      candidates = sep === ':' ? CATALOG.scriptColon : CATALOG.scriptDot;
    } else if (receiver === 'game') {
      candidates = CATALOG.gameMembers;
    } else if (receiver === 'Color') {
      candidates = CATALOG.colorMembers;
    } else if (receiver === 'Enum') {
      candidates = CATALOG.enumNamespaces;
    } else if (sep === ':') {
      // Method call on any control / tween / sequence + document words (matches [img-3]!)
      const docWords = extractDocumentWords(code, prefix);
      candidates = [...docWords, ...CATALOG.allMethodWords, ...CATALOG.controlMethodsColon];
    } else {
      // Property/method access on a control (e.g., script.object., image., button., parent.)
      candidates = [...CATALOG.controlFields, ...CATALOG.controlMethodsDot];
    }

    const items = filterAndScoreItems(candidates, prefix);
    if (items.length === 0) return null;
    return {
      replaceStart: cursorOffset - prefix.length,
      replaceEnd: cursorOffset,
      prefix,
      items
    };
  }

  // 3. Check general word / identifier being typed (minimum 2 characters)
  const wordMatch = currentLineBeforeCursor.match(/\b([A-Za-z_][A-Za-z0-9_]*)$/);
  if (wordMatch && wordMatch[1].length >= 2) {
    const prefix = wordMatch[1];
    const docWords = extractDocumentWords(code, prefix);
    const combined = [
      ...docWords,
      ...CATALOG.globalKeywordsAndBuiltins,
      ...CATALOG.allMethodWords,
      ...CATALOG.controlFields
    ];
    const items = filterAndScoreItems(combined, prefix);
    if (items.length === 0) return null;
    return {
      replaceStart: cursorOffset - prefix.length,
      replaceEnd: cursorOffset,
      prefix,
      items
    };
  }

  return null;
}

export function renderAutocompleteListHTML(completionState, selectedIndex) {
  if (!completionState || !completionState.items || completionState.items.length === 0) {
    return '';
  }
  const { items, prefix } = completionState;

  return items.map((item, idx) => {
    const iconHtml = KIND_ICONS[item.kind] || KIND_ICONS.word;
    const labelHtml = highlightMatchLabel(item.displayLabel || item.name, prefix);
    const detailHtml = item.detail ? `<span class="ac-item-detail">${item.detail}</span>` : '';

    return `
      <div class="ac-item-row ${idx === selectedIndex ? 'active' : ''}" data-ac-index="${idx}">
        <div class="ac-item-left">
          ${iconHtml}
          <span class="ac-item-label">${labelHtml}</span>
        </div>
        ${detailHtml}
      </div>
    `;
  }).join('');
}
