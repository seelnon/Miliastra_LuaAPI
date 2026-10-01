// ============================================================================
// MILIASTRA VSCODE-STYLE VIRTUALIZED & INCREMENTAL CODE EDITOR ENGINE
// Powered by C++/WASM Linear Memory Indexer (editor_core.cpp / editor_core.wasm)
// Techniques Inspired by VSCode (Monaco Editor):
//   1. Incremental Splice Diffing: Only re-splits & re-tokenizes edited line(s)
//   2. Per-Line Token Cache + Early-Exit Multiline State Propagation
//   3. Viewport DOM Virtualization: Only renders visible ~45 lines in DOM
//   4. GPU-Composited Scroll Sync (transform: translate3d)
//   5. O(log N) WASM Binary Search for Cursor (Ln, Col) & Viewport Find Clips
//   6. Incremental Per-Line Identifier Symbol Table for O(1) Autocomplete
// ============================================================================

import { WasmDocumentCore } from './wasm-editor-core.js';
import { highlightSingleLuaLine } from './syntax-highlighter.js';
import { extractWordsFromLine } from './lua-autocomplete.js';

export const EDITOR_LINE_HEIGHT = 20;
export const EDITOR_PADDING_TOP = 12;
export const EDITOR_PADDING_LEFT = 12;
const VIEWPORT_OVERSCAN_LINES = 14;

function escapeHtmlFast(str) {
  if (!str) return '';
  let out = '';
  let last = 0;
  const len = str.length;
  for (let i = 0; i < len; i++) {
    const c = str.charCodeAt(i);
    if (c === 38) {
      if (i > last) out += str.slice(last, i);
      out += '&amp;';
      last = i + 1;
    } else if (c === 60) {
      if (i > last) out += str.slice(last, i);
      out += '&lt;';
      last = i + 1;
    } else if (c === 62) {
      if (i > last) out += str.slice(last, i);
      out += '&gt;';
      last = i + 1;
    }
  }
  if (last === 0) return str;
  if (last < len) out += str.slice(last);
  return out;
}

export class VSCodeDocumentModel {
  constructor(initialText = '') {
    this.wasm = new WasmDocumentCore();
    this.text = '';
    this.lines = [''];
    this.lineEntryStates = [0];
    this.lineExitStates = [0];
    this.lineHtmlCache = [null];
    this.versionId = 1;

    // Incremental identifier symbol table for O(1) Autocomplete
    this.wordSet = new Set();
    this.cachedWordItems = [];
    this.wordCacheDirty = true;

    this.setFullText(initialText);
  }

  /**
   * Resets the entire model buffer (used on initial file load or snippet switch).
   */
  setFullText(newText) {
    const normalized = String(newText || '');
    this.text = normalized;
    this.wasm.loadFullText(normalized);

    this.lines = normalized.split('\n');
    const count = this.lines.length;
    this.lineEntryStates = new Array(count).fill(0);
    this.lineExitStates = new Array(count).fill(0);
    this.lineHtmlCache = new Array(count).fill(null);

    // Seed multiline states across lines
    this._recomputeStatesFromLine(0, count - 1, true);

    // Build initial identifier set
    this.wordSet.clear();
    for (let i = 0; i < count; i++) {
      extractWordsFromLine(this.lines[i], this.wordSet);
    }
    this.wordCacheDirty = true;
    this.versionId++;
  }

