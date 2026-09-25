// ============================================================================
// MILIASTRA LUA EXAMPLES DATABASE
// Pure Native ES Module — Zero Vite / Bundler Dependencies (No import.meta.glob)
// Compatible out-of-the-box with raw static hosting (GitHub Pages, S3, Nginx,
// Python http.server, Live Server) as well as Vite dev/build environments.
// ============================================================================

// In-memory cache for fetched .lua files
const luaCache = new Map();
let examplesLoadPromise = null;

/**
 * Fetches a raw .lua file from the static web server using standard Web APIs
 * (new URL(..., import.meta.url) and fetch()), working seamlessly across
 * GitHub Pages repository subpaths (e.g. https://user.github.io/repo/) and root domains.
 *
 * @param {string} fileName e.g. "platformer.lua" or "lua_examples/platformer.lua"
 * @returns {Promise<string|null>} The raw Lua script text
 */
export async function grabLuaFile(fileName) {
  const cleanName = fileName.replace(/^(\/|lua_examples\/)/, '');

  if (luaCache.has(cleanName)) {
    return luaCache.get(cleanName);
  }

  const encodedName = encodeURIComponent(cleanName);

  // Resolve relative to both this ES module (/src/data/examples.js -> ../../lua_examples/)
  // and the current document URL (./lua_examples/) so GitHub Pages subpaths always resolve properly.
  const candidateUrls = Array.from(new Set([
    new URL(`../../lua_examples/${cleanName}`, import.meta.url).href,
    new URL(`../../lua_examples/${encodedName}`, import.meta.url).href,
    new URL(`./lua_examples/${cleanName}`, window.location.href).href,
    new URL(`./lua_examples/${encodedName}`, window.location.href).href,
    new URL(`../../public/lua_examples/${cleanName}`, import.meta.url).href,
    `./lua_examples/${cleanName}`,
    `lua_examples/${cleanName}`
  ]));

  for (const targetUrl of candidateUrls) {
    try {
      const response = await fetch(targetUrl);
      if (response.ok) {
        const text = await response.text();
        // Guard against SPA HTML fallback on 404
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

  console.warn(`[Lua Examples] Could not fetch static source for: ${fileName}`);
  return null;
}

/**
 * Curated playable Lua recipes in /lua_examples/
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
 * Enriches an example metadata definition with initial placeholder until static fetch completes
 */
export function enrichExample(def) {
  const cleanName = def.filename.replace(/^(\/|lua_examples\/)/, '');
  const cached = luaCache.get(cleanName);
  return {
    ...def,
    code: cached || `-- Loading ${def.filename}...\nfunction OnStart()\n    print("Loading ${def.filename}...")\nend`,
    _loaded: Boolean(cached)
  };
}

/**
 * Exported synchronous array for immediate UI rendering
 */
export const examples = exampleDefinitions.map(enrichExample);
export const LUA_EXAMPLES = examples;

/**
 * Asynchronously loads and caches all .lua examples using native fetch().
 */
export function getLuaExamples() {
  if (!examplesLoadPromise) {
    examplesLoadPromise = Promise.all(
      examples.map(async (ex) => {
        const fetched = await grabLuaFile(ex.filename);
        if (fetched) {
          ex.code = fetched;
          ex._loaded = true;
        }
      })
    ).then(() => examples);
  }
  return examplesLoadPromise;
}

// Kick off static prefetch immediately when module is imported
getLuaExamples();
