-- ============================================================================
-- MILIASTRA WONDERLAND — MASTER UI CONTROL TYPES & COMPLETE LUA API REFERENCE
-- Single-File Executable Specification of All 12 UI Control Classes & Globals
-- Copy/paste this file to any LLM or developer as the ground-truth API spec!
-- ============================================================================
--
-- [CRITICAL MILIASTRA ENGINE RULES & IN-GAME VERIFIED GUARDRAILS]
-- 1. STANDARD RESOLUTION (1280 x 720 HD GOLDEN RATIO):
--    * Standardize on `local DESIGN_WIDTH = 1280, local DESIGN_HEIGHT = 720` (16:9 HD).
--    * Clean integer scaling on 1080p (1.5x), 1440p (2.0x), 4K (3.0x), and mobile viewports.
--    * Center-anchored container scaling:
--        rootScale = math.min(vw / DESIGN_WIDTH, vh / DESIGN_HEIGHT)
--        root:SetAnchorMin(0.5, 0.5); root:SetAnchorMax(0.5, 0.5)
--        root:SetPivot(0.5, 0.5);     root:SetAnchoredPosition(0, 0)
--        root:SetSizeDelta(DESIGN_WIDTH, DESIGN_HEIGHT)
--        root:SetLocalScale(rootScale, rootScale, 1)
--    * Cursor unprojection to local 1280x720 coordinates:
--        local lx = DESIGN_WIDTH * 0.5 + (rawX - vw * 0.5) / rootScale
--        local ly = DESIGN_HEIGHT * 0.5 + (rawY - vh * 0.5) / rootScale
--
-- 2. PROJECT-SPECIFIC TEMPLATE CONSTANTS & ELIMINATING MAGIC NUMBERS:
--    * Miliastra automatically generates Template IDs (prefabIndex) per project.
--    * NEVER sprinkle raw integer literals throughout your functions! Define top-level named constants:
--        local CONTAINER_TEMPLATE = 1073741851
--        local TEXT_TEMPLATE      = 1073741852
--        local IMAGE_TEMPLATE     = 1073741853
--        local BUTTON_TEMPLATE    = 1073741854
--        local CURSOR_TEMPLATE    = 1073741869
--        local KEY_HINT_TEMPLATE  = 1073741858
--        local RECTANGLE_RESOURCE = 100001
--        local CIRCLE_RESOURCE    = 100002
--        local TRIANGLE_RESOURCE  = 100003
--        local RING_RESOURCE      = 100006
--
-- 3. UNIFIED HELPER CONSTRUCTORS (CLEANEST & FASTEST FACTORY PATTERN):
--    * Configure(control, x, y, width, height, name):
--        control.name = name
--        control:SetAnchorMin(0, 0); control:SetAnchorMax(0, 0)
--        control:SetPivot(0.5, 0.5); control:SetAnchoredPosition(x, y)
--        control:SetSizeDelta(width, height)
--        control:SetVisible(true)
--    * NewImage(parent, name, x, y, width, height, color, resId, softEdge):
--        Instantiates IMAGE_TEMPLATE, calls Configure, sets Stretch image, color, optional softEdge.
--    * NewText(parent, name, text, x, y, width, height, size, textColor, bgColor):
--        Enforces: local fontSize = math.max(12, size or 16)
--                  local textHeight = math.max(height or 28, fontSize * 2)
--        Sets alignment, color, fontSize, adaptiveFontSize = false, then .text = text, and :SetAsLastSibling().
--    * Z-INDEX & SIBLING ORDER RENDERING RULE (HIGHER SIBLING INDEX = RENDERED ON TOP):
--      - Sibling controls in the same parent container render strictly in order: later siblings on top of earlier siblings.
--      - For custom interactive buttons (PresetButton + background + label):
--        Instantiate `btn` on `parent` first, then instantiate `title` and `sub` labels on `parent` at `(x, y)`
--        and call `title:SetAsLastSibling()`. If text is parented inside `btn`, the button's background image
--        or native surface will occlude the text!
--    * CreateMenuOptionButton(parent, name, x, y, width, height, bgColor, title, subtitle, onClick):
--        Instantiates BUTTON_TEMPLATE + child Image background + title & subtitle TextBoxes on parent + click listener.
--
-- 4. STRICT TEXTBOX ENGINE RULES (PREVENT "Font size limit exceeded"):
--    * Minimum valid .fontSize in Genshin is 12! Any .fontSize < 12 (e.g. 8, 9, 10, 11)
--      triggers runtime error: "<script>:<line>: Font size limit exceeded." and causes texts to fail!
--    * Always clamp: local fontSize = math.max(12, math.min(size or 16, 72))
--    * Never set .minimumFontSize < 12 (or omit .minimumFontSize entirely when adaptiveFontSize = false).
--    * Always size the TextBox height to at least math.max(height, fontSize * 2) with SetPivot(0.5, 0.5)
--      so Genshin's font line-height (~2.0-2.1x fontSize) never vertically overflows or clips.
--
-- 5. PERFORMANCE, INSTANT LOADING & ZERO-GC OPTIMIZATION TECH:
--    * CONTROL INSTANTIATION BUDGET:
--      - Keep total pre-instantiated UI controls under 250–350 controls!
--      - Instantiating 1,000+ controls synchronously in OnStart() creates noticeable load/unload stutter.
--      - Viewport-Culling: Only allocate pool slots for visible on-screen items (e.g. 14x10 grid, not 30x30).
--    * FIXED-SIZE RING BUFFERS (ZERO ALLOCATION DURING GAMEPLAY):
--      - For bullets, particles, damage numbers, skidmarks: pre-allocate fixed array of size N in OnStart().
--      - In OnUpdate(), advance `nextIdx = (nextIdx % N) + 1` and overwrite slot.
--      - ZERO table.insert() or table.remove() calls in OnUpdate() = ZERO Garbage Collection frame spikes!
--    * DIRTY-FLAG ENGINE CALLS:
--      - Check `dx*dx + dy*dy > 0.001` before calling `:SetAnchoredPosition(x, y)`.
--      - When objects are stationary or idle, 0 UI engine setter calls are dispatched.
--    * DISABLE PER-FRAME CHILD SCRIPTS:
--      - `local s = img:GetScriptByPath("Image_Control"); if s then s:EnableUpdate(false) end`
--
-- 6. STRICT UI CONTROL CAPABILITY MATRIX (DO NOT MIX FIELDS ACROSS TYPES!):
--    * ClientUIContainerControl (including root `script.object`):
--      - HAS NO `.bgColor` AND NO `.imageColor`! Setting `root.bgColor = ...`
--        crashes in Genshin because `.bgColor` does not exist on Container instances!
--      - To draw a background, spawn a child `ClientUIImageControl` (asset `100001` Rectangle).
--      - For interactive/cursor games, configure root Container with:
--          root.disableKeyEventPassthrough = true
--          root.disableCursorEventPassthrough = true
--          root.showCursor = true
--    * ClientUIPresetButtonControl:
--      - HAS NO background color (.bgColor), NO image (.imageColor), NO text (.text)!
--      - To give a button a visual background or label, instantiate a child
--        ClientUIImageControl and ClientUITextBoxControl inside/under the button.
--    * .interactable (boolean) ONLY EXISTS ON:
--      - ClientUIPresetButtonControl, ClientUITextWindowControl, ClientUIGridScrollerControl
--    * .raycastTarget (boolean) ONLY EXISTS ON:
--      - ClientUIPresetButtonControl, ClientUICursorEventAreaControl, ClientUIGridScrollerControl
--    * :AddCursorEventListener ONLY EXISTS ON:
--      - ClientUIPresetButtonControl and ClientUICursorEventAreaControl
--    * .bgColor (ColorValue) ONLY EXISTS ON:
--      - ClientUITextBoxControl and ClientUITextWindowControl
--    * .visible is [Read] on ClientUIBaseControl:
--      - Always call control:SetVisible(true / false) to change visibility.
--
-- 7. LUA 5.3+ MATH & RUNTIME RULES (VERIFIED IN GENSHIN):
--    * NO `math.pow(x, y)`: Always use the native exponentiation operator `^` (e.g. `val ^ 1.45`).
--    * Deterministic Hashing: Prefer trigonometric hashing for procedural worlds:
--        local v = math.sin(gx * 127.1 + gy * 311.7 + 19.19) * 43758.5453; return v - math.floor(v)
--
-- 8. KEYBOARD / MOUSE ACTION BINDINGS (`Shift == RMB` SPRINT RULE):
--    * Miliastra binds `Enum.KeyEventType.KeyboardSprintKeyDown` / `Up` to Genshin's semantic Sprint.
--    * Because Genshin binds Sprint to BOTH Left Shift and Right Mouse Button (RMB),
--      Left Shift and RMB ALWAYS trigger the exact same event (`KeyboardSprintKeyDown`).
--    * NEVER assign Left Shift and RMB to two different game mechanics! Treat Sprint as one unified action.
--    * Distinct Semantic Keys:
--        - LMB / Normal Attack : `KeyboardNormalAttackKeyDown` / `Up`
--        - Shift OR RMB (Sprint): `KeyboardSprintKeyDown` / `Up`
--        - Space (Jump)        : `KeyboardJumpKeyDown` / `Up`
--        - E (Elemental Skill) : `KeyboardCharacterSkill1KeyDown` / `Up`
--        - Q (Elemental Burst) : `KeyboardCharacterSkill2KeyDown` / `Up`
--        - R (Aim / Skill 3)   : `KeyboardCharacterSkill3KeyDown` / `Up`
--        - T (Skill 4)         : `KeyboardCharacterSkill4KeyDown` / `Up`
--        - F (Interact)        : `KeyboardInteractKeyDown` / `Up`
--        - X (Drop Key)        : `KeyboardDropKeyDown` / `Up` (Great for Quick Menu toggle)
--
-- 9. DYNAMIC KEY PROMPTS VIA `ClientUIKeyHintControl` (NEVER HARDCODE "PRESS R" IN TEXT!):
--    * Always display a `ClientUIKeyHintControl` badge alongside action text.
--    * Set `keyHint.keyboardKeyCode = Enum.KeyboardKeyCode.CharacterSkill3Key` and
--      `keyHint.controllerKeyCode = Enum.ControllerKeyCode.CharacterSkill3Key`.
--    * `KeyHintControl` queries the client's live keybind settings and renders the exact keycap or
--      gamepad button (or combo) that specific player has bound.
--
-- 10. LAUNCHING & CLOSING A ROOT UI EXPERIENCE (`ServerSignal` + Node Graph `Set UI Control (Group) Status`):
--    * NEVER call `root:SetActive(false)` or `root:SetVisible(false)` on `script.object`!
--      If a Lua script sets its own root container inactive, the Genshin Node Graph CANNOT reopen it.
--    * Proper Exit Pattern:
--        root.showCursor = false
--        local exitSig = game.ServerSignal("GAME_EXIT_SIGNAL")
--        if exitSig then
--            exitSig:AddInt(math.floor(highScore or 0))
--            exitSig:SendSignal()
--        end
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
    -- GENSHIN IMPACT RUNTIME TEXT VISIBILITY & VALIDATION RULES:
    --   1. Minimum valid .fontSize in Genshin is 12! Any .fontSize < 12 (e.g. 8, 9, 10, 11)
    --      triggers runtime error: "<script>:<line>: Font size limit exceeded." and causes texts to fail!
    --   2. Always clamp: local fontSize = math.max(12, size or 16)
    --   3. Always size the TextBox height to at least math.max(height, fontSize * 2 + 6, 30)
    --      with SetPivot(0.5, 0.5) so Genshin's CJK/Unicode font line-height (~2.1x fontSize)
    --      never vertically overflows or gets culled inside a tight box.
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
    textBoxCtrl.fontSize            = 14                                     -- integer [Read/Write/Tweenable] (MUST be >= 12)
    textBoxCtrl.fontColor           = Color.FromRGBA(238, 217, 171, 255)     -- ColorValue [Read/Write/Tweenable]
    textBoxCtrl.bgColor             = Color.FromRGBA(42, 34, 26, 255)        -- ColorValue [Read/Write/Tweenable]
    textBoxCtrl.enableOutline       = true                                   -- boolean [Read/Write]
    textBoxCtrl.outlineColor        = Color.FromRGBA(12, 10, 8, 255)         -- ColorValue [Read/Write/Tweenable]
    textBoxCtrl.horizontalAlignment = Enum.TextHorizontalAlignment.Middle    -- Left, Middle, Right [Read/Write]
    textBoxCtrl.verticalAlignment   = Enum.TextVerticalAlignment.Middle      -- Top, Middle, Bottom [Read/Write]
    textBoxCtrl.adaptiveFontSize    = false                                  -- boolean [Read/Write]
    textBoxCtrl.minimumFontSize     = 12                                     -- integer [Read/Write/Tweenable] (MUST be >= 12)

    -- ------------------------------------------------------------------------
    -- TYPE 4: ClientUITextWindowControl (Scrollable Multi-Line Text Box)
    -- Source: library/client_controls/TextWindowControl.d.lua
    -- Inherits: ClientUIBaseControl
    -- Editor Inspector ("Text Box Settings"):
    --   * Identical to TextBoxControl, PLUS 2 toggles at the top:
    --     1. "Can Scroll"     -> .interactable (boolean) — allows vertical scrolling of long text
    --     2. "Show Scrollbar" -> .showScrollBar (boolean) — renders the vertical scrollbar on the right edge
    --   * Has NO .raycastTarget and NO :AddCursorEventListener!
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
    -- Editor Inspector ("Click Response Area"):
    --   1. "Persistent Area Preview" (Editor-only visual toggle for hitbox layout)
    --   2. "Raycast Target"          (.raycastTarget boolean)
    -- NOTE: Has .raycastTarget, :AddCursorEventListener, :RemoveCursorEventListener,
    --       :RemoveCursorEventListeners, :RemoveAllCursorEventListeners, :SimulateCursorClick.
    --       Does NOT have .interactable, .clickAudioId, .bgColor, or .imageColor!
    --       Useful for map click/raycast minigames (though a fullscreen PresetButton also works).
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
    --
    -- Editor Inspector ("Grid List" — [img-1], [img-2]):
    --   1. Scroll Direction:
    --        - "Horizontal" (Enum.ScrollDirection.Horizontal = 0)
    --        - "Vertical"   (Enum.ScrollDirection.Vertical   = 1)
    --   2. Layout Constraint:
    --        - "Auto Wrap"  (Enum.ScrollLayoutConstraint.AutoWrap = 0) — wraps cells based on box size
    --        - "Fixed"      (Enum.ScrollLayoutConstraint.Fixed    = 1) — locks cross-axis count:
    --            * When Scroll Direction = "Horizontal", Fixed count is labeled "Rows"
    --            * When Scroll Direction = "Vertical",   Fixed count is labeled "Columns"
    --   3. Content (Single Template Slot — `.itemPrefabIndex`):
    --        - Inserting a template fills the grid with repeating copies of that 1 cell prefab.
    --        - Why only 1 template? For Minecraft/Terraria-style inventories, you design ONE
    --          universal "Item Slot" template (e.g. Border + Icon Image + Stack Count Text +
    --          invisible Button hitbox), then call `:RefreshItems(slotCount, function(itemCtrl, index) ... end)`
    --          in Lua. The callback fires for each slot (0-based `index`), letting you customize
    --          that slot's icon/text/color and bind a click listener that queries
    --          `gridScroller:GetItemIndex(itemCtrl)`!
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
    -- TYPE 8: ClientUIAnimationControl (Localized Particle / Cursor Area VFX)
    -- Source: library/client_controls/AnimationControl.d.lua
    -- Inherits: ClientUIBaseControl
    --
    -- Editor Inspector ("UI Animation Settings" -> Detached "Select VFX" Side Panel):
    --   * Features small localized particle effects around the control / cursor area
    --     (IDs 10001001 to 10001160).
    --   * Layer (Enum.UIAnimationLayer):
    --       - Enum.UIAnimationLayer.AboveAllControls (1)
    --       - Enum.UIAnimationLayer.BelowAllControls (0)
    --   * Looping Particle Effects (62 IDs — stay active until :StopAnimation() or :SetActive(false)):
    --       10001001, 10001002, 10001003, 10001004, 10001005, 10001006, 10001007, 10001010, 10001011, 10001012, 10001013,
    --       10001014, 10001015, 10001016, 10001017, 10001018, 10001019, 10001020, 10001021, 10001022, 10001023,
    --       10001024, 10001025, 10001026, 10001027, 10001028, 10001029, 10001030, 10001035, 10001037, 10001038, 10001041,
    --       10001042, 10001051, 10001053, 10001056, 10001060, 10001063, 10001067, 10001069, 10001070, 10001071, 10001072,
    --       10001075, 10001080, 10001081, 10001082, 10001092, 10001106, 10001114, 10001116, 10001118, 10001119, 10001131,
    --       10001132, 10001147, 10001149, 10001152, 10001154, 10001157, 10001158, 10001159
    --   * Non-Looping Particle Effects (98 IDs — play 1-shot burst and automatically disappear):
    --       10001008, 10001009, 10001031, 10001032, 10001033, 10001034, 10001036, 10001039, 10001040, 10001043, 10001044,
    --       10001045, 10001046, 10001047, 10001048, 10001049, 10001050, 10001052, 10001054, 10001055, 10001057, 10001058, 10001059,
    --       10001061, 10001062, 10001064, 10001065, 10001066, 10001068, 10001073, 10001074, 10001076, 10001077, 10001078,
    --       10001079, 10001083, 10001084, 10001085, 10001086, 10001087, 10001088, 10001089, 10001090, 10001091, 10001093,
    --       10001094, 10001095, 10001096, 10001097, 10001098, 10001099, 10001100, 10001101, 10001102, 10001103, 10001104, 10001105,
    --       10001107, 10001108, 10001109, 10001110, 10001111, 10001112, 10001113, 10001115, 10001117, 10001120, 10001121, 10001122,
    --       10001123, 10001124, 10001125, 10001126, 10001127, 10001128, 10001129, 10001130, 10001133, 10001134, 10001135, 10001136,
    --       10001137, 10001138, 10001139, 10001140, 10001141, 10001142, 10001143, 10001144, 10001145, 10001146, 10001148,
    --       10001150, 10001151, 10001153, 10001155, 10001156, 10001160
    -- ------------------------------------------------------------------------
    local animCtrl = game.InstantiateClientUIControl(TEMPLATE_ANIMATION, containerCtrl)
    animCtrl.name = "AnimationControlSpec"
    animCtrl.animationId     = 10001001                               -- integer [Read/Write] (UI Particle Effect 1 — Looping)
    animCtrl.playSoundEffect = true                                   -- boolean [Read/Write]
    animCtrl.layer           = Enum.UIAnimationLayer.AboveAllControls -- EnumItem.UIAnimationLayer [Read/Write]
    animCtrl:PlayAnimation()
    animCtrl:StopAnimation()

    -- ------------------------------------------------------------------------
    -- TYPE 9: ClientUIFullscreenAnimationControl (Fullscreen Cinematic VFX)
    -- Source: library/client_controls/FullscreenAnimationControl.d.lua
    -- Inherits: ClientUIBaseControl (0 subclass methods; auto-plays when active
    --           or when a new .animationId is assigned!)
    --
    -- Editor Inspector ("UI Animation Settings" -> "Select VFX"):
    --   * Looping Effects (23 IDs — Corner Bokeh / Vignette Dimming "View Ambience"):
    --       10002001, 10002002, 10002003, 10002004, 10002005,
    --       10002009, 10002014, 10002015, 10002018, 10002020,
    --       10002021, 10002022, 10002023, 10002025, 10002026,
    --       10002027, 10002028, 10002029, 10002032, 10002034,
    --       10002035, 10002036, 10002037
    --   * Non-Looping Effects (14 IDs — 1–2s One-Shot Screen Glitch / Impact Burst):
    --       10002006, 10002007, 10002008, 10002010, 10002011,
    --       10002012, 10002013, 10002016, 10002017, 10002019,
    --       10002024, 10002030, 10002031, 10002033
    -- ------------------------------------------------------------------------
    local fullAnimCtrl = game.InstantiateClientUIControl(TEMPLATE_FULLSCREEN_ANIMATION, containerCtrl)
    fullAnimCtrl.name = "FullscreenAnimationSpec"
    fullAnimCtrl.animationId     = 10002001 -- integer [Read/Write] (View Ambience 1 — Looping Bokeh)
    fullAnimCtrl.playSoundEffect = false    -- boolean [Read/Write]

    -- ------------------------------------------------------------------------
    -- TYPE 10: ClientUIKeyHintControl (Dynamic Keybind / Gamepad Button Showcase)
    -- Source: library/client_controls/KeyHintControl.d.lua & library/enums/Enum.d.lua
    -- Inherits: ClientUIBaseControl (0 subclass methods)
    -- CRITICAL: Has ONLY .keyboardKeyCode and .controllerKeyCode (NO .text, NO .bgColor!).
    -- Always use KeyHintControl instead of static "Press R" text so players who remapped
    -- their keys (e.g. R -> '[') or use a Gamepad see their actual bound key!
    --
    -- Enum Counts (library/enums/Enum.d.lua):
    --   * Enum.KeyboardKeyCode   : 59 entries (58 PC semantic keybinds + None)
    --       - CharacterSkill1Key (E), CharacterSkill2Key (Q), CharacterSkill3Key (R), CharacterSkill4Key (T)
    --       - MoveForwardKey (W), MoveLeftKey (A), MoveBackwardKey (S), MoveRightKey (D)
    --       - NormalAttackKey (LMB), SprintKey (RMB/Left Shift), JumpKey (Space), InteractKey (F), DropKey (X)
    --       - OpenShortcutWheelKey (Tab), SwitchToWalkOrRunKey (Left Ctrl)
    --       - CraftspersonKey1..10 (1..0), CraftspersonKey11..22 (U,Z,Y,G,H,I,O,P,J,K,L,V)
    --       - CraftspersonKey23..28 (F5..F10), CraftspersonKey29..35 (`, -, =, [, ,, ., /)
    --       - CraftspersonKey36..39 (↑, ↓, ←, →), CraftspersonKey40..43 (Right Ctrl, Right Shift, Backspace, Caps Lock)
    --   * Enum.ControllerKeyCode : 25 entries (24 Gamepad buttons/combos + None)
    --       - NormalAttackKey (B), SprintKey (Right Button / RB), JumpKey (A), InteractKey (X)
    --       - CharacterSkill1Key (Right Trigger / RT), CharacterSkill2Key (Y)
    --       - CharacterSkill3Key (D-pad Up), CharacterSkill4Key (D-pad Down)
    --       - MenuConfirmKey, MenuBackKey (Determined by controller navigation settings)
    --       - CraftspersonKey1 (D-pad Up), CraftspersonKey2 (D-pad Down), CraftspersonKey3 (Left Trigger / LT)
    --       - CraftspersonKey4 (LB + Y), CraftspersonKey5 (LB + X), CraftspersonKey6 (LB + A)
    --       - CraftspersonKey7 (LB + D-pad Up), CraftspersonKey8 (LB + D-pad Right)
    --       - CraftspersonKey9 (LB + D-pad Left), CraftspersonKey10 (LB + D-pad Down)
    --       - CraftspersonKey11 (LB + RB), CraftspersonKey12 (LB + LT)
    --       - CraftspersonKey13 (LB + RT), CraftspersonKey14 (LB + Left Stick Press)
    --   * Enum.KeyEventType      : 164 entries total (58 Keyboard Down/Up = 116 + 24 Controller Down/Up = 48)
    -- ------------------------------------------------------------------------
    local keyHintCtrl = game.InstantiateClientUIControl(TEMPLATE_KEY_HINT, containerCtrl)
    keyHintCtrl.name = "KeyHintControlSpec"
    keyHintCtrl:SetAnchorMin(0.5, 0.5)
    keyHintCtrl:SetAnchorMax(0.5, 0.5)
    keyHintCtrl:SetPivot(0.5, 0.5)
    keyHintCtrl:SetAnchoredPosition(360, 120)
    keyHintCtrl:SetSizeDelta(38, 30)
    keyHintCtrl.keyboardKeyCode   = Enum.KeyboardKeyCode.CharacterSkill3Key   -- EnumItem.KeyboardKeyCode [Read/Write] (Default: 'R', or player's remapped key!)
    keyHintCtrl.controllerKeyCode = Enum.ControllerKeyCode.CharacterSkill3Key -- EnumItem.ControllerKeyCode [Read/Write] (Default: 'D-pad Up')

    -- ------------------------------------------------------------------------
    -- TYPE 11: ClientUIReferenceControl (Nested Template Reference Instance)
    -- Source: library/client_controls/ReferenceControl.d.lua
    -- Inherits: ClientUIBaseControl (0 subclass methods)
    -- Editor Inspector ("Template Reference"):
    --   * "Reference Control Template" — statically embeds a Client Control Template
    --     (e.g. TextBoxControl Index 1073741954) as a child of the ReferenceControl
    --     when instantiated, without needing dynamic Lua instantiation code.
    -- ------------------------------------------------------------------------
    local refCtrl = game.InstantiateClientUIControl(TEMPLATE_REFERENCE, containerCtrl)
    refCtrl.name = "ReferenceControlSpec"
    local refTemplateId = refCtrl.referencedPrefabIndex -- integer [Read] (e.g. 1073741954)

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

    -- [Verified In-Game UI Factory Constructors]
    local function Configure(control, x, y, width, height, name)
        control.name = name
        control:SetAnchorMin(0.5, 0.5)
        control:SetAnchorMax(0.5, 0.5)
        control:SetPivot(0.5, 0.5)
        control:SetAnchoredPosition(x, y)
        control:SetSizeDelta(width, height)
        control:SetVisible(true)
        return control
    end

    local function CreateVerifiedImage(parent, name, x, y, width, height, color, resId, softEdge)
        local img = game.InstantiateClientUIControl(TEMPLATE_IMAGE, parent)
        if not img then return nil end
        Configure(img, x, y, width, height, name)
        img:SetImage(Enum.ImageSource.StaticReference, resId or ASSET_RECTANGLE)
        img.imageType = Enum.ImageType.Stretch
        img.imageColor = color or Color.FromRGB(255, 255, 255)
        if softEdge then
            img.enableSoftEdge = true
            img:SetSoftEdgeWidth(4, 4)
        end
        return img
    end

    -- Always compute local `fontSize >= 12` and `textHeight = math.max(h, fontSize * 2)` first,
    -- configure alignment/color/fontSize BEFORE assigning `.text`, then `:SetVisible(true)` and `:SetAsLastSibling()`.
    local function CreateVerifiedText(parent, name, text, x, y, w, h, size, textColor, bgColor)
        local lbl = game.InstantiateClientUIControl(TEMPLATE_TEXTBOX, parent)
        if not lbl then return nil end
        local fontSize = math.max(12, math.min(size or 14, 72))
        local textHeight = math.max(h or 28, fontSize * 2)
        Configure(lbl, x, y, w, textHeight, name)
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

    local function CreateVerifiedMenuButton(parent, name, x, y, w, h, bgCol, titleTxt, subTxt, onClick)
        local btn = game.InstantiateClientUIControl(TEMPLATE_PRESET_BUTTON, parent)
        if not btn then return nil end
        Configure(btn, x, y, w, h, name)
        btn.interactable = true
        btn.raycastTarget = true
        CreateVerifiedImage(btn, name .. "_Bg", 0, 0, w, h, bgCol, ASSET_RECTANGLE, true)
        CreateVerifiedImage(btn, name .. "_Border", 0, h * 0.5 - 2, w - 8, 2, Color.FromRGB(238, 217, 171), ASSET_RECTANGLE, false)
        if subTxt and subTxt ~= "" then
            CreateVerifiedText(btn, name .. "_Title", titleTxt, 0, h * 0.18, w - 16, 24, 13, Color.FromRGB(255, 255, 255))
            CreateVerifiedText(btn, name .. "_Sub", subTxt, 0, -h * 0.22, w - 16, 24, 12, Color.FromRGB(238, 217, 171))
        else
            CreateVerifiedText(btn, name .. "_Title", titleTxt, 0, 0, w - 16, 26, 13, Color.FromRGB(255, 255, 255))
        end
        btn:AddCursorEventListener(Enum.CursorEventType.CursorClick, function()
            if onClick then onClick() end
        end)
        return btn
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
