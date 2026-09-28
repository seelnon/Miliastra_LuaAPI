local CONTAINER_TEMPLATE = 1073741852
local TEXT_TEMPLATE = 1073741853
local IMAGE_TEMPLATE = 1073741854
local BUTTON_TEMPLATE = 1073741855
local RECTANGLE_RESOURCE = 100001
local CIRCLE_RESOURCE = 100002

local TILE = 64
local GRAVITY = -3100
local GOOMBA_GRAVITY = -3100
local JUMP_HOLD_GRAVITY = -1800
local RUN_ACCELERATION = 1250
local AIR_ACCELERATION = 850
local RUN_FRICTION = 1450
local SKID_FRICTION = 3200
local WALK_SPEED = 285
local SPRINT_SPEED = 430
local JUMP_SPEED = 1150
local SPRINT_JUMP_SPEED = 1320
local STOMP_BOUNCE_SPEED = 620
local MAX_JUMP_HOLD = 0.12
local SPRINT_RELEASE_BUFFER = 10 / 60
local WORLD_WIDTH = 9000
local PLAYER_WIDTH = 32
local PLAYER_HEIGHT = 48
local PLAYER_VISUAL_WIDTH = 64
local PLAYER_VISUAL_HEIGHT = 64
local FLOOR_BUFFER = 4

local root = nil
local worldLayer = nil
local player = nil
local cameraX = 0
local screenWidth = 0
local screenHeight = 0
local groundY = 128
local accumulator = 0
local frameTimer = 0
local currentFrame = 1
local statusLabel = nil
local started = false
local controls = {}
local platforms = {}
local goombas = {}
local keys = { left = false, right = false, jump = false, sprint = false }
local jumpHoldTime = 0
local sprintReleaseTimer = 0
local runTimer = 0
local recordedTime = nil
local runFinished = false
local finishResetTimer = 0
local finishAnimationTime = 0
local FLAG_X = 117 * TILE
local CASTLE_X = 123 * TILE + TILE * 0.5

local marioFrames = {
	{
		"..RRRR..", ".RRRRRR.", "SSSSKSSS", "SSSSSSSS",
		".BBBBBB.", "BBBBBBBB", "..BBBB..", ".DD..DD."
	},
	{
		"..RRRR..", ".RRRRRR.", "SSSSKSSS", "SSSSSSSS",
		"..BBBB..", ".BBBBBB.", "BBBBBBBB", "DD....DD"
	},
	{
		"..RRRR..", ".RRRRRR.", "SSSSKSSS", "SSSSSSSS",
		".BBBBBB.", "BBBBBBBB", ".BBBB...", "..DD.DD."
	},
	{
		"..RRRR..", ".RRRRRR.", "SSSSKSSS", "SSSSSSSS",
		".BBBBBB.", "BBBBBBBB", "...BBBB.", "..DDDD.."
	}
}

local marioColors = {
	R = Color.FromRGBA(220, 40, 40, 255),
	S = Color.FromRGBA(255, 190, 130, 255),
	K = Color.FromRGBA(100, 50, 25, 255),
	B = Color.FromRGBA(35, 75, 190, 255),
	D = Color.FromRGBA(75, 45, 30, 255),
	transparent = Color.FromRGBA(255, 255, 255, 0)
}

