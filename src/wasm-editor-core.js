// ============================================================================
// MILIASTRA SCRATCHPAD — WEBASSEMBLY LINEAR MEMORY TEXT & SEARCH ACCELERATOR
// Powered by src/editor_core.cpp -> src/editor_core.wasm
// Features:
//   • Synchronous 0ms WebAssembly instantiation (works offline & on GitHub Pages)
//   • Shared Linear Memory UTF-16 text buffer with copyWithin incremental splices
//   • O(log N) binary-searched Offset <-> (Line, Col) resolution in WASM
//   • Zero-allocation case-insensitive substring matcher in WASM linear memory
// ============================================================================

const WASM_BASE64 =
  'AGFzbQEAAAABHwRgAX8Bf2ADf39/AX9gBn9/f39/fwF/YAR/f39/AX8DBQQAAQIDBQQBARBAB0cEBm1lbW9yeQIAE3dhc21fb2Zmc2V0X3RvX2xpbmUAARF3YXNtX2ZpbmRfbWF0Y2hlcwACEHdhc21faW5kZXhfbGluZXMAAwrTAwQaACAAQcEATyAAQdoATXEEfyAAQSBqBSAACwuNAQEFfyABQQFNBEBBAA8LQQAhAyABQQFrIQQCQANAIAMgBEsNASADIARqQQF2IgVBAnQgAGooAgAhBiAFQQFqIAFJBH8gACAFQQFqQQJ0aigCAAVBfwshByACIAZJBEAgBUUEQEEADwsgBUEBayEEBSACIAdPBEAgBUEBaiEDBSAFDwsLDAALCyABQQFrC8kBAQZ/IANFIAEgA0lyBEBBAA8LQQAhBiABIANrIQcgAi8BABAAIQhBACEJAkADQCAJIAdLDQEgACAJQQF0ai8BABAAIAhGBEBBASEKAkADQCAKIANPDQEgACAJIApqQQF0ai8BABAAIAIgCkEBdGovAQAQAEcNASAKQQFqIQoMAAsLIAogA0YEQCAGIAVJBEAgBCAGQQN0aiILIAk2AgAgCyAJIANqNgIECyAGQQFqIQYgCSADaiEJDAELCyAJQQFqIQkMAAsLIAYLXAEDfyACQQA2AgAgA0EAOgAAQQEhBEEAIQUCQANAIAUgAU8NASAAIAVBAXRqLwEAIgZBCkYEQCACIARBAnRqIAVBAWo2AgAgBEEBaiEECyAFQQFqIQUMAAsLIAQL';

// Fixed non-overlapping regions inside the 1MB (16-page) WASM linear memory:
const TEXT_BYTE_PTR         = 0;       // 0 .. 524,288 bytes (262,144 UTF-16 chars)
const MAX_TEXT_CHARS        = 262144;
const QUERY_BYTE_PTR        = 524288;  // 524,288 .. 532,480 bytes (4,096 UTF-16 chars)
const MAX_QUERY_CHARS       = 4096;
const LINE_OFFSETS_BYTE_PTR = 532480;  // 532,480 .. 663,552 bytes (32,768 uint32 line starts)
const MAX_LINES             = 32768;
const LINE_STATES_BYTE_PTR  = 663552;  // 663,552 .. 696,320 bytes (32,768 uint8 line states)
const MATCHES_BYTE_PTR      = 696320;  // 696,320 .. 958,464 bytes (32,768 [start, end] uint32 pairs)
const MAX_MATCHES           = 32768;

function decodeBase64ToUint8Array(b64) {
  const binStr = atob(b64);
  const len = binStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binStr.charCodeAt(i);
  }
  return bytes;
}

let sharedWasmInstance = null;

export function getWasmEditorInstance() {
  if (sharedWasmInstance) return sharedWasmInstance;
  const wasmBytes = decodeBase64ToUint8Array(WASM_BASE64);
  const module = new WebAssembly.Module(wasmBytes);
  sharedWasmInstance = new WebAssembly.Instance(module);
  return sharedWasmInstance;
}

export class WasmDocumentCore {
  constructor() {
    const inst = getWasmEditorInstance();
    this.exports = inst.exports;
    this.memory = inst.exports.memory;

    this._bindViews();
    this.textLen = 0;
    this.lineCount = 1;
    this.lineOffsetsView[0] = 0;
  }

