local CONTAINER_TEMPLATE = 1073741852
local TEXT_TEMPLATE = 1073741853
local IMAGE_TEMPLATE = 1073741854
local BUTTON_TEMPLATE = 1073741855
local RECTANGLE_RESOURCE = 100001
local CIRCLE_RESOURCE = 100002
local TRIANGLE_RESOURCE = 100003
local STAR4_RESOURCE = 100004

-- ============================================================================
-- ENDLESS KLEE RUNNER: MONDSTADT BOMB SQUAD (Genshin-Themed Endless Platformer)
-- Features:
--   • Articulated Multi-Part Chibi Klee Rig & Procedural Animation Tech:
--     (Crimson Clover Beret + White Feather Plume, Blonde Pigtails, Pointed
--     Elf Ears, Ruby Eyes, Brown Backpack + Bouncing Dodoco Tail Charm,
--     Flared Red/White Coat, Striding Boots, Skid Pose, Jump Pose,
--     Spark-Speed "Airplane Arms" Sprint, Crouch-Slide & Squash/Stretch!)
--   • Dodoco Companion & Jumpy Dumpty Bomb Blasting:
--     - Hitting a glowing Clover Mystery Cube pops out a fluffy Dodoco!
--     - Catching Dodoco doesn't stretch Klee's size — instead, Dodoco hovers
--       beside Klee and unlocks Jumpy Dumpty Bomb Blasting ([E] / [J] / Click)!
--     - Jumpy Dumpty bombs bounce across Mondstadt terrain and detonate on
--       Elemental Slimes with Pyro reactions (OVERLOADED!, VAPORIZE!, MELT!,
--       SWIRL!, BURNING!). Dodoco also shields Klee from 1 Slime hit with an
--       emergency Pyro counter-blast!
--   • Elemental Slimes (Pyro, Hydro, Anemo, Electro, Dendro, Cryo, Geo):
--     - Bouncy gelatinous squash-and-stretch bodies, vertical white oval eyes,
--       and elemental crests (flames, wings, leaf sprout, ice diamond, antenna).
--   • Mondstadt Scenery & Genshin Domain/Hypostasis Cube Blocks:
--     - Cider Lake horizon, Windrise emerald grass, rotating Mondstadt
--       Windmills, Glowing Golden Elemental Rune Cubes, Cyan Prism Cubes,
--       Sandstone Domain Cubes, and Mondstadt Stone Wind Pillars.
--   • Full Platformer Physics & Hidden Tech:
--     - Spark Meter (P-Speed), Variable Jump Hold, Apex Hang-Time, Coyote Time,
--       Jump Input Buffering, Corner Correction, Wall-Kicks, Crouch-Sliding,
--       Spring Crouch-Jump, High-Bounce Stomp Combos & Block-Bump Launches!
-- ============================================================================

local TILE = 56
local DESIGN_WIDTH = 960
local DESIGN_HEIGHT = 640
local rootScale = 1.0
local GROUND_Y = 112

-- Physics Constants (Identical Peak Platformer Physics)
local GRAVITY_RISE_HOLD = -1780
local GRAVITY_DEFAULT = -3250
local GRAVITY_APEX = -1950
local MAX_FALL_SPEED = -1050

local WALK_ACCEL = 1320
local SPRINT_ACCEL = 1680
local AIR_ACCEL = 980
local GROUND_FRICTION = 1550
local CROUCH_SLIDE_FRICTION = 420
local SKID_DECEL = 3500

local WALK_MAX_SPEED = 275
local SPRINT_MAX_SPEED = 415
local PSPEED_MAX_SPEED = 495

local BASE_JUMP_SPEED = 1040
local SPRINT_JUMP_BONUS = 155
local PSPEED_JUMP_BONUS = 225
local CROUCH_CHARGE_JUMP_SPEED = 1280
local WALL_KICK_VX = 370
local WALL_KICK_VY = 1060

local LOW_STOMP_BOUNCE = 660
local HIGH_STOMP_BOUNCE = 1150

local MAX_JUMP_HOLD_TIME = 0.16
local COYOTE_GRACE_TIME = 0.095
local JUMP_BUFFER_TIME = 0.115
local CORNER_CORRECTION_PX = 11

local PLAYER_WIDTH = 30
local PLAYER_STAND_HEIGHT = 46
local PLAYER_CROUCH_HEIGHT = 26

-- Object Pool Sizes
local NUM_PLATFORMS = 56
local NUM_ENEMIES = 16
local NUM_COINS = 18
local NUM_DODOCOS = 4
local NUM_BOMBS = 6
local NUM_PARTICLES = 24
local NUM_FLOAT_TEXTS = 14

-- Runtime Hierarchy & Pools
local root = nil
local worldLayer = nil
local inputOverlay = nil
local controls = {}

local platformPool = {}
local enemyPool = {}
local coinPool = {}
local dodocoPool = {}
local bombPool = {}
local particlePool = {}
local floatTextPool = {}
local bgClouds = {}
local bgHills = {}
local bgWindmills = {}

local nextParticleIdx = 1
local nextFloatIdx = 1
local nextDodocoIdx = 1
local nextBombIdx = 1

-- Player & Camera State
local player = nil
local cameraX = 0
local screenShakeTimer = 0
local screenShakeMag = 0
local generatedUpToX = 0
local chunkCount = 0

local score = 0
local primogems = 0
local distanceMeters = 0
local bestDistanceMeters = 0
local bestScore = 0
local stompCombo = 0

local keys = {
	left = false,
	right = false,
	up = false,
	down = false,
	jump = false,
	sprint = false,
	bomb = false
}

local jumpHoldTimer = 0
local coyoteTimer = 0
local jumpBufferTimer = 0
local sprintReleaseGrace = 0
local bombCooldown = 0
local worldTime = 0
local started = false

-- HUD References
local hudMainText = nil
local hudSubText = nil
local gameOverBanner = nil

-- Mondstadt & Genshin Elemental Palette
local PALETTE = {
	-- Mondstadt Sky, Cider Lake & Windrise Hills (Image 4)
	skyTop = Color.FromRGB(78, 162, 232),
	skyHorizon = Color.FromRGB(152, 214, 248),
	ciderLake = Color.FromRGB(56, 142, 206),
	cloud = Color.FromRGBA(255, 253, 246, 220),
	cliffFar = Color.FromRGB(108, 126, 142),
	hillFar = Color.FromRGB(74, 164, 88),
	hillNear = Color.FromRGB(102, 194, 96),
	windmillTower = Color.FromRGB(146, 138, 128),
	windmillRoof = Color.FromRGB(194, 86, 62),
	windmillSail = Color.FromRGBA(248, 240, 222, 230),

	-- Mondstadt Terrain & Genshin Domain/Hypostasis Cubes (Images 4, 5, 6)
	groundStone = Color.FromRGB(102, 114, 126),
	groundGrass = Color.FromRGB(106, 204, 88),
	sandstoneCube = Color.FromRGB(214, 188, 128),
	sandstoneInner = Color.FromRGB(178, 148, 92),
	cloverCubeGold = Color.FromRGB(246, 178, 46),
	cloverCubeGlow = Color.FromRGB(255, 236, 156),
	cubeSpent = Color.FromRGB(132, 140, 150),
	cubeSpentInner = Color.FromRGB(98, 106, 116),
	anemoPillar = Color.FromRGB(142, 156, 168),
	anemoPillarCap = Color.FromRGB(192, 204, 214),
	prismCubeCyan = Color.FromRGB(68, 208, 246),
	prismCubeInner = Color.FromRGB(158, 238, 255),

	-- Pickups & Projectiles
	primogem = Color.FromRGB(255, 216, 64),
	moraGold = Color.FromRGB(255, 228, 92),
	dodocoCream = Color.FromRGB(248, 238, 212),
	dodocoTail = Color.FromRGB(224, 188, 134),
	pyroOrange = Color.FromRGB(255, 118, 42),
	pyroGold = Color.FromRGB(255, 218, 78),

	-- Klee Character Palette (Images 1 & 2)
	kleeCrimson = Color.FromRGB(208, 54, 42),
	kleeBrightRed = Color.FromRGB(238, 72, 54),
	kleeCream = Color.FromRGB(248, 242, 228),
	kleeBlonde = Color.FromRGB(244, 218, 148),
	kleeSkin = Color.FromRGB(255, 230, 204),
	kleeBlush = Color.FromRGBA(248, 142, 132, 185),
	kleeEye = Color.FromRGB(184, 38, 32),
	kleeLeather = Color.FromRGB(92, 54, 38),
	kleePack = Color.FromRGB(124, 72, 44),
	kleeGold = Color.FromRGB(246, 204, 76)
}

-- 7 Genshin Elemental Slime Types (Image 3: Slime Paradise)
local SLIME_TYPES = {
	{
		name = "Pyro",
		reaction = "OVERLOADED!",
		body = Color.FromRGB(242, 102, 44),
		crest = Color.FromRGB(255, 204, 56),
		patrol = true
	},
	{
		name = "Hydro",
		reaction = "VAPORIZE!",
		body = Color.FromRGB(76, 194, 240),
		crest = Color.FromRGB(172, 234, 255),
		patrol = false
	},
	{
		name = "Anemo",
		reaction = "SWIRL!",
		body = Color.FromRGB(108, 230, 202),
		crest = Color.FromRGB(232, 255, 248),
		patrol = false
	},
	{
		name = "Electro",
		reaction = "OVERLOADED!",
		body = Color.FromRGB(148, 76, 214),
		crest = Color.FromRGB(250, 214, 72),
		patrol = true
	},
	{
		name = "Dendro",
		reaction = "BURNING!",
		body = Color.FromRGB(122, 198, 78),
		crest = Color.FromRGB(74, 148, 52),
		patrol = false
	},
	{
		name = "Cryo",
		reaction = "MELT!",
		body = Color.FromRGB(124, 204, 244),
		crest = Color.FromRGB(228, 248, 255),
		patrol = true
	},
	{
		name = "Geo",
		reaction = "CRYSTALLIZE!",
		body = Color.FromRGB(78, 70, 64),
		crest = Color.FromRGB(238, 188, 62),
		patrol = true
	}
}

-- ============================================================================
-- UI HELPERS
-- ============================================================================

local function Clamp(v, lo, hi)
	if v < lo then return lo end
	if v > hi then return hi end
	return v
end

local function Lerp(a, b, t)
	return a + (b - a) * t
end

