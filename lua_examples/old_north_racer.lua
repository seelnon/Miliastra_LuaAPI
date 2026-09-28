-- =========  Setup Inside Miliastra Client Control Templates  ============
--
-- Container_Instance ID   - 1073741851
-- TextBox_Instance ID     - 1073741852
-- Image_Instance ID       - 1073741853
-- PresetButton_Instance   - 1073741854
--
-- Reference Asset Shapes:
--   100001 = Rectangle
--   100002 = Circle
--   100003 = Triangle
--   100004 = 4-Point Star
--
-- Single-file root-mounted GTA2 / "The Perfect Race"-style 2D Top-Down
-- Northbound Arcade Racer.
--
-- Physics Highlights:
--   • Speed-Dependent Steering Stiffness: Nimble turning at low/medium speeds;
--     wider turning radius at high speeds requiring proper braking/entry speed.
--   • Progressive Powerslide & Scrub Friction: Holding a turn at speed (or
--     tapping SPACE) pushes tires past their lateral grip limit, inducing a
--     powerslide that scrubs wheel speed (turning too hard = sliding = slowdown).
--   • Rubber Temperature & Sideways Drift: Sustained sliding heats up the
--     rear rubber (Tire Temp gauge). Hotter tires lose more lateral grip,
--     causing the car to pitch deeper sideways with thicker skidmarks & smoke.
-- ========================================================================

local CONTAINER_TEMPLATE = 1073741851
local TEXT_TEMPLATE = 1073741852
local IMAGE_TEMPLATE = 1073741853
local BUTTON_TEMPLATE = 1073741854

local RECTANGLE_RESOURCE = 100001
local CIRCLE_RESOURCE = 100002
local TRIANGLE_RESOURCE = 100003
local STAR4_RESOURCE = 100004

-- Fixed Design Container & World Constants (Centered Fit-to-View)
local DESIGN_WIDTH = 960
local DESIGN_HEIGHT = 640
local screenWidth = DESIGN_WIDTH
local screenHeight = DESIGN_HEIGHT
local rootScale = 1.0
local SLICE_HEIGHT = 28
local NUM_ROAD_SLICES = 46
local NUM_SKIDMARKS = 44
local NUM_PARTICLES = 24
local NUM_ROADSIDE_PROPS = 18

-- Car Physics Constants ("The Perfect Race" + GTA2 Tire Scrub & Heat Model)
local ENGINE_ACCEL = 640
local BRAKE_DECEL = 880
local REVERSE_ACCEL = 320
local MAX_FORWARD_SPEED = 840
local BOOST_EXTRA_SPEED = 190
local ROLLING_DRAG = 0.36
local AIR_DRAG = 0.00038

-- Lateral Tire Grip Envelope (Higher = tracks straight with nose; Lower = goes sideways)
local GRIP_COLD_CLEAN = 11.2     -- Crisp grip when driving cleanly within tire limits
local GRIP_POWERSLIDE_MIN = 1.45 -- Deep sideways slide when tires are hot & pushed hard
local GRIP_OFFROAD = 2.8

-- Progressive Steering & Speed-Stiffening Constants
local STEER_BUILD_RATE = 6.65    -- How fast steering lock winds up when holding A/D
local STEER_RETURN_RATE = 5.4    -- How fast wheels re-center when releasing A/D
local LOW_SPEED_TURN_RATE = 116  -- Nimble turning rate (deg/s) at slower cornering speeds
local ANGULAR_DAMPING = 8.2

-- Tire Scrub Friction & Rubber Temperature Constants
local SCRUB_FRICTION_BASE = 0.62 -- Forward speed bled per unit of lateral slip
local SCRUB_FRICTION_HOT = 1.35  -- Extra speed bleed when overheating tires in a deep slide
local TIRE_HEAT_GAIN_RATE = 0.58 -- How fast rubber heats up during heavy cornering/powerslide
local TIRE_COOL_RATE = 0.44      -- How fast rubber cools down when driving straight/smoothly

-- Runtime Hierarchy & Control Pools
local root = nil
local worldLayer = nil
local roadSlices = {}
local skidPool = {}
local particlePool = {}
local propPool = {}
local controls = {}

-- Car Control Hierarchy
local car = nil

-- HUD Controls
local hudTopBar = nil
local paceNoteBadge = nil
local paceNoteSub = nil
local speedLabel = nil
local tireTempLabel = nil
local tireBarBg = nil
local tireBarFill = nil
local driftLabel = nil
local statsLabel = nil
local controlsHintLabel = nil

-- Input State
local keys = {
	up = false,
	down = false,
	left = false,
	right = false,
	handbrake = false,
	boost = false
}

-- Camera & World State
local cameraX = 0
local cameraY = 0
local shakeTimer = 0
local shakeIntensity = 0

-- Procedural Road Spine Generator State
local roadNodes = {}
local highestGeneratedIdx = -10
local currentPatternQueue = {}
local roadGenX = 0
local roadGenHeading = 0 -- radians relative to North (+Y)
local roadGenCurvature = 0
local lastPropSpawnIdx = 0

-- Scoring & Drift Telemetry
local totalDistanceMeters = 0
local totalScore = 0
local currentDriftScore = 0
local driftMultiplier = 1.0
local driftComboTimer = 0
local isDrifting = false
local skidNextIdx = 1
local skidSpawnAccum = 0
local smokeSpawnAccum = 0
local particleNextIdx = 1

-- Colors Palette (Elden-Gold + GTA2 Dusk Asphalt Aesthetic)
local PALETTE = {
	grassDark = Color.FromRGB(24, 30, 22),
	asphalt = Color.FromRGB(42, 40, 44),
	curbRed = Color.FromRGB(205, 58, 48),
	curbWhite = Color.FromRGB(232, 224, 205),
	curbGold = Color.FromRGB(218, 168, 72),
	laneYellow = Color.FromRGB(230, 184, 68),
	skidWarm = Color.FromRGBA(18, 16, 16, 145),
	skidHot = Color.FromRGBA(10, 8, 8, 215),
	smokeColor = Color.FromRGBA(225, 220, 210, 155),
	smokeHot = Color.FromRGBA(245, 235, 220, 195),
	dirtColor = Color.FromRGBA(126, 94, 58, 175),
	sparkColor = Color.FromRGBA(255, 195, 65, 235),
	carShadow = Color.FromRGBA(0, 0, 0, 120),
	carBody = Color.FromRGB(210, 48, 42),
	carStripe = Color.FromRGB(242, 230, 200),
	carCabin = Color.FromRGB(26, 24, 30),
	carGlass = Color.FromRGB(75, 110, 138),
	wheelDark = Color.FromRGB(18, 18, 20),
	wheelHot = Color.FromRGB(165, 55, 35),
	headlightBeam = Color.FromRGBA(255, 244, 190, 65),
	taillightDim = Color.FromRGB(120, 22, 22),
	taillightBright = Color.FromRGB(255, 50, 40),
	treeFoliage = Color.FromRGB(44, 72, 38),
	lampGlow = Color.FromRGBA(255, 205, 110, 52),
	signWarn = Color.FromRGB(235, 175, 50),
	hudBg = Color.FromRGBA(22, 18, 15, 215),
	hudGold = Color.FromRGB(212, 175, 95),
	hudWhite = Color.FromRGB(242, 236, 224),
	paceStraight = Color.FromRGB(110, 205, 120),
	paceEasy = Color.FromRGB(215, 190, 75),
	paceMedium = Color.FromRGB(240, 135, 50),
	paceHard = Color.FromRGB(235, 65, 60),
	tireOptimal = Color.FromRGB(95, 210, 125),
	tireWarm = Color.FromRGB(238, 185, 65),
	tireHot = Color.FromRGB(242, 75, 55)
}

