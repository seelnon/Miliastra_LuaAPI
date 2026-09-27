-- =========  Setup Inside Miliastra Client Control Templates  ============
--
-- Container_Instance ID   - 1073741849
-- TextBox_Instance ID     - 1073741850
-- Image_Instance ID       - 1073741851
-- PresetButton_Instance   - 1073741852
-- CursorEventArea         - 1073741856
--
-- Reference Asset Shapes:
--   100001 = Rectangle
--   100002 = Circle
--   100003 = Triangle
--   100004 = 4-Point Star
--   100006 = Hollow Circle
--
-- ========================================================================
-- PLATFORM FIGHTER: DETACHED LIMBS, CURSOR AIM & FOOTSIES AI (fighter.lua)
-- Inspired by Brawlhalla & Super Smash Bros. Melee (SSBM)
--
-- Features:
--   • Mouse Cursor "Look-At" Sword Aiming (Brawlhalla Style):
--       - Your detached hand and greatblade orbit and aim continuously
--         toward your mouse cursor (`game.GetCursorUIPos()`).
--   • Full Directional Light & Heavy Moveset (Keys W/S or Cursor Angle):
--       - Light Attacks [LMB / F]:
--           • Side Slash: Fast horizontal combo cut
--           • Up-Juggle (+W or Aim Up): Rising vertical launcher
--           • Down-Spike (+S or Aim Down): Fast downward cut / aerial spike
--       - Heavy Signatures [RMB / E]:
--           • Heavy Side Smash: Lunging high-knockback finisher
--           • Heavy Up Uppercut (+W or Aim Up): Skyward dragon uppercut
--           • Heavy Down Slam (+S or Aim Down): Meteor anvil drop / shockwave
--   • Segmented Chain Ledge Recovery [Q or SPACE off-stage]:
--       - Fires an 8-link grapple chain to the nearest stage ledge!
--   • Human-Like Footsies & Predictive Rival AI:
--       - 0.30s ± 0.08s reaction delay buffer (fast dashes are harder to track).
--       - Predictive targeting (estimates where you will be in 0.3s–0.5s,
--         so dash-dancing in and out baits the NPC into whiffing!).
--       - Mixes Predictive Strikes, Random "Hope" Swings in neutral, and
--         0.10s Close-Range Reflex swings when you step inside its space.
--       - Dynamic "Take Distance / Fallback" state: after 2–4 pressure swings,
--         or when high % / low accuracy, backs off to reset neutral and let
--         the player breathe!
-- ========================================================================

local CONTAINER_TEMPLATE = 1073741849
local TEXT_TEMPLATE = 1073741850
local IMAGE_TEMPLATE = 1073741851
local BUTTON_TEMPLATE = 1073741852

local RECT_RES = 100001
local CIRCLE_RES = 100002
local TRI_RES = 100003
local STAR4_RES = 100004
local RING_RES = 100006

-- Viewport & Stage Geometry
local screenWidth = 960
local screenHeight = 640
local stageOffsetX = 0
local stageOffsetY = 0
local GRAVITY = -1950
local FAST_FALL_GRAVITY = -3200
local CHAIN_LINKS = 8
local NUM_PARTICLES = 28

local STAGE = {
	mainX = 480,
	mainY = 185,
	mainW = 540,
	mainH = 32,
	leftLedgeX = 480 - 270,
	rightLedgeX = 480 + 270,
	topY = 185 + 16,
	platL = { x = 325, y = 305, w = 135, h = 12 },
	platR = { x = 635, y = 305, w = 135, h = 12 },
	platTop = { x = 480, y = 410, w = 145, h = 12 }
}

local root = nil
local worldLayer = nil
local controls = {}
local particlePool = {}
local nextParticleIdx = 1

local player = nil
local rival = nil
local aimReticle = nil
local aimDot = nil

local cursorX = 620
local cursorY = 260

local hitstopTimer = 0
local shakeTimer = 0
local shakePower = 0
local elapsedTime = 0

-- Delayed Player History Ring Buffer for Rival AI Reaction Time (~0.3s lag)
local HISTORY_SLOTS = 12
local playerHistory = {}
local historyWriteIdx = 1
local historySampleTimer = 0

-- HUD Controls
local p1PctText = nil
local p1StockText = nil
local p1MoveText = nil
local p2PctText = nil
local p2StockText = nil
local p2StateText = nil
local bannerText = nil
local subBannerText = nil

