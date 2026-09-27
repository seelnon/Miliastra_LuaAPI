-- Template IDs:
local PRESET_BUTTON_TEMPLATE = 1073741851
local TEXTBOX_TEMPLATE = 1073741849

function OnStart()
    local root = script.object

    -- 1. Instantiate button label with background (buttons use TextBox bgColor for visuals)
    local label = game.InstantiateClientUIControl(TEXTBOX_TEMPLATE, root)
    label:SetAnchorMin(0.5, 0.5)
    label:SetAnchorMax(0.5, 0.5)
    label:SetPivot(0.5, 0.5)
    label:SetAnchoredPosition(0, 0)
    label:SetSizeDelta(280, 68)
    label.fontSize = 15
    label.fontColor = Color(238, 217, 171, 255)
    label.bgColor = Color(52, 42, 30, 255)
    label.text = "CLICK ME OR PRESS SPACE"

    -- 2. Instantiate interactive PresetButton over the label
    local btn = game.InstantiateClientUIControl(PRESET_BUTTON_TEMPLATE, root)
    btn.name = "TestButton"
    btn:SetAnchorMin(0.5, 0.5)
    btn:SetAnchorMax(0.5, 0.5)
    btn:SetPivot(0.5, 0.5)
    btn:SetAnchoredPosition(0, 0)
    btn:SetSizeDelta(280, 68)

    local clicks = 0
    local function HandleAction(source)
        clicks = clicks + 1
        label.text = "ACTIVATED x" .. clicks .. " (" .. source .. ")"
        print("[Interaction]", source, "count:", clicks)

        -- Punch label scale
        game.Tween(label, { localScaleX = 1.15, localScaleY = 1.15 }, 0.08)
            :SetEase(Enum.EaseType.OutQuad)
            :SetOnComplete(function()
                game.Tween(label, { localScaleX = 1.0, localScaleY = 1.0 }, 0.15)
                    :SetEase(Enum.EaseType.OutBack)
            end)
    end

    btn:AddCursorEventListener(Enum.CursorEventType.CursorClick, function(eventData)
        HandleAction("Mouse Click")
    end)

    btn:AddKeyEventListener(Enum.KeyEventType.KeyboardJumpKeyDown, function()
        HandleAction("Space Key")
        return true
    end)

    print("Interactive button ready. Click or hit [Space]!")
end
