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
local MAX_STEPS_PER_FRAME = 8
local BALL_COUNT = 16
local BALL_RESTITUTION = 0.92
local BALL_FRICTION = 0.985
local WALL_RESTITUTION = 0.82
local CUE_ACCELERATION = 760
local EXPLOSION_RADIUS = 240
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
local pocketOpeningHalfWidth = 0
local railInset = 0
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

local function ResolveTemplateIndex(referenceId)
	local reference = game.GetClientUIControl(referenceId)
	if reference and reference.prefabIndex then
		return reference.prefabIndex
	end
	return nil
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
	railInset = railWidth * 1
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
	local ball = {
		control = entity,
		visual = visual,
		shadow = shadow,
		x = x,
		y = y,
		velocityX = 0,
		velocityY = 0,
		mass = 1,
		radius = ballRadius,
		color = color,
		isCueBall = isCueBall == true,
		active = true,
		pocketing = false,
		fadeAlpha = 255,
		pocketTargetX = 0,
		pocketTargetY = 0
	}
	balls[#balls + 1] = ball
	return ball
end

local function SetupBalls()
	local rackX = tableLeft + tableWidth * 0.68
	local rackY = tableBottom + tableHeight * 0.5
	local rowSpacing = ballRadius * 1.82
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

local function Dot(x1, y1, x2, y2)
	return x1 * x2 + y1 * y2
end

local function IsOpenAtEdge(ball, edge)
	local openingAllowance = pocketOpeningHalfWidth + ball.radius * 0.7
	for index, pocketPosition in ipairs(pockets) do
		local isBottomPocket = index <= 3
		local isTopPocket = index >= 4
		if edge == "bottom" and isBottomPocket
			and math.abs(ball.x - pocketPosition.x) <= openingAllowance then
			return true
		elseif edge == "top" and isTopPocket
			and math.abs(ball.x - pocketPosition.x) <= openingAllowance then
			return true
		elseif edge == "left" and (index == 1 or index == 4)
			and math.abs(ball.y - pocketPosition.y) <= openingAllowance then
			return true
		elseif edge == "right" and (index == 3 or index == 6)
			and math.abs(ball.y - pocketPosition.y) <= openingAllowance then
			return true
		end
	end
	return false
end

local function ClampBallToRails(ball)
	local left = tableLeft + railInset + ball.radius
	local right = tableRight - railInset - ball.radius
	local bottom = tableBottom + railInset + ball.radius
	local top = tableTop - railInset - ball.radius

	if ball.x < left and not IsOpenAtEdge(ball, "left") then
		ball.x = left
		if ball.velocityX < 0 then ball.velocityX = -ball.velocityX * WALL_RESTITUTION end
	elseif ball.x > right and not IsOpenAtEdge(ball, "right") then
		ball.x = right
		if ball.velocityX > 0 then ball.velocityX = -ball.velocityX * WALL_RESTITUTION end
	end
	if ball.y < bottom and not IsOpenAtEdge(ball, "bottom") then
		ball.y = bottom
		if ball.velocityY < 0 then ball.velocityY = -ball.velocityY * WALL_RESTITUTION end
	elseif ball.y > top and not IsOpenAtEdge(ball, "top") then
		ball.y = top
		if ball.velocityY > 0 then ball.velocityY = -ball.velocityY * WALL_RESTITUTION end
	end
end

local function ResolveBallPair(first, second)
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
	local separation = penetration * 0.5 + 0.01
	first.x = first.x - normalX * separation
	first.y = first.y - normalY * separation
	second.x = second.x + normalX * separation
	second.y = second.y + normalY * separation

	local relativeVelocityX = second.velocityX - first.velocityX
	local relativeVelocityY = second.velocityY - first.velocityY
	local normalVelocity = Dot(relativeVelocityX, relativeVelocityY, normalX, normalY)
	if normalVelocity >= 0 then
		return
	end

	local impulse = -(1 + BALL_RESTITUTION) * normalVelocity / 2
	first.velocityX = first.velocityX - normalX * impulse
	first.velocityY = first.velocityY - normalY * impulse
	second.velocityX = second.velocityX + normalX * impulse
	second.velocityY = second.velocityY + normalY * impulse
end

local function UpdateStatus()
	if statusLabel then
		statusLabel.text = "WASD: move the cue ball   Click: impulse   Potted: "
			.. tostring(pocketedCount) .. "   Shots: " .. tostring(shotCount)
	end
end

local function SetBallOpacity(ball, alpha)
	if ball.visual and ball.visual.alive then
		local red, green, blue = Color.ToRGBA(ball.color)
		ball.visual.imageColor = Color.FromRGBA(red, green, blue, math.floor(alpha))
	end
	if ball.shadow and ball.shadow.alive then
		ball.shadow.imageColor = Color.FromRGBA(0, 0, 0, math.floor(90 * alpha / 255))
	end
end

local function TryPocketBall(ball)
	if not ball.active or ball.pocketing then
		return true
	end
	for _, pocketPosition in ipairs(pockets) do
		local deltaX = ball.x - pocketPosition.x
		local deltaY = ball.y - pocketPosition.y
		local pocketDistance = math.sqrt(deltaX * deltaX + deltaY * deltaY)
		if pocketDistance <= pocketRadius + ball.radius * 0.7 then
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

local function UpdatePocketing(ball, deltaTime)
	if not ball.pocketing then
		return
	end
	local moveAmount = math.min(1, deltaTime * 9)
	ball.x = ball.x + (ball.pocketTargetX - ball.x) * moveAmount
	ball.y = ball.y + (ball.pocketTargetY - ball.y) * moveAmount
	ball.fadeAlpha = ball.fadeAlpha - deltaTime * 900
	SetBallOpacity(ball, math.max(0, ball.fadeAlpha))
	if ball.fadeAlpha <= 0 then
		ball.pocketing = false
		if ball.isCueBall then
			ball.x = tableLeft + tableWidth * 0.28
			ball.y = tableBottom + tableHeight * 0.5
			ball.active = true
			SetBallOpacity(ball, 255)
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
	local inputX = (pressedKeys.right and 1 or 0) - (pressedKeys.left and 1 or 0)
	local inputY = (pressedKeys.up and 1 or 0) - (pressedKeys.down and 1 or 0)
	local length = math.sqrt(inputX * inputX + inputY * inputY)
	if length > 0 then
		cueBall.velocityX = cueBall.velocityX + inputX / length * CUE_ACCELERATION * deltaTime
		cueBall.velocityY = cueBall.velocityY + inputY / length * CUE_ACCELERATION * deltaTime
	end
end

local function SimulatePhysics(deltaTime)
	local cueBall = balls[1]
	if cueBall then ApplyCueInput(cueBall, deltaTime) end

	for _, ball in ipairs(balls) do
		UpdatePocketing(ball, deltaTime)
		if ball.active then
			ball.velocityX = ball.velocityX * BALL_FRICTION
			ball.velocityY = ball.velocityY * BALL_FRICTION
			ball.x = ball.x + ball.velocityX * deltaTime
			ball.y = ball.y + ball.velocityY * deltaTime
			if not TryPocketBall(ball) then
				ClampBallToRails(ball)
			end
		end
	end

	for firstIndex = 1, #balls - 1 do
		for secondIndex = firstIndex + 1, #balls do
			ResolveBallPair(balls[firstIndex], balls[secondIndex])
		end
	end
	for _, ball in ipairs(balls) do
		if ball.active then ClampBallToRails(ball) end
	end
end

local function ApplyExplosion(x, y)
	shotCount = shotCount + 1
	for _, ball in ipairs(balls) do
		if ball.active then
			local deltaX = ball.x - x
			local deltaY = ball.y - y
			local distanceSquared = deltaX * deltaX + deltaY * deltaY
			if distanceSquared < EXPLOSION_RADIUS * EXPLOSION_RADIUS then
				local distance = math.sqrt(distanceSquared)
				local normalX, normalY = 1, 0
				if distance > 0.001 then
					normalX, normalY = deltaX / distance, deltaY / distance
				end
				local strength = 1 - distance / EXPLOSION_RADIUS
				ball.velocityX = ball.velocityX + normalX * EXPLOSION_IMPULSE * strength
				ball.velocityY = ball.velocityY + normalY * EXPLOSION_IMPULSE * strength
			end
		end
	end
	UpdateStatus()
end

local function RenderBalls()
	for _, ball in ipairs(balls) do
		if (ball.active or ball.pocketing) and ball.control and ball.control.alive then
			ball.control:SetAnchoredPosition(ball.x, ball.y)
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
	ConfigureControl(inputControl, 0, 0, game.GetUICanvasSize(), 1, "PHY_InputLayer")
	local screenWidth, screenHeight = game.GetUICanvasSize()
	inputControl:SetAnchoredPosition(screenWidth * 0.5, screenHeight * 0.5)
	inputControl:SetSizeDelta(screenWidth, screenHeight)
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