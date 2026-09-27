// ============================================================================
// MILIASTRA LUA SCRIPTING API — ENUM REGISTERS & KEYBINDS
// Complete typed mapping of all 27 Enum tables in library/enums/Enum.d.lua:
//   • Enum.KeyEventType (164 entries = 58 Keyboard Down/Up + 24 Controller Down/Up)
//   • Enum.KeyboardKeyCode (59 entries = 58 PC Semantic Keybinds + None)
//   • Enum.ControllerKeyCode (25 entries = 24 Gamepad Semantic Keybinds + None)
//   • Plus all 24 other Engine Enums (Cursor, Ease, Image, Scroll, Navigation, etc.)
// ============================================================================

// Complete 59-entry registry for Enum.KeyboardKeyCode (used by ClientUIKeyHintControl.keyboardKeyCode)
// Paired with corresponding Enum.KeyEventType Down/Up events
export const KEYBOARD_KEY_CODE_ITEMS = [
  { name: "None", code: 0, glyph: "—", defaultBind: "None", group: "None", eventDown: null, eventUp: null, desc: "No keyboard key hint displayed." },

  // Core Character Skills (E, Q, R, T)
  { name: "CharacterSkill1Key", code: 1, glyph: "E", defaultBind: "E", group: "Character Skills", eventDown: "KeyboardCharacterSkill1KeyDown", eventUp: "KeyboardCharacterSkill1KeyUp", desc: "Elemental Skill / Character Skill 1. Default Keybind: E." },
  { name: "CharacterSkill2Key", code: 2, glyph: "Q", defaultBind: "Q", group: "Character Skills", eventDown: "KeyboardCharacterSkill2KeyDown", eventUp: "KeyboardCharacterSkill2KeyUp", desc: "Elemental Burst / Character Skill 2. Default Keybind: Q." },
  { name: "CharacterSkill3Key", code: 3, glyph: "R", defaultBind: "R", group: "Character Skills", eventDown: "KeyboardCharacterSkill3KeyDown", eventUp: "KeyboardCharacterSkill3KeyUp", desc: "Aim Mode / Character Skill 3. Default Keybind: R (dynamically reflects player's bound key if remapped, e.g. '[')." },
  { name: "CharacterSkill4Key", code: 4, glyph: "T", defaultBind: "T", group: "Character Skills", eventDown: "KeyboardCharacterSkill4KeyDown", eventUp: "KeyboardCharacterSkill4KeyUp", desc: "Special Stage Skill / Character Skill 4. Default Keybind: T." },

  // Core Movement, Combat & Interaction
  { name: "MoveForwardKey", code: 5, glyph: "W", defaultBind: "W", group: "Movement & Combat", eventDown: "KeyboardMoveForwardKeyDown", eventUp: "KeyboardMoveForwardKeyUp", desc: "Move Forward action. Default Keybind: W." },
  { name: "MoveLeftKey", code: 6, glyph: "A", defaultBind: "A", group: "Movement & Combat", eventDown: "KeyboardMoveLeftKeyDown", eventUp: "KeyboardMoveLeftKeyUp", desc: "Move Left action. Default Keybind: A." },
  { name: "MoveBackwardKey", code: 7, glyph: "S", defaultBind: "S", group: "Movement & Combat", eventDown: "KeyboardMoveBackwardKeyDown", eventUp: "KeyboardMoveBackwardKeyUp", desc: "Move Backward action. Default Keybind: S." },
  { name: "MoveRightKey", code: 8, glyph: "D", defaultBind: "D", group: "Movement & Combat", eventDown: "KeyboardMoveRightKeyDown", eventUp: "KeyboardMoveRightKeyUp", desc: "Move Right action. Default Keybind: D." },
  { name: "NormalAttackKey", code: 9, glyph: "LMB", defaultBind: "Left Mouse Button", group: "Movement & Combat", eventDown: "KeyboardNormalAttackKeyDown", eventUp: "KeyboardNormalAttackKeyUp", desc: "Normal Attack action. Default Keybind: Left Mouse Button." },
  { name: "SprintKey", code: 10, glyph: "Shift/RMB", defaultBind: "Right Mouse Button/Left Shift", group: "Movement & Combat", eventDown: "KeyboardSprintKeyDown", eventUp: "KeyboardSprintKeyUp", desc: "Sprint action. Default Keybind: Right Mouse Button / Left Shift." },
  { name: "JumpKey", code: 11, glyph: "Space", defaultBind: "Space", group: "Movement & Combat", eventDown: "KeyboardJumpKeyDown", eventUp: "KeyboardJumpKeyUp", desc: "Jump action. Default Keybind: Space." },
  { name: "InteractKey", code: 12, glyph: "F", defaultBind: "F", group: "Movement & Combat", eventDown: "KeyboardInteractKeyDown", eventUp: "KeyboardInteractKeyUp", desc: "Interact / Pick Up action. Default Keybind: F." },
  { name: "DropKey", code: 13, glyph: "X", defaultBind: "X", group: "Movement & Combat", eventDown: "KeyboardDropKeyDown", eventUp: "KeyboardDropKeyUp", desc: "Drop / Release Climb action. Default Keybind: X." },
  { name: "OpenShortcutWheelKey", code: 14, glyph: "Tab", defaultBind: "Tab", group: "Movement & Combat", eventDown: "KeyboardOpenShortcutWheelKeyDown", eventUp: "KeyboardOpenShortcutWheelKeyUp", desc: "Open Shortcut Wheel. Default Keybind: Tab." },
  { name: "SwitchToWalkOrRunKey", code: 15, glyph: "L-Ctrl", defaultBind: "Left Ctrl", group: "Movement & Combat", eventDown: "KeyboardSwitchToWalkOrRunKeyDown", eventUp: "KeyboardSwitchToWalkOrRunKeyUp", desc: "Switch Between Walk and Run. Default Keybind: Left Ctrl." },

  // Craftsperson Keys 1..10 (Number Row 1..0)
  { name: "CraftspersonKey1", code: 101, glyph: "1", defaultBind: "1", group: "Craftsperson Number Keys (1–0)", eventDown: "KeyboardCraftspersonKey1Down", eventUp: "KeyboardCraftspersonKey1Up", desc: "Craftsperson Key 1. Default Keybind: 1." },
  { name: "CraftspersonKey2", code: 102, glyph: "2", defaultBind: "2", group: "Craftsperson Number Keys (1–0)", eventDown: "KeyboardCraftspersonKey2Down", eventUp: "KeyboardCraftspersonKey2Up", desc: "Craftsperson Key 2. Default Keybind: 2." },
  { name: "CraftspersonKey3", code: 103, glyph: "3", defaultBind: "3", group: "Craftsperson Number Keys (1–0)", eventDown: "KeyboardCraftspersonKey3Down", eventUp: "KeyboardCraftspersonKey3Up", desc: "Craftsperson Key 3. Default Keybind: 3." },
  { name: "CraftspersonKey4", code: 104, glyph: "4", defaultBind: "4", group: "Craftsperson Number Keys (1–0)", eventDown: "KeyboardCraftspersonKey4Down", eventUp: "KeyboardCraftspersonKey4Up", desc: "Craftsperson Key 4. Default Keybind: 4." },
  { name: "CraftspersonKey5", code: 105, glyph: "5", defaultBind: "5", group: "Craftsperson Number Keys (1–0)", eventDown: "KeyboardCraftspersonKey5Down", eventUp: "KeyboardCraftspersonKey5Up", desc: "Craftsperson Key 5. Default Keybind: 5." },
  { name: "CraftspersonKey6", code: 106, glyph: "6", defaultBind: "6", group: "Craftsperson Number Keys (1–0)", eventDown: "KeyboardCraftspersonKey6Down", eventUp: "KeyboardCraftspersonKey6Up", desc: "Craftsperson Key 6. Default Keybind: 6." },
  { name: "CraftspersonKey7", code: 107, glyph: "7", defaultBind: "7", group: "Craftsperson Number Keys (1–0)", eventDown: "KeyboardCraftspersonKey7Down", eventUp: "KeyboardCraftspersonKey7Up", desc: "Craftsperson Key 7. Default Keybind: 7." },
  { name: "CraftspersonKey8", code: 108, glyph: "8", defaultBind: "8", group: "Craftsperson Number Keys (1–0)", eventDown: "KeyboardCraftspersonKey8Down", eventUp: "KeyboardCraftspersonKey8Up", desc: "Craftsperson Key 8. Default Keybind: 8." },
  { name: "CraftspersonKey9", code: 109, glyph: "9", defaultBind: "9", group: "Craftsperson Number Keys (1–0)", eventDown: "KeyboardCraftspersonKey9Down", eventUp: "KeyboardCraftspersonKey9Up", desc: "Craftsperson Key 9. Default Keybind: 9." },
  { name: "CraftspersonKey10", code: 110, glyph: "0", defaultBind: "0", group: "Craftsperson Number Keys (1–0)", eventDown: "KeyboardCraftspersonKey10Down", eventUp: "KeyboardCraftspersonKey10Up", desc: "Craftsperson Key 10. Default Keybind: 0." },

  // Craftsperson Keys 11..22 (Letter Keys)
  { name: "CraftspersonKey11", code: 111, glyph: "U", defaultBind: "U", group: "Craftsperson Letter Keys", eventDown: "KeyboardCraftspersonKey11Down", eventUp: "KeyboardCraftspersonKey11Up", desc: "Craftsperson Key 11. Default Keybind: U." },
  { name: "CraftspersonKey12", code: 112, glyph: "Z", defaultBind: "Z", group: "Craftsperson Letter Keys", eventDown: "KeyboardCraftspersonKey12Down", eventUp: "KeyboardCraftspersonKey12Up", desc: "Craftsperson Key 12. Default Keybind: Z." },
  { name: "CraftspersonKey13", code: 113, glyph: "Y", defaultBind: "Y", group: "Craftsperson Letter Keys", eventDown: "KeyboardCraftspersonKey13Down", eventUp: "KeyboardCraftspersonKey13Up", desc: "Craftsperson Key 13. Default Keybind: Y." },
  { name: "CraftspersonKey14", code: 114, glyph: "G", defaultBind: "G", group: "Craftsperson Letter Keys", eventDown: "KeyboardCraftspersonKey14Down", eventUp: "KeyboardCraftspersonKey14Up", desc: "Craftsperson Key 14. Default Keybind: G." },
  { name: "CraftspersonKey15", code: 115, glyph: "H", defaultBind: "H", group: "Craftsperson Letter Keys", eventDown: "KeyboardCraftspersonKey15Down", eventUp: "KeyboardCraftspersonKey15Up", desc: "Craftsperson Key 15. Default Keybind: H." },
  { name: "CraftspersonKey16", code: 116, glyph: "I", defaultBind: "I", group: "Craftsperson Letter Keys", eventDown: "KeyboardCraftspersonKey16Down", eventUp: "KeyboardCraftspersonKey16Up", desc: "Craftsperson Key 16. Default Keybind: I." },
  { name: "CraftspersonKey17", code: 117, glyph: "O", defaultBind: "O", group: "Craftsperson Letter Keys", eventDown: "KeyboardCraftspersonKey17Down", eventUp: "KeyboardCraftspersonKey17Up", desc: "Craftsperson Key 17. Default Keybind: O." },
  { name: "CraftspersonKey18", code: 118, glyph: "P", defaultBind: "P", group: "Craftsperson Letter Keys", eventDown: "KeyboardCraftspersonKey18Down", eventUp: "KeyboardCraftspersonKey18Up", desc: "Craftsperson Key 18. Default Keybind: P." },
  { name: "CraftspersonKey19", code: 119, glyph: "J", defaultBind: "J", group: "Craftsperson Letter Keys", eventDown: "KeyboardCraftspersonKey19Down", eventUp: "KeyboardCraftspersonKey19Up", desc: "Craftsperson Key 19. Default Keybind: J." },
  { name: "CraftspersonKey20", code: 120, glyph: "K", defaultBind: "K", group: "Craftsperson Letter Keys", eventDown: "KeyboardCraftspersonKey20Down", eventUp: "KeyboardCraftspersonKey20Up", desc: "Craftsperson Key 20. Default Keybind: K." },
  { name: "CraftspersonKey21", code: 121, glyph: "L", defaultBind: "L", group: "Craftsperson Letter Keys", eventDown: "KeyboardCraftspersonKey21Down", eventUp: "KeyboardCraftspersonKey21Up", desc: "Craftsperson Key 21. Default Keybind: L." },
  { name: "CraftspersonKey22", code: 122, glyph: "V", defaultBind: "V", group: "Craftsperson Letter Keys", eventDown: "KeyboardCraftspersonKey22Down", eventUp: "KeyboardCraftspersonKey22Up", desc: "Craftsperson Key 22. Default Keybind: V." },

  // Craftsperson Keys 23..28 (Function Keys F5..F10)
  { name: "CraftspersonKey23", code: 123, glyph: "F5", defaultBind: "F5", group: "Craftsperson Function & Symbol Keys", eventDown: "KeyboardCraftspersonKey23Down", eventUp: "KeyboardCraftspersonKey23Up", desc: "Craftsperson Key 23. Default Keybind: F5." },
  { name: "CraftspersonKey24", code: 124, glyph: "F6", defaultBind: "F6", group: "Craftsperson Function & Symbol Keys", eventDown: "KeyboardCraftspersonKey24Down", eventUp: "KeyboardCraftspersonKey24Up", desc: "Craftsperson Key 24. Default Keybind: F6." },
  { name: "CraftspersonKey25", code: 125, glyph: "F7", defaultBind: "F7", group: "Craftsperson Function & Symbol Keys", eventDown: "KeyboardCraftspersonKey25Down", eventUp: "KeyboardCraftspersonKey25Up", desc: "Craftsperson Key 25. Default Keybind: F7." },
  { name: "CraftspersonKey26", code: 126, glyph: "F8", defaultBind: "F8", group: "Craftsperson Function & Symbol Keys", eventDown: "KeyboardCraftspersonKey26Down", eventUp: "KeyboardCraftspersonKey26Up", desc: "Craftsperson Key 26. Default Keybind: F8." },
  { name: "CraftspersonKey27", code: 127, glyph: "F9", defaultBind: "F9", group: "Craftsperson Function & Symbol Keys", eventDown: "KeyboardCraftspersonKey27Down", eventUp: "KeyboardCraftspersonKey27Up", desc: "Craftsperson Key 27. Default Keybind: F9." },
  { name: "CraftspersonKey28", code: 128, glyph: "F10", defaultBind: "F10", group: "Craftsperson Function & Symbol Keys", eventDown: "KeyboardCraftspersonKey28Down", eventUp: "KeyboardCraftspersonKey28Up", desc: "Craftsperson Key 28. Default Keybind: F10." },

  // Craftsperson Keys 29..43 (Symbols, Arrows & Modifiers)
  { name: "CraftspersonKey29", code: 129, glyph: "`", defaultBind: "`", group: "Craftsperson Function & Symbol Keys", eventDown: "KeyboardCraftspersonKey29Down", eventUp: "KeyboardCraftspersonKey29Up", desc: "Craftsperson Key 29. Default Keybind: ` (Backtick / Tilde)." },
  { name: "CraftspersonKey30", code: 130, glyph: "-", defaultBind: "-", group: "Craftsperson Function & Symbol Keys", eventDown: "KeyboardCraftspersonKey30Down", eventUp: "KeyboardCraftspersonKey30Up", desc: "Craftsperson Key 30. Default Keybind: - (Minus)." },
  { name: "CraftspersonKey31", code: 131, glyph: "=", defaultBind: "=", group: "Craftsperson Function & Symbol Keys", eventDown: "KeyboardCraftspersonKey31Down", eventUp: "KeyboardCraftspersonKey31Up", desc: "Craftsperson Key 31. Default Keybind: = (Equals)." },
  { name: "CraftspersonKey32", code: 132, glyph: "[", defaultBind: "[", group: "Craftsperson Function & Symbol Keys", eventDown: "KeyboardCraftspersonKey32Down", eventUp: "KeyboardCraftspersonKey32Up", desc: "Craftsperson Key 32. Default Keybind: [ (Left Bracket)." },
  { name: "CraftspersonKey33", code: 133, glyph: ",", defaultBind: ",", group: "Craftsperson Function & Symbol Keys", eventDown: "KeyboardCraftspersonKey33Down", eventUp: "KeyboardCraftspersonKey33Up", desc: "Craftsperson Key 33. Default Keybind: , (Comma)." },
  { name: "CraftspersonKey34", code: 134, glyph: ".", defaultBind: ".", group: "Craftsperson Function & Symbol Keys", eventDown: "KeyboardCraftspersonKey34Down", eventUp: "KeyboardCraftspersonKey34Up", desc: "Craftsperson Key 34. Default Keybind: . (Period)." },
  { name: "CraftspersonKey35", code: 135, glyph: "/", defaultBind: "/", group: "Craftsperson Function & Symbol Keys", eventDown: "KeyboardCraftspersonKey35Down", eventUp: "KeyboardCraftspersonKey35Up", desc: "Craftsperson Key 35. Default Keybind: / (Slash)." },
  { name: "CraftspersonKey36", code: 136, glyph: "↑", defaultBind: "↑", group: "Craftsperson Arrows & Modifiers", eventDown: "KeyboardCraftspersonKey36Down", eventUp: "KeyboardCraftspersonKey36Up", desc: "Craftsperson Key 36. Default Keybind: ↑ (Up Arrow)." },
  { name: "CraftspersonKey37", code: 137, glyph: "↓", defaultBind: "↓", group: "Craftsperson Arrows & Modifiers", eventDown: "KeyboardCraftspersonKey37Down", eventUp: "KeyboardCraftspersonKey37Up", desc: "Craftsperson Key 37. Default Keybind: ↓ (Down Arrow)." },
  { name: "CraftspersonKey38", code: 138, glyph: "←", defaultBind: "←", group: "Craftsperson Arrows & Modifiers", eventDown: "KeyboardCraftspersonKey38Down", eventUp: "KeyboardCraftspersonKey38Up", desc: "Craftsperson Key 38. Default Keybind: ← (Left Arrow)." },
  { name: "CraftspersonKey39", code: 139, glyph: "→", defaultBind: "→", group: "Craftsperson Arrows & Modifiers", eventDown: "KeyboardCraftspersonKey39Down", eventUp: "KeyboardCraftspersonKey39Up", desc: "Craftsperson Key 39. Default Keybind: → (Right Arrow)." },
  { name: "CraftspersonKey40", code: 140, glyph: "R-Ctrl", defaultBind: "Right Ctrl", group: "Craftsperson Arrows & Modifiers", eventDown: "KeyboardCraftspersonKey40Down", eventUp: "KeyboardCraftspersonKey40Up", desc: "Craftsperson Key 40. Default Keybind: Right Ctrl." },
  { name: "CraftspersonKey41", code: 141, glyph: "R-Shift", defaultBind: "Right Shift", group: "Craftsperson Arrows & Modifiers", eventDown: "KeyboardCraftspersonKey41Down", eventUp: "KeyboardCraftspersonKey41Up", desc: "Craftsperson Key 41. Default Keybind: Right Shift." },
  { name: "CraftspersonKey42", code: 142, glyph: "Bksp", defaultBind: "Backspace", group: "Craftsperson Arrows & Modifiers", eventDown: "KeyboardCraftspersonKey42Down", eventUp: "KeyboardCraftspersonKey42Up", desc: "Craftsperson Key 42. Default Keybind: Backspace." },
  { name: "CraftspersonKey43", code: 143, glyph: "Caps", defaultBind: "Caps Lock", group: "Craftsperson Arrows & Modifiers", eventDown: "KeyboardCraftspersonKey43Down", eventUp: "KeyboardCraftspersonKey43Up", desc: "Craftsperson Key 43. Default Keybind: Caps Lock." }
];

