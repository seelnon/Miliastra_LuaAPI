// ============================================================================
// MILIASTRA LUA SCRIPTING API — SCRIBED CODICES & REAL LUA EXAMPLES
// Parsed directly from .lua files in /lua_examples via Vite raw glob & JSON manifest
// ============================================================================

import {examples} from './examples.js';

// Vite raw glob import loads every actual .lua file in /lua_examples at runtime
const rawLuaModulesRoot = import.meta.glob('/lua_examples/*.lua', {
  query: '?raw',
  import: 'default',
  eager: true
});

const rawLuaModulesRel = import.meta.glob('../../lua_examples/*.lua', {
  query: '?raw',
  import: 'default',
  eager: true
});

const allRawLuaFiles = { ...rawLuaModulesRoot, ...rawLuaModulesRel };

function resolveLuaSource(filename) {
  const cleanName = filename.replace(/^(\/|lua_examples\/)/, '');
  for (const [key, content] of Object.entries(allRawLuaFiles)) {
    if (key.endsWith(`/${cleanName}`) || key.endsWith(cleanName)) {
      return typeof content === 'string' ? content : '';
    }
  }
  return '';
}

export const LUA_EXAMPLES = examples.map(entry => {
  const rawCode = resolveLuaSource(entry.filename);
  return {
    ...entry,
    code: rawCode ? rawCode.replace(/^\uFEFF/, '') : ''
  };
});
