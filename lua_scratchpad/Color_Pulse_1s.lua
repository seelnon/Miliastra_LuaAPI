-- Template IDs:
local IMAGE_TEMPLATE = 1073741850
local TEXTBOX_TEMPLATE = 1073741849
local CIRCLE_ASSET = 100002

local orb = nil
local label = nil
local timer = 0

local function GetRandomColor()
    local r = math.random(60, 255)
    local g = math.random(60, 255)
    local b = math.random(60, 255)
    return Color.FromRGBA(r, g, b, 255)
end

function OnStart()
    local root = script.object
    local width, height = game.GetUICanvasSize()
    math.randomseed(os.time())

    -- 1. Instantiate glowing color orb
    orb = game.InstantiateClientUIControl(IMAGE_TEMPLATE, root)
    orb.name = "ColorPulseOrb"
    orb:SetAnchorMin(0.5, 0.5)
    orb:SetAnchorMax(0.5, 0.5)
    orb:SetPivot(0.5, 0.5)
    orb:SetAnchoredPosition(0, 40)
    orb:SetSizeDelta(140, 140)
    orb:SetImage(Enum.ImageSource.StaticReference, CIRCLE_ASSET)

    -- 2. Instantiate descriptive text HUD
    label = game.InstantiateClientUIControl(TEXTBOX_TEMPLATE, root)
    label.name = "ColorHUD"
    label:SetAnchorMin(0.5, 0.5)
    label:SetAnchorMax(0.5, 0.5)
    label:SetPivot(0.5, 0.5)
    label:SetAnchoredPosition(0, -70)
    label:SetSizeDelta(460, 50)
    label.fontSize = 17
    label.fontColor = Color.FromRGB(238, 217, 171)

    -- Set initial color using standard Miliastra Color.FromRGB
    local initCol = Color.FromRGB(201, 160, 89)
    orb.imageColor = initCol
    local r, g, b, a = Color.ToRGBA(initCol)
    label.text = string.format("COLOR: RGBA(%d, %d, %d, %d)", r, g, b, a)
    print(string.format("[Init] Color set to RGBA(%d, %d, %d, %d)", r, g, b, a))

    script:EnableUpdate(true)
end

function OnUpdate(deltaTime)
    timer = timer + deltaTime
    if timer >= 1.0 then
        timer = timer - 1.0
        local nextCol = GetRandomColor()
        orb.imageColor = nextCol
        
        local r, g, b, a = Color.ToRGBA(nextCol)
        label.text = string.format("COLOR: RGBA(%d, %d, %d, %d)", r, g, b, a)
        print(string.format("[1s Color Pulse] New Color -> RGBA(%d, %d, %d, %d)", r, g, b, a))

        -- Punch scale on color shift
        game.Tween(orb, { localScaleX = 1.15, localScaleY = 1.15 }, 0.1)
            :SetEase(Enum.EaseType.OutQuad)
            :SetOnComplete(function()
                game.Tween(orb, { localScaleX = 1.0, localScaleY = 1.0 }, 0.2)
                    :SetEase(Enum.EaseType.OutBack)
            end)
    end
end