local function Remember(control)
	if not control then return nil end
	controls[#controls + 1] = control
	control:SetAsLastSibling()
	return control
end

local function Configure(control, x, y, width, height, name)
	control.name = name
	control:SetAnchorMin(0, 0)
	control:SetAnchorMax(0, 0)
	control:SetPivot(0.5, 0.5)
	control:SetAnchoredPosition(x, y)
	control:SetSizeDelta(width, height)
	control:SetVisible(true)
	return control
end

local function NewImage(parent, name, x, y, width, height, color, resource, softEdge)
	local image = Remember(game.InstantiateClientUIControl(IMAGE_TEMPLATE, parent))
	if not image then return nil end
	Configure(image, x, y, width, height, name)
	image:SetImage(Enum.ImageSource.StaticReference, resource or RECTANGLE_RESOURCE)
	image.imageType = Enum.ImageType.Stretch
	image.imageColor = color
	local imageScript = image:GetScriptByPath("Image_Control")
	if imageScript then imageScript:EnableUpdate(false) end
	if softEdge then
		image.enableSoftEdge = true
		image:SetSoftEdgeWidth(4, 4)
	end
	return image
end

local function NewText(parent, name, text, x, y, width, height, size, color, bgColor)
	local label = Remember(game.InstantiateClientUIControl(TEXT_TEMPLATE, parent))
	if not label then return nil end
	Configure(label, x, y, width, height, name)
	label.text = text
	label.fontSize = size
	label.fontColor = color or Color.FromRGB(255, 255, 255)
	label.bgColor = bgColor or Color.FromRGBA(0, 0, 0, 0)
	label.adaptiveFontSize = false
	label.horizontalAlignment = Enum.TextHorizontalAlignment.Middle
	label.verticalAlignment = Enum.TextVerticalAlignment.Middle
	return label
end

local function SpawnFloatingText(wx, wy, text, color, size)
	local ft = floatTextPool[nextFloatIdx]
	nextFloatIdx = (nextFloatIdx % NUM_FLOAT_TEXTS) + 1
	if not ft then return end
	ft.active = true
	ft.wx = wx
	ft.wy = wy
	ft.life = 0.78
	ft.control.text = text
	ft.control.fontColor = color or Color.FromRGB(255, 235, 85)
	ft.control.fontSize = size or 13
	ft.control:SetVisible(true)
end

local function SpawnParticle(wx, wy, vx, vy, size, color, life, resource)
	local p = particlePool[nextParticleIdx]
	nextParticleIdx = (nextParticleIdx % NUM_PARTICLES) + 1
	if not p then return end
	p.active = true
	p.wx = wx
	p.wy = wy
	p.vx = vx
	p.vy = vy
	p.size = size
	p.life = life or 0.35
	p.maxLife = p.life
	p.control:SetImage(Enum.ImageSource.StaticReference, resource or CIRCLE_RESOURCE)
	p.control.imageColor = color
	p.control:SetSizeDelta(size, size)
	p.control:SetVisible(true)
end

local function AddScreenShake(duration, magnitude)
	screenShakeTimer = math.max(screenShakeTimer, duration)
	screenShakeMag = math.max(screenShakeMag, magnitude)
end

-- ============================================================================
-- ARTICULATED CHIBI KLEE RIG & DODOCO COMPANION (Images 1 & 2)
-- ============================================================================

local function BuildKlee()
	local rigW = 68
	local rigH = 68
	local kleeRoot = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, worldLayer))
	Configure(kleeRoot, 0, 0, rigW, rigH, "KleeRig")
	kleeRoot:SetPivot(0.5, 0)

	-- 1. Ground Shadow
	local shadow = NewImage(kleeRoot, "Shadow", 34, 4, 28, 7, Color.FromRGBA(0, 0, 0, 95), CIRCLE_RESOURCE, false)

	-- 2. Back Arm, White Sleeve Cuff & Upturned Brown Glove (Spreads wide for Helicopter Run!)
	local armB = NewImage(kleeRoot, "ArmBack", 24, 27, 13, 7, PALETTE.kleeCrimson, RECTANGLE_RESOURCE, true)
	local cuffB = NewImage(kleeRoot, "CuffBack", 18, 27, 5, 8, PALETTE.kleeCream, RECTANGLE_RESOURCE, true)
	local gloveB = NewImage(kleeRoot, "GloveBack", 14, 29, 6, 9, PALETTE.kleeLeather, CIRCLE_RESOURCE, false)

	-- 3. Back Pigtail & Wiggling Brown Leather Backpack + Swinging Dodoco Plush Charm (Image 3)
	local pigtailB = NewImage(kleeRoot, "PigtailBack", 21, 34, 10, 12, PALETTE.kleeBlonde, CIRCLE_RESOURCE, false)
	local backpack = NewImage(kleeRoot, "Backpack", 21, 25, 14, 17, PALETTE.kleePack, RECTANGLE_RESOURCE, true)
	local backpackFlap = NewImage(kleeRoot, "BackpackFlap", 21, 30, 14, 6, PALETTE.kleeLeather, RECTANGLE_RESOURCE, true)
	local backpackBuckle = NewImage(kleeRoot, "BackpackBuckle", 20, 26, 5, 5, PALETTE.kleeGold, STAR4_RESOURCE, false)
	local dodocoCharmTail = NewImage(kleeRoot, "DodocoCharmTail", 10, 16, 9, 7, PALETTE.dodocoTail, CIRCLE_RESOURCE, false)
	local dodocoCharm = NewImage(kleeRoot, "DodocoCharm", 14, 19, 11, 11, PALETTE.dodocoCream, CIRCLE_RESOURCE, false)
	local dodocoCharmEar = NewImage(kleeRoot, "DodocoCharmEar", 14, 25, 5, 7, PALETTE.dodocoCream, CIRCLE_RESOURCE, false)

	-- 4. Back Leg & Dark Brown Boot (High back-kick when running, tucked in front when cannonball jumping!)
	local legB = NewImage(kleeRoot, "LegBack", 30, 13, 7, 11, PALETTE.kleeSkin, RECTANGLE_RESOURCE, false)
	local bootB = NewImage(kleeRoot, "BootBack", 30, 7, 11, 9, PALETTE.kleeLeather, RECTANGLE_RESOURCE, true)

	-- 5. Klee's Flared Crimson & White Coat + Pleated White Skirt + Fluffy Scarf
	local skirtFrill = NewImage(kleeRoot, "SkirtFrill", 34, 16, 25, 8, PALETTE.kleeCream, RECTANGLE_RESOURCE, true)
	local coat = NewImage(kleeRoot, "Coat", 34, 23, 23, 16, PALETTE.kleeCrimson, RECTANGLE_RESOURCE, true)
	local coatTrim = NewImage(kleeRoot, "CoatTrim", 34, 22, 10, 13, PALETTE.kleeCream, RECTANGLE_RESOURCE, true)
	local scarf = NewImage(kleeRoot, "Scarf", 34, 30, 19, 6, PALETTE.kleeCream, RECTANGLE_RESOURCE, true)
	local cloverBrooch = NewImage(kleeRoot, "CloverBrooch", 36, 24, 7, 7, PALETTE.kleeGold, STAR4_RESOURCE, false)

	-- 6. Front Leg & Dark Brown Boot
	local legF = NewImage(kleeRoot, "LegFront", 37, 13, 7, 11, PALETTE.kleeSkin, RECTANGLE_RESOURCE, false)
	local bootF = NewImage(kleeRoot, "BootFront", 38, 7, 11, 9, PALETTE.kleeLeather, RECTANGLE_RESOURCE, true)

	-- 7. Chibi Head, Blonde Locks, Pointed Elf Ear, Ruby Eyes, "> <" Cannonball Wink & Blush
	local head = NewImage(kleeRoot, "Head", 34, 40, 22, 19, PALETTE.kleeSkin, CIRCLE_RESOURCE, false)
	local hairTop = NewImage(kleeRoot, "HairTop", 34, 45, 23, 10, PALETTE.kleeBlonde, CIRCLE_RESOURCE, false)
	local hairSide = NewImage(kleeRoot, "HairSide", 28, 36, 8, 14, PALETTE.kleeBlonde, RECTANGLE_RESOURCE, true)
	local elfEar = NewImage(kleeRoot, "ElfEar", 24, 39, 10, 5, PALETTE.kleeSkin, TRIANGLE_RESOURCE, false)
	elfEar:SetLocalRotation(0, 0, 90)
	local eye = NewImage(kleeRoot, "RubyEye", 39, 39, 5, 6, PALETTE.kleeEye, CIRCLE_RESOURCE, false)
	local eyeShine = NewImage(kleeRoot, "EyeShine", 40, 41, 2, 2, Color.FromRGB(255, 255, 255), CIRCLE_RESOURCE, false)
	-- Squeezed "> <" happy chevron eye for Klee's Cannonball Bomb Jump Tuck (Image 4)!
	local winkTop = NewImage(kleeRoot, "WinkTop", 39, 40, 7, 2, PALETTE.kleeLeather, RECTANGLE_RESOURCE, false)
	local winkBot = NewImage(kleeRoot, "WinkBot", 39, 38, 7, 2, PALETTE.kleeLeather, RECTANGLE_RESOURCE, false)
	winkTop:SetVisible(false)
	winkBot:SetVisible(false)
	local blush = NewImage(kleeRoot, "Blush", 38, 35, 5, 3, PALETTE.kleeBlush, CIRCLE_RESOURCE, false)

	-- 8. Iconic Crimson Klee Beret + Clover Emblem + White Feather Plume
	local beretDome = NewImage(kleeRoot, "BeretDome", 33, 49, 26, 12, PALETTE.kleeCrimson, CIRCLE_RESOURCE, false)
	local beretBrim = NewImage(kleeRoot, "BeretBrim", 35, 45, 22, 4, PALETTE.kleeLeather, RECTANGLE_RESOURCE, true)
	local beretClover = NewImage(kleeRoot, "BeretClover", 38, 50, 8, 8, PALETTE.kleeCream, STAR4_RESOURCE, false)
	local featherPlume = NewImage(kleeRoot, "FeatherPlume", 25, 53, 6, 12, PALETTE.kleeCream, TRIANGLE_RESOURCE, false)
	featherPlume:SetLocalRotation(0, 0, 22)

	-- 9. Front Arm, White Sleeve Cuff & Upturned Brown Glove (Spreads wide OR hugs knees in Cannonball!)
	local armF = NewImage(kleeRoot, "ArmFront", 44, 27, 13, 7, PALETTE.kleeCrimson, RECTANGLE_RESOURCE, true)
	local cuffF = NewImage(kleeRoot, "CuffFront", 50, 27, 5, 8, PALETTE.kleeCream, RECTANGLE_RESOURCE, true)
	local gloveF = NewImage(kleeRoot, "GloveFront", 54, 29, 6, 9, PALETTE.kleeLeather, CIRCLE_RESOURCE, false)

	-- 10. Floating Dodoco Companion (Visible when Klee has Dodoco Power-Up!)
	local petRoot = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, kleeRoot))
	Configure(petRoot, 10, 48, 24, 26, "DodocoBuddy")
	NewImage(petRoot, "DodocoTail", 6, 8, 10, 8, PALETTE.dodocoTail, CIRCLE_RESOURCE, false)
	NewImage(petRoot, "DodocoBody", 12, 11, 16, 15, PALETTE.dodocoCream, CIRCLE_RESOURCE, false)
	NewImage(petRoot, "DodocoEarL", 9, 21, 4, 9, PALETTE.dodocoCream, CIRCLE_RESOURCE, false)
	NewImage(petRoot, "DodocoEarR", 15, 21, 4, 9, PALETTE.dodocoCream, CIRCLE_RESOURCE, false)
	NewImage(petRoot, "DodocoHat", 12, 18, 11, 5, PALETTE.kleeCrimson, CIRCLE_RESOURCE, false)
	NewImage(petRoot, "DodocoEye", 15, 12, 2, 3, PALETTE.kleeLeather, CIRCLE_RESOURCE, false)
	petRoot:SetVisible(false)

	return {
		control = kleeRoot,
		shadow = shadow,
		pigtailB = pigtailB,
		backpack = backpack,
		backpackFlap = backpackFlap,
		backpackBuckle = backpackBuckle,
		dodocoCharm = dodocoCharm,
		dodocoCharmEar = dodocoCharmEar,
		dodocoCharmTail = dodocoCharmTail,
		armB = armB,
		cuffB = cuffB,
		gloveB = gloveB,
		legB = legB,
		bootB = bootB,
		skirtFrill = skirtFrill,
		coat = coat,
		coatTrim = coatTrim,
		scarf = scarf,
		cloverBrooch = cloverBrooch,
		legF = legF,
		bootF = bootF,
		head = head,
		hairTop = hairTop,
		hairSide = hairSide,
		elfEar = elfEar,
		eye = eye,
		eyeShine = eyeShine,
		winkTop = winkTop,
		winkBot = winkBot,
		blush = blush,
		beretDome = beretDome,
		beretBrim = beretBrim,
		beretClover = beretClover,
		featherPlume = featherPlume,
		armF = armF,
		cuffF = cuffF,
		gloveF = gloveF,
		petRoot = petRoot,

		x = 3.5 * TILE,
		y = GROUND_Y,
		width = PLAYER_WIDTH,
		height = PLAYER_STAND_HEIGHT,
		velocityX = 0,
		velocityY = 0,
		grounded = true,
		facing = 1,
		crouching = false,
		crouchChargeTimer = 0,
		skidding = false,
		wallSlideDir = 0,
		pMeter = 0,       -- 0.0 to 1.0 (Full at 1.0 = Spark-Speed!)
		hasDodoco = false,-- Dodoco Bomb Squad state (No height growth! Unlocks Bomb Blasting!)
		throwAnimTimer = 0,
		invulnTimer = 0,
		animPhase = 0,
		squashX = 1.0,
		squashY = 1.0,
		dead = false,
		deathTimer = 0,

		-- Unity DynamicBone Secondary Motion State (2-Link Chain: Back -> Backpack -> Dodoco Charm)
		prevWorldVelY = 0,
		packBoneY = 0,
		packBoneVY = 0,
		charmBoneY = 0,
		charmBoneVY = 0
	}
end