local function Remember(control)
	if not control then
		printerr("[Platformer] Could not instantiate a control")
		return nil
	end
	controls[#controls + 1] = control
	control:SetAsLastSibling()
	return control
end

local function Configure(control, x, y, width, height, name, parent)
	control.name = name
	control:SetAnchorMin(0, 0)
	control:SetAnchorMax(0, 0)
	control:SetPivot(0.5, 0.5)
	control:SetAnchoredPosition(x, y)
	control:SetSizeDelta(width, height)
	control:SetVisible(true)
	return control
end

local function NewImage(parent, name, x, y, width, height, color, resource)
	local image = Remember(game.InstantiateClientUIControl(IMAGE_TEMPLATE, parent))
	if not image then return nil end
	Configure(image, x, y, width, height, name)
	image:SetImage(Enum.ImageSource.StaticReference, resource or RECTANGLE_RESOURCE)
	image.imageType = Enum.ImageType.Stretch
	image.imageColor = color
	local imageScript = image:GetScriptByPath("Image_Control")
	if imageScript then imageScript:EnableUpdate(false) end
	return image
end

local function NewText(parent, name, text, x, y, width, height, size)
	local label = Remember(game.InstantiateClientUIControl(TEXT_TEMPLATE, parent))
	if not label then return nil end
	Configure(label, x, y, width, height, name)
	label.text = text
	label.fontSize = size
	label.fontColor = Color.FromRGB(255, 255, 255)
	label.bgColor = Color.FromRGBA(0, 0, 0, 125)
	label.adaptiveFontSize = false
	label.horizontalAlignment = Enum.TextHorizontalAlignment.Middle
	label.verticalAlignment = Enum.TextVerticalAlignment.Middle
	return label
end

local function SetWorldPosition(control, worldX, worldY)
	control:SetAnchoredPosition(worldX - cameraX, worldY)
end

local function BuildMario()
	local marioRoot = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, worldLayer))
	if not marioRoot then return nil end
	Configure(marioRoot, 0, 0, PLAYER_VISUAL_WIDTH, PLAYER_VISUAL_HEIGHT, "Mario", worldLayer)
	local pixels = {}
	local pixelSize = PLAYER_VISUAL_WIDTH / 8
	for row = 1, 8 do
		for column = 1, 8 do
			local pixel = NewImage(marioRoot, "MarioPixel_" .. tostring(#pixels + 1),
				(column - 0.5) * pixelSize,
				(8.5 - row) * pixelSize,
				pixelSize + 1, pixelSize + 1, marioColors.transparent, RECTANGLE_RESOURCE)
			pixels[#pixels + 1] = pixel
		end
	end
	return { control = marioRoot, pixels = pixels, x = 3.5 * TILE, y = groundY + FLOOR_BUFFER,
		velocityX = 0, velocityY = 0, grounded = true, facing = 1, scaleY = 1 }
end

local function ApplyMarioFrame()
	if not player then return end
	local frame = marioFrames[currentFrame]
	for row = 1, 8 do
		for column = 1, 8 do
			local pixel = player.pixels[(row - 1) * 8 + column]
			local symbol = string.sub(frame[row], column, column)
			pixel.imageColor = marioColors[symbol] or marioColors.transparent
		end
	end
	player.control:SetLocalScale(player.facing, 1, 1)
end

local function AddPlatform(name, x, y, width, height, color)
	local control = NewImage(worldLayer, name, 0, 0, width, height, color, RECTANGLE_RESOURCE)
	if not control then return nil end
	local platform = { control = control, x = x, y = y, width = width, height = height,
		baseY = y, bump = 0 }
	platforms[#platforms + 1] = platform
	SetWorldPosition(control, x, y)
	return platform
end

local function AddQuestionBlock(x, y)
	local block = AddPlatform("QuestionBlock_" .. tostring(#platforms + 1), x, y, TILE, TILE,
		Color.FromRGB(238, 166, 40))
	if block then
		block.question = true
		block.used = false
		block.coin = NewImage(worldLayer, "Coin_" .. tostring(#platforms), x,
			y + TILE * 0.5 + 12, 24, 32, Color.FromRGB(255, 220, 40), CIRCLE_RESOURCE)
		block.coin:SetVisible(false)
		block.coinTimer = 0
		block.coinOffset = 0
		block.coinVelocity = 620
	end
	return block
end

local function AddBrickBlock(x, y)
	return AddPlatform("BrickBlock_" .. tostring(#platforms + 1), x, y, TILE, TILE,
		Color.FromRGB(191, 116, 52))
end

local function AddPipe(name, firstBlockX, heightBlocks)
	local centerX = (firstBlockX + 1) * TILE
	local bodyHeight = heightBlocks * TILE
	AddPlatform(name .. "_Body", centerX, groundY + bodyHeight * 0.5,
		TILE * 2, bodyHeight, Color.FromRGB(36, 151, 76))
	AddPlatform(name .. "_Top", centerX, groundY + bodyHeight + TILE * 0.5,
		TILE * 2, TILE, Color.FromRGB(36, 151, 76))
end

local function AddGoomba(x, y)
	local body = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, worldLayer))
	if not body then return nil end
	Configure(body, 0, 0, 56, 52, "Goomba_" .. tostring(#goombas + 1), worldLayer)
	NewImage(body, "GoombaBody", 28, 26, 56, 48, Color.FromRGB(157, 78, 44), CIRCLE_RESOURCE)
	NewImage(body, "GoombaEyeL", 21, 44, 15, 22, Color.FromRGB(250, 250, 230), CIRCLE_RESOURCE)
	NewImage(body, "GoombaEyeR", 38, 44, 15, 22, Color.FromRGB(250, 250, 230), CIRCLE_RESOURCE)
	NewImage(body, "GoombaPupilL", 25, 49, 7, 12, Color.FromRGB(20, 20, 20), CIRCLE_RESOURCE)
	NewImage(body, "GoombaPupilR", 42, 49, 7, 12, Color.FromRGB(20, 20, 20), CIRCLE_RESOURCE)
	local goomba = { control = body, x = x, y = y, startX = x, startY = y, width = 56, height = 52,
		velocityX = -55, velocityY = 0, grounded = false, active = false,
		alive = true, tween = nil }
	goombas[#goombas + 1] = goomba
	body:SetVisible(false)
	SetWorldPosition(body, x, y + goomba.height * 0.5)
	return goomba
end

local function BuildLevel()
	local groundColor = Color.FromRGB(145, 79, 42)
	local function GridX(blockX)
		return blockX * TILE + TILE * 0.5
	end
	local function GridY(blockY)
		return groundY + (blockY + 0.5) * TILE
	end
	local function GroundBlockY(blockY)
		return groundY + (blockY - 0.5) * TILE
	end
	local function AddGroundSegment(left, right)
		AddPlatform("Ground_" .. tostring(left), (left + right) * 0.5, groundY * 0.5,
			right - left, groundY, groundColor)
	end
	AddGroundSegment(0, 70 * TILE)
	AddQuestionBlock(GridX(17), GridY(4))
	for _, x in ipairs({ 21, 22, 23, 24, 25 }) do
		if x % 2 == 1 then AddBrickBlock(GridX(x), GridY(4))
		else AddQuestionBlock(GridX(x), GridY(4)) end
	end
	AddQuestionBlock(GridX(23), GridY(8))
	AddGoomba(GridX(23), groundY)
	AddPipe("Pipe_29", 29, 2)
	AddPipe("Pipe_39", 39, 3)
	AddGoomba(GridX(41), groundY)
	AddPipe("Pipe_47", 47, 4)
	AddGoomba(GridX(52), groundY)
	AddGoomba(GridX(54), groundY)
	AddPipe("Pipe_58", 58, 4)
	AddGroundSegment(72 * TILE, 82 * TILE)
	for _, x in ipairs({ 79, 80, 81 }) do
		if x == 80 then AddQuestionBlock(GridX(x), GridY(4))
		else AddBrickBlock(GridX(x), GridY(4)) end
	end
	AddGroundSegment(85 * TILE, WORLD_WIDTH)
	for _, x in ipairs({ 82, 83, 84, 85, 86, 87, 88, 89 }) do
		AddBrickBlock(GridX(x), GridY(8))
	end
	AddGoomba(GridX(82), GridY(8) + TILE * 0.5)
	AddGoomba(GridX(84), GridY(8) + TILE * 0.5)
	AddPipe("Pipe_Finish", 98, 2)
	for column = 0, 8 do
		local height = math.min(column + 1, 8)
		for row = 1, height do
			AddBrickBlock(GridX(100 + column), GroundBlockY(row))
		end
	end
	AddPlatform("FlagPole", GridX(117), groundY + TILE * 4.5, 10, TILE * 9,
		Color.FromRGB(230, 230, 205))
	AddPlatform("Flag", GridX(117), groundY + TILE * 9.5, TILE, TILE,
		Color.FromRGB(46, 174, 75))
	for row = 1, 3 do
		for column = 0, 4 do
			if row < 3 or column == 0 or column == 4 then
				AddBrickBlock(GridX(121 + column), GroundBlockY(row))
			end
		end
	end
	for row = 4, 5 do
		for column = 0, 2 do
			AddBrickBlock(GridX(122 + column), GroundBlockY(row))
		end
	end
	AddPlatform("CastleDoor", GridX(123), groundY + TILE, TILE, TILE * 2,
		Color.FromRGB(88, 54, 40))
end

local function HorizontalOverlap(leftA, rightA, leftB, rightB)
	return rightA > leftB and leftA < rightB
end

local function ResolveWorldCollision(previousY)
	local previousBottom = previousY
	local currentBottom = player.y
	local previousTop = previousY + PLAYER_HEIGHT
	local currentTop = player.y + PLAYER_HEIGHT
	player.grounded = false
	for _, platform in ipairs(platforms) do
		local left = player.x - PLAYER_WIDTH * 0.5
		local right = player.x + PLAYER_WIDTH * 0.5
		local platformLeft = platform.x - platform.width * 0.5
		local platformRight = platform.x + platform.width * 0.5
		local platformBottom = platform.y - platform.height * 0.5
		local platformTop = platform.y + platform.height * 0.5
		if HorizontalOverlap(left, right, platformLeft, platformRight) then
			if player.velocityY <= 0 and previousBottom >= platformTop
				and currentBottom <= platformTop + FLOOR_BUFFER then
				player.y = platformTop + FLOOR_BUFFER
				player.velocityY = 0
				player.grounded = true
			elseif player.velocityY > 0 and previousTop <= platformBottom and currentTop >= platformBottom then
				player.y = platformBottom - PLAYER_HEIGHT
				player.velocityY = 0
				if platform.question and not platform.used then
					platform.used = true
					platform.bump = 1
					platform.control.imageColor = Color.FromRGB(128, 128, 128)
					platform.coin:SetVisible(true)
					platform.coinTimer = 0.55
					platform.coinOffset = 0
					platform.coinVelocity = 620
				end
			end
		end
	end
end

local function UpdateGoombas(deltaTime)
	for _, goomba in ipairs(goombas) do
		if goomba.alive then
			local inView = goomba.x >= cameraX - TILE * 2 and goomba.x <= cameraX + screenWidth + TILE * 2
			if inView and not goomba.active then
				goomba.active = true
				goomba.control:SetVisible(true)
			end
			if goomba.active then
				local previousY = goomba.y
				if not goomba.grounded then
					goomba.velocityY = goomba.velocityY + GOOMBA_GRAVITY * deltaTime
					goomba.y = goomba.y + goomba.velocityY * deltaTime
				end
				goomba.grounded = false
				for _, platform in ipairs(platforms) do
					local left = goomba.x - goomba.width * 0.5
					local right = goomba.x + goomba.width * 0.5
					local platformLeft = platform.x - platform.width * 0.5
					local platformRight = platform.x + platform.width * 0.5
					local platformTop = platform.y + platform.height * 0.5
					if HorizontalOverlap(left, right, platformLeft, platformRight)
						and previousY >= platformTop and goomba.y <= platformTop then
						goomba.y = platformTop
						goomba.velocityY = 0
						goomba.grounded = true
					end
				end
				if goomba.grounded then
					local nextX = goomba.x + goomba.velocityX * deltaTime
					for _, platform in ipairs(platforms) do
						if platform.width < WORLD_WIDTH and not platform.isGrass then
							local platformBottom = platform.y - platform.height * 0.5
							local platformTop = platform.y + platform.height * 0.5
							local overlapsHeight = goomba.y < platformTop and goomba.y + goomba.height > platformBottom
							local leftEdge = platform.x - platform.width * 0.5
							local rightEdge = platform.x + platform.width * 0.5
							if overlapsHeight and goomba.velocityX > 0 and goomba.x < platform.x
								and nextX + goomba.width * 0.5 >= leftEdge then
								nextX = leftEdge - goomba.width * 0.5
								goomba.velocityX = -math.abs(goomba.velocityX)
							elseif overlapsHeight and goomba.velocityX < 0 and goomba.x > platform.x
								and nextX - goomba.width * 0.5 <= rightEdge then
								nextX = rightEdge + goomba.width * 0.5
								goomba.velocityX = math.abs(goomba.velocityX)
							end
						end
					end
					goomba.x = nextX
				end
				SetWorldPosition(goomba.control, goomba.x, goomba.y + goomba.height * 0.5)
			end
		end
	end
end

local function SquashGoomba(goomba)
	goomba.alive = false
	goomba.tween = game.Tween(goomba.control, {
		localScaleX = 1.25,
		localScaleY = 0.2
	}, 0.12):SetEase(Enum.EaseType.OutQuad)
	goomba.tween:SetOnComplete(function()
		goomba.control:SetVisible(false)
		goomba.tween = nil
	end)
	goomba.tween:Play()
end

local function CheckGoombaHits(previousY)
	for _, goomba in ipairs(goombas) do
		if goomba.alive and math.abs(player.x - goomba.x) < (PLAYER_WIDTH + goomba.width) * 0.5
			and player.y < goomba.y + goomba.height and player.y + PLAYER_HEIGHT > goomba.y then
			local goombaTop = goomba.y + goomba.height
			local previousBottom = previousY
			local stompOverlap = math.abs(player.x - goomba.x) < (PLAYER_WIDTH + goomba.width) * 0.5 + 10
			local isSafeTopHit = stompOverlap and player.velocityY < 0
				and previousBottom >= goombaTop - 40
				and player.y <= goombaTop + 8
			if isSafeTopHit then
				SquashGoomba(goomba)
				player.y = goomba.y + goomba.height
				player.velocityY = STOMP_BOUNCE_SPEED
			else
						player.x = 3.5 * TILE
						player.y = groundY + FLOOR_BUFFER
				player.velocityX = 0
				player.velocityY = 0
				cameraX = 0
				print("[Platformer] Mario hit a Goomba and respawned")
			end
		end
	end
end

local function UpdateCamera(deltaTime)
	local target = math.max(0, player.x - screenWidth * 0.38)
	cameraX = math.max(0, math.min(WORLD_WIDTH - screenWidth, target))
	SetWorldPosition(player.control, player.x, player.y + PLAYER_VISUAL_HEIGHT * 0.5)
	for _, platform in ipairs(platforms) do
		platform.bump = math.max(0, platform.bump - 7 / 60)
		local y = platform.baseY + platform.bump * 12
		platform.control:SetAnchoredPosition(platform.x - cameraX, y)
		if platform.coin and platform.coinTimer > 0 then
			platform.coinTimer = platform.coinTimer - deltaTime
			platform.coinOffset = platform.coinOffset + platform.coinVelocity * deltaTime
			platform.coinVelocity = platform.coinVelocity - 2400 * deltaTime
			platform.coin:SetAnchoredPosition(platform.x - cameraX,
				platform.y + platform.height * 0.5 + 12 + platform.coinOffset)
			if platform.coinTimer <= 0 then platform.coin:SetVisible(false) end
		end
	end
	for _, goomba in ipairs(goombas) do
		if goomba.control.alive then
			SetWorldPosition(goomba.control, goomba.x, goomba.y + goomba.height * 0.5)
		end
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
			if key == "sprint" then sprintReleaseTimer = SPRINT_RELEASE_BUFFER end
			return true
		end)
	end
	bind(Enum.KeyEventType.KeyboardMoveLeftKeyDown, Enum.KeyEventType.KeyboardMoveLeftKeyUp, "left")
	bind(Enum.KeyEventType.KeyboardMoveRightKeyDown, Enum.KeyEventType.KeyboardMoveRightKeyUp, "right")
	bind(Enum.KeyEventType.KeyboardSprintKeyDown, Enum.KeyEventType.KeyboardSprintKeyUp, "sprint")
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardJumpKeyDown, function()
		if player and player.grounded then
			local sprinting = keys.sprint or sprintReleaseTimer > 0
			player.velocityY = sprinting and SPRINT_JUMP_SPEED or JUMP_SPEED
			player.grounded = false
			jumpHoldTime = 0
			keys.jump = true
		end
		return true
	end)
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardJumpKeyUp, function()
		keys.jump = false
		return true
	end)
end

local function FormatRunTime(seconds)
	return string.format("%06.2f", seconds)
end

local function ResetRun()
	runTimer = 0
	runFinished = false
	finishResetTimer = 0
	finishAnimationTime = 0
	jumpHoldTime = 0
	sprintReleaseTimer = 0
	keys.left = false
	keys.right = false
	keys.jump = false
	keys.sprint = false
	player.x = 3.5 * TILE
	player.y = groundY + FLOOR_BUFFER
	player.velocityX = 0
	player.velocityY = 0
	player.grounded = true
	player.facing = 1
	player.control:SetLocalScale(1, 1, 1)
	for _, platform in ipairs(platforms) do
		if platform.question then
			platform.used = false
			platform.bump = 0
			platform.control.imageColor = Color.FromRGB(238, 166, 40)
			platform.coinTimer = 0
			platform.coinOffset = 0
			platform.coinVelocity = 620
			platform.coin:SetVisible(false)
		end
	end
	for _, goomba in ipairs(goombas) do
		goomba.x = goomba.startX
		goomba.y = goomba.startY
		goomba.velocityX = -55
		goomba.velocityY = 0
		goomba.grounded = false
		goomba.active = false
		goomba.alive = true
		goomba.control:SetLocalScale(1, 1, 1)
		goomba.control:SetVisible(false)
	end
	cameraX = 0
	ApplyMarioFrame()
end

local function FinishRun()
	if runFinished then return end
	runFinished = true
	recordedTime = runTimer
	finishResetTimer = 3
	finishAnimationTime = 0
	player.x = FLAG_X
	player.y = groundY + PLAYER_VISUAL_HEIGHT * 0.5 + TILE * 8
	player.facing = 1
	player.velocityX = 0
	player.velocityY = 0
	keys.left = false
	keys.right = false
	keys.jump = false
	keys.sprint = false
	print("[Platformer] World 1-1 complete: " .. FormatRunTime(recordedTime) .. " seconds")
end

local function UpdateFinishAnimation(deltaTime)
	finishAnimationTime = finishAnimationTime + deltaTime
	if finishAnimationTime <= 0.8 then
		local progress = finishAnimationTime / 0.8
		player.x = FLAG_X
		player.y = groundY + PLAYER_VISUAL_HEIGHT * 0.5 + TILE * 8 * (1 - progress)
	elseif finishAnimationTime <= 2.2 then
		local progress = (finishAnimationTime - 0.8) / 1.4
		player.x = FLAG_X + (CASTLE_X - FLAG_X) * progress
		player.y = groundY + PLAYER_VISUAL_HEIGHT * 0.5
	else
		player.x = CASTLE_X
		player.y = groundY + PLAYER_VISUAL_HEIGHT * 0.5
	end
	player.control:SetLocalScale(1, 1, 1)
	SetWorldPosition(player.control, player.x, player.y)
end

function OnStart()
	if started then return end
	started = true
	root = script.object
	if not root then
		root = game.InstantiateClientUIControl(CONTAINER_TEMPLATE, nil)
	end
	if not root then
		printerr("[Platformer] Could not create root control")
		started = false
		return
	end
	screenWidth, screenHeight = game.GetUICanvasSize()
	root:SetAnchorMin(0, 0)
	root:SetAnchorMax(0, 0)
	root:SetPivot(0, 0)
	root:SetAnchoredPosition(0, 0)
	root:SetSizeDelta(screenWidth, screenHeight)
	root.disableKeyEventPassthrough = true
	worldLayer = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, root))
	worldLayer.name = "MarioWorld"
	worldLayer:SetAnchorMin(0, 0)
	worldLayer:SetAnchorMax(0, 0)
	worldLayer:SetPivot(0, 0)
	worldLayer:SetAnchoredPosition(0, 0)
	worldLayer:SetSizeDelta(screenWidth, screenHeight)
	worldLayer:SetVisible(true)
	BuildLevel()
	player = BuildMario()
	ApplyMarioFrame()
	statusLabel = NewText(root, "HUD", "A / D: run     SPACE: jump     Mario 1-1", screenWidth * 0.5,
		screenHeight - 32, math.min(640, screenWidth - 24), 34, 20)
	RegisterInput()
	runTimer = 0
	recordedTime = nil
	runFinished = false
	script:EnableUpdate(true)
	print("[Platformer] Mario 1-1 instantiated: blocks=" .. tostring(#platforms) .. " goombas=" .. tostring(#goombas))
end

function OnUpdate(deltaTime)
	if not player then return end
	deltaTime = math.min(deltaTime, 0.05)
	if runFinished then
		finishResetTimer = finishResetTimer - deltaTime
		UpdateCamera(deltaTime)
		UpdateFinishAnimation(deltaTime)
		if statusLabel then
			statusLabel.text = "WORLD 1-1 CLEAR!   TIME " .. FormatRunTime(recordedTime)
		end
		if finishResetTimer <= 0 then ResetRun() end
		return
	end
	runTimer = runTimer + deltaTime
	sprintReleaseTimer = math.max(0, sprintReleaseTimer - deltaTime)
	local direction = (keys.right and 1 or 0) - (keys.left and 1 or 0)
	local sprinting = keys.sprint or sprintReleaseTimer > 0
	local speedLimit = sprinting and SPRINT_SPEED or WALK_SPEED
	if direction ~= 0 then
		local acceleration = player.grounded and RUN_ACCELERATION or AIR_ACCELERATION
		if player.velocityX * direction < 0 then
			player.velocityX = player.velocityX + direction * SKID_FRICTION * deltaTime
		else
			player.velocityX = player.velocityX + direction * acceleration * deltaTime
		end
		player.velocityX = math.max(-speedLimit, math.min(speedLimit, player.velocityX))
		player.facing = direction
		player.control:SetLocalScale(player.facing, 1, 1)
	else
		local friction = RUN_FRICTION * deltaTime
		if player.velocityX > 0 then player.velocityX = math.max(0, player.velocityX - friction)
		elseif player.velocityX < 0 then player.velocityX = math.min(0, player.velocityX + friction) end
	end
	local walking = direction ~= 0 and player.grounded and math.abs(player.velocityX) > 20
	if walking then
		frameTimer = frameTimer + deltaTime
		local frameDuration = sprinting and 0.07 or 0.12
		if frameTimer >= frameDuration then
			frameTimer = frameTimer - frameDuration
			currentFrame = currentFrame % #marioFrames + 1
			ApplyMarioFrame()
		end
	elseif currentFrame ~= 1 then
		currentFrame = 1
		frameTimer = 0
		ApplyMarioFrame()
	end
	local wasGrounded = player.grounded
	local previousY = player.y
	if player.grounded then
		player.velocityY = 0
	else
		local verticalGravity = GRAVITY
		if player.velocityY > 0 and keys.jump and jumpHoldTime < MAX_JUMP_HOLD then
			verticalGravity = JUMP_HOLD_GRAVITY
			jumpHoldTime = jumpHoldTime + deltaTime
		end
		player.velocityY = player.velocityY + verticalGravity * deltaTime
	end
	player.x = math.max(PLAYER_WIDTH * 0.5, math.min(WORLD_WIDTH - PLAYER_WIDTH * 0.5, player.x + player.velocityX * deltaTime))
	player.y = player.y + player.velocityY * deltaTime
	if player.y < -220 then
		player.x = 3.5 * TILE
		player.y = groundY + FLOOR_BUFFER
		player.velocityX = 0
		player.velocityY = 0
		cameraX = 0
		print("[Platformer] Mario fell into a pit and respawned")
	end
	ResolveWorldCollision(previousY)
	if player.grounded then jumpHoldTime = 0 end
	CheckGoombaHits(previousY)
	UpdateGoombas(deltaTime)
	UpdateCamera(deltaTime)
	if player.x >= FLAG_X then FinishRun() end
	if statusLabel then
		statusLabel.text = "TIME " .. FormatRunTime(runTimer) .. "   A/D: run   SHIFT: sprint   SPACE: jump"
	end
end

function OnDestroy()
	started = false
	root = nil
	worldLayer = nil
	player = nil
	platforms = {}
	goombas = {}
	controls = {}
end