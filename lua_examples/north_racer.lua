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
local EXIT_SIGNAL_NAME = "NORTH_RACER_EXIT"

-- Fixed Design Container & World Constants (Centered Fit-to-View)
local DESIGN_WIDTH = 1600
local DESIGN_HEIGHT = 900
local screenWidth = DESIGN_WIDTH
local screenHeight = DESIGN_HEIGHT
local rootScale = 1.0
local SLICE_HEIGHT = 28
local CIRCUIT_STEP = 34
local NUM_CIRCUIT_SLICES = 220
local NUM_ROAD_SLICES = 220
local NUM_SKIDMARKS = 44
local NUM_PARTICLES = 32
local NUM_ROADSIDE_PROPS = 24

-- Car Physics Constants ("The Perfect Race" + GTA2 Tire Scrub & 4x4 Offroad Inertia Model)
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
local GRIP_BAD_ROAD = 6.6        -- Broken asphalt: bumpier, slightly looser grip
local GRIP_DIRT_STAGE = 2.45     -- Offroad dirt/gravel stage: floaty, inertia-driven 4x4 slide
local GRIP_OFFROAD = 2.15        -- Outer grass/dirt shoulder: slippery inertia slide

-- Progressive Steering & Speed-Stiffening Constants
local STEER_BUILD_RATE = 6.65    -- How fast steering lock winds up when holding A/D
local STEER_RETURN_RATE = 5.4    -- How fast wheels re-center when releasing A/D
local LOW_SPEED_TURN_RATE = 116  -- Nimble turning rate (deg/s) at slower cornering speeds
local ANGULAR_DAMPING = 8.2
local ANGULAR_DAMPING_DIRT = 4.6 -- Delayed, floaty rotational inertia on offroad dirt/gravel

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
local hpLabel = nil
local hpBarBg = nil
local hpBarFill = nil
local tireTempLabel = nil
local tireBarBg = nil
local tireBarFill = nil
local surfaceLabel = nil
local driftLabel = nil
local statsLabel = nil
local controlsHintLabel = nil
local NUM_OBSTACLE_MARKERS = 3
local obstacleWarnPool = {}
local menuHudBtn = nil
local rerollCircuitBtn = nil
local circuitMinimapPanel = nil
local circuitMinimapTitle = nil
local NUM_MINIMAP_DOTS = 44
local minimapDots = {}
local minimapCarDot = nil
local mainMenuPanel = nil
local gameOverPanel = nil
local gameOverBorder = nil
local gameOverTitle = nil
local gameOverStats = nil
local gameOverSub = nil
local gameOverBtn = nil
local gameOverBtnTxt = nil
local gameOverMenuBtn = nil

-- Game Mode & Baked 2D Enclosed Circuit State
local inMainMenu = true
local gameMode = "ENDLESS_CHALLENGE" -- "ENDLESS_CHALLENGE", "ENDLESS_RELAXED", "CIRCUIT"
local circuitSurfaceMode = "MIXED"   -- "TARMAC", "DIRT", "MIXED"
local circuitName = "SWITCHBACK NOCTURNE #42"
local circuitTemplateIdx = 0
local circuitNodes = {}
local circuitNumNodes = 0
local circuitProps = {}
local carCircuitIdx = 1
local circuitCheckpointMask = 0
local circuitMinX = -2000
local circuitMaxX = 200
local circuitMinY = -1000
local circuitMaxY = 1400
local circuitBlueprint = {}
local circuitPatternCursor = 0
local circuitLapSlices = 220
local circuitTotalLaps = 3
local circuitCurrentLap = 1
local circuitCurrentLapTime = 0
local circuitBestLapTime = nil
local circuitTotalTime = 0
local circuitFinished = false

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

-- Procedural Road Spine & Sector Generator State
local roadNodes = {}
local highestGeneratedIdx = -10
local currentPatternQueue = {}
local roadGenX = 0
local roadGenHeading = 0 -- radians relative to North (+Y)
local roadGenCurvature = 0
local roadGenWidth = 275
local lastPropSpawnIdx = 0
local lastObstacleSliceIdx = -100
local currentSectorType = "BIG_ROAD" -- "BIG_ROAD", "OFFROAD_SECTOR", "BAD_ROAD_SECTOR", "NARROW_SECTOR"
local sectorPatternsLeft = 3

-- Scoring & Drift Telemetry
local totalDistanceMeters = 0
local totalScore = 0
local currentDriftScore = 0
local bestDriftScore = 0
local obstaclesHitCount = 0
local driftMultiplier = 1.0
local driftComboTimer = 0
local isDrifting = false
local skidNextIdx = 1
local skidSpawnAccum = 0
local smokeSpawnAccum = 0
local steamSpawnAccum = 0
local particleNextIdx = 1