local function AnimateKleeRig(dt)
	if not player then return end
	local f = player.facing
	local cx = 34

	-- Smoothly recover squash & stretch toward 1.0 (anchored at Klee's boots on the ground!)
	player.squashX = Lerp(player.squashX, 1.0, math.min(1, dt * 14))
	player.squashY = Lerp(player.squashY, 1.0, math.min(1, dt * 14))
	player.control:SetLocalScale(player.squashX, player.squashY, 1)
	player.shadow:SetVisible(player.grounded and not player.dead)

	-- Invulnerability flash or Dodoco Pyro empowerment tint
	if player.invulnTimer > 0 then
		local blink = (math.floor(player.invulnTimer * 20) % 2 == 0)
		local col = blink and PALETTE.kleeCrimson or PALETTE.pyroGold
		player.coat.imageColor = col
		player.beretDome.imageColor = col
	else
		local coatCol = player.hasDodoco and PALETTE.kleeBrightRed or PALETTE.kleeCrimson
		player.coat.imageColor = coatCol
		player.armF.imageColor = coatCol
		player.armB.imageColor = coatCol
		player.beretDome.imageColor = coatCol
	end

	-- Advance stride phase proportional to speed
	local absVX = math.abs(player.velocityX)
	local isRunning = player.grounded and absVX > 15 and not player.crouching and not player.skidding and not player.dead
	local speedRatio = Clamp(absVX / SPRINT_MAX_SPEED, 0, 1.25)

	if isRunning then
		player.animPhase = player.animPhase + dt * (8.2 + speedRatio * 12.5)
	else
		player.animPhase = player.animPhase + dt * 3.6
	end

	-- Detect "Cannonball Bomb Grouping" Jump State on the way down (Image 4!)
	local isAirborne = not player.grounded and not player.dead
	local isCannonballJump = isAirborne and (player.velocityY <= 140)

	local stride = 0
	local kneeLiftF = 0
	local kneeLiftB = 0
	local bodyBob = 0
	local bodyTilt = 0
	local crouchDrop = player.crouching and -10 or 0

	local s = math.sin(player.animPhase)
	local c = math.cos(player.animPhase)

	if player.dead then
		bodyBob = 4
		bodyTilt = math.sin(player.deathTimer * 18) * 14
		stride = 8
	elseif isCannonballJump then
		-- Image 4: Compact Cannonball Bomb Tuck on the way down!
		-- Body reclines slightly backward while legs & boots group tightly into her chest!
		bodyBob = 4
		bodyTilt = f * 18
	elseif isAirborne then
		-- Rising Hop Pose!
		stride = 6
		kneeLiftF = 6
		kneeLiftB = 2
		bodyBob = 2
		bodyTilt = -f * 7
	elseif player.crouching then
		stride = 4
		kneeLiftF = 3
		kneeLiftB = 3
		bodyTilt = -f * 8
	elseif player.skidding then
		stride = -6
		bodyTilt = f * 14
		bodyBob = -2
	elseif isRunning then
		-- Bouncy Chibi Run Stride (Images 1 & 3)
		local amp = Clamp(absVX / WALK_MAX_SPEED, 0.55, 1.35)
		stride = s * 10.5 * amp
		kneeLiftF = math.max(0, c) * 6.5 * amp
		kneeLiftB = math.max(0, -c) * 9.5 * amp -- High cute back-heel kick toward the backpack!
		-- Smooth footstep vertical oscillation (2 steps per stride cycle)
		bodyBob = (1.0 - math.cos(player.animPhase * 2.0)) * 0.5 * 3.0 * amp
		bodyTilt = -f * Clamp(speedRatio, 0.2, 1.0) * 8
	else
		bodyBob = math.sin(player.animPhase) * 1.2
	end

	player.control:SetLocalRotation(0, 0, bodyTilt)

	-- Torso, Coat & Pleated Skirt
	local backMotionY = bodyBob + crouchDrop * 0.65
	local torsoY = 23 + backMotionY
	player.coat:SetAnchoredPosition(cx, torsoY)
	player.coatTrim:SetAnchoredPosition(cx + f * 2, torsoY - 1)
	player.skirtFrill:SetAnchoredPosition(cx, torsoY - 7 + (isCannonballJump and 3 or 0))
	player.scarf:SetAnchoredPosition(cx + f * 1, torsoY + 7)
	player.cloverBrooch:SetAnchoredPosition(cx + f * 3, torsoY + 2)

	-- ========================================================================
	-- UNITY DYNAMIC BONE SOLVER (Delayed Energy Transfer Chain)
	-- Link 1: Klee's Back (backMotionY + world jump velocity) -> Backpack Bone
	-- Link 2: Backpack Bone -> Dodoco Plush Charm, Pigtails & Feather Plume
	-- ========================================================================
	local stepDt = Clamp(dt, 0.004, 0.04)
	local worldVelDeltaY = player.velocityY - (player.prevWorldVelY or 0)
	player.prevWorldVelY = player.velocityY

	-- Inertial impulse from world vertical acceleration:
	-- • Jump takeoff (worldVelDeltaY > 0): backpack lags behind for ~2 frames, then springs up
	-- • Jump apex (worldVelDeltaY < 0 while slowing at top): backpack retains upward momentum and rises
	-- • Landing impact (worldVelDeltaY > 0 when stopping): backpack dips down for ~2 frames, then settles
	player.packBoneVY = (player.packBoneVY or 0) - worldVelDeltaY * 0.042
	local airTrailOffset = isAirborne and Clamp(-player.velocityY * 0.0022, -2.0, 2.0) or 0
	local targetPackY = backMotionY + airTrailOffset

	-- Damped Spring-Mass step (Natural freq ~13.2 rad/s -> ~2-3 frame phase lag behind Klee's back!)
	local packSpringAccel = (targetPackY - (player.packBoneY or 0)) * 175 - player.packBoneVY * 14.5
	player.packBoneVY = player.packBoneVY + packSpringAccel * stepDt
	player.packBoneY = (player.packBoneY or 0) + player.packBoneVY * stepDt
	-- Clamp relative displacement so the backpack stays attached to her shoulders
	player.packBoneY = Clamp(player.packBoneY, backMotionY - 3.6, backMotionY + 3.6)

	-- Link 2: Dodoco Charm Bone trails the Backpack Bone by another ~2 frames!
	player.charmBoneVY = (player.charmBoneVY or 0) - worldVelDeltaY * 0.052
	local charmSpringAccel = (player.packBoneY - (player.charmBoneY or 0)) * 135 - player.charmBoneVY * 11.5
	player.charmBoneVY = player.charmBoneVY + charmSpringAccel * stepDt
	player.charmBoneY = (player.charmBoneY or 0) + player.charmBoneVY * stepDt
	player.charmBoneY = Clamp(player.charmBoneY, player.packBoneY - 4.2, player.packBoneY + 4.2)

	-- Subtle pitch & horizontal follow-through derived directly from the delayed bone velocity
	local packRelY = player.packBoneY - backMotionY
	local charmRelY = player.charmBoneY - player.packBoneY
	local packTilt = f * (Clamp(-player.packBoneVY * 0.16, -7.5, 7.5) + (isRunning and 5 or 0))
	local packSwayX = -f * Clamp(-packRelY * 0.35, -1.4, 1.4)

	local packX = cx - f * 11 + packSwayX
	local packY = 25 + player.packBoneY
	player.backpack:SetAnchoredPosition(packX, packY)
	player.backpack:SetLocalRotation(0, 0, packTilt)
	player.backpackFlap:SetAnchoredPosition(packX, packY + 5)
	player.backpackFlap:SetLocalRotation(0, 0, packTilt)
	player.backpackBuckle:SetAnchoredPosition(packX - f * 1, packY + 1)

	-- Dodoco Plush Charm follows the backpack with secondary chain delay
	local charmArcX = packX - f * (6 + Clamp(-charmRelY * 0.7, -1.5, 3.2))
	local charmArcY = 19 + player.charmBoneY
	local charmTilt = f * Clamp(-player.charmBoneVY * 0.28, -18, 18)
	player.dodocoCharm:SetAnchoredPosition(charmArcX, charmArcY)
	player.dodocoCharmEar:SetAnchoredPosition(charmArcX, charmArcY + 6)
	player.dodocoCharmEar:SetLocalRotation(0, 0, charmTilt)
	player.dodocoCharmTail:SetAnchoredPosition(charmArcX - f * 4, charmArcY - 3 + charmRelY * 0.5)

	-- Head, Blonde Pigtails, Elf Ear, Ruby Eyes vs "> <" Cannonball Wink (Image 4)
	local headY = 40 + bodyBob + crouchDrop - (isCannonballJump and 2 or 0)
	local headX = cx + f * 1
	player.head:SetAnchoredPosition(headX, headY)
	player.hairTop:SetAnchoredPosition(headX, headY + 5)
	player.hairSide:SetAnchoredPosition(headX - f * 5, headY - 4)
	player.pigtailB:SetAnchoredPosition(headX - f * 12, 35 + player.charmBoneY + crouchDrop * 0.35)
	player.pigtailB:SetLocalRotation(0, 0, f * (12 + Clamp(-player.charmBoneVY * 0.22, -10, 14)))
	player.elfEar:SetAnchoredPosition(headX - f * 9, headY - 1)
	player.elfEar:SetLocalRotation(0, 0, f == 1 and 90 or -90)
	player.blush:SetAnchoredPosition(headX + f * 4, headY - 5)

	if isCannonballJump or player.dead then
		-- Adorable "> <" Squeezed Happy Cannonball Eyes (Image 4)!
		player.eye:SetVisible(false)
		player.eyeShine:SetVisible(false)
		player.winkTop:SetVisible(true)
		player.winkBot:SetVisible(true)
		player.winkTop:SetAnchoredPosition(headX + f * 5, headY + 0.5)
		player.winkBot:SetAnchoredPosition(headX + f * 5, headY - 2.0)
		player.winkTop:SetLocalRotation(0, 0, -f * 26)
		player.winkBot:SetLocalRotation(0, 0, f * 26)
	else
		player.eye:SetVisible(true)
		player.eyeShine:SetVisible(true)
		player.winkTop:SetVisible(false)
		player.winkBot:SetVisible(false)
		player.eye:SetAnchoredPosition(headX + f * 5, headY - 1)
		player.eyeShine:SetAnchoredPosition(headX + f * 6, headY + 1)
	end

	local hatBob = bodyBob * 1.05 + packRelY * 0.35
	local hatY = 49 + hatBob + crouchDrop - (isCannonballJump and 2 or 0)
	player.beretDome:SetAnchoredPosition(headX - f * 1, hatY)
	player.beretBrim:SetAnchoredPosition(headX + f * 1, hatY - 4)
	player.beretClover:SetAnchoredPosition(headX + f * 4, hatY + 1)
	player.featherPlume:SetAnchoredPosition(headX - f * 9, hatY + 4 + charmRelY * 0.3)
	player.featherPlume:SetLocalRotation(0, 0, f * (22 + Clamp(-player.charmBoneVY * 0.18, -8, 10)))

	-- Articulated Legs & Boots (Cannonball Bomb Tuck vs High-Kick Helicopter Run!)
	if isCannonballJump then
		-- Image 4: Both knees & brown boots tucked tightly together up against her tummy!
		player.legF:SetAnchoredPosition(cx + f * 6, torsoY - 2)
		player.bootF:SetAnchoredPosition(cx + f * 11, torsoY - 4)
		player.legF:SetLocalRotation(0, 0, f * 62)
		player.bootF:SetLocalRotation(0, 0, f * 48)

		player.legB:SetAnchoredPosition(cx + f * 3, torsoY - 4)
		player.bootB:SetAnchoredPosition(cx + f * 8, torsoY - 6)
		player.legB:SetLocalRotation(0, 0, f * 58)
		player.bootB:SetLocalRotation(0, 0, f * 44)
	elseif isRunning then
		-- Images 1 & 3: Energetic chibi stride where the back boot kicks up high behind her!
		local legFX = cx + f * (2 + stride)
		local legBX = cx + f * (-2 - stride)
		local backKickLift = (stride > 0) and (stride * 0.65) or 0
		local frontKickLift = (stride < 0) and (-stride * 0.65) or 0

		player.legF:SetAnchoredPosition(legFX, 13 + kneeLiftF * 0.5 + frontKickLift * 0.4)
		player.bootF:SetAnchoredPosition(legFX + f * 1, 7 + kneeLiftF + frontKickLift)
		player.legB:SetAnchoredPosition(legBX, 13 + kneeLiftB * 0.5 + backKickLift * 0.4)
		player.bootB:SetAnchoredPosition(legBX - f * 1, 7 + kneeLiftB + backKickLift)

		player.legF:SetLocalRotation(0, 0, -f * stride * 3.1)
		player.bootF:SetLocalRotation(0, 0, -f * stride * 2.4)
		player.legB:SetLocalRotation(0, 0, f * stride * 3.1)
		player.bootB:SetLocalRotation(0, 0, f * stride * 2.4)
	else
		local legFX = cx + f * (2 + stride)
		local legBX = cx + f * (-2 - stride)
		player.legF:SetAnchoredPosition(legFX, 13 + kneeLiftF * 0.6 + crouchDrop * 0.2)
		player.bootF:SetAnchoredPosition(legFX + f * 2, 7 + kneeLiftF + crouchDrop * 0.1)
		player.legB:SetAnchoredPosition(legBX, 13 + kneeLiftB * 0.6 + crouchDrop * 0.2)
		player.bootB:SetAnchoredPosition(legBX + f * 2, 7 + kneeLiftB + crouchDrop * 0.1)

		player.legF:SetLocalRotation(0, 0, -f * stride * 2.2)
		player.bootF:SetLocalRotation(0, 0, -f * stride * 1.6)
		player.legB:SetLocalRotation(0, 0, f * stride * 2.2)
		player.bootB:SetLocalRotation(0, 0, f * stride * 1.6)
	end

	-- Articulated Arms, White Sleeve Cuffs & Gloves
	if player.throwAnimTimer > 0 then
		-- Jumpy Dumpty Throw Follow-Through!
		player.throwAnimTimer = math.max(0, player.throwAnimTimer - dt)
		player.armF:SetAnchoredPosition(cx + f * 11, torsoY + 5)
		player.cuffF:SetAnchoredPosition(cx + f * 16, torsoY + 7)
		player.gloveF:SetAnchoredPosition(cx + f * 19, torsoY + 9)
		player.armF:SetLocalRotation(0, 0, f * 22)
		player.cuffF:SetLocalRotation(0, 0, f * 22)

		player.armB:SetAnchoredPosition(cx - f * 10, torsoY + 1)
		player.cuffB:SetAnchoredPosition(cx - f * 15, torsoY - 1)
		player.gloveB:SetAnchoredPosition(cx - f * 18, torsoY - 2)
		player.armB:SetLocalRotation(0, 0, f * 18)
		player.cuffB:SetLocalRotation(0, 0, f * 18)

	elseif isCannonballJump then
		-- Image 4: Arms wrap forward hugging her tucked knees & boots in a "Cannonball Bomb"!
		player.armF:SetAnchoredPosition(cx + f * 5, torsoY + 1)
		player.cuffF:SetAnchoredPosition(cx + f * 9, torsoY - 1)
		player.gloveF:SetAnchoredPosition(cx + f * 11, torsoY - 2)
		player.armF:SetLocalRotation(0, 0, -f * 24)
		player.cuffF:SetLocalRotation(0, 0, -f * 24)

		player.armB:SetAnchoredPosition(cx + f * 3, torsoY + 3)
		player.cuffB:SetAnchoredPosition(cx + f * 7, torsoY + 1)
		player.gloveB:SetAnchoredPosition(cx + f * 9, torsoY)
		player.armB:SetLocalRotation(0, 0, -f * 18)
		player.cuffB:SetLocalRotation(0, 0, -f * 18)

	elseif isAirborne then
		-- Rising Jump: Joyful cheering arms raised high!
		player.armF:SetAnchoredPosition(cx + f * 9, torsoY + 8)
		player.cuffF:SetAnchoredPosition(cx + f * 13, torsoY + 12)
		player.gloveF:SetAnchoredPosition(cx + f * 15, torsoY + 15)
		player.armF:SetLocalRotation(0, 0, f * 42)
		player.cuffF:SetLocalRotation(0, 0, f * 42)

		player.armB:SetAnchoredPosition(cx - f * 9, torsoY + 7)
		player.cuffB:SetAnchoredPosition(cx - f * 13, torsoY + 11)
		player.gloveB:SetAnchoredPosition(cx - f * 15, torsoY + 14)
		player.armB:SetLocalRotation(0, 0, -f * 42)
		player.cuffB:SetLocalRotation(0, 0, -f * 42)

	elseif isRunning then
		-- Images 1 & 2: Iconic Klee Helicopter / Airplane Wing Arms Spread Wide to BOTH Sides!
		-- One arm stretches out in front (+f), one arm stretches out behind (-f) with upturned palms,
		-- banking/tilting playfully up and down like a little airplane as she runs!
		local wingBank = s * 2.6
		local wingAngle = s * 11
		local armY = torsoY + 3

		-- Front Wing Arm (+f side) with upturned hand
		player.armF:SetAnchoredPosition(cx + f * 12, armY + wingBank)
		player.cuffF:SetAnchoredPosition(cx + f * 18, armY + wingBank * 1.3)
		player.gloveF:SetAnchoredPosition(cx + f * 22, armY + 2.5 + wingBank * 1.5)
		player.armF:SetLocalRotation(0, 0, f * wingAngle)
		player.cuffF:SetLocalRotation(0, 0, f * wingAngle)

		-- Back Wing Arm (-f side) with upturned hand
		player.armB:SetAnchoredPosition(cx - f * 12, armY - wingBank)
		player.cuffB:SetAnchoredPosition(cx - f * 18, armY - wingBank * 1.3)
		player.gloveB:SetAnchoredPosition(cx - f * 22, armY + 2.5 - wingBank * 1.5)
		player.armB:SetLocalRotation(0, 0, f * wingAngle)
		player.cuffB:SetLocalRotation(0, 0, f * wingAngle)

	else
		-- Cute Idle / Crouch / Skid Pose (Arms slightly out at her sides)
		local idleBob = math.sin(player.animPhase) * 1.0
		player.armF:SetAnchoredPosition(cx + f * 8, torsoY - 1 + idleBob)
		player.cuffF:SetAnchoredPosition(cx + f * 10, torsoY - 5 + idleBob)
		player.gloveF:SetAnchoredPosition(cx + f * 11, torsoY - 8 + idleBob)
		player.armF:SetLocalRotation(0, 0, -f * 58)
		player.cuffF:SetLocalRotation(0, 0, -f * 58)

		player.armB:SetAnchoredPosition(cx - f * 8, torsoY - 1 - idleBob)
		player.cuffB:SetAnchoredPosition(cx - f * 10, torsoY - 5 - idleBob)
		player.gloveB:SetAnchoredPosition(cx - f * 11, torsoY - 8 - idleBob)
		player.armB:SetLocalRotation(0, 0, f * 58)
		player.cuffB:SetLocalRotation(0, 0, f * 58)
	end

	-- Floating Dodoco Companion Orbit (when Dodoco Bomb Squad mode is active!)
	if player.hasDodoco and not player.dead then
		player.petRoot:SetVisible(true)
		local hoverY = headY + 10 + math.sin(worldTime * 5.5) * 4.5
		local hoverX = cx - f * 18 + math.cos(worldTime * 3.2) * 2.5
		player.petRoot:SetAnchoredPosition(hoverX, hoverY)
	else
		player.petRoot:SetVisible(false)
	end
end

-- ============================================================================
-- WORLD OBJECT POOLS: MONDSTADT SCENERY, GENSHIN CUBES, SLIMES & JUMPY DUMPTY
-- ============================================================================

local function BuildWorldPools()
	platformPool = {}
	enemyPool = {}
	coinPool = {}
	dodocoPool = {}
	bombPool = {}
	particlePool = {}
	floatTextPool = {}
	bgClouds = {}
	bgHills = {}
	bgWindmills = {}

	-- 1. Uniform Mondstadt Sky Blue Backdrop (Single clean blue sky color)
	NewImage(worldLayer, "SkyBackdrop", DESIGN_WIDTH * 0.5, DESIGN_HEIGHT * 0.5,
		DESIGN_WIDTH + 400, DESIGN_HEIGHT + 400, PALETTE.skyTop, RECTANGLE_RESOURCE, false)

	-- 2. Parallax Starfell Cliffs, Windrise Hills, Mondstadt Windmills & Clouds
	for i = 1, 6 do
		local hill = NewImage(worldLayer, "BgHill_" .. i, (i - 1) * 240, GROUND_Y + 34,
			200, 105, (i % 2 == 0) and PALETTE.hillNear or PALETTE.hillFar, CIRCLE_RESOURCE, true)
		bgHills[i] = { control = hill, offsetX = (i - 1) * 260 }
	end

	for i = 1, 3 do
		local wmRoot = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, worldLayer))
		Configure(wmRoot, (i - 1) * 460, GROUND_Y + 74, 90, 140, "MondstadtWindmill_" .. i)
		NewImage(wmRoot, "Tower", 45, 48, 26, 86, PALETTE.windmillTower, RECTANGLE_RESOURCE, false)
		NewImage(wmRoot, "Roof", 45, 98, 34, 24, PALETTE.windmillRoof, TRIANGLE_RESOURCE, false)
		local hub = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, wmRoot))
		Configure(hub, 45, 86, 80, 80, "WindmillBlades_" .. i)
		NewImage(hub, "BladeV", 40, 40, 8, 76, PALETTE.windmillSail, RECTANGLE_RESOURCE, false)
		NewImage(hub, "BladeH", 40, 40, 76, 8, PALETTE.windmillSail, RECTANGLE_RESOURCE, false)
		NewImage(hub, "HubCap", 40, 40, 10, 10, PALETTE.kleeGold, CIRCLE_RESOURCE, false)
		bgWindmills[i] = { control = wmRoot, blades = hub, offsetX = 180 + (i - 1) * 480 }
	end

	for i = 1, 6 do
		local cloud = NewImage(worldLayer, "BgCloud_" .. i, (i - 1) * 220, DESIGN_HEIGHT - 105 - (i % 3) * 46,
			118, 42, PALETTE.cloud, CIRCLE_RESOURCE, true)
		bgClouds[i] = { control = cloud, offsetX = (i - 1) * 230, y = DESIGN_HEIGHT - 105 - (i % 3) * 46 }
	end

	-- 3. Platforms Pool (Mondstadt Turf, Genshin Elemental Cubes, Sandstone Cubes, Prism Cubes, Stone Wind Pillars)
	for i = 1, NUM_PLATFORMS do
		local body = NewImage(worldLayer, "Plat_" .. i, -2000, -2000, TILE, TILE, PALETTE.groundStone, RECTANGLE_RESOURCE, false)
		local inner = NewImage(worldLayer, "PlatInner_" .. i, -2000, -2000, TILE - 10, TILE - 10, PALETTE.sandstoneInner, RECTANGLE_RESOURCE, false)
		local emblem = NewImage(worldLayer, "PlatEmblem_" .. i, -2000, -2000, 22, 22, PALETTE.cloverCubeGlow, STAR4_RESOURCE, false)
		body:SetVisible(false)
		inner:SetVisible(false)
		emblem:SetVisible(false)
		platformPool[i] = {
			control = body,
			detail = inner,
			emblem = emblem,
			active = false,
			kind = "GROUND", -- "GROUND" | "BRICK" | "QUESTION" | "PIPE" | "STONE"
			x = 0,
			y = 0,
			baseY = 0,
			width = TILE,
			height = TILE,
			bump = 0,
			used = false,
			hasDodoco = false
		}
	end

	-- 4. Golden Stars / Mora Pool
	for i = 1, NUM_COINS do
		local coinCtrl = NewImage(worldLayer, "GoldenStar_" .. i, -2000, -2000, 28, 28, PALETTE.primogem, STAR4_RESOURCE, false)
		coinCtrl:SetVisible(false)
		coinPool[i] = {
			control = coinCtrl,
			active = false,
			isPopup = false,
			x = 0,
			y = 0,
			vy = 0,
			timer = 0
		}
	end

	-- 5. Dodoco Mystery Box Power-Ups Pool (Image 1: Fluffy Dodoco popping out of the box!)
	for i = 1, NUM_DODOCOS do
		local dRoot = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, worldLayer))
		Configure(dRoot, -2000, -2000, 38, 40, "DodocoItem_" .. i)
		NewImage(dRoot, "Tail", 9, 12, 14, 12, PALETTE.dodocoTail, CIRCLE_RESOURCE, false)
		NewImage(dRoot, "Body", 20, 15, 24, 22, PALETTE.dodocoCream, CIRCLE_RESOURCE, false)
		NewImage(dRoot, "EarL", 15, 30, 6, 13, PALETTE.dodocoCream, CIRCLE_RESOURCE, false)
		NewImage(dRoot, "EarR", 24, 30, 6, 13, PALETTE.dodocoCream, CIRCLE_RESOURCE, false)
		NewImage(dRoot, "Beret", 20, 26, 16, 7, PALETTE.kleeCrimson, CIRCLE_RESOURCE, false)
		NewImage(dRoot, "EyeL", 18, 16, 3, 4, PALETTE.kleeLeather, CIRCLE_RESOURCE, false)
		NewImage(dRoot, "EyeR", 24, 16, 3, 4, PALETTE.kleeLeather, CIRCLE_RESOURCE, false)
		dRoot:SetVisible(false)
		dodocoPool[i] = {
			control = dRoot,
			active = false,
			x = 0,
			y = 0,
			vx = 110,
			vy = 0,
			grounded = false
		}
	end

	-- 6. Jumpy Dumpty Bouncing Bombs Pool (Images 1 & 2: Klee's Bouncing Clover Bomb!)
	for i = 1, NUM_BOMBS do
		local bRoot = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, worldLayer))
		Configure(bRoot, -2000, -2000, 30, 32, "JumpyDumpty_" .. i)
		NewImage(bRoot, "PotBottom", 15, 11, 24, 16, PALETTE.kleeCrimson, CIRCLE_RESOURCE, false)
		NewImage(bRoot, "CreamTop", 15, 17, 22, 14, PALETTE.dodocoCream, CIRCLE_RESOURCE, false)
		NewImage(bRoot, "EarL", 10, 26, 5, 9, PALETTE.dodocoCream, CIRCLE_RESOURCE, false)
		NewImage(bRoot, "EarR", 20, 26, 5, 9, PALETTE.dodocoCream, CIRCLE_RESOURCE, false)
		NewImage(bRoot, "CloverMark", 15, 10, 9, 9, PALETTE.kleeGold, STAR4_RESOURCE, false)
		bRoot:SetVisible(false)
		bombPool[i] = {
			control = bRoot,
			active = false,
			x = 0,
			y = 0,
			vx = 0,
			vy = 0,
			bounces = 0,
			life = 0
		}
	end

	-- 7. Genshin Elemental Slimes Pool (Image 3: Slime Paradise!)
	-- Pivot is (0.5, 0) at the bottom base so all squash & stomp tweens contract toward the ground!
	for i = 1, NUM_ENEMIES do
		local eRoot = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, worldLayer))
		Configure(eRoot, -2000, -2000, 48, 44, "Slime_" .. i)
		eRoot:SetPivot(0.5, 0)
		local shadow = NewImage(eRoot, "Shadow", 24, 3, 34, 6, Color.FromRGBA(0, 0, 0, 85), CIRCLE_RESOURCE, false)
		local crest = NewImage(eRoot, "ElementCrest", 24, 32, 16, 14, PALETTE.pyroGold, STAR4_RESOURCE, false)
		local body = NewImage(eRoot, "SlimeBody", 24, 15, 42, 30, PALETTE.pyroOrange, CIRCLE_RESOURCE, false)
		local highlight = NewImage(eRoot, "SlimeHighlight", 24, 22, 30, 12, Color.FromRGBA(255, 255, 255, 70), CIRCLE_RESOURCE, true)
		-- Iconic vertical white oval Slime eyes (Image 3)
		local eyeL = NewImage(eRoot, "EyeL", 18, 15, 5, 11, Color.FromRGB(252, 252, 245), CIRCLE_RESOURCE, false)
		local eyeR = NewImage(eRoot, "EyeR", 30, 15, 5, 11, Color.FromRGB(252, 252, 245), CIRCLE_RESOURCE, false)

		eRoot:SetVisible(false)
		enemyPool[i] = {
			control = eRoot,
			shadow = shadow,
			body = body,
			crest = crest,
			highlight = highlight,
			eyeL = eyeL,
			eyeR = eyeR,
			active = false,
			alive = false,
			slimeType = SLIME_TYPES[1],
			patrolEdges = false,
			x = 0,
			y = 0,
			width = 40,
			height = 36,
			velocityX = -75,
			velocityY = 0,
			grounded = false,
			squashTimer = 0,
			walkTimer = 0
		}
	end

	-- 8. Particles & Floating Combat/Score Texts
	for i = 1, NUM_PARTICLES do
		local pCtrl = NewImage(worldLayer, "Part_" .. i, -2000, -2000, 10, 10, PALETTE.pyroGold, CIRCLE_RESOURCE, false)
		pCtrl:SetVisible(false)
		particlePool[i] = { control = pCtrl, active = false, wx = 0, wy = 0, vx = 0, vy = 0, size = 10, life = 0, maxLife = 0.35 }
	end

	for i = 1, NUM_FLOAT_TEXTS do
		local lbl = NewText(worldLayer, "Float_" .. i, "+100", -2000, -2000, 160, 24, 13, PALETTE.pyroGold)
		lbl:SetVisible(false)
		floatTextPool[i] = { control = lbl, active = false, wx = 0, wy = 0, life = 0 }
	end
