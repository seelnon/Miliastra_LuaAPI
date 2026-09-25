// ============================================================================
// MILIASTRA LUA EXAMPLES DATABASE
// Brutalist static fetcher architecture — zero bloat, high structure, pure native JS.
// Compatible with static site hosting (GitHub Pages, Netlify, Vercel, S3, Nginx)
// using new URL(...) and fetch() with bundling and in-memory caching.
// ============================================================================

// Vite raw glob import loads every actual .lua file as static strings during build/dev
const rawLuaModulesRoot = 2;
const rawLuaModulesRel = 1;

const bundledLuaFiles = { ...rawLuaModulesRoot, ...rawLuaModulesRel };

// In-memory cache for fetched and parsed .lua files
const luaCache = new Map();

/**
 * Resolves static bundle string fallback if present
 */
function getBundledLuaSource(filename) {
  const cleanName = filename.replace(/^(\/|lua_examples\/)/, '');
  for (const [key, content] of Object.entries(bundledLuaFiles)) {
    if (key.endsWith(`/${cleanName}`) || key.endsWith(cleanName)) {
      return typeof content === 'string' ? content.replace(/^\uFEFF/, '') : '';
    }
  }
  return '';
}

/**
 * Fetches a raw .lua file from the static web server using new URL() and fetch(),
 * matching the canonical brutalist Kangxi static architecture.
 *
 * @param {string} fileName e.g. "platformer.lua" or "lua_examples/platformer.lua"
 * @returns {Promise<string|null>} The raw Lua script text
 */
export async function grabLuaFile(fileName) {
  const cleanName = fileName.replace(/^(\/|lua_examples\/)/, '');

  if (luaCache.has(cleanName)) {
    return luaCache.get(cleanName);
  }

  // Attempt static fetch via relative URL from module location
  const candidateUrls = [
    new URL(`../../lua_examples/${cleanName}`, import.meta.url).href,
    new URL(`./lua_examples/${cleanName}`, window.location.origin).href,
    new URL(`/lua_examples/${cleanName}`, window.location.origin).href,
    `./lua_examples/${cleanName}`,
    `lua_examples/${cleanName}`
  ];

  for (const targetUrl of candidateUrls) {
    try {
      const response = await fetch(targetUrl);
      if (response.ok) {
        const text = await response.text();
        // Guard against single-page-app HTML fallback on 404
        if (text && !text.trim().startsWith('<!doctype') && !text.trim().startsWith('<html')) {
          const cleanText = text.replace(/^\uFEFF/, '');
          luaCache.set(cleanName, cleanText);
          return cleanText;
        }
      }
    } catch {
      // Continue to next candidate URL
    }
  }

  // Fallback to bundled source
  const bundled = getBundledLuaSource(cleanName);
  if (bundled) {
    luaCache.set(cleanName, bundled);
    return bundled;
  }

  console.warn(`[Lua Examples] Could not fetch or find static source for: ${fileName}`);
  return null;
}

/**
 * All 8 real Lua recipes found in /lua_examples/
 */
export const exampleDefinitions = [
  {
    id: "tetri_shot",
    title: "Tetri-Shot Arcade Engine (Tetri-shot.lua)",
    filename: "lua_examples/Tetri-shot.lua",
    category: "Game Systems",
    tags: ["Playable Game", "Tetris", "Cursor Aim", "Physics Particles", "Screen Shake", "Input Events"],
    description: "An arcade puzzle shooter combining Tetris piece falling and cursor-aimed block shooting. Features screen shake, line-clearing particle explosions, panic countdown bar, and CW/CCW piece rotation."
  },
  {
    id: "platformer_1_1",
    title: "Mario-like Platformer (platformer.lua)",
    filename: "lua_examples/platformer.lua",
    category: "Game Systems",
    tags: ["Playable Game", "Platformer", "Mario 1-1", "Collision Physics", "Goombas", "Squash Tween", "Input Events"],
    description: "A complete platformer level featuring procedural level geometry, brick and bonus blocks with bouncing coins, walking Goombas with live squash tweens upon stomp, momentum running/sprinting, camera scrolling, flagpole celebration, and timer HUD."
  },
  {
    id: "chess_game",
    title: "Chess Game (chess.lua)",
    filename: "lua_examples/chess.lua",
    category: "Game Systems",
    tags: ["Playable Game", "UI Grid", "Board Geometry", "Unicode Glyphs", "Click Events", "Chess Logic"],
    description: "A complete chess game. Procedurally instantiates 64 board tiles, coordinate indicators, and 32 Unicode chess pieces with legal move validations, piece capture, turn toggling, and interactive click handling."
  },
  {
    id: "physics_pool",
    title: "2D Physics Pool Simulation (physics_parent.lua)",
    filename: "lua_examples/physics_parent.lua",
    category: "Physics & Mechanics",
    tags: ["Physics", "Elastic Collisions", "Impulse Force", "Raycast Click", "Ball Pocketing"],
    description: "A 2D billiards and particle simulation with sub-stepping, circle-circle elastic collision resolution, boundary friction, cue ball steering, and cursor impulse explosions."
  }
];

/**
 * Enriches an example metadata definition with its real Lua source code
 */
export function enrichExample(def) {
  const bundled = getBundledLuaSource(def.filename);
  return {
    ...def,
    code: bundled || `-- Example: ${def.title}\nfunction OnStart()\n    print("Loaded ${def.filename}")\nend`
  };
}

/**
 * Exported synchronous array for immediate instant UI rendering
 */
export const examples = exampleDefinitions.map(enrichExample);
export const LUA_EXAMPLES = examples;

/**
 * Asynchronously loads and refreshes all examples using static HTTP fetch(),
 * updating the in-memory cache and examples array.
 */
export async function getLuaExamples() {
  await Promise.all(examples.map(async (ex) => {
    const fetched = await grabLuaFile(ex.filename);
    if (fetched) {
      ex.code = fetched;
    }
  }));
  return examples;
}
