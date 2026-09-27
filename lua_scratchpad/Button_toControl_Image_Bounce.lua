---@meta

local controllerScript = nil

local function BounceImage()
	if controllerScript and controllerScript.alive then
		controllerScript:Invoke("Bounce")
	end
end

local function SetImageMovement(direction, held)
	if controllerScript and controllerScript.alive then
		controllerScript:Invoke(direction, held)
	end
end

local function FindController(control)
	local parent = control.parent

	for depth = 1, 2 do
		if not parent then
			return nil
		end

		for _, child in ipairs(parent:GetChildren()) do
			local candidate = child:GetScriptByPath("Container_with_1pixel")
			if candidate then
				return candidate
			end
		end

		parent = parent.parent
	end

	return nil
end

function OnStart()
	---@diagnostic disable-next-line: undefined-global
	local button = script.object
	controllerScript = FindController(button)

	---@diagnostic disable: undefined-global
	button:AddCursorEventListener(Enum.CursorEventType.CursorClick, function()
		BounceImage()
	end)

	button:AddKeyEventListener(Enum.KeyEventType.KeyboardJumpKeyDown, function()
		BounceImage()
		return true
	end)

	button:AddKeyEventListener(Enum.KeyEventType.KeyboardMoveLeftKeyDown, function()
		SetImageMovement("SetMoveLeft", true)
		return true
	end)

	button:AddKeyEventListener(Enum.KeyEventType.KeyboardMoveRightKeyDown, function()
		SetImageMovement("SetMoveRight", true)
		return true
	end)

	button:AddKeyEventListener(Enum.KeyEventType.KeyboardMoveLeftKeyUp, function()
		SetImageMovement("SetMoveLeft", false)
		return true
	end)

	button:AddKeyEventListener(Enum.KeyEventType.KeyboardMoveRightKeyUp, function()
		SetImageMovement("SetMoveRight", false)
		return true
	end)
	---@diagnostic enable: undefined-global
end
