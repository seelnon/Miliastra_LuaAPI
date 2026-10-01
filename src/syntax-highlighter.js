// ============================================================================
// HIGH-SPEED NATIVE LUA SYNTAX HIGHLIGHTER
// Zero-dependency, stream-like tokenization for Lua 5.1/Luau/Miliastra syntax
// ============================================================================

const LUA_KEYWORDS = new Set([
  'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function',
  'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return', 'then',
  'true', 'until', 'while'
]);

const LUA_BUILTINS = new Set([
  'game', 'script', 'Color', 'Enum', 'EnumItem', 'math', 'table', 'string', 'print',
  'printerr', 'typeof', 'ipairs', 'pairs', 'tostring', 'tonumber', 'type',
  'setmetatable', 'getmetatable', 'pcall', 'xpcall', 'error', 'assert',
  'select', 'unpack', 'rawget', 'rawset', 'rawequal'
]);

const LUA_ENUM_TYPES = new Set([
  'KeyEventType', 'CursorEventType', 'EaseType', 'ImageSource', 'ImageType',
  'ImageFillType', 'ImageMaskSoftEdgeMode', 'TextHorizontalAlignment',
  'TextVerticalAlignment', 'Device', 'CustomVariableEntityType', 'LanguageType',
  'ParamType', 'ControllerNavigationEventType', 'ControllerNavigationDir',
  'ControllerNavigationMode'
]);

const LUA_ENUM_ITEMS = new Set([
  // CursorEventType
  'CursorClick', 'CursorDown', 'CursorUp', 'CursorEnter', 'CursorExit',
  'CursorBeginDrag', 'CursorDrag', 'CursorEndDrag',
  // EaseType
  'Linear', 'InQuad', 'OutQuad', 'InOutQuad', 'InCubic', 'OutCubic', 'InOutCubic',
  'InQuart', 'OutQuart', 'InOutQuart', 'InQuint', 'OutQuint', 'InOutQuint',
  'InSine', 'OutSine', 'InOutSine', 'InExpo', 'OutExpo', 'InOutExpo',
  'InCirc', 'OutCirc', 'InOutCirc', 'InElastic', 'OutElastic', 'InOutElastic',
  'InBack', 'OutBack', 'InOutBack', 'InBounce', 'OutBounce', 'InOutBounce',
  // ImageSource & ImageType & ImageFillType & SoftEdge
  'StaticReference', 'Currency', 'Equipment', 'Faction', 'Item', 'Prefab', 'Skill', 'UnitStatus', 'Dynamic',
  'Simple', 'Sliced', 'Tiled', 'Filled', 'Stretch',
  'Unused', 'Horizontal', 'Vertical', 'Radial90', 'Radial180', 'Radial360',
  'Absolute', 'Percentage',
  // TextAlignment
  'Left', 'Middle', 'Center', 'Right', 'Top', 'Bottom',
  // Device
  'KeyboardAndMouse', 'Controller', 'Mobile', 'MobileController',
  // CustomVariableEntityType
  'Level', 'PlayerSelf', 'AvatarSelf',
  // LanguageType
  'LanguageEng', 'LanguageChs', 'LanguageCht', 'LanguageJpn', 'LanguageKor',
  'LanguageDeu', 'LanguageFra', 'LanguageSpa', 'LanguagePor', 'LanguageRus',
  'LanguageIta', 'LanguageInd', 'LanguageTha', 'LanguageTur', 'LanguageVie', 'LanguageNone',
  // ParamType
  'Bool', 'BoolList', 'Int', 'IntList', 'Float', 'FloatList', 'String', 'StringList',
  'Vector3', 'Vector3List', 'ConfigId', 'ConfigIdList', 'Entity', 'EntityList', 'Guid', 'GuidList', 'PrefabId', 'PrefabIdList',
  // KeyEvents
  'KeyboardJumpKeyDown', 'KeyboardJumpKeyUp', 'KeyboardMoveForwardKeyDown', 'KeyboardMoveForwardKeyUp',
  'KeyboardMoveLeftKeyDown', 'KeyboardMoveLeftKeyUp', 'KeyboardMoveBackwardKeyDown', 'KeyboardMoveBackwardKeyUp',
  'KeyboardMoveRightKeyDown', 'KeyboardMoveRightKeyUp', 'KeyboardNormalAttackKeyDown', 'KeyboardNormalAttackKeyUp',
  'KeyboardSprintKeyDown', 'KeyboardSprintKeyUp', 'KeyboardInteractKeyDown', 'KeyboardInteractKeyUp',
  'KeyboardDropKeyDown', 'KeyboardDropKeyUp', 'KeyboardCharacterSkill1KeyDown', 'KeyboardCharacterSkill1KeyUp',
  'KeyboardCharacterSkill2KeyDown', 'KeyboardCharacterSkill2KeyUp', 'KeyboardCharacterSkill3KeyDown', 'KeyboardCharacterSkill3KeyUp',
  'KeyboardCharacterSkill4KeyDown', 'KeyboardCharacterSkill4KeyUp', 'KeyboardOpenShortcutWheelKeyDown', 'KeyboardOpenShortcutWheelKeyUp',
  'KeyboardSwitchToWalkOrRunKeyDown', 'KeyboardSwitchToWalkOrRunKeyUp',
  'ControllerJumpKeyDown', 'ControllerJumpKeyUp', 'ControllerNormalAttackKeyDown', 'ControllerNormalAttackKeyUp',
  'ControllerInteractKeyDown', 'ControllerInteractKeyUp', 'ControllerSprintKeyDown', 'ControllerSprintKeyUp',
  'ControllerCharacterSkill1KeyDown', 'ControllerCharacterSkill1KeyUp', 'ControllerCharacterSkill2KeyDown', 'ControllerCharacterSkill2KeyUp',
  'ControllerCharacterSkill3KeyDown', 'ControllerCharacterSkill4KeyDown'
]);

