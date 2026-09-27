// ============================================================================
// MILIASTRA INTERFACE LAYOUT & MULTI-SCRIPT PROJECT EDITOR (TAB 5)
// Clean 3-Column Layout:
//   • Top Bar: Project Dropdown Menu + [ ▶ SIMULATE PROJECT (60 FPS) ] (pop-out modal)
//   • Left Panel: Search Filter (with SVG icon), [+ Add UIControl] Bar, and
//                 Drag-and-Drop Reparentable Nested Hierarchy Tree with script badges
//   • Center Panel: Interactive Static Stage where UIControls can be dragged &
//                   positioned directly on the 960x640 stage (or Live Editable .lua View)
//   • Right Panel: Clean Selected Node Header (Renameable Name, Index, id, ClassName:handle) +
//                  Mounted .lua Script Card (or Attach Script to Node if none)
// ============================================================================

import { grabScratchpadFile } from './scratchpad.js';
import { copyToClipboard, showToast } from './ui-components.js';
import { openLuaRunnerModal } from './lua-runner-modal.js';

export function destroyInlineProjectSimulator() {
  // Simulation always opens in the pop-out modal by default
}

const SEARCH_SVG_ICON = `<svg viewBox="0 -2 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

const UI_CONTROL_PRESET_TYPES = [
  {
    typeKey: 'BaseControl',
    label: '+ ClientUIBaseControl',
    icon: '◇',
    baseName: 'BaseControl',
    className: 'ClientUIBaseControl',
    prefabIndex: 1073741848,
    width: 140,
    height: 44,
    bgColor: { r: 46, g: 40, b: 33, a: 180 },
    raycastTarget: false
  },
  {
    typeKey: 'ImageControl',
    label: '+ ClientUIImageControl',
    icon: '▣',
    baseName: 'ImageControl',
    className: 'ClientUIImageControl',
    prefabIndex: 1073741850,
    width: 140,
    height: 44,
    imageColor: { r: 218, g: 175, b: 78, a: 255 },
    raycastTarget: false
  },
  {
    typeKey: 'TextBoxControl',
    label: '+ ClientUITextBoxControl',
    icon: 'T',
    baseName: 'TextBoxControl',
    className: 'ClientUITextBoxControl',
    prefabIndex: 1073741849,
    width: 220,
    height: 40,
    bgColor: { r: 38, g: 32, b: 26, a: 235 },
    text: 'New TextBox',
    fontSize: 13,
    fontColor: { r: 238, g: 217, b: 171, a: 255 },
    raycastTarget: false
  },
  {
    typeKey: 'TextWindowControl',
    label: '+ ClientUITextWindowControl',
    icon: '▤',
    baseName: 'TextWindowControl',
    className: 'ClientUITextWindowControl',
    prefabIndex: 1073741854,
    width: 240,
    height: 90,
    bgColor: { r: 32, g: 27, b: 22, a: 235 },
    text: 'Scrollable TextWindow',
    fontSize: 12,
    fontColor: { r: 220, g: 205, b: 175, a: 255 },
    raycastTarget: true
  },
  {
    typeKey: 'PresetButton',
    label: '+ ClientUIPresetButtonControl',
    icon: 'Btn',
    baseName: 'PresetButton',
    className: 'ClientUIPresetButtonControl',
    prefabIndex: 1073741851,
    width: 156,
    height: 44,
    bgColor: { r: 58, g: 48, b: 36, a: 245 },
    text: 'New Button',
    fontSize: 14,
    fontColor: { r: 245, g: 238, b: 220, a: 255 },
    raycastTarget: true,
    interactable: true
  },
  {
    typeKey: 'GridScrollerControl',
    label: '+ ClientUIGridScrollerControl',
    icon: '⊞',
    baseName: 'GridScrollerControl',
    className: 'ClientUIGridScrollerControl',
    prefabIndex: 1073741855,
    width: 220,
    height: 110,
    bgColor: { r: 36, g: 30, b: 24, a: 210 },
    text: 'GridScroller [⊞]',
    fontSize: 12,
    fontColor: { r: 196, g: 160, b: 89, a: 255 },
    raycastTarget: true
  },
  {
    typeKey: 'ContainerControl',
    label: '+ ClientUIContainerControl',
    icon: '□',
    baseName: 'ContainerControl',
    className: 'ClientUIContainerControl',
    prefabIndex: 1073741852,
    width: 200,
    height: 80,
    bgColor: { r: 46, g: 38, b: 30, a: 120 },
    raycastTarget: false
  },
  {
    typeKey: 'CursorEventArea',
    label: '+ ClientUICursorEventAreaControl',
    icon: '⌖',
    baseName: 'CursorEventArea',
    className: 'ClientUICursorEventAreaControl',
    prefabIndex: 1073741856,
    width: 160,
    height: 60,
    bgColor: { r: 75, g: 60, b: 38, a: 140 },
    raycastTarget: true,
    interactable: true
  },
  {
    typeKey: 'AnimationControl',
    label: '+ ClientUIAnimationControl',
    icon: '▶',
    baseName: 'AnimationControl',
    className: 'ClientUIAnimationControl',
    prefabIndex: 1073741857,
    width: 150,
    height: 54,
    bgColor: { r: 64, g: 44, b: 36, a: 210 },
    text: '▶ Animation',
    fontSize: 12,
    fontColor: { r: 238, g: 217, b: 171, a: 255 },
    raycastTarget: false
  },
  {
    typeKey: 'FullscreenAnimationControl',
    label: '+ ClientUIFullscreenAnimationControl',
    icon: '⛶',
    baseName: 'FullscreenAnimationControl',
    className: 'ClientUIFullscreenAnimationControl',
    prefabIndex: 1073741860,
    width: 260,
    height: 64,
    bgColor: { r: 52, g: 36, b: 48, a: 200 },
    text: '⛶ FullscreenAnim',
    fontSize: 12,
    fontColor: { r: 238, g: 217, b: 171, a: 255 },
    raycastTarget: false
  },
  {
    typeKey: 'KeyHintControl',
    label: '+ ClientUIKeyHintControl',
    icon: '1',
    baseName: 'KeyHintControl',
    className: 'ClientUIKeyHintControl',
    prefabIndex: 1073741858,
    width: 36,
    height: 28,
    bgColor: { r: 245, g: 245, b: 245, a: 255 },
    text: 'E',
    fontSize: 13,
    fontColor: { r: 24, g: 20, b: 16, a: 255 },
    raycastTarget: false
  },
  {
    typeKey: 'ReferenceControl',
    label: '+ ClientUIReferenceControl',
    icon: '🔗',
    baseName: 'ReferenceControl',
    className: 'ClientUIReferenceControl',
    prefabIndex: 1073741859,
    referencedPrefabIndex: 1073741850,
    width: 150,
    height: 40,
    bgColor: { r: 42, g: 52, b: 58, a: 200 },
    text: '🔗 Reference',
    fontSize: 12,
    fontColor: { r: 175, g: 220, b: 238, a: 255 },
    raycastTarget: false
  }
];

const DEFAULT_BUTTON_LUA = `---@meta

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
    local button = script.object
    controllerScript = FindController(button)

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
end`;

const DEFAULT_IMAGE_LUA = `---@meta

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
    image = script.object
    script:EnableUpdate(true)
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
end`;

const PROJECT_2_HUD_CONTROLLER_LUA = `---@meta
-- Script 1: Mounted on 'CastSkillButton' (ClientUIPresetButtonControl)
-- Finds sibling 'CooldownOrb', 'TogglePauseButton', and 'PauseBanner'

local cooldownScript = nil
local pauseBannerCtrl = nil
local togglePauseBtn = nil
local isBannerActive = true

local function TogglePauseBannerState()
    if not pauseBannerCtrl then return end
    isBannerActive = not isBannerActive
    pauseBannerCtrl:SetActive(isBannerActive)
    if togglePauseBtn then
        togglePauseBtn.text = isBannerActive
            and "[ TOGGLE SetActive(false) (CLICK / F) ]"
            or "[ TOGGLE SetActive(true) (CLICK / F) ]"
    end
    print("[HUDController] Called PauseBanner:SetActive(" .. tostring(isBannerActive) .. ")")
end