-- Input State
local keys = {
	up = false,
	down = false,
	left = false,
	right = false
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

local function CenterStageLayout()
	local nextOffsetX = (screenWidth - 960) * 0.5
	local nextOffsetY = (screenHeight - 640) * 0.5
	local shiftX = nextOffsetX - stageOffsetX
	local shiftY = nextOffsetY - stageOffsetY
	STAGE.mainX = STAGE.mainX + shiftX
	STAGE.leftLedgeX = STAGE.leftLedgeX + shiftX
	STAGE.rightLedgeX = STAGE.rightLedgeX + shiftX
	STAGE.mainY = STAGE.mainY + shiftY
	STAGE.topY = STAGE.topY + shiftY
	for _, platform in ipairs({ STAGE.platL, STAGE.platR, STAGE.platTop }) do
		platform.x = platform.x + shiftX
		platform.y = platform.y + shiftY
	end
	stageOffsetX = nextOffsetX
	stageOffsetY = nextOffsetY
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
	local fontSize = size or 16
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

local function SpawnParticle(x, y, vx, vy, size, color, life)
	local p = particlePool[nextParticleIdx]
	nextParticleIdx = (nextParticleIdx % NUM_PARTICLES) + 1
	if not p then return end
	p.active = true
	p.x = x
	p.y = y
	p.vx = vx
	p.vy = vy
	p.size = size
	p.life = life or 0.30
	p.maxLife = p.life
	p.control.imageColor = color
	p.control:SetSizeDelta(size, size)
	p.control:SetVisible(true)
end

-- ============================================================================
-- STAGE & DETACHED-LIMB FIGHTER BUILDERS
-- ============================================================================

local function BuildStageVisuals()
	-- Distant Background Pillars & Blast Zone Frame
	NewImage(worldLayer, "BlastZoneFrame", screenWidth * 0.5, screenHeight * 0.5, screenWidth - 28, screenHeight - 28,
		Color.FromRGBA(65, 52, 38, 45), RECT_RES, true)

	-- Main Battlefield Stage Block
	NewImage(worldLayer, "MainStageUnder", STAGE.mainX, STAGE.mainY - 24, STAGE.mainW - 36, 42,
		Color.FromRGB(44, 36, 28), RECT_RES, true)
	NewImage(worldLayer, "MainStageTop", STAGE.mainX, STAGE.mainY, STAGE.mainW, STAGE.mainH,
		Color.FromRGB(92, 76, 56), RECT_RES, true)
	NewImage(worldLayer, "MainStageTrim", STAGE.mainX, STAGE.topY - 3, STAGE.mainW, 6,
		Color.FromRGB(205, 172, 102), RECT_RES, false)

	-- Bright Ledge Grab Anchors on Left & Right Corners
	NewImage(worldLayer, "LeftLedgeOrb", STAGE.leftLedgeX, STAGE.topY, 14, 14, Color.FromRGB(110, 225, 255), RING_RES, false)
	NewImage(worldLayer, "RightLedgeOrb", STAGE.rightLedgeX, STAGE.topY, 14, 14, Color.FromRGB(110, 225, 255), RING_RES, false)

	-- 3 Soft Pass-Through Battle Platforms
	for idx, plat in ipairs({ STAGE.platL, STAGE.platR, STAGE.platTop }) do
		NewImage(worldLayer, "Plat_" .. idx, plat.x, plat.y, plat.w, plat.h, Color.FromRGB(135, 112, 78), RECT_RES, true)
	end

	-- Particle Pool
	for i = 1, NUM_PARTICLES do
		local ctrl = NewImage(worldLayer, "HitSpark_" .. i, -2000, -2000, 14, 14, Color.FromRGB(255, 215, 85), STAR4_RES, false)
		ctrl:SetVisible(false)
		particlePool[i] = { control = ctrl, active = false, x = 0, y = 0, vx = 0, vy = 0, size = 14, life = 0, maxLife = 0.3 }
	end

	-- Mouse Cursor "Look-At" Crosshair Reticle
	aimReticle = NewImage(worldLayer, "AimReticleRing", cursorX, cursorY, 22, 22, Color.FromRGBA(120, 220, 255, 165), RING_RES, false)
	aimDot = NewImage(worldLayer, "AimReticleDot", cursorX, cursorY, 6, 6, Color.FromRGB(255, 230, 120), CIRCLE_RES, false)
end

local function CreateFighter(name, startX, startY, facing, primaryColor, accentColor, isAI)
	-- Segmented Grapple Chain Links (Rendered in world space when latching to ledge)
	local chainControls = {}
	for i = 1, CHAIN_LINKS do
		local isHook = (i == CHAIN_LINKS)
		local link = NewImage(worldLayer, name .. "_Chain_" .. i, -2000, -2000, isHook and 16 or 9, isHook and 16 or 9,
			isHook and Color.FromRGB(255, 215, 85) or Color.FromRGB(195, 205, 215),
			isHook and STAR4_RES or CIRCLE_RES, false)
		link:SetVisible(false)
		chainControls[i] = link
	end

	-- Swing Arc Visual Effect
	local swingArc = NewImage(worldLayer, name .. "_SwingArc", -2000, -2000, 72, 72,
		Color.FromRGBA(255, 235, 145, 165), RING_RES, false)
	swingArc:SetVisible(false)

	-- Detached-Limb Root Container
	local rootCtrl = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, worldLayer))
	Configure(rootCtrl, startX, startY, 64, 64, name)

	-- 1. Detached Back Hand (Fist)
	local backHand = NewImage(rootCtrl, "BackHand", 20, 30, 11, 11, Color.FromRGB(240, 210, 180), CIRCLE_RES, false)

	-- 2. Detached Floating Feet (Left & Right)
	local footL = NewImage(rootCtrl, "FootL", 24, 8, 13, 8, Color.FromRGB(48, 40, 34), RECT_RES, true)
	local footR = NewImage(rootCtrl, "FootR", 40, 8, 13, 8, Color.FromRGB(48, 40, 34), RECT_RES, true)

	-- 3. Floating Torso Tunic
	local torso = NewImage(rootCtrl, "Torso", 32, 26, 20, 22, primaryColor, RECT_RES, true)
	NewImage(rootCtrl, "Belt", 32, 19, 21, 5, accentColor, RECT_RES, false)

	-- 4. Floating Side-Profile Head + Headband + Eye Visor
	local head = NewImage(rootCtrl, "Head", 32, 48, 20, 20, Color.FromRGB(245, 215, 185), CIRCLE_RES, false)
	local headbandTail = NewImage(rootCtrl, "HeadbandTail", 17, 49, 14, 6, accentColor, TRI_RES, false)
	NewImage(rootCtrl, "Headband", 32, 52, 21, 5, accentColor, RECT_RES, false)
	local eye = NewImage(rootCtrl, "ProfileEye", 38, 48, 5, 5, Color.FromRGB(24, 20, 24), CIRCLE_RES, false)

	-- 5. Detached Weapon Pivot Container + Floating Front Hand + Greatblade Weapon
	-- Moves & rotates dynamically to "Look At" the cursor (Player) or predicted target (AI)!
	local weaponPivot = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, rootCtrl))
	Configure(weaponPivot, 44, 30, 16, 16, "WeaponPivot")

	local blade = NewImage(weaponPivot, "Greatblade", 8, 36, 11, 54, Color.FromRGB(225, 235, 245), TRI_RES, false)
	local hilt = NewImage(weaponPivot, "Hilt", 8, 11, 17, 6, accentColor, RECT_RES, false)
	local frontHand = NewImage(weaponPivot, "FrontHand", 8, 8, 11, 11, Color.FromRGB(245, 215, 185), CIRCLE_RES, false)

	return {
		name = name,
		isAI = isAI,
		control = rootCtrl,
		torso = torso,
		head = head,
		eye = eye,
		headbandTail = headbandTail,
		backHand = backHand,
		footL = footL,
		footR = footR,
		weaponPivot = weaponPivot,
		blade = blade,
		hilt = hilt,
		frontHand = frontHand,
		swingArc = swingArc,
		chainControls = chainControls,
		x = startX,
		y = startY,
		vx = 0,
		vy = 0,
		facing = facing,
		aimX = startX + facing * 120,
		aimY = startY,
		lookAngleRad = 0,
		grounded = false,
		jumpsLeft = 2,
		damagePct = 0,
		stocks = 3,
		hitstunTimer = 0,
		invulnTimer = 0,
		attackTimer = 0,
		attackDuration = 0,
		attackType = "NONE", -- "LIGHT_SIDE" | "LIGHT_UP" | "LIGHT_DOWN" | "HEAVY_SIDE" | "HEAVY_UP" | "HEAVY_DOWN"
		attackHitDealt = false,
		lastMoveLabel = "READY",
		chainTimer = 0,
		chainTargetX = 0,
		chainTargetY = 0,
		animPhase = 0,

		-- AI Footsies, Reaction Delay, Predictive Aim & Fallback State
		aiState = "FOOTSIES",        -- "FOOTSIES" | "AGGRO" | "FALLBACK"
		aiStateTimer = 1.6,
		aiReactionDelay = 0.32,      -- 0.30s +- 0.08s reaction time
		aiPredHorizon = 0.38,        -- 0.30s to 0.52s predictive movement lead
		aiDecisionTimer = 0.25,
		aiAttackCooldown = 0,
		aiReflexPending = false,
		aiReflexTimer = 0,
		aiReflexAttack = "LIGHT_SIDE",
		aiPressureSwings = 0,
		aiMaxPressureSwings = 3,
		aiSwingsTotal = 0,
		aiHitsLanded = 0,
		aiWeaveDir = 1,
		aiWeaveTimer = 0.45
	}
end

-- ============================================================================
-- DELAYED PERCEPTION & PREDICTIVE MOVEMENT FOR RIVAL AI
-- ============================================================================

