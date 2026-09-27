-- Template IDs:
local IMAGE_TEMPLATE = 1073741850
local CIRCLE_ASSET = 100002

local satellites = {}
local currentAngle = 0

function OnStart()
    local root = script.object

    -- Center Star
    local star = game.InstantiateClientUIControl(IMAGE_TEMPLATE, root)
    star:SetAnchorMin(0.5, 0.5)
    star:SetAnchorMax(0.5, 0.5)
    star:SetPivot(0.5, 0.5)
    star:SetAnchoredPosition(0, 0)
    star:SetSizeDelta(84, 84)
    star:SetImage(Enum.ImageSource.StaticReference, CIRCLE_ASSET)
    star.imageColor = Color(230, 185, 75, 255)

    -- 4 Orbiting Satellites
    for i = 1, 4 do
        local sat = game.InstantiateClientUIControl(IMAGE_TEMPLATE, root)
        sat:SetAnchorMin(0.5, 0.5)
        sat:SetAnchorMax(0.5, 0.5)
        sat:SetPivot(0.5, 0.5)
        sat:SetSizeDelta(32, 32)
        sat:SetImage(Enum.ImageSource.StaticReference, CIRCLE_ASSET)
        sat.imageColor = Color(120 + i * 30, 80 + i * 35, 210, 255)
        table.insert(satellites, sat)
    end

    print("Orbit simulation instantiated with 4 satellites.")
    script:EnableUpdate(true)
end

function OnUpdate(dt)
    currentAngle = currentAngle + dt * 2.5
    local radius = 140
    for i, sat in ipairs(satellites) do
        local offset = currentAngle + (i - 1) * (math.pi * 0.5)
        local px = math.cos(offset) * radius
        local py = math.sin(offset) * radius
        sat:SetAnchoredPosition(px, py)
    end
end
