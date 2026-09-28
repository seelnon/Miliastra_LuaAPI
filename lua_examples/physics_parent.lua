-- TextBox_Instance ID - 1073741858
-- Image_Instance 1073741859
-- PresetButton_Instance ID - 1073741860

-- Number is Index ID of the template set on higher level cont

-- Reference Asset Resources: rectangle - 100001, circle - 100002, triangle - 100003, 4 point star - 100004, 5 point star - 100005, hollow circle - 100006
-- Rectangle is fully 'filling' the space, so scaling it = having area of 'size' fully covered in a set color [could be used for BG, Borders, etc]

-- Instantiate and mount to 'Empty_Parent' - can be references as object.script


local TEXT_REFERENCE_ID = 1073741858
local IMAGE_REFERENCE_ID = 1073741859
local BUTTON_REFERENCE_ID = 1073741860
local EMPTY_PARENT_NAME = "Empty_Parent"

local IMAGE_TEMPLATE = IMAGE_REFERENCE_ID
local TEXT_TEMPLATE = TEXT_REFERENCE_ID
local BUTTON_TEMPLATE = BUTTON_REFERENCE_ID
local CONTAINER_TEMPLATE = IMAGE_TEMPLATE
local RECTANGLE_RESOURCE = 100001
local CIRCLE_RESOURCE = 100002

local PHYSICS_STEP = 1 / 120
local MAX_STEPS_PER_FRAME = 6
local SOLVER_ITERATIONS = 3
local BALL_RESTITUTION = 0.92
local BALL_FRICTION = 0.985
local SLEEP_SPEED_SQ = 0.35
local MAX_BALL_SPEED = 1350
local WALL_RESTITUTION = 0.82
local CUE_ACCELERATION = 520
local MIN_STRIKE_SPEED = 140
local MAX_STRIKE_SPEED = 1080 -- Strict upper clamp so 5000 DPI mouse flicks never explode the table!
local MAX_PULL_DIST = 115
local MAX_MOUSE_STROKE_VEL = 1850
local NUM_AIM_DOTS = 9

local DESIGN_WIDTH = 960
local DESIGN_HEIGHT = 640
local rootScale = 1.0

local rootControl = nil
local inputControl = nil
local statusLabel = nil
local stageBannerLabel = nil
local powerBarBg = nil
local powerBarFill = nil
local powerPctLabel = nil
local cueRig = nil
local cueButt = nil
local cueShaft = nil
local cueFerrule = nil
local cueTip = nil
local aimDots = {}
local ghostTargetRing = nil

-- 2-Stage Pool Cue State:
-- Stage 1 ("AIMING"): Mouse movement rotates cue aim around the cue ball. Click locks angle -> Stage 2.
-- Stage 2 ("STRIKING"): Aim angle is 100% locked! Mouse movement only pulls back cue & measures forward stroke speed.
local cueStage = 1
local aimDirX = 1.0
local aimDirY = 0.0
local aimAngleDeg = 0.0
local lockMouseX = 0.0
local lockMouseY = 0.0
local prevAlongAxis = 0.0
local pullDist = 0.0
local maxPulledDist = 0.0
local smoothedStrokeSpeed = 0.0
local peakForwardSpeed = 0.0
local currentPowerRatio = 0.0
local strikeAnimActive = false
local strikeAnimSpeed = 0.0
local cursorX = DESIGN_WIDTH * 0.65
local cursorY = DESIGN_HEIGHT * 0.50
local ballsMoving = false
local spawnedControls = {}
local balls = {}
local pressedKeys = { up = false, left = false, down = false, right = false }
local accumulator = 0
local tableLeft = 0
local tableBottom = 0
local tableWidth = 0
local tableHeight = 0
local tableRight = 0
local tableTop = 0
local railWidth = 0
local ballRadius = 0
local pocketRadius = 0
local pocketCaptureRadiusSq = 0
local pocketOpeningHalfWidth = 0
local railInset = 0
local innerRailLeft = 0
local innerRailRight = 0
local innerRailBottom = 0
local innerRailTop = 0
local shotCount = 0
local pocketedCount = 0
local pockets = {}
local sceneStarted = false