local function InitPlayerHistory()
	playerHistory = {}
	for i = 1, HISTORY_SLOTS do
		playerHistory[i] = {
			x = STAGE.mainX - 120,
			y = STAGE.topY + 40,
			vx = 0,
			vy = 0
		}
	end
	historyWriteIdx = 1
	historySampleTimer = 0
end

local function RecordPlayerHistory(dt)
	if not player then return end
	historySampleTimer = historySampleTimer + dt
	if historySampleTimer >= 0.05 then
		historySampleTimer = historySampleTimer - 0.05
		playerHistory[historyWriteIdx] = {
			x = player.x,
			y = player.y,
			vx = player.vx,
			vy = player.vy
		}
		historyWriteIdx = (historyWriteIdx % HISTORY_SLOTS) + 1
	end
end

-- Returns delayed snapshot (~0.30s ago) + predicted future position (0.3s - 0.55s ahead)
local function GetAIPerceivedAndPredictedTarget(ai)
	-- Each slot is 0.05s; 0.30s delay = 6 slots back
	local slotsBack = Clamp(math.floor(ai.aiReactionDelay / 0.05 + 0.5), 4, HISTORY_SLOTS - 1)
	local readIdx = ((historyWriteIdx - 1 - slotsBack) % HISTORY_SLOTS) + 1
	local snap = playerHistory[readIdx] or player

	-- Extrapolate where the player is heading over aiPredHorizon (0.30s - 0.55s)
	-- Fast player movement creates larger extrapolation, letting dash-dancing bait whiffs!
	local predX = snap.x + snap.vx * ai.aiPredHorizon
	local predY = snap.y + snap.vy * (ai.aiPredHorizon * 0.65)
	predY = math.max(STAGE.topY + 24, predY)

	return snap.x, snap.y, predX, predY, snap.vx, snap.vy
end

-- ============================================================================
-- COMBAT: LIGHT & HEAVY DIRECTIONAL SWINGS, BOUNCE & CHAIN GRAPPLE
-- ============================================================================

local ATTACK_DEFS = {
	LIGHT_SIDE = {
		label = "LIGHT SIDE SLASH",
		duration = 0.21,
		damage = 8,
		baseSpeed = 365,
		scaling = 4.3,
		angleDeg = 26,
		radius = 48,
		offsetX = 38,
		offsetY = 6,
		lungeVX = 145,
		lungeVY = 0,
		startRot = -25,
		endRot = -140,
		isHeavy = false,
		color = Color.FromRGBA(165, 235, 255, 175)
	},
	LIGHT_UP = {
		label = "LIGHT UP-JUGGLE",
		duration = 0.23,
		damage = 10,
		baseSpeed = 420,
		scaling = 4.1,
		angleDeg = 78,
		radius = 48,
		offsetX = 14,
		offsetY = 38,
		lungeVX = 30,
		lungeVY = 360,
		startRot = -105,
		endRot = 25,
		isHeavy = false,
		color = Color.FromRGBA(165, 255, 210, 175)
	},
	LIGHT_DOWN = {
		label = "LIGHT DOWN-SPIKE",
		duration = 0.24,
		damage = 11,
		baseSpeed = 435,
		scaling = 4.5,
		angleDeg = -62,
		radius = 46,
		offsetX = 20,
		offsetY = -26,
		lungeVX = 70,
		lungeVY = -180,
		startRot = -75,
		endRot = -195,
		isHeavy = false,
		color = Color.FromRGBA(255, 220, 130, 175)
	},
	HEAVY_SIDE = {
		label = "HEAVY SIDE SMASH",
		duration = 0.35,
		damage = 17,
		baseSpeed = 485,
		scaling = 5.7,
		angleDeg = 30,
		radius = 58,
		offsetX = 46,
		offsetY = 8,
		lungeVX = 285,
		lungeVY = 40,
		startRot = 15,
		endRot = -155,
		isHeavy = true,
		color = Color.FromRGBA(255, 125, 75, 205)
	},
	HEAVY_UP = {
		label = "HEAVY SKY UPPERCUT",
		duration = 0.36,
		damage = 16,
		baseSpeed = 500,
		scaling = 5.5,
		angleDeg = 82,
		radius = 56,
		offsetX = 18,
		offsetY = 44,
		lungeVX = 55,
		lungeVY = 560,
		startRot = -115,
		endRot = 35,
		isHeavy = true,
		color = Color.FromRGBA(255, 195, 65, 215)
	},
	HEAVY_DOWN = {
		label = "HEAVY METEOR SLAM",
		duration = 0.38,
		damage = 18,
		baseSpeed = 510,
		scaling = 5.9,
		angleDeg = -74,
		radius = 60,
		offsetX = 20,
		offsetY = -30,
		lungeVX = 40,
		lungeVY = -520,
		startRot = -45,
		endRot = -205,
		isHeavy = true,
		color = Color.FromRGBA(255, 75, 115, 215)
	}
}

local function StartWeaponAttack(fighter, attackType)
	if fighter.hitstunTimer > 0 or fighter.attackTimer > 0 or fighter.chainTimer > 0 then return end
	local def = ATTACK_DEFS[attackType] or ATTACK_DEFS.LIGHT_SIDE

	fighter.attackType = attackType
	fighter.attackDuration = def.duration
	fighter.attackTimer = def.duration
	fighter.attackHitDealt = false
	fighter.lastMoveLabel = def.label

	-- Apply directional attack momentum / lunge
	fighter.vx = fighter.vx * 0.55 + fighter.facing * def.lungeVX
	if def.lungeVY > 0 then
		fighter.vy = math.max(fighter.vy, def.lungeVY)
		fighter.grounded = false
	elseif def.lungeVY < 0 and not fighter.grounded then
		fighter.vy = math.min(fighter.vy, def.lungeVY)
	end

	-- Configure swing arc size & color
	local arcSize = def.isHeavy and 86 or 68
	fighter.swingArc:SetSizeDelta(arcSize, arcSize)
	fighter.swingArc.imageColor = def.color
	fighter.blade.imageColor = def.isHeavy and Color.FromRGB(255, 215, 110) or Color.FromRGB(225, 235, 245)

	if fighter.isAI then
		fighter.aiSwingsTotal = fighter.aiSwingsTotal + 1
		fighter.aiPressureSwings = fighter.aiPressureSwings + 1
		fighter.aiAttackCooldown = def.duration + (def.isHeavy and 0.34 or 0.22)
	end
end

local function TryStartChainRecovery(fighter)
	if fighter.chainTimer > 0 or fighter.grounded then return end

	-- Pick nearest stage ledge (Left Ledge or Right Ledge)
	local dLeft = (fighter.x - STAGE.leftLedgeX) ^ 2 + (fighter.y - STAGE.topY) ^ 2
	local dRight = (fighter.x - STAGE.rightLedgeX) ^ 2 + (fighter.y - STAGE.topY) ^ 2
	local targetX = (dLeft < dRight) and STAGE.leftLedgeX or STAGE.rightLedgeX
	local targetY = STAGE.topY
	local dist = math.sqrt(math.min(dLeft, dRight))

	-- Latch grapple chain when off-stage or below ledge within 450px
	if dist <= 450 and (math.abs(fighter.x - STAGE.mainX) > STAGE.mainW * 0.40 or fighter.y < STAGE.topY + 36) then
		fighter.chainTimer = 0.35
		fighter.chainTargetX = targetX
		fighter.chainTargetY = targetY
		fighter.hitstunTimer = 0
		fighter.attackTimer = 0
		fighter.jumpsLeft = 2
		fighter.facing = (targetX > fighter.x) and 1 or -1
		fighter.lastMoveLabel = "CHAIN GRAPPLE"
	end
