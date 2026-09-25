// ============================================================================
// MILIASTRA LUA API — UI COMPONENT BUILDERS
// Brutalist Elden-Coffee design, syntax-highlighted signatures, collapsible rows
// ============================================================================

import { highlightLua, highlightMethodSignature, highlightType, highlightEnumItem } from './syntax-highlighter.js';

export function showToast(message) {
  const existing = document.querySelector('.rune-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'rune-toast';
  toast.innerHTML = `<span style="color: var(--accent-gold);">⚡</span> <span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 2000);
}

export function copyToClipboard(text, label = 'ITEM') {
  navigator.clipboard.writeText(text).then(() => {
    showToast(`[ ${label.toUpperCase()} COPIED TO CLIPBOARD ]`);
  }).catch(() => {
    showToast(`[ ERROR COPYING TO CLIPBOARD ]`);
  });
}

export function renderSearchResultItem(item, isSelected) {
  const badgeClasses = {
    class: 'badge-class',
    method: 'badge-func',
    field: 'badge-field',
    enum: 'badge-enum',
    enum_item: 'badge-enum',
    global: 'badge-global',
    example: 'badge-example'
  };

  const badgeLabels = {
    class: 'CLASS',
    method: 'METHOD',
    field: 'FIELD',
    enum: 'ENUM',
    enum_item: 'ITEM',
    global: 'GLOBAL',
    example: 'LUA'
  };

  const badgeClass = badgeClasses[item.type] || 'badge-class';
  const badgeText = badgeLabels[item.type] || 'DOC';

  return `
    <div class="item-row ${isSelected ? 'selected' : ''}" data-id="${item.id}">
      <span class="item-badge ${badgeClass}">${badgeText}</span>
      <div class="item-text-wrap">
        <div class="item-name">${item.title}</div>
        <div class="item-parent">${item.subtitle || item.category}</div>
      </div>
    </div>
  `;
}

export function renderClassDetail(cls, targetSubItem = null) {
  const inheritStr = cls.inherits ? ` : <span class="type-tag">${highlightType(cls.inherits)}</span>` : '';
  const fieldsCount = cls.fields ? cls.fields.length : 0;
  const methodsCount = cls.methods ? cls.methods.length : 0;
  const objectPrefix = cls.category === 'Controls' ? 'control' : (cls.name === 'script' ? 'script' : (cls.name === 'game' ? 'game' : cls.name.toLowerCase()));

  // 1. Properties & Fields Section
  let fieldsSection = '';
  if (fieldsCount > 0) {
    fieldsSection = `
      <div class="section-header">
        <span>1. Properties & Fields</span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="sub-count">${fieldsCount} PROPERTIES</span>
          <button class="brutal-btn toggle-all-fields-btn" data-action="expand" style="padding: 2px 8px; font-size: 10px;">[ + EXPAND ALL ]</button>
          <button class="brutal-btn toggle-all-fields-btn" data-action="collapse" style="padding: 2px 8px; font-size: 10px;">[ − COLLAPSE ALL ]</button>
        </div>
      </div>
      <div class="fields-accordion-list">
        ${cls.fields.map(f => {
          const isTargeted = targetSubItem === f.name;
          const isTweenable = f.access.includes('Tweenable');
          const isWritable = f.access.includes('Write');
          const accessClass = isTweenable ? 'access-tween' : (isWritable ? 'access-rw' : 'access-ro');
          
          return `
            <div id="field-${f.name}" class="field-accordion-item ${isTargeted ? 'highlighted-item expanded' : ''}">
              <div class="field-accordion-header" data-field="${f.name}">
                <div class="field-header-left">
                  <span class="field-toggle-icon">+</span>
                  <span class="field-type-badge">[FIELD]</span>
                  <span class="field-signature-code">
                    <span class="hl-obj">${objectPrefix}</span><span class="hl-op">.</span><span class="hl-field-name">${f.name}</span>
                  </span>
                  <span class="field-type-tag">: ${highlightType(f.type)}</span>
                </div>
                <div class="field-header-right">
                  <span class="access-badge ${accessClass}">[${f.access}]</span>
                  <button class="brutal-btn copy-code-btn" data-code="${f.name}" title="Copy Property Name" style="padding: 2px 6px; font-size: 10px;">[ COPY ]</button>
                </div>
              </div>
              <div class="field-accordion-body" style="${isTargeted ? 'display: block;' : 'display: none;'}">
                <div class="field-desc-text">${f.desc}</div>
                <div class="field-meta-row">
                  <span><strong>TYPE:</strong> ${highlightType(f.type)}</span>
                  <span><strong>ACCESS:</strong> <span class="access-badge ${accessClass}">[${f.access}]</span></span>
                  ${isTweenable ? '<span style="color: var(--accent-orange);">⚡ Supports game.Tween interpolations</span>' : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // 2. Methods & Functions Section
  let methodsSection = '';
  if (methodsCount > 0) {
    methodsSection = `
      <div class="section-header">
        <span>2. Methods & Functions</span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="sub-count">${methodsCount} METHODS</span>
          <button class="brutal-btn toggle-all-methods-btn" data-action="expand" style="padding: 2px 8px; font-size: 10px;">[ + EXPAND ALL ]</button>
          <button class="brutal-btn toggle-all-methods-btn" data-action="collapse" style="padding: 2px 8px; font-size: 10px;">[ − COLLAPSE ALL ]</button>
        </div>
      </div>
      <div class="methods-accordion-list">
        ${cls.methods.map((m, idx) => {
          const isTargeted = targetSubItem === m.name;
          const isExpanded = isTargeted;
          const highlightedSig = highlightMethodSignature(m.signature);
          const highlightedReturn = highlightType(m.returns || 'void');

          return `
            <div id="method-${m.name}" class="method-accordion-item ${isExpanded ? 'expanded' : ''} ${isTargeted ? 'highlighted-item' : ''}">
              <div class="method-accordion-header" data-method="${m.name}">
                <div class="method-header-left">
                  <span class="method-toggle-icon">${isExpanded ? '−' : '+'}</span>
                  <span class="method-type-badge">[METH]</span>
                  <span class="method-signature-text">${highlightedSig}</span>
                </div>
                <div class="method-header-right">
                  <span class="method-returns-tag">→ ${highlightedReturn}</span>
                  <button class="brutal-btn copy-signature-btn" data-sig="${encodeURIComponent(m.signature)}" title="Copy Signature" style="padding: 2px 6px; font-size: 10px;">[ COPY ]</button>
                </div>
              </div>

              <div class="method-accordion-body" style="${isExpanded ? 'display: block;' : 'display: none;'}">
                <div class="method-desc-text">${m.desc || 'No additional description provided.'}</div>

                ${m.params && m.params.length > 0 ? `
                  <div class="method-params-title">PARAMETERS</div>
                  <div class="ledger-table-wrapper" style="margin: 6px 0 10px;">
                    <table class="ledger-table">
                      <thead>
                        <tr>
                          <th style="width: 25%;">NAME</th>
                          <th style="width: 28%;">TYPE</th>
                          <th>DESCRIPTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${m.params.map(p => `
                          <tr>
                            <td><span class="hl-param" style="font-weight: 700;">${p.name}</span></td>
                            <td>${highlightType(p.type)}</td>
                            <td>${p.desc}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                ` : '<div style="font-size: 11px; color: var(--text-muted); margin: 6px 0;">Takes no arguments.</div>'}

                <div style="font-size: 11.5px; color: var(--text-muted); margin-bottom: 8px;">
                  <strong style="color: var(--text-primary);">RETURNS:</strong> ${highlightedReturn}
                </div>

                ${m.example ? `
                  <div class="code-block-wrapper" style="margin-top: 10px;">
                    <div class="code-block-header">
                      <span class="code-block-title">USAGE EXAMPLE</span>
                      <button class="brutal-btn copy-code-btn" data-code="${encodeURIComponent(m.example)}" style="padding: 2px 6px; font-size: 10px;">[ COPY CODE ]</button>
                    </div>
                    <div class="code-container">
                      <pre>${highlightLua(m.example, true)}</pre>
                    </div>
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  return `
    <div class="doc-hero">
      <div class="doc-hero-top">
        <span class="doc-tag">${cls.badge || 'CLASS REFERENCE'}</span>
        <span class="doc-source-file">${cls.file}</span>
      </div>
      <div class="doc-title">${cls.name}${inheritStr}</div>
      <div class="doc-subtitle">${cls.description}</div>
      ${cls.notes ? `<blockquote class="echo-blockquote" style="margin-top: 12px;">${cls.notes}</blockquote>` : ''}
      <div class="doc-quick-actions">
        <button class="brutal-btn brutal-btn-gold copy-classname-btn" data-name="${cls.name}">[ COPY CLASS NAME ]</button>
        <button class="brutal-btn open-in-scratchpad-btn" data-template="${encodeURIComponent(`-- Scripter for ${cls.name}\nlocal control = script.object\nprint("Control ID:", control.id)\n`)}">[ OPEN IN SCRATCHPAD ]</button>
      </div>
    </div>

    ${fieldsSection}
    ${methodsSection}
  `;
}

export function renderEnumDetail(en, targetItem = null) {
  return `
    <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
      <button class="brutal-btn back-to-enums-btn" style="padding: 4px 10px; font-size: 11px;">[ ← ALL ENUMS & KEYBINDS ]</button>
    </div>
    <div class="doc-hero">
      <div class="doc-hero-top">
        <span class="doc-tag">ENUM REGISTRY</span>
        <span class="doc-source-file">${en.category}</span>
      </div>
      <div class="doc-title">${en.name}</div>
      <div class="doc-subtitle">${en.description}</div>
      <div class="doc-quick-actions">
        <button class="brutal-btn brutal-btn-gold copy-enum-name-btn" data-name="${en.name}">[ COPY ENUM NAME ]</button>
      </div>
    </div>

    <div class="section-header">
      <span>Enum Values & Keybinds</span>
      <span class="sub-count">${en.items.length} ENTRIES</span>
    </div>

    <div class="ledger-table-wrapper">
      <table class="ledger-table">
        <thead>
          <tr>
            <th style="width: 32%;">ENUM ITEM</th>
            ${en.items.some(i => i.defaultBind) ? '<th style="width: 25%;">DEFAULT KEYBIND</th>' : ''}
            <th>DESCRIPTION</th>
            <th style="width: 12%;">ACTION</th>
          </tr>
        </thead>
        <tbody>
          ${en.items.map(item => `
            <tr class="field-row ${targetItem === item.name ? 'highlighted-row' : ''}">
              <td><strong class="hl-field-name">${highlightEnumItem(`${en.name}.${item.name}`)}</strong></td>
              ${en.items.some(i => i.defaultBind) ? `<td><span class="inline-rune">${item.defaultBind || '—'}</span></td>` : ''}
              <td>${item.desc}</td>
              <td>
                <button class="brutal-btn copy-code-btn" data-code="${encodeURIComponent(`${en.name}.${item.name}`)}" style="padding: 2px 6px; font-size: 10px;">[ COPY ]</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

export function renderExampleDetail(ex) {
  return `
    <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
      <button class="brutal-btn back-to-examples-btn" style="padding: 4px 10px; font-size: 11px;">[ ← ALL CODE EXAMPLES ]</button>
    </div>
    <div class="doc-hero">
      <div class="doc-hero-top">
        <span class="doc-tag">LUA SCRIPT EXAMPLE</span>
        <span class="doc-source-file">${ex.filename}</span>
      </div>
      <div class="doc-title">${ex.title}</div>
      <div class="doc-subtitle">${ex.description}</div>
      <div style="display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap;">
        ${ex.tags.map(t => `<span class="inline-rune" style="font-size: 10px;"># ${t}</span>`).join('')}
      </div>
      <div class="doc-quick-actions">
        <button class="brutal-btn brutal-btn-gold test-script-btn" data-mode="sim" data-code="${encodeURIComponent(ex.code)}" data-title="${encodeURIComponent(ex.title)}">[ ◈ SIMULATE (60 FPS) ]</button>
        <button class="brutal-btn copy-code-btn" data-code="${encodeURIComponent(ex.code)}">[ COPY SCRIPT ]</button>
        <button class="brutal-btn open-in-scratchpad-btn" data-template="${encodeURIComponent(ex.code)}">[ OPEN IN SCRATCHPAD ]</button>
      </div>
    </div>

    <div class="section-header">
      <span>Source Code</span>
      <span class="sub-count">${ex.code.split('\n').length} LINES</span>
    </div>

    <div class="code-block-wrapper">
      <div class="code-block-header">
        <span class="code-block-title">${ex.filename}</span>
        <div style="display: flex; gap: 6px;">
          <button class="brutal-btn brutal-btn-gold test-script-btn" data-mode="sim" data-code="${encodeURIComponent(ex.code)}" data-title="${encodeURIComponent(ex.title)}" style="padding: 2px 8px; font-size: 11px;">[ ◈ SIMULATE ]</button>
          <button class="brutal-btn copy-code-btn" data-code="${encodeURIComponent(ex.code)}" style="padding: 2px 8px; font-size: 11px;">[ COPY CODE ]</button>
        </div>
      </div>
      <div class="code-container">
        <pre>${highlightLua(ex.code, true)}</pre>
      </div>
    </div>
  `;
}
