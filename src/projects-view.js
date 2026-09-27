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
import {
  STAGE_WIDTH,
  STAGE_HEIGHT,
  ensureNodeTransformDefaults,
  getNodeStageGeometry,
  renderStageGizmoOverlayHTML,
  renderSelectedControlGizmoHandlesHTML,
  renderBasicInspectorTabHTML,
  bindTransformAndStageGizmoEvents
} from './project-transform-gizmo.js';
import {
  ensureControlSpecificDefaults,
  syncButtonStateMachineChildren,
  renderStageButtonVisualHTML,
  renderStageTextBoxVisualHTML,
  renderStageKeyHintVisualHTML,
  renderStageAnimationVisualHTML,
  renderStageReferenceVisualHTML,
  renderStageCursorAreaVisualHTML,
  renderStageGridScrollerVisualHTML,
  renderStageImageVisualHTML,
  renderControlSpecificInspectorHTML,
  renderBottomAssetLibraryDrawerHTML,
  renderSideSelectorPanelHTML,
  bindControlSpecificInspectorEvents,
  buildControlSpecificLuaLines,
  getKeyboardKeyHintMeta,
  getControllerKeyHintMeta,
  getVfxPresetMeta,
  getReferenceTemplateMeta
} from './project-control-settings.js';

export function destroyInlineProjectSimulator() {
  // Simulation always opens in the pop-out modal by default
}

