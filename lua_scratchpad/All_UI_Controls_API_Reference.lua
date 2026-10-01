-- ============================================================================
-- MILIASTRA WONDERLAND — UNIVERSAL PRODUCTION PLAYBOOK & UI API MANUAL
-- Distilled Best Practices That Worked Across `Tetri-shot.lua` & `mob_battle.lua`
--
-- HOW TO USE THIS MANUAL FOR ANY NEW PROJECT:
--   SECTION 1 : Universal ID Storage & Asset Catalogs (Templates, Shapes, Stickers)
--   SECTION 2 : 20-Slot Sound Design Hook System (Default `40230` + `--inject--` Hooks)
--   SECTION 3 : Player/Level Variable Hooks (`--inject--` + CustomVars) & Exit Signals
--   SECTION 4 : Beating the Lua 200-Local Limit (Domain Bundle Tables: L, G, UI, VFX)
--   SECTION 5 : Universal Procedural Screen Sizing (`GetUICanvasSize` — Fits ALL Screens)
--   SECTION 6 : Peak UI Constructors (Rounded Text Plates, Wireframe Cutouts, Peak Buttons,
--               Linear Progress Bars & Circular Dial Gauges)
--   SECTION 7 : High-FPS Rendering Patterns (Dirty Flags, Color Diffing, 10Hz HUD Sync,
--               Spring Recoil Screen-Shake, Zero-GC VFX Ring Buffers & Safe Tweens)
--   SECTION 8 : Input Patterns (Table-Driven Keybinds, 1:1 Cursor Polling, RMB Guard)
--   SECTION 9 : Complete Executable API Reference (All 12 UI Control Classes & Globals)
-- ============================================================================

---@diagnostic disable: undefined-global