  _bindViews() {
    const buf = this.memory.buffer;
    this.textU16 = new Uint16Array(buf, TEXT_BYTE_PTR, MAX_TEXT_CHARS);
    this.queryU16 = new Uint16Array(buf, QUERY_BYTE_PTR, MAX_QUERY_CHARS);
    this.lineOffsetsView = new Uint32Array(buf, LINE_OFFSETS_BYTE_PTR, MAX_LINES);
    this.lineStatesView = new Uint8Array(buf, LINE_STATES_BYTE_PTR, MAX_LINES);
    this.matchesView = new Uint32Array(buf, MATCHES_BYTE_PTR, MAX_MATCHES * 2);
  }

  /**
   * Loads full document string into WASM linear memory and indexes all line offsets.
   */
  loadFullText(text) {
    const len = Math.min(text.length, MAX_TEXT_CHARS);
    const u16 = this.textU16;
    for (let i = 0; i < len; i++) {
      u16[i] = text.charCodeAt(i);
    }
    this.textLen = len;
    this.lineCount = this.exports.wasm_index_lines(
      TEXT_BYTE_PTR,
      len,
      LINE_OFFSETS_BYTE_PTR,
      LINE_STATES_BYTE_PTR
    );
    return this.lineCount;
  }

  /**
   * Incrementally splices a changed slice [replaceStart .. replaceEnd] with `insertedText`
   * directly inside WASM linear memory using hardware-accelerated TypedArray.copyWithin,
   * avoiding copying untouched prefix/suffix characters from JS!
   */
  applyIncrementalSplice(replaceStart, replaceEnd, insertedText, newTotalLength) {
    const insLen = insertedText.length;
    const oldLen = this.textLen;
    const clampedTotal = Math.min(newTotalLength, MAX_TEXT_CHARS);
    const u16 = this.textU16;

    // Shift suffix in WASM linear memory if length changed
    const delta = insLen - (replaceEnd - replaceStart);
    if (delta !== 0 && replaceEnd < oldLen) {
      const targetStart = replaceStart + insLen;
      const copyEnd = Math.min(oldLen, MAX_TEXT_CHARS - Math.max(0, delta));
      if (targetStart < MAX_TEXT_CHARS && replaceEnd < copyEnd) {
        u16.copyWithin(targetStart, replaceEnd, copyEnd);
      }
    }

    // Write only the newly inserted characters into WASM linear memory
    const writeLimit = Math.min(insLen, MAX_TEXT_CHARS - replaceStart);
    for (let i = 0; i < writeLimit; i++) {
      u16[replaceStart + i] = insertedText.charCodeAt(i);
    }

    this.textLen = clampedTotal;
    this.lineCount = this.exports.wasm_index_lines(
      TEXT_BYTE_PTR,
      clampedTotal,
      LINE_OFFSETS_BYTE_PTR,
      LINE_STATES_BYTE_PTR
    );
    return this.lineCount;
  }

  /**
   * O(log N) binary search in WASM to resolve a character offset to 0-based { line, col }.
   * Eliminates `textarea.value.slice(0, pos).split('\n')`!
   */
  offsetToLineCol(charOffset) {
    const clamped = Math.max(0, Math.min(charOffset, this.textLen));
    const lineIdx = this.exports.wasm_offset_to_line(
      LINE_OFFSETS_BYTE_PTR,
      this.lineCount,
      clamped
    );
    const lineStart = this.lineOffsetsView[lineIdx] || 0;
    return {
      line: lineIdx,          // 0-based line index
      col: clamped - lineStart, // 0-based column index
      lineStartOffset: lineStart
    };
  }

  /**
   * O(1) lookup for the character start offset of a 0-based line index.
   */
  getLineStartOffset(lineIdx) {
    if (lineIdx <= 0) return 0;
    if (lineIdx >= this.lineCount) return this.textLen;
    return this.lineOffsetsView[lineIdx];
  }

  /**
   * Zero-allocation case-insensitive search in WASM linear memory.
   * Returns { count, buffer } where `buffer` is a Uint32Array view of [start, end, start, end, ...].
   */
  findMatches(query) {
    if (!query || query.length === 0 || this.textLen === 0) {
      return { count: 0, pairView: this.matchesView.subarray(0, 0) };
    }
    const qLen = Math.min(query.length, MAX_QUERY_CHARS);
    const qU16 = this.queryU16;
    for (let i = 0; i < qLen; i++) {
      qU16[i] = query.charCodeAt(i);
    }

    const rawCount = this.exports.wasm_find_matches(
      TEXT_BYTE_PTR,
      this.textLen,
      QUERY_BYTE_PTR,
      qLen,
      MATCHES_BYTE_PTR,
      MAX_MATCHES
    );
    const clampedCount = Math.min(rawCount, MAX_MATCHES);
    return {
      count: clampedCount,
      pairView: this.matchesView.subarray(0, clampedCount * 2)
    };
  }
}