  /**
   * Computes the minimal changed character range between `this.text` and `nextText`
   * in O(changed chars) using cursor-guided prefix/suffix scanning, then performs
   * an incremental splice on WASM linear memory, `this.lines`, and `this.lineHtmlCache`.
   */
  applyEdit(nextText, cursorHint = nextText.length) {
    const prevText = this.text;
    if (nextText === prevText) return false;

    const prevLen = prevText.length;
    const nextLen = nextText.length;

    // 1. Find common prefix up to cursorHint
    const maxPrefix = Math.min(prevLen, nextLen, Math.max(0, cursorHint));
    let prefixLen = 0;
    while (prefixLen < maxPrefix && prevText.charCodeAt(prefixLen) === nextText.charCodeAt(prefixLen)) {
      prefixLen++;
    }
    // Continue extending prefix if cursorHint was before the actual change
    const minTotalLen = Math.min(prevLen, nextLen);
    while (prefixLen < minTotalLen && prevText.charCodeAt(prefixLen) === nextText.charCodeAt(prefixLen)) {
      prefixLen++;
    }

    // 2. Find common suffix without overlapping prefixLen
    let prevSuffixIdx = prevLen;
    let nextSuffixIdx = nextLen;
    while (
      prevSuffixIdx > prefixLen &&
      nextSuffixIdx > prefixLen &&
      prevText.charCodeAt(prevSuffixIdx - 1) === nextText.charCodeAt(nextSuffixIdx - 1)
    ) {
      prevSuffixIdx--;
      nextSuffixIdx--;
    }

    // 3. Resolve affected old line range via O(log N) WASM lookup BEFORE splicing
    const startLoc = this.wasm.offsetToLineCol(prefixLen);
    const endLoc = this.wasm.offsetToLineCol(prevSuffixIdx);
    const firstOldLine = startLoc.line;
    const lastOldLine = endLoc.line;

    const insertedSlice = nextText.slice(prefixLen, nextSuffixIdx);

    // 4. Update WASM linear memory & line offset index incrementally
    this.text = nextText;
    this.wasm.applyIncrementalSplice(prefixLen, prevSuffixIdx, insertedSlice, nextLen);

    // 5. Reconstruct only the affected lines slice
    const linePrefix = this.lines[firstOldLine].slice(0, startLoc.col);
    const lineSuffix = this.lines[lastOldLine].slice(endLoc.col);
    const combinedEditedSegment = linePrefix + insertedSlice + lineSuffix;
    const replacementLines = combinedEditedSegment.split('\n');

    const removeCount = lastOldLine - firstOldLine + 1;
    this.lines.splice(firstOldLine, removeCount, ...replacementLines);
    this.lineEntryStates.splice(
      firstOldLine,
      removeCount,
      ...new Array(replacementLines.length).fill(0)
    );
    this.lineExitStates.splice(
      firstOldLine,
      removeCount,
      ...new Array(replacementLines.length).fill(0)
    );
    this.lineHtmlCache.splice(
      firstOldLine,
      removeCount,
      ...new Array(replacementLines.length).fill(null)
    );

    // 6. Harvest new identifiers strictly from the edited lines (O(edited lines))
    for (let i = 0; i < replacementLines.length; i++) {
      extractWordsFromLine(replacementLines[i], this.wordSet);
    }
    this.wordCacheDirty = true;

    // 7. Incrementally propagate multiline state starting at firstOldLine;
    // stops as soon as state converges after the edited range!
    const lastNewLine = firstOldLine + replacementLines.length - 1;
    this._recomputeStatesFromLine(firstOldLine, lastNewLine, false);

    this.versionId++;
    return true;
  }

  /**
   * Scans multiline comment/string transitions (`--[[`, `[[`, `]]`) starting at `startLine`.
   * When `forceAll` is false, stops immediately after `minEndLine` as soon as a line's
   * entry state matches its previous entry state (VSCode incremental state convergence).
   */
  _recomputeStatesFromLine(startLine, minEndLine, forceAll = false) {
    const count = this.lines.length;
    let currentEntry = startLine > 0 ? (this.lineExitStates[startLine - 1] || 0) : 0;

    for (let idx = startLine; idx < count; idx++) {
      const prevEntry = this.lineEntryStates[idx];
      const prevExit = this.lineExitStates[idx];

      if (!forceAll && idx > minEndLine && prevEntry === currentEntry && this.lineHtmlCache[idx] !== null) {
        // State converged! All subsequent lines remain valid in cache.
        break;
      }

      this.lineEntryStates[idx] = currentEntry;
      const nextExit = this._scanLineExitStateFast(this.lines[idx], currentEntry);
      this.lineExitStates[idx] = nextExit;

      if (prevEntry !== currentEntry || prevExit !== nextExit) {
        this.lineHtmlCache[idx] = null;
      }

      currentEntry = nextExit;
    }
  }

  /**
   * Ultra-fast state scanner for a single line (only checks `--[[`, `[[`, `]]`, `--`, quotes).
   * Avoids building HTML strings for offscreen lines!
   */
  _scanLineExitStateFast(line, entryState) {
    if (!line) return entryState;
    const len = line.length;
    let state = entryState;
    let i = 0;

    while (i < len) {
      if (state === 1 || state === 2) {
        const closeIdx = line.indexOf(']]', i);
        if (closeIdx === -1) return state;
        state = 0;
        i = closeIdx + 2;
        continue;
      }

      const c = line.charCodeAt(i);
      if (c === 45 && i + 1 < len && line.charCodeAt(i + 1) === 45) {
        if (i + 3 < len && line.charCodeAt(i + 2) === 91 && line.charCodeAt(i + 3) === 91) {
          state = 1;
          i += 4;
          continue;
        }
        // Single-line comment ignores rest of line
        return state;
      }

      if (c === 91 && i + 1 < len && line.charCodeAt(i + 1) === 91) {
        state = 2;
        i += 2;
        continue;
      }

      if (c === 34 || c === 39) {
        const quote = c;
        i++;
        while (i < len) {
          const qc = line.charCodeAt(i);
          if (qc === 92) {
            i += 2;
            continue;
          }
          if (qc === quote) {
            i++;
            break;
          }
          i++;
        }
        continue;
      }

      i++;
    }

    return state;
  }