end

local function ApplyHitKnockback(attacker, defender, attackType)
	local def = ATTACK_DEFS[attackType] or ATTACK_DEFS.LIGHT_SIDE
	local launchAngleRad = math.rad(def.angleDeg)

	-- Grounded Heavy Down Slam launches opponent upward off the floor shockwave!
	if attackType == "HEAVY_DOWN" and defender.grounded then
		launchAngleRad = math.rad(68)
	end

	defender.damagePct = math.min(999, defender.damagePct + def.damage)
	local totalLaunchSpeed = def.baseSpeed + defender.damagePct * def.scaling

	local dirX = attacker.facing
	defender.vx = math.cos(launchAngleRad) * totalLaunchSpeed * dirX
	defender.vy = math.sin(launchAngleRad) * totalLaunchSpeed
	defender.grounded = false
	defender.hitstunTimer = Clamp(0.18 + defender.damagePct * 0.0022, 0.18, 0.70)
	defender.attackTimer = 0
	defender.chainTimer = 0

	if attacker.isAI then
		attacker.aiHitsLanded = attacker.aiHitsLanded + 1
	end

	hitstopTimer = def.isHeavy and 0.08 or 0.045
	shakeTimer = def.isHeavy and 0.26 or 0.18
	shakePower = Clamp((def.isHeavy and 7 or 4) + defender.damagePct * 0.045, 4, 15)

	-- Spawn Hit Sparks
	local hitX = (attacker.x + defender.x) * 0.5
	local hitY = (attacker.y + defender.y) * 0.5
	local sparkCol = def.isHeavy and Color.FromRGB(255, 135, 65) or Color.FromRGB(255, 220, 95)
	for i = 1, (def.isHeavy and 9 or 6) do
		local ang = math.random() * math.pi * 2
		local spd = 150 + math.random() * 260
		SpawnParticle(hitX, hitY, math.cos(ang) * spd, math.sin(ang) * spd,
			math.random(11, 19), sparkCol, 0.28)
	end
end

-- ============================================================================
-- RIVAL AI: REACTION DELAY, PREDICTIVE FOOTSIES, HOPE SWINGS & FALLBACK
-- ============================================================================

local function ChooseAIDirectionalAttack(f, targetDX, targetDY, preferHeavy)
	local prefix = preferHeavy and "HEAVY_" or "LIGHT_"
	if targetDY > 34 then
		return prefix .. "UP"
	elseif not f.grounded and targetDY < -22 then
		return prefix .. "DOWN"
	elseif preferHeavy and targetDY < -18 then
		return "HEAVY_DOWN"
	else
		return prefix .. "SIDE"
	end
end

