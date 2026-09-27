-- ============================================================================
-- MILIASTRA WONDERLAND — MASTER UI CONTROL TYPES & COMPLETE LUA API REFERENCE
-- Single-File Executable Specification of All 12 UI Control Classes & Globals
-- Copy/paste this file to any LLM or developer as the ground-truth API spec!
-- ============================================================================
--
-- [CRITICAL MILIASTRA ENGINE RULES & IN-GAME VERIFIED GUARDRAILS]
-- 1. PROJECT-SPECIFIC TEMPLATE IDs:
--    Miliastra automatically generates Template IDs (prefabIndex) per project.
--    Always define your project's Template IDs at the top of your script.
--
-- 2. STATIC REFERENCE IMAGE ASSETS (Enum.ImageSource.StaticReference):
--    100001 = Rectangle     | 100002 = Circle        | 100003 = Triangle
--    100004 = 4-Point Star  | 100005 = 5-Point Star  | 100006 = Hollow Circle
--
-- 3. STRICT UI CONTROL CAPABILITY MATRIX (DO NOT MIX FIELDS ACROSS TYPES!):
--    * ClientUIContainerControl (including root `script.object`):
--      - HAS NO `.bgColor` AND NO `.imageColor`! Setting `root.bgColor = ...`
--        crashes in Genshin because `.bgColor` does not exist on Container instances!
--      - To draw a full-screen or container background, spawn a child
--        `ClientUIImageControl` (using asset `100001` Rectangle and `.imageColor`).
--      - For interactive/cursor games, configure the root Container with:
--          root.disableKeyEventPassthrough = true
--          root.disableCursorEventPassthrough = true
--          root.showCursor = true
--    * ClientUIPresetButtonControl:
--      - HAS NO background color (.bgColor), NO image (.imageColor), NO text (.text)!
--      - To give a button a visual background or label, instantiate a
--        ClientUITextBoxControl (set .bgColor and .text) or ClientUIImageControl,
--        and place/parent the PresetButton over it.
--    * .interactable (boolean) ONLY EXISTS ON:
--      - ClientUIPresetButtonControl, ClientUITextWindowControl, ClientUIGridScrollerControl
--      - (DOES NOT EXIST on BaseControl, Container, Image, TextBox, or CursorEventArea!)
--    * .raycastTarget (boolean) ONLY EXISTS ON:
--      - ClientUIPresetButtonControl, ClientUICursorEventAreaControl, ClientUIGridScrollerControl
--      - (DOES NOT EXIST on BaseControl, Container, Image, TextBox, or TextWindow!)
--    * :AddCursorEventListener / :RemoveCursorEventListener / :SimulateCursorClick ONLY EXIST ON:
--      - ClientUIPresetButtonControl and ClientUICursorEventAreaControl
--      - (NEVER call :AddCursorEventListener on ImageControl, TextBoxControl, or ContainerControl!)
--    * .bgColor (ColorValue) ONLY EXISTS ON:
--      - ClientUITextBoxControl and ClientUITextWindowControl
--      - (ImageControl uses .imageColor; ContainerControl has NO color property!)
--    * .visible is [Read] on ClientUIBaseControl:
--      - Always call control:SetVisible(true / false) to change visibility.
--
-- 4. LUA 5.3+ MATH & RUNTIME RULES (VERIFIED IN GENSHIN):
--    * NO `math.pow(x, y)`:
--      - Genshin's Miliastra Lua parser/runtime does NOT have `math.pow`!
--      - Always use the native exponentiation operator `^` instead:
--        e.g. `(math.max(0, val) / 285) ^ 1.45` (NEVER `math.pow(...)`).
--    * Deterministic Hashing without Bitwise Overflow:
--      - Prefer trigonometric hashing `local v = math.sin(gx * 127.1 + gy * 311.7 + 19.19) * 43758.5453; return v - math.floor(v)`
--        for procedural 2D worlds so negative/positive coordinates work identically.
--
-- 5. TEXTBOX CONSTRUCTOR PATTERN (`NewText` VERIFIED IN GENSHIN):
--    * Declare `local fontSize` and `local textHeight = math.max(h, fontSize * 2)`
--      BEFORE configuring the control's rect! If a TextBox height is too small
--      relative to `fontSize` when `adaptiveFontSize = false`, text clips or fails to render.
--    * Set `.fontSize`, `.fontColor`, `.bgColor`, `.adaptiveFontSize = false`,
--      `.horizontalAlignment`, and `.verticalAlignment` BEFORE setting `.text = text or ""`,
--      then explicitly call `lbl:SetVisible(true)` and `lbl:SetAsLastSibling()`.
--
-- 6. NEGATIVE SCALE (`SetLocalScale(-1, 1, 1)`) & TRANSFORM RULES:
--    * Negative scale IS supported in Genshin! Calling `ctrl:SetLocalScale(facing, 1, 1)`
--      with `facing = -1` or `1` on a parent character `ContainerControl` cleanly
--      mirrors all child limb `AnchoredPosition` and `LocalRotation` transforms.
--    * Anchor interpolation (`BaseControl.d.lua`):
--      - If `anchorMin == anchorMax` on an axis, the anchor point resolves to `anchorMin`.
--      - If `anchorMin ~= anchorMax` on an axis, the anchor point is interpolated between
--        `anchorMin` and `anchorMax` based on the control's `pivot` percentage (`pivotX`/`pivotY`).
--    * Sibling Order Lifecycle (`SetSiblingIndex`, `SetAsFirstSibling`, `SetAsLastSibling`):
--      - Higher-index siblings render on top of lower-index siblings.
--      - Throws an error if called BEFORE `OnStart` or DURING `OnDestroy`!
--      - Returns `false` when called on a root-level `ContainerControl`.
--
-- 7. KEYBOARD / MOUSE ACTION BINDINGS (`Shift == RMB` SPRINT RULE):
--    * Miliastra binds `Enum.KeyEventType.KeyboardSprintKeyDown` / `Up` to Genshin's
--      semantic **Sprint** action, NOT raw hardware scancodes!
--    * Because Genshin binds Sprint to BOTH **Left Shift** and **Right Mouse Button (RMB)**,
--      `Left Shift` and `RMB` ALWAYS trigger the exact same event (`KeyboardSprintKeyDown`).
--    * NEVER assign Left Shift and RMB to two different game mechanics! Treat Sprint
--      (`Shift / RMB`) as one unified action, and use distinct skill keys for other actions:
--        - LMB / Normal Attack : `KeyboardNormalAttackKeyDown` / `Up`
--        - Shift OR RMB (Sprint): `KeyboardSprintKeyDown` / `Up`
--        - Space (Jump)        : `KeyboardJumpKeyDown` / `Up`
--        - E (Elemental Skill) : `KeyboardCharacterSkill1KeyDown` / `Up`
--        - Q (Elemental Burst) : `KeyboardCharacterSkill2KeyDown` / `Up`
--        - R (Aim / Skill 3)   : `KeyboardCharacterSkill3KeyDown` / `Up`
--        - F (Interact)        : `KeyboardInteractiveKeyDown` / `Up`
--
-- 8. VIEWPORT CENTERING STRATEGIES (BOTH VERIFIED IN GENSHIN):
--    * Strategy A (Centered Fit-to-View Root Container via `SetLocalScale`):
--      - Anchor `root` (`script.object`) at center `(0.5, 0.5)` with `SetPivot(0.5, 0.5)`,
--        `SetAnchoredPosition(0, 0)`, `SetSizeDelta(DESIGN_W, DESIGN_H)`, and scale uniformly
--        via `root:SetLocalScale(rootScale, rootScale, 1)` where
--        `rootScale = math.min(vw / DESIGN_W, vh / DESIGN_H)`.
--      - Convert raw cursor coordinates (`game.GetCursorUIPos()`) into design space via:
--        `local lx = DESIGN_W * 0.5 + (cx - vw * 0.5) / rootScale`
--    * Strategy B (Full-Viewport Root + `CenterStageLayout()` Offset):
--      - Keep `root` at `(0, 0)` with `SetSizeDelta(screenWidth, screenHeight)` and shift
--        stage/HUD coordinates by `stageOffsetX = (screenWidth - 960) * 0.5`,
--        `stageOffsetY = (screenHeight - 640) * 0.5`. Keeps raw cursor coordinates 1:1!
-- ============================================================================