const SEARCH_SVG_ICON = `<svg viewBox="0 -2 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

const formatControlClassLabel = (className) => String(className || '').replace(/^ClientUI/, '');

const UI_CONTROL_PRESET_TYPES = [
  {
    typeKey: 'BaseControl',
    label: '+ BaseControl',
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
    label: '+ ImageControl',
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
    label: '+ TextBoxControl',
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
    label: '+ TextWindowControl',
    icon: '▤',
    baseName: 'TextWindowControl',
    className: 'ClientUITextWindowControl',
    prefabIndex: 1073741854,
    width: 240,
    height: 110,
    interactable: true,
    showScrollBar: true,
    alignH: 'left',
    alignV: 'top',
    bgColor: { r: 255, g: 255, b: 255, a: 0 },
    text: 'text text text text text text text\ntext text text text text text text\ntext text text text text text text\ntext text text',
    fontSize: 20,
    fontColor: { r: 255, g: 255, b: 255, a: 255 },
    raycastTarget: true
  },
  {
    typeKey: 'PresetButton',
    label: '+ PresetButtonControl',
    icon: 'Btn',
    baseName: 'PresetButton',
    className: 'ClientUIPresetButtonControl',
    prefabIndex: 1073741851,
    width: 156,
    height: 44,
    raycastTarget: true,
    interactable: true,
    clickAudioId: 1001
  },
  {
    typeKey: 'GridScrollerControl',
    label: '+ GridScrollerControl',
    icon: '⊞',
    baseName: 'GridScrollerControl',
    className: 'ClientUIGridScrollerControl',
    prefabIndex: 1073741855,
    width: 240,
    height: 120,
    interactable: true,
    showScrollBar: true,
    raycastTarget: true,
    scrollDirection: 'Vertical',
    layoutConstraint: 'AutoWrap',
    layoutConstraintFixedCount: 3,
    itemPrefabIndex: 1073741954,
    itemCount: 12,
    itemWidth: 56,
    itemHeight: 36,
    spacingX: 6,
    spacingY: 6,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 6,
    paddingRight: 6,
    scrollProgress: 0
  },
  {
    typeKey: 'ContainerControl',
    label: '+ ContainerControl',
    icon: '□',
    baseName: 'ContainerControl',
    className: 'ClientUIContainerControl',
    prefabIndex: 1073741852,
    width: 200,
    height: 80,
    isolateNavigation: false,
    disableKeyEventPassthrough: false,
    disableCursorEventPassthrough: false,
    showCursor: false,
    bgColor: { r: 46, g: 38, b: 30, a: 120 },
    raycastTarget: false
  },
  {
    typeKey: 'CursorEventArea',
    label: '+ CursorEventAreaControl',
    icon: '⌖',
    baseName: 'CursorEventArea',
    className: 'ClientUICursorEventAreaControl',
    prefabIndex: 1073741856,
    width: 160,
    height: 60,
    persistentAreaPreview: true,
    raycastTarget: false,
    interactable: true
  },
  {
    typeKey: 'AnimationControl',
    label: '+ UIAnimationControl',
    icon: '✦',
    baseName: 'UIAnimationControl',
    className: 'ClientUIAnimationControl',
    prefabIndex: 1073741857,
    width: 140,
    height: 64,
    animationId: 10001001,
    playSoundEffect: false,
    layer: 1,
    raycastTarget: false
  },
  {
    typeKey: 'FullscreenAnimationControl',
    label: '+ FullscreenAnimationControl',
    icon: '⛶',
    baseName: 'FullscreenAnimationControl',
    className: 'ClientUIFullscreenAnimationControl',
    prefabIndex: 1073741860,
    width: 320,
    height: 84,
    animationId: 10002001,
    playSoundEffect: false,
    raycastTarget: false
  },
  {
    typeKey: 'KeyHintControl',
    label: '+ KeyHintControl',
    icon: '1',
    baseName: 'KeyHintControl',
    className: 'ClientUIKeyHintControl',
    prefabIndex: 1073741858,
    width: 36,
    height: 28,
    keyboardKeyCode: 2,
    controllerKeyCode: 6,
    previewKeyHintDevice: 'keyboard',
    playerCustomKeyOverride: '',
    bgColor: { r: 245, g: 245, b: 245, a: 255 },
    text: '1',
    fontSize: 13,
    fontColor: { r: 24, g: 20, b: 16, a: 255 },
    raycastTarget: false
  },
  {
    typeKey: 'ReferenceControl',
    label: '+ ReferenceControl',
    icon: '🔗',
    baseName: 'ReferenceControl',
    className: 'ClientUIReferenceControl',
    prefabIndex: 1073741859,
    referencedPrefabIndex: 1073741954,
    width: 170,
    height: 44,
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
        local nextLabel = isBannerActive
            and "[ TOGGLE SetActive(false) (CLICK / F) ]"
            or "[ TOGGLE SetActive(true) (CLICK / F) ]"
        togglePauseBtn.text = nextLabel
        for _, stateChild in ipairs(togglePauseBtn:GetChildren()) do
            local lbl = stateChild:GetChild("Label")
            if lbl then lbl.text = nextLabel end
        end
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
        clickAudioId: 1001,
        normalStatusNodeKey: 'Btn_Normal_Container',
        hoverStatusNodeKey: 'Btn_Hover_Container',
        pressedStatusNodeKey: 'Btn_Pressed_Container',
        disabledStatusNodeKey: 'Btn_Disabled_Container',
        previewButtonState: 'normal',
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
      // 1-Tier Direct Child Status Nodes of PresetButton (State Machine representations)
      // Note: Layered ordering — top layer in container (Text) renders ON TOP of bottom layer (Bg)
      {
        key: 'Btn_Normal_Container',
        parentKey: 'PresetButton',
        id: 6,
        userdataHandle: 101,
        depth: 2,
        icon: '□',
        name: 'Btn_Normal_Container',
        className: 'ClientUIContainerControl',
        prefabIndex: 1073741852,
        uiPath: 'PresetButton/Btn_Normal_Container',
        x: 0,
        y: 0,
        width: 148,
        height: 44,
        active: true,
        visible: true,
        script: null
      },
      {
        key: 'Normal_Text',
        parentKey: 'Btn_Normal_Container',
        id: 8,
        userdataHandle: 103,
        depth: 3,
        icon: 'T',
        name: 'Normal_Text',
        className: 'ClientUITextBoxControl',
        prefabIndex: 1073741849,
        uiPath: 'PresetButton/Btn_Normal_Container/Normal_Text',
        x: 0,
        y: 0,
        width: 148,
        height: 44,
        text: 'Press it!',
        fontSize: 15,
        alignH: 'center',
        alignV: 'middle',
        fontColor: { r: 245, g: 238, b: 220, a: 255 },
        bgColor: { r: 0, g: 0, b: 0, a: 0 },
        script: null
      },
      {
        key: 'Normal_Bg',
        parentKey: 'Btn_Normal_Container',
        id: 7,
        userdataHandle: 102,
        depth: 3,
        icon: '▣',
        name: 'Normal_Bg',
        className: 'ClientUIImageControl',
        prefabIndex: 1073741850,
        uiPath: 'PresetButton/Btn_Normal_Container/Normal_Bg',
        x: 0,
        y: 0,
        width: 148,
        height: 44,
        resourceId: 100001,
        imageColor: { r: 58, g: 48, b: 36, a: 245 },
        script: null
      },
      {
        key: 'Btn_Hover_Container',
        parentKey: 'PresetButton',
        id: 9,
        userdataHandle: 104,
        depth: 2,
        icon: '□',
        name: 'Btn_Hover_Container',
        className: 'ClientUIContainerControl',
        prefabIndex: 1073741852,
        uiPath: 'PresetButton/Btn_Hover_Container',
        x: 0,
        y: 0,
        width: 148,
        height: 44,
        active: false,
        visible: false,
        script: null
      },
      {
        key: 'Hover_Text',
        parentKey: 'Btn_Hover_Container',
        id: 11,
        userdataHandle: 106,
        depth: 3,
        icon: 'T',
        name: 'Hover_Text',
        className: 'ClientUITextBoxControl',
        prefabIndex: 1073741849,
        uiPath: 'PresetButton/Btn_Hover_Container/Hover_Text',
        x: 0,
        y: 0,
        width: 148,
        height: 44,
        text: '<b>▶ Press it! ◀</b>',
        fontSize: 15,
        alignH: 'center',
        alignV: 'middle',
        fontColor: { r: 255, g: 235, b: 175, a: 255 },
        bgColor: { r: 0, g: 0, b: 0, a: 0 },
        script: null
      },
      {
        key: 'Hover_Bg',
        parentKey: 'Btn_Hover_Container',
        id: 10,
        userdataHandle: 105,
        depth: 3,
        icon: '▣',
        name: 'Hover_Bg',
        className: 'ClientUIImageControl',
        prefabIndex: 1073741850,
        uiPath: 'PresetButton/Btn_Hover_Container/Hover_Bg',
        x: 0,
        y: 0,
        width: 148,
        height: 44,
        resourceId: 100001,
        imageColor: { r: 122, g: 92, b: 44, a: 255 },
        script: null
      },
      {
        key: 'Btn_Pressed_Container',
        parentKey: 'PresetButton',
        id: 12,
        userdataHandle: 107,
        depth: 2,
        icon: '□',
        name: 'Btn_Pressed_Container',
        className: 'ClientUIContainerControl',
        prefabIndex: 1073741852,
        uiPath: 'PresetButton/Btn_Pressed_Container',
        x: 0,
        y: 0,
        width: 148,
        height: 44,
        active: false,
        visible: false,
        script: null
      },
      {
        key: 'Pressed_Text',
        parentKey: 'Btn_Pressed_Container',
        id: 14,
        userdataHandle: 109,
        depth: 3,
        icon: 'T',
        name: 'Pressed_Text',
        className: 'ClientUITextBoxControl',
        prefabIndex: 1073741849,
        uiPath: 'PresetButton/Btn_Pressed_Container/Pressed_Text',
        x: 0,
        y: 0,
        width: 148,
        height: 44,
        text: '<b>⚡ BOUNCE! ⚡</b>',
        fontSize: 14,
        alignH: 'center',
        alignV: 'middle',
        fontColor: { r: 255, g: 245, b: 220, a: 255 },
        bgColor: { r: 0, g: 0, b: 0, a: 0 },
        script: null
      },
      {
        key: 'Pressed_Bg',
        parentKey: 'Btn_Pressed_Container',
        id: 13,
        userdataHandle: 108,
        depth: 3,
        icon: '▣',
        name: 'Pressed_Bg',
        className: 'ClientUIImageControl',
        prefabIndex: 1073741850,
        uiPath: 'PresetButton/Btn_Pressed_Container/Pressed_Bg',
        x: 0,
        y: 0,
        width: 148,
        height: 44,
        resourceId: 100001,
        imageColor: { r: 165, g: 62, b: 42, a: 255 },
        script: null
      },
      {
        key: 'Btn_Disabled_Container',
        parentKey: 'PresetButton',
        id: 15,
        userdataHandle: 110,
        depth: 2,
        icon: '□',
        name: 'Btn_Disabled_Container',
        className: 'ClientUIContainerControl',
        prefabIndex: 1073741852,
        uiPath: 'PresetButton/Btn_Disabled_Container',
        x: 0,
        y: 0,
        width: 148,
        height: 44,
        active: false,
        visible: false,
        script: null
      },
      {
        key: 'Disabled_Text',
        parentKey: 'Btn_Disabled_Container',
        id: 17,
        userdataHandle: 112,
        depth: 3,
        icon: 'T',
        name: 'Disabled_Text',
        className: 'ClientUITextBoxControl',
        prefabIndex: 1073741849,
        uiPath: 'PresetButton/Btn_Disabled_Container/Disabled_Text',
        x: 0,
        y: 0,
        width: 148,
        height: 44,
        text: 'Disabled',
        fontSize: 14,
        alignH: 'center',
        alignV: 'middle',
        fontColor: { r: 130, g: 120, b: 105, a: 200 },
        bgColor: { r: 0, g: 0, b: 0, a: 0 },
        script: null
      },
      {
        key: 'Disabled_Bg',
        parentKey: 'Btn_Disabled_Container',
        id: 16,
        userdataHandle: 111,
        depth: 3,
        icon: '▣',
        name: 'Disabled_Bg',
        className: 'ClientUIImageControl',
        prefabIndex: 1073741850,
        uiPath: 'PresetButton/Btn_Disabled_Container/Disabled_Bg',
        x: 0,
        y: 0,
        width: 148,
        height: 44,
        resourceId: 100001,
        imageColor: { r: 42, g: 38, b: 34, a: 180 },
        script: null
      },
      {
        key: 'Container_with_1Pixel',
        parentKey: 'root',
        id: 4,
        userdataHandle: 75,
        depth: 1,
        icon: '▣',
        name: 'Container_with_1Pixel',
        className: 'ClientUIImageControl',
        prefabIndex: 1073741853,
        uiPath: 'Container_with_1Pixel',
        x: 0,
        y: -20,
        width: 190,
        height: 40,
        resourceId: 100001,
        enableMask: false,
        enableSoftEdge: false,
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
        keyboardKeyCode: 2,
        controllerKeyCode: 6,
        previewKeyHintDevice: 'keyboard',
        playerCustomKeyOverride: '',
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
        referencedPrefabIndex: 1073741954,
        uiPath: 'ReferenceControl',
        x: 0,
        y: -150,
        width: 170,
        height: 44,
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
        clickAudioId: 1001,
        normalStatusNodeKey: 'CastSkill_Normal',
        hoverStatusNodeKey: 'CastSkill_Hover',
        pressedStatusNodeKey: 'CastSkill_Pressed',
        disabledStatusNodeKey: '',
        previewButtonState: 'normal',
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
        key: 'CastSkill_Normal',
        parentKey: 'CastSkillButton',
        id: 6,
        userdataHandle: 121,
        depth: 2,
        icon: '□',
        name: 'CastSkill_Normal',
        className: 'ClientUIContainerControl',
        prefabIndex: 1073741852,
        x: 0,
        y: 0,
        width: 300,
        height: 46,
        active: true,
        visible: true,
        script: null
      },
      {
        key: 'CastSkill_Normal_Label',
        parentKey: 'CastSkill_Normal',
        id: 7,
        userdataHandle: 122,
        depth: 3,
        icon: 'T',
        name: 'Label',
        className: 'ClientUITextBoxControl',
        prefabIndex: 1073741849,
        x: 0,
        y: 0,
        width: 300,
        height: 46,
        bgColor: { r: 58, g: 46, b: 32, a: 245 },
        text: '[ CAST SKILL (CLICK / SPACE) ]',
        fontSize: 13,
        alignH: 'center',
        alignV: 'middle',
        fontColor: { r: 238, g: 217, b: 171, a: 255 },
        script: null
      },
      {
        key: 'CastSkill_Hover',
        parentKey: 'CastSkillButton',
        id: 8,
        userdataHandle: 123,
        depth: 2,
        icon: '□',
        name: 'CastSkill_Hover',
        className: 'ClientUIContainerControl',
        prefabIndex: 1073741852,
        x: 0,
        y: 0,
        width: 300,
        height: 46,
        active: false,
        visible: false,
        script: null
      },
      {
        key: 'CastSkill_Hover_Label',
        parentKey: 'CastSkill_Hover',
        id: 9,
        userdataHandle: 124,
        depth: 3,
        icon: 'T',
        name: 'Label',
        className: 'ClientUITextBoxControl',
        prefabIndex: 1073741849,
        x: 0,
        y: 0,
        width: 300,
        height: 46,
        bgColor: { r: 112, g: 84, b: 42, a: 255 },
        text: '<b>▶ [ CAST SKILL (CLICK / SPACE) ] ◀</b>',
        fontSize: 13,
        alignH: 'center',
        alignV: 'middle',
        fontColor: { r: 255, g: 238, b: 185, a: 255 },
        script: null
      },
      {
        key: 'CastSkill_Pressed',
        parentKey: 'CastSkillButton',
        id: 10,
        userdataHandle: 125,
        depth: 2,
        icon: '□',
        name: 'CastSkill_Pressed',
        className: 'ClientUIContainerControl',
        prefabIndex: 1073741852,
        x: 0,
        y: 0,
        width: 300,
        height: 46,
        active: false,
        visible: false,
        script: null
      },
      {
        key: 'CastSkill_Pressed_Label',
        parentKey: 'CastSkill_Pressed',
        id: 11,
        userdataHandle: 126,
        depth: 3,
        icon: 'T',
        name: 'Label',
        className: 'ClientUITextBoxControl',
        prefabIndex: 1073741849,
        x: 0,
        y: 0,
        width: 300,
        height: 46,
        bgColor: { r: 165, g: 62, b: 42, a: 255 },
        text: '<b>⚡ [ SKILL CASTING! ] ⚡</b>',
        fontSize: 13,
        alignH: 'center',
        alignV: 'middle',
        fontColor: { r: 255, g: 245, b: 220, a: 255 },
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
        clickAudioId: 1001,
        normalStatusNodeKey: 'TogglePause_Normal',
        hoverStatusNodeKey: 'TogglePause_Hover',
        pressedStatusNodeKey: '',
        disabledStatusNodeKey: '',
        previewButtonState: 'normal',
        script: null
      },
      {
        key: 'TogglePause_Normal',
        parentKey: 'TogglePauseButton',
        id: 12,
        userdataHandle: 127,
        depth: 2,
        icon: '□',
        name: 'TogglePause_Normal',
        className: 'ClientUIContainerControl',
        prefabIndex: 1073741852,
        x: 0,
        y: 0,
        width: 320,
        height: 46,
        active: true,
        visible: true,
        script: null
      },
      {
        key: 'TogglePause_Normal_Label',
        parentKey: 'TogglePause_Normal',
        id: 13,
        userdataHandle: 128,
        depth: 3,
        icon: 'T',
        name: 'Label',
        className: 'ClientUITextBoxControl',
        prefabIndex: 1073741849,
        x: 0,
        y: 0,
        width: 320,
        height: 46,
        bgColor: { r: 46, g: 38, b: 32, a: 245 },
        text: '[ TOGGLE SetActive(false) (CLICK / F) ]',
        fontSize: 13,
        alignH: 'center',
        alignV: 'middle',
        fontColor: { r: 210, g: 190, b: 150, a: 255 },
        script: null
      },
      {
        key: 'TogglePause_Hover',
        parentKey: 'TogglePauseButton',
        id: 14,
        userdataHandle: 129,
        depth: 2,
        icon: '□',
        name: 'TogglePause_Hover',
        className: 'ClientUIContainerControl',
        prefabIndex: 1073741852,
        x: 0,
        y: 0,
        width: 320,
        height: 46,
        active: false,
        visible: false,
        script: null
      },
      {
        key: 'TogglePause_Hover_Label',
        parentKey: 'TogglePause_Hover',
        id: 15,
        userdataHandle: 130,
        depth: 3,
        icon: 'T',
        name: 'Label',
        className: 'ClientUITextBoxControl',
        prefabIndex: 1073741849,
        x: 0,
        y: 0,
        width: 320,
        height: 46,
        bgColor: { r: 92, g: 68, b: 46, a: 255 },
        text: '[ TOGGLE SetActive(false) (CLICK / F) ]',
        fontSize: 13,
        alignH: 'center',
        alignV: 'middle',
        fontColor: { r: 245, g: 228, b: 185, a: 255 },
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
        resourceId: 100005,
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
-- Why 1 Template? grid.itemPrefabIndex is your reusable "Slot Blueprint" (e.g. TextBox / PresetButton / Container).
-- Calling grid:RefreshItems(count, callback) instantiates 'count' copies and passes each (slotCtrl, index)
-- so you can customize every slot (Minecraft / Terraria inventory style) and detect clicked slot indices!

local grid = nil

local INVENTORY_ITEMS = {
    { name = "Dirt",     qty = 64, r = 139, g = 90,  b = 43  },
    { name = "Stone",    qty = 64, r = 120, g = 126, b = 134 },
    { name = "Pickaxe",  qty = 1,  r = 212, g = 175, b = 55  },
    { name = "Torch",    qty = 16, r = 245, g = 158, b = 11  },
    { name = "Gold Ore", qty = 12, r = 234, g = 179, b = 8   },
    { name = "Potion",   qty = 5,  r = 225, g = 68,  b = 68  },
    { name = "Mana Gem", qty = 3,  r = 56,  g = 189, b = 248 },
    { name = "Wood",     qty = 32, r = 168, g = 112, b = 58  },
    { name = "Gel",      qty = 99, r = 74,  g = 222, b = 128 }
}

function OnStart()
    grid = script.object
    grid.itemPrefabIndex = ${node.itemPrefabIndex || 1073741954}
    grid.interactable = true
    grid.showScrollBar = true
    grid.raycastTarget = true

    grid:RefreshItems(#INVENTORY_ITEMS, function(slotCtrl, index)
        local item = INVENTORY_ITEMS[index + 1] -- index is 0-based (0 .. count-1)
        slotCtrl.name = "Slot_" .. tostring(index)
        slotCtrl.fontSize = 11
        slotCtrl.fontColor = Color.FromRGB(245, 235, 214)
        slotCtrl.bgColor = Color.FromRGBA(item.r, item.g, item.b, 220)
        slotCtrl.text = string.format("#%d %s\\nx%d", index, item.name, item.qty)

        slotCtrl:AddCursorEventListener(Enum.CursorEventType.CursorClick, function()
            local clickedIdx = grid:GetItemIndex(slotCtrl)
            print(string.format("[${node.name}] Clicked Inventory Slot #%d -> %s (x%d)", clickedIdx, item.name, item.qty))
        end)
    end)
end
`;

    case 'ClientUIContainerControl':
      return `---@meta
-- Mounted on ContainerControl: ${node.uiPath} (${node.className}:${node.userdataHandle}, id:${node.id})
-- Function Settings: isolateNavigation, disableKeyEventPassthrough, disableCursorEventPassthrough, showCursor

local container = nil

function OnStart()
    container = script.object
    container.isolateNavigation = ${Boolean(node.isolateNavigation)}
    container.disableKeyEventPassthrough = ${Boolean(node.disableKeyEventPassthrough)}
    container.disableCursorEventPassthrough = ${Boolean(node.disableCursorEventPassthrough)}
    container.showCursor = ${node.showCursor !== undefined ? Boolean(node.showCursor) : true}
${childLookupLine}    print("[${node.uiPath}] ContainerControl started with " .. tostring(#container:GetChildren()) .. " children")
end
`;

    case 'ClientUIAnimationControl': {
      const vfx = getVfxPresetMeta(node.animationId ?? 10001001, 'ClientUIAnimationControl');
      return `---@meta
-- Mounted on AnimationControl: ${node.uiPath} (${node.className}:${node.userdataHandle}, id:${node.id})
-- Localized Particle Effects around control/cursor area (10001001..10001160):
--   • Looping (62 IDs, e.g. 10001001): Continuous particles; turn on/off with :PlayAnimation() / :StopAnimation()
--   • Non-Looping (98 IDs, e.g. 10001008): Plays a 1-shot particle burst and disappears automatically
--   • Layer: Enum.UIAnimationLayer.AboveAllControls (1) or Enum.UIAnimationLayer.BelowAllControls (0)

local anim = nil

function OnStart()
    anim = script.object
    anim.animationId = ${vfx.id || 10001001} -- ${vfx.name} (${vfx.looping ? 'Looping Particle Aura' : '1-Shot Particle Burst'})
    anim.playSoundEffect = ${Boolean(node.playSoundEffect)}
    anim.layer = Enum.UIAnimationLayer.${Number(node.layer) === 1 ? 'AboveAllControls' : 'BelowAllControls'}
    anim:PlayAnimation()
    print("[${node.uiPath}] UIAnimationControl playing animationId=" .. tostring(anim.animationId))
end
`;
    }

    case 'ClientUIFullscreenAnimationControl': {
      const vfx = getVfxPresetMeta(node.animationId ?? 10002001);
      return `---@meta
-- Mounted on FullscreenAnimationControl: ${node.uiPath} (${node.className}:${node.userdataHandle}, id:${node.id})
-- Looping IDs (Bokeh/Corner Dimming): 10002001..10002005, 10002009, 10002014..10002015, 10002018, 10002020..10002023, 10002025..10002029, 10002032, 10002034..10002037
-- Non-Looping IDs (1-2s Screen Glitch/Burst): 10002006..10002008, 10002010..10002013, 10002016..10002017, 10002019, 10002024, 10002030..10002031, 10002033

local fullAnim = nil

function OnStart()
    fullAnim = script.object
    fullAnim.animationId = ${vfx.id || 10002001} -- ${vfx.name} (${vfx.looping ? 'Looping Bokeh' : '1-Shot Screen Glitch'})
    fullAnim.playSoundEffect = ${Boolean(node.playSoundEffect)}
    print("[${node.uiPath}] FullscreenAnimationControl active (animationId=" .. tostring(fullAnim.animationId) .. ")")
end
`;
    }

    case 'ClientUIKeyHintControl': {
      const kbMeta = getKeyboardKeyHintMeta(node.keyboardKeyCode ?? 2);
      const ctrlMeta = getControllerKeyHintMeta(node.controllerKeyCode ?? 6);
      const kbDownEvt = kbMeta.keyEventBase ? `Enum.KeyEventType.${kbMeta.keyEventBase}KeyDown` : 'Enum.KeyEventType.KeyboardNumber1KeyDown';
      const ctrlDownEvt = ctrlMeta.keyEventBase ? `Enum.KeyEventType.${ctrlMeta.keyEventBase}KeyDown` : 'Enum.KeyEventType.ControllerActionBottomKeyDown';
      return `---@meta
-- Mounted on KeyHintControl: ${node.uiPath} (${node.className}:${node.userdataHandle}, id:${node.id})
-- Dynamic Player Keybind Showcase: automatically renders the player's actual bound key
-- (e.g., if the player remapped 'R' to '[', KeyHintControl displays '[' instead of static text!)

local keyHint = nil

function OnStart()
    keyHint = script.object
    keyHint.keyboardKeyCode = Enum.KeyboardKeyCode.${kbMeta.enumName} -- (${kbMeta.code}) "${kbMeta.inspectorLabel}"
    keyHint.controllerKeyCode = Enum.ControllerKeyCode.${ctrlMeta.enumName} -- (${ctrlMeta.code}) "${ctrlMeta.inspectorLabel}"
    print("[${node.uiPath}] KeyHintControl active on device: " .. tostring(game.GetDevice()))

    keyHint:AddKeyEventListener(${kbDownEvt}, function(ctrl, eventType)
        print("[${node.uiPath}] Triggered PC action (${kbMeta.inspectorLabel}): " .. tostring(eventType))
        return true
    end)

    keyHint:AddKeyEventListener(${ctrlDownEvt}, function(ctrl, eventType)
        print("[${node.uiPath}] Triggered Gamepad action (${ctrlMeta.inspectorLabel}): " .. tostring(eventType))
        return true
    end)
end
`;
    }

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
  let activeInspectorTab = 'basic'; // 'basic' | 'script' ([img-2])
  let treeSearchQuery = '';
  let addControlTypeIndex = 0;
  const collapsedNodeKeys = new Set([
    'Btn_Normal_Container',
    'Btn_Hover_Container',
    'Btn_Pressed_Container',
    'Btn_Disabled_Container',
    'CastSkill_Normal',
    'CastSkill_Hover',
    'CastSkill_Pressed',
    'TogglePause_Normal',
    'TogglePause_Hover'
  ]);
  const gizmoUiState = {
    waypointPopoverOpen: false,
    transformCollapsed: false,
    createCollapsed: false,
    stageZoom: 1.0,
    stagePanX: 0,
    stagePanY: 0,
    baseFitScale: 0.72
  };

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

  // Build live Lua code snippet reflecting the node's current name, hierarchy path, sibling order, and transform
  const buildNodeLuaTransformSnippet = (project, node) => {
    ensureNodeTransformDefaults(node);
    if (node.key === 'root') {
      return `-- Root Container (${node.name}, id:${node.id})\nlocal root = game.FindClientUIRoot("${node.name}")`;
    }
    const siblings = project.nodes.filter(n => n.parentKey === node.parentKey && n.key !== 'root');
    const sibIndex = Math.max(0, siblings.findIndex(n => n.key === node.key));
    const lookupLine = node.depth === 1
      ? `local ctrl = root:GetChild("${node.name}") -- id:${node.id} (sibling #${sibIndex})`
      : `local ctrl = root:FindChild("${node.uiPath}") -- id:${node.id} (sibling #${sibIndex})`;

    return [
      lookupLine,
      `ctrl:SetAnchorMin(${node.anchorMinX.toFixed(2)}, ${node.anchorMinY.toFixed(2)})`,
      `ctrl:SetAnchorMax(${node.anchorMaxX.toFixed(2)}, ${node.anchorMaxY.toFixed(2)})`,
      `ctrl:SetPivot(${node.pivotX.toFixed(2)}, ${node.pivotY.toFixed(2)})`,
      `ctrl:SetAnchoredPosition(${Math.round(node.x || 0)}, ${Math.round(node.y || 0)})`,
      `ctrl:SetSizeDelta(${Math.round(node.width || 100)}, ${Math.round(node.height || 40)})`,
      (node.scaleX !== 1 || node.scaleY !== 1 || node.mirrorX || node.mirrorY)
        ? `ctrl:SetLocalScale(${((node.mirrorX ? -1 : 1) * (node.scaleX || 1)).toFixed(2)}, ${((node.mirrorY ? -1 : 1) * (node.scaleY || 1)).toFixed(2)}, 1)`
        : null,
      (node.rotationZ && Math.abs(node.rotationZ) > 0.01)
        ? `ctrl:SetLocalRotation(0, 0, ${node.rotationZ.toFixed(1)})`
        : null,
      ...buildControlSpecificLuaLines(node, project),
      node.active === false ? `ctrl:SetActive(false)` : null,
      node.visible === false ? `ctrl:SetVisible(false)` : null
    ].filter(Boolean).join('\n');
  };

  // Check if a node or any of its ancestors is inactive/hidden in the hierarchy
  const isNodeActiveAndVisibleInHierarchy = (project, node) => {
    let curr = node;
    while (curr && curr.key !== 'root') {
      if (curr.active === false || curr.visible === false) return false;
      curr = curr.parentKey ? project.nodes.find(n => n.key === curr.parentKey) : null;
    }
    return true;
  };

  // Find the nearest ancestor ClientUIPresetButtonControl (if node is inside a button's state machine)
  const findAncestorButton = (project, node) => {
    let currKey = node ? node.parentKey : null;
    while (currKey && currKey !== 'root') {
      const pNode = project.nodes.find(n => n.key === currKey);
      if (!pNode) break;
      if (pNode.className === 'ClientUIPresetButtonControl') return pNode;
      currKey = pNode.parentKey;
    }
    return null;
  };

  // If the user selects a child/descendant of a Button status node in the Hierarchy, automatically flip the Button's preview state to that status branch
  const autoFlipButtonPreviewForSelectedNode = (project, selectedNode) => {
    if (!selectedNode || selectedNode.key === 'root') return;
    let curr = selectedNode;
    while (curr && curr.parentKey && curr.parentKey !== 'root') {
      const parent = project.nodes.find(n => n.key === curr.parentKey);
      if (!parent) break;
      if (parent.className === 'ClientUIPresetButtonControl') {
        // curr is the 1-tier direct child of parent button!
        if (parent.normalStatusNodeKey === curr.key) parent.previewButtonState = 'normal';
        else if (parent.hoverStatusNodeKey === curr.key) parent.previewButtonState = 'hover';
        else if (parent.pressedStatusNodeKey === curr.key) parent.previewButtonState = 'pressed';
        else if (parent.disabledStatusNodeKey === curr.key) parent.previewButtonState = 'disabled';
        syncButtonStateMachineChildren(project, parent, parent.previewButtonState);
        break;
      }
      curr = parent;
    }
  };

  // Compute back-to-front paint order from the Hierarchy tree using Layered Ordering:
  // Within any parent container, the TOP layer in the hierarchy list (index 0) renders ON TOP (painted last / highest z-index),
  // and the BOTTOM layer in the hierarchy list (last index) renders AT THE BACK (painted first / lowest z-index).
  const computeLayeredBackToFrontNodes = (project) => {
    const childrenByParent = new Map();
    for (const n of project.nodes) {
      if (n.key === 'root' || n.depth === 0) continue;
      const pKey = n.parentKey || 'root';
      if (!childrenByParent.has(pKey)) childrenByParent.set(pKey, []);
      childrenByParent.get(pKey).push(n);
    }
    const backToFront = [];
    const visitBackToFront = (parentKey) => {
      const kids = childrenByParent.get(parentKey) || [];
      for (let i = kids.length - 1; i >= 0; i--) {
        const child = kids[i];
        backToFront.push(child);
        visitBackToFront(child.key);
      }
    };
    visitBackToFront('root');
    return backToFront;
  };

  // Render Dynamic Draggable Static Stage (all scene controls + active gizmo & waypoint triangles)
  const renderStaticStageHTML = (project, selectedNode) => {
    // Ensure all nodes in the project have their Basic Transform & Control-Specific defaults initialized
    project.nodes.forEach(n => {
      if (n.key !== 'root' && n.depth !== 0) {
        ensureNodeTransformDefaults(n);
        ensureControlSpecificDefaults(n);
      }
    });

    // Sync Button State Machine child nodes before filtering stage controls
    project.nodes.forEach(n => {
      if (n.className === 'ClientUIPresetButtonControl') {
        syncButtonStateMachineChildren(project, n);
      }
    });
    autoFlipButtonPreviewForSelectedNode(project, selectedNode);

    // Order controls in back-to-front layered order (bottom of layer list = back, top of layer list = front)
    const layeredNodes = computeLayeredBackToFrontNodes(project);
    const stageNodes = layeredNodes.filter(n => {
      if (n.key === 'root' || n.depth === 0) return false;
      if (n.key === 'ReferenceControl' && !n.isUserCreated && n.key !== selectedNode.key) return false;
      if (n.key === selectedNode.key) return true;
      return isNodeActiveAndVisibleInHierarchy(project, n);
    });

    const stageItemsHTML = stageNodes.map((node, orderIdx) => {
      ensureNodeTransformDefaults(node);
      ensureControlSpecificDefaults(node);
      const geom = getNodeStageGeometry(project, node);
      const isSel = selectedNode.key === node.key;
      const isHidden = node.visible === false || node.active === false;

      const flipScaleX = node.mirrorX ? -1 : 1;
      const flipScaleY = node.mirrorY ? -1 : 1;
      const innerTransform = (flipScaleX !== 1 || flipScaleY !== 1)
        ? `transform: scale(${flipScaleX}, ${flipScaleY});`
        : '';

      let innerVisual = '';
      if (node.className === 'ClientUIImageControl') {
        innerVisual = renderStageImageVisualHTML(node, innerTransform);
      } else if (node.className === 'ClientUIPresetButtonControl') {
        innerVisual = renderStageButtonVisualHTML(project, node, innerTransform);
      } else if (node.className === 'ClientUIKeyHintControl') {
        innerVisual = renderStageKeyHintVisualHTML(node, innerTransform);
      } else if (
        node.className === 'ClientUIFullscreenAnimationControl' ||
        node.className === 'ClientUIAnimationControl'
      ) {
        innerVisual = renderStageAnimationVisualHTML(node, innerTransform);
      } else if (node.className === 'ClientUIReferenceControl') {
        innerVisual = renderStageReferenceVisualHTML(node, innerTransform);
      } else if (node.className === 'ClientUICursorEventAreaControl') {
        innerVisual = renderStageCursorAreaVisualHTML(node, isSel, innerTransform);
      } else if (node.className === 'ClientUIGridScrollerControl') {
        innerVisual = renderStageGridScrollerVisualHTML(node, innerTransform);
      } else if (
        node.className === 'ClientUITextBoxControl' ||
        node.className === 'ClientUITextWindowControl'
      ) {
        innerVisual = renderStageTextBoxVisualHTML(node, innerTransform);
      } else if (node.className === 'ClientUIContainerControl') {
        // ContainerControl has no fill color in Miliastra; show subtle frame only when selected
        innerVisual = `<div style="width:100%;height:100%;${isSel ? 'border:1px dashed rgba(245,184,46,0.5);' : ''}${innerTransform}"></div>`;
      } else {
        const col = node.imageColor || node.bgColor || { r: 218, g: 175, b: 78, a: 210 };
        const bgStr = `rgba(${col.r}, ${col.g}, ${col.b}, Math.max(0.35, (col.a !== undefined ? col.a : 220) / 255))`;
        innerVisual = `<div style="width:100%;height:100%;background:${bgStr};border:1px solid rgba(255,255,255,0.35);display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff;font-weight:700;${innerTransform}">${escapeHtml(node.text || node.name)}</div>`;
      }

      const pivotOriginX = (node.pivotX * 100).toFixed(2);
      const pivotOriginY = ((1 - node.pivotY) * 100).toFixed(2);
      const rotDeg = -(node.rotationZ || 0);

      // If this node is inside a Button State Machine, let clicks pass through to the Button unless the user explicitly selected that specific child
      const ancestorBtn = findAncestorButton(project, node);
      const passThroughToButton = ancestorBtn && !isSel;
      const pointerStyle = passThroughToButton ? 'pointer-events: none;' : '';
      const hideChildTag = ancestorBtn && !isSel;

      // Strictly preserve true layer z-index (4 + orderIdx) so top layers ALWAYS render on top of bottom layers
      return `
        <div class="mw-static-preset ${isSel ? 'selected' : ''} ${isHidden ? 'is-dimmed-hidden' : ''}"
             data-select-node="${node.key}"
             data-stage-drag-key="${node.key}"
             title="${escapeHtml(node.name)} (id:${node.id}) — Drag inside box to move, drag edges/corners to scale (Shift=uniform), drag top spinner to rotate, drag cyan dot to move pivot"
             style="left: ${geom.leftPct.toFixed(2)}%; top: ${geom.topPct.toFixed(2)}%; width: ${geom.widthPct.toFixed(2)}%; height: ${geom.heightPct.toFixed(2)}%; transform-origin: ${pivotOriginX}% ${pivotOriginY}%; transform: rotate(${rotDeg}deg); z-index: ${4 + orderIdx}; ${pointerStyle}">
          ${!hideChildTag && !isSel ? `<div class="mw-preset-tag-top">${escapeHtml(node.name)} (id:${node.id})${node.script ? ' 📜' : ''}${node.visible === false ? ' [Hidden]' : ''}</div>` : ''}
          <div class="mw-stage-visual-host" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
            ${innerVisual}
          </div>
        </div>
      `;
    }).join('');

    // Render top-level Active Selection Gizmo Overlay at z-index: 38 so gizmo handles & tag are always grabbable on top of all layers
    let activeSelectionGizmoHTML = '';
    if (selectedNode && selectedNode.key !== 'root') {
      ensureNodeTransformDefaults(selectedNode);
      const selGeom = getNodeStageGeometry(project, selectedNode);
      const selPivotOriginX = (selectedNode.pivotX * 100).toFixed(2);
      const selPivotOriginY = ((1 - selectedNode.pivotY) * 100).toFixed(2);
      const selRotDeg = -(selectedNode.rotationZ || 0);
      activeSelectionGizmoHTML = `
        <div class="mw-active-selection-gizmo"
             id="mw-active-selection-gizmo"
             data-gizmo-node-key="${selectedNode.key}"
             data-stage-drag-key="${selectedNode.key}"
             title="${escapeHtml(selectedNode.name)} (id:${selectedNode.id}) — Drag box to move · Edges/Corners to resize (Shift=Uniform) · Top Spinner to rotate · Cyan ◎ for Center"
             style="left: ${selGeom.leftPct.toFixed(2)}%; top: ${selGeom.topPct.toFixed(2)}%; width: ${selGeom.widthPct.toFixed(2)}%; height: ${selGeom.heightPct.toFixed(2)}%; transform-origin: ${selPivotOriginX}% ${selPivotOriginY}%; transform: rotate(${selRotDeg}deg); z-index: 38;">
          <div class="mw-preset-tag-top">${escapeHtml(selectedNode.name)} (id:${selectedNode.id})${selectedNode.script ? ' 📜' : ''}${selectedNode.visible === false ? ' [Hidden]' : ''}</div>
          ${renderSelectedControlGizmoHandlesHTML(selectedNode)}
        </div>
      `;
    }

    const effScale = (gizmoUiState.baseFitScale || 0.72) * (gizmoUiState.stageZoom || 1.0);
    const zoomPct = Math.round((gizmoUiState.stageZoom || 1.0) * 100);

    return `
      <div class="mw-stage-workspace" id="mw-stage-workspace">
        <!-- Viewport Zoom & Middle-Mouse Pan HUD Bar -->
        <div class="mw-stage-viewport-hud">
          <span class="mw-vp-hint" title="Scroll Mouse Wheel to Zoom · Hold Middle Mouse Button (MMB) to Pan">🖱️ Wheel: Zoom · Hold MMB: Pan</span>
          <div class="mw-vp-zoom-controls">
            <button type="button" class="mw-vp-btn" id="mw-zoom-out-btn" title="Zoom Out (-15%)">−</button>
            <span class="mw-vp-zoom-readout" id="mw-zoom-readout" title="Current Viewport Zoom">${zoomPct}%</span>
            <button type="button" class="mw-vp-btn" id="mw-zoom-in-btn" title="Zoom In (+15%)">+</button>
            <button type="button" class="mw-vp-btn mw-vp-reset-btn" id="mw-zoom-reset-btn" title="Reset Viewport Zoom & Pan (100% Fit)">1:1 Fit</button>
          </div>
        </div>

        <div class="mw-stage-frame ${selectedNode.key === 'root' ? 'root-selected' : ''}"
             id="mw-stage-frame"
             data-select-node="root"
             style="transform: translate(${(gizmoUiState.stagePanX || 0).toFixed(1)}px, ${(gizmoUiState.stagePanY || 0).toFixed(1)}px) scale(${effScale.toFixed(4)});">
          <!-- 4 Stage Frame Corner Markers -->
          <div class="mw-gizmo-corner tl"></div>
          <div class="mw-gizmo-corner tr"></div>
          <div class="mw-gizmo-corner bl"></div>
          <div class="mw-gizmo-corner br"></div>

          <!-- Center Crosshair Axis Guides -->
          <div class="mw-stage-axis-h"></div>
          <div class="mw-stage-axis-v"></div>
          <div class="mw-stage-root-label">${escapeHtml(project.rootName)} (id:${project.rootId}) — 960×640 Stage · Top Layer Renders First (On Top)</div>

          <!-- WAYPOINT TRIANGLES & DASHED ALIGNMENT GUIDES FOR SELECTED CONTROL ([img-3, 5, 6, 7, 8]) -->
          ${renderStageGizmoOverlayHTML(project, selectedNode)}

          <!-- STATIC UI CONTROLS SET FOR .LUA INTERACTIONS -->
          ${stageItemsHTML}

          <!-- TOP-LEVEL ACTIVE SELECTION GIZMO OVERLAY -->
          ${activeSelectionGizmoHTML}
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
              (<code>id:${luaNode.id}</code>, <code>${formatControlClassLabel(luaNode.className)}:${luaNode.userdataHandle}</code>)
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

  // Render Right Inspector Panel with [ Basic | Script ] Tabs ([img-2])
  const renderRightInspectorHTML = (project, selectedNode) => {
    ensureNodeTransformDefaults(selectedNode);
    const defaultScriptPath = selectedNode.key === 'root'
      ? `${selectedNode.name}_Script`
      : selectedNode.uiPath.replace(/\//g, '_');

    const luaTransformSnippet = buildNodeLuaTransformSnippet(project, selectedNode);

    return `
      <div class="mw-inspector-header">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px;">
          <input type="text" id="mw-rename-node-input" class="mw-insp-name-input" value="${escapeHtml(selectedNode.name)}" title="Control Name (used by GetChild / FindChild)" spellcheck="false" autocomplete="off" />
          ${selectedNode.key !== 'root' ? `<button id="mw-delete-node-btn" class="mw-insp-more-btn" title="Delete Control from Hierarchy">✕</button>` : `<span class="mw-insp-more-btn" title="Root Container">⋯</span>`}
        </div>

        <div class="mw-inspector-index-row" style="margin-top: 5px;">
          <span>Index <strong>${selectedNode.prefabIndex}</strong></span>
          <button class="mw-copy-index-btn" data-copy="${selectedNode.prefabIndex}" title="Copy PrefabIndex">📋</button>
          <span class="mw-inspector-id-tag" title="Persistent Control ID (unchanged when reordering)">id: ${selectedNode.id}</span>
          <span class="mw-inspector-id-tag" title="Control Type & Handle">${formatControlClassLabel(selectedNode.className)}:${selectedNode.userdataHandle}</span>
        </div>

        <!-- [ Basic | Script ] Pill Switcher ([img-2]) -->
        <div class="mw-insp-tabs" role="tablist">
          <button type="button" class="mw-insp-tab-btn ${activeInspectorTab === 'basic' ? 'active' : ''}" data-insp-tab="basic" role="tab" aria-selected="${activeInspectorTab === 'basic'}">
            Basic
          </button>
          <button type="button" class="mw-insp-tab-btn ${activeInspectorTab === 'script' ? 'active' : ''}" data-insp-tab="script" role="tab" aria-selected="${activeInspectorTab === 'script'}">
            Script ${selectedNode.script ? '●' : ''}
          </button>
        </div>
      </div>

      <div class="mw-inspector-body">
        ${activeInspectorTab === 'basic'
          ? (
              renderBasicInspectorTabHTML(
                project,
                selectedNode,
                gizmoUiState.waypointPopoverOpen,
                gizmoUiState.transformCollapsed,
                gizmoUiState.createCollapsed
              ) +
              renderControlSpecificInspectorHTML(
                project,
                selectedNode,
                gizmoUiState
              )
            )
          : `
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

            <!-- Live Hierarchy & Transform Lua Code Reflection -->
            <div class="mw-insp-section">
              <div class="mw-insp-sec-title">
                <span>⚡ LIVE LUA HIERARCHY & TRANSFORM CODE</span>
                <button class="mw-copy-index-btn" data-copy="${escapeHtml(luaTransformSnippet)}" title="Copy Lua Transform Snippet" style="font-size: 10px; color: var(--accent-gold);">[ COPY ]</button>
              </div>
              <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 6px;">
                Reflects current hierarchy path (<code>${escapeHtml(selectedNode.uiPath)}</code>), sibling order, waypoints, pivot, and transform:
              </div>
              <pre class="mw-insp-code-snippet">${escapeHtml(luaTransformSnippet)}</pre>
            </div>
          `
        }
      </div>
    `;
  };

  const render = () => {
    // Preserve scroll positions of Right Inspector, Left Hierarchy, and Side Selector Panel so clicking never jumps
    const prevInspBody = container.querySelector('.mw-inspector-body');
    const savedInspScrollTop = prevInspBody ? prevInspBody.scrollTop : 0;
    const prevHierScroll = container.querySelector('#mw-hierarchy-scroll');
    const savedHierScrollTop = prevHierScroll ? prevHierScroll.scrollTop : 0;
    const prevSideList = container.querySelector('#mw-side-selector-list');
    const savedSideScrollTop = prevSideList ? prevSideList.scrollTop : 0;

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
          <!-- LEFT COLUMN: Search + Add UIControl + Drag-and-Drop Reorderable & Reparentable Hierarchy Tree -->
          <div class="mw-left-hierarchy">
            <div class="mw-tree-search-row">
              <div class="mw-tree-search-box">
                <span class="mw-search-svg-wrap">${SEARCH_SVG_ICON}</span>
                <input type="text" id="mw-tree-search-input" placeholder="Filter hierarchy..." value="${escapeHtml(treeSearchQuery)}" autocomplete="off" spellcheck="false" />
              </div>
              <span class="mw-tree-filter-btn" title="Drag between nodes to reorder or drop onto a node to reparent">⧩</span>
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
                       title="${isDraggable ? `id:${node.id} • Drag top/bottom edge to reorder siblings, or center to reparent inside folder` : 'Root Container (Drop nodes here to parent under Root)'}"
                       style="padding-left: ${6 + indent}px;">
                    <span class="mw-tree-caret ${nodeHasChildren ? 'clickable' : ''}" data-toggle-key="${nodeHasChildren ? node.key : ''}" title="${nodeHasChildren ? 'Expand / Collapse Children' : ''}">${actualCaret}</span>
                    <span class="mw-tree-icon">${node.icon}</span>
                    <span class="mw-tree-label">${escapeHtml(node.name)}</span>
                    ${node.script ? `<span class="mw-tree-script-badge" data-open-script-key="${node.key}" title="Attached Script: ${escapeHtml(node.script.filename)} (Click to view/edit)">📜</span>` : ''}
                    ${isDraggable ? `
                      <span class="mw-tree-reorder-btns">
                        <button type="button" class="mw-tree-mini-btn" data-tree-move-dir="up" data-tree-move-key="${node.key}" title="Move Up (switch places with previous sibling; id:${node.id} unchanged)">▲</button>
                        <button type="button" class="mw-tree-mini-btn" data-tree-move-dir="down" data-tree-move-key="${node.key}" title="Move Down (switch places with next sibling; id:${node.id} unchanged)">▼</button>
                      </span>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- CENTER COLUMN: Draggable Static Stage Preview OR Editable .lua Script -->
          <div class="mw-center-stage">
            ${centerContentHTML}
          </div>

          <!-- DETACHED SIDE SELECTOR BLOCK NEXT TO RIGHT MENU ([img-5]) -->
          ${activeInspectorTab === 'basic' ? renderSideSelectorPanelHTML(project, selectedNode, gizmoUiState) : ''}

          <!-- RIGHT COLUMN: [ Basic | Script ] Inspector -->
          <div class="mw-right-inspector" id="mw-inspector-mount">
            ${renderRightInspectorHTML(project, selectedNode)}
          </div>
        </div>

        <!-- BOTTOM 1/3 SCREEN IMAGE ASSET LIBRARY SELECTOR DRAWER ([img-3], [img-4]) -->
        ${renderBottomAssetLibraryDrawerHTML(selectedNode, gizmoUiState)}
      </div>
    `;

    // Restore scroll positions immediately before paint
    const nextInspBody = container.querySelector('.mw-inspector-body');
    if (nextInspBody && savedInspScrollTop > 0) {
      nextInspBody.scrollTop = savedInspScrollTop;
    }
    const nextHierScroll = container.querySelector('#mw-hierarchy-scroll');
    if (nextHierScroll && savedHierScrollTop > 0) {
      nextHierScroll.scrollTop = savedHierScrollTop;
    }
    const nextSideList = container.querySelector('#mw-side-selector-list');
    if (nextSideList && savedSideScrollTop > 0) {
      nextSideList.scrollTop = savedSideScrollTop;
    }

    bindWorkspaceEvents();
  };

  const bindInspectorEvents = () => {
    const inspMount = container.querySelector('#mw-inspector-mount');
    if (!inspMount) return;

    // Switch between [ Basic | Script ] tabs ([img-2])
    inspMount.querySelectorAll('[data-insp-tab]').forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        activeInspectorTab = tabBtn.dataset.inspTab;
        gizmoUiState.waypointPopoverOpen = false;
        render();
      });
    });

    inspMount.querySelectorAll('.mw-copy-index-btn[data-copy]').forEach(btn => {
      btn.addEventListener('click', () => {
        copyToClipboard(btn.dataset.copy, 'Snippet / Index');
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
    bindTransformAndStageGizmoEvents({
      container,
      getActiveProject,
      getSelectedNode,
      setSelectedNodeKey: (k) => { selectedNodeKey = k; },
      clearActiveLuaFile: () => { activeLuaFileNodeKey = null; },
      isDescendantOf,
      normalizeProjectHierarchy,
      state: gizmoUiState,
      render,
      showToast
    });
    bindControlSpecificInspectorEvents({
      container,
      project: getActiveProject(),
      selectedNode: getSelectedNode(),
      setSelectedNodeKey: (k) => { selectedNodeKey = k; },
      normalizeProjectHierarchy,
      state: gizmoUiState,
      render,
      showToast
    });

    // Project dropdown selector
    const projSelect = container.querySelector('#mw-project-select');
    if (projSelect) {
      projSelect.addEventListener('change', () => {
        activeProjectIndex = parseInt(projSelect.value, 10) || 0;
        const proj = getActiveProject();
        selectedNodeKey = (proj.nodes.find(n => n.script)?.key) || 'root';
        activeLuaFileNodeKey = null;
        gizmoUiState.waypointPopoverOpen = false;
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

        const newNode = ensureNodeTransformDefaults({
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
          active: true,
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
        });

        project.nodes.push(newNode);

        // If adding a ClientUIPresetButtonControl, scaffold its default 1-tier Normal & Hover status child containers
        if (newNode.className === 'ClientUIPresetButtonControl') {
          const w = newNode.width || 156;
          const h = newNode.height || 44;
          const baseId = nextId + 1;
          const baseH = nextHandle + 7;
          const normContKey = `node_${Date.now()}_${baseId}`;
          const normBgKey = `node_${Date.now()}_${baseId + 1}`;
          const normTxtKey = `node_${Date.now()}_${baseId + 2}`;
          const hovContKey = `node_${Date.now()}_${baseId + 3}`;
          const hovBgKey = `node_${Date.now()}_${baseId + 4}`;
          const hovTxtKey = `node_${Date.now()}_${baseId + 5}`;

          project.nodes.push(
            ensureNodeTransformDefaults({
              key: normContKey,
              parentKey: newNode.key,
              id: baseId,
              userdataHandle: baseH,
              depth: newNode.depth + 1,
              icon: '□',
              name: 'Normal_Container',
              className: 'ClientUIContainerControl',
              prefabIndex: 1073741852,
              x: 0,
              y: 0,
              width: w,
              height: h,
              active: true,
              visible: true,
              isUserCreated: true,
              script: null
            }),
            ensureNodeTransformDefaults({
              key: normTxtKey,
              parentKey: normContKey,
              id: baseId + 2,
              userdataHandle: baseH + 14,
              depth: newNode.depth + 2,
              icon: 'T',
              name: 'Normal_Label',
              className: 'ClientUITextBoxControl',
              prefabIndex: 1073741849,
              x: 0,
              y: 0,
              width: w,
              height: h,
              text: `Button (${nextId})`,
              fontSize: 14,
              alignH: 'center',
              alignV: 'middle',
              fontColor: { r: 245, g: 238, b: 220, a: 255 },
              bgColor: { r: 0, g: 0, b: 0, a: 0 },
              active: true,
              visible: true,
              isUserCreated: true,
              script: null
            }),
            ensureNodeTransformDefaults({
              key: normBgKey,
              parentKey: normContKey,
              id: baseId + 1,
              userdataHandle: baseH + 7,
              depth: newNode.depth + 2,
              icon: '▣',
              name: 'Normal_Bg',
              className: 'ClientUIImageControl',
              prefabIndex: 1073741850,
              x: 0,
              y: 0,
              width: w,
              height: h,
              resourceId: 100001,
              imageColor: { r: 58, g: 48, b: 36, a: 245 },
              active: true,
              visible: true,
              isUserCreated: true,
              script: null
            }),
            ensureNodeTransformDefaults({
              key: hovContKey,
              parentKey: newNode.key,
              id: baseId + 3,
              userdataHandle: baseH + 21,
              depth: newNode.depth + 1,
              icon: '□',
              name: 'Hover_Container',
              className: 'ClientUIContainerControl',
              prefabIndex: 1073741852,
              x: 0,
              y: 0,
              width: w,
              height: h,
              active: false,
              visible: false,
              isUserCreated: true,
              script: null
            }),
            ensureNodeTransformDefaults({
              key: hovTxtKey,
              parentKey: hovContKey,
              id: baseId + 5,
              userdataHandle: baseH + 35,
              depth: newNode.depth + 2,
              icon: 'T',
              name: 'Hover_Label',
              className: 'ClientUITextBoxControl',
              prefabIndex: 1073741849,
              x: 0,
              y: 0,
              width: w,
              height: h,
              text: `<b>▶ Button (${nextId}) ◀</b>`,
              fontSize: 14,
              alignH: 'center',
              alignV: 'middle',
              fontColor: { r: 255, g: 235, b: 175, a: 255 },
              bgColor: { r: 0, g: 0, b: 0, a: 0 },
              active: true,
              visible: true,
              isUserCreated: true,
              script: null
            }),
            ensureNodeTransformDefaults({
              key: hovBgKey,
              parentKey: hovContKey,
              id: baseId + 4,
              userdataHandle: baseH + 28,
              depth: newNode.depth + 2,
              icon: '▣',
              name: 'Hover_Bg',
              className: 'ClientUIImageControl',
              prefabIndex: 1073741850,
              x: 0,
              y: 0,
              width: w,
              height: h,
              resourceId: 100001,
              imageColor: { r: 122, g: 92, b: 44, a: 255 },
              active: true,
              visible: true,
              isUserCreated: true,
              script: null
            })
          );

          newNode.normalStatusNodeKey = normContKey;
          newNode.hoverStatusNodeKey = hovContKey;
          newNode.previewButtonState = 'normal';
          collapsedNodeKeys.add(normContKey);
          collapsedNodeKeys.add(hovContKey);
          syncButtonStateMachineChildren(project, newNode, 'normal');
        }

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
        activeInspectorTab = 'script';
        render();
      });
    });

    // Quick inline ▲ / ▼ sibling switch buttons on hierarchy rows (keeps id unchanged)
    container.querySelectorAll('[data-tree-move-key]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = btn.dataset.treeMoveKey;
        const dir = btn.dataset.treeMoveDir;
        const proj = getActiveProject();
        const node = proj.nodes.find(n => n.key === key);
        if (!node || node.key === 'root') return;

        const siblings = proj.nodes.filter(n => n.parentKey === node.parentKey && n.key !== 'root');
        const idx = siblings.findIndex(n => n.key === node.key);
        const swapSibling = dir === 'up' ? siblings[idx - 1] : siblings[idx + 1];
        if (!swapSibling) return;

        const aIdx = proj.nodes.indexOf(node);
        const bIdx = proj.nodes.indexOf(swapSibling);
        if (aIdx !== -1 && bIdx !== -1) {
          proj.nodes[aIdx] = swapSibling;
          proj.nodes[bIdx] = node;
          normalizeProjectHierarchy(proj);
          selectedNodeKey = node.key;
          render();
        }
      });
    });

    // Left Hierarchy UI Control click + Drag-and-Drop Reordering (before/after) & Reparenting (inside)
    let draggedTreeKey = null;
    container.querySelectorAll('.mw-tree-item').forEach(row => {
      row.addEventListener('click', () => {
        selectedNodeKey = row.dataset.nodeKey;
        activeLuaFileNodeKey = null;
        gizmoUiState.waypointPopoverOpen = false;
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
        container.querySelectorAll('.mw-tree-item').forEach(el => {
          el.classList.remove('drag-over-target', 'drag-over-before', 'drag-over-after');
        });
      });

      row.addEventListener('dragover', (e) => {
        const targetKey = row.dataset.nodeKey;
        const sourceKey = draggedTreeKey;
        if (!sourceKey || !targetKey || sourceKey === targetKey) return;
        const proj = getActiveProject();
        if (isDescendantOf(proj, targetKey, sourceKey)) return;

        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

        const r = row.getBoundingClientRect();
        const relY = (e.clientY - r.top) / Math.max(1, r.height);
        row.classList.remove('drag-over-target', 'drag-over-before', 'drag-over-after');

        if (targetKey === 'root') {
          row.classList.add('drag-over-target');
        } else if (relY < 0.26) {
          row.classList.add('drag-over-before');
        } else if (relY > 0.74) {
          row.classList.add('drag-over-after');
        } else {
          row.classList.add('drag-over-target');
        }
      });

      row.addEventListener('dragleave', () => {
        row.classList.remove('drag-over-target', 'drag-over-before', 'drag-over-after');
      });

      row.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const dropBefore = row.classList.contains('drag-over-before');
        const dropAfter = row.classList.contains('drag-over-after');
        row.classList.remove('drag-over-target', 'drag-over-before', 'drag-over-after');

        const targetKey = row.dataset.nodeKey;
        const sourceKey = draggedTreeKey || (e.dataTransfer && e.dataTransfer.getData('text/plain'));
        if (!sourceKey || !targetKey || sourceKey === targetKey) return;

        const proj = getActiveProject();
        if (isDescendantOf(proj, targetKey, sourceKey)) return;

        const sourceNode = proj.nodes.find(n => n.key === sourceKey);
        const targetNode = proj.nodes.find(n => n.key === targetKey);
        if (!sourceNode || !targetNode) return;

        if ((dropBefore || dropAfter) && targetNode.key !== 'root') {
          // Reorder as sibling before or after targetNode (preserving id!)
          sourceNode.parentKey = targetNode.parentKey || 'root';
          proj.nodes = proj.nodes.filter(n => n.key !== sourceNode.key);
          const targetIdx = proj.nodes.findIndex(n => n.key === targetNode.key);
          const insertIdx = dropBefore ? targetIdx : targetIdx + 1;
          proj.nodes.splice(Math.max(1, insertIdx), 0, sourceNode);
          normalizeProjectHierarchy(proj);
          selectedNodeKey = sourceNode.key;
          render();
          showToast(`Reordered ${sourceNode.name} ${dropBefore ? 'before' : 'after'} ${targetNode.name}`);
        } else {
          // Reparent inside targetNode
          sourceNode.parentKey = targetNode.key;
          collapsedNodeKeys.delete(targetNode.key);
          normalizeProjectHierarchy(proj);
          selectedNodeKey = sourceNode.key;
          render();
          showToast(`Moved ${sourceNode.name} inside ${targetNode.name}`);
        }
      });
    });

    // Center Static Stage: Viewport Zoom (Wheel / HUD buttons), Middle-Mouse-Button Pan, Click to Select, & Drag to Move
    const stageWorkspace = container.querySelector('#mw-stage-workspace');
    const stageFrame = container.querySelector('#mw-stage-frame');

    const applyStageViewportTransform = () => {
      if (!stageFrame || !stageWorkspace) return;
      const wsRect = stageWorkspace.getBoundingClientRect();
      if (wsRect.width > 80 && wsRect.height > 80) {
        const fitW = (wsRect.width - 36) / STAGE_WIDTH;
        const fitH = (wsRect.height - 52) / STAGE_HEIGHT;
        gizmoUiState.baseFitScale = Math.max(0.32, Math.min(1.15, Math.min(fitW, fitH)));
      }
      const effScale = (gizmoUiState.baseFitScale || 0.72) * (gizmoUiState.stageZoom || 1.0);
      stageFrame.style.transform = `translate(${(gizmoUiState.stagePanX || 0).toFixed(1)}px, ${(gizmoUiState.stagePanY || 0).toFixed(1)}px) scale(${effScale.toFixed(4)})`;
      const zoomReadout = container.querySelector('#mw-zoom-readout');
      if (zoomReadout) {
        zoomReadout.textContent = `${Math.round((gizmoUiState.stageZoom || 1.0) * 100)}%`;
      }
    };

    if (stageWorkspace && stageFrame) {
      applyStageViewportTransform();

      // Mouse Wheel Zoom on Viewport (zooms smoothly toward cursor position)
      stageWorkspace.addEventListener('wheel', (e) => {
        e.preventDefault();
        const prevZoom = gizmoUiState.stageZoom || 1.0;
        const zoomFactor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        const nextZoom = Math.max(0.35, Math.min(3.5, Math.round(prevZoom * zoomFactor * 100) / 100));
        if (Math.abs(nextZoom - prevZoom) < 0.001) return;

        // Adjust pan so point under cursor stays anchored while zooming
        const wsRect = stageWorkspace.getBoundingClientRect();
        const cursorRelX = e.clientX - (wsRect.left + wsRect.width * 0.5);
        const cursorRelY = e.clientY - (wsRect.top + wsRect.height * 0.5);
        const ratio = nextZoom / prevZoom;
        gizmoUiState.stagePanX = cursorRelX - (cursorRelX - (gizmoUiState.stagePanX || 0)) * ratio;
        gizmoUiState.stagePanY = cursorRelY - (cursorRelY - (gizmoUiState.stagePanY || 0)) * ratio;
        gizmoUiState.stageZoom = nextZoom;
        applyStageViewportTransform();
      }, { passive: false });

      // Hold Middle Mouse Button (e.button === 1) to Pan Viewport
      stageWorkspace.addEventListener('mousedown', (e) => {
        if (e.button !== 1) return;
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const startPanX = gizmoUiState.stagePanX || 0;
        const startPanY = gizmoUiState.stagePanY || 0;
        stageWorkspace.classList.add('is-panning');

        const onPanMove = (moveEvt) => {
          gizmoUiState.stagePanX = startPanX + (moveEvt.clientX - startX);
          gizmoUiState.stagePanY = startPanY + (moveEvt.clientY - startY);
          applyStageViewportTransform();
        };

        const onPanUp = () => {
          stageWorkspace.classList.remove('is-panning');
          window.removeEventListener('mousemove', onPanMove);
          window.removeEventListener('mouseup', onPanUp);
        };

        window.addEventListener('mousemove', onPanMove);
        window.addEventListener('mouseup', onPanUp);
      });

      // Prevent default browser middle-click autoscroll behavior
      stageWorkspace.addEventListener('auxclick', (e) => {
        if (e.button === 1) e.preventDefault();
      });

      // Zoom HUD Buttons (- / + / 1:1 Fit)
      const zoomOutBtn = container.querySelector('#mw-zoom-out-btn');
      if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          gizmoUiState.stageZoom = Math.max(0.35, Math.round(((gizmoUiState.stageZoom || 1.0) - 0.15) * 100) / 100);
          applyStageViewportTransform();
        });
      }

      const zoomInBtn = container.querySelector('#mw-zoom-in-btn');
      if (zoomInBtn) {
        zoomInBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          gizmoUiState.stageZoom = Math.min(3.5, Math.round(((gizmoUiState.stageZoom || 1.0) + 0.15) * 100) / 100);
          applyStageViewportTransform();
        });
      }

      const zoomResetBtn = container.querySelector('#mw-zoom-reset-btn');
      if (zoomResetBtn) {
        zoomResetBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          gizmoUiState.stageZoom = 1.0;
          gizmoUiState.stagePanX = 0;
          gizmoUiState.stagePanY = 0;
          applyStageViewportTransform();
        });
      }
    }

    if (stageFrame) {
      stageFrame.addEventListener('click', (e) => {
        if (e.target === stageFrame) {
          selectedNodeKey = 'root';
          activeLuaFileNodeKey = null;
          gizmoUiState.waypointPopoverOpen = false;
          render();
        }
      });

      container.querySelectorAll('[data-stage-drag-key]').forEach(presetEl => {
        presetEl.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return;
          // Ignore if mousedown happened on a resize edge/corner, rotation spinner, or pivot dot
          if (e.target.closest('[data-resize-dir], [data-gizmo-rotate], [data-gizmo-pivot]')) {
            return;
          }
          e.stopPropagation();

          const nodeKey = presetEl.dataset.stageDragKey;
          const proj = getActiveProject();
          const node = proj.nodes.find(n => n.key === nodeKey);
          if (!node) return;
          ensureNodeTransformDefaults(node);

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
            const deltaStageX = (dxPx / rect.width) * STAGE_WIDTH;
            const deltaStageY = -(dyPx / rect.height) * STAGE_HEIGHT;

            node.x = Math.round((startNodeX + deltaStageX) * 100) / 100;
            node.y = Math.round((startNodeY + deltaStageY) * 100) / 100;

            const geom = getNodeStageGeometry(proj, node);
            container.querySelectorAll(`[data-stage-drag-key="${node.key}"]`).forEach(el => {
              el.style.left = `${geom.leftPct.toFixed(2)}%`;
              el.style.top = `${geom.topPct.toFixed(2)}%`;
            });

            // Also move any descendant elements on stage 1:1 in real time
            for (const descNode of proj.nodes) {
              if (descNode.key === node.key || descNode.key === 'root') continue;
              if (isDescendantOf(proj, descNode.key, node.key)) {
                const dGeom = getNodeStageGeometry(proj, descNode);
                container.querySelectorAll(`[data-stage-drag-key="${descNode.key}"]`).forEach(dEl => {
                  dEl.style.left = `${dGeom.leftPct.toFixed(2)}%`;
                  dEl.style.top = `${dGeom.topPct.toFixed(2)}%`;
                });
              }
            }

            if (selectedNodeKey === node.key) {
              const locXInput = container.querySelector('#mw-inp-loc-x');
              const locYInput = container.querySelector('#mw-inp-loc-y');
              const locX = 800 + node.x * (1600 / STAGE_WIDTH);
              const locY = 450 + node.y * (900 / STAGE_HEIGHT);
              if (locXInput) locXInput.value = locX.toFixed(2);
              if (locYInput) locYInput.value = locY.toFixed(2);
            }
          };

          const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            selectedNodeKey = node.key;
            activeLuaFileNodeKey = null;
            gizmoUiState.waypointPopoverOpen = false;
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
        proj.nodes.forEach(n => {
          if (n.key !== 'root' && n.depth !== 0) {
            ensureNodeTransformDefaults(n);
            ensureControlSpecificDefaults(n);
          }
        });
        if (typeof window !== 'undefined') {
          window.__miliastra_active_project = proj;
        }
        const primaryScript = (proj.nodes.find(n => n.script)?.script.code) || '';
        openLuaRunnerModal(
          primaryScript,
          `${proj.title}`,
          () => primaryScript,
          () => {
            normalizeProjectHierarchy(proj);
            proj.nodes.forEach(n => {
              if (n.key !== 'root' && n.depth !== 0) {
                ensureNodeTransformDefaults(n);
                ensureControlSpecificDefaults(n);
              }
            });
            return proj;
          }
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