end

local function AllocatePlatform(kind, x, y, width, height, hasDodoco)
	local slot = nil
	for i = 1, NUM_PLATFORMS do
		local p = platformPool[i]
		if not p.active or (p.x + p.width * 0.5 < cameraX - TILE * 4) then
			slot = p
			break
		end
	end
	if not slot then return nil end

	slot.active = true
	slot.kind = kind
	slot.x = x
	slot.y = y
	slot.baseY = y
	slot.width = width
	slot.height = height
	slot.bump = 0
	slot.used = false
	slot.hasDodoco = hasDodoco == true

	slot.control:SetSizeDelta(width, height)
	slot.control:SetVisible(true)
	slot.emblem:SetVisible(false)

	if kind == "GROUND" then
		-- Mondstadt Cobblestone Cliff + Lush Windrise Emerald Grass (Image 4)
		slot.control.imageColor = PALETTE.groundStone
		slot.detail:SetSizeDelta(width, 14)
		slot.detail.imageColor = PALETTE.groundGrass
		slot.detail:SetVisible(true)
	elseif kind == "BRICK" then
		-- Genshin Domain Golden-Sandstone Cube (Images 5 & 6)
		slot.control.imageColor = PALETTE.sandstoneCube
		slot.detail:SetSizeDelta(width - 10, height - 10)
		slot.detail.imageColor = PALETTE.sandstoneInner
		slot.detail:SetVisible(true)
	elseif kind == "QUESTION" then
		-- Glowing Elemental / Clover Mystery Cube (Image 5)
		slot.control.imageColor = PALETTE.cloverCubeGold
		slot.detail:SetSizeDelta(width - 12, height - 12)
		slot.detail.imageColor = Color.FromRGB(218, 128, 28)
		slot.detail:SetVisible(true)
		slot.emblem:SetImage(Enum.ImageSource.StaticReference, STAR4_RESOURCE)
		slot.emblem:SetSizeDelta(24, 24)
		slot.emblem.imageColor = PALETTE.cloverCubeGlow
		slot.emblem:SetVisible(true)
	elseif kind == "PIPE" then
		-- Mondstadt Carved Stone Pillar with Anemo Crest
		slot.control.imageColor = PALETTE.anemoPillar
		slot.detail:SetSizeDelta(width + 8, 20)
		slot.detail.imageColor = PALETTE.anemoPillarCap
		slot.detail:SetVisible(true)
		slot.emblem:SetImage(Enum.ImageSource.StaticReference, STAR4_RESOURCE)
		slot.emblem:SetSizeDelta(22, 22)
		slot.emblem.imageColor = Color.FromRGB(108, 238, 210)
		slot.emblem:SetVisible(true)
	else
		-- Glowing Cyan Elemental Prism Cube (Image 6)
		slot.control.imageColor = PALETTE.prismCubeCyan
		slot.detail:SetSizeDelta(width - 10, height - 10)
		slot.detail.imageColor = PALETTE.prismCubeInner
		slot.detail:SetVisible(true)
		slot.emblem:SetImage(Enum.ImageSource.StaticReference, STAR4_RESOURCE)
		slot.emblem:SetSizeDelta(18, 18)
		slot.emblem.imageColor = Color.FromRGB(225, 252, 255)
		slot.emblem:SetVisible(true)
	end

	return slot