-- Colors Palette (Elden-Gold + GTA2 Dusk Asphalt Aesthetic)
local PALETTE = {
	grassDark = Color.FromRGB(24, 30, 22),
	asphalt = Color.FromRGB(42, 40, 44),
	badRoadAsphalt = Color.FromRGB(54, 47, 44),
	badRoadCrack = Color.FromRGB(32, 27, 25),
	dirtRoad = Color.FromRGB(108, 78, 48),
	dirtRoadAlt = Color.FromRGB(98, 70, 42),
	dirtCurb = Color.FromRGB(138, 102, 62),
	 dirtRut = Color.FromRGB(78, 55, 33),
	curbRed = Color.FromRGB(205, 58, 48),
	curbWhite = Color.FromRGB(232, 224, 205),
	curbGold = Color.FromRGB(218, 168, 72),
	curbBad = Color.FromRGB(145, 92, 48),
	laneYellow = Color.FromRGB(230, 184, 68),
	skidWarm = Color.FromRGBA(18, 16, 16, 145),
	skidHot = Color.FromRGBA(10, 8, 8, 215),
	skidDirt = Color.FromRGBA(68, 46, 26, 165),
	smokeColor = Color.FromRGBA(225, 220, 210, 155),
	smokeHot = Color.FromRGBA(245, 235, 220, 195),
	steamColor = Color.FromRGBA(235, 240, 245, 165),
	engineSmoke = Color.FromRGBA(58, 54, 52, 210),
	fireColor = Color.FromRGBA(255, 110, 32, 235),
	dirtColor = Color.FromRGBA(146, 108, 66, 190),
	sparkColor = Color.FromRGBA(255, 195, 65, 235),
	rockColor = Color.FromRGB(112, 106, 98),
	barricadeColor = Color.FromRGB(232, 84, 32),
	potholeColor = Color.FromRGB(22, 19, 18),
	carShadow = Color.FromRGBA(0, 0, 0, 120),
	carBody = Color.FromRGB(210, 48, 42),
	carBodyWreck = Color.FromRGB(38, 34, 32),
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
	paceDirt = Color.FromRGB(225, 165, 85),
	tireOptimal = Color.FromRGB(95, 210, 125),
	tireWarm = Color.FromRGB(238, 185, 65),
	tireHot = Color.FromRGB(242, 75, 55),
	tireDirt = Color.FromRGB(135, 205, 235)
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

local SECTOR_TYPES = { "BIG_ROAD", "OFFROAD_SECTOR", "BAD_ROAD_SECTOR", "NARROW_SECTOR" }

-- 2D Enclosed Circuit Archetype Templates (inspired by Switchback Nocturne, Fallow Pines & Breaker Bay)
local CIRCUIT_TEMPLATES = {
	{
		name = "SWITCHBACK NOCTURNE",
		waypoints = {
			{ x = 0,     y = -520 },
			{ x = 0,     y = 140  }, -- Start/Finish straight (heading North +Y)
			{ x = 0,     y = 860  },
			{ x = -380,  y = 1320 },
			{ x = -1060, y = 1340 },
			{ x = -1420, y = 860  }, -- Dive into infield switchback
			{ x = -780,  y = 380  }, -- Infield right hairpin apex
			{ x = -1320, y = -140 }, -- Infield left switchback exit
			{ x = -2080, y = 520  }, -- West upper loop
			{ x = -2360, y = -220 }, -- West southbound leg
			{ x = -2060, y = -880 }, -- South-West corner
			{ x = -1200, y = -980 }, -- South eastbound straight
			{ x = -440,  y = -880 }  -- South-East corner feeding back to (0, -520)
		}
	},
	{
		name = "FALLOW PINES",
		waypoints = {
			{ x = 0,     y = -580 },
			{ x = 0,     y = 140  }, -- Start/Finish straight (heading North +Y)
			{ x = 0,     y = 960  },
			{ x = -420,  y = 1420 },
			{ x = -1200, y = 1420 },
			{ x = -1820, y = 1040 }, -- Upper-West outer turn
			{ x = -960,  y = 580  }, -- 1st Inward Switchback Hairpin
			{ x = -1860, y = 120  }, -- Mid-West Outer Hairpin
			{ x = -980,  y = -320 }, -- 2nd Inward Switchback Hairpin
			{ x = -1820, y = -800 }, -- Lower-West outer corner
			{ x = -1140, y = -1080 }, -- Bottom-West corner
			{ x = -420,  y = -980 }  -- Bottom straight feeding back to (0, -580)
		}
	},
	{
		name = "BREAKER BAY",
		waypoints = {
			{ x = 0,     y = -540 },
			{ x = 0,     y = 140  }, -- Start/Finish straight (heading North +Y)
			{ x = 0,     y = 840  },
			{ x = -480,  y = 1360 }, -- Sweeping North turn
			{ x = -1420, y = 1440 }, -- Top Westbound straight
			{ x = -2180, y = 980  }, -- North-West turn
			{ x = -2400, y = 120  }, -- West Southbound straight
			{ x = -1820, y = -420 }, -- West Chicane inward
			{ x = -2220, y = -960 }, -- South-West Hairpin
			{ x = -1360, y = -1100 }, -- South Eastbound straight
			{ x = -740,  y = -740 }, -- Pinched lower chicane
			{ x = -280,  y = -900 }  -- Final corner feeding back to (0, -540)
		}
	}
}

local function BakeCircuitIntoRoadSlices()
	if #roadSlices == 0 or circuitNumNodes <= 0 then return end
	for idx = 1, NUM_ROAD_SLICES do
		local slice = roadSlices[idx]
		local node = circuitNodes[idx]
		if slice and node then
			local isEven = (idx % 2 == 0)
			local surf = node.surfaceType or "ASPHALT"
			local rotDeg = math.deg(node.heading)
			local sliceLen = (node.segLen or CIRCUIT_STEP) + 30

			if surf == "DIRT_OFFROAD" then
				slice.curb.imageColor = isEven and PALETTE.dirtCurb or PALETTE.dirtRut
				slice.asphalt.imageColor = isEven and PALETTE.dirtRoad or PALETTE.dirtRoadAlt
				slice.centerLine.imageColor = PALETTE.dirtRut
			else
				if node.severity >= 3 then
					slice.curb.imageColor = isEven and PALETTE.curbRed or PALETTE.curbGold
				else
					slice.curb.imageColor = isEven and PALETTE.curbRed or PALETTE.curbWhite
				end
				slice.asphalt.imageColor = PALETTE.asphalt
				slice.centerLine.imageColor = PALETTE.laneYellow
			end

			slice.curb:SetSizeDelta(node.width + 26, sliceLen)
			slice.curb:SetLocalRotation(0, 0, rotDeg)
			slice.curb:SetVisible(true)

			slice.asphalt:SetSizeDelta(node.width, sliceLen)
			slice.asphalt:SetLocalRotation(0, 0, rotDeg)
			slice.asphalt:SetVisible(true)

			if node.isStartFinish then
				slice.centerLine:SetSizeDelta(node.width, 12)
				slice.centerLine:SetLocalRotation(0, 0, rotDeg)
				slice.centerLine.imageColor = isEven and PALETTE.curbWhite or PALETTE.curbGold
				slice.centerLine:SetVisible(true)
			elseif isEven then
				slice.centerLine:SetSizeDelta(6, (node.segLen or CIRCUIT_STEP) * 0.56)
				slice.centerLine:SetLocalRotation(0, 0, rotDeg)
				slice.centerLine:SetVisible(true)
			else
				slice.centerLine:SetVisible(false)
			end
		elseif slice then
			slice.curb:SetVisible(false)
			slice.asphalt:SetVisible(false)
			slice.centerLine:SetVisible(false)
		end
	end
end

local function RefreshCircuitMinimap()
	if not circuitMinimapPanel or circuitNumNodes <= 0 then return end
	if circuitMinimapTitle then
		circuitMinimapTitle.text = circuitName
	end

	local spanX = math.max(400, circuitMaxX - circuitMinX)
	local spanY = math.max(400, circuitMaxY - circuitMinY)
	local mapW = 136
	local mapH = 88
	local scale = math.min(mapW / spanX, mapH / spanY)
	local cx = (circuitMinX + circuitMaxX) * 0.5
	local cy = (circuitMinY + circuitMaxY) * 0.5

	for i = 1, NUM_MINIMAP_DOTS do
		local dot = minimapDots[i]
		if dot then
			local nodeIdx = math.floor(((i - 1) / NUM_MINIMAP_DOTS) * circuitNumNodes) + 1
			nodeIdx = Clamp(nodeIdx, 1, circuitNumNodes)
			local node = circuitNodes[nodeIdx]
			local mx = 84 + (node.x - cx) * scale
			local my = 52 + (node.y - cy) * scale
			dot:SetAnchoredPosition(mx, my)
			if i == 1 then
				dot.imageColor = PALETTE.curbGold
				dot:SetSizeDelta(8, 8)
			elseif node.surfaceType == "DIRT_OFFROAD" then
				dot.imageColor = PALETTE.paceDirt
				dot:SetSizeDelta(5, 5)
			else
				dot.imageColor = PALETTE.curbWhite
				dot:SetSizeDelta(5, 5)
			end
			dot:SetVisible(true)
		end
	end
end

local function UpdateMinimapCarMarker()
	if not circuitMinimapPanel or not minimapCarDot or not car then return end
	if gameMode ~= "CIRCUIT" or circuitNumNodes <= 0 then
		circuitMinimapPanel:SetVisible(false)
		if rerollCircuitBtn then rerollCircuitBtn:SetVisible(false) end
		return
	end
	circuitMinimapPanel:SetVisible(not inMainMenu)
	if rerollCircuitBtn then rerollCircuitBtn:SetVisible(not inMainMenu) end

	local spanX = math.max(400, circuitMaxX - circuitMinX)
	local spanY = math.max(400, circuitMaxY - circuitMinY)
	local scale = math.min(136 / spanX, 88 / spanY)
	local cx = (circuitMinX + circuitMaxX) * 0.5
	local cy = (circuitMinY + circuitMaxY) * 0.5

	local mx = 84 + (car.x - cx) * scale
	local my = 52 + (car.y - cy) * scale
	minimapCarDot:SetAnchoredPosition(mx, my)
	minimapCarDot:SetVisible(true)
end

local function CatmullRomPoint(p0, p1, p2, p3, t)
	local t2 = t * t
	local t3 = t2 * t
	local x = 0.5 * (
		(2 * p1.x)
		+ (-p0.x + p2.x) * t
		+ (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2
		+ (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
	)
	local y = 0.5 * (
		(2 * p1.y)
		+ (-p0.y + p2.y) * t
		+ (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2
		+ (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
	)
	return x, y
end

-- Generates and bakes a complete 2D enclosed mixed circuit spline on the fly (always 220 static segments)
local function GenerateRandomCircuit(surfaceMode)
	circuitSurfaceMode = "MIXED"
	circuitTemplateIdx = (circuitTemplateIdx % #CIRCUIT_TEMPLATES) + 1
	local tpl = CIRCUIT_TEMPLATES[circuitTemplateIdx]
	circuitName = string.format("%s (MIXED #%d)", tpl.name, math.random(10, 99))

	-- 1. Build perturbed closed control waypoints (keeping waypoints 1, 2, 3 aligned on Start/Finish straight)
	local rawWps = tpl.waypoints
	local numWps = #rawWps
	local scaleX = 0.96 + math.random() * 0.18
	local scaleY = 0.96 + math.random() * 0.18
	local wps = {}
	for i = 1, numWps do
		local bx = rawWps[i].x * scaleX
		local by = rawWps[i].y * scaleY
		if i >= 4 and i <= numWps - 1 then
			bx = bx + math.random(-95, 95)
			by = by + math.random(-95, 95)
		end
		wps[i] = { x = bx, y = by }
	end

	-- 2. Sample closed Catmull-Rom spline into a dense closed polyline
	local dense = {}
	local stepsPerSeg = 32
	for i = 1, numWps do
		local p0 = wps[((i - 2) % numWps) + 1]
		local p1 = wps[i]
		local p2 = wps[(i % numWps) + 1]
		local p3 = wps[((i + 1) % numWps) + 1]
		for s = 0, stepsPerSeg - 1 do
			local x, y = CatmullRomPoint(p0, p1, p2, p3, s / stepsPerSeg)
			dense[#dense + 1] = { x = x, y = y }
		end
	end

	-- 3. Smooth the closed polyline so hairpin apexes have clean driveable radii
	local numDense = #dense
	for _ = 1, 5 do
		local nextDense = {}
		for i = 1, numDense do
			local prev = dense[((i - 2) % numDense) + 1]
			local curr = dense[i]
			local nxt = dense[(i % numDense) + 1]
			nextDense[i] = {
				x = prev.x * 0.25 + curr.x * 0.50 + nxt.x * 0.25,
				y = prev.y * 0.25 + curr.y * 0.50 + nxt.y * 0.25
			}
		end
		dense = nextDense
	end

	-- 4. Compute total perimeter and resample into EXACTLY NUM_CIRCUIT_SLICES (220) equidistant nodes!
	local totalPerim = 0
	for i = 1, numDense do
		local pA = dense[i]
		local pB = dense[(i % numDense) + 1]
		totalPerim = totalPerim + math.sqrt((pB.x - pA.x) ^ 2 + (pB.y - pA.y) ^ 2)
	end
	local exactStep = totalPerim / NUM_CIRCUIT_SLICES
	CIRCUIT_STEP = exactStep

	local resampled = {}
	resampled[1] = { x = dense[1].x, y = dense[1].y }
	local accumDist = 0
	for i = 1, numDense do
		local pA = dense[i]
		local pB = dense[(i % numDense) + 1]
		local dx = pB.x - pA.x
		local dy = pB.y - pA.y
		local segLen = math.sqrt(dx * dx + dy * dy)
		if segLen > 0.001 then
			local cursor = 0
			while #resampled < NUM_CIRCUIT_SLICES and (accumDist + (segLen - cursor) >= exactStep) do
				local need = exactStep - accumDist
				cursor = cursor + need
				local t = cursor / segLen
				resampled[#resampled + 1] = {
					x = Lerp(pA.x, pB.x, t),
					y = Lerp(pA.y, pB.y, t)
				}
				accumDist = 0
			end
			accumDist = accumDist + (segLen - cursor)
		end
	end
	while #resampled < NUM_CIRCUIT_SLICES do
		local lastP = resampled[#resampled]
		resampled[#resampled + 1] = { x = lastP.x, y = lastP.y }
	end

	-- 4B. Non-Adjacent Switchback Leg Separation + Smoothing Pass
	-- Guarantees parallel hairpin/switchback legs never overlap or pinch each other!
	local totalN = #resampled
	local minLegDist = 420
	local minLegDistSq = minLegDist * minLegDist
	for _ = 1, 6 do
		for i = 1, totalN do
			for j = i + 20, totalN do
				local wrapDiff = math.min(j - i, totalN - (j - i))
				if wrapDiff >= 20 then
					local dx = resampled[j].x - resampled[i].x
					local dy = resampled[j].y - resampled[i].y
					local d2 = dx * dx + dy * dy
					if d2 < minLegDistSq and d2 > 1 then
						local d = math.sqrt(d2)
						local push = (minLegDist - d) * 0.35
						local ux = dx / d
						local uy = dy / d
						resampled[i].x = resampled[i].x - ux * push
						resampled[i].y = resampled[i].y - uy * push
						resampled[j].x = resampled[j].x + ux * push
						resampled[j].y = resampled[j].y + uy * push
					end
				end
			end
		end
		local smoothed = {}
		for i = 1, totalN do
			local prev = resampled[((i - 2) % totalN) + 1]
			local curr = resampled[i]
			local nxt = resampled[(i % totalN) + 1]
			smoothed[i] = {
				x = prev.x * 0.22 + curr.x * 0.56 + nxt.x * 0.22,
				y = prev.y * 0.22 + curr.y * 0.56 + nxt.y * 0.22
			}
		end
		resampled = smoothed
	end

	-- 5. Find the node on the East straight closest to (0, 140) and shift/cycle so node 1 is at (0, 140)
	local startIdx = 1
	local bestDistSq = 1e18
	for i = 1, math.floor(totalN * 0.35) do
		local d2 = (resampled[i].x - 0) ^ 2 + (resampled[i].y - 140) ^ 2
		if d2 < bestDistSq then
			bestDistSq = d2
			startIdx = i
		end
	end

	local offsetX = -resampled[startIdx].x
	local offsetY = 140 - resampled[startIdx].y

	circuitNodes = {}
	circuitNumNodes = totalN
	circuitMinX = 1e9
	circuitMaxX = -1e9
	circuitMinY = 1e9
	circuitMaxY = -1e9

	for i = 1, totalN do
		local srcIdx = ((startIdx + i - 2) % totalN) + 1
		local px = resampled[srcIdx].x + offsetX
		local py = resampled[srcIdx].y + offsetY
		if px < circuitMinX then circuitMinX = px end
		if px > circuitMaxX then circuitMaxX = px end
		if py < circuitMinY then circuitMinY = py end
		if py > circuitMaxY then circuitMaxY = py end
		circuitNodes[i] = {
			idx = i,
			x = px,
			y = py,
			segLen = exactStep,
			width = 248,
			heading = 0,
			tx = 0,
			ty = 1,
			nx = 1,
			ny = 0,
			curvature = 0,
			severity = 0,
			cornerLabel = "▲ STRAIGHT",
			cornerAdvice = "FULL THROTTLE",
			surfaceType = "ASPHALT",
			isNarrow = false,
			isStartFinish = (i == 1 or i == 2)
		}
	end

	-- 6. Bake Tangent, Normal, Heading, Curvature, Surface Sectors & Pace Notes for all nodes
	for i = 1, totalN do
		local prev = circuitNodes[((i - 2) % totalN) + 1]
		local nxt = circuitNodes[(i % totalN) + 1]
		local node = circuitNodes[i]
		local dx = nxt.x - prev.x
		local dy = nxt.y - prev.y
		local len = math.max(0.001, math.sqrt(dx * dx + dy * dy))
		local tx = dx / len
		local ty = dy / len
		node.segLen = math.max(24, math.sqrt((nxt.x - node.x) ^ 2 + (nxt.y - node.y) ^ 2))
		node.tx = tx
		node.ty = ty
		node.nx = ty
		node.ny = -tx
		node.heading = math.atan(-tx, ty)
	end

	for i = 1, totalN do
		local node = circuitNodes[i]
		local ahead = circuitNodes[((i + 3) % totalN) + 1]
		local dH = ((ahead.heading - node.heading + math.pi) % (2 * math.pi)) - math.pi
		local curv = dH / 4.0
		node.curvature = curv
		local absC = math.abs(curv)

		-- Mixed Circuit: Alternate Tarmac & 4x4 Dirt sectors around the loop
		local sectorIdx = math.floor(((i - 1) / totalN) * 6) -- 0..5
		local surf = (sectorIdx == 1 or sectorIdx == 2 or sectorIdx == 4) and "DIRT_OFFROAD" or "ASPHALT"
		node.surfaceType = surf
		node.width = (surf == "DIRT_OFFROAD") and 254 or 244

		local surfPrefix = (surf == "DIRT_OFFROAD") and "[4x4 DIRT] " or "[TARMAC] "
		local isLeft = (curv >= 0)
		local dirWord = isLeft and "LEFT" or "RIGHT"
		local dirArrow = isLeft and "⬅" or "➡"

		if absC < 0.010 then
			node.severity = 0
			node.cornerLabel = surfPrefix .. "▲ STRAIGHT"
			node.cornerAdvice = (surf == "DIRT_OFFROAD")
				and "4x4 GRAVEL • TIRES STAY ICE COOL"
				or "FULL THROTTLE • COOL TIRES"
		elseif absC < 0.022 then
			node.severity = 1
			node.cornerLabel = surfPrefix .. (isLeft and "↰ EASY LEFT 5" or "↱ EASY RIGHT 5")
			node.cornerAdvice = "FEATHER STEERING • CARRY SPEED"
		elseif absC < 0.036 then
			node.severity = 2
			node.cornerLabel = surfPrefix .. dirArrow .. " MEDIUM " .. dirWord .. " 3"
			node.cornerAdvice = (surf == "DIRT_OFFROAD")
				and "PITCH CAR • RIDE 4x4 INERTIA!"
				or "LIFT GAS OR LIGHT POWERSLIDE"
		elseif absC < 0.052 then
			node.severity = 3
			node.cornerLabel = surfPrefix .. "⚡ SHARP " .. dirWord .. " 2"
			node.cornerAdvice = "BRAKE ENTRY • POWERSLIDE APEX!"
		else
			node.severity = 4
			node.cornerLabel = surfPrefix .. "⚠️ SWITCHBACK HAIRPIN " .. dirWord .. " 1"
			node.cornerAdvice = "HARD BRAKE & ROTATE AROUND APEX!"
		end
	end

	-- 7. Bake Roadside Scenery & Corner Chevrons around the outside of the 2D circuit
	circuitProps = {}
	for i = 5, totalN, 5 do
		local node = circuitNodes[i]
		if node.severity >= 3 then
			local outSide = (node.curvature > 0) and 1 or -1
			local dist = node.width * 0.5 + 32
			circuitProps[#circuitProps + 1] = {
				x = node.x + node.nx * outSide * dist,
				y = node.y + node.ny * outSide * dist,
				width = 22,
				height = 22,
				radius = 12,
				kind = "chevron",
				rot = math.deg(node.heading) + (node.curvature > 0 and 90 or -90)
			}
		elseif i % 15 == 0 then
			local side = ((i % 30) == 0) and 1 or -1
			local dist = node.width * 0.5 + 30
			circuitProps[#circuitProps + 1] = {
				x = node.x + node.nx * side * dist,
				y = node.y + node.ny * side * dist,
				width = 54,
				height = 54,
				radius = 0,
				kind = "lamp",
				rot = 0
			}
		else
			local side = ((i % 10) == 0) and 1 or -1
			local dist = node.width * 0.5 + math.random(48, 95)
			circuitProps[#circuitProps + 1] = {
				x = node.x + node.nx * side * dist,
				y = node.y + node.ny * side * dist,
				width = 34,
				height = 34,
				radius = 14,
				kind = "tree",
				rot = 0
			}
		end
	end

	circuitLapSlices = totalN
	carCircuitIdx = 1
	circuitCheckpointMask = 0
	BakeCircuitIntoRoadSlices()
	RefreshCircuitMinimap()
end

local function PickNextSector()
	if gameMode == "ENDLESS_RELAXED" then
		-- Relaxed Mode: Big Road Only (alternates between wide Normal Asphalt and wide 4x4 Dirt, no Bad/Narrow road)
		if currentSectorType == "BIG_ROAD" then
			currentSectorType = "OFFROAD_SECTOR"
		else
			currentSectorType = "BIG_ROAD"
		end
		sectorPatternsLeft = math.random(4, 6)
		return
	end

	-- Challenge Mode: Alternate between Big Road and specialized challenge sectors (Offroad Dirt, Bad Road, Narrow Pass)
	if currentSectorType ~= "BIG_ROAD" and math.random() < 0.42 then
		currentSectorType = "BIG_ROAD"
		sectorPatternsLeft = math.random(4, 6)
		return
	end
	local candidates = {}
	for i = 1, #SECTOR_TYPES do
		if SECTOR_TYPES[i] ~= currentSectorType then
			candidates[#candidates + 1] = SECTOR_TYPES[i]
		end
	end
	currentSectorType = candidates[math.random(1, #candidates)]
	sectorPatternsLeft = math.random(4, 6)
end

local function EnqueueNextRoadPattern()
	-- Circuit Mode: Repeat the procedurally generated Circuit Blueprint lap after lap!
	if gameMode == "CIRCUIT" then
		if #circuitBlueprint == 0 then
			GenerateRandomCircuit(circuitSurfaceMode)
		end
		circuitPatternCursor = (circuitPatternCursor % #circuitBlueprint) + 1
		local bp = circuitBlueprint[circuitPatternCursor]
		currentPatternQueue[#currentPatternQueue + 1] = {
			type = bp.type,
			label = bp.label,
			advice = bp.advice,
			severity = bp.severity,
			remaining = bp.length,
			targetCurve = bp.targetCurve,
			roadWidth = bp.roadWidth,
			surfaceType = bp.surfaceType,
			isNarrow = false
		}
		return
	end

	if sectorPatternsLeft <= 0 then
		PickNextSector()
	end
	sectorPatternsLeft = sectorPatternsLeft - 1

	local choice = CORNER_CATALOG[math.random(2, #CORNER_CATALOG)]

	-- Bias away from extreme heading angles so the road always generally heads North (+Y)
	if roadGenHeading > 0.40 then
		local rightChoices = { CORNER_CATALOG[3], CORNER_CATALOG[5], CORNER_CATALOG[7], CORNER_CATALOG[9] }
		choice = rightChoices[math.random(1, #rightChoices)]
	elseif roadGenHeading < -0.40 then
		local leftChoices = { CORNER_CATALOG[2], CORNER_CATALOG[4], CORNER_CATALOG[6], CORNER_CATALOG[8] }
		choice = leftChoices[math.random(1, #leftChoices)]
	end

	-- Apply sustained Sector properties across all corners & straights in this sector
	local surfaceType = "ASPHALT"
	local isNarrow = false
	local segWidth = (gameMode == "ENDLESS_RELAXED") and 275 or choice.roadWidth
	local tagPrefix = ""
	local adviceOverride = choice.advice

	if currentSectorType == "OFFROAD_SECTOR" then
		surfaceType = "DIRT_OFFROAD"
		segWidth = (gameMode == "ENDLESS_RELAXED") and 285 or (choice.roadWidth + 10)
		tagPrefix = "[4x4 DIRT SECTOR] "
		adviceOverride = "FLOATY INERTIA SLIDE • 0% TIRE HEAT • 2X DRIFT!"
	elseif currentSectorType == "BAD_ROAD_SECTOR" then
		surfaceType = "BAD_ROAD"
		segWidth = choice.roadWidth
		tagPrefix = "[BAD ROAD SECTOR] "
		adviceOverride = "ROUGH CRACKED PAVEMENT • MAINTAIN CONTROL!"
	elseif currentSectorType == "NARROW_SECTOR" then
		surfaceType = "ASPHALT"
		isNarrow = true
		segWidth = math.max(174, choice.roadWidth - 76)
		tagPrefix = "[NARROW SECTOR] "
		adviceOverride = "NARROW CANYON PASS • THREAD THE NEEDLE!"
	end

	currentPatternQueue[#currentPatternQueue + 1] = {
		type = choice.type,
		label = tagPrefix .. choice.label,
		advice = adviceOverride,
		severity = choice.severity,
		remaining = choice.length + (surfaceType == "DIRT_OFFROAD" and 8 or 0),
		targetCurve = choice.targetCurve,
		roadWidth = segWidth,
		surfaceType = surfaceType,
		isNarrow = isNarrow
	}

	-- 35% chance to chain an S-Chicane within the same sector
	if choice.severity >= 2 and choice.severity <= 3 and math.random() < 0.35 then
		local oppositeCurve = -choice.targetCurve
		local oppDir = oppositeCurve > 0 and "LEFT" or "RIGHT"
		local oppArrow = oppositeCurve > 0 and "⬅" or "➡"
		currentPatternQueue[#currentPatternQueue + 1] = {
			type = "CHICANE " .. oppDir,
			label = tagPrefix .. "⇄ CHICANE " .. oppArrow .. " " .. oppDir,
			advice = (surfaceType == "DIRT_OFFROAD")
				and "4x4 WEIGHT TRANSFER • RIDE THE INERTIA!"
				or "MANAGE TIRE HEAT • WEIGHT TRANSFER!",
			severity = choice.severity,
			remaining = 20,
			targetCurve = oppositeCurve,
			roadWidth = isNarrow and 182 or ((gameMode == "ENDLESS_RELAXED") and 275 or 256),
			surfaceType = surfaceType,
			isNarrow = isNarrow
		}
	end

	-- Recovery straight in the same sector so each sector feels like a cohesive stage
	local straightLen = math.random(16, 26)
	local straightLabel = "▲ BIG ROAD STRAIGHT"
	local straightAdvice = (gameMode == "ENDLESS_RELAXED")
		and "RELAXED BIG ROAD • FULL THROTTLE • ZERO OBSTACLES"
		or "FULL THROTTLE • COOL TIRES • WATCH FOR OBSTACLE ARROWS"
	if isNarrow then
		straightLabel = ">< NARROW PASS STRAIGHT"
		straightAdvice = "TIGHT CANYON MARGINS • HOLD CENTER LINE!"
	elseif surfaceType == "BAD_ROAD" then
		straightLabel = "⚠️ BAD ROAD STRAIGHT"
		straightAdvice = "ROUGH BROKEN ASPHALT • STEADY THE WHEEL!"
	elseif surfaceType == "DIRT_OFFROAD" then
		straightLabel = "▲ 4x4 GRAVEL STAGE STRAIGHT"
		straightAdvice = "FLOATING 4x4 GRIP • TIRES STAY ICE COOL"
	end

	currentPatternQueue[#currentPatternQueue + 1] = {
		type = "STRAIGHT",
		label = straightLabel,
		advice = straightAdvice,
		severity = 0,
		remaining = straightLen,
		targetCurve = 0,
		roadWidth = isNarrow and 180 or (surfaceType == "DIRT_OFFROAD" and 282 or 275),
		surfaceType = surfaceType,
		isNarrow = isNarrow
	}
end

local function GenerateNextRoadSlice(idx)
	if idx <= 12 then
		local startSurf = (gameMode == "CIRCUIT" and circuitSurfaceMode == "DIRT") and "DIRT_OFFROAD" or "ASPHALT"
		local startW = (startSurf == "DIRT_OFFROAD") and 282 or 275
		roadGenX = 0
		roadGenHeading = 0
		roadGenCurvature = 0
		roadGenWidth = startW
		roadNodes[idx] = {
			idx = idx,
			x = 0,
			y = idx * SLICE_HEIGHT,
			heading = 0,
			width = startW,
			cornerType = "STRAIGHT",
			cornerLabel = (gameMode == "CIRCUIT") and ("🏁 " .. circuitName) or "▲ LAUNCH RUNWAY",
			cornerAdvice = "HOLD [W] TO ACCELERATE NORTH",
			severity = 0,
			curvature = 0,
			surfaceType = startSurf,
			isNarrow = false,
			isStartFinish = (gameMode == "CIRCUIT") and (idx == 11 or idx == 12)
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
	roadGenWidth = Lerp(roadGenWidth, activeSeg.roadWidth or 275, 0.22)

	if activeSeg.severity == 0 then
		roadGenHeading = roadGenHeading * 0.86
	end

	local prevNode = roadNodes[idx - 1]
	local prevX = prevNode and prevNode.x or roadGenX
	roadGenX = prevX - math.sin(roadGenHeading) * SLICE_HEIGHT

	local isLapLine = false
	if gameMode == "CIRCUIT" and circuitLapSlices > 0 and idx > 12 then
		local relIdx = (idx - 12) % circuitLapSlices
		isLapLine = (relIdx == 0 or relIdx == 1)
	end

	roadNodes[idx] = {
		idx = idx,
		x = roadGenX,
		y = idx * SLICE_HEIGHT,
		heading = roadGenHeading,
		width = roadGenWidth,
		cornerType = activeSeg.type,
		cornerLabel = activeSeg.label,
		cornerAdvice = activeSeg.advice,
		severity = activeSeg.severity,
		curvature = roadGenCurvature,
		surfaceType = activeSeg.surfaceType or "ASPHALT",
		isNarrow = activeSeg.isNarrow == true,
		isStartFinish = isLapLine
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
		return 0, 275, 0, 0, "ASPHALT", false
	elseif not n0 then
		return n1.x, n1.width, n1.heading, n1.severity, n1.surfaceType or "ASPHALT", n1.isNarrow
	elseif not n1 then
		return n0.x, n0.width, n0.heading, n0.severity, n0.surfaceType or "ASPHALT", n0.isNarrow
	end

	return Lerp(n0.x, n1.x, t), Lerp(n0.width, n1.width, t), Lerp(n0.heading, n1.heading, t), n0.severity, n0.surfaceType or "ASPHALT", n0.isNarrow
end

local function SampleCircuitAtCar(wx, wy)
	if circuitNumNodes <= 0 then
		return 0, 250, 0, 0, "ASPHALT", false, 0, 1, 0
	end

	-- Search local window around carCircuitIdx first, with full-loop fallback
	local bestIdx = carCircuitIdx
	local bestD2 = 1e18
	for offset = -36, 36 do
		local idx = ((carCircuitIdx + offset - 1) % circuitNumNodes) + 1
		local n = circuitNodes[idx]
		local dx = wx - n.x
		local dy = wy - n.y
		local d2 = dx * dx + dy * dy
		if d2 < bestD2 then
			bestD2 = d2
			bestIdx = idx
		end
	end

	if bestD2 > 420 * 420 then
		for idx = 1, circuitNumNodes do
			local n = circuitNodes[idx]
			local dx = wx - n.x
			local dy = wy - n.y
			local d2 = dx * dx + dy * dy
			if d2 < bestD2 then
				bestD2 = d2
				bestIdx = idx
			end
		end
	end

	carCircuitIdx = bestIdx
	local node = circuitNodes[bestIdx]
	local signedLateral = (wx - node.x) * node.nx + (wy - node.y) * node.ny
	return node.x, node.width, node.heading, node.severity, node.surfaceType or "ASPHALT", false, signedLateral, node.nx, node.ny
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

	-- Create ALL Curbs in Layer 1, ALL Asphalt in Layer 2, ALL CenterLines in Layer 3
	-- so rotated 2D circuit segments merge into a continuous smooth ribbon with zero curb overlap seams!
	for i = 1, NUM_ROAD_SLICES do
		roadSlices[i] = {}
	end
	for i = 1, NUM_ROAD_SLICES do
		roadSlices[i].curb = NewImage(worldLayer, "RoadCurb_" .. i, -2000, -2000, 300, SLICE_HEIGHT + 3, PALETTE.curbRed, RECTANGLE_RESOURCE, false)
	end
	for i = 1, NUM_ROAD_SLICES do
		roadSlices[i].asphalt = NewImage(worldLayer, "RoadAsphalt_" .. i, -2000, -2000, 260, SLICE_HEIGHT + 3, PALETTE.asphalt, RECTANGLE_RESOURCE, false)
	end
	for i = 1, NUM_ROAD_SLICES do
		roadSlices[i].centerLine = NewImage(worldLayer, "RoadLane_" .. i, -2000, -2000, 6, SLICE_HEIGHT * 0.58, PALETTE.laneYellow, RECTANGLE_RESOURCE, false)
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
			damage = 15,
			kind = "tree",
			triggered = false,
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
	local stripeL = NewImage(carRoot, "StripeL", carW * 0.5 - 4, carH * 0.5, 4, carH - 4, PALETTE.carStripe, RECTANGLE_RESOURCE, false)
	local stripeR = NewImage(carRoot, "StripeR", carW * 0.5 + 4, carH * 0.5, 4, carH - 4, PALETTE.carStripe, RECTANGLE_RESOURCE, false)

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
		stripeL = stripeL,
		stripeR = stripeR,
		beamL = beamL,
		beamR = beamR,
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
		hp = 100,
		maxHp = 100,
		hitCooldown = 0,
		exploded = false,
		currentSurface = "ASPHALT",
		braking = false
	}
end

local RestartRace -- forward declaration
local ShowMainMenu -- forward declaration
local StartSelectedMode -- forward declaration
local ExitGame -- forward declaration

local function CreateMenuOptionButton(parent, name, x, y, w, h, bgCol, titleTxt, subTxt, onClick)
	local btn = Remember(game.InstantiateClientUIControl(BUTTON_TEMPLATE, parent))
	Configure(btn, x, y, w, h, name)
	btn.interactable = true
	btn.raycastTarget = true
	NewImage(btn, name .. "_Bg", w * 0.5, h * 0.5, w, h, bgCol, RECTANGLE_RESOURCE, true)
	NewImage(btn, name .. "_Accent", w * 0.5, h - 2, w - 6, 2, PALETTE.hudGold, RECTANGLE_RESOURCE, false)
	if subTxt and subTxt ~= "" then
		NewText(btn, name .. "_Title", titleTxt, w * 0.5, h * 0.66, w - 16, 24, 12, PALETTE.hudWhite)
		NewText(btn, name .. "_Sub", subTxt, w * 0.5, h * 0.28, w - 16, 20, 9, PALETTE.hudGold)
	else
		NewText(btn, name .. "_Title", titleTxt, w * 0.5, h * 0.5, w - 16, 26, 12, PALETTE.hudWhite)
	end
	btn:AddCursorEventListener(Enum.CursorEventType.CursorClick, function()
		if onClick then onClick() end
	end)
	return btn
end

local function BuildHUD()
	-- Bottom-Left & Bottom-Right Telemetry Panels
	NewImage(root, "SpeedPanel", 142, 96, 252, 168, PALETTE.hudBg, RECTANGLE_RESOURCE, true)
	NewImage(root, "ScorePanel", screenWidth - 156, 96, 278, 168, PALETTE.hudBg, RECTANGLE_RESOURCE, true)

	-- Top-Left Quick Main Menu Button + On-The-Fly Circuit Generator Button
	menuHudBtn = Remember(game.InstantiateClientUIControl(BUTTON_TEMPLATE, root))
	Configure(menuHudBtn, 78, screenHeight - 26, 128, 32, "MenuHudBtn")
	menuHudBtn.interactable = true
	menuHudBtn.raycastTarget = true
	NewImage(menuHudBtn, "MenuHudBtnBg", 64, 16, 128, 32, PALETTE.hudBg, RECTANGLE_RESOURCE, true)
	NewImage(menuHudBtn, "MenuHudBtnBorder", 64, 30, 122, 2, PALETTE.hudGold, RECTANGLE_RESOURCE, false)
	NewText(menuHudBtn, "MenuHudBtnTxt", "☰ MAIN MENU", 64, 16, 120, 24, 10, PALETTE.hudGold)
	menuHudBtn:AddCursorEventListener(Enum.CursorEventType.CursorClick, function()
		ShowMainMenu()
	end)

	rerollCircuitBtn = Remember(game.InstantiateClientUIControl(BUTTON_TEMPLATE, root))
	Configure(rerollCircuitBtn, 224, screenHeight - 26, 148, 32, "RerollCircuitBtn")
	rerollCircuitBtn.interactable = true
	rerollCircuitBtn.raycastTarget = true
	NewImage(rerollCircuitBtn, "RerollBtnBg", 74, 16, 148, 32, PALETTE.hudBg, RECTANGLE_RESOURCE, true)
	NewImage(rerollCircuitBtn, "RerollBtnBorder", 74, 30, 142, 2, PALETTE.tireOptimal, RECTANGLE_RESOURCE, false)
	NewText(rerollCircuitBtn, "RerollBtnTxt", "🎲 NEW CIRCUIT [R]", 74, 16, 140, 24, 10, PALETTE.tireOptimal)
	rerollCircuitBtn:AddCursorEventListener(Enum.CursorEventType.CursorClick, function()
		if gameMode == "CIRCUIT" then
			GenerateRandomCircuit(circuitSurfaceMode)
			RestartRace()
		end
	end)
	rerollCircuitBtn:SetVisible(false)

	-- Top-Right 2D Enclosed Circuit Mini-Map Radar
	circuitMinimapPanel = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, root))
	Configure(circuitMinimapPanel, screenWidth - 94, screenHeight - 68, 168, 118, "CircuitMinimapPanel")
	NewImage(circuitMinimapPanel, "MinimapBg", 84, 59, 168, 118, PALETTE.hudBg, RECTANGLE_RESOURCE, true)
	NewImage(circuitMinimapPanel, "MinimapBorder", 84, 116, 162, 2, PALETTE.hudGold, RECTANGLE_RESOURCE, false)
	circuitMinimapTitle = NewText(circuitMinimapPanel, "MinimapTitle", "CIRCUIT MAP", 84, 104, 158, 16, 8, PALETTE.hudGold)

	minimapDots = {}
	for i = 1, NUM_MINIMAP_DOTS do
		local dot = NewImage(circuitMinimapPanel, "MinimapDot_" .. i, 84, 52, 5, 5, PALETTE.curbWhite, CIRCLE_RESOURCE, false)
		minimapDots[i] = dot
	end
	minimapCarDot = NewImage(circuitMinimapPanel, "MinimapCarDot", 84, 52, 9, 9, PALETTE.paceHard, CIRCLE_RESOURCE, false)
	circuitMinimapPanel:SetVisible(false)

	-- Bottom-Left Speedometer + Car HP Bar + Tire Rubber Temperature / Grip Bar
	speedLabel = NewText(root, "SpeedLabel", "000 KM/H   [GEAR 1]", 142, 158, 236, 26, 14, PALETTE.hudWhite)

	hpLabel = NewText(root, "HpLabel", "CAR HP: 100%  [CHASSIS OK]", 142, 128, 236, 20, 10, PALETTE.tireOptimal)
	hpBarBg = NewImage(root, "HpBarBg", 142, 111, 214, 10, Color.FromRGB(40, 35, 30), RECTANGLE_RESOURCE, false)
	hpBarFill = NewImage(root, "HpBarFill", 142, 111, 210, 6, PALETTE.tireOptimal, RECTANGLE_RESOURCE, false)

	tireTempLabel = NewText(root, "TireTempLabel", "TIRE GRIP: 100%  [OPTIMAL]", 142, 84, 236, 20, 10, PALETTE.tireOptimal)
	tireBarBg = NewImage(root, "TireBarBg", 142, 67, 214, 10, Color.FromRGB(40, 35, 30), RECTANGLE_RESOURCE, false)
	tireBarFill = NewImage(root, "TireBarFill", 142, 67, 10, 6, PALETTE.tireOptimal, RECTANGLE_RESOURCE, false)

	surfaceLabel = NewText(root, "SurfaceLabel", "SURFACE: ASPHALT  •  [R] RETRY", 142, 38, 236, 20, 9, PALETTE.hudGold)

	-- Bottom-Right Pace Notes, Distance, Drift & Controls
	statsLabel = NewText(root, "StatsLabel", "NORTH: 0m  |  SCORE: 0", screenWidth - 156, 162, 262, 26, 12, PALETTE.hudGold)
	paceNoteBadge = NewText(root, "PaceNoteMain", "▲ STRAIGHT — FULL THROTTLE", screenWidth - 156, 134, 262, 26, 12, PALETTE.paceStraight)
	paceNoteSub = NewText(root, "PaceNoteSub", "PACE-NOTE RADAR ACTIVE • MANAGE ENTRY SPEED", screenWidth - 156, 108, 262, 18, 9, PALETTE.hudGold)
	controlsHintLabel = NewText(root, "ControlsHint", "DIRT = 4x4 INERTIA SLIDE (0 HEAT)  |  DODGE OBSTACLES", screenWidth - 156, 78, 266, 20, 9, PALETTE.hudWhite)
	driftLabel = NewText(root, "DriftBanner", "", screenWidth - 156, 42, 266, 22, 9, PALETTE.curbGold, Color.FromRGBA(20, 16, 12, 195))
	driftLabel:SetVisible(false)

	-- Incoming & On-Screen Obstacle Warning Arrow Indicators Pool
	obstacleWarnPool = {}
	for i = 1, NUM_OBSTACLE_MARKERS do
		local warnBox = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, root))
		Configure(warnBox, -2000, -2000, 142, 48, "ObstacleWarnBox_" .. i)
		local warnBg = NewImage(warnBox, "WarnBg_" .. i, 71, 32, 138, 22, Color.FromRGBA(22, 14, 12, 225), RECTANGLE_RESOURCE, true)
		local warnText = NewText(warnBox, "WarnText_" .. i, "⚠️ OBSTACLE", 71, 32, 132, 20, 9, PALETTE.paceHard)
		local warnArrow = NewImage(warnBox, "WarnArrow_" .. i, 71, 10, 20, 16, PALETTE.paceHard, TRIANGLE_RESOURCE, false)
		warnArrow:SetLocalRotation(0, 0, 180)
		warnBox:SetVisible(false)
		obstacleWarnPool[i] = {
			box = warnBox,
			bg = warnBg,
			text = warnText,
			arrow = warnArrow
		}
	end

	-- Game Over / Circuit Complete Modal Overlay
	gameOverPanel = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, root))
	Configure(gameOverPanel, screenWidth * 0.5, screenHeight * 0.54, 480, 260, "GameOverPanel")
	NewImage(gameOverPanel, "GameOverBg", 240, 130, 480, 260, Color.FromRGBA(18, 14, 12, 244), RECTANGLE_RESOURCE, true)
	gameOverBorder = NewImage(gameOverPanel, "GameOverBorder", 240, 256, 472, 4, PALETTE.paceHard, RECTANGLE_RESOURCE, false)

	gameOverTitle = NewText(gameOverPanel, "GameOverTitle", "💥 ENGINE DESTROYED — GG! 💥", 240, 214, 450, 34, 17, PALETTE.paceHard)
	gameOverStats = NewText(gameOverPanel, "GameOverStats", "FINAL SCORE: 0 PTS\nNORTH DISTANCE: 0m", 240, 148, 440, 56, 13, PALETTE.hudGold)
	gameOverSub = NewText(gameOverPanel, "GameOverSub", "BEST DRIFT COMBO: 0 PTS  •  OBSTACLES HIT: 0", 240, 96, 440, 24, 10, PALETTE.hudWhite)

	gameOverBtn = Remember(game.InstantiateClientUIControl(BUTTON_TEMPLATE, gameOverPanel))
	Configure(gameOverBtn, 145, 42, 236, 38, "RestartButton")
	gameOverBtn.interactable = true
	gameOverBtn.raycastTarget = true
	NewImage(gameOverBtn, "RestartBtnBg", 118, 19, 236, 38, Color.FromRGB(165, 48, 38), RECTANGLE_RESOURCE, true)
	gameOverBtnTxt = NewText(gameOverBtn, "RestartBtnTxt", "↻ PLAY AGAIN [R / SPACE]", 118, 19, 226, 30, 11, PALETTE.hudWhite)
	gameOverBtn:AddCursorEventListener(Enum.CursorEventType.CursorClick, function()
		if car and (car.exploded or circuitFinished) then
			if gameMode == "CIRCUIT" then
				GenerateRandomCircuit(circuitSurfaceMode)
			end
			RestartRace()
		end
	end)

	gameOverMenuBtn = Remember(game.InstantiateClientUIControl(BUTTON_TEMPLATE, gameOverPanel))
	Configure(gameOverMenuBtn, 368, 42, 172, 38, "GameOverMenuButton")
	gameOverMenuBtn.interactable = true
	gameOverMenuBtn.raycastTarget = true
	NewImage(gameOverMenuBtn, "GameOverMenuBg", 86, 19, 172, 38, Color.FromRGB(52, 44, 36), RECTANGLE_RESOURCE, true)
	NewText(gameOverMenuBtn, "GameOverMenuTxt", "☰ MAIN MENU", 86, 19, 162, 30, 11, PALETTE.hudGold)
	gameOverMenuBtn:AddCursorEventListener(Enum.CursorEventType.CursorClick, function()
		ShowMainMenu()
	end)
	gameOverPanel:SetVisible(false)

	-- Main Menu Overlay (Endless Challenge, Endless Relaxed, Mixed Circuit, and Exit)
	mainMenuPanel = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, root))
	local mw = 520
	local mh = 436
	Configure(mainMenuPanel, screenWidth * 0.5, screenHeight * 0.52, mw, mh, "MainMenuPanel")
	NewImage(mainMenuPanel, "MainMenuBg", mw * 0.5, mh * 0.5, mw, mh, Color.FromRGBA(18, 15, 12, 246), RECTANGLE_RESOURCE, true)
	NewImage(mainMenuPanel, "MainMenuTopGold", mw * 0.5, mh - 3, mw - 8, 4, PALETTE.hudGold, RECTANGLE_RESOURCE, false)

	NewText(mainMenuPanel, "MainMenuTitle", "NORTH RACER — ARCADE & 4x4 RALLY", mw * 0.5, mh - 32, mw - 36, 30, 18, PALETTE.hudGold)
	NewText(mainMenuPanel, "MainMenuSub", "SELECT YOUR DRIVING MODE", mw * 0.5, mh - 58, mw - 36, 20, 10, PALETTE.hudWhite)

	CreateMenuOptionButton(
		mainMenuPanel, "BtnEndlessChallenge", mw * 0.5, 316, 440, 64,
		Color.FromRGB(138, 42, 34),
		"▶ ENDLESS ROAD: CHALLENGE",
		"All Sectors (Big Road, 4x4 Dirt, Bad, Narrow) • Obstacles & Car HP",
		function()
			StartSelectedMode("ENDLESS_CHALLENGE", nil)
		end
	)

	CreateMenuOptionButton(
		mainMenuPanel, "BtnEndlessRelaxed", mw * 0.5, 240, 440, 64,
		Color.FromRGB(44, 92, 54),
		"▶ ENDLESS ROAD: RELAXED",
		"Big Road Only (Normal Asphalt & 4x4 Dirt) • No Obstacles",
		function()
			StartSelectedMode("ENDLESS_RELAXED", nil)
		end
	)

	CreateMenuOptionButton(
		mainMenuPanel, "BtnCircuitMixed", mw * 0.5, 164, 440, 64,
		Color.FromRGB(124, 90, 34),
		"▶ CIRCUIT (MIXED TARMAC & 4x4 DIRT)",
		"Randomly Generated Enclosed 3-Lap Circuit • Baked On The Fly",
		function()
			StartSelectedMode("CIRCUIT", "MIXED")
		end
	)

	CreateMenuOptionButton(
		mainMenuPanel, "BtnExitGame", mw * 0.5, 92, 440, 52,
		Color.FromRGB(46, 38, 32),
		"✕ EXIT",
		"Notifies Stage via SendSignal() & Closes Active UI via SetActive(false)",
		function()
			ExitGame()
		end
	)

	NewText(
		mainMenuPanel, "MenuControlsInfo",
		"CONTROLS: [W/S] Gas/Brake • [A/D] Steer • [SPACE] Handbrake • [R] Restart / New Circuit",
		mw * 0.5, 28, mw - 24, 24, 9, PALETTE.hudGold
	)
end

-- ============================================================================
-- PARTICLES, SKIDMARKS & ROADSIDE / ON-ROAD OBSTACLES LOGIC
-- ============================================================================

local function SpawnSkidmark(wx, wy, angleDeg, skidColor, isWide)
	local item = skidPool[skidNextIdx]
	skidNextIdx = (skidNextIdx % NUM_SKIDMARKS) + 1
	if not item then return end
	item.x = wx
	item.y = wy
	item.angle = angleDeg
	item.active = true
	item.control.imageColor = skidColor or PALETTE.skidWarm
	item.control:SetSizeDelta(isWide and 8 or 6, 15)
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

local function FindFreePropSlot()
	for i = 1, NUM_ROADSIDE_PROPS do
		local cand = propPool[i]
		if not cand.active or cand.y < cameraY - 80 then
			return cand
		end
	end
	return nil
end

local function SpawnRoadObstacleAtNode(node, laneSlot)
	local slot = FindFreePropSlot()
	if not slot or not node then return false end

	slot.triggered = false
	local offsetMult = node.isNarrow and 0.18 or 0.25
	local laneOffset = (laneSlot or math.random(-1, 1)) * offsetMult * node.width
	slot.x = node.x + laneOffset
	slot.y = node.y

	if node.surfaceType == "BAD_ROAD" and math.random() < 0.45 then
		slot.width = 28
		slot.height = 20
		slot.radius = 13
		slot.damage = 10
		slot.kind = "pothole"
		slot.control:SetImage(Enum.ImageSource.StaticReference, CIRCLE_RESOURCE)
		slot.control.imageColor = PALETTE.potholeColor
		slot.control:SetLocalRotation(0, 0, 0)
	elseif math.random() < 0.55 then
		slot.width = 28
		slot.height = 28
		slot.radius = 15
		slot.damage = 24
		slot.kind = "rock"
		slot.control:SetImage(Enum.ImageSource.StaticReference, CIRCLE_RESOURCE)
		slot.control.imageColor = PALETTE.rockColor
		slot.control:SetLocalRotation(0, 0, math.random(0, 180))
	else
		slot.width = 34
		slot.height = 14
		slot.radius = 16
		slot.damage = 22
		slot.kind = "barricade"
		slot.control:SetImage(Enum.ImageSource.StaticReference, RECTANGLE_RESOURCE)
		slot.control.imageColor = PALETTE.barricadeColor
		slot.control:SetLocalRotation(0, 0, math.deg(-node.heading))
	end

	slot.control:SetSizeDelta(slot.width, slot.height)
	slot.active = true
	slot.control:SetVisible(true)
	return true
end

local function MaybeSpawnRoadsideProps()
	local topSliceIdx = math.floor((cameraY + screenHeight + 120) / SLICE_HEIGHT)
	while lastPropSpawnIdx < topSliceIdx do
		lastPropSpawnIdx = lastPropSpawnIdx + 4
		local node = roadNodes[lastPropSpawnIdx]
		if node and lastPropSpawnIdx > 18 then
			-- Distance-based obstacle rules:
			--   • < 1km (1000m): Obstacles ONLY spawn on the wide Big Road (ASPHALT & not isNarrow).
			--   • >= 1km (1000m): Obstacles unlock on ALL road types (Offroad Dirt, Bad Road, Narrow Pass, Big Road).
			--   • >= 10km (10000m) and every +10km: Obstacle spawn rate & multi-obstacle count increase!
			local nodeMeters = math.max(0, math.floor((node.y - 140) * 0.08))
			local unlockedAllRoads = (nodeMeters >= 1000)
			local tenKmTier = math.floor(nodeMeters / 10000) -- 0 (<10km), 1 (10-19km), 2 (20-29km), 3 (30km+)...

			local isBigRoad = (node.surfaceType == "ASPHALT") and (not node.isNarrow)
			local roadAllowsObstacles = isBigRoad or unlockedAllRoads

			local minCooldownSlices = math.max(16, 70 - tenKmTier * 14)
			local obstacleSpawnChance = Clamp(0.04 + tenKmTier * 0.035, 0.04, 0.36)

			local canSpawnObstacle = (gameMode == "ENDLESS_CHALLENGE")
				and roadAllowsObstacles
				and (lastPropSpawnIdx - lastObstacleSliceIdx >= minCooldownSlices)
				and (math.random() < obstacleSpawnChance)

			if canSpawnObstacle then
				lastObstacleSliceIdx = lastPropSpawnIdx
				-- At 0..9km spawns 1 obstacle; at 10km+ spawns 1..2; at 20km+ spawns 1..3 staggered obstacles!
				local maxBurst = 1 + math.min(2, tenKmTier)
				local burstCount = (tenKmTier > 0) and math.random(1, maxBurst) or 1
				if node.isNarrow then
					burstCount = 1 -- Keep narrow roads passable
				end

				local usedLane = math.random(-1, 1)
				SpawnRoadObstacleAtNode(node, usedLane)

				for extra = 2, burstCount do
					local staggeredNode = roadNodes[lastPropSpawnIdx + (extra - 1) * 3] or node
					local nextLane = ((usedLane + extra) % 3) - 1
					SpawnRoadObstacleAtNode(staggeredNode, nextLane)
				end
			else
				local slot = FindFreePropSlot()
				if slot then
					slot.triggered = false
					local side = (lastPropSpawnIdx % 8 == 0) and 1 or -1
					local isCornerSign = node.severity >= 3
					if isCornerSign then
						local outSide = node.curvature > 0 and 1 or -1
						slot.x = node.x + outSide * (node.width * 0.5 + 34)
						slot.y = node.y
						slot.width = 22
						slot.height = 22
						slot.radius = 12
						slot.damage = 11
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
						slot.damage = 0
						slot.kind = "lamp"
						slot.control:SetImage(Enum.ImageSource.StaticReference, CIRCLE_RESOURCE)
						slot.control.imageColor = PALETTE.lampGlow
						slot.control:SetLocalRotation(0, 0, 0)
					else
						slot.x = node.x + side * (node.width * 0.5 + math.random(38, 95))
						slot.y = node.y
						slot.width = 34
						slot.height = 34
						slot.radius = 15
						slot.damage = 20
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
end

-- ============================================================================
-- CAR DAMAGE, PROGRESSIVE STEAM / SMOKE & EXPLOSION ("GG")
-- ============================================================================

local function TriggerCarExplosion()
	if car.exploded then return end
	car.exploded = true
	car.hp = 0

	-- Bank any active drift combo into final score
	if currentDriftScore > 0 then
		if currentDriftScore > bestDriftScore then
			bestDriftScore = currentDriftScore
		end
		totalScore = totalScore + currentDriftScore
		currentDriftScore = 0
	end
	isDrifting = false

	-- Char the chassis & splay the wheels
	car.chassis.imageColor = PALETTE.carBodyWreck
	if car.stripeL then car.stripeL.imageColor = Color.FromRGB(65, 58, 54) end
	if car.stripeR then car.stripeR.imageColor = Color.FromRGB(65, 58, 54) end
	if car.beamL then car.beamL:SetVisible(false) end
	if car.beamR then car.beamR:SetVisible(false) end
	car.wheelFL:SetLocalRotation(0, 0, 38)
	car.wheelFR:SetLocalRotation(0, 0, -42)
	car.wheelRL:SetLocalRotation(0, 0, -28)
	car.wheelRR:SetLocalRotation(0, 0, 35)

	shakeTimer = 0.65
	shakeIntensity = 18

	-- Massive multi-ring fireball & spark explosion burst
	for i = 1, 22 do
		local ang = (i / 22) * math.pi * 2 + (math.random() - 0.5) * 0.25
		local spd = math.random(90, 340)
		local col = (i % 3 == 0) and PALETTE.sparkColor or ((i % 2 == 0) and PALETTE.fireColor or PALETTE.engineSmoke)
		local sz = math.random(16, 30)
		SpawnParticle(car.x, car.y, math.cos(ang) * spd, math.sin(ang) * spd, sz, col, 0.65)
	end

	-- Display GG Score Screen
	if gameOverPanel then
		totalDistanceMeters = math.max(totalDistanceMeters, math.floor((car.y - 140) * 0.08))
		local distanceBonus = totalDistanceMeters * 2
		local finalTotal = totalScore + distanceBonus
		if gameOverBorder then gameOverBorder.imageColor = PALETTE.paceHard end
		gameOverTitle.fontColor = PALETTE.paceHard
		gameOverTitle.text = "💥 CAR EXPLODED — GG! 💥"
		gameOverStats.text = string.format(
			"FINAL SCORE: %d PTS\nNORTH DISTANCE: %dm (+%d PTS)  •  DRIFT PTS: %d",
			finalTotal, totalDistanceMeters, distanceBonus, totalScore
		)
		gameOverSub.text = string.format(
			"BEST DRIFT COMBO: %d PTS   |   OBSTACLES HIT: %d",
			bestDriftScore, obstaclesHitCount
		)
		if gameOverBtnTxt then
			gameOverBtnTxt.text = "↻ PLAY AGAIN [R / SPACE]"
		end
		gameOverPanel:SetAsLastSibling()
		gameOverPanel:SetVisible(true)
	end
end

local function TriggerCircuitFinish()
	if circuitFinished then return end
	circuitFinished = true

	if currentDriftScore > 0 then
		if currentDriftScore > bestDriftScore then
			bestDriftScore = currentDriftScore
		end
		totalScore = totalScore + currentDriftScore
		currentDriftScore = 0
	end
	isDrifting = false

	if gameOverPanel then
		local bestStr = circuitBestLapTime and string.format("%.2fs", circuitBestLapTime) or "--.--s"
		local timeBonus = math.max(500, math.floor(6000 - circuitTotalTime * 45))
		local finalCircuitScore = totalScore + timeBonus
		if gameOverBorder then gameOverBorder.imageColor = PALETTE.tireOptimal end
		gameOverTitle.fontColor = PALETTE.tireOptimal
		gameOverTitle.text = "🏁 CIRCUIT COMPLETE — 3 LAPS! 🏁"
		gameOverStats.text = string.format(
			"%s\nTOTAL TIME: %.2fs   •   BEST LAP: %s",
			circuitName, circuitTotalTime, bestStr
		)
		gameOverSub.text = string.format(
			"CIRCUIT SCORE: %d PTS  (DRIFT: %d  +  SPEED BONUS: %d)",
			finalCircuitScore, totalScore, timeBonus
		)
		if gameOverBtnTxt then
			gameOverBtnTxt.text = "↻ NEW CIRCUIT [R / SPACE]"
		end
		gameOverPanel:SetAsLastSibling()
		gameOverPanel:SetVisible(true)
	end
end

local function DamageCar(amount)
	-- Relaxed Endless and Circuit modes have no car destruction so players can focus on flow/laps
	if gameMode ~= "ENDLESS_CHALLENGE" then
		return
	end
	if car.exploded or car.hitCooldown > 0 or amount <= 0 then
		return
	end
	car.hp = math.max(0, car.hp - amount)
	car.hitCooldown = 0.30
	obstaclesHitCount = obstaclesHitCount + 1

	-- Darken chassis slightly as damage accumulates
	local healthRatio = car.hp / car.maxHp
	local r = math.floor(Lerp(85, 210, healthRatio))
	local g = math.floor(Lerp(32, 48, healthRatio))
	local b = math.floor(Lerp(30, 42, healthRatio))
	car.chassis.imageColor = Color.FromRGB(r, g, b)

	if car.hp <= 0 then
		TriggerCarExplosion()
	end
end

RestartRace = function()
	if not car then return end
	roadNodes = {}
	currentPatternQueue = {}
	highestGeneratedIdx = -16
	lastPropSpawnIdx = 8
	lastObstacleSliceIdx = -100
	currentSectorType = "BIG_ROAD"
	sectorPatternsLeft = 3
	circuitPatternCursor = 0
	carCircuitIdx = 1
	circuitCheckpointMask = 0
	circuitCurrentLap = 1
	circuitCurrentLapTime = 0
	circuitTotalTime = 0
	circuitFinished = false
	roadGenX = 0
	roadGenHeading = 0
	roadGenCurvature = 0
	roadGenWidth = 275

	totalDistanceMeters = 0
	totalScore = 0
	currentDriftScore = 0
	bestDriftScore = 0
	obstaclesHitCount = 0
	driftMultiplier = 1.0
	driftComboTimer = 0
	isDrifting = false

	for i = 1, NUM_SKIDMARKS do
		skidPool[i].active = false
		skidPool[i].control:SetVisible(false)
	end
	for i = 1, NUM_ROADSIDE_PROPS do
		propPool[i].active = false
		propPool[i].control:SetVisible(false)
	end
	for i = 1, NUM_PARTICLES do
		particlePool[i].active = false
		particlePool[i].control:SetVisible(false)
	end
	for m = 1, NUM_OBSTACLE_MARKERS do
		if obstacleWarnPool[m] then
			obstacleWarnPool[m].box:SetVisible(false)
		end
	end

	car.x = 0
	car.y = 140
	car.vx = 0
	car.vy = 0
	car.angle = 0
	car.angVel = 0
	car.steerLock = 0
	car.steerVisual = 0
	car.forwardSpeed = 0
	car.lateralSpeed = 0
	car.tireHeat = 0
	car.slipRatio = 0
	car.scrubLossKmh = 0
	car.hp = car.maxHp
	car.hitCooldown = 0
	car.exploded = false
	car.currentSurface = "ASPHALT"
	car.chassis.imageColor = PALETTE.carBody
	if car.stripeL then car.stripeL.imageColor = PALETTE.carStripe end
	if car.stripeR then car.stripeR.imageColor = PALETTE.carStripe end
	if car.beamL then car.beamL:SetVisible(true) end
	if car.beamR then car.beamR:SetVisible(true) end
	car.wheelFL:SetLocalRotation(0, 0, 0)
	car.wheelFR:SetLocalRotation(0, 0, 0)
	car.wheelRL:SetLocalRotation(0, 0, 0)
	car.wheelRR:SetLocalRotation(0, 0, 0)

	cameraX = car.x - screenWidth * 0.5
	cameraY = (gameMode == "CIRCUIT") and (car.y - screenHeight * 0.48) or (car.y - screenHeight * 0.24)
	if gameMode ~= "CIRCUIT" then
		EnsureRoadGeneratedUpTo(2200)
	else
		BakeCircuitIntoRoadSlices()
		RefreshCircuitMinimap()
	end

	if controlsHintLabel then
		if gameMode == "ENDLESS_RELAXED" then
			controlsHintLabel.text = "RELAXED: BIG ROAD & 4x4 DIRT ONLY  •  NO OBSTACLES"
		elseif gameMode == "CIRCUIT" then
			controlsHintLabel.text = string.format("CIRCUIT (%s): 3 LAPS  •  [R] NEW TRACK", circuitSurfaceMode)
		else
			controlsHintLabel.text = "DIRT = 4x4 INERTIA SLIDE (0 HEAT)  |  DODGE OBSTACLES"
		end
	end

	if gameOverPanel then
		gameOverPanel:SetVisible(false)
	end
end

ShowMainMenu = function()
	inMainMenu = true
	keys.up = false
	keys.down = false
	keys.left = false
	keys.right = false
	keys.handbrake = false
	if gameOverPanel then
		gameOverPanel:SetVisible(false)
	end
	for m = 1, NUM_OBSTACLE_MARKERS do
		if obstacleWarnPool[m] then
			obstacleWarnPool[m].box:SetVisible(false)
		end
	end
	if mainMenuPanel then
		mainMenuPanel:SetAsLastSibling()
		mainMenuPanel:SetVisible(true)
	end
end

StartSelectedMode = function(selectedMode, selectedCircuitSurface)
	gameMode = selectedMode or "ENDLESS_CHALLENGE"
	if gameMode == "CIRCUIT" then
		circuitBestLapTime = nil
		GenerateRandomCircuit(selectedCircuitSurface or "MIXED")
	end
	inMainMenu = false
	if mainMenuPanel then
		mainMenuPanel:SetVisible(false)
	end
	RestartRace()
end

ExitGame = function()
	-- 1. Notify the stage server Node Graph before closing the active UI script
	local exitSignal = game.ServerSignal(EXIT_SIGNAL_NAME)
	if exitSignal then
		exitSignal:SendSignal()
	end
	print("[GTA2 North Racer] Dispatched ServerSignal '" .. EXIT_SIGNAL_NAME .. "' and deactivating root via SetActive(false).")

	-- 2. Stop frame updates and deactivate the root control (closes active script / simulation window)
	script:EnableUpdate(false)
	if root then
		root:SetActive(false)
	end
end

-- ============================================================================
-- UPCOMING CORNER & ROAD CONDITION RADAR
-- ============================================================================

local function EvaluateUpcomingCorner()
	if gameMode == "CIRCUIT" and circuitNumNodes > 0 then
		local currentNode = circuitNodes[carCircuitIdx]
		local foundNode = nil
		local foundSteps = 0

		for look = 4, 28 do
			local idx = ((carCircuitIdx + look - 1) % circuitNumNodes) + 1
			local node = circuitNodes[idx]
			if node and (node.severity > 0 or node.surfaceType ~= "ASPHALT") then
				if not foundNode or node.severity > foundNode.severity then
					foundNode = node
					foundSteps = look
					if node.severity >= 3 then
						break
					end
				end
			end
		end

		if foundNode then
			local distMeters = math.max(5, math.floor(foundSteps * CIRCUIT_STEP * 0.16))
			local color = PALETTE.paceEasy
			if foundNode.severity >= 3 then
				color = PALETTE.paceHard
			elseif foundNode.severity == 2 then
				color = PALETTE.paceMedium
			elseif foundNode.surfaceType == "DIRT_OFFROAD" then
				color = PALETTE.paceDirt
			end
			paceNoteBadge.fontColor = color
			paceNoteBadge.text = foundNode.cornerLabel .. "   IN " .. tostring(distMeters) .. "m"
			paceNoteSub.text = foundNode.cornerAdvice
		elseif currentNode then
			paceNoteBadge.fontColor = PALETTE.paceStraight
			paceNoteBadge.text = currentNode.cornerLabel
			paceNoteSub.text = currentNode.cornerAdvice
		end
		return
	end

	local carIdx = math.floor(car.y / SLICE_HEIGHT)
	local currentNode = roadNodes[carIdx]

	local foundNode = nil
	local foundDistPx = 0

	for look = 5, 34 do
		local node = roadNodes[carIdx + look]
		if node and (node.severity > 0 or node.surfaceType ~= "ASPHALT" or node.isNarrow) then
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
		if foundNode.severity >= 3 then
			color = PALETTE.paceHard
		elseif foundNode.severity == 2 or foundNode.surfaceType == "BAD_ROAD" then
			color = PALETTE.paceMedium
		elseif foundNode.surfaceType == "DIRT_OFFROAD" then
			color = PALETTE.paceDirt
		end
		paceNoteBadge.fontColor = color
		paceNoteBadge.text = foundNode.cornerLabel .. "   IN " .. tostring(distMeters) .. "m"
		paceNoteSub.text = foundNode.cornerAdvice
	elseif currentNode and (currentNode.severity > 0 or currentNode.surfaceType ~= "ASPHALT") then
		paceNoteBadge.fontColor = PALETTE.paceMedium
		paceNoteBadge.text = "ACTIVE: " .. currentNode.cornerLabel
		paceNoteSub.text = currentNode.cornerAdvice
	else
		paceNoteBadge.fontColor = PALETTE.paceStraight
		paceNoteBadge.text = "▲ CLEAR STRAIGHT AHEAD"
		paceNoteSub.text = "FULL THROTTLE NORTH  •  TIRES COOLING"
	end
end

-- ============================================================================
-- PHYSICS: SPEED-STIFFENED STEERING, 4x4 OFFROAD INERTIA & CAR HP/STEAM
-- ============================================================================

local function UpdateCarPhysics(dt)
	if car.hitCooldown > 0 then
		car.hitCooldown = math.max(0, car.hitCooldown - dt)
	end

	-- 1. Car Basis Vectors (Angle = 0 points straight North +Y; +Angle turns West/Left)
	local rad = math.rad(car.angle)
	local fx = -math.sin(rad)
	local fy = math.cos(rad)
	local rx = math.cos(rad)
	local ry = math.sin(rad)

	-- If car has exploded, coast the burning wreck to a halt and emit fire/smoke
	if car.exploded then
		car.vx = car.vx * math.max(0, 1 - 3.6 * dt)
		car.vy = car.vy * math.max(0, 1 - 3.6 * dt)
		car.x = car.x + car.vx * dt
		car.y = car.y + car.vy * dt
		steamSpawnAccum = steamSpawnAccum + dt
		if steamSpawnAccum >= 0.045 then
			steamSpawnAccum = 0
			local hoodX = car.x + fx * 18 + (math.random() - 0.5) * 14
			local hoodY = car.y + fy * 18 + (math.random() - 0.5) * 14
			local isFlame = (math.random() < 0.48)
			SpawnParticle(
				hoodX, hoodY,
				(math.random() - 0.5) * 55, 35 + math.random() * 45,
				isFlame and 18 or 24,
				isFlame and PALETTE.fireColor or PALETTE.engineSmoke,
				0.55
			)
		end
		return
	end

	-- 2. Decompose World Velocity into Forward & Lateral (Sideways Slip) Components
	local forwardSpeed = car.vx * fx + car.vy * fy
	local lateralSpeed = car.vx * rx + car.vy * ry
	local absForward = math.abs(forwardSpeed)

	-- 3. Sample Road Surface under Car (2D Enclosed Circuit vs Endless Northbound Road)
	local roadCenterX, roadWidth, _, _, roadSurfaceType, isNarrowRoad
	local signedLateral = 0
	local trackNx, trackNy = 1, 0
	local distFromCenter = 0

	if gameMode == "CIRCUIT" then
		roadCenterX, roadWidth, _, _, roadSurfaceType, isNarrowRoad, signedLateral, trackNx, trackNy = SampleCircuitAtCar(car.x, car.y)
		distFromCenter = math.abs(signedLateral)
	else
		roadCenterX, roadWidth, _, _, roadSurfaceType, isNarrowRoad = SampleRoadAtY(car.y)
		signedLateral = car.x - roadCenterX
		distFromCenter = math.abs(signedLateral)
	end

	local halfRoad = roadWidth * 0.5
	local onRoadSurface = distFromCenter <= halfRoad
	local onCurb = distFromCenter > (halfRoad - 16) and distFromCenter <= (halfRoad + 18)

	local isDirtStage = onRoadSurface and (roadSurfaceType == "DIRT_OFFROAD")
	local isBadRoad = onRoadSurface and (roadSurfaceType == "BAD_ROAD")
	local isOffShoulder = (not onRoadSurface) and (not onCurb)
	local isLooseDirt = isDirtStage or isOffShoulder

	if isOffShoulder then
		car.currentSurface = "OFFROAD SHOULDER"
	elseif isDirtStage then
		car.currentSurface = isNarrowRoad and "NARROW 4x4 DIRT" or "4x4 DIRT / GRAVEL"
	elseif isBadRoad then
		car.currentSurface = isNarrowRoad and "NARROW BAD ROAD" or "BAD ROAD (ROUGH)"
	else
		car.currentSurface = isNarrowRoad and "NARROW ASPHALT" or "ASPHALT"
	end

	-- 4. Progressive Steering Input Build-Up
	local rawSteer = (keys.left and 1 or 0) - (keys.right and 1 or 0)
	if rawSteer ~= 0 then
		local buildRate = (rawSteer * car.steerLock < 0) and (STEER_RETURN_RATE * 1.3) or STEER_BUILD_RATE
		car.steerLock = Clamp(car.steerLock + rawSteer * buildRate * dt, -1.0, 1.0)
	else
		if car.steerLock > 0 then
			car.steerLock = math.max(0, car.steerLock - STEER_RETURN_RATE * dt)
		elseif car.steerLock < 0 then
			car.steerLock = math.min(0, car.steerLock + STEER_RETURN_RATE * dt)
		end
	end

	-- Bad Road suspension vibration & subtle steering bumpiness at speed
	local badRoadJitter = 0
	if isBadRoad and absForward > 180 then
		badRoadJitter = math.sin(car.y * 0.35) * 14 * Clamp(absForward / 500, 0, 1)
	end

	local absSteer = math.abs(car.steerLock)
	car.steerVisual = car.steerLock * 30
	car.wheelFL:SetLocalRotation(0, 0, car.steerVisual)
	car.wheelFR:SetLocalRotation(0, 0, car.steerVisual)

	-- 5. Speed-Dependent Turning Stiffness
	local moveRamp = Clamp(absForward / 65, 0, 1)
	local highSpeedUndersteer = 1.0 / (1.0 + (math.max(0, absForward - 160) / 285) ^ 1.45)
	local cleanTurnRate = LOW_SPEED_TURN_RATE * moveRamp * highSpeedUndersteer

	-- 6. Lateral Shear Load, Powerslide Initiation & Rubber Temperature (tireHeat)
	-- IMPORTANT: On Dirt/Gravel Offroad, tires DO NOT overheat at all because loose dirt doesn't cook rubber!
	local corneringLoad = absSteer * Clamp(absForward / 275, 0, 2.25)
	if keys.handbrake and absForward > 110 then
		corneringLoad = math.max(corneringLoad, 1.35)
	end

	local overload = math.max(0, corneringLoad - 0.55)
	if isLooseDirt then
		-- Tires stay cool on dirt/gravel while powersliding on inertia!
		car.tireHeat = Clamp(car.tireHeat - TIRE_COOL_RATE * 1.85 * dt, 0, 1.0)
	elseif overload > 0 then
		local heatMult = isBadRoad and 0.75 or 1.0
		local heatGain = overload * TIRE_HEAT_GAIN_RATE * heatMult * (keys.handbrake and 1.45 or 1.0)
		car.tireHeat = Clamp(car.tireHeat + heatGain * dt, 0, 1.0)
	else
		local coolMult = (absSteer < 0.25) and 1.35 or 0.75
		car.tireHeat = Clamp(car.tireHeat - TIRE_COOL_RATE * coolMult * dt, 0, 1.0)
	end

	-- Powerslide rotational bite: on dirt/gravel, 4x4 pitch lets you rotate the nose smoothly
	-- while momentum carries the chassis sideways (delay-based inertia feel!)
	local powerslideYawBonus = 0
	if isLooseDirt and absForward > 95 then
		powerslideYawBonus = absSteer * 48 * Clamp(absForward / 280, 0.35, 1.15)
	elseif overload > 0 and absForward > 120 then
		powerslideYawBonus = Clamp(overload * 38 + car.tireHeat * 46, 0, 72) * Clamp(absForward / 320, 0.3, 1.1)
	end

	local reverseSign = forwardSpeed >= -10 and 1 or -1
	local targetAngVel = (car.steerLock * (cleanTurnRate + powerslideYawBonus) + badRoadJitter) * reverseSign
	local angDamp = isLooseDirt and ANGULAR_DAMPING_DIRT or ANGULAR_DAMPING
	car.angVel = Lerp(car.angVel, targetAngVel, math.min(1, dt * angDamp))
	car.angle = (car.angle + car.angVel * dt + 180) % 360 - 180

	-- Recompute car basis vectors after heading rotation!
	rad = math.rad(car.angle)
	fx = -math.sin(rad)
	fy = math.cos(rad)
	rx = math.cos(rad)
	ry = math.sin(rad)

	forwardSpeed = car.vx * fx + car.vy * fy
	lateralSpeed = car.vx * rx + car.vy * ry
	absForward = math.abs(forwardSpeed)

	-- 7. Dynamic Lateral Grip (Surface-Dependent!)
	-- On Dirt/Offroad: Low lateral grip so inertia dominates (floaty grippy-ice feel where powersliding is the norm)
	local slideFactor = Clamp(overload * 0.55 + car.tireHeat * 0.78 + (keys.handbrake and 0.45 or 0), 0, 1.0)
	local currentGrip = Lerp(GRIP_COLD_CLEAN, GRIP_POWERSLIDE_MIN, slideFactor)

	if isDirtStage then
		currentGrip = GRIP_DIRT_STAGE
		slideFactor = Clamp(math.abs(lateralSpeed) / 220, 0.25, 0.85)
	elseif isOffShoulder then
		currentGrip = GRIP_OFFROAD
		slideFactor = Clamp(math.abs(lateralSpeed) / 210, 0.30, 0.90)
	elseif isBadRoad then
		currentGrip = math.min(currentGrip, GRIP_BAD_ROAD)
	end
	car.slipRatio = slideFactor

	-- Apply lateral tire grip recovery (lower grip = longer delay before velocity aligns with nose = floaty inertia!)
	lateralSpeed = lateralSpeed * math.max(0, 1 - currentGrip * dt)

	-- 8. Throttle, Braking & 4x4 AWD Dirt Pull vs Asphalt Tire-Scrub
	local throttle = (keys.up and 1 or 0) - (keys.down and 1 or 0)
	local maxSpd = MAX_FORWARD_SPEED
	if isOffShoulder then
		maxSpd = maxSpd * 0.76
	elseif isDirtStage then
		maxSpd = maxSpd * 0.92
	elseif isBadRoad then
		maxSpd = maxSpd * 0.90
	end

	if throttle > 0 then
		-- On Dirt/Gravel, 4x4 AWD claws into the dirt and pulls strongly in the nose direction!
		local tractionEff = isLooseDirt and 0.96 or Lerp(1.0, 0.68, car.tireHeat * slideFactor)
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
	-- On Asphalt, hot sideways sliding scrubs speed. On Dirt/Gravel, low friction lets the car float & carry momentum!
	local absLateral = math.abs(lateralSpeed)
	local scrubFrictionRate = Lerp(SCRUB_FRICTION_BASE, SCRUB_FRICTION_HOT, car.tireHeat)
	if isLooseDirt then
		scrubFrictionRate = SCRUB_FRICTION_BASE * 0.28
	elseif isBadRoad then
		scrubFrictionRate = scrubFrictionRate * 0.85
	end
	local scrubDecel = (absLateral * scrubFrictionRate) + (absSteer * absSteer * absForward * (isLooseDirt and 0.08 or 0.24))

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
	if isOffShoulder then
		dragFactor = dragFactor + 1.15
	elseif isBadRoad then
		dragFactor = dragFactor + 0.38
	elseif isDirtStage then
		dragFactor = dragFactor + 0.22
	end
	forwardSpeed = Clamp(forwardSpeed * (1 - dragFactor * dt), -220, maxSpd)

	-- Reconstruct World Velocity from Forward + Lateral Components
	car.vx = forwardSpeed * fx + lateralSpeed * rx
	car.vy = forwardSpeed * fy + lateralSpeed * ry
	car.forwardSpeed = forwardSpeed
	car.lateralSpeed = lateralSpeed

	-- Integrate World Position
	car.x = car.x + car.vx * dt
	if gameMode == "CIRCUIT" then
		car.y = car.y + car.vy * dt
		-- 2D Enclosed Circuit Guardrail Boundary (works in all 360-degree directions!)
		local maxOffroad = halfRoad + 125
		local node = circuitNodes[carCircuitIdx]
		if node then
			local newSignedLat = (car.x - node.x) * trackNx + (car.y - node.y) * trackNy
			if math.abs(newSignedLat) > maxOffroad then
				local sideSign = (newSignedLat >= 0) and 1 or -1
				local excess = math.abs(newSignedLat) - maxOffroad
				car.x = car.x - sideSign * excess * trackNx
				car.y = car.y - sideSign * excess * trackNy
				local vOut = (car.vx * trackNx + car.vy * trackNy) * sideSign
				if vOut > 0 then
					car.vx = car.vx - (1.45 * vOut + 55) * sideSign * trackNx
					car.vy = car.vy - (1.45 * vOut + 55) * sideSign * trackNy
				end
				shakeTimer = 0.12
				shakeIntensity = 5
			end
		end
	else
		car.y = math.max(80, car.y + car.vy * dt)
		-- Outer Guardrail / Canyon Wall Boundary (Scraping wall damages HP!)
		local maxOffroad = halfRoad + 155
		if car.x < roadCenterX - maxOffroad then
			car.x = roadCenterX - maxOffroad
			car.vx = math.abs(car.vx) * 0.55 + 90
			shakeTimer = 0.16
			shakeIntensity = 7
			DamageCar(9)
		elseif car.x > roadCenterX + maxOffroad then
			car.x = roadCenterX + maxOffroad
			car.vx = -math.abs(car.vx) * 0.55 - 90
			shakeTimer = 0.16
			shakeIntensity = 7
			DamageCar(9)
		end
	end

	-- Roadside & On-Road Obstacle Collisions
	for i = 1, NUM_ROADSIDE_PROPS do
		local prop = propPool[i]
		if prop.active and prop.radius > 0 then
			local dx = car.x - prop.x
			local dy = car.y - prop.y
			local minDist = prop.radius + 17
			if dx * dx + dy * dy < minDist * minDist then
				if prop.kind == "pothole" then
					-- Potholes stay on the road, jolt steering/velocity, and deal suspension damage if hit fast
					if not prop.triggered then
						prop.triggered = true
						car.vx = car.vx * 0.84 + (math.random() - 0.5) * 95
						car.vy = car.vy * 0.84
						car.angle = car.angle + (math.random() - 0.5) * 16
						shakeTimer = 0.16
						shakeIntensity = 7
						if absForward > 280 then
							DamageCar(prop.damage or 8)
						end
						for s = 1, 4 do
							SpawnParticle(prop.x, prop.y, (math.random() - 0.5) * 190, (math.random() - 0.5) * 190, 9, PALETTE.dirtColor, 0.28)
						end
					end
				else
					-- Solid obstacles (rocks, barricades, trees, signs): knock car & deal HP damage!
					prop.active = false
					prop.control:SetVisible(false)
					car.vx = car.vx * 0.55 + (dx >= 0 and 145 or -145)
					car.vy = car.vy * 0.55
					shakeTimer = 0.24
					shakeIntensity = 11
					DamageCar(prop.damage or 18)
					for s = 1, 6 do
						SpawnParticle(
							prop.x,
							prop.y,
							(math.random() - 0.5) * 300,
							(math.random() - 0.5) * 300,
							11,
							PALETTE.sparkColor,
							0.32
						)
					end
				end
			end
		end
	end

	-- Progressive Engine Hood Steam / Smoke / Fire based on Car HP
	if car.hp < 80 and car.hp > 0 then
		steamSpawnAccum = steamSpawnAccum + dt
		local damageSeverity = 1.0 - (car.hp / 80) -- 0.0 at 80 HP -> 1.0 at 0 HP
		local emitInterval = Lerp(0.14, 0.032, damageSeverity)
		if steamSpawnAccum >= emitInterval then
			steamSpawnAccum = 0
			local hoodX = car.x + fx * 22 + (math.random() - 0.5) * 10
			local hoodY = car.y + fy * 22 + (math.random() - 0.5) * 10
			local pColor = PALETTE.steamColor
			local pSize = math.floor(Lerp(11, 20, damageSeverity))
			if car.hp < 22 and math.random() < 0.45 then
				pColor = PALETTE.fireColor
			elseif car.hp < 45 then
				pColor = PALETTE.engineSmoke
			end
			SpawnParticle(
				hoodX, hoodY,
				car.vx * 0.25 + (math.random() - 0.5) * 40,
				car.vy * 0.25 + 35,
				pSize, pColor, 0.42
			)
		end
	end

	-- 9. Powerslide / Drift Detection, Skidmarks, Tire Smoke & 2x Dirt Rally Scoring
	local activelySliding = (absLateral > 52 or (car.tireHeat > 0.32 and absSteer > 0.35 and absForward > 180))

	if activelySliding and (onRoadSurface or isDirtStage) and absForward > 95 then
		isDrifting = true
		driftComboTimer = 1.15
		-- 4x4 Dirt/Gravel powersliding gives 2x points!
		local surfaceBonus = isDirtStage and 2.0 or 1.0
		local addedPts = math.floor((absLateral * 0.52 + absForward * 0.15) * dt * driftMultiplier * surfaceBonus)
		currentDriftScore = currentDriftScore + addedPts
		if currentDriftScore > bestDriftScore then
			bestDriftScore = currentDriftScore
		end
		driftMultiplier = math.min(6.0, driftMultiplier + (isDirtStage and 0.55 or 0.35) * dt)
	elseif driftComboTimer > 0 then
		driftComboTimer = driftComboTimer - dt
		if driftComboTimer <= 0 then
			if currentDriftScore > bestDriftScore then
				bestDriftScore = currentDriftScore
			end
			totalScore = totalScore + currentDriftScore
			currentDriftScore = 0
			driftMultiplier = 1.0
			isDrifting = false
		end
	end

	-- Visual Rear Wheel Heat Tint (Stays cool on dirt!)
	local rearWheelCol = (car.tireHeat > 0.55) and PALETTE.wheelHot or PALETTE.wheelDark
	car.wheelRL.imageColor = rearWheelCol
	car.wheelRR.imageColor = rearWheelCol

	-- Spawn Rear Tire Skidmarks / Dirt Ruts & Smoke
	skidSpawnAccum = skidSpawnAccum + dt
	if (activelySliding or (car.braking and absForward > 240)) and skidSpawnAccum >= 0.030 then
		skidSpawnAccum = 0
		local rearOffsetX = -fx * 20
		local rearOffsetY = -fy * 20
		local tireSpread = 11
		local skidCol = PALETTE.skidWarm
		local isWide = false
		if isLooseDirt then
			skidCol = PALETTE.skidDirt
			isWide = true
		elseif car.tireHeat > 0.50 then
			skidCol = PALETTE.skidHot
			isWide = true
		end
		SpawnSkidmark(car.x + rearOffsetX - rx * tireSpread, car.y + rearOffsetY - ry * tireSpread, car.angle, skidCol, isWide)
		SpawnSkidmark(car.x + rearOffsetX + rx * tireSpread, car.y + rearOffsetY + ry * tireSpread, car.angle, skidCol, isWide)
	end

	smokeSpawnAccum = smokeSpawnAccum + dt
	local smokeInterval = isLooseDirt and 0.032 or Lerp(0.055, 0.025, car.tireHeat)
	if activelySliding and smokeSpawnAccum >= smokeInterval then
		smokeSpawnAccum = 0
		local rearX = car.x - fx * 24 + (math.random() - 0.5) * 18
		local rearY = car.y - fy * 24 + (math.random() - 0.5) * 12
		local pColor = isLooseDirt and PALETTE.dirtColor or (car.tireHeat > 0.6 and PALETTE.smokeHot or PALETTE.smokeColor)
		local pSize = isLooseDirt and 17 or math.floor(Lerp(12, 22, car.tireHeat))
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
	if gameMode == "CIRCUIT" then
		-- Omni-directional 360-degree camera with forward look-ahead for enclosed 2D circuits
		local rad = math.rad(car.angle)
		local fx = -math.sin(rad)
		local fy = math.cos(rad)
		local targetCamX = car.x - screenWidth * 0.5 + fx * 85 + car.vx * 0.16
		local targetCamY = car.y - screenHeight * 0.48 + fy * 70 + car.vy * 0.16
		cameraX = Lerp(cameraX, targetCamX, math.min(1, dt * 7.5))
		cameraY = Lerp(cameraY, targetCamY, math.min(1, dt * 7.5))
	else
		local targetCamX = car.x - screenWidth * 0.5 + car.vx * 0.22
		local targetCamY = car.y - screenHeight * 0.24 + math.max(0, car.vy * 0.12)
		cameraX = Lerp(cameraX, targetCamX, math.min(1, dt * 8.5))
		cameraY = targetCamY
	end

	local shakeX = 0
	local shakeY = 0
	if shakeTimer > 0 then
		shakeTimer = math.max(0, shakeTimer - dt)
		shakeX = (math.random() - 0.5) * 2 * shakeIntensity
		shakeY = (math.random() - 0.5) * 2 * shakeIntensity
	end

	local viewCamX = cameraX + shakeX
	local viewCamY = cameraY + shakeY

	-- 1. Render Road Slices (Static Always-Loaded 220-Slice Enclosed Circuit vs Endless Northbound Spine)
	if gameMode == "CIRCUIT" and circuitNumNodes > 0 then
		-- All 220 circuit segments are statically baked and ALWAYS loaded!
		-- Only update their screen-space positions relative to the camera so zero segments ever cut out!
		for idx = 1, circuitNumNodes do
			local node = circuitNodes[idx]
			local slice = roadSlices[idx]
			if node and slice then
				local sx = node.x - viewCamX
				local sy = node.y - viewCamY
				slice.curb:SetAnchoredPosition(sx, sy)
				slice.asphalt:SetAnchoredPosition(sx, sy)
				if node.isStartFinish or (idx % 2 == 0) then
					slice.centerLine:SetAnchoredPosition(sx, sy)
				end
			end
		end

		-- Render visible baked roadside props around the 2D circuit
		local usedProps = 0
		for pIdx = 1, #circuitProps do
			local cp = circuitProps[pIdx]
			local sx = cp.x - viewCamX
			local sy = cp.y - viewCamY
			if sx >= -80 and sx <= screenWidth + 80 and sy >= -80 and sy <= screenHeight + 80 then
				usedProps = usedProps + 1
				if usedProps <= NUM_ROADSIDE_PROPS then
					local slot = propPool[usedProps]
					slot.x = cp.x
					slot.y = cp.y
					slot.width = cp.width
					slot.height = cp.height
					slot.radius = 0 -- non-blocking scenery in circuit mode
					slot.kind = cp.kind
					if cp.kind == "chevron" then
						slot.control:SetImage(Enum.ImageSource.StaticReference, TRIANGLE_RESOURCE)
						slot.control.imageColor = PALETTE.signWarn
					elseif cp.kind == "lamp" then
						slot.control:SetImage(Enum.ImageSource.StaticReference, CIRCLE_RESOURCE)
						slot.control.imageColor = PALETTE.lampGlow
					else
						slot.control:SetImage(Enum.ImageSource.StaticReference, CIRCLE_RESOURCE)
						slot.control.imageColor = PALETTE.treeFoliage
					end
					slot.control:SetLocalRotation(0, 0, cp.rot or 0)
					slot.control:SetSizeDelta(cp.width, cp.height)
					slot.control:SetAnchoredPosition(sx, sy)
					slot.control:SetVisible(true)
					slot.active = true
				end
			end
		end
		for i = usedProps + 1, NUM_ROADSIDE_PROPS do
			propPool[i].active = false
			propPool[i].control:SetVisible(false)
		end
	else
		local baseSliceIdx = math.floor(viewCamY / SLICE_HEIGHT) - 6
		for i = 1, NUM_ROAD_SLICES do
			local sliceIdx = baseSliceIdx + i
			local node = roadNodes[sliceIdx]
			local slice = roadSlices[i]
			if node and slice and i <= 48 then
				local sx = node.x - viewCamX
				local sy = node.y - viewCamY
				local isEven = (sliceIdx % 2 == 0)
				local surf = node.surfaceType or "ASPHALT"

				if surf == "DIRT_OFFROAD" then
					slice.curb.imageColor = isEven and PALETTE.dirtCurb or PALETTE.dirtRut
					slice.asphalt.imageColor = isEven and PALETTE.dirtRoad or PALETTE.dirtRoadAlt
					slice.centerLine.imageColor = PALETTE.dirtRut
				elseif surf == "BAD_ROAD" then
					slice.curb.imageColor = isEven and PALETTE.curbBad or PALETTE.curbRed
					slice.asphalt.imageColor = isEven and PALETTE.badRoadAsphalt or PALETTE.badRoadCrack
					slice.centerLine.imageColor = PALETTE.laneYellow
				else
					if node.severity >= 3 or node.isNarrow then
						slice.curb.imageColor = isEven and PALETTE.curbRed or PALETTE.curbGold
					else
						slice.curb.imageColor = isEven and PALETTE.curbRed or PALETTE.curbWhite
					end
					slice.asphalt.imageColor = PALETTE.asphalt
					slice.centerLine.imageColor = PALETTE.laneYellow
				end

				slice.curb:SetAnchoredPosition(sx, sy)
				slice.curb:SetSizeDelta(node.width + 26, SLICE_HEIGHT + 4)
				slice.curb:SetLocalRotation(0, 0, 0)
				slice.curb:SetVisible(true)

				slice.asphalt:SetAnchoredPosition(sx, sy)
				slice.asphalt:SetSizeDelta(node.width, SLICE_HEIGHT + 4)
				slice.asphalt:SetLocalRotation(0, 0, 0)
				slice.asphalt:SetVisible(true)

				if isEven then
					slice.centerLine:SetAnchoredPosition(sx, sy)
					slice.centerLine:SetSizeDelta(6, SLICE_HEIGHT * 0.58)
					slice.centerLine:SetLocalRotation(0, 0, 0)
					slice.centerLine:SetVisible(true)
				else
					slice.centerLine:SetVisible(false)
				end
			elseif slice then
				slice.curb:SetVisible(false)
				slice.asphalt:SetVisible(false)
				slice.centerLine:SetVisible(false)
			end
		end
	end

	-- 2. Render Skidmarks Pool
	for i = 1, NUM_SKIDMARKS do
		local skid = skidPool[i]
		if skid.active then
			local sx = skid.x - viewCamX
			local sy = skid.y - viewCamY
			if gameMode ~= "CIRCUIT" and (sy < -180 or sy > DESIGN_HEIGHT + 420) then
				skid.active = false
				skid.control:SetVisible(false)
			else
				skid.control:SetAnchoredPosition(sx, sy)
			end
		end
	end

	-- 3. Render Roadside & On-Road Obstacles Pool + Dynamic Tracking Warning Arrows
	local trackedObstacles = {}

	if gameMode ~= "CIRCUIT" then
		for i = 1, NUM_ROADSIDE_PROPS do
			local prop = propPool[i]
			if prop.active then
				local sy = prop.y - viewCamY
				if sy < -180 then
					prop.active = false
					prop.control:SetVisible(false)
				else
					prop.control:SetAnchoredPosition(prop.x - viewCamX, sy)
					if (prop.kind == "rock" or prop.kind == "barricade" or prop.kind == "pothole") and not prop.triggered then
						local dyAhead = prop.y - car.y
						if dyAhead > -15 and dyAhead < 1500 then
							trackedObstacles[#trackedObstacles + 1] = prop
						end
					end
				end
			end
		end
	end

	-- Sort tracked obstacles by closeness to car so nearest obstacles always get warning arrows
	table.sort(trackedObstacles, function(a, b)
		return a.y < b.y
	end)

	local bobOffset = math.sin(car.y * 0.045) * 5
	for m = 1, NUM_OBSTACLE_MARKERS do
		local marker = obstacleWarnPool[m]
		local obs = (not car.exploded) and trackedObstacles[m] or nil
		if marker then
			if obs then
				local obsScreenX = obs.x - viewCamX
				local obsScreenY = obs.y - viewCamY
				local dyAhead = math.max(0, obs.y - car.y)
				local distM = math.max(1, math.floor(dyAhead * 0.08))

				local warnX = Clamp(obsScreenX, 85, screenWidth - 85)
				local warnY = screenHeight - 44 + bobOffset

				-- Once the obstacle enters the screen, move the warning arrow with the obstacle to point right at it!
				if obsScreenY <= screenHeight - 82 then
					warnX = Clamp(obsScreenX, 65, screenWidth - 65)
					warnY = obsScreenY + (obs.height * 0.5) + 30 + bobOffset
					marker.text.text = string.format("⚠️ %s", string.upper(obs.kind))
				else
					marker.text.text = string.format("⚠️ OBSTACLE %dm", distM)
				end

				marker.box:SetVisible(true)
				marker.box:SetAnchoredPosition(warnX, warnY)
			else
				marker.box:SetVisible(false)
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

	-- Car HP / Mode Status Bar
	if gameMode == "CIRCUIT" then
		local lapFrac = Clamp((carCircuitIdx - 1) / math.max(1, circuitNumNodes), 0, 1)
		hpBarFill:SetSizeDelta(math.max(6, lapFrac * 210), 6)
		hpLabel.fontColor = PALETTE.hudGold
		hpBarFill.imageColor = PALETTE.hudGold
		hpLabel.text = string.format("🏁 %s [LAP %d/%d]", circuitName, math.min(circuitCurrentLap, circuitTotalLaps), circuitTotalLaps)
	elseif gameMode == "ENDLESS_RELAXED" then
		hpBarFill:SetSizeDelta(210, 6)
		hpLabel.fontColor = PALETTE.tireOptimal
		hpBarFill.imageColor = PALETTE.tireOptimal
		hpLabel.text = "🌿 RELAXED ENDLESS  [NO OBSTACLES]"
	else
		local hpPct = math.max(0, math.floor(car.hp))
		hpBarFill:SetSizeDelta(math.max(4, (hpPct / 100) * 210), 6)
		if hpPct > 65 then
			hpLabel.fontColor = PALETTE.tireOptimal
			hpBarFill.imageColor = PALETTE.tireOptimal
			hpLabel.text = string.format("CAR HP: %d%%  [CHASSIS OK]", hpPct)
		elseif hpPct > 35 then
			hpLabel.fontColor = PALETTE.tireWarm
			hpBarFill.imageColor = PALETTE.tireWarm
			hpLabel.text = string.format("CAR HP: %d%%  [HOOD STEAMING!]", hpPct)
		elseif hpPct > 0 then
			hpLabel.fontColor = PALETTE.tireHot
			hpBarFill.imageColor = PALETTE.tireHot
			hpLabel.text = string.format("CAR HP: %d%%  [CRITICAL SMOKE!]", hpPct)
		else
			hpLabel.fontColor = PALETTE.paceHard
			hpBarFill.imageColor = PALETTE.paceHard
			hpLabel.text = "CAR HP: 0%  [EXPLODED - GG!]"
		end
	end

	-- Tire Temperature & Grip Status Bar
	local heatPct = math.floor(car.tireHeat * 100)
	local gripPct = math.max(15, 100 - math.floor(car.slipRatio * 82))
	tireBarFill:SetSizeDelta(math.max(6, car.tireHeat * 210), 6)

	if string.find(car.currentSurface, "DIRT") or string.find(car.currentSurface, "OFFROAD") then
		tireTempLabel.fontColor = PALETTE.tireDirt
		tireBarFill.imageColor = PALETTE.tireDirt
		tireTempLabel.text = "4x4 DIRT SLIDE  [0% OVERHEAT]"
	elseif car.tireHeat < 0.35 then
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

	surfaceLabel.text = "SURFACE: " .. car.currentSurface .. "  •  [R] RESET"

	totalDistanceMeters = math.max(totalDistanceMeters, math.floor((car.y - 140) * 0.08))
	if gameMode == "CIRCUIT" then
		local bestStr = circuitBestLapTime and string.format("%.1fs", circuitBestLapTime) or "--.-s"
		statsLabel.text = string.format(
			"LAP %d/%d  |  TIME: %.1fs  |  BEST: %s",
			math.min(circuitCurrentLap, circuitTotalLaps), circuitTotalLaps, circuitCurrentLapTime, bestStr
		)
	else
		local liveScore = totalScore + currentDriftScore + totalDistanceMeters * 2
		statsLabel.text = string.format("NORTH: %dm  |  SCORE: %d", totalDistanceMeters, liveScore)
	end

	if isDrifting and currentDriftScore > 0 then
		driftLabel:SetVisible(true)
		local slipDeg = math.floor(math.deg(math.atan(math.abs(car.lateralSpeed), math.max(20, math.abs(car.forwardSpeed)))))
		local tag = string.find(car.currentSurface, "DIRT") and "4x4 DIRT 2X" or string.format("SCRUB -%d KM/H", car.scrubLossKmh)
		driftLabel.text = string.format("🔥 SLIP %d° (%s)  x%.1f  +%d PTS 🔥", slipDeg, tag, driftMultiplier, currentDriftScore)
	else
		driftLabel:SetVisible(false)
	end

	UpdateMinimapCarMarker()
end

-- ============================================================================
-- INPUT BINDINGS & LIFECYCLE HOOKS
-- ============================================================================

local function RegisterInputs()
	local function BindKey(downEnum, upEnum, field)
		root:AddKeyEventListener(downEnum, function()
			if field == "handbrake" and car and (car.exploded or circuitFinished) then
				if gameMode == "CIRCUIT" then
					GenerateRandomCircuit(circuitSurfaceMode)
				end
				RestartRace()
				return true
			end
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

	-- [R] restarts race at any time (in Circuit mode, generates & bakes a brand-new enclosed circuit on the fly!)
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardCharacterSkill3KeyDown, function()
		if not inMainMenu then
			if gameMode == "CIRCUIT" then
				GenerateRandomCircuit(circuitSurfaceMode)
			end
			RestartRace()
		end
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
	root.showCursor = true
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
	ShowMainMenu()

	script:EnableUpdate(true)
	print("[GTA2 North Racer] Main Menu, Endless (Challenge/Relaxed) & Random Circuit Modes Initialized!")
end

function OnUpdate(deltaTime)
	if not car then return end
	RefreshRootScale()
	local dt = math.min(deltaTime, 0.04)

	if gameMode ~= "CIRCUIT" then
		EnsureRoadGeneratedUpTo(car.y + DESIGN_HEIGHT + 1300)
	end

	if not inMainMenu then
		if gameMode ~= "CIRCUIT" then
			MaybeSpawnRoadsideProps()
		end
		if not circuitFinished then
			UpdateCarPhysics(dt)
		else
			-- Coast smoothly after crossing 3-lap circuit finish line
			car.vx = car.vx * math.max(0, 1 - 2.8 * dt)
			car.vy = car.vy * math.max(0, 1 - 2.8 * dt)
			car.x = car.x + car.vx * dt
			car.y = car.y + car.vy * dt
		end

		-- Update 2D Enclosed Circuit Lap Timer & Sector Checkpoint Completion
		if gameMode == "CIRCUIT" and not circuitFinished and not car.exploded and circuitNumNodes > 0 then
			local totalVelSq = car.vx * car.vx + car.vy * car.vy
			if totalVelSq > 64 or circuitTotalTime > 0 then
				circuitTotalTime = circuitTotalTime + dt
				circuitCurrentLapTime = circuitCurrentLapTime + dt
			end

			local progressFrac = (carCircuitIdx - 1) / circuitNumNodes
			if progressFrac >= 0.20 and progressFrac < 0.50 and circuitCheckpointMask == 0 then
				circuitCheckpointMask = 1
			elseif progressFrac >= 0.50 and progressFrac < 0.78 and circuitCheckpointMask == 1 then
				circuitCheckpointMask = 2
			elseif progressFrac >= 0.78 and circuitCheckpointMask == 2 then
				circuitCheckpointMask = 3
			elseif progressFrac < 0.16 and circuitCheckpointMask == 3 then
				-- Completed a full 360-degree enclosed circuit lap across the Start/Finish line!
				circuitCheckpointMask = 0
				if circuitCurrentLapTime > 2.0 then
					if not circuitBestLapTime or circuitCurrentLapTime < circuitBestLapTime then
						circuitBestLapTime = circuitCurrentLapTime
					end
				end
				circuitCurrentLapTime = 0
				if circuitCurrentLap >= circuitTotalLaps then
					TriggerCircuitFinish()
				else
					circuitCurrentLap = circuitCurrentLap + 1
				end
			end
		end

		EvaluateUpcomingCorner()
	end
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