  /**
   * Returns cached highlighted HTML for `lineIdx`, tokenizing on demand if null.
   */
  getHighlightedLineHTML(lineIdx) {
    if (lineIdx < 0 || lineIdx >= this.lines.length) return '';
    const cached = this.lineHtmlCache[lineIdx];
    if (cached !== null) return cached;

    const entryState = this.lineEntryStates[lineIdx] || 0;
    const { html, exitState } = highlightSingleLuaLine(this.lines[lineIdx], entryState);
    this.lineExitStates[lineIdx] = exitState;
    this.lineHtmlCache[lineIdx] = html;
    return html;
  }

  /**
   * O(log N) lookup via WASM for 0-based { line, col, lineText, lineBeforeCursor }.
   */
  getCursorLocation(charOffset) {
    const loc = this.wasm.offsetToLineCol(charOffset);
    const lineText = this.lines[loc.line] || '';
    return {
      line: loc.line,           // 0-based line index
      col: loc.col,             // 0-based column index
      ln1: loc.line + 1,        // 1-based line number
      col1: loc.col + 1,        // 1-based column number
      lineText,
      lineBeforeCursor: lineText.slice(0, loc.col)
    };
  }

  /**
   * Returns cached word completion items for O(1) Autocomplete without regexing full text.
   */
  getCachedWordCompletionItems() {
    if (this.wordCacheDirty) {
      this.cachedWordItems = Array.from(this.wordSet).map(w => ({
        name: w,
        displayLabel: w,
        kind: 'word',
        detail: '',
        insertText: w
      }));
      this.wordCacheDirty = false;
    }
    return this.cachedWordItems;
  }

  /**
   * Runs WASM linear-memory substring search and returns match count + typed array view.
   */
  findMatchesInWasm(query) {
    return this.wasm.findMatches(query);
  }

  /**
   * Renders Find Match `<mark>` backdrop HTML strictly for the visible viewport line range
   * `[startLine .. endLine]`, using binary search over the WASM match buffer.
   */
  renderViewportFindLayerHTML(startLine, endLine, matchPairView, matchCount, activeMatchIndex) {
    if (!matchCount || !matchPairView || matchPairView.length === 0) return '';

    const lineCount = this.lines.length;
    const clampedStart = Math.max(0, startLine);
    const clampedEnd = Math.min(lineCount - 1, endLine);
    if (clampedStart > clampedEnd) return '';

    const viewportCharStart = this.wasm.getLineStartOffset(clampedStart);
    const viewportCharEnd =
      clampedEnd + 1 < lineCount
        ? this.wasm.getLineStartOffset(clampedEnd + 1)
        : this.text.length;

    // Binary search first match whose `end > viewportCharStart`
    let low = 0;
    let high = matchCount - 1;
    let firstMatchIdx = matchCount;
    while (low <= high) {
      const mid = (low + high) >>> 1;
      const mEnd = matchPairView[mid * 2 + 1];
      if (mEnd > viewportCharStart) {
        firstMatchIdx = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    if (firstMatchIdx >= matchCount || matchPairView[firstMatchIdx * 2] >= viewportCharEnd) {
      return '';
    }

    let mCursor = firstMatchIdx;
    const rows = [];

    for (let lineIdx = clampedStart; lineIdx <= clampedEnd; lineIdx++) {
      const lineStr = this.lines[lineIdx];
      const lineLen = lineStr.length;
      const lineStartOffset = this.wasm.getLineStartOffset(lineIdx);
      const lineEndOffset = lineStartOffset + lineLen;

      while (mCursor < matchCount && matchPairView[mCursor * 2 + 1] <= lineStartOffset) {
        mCursor++;
      }

      if (mCursor >= matchCount || matchPairView[mCursor * 2] >= lineEndOffset) {
        rows.push('');
        continue;
      }

      let rowHtml = '';
      let localPos = 0;
      let tempIdx = mCursor;

      while (tempIdx < matchCount) {
        const mStart = matchPairView[tempIdx * 2];
        const mEnd = matchPairView[tempIdx * 2 + 1];
        if (mStart >= lineEndOffset) break;

        const relStart = Math.max(0, mStart - lineStartOffset);
        const relEnd = Math.min(lineLen, mEnd - lineStartOffset);

        if (relStart > localPos) {
          rowHtml += escapeHtmlFast(lineStr.slice(localPos, relStart));
        }
        if (relEnd > relStart) {
          const cls = tempIdx === activeMatchIndex ? 'sp-find-mark active' : 'sp-find-mark';
          rowHtml += `<mark class="${cls}">${escapeHtmlFast(lineStr.slice(relStart, relEnd))}</mark>`;
        }
        localPos = relEnd;
        if (mEnd <= lineEndOffset) {
          mCursor = tempIdx + 1;
        }
        tempIdx++;
      }

      rows.push(rowHtml);
    }

    return rows.join('\n');
  }
}
