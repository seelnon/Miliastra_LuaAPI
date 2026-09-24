// ============================================================================
// MILIASTRA LUA SCRIPTING API — CORE REGISTERS & CLASS DEFINITIONS
// Complete typed mapping of all controls, globals, lifecycles, and objects
// ============================================================================

export const API_CLASSES = [
  {
    id: "ClientUIBaseControl",
    name: "ClientUIBaseControl",
    category: "Controls",
    badge: "Class",
    description: "The base type representing common fields and functions of all Client Controls. Contains functions for changing fields, setting state, and managing event listeners.",
    file: "library/client_controls/BaseControl.d.lua",
    notes: "Client Controls are destroyed and recreated whenever the client enters a loading screen, such as when teleporting or reconnecting.",
    fields: [
      { name: "alive", type: "boolean", access: "Read", desc: "Whether the Client Control is instantiated." },
      { name: "id", type: "number", access: "Read", desc: "The runtime ID of the Client Control." },
      { name: "prefabIndex", type: "number", access: "Read", desc: "The template index of the Client Control." },
      { name: "active", type: "boolean", access: "Read", desc: "Whether the Client Control is active. While active, attached scripts will call lifecycle functions." },
      { name: "activeInHierarchy", type: "boolean", access: "Read", desc: "Whether the Client Control is active, factoring in the active states of its parent hierarchy." },
      { name: "visible", type: "boolean", access: "Read", desc: "Whether the Client Control is visible." },
      { name: "name", type: "string", access: "Read/Write", desc: "The name of the Client Control." },
      { name: "parent", type: "ClientControlType?", access: "Read/Write", desc: "The parent of the Client Control. Always nil for root-level ControlContainers." },
      { name: "anchoredPositionX", type: "number", access: "Read/Write/Tweenable", desc: "The x position of the Client Control's pivot point relative to its anchor point." },
      { name: "anchoredPositionY", type: "number", access: "Read/Write/Tweenable", desc: "The y position of the Client Control's pivot point relative to its anchor point." },
      { name: "sizeDeltaX", type: "number", access: "Read/Write/Tweenable", desc: "The size offset between the width of the Client Control and its x-axis anchor bounds." },
      { name: "sizeDeltaY", type: "number", access: "Read/Write/Tweenable", desc: "The size offset between the height of the Client Control and its y-axis anchor bounds." },
      { name: "anchorMinX", type: "NormalizedPercentage", access: "Read/Write/Tweenable", desc: "The minimum x anchor (0.0-1.0) originating from the bottom-left corner." },
      { name: "anchorMinY", type: "NormalizedPercentage", access: "Read/Write/Tweenable", desc: "The minimum y anchor (0.0-1.0) originating from the bottom-left corner." },
      { name: "anchorMaxX", type: "NormalizedPercentage", access: "Read/Write/Tweenable", desc: "The maximum x anchor (0.0-1.0) originating from the bottom-left corner." },
      { name: "anchorMaxY", type: "NormalizedPercentage", access: "Read/Write/Tweenable", desc: "The maximum y anchor (0.0-1.0) originating from the bottom-left corner." },
      { name: "pivotX", type: "DecimalPercentage", access: "Read/Write/Tweenable", desc: "The x position of the pivot point as a decimal percentage." },
      { name: "pivotY", type: "DecimalPercentage", access: "Read/Write/Tweenable", desc: "The y position of the pivot point as a decimal percentage." },
      { name: "localScaleX", type: "number", access: "Read/Write/Tweenable", desc: "The local x scale of the Client Control." },
      { name: "localScaleY", type: "number", access: "Read/Write/Tweenable", desc: "The local y scale of the Client Control." },
      { name: "localScaleZ", type: "number", access: "Read/Write/Tweenable", desc: "The local z scale of the Client Control." },
      { name: "localRotationX", type: "number", access: "Read/Write/Tweenable", desc: "The local x rotation of the Client Control." },
      { name: "localRotationY", type: "number", access: "Read/Write/Tweenable", desc: "The local y rotation of the Client Control." },
      { name: "localRotationZ", type: "number", access: "Read/Write/Tweenable", desc: "The local z rotation of the Client Control." },
      { name: "canControllerFocus", type: "boolean", access: "Read/Write", desc: "Whether the Client Control can be focused by controller navigation." }
    ],
    methods: [
      {
        name: "AddKeyEventListener",
        signature: "control:AddKeyEventListener(eventType, callback)",
        params: [
          { name: "eventType", type: "EnumItem.KeyEventType", desc: "The key event type to listen for." },
          { name: "callback", type: "fun(): boolean", desc: "The callback function returning a boolean representing whether to mark the event as completed (consume/pass-through)." }
        ],
        returns: "void",
        desc: "Registers a key event listener to the Client Control. If marked as complete (returns true), subsequent key event listeners of the same event type will be called.",
        example: `button:AddKeyEventListener(Enum.KeyEventType.KeyboardJumpKeyDown, function()\n  BounceImage()\n  return true\nend)`
      },
      {
        name: "AddNavigationEventListener",
        signature: "control:AddNavigationEventListener(eventType, callback)",
        params: [
          { name: "eventType", type: "EnumItem.ControllerNavigationEventType", desc: "The controller navigation type to listen for." },
          { name: "callback", type: "fun()", desc: "The function to call when the event is triggered." }
        ],
        returns: "void",
        desc: "Registers a controller navigation event listener."
      },
      {
        name: "FindChild",
        signature: "control:FindChild(path)",
        params: [{ name: "path", type: "string", desc: "The path used to retrieve a child, using '/' as delimiter (e.g. 'ChildA/ChildC')." }],
        returns: "ClientControlType?",
        desc: "Gets a child by path. If multiple children exist with same path, the first by descending sibling index order is returned."
      },
      {
        name: "GetControllerNavigation",
        signature: "control:GetControllerNavigation(navigationDir)",
        params: [{ name: "navigationDir", type: "EnumItem.ControllerNavigationDir", desc: "The direction to get navigation settings for." }],
        returns: "EnumItem.ControllerNavigationMode, ClientControlType?",
        desc: "Returns the navigation mode and target for the specified direction."
      },
      {
        name: "GetAnchorMax",
        signature: "control:GetAnchorMax()",
        params: [],
        returns: "NormalizedPercentage x, NormalizedPercentage y",
        desc: "Returns the maximum anchors as a normalized percentage of the parent's size."
      },
      {
        name: "GetAnchorMin",
        signature: "control:GetAnchorMin()",
        params: [],
        returns: "NormalizedPercentage x, NormalizedPercentage y",
        desc: "Returns the minimum anchors as a normalized percentage of the parent's size."
      },
      {
        name: "GetAnchoredPosition",
        signature: "control:GetAnchoredPosition()",
        params: [],
        returns: "number x, number y",
        desc: "Returns the position of the pivot point relative to the anchor point."
      },
      {
        name: "GetChild",
        signature: "control:GetChild(name)",
        params: [{ name: "name", type: "string", desc: "The name used to retrieve a child." }],
        returns: "ClientControlType?",
        desc: "Gets a child by name in descending sibling index order."
      },
      {
        name: "GetChildren",
        signature: "control:GetChildren()",
        params: [],
        returns: "ClientControlType[]",
        desc: "Returns the Client Control's children in descending sibling index order."
      },
      {
        name: "GetLocalRotation",
        signature: "control:GetLocalRotation()",
        params: [],
        returns: "number x, number y, number z",
        desc: "Gets the local rotation (Euler angles) of the Client Control."
      },
      {
        name: "GetLocalScale",
        signature: "control:GetLocalScale()",
        params: [],
        returns: "number x, number y, number z",
        desc: "Returns the local scale of the Client Control."
      },
      {
        name: "GetPivot",
        signature: "control:GetPivot()",
        params: [],
        returns: "DecimalPercentage x, DecimalPercentage y",
        desc: "Returns the position of the pivot as a decimal percentage originating from bottom-left."
      },
      {
        name: "GetScript",
        signature: "control:GetScript(scriptPrefabIndex)",
        params: [{ name: "scriptPrefabIndex", type: "number", desc: "The Script Mapping ID." }],
        returns: "Script?",
        desc: "Gets the instance of a script attached to the Client Control by Script Mapping ID."
      },
      {
        name: "GetScriptByPath",
        signature: "control:GetScriptByPath(path)",
        params: [{ name: "path", type: "string", desc: "The file path of the script, excluding file extension." }],
        returns: "Script?",
        desc: "Gets the instance of a script attached to the Client Control by file path relative to external_lua_file."
      },
      {
        name: "GetScripts",
        signature: "control:GetScripts()",
        params: [],
        returns: "Script[]",
        desc: "Returns a sequence of all scripts attached to the Client Control."
      },
      {
        name: "GetSiblingIndex",
        signature: "control:GetSiblingIndex()",
        params: [],
        returns: "number",
        desc: "Returns the 0-indexed position in parent's list of children (-1 for root-level)."
      },
      {
        name: "GetSizeDelta",
        signature: "control:GetSizeDelta()",
        params: [],
        returns: "number deltaX, number deltaY",
        desc: "Returns the difference in size between the Client Control and its minimum/maximum anchor distance."
      },
      {
        name: "RemoveAllKeyEventListeners",
        signature: "control:RemoveAllKeyEventListeners()",
        params: [],
        returns: "void",
        desc: "Removes all key event listeners from the Client Control."
      },
      {
        name: "RemoveAllNavigationEventListeners",
        signature: "control:RemoveAllNavigationEventListeners()",
        params: [],
        returns: "void",
        desc: "Removes all controller navigation event listeners."
      },
      {
        name: "SetActive",
        signature: "control:SetActive(active)",
        params: [{ name: "active", type: "boolean", desc: "Whether to set as active." }],
        returns: "void",
        desc: "Sets the active status. Lifecycle functions OnEnable (true) and OnDisable (false) are called."
      },
      {
        name: "SetAnchorMax",
        signature: "control:SetAnchorMax(x, y)",
        params: [
          { name: "x", type: "NormalizedPercentage", desc: "Maximum x anchor (0.0 - 1.0)." },
          { name: "y", type: "NormalizedPercentage", desc: "Maximum y anchor (0.0 - 1.0)." }
        ],
        returns: "void",
        desc: "Sets the maximum anchors as a normalized percentage of the parent's size."
      },
      {
        name: "SetAnchorMin",
        signature: "control:SetAnchorMin(x, y)",
        params: [
          { name: "x", type: "NormalizedPercentage", desc: "Minimum x anchor (0.0 - 1.0)." },
          { name: "y", type: "NormalizedPercentage", desc: "Minimum y anchor (0.0 - 1.0)." }
        ],
        returns: "void",
        desc: "Sets the minimum anchors as a normalized percentage of the parent's size."
      },
      {
        name: "SetAnchoredPosition",
        signature: "control:SetAnchoredPosition(x, y)",
        params: [
          { name: "x", type: "number", desc: "The x position relative to the anchor." },
          { name: "y", type: "number", desc: "The y position relative to the anchor." }
        ],
        returns: "void",
        desc: "Sets the position of the pivot point relative to the anchor point."
      },
      {
        name: "SetAsFirstSibling",
        signature: "control:SetAsFirstSibling()",
        params: [],
        returns: "boolean",
        desc: "Sets the Client Control as the first child (index 0) of its parent."
      },
      {
        name: "SetAsLastSibling",
        signature: "control:SetAsLastSibling()",
        params: [],
        returns: "boolean",
        desc: "Sets the Client Control as the last child of its parent."
      },
      {
        name: "SetControllerNavigation",
        signature: "control:SetControllerNavigation(navigationDir, navigationMode, navigationTarget?)",
        params: [
          { name: "navigationDir", type: "EnumItem.ControllerNavigationDir", desc: "The navigation direction." },
          { name: "navigationMode", type: "EnumItem.ControllerNavigationMode", desc: "The navigation mode." },
          { name: "navigationTarget", type: "ClientControlType?", desc: "Target control (required if Specified)." }
        ],
        returns: "void",
        desc: "Sets the controller navigation mode for a specific navigation direction."
      },
      {
        name: "SetLocalRotation",
        signature: "control:SetLocalRotation(x, y, z)",
        params: [
          { name: "x", type: "number", desc: "Local x rotation in degrees." },
          { name: "y", type: "number", desc: "Local y rotation in degrees." },
          { name: "z", type: "number", desc: "Local z rotation in degrees." }
        ],
        returns: "void",
        desc: "Sets the local rotation of the Client Control."
      },
      {
        name: "SetLocalScale",
        signature: "control:SetLocalScale(x, y, z)",
        params: [
          { name: "x", type: "number", desc: "Local x scale factor." },
          { name: "y", type: "number", desc: "Local y scale factor." },
          { name: "z", type: "number", desc: "Local z scale factor." }
        ],
        returns: "void",
        desc: "Sets the local scale of the Client Control."
      },
      {
        name: "SetPivot",
        signature: "control:SetPivot(x, y)",
        params: [
          { name: "x", type: "DecimalPercentage", desc: "The x pivot decimal percentage (e.g. 0.5 for center)." },
          { name: "y", type: "DecimalPercentage", desc: "The y pivot decimal percentage (e.g. 0.5 for center)." }
        ],
        returns: "void",
        desc: "Sets the position of the Client Control's pivot point."
      },
      {
        name: "SetSiblingIndex",
        signature: "control:SetSiblingIndex(index)",
        params: [{ name: "index", type: "integer", desc: "The 0-indexed position in the parent's children list." }],
        returns: "boolean",
        desc: "Sets the 0-indexed position in the parent's list of children. Higher-index siblings render on top."
      },
      {
        name: "SetSizeDelta",
        signature: "control:SetSizeDelta(deltaX, deltaY)",
        params: [
          { name: "deltaX", type: "number", desc: "Width size offset." },
          { name: "deltaY", type: "number", desc: "Height size offset." }
        ],
        returns: "void",
        desc: "Sets the size offset between the Client Control and its anchor bounds."
      },
      {
        name: "SetVisible",
        signature: "control:SetVisible(visible)",
        params: [{ name: "visible", type: "boolean", desc: "Whether to set as visible." }],
        returns: "void",
        desc: "Sets the visibility status of the Client Control."
      }
    ]
  },
  {
    id: "ClientUIImageControl",
    name: "ClientUIImageControl",
    category: "Controls",
    badge: "Class",
    inherits: "ClientUIBaseControl",
    description: "Component for displaying static images, sprites, textures, and progressive fill effects (radial, horizontal, vertical).",
    file: "library/client_controls/ImageControl.d.lua",
    fields: [
      { name: "imageSource", type: "EnumItem.ImageSource", access: "Read", desc: "The image source type (StaticReference, Currency, Equipment, Item, Skill, etc.)." },
      { name: "imageId", type: "integer", access: "Read", desc: "The image asset ID." },
      { name: "imageColor", type: "ColorValue", access: "Read/Write/Tweenable", desc: "The color of the image." },
      { name: "imageType", type: "EnumItem.ImageType", access: "Read/Write", desc: "The image type (Basic, Stretch)." },
      { name: "enableMask", type: "boolean", access: "Read/Write", desc: "Whether masking is enabled." },
      { name: "enableSoftEdge", type: "boolean", access: "Read/Write", desc: "Whether soft edge is enabled." },
      { name: "softEdgeMode", type: "EnumItem.ImageMaskSoftEdgeMode", access: "Read/Write", desc: "The soft edge mode (Pixel, Percentage)." },
      { name: "softEdgeWidthX", type: "number", access: "Read/Write/Tweenable", desc: "The horizontal soft edge width." },
      { name: "softEdgeWidthY", type: "number", access: "Read/Write/Tweenable", desc: "The vertical soft edge width." },
      { name: "horizontalSoftRange", type: "number", access: "Read/Write/Tweenable", desc: "The horizontal soft edge range." },
      { name: "verticalSoftRange", type: "number", access: "Read/Write/Tweenable", desc: "The vertical soft edge range." },
      { name: "reverseMaskArea", type: "boolean", access: "Read/Write", desc: "Whether to invert the mask area." },
      { name: "fillType", type: "EnumItem.ImageFillType", access: "Read/Write", desc: "The fill type (Unused, Horizontal, Vertical, Radial90, Radial180, Radial360)." },
      { name: "fillHorizontalType", type: "EnumItem.ImageFillHorizontalType", access: "Read/Write", desc: "The horizontal fill direction (Left, Right)." },
      { name: "fillVerticalType", type: "EnumItem.ImageFillVerticalType", access: "Read/Write", desc: "The vertical fill direction (Bottom, Top)." },
      { name: "fillRadial90Type", type: "EnumItem.ImageFillRadial90Type", access: "Read/Write", desc: "The radial 90 origin point." },
      { name: "fillRadialType", type: "EnumItem.ImageFillRadialType", access: "Read/Write", desc: "The radial fill origin direction (Bottom, Top, Left, Right)." },
      { name: "fillAmount", type: "NormalizedPercentage", access: "Read/Write/Tweenable", desc: "The normalized percentage of the image revealed (0.0 to 1.0)." }
    ],
    methods: [
      {
        name: "SetImage",
        signature: "image:SetImage(imageSource, imageId)",
        params: [
          { name: "imageSource", type: "EnumItem.ImageSource", desc: "The source to get the asset from." },
          { name: "imageId", type: "integer", desc: "The ID of the image asset." }
        ],
        returns: "void",
        desc: "Sets the image source and ID."
      },
      {
        name: "SetSoftEdgeWidth",
        signature: "image:SetSoftEdgeWidth(widthX, widthY)",
        params: [
          { name: "widthX", type: "number", desc: "Horizontal soft edge width." },
          { name: "widthY", type: "number", desc: "Vertical soft edge width." }
        ],
        returns: "void",
        desc: "Sets the horizontal and vertical soft edge width."
      },
      {
        name: "SetFillUnused",
        signature: "image:SetFillUnused()",
        params: [],
        returns: "void",
        desc: "Sets the fill type to Unused."
      },
      {
        name: "SetFillHorizontal",
        signature: "image:SetFillHorizontal(fillHorizontalType, fillAmount)",
        params: [
          { name: "fillHorizontalType", type: "EnumItem.ImageFillHorizontalType", desc: "Left or Right." },
          { name: "fillAmount", type: "NormalizedPercentage", desc: "Percentage revealed (0.0-1.0)." }
        ],
        returns: "void",
        desc: "Sets the fill type to Horizontal with direction and fill amount."
      },
      {
        name: "SetFillVertical",
        signature: "image:SetFillVertical(fillVerticalType, fillAmount)",
        params: [
          { name: "fillVerticalType", type: "EnumItem.ImageFillVerticalType", desc: "Bottom or Top." },
          { name: "fillAmount", type: "NormalizedPercentage", desc: "Percentage revealed (0.0-1.0)." }
        ],
        returns: "void",
        desc: "Sets the fill type to Vertical with direction and fill amount."
      },
      {
        name: "SetFillRadial90",
        signature: "image:SetFillRadial90(fillRadial90Type, fillAmount)",
        params: [
          { name: "fillRadial90Type", type: "EnumItem.ImageFillRadial90Type", desc: "BottomLeft, TopLeft, TopRight, BottomRight." },
          { name: "fillAmount", type: "NormalizedPercentage", desc: "Percentage revealed (0.0-1.0)." }
        ],
        returns: "void",
        desc: "Sets the fill type to Radial90 with origin corner and amount."
      },
      {
        name: "SetFillRadial180",
        signature: "image:SetFillRadial180(fillRadialType, fillAmount)",
        params: [
          { name: "fillRadialType", type: "EnumItem.ImageFillRadialType", desc: "Bottom, Top, Left, Right." },
          { name: "fillAmount", type: "NormalizedPercentage", desc: "Percentage revealed (0.0-1.0)." }
        ],
        returns: "void",
        desc: "Sets the fill type to Radial180 with origin and amount."
      },
      {
        name: "SetFillRadial360",
        signature: "image:SetFillRadial360(fillRadialType, fillAmount)",
        params: [
          { name: "fillRadialType", type: "EnumItem.ImageFillRadialType", desc: "Bottom, Top, Left, Right." },
          { name: "fillAmount", type: "NormalizedPercentage", desc: "Percentage revealed (0.0-1.0)." }
        ],
        returns: "void",
        desc: "Sets the fill type to Radial360 with start position and amount."
      }
    ]
  },
  {
    id: "ClientUITextBoxControl",
    name: "ClientUITextBoxControl",
    category: "Controls",
    badge: "Class",
    inherits: "ClientUIBaseControl",
    description: "Component for displaying formatted text, adaptive font sizes, outlines, and text alignment.",
    file: "library/client_controls/TextBoxControl.d.lua",
    fields: [
      { name: "text", type: "string", access: "Read/Write", desc: "The displayed text string." },
      { name: "fontSize", type: "integer", access: "Read/Write/Tweenable", desc: "The font size." },
      { name: "fontColor", type: "ColorValue", access: "Read/Write/Tweenable", desc: "The font color." },
      { name: "bgColor", type: "ColorValue", access: "Read/Write/Tweenable", desc: "The background color." },
      { name: "enableOutline", type: "boolean", access: "Read/Write", desc: "Whether text outline is enabled." },
      { name: "outlineColor", type: "ColorValue", access: "Read/Write/Tweenable", desc: "The text outline color." },
      { name: "horizontalAlignment", type: "EnumItem.TextHorizontalAlignment", access: "Read/Write", desc: "Left, Middle, Right." },
      { name: "verticalAlignment", type: "EnumItem.TextVerticalAlignment", access: "Read/Write", desc: "Top, Middle, Bottom." },
      { name: "adaptiveFontSize", type: "boolean", access: "Read/Write", desc: "Whether font size adapts to text box bounds." },
      { name: "minimumFontSize", type: "integer", access: "Read/Write/Tweenable", desc: "The minimum font size when adaptive is enabled." }
    ],
    methods: []
  },
  {
    id: "ClientUITextWindowControl",
    name: "ClientUITextWindowControl",
    category: "Controls",
    badge: "Class",
    inherits: "ClientUIBaseControl",
    description: "Scrollable multi-line text container component with support for scrollbars and adaptive text bounds.",
    file: "library/client_controls/TextWindowControl.d.lua",
    fields: [
      { name: "interactable", type: "boolean", access: "Read/Write", desc: "Whether user input can scroll the text window." },
      { name: "showScrollBar", type: "boolean", access: "Read/Write", desc: "Whether to show the scrollbar." },
      { name: "text", type: "string", access: "Read/Write", desc: "The displayed text." },
      { name: "fontSize", type: "integer", access: "Read/Write/Tweenable", desc: "The font size." },
      { name: "fontColor", type: "ColorValue", access: "Read/Write/Tweenable", desc: "The font color." },
      { name: "bgColor", type: "ColorValue", access: "Read/Write/Tweenable", desc: "The background color." },
      { name: "enableOutline", type: "boolean", access: "Read/Write", desc: "Whether text outline is enabled." },
      { name: "outlineColor", type: "ColorValue", access: "Read/Write/Tweenable", desc: "The text outline color." },
      { name: "horizontalAlignment", type: "EnumItem.TextHorizontalAlignment", access: "Read/Write", desc: "Horizontal text alignment." },
      { name: "verticalAlignment", type: "EnumItem.TextVerticalAlignment", access: "Read/Write", desc: "Vertical text alignment." },
      { name: "adaptiveFontSize", type: "boolean", access: "Read/Write", desc: "Whether font size adapts." },
      { name: "minimumFontSize", type: "integer", access: "Read/Write/Tweenable", desc: "The minimum font size when adaptive." }
    ],
    methods: []
  },
  {
    id: "ClientUIPresetButtonControl",
    name: "ClientUIPresetButtonControl",
    category: "Controls",
    badge: "Class",
    inherits: "ClientUIBaseControl",
    description: "Interactive button control that receives cursor clicks, hovers, drags, and triggers sound effects.",
    file: "library/client_controls/PresetButtonControl.d.lua",
    fields: [
      { name: "interactable", type: "boolean", access: "Read/Write", desc: "Whether the Preset Button responds to user input." },
      { name: "clickAudioId", type: "integer", access: "Read/Write", desc: "The sound effect audio ID played when clicked." },
      { name: "raycastTarget", type: "boolean", access: "Read/Write", desc: "Whether the button can receive cursor interaction events." }
    ],
    methods: [
      {
        name: "AddCursorEventListener",
        signature: "button:AddCursorEventListener(eventType, callback)",
        params: [
          { name: "eventType", type: "EnumItem.CursorEventType", desc: "CursorClick, CursorDown, CursorUp, CursorEnter, CursorExit, CursorDrag, etc." },
          { name: "callback", type: "fun(eventData: CursorEventData)", desc: "Callback exposing cursor position, press position, and delta." }
        ],
        returns: "void",
        desc: "Registers a cursor event listener."
      },
      {
        name: "RemoveCursorEventListener",
        signature: "button:RemoveCursorEventListener(eventType, callback)",
        params: [
          { name: "eventType", type: "EnumItem.CursorEventType", desc: "Event type to remove." },
          { name: "callback", type: "fun(eventData: CursorEventData)", desc: "Callback function to remove." }
        ],
        returns: "void",
        desc: "Removes the specified cursor event listener."
      },
      {
        name: "RemoveCursorEventListeners",
        signature: "button:RemoveCursorEventListeners(eventType)",
        params: [{ name: "eventType", type: "EnumItem.CursorEventType", desc: "Event type to clear." }],
        returns: "void",
        desc: "Removes all cursor event listeners for the specified event type."
      },
      {
        name: "RemoveAllCursorEventListeners",
        signature: "button:RemoveAllCursorEventListeners()",
        params: [],
        returns: "void",
        desc: "Removes all cursor event listeners from the button."
      },
      {
        name: "SimulateCursorClick",
        signature: "button:SimulateCursorClick()",
        params: [],
        returns: "void",
        desc: "Simulates CursorDown, CursorUp, and CursorClick events in sequence."
      }
    ]
  },
  {
    id: "ClientUIGridScrollerControl",
    name: "ClientUIGridScrollerControl",
    category: "Controls",
    badge: "Class",
    inherits: "ClientUIBaseControl",
    description: "Dynamic scrolling grid control capable of recycling and instantiating large lists of child UI components.",
    file: "library/client_controls/GridScrollerControl.d.lua",
    fields: [
      { name: "itemCount", type: "integer", access: "Read", desc: "The number of list items created in the most recent refresh." },
      { name: "itemPrefabIndex", type: "integer", access: "Read/Write", desc: "The Client Control Template index used to create items." },
      { name: "raycastTarget", type: "boolean", access: "Read/Write", desc: "Whether empty space can be dragged to scroll." },
      { name: "showScrollBar", type: "boolean", access: "Read/Write", desc: "Whether to show the scrollbar." },
      { name: "interactable", type: "boolean", access: "Read/Write", desc: "Whether input can scroll the grid." },
      { name: "scrollDirection", type: "EnumItem.ScrollDirection", access: "Read", desc: "Horizontal or Vertical." },
      { name: "layoutConstraint", type: "EnumItem.ScrollLayoutConstraint", access: "Read", desc: "AutoWrap or Fixed." },
      { name: "layoutConstraintFixedCount", type: "number", access: "Read", desc: "Maximum item count along scroll direction." },
      { name: "scrollProgress", type: "NormalizedPercentage", access: "Read/Write/Tweenable", desc: "Normalized percentage (0.0-1.0) of scroll position." }
    ],
    methods: [
      {
        name: "RefreshItems",
        signature: "grid:RefreshItems(itemCount, callback)",
        params: [
          { name: "itemCount", type: "integer", desc: "Number of items to instantiate." },
          { name: "callback", type: "fun(control: ClientControlType, index: integer)", desc: "Invoked for each instantiated item with 0-indexed position." }
        ],
        returns: "void",
        desc: "Destroys existing items, instantiates new controls, and invokes callback for each item."
      },
      {
        name: "GetItemIndex",
        signature: "grid:GetItemIndex(control)",
        params: [{ name: "control", type: "ClientControlType", desc: "Control to get index of." }],
        returns: "integer",
        desc: "Returns 0-indexed position in the internal list (-1 if not found)."
      },
      {
        name: "GetItemSize",
        signature: "grid:GetItemSize()",
        params: [],
        returns: "number width, number height",
        desc: "Returns the list item dimensions."
      },
      {
        name: "GetItemSpacing",
        signature: "grid:GetItemSpacing()",
        params: [],
        returns: "number horizontalSpacing, number verticalSpacing",
        desc: "Returns horizontal and vertical spacing between items."
      },
      {
        name: "GetPadding",
        signature: "grid:GetPadding()",
        params: [],
        returns: "number top, number bottom, number left, number right",
        desc: "Returns content area padding."
      },
      {
        name: "ScrollToItemAt",
        signature: "grid:ScrollToItemAt(index, scrollAlignType)",
        params: [
          { name: "index", type: "integer", desc: "Index of item to scroll to." },
          { name: "scrollAlignType", type: "EnumItem.ScrollAlignType", desc: "Top, Center, Bottom alignment." }
        ],
        returns: "void",
        desc: "Instantly scrolls to the list item at the specified index."
      },
      {
        name: "GetContentLength",
        signature: "grid:GetContentLength()",
        params: [],
        returns: "number",
        desc: "Returns the total calculated length along the scroll direction."
      }
    ]
  },
  {
    id: "ClientUIContainerControl",
    name: "ClientUIContainerControl",
    category: "Controls",
    badge: "Class",
    inherits: "ClientUIBaseControl",
    description: "Root or branch layout container for grouping UI elements, restricting controller navigation, and blocking keyboard/cursor passthrough.",
    file: "library/client_controls/ContainerControl.d.lua",
    fields: [
      { name: "isolateNavigation", type: "boolean", access: "Read/Write", desc: "Whether controller navigation is restricted within this container." },
      { name: "disableKeyEventPassthrough", type: "boolean", access: "Read/Write", desc: "Blocks keyboard input events from passing through to native game (character won't move/attack/skill)." },
      { name: "disableCursorEventPassthrough", type: "boolean", access: "Read/Write", desc: "Blocks cursor interaction events from passing through to native game." },
      { name: "showCursor", type: "boolean", access: "Read/Write", desc: "Whether to force show the cursor while container is active." }
    ],
    methods: []
  },
  {
    id: "ClientUICursorEventAreaControl",
    name: "ClientUICursorEventAreaControl",
    category: "Controls",
    badge: "Class",
    inherits: "ClientUIBaseControl",
    description: "Invisible or bounding interaction area for detecting cursor movements, drags, clicks, enters, and exits.",
    file: "library/client_controls/CursorEventAreaControl.d.lua",
    fields: [
      { name: "raycastTarget", type: "boolean", access: "Read/Write", desc: "Whether the cursor event area receives cursor interaction events." }
    ],
    methods: [
      {
        name: "AddCursorEventListener",
        signature: "area:AddCursorEventListener(eventType, callback)",
        params: [
          { name: "eventType", type: "EnumItem.CursorEventType", desc: "Cursor event type." },
          { name: "callback", type: "fun(eventData: CursorEventData)", desc: "Callback receiving CursorEventData." }
        ],
        returns: "void",
        desc: "Registers a cursor event listener."
      },
      {
        name: "SimulateCursorClick",
        signature: "area:SimulateCursorClick()",
        params: [],
        returns: "void",
        desc: "Simulates CursorDown, CursorUp, and CursorClick in sequence."
      }
    ]
  },
  {
    id: "ClientUIAnimationControl",
    name: "ClientUIAnimationControl",
    category: "Controls",
    badge: "Class",
    inherits: "ClientUIBaseControl",
    description: "Component for playing framed UI animations, audio triggers, and layer control.",
    file: "library/client_controls/AnimationControl.d.lua",
    fields: [
      { name: "animationId", type: "integer", access: "Read/Write", desc: "Animation ID. Assigning a different ID while active plays new animation." },
      { name: "playSoundEffect", type: "boolean", access: "Read/Write", desc: "Whether to play animation sound effects." },
      { name: "layer", type: "EnumItem.UIAnimationLayer", access: "Read/Write", desc: "AboveAllControls or BelowAllControls." }
    ],
    methods: [
      { name: "PlayAnimation", signature: "anim:PlayAnimation()", params: [], returns: "void", desc: "Plays the UI animation (restarts if already playing)." },
      { name: "StopAnimation", signature: "anim:StopAnimation()", params: [], returns: "void", desc: "Stops the UI animation." }
    ]
  },
  {
    id: "ClientUIFullscreenAnimationControl",
    name: "ClientUIFullscreenAnimationControl",
    category: "Controls",
    badge: "Class",
    inherits: "ClientUIBaseControl",
    description: "Plays fullscreen cinematic or backdrop animations with sound effect integration.",
    file: "library/client_controls/FullscreenAnimationControl.d.lua",
    fields: [
      { name: "animationId", type: "integer", access: "Read/Write", desc: "The fullscreen animation ID." },
      { name: "playSoundEffect", type: "boolean", access: "Read/Write", desc: "Whether to play sound effects." }
    ],
    methods: []
  },
  {
    id: "ClientUIKeyHintControl",
    name: "ClientUIKeyHintControl",
    category: "Controls",
    badge: "Class",
    inherits: "ClientUIBaseControl",
    description: "Displays context-sensitive controller or keyboard button prompts and keybind glyphs.",
    file: "library/client_controls/KeyHintControl.d.lua",
    fields: [
      { name: "keyboardKeyCode", type: "EnumItem.KeyboardKeyCode", access: "Read/Write", desc: "Key hint for keyboard & mouse input." },
      { name: "controllerKeyCode", type: "EnumItem.ControllerKeyCode", access: "Read/Write", desc: "Key hint for controller input." }
    ],
    methods: []
  },
  {
    id: "ClientUIReferenceControl",
    name: "ClientUIReferenceControl",
    category: "Controls",
    badge: "Class",
    inherits: "ClientUIBaseControl",
    description: "Dynamically instantiates and mounts another Client Control Template as a child instance.",
    file: "library/client_controls/ReferenceControl.d.lua",
    fields: [
      { name: "referencedPrefabIndex", type: "integer", access: "Read", desc: "The index of the referenced Client Control Template." }
    ],
    methods: []
  }
];

