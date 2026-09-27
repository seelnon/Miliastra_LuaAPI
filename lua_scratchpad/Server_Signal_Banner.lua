-- Template IDs:
local IMAGE_TEMPLATE = 1073741850
local TEXTBOX_TEMPLATE = 1073741849

function OnStart()
    local root = script.object

    -- 1. Instantiate banner card
    local card = game.InstantiateClientUIControl(IMAGE_TEMPLATE, root)
    card:SetAnchorMin(0.5, 0.5)
    card:SetAnchorMax(0.5, 0.5)
    card:SetPivot(0.5, 0.5)
    card:SetAnchoredPosition(0, 0)
    card:SetSizeDelta(420, 90)
    card.imageColor = Color(40, 32, 24, 255)

    -- 2. Banner text
    local txt = game.InstantiateClientUIControl(TEXTBOX_TEMPLATE, card)
    txt:SetAnchorMin(0.5, 0.5)
    txt:SetAnchorMax(0.5, 0.5)
    txt:SetPivot(0.5, 0.5)
    txt:SetAnchoredPosition(0, 0)
    txt:SetSizeDelta(400, 80)
    txt.fontSize = 15
    txt.fontColor = Color(240, 215, 140, 255)
    txt.text = "DISPATCHING SERVER SIGNAL..."

    -- 3. Construct and send signal
    local signal = game.ServerSignal("STAGE_CLEARED")
    signal:AddInt(101)
    signal:AddString("VICTORY")
    signal:AddFloat(99.4)
    signal:SendSignal()

    txt.text = "SIGNAL 'STAGE_CLEARED' DISPATCHED!\n[Int: 101  |  Str: 'VICTORY'  |  Float: 99.4]"
    print("Signal 'STAGE_CLEARED' dispatched successfully.")
end
