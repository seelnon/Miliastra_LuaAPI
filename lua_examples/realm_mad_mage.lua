-- =========  Setup Inside Miliastra Client Control Templates  ============
--
-- Container_Instance ID   - 1073741851
-- TextBox_Instance ID     - 1073741852
-- Image_Instance ID       - 1073741854
-- PresetButton_Instance   - 1073741857
--
-- Reference Asset Shapes:
--   100001 = Rectangle
--   100002 = Circle
--   100003 = Triangle
--   100004 = 4-Point Star
--   100005 = 5-Point Star
--   100006 = Hollow Circle
--
-- ========================================================================
-- REALM OF THE MAD MAGE: ENDLESS PROCEDURAL BULLET-HELL ARPG
-- (realm_mad_mage.lua) — Inspired by Realm of the Mad God (RotMG)
--
-- Features:
--   • Infinite Self-Generating Overworld:
--       - Deterministic 2D spatial hash streams endless grass, moss patches,
--         ancient brick roads, wildflower clusters, and solid forest trees
--         in every direction (X, Y in [-infinity, +infinity]).
--       - Trees act as physical cover that block both player and enemy shots!
--   • Roaming Wizard Protagonist:
--       - Pixel-art inspired Mage with purple pointed hat, robe, wooden staff,
--         and a live under-foot green HP bar.
--       - Twin Arcane Staff Bolts [Hold LMB or Press F to Toggle Auto-Fire]
--         aimed continuously at the mouse cursor.
--       - Wizard "Spellbomb" Nova [SPACE / RMB / E]: Detonates a 12-bolt
--         radial arcane explosion right at the Mouse Cursor's world position!
--   • Classic RotMG Enemy Archetypes & Loot Bags:
--       - Goblin Archers, Shadow Bats, Obsidian Bomb Orbs (which split into
--         Mini Orbs on death!), and Crimson Pyromancers.
--       - Floating red damage numbers (-27) and purple (+XP) popups!
--   • Score Bar -> Mad God Boss Spawn -> Victory:
--       - Slaying realm monsters fills the Realm Score Bar (0 / 1000).
--       - Filling the bar summons ORYX, ARCHON OF THE MAD REALM!
--       - Defeat the Mad God Boss to conquer the realm and claim the White Bag!
-- ========================================================================

local CONTAINER_TEMPLATE = 1073741851
local TEXT_TEMPLATE = 1073741852
local IMAGE_TEMPLATE = 1073741854
local BUTTON_TEMPLATE = 1073741857

local RECT_RES = 100001
local CIRCLE_RES = 100002
local TRI_RES = 100003
local STAR4_RES = 100004
local STAR5_RES = 100005
local RING_RES = 100006

-- Fixed Design Container & Procedural Grid Constants (Centered Fit-to-View)
local DESIGN_WIDTH = 960
local DESIGN_HEIGHT = 640
local screenWidth = DESIGN_WIDTH
local screenHeight = DESIGN_HEIGHT
local rootScale = 1.0
local CELL_SIZE = 80
local GRID_COLS = 18 -- Center-anchored (-9..+8 cells around Mage, 1440px span)
local GRID_ROWS = 14 -- Center-anchored (-7..+6 cells around Mage, 1120px span)

local TARGET_BOSS_SCORE = 1000
local NUM_ENEMIES = 26
local NUM_BULLETS = 140
local NUM_LOOT_BAGS = 10
local NUM_FLOAT_TEXTS = 18
local NUM_PARTICLES = 24

-- Runtime Control References
local root = nil
local worldLayer = nil
local hudLayer = nil
local controls = {}

-- Object Pools
local gridCells = {}
local enemyPool = {}
local bulletPool = {}
local lootPool = {}
local floatTextPool = {}
local particlePool = {}

-- Ring Buffer Cursors
local nextBulletIdx = 1
local nextLootIdx = 1
local nextFloatIdx = 1
local nextParticleIdx = 1

-- Game & Player State
local mage = nil
local bossEntity = nil
local bossSpawned = false
local gameState = "PLAYING" -- "PLAYING" | "VICTORY" | "DEFEAT"

local cursorX = 600
local cursorY = 360
local isMouseFiring = false
local autoFireEnabled = true

local elapsedTime = 0
local spawnTimer = 0
local shakeTimer = 0
local shakePower = 0
local spellNovaVisual = nil
local spellNovaTimer = 0
local spellNovaX = 0
local spellNovaY = 0

-- Input State
local keys = {
	up = false,
	down = false,
	left = false,
	right = false
}

-- HUD References
local scoreBarFill = nil
local scoreText = nil
local bossHpContainer = nil
local bossHpFill = nil
local bossHpText = nil
local questBannerText = nil
local questArrow = nil
local mageHpFill = nil
local mageHpText = nil
local mageMpFill = nil
local mageMpText = nil
local mageStatsText = nil

-- ============================================================================
-- UI & PROCEDURAL HASH HELPERS
-- ============================================================================

local function Clamp(v, lo, hi)
	if v < lo then return lo end
	if v > hi then return hi end
	return v
end

local function Lerp(a, b, t)
	return a + (b - a) * t
end

-- Fast overflow-free deterministic 2D coordinate hash in [0, 1) for infinite world generation
-- Works identically for negative, zero, and positive (gx, gy) without 64-bit bitwise overflow
local function Hash2D(gx, gy)
	local v = math.sin(gx * 127.1 + gy * 311.7 + 19.19) * 43758.5453
	return v - math.floor(v)
end

local featureCache = {}
local featureCacheCount = 0

-- Returns what procedural terrain feature exists at grid cell (gx, gy):
-- "ROAD" | "TREE" | "MOSS" | "FLOWER" | "GRASS"
local function GetCellFeature(gx, gy)
	local key = gx * 65536 + gy
	local cached = featureCache[key]
	if cached then return cached end

	local feat
	-- Keep starting spawn plaza (around 0,0) clear of trees
	if math.abs(gx) <= 1 and math.abs(gy) <= 1 then
		feat = "ROAD"
	else
		-- Endless winding horizontal & vertical cobblestone roads intersecting at (0,0)
		local roadWaveH = math.floor(math.sin(gx * 0.32) * 1.4 + 0.5)
		local roadWaveV = math.floor(math.sin(gy * 0.28) * 1.4 + 0.5)
		if (gy + roadWaveH) % 9 == 0 or (gx + roadWaveV) % 11 == 0 then
			feat = "ROAD"
		else
			local h = Hash2D(gx, gy)
			if h < 0.16 then
				feat = "TREE"
			elseif h < 0.36 then
				feat = "MOSS"
			elseif h < 0.46 then
				feat = "FLOWER"
			else
				feat = "GRASS"
			end
		end
	end

	if featureCacheCount > 4096 then
		featureCache = {}
		featureCacheCount = 0
	end
	featureCache[key] = feat
	featureCacheCount = featureCacheCount + 1
	return feat
end

-- Checks if world position (wx, wy) collides with a procedural forest tree trunk
local function HitsTreeObstacle(wx, wy, radius)
	local gx = math.floor(wx / CELL_SIZE + 0.5)
	local gy = math.floor(wy / CELL_SIZE + 0.5)
	for ox = -1, 1 do
		for oy = -1, 1 do
			local cx = gx + ox
			local cy = gy + oy
			if GetCellFeature(cx, cy) == "TREE" then
				local treeX = cx * CELL_SIZE
				local treeY = cy * CELL_SIZE
				local rSum = (radius or 10) + 20
				if (wx - treeX) ^ 2 + (wy - treeY) ^ 2 < rSum * rSum then
					return true, treeX, treeY
				end
			end
		end
	end
	return false, 0, 0
end