end

local function SpawnPrimogem(x, y, isPopup)
	local slot = nil
	for i = 1, NUM_COINS do
		local c = coinPool[i]
		if not c.active or c.x < cameraX - TILE * 3 then
			slot = c
			break
		end
	end
	if not slot then return end
	slot.active = true
	slot.isPopup = isPopup == true
	slot.x = x
	slot.y = y
	slot.vy = isPopup and 540 or 0
	slot.timer = isPopup and 0.50 or 999
	slot.control.imageColor = isPopup and PALETTE.moraGold or PALETTE.primogem
	slot.control:SetVisible(true)
end

local function SpawnDodocoFromBox(x, y)
	local d = dodocoPool[nextDodocoIdx]
	nextDodocoIdx = (nextDodocoIdx % NUM_DODOCOS) + 1
	if not d then return end
	d.active = true
	d.x = x
	d.y = y
	d.vx = 112
	d.vy = 290
	d.grounded = false
	d.control:SetVisible(true)
end

local function SpawnSlime(x, y, forcePatrol, speedMult)
	local slot = nil
	for i = 1, NUM_ENEMIES do
		local e = enemyPool[i]
		if not e.active or e.x < cameraX - TILE * 4 then
			slot = e
			break
		end
	end
	if not slot then return end

	local sType = SLIME_TYPES[math.random(1, #SLIME_TYPES)]
	slot.active = true
	slot.alive = true
	slot.slimeType = sType
	slot.patrolEdges = (forcePatrol == true) or sType.patrol
	slot.x = x
	slot.y = y
	slot.velocityX = -(72 + math.min(65, chunkCount * 3.5)) * (speedMult or 1.0)
	slot.velocityY = 0
	slot.grounded = false
	slot.squashTimer = 0
	slot.walkTimer = math.random() * 6.28

	slot.body.imageColor = sType.body
	slot.crest.imageColor = sType.crest
	slot.control:SetLocalScale(1, 1, 1)
	slot.control:SetLocalRotation(0, 0, 0)
	slot.control:SetVisible(true)
end

-- Generates the next procedural chunk of Mondstadt terrain, pits, cubes, pillars & Slimes
local function GenerateNextChunk()
	chunkCount = chunkCount + 1
	local startX = generatedUpToX

	local function GridX(col) return startX + (col + 0.5) * TILE end
	local function GridY(row) return GROUND_Y + (row - 0.5) * TILE end

	if chunkCount == 1 then
		-- Starting Windrise Runway + Guaranteed Dodoco Mystery Cube!
		local len = 14 * TILE
		AllocatePlatform("GROUND", startX + len * 0.5, GROUND_Y * 0.5, len, GROUND_Y, false)
		AllocatePlatform("QUESTION", GridX(6), GridY(4), TILE, TILE, true) -- Guaranteed Dodoco right at the start!
		AllocatePlatform("BRICK", GridX(8), GridY(4), TILE, TILE, false)
		AllocatePlatform("QUESTION", GridX(9), GridY(4), TILE, TILE, true)
		AllocatePlatform("BRICK", GridX(10), GridY(4), TILE, TILE, false)
		SpawnPrimogem(GridX(7), GridY(1), false)
		SpawnPrimogem(GridX(8.5), GridY(1), false)
		SpawnSlime(GridX(11.5), GROUND_Y, false, 1.0)
		generatedUpToX = startX + len
		return
	end

	local roll = math.random(1, 100)

	if roll <= 22 then
		-- Archetype 1: Overhead Elemental Cube Row + High Clover Cube + Slime Duo
		local cols = 12
		local len = cols * TILE
		AllocatePlatform("GROUND", startX + len * 0.5, GROUND_Y * 0.5, len, GROUND_Y, false)
		for c = 3, 7 do
			if c % 2 == 0 then
				AllocatePlatform("QUESTION", GridX(c), GridY(4), TILE, TILE, c == 6 and math.random() < 0.55)
			else
				AllocatePlatform("BRICK", GridX(c), GridY(4), TILE, TILE, false)
			end
		end
		AllocatePlatform("QUESTION", GridX(5), GridY(8), TILE, TILE, true)
		-- Golden stars placed at the exact center of the block right above the cubes (or ground)!
		SpawnPrimogem(GridX(4), GridY(5), false)
		SpawnPrimogem(GridX(6), GridY(5), false)
		SpawnPrimogem(GridX(2), GridY(1), false)
		SpawnSlime(GridX(6), GROUND_Y, false, 1.0)
		SpawnSlime(GridX(9), GROUND_Y, true, 1.05)
		generatedUpToX = startX + len

	elseif roll <= 44 then
		-- Archetype 2: Cider Lake Canyon Gap + Floating Domain Cube Bridge + Golden Star Row
		local leadCols = 3
		local pitCols = math.random(2, 3)
		local islandCols = 4
		local trailCols = 4
		local leadW = leadCols * TILE
		local trailW = trailCols * TILE

		AllocatePlatform("GROUND", startX + leadW * 0.5, GROUND_Y * 0.5, leadW, GROUND_Y, false)
		for c = 0, islandCols - 1 do
			local kind = (c == 1 or c == 2) and "QUESTION" or "BRICK"
			AllocatePlatform(kind, GridX(leadCols + pitCols + c), GridY(3), TILE, TILE, c == 2 and math.random() < 0.5)
			-- Center of the block directly on top of the GridY(3) bridge where Klee runs!
			SpawnPrimogem(GridX(leadCols + pitCols + c), GridY(4), false)
		end
		local trailStart = startX + (leadCols + pitCols + islandCols + 1) * TILE
		AllocatePlatform("GROUND", trailStart + trailW * 0.5, GROUND_Y * 0.5, trailW, GROUND_Y, false)
		SpawnSlime(trailStart + TILE * 2.5, GROUND_Y, true, 1.0)
		generatedUpToX = trailStart + trailW

	elseif roll <= 64 then
		-- Archetype 3: Twin Mondstadt Stone Pillars Basin (Great for Wall-Kicks & Jumpy Dumpty Ricochets!)
		local cols = 13
		local len = cols * TILE
		AllocatePlatform("GROUND", startX + len * 0.5, GROUND_Y * 0.5, len, GROUND_Y, false)
		local h1 = math.random(2, 3) * TILE
		local h2 = math.random(3, 4) * TILE
		AllocatePlatform("PIPE", GridX(3), GROUND_Y + h1 * 0.5, TILE * 1.5, h1, false)
		AllocatePlatform("PIPE", GridX(9), GROUND_Y + h2 * 0.5, TILE * 1.5, h2, false)
		AllocatePlatform("QUESTION", GridX(6), GridY(5), TILE, TILE, math.random() < 0.5)
		SpawnPrimogem(GridX(5), GridY(1), false)
		SpawnPrimogem(GridX(7), GridY(1), false)
		SpawnSlime(GridX(5.5), GROUND_Y, false, 1.0)
		SpawnSlime(GridX(7.2), GROUND_Y, true, 1.1)
		generatedUpToX = startX + len

	elseif roll <= 82 then
		-- Archetype 4: Ascending Cyan Prism Cubes (Image 6) -> Gap -> Landing Turf
		local preCols = 6
		local pitCols = math.random(2, 3)
		local postCols = 5
		AllocatePlatform("GROUND", startX + (preCols * TILE) * 0.5, GROUND_Y * 0.5, preCols * TILE, GROUND_Y, false)
		for step = 1, 4 do
			local h = step * TILE
			AllocatePlatform("STONE", GridX(1 + step), GROUND_Y + h * 0.5, TILE, h, false)
		end
		SpawnPrimogem(GridX(6.4), GridY(4.3), false)
		SpawnPrimogem(GridX(7.4), GridY(3.8), false)
		local postStart = startX + (preCols + pitCols) * TILE
		AllocatePlatform("GROUND", postStart + (postCols * TILE) * 0.5, GROUND_Y * 0.5, postCols * TILE, GROUND_Y, false)
		SpawnPrimogem(postStart + TILE * 1.2, GridY(1), false)
		SpawnSlime(postStart + TILE * 2.5, GROUND_Y, false, 1.05)
		SpawnSlime(postStart + TILE * 4.0, GROUND_Y, true, 1.15)
		generatedUpToX = postStart + postCols * TILE

	else
		-- Archetype 5: Low Domain Cube Tunnel (Crouch-Slide under or Jump over!)
		local cols = 12
		local len = cols * TILE
		AllocatePlatform("GROUND", startX + len * 0.5, GROUND_Y * 0.5, len, GROUND_Y, false)
		for c = 3, 7 do
			AllocatePlatform("BRICK", GridX(c), GROUND_Y + TILE * 1.5, TILE, TILE, false)
			if c % 2 == 1 then
				SpawnPrimogem(GridX(c), GridY(1), false)
			end
		end
		AllocatePlatform("QUESTION", GridX(5), GridY(6), TILE, TILE, true)
		SpawnSlime(GridX(5), GROUND_Y + TILE * 2, true, 1.0)
		SpawnSlime(GridX(9.5), GROUND_Y, false, 1.0)
		generatedUpToX = startX + len
	end
end

local function EnsureWorldStreamedAhead()
	while generatedUpToX < cameraX + DESIGN_WIDTH + TILE * 8 do
		GenerateNextChunk()
	end
end

-- ============================================================================
-- JUMPY DUMPTY PYRO EXPLOSION & SLIME BLASTING MECHANIC
-- ============================================================================

local function DetonatePyroExplosion(wx, wy, radius, isCounterBlast)
	AddScreenShake(0.22, 9)

	-- Multi-layered Pyro Clover Explosion Particles!
	SpawnParticle(wx, wy, 0, 0, radius * 1.6, Color.FromRGBA(255, 110, 35, 195), 0.24, CIRCLE_RESOURCE)
	SpawnParticle(wx, wy, 0, 0, radius * 1.1, PALETTE.pyroGold, 0.28, STAR4_RESOURCE)
	for k = 1, 8 do
		local ang = (k / 8) * math.pi * 2
		local spd = 130 + math.random() * 140
		local res = (k % 2 == 0) and STAR4_RESOURCE or CIRCLE_RESOURCE
		local col = (k % 2 == 0) and PALETTE.pyroGold or PALETTE.pyroOrange
		SpawnParticle(wx, wy, math.cos(ang) * spd, math.sin(ang) * spd + 60, 13, col, 0.36, res)
	end

	-- Check all active Slimes inside the Pyro blast wave!
	local blastedCount = 0
	for i = 1, NUM_ENEMIES do
		local e = enemyPool[i]
		if e.active and e.alive then
			local dx = e.x - wx
			local dy = (e.y + e.height * 0.5) - wy
			if dx * dx + dy * dy <= (radius + 26) * (radius + 26) then
				e.alive = false
				e.squashTimer = 0.48
				e.velocityY = 580
				e.velocityX = (dx >= 0 and 1 or -1) * 220
				e.control:SetLocalRotation(0, 0, 180)
				blastedCount = blastedCount + 1
				local pts = 250 * blastedCount
				score = score + pts
				SpawnFloatingText(
					e.x,
					e.y + 42,
					string.format("✦ %s +%d!", e.slimeType.reaction, pts),
					PALETTE.pyroGold,
					14
				)
			end
		end
	end

	if blastedCount == 0 and not isCounterBlast then
		SpawnFloatingText(wx, wy + 24, "BOOM! ✦", PALETTE.pyroOrange, 13)
	end
end

local function ThrowJumpyDumpty()
	if not player or player.dead or not player.hasDodoco or bombCooldown > 0 then
		return
	end

	local b = bombPool[nextBombIdx]
	nextBombIdx = (nextBombIdx % NUM_BOMBS) + 1
	if not b then return end

	bombCooldown = 0.30
	player.throwAnimTimer = 0.22
	b.active = true
	b.x = player.x + player.facing * 20
	b.y = player.y + 24
	b.vx = player.facing * (380 + math.abs(player.velocityX) * 0.55)
	b.vy = 420
	b.bounces = 0
	b.life = 2.4
	b.control:SetVisible(true)

	SpawnParticle(b.x, b.y, player.facing * 60, 80, 11, PALETTE.pyroGold, 0.20, STAR4_RESOURCE)
end

-- ============================================================================
-- COLLISION RESOLUTION, BLOCK BUMPING & PLATFORMER HIDDEN TECH
-- ============================================================================

local function HorizontalOverlap(lA, rA, lB, rB)
	return rA > lB and lA < rB
end

local function TriggerBlockBump(plat)
	plat.bump = 1.0
	if plat.kind == "QUESTION" and not plat.used then
		plat.used = true
		plat.control.imageColor = PALETTE.cubeSpent
		plat.detail.imageColor = PALETTE.cubeSpentInner
		plat.emblem:SetVisible(false)
		if plat.hasDodoco then
			SpawnDodocoFromBox(plat.x, plat.y + plat.height * 0.5 + 18)
			score = score + 300
			SpawnFloatingText(plat.x, plat.y + 38, "✦ DODOCO! ✦", Color.FromRGB(255, 225, 115), 14)
		else
			primogems = primogems + 1
			score = score + 100
			SpawnPrimogem(plat.x, plat.y + plat.height * 0.5 + 12, true)
			SpawnFloatingText(plat.x, plat.y + 36, "+100 MORA", PALETTE.moraGold, 13)
		end
	elseif plat.kind == "BRICK" then
		score = score + 25
		SpawnParticle(plat.x, plat.y + 18, (math.random() - 0.5) * 140, 180, 8, PALETTE.sandstoneCube, 0.25, RECTANGLE_RESOURCE)
	end

	-- Hidden Tech: Block-Bump Launch! Any Slime sitting on top of this cube gets blasted upward!
	local pLeft = plat.x - plat.width * 0.5 - 8
	local pRight = plat.x + plat.width * 0.5 + 8
	local pTop = plat.y + plat.height * 0.5
	for i = 1, NUM_ENEMIES do
		local e = enemyPool[i]
		if e.active and e.alive and e.x >= pLeft and e.x <= pRight and math.abs(e.y - pTop) <= 14 then
			e.alive = false
			e.squashTimer = 0.45
			e.velocityY = 520
			e.control:SetLocalRotation(0, 0, 180)
			score = score + 200
			SpawnFloatingText(e.x, e.y + 28, "CUBE LAUNCH +200!", PALETTE.pyroGold, 13)
		end
	end
end

local function CheckLowCeilingAbove(x, bottomY)
	local left = x - PLAYER_WIDTH * 0.42
	local right = x + PLAYER_WIDTH * 0.42
	local standTop = bottomY + PLAYER_STAND_HEIGHT
	for i = 1, NUM_PLATFORMS do
		local p = platformPool[i]
		if p.active then
			local pLeft = p.x - p.width * 0.5
			local pRight = p.x + p.width * 0.5
			local pBottom = p.y - p.height * 0.5
			local pTop = p.y + p.height * 0.5
			if HorizontalOverlap(left, right, pLeft, pRight) then
				if standTop > pBottom + 2 and bottomY + PLAYER_CROUCH_HEIGHT <= pBottom + 4 and bottomY < pTop then
					return true
				end
			end
		end
	end
	return false
end

local function ResolveKleeWorldCollisions(prevX, prevY)
	local halfW = PLAYER_WIDTH * 0.5
	local h = player.height

	-- 1. Horizontal Collision & Wall-Slide Detection
	player.wallSlideDir = 0
	local left = player.x - halfW
	local right = player.x + halfW
	local bottom = prevY + 4
	local top = prevY + h - 4

	for i = 1, NUM_PLATFORMS do
		local p = platformPool[i]
		if p.active then
			local pLeft = p.x - p.width * 0.5
			local pRight = p.x + p.width * 0.5
			local pBottom = p.y - p.height * 0.5
			local pTop = p.y + p.height * 0.5

			if top > pBottom and bottom < pTop then
				if player.velocityX > 0 and prevX + halfW <= pLeft + 6 and right >= pLeft then
					player.x = pLeft - halfW
					player.velocityX = 0
					if not player.grounded and p.height >= TILE * 1.5 then
						player.wallSlideDir = 1
					end
				elseif player.velocityX < 0 and prevX - halfW >= pRight - 6 and left <= pRight then
					player.x = pRight + halfW
					player.velocityX = 0
					if not player.grounded and p.height >= TILE * 1.5 then
						player.wallSlideDir = -1
					end
				end
			end
		end
	end

	-- 2. Vertical Collision + Sub-Pixel Corner Correction Tech
	left = player.x - halfW
	right = player.x + halfW
	local prevBottom = prevY
	local curBottom = player.y
	local prevTop = prevY + h
	local curTop = player.y + h
	player.grounded = false

	for i = 1, NUM_PLATFORMS do
		local p = platformPool[i]
		if p.active then
			local pLeft = p.x - p.width * 0.5
			local pRight = p.x + p.width * 0.5
			local pBottom = p.y - p.height * 0.5
			local pTop = p.y + p.height * 0.5

			if HorizontalOverlap(left, right, pLeft, pRight) then
				if player.velocityY <= 0 and prevBottom >= pTop - 8 and curBottom <= pTop + 4 then
					player.y = pTop
					player.velocityY = 0
					player.grounded = true
					left = player.x - halfW
					right = player.x + halfW
				elseif player.velocityY > 0 and prevTop <= pBottom + 8 and curTop >= pBottom then
					-- Corner Correction: nudge Klee past outer <=11px cube corners on upward jumps!
					local overlapLeftEdge = right - pLeft
					local overlapRightEdge = pRight - left
					if overlapLeftEdge > 0 and overlapLeftEdge <= CORNER_CORRECTION_PX then
						player.x = pLeft - halfW - 1
						left = player.x - halfW
						right = player.x + halfW
					elseif overlapRightEdge > 0 and overlapRightEdge <= CORNER_CORRECTION_PX then
						player.x = pRight + halfW + 1
						left = player.x - halfW
						right = player.x + halfW
					else
						player.y = pBottom - h
						player.velocityY = -40
						TriggerBlockBump(p)
					end
				end
			end
		end
	end
end

local function TriggerKleeDefeat(reason)
	if player.dead then return end
	player.dead = true
	player.deathTimer = 2.1
	player.velocityX = 0
	player.velocityY = 820
	player.squashX = 1.25
	player.squashY = 0.80
	if distanceMeters > bestDistanceMeters then bestDistanceMeters = distanceMeters end
	if score > bestScore then bestScore = score end
	if gameOverBanner then
		gameOverBanner.text = string.format(
			"✦ %s!   DIST: %dm (BEST: %dm)   |   SCORE: %d   |   [SPACE / R] RETRY",
			reason, distanceMeters, bestDistanceMeters, score
		)
		gameOverBanner:SetVisible(true)
	end
end

-- ============================================================================
-- SLIMES, DODOCO ITEMS, JUMPY DUMPTY BOMBS & PRIMOGEMS UPDATE
-- ============================================================================

local function UpdateSlimesBombsAndItems(dt, prevKleeY)
	-- 1. Primogems & Popup Mora
	for i = 1, NUM_COINS do
		local c = coinPool[i]
		if c.active then
			if c.isPopup then
				c.timer = c.timer - dt
				c.y = c.y + c.vy * dt
				c.vy = c.vy - 1800 * dt
				if c.timer <= 0 then
					c.active = false
					c.control:SetVisible(false)
				end
			else
				local kleeBlockCenterY = player.y + PLAYER_STAND_HEIGHT * 0.5
				if not player.dead and math.abs(player.x - c.x) < 44 and math.abs(kleeBlockCenterY - c.y) < 48 then
					c.active = false
					c.control:SetVisible(false)
					primogems = primogems + 1
					score = score + 100
					SpawnFloatingText(c.x, c.y + 14, "+160 PRIMO", PALETTE.primogem, 12)
				end
			end
		end
	end

	-- 2. Hopping Dodoco Power-Ups from Clover Mystery Cubes
	for i = 1, NUM_DODOCOS do
		local d = dodocoPool[i]
		if d.active then
			local prevY = d.y
			d.vy = d.vy + GRAVITY_DEFAULT * 0.72 * dt
			d.y = d.y + d.vy * dt
			d.x = d.x + d.vx * dt
			for pIdx = 1, NUM_PLATFORMS do
				local p = platformPool[pIdx]
				if p.active then
					local pLeft = p.x - p.width * 0.5
					local pRight = p.x + p.width * 0.5
					local pTop = p.y + p.height * 0.5
					local pBottom = p.y - p.height * 0.5
					if HorizontalOverlap(d.x - 14, d.x + 14, pLeft, pRight) then
						if d.vy <= 0 and prevY >= pTop - 8 and d.y <= pTop + 4 then
							d.y = pTop
							-- Dodoco hops joyfully along the ground!
							d.vy = 260
						end
					end
					if d.y < pTop - 4 and d.y + 28 > pBottom + 4 then
						if d.vx > 0 and d.x + 16 >= pLeft and d.x < p.x then
							d.x = pLeft - 16
							d.vx = -math.abs(d.vx)
						elseif d.vx < 0 and d.x - 16 <= pRight and d.x > p.x then
							d.x = pRight + 16
							d.vx = math.abs(d.vx)
						end
					end
				end
			end

			if not player.dead and math.abs(player.x - d.x) < 32 and math.abs((player.y + player.height * 0.5) - (d.y + 18)) < 34 then
				d.active = false
				d.control:SetVisible(false)
				player.hasDodoco = true
				player.squashX = 1.25
				player.squashY = 0.82
				score = score + 1000
				SpawnFloatingText(player.x, player.y + 54, "✦ DODOCO BOMB SQUAD! [E / CLICK TO BLAST] ✦", PALETTE.pyroGold, 14)
				for k = 1, 6 do
					local ang = (k / 6) * math.pi * 2
					SpawnParticle(player.x, player.y + 24, math.cos(ang) * 140, math.sin(ang) * 140, 11, PALETTE.pyroGold, 0.32, STAR4_RESOURCE)
				end
			elseif d.y < -150 or d.x < cameraX - TILE * 4 then
				d.active = false
				d.control:SetVisible(false)
			end
		end
	end

	-- 3. Jumpy Dumpty Bouncing Bombs
	for i = 1, NUM_BOMBS do
		local b = bombPool[i]
		if b.active then
			b.life = b.life - dt
			local prevY = b.y
			b.vy = b.vy + GRAVITY_DEFAULT * 0.82 * dt
			b.x = b.x + b.vx * dt
			b.y = b.y + b.vy * dt
			b.control:SetLocalRotation(0, 0, -b.x * 1.8)

			local hitWall = false
			for pIdx = 1, NUM_PLATFORMS do
				local p = platformPool[pIdx]
				if p.active then
					local pLeft = p.x - p.width * 0.5
					local pRight = p.x + p.width * 0.5
					local pTop = p.y + p.height * 0.5
					local pBottom = p.y - p.height * 0.5

					if HorizontalOverlap(b.x - 12, b.x + 12, pLeft, pRight) then
						if b.vy <= 0 and prevY >= pTop - 10 and b.y <= pTop + 6 then
							b.y = pTop
							b.vy = 470
							b.bounces = b.bounces + 1
							SpawnParticle(b.x, b.y + 4, 0, 45, 9, PALETTE.pyroGold, 0.18, STAR4_RESOURCE)
						end
					end
					if b.y < pTop - 6 and b.y + 22 > pBottom + 6 then
						if (b.vx > 0 and b.x + 13 >= pLeft and b.x < p.x)
							or (b.vx < 0 and b.x - 13 <= pRight and b.x > p.x) then
							hitWall = true
						end
					end
				end
			end

			-- Check direct contact with any active Slime!
			local hitSlime = false
			for eIdx = 1, NUM_ENEMIES do
				local e = enemyPool[eIdx]
				if e.active and e.alive then
					if math.abs(b.x - e.x) < 32 and math.abs(b.y - (e.y + e.height * 0.5)) < 30 then
						hitSlime = true
						break
					end
				end
			end

			if hitSlime or hitWall or b.bounces >= 3 or b.life <= 0 then
				b.active = false
				b.control:SetVisible(false)
				DetonatePyroExplosion(b.x, b.y + 12, 92, false)
			elseif b.y < -150 or b.x > cameraX + DESIGN_WIDTH + TILE * 4 then
				b.active = false
				b.control:SetVisible(false)
			end
		end
	end

	-- 4. Genshin Elemental Slimes
	for i = 1, NUM_ENEMIES do
		local e = enemyPool[i]
		if e.active then
			if not e.alive then
				e.squashTimer = e.squashTimer - dt
				if e.velocityY ~= 0 then
					e.x = e.x + e.velocityX * dt
					e.y = e.y + e.velocityY * dt
					e.velocityY = e.velocityY - 1800 * dt
				end
				if e.squashTimer <= 0 then
					e.active = false
					e.control:SetVisible(false)
				end
			elseif e.x <= cameraX + DESIGN_WIDTH + TILE * 3 then
				-- Gelatinous Slime Bounce & Squash-Stretch Animation (Anchored to ground base!)
				e.walkTimer = e.walkTimer + dt * 8.5
				local s = math.sin(e.walkTimer)
				local sx = 1.0 + s * 0.12
				local sy = 1.0 - s * 0.12
				e.control:SetLocalScale(sx, sy, 1)
				local hopOffset = math.max(0, -s) * 4.5
				e.body:SetAnchoredPosition(24, 15 + hopOffset)
				e.highlight:SetAnchoredPosition(24, 22 + hopOffset)
				e.crest:SetAnchoredPosition(24, 32 + hopOffset * 1.2)
				local lookDir = (e.velocityX >= 0) and 2 or -2
				e.eyeL:SetAnchoredPosition(18 + lookDir, 15 + hopOffset)
				e.eyeR:SetAnchoredPosition(30 + lookDir, 15 + hopOffset)

				local prevY = e.y
				e.velocityY = e.velocityY + GRAVITY_DEFAULT * dt
				e.y = e.y + e.velocityY * dt
				e.grounded = false
				local standingPlat = nil

				for pIdx = 1, NUM_PLATFORMS do
					local p = platformPool[pIdx]
					if p.active then
						local pLeft = p.x - p.width * 0.5
						local pRight = p.x + p.width * 0.5
						local pTop = p.y + p.height * 0.5
						if HorizontalOverlap(e.x - 18, e.x + 18, pLeft, pRight)
							and prevY >= pTop - 10 and e.y <= pTop + 4 then
							e.y = pTop
							e.velocityY = 0
							e.grounded = true
							standingPlat = p
						end
					end
				end

				local nextX = e.x + e.velocityX * dt
				if e.grounded and e.patrolEdges and standingPlat then
					local pLeft = standingPlat.x - standingPlat.width * 0.5 + 18
					local pRight = standingPlat.x + standingPlat.width * 0.5 - 18
					if nextX < pLeft then
						nextX = pLeft
						e.velocityX = math.abs(e.velocityX)
					elseif nextX > pRight then
						nextX = pRight
						e.velocityX = -math.abs(e.velocityX)
					end
				end

				for pIdx = 1, NUM_PLATFORMS do
					local p = platformPool[pIdx]
					if p.active then
						local pLeft = p.x - p.width * 0.5
						local pRight = p.x + p.width * 0.5
						local pBottom = p.y - p.height * 0.5
						local pTop = p.y + p.height * 0.5
						if e.y < pTop - 4 and e.y + e.height > pBottom + 4 then
							if e.velocityX > 0 and e.x < p.x and nextX + 20 >= pLeft then
								nextX = pLeft - 20
								e.velocityX = -math.abs(e.velocityX)
							elseif e.velocityX < 0 and e.x > p.x and nextX - 20 <= pRight then
								nextX = pRight + 20
								e.velocityX = math.abs(e.velocityX)
							end
						end
					end
				end
				e.x = nextX

				if e.y < -150 then
					e.active = false
					e.control:SetVisible(false)
				elseif not player.dead then
					-- Check Klee <-> Slime Stomp or Dodoco Pyro Counter-Blast!
					local dx = math.abs(player.x - e.x)
					local overlapX = dx < (PLAYER_WIDTH + e.width) * 0.46
					local overlapY = player.y < e.y + e.height - 4 and (player.y + player.height) > e.y + 4
					if overlapX and overlapY then
						local slimeTop = e.y + e.height
						local isStomp = (player.velocityY <= 40 and prevKleeY >= slimeTop - 26)
							or (player.crouching and math.abs(player.velocityX) > 310)

						if isStomp then
							e.alive = false
							e.squashTimer = 0.26
							e.velocityY = 0
							e.control:SetLocalScale(1.35, 0.26, 1)

							stompCombo = stompCombo + 1
							local comboPts = 100 * (2 ^ math.min(4, stompCombo - 1))
							score = score + comboPts

							local holdHighBounce = keys.jump or jumpBufferTimer > 0
							player.y = slimeTop
							player.velocityY = holdHighBounce and HIGH_STOMP_BOUNCE or LOW_STOMP_BOUNCE
							player.squashX = 1.28
							player.squashY = 0.76

							local labelTxt = (stompCombo > 1)
								and string.format("SLIME BOUNCE x%d +%d!", stompCombo, comboPts)
								or string.format("%s POP +%d", string.upper(e.slimeType.name), comboPts)
							SpawnFloatingText(e.x, e.y + 34, labelTxt, e.slimeType.crest, 14)
							for _ = 1, 6 do
								SpawnParticle(e.x, e.y + 16, (math.random() - 0.5) * 230, 80 + math.random() * 150,
									9, e.slimeType.body, 0.28, CIRCLE_RESOURCE)
							end
						elseif player.invulnTimer <= 0 then
							if player.hasDodoco then
								-- Dodoco protects Klee with an emergency Pyro Counter-Explosion!
								player.hasDodoco = false
								player.invulnTimer = 1.6
								player.velocityY = 540
								player.squashX = 0.82
								player.squashY = 1.22
								DetonatePyroExplosion(player.x, player.y + 20, 105, true)
								SpawnFloatingText(player.x, player.y + 48, "DODOCO GUARD BLAST!", PALETTE.pyroOrange, 14)
							else
								TriggerKleeDefeat("BONKED BY " .. string.upper(e.slimeType.name) .. " SLIME")
							end
						end
					end
				end
			end
		end
	end
end

-- ============================================================================
-- RENDER MONDSTADT WORLD, PARALLAX WINDMILLS & HUD
-- ============================================================================

local function RenderWorldAndHUD(dt)
	local targetCamX = math.max(0, player.x - DESIGN_WIDTH * 0.34)
	if not player.dead and targetCamX > cameraX then
		cameraX = Lerp(cameraX, targetCamX, math.min(1, dt * 12))
	end

	local shakeX, shakeY = 0, 0
	if screenShakeTimer > 0 then
		screenShakeTimer = math.max(0, screenShakeTimer - dt)
		shakeX = (math.random() - 0.5) * 2 * screenShakeMag
		shakeY = (math.random() - 0.5) * 2 * screenShakeMag
		if screenShakeTimer <= 0 then screenShakeMag = 0 end
	end

	-- 1. Parallax Windrise Hills, Rotating Mondstadt Windmills & Clouds
	for i = 1, #bgHills do
		local h = bgHills[i]
		local sx = ((h.offsetX - cameraX * 0.22) % 1560) - 120
		h.control:SetAnchoredPosition(sx + shakeX * 0.3, GROUND_Y + 30 + shakeY * 0.3)
	end
	for i = 1, #bgWindmills do
		local wm = bgWindmills[i]
		local sx = ((wm.offsetX - cameraX * 0.16) % 1440) - 100
		wm.control:SetAnchoredPosition(sx + shakeX * 0.2, GROUND_Y + 70 + shakeY * 0.2)
		wm.blades:SetLocalRotation(0, 0, -worldTime * 38 - i * 30)
	end
	for i = 1, #bgClouds do
		local c = bgClouds[i]
		local sx = ((c.offsetX - cameraX * 0.10) % 1380) - 90
		c.control:SetAnchoredPosition(sx, c.y)
	end

	-- 2. Platforms & Genshin Domain Cubes
	for i = 1, NUM_PLATFORMS do
		local p = platformPool[i]
		if p.active then
			if p.bump > 0 then
				p.bump = math.max(0, p.bump - dt * 6.5)
			end
			local sy = p.baseY + math.sin(p.bump * math.pi) * 12 + shakeY
			local sx = p.x - cameraX + shakeX
			p.control:SetAnchoredPosition(sx, sy)
			if p.kind == "GROUND" then
				p.detail:SetAnchoredPosition(sx, sy + p.height * 0.5 - 7)
			elseif p.kind == "BRICK" then
				p.detail:SetAnchoredPosition(sx, sy)
			elseif p.kind == "QUESTION" then
				p.detail:SetAnchoredPosition(sx, sy)
				if not p.used then
					p.emblem:SetAnchoredPosition(sx, sy)
					p.emblem:SetLocalRotation(0, 0, math.sin(worldTime * 4 + i) * 12)
				end
			elseif p.kind == "PIPE" then
				p.detail:SetAnchoredPosition(sx, sy + p.height * 0.5 - 10)
				p.emblem:SetAnchoredPosition(sx, sy + p.height * 0.5 - 28)
				p.emblem:SetLocalRotation(0, 0, worldTime * 55)
			else
				p.detail:SetAnchoredPosition(sx, sy)
				p.emblem:SetAnchoredPosition(sx, sy)
			end
		end
	end

	-- 3. Primogems, Dodoco Items & Jumpy Dumpty Bombs
	for i = 1, NUM_COINS do
		local c = coinPool[i]
		if c.active then
			c.control:SetAnchoredPosition(c.x - cameraX + shakeX, c.y + shakeY)
			c.control:SetLocalRotation(0, 0, worldTime * 90 + i * 25)
		end
	end
	for i = 1, NUM_DODOCOS do
		local d = dodocoPool[i]
		if d.active then
			d.control:SetAnchoredPosition(d.x - cameraX + shakeX, d.y + 20 + shakeY)
		end
	end
	for i = 1, NUM_BOMBS do
		local b = bombPool[i]
		if b.active then
			b.control:SetAnchoredPosition(b.x - cameraX + shakeX, b.y + 15 + shakeY)
		end
	end

	-- 4. Elemental Slimes (Pivot is 0.5, 0 at ground base so squash contracts toward the ground!)
	for i = 1, NUM_ENEMIES do
		local e = enemyPool[i]
		if e.active then
			e.control:SetAnchoredPosition(e.x - cameraX + shakeX, e.y + shakeY)
		end
	end

	-- 5. Particles & Floating Combat/Score Texts
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
				local sz = p.size * (p.life / p.maxLife)
				p.control:SetSizeDelta(sz, sz)
				p.control:SetAnchoredPosition(p.wx - cameraX + shakeX, p.wy + shakeY)
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
				ft.wy = ft.wy + 48 * dt
				ft.control:SetAnchoredPosition(ft.wx - cameraX, ft.wy)
			end
		end
	end

	-- 6. Klee Rig Position (Pivot is 0.5, 0 at her boots on the ground!)
	player.control:SetAnchoredPosition(player.x - cameraX + shakeX, player.y + shakeY)

	-- 7. HUD Telemetry & Spark-Meter Bar
	local pips = math.floor(player.pMeter * 6 + 0.01)
	local pBar = string.rep("✦", pips) .. string.rep("·", 6 - pips)
	local pTag = (player.pMeter >= 0.98) and "[SPARK-SPEED!]" or ""
	local dodocoTag = player.hasDodoco and "☘ DODOCO READY [E / CLICK: BOMB]" or "SOLO KLEE"

	if hudMainText then
		hudMainText.text = string.format(
			"KLEE [%s]   DIST: %dm (BEST: %dm)   PRIMO: %02d   SCORE: %06d   SPARK: [%s]%s",
			dodocoTag, distanceMeters, bestDistanceMeters, primogems, score, pBar, pTag
		)
	end
end

-- ============================================================================
-- RESET & INPUT REGISTRATION
-- ============================================================================

local function ResetRun()
	for i = 1, NUM_PLATFORMS do
		platformPool[i].active = false
		platformPool[i].control:SetVisible(false)
		platformPool[i].detail:SetVisible(false)
		platformPool[i].emblem:SetVisible(false)
	end
	for i = 1, NUM_ENEMIES do
		enemyPool[i].active = false
		enemyPool[i].control:SetVisible(false)
	end
	for i = 1, NUM_COINS do
		coinPool[i].active = false
		coinPool[i].control:SetVisible(false)
	end
	for i = 1, NUM_DODOCOS do
		dodocoPool[i].active = false
		dodocoPool[i].control:SetVisible(false)
	end
	for i = 1, NUM_BOMBS do
		bombPool[i].active = false
		bombPool[i].control:SetVisible(false)
	end

	cameraX = 0
	screenShakeTimer = 0
	screenShakeMag = 0
	generatedUpToX = 0
	chunkCount = 0
	score = 0
	primogems = 0
	distanceMeters = 0
	stompCombo = 0
	jumpHoldTimer = 0
	coyoteTimer = 0
	jumpBufferTimer = 0
	bombCooldown = 0

	player.x = 3.5 * TILE
	player.y = GROUND_Y
	player.height = PLAYER_STAND_HEIGHT
	player.velocityX = 0
	player.velocityY = 0
	player.grounded = true
	player.facing = 1
	player.crouching = false
	player.crouchChargeTimer = 0
	player.skidding = false
	player.wallSlideDir = 0
	player.pMeter = 0
	player.hasDodoco = false
	player.throwAnimTimer = 0
	player.invulnTimer = 0
	player.dead = false
	player.deathTimer = 0
	player.squashX = 1.0
	player.squashY = 1.0
	player.prevWorldVelY = 0
	player.packBoneY = 0
	player.packBoneVY = 0
	player.charmBoneY = 0
	player.charmBoneVY = 0

	if gameOverBanner then
		gameOverBanner:SetVisible(false)
	end

	EnsureWorldStreamedAhead()
	AnimateKleeRig(0.016)
	RenderWorldAndHUD(0.016)
end

local function ExecuteJump()
	local speedRatio = Clamp(math.abs(player.velocityX) / SPRINT_MAX_SPEED, 0, 1)
	local jumpVel = BASE_JUMP_SPEED + speedRatio * SPRINT_JUMP_BONUS
	if player.pMeter >= 0.98 then
		jumpVel = BASE_JUMP_SPEED + PSPEED_JUMP_BONUS
		SpawnFloatingText(player.x, player.y + 42, "✦ SPARK JUMP! ✦", PALETTE.pyroGold, 13)
	elseif player.crouching and player.crouchChargeTimer >= 0.40 then
		jumpVel = CROUCH_CHARGE_JUMP_SPEED
		player.crouchChargeTimer = 0
		SpawnFloatingText(player.x, player.y + 42, "ANEMO UPDRAFT JUMP!", Color.FromRGB(125, 255, 210), 13)
	end

	player.velocityY = jumpVel
	player.grounded = false
	coyoteTimer = 0
	jumpBufferTimer = 0
	jumpHoldTimer = 0
	player.squashX = 0.78
	player.squashY = 1.26

	for _ = 1, 4 do
		SpawnParticle(player.x, player.y + 4, (math.random() - 0.5) * 110, 30 + math.random() * 50,
			8, PALETTE.pyroGold, 0.24, STAR4_RESOURCE)
	end
end

local function RegisterInput()
	local function bind(down, up, key)
		root:AddKeyEventListener(down, function()
			keys[key] = true
			return true
		end)
		root:AddKeyEventListener(up, function()
			keys[key] = false
			if key == "sprint" then sprintReleaseGrace = 0.16 end
			return true
		end)
	end

	bind(Enum.KeyEventType.KeyboardMoveLeftKeyDown, Enum.KeyEventType.KeyboardMoveLeftKeyUp, "left")
	bind(Enum.KeyEventType.KeyboardMoveRightKeyDown, Enum.KeyEventType.KeyboardMoveRightKeyUp, "right")
	bind(Enum.KeyEventType.KeyboardMoveBackwardKeyDown, Enum.KeyEventType.KeyboardMoveBackwardKeyUp, "down")
	bind(Enum.KeyEventType.KeyboardSprintKeyDown, Enum.KeyEventType.KeyboardSprintKeyUp, "sprint")

	root:AddKeyEventListener(Enum.KeyEventType.KeyboardJumpKeyDown, function()
		keys.jump = true
		if player and player.dead and player.deathTimer <= 1.5 then
			ResetRun()
			return true
		end
		jumpBufferTimer = JUMP_BUFFER_TIME
		return true
	end)
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardJumpKeyUp, function()
		keys.jump = false
		if player and player.velocityY > 260 then
			player.velocityY = player.velocityY * 0.62
		end
		return true
	end)

	-- [E] / [Q] / [F] / [1] / [2] Throw Jumpy Dumpty Bomb when Dodoco is active!
	local bombKeyEvents = {
		Enum.KeyEventType.KeyboardCharacterSkill2KeyDown, -- E
		Enum.KeyEventType.KeyboardCharacterSkill4KeyDown, -- Q
		Enum.KeyEventType.KeyboardInteractKeyDown,        -- F
		Enum.KeyEventType.KeyboardCustom1KeyDown,         -- 1 (or J)
		Enum.KeyEventType.KeyboardNormalAttackKeyDown
	}
	for _, ev in ipairs(bombKeyEvents) do
		if ev then
			root:AddKeyEventListener(ev, function()
				ThrowJumpyDumpty()
				return true
			end)
		end
	end

	-- Left-Click on screen also throws Jumpy Dumpty Bomb!
	inputOverlay = Remember(game.InstantiateClientUIControl(BUTTON_TEMPLATE, root))
	if inputOverlay then
		Configure(inputOverlay, DESIGN_WIDTH * 0.5, DESIGN_HEIGHT * 0.5, DESIGN_WIDTH, DESIGN_HEIGHT, "KleeBombClickLayer")
		inputOverlay.interactable = true
		inputOverlay.raycastTarget = true
		inputOverlay:AddCursorEventListener(Enum.CursorEventType.CursorClick, function()
			if player and player.dead and player.deathTimer <= 1.5 then
				ResetRun()
			else
				ThrowJumpyDumpty()
			end
		end)
	end

	-- [R] Instant Retry
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardCharacterSkill3KeyDown, function()
		ResetRun()
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
	if started then return end
	started = true
	math.randomseed(1337)

	root = script.object
	if not root then
		root = game.InstantiateClientUIControl(CONTAINER_TEMPLATE, nil)
	end
	if not root then
		printerr("[Platformer] Could not create root control")
		started = false
		return
	end

	RefreshRootScale()
	root.disableKeyEventPassthrough = true

	worldLayer = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, root))
	worldLayer.name = "MondstadtWorld"
	worldLayer:SetAnchorMin(0, 0)
	worldLayer:SetAnchorMax(0, 0)
	worldLayer:SetPivot(0, 0)
	worldLayer:SetAnchoredPosition(0, 0)
	worldLayer:SetSizeDelta(DESIGN_WIDTH, DESIGN_HEIGHT)
	worldLayer:SetVisible(true)

	BuildWorldPools()
	player = BuildKlee()

	hudMainText = NewText(root, "HUD_Main", "", DESIGN_WIDTH * 0.5, DESIGN_HEIGHT - 22,
		DESIGN_WIDTH - 24, 28, 13, Color.FromRGB(255, 248, 225), Color.FromRGBA(24, 20, 18, 205))
	hudSubText = NewText(root, "HUD_Sub",
		"A/D: Run  |  SHIFT: Klee Airplane Sprint  |  SPACE: Jump / Wall-Kick / Slime Stomp  |  E or CLICK: Throw Jumpy Dumpty (with Dodoco!)",
		DESIGN_WIDTH * 0.5, DESIGN_HEIGHT - 48, DESIGN_WIDTH - 24, 22, 11, Color.FromRGB(255, 218, 128), Color.FromRGBA(24, 20, 18, 165))

	gameOverBanner = NewText(root, "HUD_GameOver", "", DESIGN_WIDTH * 0.5, DESIGN_HEIGHT * 0.55,
		780, 46, 15, Color.FromRGB(255, 235, 95), Color.FromRGBA(28, 18, 16, 235))
	gameOverBanner:SetVisible(false)

	RegisterInput()
	ResetRun()
	script:EnableUpdate(true)
	print("[Platformer] Endless Klee Runner: Mondstadt Bomb Squad Ready!")