local function UpdateRivalBrain(f, opponent, dt)
	f.aiAttackCooldown = math.max(0, f.aiAttackCooldown - dt)
	f.aiDecisionTimer = f.aiDecisionTimer - dt
	f.aiStateTimer = f.aiStateTimer - dt
	f.aiWeaveTimer = f.aiWeaveTimer - dt

	-- 1. Immediate Off-Stage Ledge Recovery (No artificial delay for survival recovery!)
	local isOffStage = math.abs(f.x - STAGE.mainX) > STAGE.mainW * 0.47 or f.y < STAGE.topY - 10
	if isOffStage then
		f.aiReflexPending = false
		local moveDir = (f.x < STAGE.mainX) and 1 or -1
		f.aimX = STAGE.mainX
		f.aimY = STAGE.topY + 40
		if f.y < STAGE.topY - 14 and f.chainTimer <= 0 then
			TryStartChainRecovery(f)
			if f.chainTimer <= 0 and f.jumpsLeft > 0 and f.vy < 90 then
				f.vy = 650
				f.jumpsLeft = f.jumpsLeft - 1
			end
		end
		return moveDir, false
	end

	-- 2. Perceived (0.30s delayed) & Predicted (0.3s-0.5s extrapolated) Player Coordinates
	local percX, percY, predX, predY, percVX, _ = GetAIPerceivedAndPredictedTarget(f)
	f.aimX = Lerp(f.aimX, predX, math.min(1, dt * 9.0))
	f.aimY = Lerp(f.aimY, predY, math.min(1, dt * 9.0))

	-- 3. Execute Pending 0.10s Close-Range Reflex Strike if Queued
	if f.aiReflexPending then
		f.aiReflexTimer = f.aiReflexTimer - dt
		if f.aiReflexTimer <= 0 then
			f.aiReflexPending = false
			if f.attackTimer <= 0 and f.aiAttackCooldown <= 0 then
				f.facing = (opponent.x >= f.x) and 1 or -1
				StartWeaponAttack(f, f.aiReflexAttack)
			end
		end
	end

	-- 4. Check if Player Walked Directly Into Personal Space (< 54px) -> 0.10s Reflex Trigger!
	local actualDX = opponent.x - f.x
	local actualDY = opponent.y - f.y
	local actualDist = math.sqrt(actualDX * actualDX + actualDY * actualDY)

	if actualDist < 54 and not f.aiReflexPending and f.attackTimer <= 0 and f.aiAttackCooldown <= 0 then
		f.aiReflexPending = true
		f.aiReflexTimer = 0.10 -- Fast 0.1s close-quarters reaction!
		local useHeavy = (opponent.damagePct >= 95 and math.random() < 0.35)
		f.aiReflexAttack = ChooseAIDirectionalAttack(f, actualDX, actualDY, useHeavy)
	end

	-- 5. Evaluate Posture Transitions (AGGRO <-> FOOTSIES <-> FALLBACK)
	local accuracy = (f.aiSwingsTotal >= 3) and (f.aiHitsLanded / f.aiSwingsTotal) or 0.55
	local hpDanger = Clamp(f.damagePct / 140, 0, 1)

	-- After 2-4 pressure swings in the player's face, back off and let the player breathe!
	if f.aiState ~= "FALLBACK" and f.aiPressureSwings >= f.aiMaxPressureSwings then
		f.aiState = "FALLBACK"
		f.aiStateTimer = 1.45 + math.random() * 0.85
		f.aiPressureSwings = 0
		f.aiMaxPressureSwings = math.random(2, 4)
	elseif f.aiStateTimer <= 0 then
		-- Decide next posture based on HP%, accuracy of own hits, and spacing
		f.aiReactionDelay = 0.25 + math.random() * 0.13 -- 0.25s to 0.38s (0.3s +- 0.08s)
		f.aiPredHorizon = 0.30 + math.random() * 0.24   -- 0.30s to 0.54s prediction window

		local fallbackChance = 0.20 + hpDanger * 0.32 + (accuracy < 0.35 and 0.22 or 0)
		local roll = math.random()
		if f.aiState == "AGGRO" and roll < fallbackChance + 0.25 then
			f.aiState = "FALLBACK"
			f.aiStateTimer = 1.4 + math.random() * 0.8
			f.aiPressureSwings = 0
		elseif roll < 0.46 then
			f.aiState = "FOOTSIES"
			f.aiStateTimer = 1.3 + math.random() * 0.9
		else
			f.aiState = "AGGRO"
			f.aiStateTimer = 1.8 + math.random() * 1.1
			f.aiMaxPressureSwings = math.random(2, 4)
		end
	end

	-- 6. Movement & Attack Decisions per State
	local moveDir = 0
	local wantsFastFall = false
	local predDX = predX - f.x
	local predDY = predY - f.y
	local predDist = math.sqrt(predDX * predDX + predDY * predDY)

	if f.aiState == "FALLBACK" then
		-- Take Distance: retreat away from player toward safe side of stage / platforms
		local awayDir = (f.x >= percX) and 1 or -1
		local safeEdgeMargin = 48
		if awayDir == 1 and f.x > STAGE.rightLedgeX - safeEdgeMargin then
			-- Near right ledge: hop over player toward center!
			awayDir = -1
			if f.jumpsLeft > 0 and f.aiDecisionTimer <= 0 then
				f.vy = 660
				f.grounded = false
				f.jumpsLeft = f.jumpsLeft - 1
				f.aiDecisionTimer = 0.45
			end
		elseif awayDir == -1 and f.x < STAGE.leftLedgeX + safeEdgeMargin then
			awayDir = 1
			if f.jumpsLeft > 0 and f.aiDecisionTimer <= 0 then
				f.vy = 660
				f.grounded = false
				f.jumpsLeft = f.jumpsLeft - 1
				f.aiDecisionTimer = 0.45
			end
		end

		if math.abs(percX - f.x) < 235 then
			moveDir = awayDir
		else
			-- Reached breathing distance: dash-dance lightly & face opponent
			if f.aiWeaveTimer <= 0 then
				f.aiWeaveDir = -f.aiWeaveDir
				f.aiWeaveTimer = 0.28 + math.random() * 0.22
			end
			moveDir = f.aiWeaveDir
		end
		f.facing = (percX >= f.x) and 1 or -1

	elseif f.aiState == "FOOTSIES" then
		-- Neutral Footsies: weave around 115px-165px spacing, bait & throw predictive / hope swings
		if f.aiWeaveTimer <= 0 then
			f.aiWeaveDir = (math.random() < 0.55) and -f.aiWeaveDir or ((predDX >= 0) and 1 or -1)
			f.aiWeaveTimer = 0.22 + math.random() * 0.28
		end

		local absPredDX = math.abs(predDX)
		if absPredDX > 170 then
			moveDir = (predDX >= 0) and 1 or -1
		elseif absPredDX < 95 then
			moveDir = (predDX >= 0) and -1 or 1
		else
			moveDir = f.aiWeaveDir
		end
		f.facing = (predDX >= 0) and 1 or -1

		-- Predictive Swing (if player is dashing into range) OR Random "Swing of Hope" in neutral!
		if f.aiDecisionTimer <= 0 and f.attackTimer <= 0 and f.aiAttackCooldown <= 0 then
			local playerApproaching = ( (percX < f.x and percVX > 110) or (percX > f.x and percVX < -110) )
			if predDist < 92 and math.abs(predDY) < 75 then
				-- Predictive strike where the AI expects the player to arrive in 0.3-0.5s!
				local preferHeavy = (opponent.damagePct >= 85 and math.random() < 0.42)
				StartWeaponAttack(f, ChooseAIDirectionalAttack(f, predDX, predDY, preferHeavy))
				f.aiDecisionTimer = 0.35 + math.random() * 0.25
			elseif absPredDX >= 85 and absPredDX <= 175 and (playerApproaching or math.random() < 0.35) then
				-- "Swing of Hope": pre-emptively swings at air hoping player runs into the blade!
				local hopeHeavy = (math.random() < 0.32)
				StartWeaponAttack(f, ChooseAIDirectionalAttack(f, predDX, predDY, hopeHeavy))
				f.aiDecisionTimer = 0.48 + math.random() * 0.30
			else
				f.aiDecisionTimer = 0.18 + math.random() * 0.16
			end
		end

	else
		-- "AGGRO": Close distance toward predicted player spot for 2-4 swings, then fallback
		if math.abs(predDX) > 42 then
			moveDir = (predDX >= 0) and 1 or -1
		end
		f.facing = (predDX >= 0) and 1 or -1

		-- Jump toward predicted high platform / aerial juggle
		if predDY > 68 and f.jumpsLeft > 0 and f.aiDecisionTimer <= 0 then
			f.vy = 655
			f.grounded = false
			f.jumpsLeft = f.jumpsLeft - 1
			f.aiDecisionTimer = 0.38
		elseif predDY < -45 and f.y > STAGE.topY + 40 then
			wantsFastFall = true
		end

		if f.aiDecisionTimer <= 0 and f.attackTimer <= 0 and f.aiAttackCooldown <= 0 then
			if predDist < 94 and math.abs(predDY) < 82 then
				local preferHeavy = (opponent.damagePct >= 80 and math.random() < 0.40) or (math.random() < 0.22)
				StartWeaponAttack(f, ChooseAIDirectionalAttack(f, predDX, predDY, preferHeavy))
				f.aiDecisionTimer = 0.32 + math.random() * 0.22
			elseif predDist < 155 and math.random() < 0.24 then
				-- Occasional pre-emptive lunge / hope swing while approaching
				StartWeaponAttack(f, ChooseAIDirectionalAttack(f, predDX, predDY, math.random() < 0.35))
				f.aiDecisionTimer = 0.42 + math.random() * 0.25
			else
				f.aiDecisionTimer = 0.14 + math.random() * 0.15
			end
		end
	end

	return moveDir, wantsFastFall
end

-- ============================================================================
-- PHYSICS, CURSOR "LOOK-AT" SWORD & STAGE BOUNCE
-- ============================================================================