local function Remember(control)
	if not control then return nil end
	controls[#controls + 1] = control
	control:SetAsLastSibling()
	return control
end

local function Configure(control, x, y, w, h, name)
	control.name = name
	control:SetAnchorMin(0, 0)
	control:SetAnchorMax(0, 0)
	control:SetPivot(0.5, 0.5)
	control:SetAnchoredPosition(x, y)
	control:SetSizeDelta(w, h)
	control:SetVisible(true)
	return control
end

local function NewImage(parent, name, x, y, w, h, color, resId, softEdge)
	local img = Remember(game.InstantiateClientUIControl(IMAGE_TEMPLATE, parent))
	if not img then return nil end
	Configure(img, x, y, w, h, name)
	img:SetImage(Enum.ImageSource.StaticReference, resId or RECT_RES)
	img.imageType = Enum.ImageType.Stretch
	img.imageColor = color
	if softEdge then
		img.enableSoftEdge = true
		img:SetSoftEdgeWidth(5, 5)
	end
	return img
end

local function NewText(parent, name, text, x, y, w, h, size, color, bgColor)
	local lbl = Remember(game.InstantiateClientUIControl(TEXT_TEMPLATE, parent))
	if not lbl then return nil end
	local fontSize = size or 14
	local textHeight = math.max(h, fontSize * 2)
	Configure(lbl, x, y, w, textHeight, name)
	lbl.fontSize = fontSize
	lbl.fontColor = color or Color.FromRGB(240, 232, 215)
	lbl.bgColor = bgColor or Color.FromRGBA(0, 0, 0, 0)
	lbl.adaptiveFontSize = false
	lbl.horizontalAlignment = Enum.TextHorizontalAlignment.Middle
	lbl.verticalAlignment = Enum.TextVerticalAlignment.Middle
	lbl.text = text or ""
	lbl:SetVisible(true)
	lbl:SetAsLastSibling()
	return lbl
end

local function SpawnFloatingText(wx, wy, text, color, size)
	local ft = floatTextPool[nextFloatIdx]
	nextFloatIdx = (nextFloatIdx % NUM_FLOAT_TEXTS) + 1
	if not ft then return end
	ft.active = true
	ft.wx = wx + (math.random() - 0.5) * 14
	ft.wy = wy + 18
	ft.life = 0.75
	ft.control.text = text
	ft.control.fontColor = color or Color.FromRGB(255, 75, 75)
	ft.control.fontSize = size or 13
	ft.control:SetVisible(true)
end

local function SpawnParticle(wx, wy, vx, vy, size, color, life)
	local p = particlePool[nextParticleIdx]
	nextParticleIdx = (nextParticleIdx % NUM_PARTICLES) + 1
	if not p then return end
	p.active = true
	p.wx = wx
	p.wy = wy
	p.vx = vx
	p.vy = vy
	p.life = life or 0.30
	p.control.imageColor = color
	p.control:SetSizeDelta(size, size)
	p.control:SetVisible(true)
end

-- ============================================================================
-- WORLD POOLS: PROCEDURAL TERRAIN, MAGE, ENEMIES, LOOT BAGS & BULLETS
-- ============================================================================

local function BuildWorldPools()
	gridCells = {}
	enemyPool = {}
	bulletPool = {}
	lootPool = {}
	floatTextPool = {}
	particlePool = {}

	-- Olive-Green RotMG Grasslands Base Canvas (Full-bleed 2600x2600 centered on container)
	NewImage(worldLayer, "GrassBackdrop", DESIGN_WIDTH * 0.5, DESIGN_HEIGHT * 0.5, 2600, 2600,
		Color.FromRGB(132, 142, 58), RECT_RES, false)

	-- 1A. Pass 1: Ground Tiles & Cobblestone Mortar (Always underneath tree canopies!)
	for r = 1, GRID_ROWS do
		for c = 1, GRID_COLS do
			local idx = (r - 1) * GRID_COLS + c
			local tile = NewImage(worldLayer, "Tile_" .. idx, -2000, -2000, CELL_SIZE + 2, CELL_SIZE + 2,
				Color.FromRGB(142, 108, 72), RECT_RES, false)
			local brickMortar = NewImage(worldLayer, "Mortar_" .. idx, -2000, -2000, CELL_SIZE - 8, 18,
				Color.FromRGB(118, 88, 56), RECT_RES, false)
			tile:SetVisible(false)
			brickMortar:SetVisible(false)
			gridCells[idx] = {
				tile = tile,
				brickMortar = brickMortar,
				trunk = nil,
				canopy = nil,
				canopyTop = nil
			}
		end
	end

	-- 1B. Pass 2: Forest Tree Trunks & Two-Tone Pixel Canopies (Layered above ground tiles)
	for r = 1, GRID_ROWS do
		for c = 1, GRID_COLS do
			local idx = (r - 1) * GRID_COLS + c
			local trunk = NewImage(worldLayer, "Trunk_" .. idx, -2000, -2000, 18, 22,
				Color.FromRGB(78, 46, 24), RECT_RES, false)
			local canopy = NewImage(worldLayer, "Canopy_" .. idx, -2000, -2000, 52, 48,
				Color.FromRGB(28, 76, 36), RECT_RES, true)
			local canopyTop = NewImage(worldLayer, "CanopyTop_" .. idx, -2000, -2000, 34, 28,
				Color.FromRGB(42, 102, 48), RECT_RES, true)
			trunk:SetVisible(false)
			canopy:SetVisible(false)
			canopyTop:SetVisible(false)
			gridCells[idx].trunk = trunk
			gridCells[idx].canopy = canopy
			gridCells[idx].canopyTop = canopyTop
		end
	end

	-- 2. Loot Bags Pool (Brown HP/MP Bag, Cyan Stat Bag, White Boss Bag)
	for i = 1, NUM_LOOT_BAGS do
		local bagRoot = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, worldLayer))
		Configure(bagRoot, -2000, -2000, 26, 26, "LootBag_" .. i)
		local pouch = NewImage(bagRoot, "Pouch", 13, 11, 20, 18, Color.FromRGB(165, 110, 62), RECT_RES, true)
		local ribbon = NewImage(bagRoot, "Ribbon", 13, 19, 12, 5, Color.FromRGB(235, 195, 75), RECT_RES, false)
		bagRoot:SetVisible(false)
		lootPool[i] = {
			control = bagRoot,
			pouch = pouch,
			ribbon = ribbon,
			active = false,
			wx = 0,
			wy = 0,
			bagType = "POTION",
			life = 0
		}
	end

	-- 3. Enemies Pool (Each with Sprite Container + Under-Foot RotMG Green HP Bar!)
	for i = 1, NUM_ENEMIES do
		local eRoot = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, worldLayer))
		Configure(eRoot, -2000, -2000, 44, 48, "Enemy_" .. i)

		local shadow = NewImage(eRoot, "Shadow", 22, 10, 26, 9, Color.FromRGBA(0, 0, 0, 95), CIRCLE_RES, false)
		local body = NewImage(eRoot, "Body", 22, 24, 26, 26, Color.FromRGB(130, 155, 65), RECT_RES, true)
		local detail = NewImage(eRoot, "Detail", 22, 28, 12, 10, Color.FromRGB(245, 220, 145), RECT_RES, false)
		local weapon = NewImage(eRoot, "Weapon", 34, 24, 8, 20, Color.FromRGB(185, 195, 205), RECT_RES, false)

		-- Under-foot RotMG Health Bar
		local hpBg = NewImage(eRoot, "HpBg", 22, 3, 34, 6, Color.FromRGB(18, 18, 18), RECT_RES, false)
		local hpFill = NewImage(eRoot, "HpFill", 22, 3, 32, 4, Color.FromRGB(65, 225, 75), RECT_RES, false)

		eRoot:SetVisible(false)
		enemyPool[i] = {
			control = eRoot,
			shadow = shadow,
			body = body,
			detail = detail,
			weapon = weapon,
			hpBg = hpBg,
			hpFill = hpFill,
			active = false,
			isBoss = false,
			kind = "GOBLIN",
			wx = 0,
			wy = 0,
			vx = 0,
			vy = 0,
			hp = 60,
			maxHp = 60,
			radius = 15,
			fireTimer = 0,
			phaseAngle = 0,
			scoreValue = 45,
			xpValue = 18
		}
	end

	-- 4. Roaming Wizard Player (Purple Pointed Hat, Robe, Staff & Under-Foot HP Bar)
	local mageRoot = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, worldLayer))
	Configure(mageRoot, screenWidth * 0.5, screenHeight * 0.5, 48, 54, "RealmWizardPlayer")

	NewImage(mageRoot, "Shadow", 24, 11, 26, 9, Color.FromRGBA(0, 0, 0, 110), CIRCLE_RES, false)
	NewImage(mageRoot, "Robe", 24, 21, 22, 18, Color.FromRGB(98, 72, 165), RECT_RES, true)
	NewImage(mageRoot, "RobeTrim", 24, 14, 22, 4, Color.FromRGB(195, 145, 65), RECT_RES, false)
	local mageFace = NewImage(mageRoot, "Face", 24, 31, 16, 12, Color.FromRGB(240, 198, 140), RECT_RES, false)
	local mageEye = NewImage(mageRoot, "Eye", 27, 31, 4, 4, Color.FromRGB(25, 20, 30), RECT_RES, false)
	-- Iconic Purple Pointed Wizard Hat
	NewImage(mageRoot, "HatBrim", 24, 37, 24, 5, Color.FromRGB(115, 88, 188), RECT_RES, false)
	NewImage(mageRoot, "HatCone", 22, 44, 16, 12, Color.FromRGB(115, 88, 188), TRI_RES, false)
	-- Wooden Magic Staff + Glowing Arcane Crystal Tip
	local staffShaft = NewImage(mageRoot, "StaffShaft", 36, 25, 5, 26, Color.FromRGB(138, 86, 38), RECT_RES, false)
	local staffGem = NewImage(mageRoot, "StaffGem", 36, 39, 9, 9, Color.FromRGB(110, 225, 255), STAR4_RES, false)

	-- Under-foot RotMG Green HP Bar on the Mage
	NewImage(mageRoot, "PlayerHpBg", 24, 3, 34, 6, Color.FromRGB(15, 15, 15), RECT_RES, false)
	local playerFootHp = NewImage(mageRoot, "PlayerHpFill", 24, 3, 32, 4, Color.FromRGB(65, 235, 75), RECT_RES, false)

	mage = {
		control = mageRoot,
		face = mageFace,
		eye = mageEye,
		staffShaft = staffShaft,
		staffGem = staffGem,
		footHpFill = playerFootHp,
		wx = 0,
		wy = 0,
		facing = 1,
		hp = 220,
		maxHp = 220,
		mp = 120,
		maxMp = 120,
		level = 1,
		xp = 0,
		xpToNext = 80,
		score = 0,
		moveSpeed = 235,
		fireRate = 5.2, -- Shots per second
		fireTimer = 0,
		staffDamage = 24,
		spellCooldown = 0
	}

	-- 5. Spellbomb Expanding Ring Visual
	spellNovaVisual = NewImage(worldLayer, "SpellbombRing", -2000, -2000, 64, 64,
		Color.FromRGBA(105, 185, 255, 195), STAR5_RES, false)
	spellNovaVisual:SetVisible(false)

	-- 6. Bullets Pool
	for i = 1, NUM_BULLETS do
		local ctrl = NewImage(worldLayer, "Bullet_" .. i, -2000, -2000, 12, 12, Color.FromRGB(255, 80, 60), CIRCLE_RES, false)
		ctrl:SetVisible(false)
		bulletPool[i] = {
			control = ctrl,
			active = false,
			fromPlayer = false,
			wx = 0,
			wy = 0,
			vx = 0,
			vy = 0,
			radius = 5,
			damage = 14,
			life = 0
		}
	end

	-- 7. Particles Pool
	for i = 1, NUM_PARTICLES do
		local ctrl = NewImage(worldLayer, "Part_" .. i, -2000, -2000, 10, 10, Color.FromRGB(255, 200, 80), RECT_RES, false)
		ctrl:SetVisible(false)
		particlePool[i] = { control = ctrl, active = false, wx = 0, wy = 0, vx = 0, vy = 0, life = 0 }
	end

	-- 8. Floating Combat Text Pool (-27 Damage & +18 XP Popups)
	for i = 1, NUM_FLOAT_TEXTS do
		local lbl = NewText(worldLayer, "FloatTxt_" .. i, "-27", -2000, -2000, 90, 22, 13, Color.FromRGB(255, 75, 75))
		lbl:SetVisible(false)
		floatTextPool[i] = { control = lbl, active = false, wx = 0, wy = 0, life = 0 }
	end