function OnStart()
    local btn = script.object
    local rootContainer = btn.parent

    local orbCtrl = rootContainer:FindChild("CooldownOrb")
    if orbCtrl then
        local attached = orbCtrl:GetScripts()
        cooldownScript = attached[1] or orbCtrl:GetScriptByPath("SkillCooldownOrb")
    end

    pauseBannerCtrl = rootContainer:GetChild("PauseBanner")
    togglePauseBtn = rootContainer:GetChild("TogglePauseButton")

    btn:AddCursorEventListener(Enum.CursorEventType.CursorClick, function()
        if cooldownScript and cooldownScript.alive then
            cooldownScript:Invoke("TriggerSkillPulse")
        end
    end)

    btn:AddKeyEventListener(Enum.KeyEventType.KeyboardJumpKeyDown, function()
        if cooldownScript and cooldownScript.alive then
            cooldownScript:Invoke("TriggerSkillPulse")
        end
        return true
    end)

    if togglePauseBtn then
        togglePauseBtn:AddCursorEventListener(Enum.CursorEventType.CursorClick, function()
            TogglePauseBannerState()
        end)
    end

    btn:AddKeyEventListener(Enum.KeyEventType.KeyboardInteractKeyDown, function()
        TogglePauseBannerState()
        return true
    end)
end`;

const PROJECT_2_ORB_SCRIPT_LUA = `---@meta
-- Script 2: Mounted on 'CooldownOrb' (ClientUIImageControl)
-- Exposes global TriggerSkillPulse() callable via :Invoke("TriggerSkillPulse")

local orb = nil
local pulseCount = 0
local spinSpeed = 45

function OnStart()
    orb = script.object
    orb:SetImage(Enum.ImageSource.StaticReference, 100005) -- 5-Point Star
    orb.imageColor = Color.FromRGB(218, 175, 78)
    script:EnableUpdate(true)
end

function TriggerSkillPulse()
    if not orb then return end
    pulseCount = pulseCount + 1
    spinSpeed = 320
    print("[SkillCooldownOrb] Invoked TriggerSkillPulse() #" .. tostring(pulseCount) .. " on " .. tostring(orb))

    if pulseCount % 2 == 1 then
        orb.imageColor = Color.FromRGB(255, 110, 64)
    else
        orb.imageColor = Color.FromRGB(218, 175, 78)
    end

    local seq = game.TweenSequence()
    seq:Append(game.Tween(orb, { localScaleX = 1.55, localScaleY = 1.55 }, 0.16):SetEase(Enum.EaseType.OutQuad))
    seq:Append(game.Tween(orb, { localScaleX = 1.0, localScaleY = 1.0 }, 0.28):SetEase(Enum.EaseType.OutBack))
    seq:SetOnComplete(function()
        spinSpeed = 45
    end)
    seq:Play()
end

function OnUpdate(dt)
    if orb then
        orb.localRotationZ = (orb.localRotationZ + spinSpeed * dt) % 360
    end
end`;

const PROJECT_2_PAUSE_BANNER_LUA = `---@meta
-- Script 3: Mounted on 'PauseBanner' (ClientUITextBoxControl)
-- Demonstrates how control:SetActive(true/false) triggers OnEnable() and OnDisable()

local banner = nil
local toggleCount = 0

function OnInit()
    banner = script.object
end

function OnEnable()
    if banner then
        toggleCount = toggleCount + 1
        banner.text = "◈ BANNER ACTIVE (OnEnable Fired #" .. tostring(toggleCount) .. " via SetActive(true)) ◈"
        banner.bgColor = Color.FromRGBA(46, 68, 42, 235)
        banner.fontColor = Color.FromRGB(238, 217, 171)
        print("[PauseBanner] OnEnable() fired! Control & script are ACTIVE.")
    end
end

function OnDisable()
    if banner then
        banner.text = "◇ BANNER SUSPENDED (OnDisable Fired via SetActive(false)) ◇"
        banner.bgColor = Color.FromRGBA(72, 32, 28, 235)
        banner.fontColor = Color.FromRGB(210, 150, 140)
        print("[PauseBanner] OnDisable() fired! Control & script updates suspended.")
    end
end

function OnStart()
    if banner then
        banner.text = "◈ BANNER ACTIVE — Click Buttons Below or Press [SPACE] / [F] ◈"
    end
