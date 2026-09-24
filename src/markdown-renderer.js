// ============================================================================
// MILIASTRA BRUTALIST MARKDOWN & DOCSTRING PARSER
// Renders markdown according to Elden Ring / Altus Plateau brutalist aesthetic
// ============================================================================

import { highlightLua } from './syntax-highlighter.js';

export function renderMarkdown(text) {
  if (!text) return '';

  const lines = text.split('\n');
  const output = [];
  let inCodeBlock = false;
  let codeBuffer = [];
  let codeLang = 'lua';
  let inTable = false;
  let tableHeader = [];
  let tableRows = [];
  let inList = false;
  let listType = 'unordered';

  const flushList = () => {
    if (inList) {
      const tag = listType === 'ordered' ? 'ol' : 'ul';
      output.push(`</${tag}>`);
      inList = false;
    }
  };

  const flushTable = () => {
    if (inTable) {
      let tableHtml = '<div class="ledger-table-wrapper"><table class="ledger-table">';
      if (tableHeader.length > 0) {
        tableHtml += '<thead><tr>';
        tableHeader.forEach(th => {
          tableHtml += `<th>${th.trim()}</th>`;
        });
        tableHtml += '</tr></thead>';
      }
      tableHtml += '<tbody>';
      tableRows.forEach(row => {
        tableHtml += '<tr>';
        row.forEach(cell => {
          tableHtml += `<td>${parseInline(cell.trim())}</td>`;
        });
        tableHtml += '</tr>';
      });
      tableHtml += '</tbody></table></div>';
      output.push(tableHtml);
      inTable = false;
      tableHeader = [];
      tableRows = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks ```lua ... ```
    if (line.trim().startsWith('```')) {
      flushList();
      flushTable();
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = line.trim().slice(3).trim() || 'lua';
        codeBuffer = [];
      } else {
        inCodeBlock = false;
        const rawCode = codeBuffer.join('\n');
        const highlighted = highlightLua(rawCode, true);
        output.push(`
          <div class="code-block-wrapper">
            <div class="code-block-header">
              <span class="code-block-title">CODE (${codeLang.toUpperCase()})</span>
              <button class="brutal-btn copy-code-btn" data-code="${encodeURIComponent(rawCode)}">[ COPY CODE ]</button>
            </div>
            <div class="code-container">
              <pre>${highlighted}</pre>
            </div>
          </div>
        `);
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Markdown Table | col1 | col2 |
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      flushList();
      const cells = line.split('|').slice(1, -1);
      // Check if separator line |---|---|
      if (cells.every(c => /^[\s-:]+$/.test(c))) {
        continue;
      }
      if (!inTable) {
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else {
      flushTable();
    }

    // Section Headers ### / ## / #
    if (line.startsWith('### ')) {
      flushList();
      output.push(`<div class="section-header">${parseInline(line.slice(4))}</div>`);
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      output.push(`<div class="section-header">${parseInline(line.slice(3))}</div>`);
      continue;
    }
    if (line.startsWith('# ')) {
      flushList();
      output.push(`<div class="section-header">${parseInline(line.slice(2))}</div>`);
      continue;
    }

    // Blockquote > quote
    if (line.startsWith('> ')) {
      flushList();
      output.push(`<blockquote class="echo-blockquote">"${parseInline(line.slice(2))}"</blockquote>`);
      continue;
    }

    // Task list items - [ ] or - [x]
    const taskMatch = line.match(/^[\*\-]\s+\[([ xX])\]\s+(.+)$/);
    if (taskMatch) {
      flushList();
      const isChecked = taskMatch[1].toLowerCase() === 'x';
      output.push(`
        <div class="task-item">
          <span class="task-box">${isChecked ? 'x' : '&nbsp;'}</span>
          <span>${parseInline(taskMatch[2])}</span>
        </div>
      `);
      continue;
    }

    // Unordered List - item or * item
    if (/^[\*\-]\s+/.test(line)) {
      if (!inList || listType !== 'unordered') {
        flushList();
        inList = true;
        listType = 'unordered';
        output.push('<ul class="inventory-list">');
      }
      output.push(`<li>${parseInline(line.replace(/^[\*\-]\s+/, ''))}</li>`);
      continue;
    }

    // Numbered List 1. item
    const numMatch = line.match(/^\d+\.\s+(.+)$/);
    if (numMatch) {
      if (!inList || listType !== 'ordered') {
        flushList();
        inList = true;
        listType = 'ordered';
        output.push('<ol class="inventory-list numbered">');
      }
      output.push(`<li>${parseInline(numMatch[1])}</li>`);
      continue;
    }

    flushList();

    // Empty lines
    if (!line.trim()) {
      continue;
    }

    // Normal Paragraph
    output.push(`<p style="margin-bottom: 10px; color: var(--text-code);">${parseInline(line)}</p>`);
  }

  flushList();
  flushTable();

  return output.join('\n');
}

function parseInline(str) {
  if (!str) return '';
  return str
    // Inline code `code`
    .replace(/`([^`]+)`/g, '<span class="inline-rune">$1</span>')
    // Bold **text**
    .replace(/\*\*([^*]+)\*\*/g, '<strong style="color: var(--text-bright); font-weight:700;">$1</strong>')
    // Italic *text*
    .replace(/\*([^*]+)\*/g, '<em style="color: var(--text-primary); font-style:italic;">$1</em>')
    // Links [title](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="brutal-btn" style="padding: 2px 6px; font-size:11px;">[ $1 ]</a>');
}