-- ============================================================================
-- HELPER FUNCTIONS FOR UI CONTROLS
-- ============================================================================

local function Clamp(val, low, high)
	if val < low then return low end
	if val > high then return high end
	return val
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
	if softEdge then
		image.enableSoftEdge = true
		image:SetSoftEdgeWidth(6, 6)
	end
	return image
end

local function NewText(parent, name, text, x, y, width, height, size, textColor, bgColor)
	local label = Remember(game.InstantiateClientUIControl(TEXT_TEMPLATE, parent))
	if not label then return nil end
	local fontSize = size or 16
	local textHeight = math.max(height, fontSize * 2)
	Configure(label, x, y, width, textHeight, name)
	label.fontSize = fontSize
	label.fontColor = textColor or PALETTE.hudWhite
	label.bgColor = bgColor or Color.FromRGBA(0, 0, 0, 0)
	label.adaptiveFontSize = false
	label.horizontalAlignment = Enum.TextHorizontalAlignment.Middle
	label.verticalAlignment = Enum.TextVerticalAlignment.Middle
	label.text = text or ""
	label:SetVisible(true)
	label:SetAsLastSibling()
	return label
end

-- ============================================================================
-- PROCEDURAL NORTHBOUND ROAD & PACE-NOTE GENERATOR
-- ============================================================================

local CORNER_CATALOG = {
	{
		type = "STRAIGHT",
		label = "▲ STRAIGHT",
		advice = "FULL THROTTLE • COOL TIRES",
		severity = 0,
		length = 22,
		targetCurve = 0,
		roadWidth = 275
	},
	{
		type = "EASY LEFT",
		label = "↰ EASY LEFT 5",
		advice = "FEATHER STEERING • KEEP GRIP",
		severity = 1,
		length = 25,
		targetCurve = 0.018,
		roadWidth = 270
	},
	{
		type = "EASY RIGHT",
		label = "↱ EASY RIGHT 5",
		advice = "FEATHER STEERING • KEEP GRIP",
		severity = 1,
		length = 25,
		targetCurve = -0.018,
		roadWidth = 270
	},
	{
		type = "MEDIUM LEFT",
		label = "⬅ MEDIUM LEFT 3",
		advice = "LIFT GAS OR LIGHT POWERSLIDE",
		severity = 2,
		length = 27,
		targetCurve = 0.032,
		roadWidth = 260
	},
	{
		type = "MEDIUM RIGHT",
		label = "➡ MEDIUM RIGHT 3",
		advice = "LIFT GAS OR LIGHT POWERSLIDE",
		severity = 2,
		length = 27,
		targetCurve = -0.032,
		roadWidth = 260
	},
	{
		type = "SHARP LEFT",
		label = "⚡ SHARP LEFT 2",
		advice = "BRAKE ENTRY OR POWERSLIDE APEX!",
		severity = 3,
		length = 26,
		targetCurve = 0.048,
		roadWidth = 252
	},
	{
		type = "SHARP RIGHT",
		label = "⚡ SHARP RIGHT 2",
		advice = "BRAKE ENTRY OR POWERSLIDE APEX!",
		severity = 3,
		length = 26,
		targetCurve = -0.048,
		roadWidth = 252
	},
	{
		type = "HAIRPIN LEFT",
		label = "⚠️ HAIRPIN LEFT 1",
		advice = "SLOW DOWN TO TURN OR DEEP DRIFT!",
		severity = 4,
		length = 25,
		targetCurve = 0.062,
		roadWidth = 246
	},
	{
		type = "HAIRPIN RIGHT",
		label = "⚠️ HAIRPIN RIGHT 1",
		advice = "SLOW DOWN TO TURN OR DEEP DRIFT!",
		severity = 4,
		length = 25,
		targetCurve = -0.062,
		roadWidth = 246
	}
}

