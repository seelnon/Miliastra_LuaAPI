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
local CUE_ACCELERATION = 760
local EXPLOSION_RADIUS = 240
local EXPLOSION_RADIUS_SQ = EXPLOSION_RADIUS * EXPLOSION_RADIUS
local EXPLOSION_IMPULSE = 720

local rootControl = nil
local inputControl = nil
local statusLabel = nil
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

local function CreateText(name, text, color, x, y, width, height, fontSize)
	local label = game.InstantiateClientUIControl(TEXT_TEMPLATE or 2, rootControl)
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

local function ResetRuntimeState()
	spawnedControls = {}
	balls = {}
	statusLabel = nil
	inputControl = nil
	pocketedCount = 0
	shotCount = 0
	pockets = {}
end

local function SetupGeometry()
	local screenWidth, screenHeight = game.GetUICanvasSize()
	tableWidth = math.min(screenWidth * 0.72, screenHeight * 0.66)
	tableHeight = tableWidth * 0.52
	tableLeft = (screenWidth - tableWidth) * 0.5
	tableBottom = (screenHeight - tableHeight) * 0.54
	tableRight = tableLeft + tableWidth
	tableTop = tableBottom + tableHeight
	railWidth = tableWidth * 0.035
	ballRadius = tableWidth * 0.018
	pocketRadius = railWidth * 0.72
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
	local screenWidth, screenHeight = game.GetUICanvasSize()
	rootControl:SetAnchorMin(0, 0)
	rootControl:SetAnchorMax(0, 0)
	rootControl:SetPivot(0, 0)
	rootControl:SetAnchoredPosition(0, 0)
	rootControl:SetSizeDelta(screenWidth, screenHeight)
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

