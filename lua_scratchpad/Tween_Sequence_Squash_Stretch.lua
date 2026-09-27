-- Template IDs:
local IMAGE_TEMPLATE = 1073741850
local CIRCLE_ASSET = 100002

function OnStart()
    local root = script.object
    local width, height = game.GetUICanvasSize()

    -- 1. Instantiate test ImageControl at viewport center
    local image = game.InstantiateClientUIControl(IMAGE_TEMPLATE, root)
    image.name = "BouncingOrb"
    image:SetAnchorMin(0.5, 0.5)
    image:SetAnchorMax(0.5, 0.5)
    image:SetPivot(0.5, 0.5)
    image:SetAnchoredPosition(0, -50)
    image:SetSizeDelta(120, 120)
    image:SetImage(Enum.ImageSource.StaticReference, CIRCLE_ASSET)
    image.imageColor = Color(220, 180, 85, 255)

    print("Instantiated", image.name, "ID:", image.id)

    -- 2. Build continuous squash-and-stretch bounce sequence
    local seq = game.TweenSequence()
    seq:Append(game.Tween(image, {
        anchoredPositionY = 150,
        localScaleX = 0.85,
        localScaleY = 1.25
    }, 0.45):SetEase(Enum.EaseType.OutQuad))

    seq:Append(game.Tween(image, {
        anchoredPositionY = -50,
        localScaleX = 1.35,
        localScaleY = 0.65
    }, 0.35):SetEase(Enum.EaseType.InQuad))

    seq:Append(game.Tween(image, {
        localScaleX = 1.0,
        localScaleY = 1.0
    }, 0.18):SetEase(Enum.EaseType.OutBack))

    seq:SetLoops(-1) -- Repeat infinitely
    seq:Play()
    print("Bounce sequence playing at 60 FPS.")
end