end`;

export const SCENE_PROJECTS = [
  {
    id: 'red_bar_bounce_project',
    shortLabel: 'Project 1: Red Bar Bounce & Move (2 Scripts)',
    title: 'Project 1: Red Bar Bounce & Move (Nested Hierarchy & Cross-Script Invoke)',
    rootName: 'ContainerControl',
    rootId: 1,
    rootPrefabIndex: 1073741846,
    nodes: [
      {
        key: 'root',
        parentKey: null,
        id: 1,
        userdataHandle: 1,
        depth: 0,
        icon: '□',
        name: 'ContainerControl',
        className: 'ClientUIContainerControl',
        prefabIndex: 1073741846,
        uiPath: 'ContainerControl',
        script: null
      },
      {
        key: 'PresetButton',
        parentKey: 'root',
        id: 2,
        userdataHandle: 42,
        depth: 1,
        icon: 'Btn',
        name: 'PresetButton',
        className: 'ClientUIPresetButtonControl',
        prefabIndex: 1073741851,
        uiPath: 'PresetButton',
        x: -220,
        y: 110,
        width: 148,
        height: 44,
        raycastTarget: true,
        interactable: true,
        bgColor: { r: 58, g: 48, b: 36, a: 245 },
        text: 'Press it!',
        fontSize: 15,
        fontColor: { r: 245, g: 238, b: 220, a: 255 },
        script: {
          id: 1,
          filename: 'Button_toControl_Image_Bounce.lua',
          path: 'Button_toControl_Image_Bounce',
          fileRef: 'lua_scratchpad/Button_toControl_Image_Bounce.lua',
          prefabIndex: 1073741861,
          aliases: ['Button_toControl_Image_Bounce'],
          code: DEFAULT_BUTTON_LUA
        }
      },
      {
        key: 'PresetButton_ImageControl',
        parentKey: 'PresetButton',
        id: 6,
        userdataHandle: 61,
        depth: 2,
        icon: '▣',
        name: 'ImageControl',
        className: 'ClientUIImageControl',
        prefabIndex: 1073741850,
        uiPath: 'PresetButton/ImageControl',
        x: 0,
        y: 0,
        width: 148,
        height: 44,
        visible: true,
        raycastTarget: false,
        script: null
      },
      {
        key: 'PresetButton_SubContainer',
        parentKey: 'PresetButton',
        id: 7,
        userdataHandle: 68,
        depth: 2,
        icon: '□',
        name: 'ContainerControl',
        className: 'ClientUIContainerControl',
        prefabIndex: 1073741852,
        uiPath: 'PresetButton/ContainerControl',
        x: 0,
        y: 0,
        width: 148,
        height: 44,
        visible: true,
        raycastTarget: false,
        script: null
      },
      {
        key: 'Container_with_1Pixel',
        parentKey: 'root',
        id: 4,
        userdataHandle: 75,
        depth: 1,
        icon: '□',
        name: 'Container_with_1Pixel',
        className: 'ClientUIImageControl',
        prefabIndex: 1073741853,
        uiPath: 'Container_with_1Pixel',
        x: 0,
        y: -20,
        width: 190,
        height: 40,
        enableSoftEdge: true,
        softEdgeWidthX: 10,
        softEdgeWidthY: 10,
        imageColor: { r: 255, g: 0, b: 0, a: 255 },
        script: {
          id: 2,
          filename: 'Image_Control.lua',
          path: 'Container_with_1pixel',
          fileRef: 'lua_scratchpad/Image_Control.lua',
          prefabIndex: 1073741862,
          aliases: ['Container_with_1pixel', 'Image_Control', 'Container_with_1Pixel'],
          code: DEFAULT_IMAGE_LUA
        }
      },
      {
        key: 'Container_1Pixel_InnerImage',
        parentKey: 'Container_with_1Pixel',
        id: 8,
        userdataHandle: 78,
        depth: 2,
        icon: '▣',
        name: 'ImageControl',
        className: 'ClientUIImageControl',
        prefabIndex: 1073741850,
        uiPath: 'Container_with_1Pixel/ImageControl',
        x: 0,
        y: 0,
        width: 190,
        height: 40,
        visible: true,
        raycastTarget: false,
        script: null
      },
      {
        key: 'KeyHintControl',
        parentKey: 'root',
        id: 5,
        userdataHandle: 89,
        depth: 1,
        icon: '1',
        name: 'KeyHintControl',
        className: 'ClientUIKeyHintControl',
        prefabIndex: 1073741858,
        uiPath: 'KeyHintControl',
        x: 260,
        y: 160,
        width: 32,
        height: 26,
        bgColor: { r: 245, g: 245, b: 245, a: 255 },
        text: '1',
        fontSize: 13,
        fontColor: { r: 24, g: 20, b: 16, a: 255 },
        script: null
      },
      {
        key: 'ReferenceControl',
        parentKey: 'root',
        id: 3,
        userdataHandle: 58,
        depth: 1,
        icon: '🔗',
        name: 'ReferenceControl',
        className: 'ClientUIReferenceControl',
        prefabIndex: 1073741859,
        referencedPrefabIndex: 1073741850,
        uiPath: 'ReferenceControl',
        x: 0,
        y: -150,
        width: 140,
        height: 36,
        visible: true,
        raycastTarget: false,
        script: null
      }
    ]
  },
  {
    id: 'rpg_hud_multi_script',
    shortLabel: 'Project 2: Skill Cooldown & SetActive() (3 Scripts)',
    title: 'Project 2: 3-Script Skill Cooldown & SetActive() Lifecycle Controller',
    rootName: 'HUDRootContainer',
    rootId: 1,
    rootPrefabIndex: 1073741852,
    nodes: [
      {
        key: 'root',
        parentKey: null,
        id: 1,
        userdataHandle: 1,
        depth: 0,
        icon: '□',
        name: 'HUDRootContainer',
        className: 'ClientUIContainerControl',
        prefabIndex: 1073741852,
        uiPath: 'HUDRootContainer',
        script: null
      },
      {
        key: 'CastSkillButton',
        parentKey: 'root',
        id: 2,
        userdataHandle: 31,
        depth: 1,
        icon: 'Btn',
        name: 'CastSkillButton',
        className: 'ClientUIPresetButtonControl',
        prefabIndex: 1073741851,
        uiPath: 'CastSkillButton',
        x: -175,
        y: -140,
        width: 300,
        height: 46,
        raycastTarget: true,
        interactable: true,
        bgColor: { r: 58, g: 46, b: 32, a: 245 },
        text: '[ CAST SKILL (CLICK / SPACE) ]',
        fontSize: 13,
        fontColor: { r: 238, g: 217, b: 171, a: 255 },
        script: {
          id: 1,
          filename: 'HUDInputController.lua',
          path: 'HUDInputController',
          prefabIndex: 1073741871,
          aliases: ['HUDInputController'],
          code: PROJECT_2_HUD_CONTROLLER_LUA
        }
      },
      {
        key: 'CastSkill_BgText',
        parentKey: 'CastSkillButton',
        id: 6,
        userdataHandle: 35,
        depth: 2,
        icon: 'T',
        name: 'ButtonLabelTextBox',
        className: 'ClientUITextBoxControl',
        prefabIndex: 1073741849,
        uiPath: 'CastSkillButton/ButtonLabelTextBox',
        x: 0,
        y: 0,
        width: 300,
        height: 46,
        visible: true,
        raycastTarget: false,
        script: null
      },
      {
        key: 'TogglePauseButton',
        parentKey: 'root',
        id: 5,
        userdataHandle: 44,
        depth: 1,
        icon: 'Btn',
        name: 'TogglePauseButton',
        className: 'ClientUIPresetButtonControl',
        prefabIndex: 1073741851,
        uiPath: 'TogglePauseButton',
        x: 175,
        y: -140,
        width: 320,
        height: 46,
        raycastTarget: true,
        interactable: true,
        bgColor: { r: 46, g: 38, b: 32, a: 245 },
        text: '[ TOGGLE SetActive(false) (CLICK / F) ]',
        fontSize: 13,
        fontColor: { r: 210, g: 190, b: 150, a: 255 },
        script: null
      },
      {
        key: 'CooldownOrb',
        parentKey: 'root',
        id: 3,
        userdataHandle: 54,
        depth: 1,
        icon: '✪',
        name: 'CooldownOrb',
        className: 'ClientUIImageControl',
        prefabIndex: 1073741850,
        uiPath: 'CooldownOrb',
        x: 0,
        y: 10,
        width: 115,
        height: 115,
        imageColor: { r: 218, g: 175, b: 78, a: 255 },
        script: {
          id: 2,
          filename: 'SkillCooldownOrb.lua',
          path: 'SkillCooldownOrb',
          prefabIndex: 1073741872,
          aliases: ['SkillCooldownOrb'],
          code: PROJECT_2_ORB_SCRIPT_LUA
        }
      },
      {
        key: 'CooldownOrb_InnerRing',
        parentKey: 'CooldownOrb',
        id: 7,
        userdataHandle: 59,
        depth: 2,
        icon: '▣',
        name: 'ImageControl',
        className: 'ClientUIImageControl',
        prefabIndex: 1073741850,
        uiPath: 'CooldownOrb/ImageControl',
        x: 0,
        y: 0,
        width: 72,
        height: 72,
        visible: true,
        raycastTarget: false,
        script: null
      },
      {
        key: 'PauseBanner',
        parentKey: 'root',
        id: 4,
        userdataHandle: 82,
        depth: 1,
        icon: 'T',
        name: 'PauseBanner',
        className: 'ClientUITextBoxControl',
        prefabIndex: 1073741849,
        uiPath: 'PauseBanner',
        x: 0,
        y: 165,
        width: 680,
        height: 46,
        bgColor: { r: 46, g: 68, b: 42, a: 235 },
        text: '◈ BANNER ACTIVE — Click Buttons Below or Press [SPACE] / [F] ◈',
        fontSize: 13,
        fontColor: { r: 238, g: 217, b: 171, a: 255 },
        script: {
          id: 3,
          filename: 'PauseBannerLifecycle.lua',
          path: 'PauseBannerLifecycle',
          prefabIndex: 1073741873,
          aliases: ['PauseBannerLifecycle'],
          code: PROJECT_2_PAUSE_BANNER_LUA
        }
      }
    ]
  }
];

// Normalize tree order (DFS pre-order) and recalculate depth & uiPath after drag-and-drop or add/rename
function normalizeProjectHierarchy(project) {
  const nodesByKey = new Map(project.nodes.map(n => [n.key, n]));
  const childrenByParent = new Map();

  for (const n of project.nodes) {
    const pKey = n.parentKey || null;
    if (!childrenByParent.has(pKey)) {
      childrenByParent.set(pKey, []);
    }
    childrenByParent.get(pKey).push(n);
  }

  const ordered = [];
  const visited = new Set();

  const dfs = (node, depth, parentPath) => {
    if (!node || visited.has(node.key)) return;
    visited.add(node.key);
    node.depth = depth;
    node.uiPath = depth === 0 ? node.name : (parentPath ? `${parentPath}/${node.name}` : node.name);
    ordered.push(node);

    const kids = childrenByParent.get(node.key) || [];
    for (const child of kids) {
      dfs(child, depth + 1, depth === 0 ? '' : node.uiPath);
    }
  };

  const rootNode = nodesByKey.get('root') || project.nodes[0];
  if (rootNode) {
    dfs(rootNode, 0, '');
  }
  // Append any orphaned nodes under root
  for (const n of project.nodes) {
    if (!visited.has(n.key)) {
      n.parentKey = 'root';
      dfs(n, 1, '');
    }
  }

  project.nodes = ordered;
}

// Check if targetKey is a descendant of sourceKey (to prevent circular drag-and-drop)
function isDescendantOf(project, targetKey, sourceKey) {
  if (targetKey === sourceKey) return true;
  let curr = project.nodes.find(n => n.key === targetKey);
  while (curr && curr.parentKey) {
    if (curr.parentKey === sourceKey) return true;
    curr = project.nodes.find(n => n.key === curr.parentKey);
  }
  return false;
}

// Build a hierarchy-aware, class-specific starter .lua script when user attaches a new script to any of the 12 control types
function createStarterLuaForNode(project, node) {
  const parentNode = node.parentKey ? project.nodes.find(n => n.key === node.parentKey) : null;
  const childNodes = project.nodes.filter(n => n.parentKey === node.key);
  const childLookupLine = childNodes.length > 0
    ? `    local firstChild = selfCtrl:GetChild("${childNodes[0].name}")\n`
    : '';

  if (node.depth === 0) {
    return `---@meta
