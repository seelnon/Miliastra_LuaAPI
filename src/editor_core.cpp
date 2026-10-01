// ============================================================================
// MILIASTRA SCRATCHPAD — NATIVE C++ / WEBASSEMBLY TEXT INDEXER & SEARCH CORE
// Target: WebAssembly (wasm32-unknown-unknown)
// Zero-allocation UTF-16 Linear Memory Line Indexer, O(log N) Line/Col Lookup,
// Incremental Multiline Lua State Scanner, and Case-Insensitive Match Engine.
// ============================================================================

#include <stdint.h>

extern "C" {

// Multiline Lexer States for Lua 5.1:
// 0 = Normal Code
// 1 = Inside multi-line block comment: --[[ ... ]]
// 2 = Inside multi-line block string:  [[ ... ]]

/**
 * Scans UTF-16 buffer at `textPtr` of length `textLen`.
 * Populates `lineOffsetsOut` with the 0-based character offset of each line start,
 * populates `lineStatesOut` with the multiline lexer entry state of each line,
 * and returns the total number of lines (always >= 1).
 */
uint32_t wasm_index_lines(
    const uint16_t* textPtr,
    uint32_t textLen,
    uint32_t* lineOffsetsOut,
    uint8_t* lineStatesOut
) {
    uint32_t lineCount = 1;
    uint8_t state = 0;

    lineOffsetsOut[0] = 0;
    lineStatesOut[0] = 0;

    uint32_t i = 0;
    while (i < textLen) {
        uint16_t ch = textPtr[i];

        if (ch == 10) { // '\n'
            lineOffsetsOut[lineCount] = i + 1;
            lineStatesOut[lineCount] = state;
            lineCount++;
            i++;
            continue;
        }

        if (state == 1) {
            // Inside --[[ ... ]]
            if (ch == 93 && (i + 1 < textLen) && textPtr[i + 1] == 93) { // ']]'
                state = 0;
                i += 2;
                continue;
            }
            i++;
            continue;
        }

        if (state == 2) {
            // Inside [[ ... ]]
            if (ch == 93 && (i + 1 < textLen) && textPtr[i + 1] == 93) { // ']]'
                state = 0;
                i += 2;
                continue;
            }
            i++;
            continue;
        }

        // State == 0 (Normal code)
        if (ch == 45 && (i + 1 < textLen) && textPtr[i + 1] == 45) { // '--'
            if ((i + 3 < textLen) && textPtr[i + 2] == 91 && textPtr[i + 3] == 91) { // '--[['
                state = 1;
                i += 4;
                continue;
            } else {
                // Single-line comment: skip to end of line
                i += 2;
                while (i < textLen && textPtr[i] != 10) {
                    i++;
                }
                continue;
            }
        }

        if (ch == 91 && (i + 1 < textLen) && textPtr[i + 1] == 91) { // '[['
            state = 2;
            i += 2;
            continue;
        }

        if (ch == 34 || ch == 39) { // '"' or '\''
            uint16_t quote = ch;
            i++;
            while (i < textLen && textPtr[i] != 10) {
                if (textPtr[i] == 92) { // '\\'
                    i += 2;
                    continue;
                }
                if (textPtr[i] == quote) {
                    i++;
                    break;
                }
                i++;
            }
            continue;
        }

        i++;
    }

    return lineCount;
}

/**
 * O(log N) binary search over `lineOffsets` to find the 0-based line index
 * containing `charOffset`.
 */
uint32_t wasm_offset_to_line(
    const uint32_t* lineOffsets,
    uint32_t lineCount,
    uint32_t charOffset
) {
    if (lineCount <= 1) return 0;
    uint32_t low = 0;
    uint32_t high = lineCount - 1;

    while (low <= high) {
        uint32_t mid = (low + high) >> 1;
        uint32_t start = lineOffsets[mid];
        uint32_t nextStart = (mid + 1 < lineCount) ? lineOffsets[mid + 1] : 0xFFFFFFFFu;

        if (charOffset < start) {
            if (mid == 0) return 0;
            high = mid - 1;
        } else if (charOffset >= nextStart) {
            low = mid + 1;
        } else {
            return mid;
        }
    }
    return lineCount - 1;
}

static inline uint16_t to_lower_ascii(uint16_t c) {
    return (c >= 65 && c <= 90) ? (c + 32) : c;
}

/**
 * Fast zero-allocation case-insensitive substring matcher in WASM linear memory.
 * Writes [startOffset, endOffset] pairs into `matchesOut` (up to `maxMatches` pairs)
 * and returns the number of matches found.
 */
uint32_t wasm_find_matches(
    const uint16_t* textPtr,
    uint32_t textLen,
    const uint16_t* queryPtr,
    uint32_t queryLen,
    uint32_t* matchesOut,
    uint32_t maxMatches
) {
    if (queryLen == 0 || textLen < queryLen) return 0;

    uint32_t count = 0;
    uint32_t limit = textLen - queryLen;
    uint16_t firstQ = to_lower_ascii(queryPtr[0]);

    uint32_t i = 0;
    while (i <= limit) {
        if (to_lower_ascii(textPtr[i]) == firstQ) {
            uint32_t j = 1;
            while (j < queryLen && to_lower_ascii(textPtr[i + j]) == to_lower_ascii(queryPtr[j])) {
                j++;
            }
            if (j == queryLen) {
                if (count < maxMatches) {
                    matchesOut[count * 2] = i;
                    matchesOut[count * 2 + 1] = i + queryLen;
                }
                count++;
                i += queryLen;
                continue;
            }
        }
        i++;
    }

    return count;
}

} // extern "C"
