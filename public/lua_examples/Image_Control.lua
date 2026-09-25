---@meta

-- ========================================================================
-- Miliastra Wonderland - ImageControl & Fill Types Interactive Demo (Patch 7.1)
-- Reference: src/ide/library/client_controls/ImageControl.d.lua
-- Tests: SetImage, SetFillHorizontal, SetFillVertical, SetFillRadial360,
--        imageColor, fillAmount, and live Tween animations.
-- ========================================================================


local image = nil
local bounce = nil
local isBouncing = false
local moveLeftHeld = false
local moveRightHeld = false
local horizontalVelocity = 0

local horizontalAcceleration = 1800
local horizontalFriction = 2200
local maxHorizontalSpeed = 420

function OnStart()
  ---@diagnostic disable-next-line: undefined-global
  image = script.object
  ---@diagnostic disable-next-line: undefined-global
  script:EnableUpdate(true)
  ---@diagnostic disable-next-line: inject-field, undefined-global
  image.imageColor = Color.FromRGB(255, 0, 0)
end

function Bounce()
  if not image or isBouncing then
    return
  end

  isBouncing = true

  local baseY = image.anchoredPositionY
  local baseScaleX = image.localScaleX
  local baseScaleY = image.localScaleY

  ---@diagnostic disable: undefined-global
  bounce = game.TweenSequence()

  bounce:Append(game.Tween(image, {
    anchoredPositionY = baseY + 140,
    localScaleX = baseScaleX * 0.92,
    localScaleY = baseScaleY * 1.08
  }, 0.45):SetEase(Enum.EaseType.OutQuad))

  bounce:Append(game.Tween(image, {
    anchoredPositionY = baseY,
    localScaleX = baseScaleX * 1.15,
    localScaleY = baseScaleY * 0.82
  }, 0.28):SetEase(Enum.EaseType.InQuad))

  bounce:Append(game.Tween(image, {
    localScaleX = baseScaleX,
    localScaleY = baseScaleY
  }, 0.12):SetEase(Enum.EaseType.OutBack))

  bounce:SetOnComplete(function()
    isBouncing = false
    bounce = nil
  end)

  bounce:Play()
  ---@diagnostic enable: undefined-global
end

function SetMoveLeft(held)
  moveLeftHeld = held
end

function SetMoveRight(held)
  moveRightHeld = held
end

function OnUpdate(deltaTime)
  if not image then
    return
  end

  local direction = 0
  if moveLeftHeld then
    direction = direction - 1
  end
  if moveRightHeld then
    direction = direction + 1
  end

  if direction ~= 0 then
    horizontalVelocity = horizontalVelocity + direction * horizontalAcceleration * deltaTime
    horizontalVelocity = math.max(-maxHorizontalSpeed, math.min(maxHorizontalSpeed, horizontalVelocity))
  elseif horizontalVelocity > 0 then
    horizontalVelocity = math.max(0, horizontalVelocity - horizontalFriction * deltaTime)
  elseif horizontalVelocity < 0 then
    horizontalVelocity = math.min(0, horizontalVelocity + horizontalFriction * deltaTime)
  end

  image.anchoredPositionX = image.anchoredPositionX + horizontalVelocity * deltaTime
end