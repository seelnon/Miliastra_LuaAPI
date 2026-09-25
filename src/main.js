// ============================================================================
// MILIASTRA LUA API DOCUMENTATION — MAIN APPLET ENGINE
// Pure native JS, brutalist Elden-Coffee design, instant search & deep-linking
// ============================================================================

import { SearchEngine } from './search-engine.js';
import { API_CLASSES, API_SYSTEMS } from './data/api-data.js';
import { ENUM_DEFINITIONS } from './data/enum-data.js';
import { LUA_EXAMPLES, getLuaExamples } from './data/examples.js';
import {
  renderSearchResultItem,
  renderClassDetail,
  renderEnumDetail,
  renderExampleDetail,
  copyToClipboard,
  showToast
} from './ui-components.js';
import { renderScratchpad } from './scratchpad.js';
import { renderMarkdown } from './markdown-renderer.js';
import { openLuaRunnerModal } from './lua-runner-modal.js';

class MiliastraCodexApp {
  constructor() {
    this.searchEngine = new SearchEngine();
    this.currentTab = 'api'; // 'api' | 'enums' | 'examples' | 'scratchpad' | 'ledger'
    this.selectedItem = null;
    this.activeFilter = 'all';
    this.selectedIndex = 0;
    this.currentResults = [];

    this.initDOM();
    this.bindEvents();
    this.handleRoute();

    // Asynchronously fetch fresh .lua files via static fetch()
    getLuaExamples().then(() => {
      this.searchEngine.buildIndex();
      this.performSearch();
      if (this.selectedItem && this.selectedItem.type === 'example') {
        const updated = this.searchEngine.index.find(i => i.id === this.selectedItem.id);
        if (updated) {
          this.selectedItem = updated;
        }
        this.renderDetail(this.selectedItem);
      } else if (this.currentTab === 'examples' && !this.selectedItem) {
        this.renderAllExamplesView();
      }
    }).catch(err => {
      console.warn('Static lua fetch notice:', err);
    });
  }

  initDOM() {
    const root = document.getElementById('app');
    root.innerHTML = `
      <header class="codex-header">
        <div class="header-brand">
          <span class="brand-symbol">◈</span>
          <span class="brand-title">MILIASTRA LUA API</span>
          <span class="brand-subtitle">Wonderland Engine Documentation & Developer Tools</span>
        </div>
        <div class="header-actions">
          <div class="stat-pill">CLASSES: <strong>${API_CLASSES.length}</strong></div>
          <div class="stat-pill">ENUMS: <strong>${ENUM_DEFINITIONS.length}</strong></div>
          <div class="stat-pill">EXAMPLES: <strong>${LUA_EXAMPLES.length}</strong></div>
          <button id="quick-scratchpad-btn" class="brutal-btn brutal-btn-gold" style="font-size: 11px;">[ SCRATCHPAD ]</button>
        </div>
      </header>

      <nav class="codex-nav">
        <button class="nav-tab active" data-tab="api">1. API REFERENCE</button>
        <button class="nav-tab" data-tab="enums">2. ENUMS & KEYBINDS</button>
        <button class="nav-tab" data-tab="examples">3. CODE EXAMPLES</button>
        <button class="nav-tab" data-tab="scratchpad">4. SCRATCHPAD</button>
        <button class="nav-tab" data-tab="ledger">5. MARKDOWN GUIDE</button>
      </nav>

      <div class="codex-body">
        <aside class="codex-sidebar">
          <div class="search-box-container">
            <div class="search-input-wrapper">
              <span class="search-icon">
                <svg viewBox="0 -2 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </span>
              <input type="text" id="search-input" class="search-input" placeholder="Search API, enums, methods, keybinds..." autocomplete="off" spellcheck="false">
              <span class="search-shortcut-hint">/</span>
            </div>
            <div class="filter-pills">
              <button class="filter-pill active" data-filter="all">ALL</button>
              <button class="filter-pill" data-filter="controls">CONTROLS</button>
              <button class="filter-pill" data-filter="methods">METHODS</button>
              <button class="filter-pill" data-filter="fields">FIELDS</button>
              <button class="filter-pill" data-filter="enums">ENUMS</button>
              <button class="filter-pill" data-filter="globals">GLOBALS</button>
              <button class="filter-pill" data-filter="examples">EXAMPLES</button>
            </div>
          </div>
          <div class="items-list" id="items-list"></div>
        </aside>

        <main class="codex-content" id="main-content">
          <!-- Content rendered dynamically -->
        </main>
      </div>
    `;

    this.searchInput = document.getElementById('search-input');
    this.itemsList = document.getElementById('items-list');
    this.mainContent = document.getElementById('main-content');
  }