end

-- ============================================================================
-- ENEMY & BOSS SPAWNERS (GOBLINS, BATS, OBSIDIAN BOMB SLIMES & ORYX BOSS)
-- ============================================================================

local function FindFreeEnemySlot()
	for i = 1, NUM_ENEMIES do
		if not enemyPool[i].active then
			return enemyPool[i]
		end
	end
	return nil
end

local function SpawnMiniObsidianOrb(wx, wy)
	local e = FindFreeEnemySlot()
	if not e then return end
	e.active = true
	e.isBoss = false
	e.kind = "MINI_ORB"
	e.wx = wx
	e.wy = wy
	e.maxHp = 45 + mage.level * 6
	e.hp = e.maxHp
	e.radius = 12
	e.fireTimer = 0.6 + math.random() * 0.5
	e.phaseAngle = math.random() * 6.28
	e.scoreValue = 30
	e.xpValue = 14

	e.body:SetImage(Enum.ImageSource.StaticReference, CIRCLE_RES)
	e.body.imageColor = Color.FromRGB(18, 22, 52)
	e.body:SetSizeDelta(20, 20)
	e.detail:SetImage(Enum.ImageSource.StaticReference, RECT_RES)
	e.detail.imageColor = Color.FromRGB(245, 250, 255)
	e.detail:SetAnchoredPosition(19, 27)
	e.detail:SetSizeDelta(5, 5)
	e.weapon:SetVisible(false)
	e.control:SetVisible(true)
end

local function SpawnRealmMonster()
	local e = FindFreeEnemySlot()
	if not e then return end

	-- Spawn just outside the player's immediate circle (280px - 460px away)
	local ang = math.random() * math.pi * 2
	local dist = 290 + math.random() * 170
	local wx = mage.wx + math.cos(ang) * dist
	local wy = mage.wy + math.sin(ang) * dist

	e.active = true
	e.isBoss = false
	e.wx = wx
	e.wy = wy
	e.phaseAngle = math.random() * math.pi * 2

	local roll = math.random()
	if roll < 0.34 then
		-- 1. Goblin Archer (Green/Tan with Bow — Fires White/Gray Arrows)
		e.kind = "GOBLIN"
		e.maxHp = 68 + mage.level * 12
		e.radius = 14
		e.scoreValue = 50
		e.xpValue = 20
		e.body:SetImage(Enum.ImageSource.StaticReference, RECT_RES)
		e.body.imageColor = Color.FromRGB(125, 152, 58)
		e.body:SetSizeDelta(24, 24)
		e.detail:SetImage(Enum.ImageSource.StaticReference, RECT_RES)
		e.detail.imageColor = Color.FromRGB(228, 195, 118)
		e.detail:SetAnchoredPosition(22, 28)
		e.detail:SetSizeDelta(14, 9)
		e.weapon:SetVisible(true)
		e.weapon.imageColor = Color.FromRGB(195, 205, 215)
		e.weapon:SetSizeDelta(6, 18)
	elseif roll < 0.64 then
		-- 2. Woodland Shadow Bat (Fast Dark Creature with Yellow Eyes)
		e.kind = "BAT"
		e.maxHp = 52 + mage.level * 9
		e.radius = 13
		e.scoreValue = 40
		e.xpValue = 16
		e.body:SetImage(Enum.ImageSource.StaticReference, RECT_RES)
		e.body.imageColor = Color.FromRGB(24, 24, 28)
		e.body:SetSizeDelta(24, 16)
		e.detail:SetImage(Enum.ImageSource.StaticReference, RECT_RES)
		e.detail.imageColor = Color.FromRGB(250, 220, 65)
		e.detail:SetAnchoredPosition(22, 25)
		e.detail:SetSizeDelta(10, 4)
		e.weapon:SetVisible(false)
	elseif roll < 0.88 then
		-- 3. Obsidian Bomb Slime (Round Black/Navy Sphere with White Shine — Fires Red Wand Bolts & Splits!)
		e.kind = "BOMB_ORB"
		e.maxHp = 115 + mage.level * 18
		e.radius = 18
		e.scoreValue = 85
		e.xpValue = 32
		e.body:SetImage(Enum.ImageSource.StaticReference, CIRCLE_RES)
		e.body.imageColor = Color.FromRGB(14, 18, 48)
		e.body:SetSizeDelta(32, 32)
		e.detail:SetImage(Enum.ImageSource.StaticReference, RECT_RES)
		e.detail.imageColor = Color.FromRGB(255, 255, 255)
		e.detail:SetAnchoredPosition(18, 29)
		e.detail:SetSizeDelta(8, 8)
		e.weapon:SetVisible(false)
	else
		-- 4. Crimson Cultist / Pyromancer (Fires Radial Fire-Rings)
		e.kind = "PYRO"
		e.maxHp = 145 + mage.level * 22
		e.radius = 16
		e.scoreValue = 110
		e.xpValue = 42
		e.body:SetImage(Enum.ImageSource.StaticReference, TRI_RES)
		e.body.imageColor = Color.FromRGB(185, 38, 48)
		e.body:SetSizeDelta(28, 30)
		e.detail:SetImage(Enum.ImageSource.StaticReference, STAR4_RES)
		e.detail.imageColor = Color.FromRGB(255, 215, 75)
		e.detail:SetAnchoredPosition(22, 28)
		e.detail:SetSizeDelta(12, 12)
		e.weapon:SetVisible(true)
		e.weapon.imageColor = Color.FromRGB(255, 125, 45)
		e.weapon:SetSizeDelta(7, 22)
	end

	e.hp = e.maxHp
	e.fireTimer = 0.5 + math.random() * 0.8
	e.control:SetVisible(true)