// Complete 25-entry registry for Enum.ControllerKeyCode (used by ClientUIKeyHintControl.controllerKeyCode)
// Matches the Miliastra Editor Gamepad KeyHint dropdown & Enum.d.lua specification
export const CONTROLLER_KEY_CODE_ITEMS = [
  { name: "None", code: 0, glyph: "—", defaultBind: "None", group: "None", badgeKind: "none", eventDown: null, eventUp: null, desc: "No controller button hint displayed." },

  // Core Gamepad Actions
  { name: "NormalAttackKey", code: 1, glyph: "B", defaultBind: "B", group: "Core Combat & Actions", badgeKind: "face-b", eventDown: "ControllerNormalAttackKeyDown", eventUp: "ControllerNormalAttackKeyUp", desc: "Normal Attack. Default Gamepad Keybind: B." },
  { name: "SprintKey", code: 2, glyph: "RB", defaultBind: "Right Button", group: "Core Combat & Actions", badgeKind: "bumper", eventDown: "ControllerSprintKeyDown", eventUp: "ControllerSprintKeyUp", desc: "Sprint / Dodge. Default Gamepad Keybind: Right Button (RB)." },
  { name: "JumpKey", code: 3, glyph: "A", defaultBind: "A", group: "Core Combat & Actions", badgeKind: "face-a", eventDown: "ControllerJumpKeyDown", eventUp: "ControllerJumpKeyUp", desc: "Jump. Default Gamepad Keybind: A." },
  { name: "InteractKey", code: 4, glyph: "X", defaultBind: "X", group: "Core Combat & Actions", badgeKind: "face-x", eventDown: "ControllerInteractKeyDown", eventUp: "ControllerInteractKeyUp", desc: "Interact. Default Gamepad Keybind: X." },
  { name: "CharacterSkill1Key", code: 5, glyph: "RT", defaultBind: "Right Trigger", group: "Core Combat & Actions", badgeKind: "trigger", eventDown: "ControllerCharacterSkill1KeyDown", eventUp: "ControllerCharacterSkill1KeyUp", desc: "Character Skill 1 (Elemental Skill). Default Gamepad Keybind: Right Trigger (RT)." },
  { name: "CharacterSkill2Key", code: 6, glyph: "Y", defaultBind: "Y", group: "Core Combat & Actions", badgeKind: "face-y", eventDown: "ControllerCharacterSkill2KeyDown", eventUp: "ControllerCharacterSkill2KeyUp", desc: "Character Skill 2 (Elemental Burst). Default Gamepad Keybind: Y." },
  { name: "CharacterSkill3Key", code: 7, glyph: "D-Up", defaultBind: "D-pad Up", group: "Core Combat & Actions", badgeKind: "dpad-up", eventDown: "ControllerCharacterSkill3KeyDown", eventUp: "ControllerCharacterSkill3KeyUp", desc: "Character Skill 3. Default Gamepad Keybind: D-pad Up." },
  { name: "CharacterSkill4Key", code: 8, glyph: "D-Down", defaultBind: "D-pad Down", group: "Core Combat & Actions", badgeKind: "dpad-down", eventDown: "ControllerCharacterSkill4KeyDown", eventUp: "ControllerCharacterSkill4KeyUp", desc: "Character Skill 4. Default Gamepad Keybind: D-pad Down." },
  { name: "MenuConfirmKey", code: 9, glyph: "A / ◯", defaultBind: "Determined by controller navigation settings", group: "Menu Navigation", badgeKind: "face-a", eventDown: "ControllerMenuConfirmKeyDown", eventUp: "ControllerMenuConfirmKeyUp", desc: "Menu Confirm. Determined by controller navigation settings." },
  { name: "MenuBackKey", code: 10, glyph: "B / ✕", defaultBind: "Determined by controller navigation settings", group: "Menu Navigation", badgeKind: "face-b", eventDown: "ControllerMenuBackKeyDown", eventUp: "ControllerMenuBackKeyUp", desc: "Menu Back / Cancel. Determined by controller navigation settings." },

  // Craftsperson Gamepad Keys 1..14 (D-pad, Triggers & Left Button Combinations)
  { name: "CraftspersonKey1", code: 201, glyph: "D-Up", defaultBind: "D-pad Up", group: "Craftsperson Keys (Single & LB Combos)", badgeKind: "dpad-up", eventDown: "ControllerCraftspersonKey1Down", eventUp: "ControllerCraftspersonKey1Up", desc: "Craftsperson Key 1. Default Gamepad Keybind: D-pad Up." },
  { name: "CraftspersonKey2", code: 202, glyph: "D-Down", defaultBind: "D-pad Down", group: "Craftsperson Keys (Single & LB Combos)", badgeKind: "dpad-down", eventDown: "ControllerCraftspersonKey2Down", eventUp: "ControllerCraftspersonKey2Up", desc: "Craftsperson Key 2. Default Gamepad Keybind: D-pad Down." },
  { name: "CraftspersonKey3", code: 203, glyph: "LT", defaultBind: "Left Trigger", group: "Craftsperson Keys (Single & LB Combos)", badgeKind: "trigger", eventDown: "ControllerCraftspersonKey3Down", eventUp: "ControllerCraftspersonKey3Up", desc: "Craftsperson Key 3. Default Gamepad Keybind: Left Trigger (LT)." },
  { name: "CraftspersonKey4", code: 204, glyph: "LB+Y", defaultBind: "Left Button + Y", group: "Craftsperson Keys (Single & LB Combos)", badgeKind: "combo", comboLeft: "LB", comboRight: "Y", eventDown: "ControllerCraftspersonKey4Down", eventUp: "ControllerCraftspersonKey4Up", desc: "Craftsperson Key 4. Default Gamepad Keybind: Left Button + Y." },
  { name: "CraftspersonKey5", code: 205, glyph: "LB+X", defaultBind: "Left Button + X", group: "Craftsperson Keys (Single & LB Combos)", badgeKind: "combo", comboLeft: "LB", comboRight: "X", eventDown: "ControllerCraftspersonKey5Down", eventUp: "ControllerCraftspersonKey5Up", desc: "Craftsperson Key 5. Default Gamepad Keybind: Left Button + X." },
  { name: "CraftspersonKey6", code: 206, glyph: "LB+A", defaultBind: "Left Button + A", group: "Craftsperson Keys (Single & LB Combos)", badgeKind: "combo", comboLeft: "LB", comboRight: "A", eventDown: "ControllerCraftspersonKey6Down", eventUp: "ControllerCraftspersonKey6Up", desc: "Craftsperson Key 6. Default Gamepad Keybind: Left Button + A." },
  { name: "CraftspersonKey7", code: 207, glyph: "LB+↑", defaultBind: "Left Button + D-pad Up", group: "Craftsperson Keys (Single & LB Combos)", badgeKind: "combo", comboLeft: "LB", comboRight: "D-Up", eventDown: "ControllerCraftspersonKey7Down", eventUp: "ControllerCraftspersonKey7Up", desc: "Craftsperson Key 7. Default Gamepad Keybind: Left Button + D-pad Up." },
  { name: "CraftspersonKey8", code: 208, glyph: "LB+→", defaultBind: "Left Button + D-pad Right", group: "Craftsperson Keys (Single & LB Combos)", badgeKind: "combo", comboLeft: "LB", comboRight: "D-Right", eventDown: "ControllerCraftspersonKey8Down", eventUp: "ControllerCraftspersonKey8Up", desc: "Craftsperson Key 8. Default Gamepad Keybind: Left Button + D-pad Right." },
  { name: "CraftspersonKey9", code: 209, glyph: "LB+←", defaultBind: "Left Button + D-pad Left", group: "Craftsperson Keys (Single & LB Combos)", badgeKind: "combo", comboLeft: "LB", comboRight: "D-Left", eventDown: "ControllerCraftspersonKey9Down", eventUp: "ControllerCraftspersonKey9Up", desc: "Craftsperson Key 9. Default Gamepad Keybind: Left Button + D-pad Left." },
  { name: "CraftspersonKey10", code: 210, glyph: "LB+↓", defaultBind: "Left Button + D-pad Down", group: "Craftsperson Keys (Single & LB Combos)", badgeKind: "combo", comboLeft: "LB", comboRight: "D-Down", eventDown: "ControllerCraftspersonKey10Down", eventUp: "ControllerCraftspersonKey10Up", desc: "Craftsperson Key 10. Default Gamepad Keybind: Left Button + D-pad Down." },
  { name: "CraftspersonKey11", code: 211, glyph: "LB+RB", defaultBind: "Left Button + Right Button", group: "Craftsperson Keys (Single & LB Combos)", badgeKind: "combo", comboLeft: "LB", comboRight: "RB", eventDown: "ControllerCraftspersonKey11Down", eventUp: "ControllerCraftspersonKey11Up", desc: "Craftsperson Key 11. Default Gamepad Keybind: Left Button + Right Button." },
  { name: "CraftspersonKey12", code: 212, glyph: "LB+LT", defaultBind: "Left Button + Left Trigger", group: "Craftsperson Keys (Single & LB Combos)", badgeKind: "combo", comboLeft: "LB", comboRight: "LT", eventDown: "ControllerCraftspersonKey12Down", eventUp: "ControllerCraftspersonKey12Up", desc: "Craftsperson Key 12. Default Gamepad Keybind: Left Button + Left Trigger." },
  { name: "CraftspersonKey13", code: 213, glyph: "LB+RT", defaultBind: "Left Button + Right Trigger", group: "Craftsperson Keys (Single & LB Combos)", badgeKind: "combo", comboLeft: "LB", comboRight: "RT", eventDown: "ControllerCraftspersonKey13Down", eventUp: "ControllerCraftspersonKey13Up", desc: "Craftsperson Key 13. Default Gamepad Keybind: Left Button + Right Trigger." },
  { name: "CraftspersonKey14", code: 214, glyph: "LB+LS", defaultBind: "Left Button + Left Stick (Press)", group: "Craftsperson Keys (Single & LB Combos)", badgeKind: "combo", comboLeft: "LB", comboRight: "LS", eventDown: "ControllerCraftspersonKey14Down", eventUp: "ControllerCraftspersonKey14Up", desc: "Craftsperson Key 14. Default Gamepad Keybind: Left Button + Left Stick (Press)." }
];