local function AddBall(name, x, y, color, isCueBall)
	local entity = game.InstantiateClientUIControl(IMAGE_TEMPLATE, rootControl)
	if not RememberControl(entity) then return nil end
	ConfigureControl(entity, x, y, ballRadius * 2, ballRadius * 2, name)
	entity:SetImage(Enum.ImageSource.StaticReference, RECTANGLE_RESOURCE)
	entity.imageType = Enum.ImageType.Stretch
	entity.imageColor = Color.FromRGBA(0, 0, 0, 0)

	local shadow = CreateImageInParent(entity, name .. "_Shadow", CIRCLE_RESOURCE,
		Color.FromRGBA(0, 0, 0, 90), ballRadius + ballRadius * 0.16, ballRadius - ballRadius * 0.18,
		ballRadius * 2, ballRadius * 2, true)
	local visual = CreateImageInParent(entity, name .. "_Visual", CIRCLE_RESOURCE,
		color, ballRadius, ballRadius, ballRadius * 2, ballRadius * 2, true)
	if shadow then shadow:SetAsFirstSibling() end

	local r, g, b = Color.ToRGBA(color)
	local ball = {
		control = entity,
		visual = visual,
		shadow = shadow,
		x = x,
		y = y,
		renderedX = x,
		renderedY = y,
		velocityX = 0,
		velocityY = 0,
		mass = 1,
		radius = ballRadius,
		color = color,
		r = r,
		g = g,
		b = b,
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
	local rackX = tableLeft + tableWidth * 0.68
	local rackY = tableBottom + tableHeight * 0.5
	local rowSpacing = ballRadius * 1.88
	local colors = {
		Color.FromRGB(245, 245, 235), Color.FromRGB(220, 35, 35),
		Color.FromRGB(30, 80, 220), Color.FromRGB(235, 190, 20),
		Color.FromRGB(125, 35, 165), Color.FromRGB(235, 105, 22),
		Color.FromRGB(25, 145, 75), Color.FromRGB(30, 30, 35),
		Color.FromRGB(225, 220, 205), Color.FromRGB(190, 25, 35),
		Color.FromRGB(30, 65, 185), Color.FromRGB(225, 170, 15),
		Color.FromRGB(105, 25, 145), Color.FromRGB(220, 80, 18),
		Color.FromRGB(20, 120, 65), Color.FromRGB(35, 35, 40)
	}
	local cueBall = AddBall("PHY_Ball_Cue", tableLeft + tableWidth * 0.28,
		rackY, colors[1], true)
	for row = 0, 4 do
		for column = 0, row do
			local x = rackX + row * rowSpacing
			local y = rackY + (column - row * 0.5) * rowSpacing
			AddBall("PHY_Ball_" .. tostring(#balls + 1), x, y,
				colors[#balls + 1], false)
		end
	end
	return cueBall
end

local function UpdateStatus()
	if statusLabel then
		statusLabel.text = "WASD: move the cue ball   Click: impulse   Potted: "
			.. tostring(pocketedCount) .. "   Shots: " .. tostring(shotCount)
	end
end

local function SetBallOpacity(ball, alpha)
	local intAlpha = math.max(0, math.min(255, math.floor(alpha)))
	if ball.lastAlpha == intAlpha then
		return
	end
	ball.lastAlpha = intAlpha
	if ball.visual and ball.visual.alive then
		ball.visual.imageColor = Color.FromRGBA(ball.r, ball.g, ball.b, intAlpha)
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

local function ClampBallSpeed(ball)
	local speedSq = ball.velocityX * ball.velocityX + ball.velocityY * ball.velocityY
	if speedSq > MAX_BALL_SPEED * MAX_BALL_SPEED then
		local scale = MAX_BALL_SPEED / math.sqrt(speedSq)
		ball.velocityX = ball.velocityX * scale
		ball.velocityY = ball.velocityY * scale
	end
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
			else
				anyMoving = true
				ball.x = ball.x + ball.velocityX * deltaTime
				ball.y = ball.y + ball.velocityY * deltaTime
				ClampBallToRails(ball)
			end
		end
	end

	if not anyMoving then
		return
	end

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

local function ApplyExplosion(x, y)
	shotCount = shotCount + 1
	for i = 1, #balls do
		local ball = balls[i]
		if ball.active then
			local deltaX = ball.x - x
			local deltaY = ball.y - y
			local distanceSquared = deltaX * deltaX + deltaY * deltaY
			if distanceSquared < EXPLOSION_RADIUS_SQ then
				local distance = math.sqrt(distanceSquared)
				local normalX, normalY = 1, 0
				if distance > 0.001 then
					normalX, normalY = deltaX / distance, deltaY / distance
				end
				local strength = 1 - distance / EXPLOSION_RADIUS
				ball.velocityX = ball.velocityX + normalX * EXPLOSION_IMPULSE * strength
				ball.velocityY = ball.velocityY + normalY * EXPLOSION_IMPULSE * strength
				ClampBallSpeed(ball)
			end
		end
	end
	UpdateStatus()
end

-- Dirty-checked UI position updates (0 UI calls/sec when balls are stationary)
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
end

local function CreateInputLayer()
	inputControl = game.InstantiateClientUIControl(BUTTON_TEMPLATE or 4, rootControl)
	if not RememberControl(inputControl) then return false end
	local screenWidth, screenHeight = game.GetUICanvasSize()
	ConfigureControl(inputControl, screenWidth * 0.5, screenHeight * 0.5, screenWidth, screenHeight, "PHY_InputLayer")
	inputControl.interactable = true
	inputControl.raycastTarget = true
	inputControl:AddCursorEventListener(Enum.CursorEventType.CursorClick, function(eventData)
		local x, y = eventData:GetUIPos()
		if x >= tableLeft and x <= tableRight and y >= tableBottom and y <= tableTop then
			ApplyExplosion(x, y)
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
	SetupGeometry()
	MakeTableVisuals()
	SetupBalls()
	statusLabel = CreateText("PHY_Status", "WASD: move the cue ball   Click: impulse   Potted: 0   Shots: 0",
		Color.FromRGB(240, 232, 205), tableLeft + tableWidth * 0.5,
		tableBottom - railWidth * 1.8, tableWidth, railWidth * 1.5, 20)
	if not CreateInputLayer() then
		sceneStarted = false
		return
	end
	RegisterKeyboardInput()
	accumulator = 0
	---@diagnostic disable-next-line: undefined-global
	script:EnableUpdate(true)
	print("[Physics] Pool table instantiated: " .. tostring(#balls) .. " balls")
end

function OnUpdate(deltaTime)
	accumulator = accumulator + math.min(deltaTime, 0.1)
	local steps = 0
	while accumulator >= PHYSICS_STEP and steps < MAX_STEPS_PER_FRAME do
		SimulatePhysics(PHYSICS_STEP)
		accumulator = accumulator - PHYSICS_STEP
		steps = steps + 1
	end
	RenderBalls()
end

function OnDestroy()
	sceneStarted = false
	spawnedControls = {}
	balls = {}
	statusLabel = nil
	inputControl = nil
end