end

local function SpawnMadGodBoss()
	if bossSpawned then return end
	bossSpawned = true

	-- Allocate slot 1 if needed so Boss is guaranteed to spawn
	local e = FindFreeEnemySlot() or enemyPool[1]
	bossEntity = e

	local ang = math.random() * math.pi * 2
	e.active = true
	e.isBoss = true
	e.kind = "MAD_GOD_BOSS"
	e.wx = mage.wx + math.cos(ang) * 340
	e.wy = mage.wy + math.sin(ang) * 340
	e.maxHp = 2200
	e.hp = e.maxHp
	e.radius = 28
	e.fireTimer = 0.8
	e.phaseAngle = 0
	e.scoreValue = 1000
	e.xpValue = 500

	e.body:SetImage(Enum.ImageSource.StaticReference, RECT_RES)
	e.body.imageColor = Color.FromRGB(35, 18, 48)
	e.body:SetSizeDelta(48, 48)
	e.detail:SetImage(Enum.ImageSource.StaticReference, STAR5_RES)
	e.detail.imageColor = Color.FromRGB(255, 65, 85)
	e.detail:SetAnchoredPosition(22, 28)
	e.detail:SetSizeDelta(24, 24)
	e.weapon:SetVisible(true)
	e.weapon.imageColor = Color.FromRGB(255, 210, 75)
	e.weapon:SetSizeDelta(10, 34)
	e.control:SetVisible(true)

	if bossHpContainer then
		bossHpContainer:SetVisible(true)
	end
	shakeTimer = 0.55
	shakePower = 11
	SpawnFloatingText(mage.wx, mage.wy + 25, "⚔ ORYX HAS AWAKENED! ⚔", Color.FromRGB(255, 85, 85), 16)
end

-- ============================================================================
-- COMBAT: PROJECTILES, WIZARD SPELLBOMB & LOOT DROPS
-- ============================================================================

local function FireProjectile(fromPlayer, wx, wy, vx, vy, radius, damage, color, shape, life, rotDeg)
	local b = bulletPool[nextBulletIdx]
	nextBulletIdx = (nextBulletIdx % NUM_BULLETS) + 1
	b.active = true
	b.fromPlayer = fromPlayer
	b.wx = wx
	b.wy = wy
	b.vx = vx
	b.vy = vy
	b.radius = radius or 5
	b.damage = damage or 15
	b.life = life or 1.4

	b.control:SetImage(Enum.ImageSource.StaticReference, shape or CIRCLE_RES)
	b.control.imageColor = color
	b.control:SetSizeDelta(b.radius * 2.2, b.radius * 2.2)
	b.control:SetLocalRotation(0, 0, rotDeg or 0)
	b.control:SetVisible(true)
end

-- Classic RotMG Wizard Ability: Detonates a 12-bolt radial Arcane Nova at the Mouse Cursor!
local function CastWizardSpellbomb()
	if not mage or gameState ~= "PLAYING" then return end
	if mage.mp < 35 or mage.spellCooldown > 0 then
		SpawnFloatingText(mage.wx, mage.wy, "LOW MANA!", Color.FromRGB(110, 195, 255), 12)
		return
	end

	mage.mp = mage.mp - 35
	mage.spellCooldown = 0.65

	-- Convert screen cursor to world coordinates
	local targetWX = mage.wx + (cursorX - screenWidth * 0.5)
	local targetWY = mage.wy + (cursorY - screenHeight * 0.5)

	spellNovaX = targetWX
	spellNovaY = targetWY
	spellNovaTimer = 0.35
	spellNovaVisual:SetVisible(true)
	shakeTimer = 0.18
	shakePower = 5

	local boltDmg = mage.staffDamage * 1.35
	for i = 1, 12 do
		local ang = (i - 1) * (math.pi * 2 / 12)
		local deg = math.deg(ang) - 90
		FireProjectile(true, targetWX, targetWY,
			math.cos(ang) * 430, math.sin(ang) * 430,
			6, boltDmg, Color.FromRGB(95, 195, 255), STAR4_RES, 0.75, deg)
	end
end

local function MaybeDropLootBag(wx, wy, forceWhiteBag)
	if not forceWhiteBag and math.random() > 0.32 then return end
	local bag = lootPool[nextLootIdx]
	nextLootIdx = (nextLootIdx % NUM_LOOT_BAGS) + 1
	bag.active = true
	bag.wx = wx
	bag.wy = wy
	bag.life = 18.0

	if forceWhiteBag then
		bag.bagType = "WHITE"
		bag.pouch.imageColor = Color.FromRGB(245, 248, 255)
		bag.ribbon.imageColor = Color.FromRGB(95, 215, 255)
	elseif math.random() < 0.40 then
		bag.bagType = "CYAN"
		bag.pouch.imageColor = Color.FromRGB(65, 205, 225)
		bag.ribbon.imageColor = Color.FromRGB(255, 220, 95)
	else
		bag.bagType = "POTION"
		bag.pouch.imageColor = Color.FromRGB(165, 108, 58)
		bag.ribbon.imageColor = Color.FromRGB(235, 75, 75)
	end
	bag.control:SetVisible(true)
end

local function GrantScoreAndXP(scoreGain, xpGain, enemyWX, enemyWY)
	mage.score = mage.score + scoreGain
	mage.xp = mage.xp + xpGain

	SpawnFloatingText(mage.wx, mage.wy + 16, string.format("+%dXP", xpGain), Color.FromRGB(185, 125, 255), 13)

	while mage.xp >= mage.xpToNext do
		mage.xp = mage.xp - mage.xpToNext
		mage.level = mage.level + 1
		mage.xpToNext = math.floor(mage.xpToNext * 1.28 + 30)
		mage.maxHp = mage.maxHp + 28
		mage.hp = mage.maxHp
		mage.maxMp = mage.maxMp + 15
		mage.mp = mage.maxMp
		mage.staffDamage = mage.staffDamage + 4
		SpawnFloatingText(mage.wx, mage.wy + 32, "★ LEVEL UP! LV." .. mage.level .. " ★", Color.FromRGB(255, 225, 85), 15)
	end

	-- Summon the Mad God Boss once the player fills the Score Bar!
	if not bossSpawned and mage.score >= TARGET_BOSS_SCORE then
		SpawnMadGodBoss()
	end
end

-- ============================================================================
-- UPDATE LOOPS: MAGE, ENEMIES, PROJECTILES & PROCEDURAL WORLD RENDER
-- ============================================================================