// Build all 164 Enum.KeyEventType items directly from the 58 Keyboard actions (Down + Up = 116)
// and 24 Controller actions (Down + Up = 48) defined in library/enums/Enum.d.lua
function buildCompleteKeyEventTypeItems() {
  const items = [];

  for (const kb of KEYBOARD_KEY_CODE_ITEMS) {
    if (kb.name === "None" || !kb.eventDown || !kb.eventUp) continue;
    items.push({
      name: kb.eventDown,
      defaultBind: kb.defaultBind,
      desc: `Triggers on ${kb.defaultBind} press`
    });
    items.push({
      name: kb.eventUp,
      defaultBind: kb.defaultBind,
      desc: `Triggers on ${kb.defaultBind} release`
    });
  }

  for (const ctrl of CONTROLLER_KEY_CODE_ITEMS) {
    if (ctrl.name === "None" || !ctrl.eventDown || !ctrl.eventUp) continue;
    items.push({
      name: ctrl.eventDown,
      defaultBind: ctrl.defaultBind,
      desc: `Triggers on ${ctrl.defaultBind} press`
    });
    items.push({
      name: ctrl.eventUp,
      defaultBind: ctrl.defaultBind,
      desc: `Triggers on ${ctrl.defaultBind} is release`
    });
  }

  return items;
}