  bindEvents() {
    // Navigation Tabs
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.switchTab(tab.dataset.tab);
      });
    });

    document.getElementById('quick-scratchpad-btn').addEventListener('click', () => {
      this.switchTab('scratchpad');
    });

    // Search Input
    this.searchInput.addEventListener('input', () => {
      this.selectedIndex = 0;
      this.performSearch();
    });

    // Filter Pills
    const filterPills = document.querySelectorAll('.filter-pill');
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.activeFilter = pill.dataset.filter;
        this.selectedIndex = 0;
        this.performSearch();
      });
    });

    // Search results click delegation
    this.itemsList.addEventListener('click', (e) => {
      const row = e.target.closest('.item-row');
      if (row) {
        const itemId = row.dataset.id;
        const item = this.searchEngine.index.find(i => i.id === itemId);
        if (item) {
          // Picking from search on the left jumps to API references
          this.switchTab('api');
          this.selectItem(item);
        }
      }
    });

    // Global Keybindings (/ to focus search, Esc to clear, Arrows to navigate)
    window.addEventListener('keydown', (e) => {
      if ((e.key === '/' || (e.key === 'k' && (e.ctrlKey || e.metaKey))) && document.activeElement !== this.searchInput && !document.activeElement.classList.contains('editor-interactive-textarea')) {
        e.preventDefault();
        this.searchInput.focus();
        this.searchInput.select();
      } else if (e.key === 'Escape') {
        if (document.activeElement === this.searchInput) {
          this.searchInput.blur();
        }
      } else if (e.key === 'ArrowDown') {
        if (document.activeElement === this.searchInput && this.currentResults.length > 0) {
          e.preventDefault();
          this.selectedIndex = Math.min(this.selectedIndex + 1, this.currentResults.length - 1);
          this.renderList();
          this.selectItem(this.currentResults[this.selectedIndex], false);
        }
      } else if (e.key === 'ArrowUp') {
        if (document.activeElement === this.searchInput && this.currentResults.length > 0) {
          e.preventDefault();
          this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
          this.renderList();
          this.selectItem(this.currentResults[this.selectedIndex], false);
        }
      } else if (e.key === 'Enter') {
        if (document.activeElement === this.searchInput && this.currentResults[this.selectedIndex]) {
          this.switchTab('api');
          this.selectItem(this.currentResults[this.selectedIndex]);
        }
      }
    });

    // Content area button delegations
    this.mainContent.addEventListener('click', (e) => {
      // Back to All Enums
      const backEnumsBtn = e.target.closest('.back-to-enums-btn');
      if (backEnumsBtn) {
        e.stopPropagation();
        this.switchTab('enums');
        window.location.hash = 'enums';
        return;
      }

      // Back to All Examples
      const backExamplesBtn = e.target.closest('.back-to-examples-btn');
      if (backExamplesBtn) {
        e.stopPropagation();
        this.switchTab('examples');
        window.location.hash = 'examples';
        return;
      }

      // Test / Run Lua Simulation
      const testScriptBtn = e.target.closest('.test-script-btn');
      if (testScriptBtn) {
        e.stopPropagation();
        const code = decodeURIComponent(testScriptBtn.dataset.code);
        const title = decodeURIComponent(testScriptBtn.dataset.title || 'Lua Game Simulation');
        openLuaRunnerModal(code, title, () => {
          const scratchpad = document.getElementById('scratchpad-textarea');
          if (scratchpad && scratchpad.value && scratchpad.value.trim()) {
            return scratchpad.value;
          }
          return code;
        });
        return;
      }

      // Copy Code
      const copyCodeBtn = e.target.closest('.copy-code-btn');
      if (copyCodeBtn) {
        e.stopPropagation();
        const code = decodeURIComponent(copyCodeBtn.dataset.code);
        copyToClipboard(code, 'Code');
        return;
      }

      // Copy Signature
      const copySigBtn = e.target.closest('.copy-signature-btn');
      if (copySigBtn) {
        e.stopPropagation();
        const sig = decodeURIComponent(copySigBtn.dataset.sig);
        copyToClipboard(sig, 'Signature');
        return;
      }

      // Copy Class Name
      const copyClassBtn = e.target.closest('.copy-classname-btn');
      if (copyClassBtn) {
        e.stopPropagation();
        copyToClipboard(copyClassBtn.dataset.name, 'Class Name');
        return;
      }

      // Copy Enum Name
      const copyEnumBtn = e.target.closest('.copy-enum-name-btn');
      if (copyEnumBtn) {
        e.stopPropagation();
        copyToClipboard(copyEnumBtn.dataset.name, 'Enum');
        return;
      }

      // Open in scratchpad
      const openScratchpadBtn = e.target.closest('.open-in-scratchpad-btn');
      if (openScratchpadBtn) {
        e.stopPropagation();
        const template = decodeURIComponent(openScratchpadBtn.dataset.template);
        this.switchTab('scratchpad', template);
        return;
      }

      // Expand / Collapse all methods
      const toggleAllBtn = e.target.closest('.toggle-all-methods-btn');
      if (toggleAllBtn) {
        e.stopPropagation();
        const action = toggleAllBtn.dataset.action;
        const allItems = this.mainContent.querySelectorAll('.method-accordion-item');
        allItems.forEach(item => {
          const body = item.querySelector('.method-accordion-body');
          const icon = item.querySelector('.method-toggle-icon');
          if (action === 'expand') {
            item.classList.add('expanded');
            if (body) body.style.display = 'block';
            if (icon) icon.textContent = '−';
          } else {
            item.classList.remove('expanded');
            if (body) body.style.display = 'none';
            if (icon) icon.textContent = '+';
          }
        });
        return;
      }

      // Expand / Collapse all fields/properties
      const toggleAllFieldsBtn = e.target.closest('.toggle-all-fields-btn');
      if (toggleAllFieldsBtn) {
        e.stopPropagation();
        const action = toggleAllFieldsBtn.dataset.action;
        const allItems = this.mainContent.querySelectorAll('.field-accordion-item');
        allItems.forEach(item => {
          const body = item.querySelector('.field-accordion-body');
          const icon = item.querySelector('.field-toggle-icon');
          if (action === 'expand') {
            item.classList.add('expanded');
            if (body) body.style.display = 'block';
            if (icon) icon.textContent = '−';
          } else {
            item.classList.remove('expanded');
            if (body) body.style.display = 'none';
            if (icon) icon.textContent = '+';
          }
        });
        return;
      }

      // Field Accordion Header Toggle
      const fieldHeader = e.target.closest('.field-accordion-header');
      if (fieldHeader) {
        const item = fieldHeader.closest('.field-accordion-item');
        if (item) {
          const body = item.querySelector('.field-accordion-body');
          const icon = item.querySelector('.field-toggle-icon');
          const isExpanded = item.classList.contains('expanded');

          if (isExpanded) {
            item.classList.remove('expanded');
            if (body) body.style.display = 'none';
            if (icon) icon.textContent = '+';
          } else {
            item.classList.add('expanded');
            if (body) body.style.display = 'block';
            if (icon) icon.textContent = '−';
          }
        }
        return;
      }

      // Method Accordion Header Toggle
      const methodHeader = e.target.closest('.method-accordion-header');
      if (methodHeader) {
        const item = methodHeader.closest('.method-accordion-item');
        if (item) {
          const body = item.querySelector('.method-accordion-body');
          const icon = item.querySelector('.method-toggle-icon');
          const isExpanded = item.classList.contains('expanded');

          if (isExpanded) {
            item.classList.remove('expanded');
            if (body) body.style.display = 'none';
            if (icon) icon.textContent = '+';
          } else {
            item.classList.add('expanded');
            if (body) body.style.display = 'block';
            if (icon) icon.textContent = '−';
          }
        }
        return;
      }
    });

    // Hash change handler
    window.addEventListener('hashchange', () => {
      this.handleRoute();
    });
  }

  setNavTab(tabName) {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(t => {
      if (t.dataset.tab === tabName) t.classList.add('active');
      else t.classList.remove('active');
    });
  }

  switchTab(tabName, customData = null) {
    this.currentTab = tabName;
    this.setNavTab(tabName);

    if (tabName !== 'api') {
      this.currentRenderedClassId = null;
    }

    if (tabName === 'api') {
      if (this.selectedItem && (this.selectedItem.type === 'class' || this.selectedItem.type === 'global' || this.selectedItem.type === 'method' || this.selectedItem.type === 'field')) {
        this.renderDetail(this.selectedItem);
      } else {
        const first = this.searchEngine.index.find(i => i.type === 'class' || i.type === 'global') || this.searchEngine.index[0];
        if (first) this.selectItem(first);
      }
    } else if (tabName === 'enums') {
      this.renderAllEnumsView();
    } else if (tabName === 'examples') {
      this.renderAllExamplesView();
    } else if (tabName === 'scratchpad') {
      renderScratchpad(this.mainContent, customData);
    } else if (tabName === 'ledger') {
      this.renderLedgerGuideView();
    }
  }

  handleRoute() {
    const hash = window.location.hash.slice(1);
    if (!hash) {
      this.performSearch();
      if (this.currentResults.length > 0) {
        this.selectItem(this.currentResults[0]);
      }
      return;
    }

    if (hash === 'scratchpad') {
      this.switchTab('scratchpad');
      return;
    }
    if (hash === 'enums') {
      this.switchTab('enums');
      return;
    }
    if (hash === 'examples') {
      this.switchTab('examples');
      return;
    }
    if (hash === 'ledger') {
      this.switchTab('ledger');
      return;
    }

    const item = this.searchEngine.index.find(i => i.id === hash || i.targetId === hash);
    if (item) {
      if (item.type === 'example') {
        this.currentTab = 'examples';
        this.setNavTab('examples');
        this.currentRenderedClassId = null;
      } else if (item.type === 'enum' || item.type === 'enum_item') {
        this.currentTab = 'enums';
        this.setNavTab('enums');
        this.currentRenderedClassId = null;
      } else {
        this.currentTab = 'api';
        this.setNavTab('api');
      }
      this.selectedItem = item;
      this.renderList();
      this.renderDetail(item);
    } else {
      this.performSearch();
    }
  }

  performSearch() {
    const q = this.searchInput.value;
    this.currentResults = this.searchEngine.search(q, this.activeFilter);
    this.renderList();
  }

  renderList() {
    if (this.currentResults.length === 0) {
      this.itemsList.innerHTML = `
        <div class="empty-results">
          <div style="font-size: 16px; margin-bottom: 6px; color: var(--accent-gold);">⚡</div>
          No items found matching query
        </div>
      `;
      return;
    }

    const html = this.currentResults.map((item, idx) => {
      const isSelected = this.selectedItem && (this.selectedItem.id === item.id);
      return renderSearchResultItem(item, isSelected);
    }).join('');

    this.itemsList.innerHTML = html;
  }

  selectItem(item, updateHash = true) {
    this.selectedItem = item;
    if (updateHash) {
      window.location.hash = item.id;
    }
    this.renderList();
    this.renderDetail(item);
  }

  renderDetail(item) {
    let cls = null;
    let classId = null;

    if (item.type === 'class' || (item.type === 'method' && item.rawObj.class) || (item.type === 'field' && item.rawObj.class)) {
      cls = item.rawObj.class || item.rawObj;
      classId = cls.id || cls.name;
    } else if (item.type === 'global' || (item.type === 'method' && item.rawObj.system) || (item.type === 'field' && item.rawObj.system)) {
      cls = item.rawObj.system || item.rawObj;
      classId = cls.id || cls.name;
    }

    if (classId && this.currentRenderedClassId === classId) {
      this.currentSubTarget = item.subTarget;
      this.highlightSubTarget(item.subTarget);
      return;
    }

    if (classId) {
      this.currentRenderedClassId = classId;
      this.currentSubTarget = item.subTarget;
      this.mainContent.innerHTML = renderClassDetail(cls, item.subTarget);
      if (item.subTarget) {
        setTimeout(() => {
          this.highlightSubTarget(item.subTarget);
        }, 50);
      }
    } else if (item.type === 'enum' || item.type === 'enum_item') {
      this.currentRenderedClassId = null;
      const en = item.rawObj.enum || item.rawObj;
      this.mainContent.innerHTML = renderEnumDetail(en, item.subTarget);
    } else if (item.type === 'example') {
      this.currentRenderedClassId = null;
      this.mainContent.innerHTML = renderExampleDetail(item.rawObj);
    }
  }

  highlightSubTarget(subTarget) {
    const allItems = this.mainContent.querySelectorAll('.method-accordion-item, .field-accordion-item');
    allItems.forEach(el => {
      el.classList.remove('highlighted-item');
    });

    if (subTarget) {
      const el = document.getElementById(`method-${subTarget}`) || document.getElementById(`field-${subTarget}`);
      if (el) {
        if (el.classList.contains('method-accordion-item')) {
          el.classList.add('expanded');
          const body = el.querySelector('.method-accordion-body');
          const icon = el.querySelector('.method-toggle-icon');
          if (body) body.style.display = 'block';
          if (icon) icon.textContent = '−';
        } else if (el.classList.contains('field-accordion-item')) {
          el.classList.add('expanded');
          const body = el.querySelector('.field-accordion-body');
          const icon = el.querySelector('.field-toggle-icon');
          if (body) body.style.display = 'block';
          if (icon) icon.textContent = '−';
        }
        el.classList.add('highlighted-item');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  renderAllEnumsView() {
    this.mainContent.innerHTML = `
      <div class="doc-hero">
        <div class="doc-hero-top">
          <span class="doc-tag">ENUM MATRIX</span>
          <span class="doc-source-file">library/enums/</span>
        </div>
        <div class="doc-title">Enum & Keybind Reference</div>
        <div class="doc-subtitle">Complete registry of input events, easing formulas, control types, and graphics modes.</div>
      </div>

      <div class="section-header">
        <span>Registered Enums</span>
        <span class="sub-count">${ENUM_DEFINITIONS.length} CATEGORIES</span>
      </div>

      <div class="matrix-grid">
        ${ENUM_DEFINITIONS.map(en => `
          <div class="matrix-card" data-enum-id="${en.id}">
            <div class="card-name">${en.name}</div>
            <div class="card-val">${en.items.length} Entries • ${en.category}</div>
            <div class="card-desc">${en.description}</div>
          </div>
        `).join('')}
      </div>
    `;

    this.mainContent.querySelectorAll('.matrix-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.enumId;
        const item = this.searchEngine.index.find(i => i.id === `enum:${id}`);
        if (item) {
          this.currentTab = 'enums';
          this.setNavTab('enums');
          this.selectedItem = item;
          window.location.hash = item.id;
          this.renderList();
          this.renderDetail(item);
        }
      });
    });
  }

  renderAllExamplesView() {
    this.mainContent.innerHTML = `
      <div class="doc-hero">
        <div class="doc-hero-top">
          <span class="doc-tag">LUA EXAMPLES</span>
          <span class="doc-source-file">lua_examples/</span>
        </div>
        <div class="doc-title">Lua Code Recipes & Architecture</div>
        <div class="doc-subtitle">Production-tested Lua scripts including Chess Engine, 8x8 Sprite Physics, and Controller Listeners.</div>
      </div>

      <div class="section-header">
        <span>Available Recipes</span>
        <span class="sub-count">${LUA_EXAMPLES.length} EXAMPLES</span>
      </div>

      <div class="matrix-grid">
        ${LUA_EXAMPLES.map(ex => `
          <div class="matrix-card" data-example-id="${ex.id}">
            <div class="card-name">${ex.title}</div>
            <div class="card-val">${ex.filename}</div>
            <div class="card-desc">${ex.description}</div>
          </div>
        `).join('')}
      </div>
    `;

    this.mainContent.querySelectorAll('.matrix-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.exampleId;
        const item = this.searchEngine.index.find(i => i.id === `example:${id}`);
        if (item) {
          this.currentTab = 'examples';
          this.setNavTab('examples');
          this.selectedItem = item;
          window.location.hash = item.id;
          this.renderList();
          this.renderDetail(item);
        }
      });
    });
  }

  renderLedgerGuideView() {
    const sampleMarkdown = `
# Miliastra Lua 5.1 Architecture Guide
The Miliastra Wonderland Lua scripting engine is designed for high-performance UI rendering and frame-rate responsiveness. All controls, tween lifecycles, and network events obey deterministic execution standards.

## Core Best Practices
- [x] Cache control references in \`OnInit\` or \`OnStart\` using \`script.object\`
- [x] Attach key and cursor event listeners and return \`true\` to consume events
- [x] Sequence complex animations using \`game.TweenSequence()\`
- [ ] Connect custom variables to Server Node Graphs for multiplayer synchronization

## Essential Control Types
1. \`ClientUIBaseControl\`: Root ancestor of all visual and interactive components.
2. \`ClientUIImageControl\`: Texture rendering, radial cooldown fills, and soft-edge shaders.
3. \`ClientUITextBoxControl\`: High-contrast typography with adaptive font sizing and outlines.
4. \`ClientUIGridScrollerControl\`: Virtualized list scrolling and item recycling.

## Sample Animation Sequence
\`\`\`lua
---@meta
-- Smooth scale & position bounce for ImageControl
function OnStart()
    local image = script.object
    local seq = game.TweenSequence()

    seq:Append(game.Tween(image, {
        anchoredPositionY = 120,
        localScaleX = 0.9,
        localScaleY = 1.1
    }, 0.35):SetEase(Enum.EaseType.OutQuad))

    seq:Append(game.Tween(image, {
        anchoredPositionY = 0,
        localScaleX = 1.0,
        localScaleY = 1.0
    }, 0.25):SetEase(Enum.EaseType.InQuad))

    seq:Play()
end
\`\`\`

## Quick Navigation Links
[ Explore All Enums ](#enums) | [ Open Scratchpad ](#scratchpad) | [ Inspect Chess Engine ](#example:chess_test)

## Performance Metrics Table
| CONTROL TYPE | DRAW CALL COST | TYPICAL MEMORY | TWEENABLE |
| :--- | :--- | :--- | :--- |
| ClientUIImageControl | 1 Mesh Batch | ~1.2 KB | Yes |
| ClientUITextBoxControl | Text Atlas Cache | ~2.4 KB | Yes |
| ClientUIGridScrollerControl | Dynamic Recycle | ~4.8 KB | Yes |

## Architecture Notes
> "Always detach event listeners in OnDisable or OnDestroy to prevent reference leaks during level transitions."
`;

    this.mainContent.innerHTML = renderMarkdown(sampleMarkdown);
  }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new MiliastraCodexApp();
});