local function UpdateMage(dt)
	mage.spellCooldown = math.max(0, mage.spellCooldown - dt)
	mage.mp = math.min(mage.maxMp, mage.mp + 11.5 * dt)
	mage.hp = math.min(mage.maxHp, mage.hp + 3.5 * dt)

	local dx = (keys.right and 1 or 0) - (keys.left and 1 or 0)
	local dy = (keys.up and 1 or 0) - (keys.down and 1 or 0)
	if dx ~= 0 and dy ~= 0 then
		dx = dx * 0.7071
		dy = dy * 0.7071
	end

	local nextX = mage.wx + dx * mage.moveSpeed * dt
	local nextY = mage.wy + dy * mage.moveSpeed * dt

	-- Slide smoothly around solid forest tree trunks
	if not HitsTreeObstacle(nextX, mage.wy, 12) then
		mage.wx = nextX
	end
	if not HitsTreeObstacle(mage.wx, nextY, 12) then
		mage.wy = nextY
	end

	-- Orient Wizard toward Mouse Cursor (without negative scale!)
	local aimDX = cursorX - screenWidth * 0.5
	local aimDY = cursorY - screenHeight * 0.5
	mage.facing = (aimDX >= 0) and 1 or -1
	mage.eye:SetAnchoredPosition(24 + mage.facing * 4, 31)
	mage.staffShaft:SetAnchoredPosition(24 + mage.facing * 12, 25)
	mage.staffGem:SetAnchoredPosition(24 + mage.facing * 12, 39)

	-- Twin Arcane Staff Auto-Fire / Click-Fire toward Cursor
	mage.fireTimer = mage.fireTimer - dt
	if (isMouseFiring or autoFireEnabled) and mage.fireTimer <= 0 then
		mage.fireTimer = 1.0 / mage.fireRate
		local aimAng = math.atan(aimDY, aimDX)
		local perpX = -math.sin(aimAng) * 6
		local perpY = math.cos(aimAng) * 6
		local boltSpd = 520
		local deg = math.deg(aimAng) - 90

		-- Twin RotMG Wizard Staff Bolts with gentle wave spread
		FireProjectile(true, mage.wx + perpX, mage.wy + perpY,
			math.cos(aimAng + 0.04) * boltSpd, math.sin(aimAng + 0.04) * boltSpd,
			5, mage.staffDamage, Color.FromRGB(145, 235, 255), TRI_RES, 0.92, deg)
		FireProjectile(true, mage.wx - perpX, mage.wy - perpY,
			math.cos(aimAng - 0.04) * boltSpd, math.sin(aimAng - 0.04) * boltSpd,
			5, mage.staffDamage, Color.FromRGB(195, 140, 255), TRI_RES, 0.92, deg)
	end
end

local function UpdateEnemiesAndLoot(dt)
	-- Continuously populate the endless map around the roaming Mage
	spawnTimer = spawnTimer - dt
	if spawnTimer <= 0 then
		spawnTimer = 0.65
		local activeCount = 0
		for i = 1, NUM_ENEMIES do
			if enemyPool[i].active then
				activeCount = activeCount + 1
			end
		end
		if activeCount < 16 then
			SpawnRealmMonster()
		end
	end

	for i = 1, NUM_ENEMIES do
		local e = enemyPool[i]
		if e.active then
			local dx = mage.wx - e.wx
			local dy = mage.wy - e.wy
			local dist = math.sqrt(dx * dx + dy * dy)

			-- Despawn non-boss monsters if the Mage runs very far away (> 780px) so new ones spawn ahead
			if not e.isBoss and dist > 780 then
				e.active = false
				e.control:SetVisible(false)
			else
				e.phaseAngle = e.phaseAngle + dt * 2.6
				local angToMage = math.atan(dy, dx)
				local moveSpd = 95

				if e.kind == "BAT" then
					moveSpd = 148
					local flutter = math.sin(e.phaseAngle * 2.5) * 0.7
					e.vx = math.cos(angToMage + flutter) * moveSpd
					e.vy = math.sin(angToMage + flutter) * moveSpd
				elseif e.kind == "GOBLIN" then
					-- Maintain bow range (~180px) and strafe
					local radial = (dist > 210) and 1 or ((dist < 130) and -1 or 0)
					e.vx = math.cos(angToMage) * radial * 95 - math.sin(angToMage) * 75
					e.vy = math.sin(angToMage) * radial * 95 + math.cos(angToMage) * 75
				elseif e.kind == "BOMB_ORB" or e.kind == "MINI_ORB" then
					moveSpd = (e.kind == "MINI_ORB") and 135 or 82
					e.vx = math.cos(angToMage) * moveSpd
					e.vy = math.sin(angToMage) * moveSpd
				elseif e.isBoss then
					-- Oryx Mad God Boss circles and charges
					local desiredDist = 195
					local radial = Clamp((dist - desiredDist) * 0.02, -1, 1)
					e.vx = math.cos(angToMage) * radial * 135 - math.sin(angToMage) * 95
					e.vy = math.sin(angToMage) * radial * 135 + math.cos(angToMage) * 95
				else
					e.vx = math.cos(angToMage) * 90
					e.vy = math.sin(angToMage) * 90
				end

				local nx = e.wx + e.vx * dt
				local ny = e.wy + e.vy * dt
				if e.isBoss or not HitsTreeObstacle(nx, e.wy, e.radius) then
					e.wx = nx
				end
				if e.isBoss or not HitsTreeObstacle(e.wx, ny, e.radius) then
					e.wy = ny
				end

				-- Enemy Bullet-Hell Attack Patterns
				e.fireTimer = e.fireTimer - dt
				if e.fireTimer <= 0 and dist < 520 then
					local deg = math.deg(angToMage) - 90
					if e.kind == "GOBLIN" then
						e.fireTimer = 1.35
						FireProjectile(false, e.wx, e.wy,
							math.cos(angToMage) * 235, math.sin(angToMage) * 235,
							5, 16, Color.FromRGB(230, 235, 240), TRI_RES, 2.2, deg)
					elseif e.kind == "BAT" then
						e.fireTimer = 1.55
						FireProjectile(false, e.wx, e.wy,
							math.cos(angToMage) * 210, math.sin(angToMage) * 210,
							5, 13, Color.FromRGB(195, 95, 250), STAR4_RES, 1.8, deg)
					elseif e.kind == "BOMB_ORB" then
						-- Fires spread of crimson/orange fire-wand bolts (like in the screenshot!)
						e.fireTimer = 1.65
						for s = -2, 2 do
							local a = angToMage + s * 0.22
							FireProjectile(false, e.wx, e.wy,
								math.cos(a) * 185, math.sin(a) * 185,
								6, 20, Color.FromRGB(255, 65, 35), RECT_RES, 2.6, math.deg(a) - 90)
						end
					elseif e.kind == "MINI_ORB" then
						e.fireTimer = 1.45
						FireProjectile(false, e.wx, e.wy,
							math.cos(angToMage) * 195, math.sin(angToMage) * 195,
							5, 14, Color.FromRGB(255, 90, 45), CIRCLE_RES, 2.2, 0)
					elseif e.kind == "PYRO" then
						e.fireTimer = 1.85
						for k = 1, 8 do
							local a = (k - 1) * (math.pi * 2 / 8) + e.phaseAngle
							FireProjectile(false, e.wx, e.wy,
								math.cos(a) * 165, math.sin(a) * 165,
								6, 22, Color.FromRGB(255, 145, 45), STAR4_RES, 2.8, math.deg(a))
						end
					elseif e.isBoss then
						-- Oryx Mad God Multi-Pattern Barrage!
						e.fireTimer = 1.15
						-- Pattern A: 12-Way Crimson Radial Nova
						for k = 1, 12 do
							local a = (k - 1) * (math.pi * 2 / 12) + e.phaseAngle * 0.5
							FireProjectile(false, e.wx, e.wy,
								math.cos(a) * 175, math.sin(a) * 175,
								7, 26, Color.FromRGB(255, 55, 75), STAR5_RES, 3.4, math.deg(a))
						end
						-- Pattern B: 5-Shot Aimed Shotgun Spread
						for s = -2, 2 do
							local a = angToMage + s * 0.16
							FireProjectile(false, e.wx, e.wy,
								math.cos(a) * 235, math.sin(a) * 235,
								6, 24, Color.FromRGB(255, 195, 65), TRI_RES, 2.6, math.deg(a) - 90)
						end
					end
				end
			end
		end
	end

	-- Update Loot Bags & Pickup Check
	for i = 1, NUM_LOOT_BAGS do
		local bag = lootPool[i]
		if bag.active then
			bag.life = bag.life - dt
			if bag.life <= 0 then
				bag.active = false
				bag.control:SetVisible(false)
			elseif (mage.wx - bag.wx) ^ 2 + (mage.wy - bag.wy) ^ 2 < 28 * 28 then
				bag.active = false
				bag.control:SetVisible(false)
				if bag.bagType == "POTION" then
					mage.hp = math.min(mage.maxHp, mage.hp + 65)
					mage.mp = math.min(mage.maxMp, mage.mp + 55)
					SpawnFloatingText(mage.wx, mage.wy + 20, "+65 HP / +55 MP", Color.FromRGB(95, 245, 125), 13)
				elseif bag.bagType == "CYAN" then
					mage.staffDamage = mage.staffDamage + 5
					mage.fireRate = math.min(9.0, mage.fireRate + 0.45)
					SpawnFloatingText(mage.wx, mage.wy + 20, "★ CYAN BAG: STAFF UPGRADE! ★", Color.FromRGB(85, 235, 255), 14)
				else
					mage.hp = mage.maxHp
					mage.mp = mage.maxMp
					SpawnFloatingText(mage.wx, mage.wy + 24, "★ WHITE BAG: DIVINE RELIC! ★", Color.FromRGB(255, 255, 255), 15)
				end
			end
		end
	end