// Add hotbar craftsperson keys to enum items set
for (let k = 1; k <= 43; k++) {
  LUA_ENUM_ITEMS.add(`KeyboardCraftspersonKey${k}Down`);
  LUA_ENUM_ITEMS.add(`KeyboardCraftspersonKey${k}Up`);
}

const LUA_LIFECYCLES = new Set([
  'OnInit', 'OnEnable', 'OnStart', 'OnDisable', 'OnDestroy', 'OnUpdate', 'OnLevelUpdate'
]);

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function highlightLua(code, showLineNumbers = true) {
  if (!code) return '';

  const lines = code.split('\n');
  let inMultiLineComment = false;
  let inMultiLineString = false;

  const highlightedLines = lines.map((line, idx) => {
    let result = '';
    let i = 0;
    const len = line.length;

    while (i < len) {
      // Check multi-line comment end
      if (inMultiLineComment) {
        const closeIdx = line.indexOf(']]', i);
        if (closeIdx === -1) {
          result += `<span class="hl-com">${escapeHtml(line.slice(i))}</span>`;
          i = len;
        } else {
          result += `<span class="hl-com">${escapeHtml(line.slice(i, closeIdx + 2))}</span>`;
          i = closeIdx + 2;
          inMultiLineComment = false;
        }
        continue;
      }

      // Check multi-line string end
      if (inMultiLineString) {
        const closeIdx = line.indexOf(']]', i);
        if (closeIdx === -1) {
          result += `<span class="hl-str">${escapeHtml(line.slice(i))}</span>`;
          i = len;
        } else {
          result += `<span class="hl-str">${escapeHtml(line.slice(i, closeIdx + 2))}</span>`;
          i = closeIdx + 2;
          inMultiLineString = false;
        }
        continue;
      }

      // Check comment start
      if (line.slice(i, i + 2) === '--') {
        if (line.slice(i, i + 4) === '--[[') {
          inMultiLineComment = true;
          const closeIdx = line.indexOf(']]', i + 4);
          if (closeIdx === -1) {
            result += `<span class="hl-com">${escapeHtml(line.slice(i))}</span>`;
            i = len;
          } else {
            result += `<span class="hl-com">${escapeHtml(line.slice(i, closeIdx + 2))}</span>`;
            i = closeIdx + 2;
            inMultiLineComment = false;
          }
        } else if (line.slice(i, i + 4) === '---@') {
          // Annotation doc comment (---@param, ---@meta, ---@class, etc.)
          result += `<span class="hl-doc">${escapeHtml(line.slice(i))}</span>`;
          i = len;
        } else {
          // Single line comment
          result += `<span class="hl-com">${escapeHtml(line.slice(i))}</span>`;
          i = len;
        }
        continue;
      }

      // Check multi-line string start [[
      if (line.slice(i, i + 2) === '[[') {
        inMultiLineString = true;
        const closeIdx = line.indexOf(']]', i + 2);
        if (closeIdx === -1) {
          result += `<span class="hl-str">${escapeHtml(line.slice(i))}</span>`;
          i = len;
        } else {
          result += `<span class="hl-str">${escapeHtml(line.slice(i, closeIdx + 2))}</span>`;
          i = closeIdx + 2;
          inMultiLineString = false;
        }
        continue;
      }

      // Check string "..." or '...'
      const ch = line[i];
      if (ch === '"' || ch === "'") {
        const quote = ch;
        let j = i + 1;
        let escaped = false;
        while (j < len) {
          if (line[j] === '\\' && !escaped) {
            escaped = true;
          } else if (line[j] === quote && !escaped) {
            j++;
            break;
          } else {
            escaped = false;
          }
          j++;
        }
        result += `<span class="hl-str">${escapeHtml(line.slice(i, j))}</span>`;
        i = j;
        continue;
      }

      // Check numbers (hex, float, int)
      if (/\d/.test(ch) || (ch === '.' && /\d/.test(line[i + 1] || ''))) {
        let j = i;
        if (line.slice(j, j + 2) === '0x' || line.slice(j, j + 2) === '0X') {
          j += 2;
          while (j < len && /[0-9a-fA-F_]/.test(line[j])) j++;
        } else {
          while (j < len && /[0-9._eE+-]/.test(line[j])) j++;
        }
        result += `<span class="hl-num">${escapeHtml(line.slice(i, j))}</span>`;
        i = j;
        continue;
      }

      // Check identifier / keywords / builtins / enums
      if (/[a-zA-Z_]/.test(ch)) {
        let j = i;
        while (j < len && /[a-zA-Z0-9_]/.test(line[j])) j++;
        const word = line.slice(i, j);

        if (LUA_KEYWORDS.has(word)) {
          if (word === 'true' || word === 'false' || word === 'nil') {
            result += `<span class="hl-bool">${escapeHtml(word)}</span>`;
          } else {
            result += `<span class="hl-kw">${escapeHtml(word)}</span>`;
          }
        } else if (LUA_BUILTINS.has(word)) {
          result += `<span class="hl-builtin">${escapeHtml(word)}</span>`;
        } else if (LUA_ENUM_TYPES.has(word)) {
          result += `<span class="hl-enum-type">${escapeHtml(word)}</span>`;
        } else if (LUA_ENUM_ITEMS.has(word)) {
          result += `<span class="hl-enum-val">${escapeHtml(word)}</span>`;
        } else if (LUA_LIFECYCLES.has(word)) {
          result += `<span class="hl-fn">${escapeHtml(word)}</span>`;
        } else if (j < len && line[j] === '(') {
          result += `<span class="hl-fn">${escapeHtml(word)}</span>`;
        } else if (word.startsWith('ClientUI') || word === 'Tween' || word === 'TweenSequence' || word === 'ServerSignal' || word === 'Vector3' || word === 'CursorEventData') {
          result += `<span class="hl-type">${escapeHtml(word)}</span>`;
        } else {
          result += escapeHtml(word);
        }
        i = j;
        continue;
      }

      // Operators and punctuation
      if (/[:.]/.test(ch)) {
        result += `<span class="hl-op">${escapeHtml(ch)}</span>`;
        i++;
        continue;
      }

      result += escapeHtml(ch);
      i++;
    }

    if (!showLineNumbers) {
      return result;
    }

    const lineNum = idx + 1;
    return `<div class="code-line"><span class="line-num">${lineNum}</span><span class="line-content">${result || '&nbsp;'}</span></div>`;
  });

  if (showLineNumbers) {
    return `<div class="code-with-lines">${highlightedLines.join('')}</div>`;
  }
  return highlightedLines.join('\n');
}

