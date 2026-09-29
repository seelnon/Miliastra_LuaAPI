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
    title: "Tetri-Shot Arcade Engine",
    filename: "lua_examples/Tetri-shot.lua",
    thumbnail: "./lua_examples/img/ttr_shot.jpg",
    category: "Game Systems",
    tags: ["Playable Game", "Tetris", "Cursor Aim", "Physics Particles", "Screen Shake", "Input Events"],
    description: "An arcade puzzle shooter combining Tetris piece falling and cursor-aimed block shooting. Features top-line overflow detection, screen shake, line-clearing particle explosions, panic countdown bar, and CW/CCW piece rotation."
  },
  {
    id: "realm_mad_mage",
    title: "Procedural Bullet-Hell ARPG",
    filename: "lua_examples/realm_mad_mage.lua",
    thumbnail: "./lua_examples/img/mad_mage.jpg",
    category: "Game Systems",
    tags: ["Playable Game", "Bullet-Hell", "Alien Biome Progression", "Wizard Spellbomb", "Loot Bags", "Boss Scaling"],
    description: "Endless multi-realm bullet-hell ARPG. Slay monsters to summon each realm's Boss; defeating the Boss warps you into new Alien Biomes with scaling enemy levels, HP, ATK, and endless high-score tracking."
  },
  {
    id: "platform_fighter",
    title: "Platform Fighter",
    filename: "lua_examples/fighter.lua",
    thumbnail: "./lua_examples/img/fighter.jpg",
    category: "Game Systems",
    tags: ["Playable Game", "Platform Fighter", "Detached Limbs", "Weapon Swings", "Juggling & Bounce %", "Chain Ledge Grapple"],
    description: "A fast-paced Brawlhalla / SSBM platform fighter, directional weapon swings (Side Slash, Up-Juggle Launcher, Down-Air Meteor Spike, Heavy Smash), Damage % elastic bounce buildup, and an 8-link segmented grapple chain for off-stage ledge recovery."
  },
  {
    id: "north_racer",
    title: "North Racer",
    filename: "lua_examples/north_racer.lua",
    thumbnail: "./lua_examples/img/north_racer.jpg",
    category: "Game Systems",
    tags: ["Playable Game", "North Race", "Powersliding", "Drift Physics", "Pace Notes"],
    description: "A 2D top-down racer with procedural turns, rally pace-note callouts, tire temperature & powerslide scrub physics, and drift combo scoring."
  },
  {
    id: "platformer_1_1",
    title: "Endless Klee Runner",
    filename: "lua_examples/platformer.lua",
    thumbnail: "./lua_examples/img/klee_runner.jpg",
    category: "Game Systems",
    tags: ["Playable Game", "Endless Klee Runner", "Dodoco & Jumpy Dumpty", "Elemental Slimes", "Mondstadt & Domain Cubes", "Platformer Tech"],
    description: "An endless procedural Mondstadt platformer starring an articulated chibi Klee rig! Collect Dodoco from glowing Elemental Mystery Cubes to unlock Jumpy Dumpty Bomb Blasting against Elemental Slimes, with full platformer hidden tech (Spark-Speed airplane sprint, wall-kicks, corner correction, coyote time, crouch-sliding, and stomp combos)."
  },
  {
    id: "chess_game",
    title: "Chess Game vs 250 ELO Bot",
    filename: "lua_examples/chess.lua",
    thumbnail: "./lua_examples/img/chess.jpg",
    category: "Game Systems",
    tags: ["Playable Game", "250 ELO Bot", "3-Ply Alpha-Beta", "Castling", "En Passant", "Move Dots", "Checkmate"],
    description: "Complete chess engine where you play White against a 3-ply Alpha-Beta 250 ELO Black bot. Features legal move indicator dots & capture rings, Kingside/Queenside castling, En Passant, pawn promotion, and Check/Checkmate detection."
  },
  {
    id: "battle_test",
    title: "How many is 'Yes'?",
    filename: "lua_examples/battle_test.lua",
    thumbnail: "./lua_examples/img/big_battle.jpg",
    category: "Physics & Mechanics",
    tags: ["Playable Game", "1000-Unit Benchmark", "O(N) Spatial Hash Grid", "Structure-of-Arrays", "1280x720 HD", "60 FPS Stress Test"],
    description: "Top-down Colosseum army battle benchmark testing 50v50 (100), 100v100 (200), 250v250 (500), and 500v500 (1,000) simultaneous colliding warriors at 60 FPS using a zero-allocation O(N) linked-list Spatial Hash Grid and Structure-of-Arrays (SoA) Lua tables."
  },
  {
    id: "physics_pool",
    title: "2D Physics Pool Simulation",
    filename: "lua_examples/physics_parent.lua",
    thumbnail: "./lua_examples/img/pool.jpg",
    category: "Physics & Mechanics",
    tags: ["Physics", "2-Stage Cue Strike", "Mouse Stroke Speed", "Raycast Aim Line", "Elastic Collisions", "Ball Pocketing"],
    description: "A 2D billiards simulation with a 2-stage Pool Cue mechanic (Stage 1: Aim with raycast guide; Stage 2: Locked-angle pullback & DPI-clamped mouse stroke speed calculation), sub-stepped elastic collisions, and ball pocketing."
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