end

local function UpdateProjectiles(dt)
	for i = 1, NUM_BULLETS do
		local b = bulletPool[i]
		if b.active then
			b.wx = b.wx + b.vx * dt
			b.wy = b.wy + b.vy * dt
			b.life = b.life - dt

			-- Check solid tree trunk blocking bullets (Classic RotMG forest cover!)
			local hitTree = HitsTreeObstacle(b.wx, b.wy, b.radius * 0.5)
			if b.life <= 0 or hitTree then
				b.active = false
				b.control:SetVisible(false)
				if hitTree then
					SpawnParticle(b.wx, b.wy, 0, 0, 8, Color.FromRGB(145, 110, 65), 0.16)
				end
			elseif b.fromPlayer then
				-- Check hit against active Realm Enemies
				for eIdx = 1, NUM_ENEMIES do
					local e = enemyPool[eIdx]
					if e.active then
						local rSum = b.radius + e.radius
						if (b.wx - e.wx) ^ 2 + (b.wy - e.wy) ^ 2 <= rSum * rSum then
							local dmg = math.floor(b.damage + (math.random() - 0.5) * 4)
							e.hp = e.hp - dmg
							b.active = false
							b.control:SetVisible(false)

							-- Spawn RotMG Floating Red Damage Number (-27)!
							SpawnFloatingText(e.wx, e.wy, string.format("-%d", dmg), Color.FromRGB(255, 65, 55), 13)
							SpawnParticle(b.wx, b.wy, (math.random() - 0.5) * 140, (math.random() - 0.5) * 140,
								9, Color.FromRGB(255, 210, 95), 0.22)

							if e.hp <= 0 then
								e.active = false
								e.control:SetVisible(false)

								if e.kind == "BOMB_ORB" then
									-- Split into 2 Mini Obsidian Orbs!
									SpawnMiniObsidianOrb(e.wx - 18, e.wy)
									SpawnMiniObsidianOrb(e.wx + 18, e.wy)
								end

								if e.isBoss then
									gameState = "VICTORY"
									MaybeDropLootBag(e.wx, e.wy, true)
									shakeTimer = 0.65
									shakePower = 14
									if bossHpContainer then
										bossHpContainer:SetVisible(false)
									end
								else
									MaybeDropLootBag(e.wx, e.wy, false)
									GrantScoreAndXP(e.scoreValue, e.xpValue, e.wx, e.wy)
								end
							end
							break
						end
					end
				end
			else
				-- Enemy projectile hitting the Mage
				if (b.wx - mage.wx) ^ 2 + (b.wy - mage.wy) ^ 2 <= (b.radius + 12) ^ 2 then
					local dmg = math.floor(b.damage)
					mage.hp = mage.hp - dmg
					b.active = false
					b.control:SetVisible(false)
					shakeTimer = 0.16
					shakePower = 5
					SpawnFloatingText(mage.wx, mage.wy + 10, string.format("-%d", dmg), Color.FromRGB(255, 55, 55), 14)

					if mage.hp <= 0 then
						mage.hp = 0
						gameState = "DEFEAT"
					end
				end
			end
		end
	end
end