export function highlightType(typeStr) {
  if (!typeStr) return '<span class="hl-type-prim">void</span>';
  return escapeHtml(typeStr)
    .replace(/\b(boolean|number|string|void|nil|table|any)\b/g, '<span class="hl-type-prim">$1</span>')
    .replace(/\b(ClientControlType|ClientUI[a-zA-Z0-9]+|Tween|TweenSequence|ServerSignal|Vector3|Color|CursorEventData|NormalizedPercentage|DecimalPercentage)\b/g, '<span class="hl-type-custom">$1</span>')
    .replace(/\b(EnumItem\.[a-zA-Z0-9]+|Enum\.[a-zA-Z0-9]+)\b/g, '<span class="hl-enum-type">$1</span>')
    .replace(/\?/g, '<span class="hl-op">?</span>')
    .replace(/\[\]/g, '<span class="hl-op">[]</span>');
}

export function highlightMethodSignature(sig) {
  if (!sig) return '';
  const match = sig.match(/^([a-zA-Z0-9_]+)([:.])([a-zA-Z0-9_]+)\((.*)\)$/);
  if (!match) {
    return highlightLua(sig, false);
  }

  const [, caller, delim, methodName, paramsStr] = match;
  
  let callerClass = 'hl-obj';
  if (LUA_BUILTINS.has(caller)) callerClass = 'hl-builtin';
  else if (caller.startsWith('ClientUI')) callerClass = 'hl-type';
  const highlightedCaller = `<span class="${callerClass}">${escapeHtml(caller)}</span>`;
  const highlightedDelim = `<span class="hl-op">${delim}</span>`;
  const highlightedName = `<span class="hl-fn-name">${escapeHtml(methodName)}</span>`;

  let highlightedParams = '';
  if (paramsStr.trim()) {
    const params = paramsStr.split(',').map(p => p.trim());
    highlightedParams = params.map(p => `<span class="hl-param">${escapeHtml(p)}</span>`).join('<span class="hl-op">, </span>');
  }

  return `${highlightedCaller}${highlightedDelim}${highlightedName}<span class="hl-paren">(</span>${highlightedParams}<span class="hl-paren">)</span>`;
}