local function UpdateFighter(f, opponent, dt)
	f.invulnTimer = math.max(0, f.invulnTimer - dt)

	-- 1. Grapple Chain Ledge Reel-In State
	if f.chainTimer > 0 then
		f.chainTimer = f.chainTimer - dt
		local pullDirX = f.chainTargetX - f.x
		local pullDirY = (f.chainTargetY + 34) - f.y
		f.vx = pullDirX * 9.5
		f.vy = pullDirY * 9.5
		f.x = f.x + f.vx * dt
		f.y = f.y + f.vy * dt

		for i = 1, CHAIN_LINKS do
			local t = i / CHAIN_LINKS
			local lx = Lerp(f.x + f.facing * 14, f.chainTargetX, t)
			local ly = Lerp(f.y + 4, f.chainTargetY, t)
			f.chainControls[i]:SetAnchoredPosition(lx, ly)
			f.chainControls[i]:SetVisible(true)
		end

		if f.chainTimer <= 0 then
			for i = 1, CHAIN_LINKS do
				f.chainControls[i]:SetVisible(false)
			end
			f.vy = 460
			f.jumpsLeft = 2
		end
	else
		for i = 1, CHAIN_LINKS do
			f.chainControls[i]:SetVisible(false)
		end
	end

	-- 2. Input / AI Movement & Cursor Aim Updates
	local moveDir = 0
	local wantsFastFall = false

	if not f.isAI then
		moveDir = (keys.right and 1 or 0) - (keys.left and 1 or 0)
		wantsFastFall = keys.down
		f.aimX = cursorX
		f.aimY = cursorY
		-- Orient toward mouse cursor when not locked in attack/hitstun (allows footsies backstepping!)
		if f.attackTimer <= 0 and f.hitstunTimer <= 0 and f.chainTimer <= 0 then
			local aimDX = f.aimX - f.x
			if math.abs(aimDX) > 10 then
				f.facing = (aimDX >= 0) and 1 or -1
			elseif moveDir ~= 0 then
				f.facing = moveDir
			end
		end
	else
		moveDir, wantsFastFall = UpdateRivalBrain(f, opponent, dt)
	end

	-- 3. Horizontal Movement & Hitstun Bounce Physics
	if f.chainTimer <= 0 then
		if f.hitstunTimer > 0 then
			f.hitstunTimer = f.hitstunTimer - dt
			f.vx = f.vx * (1 - 0.85 * dt)
			if math.abs(f.vx) + math.abs(f.vy) > 520 and math.random() < 0.45 then
				SpawnParticle(f.x, f.y, 0, 0, 11, Color.FromRGBA(235, 225, 210, 150), 0.22)
			end
		else
			local maxRunSpeed = 395
			local accel = f.grounded and 2450 or 1500
			if moveDir ~= 0 then
				f.vx = Clamp(f.vx + moveDir * accel * dt, -maxRunSpeed, maxRunSpeed)
			else
				local friction = f.grounded and 2150 or 460
				if f.vx > 0 then
					f.vx = math.max(0, f.vx - friction * dt)
				elseif f.vx < 0 then
					f.vx = math.min(0, f.vx + friction * dt)
				end
			end
		end

		-- Gravity
		local grav = (wantsFastFall and f.vy < 0 and f.hitstunTimer <= 0) and FAST_FALL_GRAVITY or GRAVITY
		f.vy = f.vy + grav * dt

		local prevY = f.y
		f.x = f.x + f.vx * dt
		f.y = f.y + f.vy * dt

		-- 4. Stage & Pass-Through Platform Collision (with High-% Elastic Tech Bounce!)
		f.grounded = false
		local footOffset = 28

		-- Main Stage Top Surface
		if f.x >= STAGE.leftLedgeX - 14 and f.x <= STAGE.rightLedgeX + 14 then
			if prevY - footOffset >= STAGE.topY - 12 and f.y - footOffset <= STAGE.topY and f.vy <= 0 then
				f.y = STAGE.topY + footOffset
				if f.hitstunTimer > 0 and f.vy < -410 then
					f.vy = -f.vy * 0.76
					shakeTimer = 0.14
					shakePower = 7
				else
					f.vy = 0
					f.grounded = true
					f.jumpsLeft = 2
				end
			end
		end

		-- 3 Battle Platforms (Pass-through when holding S / Down)
		if not wantsFastFall and f.vy <= 0 then
			for _, plat in ipairs({ STAGE.platL, STAGE.platR, STAGE.platTop }) do
				local pTop = plat.y + plat.h * 0.5
				if f.x >= plat.x - plat.w * 0.5 - 10 and f.x <= plat.x + plat.w * 0.5 + 10 then
					if prevY - footOffset >= pTop - 10 and f.y - footOffset <= pTop then
						f.y = pTop + footOffset
						if f.hitstunTimer > 0 and f.vy < -430 then
							f.vy = -f.vy * 0.72
						else
							f.vy = 0
							f.grounded = true
							f.jumpsLeft = 2
						end
					end
				end
			end
		end
	end

	-- 5. Compute Local "Look-At" Cursor / Target Vector for Detached Sword & Head
	local localDX = math.max(4, (f.aimX - f.x) * f.facing)
	local localDY = Clamp(f.aimY - f.y, -260, 260)
	local lookAngleRad = math.atan(localDY, localDX)
	f.lookAngleRad = Lerp(f.lookAngleRad, lookAngleRad, math.min(1, dt * 18.0))

	-- In our canvas coordinate system, blade points straight UP (+Y) at rotZ = 0,
	-- and rotates clockwise toward forward (+X) at rotZ = -90 degrees (automatically mirrored when facing = -1):
	local baseLookRotZ = math.deg(f.lookAngleRad) - 90

	-- 6. Weapon Swing Animation vs. Detached "Look-At" Orbit Pose
	if f.attackTimer > 0 then
		local def = ATTACK_DEFS[f.attackType] or ATTACK_DEFS.LIGHT_SIDE
		f.attackTimer = math.max(0, f.attackTimer - dt)
		local p = 1.0 - (f.attackTimer / math.max(0.01, f.attackDuration))

		-- Extend detached weapon hand outward in the direction of the strike!
		local swingExtend = math.sin(p * math.pi) * (def.isHeavy and 16 or 10)
		local swingDeg = Lerp(def.startRot, def.endRot, p)
		f.weaponPivot:SetAnchoredPosition(42 + swingExtend * 0.7, 29 + (def.offsetY * 0.25))
		f.weaponPivot:SetLocalRotation(0, 0, swingDeg)

		local hbX = f.x + f.facing * def.offsetX
		local hbY = f.y + def.offsetY
		f.swingArc:SetAnchoredPosition(hbX, hbY)
		f.swingArc:SetVisible(true)

		-- Active Hitbox Frames (0.18 <= p <= 0.82)
		if not f.attackHitDealt and p >= 0.18 and p <= 0.82 and opponent.invulnTimer <= 0 then
			if (opponent.x - hbX) ^ 2 + (opponent.y - hbY) ^ 2 <= def.radius * def.radius then
				f.attackHitDealt = true
				ApplyHitKnockback(f, opponent, f.attackType)
			end
		end
	else
		f.swingArc:SetVisible(false)
		f.blade.imageColor = Color.FromRGB(225, 235, 245)

		-- Detached Sword Orbits & Points Toward Cursor ("Look-At" like Brawlhalla!)
		local orbitRadius = 15
		local handOrbitX = 32 + math.cos(f.lookAngleRad) * orbitRadius
		local handOrbitY = 29 + math.sin(f.lookAngleRad) * orbitRadius
		local idleBob = math.sin(elapsedTime * 5.2) * 3.5

		f.weaponPivot:SetAnchoredPosition(handOrbitX, handOrbitY)
		f.weaponPivot:SetLocalRotation(0, 0, baseLookRotZ + idleBob)
	end

	-- 7. Detached Limbs Procedural Animation (Stride, Bob & Eye Look-At)
	local eyeLookY = Clamp(math.sin(f.lookAngleRad) * 2.5, -2, 2.5)
	local speedAbs = math.abs(f.vx)
	if f.grounded and speedAbs > 25 then
		f.animPhase = f.animPhase + dt * (speedAbs * 0.045)
		local strideX = math.sin(f.animPhase) * 11
		local strideY = math.max(0, math.cos(f.animPhase) * 6)
		local strideX2 = math.sin(f.animPhase + math.pi) * 11
		local strideY2 = math.max(0, math.cos(f.animPhase + math.pi) * 6)

		f.footL:SetAnchoredPosition(30 + strideX, 7 + strideY)
		f.footR:SetAnchoredPosition(34 + strideX2, 7 + strideY2)
		f.backHand:SetAnchoredPosition(20 - strideX * 0.6, 28)
		f.torso:SetAnchoredPosition(32, 26 + math.abs(math.sin(f.animPhase)) * 2.5)
		f.head:SetAnchoredPosition(33, 48 + math.abs(math.sin(f.animPhase)) * 2.0)
		f.eye:SetAnchoredPosition(39, 48 + math.abs(math.sin(f.animPhase)) * 2.0 + eyeLookY)
	elseif not f.grounded then
		f.footL:SetAnchoredPosition(25, 11)
		f.footR:SetAnchoredPosition(39, 13)
		f.backHand:SetAnchoredPosition(16, 35)
		f.eye:SetAnchoredPosition(38, 48 + eyeLookY)
	else
		local bob = math.sin(elapsedTime * 4.2) * 2.0
		f.footL:SetAnchoredPosition(25, 7)
		f.footR:SetAnchoredPosition(39, 7)
		f.torso:SetAnchoredPosition(32, 26 + bob * 0.6)
		f.head:SetAnchoredPosition(32, 48 + bob)
		f.eye:SetAnchoredPosition(38, 48 + bob + eyeLookY)
		f.backHand:SetAnchoredPosition(19, 28 - bob * 0.5)
	end

	-- Flip side-profile character horizontally via SetLocalScale(facing, 1, 1)
	f.control:SetLocalScale(f.facing, 1, 1)
	f.control:SetAnchoredPosition(f.x, f.y)

	-- 8. Check Blast Zone Ring-Out (Off-Screen KO!)
	if f.x < -110 or f.x > screenWidth + 110 or f.y < -110 or f.y > screenHeight + 150 then
		local bx = Clamp(f.x, 30, screenWidth - 30)
		local by = Clamp(f.y, 30, screenHeight - 30)
		for s = 1, 10 do
			local ang = math.random() * math.pi * 2
			SpawnParticle(bx, by, math.cos(ang) * 340, math.sin(ang) * 340, 18, Color.FromRGB(255, 95, 65), 0.42)
		end
		shakeTimer = 0.38
		shakePower = 14

		f.stocks = math.max(0, f.stocks - 1)
		f.damagePct = 0
		f.x = STAGE.mainX + (f.isAI and 110 or -110)
		f.y = STAGE.topY + 180
		f.vx = 0
		f.vy = 0
		f.hitstunTimer = 0
		f.chainTimer = 0
		f.invulnTimer = 1.8
	end