local function RenderEndlessWorldAndHUD(dt)
	local shakeX = 0
	local shakeY = 0
	if shakeTimer > 0 then
		shakeTimer = math.max(0, shakeTimer - dt)
		shakeX = (math.random() - 0.5) * 2 * shakePower
		shakeY = (math.random() - 0.5) * 2 * shakePower
	end

	local camLeft = mage.wx - DESIGN_WIDTH * 0.5 - shakeX
	local camBottom = mage.wy - DESIGN_HEIGHT * 0.5 - shakeY

	-- 1. Render Infinite Procedural Grid Centered Symmetrically Around the Mage (Center Anchor!)
	local centerGX = math.floor(mage.wx / CELL_SIZE + 0.5)
	local centerGY = math.floor(mage.wy / CELL_SIZE + 0.5)
	local halfCols = math.floor(GRID_COLS * 0.5)
	local halfRows = math.floor(GRID_ROWS * 0.5)

	for r = 1, GRID_ROWS do
		for c = 1, GRID_COLS do
			local gx = centerGX + (c - 1 - halfCols)
			local gy = centerGY + (r - 1 - halfRows)
			local cell = gridCells[(r - 1) * GRID_COLS + c]
			local sx = DESIGN_WIDTH * 0.5 + (gx * CELL_SIZE - mage.wx) + shakeX
			local sy = DESIGN_HEIGHT * 0.5 + (gy * CELL_SIZE - mage.wy) + shakeY

			local feat = cell.feat
			if cell.gx ~= gx or cell.gy ~= gy then
				cell.gx = gx
				cell.gy = gy
				feat = GetCellFeature(gx, gy)
				cell.mortarOffset = ((gx + gy) % 2 == 0) and 14 or -14

				if cell.feat ~= feat then
					cell.feat = feat
					if feat == "ROAD" then
						cell.tile:SetImage(Enum.ImageSource.StaticReference, RECT_RES)
						cell.tile.imageColor = Color.FromRGB(142, 108, 72)
						cell.tile:SetSizeDelta(CELL_SIZE + 2, CELL_SIZE + 2)
						cell.tile:SetVisible(true)

						cell.brickMortar.imageColor = Color.FromRGB(115, 84, 52)
						cell.brickMortar:SetVisible(true)

						cell.trunk:SetVisible(false)
						cell.canopy:SetVisible(false)
						cell.canopyTop:SetVisible(false)

					elseif feat == "TREE" then
						-- Dark moss patch under tree + Trunk + Two-Tone Pixel Canopy
						cell.tile:SetImage(Enum.ImageSource.StaticReference, CIRCLE_RES)
						cell.tile.imageColor = Color.FromRGBA(78, 112, 54, 185)
						cell.tile:SetSizeDelta(64, 42)
						cell.tile:SetVisible(true)
						cell.brickMortar:SetVisible(false)

						cell.trunk:SetVisible(true)
						cell.canopy:SetVisible(true)
						cell.canopyTop:SetVisible(true)

					elseif feat == "MOSS" then
						cell.tile:SetImage(Enum.ImageSource.StaticReference, CIRCLE_RES)
						cell.tile.imageColor = Color.FromRGBA(82, 118, 56, 165)
						cell.tile:SetSizeDelta(68, 48)
						cell.tile:SetVisible(true)
						cell.brickMortar:SetVisible(false)
						cell.trunk:SetVisible(false)
						cell.canopy:SetVisible(false)
						cell.canopyTop:SetVisible(false)

					elseif feat == "FLOWER" then
						cell.tile:SetImage(Enum.ImageSource.StaticReference, STAR4_RES)
						cell.tile.imageColor = Color.FromRGB(250, 250, 235)
						cell.tile:SetSizeDelta(16, 16)
						cell.tile:SetVisible(true)
						cell.brickMortar:SetVisible(false)
						cell.trunk:SetVisible(false)
						cell.canopy:SetVisible(false)
						cell.canopyTop:SetVisible(false)

					else
						cell.tile:SetVisible(false)
						cell.brickMortar:SetVisible(false)
						cell.trunk:SetVisible(false)
						cell.canopy:SetVisible(false)
						cell.canopyTop:SetVisible(false)
					end
				end
			end

			if feat == "ROAD" then
				cell.tile:SetAnchoredPosition(sx, sy)
				cell.brickMortar:SetAnchoredPosition(sx, sy + cell.mortarOffset)
			elseif feat == "TREE" then
				cell.tile:SetAnchoredPosition(sx, sy - 6)
				cell.trunk:SetAnchoredPosition(sx, sy - 10)
				cell.canopy:SetAnchoredPosition(sx, sy + 14)
				cell.canopyTop:SetAnchoredPosition(sx, sy + 24)
			elseif feat == "MOSS" or feat == "FLOWER" then
				cell.tile:SetAnchoredPosition(sx, sy)
			end
		end
	end

	-- 2. Render Loot Bags
	for i = 1, NUM_LOOT_BAGS do
		local bag = lootPool[i]
		if bag.active then
			bag.control:SetAnchoredPosition(bag.wx - camLeft, bag.wy - camBottom)
		end
	end

	-- 3. Render Enemies & Their Under-Foot Green HP Bars
	for i = 1, NUM_ENEMIES do
		local e = enemyPool[i]
		if e.active then
			local sx = e.wx - camLeft
			local sy = e.wy - camBottom
			e.control:SetAnchoredPosition(sx, sy)
			local ratio = Clamp(e.hp / math.max(1, e.maxHp), 0, 1)
			e.hpFill:SetSizeDelta(math.max(2, ratio * 32), 4)
			e.hpFill.imageColor = (ratio > 0.35) and Color.FromRGB(65, 225, 75) or Color.FromRGB(245, 75, 65)
		end
	end

	-- 4. Render Mage Center-Screen + Under-Foot HP Bar
	mage.control:SetAnchoredPosition(screenWidth * 0.5 + shakeX, screenHeight * 0.5 + shakeY)
	local mageHpRatio = Clamp(mage.hp / math.max(1, mage.maxHp), 0, 1)
	mage.footHpFill:SetSizeDelta(math.max(2, mageHpRatio * 32), 4)

	-- 5. Render Wizard Spellbomb Nova Ring
	if spellNovaTimer > 0 then
		spellNovaTimer = math.max(0, spellNovaTimer - dt)
		local sz = 42 + (0.35 - spellNovaTimer) * 260
		spellNovaVisual:SetSizeDelta(sz, sz)
		spellNovaVisual:SetAnchoredPosition(spellNovaX - camLeft, spellNovaY - camBottom)
		if spellNovaTimer <= 0 then
			spellNovaVisual:SetVisible(false)
		end
	end

	-- 6. Render Bullets
	for i = 1, NUM_BULLETS do
		local b = bulletPool[i]
		if b.active then
			b.control:SetAnchoredPosition(b.wx - camLeft, b.wy - camBottom)
		end
	end

	-- 7. Render Particles & Floating Damage / XP Popups
	for i = 1, NUM_PARTICLES do
		local p = particlePool[i]
		if p.active then
			p.life = p.life - dt
			if p.life <= 0 then
				p.active = false
				p.control:SetVisible(false)
			else
				p.wx = p.wx + p.vx * dt
				p.wy = p.wy + p.vy * dt
				p.control:SetAnchoredPosition(p.wx - camLeft, p.wy - camBottom)
			end
		end
	end

	for i = 1, NUM_FLOAT_TEXTS do
		local ft = floatTextPool[i]
		if ft.active then
			ft.life = ft.life - dt
			if ft.life <= 0 then
				ft.active = false
				ft.control:SetVisible(false)
			else
				ft.wy = ft.wy + 38 * dt
				ft.control:SetAnchoredPosition(ft.wx - camLeft, ft.wy - camBottom)
			end
		end
	end

	-- 8. Update HUD Bars & Boss Quest Tracker
	local scorePct = Clamp(mage.score / TARGET_BOSS_SCORE, 0, 1)
	scoreBarFill:SetSizeDelta(math.max(4, scorePct * 412), 12)
	scoreText.text = string.format("REALM FAME SCORE: %d / %d (%d%% TO BOSS)",
		mage.score, TARGET_BOSS_SCORE, math.floor(scorePct * 100))

	if bossSpawned and bossEntity and bossEntity.active then
		local bRatio = Clamp(bossEntity.hp / math.max(1, bossEntity.maxHp), 0, 1)
		bossHpFill:SetSizeDelta(math.max(4, bRatio * 412), 12)
		bossHpText.text = string.format("☠ ORYX, ARCHON OF THE MAD REALM — HP: %d / %d ☠",
			math.floor(bossEntity.hp), bossEntity.maxHp)

		-- Point Quest Arrow toward Boss if off-center
		local bdx = bossEntity.wx - mage.wx
		local bdy = bossEntity.wy - mage.wy
		local bAng = math.atan(bdy, bdx)
		questArrow:SetVisible(true)
		questArrow:SetAnchoredPosition(
			screenWidth * 0.5 + math.cos(bAng) * 210,
			screenHeight * 0.5 + math.sin(bAng) * 160
		)
		questArrow:SetLocalRotation(0, 0, math.deg(bAng) - 90)
	else
		questArrow:SetVisible(false)
	end

	if gameState == "VICTORY" then
		questBannerText.text = "★ REALM CONQUERED! YOU DEFEATED THE MAD GOD! (PRESS [R] TO NEW REALM) ★"
		questBannerText.fontColor = Color.FromRGB(115, 250, 145)
	elseif gameState == "DEFEAT" then
		questBannerText.text = "☠ YOU FELL IN THE REALM! SCORE: " .. mage.score .. " (PRESS [R] TO REBORN) ☠"
		questBannerText.fontColor = Color.FromRGB(255, 85, 85)
	elseif bossSpawned then
		questBannerText.text = "⚔ QUEST: SLAY ORYX, ARCHON OF THE MAD REALM! (FOLLOW GOLD ARROW) ⚔"
		questBannerText.fontColor = Color.FromRGB(255, 110, 95)
	else
		questBannerText.text = string.format(
			"ROAM ENDLESS REALM (X:%dm, Y:%dm) • SLAY MONSTERS TO FILL SCORE BAR & SUMMON BOSS!",
			math.floor(mage.wx / 10), math.floor(mage.wy / 10)
		)
		questBannerText.fontColor = Color.FromRGB(235, 205, 115)
	end

	mageHpFill:SetSizeDelta(math.max(4, (mage.hp / mage.maxHp) * 196), 12)
	mageHpText.text = string.format("HP: %d / %d", math.floor(mage.hp), mage.maxHp)

	local mpRatio = Clamp(mage.mp / math.max(1, mage.maxMp), 0, 1)
	mageMpFill:SetSizeDelta(math.max(4, mpRatio * 196), 12)
	mageMpText.text = string.format("MP: %d / %d [SPACE: SPELLBOMB]", math.floor(mage.mp), mage.maxMp)

	mageStatsText.text = string.format("WIZARD LV.%d  |  STAFF DMG: %d  |  AUTO-FIRE [F]: %s",
		mage.level, mage.staffDamage, autoFireEnabled and "ON" or "OFF")
end

-- ============================================================================
-- HUD BUILDER & INPUTS
-- ============================================================================

