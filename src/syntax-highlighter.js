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
  'game', 'script', 'Color', 'Enum', 'math', 'table', 'string', 'print',
  'printerr', 'typeof', 'ipairs', 'pairs', 'tostring', 'tonumber', 'type',
  'setmetatable', 'getmetatable', 'pcall', 'xpcall', 'error', 'assert',
  'select', 'unpack', 'rawget', 'rawset', 'rawequal'
]);

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

      // Check identifier / keywords / builtins
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
        } else if (LUA_LIFECYCLES.has(word)) {
          result += `<span class="hl-fn">${escapeHtml(word)}</span>`;
        } else if (j < len && line[j] === '(') {
          result += `<span class="hl-fn">${escapeHtml(word)}</span>`;
        } else if (word.startsWith('ClientUI') || word === 'Tween' || word === 'TweenSequence' || word === 'ServerSignal' || word === 'Vector3') {
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
    .replace(/\b(ClientControlType|ClientUI[a-zA-Z0-9]+|Tween|TweenSequence|ServerSignal|Vector3|Color|EnumItem\.[a-zA-Z0-9]+|NormalizedPercentage|DecimalPercentage)\b/g, '<span class="hl-type-custom">$1</span>')
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