end

-- ============================================================================
-- HUD & INPUTS
-- ============================================================================

local function GetDamageColor(pct)
	if pct < 50 then
		return Color.FromRGB(245, 245, 240)
	elseif pct < 100 then
		return Color.FromRGB(250, 210, 75)
	elseif pct < 160 then
		return Color.FromRGB(250, 125, 45)
	else
		return Color.FromRGB(240, 50, 50)
	end
end

local function BuildHUD()
	bannerText = NewText(root, "TopTitle", "⚔ DETACHED-LIMB PLATFORM FIGHTER (CURSOR AIM & FOOTSIES AI) ⚔",
		screenWidth * 0.5, screenHeight - 24, 680, 30, 14, Color.FromRGB(235, 195, 105), Color.FromRGBA(20, 16, 12, 220))
	subBannerText = NewText(root, "SubTitle",
		"MOUSE: Aim Sword  |  LMB/F: Light  |  RMB/E: Heavy  |  Q: Ledge Grapple  |  R: Reset",
		screenWidth * 0.5, screenHeight - 48, 910, 22, 11, Color.FromRGB(210, 195, 165), Color.FromRGBA(20, 16, 12, 190))

	-- Player 1 Damage % & Stock Panel
	local leftPanelX = 265 + stageOffsetX
	local rightPanelX = 695 + stageOffsetX
	NewImage(root, "P1Card", leftPanelX, 126, 245, 94, Color.FromRGBA(22, 18, 15, 228), RECT_RES, true)
	p1PctText = NewText(root, "P1Pct", "BOUNCE: 0%", leftPanelX, 151, 225, 28, 14, Color.FromRGB(245, 245, 240))
	p1StockText = NewText(root, "P1Stocks", "STOCKS: ★ ★ ★", leftPanelX, 120, 225, 22, 11, Color.FromRGB(95, 210, 255))
	p1MoveText = NewText(root, "P1Move", "AIM: CURSOR LOOK-AT", leftPanelX, 91, 225, 20, 10, Color.FromRGB(185, 170, 140))

	-- Rival Bot Damage %, Stock & Footsies Mindset Panel
	NewImage(root, "P2Card", rightPanelX, 126, 245, 94, Color.FromRGBA(22, 18, 15, 228), RECT_RES, true)
	p2PctText = NewText(root, "P2Pct", "BOUNCE: 0%", rightPanelX, 151, 225, 28, 14, Color.FromRGB(245, 245, 240))
	p2StockText = NewText(root, "P2Stocks", "STOCKS: ★ ★ ★", rightPanelX, 120, 225, 22, 11, Color.FromRGB(250, 105, 115))
	p2StateText = NewText(root, "P2State", "AI: FOOTSIES (0.3s PRED)", rightPanelX, 91, 225, 20, 10, Color.FromRGB(215, 185, 135))
end

local function UpdateHUDAndParticles(dt)
	for i = 1, NUM_PARTICLES do
		local p = particlePool[i]
		if p.active then
			p.life = p.life - dt
			if p.life <= 0 then
				p.active = false
				p.control:SetVisible(false)
			else
				p.x = p.x + p.vx * dt
				p.y = p.y + p.vy * dt
				p.control:SetAnchoredPosition(p.x, p.y)
			end
		end
	end

	if aimReticle and aimDot then
		aimReticle:SetAnchoredPosition(cursorX, cursorY)
		aimDot:SetAnchoredPosition(cursorX, cursorY)
	end

	p1PctText.text = string.format("BOUNCE: %d%%", math.floor(player.damagePct))
	p1PctText.fontColor = GetDamageColor(player.damagePct)
	p1StockText.text = "STOCKS: " .. string.rep("★ ", player.stocks)
	p1MoveText.text = "LAST: " .. player.lastMoveLabel

	p2PctText.text = string.format("BOUNCE: %d%%", math.floor(rival.damagePct))
	p2PctText.fontColor = GetDamageColor(rival.damagePct)
	p2StockText.text = "STOCKS: " .. string.rep("★ ", rival.stocks)

	local accPct = (rival.aiSwingsTotal > 0) and math.floor((rival.aiHitsLanded / rival.aiSwingsTotal) * 100) or 100
	p2StateText.text = string.format("AI: %s | HIT ACC: %d%%", rival.aiState, accPct)

	if player.stocks <= 0 or rival.stocks <= 0 then
		local won = (rival.stocks <= 0)
		bannerText.text = won and "★ GAME SET! YOU KNOCKED OUT THE RIVAL! (PRESS [R] FOR REMATCH) ★"
			or "☠ GAME SET! RIVAL CLAIMED VICTORY! (PRESS [R] FOR REMATCH) ☠"
		bannerText.fontColor = won and Color.FromRGB(115, 245, 140) or Color.FromRGB(255, 95, 95)
	end