-- ============================================================================
-- SECTION 1: UNIVERSAL ID STORAGE & BUILT-IN ASSET CATALOGS
-- ============================================================================
-- IN GENERAL: Never scatter magic numbers across your code or declare dozens of
-- separate `local` constants (which eat into Lua's 200-local limit). Group all
-- template and asset IDs into two top-level tables: `TEMPLATES` and `RES`.

-- 1A. UI Control Template Prefab IDs (Configured in Miliastra Client Templates)
local TEMPLATES = {
	CONTAINER            = 1073741851, -- ClientUIContainerControl ("Null" / Empty Grouping Box)
	TEXT                 = 1073741852, -- ClientUITextBoxControl (Text + Rounded `.bgColor` Plate!)
	IMAGE                = 1073741853, -- ClientUIImageControl (Sprites, Shapes, Radial/Linear Fills)
	BUTTON               = 1073741854, -- ClientUIPresetButtonControl (Invisible Click/Touch Hitbox)
	TEXT_WINDOW          = 1073741853, -- ClientUITextWindowControl (Scrollable Multi-Line Text)
	GRID_SCROLLER        = 1073741854, -- ClientUIGridScrollerControl (Virtualized Recycled Grid)
	ANIMATION            = 1073741855, -- ClientUIAnimationControl (Localized Particle VFX)
	CURSOR_EVENT_AREA    = 1073741856, -- ClientUICursorEventAreaControl (Drag / Aim Raycast Hitbox)
	FULLSCREEN_ANIMATION = 1073741857, -- ClientUIFullscreenAnimationControl (Screen Vignette/Impact)
	KEY_HINT             = 1073741871, -- ClientUIKeyHintControl (Live Keybind / Gamepad Cap; also 1073741858)
	REFERENCE            = 1073741859, -- ClientUIReferenceControl (Nested Template Instance)
}

-- 1B. Built-in Static Reference Primitive Shapes & Icons (`Enum.ImageSource.StaticReference`)
local RES = {
	RECTANGLE = 100001, -- Solid box, wireframe border, progress fill, rotated laser beam, gauge needle
	CIRCLE    = 100002, -- Ground shadow, projectile orb, circular zone indicator
	TRIANGLE  = 100003, -- Directional pointer, roof/mountain silhouette, warning cone
	STAR4     = 100004, -- Sparkle particle, AoE spell orb, boss core emblem
	STAR5     = 100005, -- Rank star badge, mastery/victory icon
	RING      = 100006, -- Expanding shockwave ring, circular dial gauge track, target reticle
	DECAL     = 104003, -- Ground splatter / impact scorch decal

	-- Elemental Badge Icons (103008..103014):
	ELEM_ELECTRO = 103008, ELEM_PYRO = 103009, ELEM_CRYO  = 103010, ELEM_DENDRO = 103011,
	ELEM_GEO     = 103012, ELEM_HYDRO = 103013, ELEM_ANEMO = 103014,
}

-- 1C. Built-in Chibi Sticker Sprites (`112001..112077`)
-- IN GENERAL: When prototyping or building 2D games without custom external textures,
-- use built-in stickers via `img:SetImage(Enum.ImageSource.StaticReference, stickerId)`:
--   • Slimes (112001..112014): Pyro(01-02), Hydro(03-04), Anemo(05-06), Electro(07-08), Dendro(09-10), Cryo(11-12), Geo(13-14)
--   • Hilichurls & Lawachurls (112015..112020, 112071..112072): Fighter(15), PyroGuard(16), ShieldMita(17), Lawachurls(18-20), Rogues(71-72)
--   • Abyss & Fatui (112021..112025, 112040..112042, 112048..112049): HydroMage(21), AbyssChurls(22-25), Fatui(40-42), Lectors(48-49)
--   • Automata & Knights (112026..112028, 112046..112047, 112068): RuinGuard(26-27), Drake(28), SerpentKnights(46-47), Construct(68)
--   • Warriors & Bosses (112029..112031, 112050..112055, 112067): MaguuKenki(29), Hoarders(30-31), Nobushi/Kairagi(50-52), Eremites(53-54,67), Natlan(55)
--   • Beasts, Birds & Pets (112032..112039, 112043..112045, 112056, 112059..112066, 112069..112070, 112073..112077)

-- ============================================================================
-- SECTION 2: UNIVERSAL 20-SLOT SOUND DESIGN HOOK SYSTEM
-- ============================================================================
-- IN GENERAL (PRACTICE THAT WORKED):
--   1. Any valid audio ID works with `game.PlayAudio2D(audioId)`.
--   2. When building a new project, don't wait to wire up sound effects! Pre-wire
--      20 semantic sound slots (`SFX.UI_CLICK`, `SFX.HIT_LIGHT`, `SFX.CLEAR_SCORE`, etc.)
--      throughout your gameplay code right away.
--   3. Point all slots to a single known-valid fallback ID (`DEFAULT_VALID_SFX_ID = 40230`)
--      AND give every slot its own `--inject--sfx_<slot>--` hook!
--   4. That way, every sound call works immediately out-of-the-box with `40230`, and
--      the user can later swap any slot's ID in one place (or via `--inject--`)!
--
-- Known Verified Audio IDs from `Tetri-shot.lua` & `mob_battle.lua`:
--   • 40230 = Universal Combat / Action Impact 1 (Great universal default placeholder!)
--   • 50870 = Heavy Tactile Button Press / Piece Place / Card Deploy
--   • 40143 = Crisp Line Clear / Row Match Chime
--   • 30006 = Medium Combat Hit Impact 2
--   • 30065 = Piece Settle / Lock Clack
--   • 40237 = Heavy Explosion / 4-Line Tetris / Orbital Barrage Impact
--   • 50923 = Warning Alert / Denied / Block Panic Spawn
--   • 50926 = Positive Fanfare / Hand Dealt / Buff Activated / Timer Red Alert
--   • 50920 = Game Over / Defeat Stinger

local DEFAULT_VALID_SFX_ID = 40230 -- Any unconfigured sound slot safely plays this ID!

local SFX_INJECTS = {
	UI_CLICK         = "--inject--sfx_ui_click--",
	UI_CONFIRM       = "--inject--sfx_ui_confirm--",
	UI_CANCEL        = "--inject--sfx_ui_cancel--",
	UI_TAB           = "--inject--sfx_ui_tab--",
	ACTION_PRIMARY   = "--inject--sfx_action_primary--",
	ACTION_SECONDARY = "--inject--sfx_action_secondary--",
	ACTION_SETTLE    = "--inject--sfx_action_settle--",
	HIT_LIGHT        = "--inject--sfx_hit_light--",
	HIT_MEDIUM       = "--inject--sfx_hit_medium--",
	HIT_HEAVY        = "--inject--sfx_hit_heavy--",
	CRITICAL_IMPACT  = "--inject--sfx_critical_impact--",
	SPAWN_ENTITY     = "--inject--sfx_spawn_entity--",
	CLEAR_OR_SCORE   = "--inject--sfx_clear_or_score--",
	COMBO_UP         = "--inject--sfx_combo_up--",
	BUFF_CAST        = "--inject--sfx_buff_cast--",
	UPGRADE_UNLOCK   = "--inject--sfx_upgrade_unlock--",
	TIMER_WARNING    = "--inject--sfx_timer_warning--",
	ERROR_DENIED     = "--inject--sfx_error_denied--",
	VICTORY_FANFARE  = "--inject--sfx_victory_fanfare--",
	GAME_OVER        = "--inject--sfx_game_over--",
}

-- User can leave all 20 slots at `DEFAULT_VALID_SFX_ID` (40230) during development,
-- or replace individual numbers / inject them later without touching gameplay code:
local SFX_DEFAULTS = {
	UI_CLICK         = 40230, -- Or 50870 (Button_Press_Heavy)
	UI_CONFIRM       = 40230, -- Or 50870
	UI_CANCEL        = 40230, -- Or 50923
	UI_TAB           = 40230, -- Or 30065
	ACTION_PRIMARY   = 40230, -- Or 50870 (Shoot / Deploy)
	ACTION_SECONDARY = 40230, -- Or 30065 (Hold / Swap / Rotate)
	ACTION_SETTLE    = 40230, -- Or 30065 (Piece Lock / Settle)
	HIT_LIGHT        = 40230, -- 40230 (Combat_Hit_Impact_1)
	HIT_MEDIUM       = 40230, -- Or 30006 (Combat_Hit_Impact_2)
	HIT_HEAVY        = 40230, -- Or 40237 (Combat_Hit_Impact_3)
	CRITICAL_IMPACT  = 40230, -- Or 40237 (Tetris / Boss Slam)
	SPAWN_ENTITY     = 40230, -- Or 50923 (Spawn / Wave Dump)
	CLEAR_OR_SCORE   = 40230, -- Or 40143 (Line Clear / Bounty)
	COMBO_UP         = 40230, -- Or 50926 (Multiplier / Morale Up)
	BUFF_CAST        = 40230, -- Or 50926 (Warhorn / Power-Up)
	UPGRADE_UNLOCK   = 40230, -- Or 50926 (Tech / Level Up)
	TIMER_WARNING    = 40230, -- Or 50926 (Low Time Alert)
	ERROR_DENIED     = 40230, -- Or 50923 (Not Enough Gold / Invalid Move)
	VICTORY_FANFARE  = 40230, -- Or 50926 (Stage Clear)
	GAME_OVER        = 40230, -- Or 50920 (Game Over)
}

local function IsInjectedValueValid(val)
	if val == nil then return false end
	local s = tostring(val)
	if s == "" or string.sub(s, 1, 10) == "--inject--" then return false end
	return true
end

local function ResolveAudioSlot(slotKey)
	local inj = SFX_INJECTS[slotKey]
	if IsInjectedValueValid(inj) then
		local n = tonumber(inj)
		if n and n > 0 then return math.floor(n) end
	end
	return SFX_DEFAULTS[slotKey] or DEFAULT_VALID_SFX_ID
end

-- Build the live `SFX` lookup table (all 20 slots ready to pass into `PlaySFX(SFX.<SLOT>)`)
local SFX = {}
for slotKey, _ in pairs(SFX_DEFAULTS) do
	SFX[slotKey] = ResolveAudioSlot(slotKey)
end

local function PlaySFX(sfxId)
	local validId = sfxId or DEFAULT_VALID_SFX_ID
	if game and game.PlayAudio2D then
		pcall(function() game.PlayAudio2D(validId) end)
	end
end

-- ============================================================================
-- SECTION 3: PLAYER / LEVEL VARIABLE HOOKS (`--inject--`) & OUTGOING SIGNALS
-- ============================================================================
-- IN GENERAL:
--   1. Never hardcode progression stats (High Score, Gold, Difficulty, Daily Goal)
--      without a hook. Use `FetchCustomVarNumber` which checks:
--        (a) Preprocessor `--inject--...--` string replacement first,
--        (b) Live `game.GetGlobalCustomVariableValue(entityType, varName)` second,
--        (c) Safe fallback `defaultNum` third (so standalone preview always works!).
--   2. CRITICAL EXIT RULE (Worked in both `Tetri-shot` and `mob_battle`):
--      When the player clicks EXIT, NEVER call `G.root:SetVisible(false)` or
--      `G.root:SetActive(false)`! If Lua disables its own root, the Node Graph cannot
--      re-open the UI later. Instead:
--        • Set `G.root.showCursor = false`
--        • Send `EmitServerSignal(SIGNALS.EXIT, G.highScore, isGoalMet)`
--        • Let the Node Graph's "Set UI Control (Group) Status" node close the UI.

local SIGNALS = {
	EXIT    = "exit_minigame",
	SAVE    = "save_player_progress",
	VICTORY = "stage_victory",
}

local INJECTS = {
	HIGH_SCORE       = "--inject--high_score--",
	DAILY_GOAL       = "--inject--daily_goal--",
	STARTING_GOLD    = "--inject--starting_gold--",
	STAGE_DIFFICULTY = "--inject--stage_difficulty--",
}

local function FetchCustomVarNumber(entityType, varName, injectPlaceholder, defaultNum)
	if IsInjectedValueValid(injectPlaceholder) then
		local n = tonumber(injectPlaceholder)
		if n then return n end
	end
	if game and game.GetGlobalCustomVariableValue then
		local ok, val = pcall(function()
			return game.GetGlobalCustomVariableValue(entityType, varName)
		end)
		if ok and IsInjectedValueValid(val) then
			local n = tonumber(val)
			if n then return n end
		end
	end
	return defaultNum
end

local function EmitServerSignal(sigName, optionalIntPayload, optionalBoolPayload)
	if game and game.ServerSignal then
		local ok, sig = pcall(function() return game.ServerSignal(sigName) end)
		if ok and sig and sig.SendSignal then
			pcall(function()
				if optionalIntPayload ~= nil and sig.AddInt then
					sig:AddInt(math.floor(optionalIntPayload))
				end
				if optionalBoolPayload ~= nil and sig.AddBool then
					sig:AddBool(optionalBoolPayload and true or false)
				end
				sig:SendSignal()
			end)
		end
	end
end

local function Clamp(v, lo, hi)
	if v < lo then return lo end
	if v > hi then return hi end
	return v
end

local function FormatNumberComma(n)
	local s = tostring(math.floor(n or 0))
	local k
	while true do
		s, k = string.gsub(s, "^(-?%d+)(%d%d%d)", "%1,%2")
		if k == 0 then break end
	end
	return s
end

-- ============================================================================
-- SECTION 4: BEATING THE LUA 200-LOCAL LIMIT (DOMAIN BUNDLE TABLES)
-- ============================================================================
-- CRITICAL LUA VM CONSTRAINT:
--   Lua enforces a hard limit of 200 `local` variables per function/file chunk.
--   In complex games (`mob_battle.lua`, `Tetri-shot.lua`), declaring every state flag,
--   UI handle, layout coordinate, and pool array as a separate top-level `local` will
--   crash compilation with `too many local variables (limit is 200)`.
--
-- IN GENERAL: Wrap all module state into 5 domain tables (`L`, `THEMES`, `G`, `UI`, `VFX`).
--   Each table costs only ONE `local` register while storing unlimited fields!

-- 4A. `L` — Universal Procedural Screen Layout & Coordinate Bundle (1 local)
local L = {
	screenW = 1280, screenH = 720,
	CENTER_X = 640, CENTER_Y = 360,

	-- Center Playfield / Stage Box + Symmetrical Side Columns (`Tetri-shot` & `mob_battle` pattern)
	STAGE_W = 560, STAGE_H = 480,
	STAGE_LEFT = 360, STAGE_RIGHT = 920, STAGE_BOTTOM = 120, STAGE_TOP = 600,
	PANEL_W = 210, PANEL_GAP = 20,
	LEFT_COL_X = 235, RIGHT_COL_X = 1045,

	-- Optional Wide Scrollable World Geometry (`mob_battle` pattern: world wider than screen)
	WORLD_WIDTH = 2400,
	cameraX = 0, cameraTargetX = 0, cameraAutoFollow = true, camPanDir = 0,
}

-- 4B. `THEMES` — Live Switchable Color Palettes (`Tetri-shot` Night/Retro pattern, 1 local)
local THEMES = {
	coffeeGold = {
		name        = "COFFEE GOLD",
		nextName    = "RETRO NEON",
		voidBg      = Color.FromRGB(24, 19, 15),
		panelBg     = Color.FromRGBA(34, 28, 22, 244),
		cardBg      = Color.FromRGBA(46, 38, 29, 245),
		frameBorder = Color.FromRGB(161, 138, 94),
		frameLabel  = Color.FromRGB(218, 188, 122),
		textWhite   = Color.FromRGB(245, 238, 225),
		accentPrimary = Color.FromRGB(228, 168, 58),
		accentDanger  = Color.FromRGB(215, 72, 58),
		accentSuccess = Color.FromRGB(98, 214, 122),
	},
	retroNeon = {
		name        = "RETRO NEON",
		nextName    = "COFFEE GOLD",
		voidBg      = Color.FromRGB(10, 12, 20),
		panelBg     = Color.FromRGBA(18, 22, 36, 244),
		cardBg      = Color.FromRGBA(28, 34, 56, 245),
		frameBorder = Color.FromRGB(92, 112, 185),
		frameLabel  = Color.FromRGB(125, 225, 255),
		textWhite   = Color.FromRGB(246, 248, 255),
		accentPrimary = Color.FromRGB(255, 64, 140),
		accentDanger  = Color.FromRGB(255, 82, 64),
		accentSuccess = Color.FromRGB(68, 238, 138),
	}
}

-- 4C. `G` — Mutable Runtime Game State & Layer Bundle (1 local)
local G = {
	root = nil,
	worldLayer = nil, stageLayer = nil, vfxLayer = nil, hudLayer = nil, modalLayer = nil,
	themeKey = "coffeeGold",
	palette  = THEMES.coffeeGold,

	score = 0, highScore = 0, dailyGoal = 1000, gold = 55, stageDifficulty = 1,
	combo = 0, multiplier = 1.0,
	elapsedSecs = 0.0, hudSyncAccum = 0.0,
	gaugeRatio = 1.0, lastGaugePct = -1,

	-- Spring Recoil & Screen-Shake Physics (`Tetri-shot` pattern)
	recoilX = 0.0, recoilY = 0.0, recoilVX = 0.0, recoilVY = 0.0,
	shakeTimer = 0.0, shakeStrength = 0.0,

	-- Input Suppression Guard (`Tetri-shot` RMB vs LMB guard)
	rmbSuppressTimer = 0.0,

	-- Dirty Flags (`Tetri-shot` diff-rendering pattern)
	hudDirty = true,
	activeSortList = {},
}

-- 4D. `UI` — Live Control References & Theme Reskin Lists (1 local)
local UI = {
	backdropImg = nil,
	themedBorders = {}, themedInners = {}, themedLabels = {},
	scoreText = nil, bestText = nil, goldText = nil, themeBtnText = nil,
	hpBarFill = nil, hpBarText = nil,
	gaugeRing = nil, gaugeNeedle = nil, gaugePctText = nil,
	radialImageDemo = nil, statusReadout = nil,
	cards = {},
}

-- 4E. `VFX` — Zero-GC Pre-Allocated Ring-Buffer Pools (1 local)
local VFX = {
	MAX_PARTS    = 24,
	partCtrl = {}, partActive = {}, partX = {}, partY = {},
	partVX = {}, partVY = {}, partSize = {}, partLife = {}, partMaxLife = {}, nextPartIdx = 1,

	MAX_BLASTS   = 16,
	blastCtrl = {}, blastActive = {}, blastX = {}, blastY = {},
	blastMaxR = {}, blastLife = {}, blastMaxLife = {}, nextBlastIdx = 1,

	MAX_CALLOUTS = 16,
	callCtrl = {}, callActive = {}, callX = {}, callY = {}, callLife = {}, nextCallIdx = 1,

	MAX_PROJ     = 24,
	projCtrl = {}, projActive = {}, projX = {}, projY = {},
	projVX = {}, projVY = {}, projLife = {}, projIsBeam = {}, nextProjIdx = 1,

	-- Pooled Unit/Entity Tween handles (`mob_battle` safe tween cleanup pattern)
	entityTweenSeq = {},
}

-- ============================================================================
-- SECTION 5: UNIVERSAL PROCEDURAL SCREEN SIZING (`ComputeProceduralLayout`)
-- ============================================================================
-- IN GENERAL (PRACTICE THAT WORKED IN BOTH `Tetri-shot` AND `mob_battle`):
--   • Never assume every player has a 1280x720 monitor. Players run 16:9, 16:10,
--     21:9 ultrawide, and mobile screens.
--   • Query `local vw, vh = game.GetUICanvasSize()` in `OnStart()`.
--   • Anchor `G.root` at bottom-left `(0, 0)` with `SetPivot(0, 0)` and
--     `SetSizeDelta(L.screenW, L.screenH)` at scale `(1, 1, 1)`.
--   • Calculate your center stage and left/right HUD columns procedurally from
--     `L.screenW` and `L.screenH` so UI elements never overlap or drift off-screen!

local function ComputeProceduralLayout()
	local vw, vh = game.GetUICanvasSize()
	if vw and vw > 400 and vh and vh > 300 then
		L.screenW = vw; L.screenH = vh
	else
		L.screenW = 1280; L.screenH = 720
	end

	L.CENTER_X     = L.screenW * 0.5
	L.CENTER_Y     = L.screenH * 0.5
	L.STAGE_LEFT   = L.CENTER_X - L.STAGE_W * 0.5
	L.STAGE_RIGHT  = L.CENTER_X + L.STAGE_W * 0.5
	L.STAGE_BOTTOM = L.CENTER_Y - L.STAGE_H * 0.5
	L.STAGE_TOP    = L.STAGE_BOTTOM + L.STAGE_H

	-- Responsive gap between center stage and left/right side columns:
	L.PANEL_GAP    = Clamp(math.floor((L.screenW - L.STAGE_W - L.PANEL_W * 2) * 0.12), 14, 36)
	L.LEFT_COL_X   = L.STAGE_LEFT - L.PANEL_GAP - L.PANEL_W * 0.5
	L.RIGHT_COL_X  = L.STAGE_RIGHT + L.PANEL_GAP + L.PANEL_W * 0.5
end

-- ============================================================================
-- SECTION 6: PEAK UI CONSTRUCTORS (CARDS, WIREFRAMES, BUTTONS & GAUGES)
-- ============================================================================
-- WHY THESE 7 CONSTRUCTORS ARE PEAK ACROSS ALL PROJECTS:
--
-- 1. `NewPanel` (Rounded Card Plate via `TEMPLATES.TEXT` — from `mob_battle`):
--    • `ClientUIContainerControl` has NO background color property.
--    • `ClientUITextBoxControl` (`TEMPLATES.TEXT`) renders its `.bgColor` with
--      **native smooth rounded corners** in Genshin Impact!
--    • `NewPanel` creates an outer `CONTAINER` with `Pivot(0, 0)` (so all children
--      use intuitive `(0..w, 0..h)` local coordinates from the panel's bottom-left!)
--      and automatically inserts a `TEMPLATES.TEXT` rounded background plate whenever
--      `IsVisibleColor(bgCol)` is true (`alpha > 0`).
--
-- 2. `CreateFramedPanel` (Arcade Wireframe Box with Cutout Header — from `Tetri-shot`):
--    • Layers an outer `RES.RECTANGLE` border, an inner dark cutout, and a top-border
--      mask + header label cut right into the top frame! Automatically registers into
--      `UI.themedBorders / themedInners / themedLabels` for instant runtime theme switching.
--
-- 3. PEAK BUTTON SETUPS (Why Raw `TEMPLATES.BUTTON` Fails & How We Fix It):
--    • `ClientUIPresetButtonControl` has NO `.bgColor`, NO `.imageColor`, and NO `.text`,
--      and its internal prefab graphic can cover child text if layered wrong.
--    • PEAK BUTTON A (`CreateButtonWithText` — Rounded Solid Button from `mob_battle`):
--      `NewPanel` (rounded TextBox `.bgColor`) + `NewClickButton` + `NewLabel` (`:SetAsLastSibling()`).
--    • PEAK BUTTON B (`CreateWireframeButton` — Crisp Bordered Button from `Tetri-shot`):
--      `TEMPLATES.BUTTON` + Border/Fill `IMAGE`s + sibling `NewLabel` on top.
--    • PEAK BUTTON C (`CreateAccentModalButton` — Two-Line Menu Card Button from `Tetri-shot`):
--      Soft-edge fill `IMAGE` + 2px top accent bar + Title & Subtitle labels on top.
--
-- 4. `NewProgressBar` & `CreateCircularGauge`:
--    • `NewProgressBar` anchors the fill image with `SetPivot(0, 0.5)` at `(1, h * 0.5)`
--      so `fill:SetSizeDelta((w - 2) * ratio, h - 2)` scales cleanly left-to-right!
--    • `CreateCircularGauge` pairs a `RES.RING` track with a `RES.RECTANGLE` needle
--      (`SetPivot(0.5, 0.15)`) rotated via `:SetLocalRotation(0, 0, (1.0 - ratio) * 360)`.

local function IsVisibleColor(col)
	if col == nil then return false end
	if type(col) == "table" and col.a ~= nil then return col.a > 0 end
	if Color and Color.ToRGBA then
		local ok, _, _, _, a = pcall(Color.ToRGBA, col)
		if ok and a ~= nil then return a > 0 end
	end
	return true
end

-- [CONSTRUCTOR 1] Rounded Card Panel (`Pivot(0,0)` for `0..w, 0..h` child coords + TextBox `.bgColor` plate)
local function NewPanel(parent, centerX, centerY, w, h, bgCol)
	local p = game.InstantiateClientUIControl(TEMPLATES.CONTAINER, parent)
	p:SetAnchorMin(0, 0); p:SetAnchorMax(0, 0); p:SetPivot(0, 0)
	p:SetAnchoredPosition(centerX - w * 0.5, centerY - h * 0.5)
	p:SetSizeDelta(w, h)
	if IsVisibleColor(bgCol) then
		local bg = game.InstantiateClientUIControl(TEMPLATES.TEXT, p)
		bg:SetAnchorMin(0, 0); bg:SetAnchorMax(0, 0); bg:SetPivot(0.5, 0.5)
		bg:SetAnchoredPosition(w * 0.5, h * 0.5); bg:SetSizeDelta(w, h)
		bg.bgColor = bgCol
		bg.text = ""
		bg:SetVisible(true); bg:SetAsLastSibling()
	end
	return p
end

-- [CONSTRUCTOR 2] Sprite / Primitive Shape (`TEMPLATES.IMAGE`) with optional soft-edge rounding
local function NewShape(parent, x, y, w, h, resId, col, isRounded)
	local img = game.InstantiateClientUIControl(TEMPLATES.IMAGE, parent)
	img:SetAnchorMin(0, 0); img:SetAnchorMax(0, 0); img:SetPivot(0.5, 0.5)
	img:SetAnchoredPosition(x, y); img:SetSizeDelta(w, h)
	img:SetImage(Enum.ImageSource.StaticReference, resId or RES.RECTANGLE)
	img.imageType = Enum.ImageType.Stretch
	img.imageColor = col or Color.FromRGB(255, 255, 255)
	if isRounded then
		local radius = (type(isRounded) == "number") and isRounded or Clamp(math.floor(math.min(w, h) * 0.16), 4, 14)
		img.enableSoftEdge = true
		img:SetSoftEdgeWidth(radius, radius)
	end
	return img
end

-- [CONSTRUCTOR 3] Safe Text Label (`fontSize >= 12` & `height >= fontSize * 2` + optional rounded badge `.bgColor`)
local function NewLabel(parent, x, y, w, h, txt, fontSz, fontCol, bgCol, alignH)
	local lbl = game.InstantiateClientUIControl(TEMPLATES.TEXT, parent)
	local fontSize = Clamp(fontSz or 14, 12, 72) -- Minimum valid fontSize in Miliastra is 12!
	local textHeight = math.max(h or 28, fontSize * 2)
	lbl:SetAnchorMin(0, 0); lbl:SetAnchorMax(0, 0); lbl:SetPivot(0.5, 0.5)
	lbl:SetAnchoredPosition(x, y); lbl:SetSizeDelta(math.max(w, 32), textHeight)
	lbl.fontSize = fontSize
	lbl.fontColor = fontCol or G.palette.textWhite
	lbl.bgColor = bgCol or Color.FromRGBA(0, 0, 0, 0)
	lbl.adaptiveFontSize = false
	lbl.horizontalAlignment = alignH or Enum.TextHorizontalAlignment.Middle
	lbl.verticalAlignment = Enum.TextVerticalAlignment.Middle
	lbl.enableOutline = true
	lbl.outlineColor = Color.FromRGBA(10, 8, 6, 220)
	lbl.text = txt or ""
	lbl:SetVisible(true); lbl:SetAsLastSibling()
	return lbl
end

-- [CONSTRUCTOR 4] Raw Interactive Hitbox (`TEMPLATES.BUTTON`)
local function NewClickButton(parent, x, y, w, h, onClick)
	local btn = game.InstantiateClientUIControl(TEMPLATES.BUTTON, parent)
	btn:SetAnchorMin(0, 0); btn:SetAnchorMax(0, 0); btn:SetPivot(0.5, 0.5)
	btn:SetAnchoredPosition(x, y); btn:SetSizeDelta(w, h)
	btn.interactable = true; btn.raycastTarget = true
	if onClick then
		btn:AddCursorEventListener(Enum.CursorEventType.CursorClick, function(eventData)
			onClick(eventData)
		end)
	end
	return btn
end

-- [PEAK BUTTON SETUP A] Rounded Card Button (`NewPanel` + `NewClickButton` + Top-Sibling `NewLabel`)
local function CreateButtonWithText(parent, x, y, w, h, bgCol, txt, fontSz, fontCol, onClick)
	local bg = NewPanel(parent, x, y, w, h, bgCol)
	local btn = NewClickButton(bg, w * 0.5, h * 0.5, w, h, onClick)
	local lbl = nil
	if txt and txt ~= "" then
		lbl = NewLabel(bg, w * 0.5, h * 0.5, w, h, txt, fontSz or 13, fontCol or G.palette.textWhite)
		lbl:SetAsLastSibling()
	end
	return bg, btn, lbl
end

-- [PEAK BUTTON SETUP B] Arcade Wireframe Button (`Tetri-shot` pattern with automatic Theme Registration)
local function CreateWireframeButton(parent, cx, cy, w, h, titleTxt, fontSz, onClick)
	local btn = NewClickButton(parent, cx, cy, w, h, onClick)
	local border = NewShape(btn, w * 0.5, h * 0.5, w, h, RES.RECTANGLE, G.palette.frameBorder, false)
	local fill   = NewShape(btn, w * 0.5, h * 0.5, w - 4, h - 4, RES.RECTANGLE, G.palette.voidBg, false)
	UI.themedBorders[#UI.themedBorders + 1] = border
	UI.themedInners[#UI.themedInners + 1]   = fill

	local lbl = NewLabel(parent, cx, cy, w - 8, h, titleTxt, fontSz or 13, G.palette.frameLabel)
	lbl:SetAsLastSibling()
	UI.themedLabels[#UI.themedLabels + 1] = lbl
	return btn, lbl
end

-- [PEAK BUTTON SETUP C] Two-Line Accent Modal Button (`Tetri-shot` Main Menu pattern)
local function CreateAccentModalButton(parent, cx, cy, w, h, bgCol, accentCol, titleTxt, subTxt, onClick)
	local btn    = NewClickButton(parent, cx, cy, w, h, onClick)
	local bgImg  = NewShape(btn, w * 0.5, h * 0.5, w, h, RES.RECTANGLE, bgCol, 4)
	local topBar = NewShape(btn, w * 0.5, h - 2, w - 6, 2, RES.RECTANGLE, accentCol, false)
	local tLbl   = NewLabel(parent, cx, cy + h * 0.16, w - 16, 26, titleTxt, 14, G.palette.textWhite)
	local sLbl   = NewLabel(parent, cx, cy - h * 0.20, w - 16, 22, subTxt, 12, accentCol)
	tLbl:SetAsLastSibling(); sLbl:SetAsLastSibling()
	return btn, bgImg, topBar, tLbl, sLbl
end

-- [CONSTRUCTOR 5] Arcade Wireframe Panel with Top-Border Cutout Title (`Tetri-shot` pattern)
local function CreateFramedPanel(parent, cx, cy, w, h, headerTitle)
	local borderT = 3
	local outer = NewShape(parent, cx, cy, w, h, RES.RECTANGLE, G.palette.frameBorder, false)
	local inner = NewShape(parent, cx, cy, w - borderT * 2, h - borderT * 2, RES.RECTANGLE, G.palette.voidBg, false)
	UI.themedBorders[#UI.themedBorders + 1] = outer
	UI.themedInners[#UI.themedInners + 1]   = inner

	if headerTitle and headerTitle ~= "" then
		local gapW = math.max(56, #headerTitle * 10 + 18)
		local gapX = cx - w * 0.5 + 16 + gapW * 0.5
		local topY = cy + h * 0.5
		local mask = NewShape(parent, gapX, topY, gapW, 12, RES.RECTANGLE, G.palette.voidBg, false)
		local lbl  = NewLabel(parent, gapX, topY, gapW + 12, 24, headerTitle, 12, G.palette.frameLabel)
		UI.themedInners[#UI.themedInners + 1] = mask
		UI.themedLabels[#UI.themedLabels + 1] = lbl
	end
	return outer, inner
end

-- [CONSTRUCTOR 6] Left-Aligned Linear Progress Bar (`SetPivot(0, 0.5)` — from `mob_battle`)
local function NewProgressBar(parent, centerX, centerY, w, h, bgCol, fillCol, initText, fontSz)
	local bg = NewPanel(parent, centerX, centerY, w, h, bgCol or Color.FromRGB(28, 20, 18))
	local fill = game.InstantiateClientUIControl(TEMPLATES.IMAGE, bg)
	fill:SetAnchorMin(0, 0); fill:SetAnchorMax(0, 0); fill:SetPivot(0, 0.5)
	fill:SetAnchoredPosition(1, h * 0.5)
	fill:SetSizeDelta(w - 2, math.max(2, h - 2))
	fill:SetImage(Enum.ImageSource.StaticReference, RES.RECTANGLE)
	fill.imageType = Enum.ImageType.Stretch
	fill.imageColor = fillCol or G.palette.accentDanger
	fill.enableSoftEdge = true
	local txt = nil
	if initText then
		txt = NewLabel(bg, w * 0.5, h * 0.5, w, h, initText, fontSz or 12, G.palette.textWhite)
	end
	return bg, fill, txt
end

-- [CONSTRUCTOR 7] Circular Dial Gauge (`RES.RING` + Rotated `SetPivot(0.5, 0.15)` Needle — from `Tetri-shot`)
local function CreateCircularGauge(parent, cx, cy, radius, col)
	local d = (radius or 26) * 2
	local ring   = NewShape(parent, cx, cy, d, d, RES.RING, col or G.palette.frameLabel, false)
	local needle = NewShape(parent, cx, cy, 4, radius - 4, RES.RECTANGLE, col or G.palette.frameLabel, false)
	needle:SetPivot(0.5, 0.15)
	local pctTxt = NewLabel(parent, cx, cy - radius - 14, 84, 24, "100%", 13, col or G.palette.frameLabel)
	return ring, needle, pctTxt
end

-- ============================================================================
-- SECTION 7: HIGH-FPS RENDERING, JUICE PHYSICS & ZERO-GC VFX POOLS
-- ============================================================================

-- 7A. Runtime Theme Switcher (`Tetri-shot` pattern: recolors all registered borders/inners/labels)
local function ApplyTheme(themeKey)
	G.themeKey = themeKey
	G.palette  = THEMES[themeKey] or THEMES.coffeeGold
	if UI.backdropImg then UI.backdropImg.imageColor = G.palette.voidBg end
	for i = 1, #UI.themedBorders do UI.themedBorders[i].imageColor = G.palette.frameBorder end
	for i = 1, #UI.themedInners  do UI.themedInners[i].imageColor  = G.palette.voidBg end
	for i = 1, #UI.themedLabels  do UI.themedLabels[i].fontColor   = G.palette.frameLabel end
	if UI.themeBtnText then
		UI.themeBtnText.text = "THEME: " .. G.palette.nextName
	end
	G.hudDirty = true
end

-- 7B. Spring Recoil & Screen-Shake Impulse (`Tetri-shot` pattern: Hooke's law on `G.stageLayer`)
local function TriggerRecoil(dx, dy, shakeAmt)
	G.recoilVX = G.recoilVX + (dx or 0)
	G.recoilVY = G.recoilVY + (dy or 0)
	if shakeAmt and shakeAmt > G.shakeStrength then
		G.shakeStrength = shakeAmt
		G.shakeTimer    = 0.16
	end
end

local function UpdateSpringRecoil(dt)
	local springK = 180.0
	local damping = 14.0
	G.recoilVX = (G.recoilVX - G.recoilX * springK * dt) * math.max(0, 1.0 - damping * dt)
	G.recoilVY = (G.recoilVY - G.recoilY * springK * dt) * math.max(0, 1.0 - damping * dt)
	G.recoilX  = G.recoilX + G.recoilVX * dt
	G.recoilY  = G.recoilY + G.recoilVY * dt

	local sx, sy = G.recoilX, G.recoilY
	if G.shakeTimer > 0 then
		G.shakeTimer = math.max(0, G.shakeTimer - dt)
		sx = sx + (math.random() - 0.5) * 2.0 * G.shakeStrength
		sy = sy + (math.random() - 0.5) * 2.0 * G.shakeStrength
		if G.shakeTimer <= 0 then G.shakeStrength = 0 end
	end
	if G.stageLayer then
		if math.abs(sx) > 0.05 or math.abs(sy) > 0.05 then
			G.stageLayer:SetAnchoredPosition(sx, sy)
		else
			G.recoilX, G.recoilY = 0, 0
			G.stageLayer:SetAnchoredPosition(0, 0)
		end
	end
end

-- 7C. Zero-GC Ring-Buffer Spawners: Gravity Particles (`Tetri-shot`), Callouts, Blast Rings & Beams (`mob_battle`)
local function SpawnParticles(x, y, col, count)
	for _ = 1, (count or 8) do
		local idx = VFX.nextPartIdx
		VFX.nextPartIdx = (idx % VFX.MAX_PARTS) + 1
		local c = VFX.partCtrl[idx]
		if c then
			local ang = math.random() * 6.2831853
			local spd = 85 + math.random() * 175
			VFX.partX[idx]       = x + math.random(-12, 12)
			VFX.partY[idx]       = y + math.random(-12, 12)
			VFX.partVX[idx]      = math.cos(ang) * spd
			VFX.partVY[idx]      = math.sin(ang) * spd + 60
			VFX.partSize[idx]    = math.random(6, 12)
			VFX.partMaxLife[idx] = 0.42
			VFX.partLife[idx]    = 0.42
			VFX.partActive[idx]  = true
			c.imageColor = col or G.palette.accentPrimary
			c:SetSizeDelta(VFX.partSize[idx], VFX.partSize[idx])
			c:SetAnchoredPosition(VFX.partX[idx], VFX.partY[idx])
			c:SetVisible(true)
		end
	end
end

local function SpawnCallout(x, y, txt, col)
	local idx = VFX.nextCallIdx
	VFX.nextCallIdx = (idx % VFX.MAX_CALLOUTS) + 1
	local c = VFX.callCtrl[idx]
	if not c then return end
	VFX.callActive[idx] = true
	VFX.callX[idx] = x; VFX.callY[idx] = y; VFX.callLife[idx] = 0.85
	c.text = txt
	c.fontColor = col or G.palette.accentPrimary
	c:SetAnchoredPosition(x, y)
	c:SetVisible(true)
end

local function SpawnBlastRing(x, y, radius, col)
	local idx = VFX.nextBlastIdx
	VFX.nextBlastIdx = (idx % VFX.MAX_BLASTS) + 1
	local b = VFX.blastCtrl[idx]
	if not b then return end
	VFX.blastActive[idx] = true
	VFX.blastX[idx] = x; VFX.blastY[idx] = y
	VFX.blastMaxR[idx] = math.max(28, radius or 56)
	VFX.blastLife[idx] = 0.34; VFX.blastMaxLife[idx] = 0.34
	b.imageColor = col or Color.FromRGBA(255, 175, 68, 225)
	b:SetAnchoredPosition(x, y); b:SetSizeDelta(14, 14); b:SetVisible(true)
end

local function SpawnProjectileOrBeam(sx, sy, tx, ty, col, isBeam)
	local idx = VFX.nextProjIdx
	VFX.nextProjIdx = (idx % VFX.MAX_PROJ) + 1
	local p = VFX.projCtrl[idx]
	if not p then return end
	VFX.projActive[idx] = true
	VFX.projX[idx] = sx; VFX.projY[idx] = sy
	VFX.projIsBeam[idx] = isBeam or false
	local dx = tx - sx; local dy = ty - sy
	local dist = math.max(1, math.sqrt(dx * dx + dy * dy))

	if isBeam then
		VFX.projLife[idx] = 0.22
		p:SetImage(Enum.ImageSource.StaticReference, RES.RECTANGLE)
		p.imageColor = col or Color.FromRGBA(255, 95, 118, 235)
		p:SetAnchoredPosition((sx + tx) * 0.5, (sy + ty) * 0.5)
		p:SetSizeDelta(dist, 9)
		p:SetLocalRotation(0, 0, math.deg(math.atan(dy, dx)))
		p:SetVisible(true)
	else
		local travelT = Clamp(dist / 480, 0.08, 0.80)
		VFX.projLife[idx] = travelT
		VFX.projVX[idx] = dx / travelT; VFX.projVY[idx] = dy / travelT
		p:SetImage(Enum.ImageSource.StaticReference, RES.STAR4)
		p.imageColor = col or Color.FromRGB(255, 225, 110)
		p:SetSizeDelta(14, 14); p:SetLocalRotation(0, 0, 0)
		p:SetAnchoredPosition(sx, sy); p:SetVisible(true)
	end
end

-- 7D. Safe Slot-Reusable TweenSequence (`mob_battle` pattern: always `:Kill()` previous tween on slot!)
local function PlaySlotSquashStretchTween(slotId, ctrl, baseX, baseY)
	local prev = VFX.entityTweenSeq[slotId]
	if prev then
		pcall(function() prev:Kill() end)
		VFX.entityTweenSeq[slotId] = nil
	end
	if not ctrl then return end
	local seq = game.TweenSequence()
	seq:Append(game.Tween(ctrl, { anchoredPositionX = baseX, anchoredPositionY = baseY + 8, localScaleX = 1.18, localScaleY = 0.86 }, 0.08):SetEase(Enum.EaseType.OutQuad))
	seq:Append(game.Tween(ctrl, { anchoredPositionX = baseX, anchoredPositionY = baseY, localScaleX = 1.0, localScaleY = 1.0 }, 0.14):SetEase(Enum.EaseType.OutCubic))
	seq:Play()
	VFX.entityTweenSeq[slotId] = seq
end

-- ============================================================================
-- SECTION 8: ClientUIBaseControl API (Inherited by ALL 11 Concrete UI Controls)
--            Source: library/client_controls/BaseControl.d.lua
-- ============================================================================
local function DemonstrateBaseControlAPI(ctrl, parentCtrl)
	-- [READ-ONLY FIELDS]
	local isAlive             = ctrl.alive             -- boolean [Read]
	local runtimeId           = ctrl.id                -- number  [Read]
	local templateIndex       = ctrl.prefabIndex       -- number  [Read]
	local isActive            = ctrl.active            -- boolean [Read]
	local isActiveInHierarchy = ctrl.activeInHierarchy -- boolean [Read]
	local isVisible           = ctrl.visible           -- boolean [Read] (Use :SetVisible() to write!)

	-- [READ / WRITE FIELDS]
	ctrl.name               = "BaseControlDemo"        -- string  [Read/Write]
	ctrl.parent             = parentCtrl               -- ClientControlType? [Read/Write]
	ctrl.canControllerFocus = true                     -- boolean [Read/Write]

	-- [READ / WRITE / TWENABLE TRANSFORM FIELDS]
	ctrl.anchorMinX        = 0.0   -- NormalizedPercentage (0.0 - 1.0) [Read/Write/Tweenable]
	ctrl.anchorMinY        = 0.0   -- NormalizedPercentage (0.0 - 1.0) [Read/Write/Tweenable]
	ctrl.anchorMaxX        = 0.0   -- NormalizedPercentage (0.0 - 1.0) [Read/Write/Tweenable]
	ctrl.anchorMaxY        = 0.0   -- NormalizedPercentage (0.0 - 1.0) [Read/Write/Tweenable]
	ctrl.pivotX            = 0.0   -- DecimalPercentage (0.0 - 1.0)    [Read/Write/Tweenable]
	ctrl.pivotY            = 0.0   -- DecimalPercentage (0.0 - 1.0)    [Read/Write/Tweenable]
	ctrl.anchoredPositionX = 0     -- number [Read/Write/Tweenable]
	ctrl.anchoredPositionY = 0     -- number [Read/Write/Tweenable]
	ctrl.sizeDeltaX        = 1280  -- number [Read/Write/Tweenable]
	ctrl.sizeDeltaY        = 720   -- number [Read/Write/Tweenable]
	ctrl.localScaleX       = 1.0   -- number [Read/Write/Tweenable]
	ctrl.localScaleY       = 1.0   -- number [Read/Write/Tweenable]
	ctrl.localScaleZ       = 1.0   -- number [Read/Write/Tweenable]
	ctrl.localRotationX    = 0.0   -- number [Read/Write/Tweenable]
	ctrl.localRotationY    = 0.0   -- number [Read/Write/Tweenable]
	ctrl.localRotationZ    = 0.0   -- number [Read/Write/Tweenable]

	-- [TRANSFORM & STATE METHODS]
	ctrl:SetAnchorMin(0, 0); ctrl:SetAnchorMax(0, 0)
	local minX, minY = ctrl:GetAnchorMin()
	local maxX, maxY = ctrl:GetAnchorMax()

	ctrl:SetPivot(0, 0)
	local pivX, pivY = ctrl:GetPivot()

	ctrl:SetAnchoredPosition(0, 0)
	local posX, posY = ctrl:GetAnchoredPosition()

	ctrl:SetSizeDelta(L.screenW, L.screenH)
	local sizeW, sizeH = ctrl:GetSizeDelta()

	ctrl:SetLocalScale(1.0, 1.0, 1.0)
	local sx, sy, sz = ctrl:GetLocalScale()

	ctrl:SetLocalRotation(0, 0, 0)
	local rx, ry, rz = ctrl:GetLocalRotation()

	ctrl:SetActive(true)
	ctrl:SetVisible(true)

	-- [HIERARCHY & SIBLING ORDER METHODS]
	-- Higher sibling index = rendered ON TOP of earlier siblings!
	ctrl:SetAsFirstSibling()
	ctrl:SetAsLastSibling()
	ctrl:SetSiblingIndex(0)
	local siblingIdx  = ctrl:GetSiblingIndex()
	local directChild = ctrl:GetChild("ChildName")
	local nestedChild = ctrl:FindChild("ChildA/ChildB")
	local allChildren = ctrl:GetChildren()

	-- [ATTACHED SCRIPT QUERY METHODS]
	local attachedById   = ctrl:GetScript(1001)
	local attachedByPath = ctrl:GetScriptByPath("MyModuleScript")
	local allScripts     = ctrl:GetScripts()

	-- [KEYBOARD EVENT LISTENERS (Valid on ALL ClientUIBaseControl subclasses)]
	local onJumpKey = function() return true end
	ctrl:AddKeyEventListener(Enum.KeyEventType.KeyboardJumpKeyDown, onJumpKey)
	ctrl:RemoveKeyEventListener(Enum.KeyEventType.KeyboardJumpKeyDown, onJumpKey)
	ctrl:RemoveKeyEventListeners(Enum.KeyEventType.KeyboardJumpKeyDown)
	ctrl:RemoveAllKeyEventListeners()

	-- [CONTROLLER NAVIGATION METHODS (Valid on ALL ClientUIBaseControl subclasses)]
	local onNavConfirm = function() end
	ctrl:AddNavigationEventListener(Enum.ControllerNavigationEventType.ConfirmDown, onNavConfirm)
	ctrl:RemoveNavigationEventListener(Enum.ControllerNavigationEventType.ConfirmDown, onNavConfirm)
	ctrl:RemoveNavigationEventListeners(Enum.ControllerNavigationEventType.ConfirmDown)
	ctrl:RemoveAllNavigationEventListeners()

	ctrl:SetControllerNavigation(Enum.ControllerNavigationDir.Right, Enum.ControllerNavigationMode.Automatic, nil)
	local navMode, navTarget = ctrl:GetControllerNavigation(Enum.ControllerNavigationDir.Right)

	return isAlive and runtimeId and templateIndex and isActive and isActiveInHierarchy and isVisible
		and minX and maxX and pivX and posX and sizeW and sx and rx and siblingIdx and allChildren and allScripts and navMode
		and minY and maxY and pivY and posY and sizeH and sy and sz and ry and rz and directChild and nestedChild and attachedById and attachedByPath and navTarget
end

-- ============================================================================
-- SECTION 9: COMPLETE EXECUTABLE SHOWCASE OF ALL 12 UI CONTROLS & GLOBALS
-- ============================================================================
function OnStart()
	-- 1. Seed RNG with time + sub-second clock entropy (`Tetri-shot` pattern)
	local seed = 123456
	if os and os.time then seed = os.time() end
	pcall(function() if os and os.clock then seed = math.floor(seed + os.clock() * 1000000) end end)
	math.randomseed(seed)

	G.root = script.object
	if not G.root then return end

	-- 2. Procedural Screen Sizing (`L.screenW`, `L.screenH`) & Root Setup
	ComputeProceduralLayout()
	G.root:SetAnchorMin(0, 0); G.root:SetAnchorMax(0, 0); G.root:SetPivot(0, 0)
	G.root:SetAnchoredPosition(0, 0); G.root:SetSizeDelta(L.screenW, L.screenH)
	G.root.disableKeyEventPassthrough    = true
	G.root.disableCursorEventPassthrough = true
	G.root.showCursor                    = true

	-- 3. Fetch Player / Level Custom Variables with `--inject--` + fallback defaults
	G.highScore       = FetchCustomVarNumber(Enum.CustomVariableEntityType.PlayerSelf, "highScore", INJECTS.HIGH_SCORE, 0)
	G.dailyGoal       = FetchCustomVarNumber(Enum.CustomVariableEntityType.PlayerSelf, "dailyGoal", INJECTS.DAILY_GOAL, 1000)
	G.gold            = FetchCustomVarNumber(Enum.CustomVariableEntityType.PlayerSelf, "starting_gold", INJECTS.STARTING_GOLD, 55)
	G.stageDifficulty = FetchCustomVarNumber(Enum.CustomVariableEntityType.Level, "stage_difficulty", INJECTS.STAGE_DIFFICULTY, 1)

	-- 4. Multi-Layer Architecture:
	--    • `G.stageLayer` receives Spring Recoil / Screen Shake (`Tetri-shot` pattern)
	--    • `G.vfxLayer` holds pre-allocated zero-GC ring buffers
	--    • `G.hudLayer` holds pinned screen-space HUD controls
	G.stageLayer = NewPanel(G.root, L.CENTER_X, L.CENTER_Y, L.screenW, L.screenH, Color.FromRGBA(0, 0, 0, 0))
	G.vfxLayer   = NewPanel(G.root, L.CENTER_X, L.CENTER_Y, L.screenW, L.screenH, Color.FromRGBA(0, 0, 0, 0))
	G.hudLayer   = NewPanel(G.root, L.CENTER_X, L.CENTER_Y, L.screenW, L.screenH, Color.FromRGBA(0, 0, 0, 0))

	UI.backdropImg = NewShape(G.stageLayer, L.CENTER_X, L.CENTER_Y, L.screenW + 200, L.screenH + 200, RES.RECTANGLE, G.palette.voidBg, false)

	-- Pre-allocate Zero-GC VFX Pools offscreen at `(-2000, -2000)`
	for i = 1, VFX.MAX_PARTS do
		local p = NewShape(G.vfxLayer, -2000, -2000, 8, 8, RES.RECTANGLE, G.palette.accentPrimary)
		p:SetVisible(false); VFX.partCtrl[i] = p; VFX.partActive[i] = false
	end
	for i = 1, VFX.MAX_BLASTS do
		local b = NewShape(G.vfxLayer, -2000, -2000, 20, 20, RES.RING, G.palette.accentPrimary)
		b:SetVisible(false); VFX.blastCtrl[i] = b; VFX.blastActive[i] = false
	end
	for i = 1, VFX.MAX_PROJ do
		local pr = NewShape(G.vfxLayer, -2000, -2000, 12, 12, RES.STAR4, G.palette.accentPrimary)
		pr:SetVisible(false); VFX.projCtrl[i] = pr; VFX.projActive[i] = false
	end
	for i = 1, VFX.MAX_CALLOUTS do
		local c = NewLabel(G.vfxLayer, -2000, -2000, 260, 28, "", 14, G.palette.accentPrimary)
		c:SetVisible(false); VFX.callCtrl[i] = c; VFX.callActive[i] = false
	end

	-- ------------------------------------------------------------------------
	-- TYPE 1: ClientUIContainerControl ("Null" / Empty Grouping & Input Blocker)
	-- Source: library/client_controls/ContainerControl.d.lua
	-- NOTE: Has NO .bgColor, NO .imageColor, NO .interactable, NO .raycastTarget!
	-- ------------------------------------------------------------------------
	local containerCtrl = game.InstantiateClientUIControl(TEMPLATES.CONTAINER, G.stageLayer)
	containerCtrl.name = "MasterContainer"
	containerCtrl.isolateNavigation             = false
	containerCtrl.disableKeyEventPassthrough    = false
	containerCtrl.disableCursorEventPassthrough = false
	containerCtrl.showCursor                    = true
	DemonstrateBaseControlAPI(containerCtrl, G.stageLayer)

	-- Center Stage Card (`NewPanel` = Container + Rounded TextBox `.bgColor` plate!)
	local mainCard = NewPanel(containerCtrl, L.CENTER_X, L.CENTER_Y, 920, 580, G.palette.panelBg)

	-- Top Header & Safe Exit Button (`CreateButtonWithText` + `EmitServerSignal`)
	NewLabel(mainCard, 460, 548, 880, 34, "MILIASTRA UNIVERSAL UI PLAYBOOK — TETRI-SHOT & MOB_BATTLE BEST PRACTICES", 15, G.palette.frameLabel, G.palette.cardBg)
	local _, hpFill, hpTxt = NewProgressBar(mainCard, 200, 504, 320, 20, Color.FromRGB(38, 22, 20), G.palette.accentDanger, "PROGRESS BAR (Pivot 0, 0.5): 100%", 12)
	UI.hpBarFill = hpFill; UI.hpBarText = hpTxt

	-- Live Theme Toggle Button (`Tetri-shot` pattern)
	local _, themeLbl = CreateWireframeButton(mainCard, 595, 504, 180, 28, "THEME: " .. G.palette.nextName, 12, function()
		PlaySFX(SFX.UI_TAB)
		ApplyTheme((G.themeKey == "coffeeGold") and "retroNeon" or "coffeeGold")
	end)
	UI.themeBtnText = themeLbl

	-- Safe Exit Button (Never hides `G.root`! Sets `showCursor = false` + sends `ServerSignal`)
	CreateButtonWithText(mainCard, 825, 504, 120, 28, Color.FromRGBA(112, 36, 34, 245), "[ EXIT (ESC) ]", 12, Color.FromRGB(255, 210, 200), function()
		PlaySFX(SFX.UI_CANCEL)
		EmitServerSignal(SIGNALS.EXIT, G.highScore, G.score >= G.dailyGoal)
		if G.root then G.root.showCursor = false end
	end)

	-- Left Side Arcade Wireframe Cutout Panel + Circular Dial Gauge (`Tetri-shot` pattern)
	CreateFramedPanel(mainCard, 115, 390, 170, 150, "DIAL GAUGE")
	UI.gaugeRing, UI.gaugeNeedle, UI.gaugePctText = CreateCircularGauge(mainCard, 115, 398, 28, G.palette.frameLabel)

	-- ------------------------------------------------------------------------
	-- TYPE 2: ClientUIImageControl (Sprites, Shapes, Masks & Radial/Linear Fills)
	-- Source: library/client_controls/ImageControl.d.lua
	-- NOTE: Has NO .bgColor, NO .text, NO .interactable, NO .raycastTarget!
	-- ------------------------------------------------------------------------
	local imageCtrl = NewShape(mainCard, 265, 390, 86, 86, 112029, Color.FromRGB(255, 255, 255), true)
	imageCtrl.name = "ImageControlSpec"
	imageCtrl:SetSoftEdgeWidth(6, 6)
	imageCtrl:SetFillUnused()
	imageCtrl:SetFillHorizontal(Enum.ImageFillHorizontalType.Left, 1.0)
	imageCtrl:SetFillVertical(Enum.ImageFillVerticalType.Bottom, 1.0)
	imageCtrl:SetFillRadial90(Enum.ImageFillRadial90Type.BottomLeft, 1.0)
	imageCtrl:SetFillRadial180(Enum.ImageFillRadialType.Bottom, 1.0)
	imageCtrl:SetFillRadial360(Enum.ImageFillRadialType.Top, 0.92)

	local imgSrc = imageCtrl.imageSource
	local imgId  = imageCtrl.imageId
	imageCtrl.enableMask          = false
	imageCtrl.enableSoftEdge      = true
	imageCtrl.softEdgeMode        = Enum.ImageMaskSoftEdgeMode.Percentage
	imageCtrl.softEdgeWidthX      = 2.0
	imageCtrl.softEdgeWidthY      = 2.0
	imageCtrl.horizontalSoftRange = 0.1
	imageCtrl.verticalSoftRange   = 0.1
	imageCtrl.reverseMaskArea     = false
	imageCtrl.fillType            = Enum.ImageFillType.Radial360
	imageCtrl.fillHorizontalType  = Enum.ImageFillHorizontalType.Left
	imageCtrl.fillVerticalType    = Enum.ImageFillVerticalType.Bottom
	imageCtrl.fillRadial90Type    = Enum.ImageFillRadial90Type.BottomLeft
	imageCtrl.fillRadialType      = Enum.ImageFillRadialType.Top
	imageCtrl.fillAmount          = 1.0
	UI.radialImageDemo = imageCtrl

	-- ------------------------------------------------------------------------
	-- TYPE 3: ClientUITextBoxControl (Label + Rounded Background Plate!)
	-- Source: library/client_controls/TextBoxControl.d.lua
	-- RULES: `.fontSize >= 12`, `height >= fontSize * 2`, `.bgColor` gives rounded card corners.
	-- ------------------------------------------------------------------------
	local textBoxCtrl = NewLabel(
		mainCard, 560, 390, 460, 88,
		"PEAK CARD & SOUND SETUP:\n• NewPanel uses TEMPLATES.TEXT .bgColor for smooth rounded cards\n• All 20 SFX slots default to 40230 + --inject--sfx_*-- hooks!",
		13, G.palette.textWhite, G.palette.cardBg
	)
	textBoxCtrl.minimumFontSize = 12

	-- ------------------------------------------------------------------------
	-- TYPE 4: ClientUITextWindowControl (Scrollable Multi-Line Text Box)
	-- Source: library/client_controls/TextWindowControl.d.lua
	-- ------------------------------------------------------------------------
	local textWinCtrl = game.InstantiateClientUIControl(TEMPLATES.TEXT_WINDOW, mainCard)
	textWinCtrl:SetAnchorMin(0, 0); textWinCtrl:SetAnchorMax(0, 0); textWinCtrl:SetPivot(0.5, 0.5)
	textWinCtrl:SetAnchoredPosition(240, 265); textWinCtrl:SetSizeDelta(400, 82)
	textWinCtrl.interactable        = true
	textWinCtrl.showScrollBar       = true
	textWinCtrl.fontSize            = 13
	textWinCtrl.fontColor           = Color.FromRGBA(215, 195, 150, 255)
	textWinCtrl.bgColor             = Color.FromRGBA(36, 30, 23, 255)
	textWinCtrl.enableOutline       = false
	textWinCtrl.outlineColor        = Color.FromRGBA(0, 0, 0, 255)
	textWinCtrl.horizontalAlignment = Enum.TextHorizontalAlignment.Middle
	textWinCtrl.verticalAlignment   = Enum.TextVerticalAlignment.Middle
	textWinCtrl.adaptiveFontSize    = false
	textWinCtrl.minimumFontSize     = 12
	textWinCtrl.text                = "ClientUITextWindowControl\nScrollable multi-line window (.interactable + .showScrollBar)"

	-- ------------------------------------------------------------------------
	-- TYPE 5: ClientUIPresetButtonControl (Peak Button Setup + Recoil + SFX + Particles)
	-- Source: library/client_controls/PresetButtonControl.d.lua
	-- ------------------------------------------------------------------------
	local clickCount = 0
	local _, presetBtn, _, btnTitleLbl, btnSubLbl = CreateAccentModalButton(
		mainCard, 670, 265, 400, 82,
		Color.FromRGBA(78, 58, 34, 255), G.palette.accentPrimary,
		"▶ CLICK FOR PEAK BUTTON + RECOIL + SFX (40230)",
		"Triggers Spring Shake + Particles + Blast Ring + ServerSignal",
		nil
	)
	presetBtn.clickAudioId = SFX.UI_CLICK

	local tempClickHandler = function(eventData) end
	presetBtn:AddCursorEventListener(Enum.CursorEventType.CursorDown, tempClickHandler)
	presetBtn:RemoveCursorEventListener(Enum.CursorEventType.CursorDown, tempClickHandler)
	presetBtn:RemoveCursorEventListeners(Enum.CursorEventType.CursorDown)
	presetBtn:RemoveAllCursorEventListeners()

	presetBtn:AddCursorEventListener(Enum.CursorEventType.CursorClick, function(eventData)
		clickCount = clickCount + 1
		G.score = G.score + 250
		if G.score > G.highScore then G.highScore = G.score end
		G.hudDirty = true

		PlaySFX(SFX.ACTION_PRIMARY)
		TriggerRecoil(0, -45, 5.0)

		local cx, cy = eventData:GetUIPos()
		local px, py = eventData:GetPressUIPos()
		local dx, dy = eventData:GetUIPosDelta()
		local isDragging = eventData.dragging
		local touchId    = eventData.touchId
		if btnTitleLbl and btnSubLbl then
			btnTitleLbl.text = string.format("PEAK BUTTON CLICKED x%d  |  SCORE: %s", clickCount, FormatNumberComma(G.score))
			btnSubLbl.text   = string.format("UI:(%d,%d) Press:(%d,%d) Delta:(%d,%d) Touch:%d", math.floor(cx), math.floor(cy), math.floor(px), math.floor(py), math.floor(dx), math.floor(dy), touchId)
		end
		SpawnParticles(cx, cy, G.palette.accentPrimary, 10)
		SpawnBlastRing(cx, cy, 68, G.palette.accentPrimary)
		SpawnCallout(cx, cy + 24, "+250 SCORE!", G.palette.accentSuccess)
		EmitServerSignal(SIGNALS.SAVE, G.highScore, G.score >= G.dailyGoal)
		if isDragging then print("Dragging button") end
	end)
	presetBtn:SimulateCursorClick()

	-- ------------------------------------------------------------------------
	-- TYPE 6: ClientUICursorEventAreaControl (Invisible Aim / Drag Hitbox)
	-- Source: library/client_controls/CursorEventAreaControl.d.lua
	-- ------------------------------------------------------------------------
	local cursorAreaLabel = NewLabel(
		mainCard, 240, 162, 400, 76,
		"ClientUICursorEventAreaControl\n(Click Here to Fire Rotated Laser Beam + SFX.HIT_HEAVY)",
		13, Color.FromRGB(175, 230, 195), Color.FromRGBA(34, 44, 38, 255)
	)
	local cursorArea = game.InstantiateClientUIControl(TEMPLATES.CURSOR_EVENT_AREA, mainCard)
	cursorArea:SetAnchorMin(0, 0); cursorArea:SetAnchorMax(0, 0); cursorArea:SetPivot(0.5, 0.5)
	cursorArea:SetAnchoredPosition(240, 162); cursorArea:SetSizeDelta(400, 76)
	cursorArea.raycastTarget = true

	local dummyAreaCb = function(eventData) end
	cursorArea:AddCursorEventListener(Enum.CursorEventType.CursorEnter, dummyAreaCb)
	cursorArea:RemoveCursorEventListener(Enum.CursorEventType.CursorEnter, dummyAreaCb)
	cursorArea:RemoveCursorEventListeners(Enum.CursorEventType.CursorEnter)
	cursorArea:RemoveAllCursorEventListeners()

	cursorArea:AddCursorEventListener(Enum.CursorEventType.CursorClick, function(eventData)
		local x, y = eventData:GetUIPos()
		PlaySFX(SFX.HIT_HEAVY)
		cursorAreaLabel.text = string.format("Fired Laser Beam to UI (%d, %d)!", math.floor(x), math.floor(y))
		SpawnProjectileOrBeam(L.CENTER_X - 220, L.CENTER_Y, x, y, Color.FromRGBA(110, 242, 195, 240), true)
		SpawnBlastRing(x, y, 56, Color.FromRGBA(110, 242, 195, 220))
	end)

	-- ------------------------------------------------------------------------
	-- TYPE 7: ClientUIGridScrollerControl (Recycled Virtualized Grid/List)
	-- Source: library/client_controls/GridScrollerControl.d.lua
	-- ------------------------------------------------------------------------
	local gridScroller = game.InstantiateClientUIControl(TEMPLATES.GRID_SCROLLER, mainCard)
	gridScroller:SetAnchorMin(0, 0); gridScroller:SetAnchorMax(0, 0); gridScroller:SetPivot(0.5, 0.5)
	gridScroller:SetAnchoredPosition(670, 162); gridScroller:SetSizeDelta(400, 76)
	gridScroller.itemPrefabIndex = TEMPLATES.TEXT
	gridScroller.raycastTarget   = true
	gridScroller.showScrollBar   = true
	gridScroller.interactable    = true
	gridScroller.scrollProgress  = 0.0

	local currentItemCount = gridScroller.itemCount
	local scrollDir        = gridScroller.scrollDirection
	local layoutConst      = gridScroller.layoutConstraint
	local fixedCount       = gridScroller.layoutConstraintFixedCount

	gridScroller:RefreshItems(3, function(itemCtrl, index)
		itemCtrl.name = "GridItem_" .. tostring(index)
		local itemIdx = gridScroller:GetItemIndex(itemCtrl)
		itemCtrl:SetVisible(false)
		return itemIdx
	end)
	local itemW, itemH           = gridScroller:GetItemSize()
	local spaceH, spaceV         = gridScroller:GetItemSpacing()
	local padT, padB, padL, padR = gridScroller:GetPadding()
	local totalContentLen        = gridScroller:GetContentLength()
	gridScroller:ScrollToItemAt(0, Enum.ScrollAlignType.Top)

	-- ------------------------------------------------------------------------
	-- TYPE 8: ClientUIAnimationControl (Localized Particle / Cursor Area VFX)
	-- Source: library/client_controls/AnimationControl.d.lua
	-- ------------------------------------------------------------------------
	local animCtrl = game.InstantiateClientUIControl(TEMPLATES.ANIMATION, mainCard)
	animCtrl.name = "AnimationControlSpec"
	animCtrl.animationId     = 10001001
	animCtrl.playSoundEffect = true
	animCtrl.layer           = Enum.UIAnimationLayer.AboveAllControls
	animCtrl:PlayAnimation()
	animCtrl:StopAnimation()

	-- ------------------------------------------------------------------------
	-- TYPE 9: ClientUIFullscreenAnimationControl (Fullscreen Cinematic VFX)
	-- Source: library/client_controls/FullscreenAnimationControl.d.lua
	-- ------------------------------------------------------------------------
	local fullAnimCtrl = game.InstantiateClientUIControl(TEMPLATES.FULLSCREEN_ANIMATION, mainCard)
	fullAnimCtrl.name = "FullscreenAnimationSpec"
	fullAnimCtrl.animationId     = 10002001
	fullAnimCtrl.playSoundEffect = false

	-- ------------------------------------------------------------------------
	-- TYPE 10: ClientUIKeyHintControl (Dynamic Keybind / Gamepad Button Cap)
	-- Source: library/client_controls/KeyHintControl.d.lua
	-- ------------------------------------------------------------------------
	local keyHintCtrl = game.InstantiateClientUIControl(TEMPLATES.KEY_HINT, mainCard)
	keyHintCtrl:SetAnchorMin(0, 0); keyHintCtrl:SetAnchorMax(0, 0); keyHintCtrl:SetPivot(0.5, 0.5)
	keyHintCtrl:SetAnchoredPosition(835, 390); keyHintCtrl:SetSizeDelta(38, 30)
	keyHintCtrl.keyboardKeyCode   = Enum.KeyboardKeyCode.CharacterSkill3Key
	keyHintCtrl.controllerKeyCode = Enum.ControllerKeyCode.CharacterSkill3Key

	-- ------------------------------------------------------------------------
	-- TYPE 11: ClientUIReferenceControl (Nested Template Reference Instance)
	-- Source: library/client_controls/ReferenceControl.d.lua
	-- ------------------------------------------------------------------------
	local refCtrl = game.InstantiateClientUIControl(TEMPLATES.REFERENCE, mainCard)
	refCtrl.name = "ReferenceControlSpec"
	local refTemplateId = refCtrl.referencedPrefabIndex

	-- ------------------------------------------------------------------------
	-- UNIVERSAL 5-CARD BAR SHOWCASE (Rounded `NewPanel` + Sticker + Badges + Tween)
	-- ------------------------------------------------------------------------
	local sampleStickers = { 112001, 112018, 112048, 112029, 112076 }
	local sampleTitles   = { "SLOT 1 [1]", "SLOT 2 [2]", "SLOT 3 [3]", "SLOT 4 [4]", "SLOT 5 [5]" }
	local sampleSfxKeys  = { "HIT_LIGHT", "HIT_MEDIUM", "HIT_HEAVY", "BUFF_CAST", "VICTORY_FANFARE" }
	for i = 1, 5 do
		local cx = 150 + (i - 1) * 128
		local frame = NewPanel(mainCard, cx, 58, 114, 96, G.palette.cardBg)
		local st    = NewShape(frame, 57, 54, 48, 48, sampleStickers[i], Color.FromRGB(255, 255, 255))
		local badge = NewLabel(frame, 57, 84, 104, 18, sampleTitles[i], 12, G.palette.frameLabel, Color.FromRGBA(14, 12, 10, 220))
		local sfxLb = NewLabel(frame, 57, 14, 106, 16, "SFX." .. sampleSfxKeys[i], 12, G.palette.textWhite, Color.FromRGB(64, 128, 195))
		local idxCapture = i
		NewClickButton(frame, 57, 48, 114, 96, function()
			local sfxId = SFX[sampleSfxKeys[idxCapture]]
			PlaySFX(sfxId)
			PlaySlotSquashStretchTween(idxCapture, st, 57, 54)
			TriggerRecoil(0, -28, 2.5)
			SpawnCallout(L.CENTER_X - 460 + cx, L.CENTER_Y - 290 + 112, "PLAYED SFX." .. sampleSfxKeys[idxCapture] .. " (" .. tostring(sfxId) .. ")", G.palette.accentPrimary)
		end)
		UI.cards[i] = { frame = frame, sticker = st, badge = badge, sfxLb = sfxLb }
	end

	-- ------------------------------------------------------------------------
	-- SECTION 8 IN ACTION: TABLE-DRIVEN KEYBINDS & LMB/RMB SUPPRESSION GUARD
	-- ------------------------------------------------------------------------
	local KET = Enum.KeyEventType
	local keyBinds = {
		-- LMB (`KeyboardNormalAttackKeyDown`) checks `G.rmbSuppressTimer` so RMB never triggers LMB!
		{ KET.KeyboardNormalAttackKeyDown, function()
			if G.rmbSuppressTimer > 0 then return true end
			PlaySFX(SFX.ACTION_PRIMARY)
			return true
		end },
		-- RMB (`KeyboardSprintKeyDown`) sets `G.rmbSuppressTimer = 0.20`
		{ KET.KeyboardSprintKeyDown, function()
			G.rmbSuppressTimer = 0.20
			PlaySFX(SFX.ACTION_SECONDARY)
			return true
		end },
		{ KET.KeyboardCraftspersonKey1Down,  function() PlaySFX(SFX.HIT_LIGHT); return true end },
		{ KET.KeyboardCraftspersonKey2Down,  function() PlaySFX(SFX.HIT_MEDIUM); return true end },
		{ KET.KeyboardCraftspersonKey3Down,  function() PlaySFX(SFX.HIT_HEAVY); return true end },
		{ KET.KeyboardJumpKeyDown,           function() PlaySFX(SFX.UI_CONFIRM); TriggerRecoil(0, -35, 3.5); return true end },
		{ KET.KeyboardCharacterSkill1KeyDown,function() PlaySFX(SFX.BUFF_CAST); return true end },
		{ KET.KeyboardCharacterSkill2KeyDown,function() PlaySFX(SFX.CLEAR_OR_SCORE); return true end },
	}
	for _, kb in ipairs(keyBinds) do
		if kb[1] then G.root:AddKeyEventListener(kb[1], kb[2]) end
	end

	-- ------------------------------------------------------------------------
	-- GLOBAL ENGINE APIs: game, script, Tween, TweenSequence, Color, Vector3, ServerSignal
	-- ------------------------------------------------------------------------
	local foundRoot   = game.FindClientUIRoot("UIRoot")
	local allRoots    = game.GetClientUIRoots()
	local byId        = game.GetClientUIControl(containerCtrl.id)
	local curX, curY  = game.GetCursorUIPos()
	local lx, ly      = game.GetControllerLeftStickAxis()
	local rx, ry      = game.GetControllerRightStickAxis()
	local focusCtrl   = game.GetControllerFocus()
	game.SetControllerFocus(presetBtn)
	local activeDev   = game.GetDevice()
	local activeLang  = game.GetLanguageType()
	local stageMode   = game.GetStageMode()
	local locText     = game.GetText("UI_TITLE_KEY")
	local customVar   = game.GetGlobalCustomVariableValue(Enum.CustomVariableEntityType.Level, "Score")
	local isTest      = game.IsTestPlay()
	local isPaused    = game.IsLevelTimePaused()
	game.PauseLevelTime(false)
	local sfxInstance = game.PlayAudio2D(SFX.UI_CLICK)
	local sfxAlive    = game.IsAudioAlive(sfxInstance)
	game.StopAudio(sfxInstance)
	game.PrintClientUITree()

	local tempDisposable = game.InstantiateClientUIControl(TEMPLATES.CONTAINER, containerCtrl)
	game.DestroyClientUIControl(tempDisposable)

	-- [script Global Fields & Methods]
	local sAlive  = script.alive
	local sId     = script.id
	local sPrefab = script.prefabIndex
	local sObj    = script.object
	local sPath   = script.path
	script.enabled = true
	local paramVal = script:GetParam("Difficulty")
	script:Invoke("NonExistentHelper", 1, 2)
	script:RegisterCustomVariableChangedHandler(Enum.CustomVariableEntityType.Level, "Score", function(ent, name) end)
	script:UnregisterCustomVariableChangedHandler(Enum.CustomVariableEntityType.Level, "Score")
	script:RegisterServerSignalHandler("STAGE_EVENT", function(sigName, sigParams) end)
	script:UnregisterServerSignalHandler("STAGE_EVENT")

	-- [Color & Vector3 Constructors + Methods]
	local c1 = Color.FromRGB(238, 217, 171)
	local c2 = Color.FromRGBA(201, 160, 89, 255)
	local c3 = Color(180, 140, 70, 255)
	local cr, cg, cb, ca = Color.ToRGBA(c2)

	local v1 = Vector3(3, 4, 0)
	local v2 = Vector3.new(1, 0, 0)
	local vSum    = v1 + v2
	local vDiff   = v1 - v2
	local vScaled = v1 * 2
	local vMag    = v1:Magnitude()
	local vNorm   = v1:Normalize()
	local vDot    = v1:Dot(v2)
	local vCross  = v1:Cross(v2)
	local vStr    = v1:ToString()

	-- [ServerSignal Full Typed Payload API]
	local sig = game.ServerSignal("API_VERIFICATION_COMPLETE")
	sig:AddBool(true)
	sig:AddBoolList({ true, false })
	sig:AddInt(42)
	sig:AddIntList({ 1, 2, 3 })
	sig:AddFloat(3.14)
	sig:AddFloatList({ 0.5, 1.5 })
	sig:AddString("Verified")
	sig:AddStringList({ "A", "B" })
	sig:AddVector3(v1)
	sig:AddVector3List({ v1, v2 })
	sig:AddConfigId(10001)
	sig:AddEntity(1)
	sig:AddGuid(99999)
	sig:AddPrefabId(TEMPLATES.IMAGE)
	sig:AddParam(Enum.ParamType.Int, 100)
	sig:SendSignal()

	-- [Tween & TweenSequence Full API]
	local pulseTween = game.Tween(imageCtrl, { localScaleX = 1.08, localScaleY = 1.08 }, 0.6)
		:SetEase(Enum.EaseType.InOutSine)
		:SetRelative(false)
		:SetLoops(-1)
		:SetOnStepComplete(function() end)
		:SetOnComplete(function() end)
		:Play()

	local seq = game.TweenSequence()
	seq:Append(game.Tween(textBoxCtrl, { localScaleX = 1.02 }, 0.25):SetEase(Enum.EaseType.OutQuad))
	seq:Join(game.Tween(textBoxCtrl, { localScaleY = 1.02 }, 0.25))
	seq:AppendInterval(0.1)
	seq:AppendCallback(function() end)
	seq:Insert(0.0, game.Tween(textBoxCtrl, { anchoredPositionY = 390 }, 0.25))
	seq:InsertCallback(0.05, function() end)
	seq:SetLoops(1)
	seq:SetOnComplete(function() end)
	seq:Play()

	-- [Math & Global Utility Functions (NO math.pow in Lua 5.3+! Always use ^)]
	local powerCurveVal = (math.max(0, 320 - 160) / 285) ^ 1.45
	local ctrlType = typeof(imageCtrl)
	local infCheck = math.isinf(math.huge)
	local nanCheck = math.isnan(0 / 0)

	UI.statusReadout = NewLabel(
		mainCard, 808, 58, 184, 96,
		string.format("VERIFIED ALL APIs\n20 SFX Slots -> %d\nBest: %s | Goal: %s\nVec:%s | Pow:%.2f", DEFAULT_VALID_SFX_ID, FormatNumberComma(G.highScore), FormatNumberComma(G.dailyGoal), vStr, powerCurveVal),
		12, G.palette.frameLabel, G.palette.cardBg
	)

	script:EnableUpdate(true)
	print("[Universal Playbook & API Manual] Ready!", c1, c3, cr, cg, cb, ca, imgSrc, imgId, currentItemCount, scrollDir, layoutConst, fixedCount, itemW, itemH, spaceH, spaceV, padT, padB, padL, padR, totalContentLen, refTemplateId, foundRoot, #allRoots, byId, curX, curY, lx, ly, rx, ry, focusCtrl, activeDev, activeLang, stageMode, locText, customVar, isTest, isPaused, sfxAlive, sAlive, sId, sPrefab, sObj, sPath, paramVal, vSum, vDiff, vScaled, vMag, vNorm, vDot, vCross, pulseTween, infCheck, nanCheck)
end

-- ============================================================================
-- SECTION 10: 60 FPS REAL-TIME UPDATE LOOP (SPRING RECOIL, VFX & DIFF SYNC)
-- ============================================================================
function OnInit() end
function OnEnable() end

function OnUpdate(deltaTime)
	if not G.root then return end
	local dt = math.min(deltaTime, 0.05) -- Clamp dt spike (`Tetri-shot` pattern)
	G.elapsedSecs = G.elapsedSecs + dt

	if G.rmbSuppressTimer > 0 then
		G.rmbSuppressTimer = math.max(0, G.rmbSuppressTimer - dt)
	end

	-- 1. Update Spring Recoil & Screen-Shake Physics (`Tetri-shot` pattern)
	UpdateSpringRecoil(dt)

	-- 2. Animate Radial Image, Left-to-Right Progress Bar & Circular Dial Gauge
	if UI.radialImageDemo then
		UI.radialImageDemo.localRotationZ = (G.elapsedSecs * 45) % 360
	end
	local ratio = 0.5 + 0.5 * math.cos(G.elapsedSecs * 1.2)
	if UI.hpBarFill then
		UI.hpBarFill:SetSizeDelta(318 * Clamp(ratio, 0.04, 1.0), 18)
	end
	if UI.gaugeNeedle then
		UI.gaugeNeedle:SetLocalRotation(0, 0, (1.0 - ratio) * 360)
	end
	local pct = math.floor(ratio * 100 + 0.5)
	if pct ~= G.lastGaugePct then
		G.lastGaugePct = pct
		if UI.gaugePctText then UI.gaugePctText.text = string.format("%d%%", pct) end
	end

	-- 3. Update Gravity Particles Ring Buffer (`Tetri-shot` pattern)
	for i = 1, VFX.MAX_PARTS do
		if VFX.partActive[i] then
			local life = VFX.partLife[i] - dt
			if life <= 0 then
				VFX.partActive[i] = false
				VFX.partCtrl[i]:SetVisible(false)
			else
				VFX.partLife[i] = life
				VFX.partVY[i]   = VFX.partVY[i] - 390 * dt
				VFX.partX[i]    = VFX.partX[i] + VFX.partVX[i] * dt
				VFX.partY[i]    = VFX.partY[i] + VFX.partVY[i] * dt
				local sz = math.max(2, VFX.partSize[i] * (life / VFX.partMaxLife[i]))
				VFX.partCtrl[i]:SetSizeDelta(sz, sz)
				VFX.partCtrl[i]:SetAnchoredPosition(VFX.partX[i], VFX.partY[i])
			end
		end
	end

	-- 4. Update Projectiles & Laser Beams Ring Buffer (`mob_battle` pattern)
	for p = 1, VFX.MAX_PROJ do
		if VFX.projActive[p] then
			VFX.projLife[p] = VFX.projLife[p] - dt
			if VFX.projLife[p] <= 0 then
				VFX.projActive[p] = false
				VFX.projCtrl[p]:SetVisible(false)
			elseif not VFX.projIsBeam[p] then
				VFX.projX[p] = VFX.projX[p] + VFX.projVX[p] * dt
				VFX.projY[p] = VFX.projY[p] + VFX.projVY[p] * dt
				VFX.projCtrl[p]:SetAnchoredPosition(VFX.projX[p], VFX.projY[p])
			end
		end
	end

	-- 5. Update Expanding AoE Blast Rings Ring Buffer (`mob_battle` pattern)
	for b = 1, VFX.MAX_BLASTS do
		if VFX.blastActive[b] then
			VFX.blastLife[b] = VFX.blastLife[b] - dt
			if VFX.blastLife[b] <= 0 then
				VFX.blastActive[b] = false
				VFX.blastCtrl[b]:SetVisible(false)
			else
				local prog = 1.0 - (VFX.blastLife[b] / VFX.blastMaxLife[b])
				local curSz = VFX.blastMaxR[b] * (0.25 + prog * 1.75)
				VFX.blastCtrl[b]:SetSizeDelta(curSz, curSz)
			end
		end
	end

	-- 6. Update Floating Callouts Ring Buffer
	for c = 1, VFX.MAX_CALLOUTS do
		if VFX.callActive[c] then
			VFX.callLife[c] = VFX.callLife[c] - dt
			if VFX.callLife[c] <= 0 then
				VFX.callActive[c] = false
				VFX.callCtrl[c]:SetVisible(false)
			else
				VFX.callY[c] = VFX.callY[c] + 32 * dt
				VFX.callCtrl[c]:SetAnchoredPosition(VFX.callX[c], VFX.callY[c])
			end
		end
	end
end

function OnLevelUpdate(levelDeltaTime) end
function OnDisable() end

function OnDestroy()
	script:EnableUpdate(false)
end