local function EnqueueNextRoadPattern()
	local choice = CORNER_CATALOG[math.random(2, #CORNER_CATALOG)]

	-- Bias away from extreme heading angles so the road always generally heads North (+Y)
	if roadGenHeading > 0.40 then
		local rightChoices = { CORNER_CATALOG[3], CORNER_CATALOG[5], CORNER_CATALOG[7], CORNER_CATALOG[9] }
		choice = rightChoices[math.random(1, #rightChoices)]
	elseif roadGenHeading < -0.40 then
		local leftChoices = { CORNER_CATALOG[2], CORNER_CATALOG[4], CORNER_CATALOG[6], CORNER_CATALOG[8] }
		choice = leftChoices[math.random(1, #leftChoices)]
	end

	currentPatternQueue[#currentPatternQueue + 1] = {
		type = choice.type,
		label = choice.label,
		advice = choice.advice,
		severity = choice.severity,
		remaining = choice.length,
		targetCurve = choice.targetCurve,
		roadWidth = choice.roadWidth
	}

	-- 35% chance to chain an S-Chicane
	if choice.severity >= 2 and choice.severity <= 3 and math.random() < 0.35 then
		local oppositeCurve = -choice.targetCurve
		local oppDir = oppositeCurve > 0 and "LEFT" or "RIGHT"
		local oppArrow = oppositeCurve > 0 and "⬅" or "➡"
		currentPatternQueue[#currentPatternQueue + 1] = {
			type = "CHICANE " .. oppDir,
			label = "⇄ CHICANE " .. oppArrow .. " " .. oppDir,
			advice = "MANAGE TIRE HEAT • WEIGHT TRANSFER!",
			severity = choice.severity,
			remaining = 20,
			targetCurve = oppositeCurve,
			roadWidth = 256
		}
	end

	-- Recovery straight so player can cool rubber and build exit speed
	local straightLen = math.random(15, 25)
	currentPatternQueue[#currentPatternQueue + 1] = {
		type = "STRAIGHT",
		label = "▲ STRAIGHT",
		advice = "FULL THROTTLE • COOL TIRES",
		severity = 0,
		remaining = straightLen,
		targetCurve = 0,
		roadWidth = 275
	}
end

local function GenerateNextRoadSlice(idx)
	if idx <= 12 then
		roadGenX = 0
		roadGenHeading = 0
		roadGenCurvature = 0
		roadNodes[idx] = {
			idx = idx,
			x = 0,
			y = idx * SLICE_HEIGHT,
			heading = 0,
			width = 275,
			cornerType = "STRAIGHT",
			cornerLabel = "▲ LAUNCH RUNWAY",
			cornerAdvice = "HOLD [W] TO ACCELERATE NORTH",
			severity = 0,
			curvature = 0
		}
		return
	end

	if #currentPatternQueue == 0 then
		EnqueueNextRoadPattern()
	end

	local activeSeg = currentPatternQueue[1]
	activeSeg.remaining = activeSeg.remaining - 1
	if activeSeg.remaining <= 0 then
		table.remove(currentPatternQueue, 1)
	end

	roadGenCurvature = Lerp(roadGenCurvature, activeSeg.targetCurve, 0.22)
	roadGenHeading = Clamp(roadGenHeading + roadGenCurvature, -0.64, 0.64)

	if activeSeg.severity == 0 then
		roadGenHeading = roadGenHeading * 0.86
	end

	local prevNode = roadNodes[idx - 1]
	local prevX = prevNode and prevNode.x or roadGenX
	roadGenX = prevX - math.sin(roadGenHeading) * SLICE_HEIGHT

	roadNodes[idx] = {
		idx = idx,
		x = roadGenX,
		y = idx * SLICE_HEIGHT,
		heading = roadGenHeading,
		width = activeSeg.roadWidth,
		cornerType = activeSeg.type,
		cornerLabel = activeSeg.label,
		cornerAdvice = activeSeg.advice,
		severity = activeSeg.severity,
		curvature = roadGenCurvature
	}
end

local function EnsureRoadGeneratedUpTo(targetY)
	local maxNeededIdx = math.floor(targetY / SLICE_HEIGHT) + 45
	while highestGeneratedIdx < maxNeededIdx do
		highestGeneratedIdx = highestGeneratedIdx + 1
		GenerateNextRoadSlice(highestGeneratedIdx)
	end

	local pruneBelowIdx = math.floor((cameraY - screenHeight) / SLICE_HEIGHT) - 25
	for k in pairs(roadNodes) do
		if k < pruneBelowIdx then
			roadNodes[k] = nil
		end
	end
end

local function SampleRoadAtY(worldY)
	local floatIdx = worldY / SLICE_HEIGHT
	local idx0 = math.floor(floatIdx)
	local idx1 = idx0 + 1
	local t = floatIdx - idx0

	local n0 = roadNodes[idx0]
	local n1 = roadNodes[idx1]
	if not n0 and not n1 then
		return 0, 275, 0, 0
	elseif not n0 then
		return n1.x, n1.width, n1.heading, n1.severity
	elseif not n1 then
		return n0.x, n0.width, n0.heading, n0.severity
	end

	return Lerp(n0.x, n1.x, t), Lerp(n0.width, n1.width, t), Lerp(n0.heading, n1.heading, t), n0.severity
end

-- ============================================================================
-- VISUAL POOLS: ROAD SLICES, PROPS, SKIDMARKS, PARTICLES & GTA2 CAR
-- ============================================================================

local function BuildWorldPools()
	roadSlices = {}
	skidPool = {}
	particlePool = {}
	propPool = {}

	-- Full-bleed grass backdrop so tall/wide aspect ratios are seamlessly covered
	NewImage(worldLayer, "GrassFullBackdrop", DESIGN_WIDTH * 0.5, DESIGN_HEIGHT * 0.5, 2600, 2600,
		PALETTE.grassDark, RECTANGLE_RESOURCE, false)

	for i = 1, NUM_ROAD_SLICES do
		local curb = NewImage(worldLayer, "RoadCurb_" .. i, -2000, -2000, 300, SLICE_HEIGHT + 3, PALETTE.curbRed, RECTANGLE_RESOURCE, false)
		local asphalt = NewImage(worldLayer, "RoadAsphalt_" .. i, -2000, -2000, 260, SLICE_HEIGHT + 3, PALETTE.asphalt, RECTANGLE_RESOURCE, false)
		local centerLine = NewImage(worldLayer, "RoadLane_" .. i, -2000, -2000, 6, SLICE_HEIGHT * 0.58, PALETTE.laneYellow, RECTANGLE_RESOURCE, false)
		roadSlices[i] = {
			curb = curb,
			asphalt = asphalt,
			centerLine = centerLine
		}
	end

	for i = 1, NUM_SKIDMARKS do
		local skid = NewImage(worldLayer, "Skid_" .. i, -2000, -2000, 6, 15, PALETTE.skidWarm, RECTANGLE_RESOURCE, false)
		skid:SetVisible(false)
		skidPool[i] = {
			control = skid,
			x = 0,
			y = 0,
			angle = 0,
			active = false
		}
	end

	for i = 1, NUM_ROADSIDE_PROPS do
		local propCtrl = NewImage(worldLayer, "Prop_" .. i, -2000, -2000, 28, 28, PALETTE.treeFoliage, CIRCLE_RESOURCE, false)
		propCtrl:SetVisible(false)
		propPool[i] = {
			control = propCtrl,
			x = 0,
			y = 0,
			width = 28,
			height = 28,
			radius = 14,
			kind = "tree",
			active = false
		}
	end

	for i = 1, NUM_PARTICLES do
		local pCtrl = NewImage(worldLayer, "Particle_" .. i, -2000, -2000, 14, 14, PALETTE.smokeColor, CIRCLE_RESOURCE, false)
		pCtrl:SetVisible(false)
		particlePool[i] = {
			control = pCtrl,
			x = 0,
			y = 0,
			vx = 0,
			vy = 0,
			size = 14,
			life = 0,
			maxLife = 0.45,
			active = false
		}
	end
end

local function BuildCar()
	local carW = 34
	local carH = 62
	local carRoot = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, worldLayer))
	Configure(carRoot, screenWidth * 0.5, screenHeight * 0.28, carW, carH, "GTA2_PlayerCar")

	-- Drop Shadow
	NewImage(carRoot, "Shadow", carW * 0.5 + 4, carH * 0.5 - 4, carW + 6, carH + 6, PALETTE.carShadow, RECTANGLE_RESOURCE, true)

	-- 4 Wheels (Front wheels steer; Rear wheels glow warm when rubber heats up!)
	local wheelFL = NewImage(carRoot, "WheelFL", 2, carH - 13, 7, 14, PALETTE.wheelDark, RECTANGLE_RESOURCE, false)
	local wheelFR = NewImage(carRoot, "WheelFR", carW - 2, carH - 13, 7, 14, PALETTE.wheelDark, RECTANGLE_RESOURCE, false)
	local wheelRL = NewImage(carRoot, "WheelRL", 2, 13, 8, 15, PALETTE.wheelDark, RECTANGLE_RESOURCE, false)
	local wheelRR = NewImage(carRoot, "WheelRR", carW - 2, 13, 8, 15, PALETTE.wheelDark, RECTANGLE_RESOURCE, false)

	-- Twin Headlight Beams
	local beamL = NewImage(carRoot, "BeamL", 8, carH + 42, 16, 80, PALETTE.headlightBeam, TRIANGLE_RESOURCE, false)
	local beamR = NewImage(carRoot, "BeamR", carW - 8, carH + 42, 16, 80, PALETTE.headlightBeam, TRIANGLE_RESOURCE, false)
	beamL:SetLocalRotation(0, 0, 180)
	beamR:SetLocalRotation(0, 0, 180)

	-- Main Muscle Chassis
	local chassis = NewImage(carRoot, "Chassis", carW * 0.5, carH * 0.5, carW, carH, PALETTE.carBody, RECTANGLE_RESOURCE, true)

	-- Twin Viper Racing Stripes
	NewImage(carRoot, "StripeL", carW * 0.5 - 4, carH * 0.5, 4, carH - 4, PALETTE.carStripe, RECTANGLE_RESOURCE, false)
	NewImage(carRoot, "StripeR", carW * 0.5 + 4, carH * 0.5, 4, carH - 4, PALETTE.carStripe, RECTANGLE_RESOURCE, false)

	-- Cabin & Windshields
	NewImage(carRoot, "Cabin", carW * 0.5, carH * 0.46, carW - 8, 30, PALETTE.carCabin, RECTANGLE_RESOURCE, true)
	NewImage(carRoot, "Windshield", carW * 0.5, carH * 0.62, carW - 10, 9, PALETTE.carGlass, RECTANGLE_RESOURCE, false)
	NewImage(carRoot, "RearWindow", carW * 0.5, carH * 0.28, carW - 12, 7, PALETTE.carGlass, RECTANGLE_RESOURCE, false)

	-- Tail / Brake Lights
	local tailL = NewImage(carRoot, "TailL", 7, 3, 8, 4, PALETTE.taillightDim, RECTANGLE_RESOURCE, false)
	local tailR = NewImage(carRoot, "TailR", carW - 7, 3, 8, 4, PALETTE.taillightDim, RECTANGLE_RESOURCE, false)

	return {
		control = carRoot,
		chassis = chassis,
		wheelFL = wheelFL,
		wheelFR = wheelFR,
		wheelRL = wheelRL,
		wheelRR = wheelRR,
		tailL = tailL,
		tailR = tailR,
		x = 0,
		y = 140,
		vx = 0,
		vy = 0,
		angle = 0,       -- Heading in degrees (0 = North +Y)
		angVel = 0,
		steerLock = 0,   -- Progressive steering lock (-1..+1)
		steerVisual = 0,
		forwardSpeed = 0,
		lateralSpeed = 0,
		tireHeat = 0,    -- 0.0 (cold/optimal grip) to 1.0 (overheated sideways slide)
		slipRatio = 0,   -- Current powerslide intensity (0..1)
		scrubLossKmh = 0,
		braking = false
	}
end

local function BuildHUD()
	-- Top Co-Driver Pace-Note Callout Banner
	NewImage(root, "SpeedPanel", 142, 94, 250, 160, PALETTE.hudBg, RECTANGLE_RESOURCE, true)
	NewImage(root, "ScorePanel", screenWidth - 156, 96, 278, 164, PALETTE.hudBg, RECTANGLE_RESOURCE, true)

	-- Bottom-Left Speedometer + Tire Rubber Temperature / Grip Bar
	speedLabel = NewText(root, "SpeedLabel", "000 KM/H   [GEAR 1]", 142, 147, 234, 30, 15, PALETTE.hudWhite)
	tireTempLabel = NewText(root, "TireTempLabel", "TIRE GRIP: 100%  [OPTIMAL]", 142, 109, 234, 24, 11, PALETTE.tireOptimal)
	tireBarBg = NewImage(root, "TireBarBg", 142, 75, 214, 12, Color.FromRGB(40, 35, 30), RECTANGLE_RESOURCE, false)
	tireBarFill = NewImage(root, "TireBarFill", 142, 75, 10, 8, PALETTE.tireOptimal, RECTANGLE_RESOURCE, false)

	-- Bottom-Right Pace Notes, Distance, Drift & Controls
	statsLabel = NewText(root, "StatsLabel", "NORTH: 0m  |  SCORE: 0", screenWidth - 156, 162, 262, 26, 12, PALETTE.hudGold)
	paceNoteBadge = NewText(root, "PaceNoteMain", "▲ STRAIGHT — FULL THROTTLE", screenWidth - 156, 134, 262, 26, 13, PALETTE.paceStraight)
	paceNoteSub = NewText(root, "PaceNoteSub", "PACE-NOTE RADAR ACTIVE • MANAGE ENTRY SPEED", screenWidth - 156, 108, 262, 18, 9, PALETTE.hudGold)
	controlsHintLabel = NewText(root, "ControlsHint", "SLOW = SHARP TURN  |  FAST TURN = SLIDE & SCRUB", screenWidth - 156, 78, 266, 20, 9, PALETTE.hudWhite)
	driftLabel = NewText(root, "DriftBanner", "", screenWidth - 156, 42, 266, 22, 9, PALETTE.curbGold, Color.FromRGBA(20, 16, 12, 195))
	driftLabel:SetVisible(false)
end

-- ============================================================================
-- PARTICLES, SKIDMARKS & ROADSIDE PROPS LOGIC
-- ============================================================================

local function SpawnSkidmark(wx, wy, angleDeg, isHot)
	local item = skidPool[skidNextIdx]
	skidNextIdx = (skidNextIdx % NUM_SKIDMARKS) + 1
	if not item then return end
	item.x = wx
	item.y = wy
	item.angle = angleDeg
	item.active = true
	item.control.imageColor = isHot and PALETTE.skidHot or PALETTE.skidWarm
	item.control:SetSizeDelta(isHot and 8 or 6, 15)
	item.control:SetLocalRotation(0, 0, angleDeg)
	item.control:SetVisible(true)
end

local function SpawnParticle(wx, wy, vx, vy, size, color, maxLife)
	local p = particlePool[particleNextIdx]
	particleNextIdx = (particleNextIdx % NUM_PARTICLES) + 1
	if not p then return end
	p.x = wx
	p.y = wy
	p.vx = vx
	p.vy = vy
	p.size = size
	p.life = maxLife or 0.42
	p.maxLife = p.life
	p.active = true
	p.control.imageColor = color
	p.control:SetSizeDelta(size, size)
	p.control:SetVisible(true)
end

local function MaybeSpawnRoadsideProps()
	local topSliceIdx = math.floor((cameraY + screenHeight + 120) / SLICE_HEIGHT)
	while lastPropSpawnIdx < topSliceIdx do
		lastPropSpawnIdx = lastPropSpawnIdx + 4
		local node = roadNodes[lastPropSpawnIdx]
		if node then
			local slot = nil
			for i = 1, NUM_ROADSIDE_PROPS do
				local cand = propPool[i]
				if not cand.active or cand.y < cameraY - 80 then
					slot = cand
					break
				end
			end

			if slot then
				local side = (lastPropSpawnIdx % 8 == 0) and 1 or -1
				local isCornerSign = node.severity >= 3
				if isCornerSign then
					local outSide = node.curvature > 0 and 1 or -1
					slot.x = node.x + outSide * (node.width * 0.5 + 34)
					slot.y = node.y
					slot.width = 22
					slot.height = 22
					slot.radius = 12
					slot.kind = "chevron"
					slot.control:SetImage(Enum.ImageSource.StaticReference, TRIANGLE_RESOURCE)
					slot.control.imageColor = PALETTE.signWarn
					slot.control:SetLocalRotation(0, 0, node.curvature > 0 and 90 or -90)
				elseif lastPropSpawnIdx % 12 == 0 then
					slot.x = node.x + side * (node.width * 0.5 + 26)
					slot.y = node.y
					slot.width = 56
					slot.height = 56
					slot.radius = 0
					slot.kind = "lamp"
					slot.control:SetImage(Enum.ImageSource.StaticReference, CIRCLE_RESOURCE)
					slot.control.imageColor = PALETTE.lampGlow
					slot.control:SetLocalRotation(0, 0, 0)
				else
					slot.x = node.x + side * (node.width * 0.5 + math.random(44, 105))
					slot.y = node.y
					slot.width = 34
					slot.height = 34
					slot.radius = 15
					slot.kind = "tree"
					slot.control:SetImage(Enum.ImageSource.StaticReference, CIRCLE_RESOURCE)
					slot.control.imageColor = PALETTE.treeFoliage
					slot.control:SetLocalRotation(0, 0, 0)
				end
				slot.control:SetSizeDelta(slot.width, slot.height)
				slot.active = true
				slot.control:SetVisible(true)
			end
		end
	end
end

-- ============================================================================
-- UPCOMING CORNER RADAR ("NOTION FOR WHAT TYPE OF CORNER IS AHEAD")
-- ============================================================================

local function EvaluateUpcomingCorner()
	local carIdx = math.floor(car.y / SLICE_HEIGHT)
	local currentNode = roadNodes[carIdx]

	local foundNode = nil
	local foundDistPx = 0

	for look = 5, 34 do
		local node = roadNodes[carIdx + look]
		if node and node.severity > 0 then
			if not foundNode or node.severity > foundNode.severity then
				foundNode = node
				foundDistPx = (node.y - car.y)
				if node.severity >= 3 then
					break
				end
			end
		end
	end

	if foundNode then
		local distMeters = math.max(5, math.floor(foundDistPx * 0.18))
		local color = PALETTE.paceEasy
		if foundNode.severity == 2 then
			color = PALETTE.paceMedium
		elseif foundNode.severity >= 3 then
			color = PALETTE.paceHard
		end
		paceNoteBadge.fontColor = color
		paceNoteBadge.text = foundNode.cornerLabel .. "   IN " .. tostring(distMeters) .. "m"
		paceNoteSub.text = foundNode.cornerAdvice
	elseif currentNode and currentNode.severity > 0 then
		paceNoteBadge.fontColor = PALETTE.paceMedium
		paceNoteBadge.text = "IN APEX: " .. currentNode.cornerLabel
		paceNoteSub.text = "FEATHER STEERING TO AVOID OVER-SLIDING & SCRUB SLOWDOWN"
	else
		paceNoteBadge.fontColor = PALETTE.paceStraight
		paceNoteBadge.text = "▲ CLEAR STRAIGHT AHEAD"
		paceNoteSub.text = "FULL THROTTLE NORTH  •  TIRES COOLING"
	end
end

-- ============================================================================
-- PHYSICS: SPEED-STIFFENED STEERING, POWERSLIDE SCRUB & TIRE TEMPERATURE
-- ============================================================================

local function UpdateCarPhysics(dt)
	-- 1. Car Basis Vectors (Angle = 0 points straight North +Y; +Angle turns West/Left)
	local rad = math.rad(car.angle)
	local fx = -math.sin(rad)
	local fy = math.cos(rad)
	local rx = math.cos(rad)
	local ry = math.sin(rad)

	-- 2. Decompose World Velocity into Forward & Lateral (Sideways Slip) Components
	local forwardSpeed = car.vx * fx + car.vy * fy
	local lateralSpeed = car.vx * rx + car.vy * ry
	local absForward = math.abs(forwardSpeed)

	-- 3. Sample Road Surface under Car
	local roadCenterX, roadWidth = SampleRoadAtY(car.y)
	local distFromCenter = math.abs(car.x - roadCenterX)
	local halfRoad = roadWidth * 0.5
	local onAsphalt = distFromCenter <= halfRoad
	local onCurb = distFromCenter > (halfRoad - 16) and distFromCenter <= (halfRoad + 18)

	-- 4. Progressive Steering Input Build-Up
	-- Tapping A/D gives light steering corrections; holding A/D winds up full steering lock
	local rawSteer = (keys.left and 1 or 0) - (keys.right and 1 or 0)
	if rawSteer ~= 0 then
		-- If reversing direction of steering, snap faster through center
		local buildRate = (rawSteer * car.steerLock < 0) and (STEER_RETURN_RATE * 1.3) or STEER_BUILD_RATE
		car.steerLock = Clamp(car.steerLock + rawSteer * buildRate * dt, -1.0, 1.0)
	else
		-- Self-aligning torque returns front wheels to center when released
		if car.steerLock > 0 then
			car.steerLock = math.max(0, car.steerLock - STEER_RETURN_RATE * dt)
		elseif car.steerLock < 0 then
			car.steerLock = math.min(0, car.steerLock + STEER_RETURN_RATE * dt)
		end
	end

	local absSteer = math.abs(car.steerLock)
	car.steerVisual = car.steerLock * 30
	car.wheelFL:SetLocalRotation(0, 0, car.steerVisual)
	car.wheelFR:SetLocalRotation(0, 0, car.steerVisual)

	-- 5. Speed-Dependent Turning Stiffness ("The Perfect Race" feel)
	-- At low/moderate speeds (~65..260 px/s), turning is easy and responsive.
	-- At high speeds (>320 px/s), pure grip turning becomes stiffer/wider unless you slow down or powerslide!
	local moveRamp = Clamp(absForward / 65, 0, 1)
	local highSpeedUndersteer = 1.0 / (1.0 + (math.max(0, absForward - 160) / 285) ^ 1.45)
	local cleanTurnRate = LOW_SPEED_TURN_RATE * moveRamp * highSpeedUndersteer

	-- 6. Lateral Shear Load, Powerslide Initiation & Rubber Temperature (tireHeat)
	-- Turning hard at high speed (or pulling handbrake) overloads the rear tires
	local corneringLoad = absSteer * Clamp(absForward / 275, 0, 2.25)
	if keys.handbrake and absForward > 110 then
		corneringLoad = math.max(corneringLoad, 1.35)
	end

	-- Powerslide engages when cornering load exceeds the static tire threshold (0.55)
	local overload = math.max(0, corneringLoad - 0.55)
	if overload > 0 then
		-- Pushing the turn harder heats up the rubber and deepens the slide
		local heatGain = overload * TIRE_HEAT_GAIN_RATE * (keys.handbrake and 1.45 or 1.0)
		car.tireHeat = Clamp(car.tireHeat + heatGain * dt, 0, 1.0)
	else
		-- Driving straight or feathering gentle turns cools the rubber back down
		local coolMult = (absSteer < 0.25) and 1.35 or 0.75
		car.tireHeat = Clamp(car.tireHeat - TIRE_COOL_RATE * coolMult * dt, 0, 1.0)
	end

	-- Powerslide rotational bite: turning deeper into a powerslide rotates the nose into the turn
	-- while lateral grip drops so the car's body pitches sideways relative to its travel vector!
	local powerslideYawBonus = 0
	if overload > 0 and absForward > 120 then
		powerslideYawBonus = Clamp(overload * 38 + car.tireHeat * 46, 0, 72) * Clamp(absForward / 320, 0.3, 1.1)
	end

	local reverseSign = forwardSpeed >= -10 and 1 or -1
	local targetAngVel = car.steerLock * (cleanTurnRate + powerslideYawBonus) * reverseSign
	car.angVel = Lerp(car.angVel, targetAngVel, math.min(1, dt * ANGULAR_DAMPING))
	car.angle = (car.angle + car.angVel * dt + 180) % 360 - 180

	-- Recompute car basis vectors after heading rotation!
	-- Because we project world velocity (car.vx, car.vy) onto the NEW rotated axes,
	-- rotating the nose automatically transfers forward velocity into lateralSpeed (sideways slip)!
	rad = math.rad(car.angle)
	fx = -math.sin(rad)
	fy = math.cos(rad)
	rx = math.cos(rad)
	ry = math.sin(rad)

	forwardSpeed = car.vx * fx + car.vy * fy
	lateralSpeed = car.vx * rx + car.vy * ry
	absForward = math.abs(forwardSpeed)

	-- 7. Dynamic Lateral Grip (Cold/Optimal Tires grip tight; Hot Over-Pushed Tires slide sideways!)
	local slideFactor = Clamp(overload * 0.55 + car.tireHeat * 0.78 + (keys.handbrake and 0.45 or 0), 0, 1.0)
	car.slipRatio = slideFactor

	local currentGrip = Lerp(GRIP_COLD_CLEAN, GRIP_POWERSLIDE_MIN, slideFactor)
	if not onAsphalt and not onCurb then
		currentGrip = math.min(currentGrip, GRIP_OFFROAD)
	end

	-- Apply lateral tire grip recovery
	lateralSpeed = lateralSpeed * math.max(0, 1 - currentGrip * dt)

	-- 8. Throttle, Braking & Powerslide Wheel-Scrub Friction (Turning/Sliding slows the car down!)
	local throttle = (keys.up and 1 or 0) - (keys.down and 1 or 0)
	local maxSpd = MAX_FORWARD_SPEED
	if not onAsphalt and not onCurb then
		maxSpd = maxSpd * 0.68
	end

	if throttle > 0 then
		-- While sliding sideways with hot tires, rear wheels spin and deliver slightly less forward drive
		local tractionEff = Lerp(1.0, 0.68, car.tireHeat * slideFactor)
		forwardSpeed = forwardSpeed + ENGINE_ACCEL * tractionEff * dt
		car.braking = false
	elseif throttle < 0 then
		if forwardSpeed > 30 then
			forwardSpeed = forwardSpeed - BRAKE_DECEL * dt
			car.braking = true
		else
			forwardSpeed = math.max(-220, forwardSpeed - REVERSE_ACCEL * dt)
			car.braking = true
		end
	else
		car.braking = false
	end

	-- WHEEL SCRUB FRICTION:
	-- Turning sharply at speed and sliding sideways scrubs kinetic energy into the tires.
	-- The more sideways the car goes (and the hotter the rubber), the more speed is scrubbed off!
	local absLateral = math.abs(lateralSpeed)
	local slipAngleNorm = Clamp(absLateral / math.max(110, absForward), 0, 1.2)
	local scrubFrictionRate = Lerp(SCRUB_FRICTION_BASE, SCRUB_FRICTION_HOT, car.tireHeat)
	local scrubDecel = (absLateral * scrubFrictionRate) + (absSteer * absSteer * absForward * 0.24)

	if keys.handbrake then
		car.braking = true
		scrubDecel = scrubDecel + 210
	end

	if forwardSpeed > 0 then
		forwardSpeed = math.max(0, forwardSpeed - scrubDecel * dt)
	end
	car.scrubLossKmh = math.floor(scrubDecel * 0.28)

	-- Aerodynamic & Rolling Resistance
	local dragFactor = ROLLING_DRAG + absForward * AIR_DRAG
	if not onAsphalt and not onCurb then
		dragFactor = dragFactor + 1.65
	end
	forwardSpeed = Clamp(forwardSpeed * (1 - dragFactor * dt), -220, maxSpd)

	-- Reconstruct World Velocity from Forward + Lateral Components
	car.vx = forwardSpeed * fx + lateralSpeed * rx
	car.vy = forwardSpeed * fy + lateralSpeed * ry
	car.forwardSpeed = forwardSpeed
	car.lateralSpeed = lateralSpeed

	-- Integrate World Position
	car.x = car.x + car.vx * dt
	car.y = math.max(80, car.y + car.vy * dt)

	-- Soft Shoulder Guardrail Boundary
	local maxOffroad = halfRoad + 165
	if car.x < roadCenterX - maxOffroad then
		car.x = roadCenterX - maxOffroad
		car.vx = math.abs(car.vx) * 0.55
		shakeTimer = 0.14
		shakeIntensity = 6
	elseif car.x > roadCenterX + maxOffroad then
		car.x = roadCenterX + maxOffroad
		car.vx = -math.abs(car.vx) * 0.55
		shakeTimer = 0.14
		shakeIntensity = 6
	end

	-- Roadside Prop Collisions
	for i = 1, NUM_ROADSIDE_PROPS do
		local prop = propPool[i]
		if prop.active and prop.radius > 0 then
			local dx = car.x - prop.x
			local dy = car.y - prop.y
			local minDist = prop.radius + 18
			if dx * dx + dy * dy < minDist * minDist then
				prop.active = false
				prop.control:SetVisible(false)
				car.vx = car.vx * 0.60 + (dx > 0 and 130 or -130)
				car.vy = car.vy * 0.60
				shakeTimer = 0.20
				shakeIntensity = 9
				for s = 1, 5 do
					SpawnParticle(
						prop.x,
						prop.y,
						(math.random() - 0.5) * 280,
						(math.random() - 0.5) * 280,
						10,
						PALETTE.sparkColor,
						0.30
					)
				end
			end
		end
	end

	-- 9. Powerslide / Drift Detection, Skidmarks, Tire Smoke & Scoring
	local activelySliding = (absLateral > 55 or (car.tireHeat > 0.32 and absSteer > 0.35 and absForward > 180))

	if activelySliding and onAsphalt then
		isDrifting = true
		driftComboTimer = 1.15
		local addedPts = math.floor((absLateral * 0.52 + absForward * 0.15) * dt * driftMultiplier)
		currentDriftScore = currentDriftScore + addedPts
		driftMultiplier = math.min(5.0, driftMultiplier + 0.35 * dt)
	elseif driftComboTimer > 0 then
		driftComboTimer = driftComboTimer - dt
		if driftComboTimer <= 0 then
			totalScore = totalScore + currentDriftScore
			currentDriftScore = 0
			driftMultiplier = 1.0
			isDrifting = false
		end
	end

	-- Visual Rear Wheel Heat Tint
	local rearWheelCol = (car.tireHeat > 0.55) and PALETTE.wheelHot or PALETTE.wheelDark
	car.wheelRL.imageColor = rearWheelCol
	car.wheelRR.imageColor = rearWheelCol

	-- Spawn Rear Tire Skidmarks & Smoke proportional to Slip + Tire Temperature
	skidSpawnAccum = skidSpawnAccum + dt
	if (activelySliding or (car.braking and absForward > 240)) and skidSpawnAccum >= 0.030 then
		skidSpawnAccum = 0
		local rearOffsetX = -fx * 20
		local rearOffsetY = -fy * 20
		local tireSpread = 11
		local isHotRubber = car.tireHeat > 0.50
		SpawnSkidmark(car.x + rearOffsetX - rx * tireSpread, car.y + rearOffsetY - ry * tireSpread, car.angle, isHotRubber)
		SpawnSkidmark(car.x + rearOffsetX + rx * tireSpread, car.y + rearOffsetY + ry * tireSpread, car.angle, isHotRubber)
	end

	smokeSpawnAccum = smokeSpawnAccum + dt
	local smokeInterval = Lerp(0.055, 0.025, car.tireHeat)
	if activelySliding and smokeSpawnAccum >= smokeInterval then
		smokeSpawnAccum = 0
		local rearX = car.x - fx * 24 + (math.random() - 0.5) * 18
		local rearY = car.y - fy * 24 + (math.random() - 0.5) * 12
		local pColor = not onAsphalt and PALETTE.dirtColor or (car.tireHeat > 0.6 and PALETTE.smokeHot or PALETTE.smokeColor)
		local pSize = math.floor(Lerp(12, 22, car.tireHeat))
		SpawnParticle(rearX, rearY, -car.vx * 0.15 + (math.random() - 0.5) * 45, -car.vy * 0.15, pSize, pColor, 0.44)
	end

	local tailCol = car.braking and PALETTE.taillightBright or PALETTE.taillightDim
	car.tailL.imageColor = tailCol
	car.tailR.imageColor = tailCol
end

-- ============================================================================
-- CAMERA & WORLD-TO-SCREEN RENDERING
-- ============================================================================

local function UpdateCameraAndRenderWorld(dt)
	local targetCamX = car.x - screenWidth * 0.5 + car.vx * 0.22
	local targetCamY = car.y - screenHeight * 0.24 + math.max(0, car.vy * 0.12)

	cameraX = Lerp(cameraX, targetCamX, math.min(1, dt * 8.5))
	cameraY = targetCamY

	local shakeX = 0
	local shakeY = 0
	if shakeTimer > 0 then
		shakeTimer = math.max(0, shakeTimer - dt)
		shakeX = (math.random() - 0.5) * 2 * shakeIntensity
		shakeY = (math.random() - 0.5) * 2 * shakeIntensity
	end

	local viewCamX = cameraX + shakeX
	local viewCamY = cameraY + shakeY

	-- 1. Render Procedural Road Slices (Covers full vertical range even on tall viewports)
	local baseSliceIdx = math.floor(viewCamY / SLICE_HEIGHT) - 6
	for i = 1, NUM_ROAD_SLICES do
		local sliceIdx = baseSliceIdx + i
		local node = roadNodes[sliceIdx]
		local slice = roadSlices[i]
		if node and slice then
			local sx = node.x - viewCamX
			local sy = node.y - viewCamY

			local isEven = (sliceIdx % 2 == 0)
			if node.severity >= 3 then
				slice.curb.imageColor = isEven and PALETTE.curbRed or PALETTE.curbGold
			else
				slice.curb.imageColor = isEven and PALETTE.curbRed or PALETTE.curbWhite
			end

			slice.curb:SetAnchoredPosition(sx, sy)
			slice.curb:SetSizeDelta(node.width + 28, SLICE_HEIGHT + 4)

			slice.asphalt:SetAnchoredPosition(sx, sy)
			slice.asphalt:SetSizeDelta(node.width, SLICE_HEIGHT + 4)

			if sliceIdx % 2 == 0 then
				slice.centerLine:SetAnchoredPosition(sx, sy)
				slice.centerLine:SetVisible(true)
			else
				slice.centerLine:SetVisible(false)
			end
		end
	end

	-- 2. Render Skidmarks Pool
	for i = 1, NUM_SKIDMARKS do
		local skid = skidPool[i]
		if skid.active then
			local sy = skid.y - viewCamY
			if sy < -180 or sy > DESIGN_HEIGHT + 420 then
				skid.active = false
				skid.control:SetVisible(false)
			else
				skid.control:SetAnchoredPosition(skid.x - viewCamX, sy)
			end
		end
	end

	-- 3. Render Roadside Props Pool
	for i = 1, NUM_ROADSIDE_PROPS do
		local prop = propPool[i]
		if prop.active then
			local sy = prop.y - viewCamY
			if sy < -180 then
				prop.active = false
				prop.control:SetVisible(false)
			else
				prop.control:SetAnchoredPosition(prop.x - viewCamX, sy)
			end
		end
	end

	-- 4. Update & Render Particles Pool
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
				local scale = 1 + (1 - p.life / p.maxLife) * 0.85
				p.control:SetSizeDelta(p.size * scale, p.size * scale)
				p.control:SetAnchoredPosition(p.x - viewCamX, p.y - viewCamY)
			end
		end
	end

	-- 5. Render Car Position & Heading Rotation
	car.control:SetAnchoredPosition(car.x - viewCamX, car.y - viewCamY)
	car.control:SetLocalRotation(0, 0, car.angle)
end

local function UpdateHUD()
	local totalVel = math.sqrt(car.vx * car.vx + car.vy * car.vy)
	local kmh = math.floor(totalVel * 0.28)
	local gear = "1"
	if car.forwardSpeed < -10 then
		gear = "R"
	elseif kmh > 190 then
		gear = "6"
	elseif kmh > 150 then
		gear = "5"
	elseif kmh > 110 then
		gear = "4"
	elseif kmh > 72 then
		gear = "3"
	elseif kmh > 35 then
		gear = "2"
	end

	speedLabel.text = string.format("%03d KM/H   [GEAR %s]", kmh, gear)

	-- Tire Temperature & Grip Status Bar
	local heatPct = math.floor(car.tireHeat * 100)
	local gripPct = math.max(15, 100 - math.floor(car.slipRatio * 82))
	tireBarFill:SetSizeDelta(math.max(6, car.tireHeat * 210), 8)

	if car.tireHeat < 0.35 then
		tireTempLabel.fontColor = PALETTE.tireOptimal
		tireBarFill.imageColor = PALETTE.tireOptimal
		tireTempLabel.text = string.format("TIRE TEMP: %d%%  [GRIP %d%%]", heatPct, gripPct)
	elseif car.tireHeat < 0.70 then
		tireTempLabel.fontColor = PALETTE.tireWarm
		tireBarFill.imageColor = PALETTE.tireWarm
		tireTempLabel.text = string.format("POWERSLIDE SCRUB  [GRIP %d%%]", gripPct)
	else
		tireTempLabel.fontColor = PALETTE.tireHot
		tireBarFill.imageColor = PALETTE.tireHot
		tireTempLabel.text = string.format("HOT RUBBER SLIDE! [GRIP %d%%]", gripPct)
	end

	totalDistanceMeters = math.max(totalDistanceMeters, math.floor((car.y - 140) * 0.08))
	local liveScore = totalScore + currentDriftScore
	statsLabel.text = string.format("NORTH: %dm  |  PTS: %d", totalDistanceMeters, liveScore)

	if isDrifting and currentDriftScore > 0 then
		driftLabel:SetVisible(true)
		local slipDeg = math.floor(math.deg(math.atan(math.abs(car.lateralSpeed), math.max(20, math.abs(car.forwardSpeed)))))
		driftLabel.text = string.format("🔥 SLIP %d°  (SCRUB -%d KM/H)   x%.1f   +%d PTS 🔥", slipDeg, car.scrubLossKmh, driftMultiplier, currentDriftScore)
	else
		driftLabel:SetVisible(false)
	end
end

-- ============================================================================
-- INPUT BINDINGS & LIFECYCLE HOOKS
-- ============================================================================

local function RegisterInputs()
	local function BindKey(downEnum, upEnum, field)
		root:AddKeyEventListener(downEnum, function()
			keys[field] = true
			return true
		end)
		root:AddKeyEventListener(upEnum, function()
			keys[field] = false
			return true
		end)
	end

	BindKey(Enum.KeyEventType.KeyboardMoveForwardKeyDown, Enum.KeyEventType.KeyboardMoveForwardKeyUp, "up")
	BindKey(Enum.KeyEventType.KeyboardMoveBackwardKeyDown, Enum.KeyEventType.KeyboardMoveBackwardKeyUp, "down")
	BindKey(Enum.KeyEventType.KeyboardMoveLeftKeyDown, Enum.KeyEventType.KeyboardMoveLeftKeyUp, "left")
	BindKey(Enum.KeyEventType.KeyboardMoveRightKeyDown, Enum.KeyEventType.KeyboardMoveRightKeyUp, "right")
	BindKey(Enum.KeyEventType.KeyboardJumpKeyDown, Enum.KeyEventType.KeyboardJumpKeyUp, "handbrake")
	BindKey(Enum.KeyEventType.KeyboardSprintKeyDown, Enum.KeyEventType.KeyboardSprintKeyUp, "handbrake")
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
	if not root then
		printerr("[GTA2 North Racer] script.object is nil")
		return
	end

	screenWidth = DESIGN_WIDTH
	screenHeight = DESIGN_HEIGHT
	RefreshRootScale()
	root.disableKeyEventPassthrough = true

	worldLayer = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, root))
	Configure(worldLayer, DESIGN_WIDTH * 0.5, DESIGN_HEIGHT * 0.5, DESIGN_WIDTH, DESIGN_HEIGHT, "WorldLayer")

	roadNodes = {}
	currentPatternQueue = {}
	highestGeneratedIdx = -16
	lastPropSpawnIdx = 8
	totalDistanceMeters = 0
	totalScore = 0
	currentDriftScore = 0
	driftMultiplier = 1.0

	EnsureRoadGeneratedUpTo(2200)
	BuildWorldPools()
	car = BuildCar()
	BuildHUD()
	RegisterInputs()

	script:EnableUpdate(true)
	print("[GTA2 North Racer] Centered Fit-to-View Container & Extended Road Rendering Initialized!")
end

function OnUpdate(deltaTime)
	if not car then return end
	RefreshRootScale()
	local dt = math.min(deltaTime, 0.04)

	EnsureRoadGeneratedUpTo(car.y + DESIGN_HEIGHT + 1300)
	MaybeSpawnRoadsideProps()
	UpdateCarPhysics(dt)
	EvaluateUpcomingCorner()
	UpdateCameraAndRenderWorld(dt)
	UpdateHUD()
end

function OnDestroy()
	controls = {}
	roadSlices = {}
	skidPool = {}
	particlePool = {}
	propPool = {}
	roadNodes = {}
	car = nil
end