end

-- Resolves UP / DOWN / SIDE for both Light [LMB/F] and Heavy [RMB/E] using W/S keys OR Mouse Cursor Angle!
local function TriggerPlayerAttack(isHeavy)
	if not player then return end
	local prefix = isHeavy and "HEAVY_" or "LIGHT_"

	-- Orient toward cursor immediately before swinging
	local aimDX = cursorX - player.x
	local aimDY = cursorY - player.y
	if math.abs(aimDX) > 8 then
		player.facing = (aimDX >= 0) and 1 or -1
	end

	-- Priority 1: Explicit W / S directional key held
	if keys.up then
		StartWeaponAttack(player, prefix .. "UP")
		return
	elseif keys.down then
		StartWeaponAttack(player, prefix .. "DOWN")
		return
	end

	-- Priority 2: Mouse Cursor Aim Direction (Look-At Vertical Angle)
	local absDX = math.max(1, math.abs(aimDX))
	if aimDY > absDX * 0.85 and aimDY > 34 then
		StartWeaponAttack(player, prefix .. "UP")
	elseif aimDY < -absDX * 0.85 and aimDY < -34 then
		StartWeaponAttack(player, prefix .. "DOWN")
	else
		StartWeaponAttack(player, prefix .. "SIDE")
	end
end

local function HandlePlayerJumpOrChain()
	if not player then return end
	local offStage = math.abs(player.x - STAGE.mainX) > STAGE.mainW * 0.48 or player.y < STAGE.topY
	if offStage and player.jumpsLeft <= 0 then
		TryStartChainRecovery(player)
		return
	end
	if player.jumpsLeft > 0 and player.hitstunTimer <= 0 then
		player.vy = 660
		player.grounded = false
		player.jumpsLeft = player.jumpsLeft - 1
	elseif offStage then
		TryStartChainRecovery(player)
	end
end

local function ResetMatch()
	player.x = STAGE.mainX - 120
	player.y = STAGE.topY + 40
	player.vx = 0
	player.vy = 0
	player.damagePct = 0
	player.stocks = 3
	player.lastMoveLabel = "READY"

	rival.x = STAGE.mainX + 120
	rival.y = STAGE.topY + 40
	rival.vx = 0
	rival.vy = 0
	rival.damagePct = 0
	rival.stocks = 3
	rival.aiState = "FOOTSIES"
	rival.aiPressureSwings = 0
	rival.aiSwingsTotal = 0
	rival.aiHitsLanded = 0

	InitPlayerHistory()
	bannerText.text = "⚔ DETACHED-LIMB PLATFORM FIGHTER (CURSOR AIM & FOOTSIES AI) ⚔"
	bannerText.fontColor = Color.FromRGB(235, 195, 105)
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

	-- Jump / Double Jump / Off-Stage Chain Recovery [SPACE]
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardJumpKeyDown, function()
		HandlePlayerJumpOrChain()
		return true
	end)
	-- Also allow W to jump when tapped
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardMoveForwardKeyDown, function()
		keys.up = true
		HandlePlayerJumpOrChain()
		return true
	end)

	-- Dedicated Grapple Chain Ledge Recovery [Q]
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardCharacterSkill2KeyDown, function()
		TryStartChainRecovery(player)
		return true
	end)

	-- Light Directional Slash [LMB] or [F] (+W/S or Cursor Up/Down/Side)
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardNormalAttackKeyDown, function()
		TriggerPlayerAttack(false)
		return true
	end)
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardInteractKeyDown, function()
		TriggerPlayerAttack(false)
		return true
	end)

	-- Sprint is shared by Left Shift and RMB; always use it for heavy attacks.
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardSprintKeyDown, function()
		TriggerPlayerAttack(true)
		return true
	end)
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardCharacterSkill1KeyDown, function()
		TriggerPlayerAttack(true)
		return true
	end)

	-- Rematch [R] (KeyboardCharacterSkill3KeyDown)
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardCharacterSkill3KeyDown, function()
		ResetMatch()
		return true
	end)
end

function OnStart()
	math.randomseed(777)
	root = script.object
	if not root then return end

	screenWidth, screenHeight = game.GetUICanvasSize()
	CenterStageLayout()
	cursorX = screenWidth * 0.5
	cursorY = screenHeight * 0.5
	root:SetAnchorMin(0, 0)
	root:SetAnchorMax(0, 0)
	root:SetPivot(0, 0)
	root:SetAnchoredPosition(0, 0)
	root:SetSizeDelta(screenWidth, screenHeight)
	root.disableKeyEventPassthrough = true
	root.disableCursorEventPassthrough = true
	root.showCursor = true

	worldLayer = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, root))
	if not worldLayer then return end
	Configure(worldLayer, screenWidth * 0.5, screenHeight * 0.5, screenWidth, screenHeight, "WorldLayer")

	BuildStageVisuals()
	player = CreateFighter("Player1", STAGE.mainX - 120, STAGE.topY + 40, 1,
		Color.FromRGB(55, 155, 235), Color.FromRGB(245, 200, 75), false)
	rival = CreateFighter("RivalBot", STAGE.mainX + 120, STAGE.topY + 40, -1,
		Color.FromRGB(215, 55, 65), Color.FromRGB(240, 230, 215), true)

	InitPlayerHistory()
	BuildHUD()
	RegisterInputs()

	script:EnableUpdate(true)
	print("[Platform Fighter] Cursor Look-At Sword, Directional Heavy Attacks & Footsies AI Ready!")
end

function OnUpdate(deltaTime)
	if not player or not rival then return end
	local dt = math.min(deltaTime, 0.04)
	elapsedTime = elapsedTime + dt

	-- Poll live cursor coordinates for detached sword Look-At aiming
	if game.GetCursorUIPos then
		local cx, cy = game.GetCursorUIPos()
		if cx and cy and (cx > 0 or cy > 0) then
			cursorX = Clamp(cx, 16, screenWidth - 16)
			cursorY = Clamp(cy, 16, screenHeight - 16)
		end
	end

	if shakeTimer > 0 then
		shakeTimer = math.max(0, shakeTimer - dt)
		local sx = (math.random() - 0.5) * 2 * shakePower
		local sy = (math.random() - 0.5) * 2 * shakePower
		worldLayer:SetAnchoredPosition(screenWidth * 0.5 + sx, screenHeight * 0.5 + sy)
	else
		worldLayer:SetAnchoredPosition(screenWidth * 0.5, screenHeight * 0.5)
	end

	if hitstopTimer > 0 then
		hitstopTimer = math.max(0, hitstopTimer - dt)
		return
	end

	if player.stocks > 0 and rival.stocks > 0 then
		RecordPlayerHistory(dt)
		UpdateFighter(player, rival, dt)
		UpdateFighter(rival, player, dt)
	end
	UpdateHUDAndParticles(dt)
end

function OnDestroy()
	controls = {}
	particlePool = {}
	playerHistory = {}
	player = nil
	rival = nil
end