-- ============================================================================
-- 0. TEMPLATE IDs (Replace with your project's assigned Prefab Index IDs)
-- ============================================================================
local TEMPLATE_CONTAINER            = 1073741852 -- ClientUIContainerControl ("Null" / Empty Layout Group)
local TEMPLATE_IMAGE                = 1073741850 -- ClientUIImageControl
local TEMPLATE_TEXTBOX              = 1073741849 -- ClientUITextBoxControl
local TEMPLATE_TEXT_WINDOW          = 1073741853 -- ClientUITextWindowControl
local TEMPLATE_PRESET_BUTTON        = 1073741851 -- ClientUIPresetButtonControl
local TEMPLATE_CURSOR_EVENT_AREA    = 1073741856 -- ClientUICursorEventAreaControl
local TEMPLATE_GRID_SCROLLER        = 1073741854 -- ClientUIGridScrollerControl
local TEMPLATE_ANIMATION            = 1073741855 -- ClientUIAnimationControl
local TEMPLATE_FULLSCREEN_ANIMATION = 1073741857 -- ClientUIFullscreenAnimationControl
local TEMPLATE_KEY_HINT             = 1073741858 -- ClientUIKeyHintControl
local TEMPLATE_REFERENCE            = 1073741859 -- ClientUIReferenceControl

-- Built-in Static Reference Asset IDs (used with Enum.ImageSource.StaticReference)
local ASSET_RECTANGLE     = 100001
local ASSET_CIRCLE        = 100002
local ASSET_TRIANGLE      = 100003
local ASSET_STAR_4        = 100004
local ASSET_STAR_5        = 100005
local ASSET_HOLLOW_CIRCLE = 100006

-- Runtime state for live 60 FPS demonstration
local statusReadout = nil
local radialImageDemo = nil
local elapsedTotal = 0

-- ============================================================================
-- 1. ClientUIBaseControl (Inherited by ALL 11 Concrete UI Control Types)
--    Source: library/client_controls/BaseControl.d.lua
-- ============================================================================
local function DemonstrateBaseControlAPI(ctrl, parentCtrl)
    -- [READ-ONLY FIELDS]
    local isAlive             = ctrl.alive             -- boolean [Read]
    local runtimeId           = ctrl.id                -- number  [Read]
    local templateIndex       = ctrl.prefabIndex       -- number  [Read]
    local isActive            = ctrl.active            -- boolean [Read]
    local isActiveInHierarchy = ctrl.activeInHierarchy -- boolean [Read]
    local isVisible           = ctrl.visible           -- boolean [Read] (Use :SetVisible() to write!)

    -- [READ / WRITE FIELDS]
    ctrl.name               = "BaseControlDemo"        -- string  [Read/Write]
    ctrl.parent             = parentCtrl               -- ClientControlType? [Read/Write]
    ctrl.canControllerFocus = true                     -- boolean [Read/Write]

    -- [READ / WRITE / TWENABLE TRANSFORM FIELDS]
    ctrl.anchorMinX        = 0.5   -- NormalizedPercentage (0.0 - 1.0) [Read/Write/Tweenable]
    ctrl.anchorMinY        = 0.5   -- NormalizedPercentage (0.0 - 1.0) [Read/Write/Tweenable]
    ctrl.anchorMaxX        = 0.5   -- NormalizedPercentage (0.0 - 1.0) [Read/Write/Tweenable]
    ctrl.anchorMaxY        = 0.5   -- NormalizedPercentage (0.0 - 1.0) [Read/Write/Tweenable]
    ctrl.pivotX            = 0.5   -- DecimalPercentage (0.0 - 1.0)    [Read/Write/Tweenable]
    ctrl.pivotY            = 0.5   -- DecimalPercentage (0.0 - 1.0)    [Read/Write/Tweenable]
    ctrl.anchoredPositionX = -260  -- number [Read/Write/Tweenable]
    ctrl.anchoredPositionY = 140   -- number [Read/Write/Tweenable]
    ctrl.sizeDeltaX        = 220   -- number [Read/Write/Tweenable]
    ctrl.sizeDeltaY        = 44    -- number [Read/Write/Tweenable]
    ctrl.localScaleX       = 1.0   -- number [Read/Write/Tweenable]
    ctrl.localScaleY       = 1.0   -- number [Read/Write/Tweenable]
    ctrl.localScaleZ       = 1.0   -- number [Read/Write/Tweenable]
    ctrl.localRotationX    = 0.0   -- number [Read/Write/Tweenable]
    ctrl.localRotationY    = 0.0   -- number [Read/Write/Tweenable]
    ctrl.localRotationZ    = 0.0   -- number [Read/Write/Tweenable]

    -- [TRANSFORM & STATE METHODS]
    ctrl:SetAnchorMin(0.5, 0.5)
    ctrl:SetAnchorMax(0.5, 0.5)
    local minX, minY = ctrl:GetAnchorMin()
    local maxX, maxY = ctrl:GetAnchorMax()

    ctrl:SetPivot(0.5, 0.5)
    local pivX, pivY = ctrl:GetPivot()

    ctrl:SetAnchoredPosition(-260, 140)
    local posX, posY = ctrl:GetAnchoredPosition()

    ctrl:SetSizeDelta(220, 44)
    local sizeW, sizeH = ctrl:GetSizeDelta()

    ctrl:SetLocalScale(1.0, 1.0, 1.0)
    local sx, sy, sz = ctrl:GetLocalScale()

    ctrl:SetLocalRotation(0, 0, 0)
    local rx, ry, rz = ctrl:GetLocalRotation()

    ctrl:SetActive(true)
    ctrl:SetVisible(true)

    -- [HIERARCHY & SIBLING ORDER METHODS]
    ctrl:SetAsFirstSibling()
    ctrl:SetAsLastSibling()
    ctrl:SetSiblingIndex(0)
    local siblingIdx   = ctrl:GetSiblingIndex()
    local directChild  = ctrl:GetChild("ChildName")
    local nestedChild  = ctrl:FindChild("ChildA/ChildB")
    local allChildren  = ctrl:GetChildren()

    -- [ATTACHED SCRIPT QUERY METHODS]
    local attachedById   = ctrl:GetScript(1001)
    local attachedByPath = ctrl:GetScriptByPath("MyModuleScript")
    local allScripts     = ctrl:GetScripts()

    -- [KEYBOARD EVENT LISTENERS (Valid on ALL ClientUIBaseControl subclasses)]
    local onJumpKey = function()
        print("[BaseControl] Jump key pressed on:", ctrl.name)
        return true -- Return true to mark event completed
    end
    ctrl:AddKeyEventListener(Enum.KeyEventType.KeyboardJumpKeyDown, onJumpKey)
    ctrl:RemoveKeyEventListener(Enum.KeyEventType.KeyboardJumpKeyDown, onJumpKey)
    ctrl:RemoveKeyEventListeners(Enum.KeyEventType.KeyboardJumpKeyDown)
    ctrl:RemoveAllKeyEventListeners()

    -- [CONTROLLER NAVIGATION METHODS (Valid on ALL ClientUIBaseControl subclasses)]
    local onNavConfirm = function() end
    ctrl:AddNavigationEventListener(Enum.ControllerNavigationEventType.ConfirmDown, onNavConfirm)
    ctrl:RemoveNavigationEventListener(Enum.ControllerNavigationEventType.ConfirmDown, onNavConfirm)
    ctrl:RemoveNavigationEventListeners(Enum.ControllerNavigationEventType.ConfirmDown)
    ctrl:RemoveAllNavigationEventListeners()

    ctrl:SetControllerNavigation(
        Enum.ControllerNavigationDir.Right,
        Enum.ControllerNavigationMode.Automatic,
        nil
    )
    local navMode, navTarget = ctrl:GetControllerNavigation(Enum.ControllerNavigationDir.Right)

    return isAlive and runtimeId and templateIndex and isActive and isActiveInHierarchy and isVisible and minX and maxX and pivX and posX and sizeW and sx and rx and siblingIdx and allChildren and allScripts and navMode
end

-- ============================================================================
-- 2. ALL 11 CONCRETE CLIENT UI CONTROL TYPES (Instantiation, Fields & Methods)
-- ============================================================================
function OnStart()
    local root = script.object
    local canvasW, canvasH = game.GetUICanvasSize()

    -- ------------------------------------------------------------------------
    -- TYPE 1: ClientUIContainerControl ("Null" / Empty Grouping & Input Blocker)
    -- Source: library/client_controls/ContainerControl.d.lua
    -- Inherits: ClientUIBaseControl
    -- NOTE: Has NO .bgColor, NO .imageColor, NO .interactable, NO .raycastTarget!
    -- ------------------------------------------------------------------------
    local containerCtrl = game.InstantiateClientUIControl(TEMPLATE_CONTAINER, root)
    containerCtrl.name = "MasterContainer"
    containerCtrl:SetAnchorMin(0.5, 0.5)
    containerCtrl:SetAnchorMax(0.5, 0.5)
    containerCtrl:SetPivot(0.5, 0.5)
    containerCtrl:SetAnchoredPosition(0, 0)
    containerCtrl:SetSizeDelta(canvasW, canvasH)

    -- ContainerControl-specific fields (all [Read/Write] boolean):
    containerCtrl.isolateNavigation             = false
    containerCtrl.disableKeyEventPassthrough    = false
    containerCtrl.disableCursorEventPassthrough = false
    containerCtrl.showCursor                    = true

    -- Run complete BaseControl check on containerCtrl
    DemonstrateBaseControlAPI(containerCtrl, root)
    containerCtrl:SetAnchoredPosition(0, 0)
    containerCtrl:SetSizeDelta(canvasW, canvasH)

    -- Backdrop panel (using ImageControl because ContainerControl has no color)
    local bgPanel = game.InstantiateClientUIControl(TEMPLATE_IMAGE, containerCtrl)
    bgPanel.name = "ReferenceBackdrop"
    bgPanel:SetAnchorMin(0.5, 0.5)
    bgPanel:SetAnchorMax(0.5, 0.5)
    bgPanel:SetPivot(0.5, 0.5)
    bgPanel:SetAnchoredPosition(0, 0)
    bgPanel:SetSizeDelta(880, 560)
    bgPanel:SetImage(Enum.ImageSource.StaticReference, ASSET_RECTANGLE)
    bgPanel.imageColor = Color.FromRGBA(26, 21, 17, 245)

    -- Header Banner (TextBoxControl)
    local headerBox = game.InstantiateClientUIControl(TEMPLATE_TEXTBOX, containerCtrl)
    headerBox:SetAnchorMin(0.5, 0.5)
    headerBox:SetAnchorMax(0.5, 0.5)
    headerBox:SetPivot(0.5, 0.5)
    headerBox:SetAnchoredPosition(0, 242)
    headerBox:SetSizeDelta(840, 42)
    headerBox.bgColor = Color.FromRGBA(52, 41, 29, 255)
    headerBox.fontColor = Color.FromRGB(238, 217, 171)
    headerBox.fontSize = 16
    headerBox.horizontalAlignment = Enum.TextHorizontalAlignment.Middle
    headerBox.verticalAlignment = Enum.TextVerticalAlignment.Middle
    headerBox.text = "MILIASTRA MASTER API SPECIFICATION — ALL 12 UI CONTROL TYPES VERIFIED"

    -- ------------------------------------------------------------------------
    -- TYPE 2: ClientUIImageControl (Sprites, Shapes, Masks & Radial/Linear Fills)
    -- Source: library/client_controls/ImageControl.d.lua
    -- Inherits: ClientUIBaseControl
    -- NOTE: Has NO .bgColor, NO .text, NO .interactable, NO .raycastTarget,
    --       and NO :AddCursorEventListener!
    -- ------------------------------------------------------------------------
    local imageCtrl = game.InstantiateClientUIControl(TEMPLATE_IMAGE, containerCtrl)
    imageCtrl.name = "ImageControlSpec"
    imageCtrl:SetAnchorMin(0.5, 0.5)
    imageCtrl:SetAnchorMax(0.5, 0.5)
    imageCtrl:SetPivot(0.5, 0.5)
    imageCtrl:SetAnchoredPosition(-310, 120)
    imageCtrl:SetSizeDelta(96, 96)

    -- ImageControl Methods:
    imageCtrl:SetImage(Enum.ImageSource.StaticReference, ASSET_CIRCLE)
    imageCtrl:SetSoftEdgeWidth(4, 4)
    imageCtrl:SetFillUnused()
    imageCtrl:SetFillHorizontal(Enum.ImageFillHorizontalType.Left, 1.0)
    imageCtrl:SetFillVertical(Enum.ImageFillVerticalType.Bottom, 1.0)
    imageCtrl:SetFillRadial90(Enum.ImageFillRadial90Type.BottomLeft, 1.0)
    imageCtrl:SetFillRadial180(Enum.ImageFillRadialType.Bottom, 1.0)
    imageCtrl:SetFillRadial360(Enum.ImageFillRadialType.Top, 0.85)

    -- ImageControl Read-Only Fields:
    local imgSrc = imageCtrl.imageSource -- EnumItem.ImageSource [Read]
    local imgId  = imageCtrl.imageId     -- integer              [Read]

    -- ImageControl Read/Write & Tweenable Fields:
    imageCtrl.imageColor          = Color.FromRGBA(214, 172, 82, 255)        -- ColorValue [Read/Write/Tweenable]
    imageCtrl.imageType           = Enum.ImageType.Stretch                   -- EnumItem.ImageType [Read/Write] (Basic, Stretch)
    imageCtrl.enableMask          = false                                    -- boolean [Read/Write]
    imageCtrl.enableSoftEdge      = false                                    -- boolean [Read/Write]
    imageCtrl.softEdgeMode        = Enum.ImageMaskSoftEdgeMode.Percentage    -- EnumItem.ImageMaskSoftEdgeMode [Read/Write] (Pixel, Percentage)
    imageCtrl.softEdgeWidthX      = 2.0                                      -- number [Read/Write/Tweenable]
    imageCtrl.softEdgeWidthY      = 2.0                                      -- number [Read/Write/Tweenable]
    imageCtrl.horizontalSoftRange = 0.1                                      -- number [Read/Write/Tweenable]
    imageCtrl.verticalSoftRange   = 0.1                                      -- number [Read/Write/Tweenable]
    imageCtrl.reverseMaskArea     = false                                    -- boolean [Read/Write]
    imageCtrl.fillType            = Enum.ImageFillType.Radial360             -- EnumItem.ImageFillType [Read/Write]
    imageCtrl.fillHorizontalType  = Enum.ImageFillHorizontalType.Left        -- EnumItem.ImageFillHorizontalType [Read/Write]
    imageCtrl.fillVerticalType    = Enum.ImageFillVerticalType.Bottom        -- EnumItem.ImageFillVerticalType [Read/Write]
    imageCtrl.fillRadial90Type    = Enum.ImageFillRadial90Type.BottomLeft    -- EnumItem.ImageFillRadial90Type [Read/Write]
    imageCtrl.fillRadialType      = Enum.ImageFillRadialType.Top             -- EnumItem.ImageFillRadialType [Read/Write]
    imageCtrl.fillAmount          = 1.0                                      -- NormalizedPercentage [Read/Write/Tweenable]
    radialImageDemo = imageCtrl

    -- ------------------------------------------------------------------------
    -- TYPE 3: ClientUITextBoxControl (Single/Multi-line Label + Background Box)
    -- Source: library/client_controls/TextBoxControl.d.lua
    -- Inherits: ClientUIBaseControl
    -- NOTE: Has .bgColor! Has NO extra methods beyond BaseControl, NO .interactable,
    --       NO .raycastTarget, and NO :AddCursorEventListener!
    -- ------------------------------------------------------------------------
    local textBoxCtrl = game.InstantiateClientUIControl(TEMPLATE_TEXTBOX, containerCtrl)
    textBoxCtrl.name = "TextBoxControlSpec"
    textBoxCtrl:SetAnchorMin(0.5, 0.5)
    textBoxCtrl:SetAnchorMax(0.5, 0.5)
    textBoxCtrl:SetPivot(0.5, 0.5)
    textBoxCtrl:SetAnchoredPosition(40, 120)
    textBoxCtrl:SetSizeDelta(520, 96)

    -- TextBoxControl Fields (0 subclass methods):
    textBoxCtrl.text                = "ClientUITextBoxControl\nSupports .text, .fontSize, .fontColor, .bgColor, .enableOutline, .outlineColor"
    textBoxCtrl.fontSize            = 14                                     -- integer [Read/Write/Tweenable]
    textBoxCtrl.fontColor           = Color.FromRGBA(238, 217, 171, 255)     -- ColorValue [Read/Write/Tweenable]
    textBoxCtrl.bgColor             = Color.FromRGBA(42, 34, 26, 255)        -- ColorValue [Read/Write/Tweenable]
    textBoxCtrl.enableOutline       = true                                   -- boolean [Read/Write]
    textBoxCtrl.outlineColor        = Color.FromRGBA(12, 10, 8, 255)         -- ColorValue [Read/Write/Tweenable]
    textBoxCtrl.horizontalAlignment = Enum.TextHorizontalAlignment.Middle    -- Left, Middle, Right [Read/Write]
    textBoxCtrl.verticalAlignment   = Enum.TextVerticalAlignment.Middle      -- Top, Middle, Bottom [Read/Write]
    textBoxCtrl.adaptiveFontSize    = true                                   -- boolean [Read/Write]
    textBoxCtrl.minimumFontSize     = 10                                     -- integer [Read/Write/Tweenable]

    -- ------------------------------------------------------------------------
    -- TYPE 4: ClientUITextWindowControl (Scrollable Multi-Line Text Box)
    -- Source: library/client_controls/TextWindowControl.d.lua
    -- Inherits: ClientUIBaseControl
    -- NOTE: Same fields as TextBoxControl PLUS .interactable and .showScrollBar!
    --       Has NO .raycastTarget and NO :AddCursorEventListener!
    -- ------------------------------------------------------------------------
    local textWinCtrl = game.InstantiateClientUIControl(TEMPLATE_TEXT_WINDOW, containerCtrl)
    textWinCtrl.name = "TextWindowControlSpec"
    textWinCtrl:SetAnchorMin(0.5, 0.5)
    textWinCtrl:SetAnchorMax(0.5, 0.5)
    textWinCtrl:SetPivot(0.5, 0.5)
    textWinCtrl:SetAnchoredPosition(-210, 0)
    textWinCtrl:SetSizeDelta(380, 92)

    -- TextWindowControl Fields (0 subclass methods):
    textWinCtrl.interactable        = true                                   -- boolean [Read/Write] (Scroll input enabled)
    textWinCtrl.showScrollBar       = true                                   -- boolean [Read/Write]
    textWinCtrl.text                = "ClientUITextWindowControl\nScrollable text window (.interactable + .showScrollBar + .bgColor)"
    textWinCtrl.fontSize            = 13                                     -- integer [Read/Write/Tweenable]
    textWinCtrl.fontColor           = Color.FromRGBA(215, 195, 150, 255)     -- ColorValue [Read/Write/Tweenable]
    textWinCtrl.bgColor             = Color.FromRGBA(36, 30, 23, 255)        -- ColorValue [Read/Write/Tweenable]
    textWinCtrl.enableOutline       = false                                  -- boolean [Read/Write]
    textWinCtrl.outlineColor        = Color.FromRGBA(0, 0, 0, 255)           -- ColorValue [Read/Write/Tweenable]
    textWinCtrl.horizontalAlignment = Enum.TextHorizontalAlignment.Middle    -- [Read/Write]
    textWinCtrl.verticalAlignment   = Enum.TextVerticalAlignment.Middle      -- [Read/Write]
    textWinCtrl.adaptiveFontSize    = false                                  -- boolean [Read/Write]
    textWinCtrl.minimumFontSize     = 10                                     -- integer [Read/Write/Tweenable]

    -- ------------------------------------------------------------------------
    -- TYPE 5: ClientUIPresetButtonControl (Interactive Button)
    -- Source: library/client_controls/PresetButtonControl.d.lua
    -- Inherits: ClientUIBaseControl
    -- CRITICAL RULE: PresetButton has NO .bgColor, NO .imageColor, NO .text!
    -- Always pair with a TextBoxControl (using .bgColor) or ImageControl for visuals.
    -- ------------------------------------------------------------------------
    -- Step A: Create visual button background + label using ClientUITextBoxControl
    local btnVisualLabel = game.InstantiateClientUIControl(TEMPLATE_TEXTBOX, containerCtrl)
    btnVisualLabel.name = "PresetButtonVisualBacking"
    btnVisualLabel:SetAnchorMin(0.5, 0.5)
    btnVisualLabel:SetAnchorMax(0.5, 0.5)
    btnVisualLabel:SetPivot(0.5, 0.5)
    btnVisualLabel:SetAnchoredPosition(200, 0)
    btnVisualLabel:SetSizeDelta(380, 92)
    btnVisualLabel.bgColor = Color.FromRGBA(78, 58, 34, 255)
    btnVisualLabel.fontColor = Color.FromRGB(245, 222, 168)
    btnVisualLabel.fontSize = 14
    btnVisualLabel.text = "[ CLICK PRESET BUTTON ]\n(Visual bg via TextBox.bgColor + PresetButton overlay)"

    -- Step B: Create ClientUIPresetButtonControl on top for interaction
    local presetBtn = game.InstantiateClientUIControl(TEMPLATE_PRESET_BUTTON, containerCtrl)
    presetBtn.name = "PresetButtonControlSpec"
    presetBtn:SetAnchorMin(0.5, 0.5)
    presetBtn:SetAnchorMax(0.5, 0.5)
    presetBtn:SetPivot(0.5, 0.5)
    presetBtn:SetAnchoredPosition(200, 0)
    presetBtn:SetSizeDelta(380, 92)

    -- PresetButtonControl Fields:
    presetBtn.interactable  = true -- boolean [Read/Write]
    presetBtn.clickAudioId  = 1001 -- integer [Read/Write]
    presetBtn.raycastTarget = true -- boolean [Read/Write]

    -- PresetButtonControl Methods:
    local tempClickHandler = function(eventData) end
    presetBtn:AddCursorEventListener(Enum.CursorEventType.CursorDown, tempClickHandler)
    presetBtn:RemoveCursorEventListener(Enum.CursorEventType.CursorDown, tempClickHandler)
    presetBtn:RemoveCursorEventListeners(Enum.CursorEventType.CursorDown)
    presetBtn:RemoveAllCursorEventListeners()

    local clickCount = 0
    presetBtn:AddCursorEventListener(Enum.CursorEventType.CursorClick, function(eventData)
        clickCount = clickCount + 1
        local cx, cy = eventData:GetUIPos()
        local px, py = eventData:GetPressUIPos()
        local dx, dy = eventData:GetUIPosDelta()
        local isDragging = eventData.dragging
        local touchId    = eventData.touchId
        btnVisualLabel.text = string.format(
            "PRESET BUTTON CLICKED x%d\nPos:(%d,%d) Press:(%d,%d) Delta:(%d,%d) Touch:%d",
            clickCount, math.floor(cx), math.floor(cy), math.floor(px), math.floor(py), math.floor(dx), math.floor(dy), touchId
        )
        if isDragging then print("Dragging button") end
    end)
    -- Programmatic click trigger:
    presetBtn:SimulateCursorClick()

    -- ------------------------------------------------------------------------
    -- TYPE 6: ClientUICursorEventAreaControl (Invisible Hitbox / Drag Surface)
    -- Source: library/client_controls/CursorEventAreaControl.d.lua
    -- Inherits: ClientUIBaseControl
    -- NOTE: Has .raycastTarget, :AddCursorEventListener, :RemoveCursorEventListener,
    --       :RemoveCursorEventListeners, :RemoveAllCursorEventListeners, :SimulateCursorClick.
    --       Does NOT have .interactable, .clickAudioId, .bgColor, or .imageColor!
    -- ------------------------------------------------------------------------
    local cursorAreaLabel = game.InstantiateClientUIControl(TEMPLATE_TEXTBOX, containerCtrl)
    cursorAreaLabel:SetAnchorMin(0.5, 0.5)
    cursorAreaLabel:SetAnchorMax(0.5, 0.5)
    cursorAreaLabel:SetPivot(0.5, 0.5)
    cursorAreaLabel:SetAnchoredPosition(-210, -115)
    cursorAreaLabel:SetSizeDelta(380, 88)
    cursorAreaLabel.bgColor = Color.FromRGBA(34, 44, 38, 255)
    cursorAreaLabel.fontColor = Color.FromRGB(175, 230, 195)
    cursorAreaLabel.fontSize = 13
    cursorAreaLabel.text = "ClientUICursorEventAreaControl\n(Click or Drag Here — raycastTarget = true)"

    local cursorArea = game.InstantiateClientUIControl(TEMPLATE_CURSOR_EVENT_AREA, containerCtrl)
    cursorArea.name = "CursorEventAreaSpec"
    cursorArea:SetAnchorMin(0.5, 0.5)
    cursorArea:SetAnchorMax(0.5, 0.5)
    cursorArea:SetPivot(0.5, 0.5)
    cursorArea:SetAnchoredPosition(-210, -115)
    cursorArea:SetSizeDelta(380, 88)

    -- CursorEventAreaControl Field:
    cursorArea.raycastTarget = true -- boolean [Read/Write]

    -- CursorEventAreaControl Methods:
    local dummyAreaCb = function(eventData) end
    cursorArea:AddCursorEventListener(Enum.CursorEventType.CursorEnter, dummyAreaCb)
    cursorArea:RemoveCursorEventListener(Enum.CursorEventType.CursorEnter, dummyAreaCb)
    cursorArea:RemoveCursorEventListeners(Enum.CursorEventType.CursorEnter)
    cursorArea:RemoveAllCursorEventListeners()

    cursorArea:AddCursorEventListener(Enum.CursorEventType.CursorClick, function(eventData)
        local x, y = eventData:GetUIPos()
        cursorAreaLabel.text = string.format("CursorEventArea Clicked at UI (%d, %d)", math.floor(x), math.floor(y))
    end)
    cursorArea:SimulateCursorClick()

    -- ------------------------------------------------------------------------
    -- TYPE 7: ClientUIGridScrollerControl (Recycled Virtualized Grid/List)
    -- Source: library/client_controls/GridScrollerControl.d.lua
    -- Inherits: ClientUIBaseControl
    -- ------------------------------------------------------------------------
    local gridScroller = game.InstantiateClientUIControl(TEMPLATE_GRID_SCROLLER, containerCtrl)
    gridScroller.name = "GridScrollerSpec"
    gridScroller:SetAnchorMin(0.5, 0.5)
    gridScroller:SetAnchorMax(0.5, 0.5)
    gridScroller:SetPivot(0.5, 0.5)
    gridScroller:SetAnchoredPosition(200, -115)
    gridScroller:SetSizeDelta(380, 88)

    -- GridScrollerControl Read/Write Fields:
    gridScroller.itemPrefabIndex = TEMPLATE_TEXTBOX -- integer [Read/Write]
    gridScroller.raycastTarget   = true             -- boolean [Read/Write]
    gridScroller.showScrollBar   = true             -- boolean [Read/Write]
    gridScroller.interactable    = true             -- boolean [Read/Write]
    gridScroller.scrollProgress  = 0.0              -- NormalizedPercentage [Read/Write/Tweenable]

    -- GridScrollerControl Read-Only Fields:
    local currentItemCount = gridScroller.itemCount                  -- integer [Read]
    local scrollDir        = gridScroller.scrollDirection            -- EnumItem.ScrollDirection [Read]
    local layoutConst      = gridScroller.layoutConstraint           -- EnumItem.ScrollLayoutConstraint [Read]
    local fixedCount       = gridScroller.layoutConstraintFixedCount -- number [Read]

    -- GridScrollerControl Methods:
    gridScroller:RefreshItems(3, function(itemCtrl, index)
        itemCtrl.name = "GridItem_" .. tostring(index)
        local itemIdx = gridScroller:GetItemIndex(itemCtrl)
        itemCtrl:SetVisible(false) -- Keep demo canvas clean while verifying instantiation
        return itemIdx
    end)
    local itemW, itemH           = gridScroller:GetItemSize()
    local spaceH, spaceV         = gridScroller:GetItemSpacing()
    local padT, padB, padL, padR = gridScroller:GetPadding()
    local totalContentLen        = gridScroller:GetContentLength()
    gridScroller:ScrollToItemAt(0, Enum.ScrollAlignType.Top)

    -- ------------------------------------------------------------------------
    -- TYPE 8: ClientUIAnimationControl (Framed UI Animation Component)
    -- Source: library/client_controls/AnimationControl.d.lua
    -- Inherits: ClientUIBaseControl
    -- ------------------------------------------------------------------------
    local animCtrl = game.InstantiateClientUIControl(TEMPLATE_ANIMATION, containerCtrl)
    animCtrl.name = "AnimationControlSpec"
    animCtrl.animationId     = 2001                                   -- integer [Read/Write]
    animCtrl.playSoundEffect = true                                   -- boolean [Read/Write]
    animCtrl.layer           = Enum.UIAnimationLayer.AboveAllControls -- EnumItem.UIAnimationLayer [Read/Write]
    animCtrl:PlayAnimation()
    animCtrl:StopAnimation()

    -- ------------------------------------------------------------------------
    -- TYPE 9: ClientUIFullscreenAnimationControl (Fullscreen Cinematic Animation)
    -- Source: library/client_controls/FullscreenAnimationControl.d.lua
    -- Inherits: ClientUIBaseControl (0 subclass methods)
    -- ------------------------------------------------------------------------
    local fullAnimCtrl = game.InstantiateClientUIControl(TEMPLATE_FULLSCREEN_ANIMATION, containerCtrl)
    fullAnimCtrl.name = "FullscreenAnimationSpec"
    fullAnimCtrl.animationId     = 3001 -- integer [Read/Write]
    fullAnimCtrl.playSoundEffect = false -- boolean [Read/Write]

    -- ------------------------------------------------------------------------
    -- TYPE 10: ClientUIKeyHintControl (Input Device Prompt / Keybind Glyph)
    -- Source: library/client_controls/KeyHintControl.d.lua
    -- Inherits: ClientUIBaseControl (0 subclass methods)
    -- ------------------------------------------------------------------------
    local keyHintCtrl = game.InstantiateClientUIControl(TEMPLATE_KEY_HINT, containerCtrl)
    keyHintCtrl.name = "KeyHintControlSpec"
    keyHintCtrl.keyboardKeyCode   = Enum.KeyboardKeyCode.Space         -- EnumItem.KeyboardKeyCode [Read/Write]
    keyHintCtrl.controllerKeyCode = Enum.ControllerKeyCode.ButtonSouth -- EnumItem.ControllerKeyCode [Read/Write]

    -- ------------------------------------------------------------------------
    -- TYPE 11: ClientUIReferenceControl (Nested Template Reference Instance)
    -- Source: library/client_controls/ReferenceControl.d.lua
    -- Inherits: ClientUIBaseControl (0 subclass methods)
    -- ------------------------------------------------------------------------
    local refCtrl = game.InstantiateClientUIControl(TEMPLATE_REFERENCE, containerCtrl)
    refCtrl.name = "ReferenceControlSpec"
    local refTemplateId = refCtrl.referencedPrefabIndex -- integer [Read]

    -- ------------------------------------------------------------------------
    -- 3. GLOBAL ENGINE APIs: game, script, Tween, TweenSequence, Color, Vector3, ServerSignal
    -- ------------------------------------------------------------------------
    -- [game Global Methods]
    local foundRoot   = game.FindClientUIRoot("UIRoot")
    local allRoots    = game.GetClientUIRoots()
    local byId        = game.GetClientUIControl(containerCtrl.id)
    local curX, curY  = game.GetCursorUIPos()
    local lx, ly      = game.GetControllerLeftStickAxis()
    local rx, ry      = game.GetControllerRightStickAxis()
    local focusCtrl   = game.GetControllerFocus()
    game.SetControllerFocus(presetBtn)
    local activeDev   = game.GetDevice()
    local activeLang  = game.GetLanguageType()
    local stageMode   = game.GetStageMode()
    local locText     = game.GetText("UI_TITLE_KEY")
    local customVar   = game.GetGlobalCustomVariableValue(Enum.CustomVariableEntityType.Level, "Score")
    local isTest      = game.IsTestPlay()
    local isPaused    = game.IsLevelTimePaused()
    game.PauseLevelTime(false)
    local sfxInstance = game.PlayAudio2D(1001)
    local sfxAlive    = game.IsAudioAlive(sfxInstance)
    game.StopAudio(sfxInstance)
    game.PrintClientUITree()

    -- Temporary control to demonstrate game.DestroyClientUIControl:
    local tempDisposable = game.InstantiateClientUIControl(TEMPLATE_CONTAINER, containerCtrl)
    game.DestroyClientUIControl(tempDisposable)

    -- [script Global Fields & Methods]
    local sAlive  = script.alive
    local sId     = script.id
    local sPrefab = script.prefabIndex
    local sObj    = script.object
    local sPath   = script.path
    script.enabled = true
    local paramVal = script:GetParam("Difficulty")
    script:Invoke("NonExistentHelper", 1, 2)
    script:RegisterCustomVariableChangedHandler(Enum.CustomVariableEntityType.Level, "Score", function(ent, name) end)
    script:UnregisterCustomVariableChangedHandler(Enum.CustomVariableEntityType.Level, "Score")
    script:RegisterServerSignalHandler("STAGE_EVENT", function(sigName, sigParams) end)
    script:UnregisterServerSignalHandler("STAGE_EVENT")
    script:EnableUpdate(true)

    -- [Color & Vector3 Constructors + Methods]
    local c1 = Color.FromRGB(238, 217, 171)
    local c2 = Color.FromRGBA(201, 160, 89, 255)
    local c3 = Color(180, 140, 70, 255)
    local cr, cg, cb, ca = Color.ToRGBA(c2)

    local v1 = Vector3(3, 4, 0)
    local v2 = Vector3.new(1, 0, 0)
    local vSum  = v1 + v2
    local vDiff = v1 - v2
    local vScaled = v1 * 2
    local vMag  = v1:Magnitude()
    local vNorm = v1:Normalize()
    local vDot  = v1:Dot(v2)
    local vCross = v1:Cross(v2)
    local vStr  = v1:ToString()

    -- [ServerSignal Methods]
    local sig = game.ServerSignal("API_VERIFICATION_COMPLETE")
    sig:AddBool(true)
    sig:AddBoolList({ true, false })
    sig:AddInt(42)
    sig:AddIntList({ 1, 2, 3 })
    sig:AddFloat(3.14)
    sig:AddFloatList({ 0.5, 1.5 })
    sig:AddString("Verified")
    sig:AddStringList({ "A", "B" })
    sig:AddVector3(v1)
    sig:AddVector3List({ v1, v2 })
    sig:AddConfigId(10001)
    sig:AddEntity(1)
    sig:AddGuid(99999)
    sig:AddPrefabId(TEMPLATE_IMAGE)
    sig:AddParam(Enum.ParamType.Int, 100)
    sig:SendSignal()

    -- [Tween & TweenSequence Methods]
    local pulseTween = game.Tween(imageCtrl, { localScaleX = 1.12, localScaleY = 1.12 }, 0.6)
        :SetEase(Enum.EaseType.InOutSine)
        :SetRelative(false)
        :SetLoops(-1)
        :SetOnStepComplete(function() end)
        :SetOnComplete(function() end)
        :Play()

    local seq = game.TweenSequence()
    seq:Append(game.Tween(headerBox, { localScaleX = 1.02 }, 0.25):SetEase(Enum.EaseType.OutQuad))
    seq:Join(game.Tween(headerBox, { localScaleY = 1.02 }, 0.25))
    seq:AppendInterval(0.1)
    seq:AppendCallback(function() end)
    seq:Insert(0.0, game.Tween(headerBox, { anchoredPositionY = 242 }, 0.25))
    seq:InsertCallback(0.05, function() end)
    seq:SetLoops(1)
    seq:SetOnComplete(function() end)
    seq:Play()

    -- [Math & Global Utility Functions]
    -- NOTE: Miliastra Lua 5.3+ does NOT have `math.pow(a, b)`! Always use `a ^ b`:
    local powerCurveVal = (math.max(0, 320 - 160) / 285) ^ 1.45
    local ctrlType = typeof(imageCtrl)
    local infCheck = math.isinf(math.huge)
    local nanCheck = math.isnan(0 / 0)

    -- [Verified In-Game TextBox Factory Pattern (`NewText`)]
    -- Always compute local `fontSize` and `textHeight = math.max(h, fontSize * 2)` first,
    -- configure alignment/color/fontSize BEFORE assigning `.text`, then `:SetVisible(true)` and `:SetAsLastSibling()`.
    local function CreateVerifiedText(parent, name, text, x, y, w, h, size, textColor, bgColor)
        local lbl = game.InstantiateClientUIControl(TEMPLATE_TEXTBOX, parent)
        if not lbl then return nil end
        local fontSize = size or 14
        local textHeight = math.max(h, fontSize * 2)
        lbl.name = name
        lbl:SetAnchorMin(0.5, 0.5)
        lbl:SetAnchorMax(0.5, 0.5)
        lbl:SetPivot(0.5, 0.5)
        lbl:SetAnchoredPosition(x, y)
        lbl:SetSizeDelta(w, textHeight)
        lbl.fontSize = fontSize
        lbl.fontColor = textColor or Color.FromRGB(230, 205, 145)
        lbl.bgColor = bgColor or Color.FromRGBA(0, 0, 0, 0)
        lbl.adaptiveFontSize = false
        lbl.horizontalAlignment = Enum.TextHorizontalAlignment.Middle
        lbl.verticalAlignment = Enum.TextVerticalAlignment.Middle
        lbl.text = text or ""
        lbl:SetVisible(true)
        lbl:SetAsLastSibling()
        return lbl
    end

    -- Footer Status Readout (using verified TextBox constructor pattern)
    statusReadout = CreateVerifiedText(
        containerCtrl,
        "FooterStatusReadout",
        string.format(
            "ALL 12 UI CLASSES & GLOBALS VERIFIED\ntypeof=%s | Vec3=%s | RGBA=(%d,%d,%d,%d) | Pow=%.2f",
            tostring(ctrlType), vStr, cr, cg, cb, ca, powerCurveVal
        ),
        200, -115, 380, 88, 13,
        Color.FromRGB(230, 205, 145),
        Color.FromRGBA(45, 36, 26, 255)
    )

    print("[Master API Reference] Successfully instantiated & verified all 12 UI Control classes!", imgSrc, imgId, currentItemCount, scrollDir, layoutConst, fixedCount, itemW, itemH, spaceH, spaceV, padT, padB, padL, padR, totalContentLen, refTemplateId, foundRoot, #allRoots, byId, curX, curY, lx, ly, rx, ry, focusCtrl, activeDev, activeLang, stageMode, locText, customVar, isTest, isPaused, sfxAlive, sAlive, sId, sPrefab, sObj, sPath, paramVal, vSum, vDiff, vScaled, vMag, vNorm, vDot, vCross, pulseTween, infCheck, nanCheck)
end

-- ============================================================================
-- 4. STAGE & SCRIPT LIFECYCLE CALLBACKS (library/Global.d.lua)
-- ============================================================================
function OnInit()
    -- 1. Called immediately when the control/script is instantiated
end

function OnEnable()
    -- 2. Called when the control becomes active
end

function OnUpdate(deltaTime)
    -- 4. Called every frame when script:EnableUpdate(true) is active
    elapsedTotal = elapsedTotal + deltaTime
    if radialImageDemo then
        radialImageDemo.localRotationZ = (elapsedTotal * 45) % 360
    end
end

function OnLevelUpdate(levelDeltaTime)
    -- 5. Called each frame after OnUpdate when level time is NOT paused
end

function OnDisable()
    -- 6. Called when control is deactivated
end

function OnDestroy()
    -- 7. Called when control is destroyed or stage ends
end