local function RememberControl(control)
	if not control then
		printerr("[Physics] InstantiateClientUIControl returned nil")
		return nil
	end
	spawnedControls[#spawnedControls + 1] = control
	control:SetAsLastSibling()
	return control
end

local function ConfigureControl(control, x, y, width, height, name)
	control.name = name
	control:SetAnchorMin(0, 0)
	control:SetAnchorMax(0, 0)
	control:SetPivot(0.5, 0.5)
	control:SetAnchoredPosition(x, y)
	control:SetSizeDelta(width, height)
	control:SetVisible(true)
	return control
end

local function CreateImageInParent(parent, name, resourceId, color, x, y, width, height, useSoftEdge)
	local image = game.InstantiateClientUIControl(IMAGE_TEMPLATE or CONTAINER_TEMPLATE, parent)
	if not RememberControl(image) then return nil end
	ConfigureControl(image, x, y, width, height, name)
	if image.SetImage and resourceId then
		image:SetImage(Enum.ImageSource.StaticReference, resourceId)
		image.imageType = Enum.ImageType.Stretch
		image.imageColor = color
		if useSoftEdge then
			image.enableSoftEdge = true
			image.softEdgeMode = Enum.ImageMaskSoftEdgeMode.Percentage
			image:SetSoftEdgeWidth(width * 0.035, height * 0.035)
			image.horizontalSoftRange = 0.12
			image.verticalSoftRange = 0.12
		end
	else
		image.bgColor = color
	end
	return image
end

local function CreateImage(name, resourceId, color, x, y, width, height)
	return CreateImageInParent(rootControl, name, resourceId, color, x, y, width, height, false)
end

local function CreateTextInParent(parent, name, text, color, x, y, width, height, fontSize)
	local label = game.InstantiateClientUIControl(TEXT_TEMPLATE or 2, parent)
	if not RememberControl(label) then return nil end
	ConfigureControl(label, x, y, width, height, name)
	label.text = text
	label.fontSize = fontSize
	label.fontColor = color
	label.bgColor = Color.FromRGBA(0, 0, 0, 0)
	label.adaptiveFontSize = false
	label.horizontalAlignment = Enum.TextHorizontalAlignment.Middle
	label.verticalAlignment = Enum.TextVerticalAlignment.Middle
	return label
end

local function CreateText(name, text, color, x, y, width, height, fontSize)
	return CreateTextInParent(rootControl, name, text, color, x, y, width, height, fontSize)
end

local function ResetRuntimeState()
	spawnedControls = {}
	balls = {}
	statusLabel = nil
	stageBannerLabel = nil
	powerBarBg = nil
	powerBarFill = nil
	powerPctLabel = nil
	cueRig = nil
	cueButt = nil
	cueShaft = nil
	cueFerrule = nil
	cueTip = nil
	aimDots = {}
	ghostTargetRing = nil
	inputControl = nil
	pocketedCount = 0
	shotCount = 0
	pockets = {}
	cueStage = 1
	aimDirX = 1.0
	aimDirY = 0.0
	pullDist = 0.0
	maxPulledDist = 0.0
	smoothedStrokeSpeed = 0.0
	peakForwardSpeed = 0.0
	currentPowerRatio = 0.0
	strikeAnimActive = false
end

local function Clamp(val, lo, hi)
	if val < lo then return lo end
	if val > hi then return hi end
	return val
end

local function SetupGeometry()
	local screenWidth, screenHeight = DESIGN_WIDTH, DESIGN_HEIGHT
	tableWidth = math.min(screenWidth * 0.72, screenHeight * 0.66)
	tableHeight = tableWidth * 0.52
	tableLeft = (screenWidth - tableWidth) * 0.5
	tableBottom = (screenHeight - tableHeight) * 0.54
	tableRight = tableLeft + tableWidth
	tableTop = tableBottom + tableHeight
	railWidth = tableWidth * 0.035
	ballRadius = tableWidth * 0.0205
	pocketRadius = railWidth * 0.78
	pocketOpeningHalfWidth = pocketRadius * 1.45
	railInset = railWidth

	-- Precalculate strict inner playable rail bounds and squared pocket capture radius
	innerRailLeft = tableLeft + railInset + ballRadius
	innerRailRight = tableRight - railInset - ballRadius
	innerRailBottom = tableBottom + railInset + ballRadius
	innerRailTop = tableTop - railInset - ballRadius

	local captureRadius = pocketRadius + ballRadius * 0.68
	pocketCaptureRadiusSq = captureRadius * captureRadius

	pockets = {
		{ x = tableLeft + railWidth, y = tableBottom + railWidth },
		{ x = tableLeft + tableWidth * 0.5, y = tableBottom + railWidth * 0.72 },
		{ x = tableRight - railWidth, y = tableBottom + railWidth },
		{ x = tableLeft + railWidth, y = tableTop - railWidth },
		{ x = tableLeft + tableWidth * 0.5, y = tableTop - railWidth * 0.72 },
		{ x = tableRight - railWidth, y = tableTop - railWidth }
	}
end

local function ConfigureRootCanvas()
	if not rootControl then return end
	local vw, vh = game.GetUICanvasSize()
	rootScale = math.min(vw / DESIGN_WIDTH, vh / DESIGN_HEIGHT)
	rootScale = math.max(0.35, math.min(rootScale, 2.5))
	rootControl:SetAnchorMin(0.5, 0.5)
	rootControl:SetAnchorMax(0.5, 0.5)
	rootControl:SetPivot(0.5, 0.5)
	rootControl:SetAnchoredPosition(0, 0)
	rootControl:SetSizeDelta(DESIGN_WIDTH, DESIGN_HEIGHT)
	rootControl:SetLocalScale(rootScale, rootScale, 1)
end

local function MakeTableVisuals()
	local wood = Color.FromRGB(92, 48, 24)
	local felt = Color.FromRGB(22, 105, 70)
	local darkFelt = Color.FromRGB(12, 61, 43)
	local pocket = Color.FromRGB(8, 8, 12)

	CreateImage("PHY_Table_Frame", RECTANGLE_RESOURCE, wood,
		tableLeft + tableWidth * 0.5, tableBottom + tableHeight * 0.5,
		tableWidth, tableHeight)
	CreateImage("PHY_Table_Felt", RECTANGLE_RESOURCE, felt,
		tableLeft + tableWidth * 0.5, tableBottom + tableHeight * 0.5,
		tableWidth - railWidth * 2, tableHeight - railWidth * 2)

	for index, pocketPosition in ipairs(pockets) do
		CreateImage("PHY_Pocket_" .. tostring(index), CIRCLE_RESOURCE, pocket,
			pocketPosition.x, pocketPosition.y, pocketRadius * 2, pocketRadius * 2)
	end

	local innerLeft = tableLeft + railWidth
	local innerRight = tableRight - railWidth
	local innerBottom = tableBottom + railInset
	local innerTop = tableTop - railInset
	local cornerRailStart = tableLeft + railWidth + pocketRadius
	local cornerRailEnd = tableRight - railWidth - pocketRadius
	local centerRailLeftEnd = tableLeft + tableWidth * 0.5 - pocketOpeningHalfWidth
	local centerRailRightStart = tableLeft + tableWidth * 0.5 + pocketOpeningHalfWidth
	local leftSegmentWidth = centerRailLeftEnd - cornerRailStart
	local rightSegmentWidth = cornerRailEnd - centerRailRightStart
	local leftSegmentX = (cornerRailStart + centerRailLeftEnd) * 0.5
	local rightSegmentX = (centerRailRightStart + cornerRailEnd) * 0.5
	CreateImage("PHY_Felt_Shadow_Bottom", RECTANGLE_RESOURCE, darkFelt,
		leftSegmentX, innerBottom, leftSegmentWidth, 3)
	CreateImage("PHY_Felt_Shadow_Bottom_Right", RECTANGLE_RESOURCE, darkFelt,
		rightSegmentX, innerBottom, rightSegmentWidth, 3)
	CreateImage("PHY_Felt_Shadow_Top", RECTANGLE_RESOURCE, darkFelt,
		leftSegmentX, innerTop, leftSegmentWidth, 3)
	CreateImage("PHY_Felt_Shadow_Top_Right", RECTANGLE_RESOURCE, darkFelt,
		rightSegmentX, innerTop, rightSegmentWidth, 3)
	local verticalStart = tableBottom + railWidth + pocketRadius
	local verticalEnd = tableTop - railWidth - pocketRadius
	local verticalSegmentHeight = verticalEnd - verticalStart
	CreateImage("PHY_Felt_Shadow_Left", RECTANGLE_RESOURCE, darkFelt,
		innerLeft, (verticalStart + verticalEnd) * 0.5, 3, verticalSegmentHeight)
	CreateImage("PHY_Felt_Shadow_Right", RECTANGLE_RESOURCE, darkFelt,
		innerRight, (verticalStart + verticalEnd) * 0.5, 3, verticalSegmentHeight)
end

-- Standard WPA Pool Ball Palette (matching 1-7 Solids, 8 Black, 9-15 Stripes)
local POOL_BALL_COLORS = {
	[0]  = Color.FromRGB(246, 244, 236), -- Cue Ball (Ivory White)
	[1]  = Color.FromRGB(244, 188, 22),  -- 1 Yellow Solid
	[2]  = Color.FromRGB(24, 78, 198),   -- 2 Blue Solid
	[3]  = Color.FromRGB(218, 36, 36),   -- 3 Red Solid
	[4]  = Color.FromRGB(88, 38, 142),   -- 4 Purple Solid
	[5]  = Color.FromRGB(238, 96, 24),   -- 5 Orange Solid
	[6]  = Color.FromRGB(24, 128, 68),   -- 6 Green Solid
	[7]  = Color.FromRGB(126, 28, 34),   -- 7 Maroon / Burgundy Solid
	[8]  = Color.FromRGB(24, 24, 28),    -- 8 Black 8-Ball
	[9]  = Color.FromRGB(244, 188, 22),  -- 9 Yellow Stripe
	[10] = Color.FromRGB(24, 78, 198),   -- 10 Blue Stripe
	[11] = Color.FromRGB(218, 36, 36),   -- 11 Red Stripe
	[12] = Color.FromRGB(88, 38, 142),   -- 12 Purple Stripe
	[13] = Color.FromRGB(238, 96, 24),   -- 13 Orange Stripe
	[14] = Color.FromRGB(24, 128, 68),   -- 14 Green Stripe
	[15] = Color.FromRGB(126, 28, 34)    -- 15 Maroon / Burgundy Stripe
}

-- 15-Ball Triangle Rack Order (Row 0..4, Col 0..Row):
-- Slot 1 (Row 0, Col 0 - Apex): 1-Ball
-- Slot 5 (Row 2, Col 1 - Exact Center of Triangle): 8-Ball
-- Back corners (Slot 11 & Slot 15): 1 Solid (6) & 1 Stripe (15)
local RACK_BALL_NUMBERS = {
	1,
	9, 2,
	3, 8, 10,
	11, 4, 12, 5,
	6, 13, 7, 14, 15
}

local function AddBall(name, x, y, ballNumber, isCueBall)
	local diam = ballRadius * 2
	local entity = game.InstantiateClientUIControl(IMAGE_TEMPLATE, rootControl)
	if not RememberControl(entity) then return nil end
	ConfigureControl(entity, x, y, diam, diam, name)
	entity:SetImage(Enum.ImageSource.StaticReference, RECTANGLE_RESOURCE)
	entity.imageType = Enum.ImageType.Stretch
	entity.imageColor = Color.FromRGBA(0, 0, 0, 0)

	local color = POOL_BALL_COLORS[ballNumber] or POOL_BALL_COLORS[0]
	local r, g, b = Color.ToRGBA(color)
	local isStripe = (ballNumber >= 9 and ballNumber <= 15)
	local ivoryColor = POOL_BALL_COLORS[0]
	local baseR, baseG, baseB = r, g, b
	if isCueBall or isStripe then
		baseR, baseG, baseB = 246, 244, 236
	end

	local shadow = CreateImageInParent(entity, name .. "_Shadow", CIRCLE_RESOURCE,
		Color.FromRGBA(0, 0, 0, 90), ballRadius + ballRadius * 0.16, ballRadius - ballRadius * 0.18,
		diam, diam, true)

	local visual = CreateImageInParent(entity, name .. "_Visual", CIRCLE_RESOURCE,
		(isCueBall or isStripe) and ivoryColor or color,
		ballRadius, ballRadius, diam, diam, true)

	local stripeOuter = nil
	local stripeInner = nil
	if isStripe then
		-- Two contour-fitted horizontal bands so the stripe curves along the circular ball edge
		stripeOuter = CreateImageInParent(entity, name .. "_StripeOuter", RECTANGLE_RESOURCE,
			color, ballRadius, ballRadius, diam * 0.94, diam * 0.36, true)
		stripeInner = CreateImageInParent(entity, name .. "_StripeInner", RECTANGLE_RESOURCE,
			color, ballRadius, ballRadius, diam * 0.84, diam * 0.54, true)
	end

	local numberSpot = nil
	local numberSpotBack = nil
	local spotRadius = diam * 0.23
	if not isCueBall and ballNumber >= 1 then
		local spotSize = spotRadius * 2
		numberSpot = CreateImageInParent(entity, name .. "_SpotFront", CIRCLE_RESOURCE,
			Color.FromRGB(248, 246, 240), ballRadius, ballRadius, spotSize, spotSize, false)
		numberSpotBack = CreateImageInParent(entity, name .. "_SpotBack", CIRCLE_RESOURCE,
			Color.FromRGB(248, 246, 240), ballRadius, ballRadius, spotSize, spotSize, false)
		if numberSpotBack then
			numberSpotBack:SetVisible(false)
		end
	end

	local gloss = CreateImageInParent(entity, name .. "_Gloss", CIRCLE_RESOURCE,
		Color.FromRGBA(255, 255, 255, 90), ballRadius * 0.66, ballRadius * 1.34,
		diam * 0.22, diam * 0.22, true)

	if shadow then shadow:SetAsFirstSibling() end

	local ball = {
		control = entity,
		visual = visual,
		shadow = shadow,
		stripeOuter = stripeOuter,
		stripeInner = stripeInner,
		numberSpot = numberSpot,
		numberSpotBack = numberSpotBack,
		spotRadius = spotRadius,
		gloss = gloss,
		ballNumber = ballNumber,
		isStripe = isStripe,
		x = x,
		y = y,
		renderedX = x,
		renderedY = y,
		velocityX = 0,
		velocityY = 0,
		nx = 0.0,
		ny = 0.0,
		nz = 1.0,
		spinAngle = 0.0,
		rollPhase = 0.0,
		angularVel = 0.0,
		spinDirty = true,
		mass = 1,
		radius = ballRadius,
		color = color,
		r = r,
		g = g,
		b = b,
		baseR = baseR,
		baseG = baseG,
		baseB = baseB,
		isCueBall = isCueBall == true,
		active = true,
		pocketing = false,
		fadeAlpha = 255,
		lastAlpha = 255,
		pocketTargetX = 0,
		pocketTargetY = 0
	}
	balls[#balls + 1] = ball
	return ball
end

local function SetupBalls()
	local rackX = tableLeft + tableWidth * 0.67
	local rackY = tableBottom + tableHeight * 0.5
	local colSpacing = ballRadius * 2.02
	local rowSpacing = ballRadius * 1.76

	local cueBall = AddBall("PHY_Ball_Cue", tableLeft + tableWidth * 0.28,
		rackY, 0, true)
	local slotIndex = 1
	for row = 0, 4 do
		for column = 0, row do
			local x = rackX + row * rowSpacing
			local y = rackY + (column - row * 0.5) * colSpacing
			local ballNum = RACK_BALL_NUMBERS[slotIndex] or slotIndex
			AddBall("PHY_Ball_" .. tostring(ballNum), x, y, ballNum, false)
			slotIndex = slotIndex + 1
		end
	end
	return cueBall
end

local function UpdateStatus()
	if statusLabel then
		statusLabel.text = string.format(
			"POTTED: %d / 15   |   SHOTS: %d   |   [SPACE]: CANCEL WINDUP   |   [R]: RE-RACK   |   [WASD]: NUDGE CUE",
			pocketedCount, shotCount
		)
	end
end

local function BuildCueVisualsAndHUD()
	-- Top HUD Panel for 2-Stage Cue Status & Power Bar
	CreateImage("PHY_TopHudBg", RECTANGLE_RESOURCE, Color.FromRGBA(22, 18, 15, 225),
		DESIGN_WIDTH * 0.5, DESIGN_HEIGHT - 38, 720, 56)

	stageBannerLabel = CreateText("PHY_StageBanner",
		"STAGE 1 [AIMING]: MOVE MOUSE TO AIM CUE  •  LEFT-CLICK TO LOCK ANGLE",
		Color.FromRGB(235, 205, 115), DESIGN_WIDTH * 0.5, DESIGN_HEIGHT - 24, 700, 22, 13)

	powerBarBg = CreateImage("PHY_PowerBarBg", RECTANGLE_RESOURCE, Color.FromRGB(42, 35, 28),
		DESIGN_WIDTH * 0.5 - 45, DESIGN_HEIGHT - 49, 420, 14)
	powerBarFill = CreateImage("PHY_PowerBarFill", RECTANGLE_RESOURCE, Color.FromRGB(85, 215, 115),
		DESIGN_WIDTH * 0.5 - 45, DESIGN_HEIGHT - 49, 4, 10)
	powerPctLabel = CreateText("PHY_PowerPct", "STRIKE POWER: 0% (MAX CLAMPED)",
		Color.FromRGB(240, 232, 210), DESIGN_WIDTH * 0.5 + 235, DESIGN_HEIGHT - 49, 130, 18, 11)

	-- Ghost Contact Target Circle on the table
	ghostTargetRing = CreateImage("PHY_GhostTarget", 100006, Color.FromRGBA(255, 240, 150, 155),
		-1000, -1000, ballRadius * 2.1, ballRadius * 2.1)

	-- Aiming Guide Dots
	aimDots = {}
	for i = 1, NUM_AIM_DOTS do
		local dot = CreateImage("PHY_AimDot_" .. tostring(i), CIRCLE_RESOURCE,
			Color.FromRGBA(255, 245, 210, 195 - i * 15), -1000, -1000, 5, 5)
		aimDots[i] = dot
	end

	-- Rotatable Cue Stick Rig Centered on the Cue Ball
	cueRig = game.InstantiateClientUIControl(CONTAINER_TEMPLATE, rootControl)
	if RememberControl(cueRig) then
		ConfigureControl(cueRig, -1000, -1000, 400, 400, "PHY_CueRig")
		if cueRig.SetImage then
			cueRig.imageColor = Color.FromRGBA(0, 0, 0, 0)
		else
			cueRig.bgColor = Color.FromRGBA(0, 0, 0, 0)
		end

		-- Inside cueRig (400x400), (200, 200) is the exact center of the Cue Ball.
		-- The Cue Stick sits along -X (behind the cue ball) and points toward +X!
		cueButt = CreateImageInParent(cueRig, "PHY_CueButt", RECTANGLE_RESOURCE,
			Color.FromRGB(78, 36, 18), 75, 200, 92, 8, false)
		cueShaft = CreateImageInParent(cueRig, "PHY_CueShaft", RECTANGLE_RESOURCE,
			Color.FromRGB(225, 188, 128), 152, 200, 72, 5, false)
		cueFerrule = CreateImageInParent(cueRig, "PHY_CueFerrule", RECTANGLE_RESOURCE,
			Color.FromRGB(248, 245, 238), 189, 200, 6, 5, false)
		cueTip = CreateImageInParent(cueRig, "PHY_CueTip", RECTANGLE_RESOURCE,
			Color.FromRGB(65, 155, 235), 193, 200, 4, 5, false)
	end
end

local function PositionCueStickParts(offsetPull)
	if not cueButt then return end
	local baseGap = ballRadius + 6 + offsetPull
	cueTip:SetAnchoredPosition(200 - baseGap - 2, 200)
	cueFerrule:SetAnchoredPosition(200 - baseGap - 7, 200)
	cueShaft:SetAnchoredPosition(200 - baseGap - 46, 200)
	cueButt:SetAnchoredPosition(200 - baseGap - 128, 200)
end

-- Raycast from cue ball along (aimDirX, aimDirY) to find first ball or rail impact distance
local function ComputeAimRayDistance(cueBall)
	local minHitDist = 360

	-- Check inner rails
	if aimDirX > 0.001 then
		minHitDist = math.min(minHitDist, (innerRailRight - cueBall.x) / aimDirX)
	elseif aimDirX < -0.001 then
		minHitDist = math.min(minHitDist, (innerRailLeft - cueBall.x) / aimDirX)
	end
	if aimDirY > 0.001 then
		minHitDist = math.min(minHitDist, (innerRailTop - cueBall.y) / aimDirY)
	elseif aimDirY < -0.001 then
		minHitDist = math.min(minHitDist, (innerRailBottom - cueBall.y) / aimDirY)
	end

	-- Check object balls (circle-circle sweep radius = 2 * ballRadius)
	local sweepR = ballRadius * 2
	local sweepRSq = sweepR * sweepR
	for i = 2, #balls do
		local b = balls[i]
		if b.active and not b.pocketing then
			local toX = b.x - cueBall.x
			local toY = b.y - cueBall.y
			local proj = toX * aimDirX + toY * aimDirY
			if proj > 0 and proj < minHitDist then
				local perpSq = (toX * toX + toY * toY) - proj * proj
				if perpSq >= 0 and perpSq < sweepRSq then
					local hitDist = proj - math.sqrt(sweepRSq - perpSq)
					if hitDist > 0 and hitDist < minHitDist then
						minHitDist = hitDist
					end
				end
			end
		end
	end

	return math.max(ballRadius * 1.5, minHitDist)
end

local function ClampBallSpeed(ball)
	local speedSq = ball.velocityX * ball.velocityX + ball.velocityY * ball.velocityY
	if speedSq > MAX_BALL_SPEED * MAX_BALL_SPEED then
		local scale = MAX_BALL_SPEED / math.sqrt(speedSq)
		ball.velocityX = ball.velocityX * scale
		ball.velocityY = ball.velocityY * scale
	end
end

local function ExecuteCueStrike(strikeSpeed)
	local cueBall = balls[1]
	if not cueBall or not cueBall.active then return end

	local clampedSpeed = Clamp(strikeSpeed, MIN_STRIKE_SPEED, MAX_STRIKE_SPEED)
	cueBall.velocityX = aimDirX * clampedSpeed
	cueBall.velocityY = aimDirY * clampedSpeed
	ClampBallSpeed(cueBall)

	shotCount = shotCount + 1
	cueStage = 1
	pullDist = 0
	maxPulledDist = 0
	smoothedStrokeSpeed = 0
	peakForwardSpeed = 0
	currentPowerRatio = 0
	strikeAnimActive = false
	UpdateStatus()
end

local function SetBallOpacity(ball, alpha)
	local intAlpha = math.max(0, math.min(255, math.floor(alpha)))
	if ball.lastAlpha == intAlpha then
		return
	end
	ball.lastAlpha = intAlpha
	if ball.visual and ball.visual.alive then
		ball.visual.imageColor = Color.FromRGBA(ball.baseR, ball.baseG, ball.baseB, intAlpha)
	end
	if ball.stripeOuter and ball.stripeOuter.alive then
		ball.stripeOuter.imageColor = Color.FromRGBA(ball.r, ball.g, ball.b, intAlpha)
	end
	if ball.stripeInner and ball.stripeInner.alive then
		ball.stripeInner.imageColor = Color.FromRGBA(ball.r, ball.g, ball.b, intAlpha)
	end
	if ball.numberSpot and ball.numberSpot.alive then
		ball.numberSpot.imageColor = Color.FromRGBA(248, 246, 240, intAlpha)
	end
	if ball.numberSpotBack and ball.numberSpotBack.alive then
		ball.numberSpotBack.imageColor = Color.FromRGBA(248, 246, 240, intAlpha)
	end
	if ball.gloss and ball.gloss.alive then
		ball.gloss.imageColor = Color.FromRGBA(255, 255, 255, math.floor(90 * intAlpha / 255))
	end
	if ball.shadow and ball.shadow.alive then
		ball.shadow.imageColor = Color.FromRGBA(0, 0, 0, math.floor(90 * intAlpha / 255))
	end
end

local function TryPocketBall(ball)
	if not ball.active or ball.pocketing then
		return true
	end
	for i = 1, #pockets do
		local pocketPosition = pockets[i]
		local deltaX = ball.x - pocketPosition.x
		local deltaY = ball.y - pocketPosition.y
		local distSq = deltaX * deltaX + deltaY * deltaY
		if distSq <= pocketCaptureRadiusSq then
			ball.velocityX = 0
			ball.velocityY = 0
			ball.active = false
			ball.pocketing = true
			ball.fadeAlpha = 255
			ball.pocketTargetX = pocketPosition.x
			ball.pocketTargetY = pocketPosition.y
			return true
		end
	end
	return false
end

-- Unconditional solid rail containment for all active (non-pocketed) balls.
-- Eliminates the pocket-edge gap bug where multi-ball collisions could push a ball
-- through an open rail edge without triggering pocket capture.
local function ClampBallToRails(ball)
	if not ball.active or ball.pocketing then
		return
	end

	-- Check pocket capture first in case a collision pushed the ball into a pocket mouth
	if TryPocketBall(ball) then
		return
	end

	if ball.x < innerRailLeft then
		ball.x = innerRailLeft
		if ball.velocityX < 0 then
			ball.velocityX = -ball.velocityX * WALL_RESTITUTION
		end
	elseif ball.x > innerRailRight then
		ball.x = innerRailRight
		if ball.velocityX > 0 then
			ball.velocityX = -ball.velocityX * WALL_RESTITUTION
		end
	end

	if ball.y < innerRailBottom then
		ball.y = innerRailBottom
		if ball.velocityY < 0 then
			ball.velocityY = -ball.velocityY * WALL_RESTITUTION
		end
	elseif ball.y > innerRailTop then
		ball.y = innerRailTop
		if ball.velocityY > 0 then
			ball.velocityY = -ball.velocityY * WALL_RESTITUTION
		end
	end
end

-- Resolves elastic velocity impulses (on first pass) and positional overlap separation.
local function ResolveBallPair(first, second, applyImpulse)
	if not first.active or not second.active then
		return
	end
	local deltaX = second.x - first.x
	local deltaY = second.y - first.y
	local minimumDistance = first.radius + second.radius
	local distanceSquared = deltaX * deltaX + deltaY * deltaY
	if distanceSquared >= minimumDistance * minimumDistance then
		return
	end

	local distance = math.sqrt(distanceSquared)
	local normalX, normalY
	if distance > 0.0001 then
		normalX = deltaX / distance
		normalY = deltaY / distance
	else
		normalX, normalY = 1, 0
		distance = minimumDistance
	end

	local penetration = minimumDistance - distance
	local separation = penetration * 0.5 + 0.005
	first.x = first.x - normalX * separation
	first.y = first.y - normalY * separation
	second.x = second.x + normalX * separation
	second.y = second.y + normalY * separation

	if not applyImpulse then
		return
	end

	local relativeVelocityX = second.velocityX - first.velocityX
	local relativeVelocityY = second.velocityY - first.velocityY
	local normalVelocity = relativeVelocityX * normalX + relativeVelocityY * normalY
	if normalVelocity >= 0 then
		return
	end

	local impulse = -(1 + BALL_RESTITUTION) * normalVelocity * 0.5
	first.velocityX = first.velocityX - normalX * impulse
	first.velocityY = first.velocityY - normalY * impulse
	second.velocityX = second.velocityX + normalX * impulse
	second.velocityY = second.velocityY + normalY * impulse

	-- Glancing collision tangential impulse imparts axial spin to balls
	local tangentX = -normalY
	local tangentY = normalX
	local tangentVel = relativeVelocityX * tangentX + relativeVelocityY * tangentY
	local spinImpulse = (tangentVel / math.max(1, first.radius)) * 0.28
	first.angularVel = Clamp((first.angularVel or 0) + spinImpulse, -14, 14)
	second.angularVel = Clamp((second.angularVel or 0) - spinImpulse, -14, 14)
end

-- Simulates 3D sphere rolling of the white spot (nx, ny, nz) and stripe axial rotation
local function UpdateBallSpin(ball, deltaTime)
	if ball.isCueBall then return end
	local vx = ball.velocityX
	local vy = ball.velocityY
	local speedSq = vx * vx + vy * vy
	local angVel = ball.angularVel or 0

	if speedSq < 0.25 and math.abs(angVel) < 0.05 then
		ball.angularVel = 0
		return
	end

	local speed = math.sqrt(speedSq)
	local dTheta = (speed * deltaTime) / ball.radius
	ball.angularVel = angVel * 0.982

	if ball.isStripe then
		local dirX, dirY = 1, 0
		if speed > 0.001 then
			dirX = vx / speed
			dirY = vy / speed
		end
		local sx = math.cos(ball.spinAngle)
		local sy = math.sin(ball.spinAngle)
		local cross = sx * dirY - sy * dirX
		local dot = sx * dirX + sy * dirY

		-- Rotate stripe band from both tangential collision spin and off-axis rolling precession
		ball.spinAngle = ball.spinAngle + angVel * deltaTime + cross * dTheta * 0.72

		-- Roll the front & back spots through the full 360-degree (2*pi) circle along the stripe
		local dRoll = dTheta * dot
		ball.rollPhase = ball.rollPhase + dRoll
		local twoPi = math.pi * 2.0
		while ball.rollPhase > math.pi do
			ball.rollPhase = ball.rollPhase - twoPi
		end
		while ball.rollPhase < -math.pi do
			ball.rollPhase = ball.rollPhase + twoPi
		end

		local sinP = math.sin(ball.rollPhase)
		local cosP = math.cos(ball.rollPhase)
		ball.nx = sinP * math.cos(ball.spinAngle)
		ball.ny = sinP * math.sin(ball.spinAngle)
		ball.nz = cosP
	else
		-- Solid ball (1..8): full 360-degree 3D spherical rotation of the axis (nx, ny, nz) without sign flips
		if speed > 0.001 then
			local dirX = vx / speed
			local dirY = vy / speed
			local nPar = ball.nx * dirX + ball.ny * dirY
			local cosT = math.cos(dTheta)
			local sinT = math.sin(dTheta)
			local newNPar = nPar * cosT + ball.nz * sinT
			local newNz = -nPar * sinT + ball.nz * cosT
			local deltaPar = newNPar - nPar
			ball.nx = ball.nx + deltaPar * dirX
			ball.ny = ball.ny + deltaPar * dirY
			ball.nz = newNz
		end
		if math.abs(angVel) > 0.01 then
			local dAng = angVel * deltaTime
			local cA = math.cos(dAng)
			local sA = math.sin(dAng)
			local rx = ball.nx * cA - ball.ny * sA
			local ry = ball.nx * sA + ball.ny * cA
			ball.nx = rx
			ball.ny = ry
		end
		local len = math.sqrt(ball.nx * ball.nx + ball.ny * ball.ny + ball.nz * ball.nz)
		if len > 0.0001 then
			local inv = 1.0 / len
			ball.nx = ball.nx * inv
			ball.ny = ball.ny * inv
			ball.nz = ball.nz * inv
		else
			ball.nx, ball.ny, ball.nz = 0, 0, 1
		end
	end

	ball.spinDirty = true
end

-- Find a non-overlapping spot when respawning the cue ball
local function RespawnCueBall(cueBall)
	local baseX = tableLeft + tableWidth * 0.28
	local baseY = tableBottom + tableHeight * 0.5
	local minDistSq = (cueBall.radius * 2.05) ^ 2

	local candidateX = baseX
	local candidateY = baseY

	for offsetStep = 0, 8 do
		local testX = baseX - offsetStep * cueBall.radius * 1.1
		if testX < innerRailLeft then
			testX = innerRailLeft + cueBall.radius
		end
		local clear = true
		for i = 2, #balls do
			local other = balls[i]
			if other.active then
				local dx = other.x - testX
				local dy = other.y - baseY
				if dx * dx + dy * dy < minDistSq then
					clear = false
					break
				end
			end
		end
		if clear then
			candidateX = testX
			candidateY = baseY
			break
		end
	end

	cueBall.x = candidateX
	cueBall.y = candidateY
	cueBall.velocityX = 0
	cueBall.velocityY = 0
	cueBall.active = true
	SetBallOpacity(cueBall, 255)
end

local function UpdatePocketing(ball, deltaTime)
	if not ball.pocketing then
		return
	end
	local moveAmount = math.min(1, deltaTime * 9)
	ball.x = ball.x + (ball.pocketTargetX - ball.x) * moveAmount
	ball.y = ball.y + (ball.pocketTargetY - ball.y) * moveAmount
	ball.fadeAlpha = ball.fadeAlpha - deltaTime * 900
	SetBallOpacity(ball, ball.fadeAlpha)
	if ball.fadeAlpha <= 0 then
		ball.pocketing = false
		if ball.isCueBall then
			RespawnCueBall(ball)
		else
			pocketedCount = pocketedCount + 1
			if ball.control and ball.control.alive then
				ball.control:SetVisible(false)
			end
		end
		UpdateStatus()
	end
end

local function ApplyCueInput(cueBall, deltaTime)
	if not cueBall.active then
		return false
	end
	local inputX = (pressedKeys.right and 1 or 0) - (pressedKeys.left and 1 or 0)
	local inputY = (pressedKeys.up and 1 or 0) - (pressedKeys.down and 1 or 0)
	if inputX == 0 and inputY == 0 then
		return false
	end
	local length = math.sqrt(inputX * inputX + inputY * inputY)
	cueBall.velocityX = cueBall.velocityX + (inputX / length) * CUE_ACCELERATION * deltaTime
	cueBall.velocityY = cueBall.velocityY + (inputY / length) * CUE_ACCELERATION * deltaTime
	return true
end

local function SimulatePhysics(deltaTime)
	local cueBall = balls[1]
	local cueDriven = false
	if cueBall then
		cueDriven = ApplyCueInput(cueBall, deltaTime)
	end

	local ballCount = #balls
	local anyMoving = false

	for i = 1, ballCount do
		local ball = balls[i]
		if ball.pocketing then
			UpdatePocketing(ball, deltaTime)
			anyMoving = true
		elseif ball.active then
			ball.velocityX = ball.velocityX * BALL_FRICTION
			ball.velocityY = ball.velocityY * BALL_FRICTION
			ClampBallSpeed(ball)

			local speedSq = ball.velocityX * ball.velocityX + ball.velocityY * ball.velocityY
			if speedSq < SLEEP_SPEED_SQ and not (ball.isCueBall and cueDriven) then
				ball.velocityX = 0
				ball.velocityY = 0
				ball.angularVel = 0
			else
				anyMoving = true
				ball.x = ball.x + ball.velocityX * deltaTime
				ball.y = ball.y + ball.velocityY * deltaTime
				UpdateBallSpin(ball, deltaTime)
				ClampBallToRails(ball)
			end
		end
	end

	if not anyMoving then
		ballsMoving = false
		return
	end
	ballsMoving = true

	-- Multi-iteration constraint solver:
	-- Iteration 1 resolves elastic velocity impulses + initial separation + rail clamping.
	-- Iterations 2..N resolve chain positional overlaps (3+ ball pileups against rails/corners)
	-- while strictly enforcing rail boundaries at the end of EVERY iteration.
	for iter = 1, SOLVER_ITERATIONS do
		local applyImpulse = (iter == 1)
		for firstIndex = 1, ballCount - 1 do
			local first = balls[firstIndex]
			if first.active then
				for secondIndex = firstIndex + 1, ballCount do
					local second = balls[secondIndex]
					if second.active then
						ResolveBallPair(first, second, applyImpulse)
					end
				end
			end
		end
		for i = 1, ballCount do
			local ball = balls[i]
			if ball.active then
				ClampBallToRails(ball)
			end
		end
	end
end

local function RerackTable()
	pocketedCount = 0
	shotCount = 0
	cueStage = 1
	pullDist = 0
	maxPulledDist = 0
	smoothedStrokeSpeed = 0
	peakForwardSpeed = 0
	currentPowerRatio = 0
	strikeAnimActive = false

	local rackX = tableLeft + tableWidth * 0.67
	local rackY = tableBottom + tableHeight * 0.5
	local colSpacing = ballRadius * 2.02
	local rowSpacing = ballRadius * 1.76

	if balls[1] then
		balls[1].x = tableLeft + tableWidth * 0.28
		balls[1].y = rackY
		balls[1].velocityX = 0
		balls[1].velocityY = 0
		balls[1].active = true
		balls[1].pocketing = false
		SetBallOpacity(balls[1], 255)
		if balls[1].control then
			balls[1].control:SetVisible(true)
			balls[1].control:SetAnchoredPosition(balls[1].x, balls[1].y)
		end
	end

	local idx = 2
	for row = 0, 4 do
		for column = 0, row do
			local b = balls[idx]
			if b then
				b.x = rackX + row * rowSpacing
				b.y = rackY + (column - row * 0.5) * colSpacing
				b.velocityX = 0
				b.velocityY = 0
				b.nx = 0.0
				b.ny = 0.0
				b.nz = 1.0
				b.spinAngle = 0.0
				b.rollPhase = 0.0
				b.angularVel = 0.0
				b.spinDirty = true
				b.active = true
				b.pocketing = false
				SetBallOpacity(b, 255)
				if b.control then
					b.control:SetVisible(true)
					b.control:SetAnchoredPosition(b.x, b.y)
				end
			end
			idx = idx + 1
		end
	end
	UpdateStatus()
end

local function UpdateCueAndHUD(dt)
	local cueBall = balls[1]
	if not cueBall or not cueBall.active or cueBall.pocketing then
		if cueRig then cueRig:SetVisible(false) end
		if ghostTargetRing then ghostTargetRing:SetVisible(false) end
		for i = 1, NUM_AIM_DOTS do
			if aimDots[i] then aimDots[i]:SetVisible(false) end
		end
		return
	end

	-- Poll current cursor position in design coordinates
	if game.GetCursorUIPos then
		local rawX, rawY = game.GetCursorUIPos()
		if rawX and rawY and (rawX > 0 or rawY > 0) then
			local vw, vh = game.GetUICanvasSize()
			cursorX = DESIGN_WIDTH * 0.5 + (rawX - vw * 0.5) / rootScale
			cursorY = DESIGN_HEIGHT * 0.5 + (rawY - vh * 0.5) / rootScale
		end
	end

	local cueBallSpeedSq = cueBall.velocityX * cueBall.velocityX + cueBall.velocityY * cueBall.velocityY
	local canUseCue = (cueBallSpeedSq < 4.0)

	if not canUseCue then
		cueStage = 1
		pullDist = 0
		strikeAnimActive = false
		if cueRig then cueRig:SetVisible(false) end
		if ghostTargetRing then ghostTargetRing:SetVisible(false) end
		for i = 1, NUM_AIM_DOTS do
			if aimDots[i] then aimDots[i]:SetVisible(false) end
		end
		if stageBannerLabel then
			stageBannerLabel.text = "BALLS IN MOTION... WAIT FOR CUE BALL TO SETTLE"
			stageBannerLabel.fontColor = Color.FromRGB(185, 195, 205)
		end
		return
	end

	if strikeAnimActive then
		-- Fast forward snap animation of the cue stick into the cue ball
		pullDist = pullDist - dt * 820
		if pullDist <= 0 then
			pullDist = 0
			ExecuteCueStrike(strikeAnimSpeed)
			return
		end
	elseif cueStage == 1 then
		-- STAGE 1: AIMING
		-- Mouse aims from the cue ball toward the cursor
		local dx = cursorX - cueBall.x
		local dy = cursorY - cueBall.y
		local len = math.sqrt(dx * dx + dy * dy)
		if len > 2.0 then
			aimDirX = dx / len
			aimDirY = dy / len
			aimAngleDeg = math.deg(math.atan(aimDirY, aimDirX))
		end
		pullDist = 0
		currentPowerRatio = 0
		if stageBannerLabel then
			stageBannerLabel.text = "STAGE 1 [AIMING]: MOVE MOUSE TO AIM  •  LEFT-CLICK TO LOCK ANGLE"
			stageBannerLabel.fontColor = Color.FromRGB(115, 235, 145)
		end
	else
		-- STAGE 2: STRIKING (Angle is 100% locked! Mouse movement ONLY controls pullback & strike speed)
		-- Project mouse movement along the locked shot axis (aimDirX, aimDirY)
		local relX = cursorX - lockMouseX
		local relY = cursorY - lockMouseY
		local alongAxis = relX * aimDirX + relY * aimDirY

		-- Pulling mouse backward along the cue line (-alongAxis > 0) pulls the cue stick back
		local targetPull = Clamp(-alongAxis, 0, MAX_PULL_DIST)
		local deltaAlong = alongAxis - prevAlongAxis
		prevAlongAxis = alongAxis

		local instantVelAlong = deltaAlong / math.max(0.004, dt)
		-- Clamp instantaneous mouse speed so 5000 DPI mice cannot spike velocity!
		local clampedInstantVel = Clamp(instantVelAlong, -MAX_MOUSE_STROKE_VEL, MAX_MOUSE_STROKE_VEL)

		if clampedInstantVel > 0 then
			smoothedStrokeSpeed = smoothedStrokeSpeed * 0.45 + clampedInstantVel * 0.55
			if pullDist > 8 and smoothedStrokeSpeed > peakForwardSpeed then
				peakForwardSpeed = smoothedStrokeSpeed
			end
		else
			smoothedStrokeSpeed = smoothedStrokeSpeed * 0.7
		end

		pullDist = targetPull
		if pullDist > maxPulledDist then
			maxPulledDist = pullDist
		end

		-- Live power meter preview (based on pullback windup or forward stroke velocity)
		local pullRatio = Clamp(pullDist / MAX_PULL_DIST, 0, 1.0)
		local strokeRatio = Clamp(peakForwardSpeed / MAX_MOUSE_STROKE_VEL, 0, 1.0)
		currentPowerRatio = Clamp(math.max(pullRatio, strokeRatio * 0.68 + (maxPulledDist / MAX_PULL_DIST) * 0.32), 0, 1.0)

		-- If player wound up the cue (maxPulledDist >= 15) and thrust the mouse forward back to the ball (pullDist <= 6):
		if maxPulledDist >= 15 and pullDist <= 6 and peakForwardSpeed > 95 then
			local finalRatio = Clamp((peakForwardSpeed / MAX_MOUSE_STROKE_VEL) * 0.65 + (maxPulledDist / MAX_PULL_DIST) * 0.35, 0.12, 1.0)
			local strikeSpd = MIN_STRIKE_SPEED + finalRatio * (MAX_STRIKE_SPEED - MIN_STRIKE_SPEED)
			ExecuteCueStrike(strikeSpd)
			return
		end

		if stageBannerLabel then
			stageBannerLabel.text = "STAGE 2 [LOCKED AIM]: PULL MOUSE BACK TO WIND UP, THRUST FORWARD (OR CLICK) TO STRIKE!"
			stageBannerLabel.fontColor = Color.FromRGB(255, 205, 75)
		end
	end

	-- Update Power Bar UI
	if powerBarFill and powerPctLabel then
		local pct = math.floor(currentPowerRatio * 100 + 0.5)
		powerBarFill:SetSizeDelta(math.max(4, currentPowerRatio * 414), 10)
		local r = math.floor(85 + currentPowerRatio * 170)
		local g = math.floor(225 - currentPowerRatio * 145)
		powerBarFill.imageColor = Color.FromRGB(r, g, 65)
		powerPctLabel.text = string.format("POWER: %d%%", pct)
	end

	-- Render Cue Rig & Raycast Aiming Line
	if cueRig then
		cueRig:SetVisible(true)
		cueRig:SetAnchoredPosition(cueBall.x, cueBall.y)
		cueRig:SetLocalRotation(0, 0, aimAngleDeg)
		PositionCueStickParts(pullDist)
	end

	local rayDist = ComputeAimRayDistance(cueBall)
	if ghostTargetRing then
		ghostTargetRing:SetVisible(true)
		ghostTargetRing:SetAnchoredPosition(cueBall.x + aimDirX * rayDist, cueBall.y + aimDirY * rayDist)
		ghostTargetRing.imageColor = (cueStage == 2)
			and Color.FromRGBA(255, 205, 75, 210)
			or Color.FromRGBA(255, 245, 190, 145)
	end

	for i = 1, NUM_AIM_DOTS do
		local dot = aimDots[i]
		if dot then
			local d = (i / (NUM_AIM_DOTS + 1)) * rayDist
			if d >= ballRadius + 6 and d <= rayDist - ballRadius * 0.6 then
				dot:SetAnchoredPosition(cueBall.x + aimDirX * d, cueBall.y + aimDirY * d)
				dot:SetVisible(true)
			else
				dot:SetVisible(false)
			end
		end
	end
end

-- Projects a 3D pole normal (sx, sy, sz) onto the 2D ball disc with smooth rim foreshortening
local function UpdateSpotTransform(spot, sx, sy, sz, radius, spotRadius)
	if not spot then return end
	-- Spot remains visible until its trailing edge finishes rolling past the horizon rim (sz <= -0.18)
	if sz <= -0.18 then
		spot:SetVisible(false)
		return
	end
	spot:SetVisible(true)

	local v = Clamp((sz + 0.18) / 1.18, 0.0, 1.0)
	local squash = math.max(0.03, v * v * (3.0 - 2.0 * v))

	local rxy = math.sqrt(sx * sx + sy * sy)
	local ux, uy = 1.0, 0.0
	local radialDeg = 0.0
	if rxy > 0.0005 then
		ux = sx / rxy
		uy = sy / rxy
		radialDeg = math.deg(math.atan(uy, ux))
	end

	local rimProgress = (sz >= 0.0) and rxy or 1.0
	local spotHalfWidth = spotRadius * squash
	local maxCenterDist = radius * 0.94 - spotHalfWidth
	local offsetDist = rimProgress * maxCenterDist

	spot:SetAnchoredPosition(radius + ux * offsetDist, radius + uy * offsetDist)
	spot:SetLocalRotation(0, 0, radialDeg)
	spot:SetLocalScale(squash, 1.0, 1.0)
end

-- Dirty-checked UI position & 3D spin updates (0 UI calls/sec when balls are stationary)
local function RenderBalls()
	for i = 1, #balls do
		local ball = balls[i]
		if (ball.active or ball.pocketing) and ball.control and ball.control.alive then
			local dx = ball.x - ball.renderedX
			local dy = ball.y - ball.renderedY
			if dx * dx + dy * dy > 0.0025 then
				ball.renderedX = ball.x
				ball.renderedY = ball.y
				ball.control:SetAnchoredPosition(ball.x, ball.y)
			end
			if ball.spinDirty then
				ball.spinDirty = false
				if ball.isStripe then
					local deg = math.deg(ball.spinAngle)
					if ball.stripeOuter then ball.stripeOuter:SetLocalRotation(0, 0, deg) end
					if ball.stripeInner then ball.stripeInner:SetLocalRotation(0, 0, deg) end
				end
				if ball.numberSpot then
					UpdateSpotTransform(
						ball.numberSpot,
						ball.nx, ball.ny, ball.nz,
						ball.radius, ball.spotRadius
					)
				end
				if ball.numberSpotBack then
					UpdateSpotTransform(
						ball.numberSpotBack,
						-ball.nx, -ball.ny, -ball.nz,
						ball.radius, ball.spotRadius
					)
				end
			end
		end
	end
end

local function RegisterKeyboardInput()
	local keyMap = {
		{ Enum.KeyEventType.KeyboardMoveForwardKeyDown, Enum.KeyEventType.KeyboardMoveForwardKeyUp, "up" },
		{ Enum.KeyEventType.KeyboardMoveLeftKeyDown, Enum.KeyEventType.KeyboardMoveLeftKeyUp, "left" },
		{ Enum.KeyEventType.KeyboardMoveBackwardKeyDown, Enum.KeyEventType.KeyboardMoveBackwardKeyUp, "down" },
		{ Enum.KeyEventType.KeyboardMoveRightKeyDown, Enum.KeyEventType.KeyboardMoveRightKeyUp, "right" }
	}
	for _, mapping in ipairs(keyMap) do
		rootControl:AddKeyEventListener(mapping[1], function()
			pressedKeys[mapping[3]] = true
			return true
		end)
		rootControl:AddKeyEventListener(mapping[2], function()
			pressedKeys[mapping[3]] = false
			return true
		end)
	end

	-- [SPACE] cancels Stage 2 windup back to Stage 1 aiming
	rootControl:AddKeyEventListener(Enum.KeyEventType.KeyboardJumpKeyDown, function()
		if cueStage == 2 and not strikeAnimActive then
			cueStage = 1
			pullDist = 0
			maxPulledDist = 0
			smoothedStrokeSpeed = 0
			peakForwardSpeed = 0
			currentPowerRatio = 0
		end
		return true
	end)

	-- [R] re-racks all pool balls
	rootControl:AddKeyEventListener(Enum.KeyEventType.KeyboardCharacterSkill3KeyDown, function()
		RerackTable()
		return true
	end)
end

local function CreateInputLayer()
	inputControl = game.InstantiateClientUIControl(BUTTON_TEMPLATE or 4, rootControl)
	if not RememberControl(inputControl) then return false end
	ConfigureControl(inputControl, DESIGN_WIDTH * 0.5, DESIGN_HEIGHT * 0.5, DESIGN_WIDTH, DESIGN_HEIGHT, "PHY_InputLayer")
	inputControl.interactable = true
	inputControl.raycastTarget = true
	inputControl:AddCursorEventListener(Enum.CursorEventType.CursorClick, function(eventData)
		ConfigureRootCanvas()
		local rawX, rawY = eventData:GetUIPos()
		local vw, vh = game.GetUICanvasSize()
		local x = DESIGN_WIDTH * 0.5 + (rawX - vw * 0.5) / rootScale
		local y = DESIGN_HEIGHT * 0.5 + (rawY - vh * 0.5) / rootScale
		cursorX = x
		cursorY = y

		local cueBall = balls[1]
		if not cueBall or not cueBall.active or cueBall.pocketing then return end
		local speedSq = cueBall.velocityX * cueBall.velocityX + cueBall.velocityY * cueBall.velocityY
		if speedSq >= 4.0 or strikeAnimActive then return end

		if cueStage == 1 then
			-- Stage 1 -> Stage 2: Lock the aim angle!
			local dx = x - cueBall.x
			local dy = y - cueBall.y
			local len = math.sqrt(dx * dx + dy * dy)
			if len > 2.0 then
				aimDirX = dx / len
				aimDirY = dy / len
				aimAngleDeg = math.deg(math.atan(aimDirY, aimDirX))
			end
			lockMouseX = x
			lockMouseY = y
			prevAlongAxis = 0
			pullDist = 0
			maxPulledDist = 0
			smoothedStrokeSpeed = 0
			peakForwardSpeed = 0
			currentPowerRatio = 0
			cueStage = 2
		elseif cueStage == 2 then
			-- Stage 2 Click: If pulled back, trigger animated cue stroke with wound-up strength!
			-- If not pulled back yet, unlock back to Stage 1 to re-aim.
			if pullDist >= 6 or maxPulledDist >= 10 then
				local power = Clamp(math.max(pullDist, maxPulledDist) / MAX_PULL_DIST, 0.14, 1.0)
				currentPowerRatio = power
				strikeAnimSpeed = MIN_STRIKE_SPEED + power * (MAX_STRIKE_SPEED - MIN_STRIKE_SPEED)
				pullDist = math.max(pullDist, 28)
				strikeAnimActive = true
			else
				cueStage = 1
				pullDist = 0
				currentPowerRatio = 0
			end
		end
	end)
	return true
end

function OnStart()
	if sceneStarted then
		return
	end
	sceneStarted = true
	---@diagnostic disable-next-line: undefined-global
	rootControl = script.object
	if not rootControl then
		rootControl = game.FindClientUIRoot(EMPTY_PARENT_NAME)
	end
	if not rootControl then
		rootControl = game.InstantiateClientUIControl(CONTAINER_TEMPLATE, nil)
		if rootControl then
			rootControl.name = "Physics_Root"
		end
	end
	if not rootControl then
		printerr("[Physics] Could not resolve or create a valid parent control")
		sceneStarted = false
		return
	end
	ResetRuntimeState()
	ConfigureRootCanvas()
	rootControl.disableCursorEventPassthrough = true
	rootControl.disableKeyEventPassthrough = true
	rootControl.showCursor = true
	SetupGeometry()
	MakeTableVisuals()
	SetupBalls()
	BuildCueVisualsAndHUD()
	statusLabel = CreateText("PHY_Status",
		"POTTED: 0 / 15   |   SHOTS: 0   |   [SPACE]: CANCEL WINDUP   |   [R]: RE-RACK   |   [WASD]: NUDGE CUE",
		Color.FromRGB(240, 232, 205), tableLeft + tableWidth * 0.5,
		tableBottom - railWidth * 1.8, tableWidth + 140, railWidth * 1.5, 14)
	if not CreateInputLayer() then
		sceneStarted = false
		return
	end
	RegisterKeyboardInput()
	accumulator = 0
	---@diagnostic disable-next-line: undefined-global
	script:EnableUpdate(true)
	print("[Physics] 2-Stage Pool Table instantiated: " .. tostring(#balls) .. " balls")
end

function OnUpdate(deltaTime)
	ConfigureRootCanvas()
	local dt = math.min(deltaTime, 0.1)
	accumulator = accumulator + dt
	local steps = 0
	while accumulator >= PHYSICS_STEP and steps < MAX_STEPS_PER_FRAME do
		SimulatePhysics(PHYSICS_STEP)
		accumulator = accumulator - PHYSICS_STEP
		steps = steps + 1
	end
	RenderBalls()
	UpdateCueAndHUD(dt)
end

function OnDestroy()
	sceneStarted = false
	spawnedControls = {}
	balls = {}
	statusLabel = nil
	inputControl = nil
end
