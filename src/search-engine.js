// ============================================================================
// HIGH-SPEED IN-MEMORY SEARCH ENGINE FOR MILIASTRA LUA API
// Instant tokenization, exact matching, prefix boosting, and fuzzy ranking
// ============================================================================

import { API_CLASSES, API_SYSTEMS } from './data/api-data.js';
import { ENUM_DEFINITIONS } from './data/enum-data.js';
import { LUA_EXAMPLES } from './data/examples-data.js';

export class SearchEngine {
  constructor() {
    this.index = [];
    this.buildIndex();
  }

  buildIndex() {
    this.index = [];

    // 1. Index Classes & Controls
    API_CLASSES.forEach(cls => {
      this.index.push({
        id: `class:${cls.id}`,
        targetId: cls.id,
        type: 'class',
        category: cls.category,
        title: cls.name,
        subtitle: cls.description,
        source: cls.file,
        rawObj: cls,
        searchStr: `${cls.name} ${cls.description} ${cls.category} ${cls.file}`.toLowerCase()
      });

      // Index Methods on class
      (cls.methods || []).forEach(m => {
        this.index.push({
          id: `method:${cls.name}:${m.name}`,
          targetId: cls.id,
          subTarget: m.name,
          type: 'method',
          category: cls.name,
          title: `${cls.name}:${m.name}`,
          subtitle: m.desc || m.signature,
          signature: m.signature,
          source: cls.file,
          rawObj: { class: cls, method: m },
          searchStr: `${m.name} ${cls.name} ${m.signature} ${m.desc || ''} ${(m.params || []).map(p => p.name + ' ' + p.type).join(' ')}`.toLowerCase()
        });
      });

      // Index Fields on class
      (cls.fields || []).forEach(f => {
        this.index.push({
          id: `field:${cls.name}:${f.name}`,
          targetId: cls.id,
          subTarget: f.name,
          type: 'field',
          category: cls.name,
          title: `${cls.name}.${f.name}`,
          subtitle: `${f.type} [${f.access}] — ${f.desc}`,
          source: cls.file,
          rawObj: { class: cls, field: f },
          searchStr: `${f.name} ${cls.name} ${f.type} ${f.access} ${f.desc}`.toLowerCase()
        });
      });
    });

    // 2. Index Systems & Globals (game, script, Color, Tween, etc.)
    API_SYSTEMS.forEach(sys => {
      this.index.push({
        id: `sys:${sys.id}`,
        targetId: sys.id,
        type: 'global',
        category: sys.category,
        title: sys.name,
        subtitle: sys.description,
        source: sys.file,
        rawObj: sys,
        searchStr: `${sys.name} ${sys.description} ${sys.category}`.toLowerCase()
      });

      (sys.methods || []).forEach(m => {
        const delimiter = sys.name === 'script' || sys.name === 'Tween' || sys.name === 'TweenSequence' || sys.name === 'ServerSignal' || sys.name === 'CursorEventData' ? ':' : '.';
        this.index.push({
          id: `sys_method:${sys.name}:${m.name}`,
          targetId: sys.id,
          subTarget: m.name,
          type: 'method',
          category: sys.name,
          title: `${sys.name}${delimiter}${m.name}`,
          subtitle: m.desc || m.signature,
          signature: m.signature,
          source: sys.file,
          rawObj: { system: sys, method: m },
          searchStr: `${m.name} ${sys.name} ${m.signature} ${m.desc || ''} ${(m.params || []).map(p => p.name + ' ' + p.type).join(' ')}`.toLowerCase()
        });
      });

      (sys.fields || []).forEach(f => {
        this.index.push({
          id: `sys_field:${sys.name}:${f.name}`,
          targetId: sys.id,
          subTarget: f.name,
          type: 'field',
          category: sys.name,
          title: `${sys.name}.${f.name}`,
          subtitle: `${f.type} [${f.access}] — ${f.desc}`,
          source: sys.file,
          rawObj: { system: sys, field: f },
          searchStr: `${f.name} ${sys.name} ${f.type} ${f.access} ${f.desc}`.toLowerCase()
        });
      });
    });

    // 3. Index Enums & Enum Items & Keybinds
    ENUM_DEFINITIONS.forEach(en => {
      this.index.push({
        id: `enum:${en.id}`,
        targetId: en.id,
        type: 'enum',
        category: 'Enums',
        title: en.name,
        subtitle: `${en.items.length} items — ${en.description}`,
        rawObj: en,
        searchStr: `${en.name} ${en.description} ${en.items.map(i => i.name + ' ' + (i.defaultBind || '')).join(' ')}`.toLowerCase()
      });

      // Individual enum items for direct find (e.g. searching "Space" or "OutQuad" finds Enum.KeyEventType.KeyboardJumpKeyDown)
      en.items.forEach(item => {
        this.index.push({
          id: `enum_item:${en.id}:${item.name}`,
          targetId: en.id,
          subTarget: item.name,
          type: 'enum_item',
          category: en.name,
          title: `${en.name}.${item.name}`,
          subtitle: item.defaultBind ? `Default: [ ${item.defaultBind} ] — ${item.desc}` : item.desc,
          rawObj: { enum: en, item },
          searchStr: `${item.name} ${en.name} ${item.defaultBind || ''} ${item.desc}`.toLowerCase()
        });
      });
    });

    // 4. Index Lua Examples & Cookbooks
    LUA_EXAMPLES.forEach(ex => {
      this.index.push({
        id: `example:${ex.id}`,
        targetId: ex.id,
        type: 'example',
        category: 'Examples',
        title: ex.title,
        subtitle: ex.description,
        source: ex.filename,
        rawObj: ex,
        searchStr: `${ex.title} ${ex.filename} ${ex.description} ${ex.tags.join(' ')} ${ex.code}`.toLowerCase()
      });
    });
  }

  search(query, categoryFilter = 'all') {
    const rawQuery = (query || '').trim().toLowerCase();
    if (!rawQuery && categoryFilter === 'all') {
      return this.index.slice(0, 100);
    }

    const tokens = rawQuery ? rawQuery.split(/\s+/).filter(Boolean) : [];

    const results = [];

    for (let i = 0; i < this.index.length; i++) {
      const item = this.index[i];

      // Category filter check
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'controls' && item.type !== 'class') continue;
        if (categoryFilter === 'methods' && item.type !== 'method') continue;
        if (categoryFilter === 'fields' && item.type !== 'field') continue;
        if (categoryFilter === 'enums' && item.type !== 'enum' && item.type !== 'enum_item') continue;
        if (categoryFilter === 'globals' && item.type !== 'global') continue;
        if (categoryFilter === 'examples' && item.type !== 'example') continue;
      }

      if (tokens.length === 0) {
        results.push({ item, score: 1 });
        continue;
      }

      let score = 0;
      let matchedAll = true;

      for (let t = 0; t < tokens.length; t++) {
        const token = tokens[t];
        const titleLower = item.title.toLowerCase();
        
        if (titleLower === token) {
          score += 150;
        } else if (titleLower.startsWith(token)) {
          score += 80;
        } else if (titleLower.includes(token)) {
          score += 40;
        } else if (item.searchStr.includes(token)) {
          score += 15;
        } else {
          matchedAll = false;
          break;
        }
      }

      if (matchedAll) {
        // Boost shorter and more direct titles
        if (item.type === 'class' || item.type === 'global') score += 10;
        if (item.type === 'method') score += 5;
        results.push({ item, score });
      }
    }

    // Sort by descending score
    results.sort((a, b) => b.score - a.score);
    return results.map(r => r.item);
  }
}