export function highlightEnumItem(fullName) {
  if (!fullName) return '';
  const parts = String(fullName).split('.');
  if (parts.length === 3) {
    return `<span class="hl-builtin">${escapeHtml(parts[0])}</span><span class="hl-op">.</span><span class="hl-enum-type">${escapeHtml(parts[1])}</span><span class="hl-op">.</span><span class="hl-enum-val">${escapeHtml(parts[2])}</span>`;
  }
  if (parts.length === 2) {
    return `<span class="hl-enum-type">${escapeHtml(parts[0])}</span><span class="hl-op">.</span><span class="hl-enum-val">${escapeHtml(parts[1])}</span>`;
  }
  return `<span class="hl-enum-val">${escapeHtml(fullName)}</span>`;
}

function isIdentStartCode(c) {
  return (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95;
}

function isIdentPartCode(c) {
  return (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 95;
}

function isDigitCode(c) {
  return c >= 48 && c <= 57;
}

/**
 * VSCode-style single-line incremental tokenizer.
 * Tokenizes a single line given `entryState`:
 *   0 = normal code
 *   1 = inside multi-line comment --[[ ... ]]
 *   2 = inside multi-line string  [[ ... ]]
 * Returns { html, exitState }.
 */
export function highlightSingleLuaLine(line, entryState = 0) {
  if (!line) {
    return { html: '', exitState: entryState };
  }

  let state = entryState;
  let result = '';
  let i = 0;
  const len = line.length;

  while (i < len) {
    // 1. Inside multi-line comment
    if (state === 1) {
      const closeIdx = line.indexOf(']]', i);
      if (closeIdx === -1) {
        result += `<span class="hl-com">${escapeHtml(line.slice(i))}</span>`;
        i = len;
      } else {
        result += `<span class="hl-com">${escapeHtml(line.slice(i, closeIdx + 2))}</span>`;
        i = closeIdx + 2;
        state = 0;
      }
      continue;
    }

    // 2. Inside multi-line string
    if (state === 2) {
      const closeIdx = line.indexOf(']]', i);
      if (closeIdx === -1) {
        result += `<span class="hl-str">${escapeHtml(line.slice(i))}</span>`;
        i = len;
      } else {
        result += `<span class="hl-str">${escapeHtml(line.slice(i, closeIdx + 2))}</span>`;
        i = closeIdx + 2;
        state = 0;
      }
      continue;
    }

    const code = line.charCodeAt(i);

    // 3. Fast skip consecutive whitespace
    if (code === 32 || code === 9) {
      let j = i + 1;
      while (j < len && (line.charCodeAt(j) === 32 || line.charCodeAt(j) === 9)) j++;
      result += line.slice(i, j);
      i = j;
      continue;
    }

    // 4. Comment start '--'
    if (code === 45 && i + 1 < len && line.charCodeAt(i + 1) === 45) {
      if (i + 3 < len && line.charCodeAt(i + 2) === 91 && line.charCodeAt(i + 3) === 91) {
        state = 1;
        const closeIdx = line.indexOf(']]', i + 4);
        if (closeIdx === -1) {
          result += `<span class="hl-com">${escapeHtml(line.slice(i))}</span>`;
          i = len;
        } else {
          result += `<span class="hl-com">${escapeHtml(line.slice(i, closeIdx + 2))}</span>`;
          i = closeIdx + 2;
          state = 0;
        }
      } else if (i + 3 < len && line.charCodeAt(i + 2) === 45 && line.charCodeAt(i + 3) === 64) {
        result += `<span class="hl-doc">${escapeHtml(line.slice(i))}</span>`;
        i = len;
      } else {
        result += `<span class="hl-com">${escapeHtml(line.slice(i))}</span>`;
        i = len;
      }
      continue;
    }

    // 5. Multi-line string start '[['
    if (code === 91 && i + 1 < len && line.charCodeAt(i + 1) === 91) {
      state = 2;
      const closeIdx = line.indexOf(']]', i + 2);
      if (closeIdx === -1) {
        result += `<span class="hl-str">${escapeHtml(line.slice(i))}</span>`;
        i = len;
      } else {
        result += `<span class="hl-str">${escapeHtml(line.slice(i, closeIdx + 2))}</span>`;
        i = closeIdx + 2;
        state = 0;
      }
      continue;
    }

    // 6. Quoted string "..." or '...'
    if (code === 34 || code === 39) {
      const quote = code;
      let j = i + 1;
      let escaped = false;
      while (j < len) {
        const c = line.charCodeAt(j);
        if (c === 92 && !escaped) {
          escaped = true;
        } else if (c === quote && !escaped) {
          j++;
          break;
        } else {
          escaped = false;
        }
        j++;
      }
      result += `<span class="hl-str">${escapeHtml(line.slice(i, j))}</span>`;
      i = j;
      continue;
    }

    // 7. Numbers
    if (isDigitCode(code) || (code === 46 && i + 1 < len && isDigitCode(line.charCodeAt(i + 1)))) {
      let j = i;
      if (code === 48 && j + 1 < len && (line.charCodeAt(j + 1) === 120 || line.charCodeAt(j + 1) === 88)) {
        j += 2;
        while (j < len) {
          const c = line.charCodeAt(j);
          if (isDigitCode(c) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102) || c === 95) j++;
          else break;
        }
      } else {
        while (j < len) {
          const c = line.charCodeAt(j);
          if (isDigitCode(c) || c === 46 || c === 95 || c === 101 || c === 69 || c === 43 || c === 45) j++;
          else break;
        }
      }
      result += `<span class="hl-num">${escapeHtml(line.slice(i, j))}</span>`;
      i = j;
      continue;
    }

    // 8. Identifiers & Keywords
    if (isIdentStartCode(code)) {
      let j = i + 1;
      while (j < len && isIdentPartCode(line.charCodeAt(j))) j++;
      const word = line.slice(i, j);

      if (LUA_KEYWORDS.has(word)) {
        if (word === 'true' || word === 'false' || word === 'nil') {
          result += `<span class="hl-bool">${word}</span>`;
        } else {
          result += `<span class="hl-kw">${word}</span>`;
        }
      } else if (LUA_BUILTINS.has(word)) {
        result += `<span class="hl-builtin">${word}</span>`;
      } else if (LUA_ENUM_TYPES.has(word)) {
        result += `<span class="hl-enum-type">${word}</span>`;
      } else if (LUA_ENUM_ITEMS.has(word)) {
        result += `<span class="hl-enum-val">${word}</span>`;
      } else if (LUA_LIFECYCLES.has(word)) {
        result += `<span class="hl-fn">${word}</span>`;
      } else if (j < len && line.charCodeAt(j) === 40) { // '('
        result += `<span class="hl-fn">${word}</span>`;
      } else if (
        word.startsWith('ClientUI') ||
        word === 'Tween' ||
        word === 'TweenSequence' ||
        word === 'ServerSignal' ||
        word === 'Vector3' ||
        word === 'CursorEventData'
      ) {
        result += `<span class="hl-type">${word}</span>`;
      } else {
        result += word;
      }
      i = j;
      continue;
    }

    // 9. Operators & Punctuation
    if (code === 58 || code === 46) { // ':' or '.'
      result += `<span class="hl-op">${line[i]}</span>`;
      i++;
      continue;
    }

    if (code === 38) result += '&amp;';
    else if (code === 60) result += '&lt;';
    else if (code === 62) result += '&gt;';
    else result += line[i];
    i++;
  }

  return { html: result, exitState: state };
}