export const API_SYSTEMS = [
  {
    id: "game",
    name: "game",
    category: "Globals",
    badge: "Global",
    description: "Core global engine table containing server state query functions, client environment data, audio instances, signals, and tween factories.",
    file: "library/game.d.lua",
    methods: [
      {
        name: "DestroyClientUIControl",
        signature: "game.DestroyClientUIControl(control)",
        params: [{ name: "control", type: "ClientControlType", desc: "The Client Control instance to destroy." }],
        returns: "void",
        desc: "Destroys the specified Client Control instance immediately."
      },
      {
        name: "FindClientUIRoot",
        signature: "game.FindClientUIRoot(name)",
        params: [{ name: "name", type: "string", desc: "Name of the root-level ContainerControl." }],
        returns: "ClientUIContainerControl?",
        desc: "Gets a root-level ContainerControl by name. Returns nil if not found."
      },
      {
        name: "GetClientUIControl",
        signature: "game.GetClientUIControl(id)",
        params: [{ name: "id", type: "number", desc: "The runtime ID of the Client Control." }],
        returns: "ClientControlType?",
        desc: "Gets a Client Control by runtime ID."
      },
      {
        name: "GetClientUIRoots",
        signature: "game.GetClientUIRoots()",
        params: [],
        returns: "ClientUIContainerControl[]",
        desc: "Returns a sequence containing all active root-level ContainerControls."
      },
      {
        name: "GetControllerFocus",
        signature: "game.GetControllerFocus()",
        params: [],
        returns: "ClientControlType?",
        desc: "Returns the Client Control currently focused by the controller."
      },
      {
        name: "GetControllerLeftStickAxis",
        signature: "game.GetControllerLeftStickAxis()",
        params: [],
        returns: "number horizontalInput, number verticalInput",
        desc: "Returns the left stick input values of the connected controller."
      },
      {
        name: "GetControllerRightStickAxis",
        signature: "game.GetControllerRightStickAxis()",
        params: [],
        returns: "number horizontalInput, number verticalInput",
        desc: "Returns the right stick input values of the connected controller."
      },
      {
        name: "GetCursorUIPos",
        signature: "game.GetCursorUIPos()",
        params: [],
        returns: "number x, number y",
        desc: "Returns the cursor position originating from the bottom-left corner of the viewport."
      },
      {
        name: "GetDevice",
        signature: "game.GetDevice()",
        params: [],
        returns: "EnumItem.Device",
        desc: "Returns current input device type (KeyboardAndMouse, Controller, Mobile, MobileController)."
      },
      {
        name: "GetGlobalCustomVariableValue",
        signature: "game.GetGlobalCustomVariableValue(entity, varName)",
        params: [
          { name: "entity", type: "EnumItem.CustomVariableEntityType", desc: "Level, PlayerSelf, AvatarSelf." },
          { name: "varName", type: "string", desc: "Name of custom variable." }
        ],
        returns: "ServerDataType?",
        desc: "Gets a declared Custom Variable from the specified entity."
      },
      {
        name: "GetLanguageType",
        signature: "game.GetLanguageType()",
        params: [],
        returns: "EnumItem.LanguageType",
        desc: "Returns the active client language (LanguageEng, LanguageChs, LanguageJpn, etc.)."
      },
      {
        name: "GetStageMode",
        signature: "game.GetStageMode()",
        params: [],
        returns: "EnumItem.StageMode",
        desc: "Returns current stage mode (Beyond or Classic)."
      },
      {
        name: "GetText",
        signature: "game.GetText(textMappingId)",
        params: [{ name: "textMappingId", type: "string", desc: "The ID of the Script Text Variable." }],
        returns: "string",
        desc: "Returns the localized value of a Script Text Variable by Text Mapping ID."
      },
      {
        name: "GetUICanvasSize",
        signature: "game.GetUICanvasSize()",
        params: [],
        returns: "number width, number height",
        desc: "Returns the width and height of the UI viewport canvas in units."
      },
      {
        name: "InstantiateClientUIControl",
        signature: "game.InstantiateClientUIControl(templateIndex, parent)",
        params: [
          { name: "templateIndex", type: "number", desc: "Client Control Template index." },
          { name: "parent", type: "ClientControlType", desc: "Parent control to mount onto." }
        ],
        returns: "ClientControlType",
        desc: "Instantiates a new Client Control and appends it to parent's children."
      },
      {
        name: "IsAudioAlive",
        signature: "game.IsAudioAlive(audioInstanceId)",
        params: [{ name: "audioInstanceId", type: "number", desc: "ID of audio instance." }],
        returns: "boolean",
        desc: "Checks if audio instance is currently playing/active in memory."
      },
      {
        name: "IsLevelTimePaused",
        signature: "game.IsLevelTimePaused()",
        params: [],
        returns: "boolean",
        desc: "Returns whether level time is paused."
      },
      {
        name: "IsTestPlay",
        signature: "game.IsTestPlay()",
        params: [],
        returns: "boolean",
        desc: "Checks if the stage is currently executing in test play mode."
      },
      {
        name: "PauseLevelTime",
        signature: "game.PauseLevelTime(pause)",
        params: [{ name: "pause", type: "boolean", desc: "Whether to pause level time." }],
        returns: "void",
        desc: "Suspends or resumes level time (OnLevelUpdate will pause)."
      },
      {
        name: "PlayAudio2D",
        signature: "game.PlayAudio2D(id)",
        params: [{ name: "id", type: "number", desc: "Audio clip asset ID." }],
        returns: "number audioInstanceId",
        desc: "Creates a new 2D audio instance and plays sound effect/music."
      },
      {
        name: "PrintClientUITree",
        signature: "game.PrintClientUITree()",
        params: [],
        returns: "void",
        desc: "Dumps and prints the entire active Client Control hierarchy to the log."
      },
      {
        name: "ServerSignal",
        signature: "game.ServerSignal(signalName)",
        params: [{ name: "signalName", type: "string", desc: "Signal name identifier." }],
        returns: "ServerSignal",
        desc: "Creates a new Server Signal instance to send data payloads to Node Graphs."
      },
      {
        name: "SetControllerFocus",
        signature: "game.SetControllerFocus(control)",
        params: [{ name: "control", type: "ClientControlType", desc: "Control to receive focus." }],
        returns: "void",
        desc: "Sets the controller focus to the specified control."
      },
      {
        name: "StopAudio",
        signature: "game.StopAudio(audioInstanceId)",
        params: [{ name: "audioInstanceId", type: "number", desc: "ID of audio instance." }],
        returns: "void",
        desc: "Stops the specified audio instance."
      },
      {
        name: "Tween",
        signature: "game.Tween(object, targetValues, duration)",
        params: [
          { name: "object", type: "ClientControlType", desc: "Control to animate." },
          { name: "targetValues", type: "TweenTarget", desc: "Table containing tweenable target properties (anchoredPositionY, localScaleX, etc.)." },
          { name: "duration", type: "number", desc: "Duration in seconds." }
        ],
        returns: "Tween",
        desc: "Creates a Tween instance targeting the given control.",
        example: `local tween = game.Tween(image, {\n  anchoredPositionY = 200,\n  localScaleX = 1.2\n}, 0.5):SetEase(Enum.EaseType.OutQuad):Play()`
      },
      {
        name: "TweenSequence",
        signature: "game.TweenSequence()",
        params: [],
        returns: "TweenSequence",
        desc: "Creates a new Tween Sequence timeline for chaining animations, delays, and callbacks.",
        example: `local seq = game.TweenSequence()\nseq:Append(game.Tween(image, { anchoredPositionY = 100 }, 0.4))\nseq:AppendCallback(function() print("Peak reached!") end)\nseq:Append(game.Tween(image, { anchoredPositionY = 0 }, 0.3))\nseq:Play()`
      }
    ]
  },
  {
    id: "script",
    name: "script",
    category: "Globals",
    badge: "Global",
    description: "Reference to the current executing script instance, its host UI object, parameters, and signal handlers.",
    file: "library/Script.d.lua",
    fields: [
      { name: "alive", type: "boolean", access: "Read", desc: "Whether script instance is loaded. Check before calling Invoke." },
      { name: "id", type: "number", access: "Read", desc: "The runtime ID of the script instance." },
      { name: "prefabIndex", type: "number?", access: "Read", desc: "The mapping ID (nil for Modules)." },
      { name: "object", type: "ClientControlType?", access: "Read", desc: "The Client Control instance that the script is mounted on." },
      { name: "path", type: "string", access: "Read", desc: "The path relative to external_lua_file." },
      { name: "enabled", type: "boolean", access: "Read/Write", desc: "Execution state flag." }
    ],
    methods: [
      {
        name: "EnableUpdate",
        signature: "script:EnableUpdate(enabled)",
        params: [{ name: "enabled", type: "boolean", desc: "Whether OnUpdate and OnLevelUpdate should execute." }],
        returns: "void",
        desc: "Sets whether the script executes OnUpdate and OnLevelUpdate lifecycle ticks every frame."
      },
      {
        name: "GetParam",
        signature: "script:GetParam(varName)",
        params: [{ name: "varName", type: "string", desc: "Name of Script Variable." }],
        returns: "ServerDataType?",
        desc: "Gets the value of a Script Variable defined in the script mapping."
      },
      {
        name: "Invoke",
        signature: "script:Invoke(funcName, ...)",
        params: [
          { name: "funcName", type: "string", desc: "Global function name in the script." },
          { name: "...", type: "any", desc: "Arguments to pass." }
        ],
        returns: "any ...",
        desc: "Calls a global function on the target script instance across files."
      },
      {
        name: "RegisterCustomVariableChangedHandler",
        signature: "script:RegisterCustomVariableChangedHandler(entity, varName, callback)",
        params: [
          { name: "entity", type: "EnumItem.CustomVariableEntityType", desc: "Entity target." },
          { name: "varName", type: "string", desc: "Variable name." },
          { name: "callback", type: "fun(entity, varName)", desc: "Callback function." }
        ],
        returns: "void",
        desc: "Registers handler for custom variable value changes."
      },
      {
        name: "RegisterServerSignalHandler",
        signature: "script:RegisterServerSignalHandler(signalName, callback)",
        params: [
          { name: "signalName", type: "string", desc: "Signal name from Node Graph." },
          { name: "callback", type: "fun(signalName: string, signalParams: ServerDataType[])", desc: "Callback receiving parameters array." }
        ],
        returns: "void",
        desc: "Registers handler for server scripted signals (min ~100ms network latency)."
      },
      {
        name: "UnregisterCustomVariableChangedHandler",
        signature: "script:UnregisterCustomVariableChangedHandler(entity, varName)",
        params: [
          { name: "entity", type: "EnumItem.CustomVariableEntityType", desc: "Entity target." },
          { name: "varName", type: "string", desc: "Variable name." }
        ],
        returns: "void",
        desc: "Removes handler for specified custom variable."
      },
      {
        name: "UnregisterServerSignalHandler",
        signature: "script:UnregisterServerSignalHandler(signalName)",
        params: [{ name: "signalName", type: "string", desc: "Signal name." }],
        returns: "void",
        desc: "Removes handler for specified server signal."
      }
    ]
  },
  {
    id: "Tween",
    name: "Tween",
    category: "Animation",
    badge: "Class",
    description: "Instance representing an active or prepared interpolation of UI properties.",
    file: "library/Tween.d.lua",
    methods: [
      { name: "Play", signature: "tween:Play()", params: [], returns: "Tween", desc: "Starts tween playback." },
      { name: "Pause", signature: "tween:Pause()", params: [], returns: "void", desc: "Pauses playback." },
      { name: "Resume", signature: "tween:Resume()", params: [], returns: "void", desc: "Resumes playback." },
      { name: "Restart", signature: "tween:Restart()", params: [], returns: "void", desc: "Resets to initial values and starts playback." },
      { name: "Complete", signature: "tween:Complete()", params: [], returns: "void", desc: "Immediately completes playback and invokes OnComplete." },
      { name: "Kill", signature: "tween:Kill(complete)", params: [{ name: "complete", type: "boolean", desc: "Whether to invoke OnComplete." }], returns: "void", desc: "Destroys the tween instance." },
      { name: "SetEase", signature: "tween:SetEase(easeType)", params: [{ name: "easeType", type: "EnumItem.EaseType", desc: "Easing curve function." }], returns: "Tween", desc: "Sets easing curve (e.g. Enum.EaseType.OutQuad, OutBack, InBounce)." },
      { name: "SetLoops", signature: "tween:SetLoops(loops)", params: [{ name: "loops", type: "number", desc: "Number of loops (-1 for infinite)." }], returns: "Tween", desc: "Sets number of playback loops." },
      { name: "SetRelative", signature: "tween:SetRelative(relative)", params: [{ name: "relative", type: "boolean", desc: "Whether target values are additive offsets." }], returns: "Tween", desc: "Sets relative tweening mode." },
      { name: "SetOnComplete", signature: "tween:SetOnComplete(callback)", params: [{ name: "callback", type: "fun()", desc: "Completion callback." }], returns: "Tween", desc: "Sets callback invoked on finish." },
      { name: "SetOnStepComplete", signature: "tween:SetOnStepComplete(callback)", params: [{ name: "callback", type: "fun()", desc: "Step callback." }], returns: "Tween", desc: "Sets callback invoked each loop/step." }
    ]
  },
  {
    id: "TweenSequence",
    name: "TweenSequence",
    category: "Animation",
    badge: "Class",
    description: "Timeline sequencer for chaining and joining tweens, pauses, and callbacks across multiple UI controls.",
    file: "library/TweenSequence.d.lua",
    methods: [
      { name: "Append", signature: "seq:Append(tween)", params: [{ name: "tween", type: "Tween", desc: "Tween to append." }], returns: "TweenSequence", desc: "Appends a Tween to the end of the sequence timeline." },
      { name: "Join", signature: "seq:Join(tween)", params: [{ name: "tween", type: "Tween", desc: "Tween to play in parallel." }], returns: "TweenSequence", desc: "Inserts a Tween at the exact same start time as the previous Tween." },
      { name: "AppendInterval", signature: "seq:AppendInterval(duration)", params: [{ name: "duration", type: "number", desc: "Wait duration in seconds." }], returns: "TweenSequence", desc: "Appends a timed delay interval." },
      { name: "AppendCallback", signature: "seq:AppendCallback(callback)", params: [{ name: "callback", type: "fun()", desc: "Function to execute." }], returns: "TweenSequence", desc: "Appends a callback executed at that point in time." },
      { name: "Insert", signature: "seq:Insert(time, tween)", params: [{ name: "time", type: "number", desc: "Time offset in seconds." }, { name: "tween", type: "Tween", desc: "Tween to insert." }], returns: "TweenSequence", desc: "Inserts a Tween at a specific timestamp." },
      { name: "InsertCallback", signature: "seq:InsertCallback(time, callback)", params: [{ name: "time", type: "number", desc: "Time offset." }, { name: "callback", type: "fun()", desc: "Function." }], returns: "TweenSequence", desc: "Inserts a callback at timestamp." },
      { name: "Play", signature: "seq:Play()", params: [], returns: "TweenSequence", desc: "Starts sequence playback." },
      { name: "Pause", signature: "seq:Pause()", params: [], returns: "void", desc: "Pauses sequence playback." },
      { name: "Resume", signature: "seq:Resume()", params: [], returns: "void", desc: "Resumes playback." },
      { name: "Restart", signature: "seq:Restart()", params: [], returns: "void", desc: "Restarts playback from beginning." },
      { name: "Kill", signature: "seq:Kill(complete)", params: [{ name: "complete", type: "boolean", desc: "Whether to invoke callbacks." }], returns: "void", desc: "Destroys the sequence." },
      { name: "SetLoops", signature: "seq:SetLoops(loops)", params: [{ name: "loops", type: "number", desc: "Loop count (-1 infinite)." }], returns: "TweenSequence", desc: "Sets sequence loop count." },
      { name: "SetOnComplete", signature: "seq:SetOnComplete(callback)", params: [{ name: "callback", type: "fun()", desc: "Completion function." }], returns: "TweenSequence", desc: "Sets final completion callback." }
    ]
  },
  {
    id: "Color",
    name: "Color",
    category: "Globals",
    badge: "Namespace",
    description: "Color construction and transformation utility for fonts, images, backgrounds, and outlines.",
    file: "library/Color.d.lua",
    methods: [
      {
        name: "FromRGB",
        signature: "Color.FromRGB(r, g, b)",
        params: [
          { name: "r", type: "number", desc: "Red 0-255." },
          { name: "g", type: "number", desc: "Green 0-255." },
          { name: "b", type: "number", desc: "Blue 0-255." }
        ],
        returns: "ColorValue",
        desc: "Creates an opaque ColorValue from RGB numbers 0-255."
      },
      {
        name: "FromRGBA",
        signature: "Color.FromRGBA(r, g, b, a?)",
        params: [
          { name: "r", type: "number", desc: "Red 0-255." },
          { name: "g", type: "number", desc: "Green 0-255." },
          { name: "b", type: "number", desc: "Blue 0-255." },
          { name: "a", type: "number?", desc: "Alpha 0-255 (default 255)." }
        ],
        returns: "ColorValue",
        desc: "Creates a ColorValue with transparency."
      },
      {
        name: "ToRGBA",
        signature: "Color.ToRGBA(color)",
        params: [{ name: "color", type: "ColorValue", desc: "The color to deconstruct." }],
        returns: "number r, number g, number b, number a",
        desc: "Splits a ColorValue into four 0-255 RGBA components."
      },
      {
        name: "Color()",
        signature: "Color(r, g, b, a?)",
        params: [
          { name: "r", type: "number", desc: "Red 0-255." },
          { name: "g", type: "number", desc: "Green 0-255." },
          { name: "b", type: "number", desc: "Blue 0-255." },
          { name: "a", type: "number?", desc: "Alpha 0-255." }
        ],
        returns: "ColorValue",
        desc: "Global constructor shorthand for Color.FromRGBA."
      }
    ]
  },
  {
    id: "ServerSignal",
    name: "ServerSignal",
    category: "Networking",
    badge: "Class",
    description: "Data transport object used to construct structured parameter payloads and dispatch signals to Server Node Graphs.",
    file: "library/ServerSignal.d.lua",
    methods: [
      { name: "AddBool", signature: "signal:AddBool(value)", params: [{ name: "value", type: "boolean", desc: "Boolean value." }], returns: "void", desc: "Appends a boolean." },
      { name: "AddBoolList", signature: "signal:AddBoolList(values)", params: [{ name: "values", type: "boolean[]", desc: "Array of booleans." }], returns: "void", desc: "Appends a list of booleans." },
      { name: "AddInt", signature: "signal:AddInt(value)", params: [{ name: "value", type: "number", desc: "Integer number." }], returns: "void", desc: "Appends an integer parameter." },
      { name: "AddIntList", signature: "signal:AddIntList(values)", params: [{ name: "values", type: "number[]", desc: "Array of integers." }], returns: "void", desc: "Appends a list of integers." },
      { name: "AddFloat", signature: "signal:AddFloat(value)", params: [{ name: "value", type: "number", desc: "Floating point number." }], returns: "void", desc: "Appends a float." },
      { name: "AddFloatList", signature: "signal:AddFloatList(values)", params: [{ name: "values", type: "number[]", desc: "Array of floats." }], returns: "void", desc: "Appends a list of floats." },
      { name: "AddString", signature: "signal:AddString(value)", params: [{ name: "value", type: "string", desc: "String text." }], returns: "void", desc: "Appends a string." },
      { name: "AddStringList", signature: "signal:AddStringList(values)", params: [{ name: "values", type: "string[]", desc: "Array of strings." }], returns: "void", desc: "Appends a list of strings." },
      { name: "AddVector3", signature: "signal:AddVector3(value)", params: [{ name: "value", type: "Vector3", desc: "{x, y, z} table." }], returns: "void", desc: "Appends a 3D vector table." },
      { name: "AddVector3List", signature: "signal:AddVector3List(values)", params: [{ name: "values", type: "Vector3[]", desc: "Array of Vector3 tables." }], returns: "void", desc: "Appends vector list." },
      { name: "AddConfigId", signature: "signal:AddConfigId(value)", params: [{ name: "value", type: "number", desc: "Config ID integer." }], returns: "void", desc: "Appends a Config ID." },
      { name: "AddEntity", signature: "signal:AddEntity(value)", params: [{ name: "value", type: "number", desc: "Entity ID." }], returns: "void", desc: "Appends an Entity ID." },
      { name: "AddGuid", signature: "signal:AddGuid(value)", params: [{ name: "value", type: "number", desc: "GUID integer." }], returns: "void", desc: "Appends a GUID." },
      { name: "AddPrefabId", signature: "signal:AddPrefabId(value)", params: [{ name: "value", type: "number", desc: "Prefab ID." }], returns: "void", desc: "Appends a Prefab ID." },
      { name: "AddParam", signature: "signal:AddParam(type, value)", params: [{ name: "type", type: "EnumItem.ParamType", desc: "Enum.ParamType." }, { name: "value", type: "ServerDataType", desc: "Value matching type." }], returns: "void", desc: "Appends a generic parameter according to Enum.ParamType." },
      { name: "SendSignal", signature: "signal:SendSignal()", params: [], returns: "void", desc: "Sends the signal to Node Graphs (Stage Entity is source)." }
    ]
  },
  {
    id: "CursorEventData",
    name: "CursorEventData",
    category: "Events",
    badge: "Class",
    description: "Event payload delivered to cursor callbacks when user clicks, drags, hovers, or releases mouse buttons.",
    file: "library/event_data/CursorEventData.d.lua",
    fields: [
      { name: "dragging", type: "boolean", access: "Read", desc: "Whether user is currently dragging cursor." },
      { name: "touchId", type: "number", access: "Read", desc: "Touch identifier (-1 for mouse)." }
    ],
    methods: [
      { name: "GetUIPos", signature: "eventData:GetUIPos()", params: [], returns: "number x, number y", desc: "Returns cursor position at event moment from bottom-left corner." },
      { name: "GetPressUIPos", signature: "eventData:GetPressUIPos()", params: [], returns: "number x, number y", desc: "Returns cursor position when button was initially pressed." },
      { name: "GetUIPosDelta", signature: "eventData:GetUIPosDelta()", params: [], returns: "number deltaX, number deltaY", desc: "Returns distance cursor moved between start and end of event." }
    ]
  },
  {
    id: "Lifecycles",
    name: "Stage & Script Lifecycles",
    category: "Globals",
    badge: "Lifecycle",
    description: "Exact execution lifecycle order for global scripts, control scripts, frames, and level updates.",
    file: "library/Global.d.lua",
    methods: [
      { name: "OnInit", signature: "function OnInit()", params: [], returns: "void", desc: "Called immediately when the script/control is instantiated." },
      { name: "OnEnable", signature: "function OnEnable()", params: [], returns: "void", desc: "Called when the control becomes active." },
      { name: "OnStart", signature: "function OnStart()", params: [], returns: "void", desc: "Called immediately after OnEnable during initial setup." },
      { name: "OnUpdate", signature: "function OnUpdate(deltaTime)", params: [{ name: "deltaTime", type: "number", desc: "Elapsed time in seconds since previous frame." }], returns: "void", desc: "Called every frame if script:EnableUpdate(true) is set." },
      { name: "OnLevelUpdate", signature: "function OnLevelUpdate(levelDeltaTime)", params: [{ name: "levelDeltaTime", type: "number", desc: "Elapsed level time." }], returns: "void", desc: "Called each frame after OnUpdate when level time is NOT paused." },
      { name: "OnDisable", signature: "function OnDisable()", params: [], returns: "void", desc: "Called when control is deactivated or before being destroyed." },
      { name: "OnDestroy", signature: "function OnDestroy()", params: [], returns: "void", desc: "Called when control is destroyed or stage ends." }
    ]
  },
  {
    id: "MathGlobals",
    name: "Math Extensions & Globals",
    category: "Globals",
    badge: "Global",
    description: "Global runtime check utilities, logging, type inspection, and math extensions.",
    file: "library/Math.d.lua",
    methods: [
      { name: "typeof", signature: "typeof(value)", params: [{ name: "value", type: "any", desc: "Target value." }], returns: "ApiType", desc: "Returns runtime type name ('ClientUIImageControl', 'Tween', 'number', 'string', etc.)." },
      { name: "print", signature: "print(...)", params: [{ name: "...", type: "any", desc: "Values to log." }], returns: "void", desc: "Writes passed values to the log (Client Script logging must be enabled)." },
      { name: "printerr", signature: "printerr(...)", params: [{ name: "...", type: "any", desc: "Values to log as error." }], returns: "void", desc: "Writes passed values to error log in red." },
      { name: "math.isinf", signature: "math.isinf(n)", params: [{ name: "n", type: "number", desc: "Number to check." }], returns: "boolean", desc: "Checks whether a number is positive or negative infinity." },
      { name: "math.isnan", signature: "math.isnan(n)", params: [{ name: "n", type: "number", desc: "Number to check." }], returns: "boolean", desc: "Checks whether a number is NaN." }
    ]
  }
];