-- Mounted on Root: ${node.name} (${node.className}:${node.userdataHandle}, id:${node.id})
-- Acts as the main orchestrator (like main.js / app.js) overlooking child controls

local root = nil

function OnStart()
    root = script.object
    root.showCursor = true
    print("[${node.name}] Root orchestrator started! Children count: " .. tostring(#root:GetChildren()))
end
`;
  }

  switch (node.className) {
    case 'ClientUIPresetButtonControl':
      return `---@meta
-- Mounted on PresetButton: ${node.uiPath} (${node.className}:${node.userdataHandle}, id:${node.id})
-- Note: Buttons do not have background color fields; style backgrounds via a child TextBoxControl (bgColor) or ImageControl.

local button = nil
local parentCtrl = nil

function OnStart()
    button = script.object
    parentCtrl = button.parent
    button.interactable = true
    button.raycastTarget = true
${childLookupLine}
    button:AddCursorEventListener(Enum.CursorEventType.CursorClick, function()
        print("[${node.name}] Button clicked! (id=" .. tostring(button.id) .. ")")
    end)
end
`;

    case 'ClientUICursorEventAreaControl':
      return `---@meta
-- Mounted on CursorEventArea: ${node.uiPath} (${node.className}:${node.userdataHandle}, id:${node.id})

local area = nil

function OnStart()
    area = script.object
    area.raycastTarget = true

    area:AddCursorEventListener(Enum.CursorEventType.CursorClick, function(eventData)
        print("[${node.name}] CursorEventArea clicked!")
    end)

    area:AddCursorEventListener(Enum.CursorEventType.CursorEnter, function()
        print("[${node.name}] Cursor entered area")
    end)
end
`;

    case 'ClientUIImageControl':
      return `---@meta
-- Mounted on ImageControl: ${node.uiPath} (${node.className}:${node.userdataHandle}, id:${node.id})
-- Parent control: ${parentNode ? parentNode.name : project.rootName}

local selfCtrl = nil
local elapsed = 0

function OnStart()
    selfCtrl = script.object
    selfCtrl.imageColor = Color.FromRGBA(218, 175, 78, 235)
    script:EnableUpdate(true)
    print("[${node.uiPath}] ImageControl script started on " .. tostring(selfCtrl))
end

function OnUpdate(dt)
    if not selfCtrl then return end
    elapsed = elapsed + dt
    local pulse = 1.0 + math.sin(elapsed * 4.0) * 0.06
    selfCtrl.localScaleX = pulse
    selfCtrl.localScaleY = pulse
end
`;

    case 'ClientUITextBoxControl':
      return `---@meta
-- Mounted on TextBoxControl: ${node.uiPath} (${node.className}:${node.userdataHandle}, id:${node.id})
-- TextBoxControl supports text, fontSize, fontColor, and bgColor (useful for button backgrounds).

local textBox = nil

function OnStart()
    textBox = script.object
    textBox.text = "${node.name} Active"
    textBox.fontColor = Color.FromRGBA(238, 217, 171, 255)
    textBox.bgColor = Color.FromRGBA(38, 32, 26, 235)
    print("[${node.uiPath}] TextBoxControl updated: " .. tostring(textBox.text))
end
`;

    case 'ClientUITextWindowControl':
      return `---@meta
-- Mounted on TextWindowControl: ${node.uiPath} (${node.className}:${node.userdataHandle}, id:${node.id})

local textWindow = nil

function OnStart()
    textWindow = script.object
    textWindow.interactable = true
    textWindow.showScrollBar = true
    textWindow.bgColor = Color.FromRGBA(32, 27, 22, 235)
    textWindow.text = "[${node.name}]\\nScrollable multi-line text window ready."
    print("[${node.uiPath}] TextWindowControl initialized")
end
`;

    case 'ClientUIGridScrollerControl':
      return `---@meta
-- Mounted on GridScrollerControl: ${node.uiPath} (${node.className}:${node.userdataHandle}, id:${node.id})

local grid = nil

function OnStart()
    grid = script.object
    grid.interactable = true
    grid.showScrollBar = true
    grid:RefreshItems(4, function(itemControl, index)
        print("[${node.name}] Instantiated grid item #" .. tostring(index) .. " -> " .. tostring(itemControl))
    end)
end
`;

    case 'ClientUIContainerControl':
      return `---@meta
-- Mounted on ContainerControl: ${node.uiPath} (${node.className}:${node.userdataHandle}, id:${node.id})

local container = nil

function OnStart()
    container = script.object
    container.showCursor = true
${childLookupLine}    print("[${node.uiPath}] ContainerControl started with " .. tostring(#container:GetChildren()) .. " children")
end
`;

    case 'ClientUIAnimationControl':
      return `---@meta
-- Mounted on AnimationControl: ${node.uiPath} (${node.className}:${node.userdataHandle}, id:${node.id})

local anim = nil

function OnStart()
    anim = script.object
    anim.playSoundEffect = true
    anim:PlayAnimation()
    print("[${node.uiPath}] AnimationControl playing animationId=" .. tostring(anim.animationId))
end
`;

    case 'ClientUIFullscreenAnimationControl':
      return `---@meta
-- Mounted on FullscreenAnimationControl: ${node.uiPath} (${node.className}:${node.userdataHandle}, id:${node.id})

local fullAnim = nil

function OnStart()
    fullAnim = script.object
    fullAnim.playSoundEffect = true
    print("[${node.uiPath}] FullscreenAnimationControl active (animationId=" .. tostring(fullAnim.animationId) .. ")")
end
`;

    case 'ClientUIKeyHintControl':
      return `---@meta
-- Mounted on KeyHintControl: ${node.uiPath} (${node.className}:${node.userdataHandle}, id:${node.id})

local keyHint = nil

function OnStart()
    keyHint = script.object
    print("[${node.uiPath}] KeyHintControl active on device: " .. tostring(game.GetDevice()))
end
`;

    case 'ClientUIReferenceControl':
      return `---@meta
-- Mounted on ReferenceControl: ${node.uiPath} (${node.className}:${node.userdataHandle}, id:${node.id})

local refCtrl = nil

function OnStart()
    refCtrl = script.object
    print("[${node.uiPath}] ReferenceControl template index: " .. tostring(refCtrl.referencedPrefabIndex))
end
`;

    default:
      return `---@meta
-- Mounted on BaseControl: ${node.uiPath} (${node.className}:${node.userdataHandle}, id:${node.id})

local selfCtrl = nil
local parentCtrl = nil

function OnStart()
    selfCtrl = script.object
    parentCtrl = selfCtrl.parent
${childLookupLine}    print("[${node.uiPath}] BaseControl script started on " .. tostring(selfCtrl) .. " (id=" .. tostring(selfCtrl.id) .. ")")
end
`;
  }
}

let projectsHydrated = false;
export async function hydrateProjectScripts() {
  if (projectsHydrated) return;
  try {
    const [btnCode, imgCode] = await Promise.all([
      grabScratchpadFile('lua_scratchpad/Button_toControl_Image_Bounce.lua'),
      grabScratchpadFile('lua_scratchpad/Image_Control.lua')
    ]);
    const proj1 = SCENE_PROJECTS[0];
    const btnNode = proj1.nodes.find(n => n.key === 'PresetButton');
    const imgNode = proj1.nodes.find(n => n.key === 'Container_with_1Pixel');
    if (btnCode && btnNode && btnNode.script) btnNode.script.code = btnCode;
    if (imgCode && imgNode && imgNode.script) imgNode.script.code = imgCode;
    projectsHydrated = true;
  } catch {
    // Fallback to embedded copies
  }
}

hydrateProjectScripts();

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderProjectsView(container, onOpenInScratchpad = null) {
  let activeProjectIndex = 0;
  let selectedNodeKey = 'PresetButton';
  let activeLuaFileNodeKey = null;
  let treeSearchQuery = '';
  let addControlTypeIndex = 0;
  const collapsedNodeKeys = new Set();

  const getActiveProject = () => SCENE_PROJECTS[activeProjectIndex];
  const getSelectedNode = () => {
    const proj = getActiveProject();
    return proj.nodes.find(n => n.key === selectedNodeKey) || proj.nodes[0];
  };

  const hasChildren = (project, nodeKey) => {
    return project.nodes.some(n => n.parentKey === nodeKey);
  };

  const isHiddenByCollapsedAncestor = (project, node) => {
    let currParentKey = node.parentKey;
    while (currParentKey) {
      if (collapsedNodeKeys.has(currParentKey)) return true;
      const parentObj = project.nodes.find(n => n.key === currParentKey);
      currParentKey = parentObj ? parentObj.parentKey : null;
    }
    return false;
  };

  const getNextControlId = (project) => {
    let maxId = 0;
    for (const n of project.nodes) {
      if (typeof n.id === 'number' && n.id > maxId) maxId = n.id;
    }
    return maxId + 1;
  };

  const getNextUserdataHandle = (project) => {
    let maxH = 20;
    for (const n of project.nodes) {
      if (typeof n.userdataHandle === 'number' && n.userdataHandle > maxH) maxH = n.userdataHandle;
    }
    return maxH + 7;
  };

  const getNextScriptId = (project) => {
    let maxId = 0;
    for (const n of project.nodes) {
      if (n.script && typeof n.script.id === 'number' && n.script.id > maxId) {
        maxId = n.script.id;
      }
    }
    return maxId + 1;
  };

  // Compute accumulated world offset (x, y) on the 960x640 stage for any node
  const getNodeWorldStagePos = (project, node) => {
    let wx = node.x || 0;
    let wy = node.y || 0;
    let currParentKey = node.parentKey;
    while (currParentKey && currParentKey !== 'root') {
      const pNode = project.nodes.find(n => n.key === currParentKey);
      if (!pNode) break;
      wx += (pNode.x || 0);
      wy += (pNode.y || 0);
      currParentKey = pNode.parentKey;
    }
    return { wx, wy };
  };

  // Render Dynamic Draggable Static Stage (all scene controls rendered at their 960x640 coordinates)
  const renderStaticStageHTML = (project, selectedNode) => {
    const isNodeOrChildSelected = (targetKey) => {
      if (selectedNode.key === targetKey) return true;
      return selectedNode.parentKey === targetKey;
    };

    // Render all visible depth-1 controls PLUS any user-created nested controls
    const stageNodes = project.nodes.filter(n => {
      if (n.key === 'root' || n.depth === 0) return false;
      if (n.key === 'ReferenceControl' && !n.isUserCreated) return false;
      if (n.depth === 1) return true;
      return Boolean(n.isUserCreated || n.script);
    });

    const stageItemsHTML = stageNodes.map(node => {
      const { wx, wy } = getNodeWorldStagePos(project, node);
      const w = Math.max(28, node.width || 120);
      const h = Math.max(24, node.height || 40);

      // Convert 960x640 center-origin coordinates (x: -480..+480, y: -320..+320 bottom-up) to CSS %
      const leftPct = 50 + (wx / 960) * 100;
      const topPct = 50 - (wy / 640) * 100;
      const widthPct = (w / 960) * 100;
      const heightPct = (h / 640) * 100;

      const isSel = isNodeOrChildSelected(node.key);

      let innerVisual = '';
      if (node.key === 'Container_with_1Pixel') {
        innerVisual = `<div class="mw-preset-white-bar"></div>`;
      } else if (node.key === 'CooldownOrb') {
        innerVisual = `<div class="mw-preset-orb">✪</div>`;
      } else if (node.className === 'ClientUIKeyHintControl') {
        innerVisual = `<div class="mw-preset-keyhint">${escapeHtml(node.text || '1')}</div>`;
      } else if (node.className === 'ClientUIPresetButtonControl') {
        innerVisual = `<div class="mw-btn-main-label">${escapeHtml(node.text || node.name)}</div>`;
      } else if (node.className === 'ClientUITextBoxControl') {
        innerVisual = `<div class="mw-preset-banner">${escapeHtml(node.text || node.name)}</div>`;
      } else {
        const col = node.imageColor || node.bgColor || { r: 218, g: 175, b: 78, a: 210 };
        const bgStr = `rgba(${col.r}, ${col.g}, ${col.b}, ${Math.max(0.35, (col.a !== undefined ? col.a : 220) / 255)})`;
        innerVisual = `<div style="width:100%;height:100%;background:${bgStr};border:1px solid rgba(255,255,255,0.35);display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff;font-weight:700;">${escapeHtml(node.text || '')}</div>`;
      }

      return `
        <div class="mw-static-preset ${isSel ? 'selected' : ''}"
             data-select-node="${node.key}"
             data-stage-drag-key="${node.key}"
             title="Drag to position ${escapeHtml(node.name)} (x: ${Math.round(node.x || 0)}, y: ${Math.round(node.y || 0)})"
             style="left: ${leftPct.toFixed(2)}%; top: ${topPct.toFixed(2)}%; width: ${widthPct.toFixed(2)}%; height: ${heightPct.toFixed(2)}%; transform: translate(-50%, -50%);">
          <div class="mw-preset-tag-top">${escapeHtml(node.name)} (id:${node.id})${node.script ? ' 📜' : ''}</div>
          ${innerVisual}
        </div>
      `;
    }).join('');

    return `
      <div class="mw-stage-workspace">
        <div class="mw-stage-frame ${selectedNode.key === 'root' ? 'root-selected' : ''}" id="mw-stage-frame" data-select-node="root">
          <!-- 4 Corner Resize Handles -->
          <div class="mw-gizmo-corner tl"></div>
          <div class="mw-gizmo-corner tr"></div>
          <div class="mw-gizmo-corner bl"></div>
          <div class="mw-gizmo-corner br"></div>

          <!-- Center Crosshair Axis Guides -->
          <div class="mw-stage-axis-h"></div>
          <div class="mw-stage-axis-v"></div>
          <div class="mw-stage-root-label">${escapeHtml(project.rootName)} (id:${project.rootId}) — Drag controls to position</div>

          <!-- STATIC UI CONTROLS SET FOR .LUA INTERACTIONS -->
          ${stageItemsHTML}
        </div>
      </div>
    `;
  };

  // Render Live Editable .lua Script View in Center Panel
  const renderLuaFilePreviewHTML = (luaNode) => {
    const script = luaNode.script;
    return `
      <div class="mw-lua-preview-panel">
        <div class="mw-lua-preview-header">
          <div>
            <span class="doc-tag" style="margin-right: 8px;">MOUNTED .LUA SCRIPT</span>
            <strong style="color: var(--text-bright); font-size: 13px;">📜 ${escapeHtml(script.filename || (script.path + '.lua'))}</strong>
            <span style="font-size: 11px; color: var(--text-muted); margin-left: 10px;">
              → <strong style="color: var(--accent-gold);">${escapeHtml(luaNode.uiPath || luaNode.name)}</strong>
              (<code>id:${luaNode.id}</code>, <code>${luaNode.className}:${luaNode.userdataHandle}</code>)
            </span>
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button id="mw-back-to-stage-btn" class="brutal-btn brutal-btn-gold" style="padding: 3px 10px; font-size: 11px;">[ ▣ BACK TO STATIC STAGE ]</button>
            <button id="mw-open-scratchpad-btn" class="brutal-btn" data-code="${encodeURIComponent(script.code)}" style="padding: 3px 10px; font-size: 11px;">[ OPEN IN SCRATCHPAD ]</button>
            <button id="mw-copy-lua-btn" class="brutal-btn" data-code="${encodeURIComponent(script.code)}" style="padding: 3px 10px; font-size: 11px;">[ COPY .LUA ]</button>
          </div>
        </div>
        <div class="mw-lua-editor-split">
          <textarea id="mw-node-lua-textarea" class="mw-node-lua-textarea" spellcheck="false" autocomplete="off">${escapeHtml(script.code)}</textarea>
          <div class="mw-lua-live-note">
            <span>✓ Changes to this script automatically apply to <strong>${escapeHtml(luaNode.name)}</strong> when you press <strong>[ ▶ SIMULATE PROJECT (60 FPS) ]</strong>.</span>
          </div>
        </div>
      </div>
    `;
  };

  // Render Clean Right Panel: Index, id, ClassName:handle + Attached .lua Script (or Attach New Script)
  const renderRightInspectorHTML = (project, selectedNode) => {
    const defaultScriptPath = selectedNode.key === 'root'
      ? `${selectedNode.name}_Script`
      : selectedNode.uiPath.replace(/\//g, '_');

    return `
      <div class="mw-inspector-header">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div class="mw-inspector-top-tag">SELECTED NODE & SCRIPT INSPECTOR</div>
          ${selectedNode.key !== 'root' ? `<button id="mw-delete-node-btn" class="mw-copy-index-btn" title="Delete Control from Hierarchy" style="color: #e07a6b; font-weight: 700;">[ ✕ DELETE ]</button>` : ''}
        </div>
        <div style="display: flex; gap: 6px; align-items: center; margin: 4px 0 6px;">
          <input type="text" id="mw-rename-node-input" class="mw-script-input" value="${escapeHtml(selectedNode.name)}" title="Control Name (used by GetChild / FindChild)" style="font-weight: 700; font-size: 12.5px;" spellcheck="false" autocomplete="off" />
        </div>
        <div class="mw-inspector-index-row">
          <span>Index <strong>${selectedNode.prefabIndex}</strong></span>
          <button class="mw-copy-index-btn" data-copy="${selectedNode.prefabIndex}" title="Copy PrefabIndex">📋</button>
          <span class="mw-inspector-id-tag" title="Runtime Creation Counter (control.id)">id: ${selectedNode.id}</span>
        </div>
        <div style="margin-top: 5px; display: flex; align-items: center; justify-content: space-between; gap: 6px;">
          <span class="mw-inspector-id-tag" style="display: inline-block;" title="tostring(script.object) Userdata Handle">${selectedNode.className}:${selectedNode.userdataHandle}</span>
          ${selectedNode.key !== 'root' ? `<span style="font-size: 10px; color: var(--text-muted);" id="mw-insp-pos-readout">X:${Math.round(selectedNode.x || 0)} Y:${Math.round(selectedNode.y || 0)}</span>` : ''}
        </div>
      </div>

      <div class="mw-inspector-body">
        <div class="mw-insp-section">
          <div class="mw-insp-sec-title">
            <span>📁 .LUA SCRIPT (external_lua_file)</span>
            <span style="color: ${selectedNode.script ? 'var(--accent-gold)' : 'var(--text-muted)'}; font-size: 10px;">
              ${selectedNode.script ? '● ATTACHED' : '○ NONE'}
            </span>
          </div>

          ${selectedNode.script ? `
            <!-- Clickable .lua File Card on the Right Side -->
            <div class="mw-lua-file-item ${activeLuaFileNodeKey === selectedNode.key ? 'active' : ''}" id="mw-right-lua-card" data-lua-node-key="${selectedNode.key}" title="Click to view/edit .lua script in center">
              <span class="mw-lua-file-icon">📜</span>
              <div class="mw-lua-file-meta">
                <div class="mw-lua-file-name">${escapeHtml(selectedNode.script.filename || (selectedNode.script.path + '.lua'))}</div>
                <div class="mw-lua-file-sub">script.path: "${escapeHtml(selectedNode.script.path)}" | script.id: ${selectedNode.script.id}</div>
              </div>
            </div>

            <div style="display: flex; gap: 6px; margin-top: 10px;">
              <button class="brutal-btn brutal-btn-gold" id="mw-open-script-center-btn" style="flex: 1; justify-content: center; padding: 5px 8px; font-size: 11px;">
                [ 📜 ${activeLuaFileNodeKey === selectedNode.key ? 'EDITING IN CENTER' : 'OPEN .LUA IN CENTER'} ]
              </button>
              <button class="brutal-btn" id="mw-detach-script-btn" title="Detach script from ${escapeHtml(selectedNode.name)}" style="padding: 5px 8px; font-size: 11px; color: #e07a6b;">
                [ ✕ ]
              </button>
            </div>
          ` : `
            <!-- Attach a Script to this Node -->
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 10px;">
              No script attached to <strong>${escapeHtml(selectedNode.name)}</strong>.
            </div>

            <label class="mw-insp-label" for="mw-attach-script-path">script.path (for GetScriptByPath):</label>
            <input type="text" id="mw-attach-script-path" class="mw-script-input" value="${escapeHtml(defaultScriptPath)}" spellcheck="false" autocomplete="off" />

            <button class="brutal-btn brutal-btn-gold" id="mw-attach-script-btn" style="width: 100%; justify-content: center; margin-top: 10px; padding: 6px 10px; font-size: 11px;">
              [ + ATTACH .LUA SCRIPT ]
            </button>
          `}
        </div>
      </div>
    `;
  };

  const render = () => {
    const project = getActiveProject();
    normalizeProjectHierarchy(project);
    const selectedNode = getSelectedNode();

    const visibleTreeNodes = project.nodes.filter(node => {
      if (treeSearchQuery) {
        const q = treeSearchQuery.toLowerCase();
        return node.name.toLowerCase().includes(q) || node.className.toLowerCase().includes(q);
      }
      return !isHiddenByCollapsedAncestor(project, node);
    });

    const luaPreviewNode = activeLuaFileNodeKey
      ? project.nodes.find(n => n.key === activeLuaFileNodeKey && n.script)
      : null;

    const centerContentHTML = luaPreviewNode
      ? renderLuaFilePreviewHTML(luaPreviewNode)
      : renderStaticStageHTML(project, selectedNode);

    container.innerHTML = `
      <div class="mw-editor-shell">
        <!-- TOP EDITOR BAR: Dropdown Menu for Project + Pop-Out Simulate Button -->
        <div class="mw-editor-topbar">
          <div class="mw-topbar-left">
            <span class="mw-topbar-badge">INTERFACE LAYOUT EDITOR</span>
            <label for="mw-project-select" style="font-size: 11px; color: var(--text-muted); font-weight: 700;">PROJECT:</label>
            <select id="mw-project-select" class="sim-select" style="min-width: 310px; font-weight: 700;">
              ${SCENE_PROJECTS.map((p, idx) => `
                <option value="${idx}" ${idx === activeProjectIndex ? 'selected' : ''}>
                  ${escapeHtml(p.shortLabel)}
                </option>
              `).join('')}
            </select>
          </div>

          <div class="mw-topbar-right">
            <button id="mw-simulate-project-btn" class="brutal-btn brutal-btn-gold" style="padding: 5px 14px; font-size: 12px;">
              [ ▶ SIMULATE PROJECT (60 FPS) ]
            </button>
          </div>
        </div>

        <!-- 3-COLUMN MILIASTRA EDITOR WORKSPACE -->
        <div class="mw-editor-columns">
          <!-- LEFT COLUMN: Search + Add UIControl + Drag-and-Drop Nested Hierarchy Tree -->
          <div class="mw-left-hierarchy">
            <div class="mw-tree-search-row">
              <div class="mw-tree-search-box">
                <span class="mw-search-svg-wrap">${SEARCH_SVG_ICON}</span>
                <input type="text" id="mw-tree-search-input" placeholder="Filter hierarchy..." value="${escapeHtml(treeSearchQuery)}" autocomplete="off" spellcheck="false" />
              </div>
              <span class="mw-tree-filter-btn" title="Drag & Drop nodes to reparent">⧩</span>
            </div>

            <!-- Add New UIControl Bar -->
            <div class="mw-add-control-bar">
              <select id="mw-add-control-type" class="mw-add-control-select" title="Choose UIControl type to add under selected node">
                ${UI_CONTROL_PRESET_TYPES.map((t, idx) => `
                  <option value="${idx}" ${idx === addControlTypeIndex ? 'selected' : ''}>${escapeHtml(t.label)}</option>
                `).join('')}
              </select>
              <button id="mw-add-control-btn" class="brutal-btn brutal-btn-gold" style="padding: 3px 8px; font-size: 10.5px;" title="Add UIControl as child of selected node">
                [ + ADD ]
              </button>
            </div>

            <div class="mw-hierarchy-scroll" id="mw-hierarchy-scroll">
              ${visibleTreeNodes.map(node => {
                const isSelected = node.key === selectedNode.key;
                const indent = node.depth * 16;
                const nodeHasChildren = hasChildren(project, node.key);
                const isCollapsed = collapsedNodeKeys.has(node.key);
                const actualCaret = nodeHasChildren ? (isCollapsed ? '▸' : '▾') : '';
                const isDraggable = node.key !== 'root';

                return `
                  <div class="mw-tree-item ${isSelected ? 'selected' : ''}"
                       data-node-key="${node.key}"
                       draggable="${isDraggable ? 'true' : 'false'}"
                       title="${isDraggable ? 'Click to inspect • Drag onto another node to reparent' : 'Root Container (Drop nodes here to parent under Root)'}"
                       style="padding-left: ${6 + indent}px;">
                    <span class="mw-tree-caret ${nodeHasChildren ? 'clickable' : ''}" data-toggle-key="${nodeHasChildren ? node.key : ''}" title="${nodeHasChildren ? 'Expand / Collapse Children' : ''}">${actualCaret}</span>
                    <span class="mw-tree-icon">${node.icon}</span>
                    <span class="mw-tree-label">${escapeHtml(node.name)}</span>
                    ${node.script ? `<span class="mw-tree-script-badge" data-open-script-key="${node.key}" title="Click to view/edit ${escapeHtml(node.script.filename)}">📜 ${escapeHtml(node.script.path)}</span>` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- CENTER COLUMN: Draggable Static Stage Preview OR Editable .lua Script -->
          <div class="mw-center-stage">
            ${centerContentHTML}
          </div>

          <!-- RIGHT COLUMN: Clean Node Header + Attached Script / Attach Script Button -->
          <div class="mw-right-inspector" id="mw-inspector-mount">
            ${renderRightInspectorHTML(project, selectedNode)}
          </div>
        </div>
      </div>
    `;

    bindWorkspaceEvents();
  };

  const bindInspectorEvents = () => {
    const inspMount = container.querySelector('#mw-inspector-mount');
    if (!inspMount) return;

    inspMount.querySelectorAll('.mw-copy-index-btn[data-copy]').forEach(btn => {
      btn.addEventListener('click', () => {
        copyToClipboard(btn.dataset.copy, 'PrefabIndex');
      });
    });

    // Rename selected node live
    const renameInput = inspMount.querySelector('#mw-rename-node-input');
    if (renameInput) {
      renameInput.addEventListener('change', () => {
        const node = getSelectedNode();
        const nextName = renameInput.value.trim();
        if (node && nextName) {
          node.name = nextName;
          if (node.key === 'root') {
            getActiveProject().rootName = nextName;
          }
          normalizeProjectHierarchy(getActiveProject());
          render();
        }
      });
    }

    // Delete selected node (and its children)
    const deleteNodeBtn = inspMount.querySelector('#mw-delete-node-btn');
    if (deleteNodeBtn) {
      deleteNodeBtn.addEventListener('click', () => {
        const proj = getActiveProject();
        const node = getSelectedNode();
        if (!node || node.key === 'root') return;

        const keysToRemove = new Set([node.key]);
        for (const n of proj.nodes) {
          if (isDescendantOf(proj, n.key, node.key)) {
            keysToRemove.add(n.key);
          }
        }
        proj.nodes = proj.nodes.filter(n => !keysToRemove.has(n.key));
        selectedNodeKey = node.parentKey || 'root';
        if (activeLuaFileNodeKey && keysToRemove.has(activeLuaFileNodeKey)) {
          activeLuaFileNodeKey = null;
        }
        render();
        showToast(`Deleted ${node.name}`);
      });
    }

    // Clickable .lua file card on the Right Panel -> opens .lua in Center Panel
    const rightLuaCard = inspMount.querySelector('#mw-right-lua-card');
    if (rightLuaCard) {
      rightLuaCard.addEventListener('click', () => {
        activeLuaFileNodeKey = selectedNodeKey;
        render();
      });
    }

    const openScriptCenterBtn = inspMount.querySelector('#mw-open-script-center-btn');
    if (openScriptCenterBtn) {
      openScriptCenterBtn.addEventListener('click', () => {
        activeLuaFileNodeKey = selectedNodeKey;
        render();
      });
    }

    // Detach script from node
    const detachBtn = inspMount.querySelector('#mw-detach-script-btn');
    if (detachBtn) {
      detachBtn.addEventListener('click', () => {
        const node = getSelectedNode();
        if (node) {
          node.script = null;
          if (activeLuaFileNodeKey === node.key) {
            activeLuaFileNodeKey = null;
          }
          render();
        }
      });
    }

    // Attach new .lua script to a node that has none
    const attachBtn = inspMount.querySelector('#mw-attach-script-btn');
    if (attachBtn) {
      attachBtn.addEventListener('click', () => {
        const project = getActiveProject();
        const node = getSelectedNode();
        if (!node) return;

        const pathInput = inspMount.querySelector('#mw-attach-script-path');
        const rawPath = (pathInput && pathInput.value.trim()) || `${node.name}_Script`;
        const cleanPath = rawPath.replace(/\.lua$/i, '');
        const nextId = getNextScriptId(project);

        node.script = {
          id: nextId,
          filename: `${cleanPath}.lua`,
          path: cleanPath,
          prefabIndex: 1073741860 + nextId,
          aliases: [cleanPath, node.name],
          code: createStarterLuaForNode(project, node)
        };

        activeLuaFileNodeKey = node.key;
        render();
      });
    }
  };

  const bindWorkspaceEvents = () => {
    bindInspectorEvents();

    // Project dropdown selector
    const projSelect = container.querySelector('#mw-project-select');
    if (projSelect) {
      projSelect.addEventListener('change', () => {
        activeProjectIndex = parseInt(projSelect.value, 10) || 0;
        const proj = getActiveProject();
        selectedNodeKey = (proj.nodes.find(n => n.script)?.key) || 'root';
        activeLuaFileNodeKey = null;
        collapsedNodeKeys.clear();
        render();
      });
    }

    // Add New UIControl button
    const addTypeSelect = container.querySelector('#mw-add-control-type');
    if (addTypeSelect) {
      addTypeSelect.addEventListener('change', () => {
        addControlTypeIndex = parseInt(addTypeSelect.value, 10) || 0;
      });
    }

    const addCtrlBtn = container.querySelector('#mw-add-control-btn');
    if (addCtrlBtn) {
      addCtrlBtn.addEventListener('click', () => {
        const project = getActiveProject();
        const preset = UI_CONTROL_PRESET_TYPES[addControlTypeIndex] || UI_CONTROL_PRESET_TYPES[0];
        const parentNode = getSelectedNode() || project.nodes[0];
        const parentKey = parentNode ? parentNode.key : 'root';

        const nextId = getNextControlId(project);
        const nextHandle = getNextUserdataHandle(project);
        const uniqueName = `${preset.baseName}_${nextId}`;
        const uniqueKey = `node_${Date.now()}_${nextId}`;

        // Offset initial position slightly so multiple added controls don't stack identically
        const offsetCount = project.nodes.filter(n => n.isUserCreated).length;
        const initX = parentKey === 'root' ? ((offsetCount % 3) - 1) * 90 : 0;
        const initY = parentKey === 'root' ? 40 - (offsetCount * 28) % 140 : 0;

        const newNode = {
          key: uniqueKey,
          parentKey,
          id: nextId,
          userdataHandle: nextHandle,
          depth: (parentNode ? parentNode.depth : 0) + 1,
          icon: preset.icon,
          name: uniqueName,
          className: preset.className,
          prefabIndex: preset.prefabIndex,
          uiPath: uniqueName,
          x: initX,
          y: initY,
          width: preset.width,
          height: preset.height,
          visible: true,
          raycastTarget: Boolean(preset.raycastTarget),
          interactable: preset.interactable !== false,
          bgColor: preset.bgColor ? { ...preset.bgColor } : undefined,
          imageColor: preset.imageColor ? { ...preset.imageColor } : undefined,
          text: preset.typeKey === 'KeyHintControl'
            ? preset.text
            : (preset.text ? `${preset.text} (${nextId})` : undefined),
          fontSize: preset.fontSize,
          fontColor: preset.fontColor ? { ...preset.fontColor } : undefined,
          referencedPrefabIndex: preset.referencedPrefabIndex,
          isUserCreated: true,
          script: null
        };

        project.nodes.push(newNode);
        collapsedNodeKeys.delete(parentKey);
        normalizeProjectHierarchy(project);
        selectedNodeKey = newNode.key;
        activeLuaFileNodeKey = null;
        render();
        showToast(`Added ${uniqueName} (id:${nextId}) under ${parentNode ? parentNode.name : 'Root'}`);
      });
    }

    // Tree search filter
    const searchInput = container.querySelector('#mw-tree-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        treeSearchQuery = searchInput.value;
        const pos = searchInput.selectionStart;
        render();
        const nextInput = container.querySelector('#mw-tree-search-input');
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(pos, pos);
        }
      });
    }

    // Expand / Collapse nested children caret click
    container.querySelectorAll('.mw-tree-caret.clickable').forEach(caret => {
      caret.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = caret.dataset.toggleKey;
        if (!key) return;
        if (collapsedNodeKeys.has(key)) {
          collapsedNodeKeys.delete(key);
        } else {
          collapsedNodeKeys.add(key);
        }
        render();
      });
    });

    // Clicking the 📜 script badge on a tree item directly opens its .lua file in the center
    container.querySelectorAll('[data-open-script-key]').forEach(badge => {
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = badge.dataset.openScriptKey;
        selectedNodeKey = key;
        activeLuaFileNodeKey = key;
        render();
      });
    });

    // Left Hierarchy UI Control click + Drag-and-Drop Reparenting
    let draggedTreeKey = null;
    container.querySelectorAll('.mw-tree-item').forEach(row => {
      row.addEventListener('click', () => {
        selectedNodeKey = row.dataset.nodeKey;
        activeLuaFileNodeKey = null;
        render();
      });

      row.addEventListener('dragstart', (e) => {
        const key = row.dataset.nodeKey;
        if (!key || key === 'root') {
          e.preventDefault();
          return;
        }
        draggedTreeKey = key;
        row.classList.add('dragging');
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', key);
        }
      });

      row.addEventListener('dragend', () => {
        draggedTreeKey = null;
        row.classList.remove('dragging');
        container.querySelectorAll('.mw-tree-item.drag-over-target').forEach(el => el.classList.remove('drag-over-target'));
      });

      row.addEventListener('dragover', (e) => {
        const targetKey = row.dataset.nodeKey;
        const sourceKey = draggedTreeKey;
        if (!sourceKey || !targetKey || sourceKey === targetKey) return;
        const proj = getActiveProject();
        if (isDescendantOf(proj, targetKey, sourceKey)) return;

        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        row.classList.add('drag-over-target');
      });

      row.addEventListener('dragleave', () => {
        row.classList.remove('drag-over-target');
      });

      row.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        row.classList.remove('drag-over-target');

        const targetKey = row.dataset.nodeKey;
        const sourceKey = draggedTreeKey || (e.dataTransfer && e.dataTransfer.getData('text/plain'));
        if (!sourceKey || !targetKey || sourceKey === targetKey) return;

        const proj = getActiveProject();
        if (isDescendantOf(proj, targetKey, sourceKey)) return;

        const sourceNode = proj.nodes.find(n => n.key === sourceKey);
        const targetNode = proj.nodes.find(n => n.key === targetKey);
        if (!sourceNode || !targetNode) return;

        sourceNode.parentKey = targetNode.key;
        collapsedNodeKeys.delete(targetNode.key);
        normalizeProjectHierarchy(proj);
        selectedNodeKey = sourceNode.key;
        render();
        showToast(`Moved ${sourceNode.name} inside ${targetNode.name}`);
      });
    });

    // Center Static Stage: Click to Select + Drag-and-Drop to Position UIControl on Stage
    const stageFrame = container.querySelector('#mw-stage-frame');
    if (stageFrame) {
      stageFrame.addEventListener('click', (e) => {
        if (e.target === stageFrame) {
          selectedNodeKey = 'root';
          activeLuaFileNodeKey = null;
          render();
        }
      });

      container.querySelectorAll('[data-stage-drag-key]').forEach(presetEl => {
        presetEl.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return;
          e.stopPropagation();

          const nodeKey = presetEl.dataset.stageDragKey;
          const proj = getActiveProject();
          const node = proj.nodes.find(n => n.key === nodeKey);
          if (!node) return;

          const startMouseX = e.clientX;
          const startMouseY = e.clientY;
          const startNodeX = node.x || 0;
          const startNodeY = node.y || 0;
          const rect = stageFrame.getBoundingClientRect();
          let moved = false;

          const onMouseMove = (moveEvt) => {
            const dxPx = moveEvt.clientX - startMouseX;
            const dyPx = moveEvt.clientY - startMouseY;
            if (Math.abs(dxPx) > 2 || Math.abs(dyPx) > 2) {
              moved = true;
            }
            if (!moved || rect.width <= 0 || rect.height <= 0) return;

            // Convert pixel delta to 960x640 Miliastra stage coordinates (Y is bottom-up!)
            const deltaStageX = (dxPx / rect.width) * 960;
            const deltaStageY = -(dyPx / rect.height) * 640;

            node.x = Math.round(Math.max(-450, Math.min(450, startNodeX + deltaStageX)));
            node.y = Math.round(Math.max(-290, Math.min(290, startNodeY + deltaStageY)));

            const { wx, wy } = getNodeWorldStagePos(proj, node);
            const leftPct = 50 + (wx / 960) * 100;
            const topPct = 50 - (wy / 640) * 100;
            presetEl.style.left = `${leftPct.toFixed(2)}%`;
            presetEl.style.top = `${topPct.toFixed(2)}%`;

            const posReadout = container.querySelector('#mw-insp-pos-readout');
            if (posReadout && selectedNodeKey === node.key) {
              posReadout.textContent = `X:${node.x} Y:${node.y}`;
            }
          };

          const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            selectedNodeKey = node.key;
            activeLuaFileNodeKey = null;
            render();
          };

          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        });
      });
    }

    // Live .lua code textarea in Center Panel -> updates node.script.code in real time
    const luaTextarea = container.querySelector('#mw-node-lua-textarea');
    if (luaTextarea && activeLuaFileNodeKey) {
      luaTextarea.addEventListener('input', () => {
        const proj = getActiveProject();
        const targetNode = proj.nodes.find(n => n.key === activeLuaFileNodeKey);
        if (targetNode && targetNode.script) {
          targetNode.script.code = luaTextarea.value;
        }
      });
    }

    // .lua Preview header buttons
    const backStageBtn = container.querySelector('#mw-back-to-stage-btn');
    if (backStageBtn) {
      backStageBtn.addEventListener('click', () => {
        activeLuaFileNodeKey = null;
        render();
      });
    }

    const openScratchpadBtn = container.querySelector('#mw-open-scratchpad-btn');
    if (openScratchpadBtn) {
      openScratchpadBtn.addEventListener('click', () => {
        const proj = getActiveProject();
        const targetNode = proj.nodes.find(n => n.key === activeLuaFileNodeKey);
        const latestCode = (targetNode && targetNode.script && targetNode.script.code)
          || decodeURIComponent(openScratchpadBtn.dataset.code);
        if (typeof onOpenInScratchpad === 'function') {
          onOpenInScratchpad(latestCode);
        }
      });
    }

    const copyLuaBtn = container.querySelector('#mw-copy-lua-btn');
    if (copyLuaBtn) {
      copyLuaBtn.addEventListener('click', () => {
        const proj = getActiveProject();
        const targetNode = proj.nodes.find(n => n.key === activeLuaFileNodeKey);
        const latestCode = (targetNode && targetNode.script && targetNode.script.code)
          || decodeURIComponent(copyLuaBtn.dataset.code);
        copyToClipboard(latestCode, '.lua File');
      });
    }

    // Simulate Project Button -> Opens the Pop-Out Simulator Modal with all current/attached node scripts!
    const simulateBtn = container.querySelector('#mw-simulate-project-btn');
    if (simulateBtn) {
      simulateBtn.addEventListener('click', () => {
        const proj = getActiveProject();
        normalizeProjectHierarchy(proj);
        const primaryScript = (proj.nodes.find(n => n.script)?.script.code) || '';
        openLuaRunnerModal(
          primaryScript,
          `${proj.title}`,
          () => primaryScript,
          () => proj
        );
      });
    }
  };

  render();
  hydrateProjectScripts().then(() => {
    if (activeLuaFileNodeKey) {
      render();
    }
  });
}