end

function OnUpdate(deltaTime)
	if not player then return end
	RefreshRootScale()
	local dt = math.min(deltaTime, 0.04)
	worldTime = worldTime + dt

	if player.dead then
		player.deathTimer = player.deathTimer - dt
		player.y = player.y + player.velocityY * dt
		player.velocityY = player.velocityY + GRAVITY_DEFAULT * 0.75 * dt
		AnimateKleeRig(dt)
		RenderWorldAndHUD(dt)
		if player.deathTimer <= 0 then
			ResetRun()
		end
		return
	end

	if player.invulnTimer > 0 then
		player.invulnTimer = math.max(0, player.invulnTimer - dt)
	end
	if bombCooldown > 0 then
		bombCooldown = math.max(0, bombCooldown - dt)
	end
	sprintReleaseGrace = math.max(0, sprintReleaseGrace - dt)
	jumpBufferTimer = math.max(0, jumpBufferTimer - dt)

	if player.grounded then
		coyoteTimer = COYOTE_GRACE_TIME
		stompCombo = 0
	else
		coyoteTimer = math.max(0, coyoteTimer - dt)
	end

	-- Crouch / Crouch-Slide / Low-Ceiling Check
	local forcedLowCeiling = player.grounded and CheckLowCeilingAbove(player.x, player.y)
	player.crouching = (keys.down and player.grounded) or forcedLowCeiling
	player.height = player.crouching and PLAYER_CROUCH_HEIGHT or PLAYER_STAND_HEIGHT

	if player.crouching and math.abs(player.velocityX) < 35 then
		player.crouchChargeTimer = math.min(1.0, player.crouchChargeTimer + dt)
	else
		player.crouchChargeTimer = 0
	end

	-- Horizontal Movement, Skid Physics & Spark-Meter Buildup
	local dir = (keys.right and 1 or 0) - (keys.left and 1 or 0)
	local sprinting = keys.sprint or sprintReleaseGrace > 0
	local maxSpd = sprinting and (player.pMeter >= 0.98 and PSPEED_MAX_SPEED or SPRINT_MAX_SPEED) or WALK_MAX_SPEED

	player.skidding = false
	if player.crouching and player.grounded and not forcedLowCeiling then
		local slideDecel = CROUCH_SLIDE_FRICTION * dt
		if player.velocityX > 0 then player.velocityX = math.max(0, player.velocityX - slideDecel)
		elseif player.velocityX < 0 then player.velocityX = math.min(0, player.velocityX + slideDecel) end
		if math.abs(player.velocityX) > 90 and math.random() < 0.35 then
			SpawnParticle(player.x - player.facing * 12, player.y + 3, 0, 25, 7, PALETTE.pyroGold, 0.20, STAR4_RESOURCE)
		end
	elseif dir ~= 0 then
		local accel = player.grounded and (sprinting and SPRINT_ACCEL or WALK_ACCEL) or AIR_ACCEL
		if player.grounded and player.velocityX * dir < -45 then
			player.skidding = true
			player.velocityX = player.velocityX + dir * SKID_DECEL * dt
			if math.random() < 0.45 then
				SpawnParticle(player.x + dir * 10, player.y + 4, -dir * 60, 40, 8, PALETTE.pyroOrange, 0.22, STAR4_RESOURCE)
			end
		else
			player.velocityX = Clamp(player.velocityX + dir * accel * dt, -maxSpd, maxSpd)
		end
		player.facing = dir
	else
		local fric = (player.grounded and GROUND_FRICTION or AIR_ACCEL * 0.35) * dt
		if player.velocityX > 0 then player.velocityX = math.max(0, player.velocityX - fric)
		elseif player.velocityX < 0 then player.velocityX = math.min(0, player.velocityX + fric) end
	end

	-- Update Spark-Meter (fills while sprinting at >= 92% of Sprint Speed on ground)
	if sprinting and math.abs(player.velocityX) >= SPRINT_MAX_SPEED * 0.92 and player.grounded then
		player.pMeter = math.min(1.0, player.pMeter + dt * 0.85)
		if player.pMeter >= 0.98 and math.random() < 0.40 then
			SpawnParticle(player.x - player.facing * 14, player.y + 8, 0, 24, 8, PALETTE.pyroGold, 0.20, STAR4_RESOURCE)
		end
	elseif player.grounded then
		player.pMeter = math.max(0, player.pMeter - dt * 0.55)
	end

	-- Jump Execution (Supports Coyote Time, Jump Input Buffering & Wall-Kicks!)
	if jumpBufferTimer > 0 then
		if coyoteTimer > 0 then
			ExecuteJump()
		elseif player.wallSlideDir ~= 0 and not player.grounded then
			player.facing = -player.wallSlideDir
			player.velocityX = -player.wallSlideDir * WALL_KICK_VX
			player.velocityY = WALL_KICK_VY
			player.wallSlideDir = 0
			jumpBufferTimer = 0
			jumpHoldTimer = 0
			player.squashX = 0.76
			player.squashY = 1.28
			score = score + 50
			SpawnFloatingText(player.x, player.y + 38, "ANEMO WALL KICK!", Color.FromRGB(125, 245, 220), 13)
		end
	end

	-- Vertical Gravity (Variable Jump Hold + Apex Hang-Time + Wall-Slide Friction)
	local prevX = player.x
	local prevY = player.y
	local wasGrounded = player.grounded

	if not player.grounded then
		local g = GRAVITY_DEFAULT
		if player.velocityY > 0 and keys.jump and jumpHoldTimer < MAX_JUMP_HOLD_TIME then
			g = GRAVITY_RISE_HOLD
			jumpHoldTimer = jumpHoldTimer + dt
		elseif math.abs(player.velocityY) < 135 then
			g = GRAVITY_APEX
		end
		player.velocityY = math.max(MAX_FALL_SPEED, player.velocityY + g * dt)
		if player.wallSlideDir ~= 0 and player.velocityY < -210 then
			player.velocityY = -210
		end
	end

	player.x = math.max(cameraX + PLAYER_WIDTH * 0.5, player.x + player.velocityX * dt)
	player.y = player.y + player.velocityY * dt

	ResolveKleeWorldCollisions(prevX, prevY)

	if not wasGrounded and player.grounded then
		player.squashX = 1.22
		player.squashY = 0.82
	end

	-- Distance & Score Progression
	local newDist = math.max(0, math.floor((player.x - 3.5 * TILE) / 16))
	if newDist > distanceMeters then
		score = score + (newDist - distanceMeters) * 2
		distanceMeters = newDist
		if distanceMeters > bestDistanceMeters then
			bestDistanceMeters = distanceMeters
		end
	end
	if score > bestScore then bestScore = score end

	if player.y < -140 then
		TriggerKleeDefeat("FELL INTO CIDER LAKE")
		return
	end

	EnsureWorldStreamedAhead()
	UpdateSlimesBombsAndItems(dt, prevY)
	AnimateKleeRig(dt)
	RenderWorldAndHUD(dt)
end

function OnDestroy()
	started = false
	root = nil
	worldLayer = nil
	inputOverlay = nil
	player = nil
	platformPool = {}
	enemyPool = {}
	coinPool = {}
	dodocoPool = {}
	bombPool = {}
	particlePool = {}
	floatTextPool = {}
	controls = {}
end