export const ENUM_DEFINITIONS = [
  {
    id: "Enum.KeyEventType",
    name: "Enum.KeyEventType",
    category: "Input",
    description: "All 164 semantic input events (116 Keyboard Down/Up + 48 Controller Down/Up) triggered on key press and release. Bound to player's in-game keybinds — always pair with ClientUIKeyHintControl instead of static text!",
    items: buildCompleteKeyEventTypeItems()
  },
  {
    id: "Enum.KeyboardKeyCode",
    name: "Enum.KeyboardKeyCode",
    category: "Input",
    description: "All 59 semantic PC Keyboard & Mouse keybind codes for ClientUIKeyHintControl.keyboardKeyCode. Automatically renders the player's actual bound key in-game (e.g. if player rebound Skill 3 'R' to '[').",
    items: KEYBOARD_KEY_CODE_ITEMS.map(k => ({
      name: k.name,
      defaultBind: k.defaultBind,
      desc: k.desc + (k.eventDown ? `` : "")
    }))
  },
  {
    id: "Enum.ControllerKeyCode",
    name: "Enum.ControllerKeyCode",
    category: "Input",
    description: "All 25 semantic Gamepad Controller button & LB-combination codes for ClientUIKeyHintControl.controllerKeyCode. Automatically displays the player's active controller prompt.",
    items: CONTROLLER_KEY_CODE_ITEMS.map(c => ({
      name: c.name,
      defaultBind: c.defaultBind,
      desc: c.desc + (c.eventDown ? `` : "")
    }))
  },
  {
    id: "Enum.ControllerNavigationDir",
    name: "Enum.ControllerNavigationDir",
    category: "Input",
    description: "Directional focus movement axes for controller UI navigation (control:SetControllerNavigation).",
    items: [
      { name: "Up", desc: "Navigate upward from the focused control." },
      { name: "Down", desc: "Navigate downward from the focused control." },
      { name: "Left", desc: "Navigate left from the focused control." },
      { name: "Right", desc: "Navigate right from the focused control." }
    ]
  },
  {
    id: "Enum.ControllerNavigationEventType",
    name: "Enum.ControllerNavigationEventType",
    category: "Input",
    description: "Controller navigation and analog stick events for control:AddNavigationEventListener.",
    items: [
      { name: "Confirm", desc: "Triggered when the controller confirm button is pressed on the focused control." },
      { name: "Cancel", desc: "Triggered when the controller cancel/back button is pressed." },
      { name: "Focus", desc: "Triggered when the control receives controller focus." },
      { name: "LostFocus", desc: "Triggered when the control loses controller focus." },
      { name: "RightStickUp", desc: "Triggered when the right stick is tilted upward." },
      { name: "RightStickDown", desc: "Triggered when the right stick is tilted downward." },
      { name: "RightStickLeft", desc: "Triggered when the right stick is tilted left." },
      { name: "RightStickRight", desc: "Triggered when the right stick is tilted right." },
      { name: "LeftStickUp", desc: "Triggered when the left stick is tilted upward." },
      { name: "LeftStickDown", desc: "Triggered when the left stick is tilted downward." },
      { name: "LeftStickLeft", desc: "Triggered when the left stick is tilted left." },
      { name: "LeftStickRight", desc: "Triggered when the left stick is tilted right." }
    ]
  },
  {
    id: "Enum.ControllerNavigationMode",
    name: "Enum.ControllerNavigationMode",
    category: "Input",
    description: "Target resolution mode for controller focus navigation.",
    items: [
      { name: "None", desc: "Disables controller navigation in the specified direction." },
      { name: "NearestControl", desc: "Automatically focuses the nearest focusable control in that direction." },
      { name: "Specified", desc: "Focuses the explicit target control passed to SetControllerNavigation." }
    ]
  },
  {
    id: "Enum.CursorEventType",
    name: "Enum.CursorEventType",
    category: "Events",
    description: "Mouse and touch cursor interaction events attached to ClientUIPresetButtonControl and ClientUICursorEventAreaControl.",
    items: [
      { name: "CursorClick", desc: "Triggered when both CursorDown and CursorUp occur without leaving the bounding box." },
      { name: "CursorDown", desc: "Triggered when primary cursor button is pressed." },
      { name: "CursorUp", desc: "Triggered when primary cursor button is released." },
      { name: "CursorEnter", desc: "Triggered when cursor enters the bounding box of the control." },
      { name: "CursorExit", desc: "Triggered when cursor exits the bounding box of the control." },
      { name: "CursorBeginDrag", desc: "Triggered the instant movement begins after mouse is held down." },
      { name: "CursorDrag", desc: "Triggered every frame the mouse moves while held down." },
      { name: "CursorEndDrag", desc: "Triggered the instant the mouse is released during dragging." }
    ]
  },
  {
    id: "Enum.EaseType",
    name: "Enum.EaseType",
    category: "Animation",
    description: "All 31 mathematical interpolation curves used in Tween and TweenSequence animations.",
    items: [
      { name: "Linear", desc: "Constant rate of change with no acceleration." },
      { name: "InQuad", desc: "Accelerates from zero velocity quadratically." },
      { name: "OutQuad", desc: "Decelerates to zero velocity quadratically." },
      { name: "InOutQuad", desc: "Accelerates then decelerates quadratically." },
      { name: "InCubic", desc: "Cubic easing in (faster initial acceleration)." },
      { name: "OutCubic", desc: "Cubic easing out." },
      { name: "InOutCubic", desc: "Cubic easing in and out." },
      { name: "InQuart", desc: "Quartic easing in (t^4)." },
      { name: "OutQuart", desc: "Quartic easing out." },
      { name: "InOutQuart", desc: "Quartic in and out." },
      { name: "InQuint", desc: "Quintic easing in (t^5)." },
      { name: "OutQuint", desc: "Quintic easing out." },
      { name: "InOutQuint", desc: "Quintic in and out." },
      { name: "InSine", desc: "Sinusoidal easing in." },
      { name: "OutSine", desc: "Sinusoidal easing out." },
      { name: "InOutSine", desc: "Sinusoidal in and out." },
      { name: "InExpo", desc: "Exponential acceleration." },
      { name: "OutExpo", desc: "Exponential deceleration." },
      { name: "InOutExpo", desc: "Exponential in and out." },
      { name: "InCirc", desc: "Circular easing in." },
      { name: "OutCirc", desc: "Circular easing out." },
      { name: "InOutCirc", desc: "Circular in and out." },
      { name: "InElastic", desc: "Elastic bounce in with decaying oscillation." },
      { name: "OutElastic", desc: "Elastic bounce out." },
      { name: "InOutElastic", desc: "Elastic bounce in and out." },
      { name: "InBack", desc: "Pulls back before shooting forward." },
      { name: "OutBack", desc: "Overshoots destination and settles back." },
      { name: "InOutBack", desc: "Pulls back and overshoots." },
      { name: "InBounce", desc: "Bounces like a falling ball on arrival at start." },
      { name: "OutBounce", desc: "Bounces like a rubber ball on arrival at destination." },
      { name: "InOutBounce", desc: "Bounces on start and arrival." }
    ]
  },
  {
    id: "Enum.ImageSource",
    name: "Enum.ImageSource",
    category: "Graphics",
    description: "Asset source category for loading UI images and textures in ClientUIImageControl.",
    items: [
      { name: "StaticReference", desc: "Static UI sprite or basic shape reference (100001..100006)." },
      { name: "Currency", desc: "Game currency asset icons." },
      { name: "Equipment", desc: "Weapons, armor, and gear icons." },
      { name: "Faction", desc: "Covenant and faction sigils." },
      { name: "Item", desc: "Consumables, materials, and inventory items." },
      { name: "Prefab", desc: "Prefab preview icons." },
      { name: "Skill", desc: "Character skill and spell icons." },
      { name: "UnitStatus", desc: "Buff, debuff, and status effect glyphs." }
    ]
  },
  {
    id: "Enum.ImageType",
    name: "Enum.ImageType",
    category: "Graphics",
    description: "Image sizing and stretching mode for ClientUIImageControl.",
    items: [
      { name: "Basic", desc: "Preserves original sprite aspect / basic rendering." },
      { name: "Stretch", desc: "Stretches the image to fill the control's bounding box." }
    ]
  },
  {
    id: "Enum.ImageFillType",
    name: "Enum.ImageFillType",
    category: "Graphics",
    description: "Fill masking mode for progressive health bars, cooldown clocks, and meters.",
    items: [
      { name: "Unused", desc: "Full image rendered without progress masking." },
      { name: "Horizontal", desc: "Fills horizontally from Left or Right edge." },
      { name: "Vertical", desc: "Fills vertically from Bottom or Top edge." },
      { name: "Radial90", desc: "Quarter-circle 90-degree fan fill from one corner." },
      { name: "Radial180", desc: "Half-circle 180-degree semicircular fill." },
      { name: "Radial360", desc: "Full 360-degree circular radial fill (skill cooldown clock)." }
    ]
  },
  {
    id: "Enum.ImageFillHorizontalType",
    name: "Enum.ImageFillHorizontalType",
    category: "Graphics",
    description: "Origin edge for Horizontal image progress fill.",
    items: [
      { name: "Left", desc: "Fills from the left edge toward the right." },
      { name: "Right", desc: "Fills from the right edge toward the left." }
    ]
  },
  {
    id: "Enum.ImageFillVerticalType",
    name: "Enum.ImageFillVerticalType",
    category: "Graphics",
    description: "Origin edge for Vertical image progress fill.",
    items: [
      { name: "Bottom", desc: "Fills from the bottom edge upward." },
      { name: "Top", desc: "Fills from the top edge downward." }
    ]
  },
  {
    id: "Enum.ImageFillRadial90Type",
    name: "Enum.ImageFillRadial90Type",
    category: "Graphics",
    description: "Corner pivot point for 90-degree radial image fill.",
    items: [
      { name: "BottomLeft", desc: "90° fan anchored at bottom-left corner." },
      { name: "TopLeft", desc: "90° fan anchored at top-left corner." },
      { name: "TopRight", desc: "90° fan anchored at top-right corner." },
      { name: "BottomRight", desc: "90° fan anchored at bottom-right corner." }
    ]
  },
  {
    id: "Enum.ImageFillRadialType",
    name: "Enum.ImageFillRadialType",
    category: "Graphics",
    description: "Starting cardinal position for 180-degree and 360-degree radial fills.",
    items: [
      { name: "Bottom", desc: "Starts radial sweep from the bottom." },
      { name: "Top", desc: "Starts radial sweep from the top (12 o'clock)." },
      { name: "Left", desc: "Starts radial sweep from the left." },
      { name: "Right", desc: "Starts radial sweep from the right." }
    ]
  },
  {
    id: "Enum.ImageMaskSoftEdgeMode",
    name: "Enum.ImageMaskSoftEdgeMode",
    category: "Graphics",
    description: "Unit mode for soft-edge feathering on ClientUIImageControl masks.",
    items: [
      { name: "Pixel", desc: "Soft edge width specified in pixels (softEdgeWidthX / softEdgeWidthY)." },
      { name: "Percentage", desc: "Soft edge range specified as a percentage (horizontalSoftRange / verticalSoftRange)." }
    ]
  },
  {
    id: "Enum.TextHorizontalAlignment",
    name: "Enum.TextHorizontalAlignment",
    category: "Typography",
    description: "Horizontal text alignment within ClientUITextBoxControl and ClientUITextWindowControl.",
    items: [
      { name: "Left", desc: "Aligns text to the left edge." },
      { name: "Middle", desc: "Centers text horizontally." },
      { name: "Right", desc: "Aligns text to the right edge." }
    ]
  },
  {
    id: "Enum.TextVerticalAlignment",
    name: "Enum.TextVerticalAlignment",
    category: "Typography",
    description: "Vertical text alignment within ClientUITextBoxControl and ClientUITextWindowControl.",
    items: [
      { name: "Top", desc: "Aligns text to the top of the box." },
      { name: "Middle", desc: "Centers text vertically." },
      { name: "Bottom", desc: "Aligns text to the bottom of the box." }
    ]
  },
  {
    id: "Enum.ScrollDirection",
    name: "Enum.ScrollDirection",
    category: "Layout",
    description: "Scrolling axis for ClientUIGridScrollerControl.",
    items: [
      { name: "Horizontal", desc: "Scrolls horizontally left and right." },
      { name: "Vertical", desc: "Scrolls vertically up and down." }
    ]
  },
  {
    id: "Enum.ScrollLayoutConstraint",
    name: "Enum.ScrollLayoutConstraint",
    category: "Layout",
    description: "Row/column wrapping mode for ClientUIGridScrollerControl.",
    items: [
      { name: "AutoWrap", desc: "Automatically wraps items based on container dimensions." },
      { name: "Fixed", desc: "Fixes the column/row count to layoutConstraintFixedCount." }
    ]
  },
  {
    id: "Enum.ScrollAlignType",
    name: "Enum.ScrollAlignType",
    category: "Layout",
    description: "Target alignment when scrolling to an item via grid:ScrollToItemAt(index, align).",
    items: [
      { name: "Top", desc: "Aligns target item to the top/start of the viewport." },
      { name: "Center", desc: "Centers target item in the viewport." },
      { name: "Bottom", desc: "Aligns target item to the bottom/end of the viewport." }
    ]
  },
  {
    id: "Enum.UIAnimationLayer",
    name: "Enum.UIAnimationLayer",
    category: "Animation",
    description: "Layering priority for ClientUIAnimationControl.",
    items: [
      { name: "AboveAllControls", desc: "Renders the UI animation above all sibling/child controls." },
      { name: "BelowAllControls", desc: "Renders the UI animation behind controls." }
    ]
  },
  {
    id: "Enum.Device",
    name: "Enum.Device",
    category: "Input",
    description: "Active input hardware detected by game.GetDevice().",
    items: [
      { name: "KeyboardAndMouse", desc: "Desktop PC with keyboard and mouse." },
      { name: "Controller", desc: "Console or PC gamepad controller (Xbox, PlayStation, etc.)." },
      { name: "Mobile", desc: "Touchscreen mobile device." },
      { name: "MobileController", desc: "Mobile device paired with physical gamepad." }
    ]
  },
  {
    id: "Enum.StageMode",
    name: "Enum.StageMode",
    category: "Entities",
    description: "Stage rule mode returned by game.GetStageMode().",
    items: [
      { name: "Beyond", desc: "Beyond / custom Wonderland stage mode." },
      { name: "Classic", desc: "Classic stage mode." }
    ]
  },
  {
    id: "Enum.CustomVariableEntityType",
    name: "Enum.CustomVariableEntityType",
    category: "Entities",
    description: "Target entity scope for global custom variables in game.GetGlobalCustomVariableValue.",
    items: [
      { name: "Level", desc: "The Stage / Level Entity itself." },
      { name: "PlayerSelf", desc: "The client's own Player entity." },
      { name: "AvatarSelf", desc: "The client's active Character/Avatar entity." }
    ]
  },
  {
    id: "Enum.LanguageType",
    name: "Enum.LanguageType",
    category: "Localization",
    description: "Client localization language returned by game.GetLanguageType().",
    items: [
      { name: "LanguageEng", desc: "English" },
      { name: "LanguageChs", desc: "Simplified Chinese" },
      { name: "LanguageCht", desc: "Traditional Chinese" },
      { name: "LanguageJpn", desc: "Japanese" },
      { name: "LanguageKor", desc: "Korean" },
      { name: "LanguageDeu", desc: "German" },
      { name: "LanguageFra", desc: "French" },
      { name: "LanguageSpa", desc: "Spanish" },
      { name: "LanguagePor", desc: "Portuguese" },
      { name: "LanguageRus", desc: "Russian" },
      { name: "LanguageIta", desc: "Italian" },
      { name: "LanguageInd", desc: "Indonesian" },
      { name: "LanguageTha", desc: "Thai" },
      { name: "LanguageTur", desc: "Turkish" },
      { name: "LanguageVie", desc: "Vietnamese" },
      { name: "LanguageNone", desc: "Not Specified" }
    ]
  },
  {
    id: "Enum.ParamType",
    name: "Enum.ParamType",
    category: "Networking",
    description: "Parameter data types for ServerSignal payload serialization.",
    items: [
      { name: "Bool", desc: "Single boolean." },
      { name: "BoolList", desc: "Sequence of booleans." },
      { name: "Int", desc: "32-bit signed integer." },
      { name: "IntList", desc: "Sequence of integers." },
      { name: "Float", desc: "Floating-point number." },
      { name: "FloatList", desc: "Sequence of floats." },
      { name: "String", desc: "Text string." },
      { name: "StringList", desc: "Sequence of strings." },
      { name: "Vector3", desc: "{x, y, z} 3D vector table." },
      { name: "Vector3List", desc: "Sequence of Vector3 tables." },
      { name: "ConfigId", desc: "Positive integer Config ID." },
      { name: "ConfigIdList", desc: "Sequence of Config IDs." },
      { name: "Entity", desc: "Entity ID integer." },
      { name: "EntityList", desc: "Sequence of Entity IDs." },
      { name: "Guid", desc: "GUID integer." },
      { name: "GuidList", desc: "Sequence of GUIDs." },
      { name: "PrefabId", desc: "Prefab ID integer." },
      { name: "PrefabIdList", desc: "Sequence of Prefab IDs." }
    ]
  }
];