local function BuildHUD()
	hudLayer = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, root))
	Configure(hudLayer, screenWidth * 0.5, screenHeight * 0.5, screenWidth, screenHeight, "HUDLayer")

	-- Top Realm Score & Boss Health Header
	NewImage(hudLayer, "TopHudPanel", screenWidth * 0.5, screenHeight - 36, 680, 62,
		Color.FromRGBA(20, 16, 14, 225), RECT_RES, true)

	questBannerText = NewText(hudLayer, "QuestBanner", "ROAM ENDLESS REALM & FILL SCORE BAR TO SUMMON BOSS!",
		screenWidth * 0.5, screenHeight - 16, 660, 20, 12, Color.FromRGB(235, 205, 115))

	-- Score Progress Bar
	NewImage(hudLayer, "ScoreBarBg", screenWidth * 0.5, screenHeight - 38, 416, 16,
		Color.FromRGB(38, 32, 26), RECT_RES, false)
	scoreBarFill = NewImage(hudLayer, "ScoreBarFill", screenWidth * 0.5, screenHeight - 38, 4, 12,
		Color.FromRGB(175, 105, 250), RECT_RES, false)
	scoreText = NewText(hudLayer, "ScoreBarTxt", "REALM FAME SCORE: 0 / 1000 (0% TO BOSS)",
		screenWidth * 0.5, screenHeight - 38, 416, 16, 10, Color.FromRGB(255, 255, 255))

	-- Boss Health Bar Overlay (Appears when Oryx Spawns!)
	bossHpContainer = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, hudLayer))
	Configure(bossHpContainer, screenWidth * 0.5, screenHeight - 56, 420, 18, "BossHpContainer")
	NewImage(bossHpContainer, "BossBarBg", 210, 9, 416, 16, Color.FromRGB(48, 16, 20), RECT_RES, false)
	bossHpFill = NewImage(bossHpContainer, "BossBarFill", 210, 9, 412, 12, Color.FromRGB(245, 55, 65), RECT_RES, false)
	bossHpText = NewText(bossHpContainer, "BossBarTxt", "ORYX, ARCHON OF THE MAD REALM", 210, 9, 416, 16, 10, Color.FromRGB(255, 240, 200))
	bossHpContainer:SetVisible(false)

	-- Directional Quest Arrow pointing toward Boss
	questArrow = NewImage(hudLayer, "BossQuestArrow", screenWidth * 0.5, screenHeight * 0.5 + 150, 22, 26,
		Color.FromRGB(255, 215, 65), TRI_RES, false)
	questArrow:SetVisible(false)

	-- Bottom RotMG Wizard Status Dock
	NewImage(hudLayer, "BotHudPanel", screenWidth * 0.5, 32, 680, 52,
		Color.FromRGBA(20, 16, 14, 228), RECT_RES, true)

	NewImage(hudLayer, "MageHpBg", screenWidth * 0.5 - 115, 40, 200, 15, Color.FromRGB(42, 22, 22), RECT_RES, false)
	mageHpFill = NewImage(hudLayer, "MageHpFill", screenWidth * 0.5 - 115, 40, 196, 12, Color.FromRGB(75, 225, 85), RECT_RES, false)
	mageHpText = NewText(hudLayer, "MageHpTxt", "HP: 220 / 220", screenWidth * 0.5 - 115, 40, 200, 15, 10, Color.FromRGB(255, 255, 255))

	NewImage(hudLayer, "MageMpBg", screenWidth * 0.5 + 115, 40, 200, 15, Color.FromRGB(22, 28, 48), RECT_RES, false)
	mageMpFill = NewImage(hudLayer, "MageMpFill", screenWidth * 0.5 + 115, 40, 196, 12, Color.FromRGB(85, 165, 250), RECT_RES, false)
	mageMpText = NewText(hudLayer, "MageMpTxt", "MP: 120 / 120 [SPACE: SPELLBOMB]", screenWidth * 0.5 + 115, 40, 200, 15, 10, Color.FromRGB(255, 255, 255))

	mageStatsText = NewText(hudLayer, "MageStatsTxt",
		"WASD: Roam Endless Map  |  MOUSE: Aim Staff  |  SPACE/RMB/E: Cursor Spellbomb Nova  |  F: Toggle Auto-Fire",
		screenWidth * 0.5, 18, 650, 16, 10, Color.FromRGB(210, 192, 150))
end

local function ResetRealm()
	for i = 1, NUM_ENEMIES do
		enemyPool[i].active = false
		enemyPool[i].control:SetVisible(false)
	end
	for i = 1, NUM_BULLETS do
		bulletPool[i].active = false
		bulletPool[i].control:SetVisible(false)
	end
	for i = 1, NUM_LOOT_BAGS do
		lootPool[i].active = false
		lootPool[i].control:SetVisible(false)
	end

	mage.wx = 0
	mage.wy = 0
	mage.hp = 220
	mage.maxHp = 220
	mage.mp = 120
	mage.maxMp = 120
	mage.level = 1
	mage.xp = 0
	mage.xpToNext = 80
	mage.score = 0
	mage.staffDamage = 24
	mage.fireRate = 5.2

	bossSpawned = false
	bossEntity = nil
	gameState = "PLAYING"
	if bossHpContainer then
		bossHpContainer:SetVisible(false)
	end
end

local function RegisterInputs()
	local function BindHold(downEnum, upEnum, field)
		root:AddKeyEventListener(downEnum, function()
			keys[field] = true
			return true
		end)
		root:AddKeyEventListener(upEnum, function()
			keys[field] = false
			return true
		end)
	end

	BindHold(Enum.KeyEventType.KeyboardMoveForwardKeyDown, Enum.KeyEventType.KeyboardMoveForwardKeyUp, "up")
	BindHold(Enum.KeyEventType.KeyboardMoveBackwardKeyDown, Enum.KeyEventType.KeyboardMoveBackwardKeyUp, "down")
	BindHold(Enum.KeyEventType.KeyboardMoveLeftKeyDown, Enum.KeyEventType.KeyboardMoveLeftKeyUp, "left")
	BindHold(Enum.KeyEventType.KeyboardMoveRightKeyDown, Enum.KeyEventType.KeyboardMoveRightKeyUp, "right")

	-- LMB Hold to Fire Staff Bolts
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardNormalAttackKeyDown, function()
		isMouseFiring = true
		return true
	end)
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardNormalAttackKeyUp, function()
		isMouseFiring = false
		return true
	end)

	-- Toggle Auto-Fire [F] ( just like 'I' / Autofire in Realm of the Mad God!)
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardInteractKeyDown, function()
		autoFireEnabled = not autoFireEnabled
		return true
	end)

	-- Wizard Cursor Spellbomb Nova [SPACE], [RMB], or [E]
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardJumpKeyDown, function()
		CastWizardSpellbomb()
		return true
	end)
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardSprintKeyDown, function()
		CastWizardSpellbomb()
		return true
	end)
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardCharacterSkill1KeyDown, function()
		CastWizardSpellbomb()
		return true
	end)

	-- Restart Realm [R]
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardCharacterSkill3KeyDown, function()
		ResetRealm()
		return true
	end)
end

local function RefreshRootScale()
	if not root then return end
	local vw, vh = game.GetUICanvasSize()
	rootScale = math.min(vw / DESIGN_WIDTH, vh / DESIGN_HEIGHT)
	rootScale = math.max(0.35, math.min(rootScale, 2.5))
	root:SetAnchorMin(0.5, 0.5)
	root:SetAnchorMax(0.5, 0.5)
	root:SetPivot(0.5, 0.5)
	root:SetAnchoredPosition(0, 0)
	root:SetSizeDelta(DESIGN_WIDTH, DESIGN_HEIGHT)
	root:SetLocalScale(rootScale, rootScale, 1)
end

function OnStart()
	math.randomseed(1337)
	root = script.object
	if not root then return end

	screenWidth = DESIGN_WIDTH
	screenHeight = DESIGN_HEIGHT
	RefreshRootScale()
	root.disableKeyEventPassthrough = true
	root.disableCursorEventPassthrough = true
	root.showCursor = true

	worldLayer = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, root))
	Configure(worldLayer, DESIGN_WIDTH * 0.5, DESIGN_HEIGHT * 0.5, DESIGN_WIDTH, DESIGN_HEIGHT, "WorldLayer")

	BuildWorldPools()
	BuildHUD()
	RegisterInputs()

	-- Spawn initial realm monsters around the starting road crossroads
	for _ = 1, 8 do
		SpawnRealmMonster()
	end
	RenderEndlessWorldAndHUD(0.016)

	script:EnableUpdate(true)
	print("[Realm of the Mad Mage] Centered Fit-to-View Container & Center-Anchored Endless World Ready!")
end

function OnUpdate(deltaTime)
	if not mage then return end
	RefreshRootScale()
	local dt = math.min(deltaTime, 0.04)
	elapsedTime = elapsedTime + dt

	if game.GetCursorUIPos then
		local cx, cy = game.GetCursorUIPos()
		if cx and cy and (cx > 0 or cy > 0) then
			local vw, vh = game.GetUICanvasSize()
			local lx = DESIGN_WIDTH * 0.5 + (cx - vw * 0.5) / rootScale
			local ly = DESIGN_HEIGHT * 0.5 + (cy - vh * 0.5) / rootScale
			cursorX = Clamp(lx, 12, DESIGN_WIDTH - 12)
			cursorY = Clamp(ly, 12, DESIGN_HEIGHT - 12)
		end
	end

	if gameState == "PLAYING" then
		UpdateMage(dt)
		UpdateEnemiesAndLoot(dt)
		UpdateProjectiles(dt)
	end
	RenderEndlessWorldAndHUD(dt)
end

function OnDestroy()
	controls = {}
	gridCells = {}
	enemyPool = {}
	bulletPool = {}
	lootPool = {}
	floatTextPool = {}
	particlePool = {}
	mage = nil
	bossEntity = nil
end
