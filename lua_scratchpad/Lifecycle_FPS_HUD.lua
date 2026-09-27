local TEXTBOX_TEMPLATE = 1073741849
local totalTime = 0
local frameCount = 0
local hud = nil

function OnInit()
    print("[Lifecycle] OnInit executed")
end

function OnEnable()
    print("[Lifecycle] OnEnable executed")
end

function OnStart()
    print("[Lifecycle] OnStart executed. Enabling 60FPS updates.")
    local root = script.object
    
    hud = game.InstantiateClientUIControl(TEXTBOX_TEMPLATE, root)
    hud.name = "LifecycleHUD"
    hud:SetAnchorMin(0.5, 0.5)
    hud:SetAnchorMax(0.5, 0.5)
    hud:SetPivot(0.5, 0.5)
    hud:SetAnchoredPosition(0, 0)
    hud:SetSizeDelta(480, 80)
    hud.fontSize = 17
    hud.fontColor = Color(220, 190, 120, 255)
    hud.text = "Initializing runtime loop..."

    script:EnableUpdate(true)
end

function OnUpdate(deltaTime)
    totalTime = totalTime + deltaTime
    frameCount = frameCount + 1
    if hud then
        local fps = math.floor(1 / math.max(deltaTime, 0.0001))
        hud.text = string.format("FRAME: %d  |  TIME: %.2fs  |  DT: %.4fs  |  %d FPS", frameCount, totalTime, deltaTime, fps)
    end
end

function OnDisable()
    print("[Lifecycle] OnDisable executed")
end

function OnDestroy()
    print("[Lifecycle] OnDestroy executed")
end
