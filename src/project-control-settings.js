// ============================================================================
// MILIASTRA CONTROL-SPECIFIC INSPECTOR SETTINGS & STAGE VISUAL RENDERERS
// Implements:
//   1. TextBoxControl Settings:
//      • Font Size combo box (manual entry + preset dropdown 12..72 with ✓)
//      • Adaptive Font Size toggle + Minimum Font Size combo box (when enabled)
//      • Text Color (Hex + Swatch + Opacity %), Background Color (Hex + Swatch + Opacity %)
//      • Enable Text Outline toggle + Outline Color (Hex + Swatch + Opacity % when enabled)
//      • Align 6-icon bar: Left / Center / Right + Top / Middle / Bottom
//      • Rich Text Editor supporting <color=#RRGGBB></color>, <i></i>, <b></b>, <size=21></size>
//        with quick tag-insert toolbar & live stage/simulator rendering
//   2. Image Settings & Mask Settings :
//      • Image Source dropdown (Static Reference, Item, Equipment, Skill, Unit Status, Faction, Currency, Prefab)
//      • Reference Asset Resource card (thumbnail preview, 8 static shapes 100001..100008, copy ID, reset)
//      • Fill Color (Hex + Swatch + Opacity %)
//      • Image Type (Basic) + [1:1] "Set to Default Size" button
//      • Mask Settings:
//          - Enable Mask toggle (hides all options when OFF)
//          - Soft Edge toggle -> Soft Mode (Percentage: Horizontal/Vertical Area Range sliders | Pixels: Soft Edge Width X/Y)
//          - Fill by Progress toggle -> Shape (Horizontal, Vertical, Radial90, Radial180, Radial360),
//            Direction (From Left to Right / From Right to Left, From Top to Bottom / From Bottom to Top,
//            Clockwise / Counterclockwise), Starting Location (Top, Bottom, Left, Right for radials),
//            fillAmount slider + number box (0..100%)
//          - Invert Mask Area toggle (inverts progress/mask area to show remaining portion from box)
//   3. Controller Navigation Section :
//      • Selectable via Controller Joystick Navigation toggle
// ============================================================================

import { copyToClipboard } from './ui-components.js';

export const FONT_SIZE_PRESETS = [12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 48, 60, 72];

export const IMAGE_SOURCE_OPTIONS = [
  'Static Reference',
  'Item',
  'Equipment',
  'Skill',
  'Unit Status',
  'Faction',
  'Currency',
  'Prefab'
];

export const STATIC_SHAPE_ASSETS = [
  { id: 100001, name: 'Basic Shapes', shapeLabel: 'Square', shape: 'rectangle' },
  { id: 100002, name: 'Basic Shapes', shapeLabel: 'Circle', shape: 'circle' },
  { id: 100003, name: 'Basic Shapes', shapeLabel: 'Triangle', shape: 'triangle' },
  { id: 100004, name: 'Basic Shapes', shapeLabel: '4-Point Star', shape: 'star4' },
  { id: 100005, name: 'Basic Shapes', shapeLabel: '5-Point Star', shape: 'star5' },
  { id: 100006, name: 'Basic Shapes', shapeLabel: 'Hollowed Circle', shape: 'hollow_circle' }
];

export const FILL_SHAPE_OPTIONS = [
  'Horizontal',
  'Vertical',
  'Radial90',
  'Radial180',
  'Radial360'
];

// Complete 59-entry Enum.KeyboardKeyCode table (0..58) paired with KeyEventType Up (1..58) & Down (301..358)
export const KEYBOARD_KEYHINT_OPTIONS = [
  { value: 0, enumName: 'Invalid', uiLabel: 'None (Invalid)', badgeText: '—', actionName: 'Unassigned', keyDownEnum: null, keyUpEnum: null },
  { value: 1, enumName: 'KeyboardSkill1', uiLabel: '1', badgeText: '1', actionName: 'Character Skill 1', keyDownEnum: 'KeyboardSkill1KeyDown', keyUpEnum: 'KeyboardSkill1KeyUp' },
  { value: 2, enumName: 'KeyboardSkill2', uiLabel: '2', badgeText: '2', actionName: 'Character Skill 2', keyDownEnum: 'KeyboardSkill2KeyDown', keyUpEnum: 'KeyboardSkill2KeyUp' },
  { value: 3, enumName: 'KeyboardSkill3', uiLabel: '3', badgeText: '3', actionName: 'Character Skill 3', keyDownEnum: 'KeyboardSkill3KeyDown', keyUpEnum: 'KeyboardSkill3KeyUp' },
  { value: 4, enumName: 'KeyboardSkill4', uiLabel: '4', badgeText: '4', actionName: 'Character Skill 4', keyDownEnum: 'KeyboardSkill4KeyDown', keyUpEnum: 'KeyboardSkill4KeyUp' },
  { value: 5, enumName: 'KeyboardCraftspersonKey1', uiLabel: 'T', badgeText: 'T', actionName: 'Craftsperson Key 1 (T)', keyDownEnum: 'KeyboardCraftspersonKey1KeyDown', keyUpEnum: 'KeyboardCraftspersonKey1KeyUp' },
  { value: 6, enumName: 'KeyboardCraftspersonKey2', uiLabel: '5', badgeText: '5', actionName: 'Craftsperson Key 2 (5)', keyDownEnum: 'KeyboardCraftspersonKey2KeyDown', keyUpEnum: 'KeyboardCraftspersonKey2KeyUp' },
  { value: 7, enumName: 'KeyboardCraftspersonKey3', uiLabel: '6', badgeText: '6', actionName: 'Craftsperson Key 3 (6)', keyDownEnum: 'KeyboardCraftspersonKey3KeyDown', keyUpEnum: 'KeyboardCraftspersonKey3KeyUp' },
  { value: 8, enumName: 'KeyboardCraftspersonKey4', uiLabel: '7', badgeText: '7', actionName: 'Craftsperson Key 4 (7)', keyDownEnum: 'KeyboardCraftspersonKey4KeyDown', keyUpEnum: 'KeyboardCraftspersonKey4KeyUp' },
  { value: 9, enumName: 'KeyboardCraftspersonKey5', uiLabel: '8', badgeText: '8', actionName: 'Craftsperson Key 5 (8)', keyDownEnum: 'KeyboardCraftspersonKey5KeyDown', keyUpEnum: 'KeyboardCraftspersonKey5KeyUp' },
  { value: 10, enumName: 'KeyboardCraftspersonKey6', uiLabel: '9', badgeText: '9', actionName: 'Craftsperson Key 6 (9)', keyDownEnum: 'KeyboardCraftspersonKey6KeyDown', keyUpEnum: 'KeyboardCraftspersonKey6KeyUp' },
  { value: 11, enumName: 'KeyboardCraftspersonKey7', uiLabel: 'R', badgeText: 'R', actionName: 'Craftsperson Key 7 (R)', keyDownEnum: 'KeyboardCraftspersonKey7KeyDown', keyUpEnum: 'KeyboardCraftspersonKey7KeyUp' },
  { value: 12, enumName: 'KeyboardCraftspersonKey8', uiLabel: 'G', badgeText: 'G', actionName: 'Craftsperson Key 8 (G)', keyDownEnum: 'KeyboardCraftspersonKey8KeyDown', keyUpEnum: 'KeyboardCraftspersonKey8KeyUp' },
  { value: 13, enumName: 'KeyboardCraftspersonKey9', uiLabel: '~', badgeText: '~', actionName: 'Craftsperson Key 9 (~)', keyDownEnum: 'KeyboardCraftspersonKey9KeyDown', keyUpEnum: 'KeyboardCraftspersonKey9KeyUp' },
  { value: 14, enumName: 'KeyboardCraftspersonKey10', uiLabel: '0', badgeText: '0', actionName: 'Craftsperson Key 10 (0)', keyDownEnum: 'KeyboardCraftspersonKey10KeyDown', keyUpEnum: 'KeyboardCraftspersonKey10KeyUp' },
  { value: 15, enumName: 'KeyboardCraftspersonKey11', uiLabel: '-', badgeText: '-', actionName: 'Craftsperson Key 11 (-)', keyDownEnum: 'KeyboardCraftspersonKey11KeyDown', keyUpEnum: 'KeyboardCraftspersonKey11KeyUp' },
  { value: 16, enumName: 'KeyboardCraftspersonKey12', uiLabel: '=', badgeText: '=', actionName: 'Craftsperson Key 12 (=)', keyDownEnum: 'KeyboardCraftspersonKey12KeyDown', keyUpEnum: 'KeyboardCraftspersonKey12KeyUp' },
  { value: 17, enumName: 'KeyboardCraftspersonKey13', uiLabel: 'H', badgeText: 'H', actionName: 'Craftsperson Key 13 (H)', keyDownEnum: 'KeyboardCraftspersonKey13KeyDown', keyUpEnum: 'KeyboardCraftspersonKey13KeyUp' },
  { value: 18, enumName: 'KeyboardCraftspersonKey14', uiLabel: 'K', badgeText: 'K', actionName: 'Craftsperson Key 14 (K)', keyDownEnum: 'KeyboardCraftspersonKey14KeyDown', keyUpEnum: 'KeyboardCraftspersonKey14KeyUp' },
  { value: 19, enumName: 'KeyboardInteract', uiLabel: 'F', badgeText: 'F', actionName: 'Interact (F)', keyDownEnum: 'KeyboardInteractKeyDown', keyUpEnum: 'KeyboardInteractKeyUp' },
  { value: 20, enumName: 'KeyboardJump', uiLabel: 'Space', badgeText: 'Space', actionName: 'Jump (Space)', keyDownEnum: 'KeyboardJumpKeyDown', keyUpEnum: 'KeyboardJumpKeyUp' },
  { value: 21, enumName: 'KeyboardNormalAttack', uiLabel: 'LMB', badgeText: 'LMB', actionName: 'Normal Attack (LMB)', keyDownEnum: 'KeyboardNormalAttackKeyDown', keyUpEnum: 'KeyboardNormalAttackKeyUp' },
  { value: 22, enumName: 'KeyboardSprint', uiLabel: 'Shift / RMB', badgeText: 'Shift', actionName: 'Sprint (Shift / RMB)', keyDownEnum: 'KeyboardSprintKeyDown', keyUpEnum: 'KeyboardSprintKeyUp' },
  { value: 23, enumName: 'KeyboardElementalSkill', uiLabel: 'E', badgeText: 'E', actionName: 'Elemental Skill (E)', keyDownEnum: 'KeyboardElementalSkillKeyDown', keyUpEnum: 'KeyboardElementalSkillKeyUp' },
  { value: 24, enumName: 'KeyboardElementalBurst', uiLabel: 'Q', badgeText: 'Q', actionName: 'Elemental Burst (Q)', keyDownEnum: 'KeyboardElementalBurstKeyDown', keyUpEnum: 'KeyboardElementalBurstKeyUp' },
  { value: 25, enumName: 'KeyboardToggleWalkMove', uiLabel: 'Ctrl', badgeText: 'Ctrl', actionName: 'Switch Walk/Run (Ctrl)', keyDownEnum: 'KeyboardToggleWalkMoveKeyDown', keyUpEnum: 'KeyboardToggleWalkMoveKeyUp' },
  { value: 26, enumName: 'KeyboardToggleAimMode', uiLabel: 'R (Aim)', badgeText: 'R', actionName: 'Aiming Mode', keyDownEnum: 'KeyboardToggleAimModeKeyDown', keyUpEnum: 'KeyboardToggleAimModeKeyUp' },
  { value: 27, enumName: 'KeyboardMoveForward', uiLabel: 'W', badgeText: 'W', actionName: 'Move Forward (W)', keyDownEnum: 'KeyboardMoveForwardKeyDown', keyUpEnum: 'KeyboardMoveForwardKeyUp' },
  { value: 28, enumName: 'KeyboardMoveBackward', uiLabel: 'S', badgeText: 'S', actionName: 'Move Backward (S)', keyDownEnum: 'KeyboardMoveBackwardKeyDown', keyUpEnum: 'KeyboardMoveBackwardKeyUp' },
  { value: 29, enumName: 'KeyboardMoveLeft', uiLabel: 'A', badgeText: 'A', actionName: 'Move Left (A)', keyDownEnum: 'KeyboardMoveLeftKeyDown', keyUpEnum: 'KeyboardMoveLeftKeyUp' },
  { value: 30, enumName: 'KeyboardMoveRight', uiLabel: 'D', badgeText: 'D', actionName: 'Move Right (D)', keyDownEnum: 'KeyboardMoveRightKeyDown', keyUpEnum: 'KeyboardMoveRightKeyUp' },
  { value: 31, enumName: 'KeyboardMenu', uiLabel: 'Esc', badgeText: 'Esc', actionName: 'Main Menu (Esc)', keyDownEnum: 'KeyboardMenuKeyDown', keyUpEnum: 'KeyboardMenuKeyUp' },
  { value: 32, enumName: 'KeyboardBackpack', uiLabel: 'B', badgeText: 'B', actionName: 'Inventory / Backpack (B)', keyDownEnum: 'KeyboardBackpackKeyDown', keyUpEnum: 'KeyboardBackpackKeyUp' },
  { value: 33, enumName: 'KeyboardCharacterScreen', uiLabel: 'C', badgeText: 'C', actionName: 'Character Screen (C)', keyDownEnum: 'KeyboardCharacterScreenKeyDown', keyUpEnum: 'KeyboardCharacterScreenKeyUp' },
  { value: 34, enumName: 'KeyboardMap', uiLabel: 'M', badgeText: 'M', actionName: 'Map (M)', keyDownEnum: 'KeyboardMapKeyDown', keyUpEnum: 'KeyboardMapKeyUp' },
  { value: 35, enumName: 'KeyboardCoopMenu', uiLabel: 'F2', badgeText: 'F2', actionName: 'Co-Op Menu (F2)', keyDownEnum: 'KeyboardCoopMenuKeyDown', keyUpEnum: 'KeyboardCoopMenuKeyUp' },
  { value: 36, enumName: 'KeyboardQuestMenu', uiLabel: 'J', badgeText: 'J', actionName: 'Quest Menu (J)', keyDownEnum: 'KeyboardQuestMenuKeyDown', keyUpEnum: 'KeyboardQuestMenuKeyUp' },
  { value: 37, enumName: 'KeyboardNotificationDetails', uiLabel: 'Y', badgeText: 'Y', actionName: 'Notification Details (Y)', keyDownEnum: 'KeyboardNotificationDetailsKeyDown', keyUpEnum: 'KeyboardNotificationDetailsKeyUp' },
  { value: 38, enumName: 'KeyboardChatScreen', uiLabel: 'Enter', badgeText: 'Enter', actionName: 'Chat Screen (Enter)', keyDownEnum: 'KeyboardChatScreenKeyDown', keyUpEnum: 'KeyboardChatScreenKeyUp' },
  { value: 39, enumName: 'KeyboardEnvironmentInformation', uiLabel: 'MMB', badgeText: 'MMB', actionName: 'Elemental Sight (MMB)', keyDownEnum: 'KeyboardEnvironmentInformationKeyDown', keyUpEnum: 'KeyboardEnvironmentInformationKeyUp' },
  { value: 40, enumName: 'KeyboardShowCursor', uiLabel: 'Alt', badgeText: 'Alt', actionName: 'Show Cursor (Alt)', keyDownEnum: 'KeyboardShowCursorKeyDown', keyUpEnum: 'KeyboardShowCursorKeyUp' },
  { value: 41, enumName: 'KeyboardRadialMenu', uiLabel: 'Tab', badgeText: 'Tab', actionName: 'Shortcut Wheel (Tab)', keyDownEnum: 'KeyboardRadialMenuKeyDown', keyUpEnum: 'KeyboardRadialMenuKeyUp' },
  { value: 42, enumName: 'KeyboardTrackQuest', uiLabel: 'V', badgeText: 'V', actionName: 'Navigate / Track Quest (V)', keyDownEnum: 'KeyboardTrackQuestKeyDown', keyUpEnum: 'KeyboardTrackQuestKeyUp' },
  { value: 43, enumName: 'KeyboardSwitchMember1', uiLabel: '1 (Party)', badgeText: '1', actionName: 'Switch Party Member 1', keyDownEnum: 'KeyboardSwitchMember1KeyDown', keyUpEnum: 'KeyboardSwitchMember1KeyUp' },
  { value: 44, enumName: 'KeyboardSwitchMember2', uiLabel: '2 (Party)', badgeText: '2', actionName: 'Switch Party Member 2', keyDownEnum: 'KeyboardSwitchMember2KeyDown', keyUpEnum: 'KeyboardSwitchMember2KeyUp' },
  { value: 45, enumName: 'KeyboardSwitchMember3', uiLabel: '3 (Party)', badgeText: '3', actionName: 'Switch Party Member 3', keyDownEnum: 'KeyboardSwitchMember3KeyDown', keyUpEnum: 'KeyboardSwitchMember3KeyUp' },
  { value: 46, enumName: 'KeyboardSwitchMember4', uiLabel: '4 (Party)', badgeText: '4', actionName: 'Switch Party Member 4', keyDownEnum: 'KeyboardSwitchMember4KeyDown', keyUpEnum: 'KeyboardSwitchMember4KeyUp' },
  { value: 47, enumName: 'KeyboardSwitchMember5', uiLabel: '5 (Party)', badgeText: '5', actionName: 'Switch Party Member 5', keyDownEnum: 'KeyboardSwitchMember5KeyDown', keyUpEnum: 'KeyboardSwitchMember5KeyUp' },
  { value: 48, enumName: 'KeyboardGadget', uiLabel: 'Z', badgeText: 'Z', actionName: 'Quick-Use Gadget (Z)', keyDownEnum: 'KeyboardGadgetKeyDown', keyUpEnum: 'KeyboardGadgetKeyUp' },
  { value: 49, enumName: 'KeyboardPlayInstrument', uiLabel: 'Instrument', badgeText: '♪', actionName: 'Play Instrument', keyDownEnum: 'KeyboardPlayInstrumentKeyDown', keyUpEnum: 'KeyboardPlayInstrumentKeyUp' },
  { value: 50, enumName: 'KeyboardExtraAction', uiLabel: 'Extra1', badgeText: 'Ex1', actionName: 'Special Environment Action 1', keyDownEnum: 'KeyboardExtraActionKeyDown', keyUpEnum: 'KeyboardExtraActionKeyUp' },
  { value: 51, enumName: 'KeyboardExtraAction2', uiLabel: 'Extra2', badgeText: 'Ex2', actionName: 'Special Environment Action 2', keyDownEnum: 'KeyboardExtraAction2KeyDown', keyUpEnum: 'KeyboardExtraAction2KeyUp' },
  { value: 52, enumName: 'KeyboardExtraAction3', uiLabel: 'Extra3', badgeText: 'Ex3', actionName: 'Special Environment Action 3', keyDownEnum: 'KeyboardExtraAction3KeyDown', keyUpEnum: 'KeyboardExtraAction3KeyUp' },
  { value: 53, enumName: 'KeyboardExitVehicle', uiLabel: 'X', badgeText: 'X', actionName: 'Drop / Exit Vehicle (X)', keyDownEnum: 'KeyboardExitVehicleKeyDown', keyUpEnum: 'KeyboardExitVehicleKeyUp' },
  { value: 54, enumName: 'KeyboardRotate', uiLabel: 'Rotate', badgeText: '↻', actionName: 'Rotate Object', keyDownEnum: 'KeyboardRotateKeyDown', keyUpEnum: 'KeyboardRotateKeyUp' },
  { value: 55, enumName: 'KeyboardEnter', uiLabel: 'Enter', badgeText: '↵', actionName: 'Confirm / Enter', keyDownEnum: 'KeyboardEnterKeyDown', keyUpEnum: 'KeyboardEnterKeyUp' },
  { value: 56, enumName: 'KeyboardCancel', uiLabel: 'Esc', badgeText: 'Esc', actionName: 'Cancel / Back', keyDownEnum: 'KeyboardCancelKeyDown', keyUpEnum: 'KeyboardCancelKeyUp' },
  { value: 57, enumName: 'KeyboardPageUp', uiLabel: 'PgUp', badgeText: 'PgUp', actionName: 'Page Up', keyDownEnum: 'KeyboardPageUpKeyDown', keyUpEnum: 'KeyboardPageUpKeyUp' },
  { value: 58, enumName: 'KeyboardPageDown', uiLabel: 'PgDn', badgeText: 'PgDn', actionName: 'Page Down', keyDownEnum: 'KeyboardPageDownKeyDown', keyUpEnum: 'KeyboardPageDownKeyUp' }
];

// Complete 25-entry Enum.ControllerKeyCode table (0..24) in the exact Inspector dropdown order 
export const CONTROLLER_KEYHINT_OPTIONS = [
  { value: 1, enumName: 'ControllerAction1', uiLabel: 'Action Bottom', badgeText: 'Ⓐ', psGlyph: '✕', keyDownEnum: 'ControllerAction1KeyDown', keyUpEnum: 'ControllerAction1KeyUp' },
  { value: 2, enumName: 'ControllerAction2', uiLabel: 'Action Right', badgeText: 'Ⓑ', psGlyph: '○', keyDownEnum: 'ControllerAction2KeyDown', keyUpEnum: 'ControllerAction2KeyUp' },
  { value: 3, enumName: 'ControllerAction3', uiLabel: 'Action Left', badgeText: 'Ⓧ', psGlyph: '□', keyDownEnum: 'ControllerAction3KeyDown', keyUpEnum: 'ControllerAction3KeyUp' },
  { value: 4, enumName: 'ControllerAction4', uiLabel: 'Action Top', badgeText: 'Ⓨ', psGlyph: '△', keyDownEnum: 'ControllerAction4KeyDown', keyUpEnum: 'ControllerAction4KeyUp' },
  { value: 5, enumName: 'ControllerDpadUp', uiLabel: 'D-Pad Up', badgeText: '✚▲', psGlyph: '✚▲', keyDownEnum: 'ControllerDpadUpKeyDown', keyUpEnum: 'ControllerDpadUpKeyUp' },
  { value: 6, enumName: 'ControllerDpadDown', uiLabel: 'D-Pad Down', badgeText: '✚▼', psGlyph: '✚▼', keyDownEnum: 'ControllerDpadDownKeyDown', keyUpEnum: 'ControllerDpadDownKeyUp' },
  { value: 7, enumName: 'ControllerDpadLeft', uiLabel: 'D-Pad Left', badgeText: '✚◀', psGlyph: '✚◀', keyDownEnum: 'ControllerDpadLeftKeyDown', keyUpEnum: 'ControllerDpadLeftKeyUp' },
  { value: 8, enumName: 'ControllerDpadRight', uiLabel: 'D-Pad Right', badgeText: '✚▶', psGlyph: '✚▶', keyDownEnum: 'ControllerDpadRightKeyDown', keyUpEnum: 'ControllerDpadRightKeyUp' },
  { value: 9, enumName: 'ControllerLeftStickPress', uiLabel: 'Left Stick Press', badgeText: 'L3', psGlyph: 'L3', keyDownEnum: 'ControllerLeftStickPressKeyDown', keyUpEnum: 'ControllerLeftStickPressKeyUp' },
  { value: 10, enumName: 'ControllerRightStickPress', uiLabel: 'Right Stick Press', badgeText: 'R3', psGlyph: 'R3', keyDownEnum: 'ControllerRightStickPressKeyDown', keyUpEnum: 'ControllerRightStickPressKeyUp' },
  { value: 11, enumName: 'ControllerLeftShoulder', uiLabel: 'LB', badgeText: 'LB', psGlyph: 'L1', keyDownEnum: 'ControllerLeftShoulderKeyDown', keyUpEnum: 'ControllerLeftShoulderKeyUp' },
  { value: 12, enumName: 'ControllerRightShoulder', uiLabel: 'RB', badgeText: 'RB', psGlyph: 'R1', keyDownEnum: 'ControllerRightShoulderKeyDown', keyUpEnum: 'ControllerRightShoulderKeyUp' },
  { value: 13, enumName: 'ControllerLeftTrigger', uiLabel: 'LT', badgeText: 'LT', psGlyph: 'L2', keyDownEnum: 'ControllerLeftTriggerKeyDown', keyUpEnum: 'ControllerLeftTriggerKeyUp' },
  { value: 14, enumName: 'ControllerRightTrigger', uiLabel: 'RT', badgeText: 'RT', psGlyph: 'R2', keyDownEnum: 'ControllerRightTriggerKeyDown', keyUpEnum: 'ControllerRightTriggerKeyUp' },
  { value: 15, enumName: 'ControllerComboAction4', uiLabel: 'LB + Action Top', badgeText: 'LB+Ⓨ', psGlyph: 'L1+△', keyDownEnum: 'ControllerComboAction4KeyDown', keyUpEnum: 'ControllerComboAction4KeyUp' },
  { value: 16, enumName: 'ControllerComboAction1', uiLabel: 'LB + Action Bottom', badgeText: 'LB+Ⓐ', psGlyph: 'L1+✕', keyDownEnum: 'ControllerComboAction1KeyDown', keyUpEnum: 'ControllerComboAction1KeyUp' },
  { value: 17, enumName: 'ControllerComboAction3', uiLabel: 'LB + Action Left', badgeText: 'LB+Ⓧ', psGlyph: 'L1+□', keyDownEnum: 'ControllerComboAction3KeyDown', keyUpEnum: 'ControllerComboAction3KeyUp' },
  { value: 18, enumName: 'ControllerComboAction2', uiLabel: 'LB + Action Right', badgeText: 'LB+Ⓑ', psGlyph: 'L1+○', keyDownEnum: 'ControllerComboAction2KeyDown', keyUpEnum: 'ControllerComboAction2KeyUp' },
  { value: 19, enumName: 'ControllerComboDpadUp', uiLabel: 'LB + D-Pad Up', badgeText: 'LB+▲', psGlyph: 'L1+▲', keyDownEnum: 'ControllerComboDpadUpKeyDown', keyUpEnum: 'ControllerComboDpadUpKeyUp' },
  { value: 20, enumName: 'ControllerComboDpadDown', uiLabel: 'LB + D-Pad Down', badgeText: 'LB+▼', psGlyph: 'L1+▼', keyDownEnum: 'ControllerComboDpadDownKeyDown', keyUpEnum: 'ControllerComboDpadDownKeyUp' },
  { value: 21, enumName: 'ControllerComboDpadLeft', uiLabel: 'LB + D-Pad Left', badgeText: 'LB+◀', psGlyph: 'L1+◀', keyDownEnum: 'ControllerComboDpadLeftKeyDown', keyUpEnum: 'ControllerComboDpadLeftKeyUp' },
  { value: 22, enumName: 'ControllerComboDpadRight', uiLabel: 'LB + D-Pad Right', badgeText: 'LB+▶', psGlyph: 'L1+▶', keyDownEnum: 'ControllerComboDpadRightKeyDown', keyUpEnum: 'ControllerComboDpadRightKeyUp' },
  { value: 23, enumName: 'ControllerComboShoulder', uiLabel: 'LB + RB', badgeText: 'LB+RB', psGlyph: 'L1+R1', keyDownEnum: 'ControllerComboShoulderKeyDown', keyUpEnum: 'ControllerComboShoulderKeyUp' },
  { value: 24, enumName: 'ControllerComboTrigger', uiLabel: 'LT + RT', badgeText: 'LT+RT', psGlyph: 'L2+R2', keyDownEnum: 'ControllerComboTriggerKeyDown', keyUpEnum: 'ControllerComboTriggerKeyUp' },
  { value: 0, enumName: 'Invalid', uiLabel: 'None (Invalid)', badgeText: '—', psGlyph: '—', keyDownEnum: null, keyUpEnum: null }
];

export function getKeyboardKeyHintMeta(codeOrName) {
  if (typeof codeOrName === 'number') {
    return KEYBOARD_KEYHINT_OPTIONS.find(o => o.value === codeOrName) || KEYBOARD_KEYHINT_OPTIONS[1];
  }
  const str = String(codeOrName || '').replace(/^Enum\.KeyboardKeyCode\./, '');
  const asNum = Number(str);
  if (!Number.isNaN(asNum) && str.trim() !== '') {
    return KEYBOARD_KEYHINT_OPTIONS.find(o => o.value === asNum) || KEYBOARD_KEYHINT_OPTIONS[1];
  }
  return KEYBOARD_KEYHINT_OPTIONS.find(o => o.enumName === str || o.uiLabel === str) || KEYBOARD_KEYHINT_OPTIONS[1];
}

export function getControllerKeyHintMeta(codeOrName) {
  if (typeof codeOrName === 'number') {
    return CONTROLLER_KEYHINT_OPTIONS.find(o => o.value === codeOrName) || CONTROLLER_KEYHINT_OPTIONS[0];
  }
  const str = String(codeOrName || '').replace(/^Enum\.ControllerKeyCode\./, '');
  const asNum = Number(str);
  if (!Number.isNaN(asNum) && str.trim() !== '') {
    return CONTROLLER_KEYHINT_OPTIONS.find(o => o.value === asNum) || CONTROLLER_KEYHINT_OPTIONS[0];
  }
  return CONTROLLER_KEYHINT_OPTIONS.find(o => o.enumName === str || o.uiLabel === str) || CONTROLLER_KEYHINT_OPTIONS[0];
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Convert {r, g, b} (0..255) to 6-char uppercase HEX (without #)
export function rgbToHex6(col, fallback = 'FFFFFF') {
  if (!col || typeof col !== 'object') return fallback;
  const r = Math.max(0, Math.min(255, Math.round(Number(col.r) || 0)));
  const g = Math.max(0, Math.min(255, Math.round(Number(col.g) || 0)));
  const b = Math.max(0, Math.min(255, Math.round(Number(col.b) || 0)));
  return [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Convert 6-char HEX string (with or without #) + alpha (0..255) to {r, g, b, a}
export function hex6ToRgba(hexStr, currentAlpha = 255) {
  const clean = String(hexStr || '').replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
    a: Math.max(0, Math.min(255, Math.round(Number(currentAlpha) ?? 255)))
  };
}

export function alphaToPct(col, fallbackPct = 100) {
  if (!col || col.a === undefined) return fallbackPct;
  return Math.max(0, Math.min(100, Math.round((Number(col.a) / 255) * 100)));
}

export function pctToAlpha(pct) {
  const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
  return Math.round((clamped / 100) * 255);
}

// ============================================================================
// FULLSCREEN & UI ANIMATION VFX REGISTRY 
// 1. FullscreenUIAnimationControl (10002001..10002037): 23 Looping + 14 Non-Looping
// 2. UIAnimationControl (10001001..10001160): 62 Looping + 98 Non-Looping Particle Effects
// ============================================================================
export const FULLSCREEN_VFX_LOOPING_IDS = [
  10002001, 10002002, 10002003, 10002004, 10002005,
  10002009, 10002014, 10002015, 10002018, 10002020,
  10002021, 10002022, 10002023, 10002025, 10002026,
  10002027, 10002028, 10002029, 10002032, 10002034,
  10002035, 10002036, 10002037
];

export const FULLSCREEN_VFX_NON_LOOPING_IDS = [
  10002006, 10002007, 10002008, 10002010, 10002011,
  10002012, 10002013, 10002016, 10002017, 10002019,
  10002024, 10002030, 10002031, 10002033
];

// ClientUIAnimationControl (10001001..10001160) — Localized Cursor / Widget Particle Effects
// 62 Looping Particle Effects (stay active until StopAnimation() or SetActive(false))
export const UI_ANIM_VFX_LOOPING_IDS = [
  10001001, 10001002, 10001003, 10001004, 10001005, 10001006, 10001007, 10001010, 10001011, 10001012, 10001013,
  10001014, 10001015, 10001016, 10001017, 10001018, 10001019, 10001020, 10001021, 10001022, 10001023,
  10001024, 10001025, 10001026, 10001027, 10001028, 10001029, 10001030, 10001035, 10001037, 10001038, 10001041,
  10001042, 10001051, 10001053, 10001056, 10001060, 10001063, 10001067, 10001069, 10001070, 10001071, 10001072,
  10001075, 10001080, 10001081, 10001082, 10001092, 10001106, 10001114, 10001116, 10001118, 10001119, 10001131,
  10001132, 10001147, 10001149, 10001152, 10001154, 10001157, 10001158, 10001159
];

// Non-Looping Particle Effects (play once and automatically finish/disappear)
export const UI_ANIM_VFX_NON_LOOPING_IDS = [
  10001008, 10001009, 10001031, 10001032, 10001033, 10001034, 10001036, 10001039, 10001040, 10001043, 10001044,
  10001045, 10001046, 10001047, 10001048, 10001049, 10001050, 10001052, 10001054, 10001055, 10001057, 10001058, 10001059,
  10001061, 10001062, 10001064, 10001065, 10001066, 10001068, 10001073, 10001074, 10001076, 10001077, 10001078,
  10001079, 10001083, 10001084, 10001085, 10001086, 10001087, 10001088, 10001089, 10001090, 10001091, 10001093,
  10001094, 10001095, 10001096, 10001097, 10001098, 10001099, 10001100, 10001101, 10001102, 10001103, 10001104, 10001105,
  10001107, 10001108, 10001109, 10001110, 10001111, 10001112, 10001113, 10001115, 10001117, 10001120, 10001121, 10001122,
  10001123, 10001124, 10001125, 10001126, 10001127, 10001128, 10001129, 10001130, 10001133, 10001134, 10001135, 10001136,
  10001137, 10001138, 10001139, 10001140, 10001141, 10001142, 10001143, 10001144, 10001145, 10001146, 10001148,
  10001150, 10001151, 10001153, 10001155, 10001156, 10001160
];

const PARTICLE_LOOP_COLORS = ['#f5b82e', '#58b878', '#38b6ff', '#d94ce6', '#45d1b5', '#e8c458', '#f06a30', '#b8a2f0'];
const PARTICLE_BURST_COLORS = ['#ff884d', '#ff5e7e', '#5ce1e6', '#ffe066', '#c084fc', '#4ade80'];

export const UI_ANIM_VFX_PRESETS = [
  ...UI_ANIM_VFX_LOOPING_IDS.map((id, idx) => {
    const suffix = id - 10001000;
    const col = PARTICLE_LOOP_COLORS[idx % PARTICLE_LOOP_COLORS.length];
    return {
      id,
      name: `UI Particle Effect ${suffix}`,
      looping: true,
      isParticle: true,
      category: 'Looping Effects',
      color: col,
      desc: 'Looping cursor/control particle aura (stays active until StopAnimation / SetActive(false))'
    };
  }),
  ...UI_ANIM_VFX_NON_LOOPING_IDS.map((id, idx) => {
    const suffix = id - 10001000;
    const col = PARTICLE_BURST_COLORS[idx % PARTICLE_BURST_COLORS.length];
    return {
      id,
      name: `UI Particle Effect ${suffix}`,
      looping: false,
      isParticle: true,
      category: 'Non-Looping Effects',
      color: col,
      desc: 'One-shot cursor/control particle burst (plays once and automatically disappears)'
    };
  })
];

const VFX_COLOR_PALETTE = {
  10002001: { color: '#58b878', desc: 'Emerald corner bokeh & soft vignette dimming' },
  10002002: { color: '#38b6ff', desc: 'Frost cyan radial streaks & edge dimming' },
  10002003: { color: '#d49b4b', desc: 'Warm amber corner vignette & bokeh dust' },
  10002004: { color: '#e0b865', desc: 'Soft gold mote bokeh & dark corners' },
  10002005: { color: '#c99852', desc: 'Burnished bronze border glow & vignette' },
  10002009: { color: '#5d6df2', desc: 'Arcane indigo corner tendrils & vignette' },
  10002014: { color: '#d98a3c', desc: 'Hearth ember corner bokeh & warm dimming' },
  10002015: { color: '#d94ce6', desc: 'Magenta starlight burst & radial bokeh' },
  10002018: { color: '#8a4de0', desc: 'Deep void purple mist & corner dimming' },
  10002020: { color: '#e04848', desc: 'Crimson ash particles & dark vignette' },
  10002021: { color: '#f06a30', desc: 'Solar ember corner glow & floating sparks' },
  10002022: { color: '#7ab8e6', desc: 'Moonlight silver-blue bokeh & vignette' },
  10002023: { color: '#6ec968', desc: 'Verdant forest spore drift & corner shade' },
  10002025: { color: '#7a6899', desc: 'Dusk shadow corner dimming & mist' },
  10002026: { color: '#e8c458', desc: 'Golden grace radial bokeh & soft frame' },
  10002027: { color: '#5ce1e6', desc: 'Glacial rim frost & cyan corner dimming' },
  10002028: { color: '#c93848', desc: 'Blood moon crimson vignette & pulse' },
  10002029: { color: '#525888', desc: 'Abyssal slate corner fog & vignette' },
  10002032: { color: '#b8a2f0', desc: 'Celestial lavender bokeh shimmer' },
  10002034: { color: '#d1a666', desc: 'Desert sandstorm edge haze & dimming' },
  10002035: { color: '#45d1b5', desc: 'Ethereal spirit teal corner glow' },
  10002036: { color: '#e0709e', desc: 'Twilight rose petal bokeh & vignette' },
  10002037: { color: '#d4af37', desc: 'Altus Plateau burnished gold bokeh' }
};

export const FULLSCREEN_VFX_PRESETS = [
  ...FULLSCREEN_VFX_LOOPING_IDS.map(id => {
    const suffix = id - 10002000;
    const pal = VFX_COLOR_PALETTE[id] || { color: '#d4af37', desc: 'Looping corner bokeh & vignette ambience' };
    return {
      id,
      name: `View Ambience ${suffix}`,
      looping: true,
      isParticle: false,
      category: 'Looping Effects',
      color: pal.color,
      desc: pal.desc
    };
  }),
  ...FULLSCREEN_VFX_NON_LOOPING_IDS.map(id => {
    const suffix = id - 10002000;
    return {
      id,
      name: `Screen Glitch / Burst ${suffix}`,
      looping: false,
      isParticle: false,
      category: 'Non-Looping Effects',
      color: '#ff5e7e',
      desc: 'One-shot 1–2s fullscreen glitch / chromatic impact effect'
    };
  })
];

export function getVfxPresetMeta(animationId, className = '') {
  const num = Number(animationId) || 0;
  const isUiParticleClass = className === 'ClientUIAnimationControl';
  if (!num) {
    return {
      id: 0,
      name: 'None (Unassigned)',
      looping: true,
      isParticle: isUiParticleClass,
      category: 'None',
      color: '#a18a5e',
      desc: 'No animation selected'
    };
  }
  const foundParticle = UI_ANIM_VFX_PRESETS.find(p => p.id === num);
  if (foundParticle) return foundParticle;
  const foundFull = FULLSCREEN_VFX_PRESETS.find(p => p.id === num);
  if (foundFull) return foundFull;

  if (num >= 10001000 && num < 10002000) {
    const isLoop = UI_ANIM_VFX_LOOPING_IDS.includes(num);
    return {
      id: num,
      name: `UI Particle Effect ${num - 10001000}`,
      looping: isLoop,
      isParticle: true,
      category: isLoop ? 'Looping Effects' : 'Non-Looping Effects',
      color: isLoop ? '#f5b82e' : '#ff884d',
      desc: isLoop ? 'Looping localized particle effect' : 'One-shot localized particle burst'
    };
  }

  const isNonLoop = FULLSCREEN_VFX_NON_LOOPING_IDS.includes(num);
  return {
    id: num,
    name: `Custom VFX (${num})`,
    looping: !isNonLoop,
    isParticle: isUiParticleClass,
    category: isNonLoop ? 'Non-Looping Effects' : 'Looping Effects',
    color: isNonLoop ? '#ff5e7e' : '#d4af37',
    desc: isNonLoop ? 'One-shot VFX effect' : 'Looping VFX effect'
  };
}

// ============================================================================
// CLIENT CONTROL TEMPLATE LIST FOR REFERENCECONTROL 
// ============================================================================
export const REFERENCE_TEMPLATE_PRESETS = [
  { index: 1073741954, name: 'TextBoxControl', icon: 'T', className: 'ClientUITextBoxControl', desc: 'Template (Index 1073741954)' },
  { index: 1073741849, name: 'TextBoxControl (Base)', icon: 'T', className: 'ClientUITextBoxControl', desc: 'Standard TextBox template' },
  { index: 1073741850, name: 'ImageControl', icon: '▣', className: 'ClientUIImageControl', desc: 'Standard ImageControl template' },
  { index: 1073741851, name: 'PresetButtonControl', icon: 'Btn', className: 'ClientUIPresetButtonControl', desc: 'Standard Button template' },
  { index: 1073741852, name: 'ContainerControl', icon: '□', className: 'ClientUIContainerControl', desc: 'Standard ContainerControl template' },
  { index: 1073741854, name: 'TextWindowControl', icon: '▤', className: 'ClientUITextWindowControl', desc: 'Scrollable TextWindow template' },
  { index: 1073741855, name: 'GridScrollerControl', icon: '⊞', className: 'ClientUIGridScrollerControl', desc: 'GridScroller template' },
  { index: 1073741856, name: 'CursorEventAreaControl', icon: '⌖', className: 'ClientUICursorEventAreaControl', desc: 'Cursor click response area template' },
  { index: 1073741857, name: 'AnimationControl', icon: '▶', className: 'ClientUIAnimationControl', desc: 'UI Animation widget template' },
  { index: 1073741858, name: 'KeyHintControl', icon: '1', className: 'ClientUIKeyHintControl', desc: 'Dynamic KeyHint badge template' },
  { index: 1073741860, name: 'FullscreenAnimationControl', icon: '⛶', className: 'ClientUIFullscreenAnimationControl', desc: 'Fullscreen VFX overlay template' }
];

export function getReferenceTemplateMeta(prefabIndex) {
  const num = Number(prefabIndex) || 0;
  if (!num) {
    return { index: 0, name: 'None (Unassigned)', icon: '🔗', className: 'None', desc: 'No template referenced' };
  }
  const found = REFERENCE_TEMPLATE_PRESETS.find(t => t.index === num);
  if (found) return found;
  return {
    index: num,
    name: `CustomTemplate_${num}`,
    icon: '🔗',
    className: 'ClientUIBaseControl',
    desc: 'Custom Client Control Template Index'
  };
}

// Initialize all TextBox, KeyHint, Button, Image, Mask, and Controller Navigation defaults on a node
export function ensureControlSpecificDefaults(node) {
  if (!node) return node;

  const isTextCtrl =
    node.className === 'ClientUITextBoxControl' ||
    node.className === 'ClientUITextWindowControl';

  const isKeyHintCtrl =
    node.className === 'ClientUIKeyHintControl';

  const isButtonCtrl =
    node.className === 'ClientUIPresetButtonControl';

  const isImageCtrl =
    node.className === 'ClientUIImageControl';

  if (isTextCtrl) {
    if (node.fontSize === undefined) node.fontSize = 20;
    if (node.adaptiveFontSize === undefined) node.adaptiveFontSize = false;
    if (node.minFontSize === undefined) node.minFontSize = 14;
    if (!node.fontColor) node.fontColor = { r: 255, g: 255, b: 255, a: 255 };
    if (!node.bgColor) {
      node.bgColor = { r: 255, g: 255, b: 255, a: 0 };
    }
    if (node.enableOutline === undefined) node.enableOutline = false;
    if (!node.outlineColor) node.outlineColor = { r: 51, g: 51, b: 51, a: 51 }; // #333333 @ 20%
    if (!node.alignH) node.alignH = node.className === 'ClientUITextWindowControl' ? 'left' : 'center';
    if (!node.alignV) {
      node.alignV = 'top';
    }
    if (node.className === 'ClientUITextWindowControl') {
      if (node.interactable === undefined) node.interactable = true; // "Can Scroll" 
      if (node.showScrollBar === undefined) node.showScrollBar = true; // "Show Scrollbar"
      if (node.text === undefined || node.text === 'Scrollable TextWindow') {
        node.text = 'text text text text text text text\ntext text text text text text text\ntext text text text text text text\ntext text text';
      }
    } else if (node.text === undefined) {
      node.text = node.name || 'TextBox';
    }
  }

  if (node.className === 'ClientUIFullscreenAnimationControl') {
    if (node.animationId === undefined) node.animationId = 10002001; // Default View Ambience 1 (Index 10002001) 
    if (node.playSoundEffect === undefined) node.playSoundEffect = false;
  }

  if (node.className === 'ClientUIAnimationControl') {
    if (node.animationId === undefined) node.animationId = 10001001; // Default UI Particle Effect 1 (Index 10001001)
    if (node.playSoundEffect === undefined) node.playSoundEffect = false;
    if (node.layer === undefined) node.layer = 1; // Enum.UIAnimationLayer.AboveAllControls (1) or BelowAllControls (0)
  }

  if (node.className === 'ClientUIReferenceControl') {
    if (node.referencedPrefabIndex === undefined) node.referencedPrefabIndex = 1073741954; // Default from
  }

  if (node.className === 'ClientUIContainerControl') {
    if (node.isolateNavigation === undefined) node.isolateNavigation = false;
    if (node.disableKeyEventPassthrough === undefined) node.disableKeyEventPassthrough = false;
    if (node.disableCursorEventPassthrough === undefined) node.disableCursorEventPassthrough = false;
    if (node.showCursor === undefined) node.showCursor = false;
  }

  if (node.className === 'ClientUICursorEventAreaControl') {
    if (node.persistentAreaPreview === undefined) node.persistentAreaPreview = false;
    if (node.raycastTarget === undefined) node.raycastTarget = false;
  }

  if (node.className === 'ClientUIGridScrollerControl') {
    if (node.interactable === undefined) node.interactable = true; // Can Scroll
    if (node.showScrollBar === undefined) node.showScrollBar = true; // Show Scrollbar
    if (node.raycastTarget === undefined) node.raycastTarget = true; // Raycast Target 
    if (!node.scrollDirection || (node.scrollDirection !== 'Horizontal' && node.scrollDirection !== 'Vertical')) {
      node.scrollDirection = node.scrollDirection === 0 ? 'Horizontal' : 'Vertical';
    }
    if (!node.layoutConstraint || (node.layoutConstraint !== 'AutoWrap' && node.layoutConstraint !== 'Fixed')) {
      node.layoutConstraint = node.layoutConstraint === 1 ? 'Fixed' : 'AutoWrap';
    }
    if (node.layoutConstraintFixedCount === undefined || node.layoutConstraintFixedCount < 1) {
      node.layoutConstraintFixedCount = 3; // Columns (when Vertical) or Rows (when Horizontal)
    }
    if (node.itemPrefabIndex === undefined) node.itemPrefabIndex = 1073741954; // Inserted Content Template
    if (node.itemCount === undefined) node.itemCount = 12; // Number of repeating template copies
    if (node.itemWidth === undefined) node.itemWidth = 56;
    if (node.itemHeight === undefined) node.itemHeight = 36;
    if (node.spacingX === undefined) node.spacingX = 6;
    if (node.spacingY === undefined) node.spacingY = 6;
    if (node.paddingTop === undefined) node.paddingTop = 6;
    if (node.paddingBottom === undefined) node.paddingBottom = 6;
    if (node.paddingLeft === undefined) node.paddingLeft = 6;
    if (node.paddingRight === undefined) node.paddingRight = 6;
    if (node.scrollProgress === undefined) node.scrollProgress = 0;
    if (!node.gridPreviewMode) node.gridPreviewMode = 'template'; // 'template' | 'inventory' (RefreshItems demo)
  }

  if (isKeyHintCtrl) {
    if (node.keyboardKeyCode === undefined) node.keyboardKeyCode = 1; // Enum.KeyboardKeyCode.KeyboardSkill1 ('1')
    if (node.controllerKeyCode === undefined) node.controllerKeyCode = 1; // Enum.ControllerKeyCode.ControllerAction1 ('Action Bottom')
    if (!node.previewKeyHintDevice) node.previewKeyHintDevice = 'keyboard'; // 'keyboard' | 'gamepad'
    if (node.playerCustomKeyOverride === undefined) node.playerCustomKeyOverride = ''; // e.g. '[' when simulating rebound R -> '['
    // Keep node.text synced with the effective display badge so legacy readers see the current keycap
    const kbMeta = getKeyboardKeyHintMeta(node.keyboardKeyCode);
    const ctrlMeta = getControllerKeyHintMeta(node.controllerKeyCode);
    node.text = node.previewKeyHintDevice === 'gamepad'
      ? ctrlMeta.badgeText
      : (node.playerCustomKeyOverride ? node.playerCustomKeyOverride : kbMeta.badgeText);
  }

  if (isButtonCtrl) {
    if (node.interactable === undefined) node.interactable = true;
    if (node.raycastTarget === undefined) node.raycastTarget = true;
    if (node.clickAudioId === undefined) node.clickAudioId = 1001;
    if (node.normalStatusNodeKey === undefined) node.normalStatusNodeKey = '';
    if (node.hoverStatusNodeKey === undefined) node.hoverStatusNodeKey = '';
    if (node.pressedStatusNodeKey === undefined) node.pressedStatusNodeKey = '';
    if (node.disabledStatusNodeKey === undefined) node.disabledStatusNodeKey = '';
    if (!node.previewButtonState) node.previewButtonState = 'normal'; // 'normal' | 'hover' | 'pressed' | 'disabled'
  }

  if (isImageCtrl) {
    if (!node.imageSource) node.imageSource = 'Static Reference';
    const validIds = [100001, 100002, 100003, 100004, 100005, 100006];
    if (!node.resourceId || !validIds.includes(Number(node.resourceId))) {
      node.resourceId = node.key === 'CooldownOrb' ? 100005 : 100001;
    }
    if (!node.imageColor) {
      node.imageColor = node.key === 'Container_with_1Pixel'
        ? { r: 255, g: 0, b: 0, a: 255 }
        : { r: 190, g: 71, b: 71, a: 255 };
    }
    if (!node.imageType) node.imageType = 'Basic';

    // Mask Settings 
    if (node.enableMask === undefined) {
      node.enableMask = false;
    }
    if (node.enableSoftEdge === undefined) node.enableSoftEdge = false;
    if (!node.softMode) node.softMode = 'Percentage'; // 'Percentage' | 'Pixels'
    if (node.softRangeH === undefined) node.softRangeH = 43.11;
    if (node.softRangeV === undefined) node.softRangeV = 39.67;
    if (node.softEdgeWidthX === undefined) node.softEdgeWidthX = 12.0;
    if (node.softEdgeWidthY === undefined) node.softEdgeWidthY = 12.0;

    if (node.enableFillByProgress === undefined) node.enableFillByProgress = false;
    if (!node.fillShape) node.fillShape = 'Vertical'; // 'Horizontal' | 'Vertical' | 'Radial90' | 'Radial180' | 'Radial360'
    if (!node.fillDirection) node.fillDirection = 'From Bottom to Top';
    if (!node.fillStartLocation) node.fillStartLocation = 'Top'; // 'Top' | 'Bottom' | 'Left' | 'Right'
    if (node.fillAmount === undefined) node.fillAmount = 100; // 0..100 %
    if (node.invertMask === undefined) node.invertMask = false;
  }

  if (node.controllerNav === undefined) {
    node.controllerNav = false;
  }

  return node;
}

// Parse Miliastra Rich Text tags (<color=#RRGGBB></color>, <b></b>, <i></i>, <size=21></size>) safely into HTML
export function parseMiliastraRichTextToHTML(rawText, scaleFactor = 1) {
  let safe = escapeHtml(rawText || '');

  // Replace newlines with <br/>
  safe = safe.replace(/\r?\n/g, '<br/>');

  // Support <b>...</b> and <i>...</i>
  safe = safe
    .replace(/&lt;b&gt;/gi, '<strong>')
    .replace(/&lt;\/b&gt;/gi, '</strong>')
    .replace(/&lt;i&gt;/gi, '<em>')
    .replace(/&lt;\/i&gt;/gi, '</em>');

  // Support <color=#RRGGBB> or <color=#RRGGBBAA> or <color=red>
  safe = safe
    .replace(/&lt;color=([#a-zA-Z0-9]+)&gt;/gi, (_, colVal) => {
      return `<span style="color:${colVal};">`;
    })
    .replace(/&lt;\/color&gt;/gi, '</span>');

  // Support <size=21>...</size>
  safe = safe
    .replace(/&lt;size=(\d+(?:\.\d+)?)&gt;/gi, (_, szVal) => {
      const px = Math.max(6, Math.min(160, (parseFloat(szVal) || 14) * scaleFactor));
      return `<span style="font-size:${px}px;line-height:1.15;">`;
    })
    .replace(/&lt;\/size&gt;/gi, '</span>');

  return safe;
}

// Strip rich text tags to measure plain character length (for Adaptive Font Size calculation & Canvas fallback)
export function stripMiliastraRichTextTags(rawText) {
  return String(rawText || '')
    .replace(/<\/?(?:b|i|color(?:=[^>]*)?|size(?:=[^>]*)?)>/gi, '');
}

// Compute effective font size synced 1:1 with the 960x640 Simulator Canvas:
// Incorporates Zoom Factor (scaleX/scaleY) and Adaptive Font Size (when enabled, scales down to fit on 1 line)
export function getEffectiveTextBoxFontSize(node) {
  const baseSize = Math.max(6, Number(node.fontSize) || 20);
  const scaleFactor = Math.min(
    Math.abs(node.scaleX !== undefined ? node.scaleX : 1),
    Math.abs(node.scaleY !== undefined ? node.scaleY : 1)
  );

  if (!node.adaptiveFontSize) {
    return Math.max(6, Math.round(baseSize * scaleFactor * 2) * 0.5);
  }

  const minSize = Math.max(6, Math.min(baseSize, Number(node.minFontSize) || 12));
  const plain = stripMiliastraRichTextTags(node.text || '');
  const longestLineLen = Math.max(
    1,
    ...plain.split(/\r?\n/).map(l => l.length)
  );

  const boxW = Math.max(12, (Number(node.width) || 140) * Math.abs(node.scaleX || 1) - 8);
  const boxH = Math.max(12, (Number(node.height) || 40) * Math.abs(node.scaleY || 1) - 6);

  // Approximate monospace/UI glyph advance width ~0.6 * fontSize (matching lua-runtime.js)
  const fitByWidth = boxW / (longestLineLen * 0.6);
  const fitByHeight = boxH * 0.82;
  const fittedBase = Math.max(minSize, Math.min(baseSize, Math.floor(Math.min(fitByWidth, fitByHeight))));
  return Math.max(6, Math.round(fittedBase * scaleFactor * 2) * 0.5);
}

// Render live Stage visual for a TextBoxControl / TextWindowControl / KeyHintControl (synced 1:1 with 960x640 Simulator)
export function renderStageTextBoxVisualHTML(node, innerTransform = '') {
  ensureControlSpecificDefaults(node);

  const fc = node.fontColor || { r: 255, g: 255, b: 255, a: 255 };
  const bc = node.bgColor || { r: 255, g: 255, b: 255, a: 0 };
  const oc = node.outlineColor || { r: 51, g: 51, b: 51, a: 51 };

  const textColorCss = `rgba(${fc.r}, ${fc.g}, ${fc.b}, ${(fc.a !== undefined ? fc.a : 255) / 255})`;
  const bgColorCss = `rgba(${bc.r}, ${bc.g}, ${bc.b}, ${(bc.a !== undefined ? bc.a : 0) / 255})`;

  let outlineCss = '';
  if (node.enableOutline && (oc.a === undefined || oc.a > 0)) {
    const outCol = `rgba(${oc.r}, ${oc.g}, ${oc.b}, ${(oc.a !== undefined ? oc.a : 200) / 255})`;
    outlineCss = `text-shadow: -1px -1px 0 ${outCol}, 1px -1px 0 ${outCol}, -1px 1px 0 ${outCol}, 1px 1px 0 ${outCol};`;
  }

  const justifyMap = { left: 'flex-start', center: 'center', right: 'flex-end' };
  const alignMap = { top: 'flex-start', middle: 'center', bottom: 'flex-end' };
  const justifyContent = justifyMap[node.alignH || 'center'] || 'center';
  const alignItems = alignMap[node.alignV || 'top'] || 'flex-start';
  const textAlign = node.alignH || 'center';

  const scaleFactor = Math.min(
    Math.abs(node.scaleX !== undefined ? node.scaleX : 1),
    Math.abs(node.scaleY !== undefined ? node.scaleY : 1)
  );
  const effectiveSize = getEffectiveTextBoxFontSize(node);
  const whiteSpaceCss = node.adaptiveFontSize
    ? 'white-space: nowrap; overflow: hidden;'
    : 'white-space: pre-wrap; word-break: break-word; overflow: hidden;';

  const richHTML = parseMiliastraRichTextToHTML(node.text ?? node.name, scaleFactor);
  const isTextWindow = node.className === 'ClientUITextWindowControl';
  const showScrollbar = isTextWindow && node.showScrollBar !== false;
  const canScroll = isTextWindow && node.interactable !== false;

  const scrollbarHTML = showScrollbar ? `
    <div class="mw-stage-textwindow-scrollbar" title="TextWindow Vertical Scrollbar (showScrollBar = true${canScroll ? ', Can Scroll = true' : ', Can Scroll = false'})" style="width:10px;height:calc(100% - 6px);margin:3px 2px 3px 4px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;flex-shrink:0;pointer-events:none;user-select:none;">
      <span style="font-size:7px;line-height:1;color:rgba(210,215,220,0.45);">▲</span>
      <div style="width:5px;flex:1;margin:2px 0;background:rgba(15,18,22,0.55);border:1px solid rgba(255,255,255,0.12);border-radius:3px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:4%;left:0;right:0;height:54%;background:linear-gradient(180deg,#e4e7eb 0%,#c8cdd4 100%);border-radius:2px;box-shadow:0 1px 2px rgba(0,0,0,0.5);"></div>
      </div>
      <span style="font-size:7px;line-height:1;color:rgba(210,215,220,0.45);">▼</span>
    </div>
  ` : '';

  return `
    <div class="mw-stage-textbox-surface ${isTextWindow ? 'is-text-window' : ''}"
         style="width:100%;height:100%;box-sizing:border-box;background:${bgColorCss};color:${textColorCss};font-family:'JetBrains Mono','Segoe UI Symbol','Apple Color Emoji',sans-serif;font-size:${effectiveSize}px;display:flex;flex-direction:row;align-items:stretch;padding:4px;line-height:1.2;${outlineCss}${innerTransform}">
      <div style="flex:1;min-width:0;display:flex;justify-content:${justifyContent};align-items:${alignItems};text-align:${textAlign};${whiteSpaceCss}${canScroll ? 'overflow-y:auto;' : ''}">
        <div style="max-width:100%;">${richHTML}</div>
      </div>
      ${scrollbarHTML}
    </div>
  `;
}

// Render live Stage visual for ClientUIFullscreenAnimationControl (10002xxx) & ClientUIAnimationControl (10001xxx)
export function renderStageAnimationVisualHTML(node, innerTransform = '') {
  ensureControlSpecificDefaults(node);
  const isFull = node.className === 'ClientUIFullscreenAnimationControl';
  const vfx = getVfxPresetMeta(node.animationId, node.className);

  if (!vfx.id) {
    return `
      <div class="mw-stage-anim-surface is-empty" style="width:100%;height:100%;box-sizing:border-box;border:1.5px dashed rgba(212,175,55,0.45);background:rgba(28,24,20,0.45);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:4px;text-align:center;font-family:'JetBrains Mono',sans-serif;${innerTransform}">
        <span style="font-size:10px;font-weight:800;color:#d4af37;">${isFull ? '⛶ FullscreenAnimationControl' : '✦ UIAnimationControl'}</span>
        <span style="font-size:9px;color:#a99778;">+ Please Select Animation</span>
      </div>
    `;
  }

  // Localized Cursor/Control Particle Effects for ClientUIAnimationControl (10001001..10001160)
  if (!isFull) {
    const layerLabel = Number(node.layer) === 1 ? 'Above All' : 'Below All';
    if (vfx.looping) {
      // Looping localized particle aura around the control/cursor area
      return `
        <div class="mw-stage-anim-surface is-ui-particle-loop" style="width:100%;height:100%;box-sizing:border-box;position:relative;overflow:hidden;border:1px dashed ${vfx.color}99;border-radius:4px;background:radial-gradient(circle at 50% 50%, ${vfx.color}38 0%, rgba(20,16,12,0.18) 58%, transparent 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px;text-align:center;font-family:'JetBrains Mono',sans-serif;${innerTransform}">
          <!-- Orbiting / Floating Particle Motes -->
          <span style="position:absolute;top:18%;left:22%;width:5px;height:5px;border-radius:50%;background:#fff;box-shadow:0 0 6px 2px ${vfx.color}, 18px -6px 0 -1px ${vfx.color}, -8px 16px 0 -1px #fff;"></span>
          <span style="position:absolute;top:24%;right:20%;width:4px;height:4px;border-radius:50%;background:${vfx.color};box-shadow:0 0 6px 2px ${vfx.color}, -16px 14px 0 0 #fff, 6px 18px 0 -1px ${vfx.color};"></span>
          <span style="position:absolute;bottom:18%;left:28%;width:4px;height:4px;border-radius:50%;background:${vfx.color};box-shadow:0 0 5px 1px ${vfx.color}, 26px 4px 0 0 #fff;"></span>
          <span style="position:absolute;bottom:20%;right:24%;width:5px;height:5px;border-radius:50%;background:#fff;box-shadow:0 0 6px 2px ${vfx.color}, -14px -8px 0 -1px ${vfx.color};"></span>
          <div style="background:rgba(16,13,10,0.86);border:1px solid ${vfx.color};border-radius:3px;padding:2px 6px;display:inline-flex;align-items:center;gap:4px;max-width:96%;z-index:2;box-shadow:0 0 10px ${vfx.color}44;">
            <span style="color:${vfx.color};font-size:10px;">✦</span>
            <span style="font-size:9px;font-weight:800;color:#f5e6c4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">#${vfx.id}</span>
            <span style="font-size:8px;color:${vfx.color};font-weight:700;">[LOOP • ${layerLabel}]</span>
          </div>
        </div>
      `;
    }

    // Non-looping localized particle burst (plays once and disappears)
    return `
      <div class="mw-stage-anim-surface is-ui-particle-burst" style="width:100%;height:100%;box-sizing:border-box;position:relative;overflow:hidden;border:1px dashed ${vfx.color}aa;border-radius:4px;background:radial-gradient(circle at 50% 50%, ${vfx.color}44 0%, transparent 68%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px;text-align:center;font-family:'JetBrains Mono',sans-serif;${innerTransform}">
        <!-- Expanding Burst Ring + Outward Sparks -->
        <span style="position:absolute;width:44px;height:44px;border-radius:50%;border:1.5px dashed ${vfx.color};opacity:0.75;box-shadow:0 0 10px ${vfx.color}66;"></span>
        <span style="position:absolute;top:14%;left:48%;width:4px;height:4px;border-radius:50%;background:#fff;box-shadow:0 0 5px ${vfx.color}, -22px 10px 0 ${vfx.color}, 22px 10px 0 ${vfx.color}, -18px 28px 0 #fff, 18px 28px 0 #fff;"></span>
        <div style="background:rgba(16,13,10,0.88);border:1px solid ${vfx.color};border-radius:3px;padding:2px 6px;display:inline-flex;align-items:center;gap:4px;max-width:96%;z-index:2;box-shadow:0 0 10px ${vfx.color}55;">
          <span style="color:${vfx.color};font-size:10px;">💥</span>
          <span style="font-size:9px;font-weight:800;color:#fff4ec;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">#${vfx.id}</span>
          <span style="font-size:8px;color:${vfx.color};font-weight:700;">[1-SHOT • ${layerLabel}]</span>
        </div>
      </div>
    `;
  }

  if (vfx.looping) {
    // Looping corner bokeh / vignette dimming effect 
    return `
      <div class="mw-stage-anim-surface is-looping" style="width:100%;height:100%;box-sizing:border-box;position:relative;overflow:hidden;border:1px solid ${vfx.color}88;border-radius:3px;background:radial-gradient(circle at 50% 50%, rgba(15,12,10,0.08) 38%, rgba(12,10,8,0.68) 82%, ${vfx.color}55 100%);box-shadow:inset 0 0 24px ${vfx.color}66, inset 0 0 48px rgba(0,0,0,0.75);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px;text-align:center;font-family:'JetBrains Mono',sans-serif;${innerTransform}">
        <span style="position:absolute;top:4px;left:6px;width:7px;height:7px;border-radius:50%;background:${vfx.color};opacity:0.75;filter:blur(1px);box-shadow:14px 6px 0 ${vfx.color}88;"></span>
        <span style="position:absolute;bottom:5px;right:7px;width:8px;height:8px;border-radius:50%;background:${vfx.color};opacity:0.75;filter:blur(1px);box-shadow:-14px -5px 0 ${vfx.color}88;"></span>
        <div style="background:rgba(16,13,10,0.82);border:1px solid ${vfx.color}99;border-radius:3px;padding:2px 6px;display:inline-flex;align-items:center;gap:5px;max-width:96%;">
          <span style="color:${vfx.color};font-size:10px;">⛶</span>
          <span style="font-size:9.5px;font-weight:800;color:#f5e6c4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(vfx.name)}</span>
          <span style="font-size:8.5px;color:${vfx.color};font-weight:700;">#${vfx.id} [LOOP]</span>
        </div>
      </div>
    `;
  }

  // Non-looping 1-2s screen glitch / impact flash effect
  return `
    <div class="mw-stage-anim-surface is-nonlooping" style="width:100%;height:100%;box-sizing:border-box;position:relative;overflow:hidden;border:1px solid rgba(255,94,126,0.75);border-radius:3px;background:repeating-linear-gradient(0deg, rgba(255,94,126,0.18) 0px, rgba(255,94,126,0.18) 2px, rgba(56,182,255,0.16) 2px, rgba(56,182,255,0.16) 4px, rgba(20,16,14,0.65) 4px, rgba(20,16,14,0.65) 8px);box-shadow:inset 0 0 18px rgba(255,94,126,0.5);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px;text-align:center;font-family:'JetBrains Mono',sans-serif;${innerTransform}">
      <div style="background:rgba(16,13,10,0.86);border:1px solid #ff5e7e;border-radius:3px;padding:2px 6px;display:inline-flex;align-items:center;gap:5px;max-width:96%;">
        <span style="color:#ff5e7e;font-size:10px;">⚡</span>
        <span style="font-size:9.5px;font-weight:800;color:#fff0f3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(vfx.name)}</span>
        <span style="font-size:8.5px;color:#ff8fa6;font-weight:700;">#${vfx.id} [1-SHOT]</span>
      </div>
    </div>
  `;
}

// Render live Stage visual for ClientUIReferenceControl
export function renderStageReferenceVisualHTML(node, innerTransform = '') {
  ensureControlSpecificDefaults(node);
  const tpl = getReferenceTemplateMeta(node.referencedPrefabIndex);
  return `
    <div class="mw-stage-reference-surface" style="width:100%;height:100%;box-sizing:border-box;background:rgba(34,44,58,0.82);border:1.5px dashed rgba(130,180,235,0.75);border-radius:4px;display:flex;align-items:center;justify-content:center;gap:6px;padding:2px 6px;font-family:'JetBrains Mono',sans-serif;color:#e3f0ff;overflow:hidden;${innerTransform}">
      <span style="display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 3px;border:1px solid rgba(175,215,255,0.65);border-radius:3px;background:rgba(18,26,36,0.85);font-size:9.5px;font-weight:800;color:#fff;">${escapeHtml(tpl.icon)}</span>
      <div style="display:flex;flex-direction:column;min-width:0;line-height:1.15;">
        <span style="font-size:9.5px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">🔗 ${escapeHtml(tpl.name)}</span>
        <span style="font-size:8.5px;color:#9ec5f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${tpl.index ? `Index ${tpl.index}` : 'Unassigned'}</span>
      </div>
    </div>
  `;
}

// Render live Stage visual for ClientUICursorEventAreaControl 
export function renderStageCursorAreaVisualHTML(node, isSelected = false, innerTransform = '') {
  ensureControlSpecificDefaults(node);
  const showPreview = Boolean(node.persistentAreaPreview || isSelected);
  const raycastOn = Boolean(node.raycastTarget);
  if (!showPreview) {
    return `<div style="width:100%;height:100%;${innerTransform}"></div>`;
  }
  return `
    <div class="mw-stage-cursorarea-surface" style="width:100%;height:100%;box-sizing:border-box;background:${raycastOn ? 'rgba(88, 176, 116, 0.22)' : 'rgba(196, 160, 89, 0.16)'};border:1.5px dashed ${raycastOn ? 'rgba(110, 218, 145, 0.8)' : 'rgba(212, 175, 55, 0.65)'};border-radius:3px;display:flex;align-items:center;justify-content:center;gap:4px;padding:2px 5px;font-family:'JetBrains Mono',sans-serif;font-size:9.5px;font-weight:700;color:${raycastOn ? '#b8f5cc' : '#f2deb6'};overflow:hidden;${innerTransform}">
      <span>⌖ ${escapeHtml(node.name)}</span>
      <span style="font-size:8.5px;opacity:0.85;">[${raycastOn ? 'Raycast ON' : 'Raycast OFF'}]</span>
    </div>
  `;
}

// Sample Minecraft / Terraria Inventory Items for GridScrollerControl RefreshItems(count, callback) preview
export const GRID_INVENTORY_DEMO_ITEMS = [
  { name: 'Dirt Block', short: 'Dirt', qty: 'x64', icon: '🟫', border: '#8b5a2b', bg: 'rgba(92,62,38,0.65)' },
  { name: 'Cobblestone', short: 'Stone', qty: 'x64', icon: '🪨', border: '#8c9298', bg: 'rgba(72,76,82,0.65)' },
  { name: 'Iron Pickaxe', short: 'Pickaxe', qty: 'Lv.3', icon: '⛏️', border: '#d4af37', bg: 'rgba(84,68,36,0.72)' },
  { name: 'Torch', short: 'Torch', qty: 'x16', icon: '🔥', border: '#f59e0b', bg: 'rgba(96,58,24,0.68)' },
  { name: 'Gold Ore', short: 'Gold', qty: 'x12', icon: '🪙', border: '#eab308', bg: 'rgba(94,78,26,0.70)' },
  { name: 'Healing Potion', short: 'Potion', qty: 'x5', icon: '🧪', border: '#ef4444', bg: 'rgba(92,34,42,0.70)' },
  { name: 'Mana Crystal', short: 'Mana', qty: 'x3', icon: '💎', border: '#38bdf8', bg: 'rgba(28,68,96,0.72)' },
  { name: 'Oak Planks', short: 'Wood', qty: 'x32', icon: '🪵', border: '#b47b44', bg: 'rgba(84,56,32,0.65)' },
  { name: 'Slime Gel', short: 'Gel', qty: 'x99', icon: '💧', border: '#4ade80', bg: 'rgba(32,78,48,0.65)' },
  { name: 'Copper Broadsword', short: 'Sword', qty: 'Lv.1', icon: '🗡️', border: '#d97706', bg: 'rgba(86,52,28,0.68)' },
  { name: 'Recall Mirror', short: 'Mirror', qty: '1/1', icon: '🪞', border: '#a855f7', bg: 'rgba(68,38,94,0.70)' },
  { name: 'Obsidian Brick', short: 'Obsidian', qty: 'x24', icon: '⬛', border: '#6366f1', bg: 'rgba(38,34,68,0.72)' }
];

// Compute exact GridScroller layout metrics matching library/client_controls/GridScrollerControl.d.lua:
// - ScrollDirection: 'Vertical' (cross-axis = Columns) vs 'Horizontal' (cross-axis = Rows)
// - LayoutConstraint: 'AutoWrap' (cross-axis count derived from box size) vs 'Fixed' (uses layoutConstraintFixedCount)
// - ContentLength formula from GridScrollerControl.d.lua:
//     BaseLength = Direction Start Padding + Direction End Padding - Direction List Item Spacing
//     ContentLength = BaseLength + (Direction Item Size + Direction List Item Spacing) * scrollLineCount
export function computeGridScrollerLayoutMetrics(node) {
  ensureControlSpecificDefaults(node);
  const boxW = Math.max(40, Number(node.width) || 220);
  const boxH = Math.max(40, Number(node.height) || 110);
  const itemW = Math.max(12, Number(node.itemWidth) || 56);
  const itemH = Math.max(12, Number(node.itemHeight) || 36);
  const spaceX = Math.max(0, Number(node.spacingX) ?? 6);
  const spaceY = Math.max(0, Number(node.spacingY) ?? 6);
  const padT = Math.max(0, Number(node.paddingTop) ?? 6);
  const padB = Math.max(0, Number(node.paddingBottom) ?? 6);
  const padL = Math.max(0, Number(node.paddingLeft) ?? 6);
  const padR = Math.max(0, Number(node.paddingRight) ?? 6);

  const isVertical = node.scrollDirection !== 'Horizontal' && node.scrollDirection !== 0;
  const isFixed = node.layoutConstraint === 'Fixed' || node.layoutConstraint === 1;
  const itemCount = Math.max(0, Math.min(96, Math.round(Number(node.itemCount) ?? 12)));

  // Reserve 10px for scrollbar when enabled
  const sbReserve = node.showScrollBar !== false ? 10 : 0;
  const availW = Math.max(itemW, boxW - padL - padR - (isVertical ? sbReserve : 0));
  const availH = Math.max(itemH, boxH - padT - padB - (!isVertical ? sbReserve : 0));

  let crossCount = 1; // Columns when Vertical, Rows when Horizontal
  if (isFixed) {
    crossCount = Math.max(1, Math.min(24, Math.round(Number(node.layoutConstraintFixedCount) || 3)));
  } else {
    if (isVertical) {
      // AutoWrap Columns based on box width
      crossCount = Math.max(1, Math.floor((availW + spaceX) / (itemW + spaceX)));
    } else {
      // AutoWrap Rows based on box height
      crossCount = Math.max(1, Math.floor((availH + spaceY) / (itemH + spaceY)));
    }
  }

  const scrollLines = itemCount > 0 ? Math.ceil(itemCount / crossCount) : 0;
  const columns = isVertical ? crossCount : Math.max(1, scrollLines);
  const rows = isVertical ? Math.max(1, scrollLines) : crossCount;

  // ContentLength along the scroll direction (GridScrollerControl.d.lua lines 70-71)
  let contentLength = 0;
  if (scrollLines > 0) {
    if (isVertical) {
      const baseLen = padT + padB - spaceY;
      contentLength = baseLen + (itemH + spaceY) * scrollLines;
    } else {
      const baseLen = padL + padR - spaceX;
      contentLength = baseLen + (itemW + spaceX) * scrollLines;
    }
  }

  const viewportScrollLen = isVertical ? boxH : boxW;
  const maxScrollOffset = Math.max(0, contentLength - viewportScrollLen);
  const progress = Math.max(0, Math.min(1, Number(node.scrollProgress) || 0));
  const scrollOffsetPx = maxScrollOffset * progress;

  return {
    boxW,
    boxH,
    itemW,
    itemH,
    spaceX,
    spaceY,
    padT,
    padB,
    padL,
    padR,
    isVertical,
    isFixed,
    crossCount,
    crossAxisLabel: isVertical ? 'Columns' : 'Rows',
    scrollLines,
    columns,
    rows,
    itemCount,
    contentLength,
    maxScrollOffset,
    progress,
    scrollOffsetPx
  };
}

// Render live Stage visual for ClientUIGridScrollerControl
export function renderStageGridScrollerVisualHTML(node, innerTransform = '') {
  const m = computeGridScrollerLayoutMetrics(node);
  const tpl = getReferenceTemplateMeta(node.itemPrefabIndex);
  const hasTemplate = tpl.index > 0;
  const showScrollbar = node.showScrollBar !== false;
  const isInventoryPreview = node.gridPreviewMode === 'inventory';

  let cellsHTML = '';
  if (!hasTemplate || m.itemCount === 0) {
    cellsHTML = `
      <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#c9b896;font-size:9.5px;text-align:center;gap:2px;padding:4px;">
        <span style="font-weight:800;color:#f5b82e;">⊞ ${escapeHtml(node.name)}</span>
        <span style="font-size:8.5px;color:#9c8b70;">${!hasTemplate ? '+ Insert Content Template' : 'itemCount = 0 (Call :RefreshItems)'}</span>
      </div>
    `;
  } else {
    const cellList = [];
    for (let idx = 0; idx < m.itemCount; idx++) {
      // In Vertical scroll: fill left-to-right across Columns, then top-to-bottom across Rows
      // In Horizontal scroll: fill top-to-bottom across Rows, then left-to-right across Columns
      const col = m.isVertical ? (idx % m.crossCount) : Math.floor(idx / m.crossCount);
      const row = m.isVertical ? Math.floor(idx / m.crossCount) : (idx % m.crossCount);

      const x = m.padL + col * (m.itemW + m.spaceX) - (!m.isVertical ? m.scrollOffsetPx : 0);
      const y = m.padT + row * (m.itemH + m.spaceY) - (m.isVertical ? m.scrollOffsetPx : 0);

      if (isInventoryPreview) {
        const inv = GRID_INVENTORY_DEMO_ITEMS[idx % GRID_INVENTORY_DEMO_ITEMS.length];
        cellList.push(`
          <div class="mw-stage-grid-cell is-inv" title="Slot [${idx}] — ${inv.name} (${inv.qty}) | GetItemIndex(ctrl) == ${idx}" style="position:absolute;left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${m.itemW}px;height:${m.itemH}px;box-sizing:border-box;background:${inv.bg};border:1.5px solid ${inv.border};border-radius:3px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1px 3px;overflow:hidden;box-shadow:inset 0 0 6px rgba(0,0,0,0.55);">
            <span style="position:absolute;top:1px;left:3px;font-size:7.5px;color:rgba(255,255,255,0.65);font-weight:700;">#${idx}</span>
            <span style="font-size:${Math.max(9, Math.min(15, Math.floor(m.itemH * 0.38)))}px;line-height:1;">${inv.icon}</span>
            <span style="font-size:8px;font-weight:800;color:#f5ebd6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;line-height:1.1;">${escapeHtml(inv.short)}</span>
            <span style="position:absolute;bottom:1px;right:3px;font-size:7.5px;font-weight:800;color:#ffe082;">${escapeHtml(inv.qty)}</span>
          </div>
        `);
      } else {
        // Editor Repeating Template Copies look
        cellList.push(`
          <div class="mw-stage-grid-cell is-tpl" title="Template Copy [${idx}] — ${tpl.name} (Index ${tpl.index})" style="position:absolute;left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${m.itemW}px;height:${m.itemH}px;box-sizing:border-box;background:rgba(46,56,72,0.72);border:1px solid rgba(145,190,242,0.68);border-radius:2px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1px 3px;overflow:hidden;">
            <span style="position:absolute;top:1px;left:3px;font-size:7.5px;color:#9ec5f0;font-weight:700;">[${idx}]</span>
            <span style="font-size:9px;font-weight:800;color:#eaf4ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">${escapeHtml(tpl.icon)} ${escapeHtml(tpl.name)}</span>
          </div>
        `);
      }
    }
    cellsHTML = cellList.join('');
  }

  let scrollbarHTML = '';
  if (showScrollbar) {
    const thumbPct = (m.progress * 52).toFixed(1);
    if (m.isVertical) {
      scrollbarHTML = `
        <div class="mw-stage-grid-scrollbar is-vertical" style="position:absolute;top:3px;bottom:3px;right:2px;width:9px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;pointer-events:none;z-index:3;">
          <span style="font-size:6.5px;line-height:1;color:rgba(220,225,230,0.55);">▲</span>
          <div style="width:5px;flex:1;margin:2px 0;background:rgba(12,15,18,0.62);border:1px solid rgba(255,255,255,0.14);border-radius:3px;position:relative;overflow:hidden;">
            <div style="position:absolute;top:${thumbPct}%;left:0;right:0;height:44%;background:linear-gradient(180deg,#e4e7eb 0%,#c2c8d0 100%);border-radius:2px;"></div>
          </div>
          <span style="font-size:6.5px;line-height:1;color:rgba(220,225,230,0.55);">▼</span>
        </div>
      `;
    } else {
      scrollbarHTML = `
        <div class="mw-stage-grid-scrollbar is-horizontal" style="position:absolute;left:3px;right:3px;bottom:2px;height:9px;display:flex;flex-direction:row;align-items:center;justify-content:space-between;pointer-events:none;z-index:3;">
          <span style="font-size:6.5px;line-height:1;color:rgba(220,225,230,0.55);">◀</span>
          <div style="height:5px;flex:1;margin:0 2px;background:rgba(12,15,18,0.62);border:1px solid rgba(255,255,255,0.14);border-radius:3px;position:relative;overflow:hidden;">
            <div style="position:absolute;left:${thumbPct}%;top:0;bottom:0;width:44%;background:linear-gradient(90deg,#e4e7eb 0%,#c2c8d0 100%);border-radius:2px;"></div>
          </div>
          <span style="font-size:6.5px;line-height:1;color:rgba(220,225,230,0.55);">▶</span>
        </div>
      `;
    }
  }

  return `
    <div class="mw-stage-gridscroller-surface" style="width:100%;height:100%;box-sizing:border-box;position:relative;overflow:hidden;background:rgba(24,20,16,0.74);border:1.5px solid rgba(196,160,89,0.55);border-radius:3px;font-family:'JetBrains Mono',sans-serif;${innerTransform}">
      <div style="position:relative;width:100%;height:100%;overflow:hidden;">
        ${cellsHTML}
      </div>
      ${scrollbarHTML}
      <div style="position:absolute;bottom:2px;left:4px;background:rgba(14,12,10,0.84);border:1px solid rgba(196,160,89,0.45);border-radius:2px;padding:0 4px;font-size:7.5px;color:#e6d2a8;pointer-events:none;z-index:4;">
        ${m.isVertical ? '↕ Vert' : '↔ Horiz'} • ${m.isFixed ? `Fixed ${m.crossCount} ${m.crossAxisLabel}` : `AutoWrap (${m.crossCount} ${m.crossAxisLabel})`} • ${m.itemCount} items
      </div>
    </div>
  `;
}

// Render live Stage visual for a ClientUIKeyHintControl
// Renders either the PC Keyboard Keycap badge (or player's rebound key override) or the Gamepad button prompt badge!
export function renderStageKeyHintVisualHTML(node, innerTransform = '') {
  ensureControlSpecificDefaults(node);
  const kbMeta = getKeyboardKeyHintMeta(node.keyboardKeyCode);
  const ctrlMeta = getControllerKeyHintMeta(node.controllerKeyCode);
  const isGamepad = node.previewKeyHintDevice === 'gamepad';
  const customKey = String(node.playerCustomKeyOverride || '').trim();

  const scaleFactor = Math.min(
    Math.abs(node.scaleX !== undefined ? node.scaleX : 1),
    Math.abs(node.scaleY !== undefined ? node.scaleY : 1)
  );
  const boxH = Math.max(18, (Number(node.height) || 26) * scaleFactor);
  const fontPx = Math.max(9, Math.min(28, Math.round(boxH * 0.48)));

  if (isGamepad) {
    return `
      <div class="mw-stage-keyhint-surface is-gamepad"
           style="width:100%;height:100%;box-sizing:border-box;background:linear-gradient(180deg, #2e2923 0%, #1d1915 100%);color:#f5e6c4;border:1.5px solid #c8a86b;border-radius:${Math.max(4, Math.round(boxH * 0.36))}px;box-shadow:0 2px 5px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.16);display:flex;align-items:center;justify-content:center;gap:3px;font-family:'JetBrains Mono','Segoe UI Symbol',sans-serif;font-size:${Math.max(8.5, fontPx - 1)}px;font-weight:800;padding:0 4px;line-height:1;white-space:nowrap;overflow:hidden;${innerTransform}">
        <span>${escapeHtml(ctrlMeta.badgeText)}</span>
      </div>
    `;
  }

  const labelStr = customKey || kbMeta.badgeText || '1';
  const isRebound = Boolean(customKey && customKey !== kbMeta.badgeText);

  return `
    <div class="mw-stage-keyhint-surface is-keyboard ${isRebound ? 'is-rebound' : ''}"
         style="width:100%;height:100%;box-sizing:border-box;background:${isRebound ? 'linear-gradient(180deg, #fff6dc 0%, #f0d799 100%)' : 'linear-gradient(180deg, #fcfbfa 0%, #e4e0d8 100%)'};color:#181410;border:1.5px solid ${isRebound ? '#d49b27' : '#b8b0a2'};border-bottom:2.5px solid ${isRebound ? '#9e6f14' : '#8a8275'};border-radius:4px;box-shadow:0 2px 4px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',sans-serif;font-size:${fontPx}px;font-weight:800;padding:0 3px;line-height:1;white-space:nowrap;overflow:hidden;${innerTransform}">
      <span>${escapeHtml(labelStr)}</span>
    </div>
  `;
}

// Compute separated CSS mask layers for Soft Edge (Horizontal & Vertical) and Progress Fill / Invert Mask
// By applying each single-gradient mask to its own nested wrapper div, we avoid WebKit/Chromium
// multi-layer mask-composite bugs so Soft Edge + Radial/Linear Progress Fill always render cleanly!
export function computeImageMaskStyles(node) {
  ensureControlSpecificDefaults(node);
  if (!node.enableMask) {
    return { softHStyle: '', softVStyle: '', progressStyle: '' };
  }

  let softHStyle = '';
  let softVStyle = '';
  let progressStyle = '';

  // 1. Soft Edge — feathering from the control's bounding box
  if (node.enableSoftEdge) {
    let featherPctX = 0;
    let featherPctY = 0;
    if (node.softMode === 'Pixels') {
      const w = Math.max(10, Number(node.width) || 100);
      const h = Math.max(10, Number(node.height) || 100);
      featherPctX = Math.min(49, ((Number(node.softEdgeWidthX) || 0) / w) * 100);
      featherPctY = Math.min(49, ((Number(node.softEdgeWidthY) || 0) / h) * 100);
    } else {
      featherPctX = Math.min(49, Math.max(0, (Number(node.softRangeH) || 0) * 0.48));
      featherPctY = Math.min(49, Math.max(0, (Number(node.softRangeV) || 0) * 0.48));
    }

    if (featherPctX > 0.5) {
      const ix = featherPctX.toFixed(1);
      const ox = (100 - featherPctX).toFixed(1);
      const gradH = `linear-gradient(to right, transparent 0%, black ${ix}%, black ${ox}%, transparent 100%)`;
      softHStyle = `-webkit-mask-image: ${gradH}; mask-image: ${gradH};`;
    }
    if (featherPctY > 0.5) {
      const iy = featherPctY.toFixed(1);
      const oy = (100 - featherPctY).toFixed(1);
      const gradV = `linear-gradient(to bottom, transparent 0%, black ${iy}%, black ${oy}%, transparent 100%)`;
      softVStyle = `-webkit-mask-image: ${gradV}; mask-image: ${gradV};`;
    }
  }

  // 2. Fill by Progress + Invert Mask Area
  const rawFillPct = node.enableFillByProgress
    ? Math.max(0, Math.min(100, Number(node.fillAmount) ?? 100))
    : 100;

  const invert = Boolean(node.invertMask);

  if (!node.enableFillByProgress && invert) {
    // Invert full box mask -> hides the masked box
    progressStyle = 'clip-path: inset(0 0 100% 0);';
  } else if (node.enableFillByProgress) {
    const shape = node.fillShape || 'Vertical';
    const dir = node.fillDirection || 'From Bottom to Top';
    const startLoc = node.fillStartLocation || 'Top';

    // Effective visible interval [startFrac, endFrac] along the progress sweep
    // Normal: [0, fillPct], Inverted: [fillPct, 100] (so 100% filled becomes 0% visible!)
    const visStart = invert ? rawFillPct : 0;
    const visEnd = invert ? 100 : rawFillPct;

    if (visEnd <= visStart + 0.05) {
      progressStyle = 'clip-path: inset(0 0 100% 0);';
    } else if (shape === 'Horizontal') {
      if (dir === 'From Right to Left') {
        const leftInset = 100 - visEnd;
        const rightInset = visStart;
        progressStyle = `clip-path: inset(0 ${rightInset.toFixed(1)}% 0 ${leftInset.toFixed(1)}%);`;
      } else {
        const leftInset = visStart;
        const rightInset = 100 - visEnd;
        progressStyle = `clip-path: inset(0 ${rightInset.toFixed(1)}% 0 ${leftInset.toFixed(1)}%);`;
      }
    } else if (shape === 'Vertical') {
      if (dir === 'From Top to Bottom') {
        const topInset = visStart;
        const bottomInset = 100 - visEnd;
        progressStyle = `clip-path: inset(${topInset.toFixed(1)}% 0 ${bottomInset.toFixed(1)}% 0);`;
      } else {
        const topInset = 100 - visEnd;
        const bottomInset = visStart;
        progressStyle = `clip-path: inset(${topInset.toFixed(1)}% 0 ${bottomInset.toFixed(1)}% 0);`;
      }
    } else {
      // Radial90 / Radial180 / Radial360 using conic-gradient mask on the control's bounding box!
      const maxSpanDeg = shape === 'Radial90' ? 90 : (shape === 'Radial180' ? 180 : 360);
      const startAngleMap = { Top: 0, Right: 90, Bottom: 180, Left: 270 };
      const baseDeg = startAngleMap[startLoc] ?? 0;
      const isCCW = dir === 'Counterclockwise';

      const degStart = (visStart / 100) * maxSpanDeg;
      const degEnd = (visEnd / 100) * maxSpanDeg;

      let conicCss = '';
      if (!isCCW) {
        conicCss = `conic-gradient(from ${baseDeg}deg at 50% 50%, transparent 0deg, transparent ${degStart.toFixed(1)}deg, black ${degStart.toFixed(1)}deg, black ${degEnd.toFixed(1)}deg, transparent ${degEnd.toFixed(1)}deg, transparent 360deg)`;
      } else {
        const ccwStart = 360 - degEnd;
        const ccwEnd = 360 - degStart;
        conicCss = `conic-gradient(from ${baseDeg}deg at 50% 50%, transparent 0deg, transparent ${ccwStart.toFixed(1)}deg, black ${ccwStart.toFixed(1)}deg, black ${ccwEnd.toFixed(1)}deg, transparent ${ccwEnd.toFixed(1)}deg, transparent 360deg)`;
      }
      progressStyle = `-webkit-mask-image: ${conicCss}; mask-image: ${conicCss};`;
    }
  }

  return { softHStyle, softVStyle, progressStyle };
}

// Render SVG shape graphic for any of the 6 static basic shapes (100001..100006)
// 100001 = Square, 100002 = Circle, 100003 = Triangle, 100004 = 4-Point Star, 100005 = 5-Point Star, 100006 = Hollowed Circle
export function renderStaticShapeSVG(resourceId, fillCss = '#ffffff', size = '100%') {
  const id = Number(resourceId) || 100001;
  switch (id) {
    case 100002: // Circle
      return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" preserveAspectRatio="none" style="display:block;"><circle cx="50" cy="50" r="46" fill="${fillCss}"/></svg>`;
    case 100003: // Triangle
      return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" preserveAspectRatio="none" style="display:block;"><polygon points="50,6 94,92 6,92" fill="${fillCss}"/></svg>`;
    case 100004: // 4-Point Star
      return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" preserveAspectRatio="none" style="display:block;"><polygon points="50,2 64,36 98,50 64,64 50,98 36,64 2,50 36,36" fill="${fillCss}"/></svg>`;
    case 100005: // 5-Point Star
      return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" preserveAspectRatio="none" style="display:block;"><polygon points="50,4 62,36 97,38 70,59 79,93 50,74 21,93 30,59 3,38 38,36" fill="${fillCss}"/></svg>`;
    case 100006: // Hollowed Circle
      return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" preserveAspectRatio="none" style="display:block;"><path d="M50,4 A46,46 0 1,0 50,96 A46,46 0 1,0 50,4 Z M50,22 A28,28 0 1,1 50,78 A28,28 0 1,1 50,22 Z" fill="${fillCss}" fill-rule="evenodd"/></svg>`;
    default: // 100001 Square
      return `<div style="width:${size};height:${size};background:${fillCss};"></div>`;
  }
}

// Render live Stage visual for a ClientUIImageControl (including shape, fill color, soft edge, progress fill, and invert mask)
export function renderStageImageVisualHTML(node, innerTransform = '') {
  ensureControlSpecificDefaults(node);
  const ic = node.imageColor || { r: 255, g: 255, b: 255, a: 255 };
  const fillCss = `rgba(${ic.r}, ${ic.g}, ${ic.b}, ${(ic.a !== undefined ? ic.a : 255) / 255})`;
  const { softHStyle, softVStyle, progressStyle } = computeImageMaskStyles(node);

  return `
    <div class="mw-stage-image-surface" style="width:100%;height:100%;overflow:hidden;${softHStyle}${innerTransform}">
      <div style="width:100%;height:100%;${softVStyle}">
        <div style="width:100%;height:100%;${progressStyle}">
          ${renderStaticShapeSVG(node.resourceId || 100001, fillCss, '100%')}
        </div>
      </div>
    </div>
  `;
}

// Render a Color Swatch + Hex Input + Paint Bucket Icon + Opacity % Box row
function renderColorRowHTML(label, prefixId, colorObj, defaultHex = 'FFFFFF', defaultAlphaPct = 100, showCheckerWhenZero = false) {
  const hex6 = rgbToHex6(colorObj, defaultHex);
  const alphaPct = alphaToPct(colorObj, defaultAlphaPct);
  const isZeroAlpha = showCheckerWhenZero && alphaPct === 0;

  return `
    <div class="mw-field-group">
      <div class="mw-basic-label">${label}</div>
      <div class="mw-color-row">
        <div class="mw-color-hex-box">
          <label class="mw-color-swatch-wrap ${isZeroAlpha ? 'zero-alpha' : ''}" title="Click to pick color">
            <span class="mw-color-swatch-fill" style="background: #${hex6}; opacity: ${Math.max(0.15, alphaPct / 100)};"></span>
            <input type="color" id="${prefixId}-picker" value="#${hex6.toLowerCase()}" />
          </label>
          <input type="text" class="mw-color-hex-inp" id="${prefixId}-hex" maxlength="6" value="${hex6}" spellcheck="false" autocomplete="off" />
          <span class="mw-color-bucket-icon" title="Hex RGB Color">⬦</span>
        </div>
        <div class="mw-color-alpha-box" title="Opacity (0% - 100%)">
          <input type="number" min="0" max="100" step="1" id="${prefixId}-alpha" value="${alphaPct}" />
          <span class="mw-alpha-pct-sign">%</span>
        </div>
      </div>
    </div>
  `;
}

// Render Font Size Editable Combo Box + Preset Dropdown Popover
function renderFontSizeComboHTML(label, inputId, dropdownBtnId, popoverId, currentVal, isOpen) {
  const numVal = Math.round(Number(currentVal) || 20);
  return `
    <div class="mw-field-group" style="position: relative;">
      <div class="mw-basic-label">${label}</div>
      <div class="mw-fontsize-combo">
        <input type="number" min="6" max="160" step="1" id="${inputId}" class="mw-fontsize-inp" value="${numVal}" />
        <button type="button" class="mw-fontsize-drop-btn" id="${dropdownBtnId}" title="Select preset font size">▾</button>
      </div>
      ${isOpen ? `
        <div class="mw-fontsize-popover" id="${popoverId}">
          ${FONT_SIZE_PRESETS.map(sz => `
            <button type="button" class="mw-fontsize-opt ${sz === numVal ? 'active' : ''}" data-pick-fontsize="${sz}" data-target-inp="${inputId}">
              <span>${sz}</span>
              ${sz === numVal ? '<span class="mw-opt-check">✓</span>' : ''}
            </button>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

// Alignment SVG Icons
const ALIGN_ICONS = {
  left: `<svg viewBox="0 0 18 18" width="14" height="14" stroke="currentColor" stroke-width="1.6" fill="none"><line x1="3" y1="3" x2="3" y2="15"/><line x1="6" y1="6.5" x2="13" y2="6.5"/><line x1="6" y1="11.5" x2="15" y2="11.5"/></svg>`,
  center: `<svg viewBox="0 0 18 18" width="14" height="14" stroke="currentColor" stroke-width="1.6" fill="none"><line x1="9" y1="2.5" x2="9" y2="15.5"/><line x1="5" y1="6.5" x2="13" y2="6.5"/><line x1="3.5" y1="11.5" x2="14.5" y2="11.5"/></svg>`,
  right: `<svg viewBox="0 0 18 18" width="14" height="14" stroke="currentColor" stroke-width="1.6" fill="none"><line x1="15" y1="3" x2="15" y2="15"/><line x1="5" y1="6.5" x2="12" y2="6.5"/><line x1="3" y1="11.5" x2="12" y2="11.5"/></svg>`,
  top: `<svg viewBox="0 0 18 18" width="14" height="14" stroke="currentColor" stroke-width="1.6" fill="none"><line x1="3" y1="3" x2="15" y2="3"/><rect x="6" y="6" width="2.2" height="8" fill="currentColor" stroke="none"/><rect x="10.2" y="6" width="2.2" height="5.5" fill="currentColor" stroke="none"/></svg>`,
  middle: `<svg viewBox="0 0 18 18" width="14" height="14" stroke="currentColor" stroke-width="1.6" fill="none"><line x1="2.5" y1="9" x2="15.5" y2="9"/><rect x="5.8" y="4" width="2.2" height="10" fill="currentColor" stroke="none"/><rect x="10.2" y="5.5" width="2.2" height="7" fill="currentColor" stroke="none"/></svg>`,
  bottom: `<svg viewBox="0 0 18 18" width="14" height="14" stroke="currentColor" stroke-width="1.6" fill="none"><line x1="3" y1="15" x2="15" y2="15"/><rect x="6" y="4" width="2.2" height="8.5" fill="currentColor" stroke="none"/><rect x="10.2" y="6.5" width="2.2" height="6" fill="currentColor" stroke="none"/></svg>`
};

// Render TextBoxControl / TextWindowControl Inspector Card
function renderTextBoxInspectorCardHTML(node, state) {
  ensureControlSpecificDefaults(node);
  const collapsed = Boolean(state.textBoxCollapsed);
  const isTextWindow = node.className === 'ClientUITextWindowControl';

  return `
    <div class="mw-basic-card">
      <div class="mw-basic-card-header" id="mw-toggle-textbox-sec">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="mw-sec-caret">${collapsed ? '▸' : '▾'}</span>
          <span class="mw-sec-title-text">Text Box Settings</span>
        </div>
        <button type="button" class="mw-sec-menu-btn" id="mw-reset-textbox-btn" title="Reset Text Box Settings">☰</button>
      </div>

      ${!collapsed ? `
        <div class="mw-basic-card-body">
          ${isTextWindow ? `
            <!-- TextWindowControl Exclusive Scroll Toggles -->
            <div class="mw-toggle-row">
              <span class="mw-basic-label" style="margin: 0; display: inline-flex; align-items: center; gap: 5px;">
                <span class="mw-help-dot" title="Maps to ctrl.interactable in Lua. When ON, players can vertically scroll long text inside this TextWindowControl.">?</span>
                Can Scroll
              </span>
              <button type="button" class="mw-switch ${node.interactable !== false ? 'on' : ''}" id="mw-tw-toggle-canscroll" role="switch" aria-checked="${node.interactable !== false}">
                <span class="mw-switch-knob"></span>
              </button>
            </div>

            <div class="mw-toggle-row">
              <span class="mw-basic-label" style="margin: 0; display: inline-flex; align-items: center; gap: 5px;">
                <span class="mw-help-dot" title="Maps to ctrl.showScrollBar in Lua. Shows or hides the vertical scrollbar track and thumb on the right edge.">?</span>
                Show Scrollbar
              </span>
              <button type="button" class="mw-switch ${node.showScrollBar !== false ? 'on' : ''}" id="mw-tw-toggle-scrollbar" role="switch" aria-checked="${node.showScrollBar !== false}">
                <span class="mw-switch-knob"></span>
              </button>
            </div>
          ` : ''}

          <!-- Font Size Combo Box + Preset Dropdown -->
          ${renderFontSizeComboHTML(
            'Font Size',
            'mw-tb-fontsize-inp',
            'mw-tb-fontsize-drop-btn',
            'mw-tb-fontsize-popover',
            node.fontSize,
            Boolean(state.fontSizeDropdownOpen)
          )}

          <!-- Adaptive Font Size Toggle -->
          <div class="mw-toggle-row">
            <span class="mw-basic-label" style="margin: 0; display: inline-flex; align-items: center; gap: 5px;">
              <span class="mw-help-dot" title="Scales font size down automatically if text doesn't fit inside the box on 1 line (down to Minimum Font Size). When off, text wraps to a new line.">?</span>
              Adaptive Font Size
            </span>
            <button type="button" class="mw-switch ${node.adaptiveFontSize ? 'on' : ''}" id="mw-tb-toggle-adaptive" role="switch" aria-checked="${Boolean(node.adaptiveFontSize)}">
              <span class="mw-switch-knob"></span>
            </button>
          </div>

          <!-- Minimum Font Size (Only shown when Adaptive Font Size is ON) -->
          ${node.adaptiveFontSize ? renderFontSizeComboHTML(
            'Minimum Font Size',
            'mw-tb-minfontsize-inp',
            'mw-tb-minfontsize-drop-btn',
            'mw-tb-minfontsize-popover',
            node.minFontSize,
            Boolean(state.minFontSizeDropdownOpen)
          ) : ''}

          <!-- Text Color -->
          ${renderColorRowHTML('Text Color', 'mw-tb-fontcolor', node.fontColor, 'FFFFFF', 100, false)}

          <!-- Background Color -->
          ${renderColorRowHTML('Background Color', 'mw-tb-bgcolor', node.bgColor, 'FFFFFF', 0, true)}

          <!-- Enable Text Outline Toggle -->
          <div class="mw-toggle-row">
            <span class="mw-basic-label" style="margin: 0;">Enable Text Outline</span>
            <button type="button" class="mw-switch ${node.enableOutline ? 'on' : ''}" id="mw-tb-toggle-outline" role="switch" aria-checked="${Boolean(node.enableOutline)}">
              <span class="mw-switch-knob"></span>
            </button>
          </div>

          <!-- Outline Color (Only shown when Enable Text Outline is ON -->
          ${node.enableOutline ? renderColorRowHTML('Outline Color', 'mw-tb-outlinecolor', node.outlineColor, '333333', 20, true) : ''}

          <!-- Align (Left / Center / Right + Top / Middle / Bottom) -->
          <div class="mw-field-group">
            <div class="mw-basic-label">Align</div>
            <div class="mw-align-bar">
              ${['left', 'center', 'right'].map(h => `
                <button type="button" class="mw-align-btn ${(node.alignH || 'center') === h ? 'active' : ''}" data-align-h="${h}" title="Horizontal Align: ${h}">
                  ${ALIGN_ICONS[h]}
                </button>
              `).join('')}
              ${['top', 'middle', 'bottom'].map(v => `
                <button type="button" class="mw-align-btn ${(node.alignV || 'top') === v ? 'active' : ''}" data-align-v="${v}" title="Vertical Align: ${v}">
                  ${ALIGN_ICONS[v]}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Rich Text Content Box + Tag Insert Buttons (<color>, <i>, <b>, <size>) -->
          <div class="mw-field-group">
            <div class="mw-richtext-toolbar">
              <span class="mw-basic-label" style="font-size: 10px;">Rich Text</span>
              <div class="mw-richtext-tag-btns">
                <button type="button" class="mw-rt-btn" data-insert-tag="b" title="Wrap selection in <b>...</b>"><b>B</b></button>
                <button type="button" class="mw-rt-btn" data-insert-tag="i" title="Wrap selection in <i>...</i>"><i>I</i></button>
                <button type="button" class="mw-rt-btn" data-insert-tag="color" title="Wrap selection in <color=#F5B82E>...</color>">🎨 color</button>
                <button type="button" class="mw-rt-btn" data-insert-tag="size" title="Wrap selection in <size=24>...</size>">↕ size</button>
              </div>
            </div>
            <textarea id="mw-tb-content-textarea" class="mw-tb-content-box" rows="4" spellcheck="false" placeholder="Supports <color=#000000></color>, <i></i>, <b></b>, <size=21></size>">${escapeHtml(node.text || '')}</textarea>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// Render Image Settings + Mask Settings Inspector Cards
function renderImageAndMaskInspectorCardsHTML(node, state) {
  ensureControlSpecificDefaults(node);
  const imageCollapsed = Boolean(state.imageSettingsCollapsed);
  const maskCollapsed = Boolean(state.maskSettingsCollapsed);

  const currentAsset = STATIC_SHAPE_ASSETS.find(a => a.id === Number(node.resourceId)) || STATIC_SHAPE_ASSETS[0];
  const fillColHex = rgbToHex6(node.imageColor, 'FFFFFF');

  // Determine available Direction options based on Shape
  const isRadial = node.fillShape === 'Radial90' || node.fillShape === 'Radial180' || node.fillShape === 'Radial360';
  let directionOptions = [];
  if (node.fillShape === 'Horizontal') {
    directionOptions = ['From Left to Right', 'From Right to Left'];
  } else if (node.fillShape === 'Vertical') {
    directionOptions = ['From Top to Bottom', 'From Bottom to Top'];
  } else {
    directionOptions = ['Clockwise', 'Counterclockwise'];
  }

  if (!directionOptions.includes(node.fillDirection)) {
    node.fillDirection = directionOptions[0];
  }

  return `
    <!-- IMAGE SETTINGS ACCORDION CARD -->
    <div class="mw-basic-card">
      <div class="mw-basic-card-header" id="mw-toggle-image-sec">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="mw-sec-caret">${imageCollapsed ? '▸' : '▾'}</span>
          <span class="mw-sec-title-text">Image Settings</span>
        </div>
        <button type="button" class="mw-sec-menu-btn" id="mw-reset-image-btn" title="Reset Image Settings">☰</button>
      </div>

      ${!imageCollapsed ? `
        <div class="mw-basic-card-body">
          <!-- Image Source Dropdown -->
          <div class="mw-field-group">
            <div class="mw-basic-label">Image Source</div>
            <select class="mw-basic-select" id="mw-img-source-select">
              ${IMAGE_SOURCE_OPTIONS.map(opt => `
                <option value="${opt}" ${node.imageSource === opt ? 'selected' : ''}>${opt}</option>
              `).join('')}
            </select>
          </div>

          <!-- Reference Asset Resource Card -->
          <div class="mw-field-group">
            <div class="mw-basic-label">Reference Asset Resource</div>
            <div class="mw-asset-resource-card ${state.assetLibraryOpen ? 'library-open' : ''}">
              <button type="button" class="mw-asset-thumb" id="mw-open-asset-lib-thumb" title="Click to open Image Library (${currentAsset.shapeLabel} • ${currentAsset.id})">
                ${renderStaticShapeSVG(currentAsset.id, '#FFFFFF', '34px')}
              </button>
              <div class="mw-asset-meta" id="mw-open-asset-lib-meta" title="Click to choose from Basic Shapes Library (100001–100006)">
                <div class="mw-asset-title-text">${escapeHtml(currentAsset.name)}</div>
                <div class="mw-asset-id-row">
                  <span>${currentAsset.id}</span>
                  <button type="button" class="mw-asset-copy-btn" data-copy-asset-id="${currentAsset.id}" title="Copy Resource ID">📋</button>
                </div>
              </div>
              <button type="button" class="mw-asset-lib-btn ${state.assetLibraryOpen ? 'active' : ''}" id="mw-toggle-asset-lib-btn" title="Toggle Bottom 1/3 Image Resource Library">🔍</button>
              <button type="button" class="mw-asset-del-btn" id="mw-img-asset-reset-btn" title="Reset to Basic Shape 100001 (Square)">🗑</button>
            </div>
          </div>

          <!-- Fill Color -->
          ${renderColorRowHTML('Fill Color', 'mw-img-fillcolor', node.imageColor, 'BE4747', 100, false)}

          <!-- Image Type (Basic) + [1:1] "Set to Default Size" Button -->
          <div class="mw-field-group">
            <div class="mw-basic-label">Image Type</div>
            <div class="mw-rotate-row">
              <select class="mw-basic-select" id="mw-img-type-select" style="flex: 1;">
                <option value="Basic" selected>Basic</option>
              </select>
              <button type="button" class="mw-mirror-btn mw-one-to-one-btn" id="mw-img-1to1-btn" title="Set to Default Size (1:1 Square)">
                <span class="mw-1to1-badge">1:1</span>
              </button>
            </div>
          </div>
        </div>
      ` : ''}
    </div>

    <!-- MASK SETTINGS ACCORDION CARD -->
    <div class="mw-basic-card">
      <div class="mw-basic-card-header" id="mw-toggle-mask-sec">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="mw-sec-caret">${maskCollapsed ? '▸' : '▾'}</span>
          <span class="mw-sec-title-text">Mask Settings</span>
        </div>
        <button type="button" class="mw-sec-menu-btn" id="mw-reset-mask-btn" title="Reset Mask Settings">☰</button>
      </div>

      ${!maskCollapsed ? `
        <div class="mw-basic-card-body">
          <!-- Enable Mask Toggle (When OFF, hides all options below) -->
          <div class="mw-toggle-row">
            <span class="mw-basic-label" style="margin: 0;">Enable Mask</span>
            <button type="button" class="mw-switch ${node.enableMask ? 'on' : ''}" id="mw-mask-toggle-enable" role="switch" aria-checked="${Boolean(node.enableMask)}">
              <span class="mw-switch-knob"></span>
            </button>
          </div>

          ${node.enableMask ? `
            <!-- Soft Edge Toggle -->
            <div class="mw-toggle-row">
              <span class="mw-basic-label" style="margin: 0;">Soft Edge</span>
              <button type="button" class="mw-switch ${node.enableSoftEdge ? 'on' : ''}" id="mw-mask-toggle-soft" role="switch" aria-checked="${Boolean(node.enableSoftEdge)}">
                <span class="mw-switch-knob"></span>
              </button>
            </div>

            ${node.enableSoftEdge ? `
              <!-- Soft Mode Dropdown: Percentage | Pixels -->
              <div class="mw-field-group">
                <div class="mw-basic-label">Soft Mode</div>
                <select class="mw-basic-select" id="mw-mask-soft-mode">
                  <option value="Percentage" ${node.softMode === 'Percentage' ? 'selected' : ''}>Percentage</option>
                  <option value="Pixels" ${node.softMode === 'Pixels' ? 'selected' : ''}>Pixels</option>
                </select>
              </div>

              ${node.softMode === 'Pixels' ? `
                <!-- Soft Edge Width (X, Y) in Pixels -->
                <div class="mw-field-group">
                  <div class="mw-basic-label">Soft Edge Width</div>
                  <div class="mw-dual-inputs">
                    <div class="mw-axis-box">
                      <span class="mw-axis-tag x">X</span>
                      <input type="number" step="1" min="0" max="200" id="mw-mask-soft-px-x" value="${Number(node.softEdgeWidthX).toFixed(2)}" />
                    </div>
                    <div class="mw-axis-box">
                      <span class="mw-axis-tag y">Y</span>
                      <input type="number" step="1" min="0" max="200" id="mw-mask-soft-px-y" value="${Number(node.softEdgeWidthY).toFixed(2)}" />
                    </div>
                  </div>
                </div>
              ` : `
                <!-- Horizontal & Vertical Area Range Sliders -->
                <div class="mw-field-group">
                  <div class="mw-basic-label">Horizontal Area Range</div>
                  <div class="mw-slider-row">
                    <input type="range" min="0" max="100" step="0.01" class="mw-range-slider" id="mw-mask-soft-h-range" value="${Number(node.softRangeH).toFixed(2)}" />
                    <input type="number" min="0" max="100" step="0.5" class="mw-slider-num-box" id="mw-mask-soft-h-num" value="${Number(node.softRangeH).toFixed(2)}" />
                  </div>
                </div>
                <div class="mw-field-group">
                  <div class="mw-basic-label">Vertical Area Range</div>
                  <div class="mw-slider-row">
                    <input type="range" min="0" max="100" step="0.01" class="mw-range-slider" id="mw-mask-soft-v-range" value="${Number(node.softRangeV).toFixed(2)}" />
                    <input type="number" min="0" max="100" step="0.5" class="mw-slider-num-box" id="mw-mask-soft-v-num" value="${Number(node.softRangeV).toFixed(2)}" />
                  </div>
                </div>
              `}
            ` : ''}

            <!-- Fill by Progress Toggle -->
            <div class="mw-toggle-row">
              <span class="mw-basic-label" style="margin: 0;">Fill by Progress</span>
              <button type="button" class="mw-switch ${node.enableFillByProgress ? 'on' : ''}" id="mw-mask-toggle-progress" role="switch" aria-checked="${Boolean(node.enableFillByProgress)}">
                <span class="mw-switch-knob"></span>
              </button>
            </div>

            ${node.enableFillByProgress ? `
              <!-- Shape Dropdown  -->
              <div class="mw-field-group">
                <div class="mw-basic-label">Shape</div>
                <select class="mw-basic-select" id="mw-mask-fill-shape">
                  ${FILL_SHAPE_OPTIONS.map(sh => `
                    <option value="${sh}" ${node.fillShape === sh ? 'selected' : ''}>${sh}</option>
                  `).join('')}
                </select>
              </div>

              <!-- Direction Dropdown -->
              <div class="mw-field-group">
                <div class="mw-basic-label">Direction</div>
                <select class="mw-basic-select" id="mw-mask-fill-dir">
                  ${directionOptions.map(d => `
                    <option value="${d}" ${node.fillDirection === d ? 'selected' : ''}>${d}</option>
                  `).join('')}
                </select>
              </div>

              <!-- Starting Location Dropdown (Only for Radial90 / Radial180 / Radial360  -->
              ${isRadial ? `
                <div class="mw-field-group">
                  <div class="mw-basic-label">Starting Location</div>
                  <select class="mw-basic-select" id="mw-mask-fill-start">
                    ${['Top', 'Bottom', 'Left', 'Right'].map(loc => `
                      <option value="${loc}" ${node.fillStartLocation === loc ? 'selected' : ''}>${loc}</option>
                    `).join('')}
                  </select>
                </div>
              ` : ''}

              <!-- fillAmount Slider + Number Box (0..100%)  -->
              <div class="mw-field-group">
                <div class="mw-basic-label">fillAmount</div>
                <div class="mw-slider-row">
                  <input type="range" min="0" max="100" step="1" class="mw-range-slider" id="mw-mask-fill-amount-range" value="${Math.round(Number(node.fillAmount) ?? 100)}" />
                  <input type="number" min="0" max="100" step="1" class="mw-slider-num-box" id="mw-mask-fill-amount-num" value="${Math.round(Number(node.fillAmount) ?? 100)}" />
                </div>
              </div>
            ` : ''}

            <!-- Invert Mask Area Toggle  -->
            <div class="mw-toggle-row">
              <span class="mw-basic-label" style="margin: 0;" title="Inverts the box mask / progress fill so 100% fill becomes 0% visible (displays amount remaining)">Invert Mask Area</span>
              <button type="button" class="mw-switch ${node.invertMask ? 'on' : ''}" id="mw-mask-toggle-invert" role="switch" aria-checked="${Boolean(node.invertMask)}">
                <span class="mw-switch-knob"></span>
              </button>
            </div>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

// Synchronize a Button's 1-tier-down status child nodes so only the active state node is enabled/visible
export function syncButtonStateMachineChildren(project, buttonNode, forcedState = null) {
  if (!project || !buttonNode || buttonNode.className !== 'ClientUIPresetButtonControl') return;
  ensureControlSpecificDefaults(buttonNode);

  // Only direct children (1 tier down) are valid status nodes for the Button State Machine
  const directChildren = project.nodes.filter(n => n.parentKey === buttonNode.key);
  const validDirectKeys = new Set(directChildren.map(c => c.key));

  if (buttonNode.normalStatusNodeKey && !validDirectKeys.has(buttonNode.normalStatusNodeKey)) {
    buttonNode.normalStatusNodeKey = '';
  }
  if (buttonNode.hoverStatusNodeKey && !validDirectKeys.has(buttonNode.hoverStatusNodeKey)) {
    buttonNode.hoverStatusNodeKey = '';
  }
  if (buttonNode.pressedStatusNodeKey && !validDirectKeys.has(buttonNode.pressedStatusNodeKey)) {
    buttonNode.pressedStatusNodeKey = '';
  }
  if (buttonNode.disabledStatusNodeKey && !validDirectKeys.has(buttonNode.disabledStatusNodeKey)) {
    buttonNode.disabledStatusNodeKey = '';
  }

  const assignedKeys = new Set(
    [
      buttonNode.normalStatusNodeKey,
      buttonNode.hoverStatusNodeKey,
      buttonNode.pressedStatusNodeKey,
      buttonNode.disabledStatusNodeKey
    ].filter(Boolean)
  );

  if (assignedKeys.size === 0) return;

  const stateMode = forcedState || (buttonNode.interactable === false ? 'disabled' : (buttonNode.previewButtonState || 'normal'));
  let activeKey = buttonNode.normalStatusNodeKey;
  if (stateMode === 'hover') {
    activeKey = buttonNode.hoverStatusNodeKey || buttonNode.normalStatusNodeKey;
  } else if (stateMode === 'pressed') {
    activeKey = buttonNode.pressedStatusNodeKey || buttonNode.hoverStatusNodeKey || buttonNode.normalStatusNodeKey;
  } else if (stateMode === 'disabled') {
    activeKey = buttonNode.disabledStatusNodeKey || buttonNode.normalStatusNodeKey;
  }

  for (const child of directChildren) {
    if (assignedKeys.has(child.key)) {
      const isTarget = child.key === activeKey;
      child.active = isTarget;
      child.visible = isTarget;
    }
  }
}

// Render Stage container visual for a ClientUIPresetButtonControl (Container State Machine)
export function renderStageButtonVisualHTML(project, node, innerTransform = '') {
  ensureControlSpecificDefaults(node);
  const directChildren = project ? project.nodes.filter(n => n.parentKey === node.key) : [];
  const hasAssignedState = Boolean(
    node.normalStatusNodeKey ||
    node.hoverStatusNodeKey ||
    node.pressedStatusNodeKey ||
    node.disabledStatusNodeKey
  );

  if (directChildren.length > 0 && hasAssignedState) {
    // Visual look comes from the active 1-tier-down child status node (and its nested composition)
    return `
      <div class="mw-stage-button-machine-surface" style="width:100%;height:100%;position:relative;pointer-events:none;${innerTransform}"></div>
    `;
  }

  // Fallback wireframe if the user hasn't assigned any child status node yet
  return `
    <div class="mw-stage-button-machine-empty" style="width:100%;height:100%;border:1px dashed rgba(245,184,46,0.55);background:rgba(46,38,30,0.38);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2px 6px;text-align:center;${innerTransform}">
      <span style="font-size:10px;font-weight:700;color:#f5b82e;letter-spacing:0.03em;">[ BUTTON STATE MACHINE ]</span>
      <span style="font-size:9px;color:#cbb894;">Pick 1-Tier Child Status Node</span>
    </div>
  `;
}

// Render Button (ClientUIPresetButtonControl) State Machine Inspector Card
function renderButtonInspectorCardHTML(project, node, state) {
  ensureControlSpecificDefaults(node);
  syncButtonStateMachineChildren(project, node);

  const collapsed = Boolean(state.buttonSettingsCollapsed);
  // Only 1-tier-down direct children can be picked to represent a Button status
  const directChildren = project.nodes.filter(n => n.parentKey === node.key);

  const statusSlots = [
    {
      prop: 'normalStatusNodeKey',
      stateKey: 'normal',
      label: 'Normal Status Node',
      sub: 'Default unpressed visual state',
      selectId: 'mw-btn-status-normal'
    },
    {
      prop: 'hoverStatusNodeKey',
      stateKey: 'hover',
      label: 'Hover Status Node',
      sub: 'Cursor hover state (CursorEnter)',
      selectId: 'mw-btn-status-hover'
    },
    {
      prop: 'pressedStatusNodeKey',
      stateKey: 'pressed',
      label: 'Pressed Status Node',
      sub: 'Mouse / touch press down state (CursorDown)',
      selectId: 'mw-btn-status-pressed'
    },
    {
      prop: 'disabledStatusNodeKey',
      stateKey: 'disabled',
      label: 'Disabled Status Node',
      sub: 'When Interactable is toggled OFF',
      selectId: 'mw-btn-status-disabled'
    }
  ];

  const activePreview = node.previewButtonState || 'normal';

  return `
    <div class="mw-basic-card">
      <div class="mw-basic-card-header" id="mw-toggle-button-sec">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="mw-sec-caret">${collapsed ? '▸' : '▾'}</span>
          <span class="mw-sec-title-text">Button</span>
        </div>
        <button type="button" class="mw-sec-menu-btn" id="mw-reset-button-btn" title="Reset Button State Machine Settings">☰</button>
      </div>

      ${!collapsed ? `
        <div class="mw-basic-card-body">
          <!-- Interactable Toggle -->
          <div class="mw-toggle-row">
            <span class="mw-basic-label" style="margin: 0; display: inline-flex; align-items: center; gap: 5px;">
              <span class="mw-help-dot" title="Whether the Button responds to user input. When OFF, the State Machine flips to the Disabled Status Node.">?</span>
              Interactable
            </span>
            <button type="button" class="mw-switch ${node.interactable !== false ? 'on' : ''}" id="mw-btn-toggle-interactable" role="switch" aria-checked="${node.interactable !== false}">
              <span class="mw-switch-knob"></span>
            </button>
          </div>

          <!-- Raycast Target Toggle -->
          <div class="mw-toggle-row">
            <span class="mw-basic-label" style="margin: 0;">Raycast Target</span>
            <button type="button" class="mw-switch ${node.raycastTarget !== false ? 'on' : ''}" id="mw-btn-toggle-raycast" role="switch" aria-checked="${node.raycastTarget !== false}">
              <span class="mw-switch-knob"></span>
            </button>
          </div>

          <!-- State Machine Header & Live Stage State Flipper -->
          <div class="mw-btn-sm-box">
            <div class="mw-btn-sm-header">
              <span class="mw-btn-sm-title">STATE MACHINE (1-TIER CHILD NODES)</span>
              <span class="mw-btn-sm-count">${directChildren.length} Direct ${directChildren.length === 1 ? 'Child' : 'Children'}</span>
            </div>
            <div class="mw-btn-sm-desc">
              Pick a direct child node (1 tier down) for each status. A child can be a <code>ContainerControl</code> holding a full composition (Images, Text, Animations, Grid, etc.).
            </div>

            <!-- Live State Preview Switcher -->
            <div class="mw-field-group" style="margin-top: 6px;">
              <div class="mw-basic-label" style="font-size: 10px; color: var(--text-muted);">Preview / Flip State on Stage</div>
              <div class="mw-btn-state-pills">
                ${[
                  { k: 'normal', lbl: 'Normal' },
                  { k: 'hover', lbl: 'Hover' },
                  { k: 'pressed', lbl: 'Pressed' },
                  { k: 'disabled', lbl: 'Disabled' }
                ].map(st => `
                  <button type="button" class="mw-btn-state-pill ${activePreview === st.k ? 'active' : ''}" data-btn-preview-state="${st.k}" title="Flip Button on Stage to ${st.lbl} Status Node">
                    ${st.lbl}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- 4 Status Node Selector Boxes (Clicking opens Side Selector Block next to Right Menu -->
            ${statusSlots.map(slot => {
              const currentKey = node[slot.prop] || '';
              const assignedChild = directChildren.find(c => c.key === currentKey);
              const isCurrentPreview = activePreview === slot.stateKey;
              const isSideOpen = state.sideSelectorMode === 'button_state' && state.sideSelectorBtnSlot === slot.stateKey;
              const subCount = assignedChild ? project.nodes.filter(n => n.parentKey === assignedChild.key).length : 0;
              return `
                <div class="mw-field-group mw-btn-slot-row ${isCurrentPreview ? 'is-active-state' : ''}">
                  <div class="mw-btn-slot-label-row">
                    <span class="mw-basic-label" style="margin: 0;">${slot.label}</span>
                    ${isCurrentPreview ? `<span class="mw-btn-active-tag">● ACTIVE</span>` : ''}
                  </div>
                  <div class="mw-ref-template-box ${isSideOpen ? 'active' : ''}">
                    <button type="button" class="mw-ref-template-main" data-open-btn-slot-picker="${slot.stateKey}" data-btn-slot-prop="${slot.prop}" title="Click to open Child Status Node Selector next to Right Menu ">
                      <span class="mw-ref-template-icon" style="width:24px;height:24px;font-size:10px;">${assignedChild ? escapeHtml(assignedChild.icon) : '＋'}</span>
                      <div class="mw-ref-template-meta">
                        <div class="mw-ref-template-name">${assignedChild ? escapeHtml(assignedChild.name) : 'Please Select Control'}</div>
                        <div class="mw-ref-template-idx">${assignedChild ? `id:${assignedChild.id} • ${subCount} child${subCount === 1 ? '' : 'ren'}` : 'None (Unassigned)'}</div>
                      </div>
                    </button>
                    <div class="mw-ref-template-actions">
                      <button type="button" class="mw-mirror-btn mw-btn-jump-child" data-jump-child-key="${escapeHtml(currentKey)}" ${!assignedChild ? 'disabled' : ''} title="${assignedChild ? `Select ${assignedChild.name} in Hierarchy to edit its visuals` : 'No child node assigned'}">
                        ↗
                      </button>
                      ${assignedChild ? `
                        <button type="button" class="mw-mirror-btn" data-clear-btn-slot-prop="${slot.prop}" title="Unassign ${slot.label}">🗑</button>
                      ` : ''}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}

            <!-- Quick 1-Tier Child Composition Creator -->
            <div style="margin-top: 8px; display: flex; gap: 6px;">
              <button type="button" class="brutal-btn brutal-btn-gold" id="mw-btn-add-state-child" style="width: 100%; justify-content: center; padding: 5px 8px; font-size: 10.5px;" title="Create a new 1-tier child ContainerControl (with Image + TextBox composition inside) under this Button">
                [ + ADD 1-TIER CHILD STATUS CONTAINER ]
              </button>
            </div>
          </div>

          <!-- Click Audio ID -->
          <div class="mw-field-group" style="margin-top: 4px;">
            <div class="mw-basic-label">Click Sound Effect (clickAudioId)</div>
            <input type="number" min="0" max="999999" step="1" class="mw-fontsize-inp" id="mw-btn-audio-id" value="${Math.round(Number(node.clickAudioId) || 0)}" style="width: 100%; height: 26px; background: #14110e; border: 1px solid #3d3328; border-radius: 3px; color: var(--text-bright); padding: 0 8px; font-family: var(--font-mono); font-size: 11.5px;" />
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// Render Keybind Settings Card for ClientUIKeyHintControl 
function renderKeyHintInspectorCardHTML(node, state) {
  ensureControlSpecificDefaults(node);
  const collapsed = Boolean(state.keybindSettingsCollapsed);
  const kbMeta = getKeyboardKeyHintMeta(node.keyboardKeyCode);
  const ctrlMeta = getControllerKeyHintMeta(node.controllerKeyCode);
  const activeDevice = node.previewKeyHintDevice || 'keyboard';
  const customKey = String(node.playerCustomKeyOverride || '').trim();

  const listenerSnippet = [
    `-- Dynamic KeyHintControl + Semantic KeyEventType Pairing`,
    `local keyHint = root:FindChild("${node.uiPath || node.name}")`,
    `if keyHint then`,
    `    keyHint.keyboardKeyCode = Enum.KeyboardKeyCode.${kbMeta.enumName}`,
    `    keyHint.controllerKeyCode = Enum.ControllerKeyCode.${ctrlMeta.enumName}`,
    `end`,
    kbMeta.keyDownEnum
      ? `game.AddKeyEventListener(Enum.KeyEventType.${kbMeta.keyDownEnum}, function()\n    print("[Keyboard] Triggered ${kbMeta.actionName} (Default '${kbMeta.uiLabel}'${customKey ? `, Player Rebound -> '${customKey}'` : ''})")\nend)`
      : null,
    ctrlMeta.keyDownEnum
      ? `game.AddKeyEventListener(Enum.KeyEventType.${ctrlMeta.keyDownEnum}, function()\n    print("[Gamepad] Triggered ${ctrlMeta.uiLabel} (${ctrlMeta.badgeText})")\nend)`
      : null
  ].filter(Boolean).join('\n');

  return `
    <div class="mw-basic-card">
      <div class="mw-basic-card-header" id="mw-toggle-keybind-sec">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="mw-sec-caret">${collapsed ? '▸' : '▾'}</span>
          <span class="mw-sec-title-text">Keybind Settings</span>
        </div>
        <button type="button" class="mw-sec-menu-btn" id="mw-reset-keybind-btn" title="Reset Keybind Settings to Default (Keyboard: 1, Gamepad: Action Bottom)">☰</button>
      </div>

      ${!collapsed ? `
        <div class="mw-basic-card-body">
          <!-- Keyboard Dropdown  — 58 Semantic PC Actions + Invalid -->
          <div class="mw-field-group">
            <div class="mw-basic-label" style="display: flex; justify-content: space-between; align-items: center;">
              <span>Keyboard</span>
            </div>
            <select class="mw-basic-select" id="mw-keyhint-keyboard-select" title="Select semantic PC Keyboard/Mouse action slot">
              ${KEYBOARD_KEYHINT_OPTIONS.map(opt => `
                <option value="${opt.value}" ${kbMeta.value === opt.value ? 'selected' : ''}>
                  ${escapeHtml(opt.uiLabel)} — ${escapeHtml(opt.actionName)} (${opt.enumName})
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Gamepad Dropdown — 24 Gamepad Buttons & Combos + Invalid -->
          <div class="mw-field-group">
            <div class="mw-basic-label" style="display: flex; justify-content: space-between; align-items: center;">
              <span>Gamepad</span>
            </div>
            <select class="mw-basic-select" id="mw-keyhint-gamepad-select" title="Select Gamepad button or LB/LT combo prompt">
              ${CONTROLLER_KEYHINT_OPTIONS.map(opt => `
                <option value="${opt.value}" ${ctrlMeta.value === opt.value ? 'selected' : ''}>
                  ${escapeHtml(opt.uiLabel)}${opt.value > 0 ? ` (${opt.badgeText} / ${opt.enumName})` : ''}
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Interactive Button Showcase & Player Keybind Remap Simulator -->
          <div class="mw-btn-sm-box" style="margin-top: 6px;">
            <div class="mw-btn-sm-header">
              <span class="mw-btn-sm-title">DYNAMIC KEYBIND SHOWCASE PREVIEW</span>
              <span class="mw-btn-sm-count">${activeDevice === 'gamepad' ? '🎮 GAMEPAD' : '⌨️ KEYBOARD'}</span>
            </div>
            <div class="mw-btn-sm-desc">
              <strong>Why KeyHintControl matters:</strong> It connects directly to the player's live keybinds! If you pick <code>R</code> (<em>Craftsperson Key 7</em>) and a player rebound <code>R</code> to <code>'['</code> in their settings, static text says <em>"Press R"</em> (wrong!), whereas <code>KeyHintControl</code> automatically shows <strong><code>[</code></strong>!
            </div>

            <!-- Device Mode Switcher (PC Keyboard vs Gamepad) -->
            <div class="mw-field-group" style="margin-top: 4px;">
              <div class="mw-basic-label" style="font-size: 10px; color: var(--text-muted);">Preview Active Device on Stage</div>
              <div class="mw-btn-state-pills" style="grid-template-columns: 1fr 1fr;">
                <button type="button" class="mw-btn-state-pill ${activeDevice === 'keyboard' ? 'active' : ''}" data-keyhint-device="keyboard">
                  ⌨️ PC (${escapeHtml(customKey || kbMeta.badgeText)})
                </button>
                <button type="button" class="mw-btn-state-pill ${activeDevice === 'gamepad' ? 'active' : ''}" data-keyhint-device="gamepad">
                  🎮 Gamepad (${escapeHtml(ctrlMeta.badgeText)})
                </button>
              </div>
            </div>

            <!-- Paired Enum.KeyEventType Lookup & 1-Click Copy -->
            <div class="mw-field-group" style="margin-top: 4px; padding-top: 6px; border-top: 1px solid #2e261d;">
              <div class="mw-basic-label" style="display: flex; justify-content: space-between; align-items: center;">
                <span><code>Enum.KeyEventType</code></span>
                <button type="button" class="brutal-btn brutal-btn-gold" id="mw-copy-keyhint-listener-btn" data-snippet="${encodeURIComponent(listenerSnippet)}" style="padding: 1px 6px; font-size: 9.5px;">[ COPY LUA ]</button>
              </div>
              <div style="font-size: 10px; font-family: var(--font-mono); color: var(--text-bright); background: #120f0c; border: 1px solid #2e261d; padding: 5px 6px; border-radius: 2px; line-height: 1.45;">
                <div><span style="color: var(--text-muted);">PC:</span> <span style="color: var(--accent-gold);">${kbMeta.keyDownEnum ? `Enum.KeyEventType.${kbMeta.keyDownEnum}` : 'None'}</span></div>
                <div><span style="color: var(--text-muted);">Pad:</span> <span style="color: #7ec8e3;">${ctrlMeta.keyDownEnum ? `Enum.KeyEventType.${ctrlMeta.keyDownEnum}` : 'None'}</span></div>
              </div>
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// Render Controller Navigation Card 
function renderControllerNavigationCardHTML(node, state) {
  const collapsed = Boolean(state.controllerNavCollapsed);
  return `
    <div class="mw-basic-card">
      <div class="mw-basic-card-header" id="mw-toggle-ctrl-nav-sec">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="mw-sec-caret">${collapsed ? '▸' : '▾'}</span>
          <span class="mw-sec-title-text">Controller Navigation</span>
        </div>
        <span class="mw-sec-menu-btn">☰</span>
      </div>

      ${!collapsed ? `
        <div class="mw-basic-card-body">
          <div class="mw-toggle-row">
            <span class="mw-basic-label" style="margin: 0;">Selectable via Controller<br/>Joystick Navigation</span>
            <button type="button" class="mw-switch ${node.controllerNav ? 'on' : ''}" id="mw-toggle-ctrl-nav" role="switch" aria-checked="${Boolean(node.controllerNav)}">
              <span class="mw-switch-knob"></span>
            </button>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// ============================================================================
// 1. UI ANIMATION SETTINGS CARD 
// Supports:
//   • ClientUIAnimationControl (10001001..10001160): 62 Looping + 98 Non-Looping Particle Effects,
//     UI Animation Layer (Above All Controls / Below All Controls), Play Sound Effect
//   • ClientUIFullscreenAnimationControl (10002001..10002037): 23 Looping + 14 Non-Looping Fullscreen VFX
// Clicking the selector opens a separate block next to the Right Menu.
// ============================================================================
function renderAnimationInspectorCardHTML(node, state) {
  ensureControlSpecificDefaults(node);
  const collapsed = Boolean(state.animSettingsCollapsed);
  const isFull = node.className === 'ClientUIFullscreenAnimationControl';
  const currentVfx = getVfxPresetMeta(node.animationId, node.className);
  const pickerOpen = state.sideSelectorMode === 'vfx';

  return `
    <div class="mw-basic-card">
      <div class="mw-basic-card-header" id="mw-toggle-anim-sec">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="mw-sec-caret">${collapsed ? '▸' : '▾'}</span>
          <span class="mw-sec-title-text">UI Animation Settings</span>
        </div>
        <button type="button" class="mw-sec-menu-btn" id="mw-reset-anim-btn" title="Reset UI Animation Settings">☰</button>
      </div>

      ${!collapsed ? `
        <div class="mw-basic-card-body">
          <!-- Select UI Animation Button / Selected VFX Box (Opens Side Selector next to Right Menu -->
          <div class="mw-field-group">
            <div class="mw-basic-label" style="display: flex; justify-content: space-between; align-items: center;">
              <span>Select UI Animation</span>
              <span style="font-size: 9px; color: var(--accent-gold); font-family: var(--font-mono);">
                ${isFull ? '23 Loop • 14 One-Shot' : '62 Loop • 98 One-Shot'}
              </span>
            </div>

            ${!currentVfx.id ? `
              <button type="button" class="mw-vfx-select-empty-btn ${pickerOpen ? 'active' : ''}" id="mw-open-vfx-picker-btn" title="Click to open Select VFX panel next to Right Menu ">
                <span style="font-size: 16px; line-height: 1; color: #b5a68e;">＋</span>
                <span>Please Select Animation</span>
              </button>
            ` : `
              <div class="mw-vfx-selected-box ${pickerOpen ? 'active' : ''}">
                <button type="button" class="mw-vfx-selected-main" id="mw-open-vfx-picker-btn" title="Click to open Select VFX panel next to Right Menu">
                  <span class="mw-vfx-thumb" style="border-color: ${currentVfx.color}; background: ${currentVfx.looping ? `radial-gradient(circle, rgba(16,13,10,0.2) 30%, ${currentVfx.color}88 100%)` : `repeating-linear-gradient(45deg, ${currentVfx.color}55 0 3px, #14110e 3px 6px)`};">
                    ${isFull ? (currentVfx.looping ? '⛶' : '⚡') : (currentVfx.looping ? '✦' : '💥')}
                  </span>
                  <div class="mw-vfx-meta">
                    <div class="mw-vfx-meta-name">${escapeHtml(currentVfx.name)}</div>
                    <div class="mw-vfx-meta-sub">Index ${currentVfx.id} • <span style="color:${currentVfx.color};">${currentVfx.looping ? (isFull ? 'Looping Bokeh' : 'Looping Particles') : (isFull ? 'Non-Looping Glitch' : 'One-Shot Particle Burst')}</span></div>
                  </div>
                </button>
                <div class="mw-vfx-selected-actions">
                  <button type="button" class="mw-mirror-btn" id="mw-vfx-copy-id-btn" data-copy-vfx="${currentVfx.id}" title="Copy Animation Index ${currentVfx.id}">📋</button>
                  <button type="button" class="mw-mirror-btn" id="mw-vfx-clear-btn" title="Clear selected animation (+ Please Select Animation)">🗑</button>
                </div>
              </div>
            `}
          </div>

          <!-- Direct Animation ID Input (also accepts any custom preset number) -->
          <div class="mw-field-group">
            <div class="mw-basic-label" style="display: flex; justify-content: space-between;">
              <span>Animation Index ID (<code>ctrl.animationId</code>)</span>
              <button type="button" class="mw-vfx-toggle-list-link" id="mw-toggle-vfx-list-link">${pickerOpen ? 'Close Select VFX ◂' : `Open Select VFX (${isFull ? 37 : 160}) ◂`}</button>
            </div>
            <div style="display: flex; gap: 5px; align-items: center;">
              <input type="number" id="mw-vfx-id-inp" class="mw-fontsize-inp" value="${Number(node.animationId) || 0}" placeholder="${isFull ? 'e.g. 10002001 (Loop) or 10002006 (1-Shot)' : 'e.g. 10001001 (Loop) or 10001008 (1-Shot)'}" style="flex: 1; height: 26px; background: #14110e; border: 1px solid #3d3328; border-radius: 3px; color: var(--text-bright); padding: 0 8px; font-family: var(--font-mono); font-size: 11px;" />
            </div>
          </div>

          <!-- Play Sound Effect Toggle -->
          <div class="mw-toggle-row" style="margin-top: 4px;">
            <span class="mw-basic-label" style="margin: 0; display: inline-flex; align-items: center; gap: 5px;">
              <span class="mw-help-dot" title="Maps to ctrl.playSoundEffect. Toggling from false to true while active replays the sound effect even if the animation finished.">?</span>
              Play Sound Effect
            </span>
            <button type="button" class="mw-switch ${node.playSoundEffect ? 'on' : ''}" id="mw-anim-toggle-sound" role="switch" aria-checked="${Boolean(node.playSoundEffect)}">
              <span class="mw-switch-knob"></span>
            </button>
          </div>

          ${!isFull ? `
            <!-- UIAnimationControl Layer (Enum.UIAnimationLayer: AboveAllControls vs BelowAllControls) -->
            <div class="mw-field-group" style="margin-top: 4px;">
              <div class="mw-basic-label" style="display: flex; justify-content: space-between; align-items: center;">
                <span>UI Animation Layer (<code>ctrl.layer</code>)</span>
                <span style="font-size: 9px; color: var(--accent-gold); font-family: var(--font-mono);">Enum.UIAnimationLayer</span>
              </div>
              <select class="mw-basic-select" id="mw-anim-layer-select">
                <option value="1" ${Number(node.layer) === 1 ? 'selected' : ''}>Above All Controls (Enum.UIAnimationLayer.AboveAllControls)</option>
                <option value="0" ${(Number(node.layer) || 0) === 0 ? 'selected' : ''}>Below All Controls (Enum.UIAnimationLayer.BelowAllControls)</option>
              </select>
            </div>

            <div class="mw-btn-sm-desc" style="margin-top: 6px; padding: 6px 8px; background: rgba(18,15,12,0.75); border: 1px solid rgba(212,175,55,0.26); border-radius: 3px; line-height: 1.4;">
              <strong>✦ Localized Particle Effects (10001001–10001160):</strong><br/>
              • <strong>Looping (62 IDs, e.g. <code>10001001</code>):</strong> Continuous particle emitter around the control/cursor area; toggle via <code>ctrl:PlayAnimation()</code> / <code>ctrl:StopAnimation()</code>.<br/>
              • <strong>Non-Looping (98 IDs, e.g. <code>10001008</code>):</strong> Plays a 1-shot particle burst and disappears automatically when finished.
            </div>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

// ============================================================================
// 2. TEMPLATE REFERENCE CARD FOR CLIENTUIREFERENCECONTROL
// ============================================================================
function renderReferenceControlInspectorCardHTML(node, state) {
  ensureControlSpecificDefaults(node);
  const collapsed = Boolean(state.refSettingsCollapsed);
  const currentTpl = getReferenceTemplateMeta(node.referencedPrefabIndex);
  const listOpen = state.sideSelectorMode === 'ref_template';

  return `
    <div class="mw-basic-card">
      <div class="mw-basic-card-header" id="mw-toggle-ref-sec">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="mw-sec-caret">${collapsed ? '▸' : '▾'}</span>
          <span class="mw-sec-title-text">Template Reference</span>
        </div>
        <button type="button" class="mw-sec-menu-btn" id="mw-reset-ref-btn" title="Reset Template Reference to 1073741954">☰</button>
      </div>

      ${!collapsed ? `
        <div class="mw-basic-card-body">
          <div class="mw-field-group">
            <div class="mw-basic-label">Reference Control Template</div>
            <div class="mw-ref-template-box ${listOpen ? 'active' : ''}">
              <button type="button" class="mw-ref-template-main" id="mw-open-ref-list-btn" title="Click to open Client Control Template List next to Right Menu">
                <span class="mw-ref-template-icon">${escapeHtml(currentTpl.icon)}</span>
                <div class="mw-ref-template-meta">
                  <div class="mw-ref-template-name">${escapeHtml(currentTpl.name)}</div>
                  <div class="mw-ref-template-idx">${currentTpl.index ? `Index ${currentTpl.index}` : 'No Template Selected'}</div>
                </div>
              </button>
              <div class="mw-ref-template-actions">
                <button type="button" class="mw-mirror-btn" id="mw-ref-copy-idx-btn" data-copy-ref="${currentTpl.index}" title="Copy Prefab Index ${currentTpl.index}">📋</button>
                <button type="button" class="mw-mirror-btn" id="mw-ref-clear-btn" title="Unassign Referenced Template">🗑</button>
              </div>
            </div>
          </div>

          <!-- Direct Prefab Index Input (accepts any 107374xxxx index from top of .lua scripts) -->
          <div class="mw-field-group">
            <div class="mw-basic-label" style="display: flex; justify-content: space-between;">
              <span>Template Prefab Index (<code>referencedPrefabIndex</code>)</span>
              <button type="button" class="mw-vfx-toggle-list-link" id="mw-toggle-ref-list-link">${listOpen ? 'Close Template List ◂' : 'Open Template List ◂'}</button>
            </div>
            <input type="number" id="mw-ref-index-inp" class="mw-fontsize-inp" value="${Number(node.referencedPrefabIndex) || 0}" placeholder="e.g. 1073741954" style="width: 100%; height: 26px; background: #14110e; border: 1px solid #3d3328; border-radius: 3px; color: var(--text-bright); padding: 0 8px; font-family: var(--font-mono); font-size: 11px;" />
          </div>

          <button type="button" class="mw-ref-goto-editor-btn" id="mw-ref-goto-editor-btn">
            Go to Template Editor
          </button>

          <div class="mw-btn-sm-desc" style="margin-top: 6px; padding: 6px 8px; background: rgba(18,15,12,0.7); border: 1px solid rgba(161,138,94,0.22); border-radius: 3px;">
            <strong>🔗 What is ReferenceControl?</strong> Statically embeds a Client Control Template by its Prefab Index (<code>107374xxxx</code>) as a child node at stage load. Read via <code>ctrl.referencedPrefabIndex</code> (Read-Only in Lua). Most code-driven projects use <code>game.CreateControl(prefabIndex, parent)</code> instead.
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// ============================================================================
// 3. FUNCTION SETTINGS CARD FOR CLIENTUICONTAINERCONTROL
// ============================================================================
function renderContainerFunctionInspectorCardHTML(node, state) {
  ensureControlSpecificDefaults(node);
  const collapsed = Boolean(state.containerFuncCollapsed);
  return `
    <div class="mw-basic-card">
      <div class="mw-basic-card-header" id="mw-toggle-container-func-sec">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="mw-sec-caret">${collapsed ? '▸' : '▾'}</span>
          <span class="mw-sec-title-text">Function Settings</span>
        </div>
        <button type="button" class="mw-sec-menu-btn" id="mw-reset-container-func-btn" title="Reset Container Function Settings">☰</button>
      </div>

      ${!collapsed ? `
        <div class="mw-basic-card-body">
          <div class="mw-toggle-row">
            <span class="mw-basic-label" style="margin: 0;" title="Whether controller navigation is restricted within this container (ctrl.isolateNavigation)">IsolateNavigation</span>
            <button type="button" class="mw-switch ${node.isolateNavigation ? 'on' : ''}" id="mw-cont-toggle-isolate" role="switch" aria-checked="${Boolean(node.isolateNavigation)}">
              <span class="mw-switch-knob"></span>
            </button>
          </div>

          <div class="mw-toggle-row">
            <span class="mw-basic-label" style="margin: 0;" title="Blocks keyboard input events from passing through to native game functions like movement or skills (ctrl.disableKeyEventPassthrough)">disableKeyEventPassthrough</span>
            <button type="button" class="mw-switch ${node.disableKeyEventPassthrough ? 'on' : ''}" id="mw-cont-toggle-disablekey" role="switch" aria-checked="${Boolean(node.disableKeyEventPassthrough)}">
              <span class="mw-switch-knob"></span>
            </button>
          </div>

          <div class="mw-toggle-row">
            <span class="mw-basic-label" style="margin: 0;" title="Blocks cursor interaction events from passing through to native game functions like normal attack (ctrl.disableCursorEventPassthrough)">disableCursorEventPassthrough</span>
            <button type="button" class="mw-switch ${node.disableCursorEventPassthrough ? 'on' : ''}" id="mw-cont-toggle-disablecursor" role="switch" aria-checked="${Boolean(node.disableCursorEventPassthrough)}">
              <span class="mw-switch-knob"></span>
            </button>
          </div>

          <div class="mw-toggle-row">
            <span class="mw-basic-label" style="margin: 0;" title="Whether to show the mouse cursor while this Container Control is active (ctrl.showCursor)">showCursor</span>
            <button type="button" class="mw-switch ${node.showCursor ? 'on' : ''}" id="mw-cont-toggle-showcursor" role="switch" aria-checked="${Boolean(node.showCursor)}">
              <span class="mw-switch-knob"></span>
            </button>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// ============================================================================
// 4. CLICK RESPONSE AREA CARD FOR CLIENTUICURSOREVENTAREACONTROL
// ============================================================================
function renderCursorEventAreaInspectorCardHTML(node, state) {
  ensureControlSpecificDefaults(node);
  const collapsed = Boolean(state.cursorAreaCollapsed);
  return `
    <div class="mw-basic-card">
      <div class="mw-basic-card-header" id="mw-toggle-cursorarea-sec">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="mw-sec-caret">${collapsed ? '▸' : '▾'}</span>
          <span class="mw-sec-title-text">Click Response Area</span>
        </div>
        <button type="button" class="mw-sec-menu-btn" id="mw-reset-cursorarea-btn" title="Reset Click Response Area Settings">☰</button>
      </div>

      ${!collapsed ? `
        <div class="mw-basic-card-body">
          <div class="mw-toggle-row">
            <span class="mw-basic-label" style="margin: 0;" title="Editor-only toggle: keeps the click area bounding tint visible on the stage even when unselected">Persistent Area Preview</span>
            <button type="button" class="mw-switch ${node.persistentAreaPreview ? 'on' : ''}" id="mw-ca-toggle-preview" role="switch" aria-checked="${Boolean(node.persistentAreaPreview)}">
              <span class="mw-switch-knob"></span>
            </button>
          </div>

          <div class="mw-toggle-row">
            <span class="mw-basic-label" style="margin: 0;" title="Whether the Cursor Event Area can receive cursor interaction events (ctrl.raycastTarget)">Raycast Target</span>
            <button type="button" class="mw-switch ${node.raycastTarget ? 'on' : ''}" id="mw-ca-toggle-raycast" role="switch" aria-checked="${Boolean(node.raycastTarget)}">
              <span class="mw-switch-knob"></span>
            </button>
          </div>

          <div class="mw-btn-sm-desc" style="margin-top: 6px; padding: 6px 8px; background: rgba(18,15,12,0.7); border: 1px solid rgba(161,138,94,0.22); border-radius: 3px;">
            <strong>⌖ Minigame Hitboxes & Map Raycasts:</strong> Useful for invisible click/drag regions on a map or damage zones via <code>AddCursorEventListener(Enum.CursorEventType.CursorClick, fn)</code>. (A fullscreen or transparent <code>PresetButtonControl</code> also works for querying clicks.)
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// ============================================================================
// 5. GRID SCROLLER SETTINGS & CONTENT CARD FOR CLIENTUIGRIDSCROLLERCONTROL
// ============================================================================
function renderGridScrollerInspectorCardHTML(node, state) {
  const m = computeGridScrollerLayoutMetrics(node);
  const collapsed = Boolean(state.gridScrollerCollapsed);
  const currentTpl = getReferenceTemplateMeta(node.itemPrefabIndex);
  const listOpen = state.sideSelectorMode === 'grid_template';

  const inventoryLuaSnippet = [
    `-- Minecraft / Terraria Style Inventory using 1 Slot Template (RefreshItems + GetItemIndex)`,
    `local grid = root:FindChild("${node.uiPath || node.name}")`,
    `local INVENTORY_SLOTS = {`,
    `    { name = "Dirt Block",   qty = 64, r = 139, g = 90,  b = 43  },`,
    `    { name = "Cobblestone",  qty = 64, r = 130, g = 136, b = 144 },`,
    `    { name = "Iron Pickaxe", qty = 1,  r = 212, g = 175, b = 55  },`,
    `    { name = "Torch",        qty = 16, r = 245, g = 158, b = 11  },`,
    `    { name = "Gold Ore",     qty = 12, r = 234, g = 179, b = 8   },`,
    `    { name = "Heal Potion",  qty = 5,  r = 239, g = 68,  b = 68  }`,
    `}`,
    ``,
    `grid.itemPrefabIndex = ${currentTpl.index || 1073741954} -- 1 Reusable Slot Template (${currentTpl.name})`,
    `grid.interactable = ${node.interactable !== false}`,
    `grid.showScrollBar = ${node.showScrollBar !== false}`,
    `grid.raycastTarget = ${node.raycastTarget !== false}`,
    ``,
    `-- RefreshItems instantiates N copies of itemPrefabIndex & calls callback(slotCtrl, index) for each slot (0..N-1):`,
    `grid:RefreshItems(#INVENTORY_SLOTS, function(slotCtrl, index)`,
    `    local data = INVENTORY_SLOTS[index + 1] -- Lua table is 1-indexed, Grid index is 0-indexed`,
    `    slotCtrl.name = "Slot_" .. tostring(index)`,
    `    slotCtrl.text = string.format("[%d] %s x%d", index, data.name, data.qty)`,
    `    slotCtrl.bgColor = Color.FromRGBA(data.r, data.g, data.b, 210)`,
    ``,
    `    -- Detect which slot was clicked (either via closure 'index' or grid:GetItemIndex(slotCtrl)):`,
    `    slotCtrl:AddCursorEventListener(Enum.CursorEventType.CursorClick, function()`,
    `        local pressedIdx = grid:GetItemIndex(slotCtrl) -- returns 0-indexed slot position`,
    `        print("Clicked Inventory Slot #" .. tostring(pressedIdx) .. ": " .. data.name)`,
    `    end)`,
    `end)`
  ].join('\n');

  return `
    <div class="mw-basic-card">
      <div class="mw-basic-card-header" id="mw-toggle-gridscroller-sec">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="mw-sec-caret">${collapsed ? '▸' : '▾'}</span>
          <span class="mw-sec-title-text">Grid Scroller Settings</span>
        </div>
        <button type="button" class="mw-sec-menu-btn" id="mw-reset-gridscroller-btn" title="Reset Grid Scroller Settings">☰</button>
      </div>

      ${!collapsed ? `
        <div class="mw-basic-card-body">
          <!-- Can Scroll / Show Scrollbar / Raycast Target -->
          <div class="mw-toggle-row">
            <span class="mw-basic-label" style="margin: 0;" title="Whether the Grid Scroller can be scrolled by client input">Can Scroll (<code>interactable</code>)</span>
            <button type="button" class="mw-switch ${node.interactable !== false ? 'on' : ''}" id="mw-gs-toggle-canscroll" role="switch" aria-checked="${node.interactable !== false}">
              <span class="mw-switch-knob"></span>
            </button>
          </div>

          <div class="mw-toggle-row">
            <span class="mw-basic-label" style="margin: 0;" title="Whether to show the scrollbar along the scroll direction">Show Scrollbar</span>
            <button type="button" class="mw-switch ${node.showScrollBar !== false ? 'on' : ''}" id="mw-gs-toggle-scrollbar" role="switch" aria-checked="${node.showScrollBar !== false}">
              <span class="mw-switch-knob"></span>
            </button>
          </div>

          <div class="mw-toggle-row">
            <span class="mw-basic-label" style="margin: 0;" title="Whether the Grid Scroller can be scrolled by dragging on empty space within its bounding box (ctrl.raycastTarget)">Raycast Target</span>
            <button type="button" class="mw-switch ${node.raycastTarget !== false ? 'on' : ''}" id="mw-gs-toggle-raycast" role="switch" aria-checked="${node.raycastTarget !== false}">
              <span class="mw-switch-knob"></span>
            </button>
          </div>

          <!-- Scroll Direction: Horizontal vs Vertical  -->
          <div class="mw-field-group" style="margin-top: 4px;">
            <div class="mw-basic-label" style="display: flex; justify-content: space-between; align-items: center;">
              <span>Scroll Direction</span>
            </div>
            <select class="mw-basic-select" id="mw-gs-scroll-dir">
              <option value="Vertical" ${m.isVertical ? 'selected' : ''}>Vertical (Counted by Columns)</option>
              <option value="Horizontal" ${!m.isVertical ? 'selected' : ''}>Horizontal (Counted by Rows)</option>
            </select>
          </div>

          <!-- Cell Size (GetItemSize), Spacing (GetItemSpacing), Padding (GetPadding), and Scroll Progress -->
          <div class="mw-field-group" style="margin-top: 6px;">
            <div class="mw-basic-label">Cell / Item Size</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
              <div class="mw-axis-box">
                <span class="mw-axis-tag">W</span>
                <input type="number" min="12" max="400" step="1" id="mw-gs-item-w" value="${Math.round(m.itemW)}" />
              </div>
              <div class="mw-axis-box">
                <span class="mw-axis-tag">H</span>
                <input type="number" min="12" max="400" step="1" id="mw-gs-item-h" value="${Math.round(m.itemH)}" />
              </div>
            </div>
          </div>

          <div class="mw-field-group">
            <div class="mw-basic-label">Item Spacing</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
              <div class="mw-axis-box">
                <span class="mw-axis-tag">X</span>
                <input type="number" min="0" max="120" step="1" id="mw-gs-space-x" value="${Math.round(m.spaceX)}" />
              </div>
              <div class="mw-axis-box">
                <span class="mw-axis-tag">Y</span>
                <input type="number" min="0" max="120" step="1" id="mw-gs-space-y" value="${Math.round(m.spaceY)}" />
              </div>
            </div>
          </div>

          <div class="mw-field-group">
            <div class="mw-basic-label">Content Padding</div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px;">
              <div class="mw-axis-box" title="Top Padding">
                <span class="mw-axis-tag" style="width:16px;">T</span>
                <input type="number" min="0" max="120" step="1" id="mw-gs-pad-t" value="${Math.round(m.padT)}" />
              </div>
              <div class="mw-axis-box" title="Bottom Padding">
                <span class="mw-axis-tag" style="width:16px;">B</span>
                <input type="number" min="0" max="120" step="1" id="mw-gs-pad-b" value="${Math.round(m.padB)}" />
              </div>
              <div class="mw-axis-box" title="Left Padding">
                <span class="mw-axis-tag" style="width:16px;">L</span>
                <input type="number" min="0" max="120" step="1" id="mw-gs-pad-l" value="${Math.round(m.padL)}" />
              </div>
              <div class="mw-axis-box" title="Right Padding">
                <span class="mw-axis-tag" style="width:16px;">R</span>
                <input type="number" min="0" max="120" step="1" id="mw-gs-pad-r" value="${Math.round(m.padR)}" />
              </div>
            </div>
          </div>          

          <!-- Layout Constraint: Auto Wrap vs Fixed -->
          <div class="mw-field-group">
            <div class="mw-basic-label" style="display: flex; justify-content: space-between; align-items: center;">
              <span>Layout Constraint</span>
            </div>
            <select class="mw-basic-select" id="mw-gs-layout-constraint">
              <option value="AutoWrap" ${!m.isFixed ? 'selected' : ''}>Auto Wrap (Based on Box Size)</option>
              <option value="Fixed" ${m.isFixed ? 'selected' : ''}>Fixed (${m.isVertical ? 'Fixed Columns' : 'Fixed Rows'})</option>
            </select>
          </div>

          <!-- Dynamic Row Count (Horizontal) / Column Count (Vertical) -->
          ${m.isFixed ? `
            <div class="mw-field-group">
              <div class="mw-basic-label" style="display: flex; justify-content: space-between; align-items: center;">
                <span>${m.isVertical ? 'Column Count' : 'Row Count'}</span>
              </div>
              <div class="mw-slider-row">
                <input type="range" min="1" max="12" step="1" class="mw-range-slider" id="mw-gs-fixed-count-range" value="${Math.min(12, m.crossCount)}" />
                <input type="number" min="1" max="24" step="1" class="mw-slider-num-box" id="mw-gs-fixed-count-num" value="${m.crossCount}" />
              </div>
            </div>
          ` : `
          `}

          <!-- CONTENT MENU: Template Inserted Into Grid -->
          <div class="mw-btn-sm-box" style="margin-top: 6px;">
            <div class="mw-btn-sm-header">
              <span class="mw-btn-sm-title">CONTENT</span>
            </div>

            <div class="mw-field-group" style="margin-top: 4px;">
              <div class="mw-basic-label" style="display: flex; justify-content: space-between;">
                <span>List Item Template</span>
              </div>

              <div class="mw-ref-template-box ${listOpen ? 'active' : ''}">
                <button type="button" class="mw-ref-template-main" id="mw-gs-open-tpl-btn" title="Click to open Client Control Template List next to Right Menu">
                  <span class="mw-ref-template-icon">${escapeHtml(currentTpl.icon)}</span>
                  <div class="mw-ref-template-meta">
                    <div class="mw-ref-template-name">${escapeHtml(currentTpl.name)}</div>
                    <div class="mw-ref-template-idx">${currentTpl.index ? `Index ${currentTpl.index} • ${m.itemCount} Copies` : '+ Click to Insert Template'}</div>
                  </div>
                </button>
                <div class="mw-ref-template-actions">
                  <button type="button" class="mw-mirror-btn" id="mw-gs-copy-tpl-btn" title="Copy itemPrefabIndex ${currentTpl.index}">📋</button>
                  <button type="button" class="mw-mirror-btn" id="mw-gs-clear-tpl-btn" title="Remove Content Template">🗑</button>
                </div>
              </div>
            </div>

            <div class="mw-field-group">
              <div class="mw-basic-label">Custom Template Index</div>
              <input type="number" id="mw-gs-tpl-index-inp" class="mw-fontsize-inp" value="${Number(node.itemPrefabIndex) || 0}" placeholder="e.g. 1073741954" style="width: 100%; height: 25px; background: #14110e; border: 1px solid #3d3328; border-radius: 3px; color: var(--text-bright); padding: 0 8px; font-family: var(--font-mono); font-size: 11px;" />
            </div>

            <!-- Stage Visual Mode: Repeating Template Copies  vs Inventory (RefreshItems) -->
            <div class="mw-field-group">
              <div class="mw-basic-label" style="font-size: 10px; color: var(--text-muted);">Stage Grid Preview Mode</div>
              <div class="mw-btn-state-pills" style="grid-template-columns: 1fr 1fr;">
                <button type="button" class="mw-btn-state-pill ${node.gridPreviewMode !== 'inventory' ? 'active' : ''}" data-gs-preview-mode="template" title="Show repeating copies of the inserted template as seen in the Editor">
                  📋 Template Copies
                </button>
                <button type="button" class="mw-btn-state-pill ${node.gridPreviewMode === 'inventory' ? 'active' : ''}" data-gs-preview-mode="inventory" title="Preview how 1 slot template becomes a Minecraft/Terraria Inventory via grid:RefreshItems(count, callback)">
                  🎒 Inventory Demo
                </button>
              </div>
            </div>
          </div>

          <!-- Scroll Progress (0.00 .. 1.00) -->
          <div class="mw-field-group">
            <div class="mw-basic-label" style="display: flex; justify-content: space-between;">
              <span>Scroll Progress (<code>ctrl.scrollProgress</code>)</span>
              <span style="font-size: 9px; color: var(--text-muted); font-family: var(--font-mono);">${Math.round(m.progress * 100)}%</span>
            </div>
            <div class="mw-slider-row">
              <input type="range" min="0" max="1" step="0.01" class="mw-range-slider" id="mw-gs-scroll-prog-range" value="${m.progress.toFixed(2)}" />
              <input type="number" min="0" max="1" step="0.05" class="mw-slider-num-box" id="mw-gs-scroll-prog-num" value="${m.progress.toFixed(2)}" />
            </div>
          </div>

          <!-- Explanation & Copyable Lua Inventory Pattern -->
          <div class="mw-btn-sm-desc" style="margin-top: 6px; padding: 7px 8px; background: rgba(18,15,12,0.78); border: 1px solid rgba(212,175,55,0.32); border-radius: 3px; line-height: 1.45;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <strong style="color: #f5b82e;">Inventory:</strong>
              <button type="button" class="brutal-btn brutal-btn-gold" id="mw-gs-copy-inv-lua-btn" data-snippet="${encodeURIComponent(inventoryLuaSnippet)}" style="padding: 1px 6px; font-size: 9.5px;">[ COPY LUA ]</button>
            </div>
            <div>
              • <strong>Why 1 Template?</strong> The template in <code>Content</code> (<code>itemPrefabIndex</code>) is your <em>Slot Blueprint</em> (e.g. a <code>PresetButton</code> or <code>ContainerControl</code> with child Icon + Stack TextBox).<br/>
              • <strong>Injecting Items per Slot:</strong> In Lua, <code>grid:RefreshItems(count, function(slotCtrl, index) ... end)</code> clones that template <code>count</code> times and passes each clone + its 0-indexed slot number (<code>0..count-1</code>) to your callback so you can set unique icons, stack counts, or child controls per slot!<br/>
              • <strong>Reading Clicked Slot:</strong> Bind <code>slotCtrl:AddCursorEventListener(CursorClick, fn)</code> inside <code>RefreshItems</code> or call <code>grid:GetItemIndex(slotCtrl)</code> to get the pressed slot index.
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// Render Bottom 1/3 Screen Image Resource Selector Library Drawer 
// Concentrates on the 6 official Basic Shapes:
// 100001 Square, 100002 Circle, 100003 Triangle, 100004 4-Point Star, 100005 5-Point Star, 100006 Hollowed Circle
export function renderBottomAssetLibraryDrawerHTML(selectedNode, state) {
  if (!state || !state.assetLibraryOpen || !selectedNode || selectedNode.className !== 'ClientUIImageControl') {
    return '';
  }
  ensureControlSpecificDefaults(selectedNode);

  const query = String(state.assetLibrarySearch || '').trim().toLowerCase();
  const filteredShapes = STATIC_SHAPE_ASSETS.filter(a => {
    if (!query) return true;
    return (
      a.name.toLowerCase().includes(query) ||
      a.shapeLabel.toLowerCase().includes(query) ||
      String(a.id).includes(query)
    );
  });

  const activeId = Number(selectedNode.resourceId) || 100001;

  return `
    <div class="mw-asset-lib-drawer" id="mw-asset-lib-drawer">
      <!-- Top Search & Collapse Bar  -->
      <div class="mw-asset-lib-topbar">
        <div class="mw-asset-lib-search-group">
          <div class="mw-asset-lib-search-box">
            <span class="mw-asset-lib-search-icon">🔍</span>
            <input type="text" id="mw-asset-lib-search-inp" placeholder="Search" value="${escapeHtml(state.assetLibrarySearch || '')}" autocomplete="off" spellcheck="false" />
          </div>
          <span class="mw-asset-lib-filter-btn" title="Filter Basic Shapes (100001–100006)">⧩</span>
        </div>
        <button type="button" class="mw-asset-lib-close-btn" id="mw-asset-lib-close-btn" title="Collapse Image Resource Library">⌄</button>
      </div>

      <!-- 2-Column Body: Left Category List ('Basic Shapes') + Right 6-Shape Grid  -->
      <div class="mw-asset-lib-body">
        <div class="mw-asset-lib-sidebar">
          <button type="button" class="mw-asset-lib-cat active">Basic Shapes</button>
        </div>

        <div class="mw-asset-lib-grid">
          ${filteredShapes.map(asset => {
            const isSel = asset.id === activeId;
            return `
              <div class="mw-asset-lib-item ${isSel ? 'selected' : ''}" data-pick-asset-id="${asset.id}">
                <div class="mw-asset-lib-card">
                  <div class="mw-asset-lib-graphic">
                    ${renderStaticShapeSVG(asset.id, '#FFFFFF', '54px')}
                  </div>
                </div>
                <div class="mw-asset-lib-caption">${escapeHtml(asset.name)}</div>
                <div class="mw-asset-lib-tooltip">
                  <div>Name: <strong>${escapeHtml(asset.name)}</strong> (${escapeHtml(asset.shapeLabel)})</div>
                  <div>Index: <strong>${asset.id}</strong></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// DETACHED SIDE SELECTOR PANEL NEXT TO RIGHT INSPECTOR MENU
// Spawns as a compact floating block immediately to the left of the Right Menu
// (instead of expanding the Right Menu inline) for:
//   • 'vfx'           -> Select VFX (UIAnimationControl 10001001..10001160 or Fullscreen 10002001..10002037)
//   • 'button_state'  -> Select 1-Tier Direct Child Control for Button State (Normal / Hover / Pressed / Disabled)
//   • 'grid_template' -> Client Control Template List for GridScroller Content (itemPrefabIndex)
//   • 'ref_template'  -> Client Control Template List for ReferenceControl (referencedPrefabIndex)
// ============================================================================
export function renderSideSelectorPanelHTML(project, selectedNode, state) {
  if (!state || !state.sideSelectorMode || !selectedNode) return '';
  ensureControlSpecificDefaults(selectedNode);

  const mode = state.sideSelectorMode;

  // Validate that the open side selector mode still matches the currently selected control class
  if (
    mode === 'vfx' &&
    selectedNode.className !== 'ClientUIAnimationControl' &&
    selectedNode.className !== 'ClientUIFullscreenAnimationControl'
  ) {
    return '';
  }
  if (mode === 'button_state' && selectedNode.className !== 'ClientUIPresetButtonControl') {
    return '';
  }
  if (mode === 'grid_template' && selectedNode.className !== 'ClientUIGridScrollerControl') {
    return '';
  }
  if (mode === 'ref_template' && selectedNode.className !== 'ClientUIReferenceControl') {
    return '';
  }

  const query = String(state.sideSelectorSearch || '').trim().toLowerCase();

  // --------------------------------------------------------------------------
  // MODE 1: SELECT VFX (UIAnimationControl 10001xxx & Fullscreen 10002xxx)
  // --------------------------------------------------------------------------
  if (mode === 'vfx') {
    const isFull = selectedNode.className === 'ClientUIFullscreenAnimationControl';
    const allPresets = isFull ? FULLSCREEN_VFX_PRESETS : UI_ANIM_VFX_PRESETS;
    const catFilter = state.vfxCategoryFilter || 'all'; // 'all' | 'looping' | 'nonlooping'

    const filtered = allPresets.filter(item => {
      if (catFilter === 'looping' && !item.looping) return false;
      if (catFilter === 'nonlooping' && item.looping) return false;
      if (!query) return true;
      return (
        item.name.toLowerCase().includes(query) ||
        String(item.id).includes(query) ||
        item.desc.toLowerCase().includes(query)
      );
    });

    const loopItems = filtered.filter(i => i.looping);
    const nonLoopItems = filtered.filter(i => !i.looping);
    const totalLoopCount = isFull ? FULLSCREEN_VFX_LOOPING_IDS.length : UI_ANIM_VFX_LOOPING_IDS.length;
    const totalNonLoopCount = isFull ? FULLSCREEN_VFX_NON_LOOPING_IDS.length : UI_ANIM_VFX_NON_LOOPING_IDS.length;

    const renderVfxRow = (item) => {
      const isSel = Number(selectedNode.animationId) === item.id;
      return `
        <div class="mw-side-selector-row ${isSel ? 'selected' : ''}" data-side-pick-vfx="${item.id}" title="${escapeHtml(item.desc)} (Index ${item.id})">
          <span class="mw-vfx-thumb" style="width:24px;height:24px;font-size:11px;border-color:${item.color};background:${item.looping ? `radial-gradient(circle, rgba(16,13,10,0.2) 30%, ${item.color}88 100%)` : `repeating-linear-gradient(45deg, ${item.color}55 0 3px, #14110e 3px 6px)`};">
            ${isFull ? (item.looping ? '⛶' : '⚡') : (item.looping ? '✦' : '💥')}
          </span>
          <div class="mw-side-selector-row-meta">
            <div class="mw-side-selector-row-name">${escapeHtml(item.name)}</div>
            <div class="mw-side-selector-row-sub">Index ${item.id}</div>
          </div>
          <span class="mw-vfx-badge ${item.looping ? 'is-loop' : 'is-once'}">${item.looping ? 'LOOP' : '1-SHOT'}</span>
        </div>
      `;
    };

    return `
      <aside class="mw-side-selector-panel" id="mw-side-selector-panel">
        <div class="mw-side-selector-header">
          <span class="mw-side-selector-title">Select VFX</span>
          <button type="button" class="mw-side-selector-close" id="mw-side-selector-close-btn" title="Close Select VFX">✕</button>
        </div>

        <div class="mw-side-selector-search-wrap">
          <span class="mw-side-selector-search-icon">🔍</span>
          <input type="text" id="mw-side-selector-search-inp" placeholder="Search" value="${escapeHtml(state.sideSelectorSearch || '')}" autocomplete="off" spellcheck="false" />
        </div>

        <div class="mw-side-selector-tabs">
          <button type="button" class="mw-vfx-filter-tab ${catFilter === 'all' ? 'active' : ''}" data-side-vfx-filter="all">All (${allPresets.length})</button>
          <button type="button" class="mw-vfx-filter-tab ${catFilter === 'looping' ? 'active' : ''}" data-side-vfx-filter="looping">Loop (${totalLoopCount})</button>
          <button type="button" class="mw-vfx-filter-tab ${catFilter === 'nonlooping' ? 'active' : ''}" data-side-vfx-filter="nonlooping">1-Shot (${totalNonLoopCount})</button>
        </div>

        <div class="mw-side-selector-list" id="mw-side-selector-list">
          ${loopItems.length > 0 ? `
            <div class="mw-side-selector-group-hdr">▾ Looping Effects (${loopItems.length})</div>
            ${loopItems.map(renderVfxRow).join('')}
          ` : ''}
          ${nonLoopItems.length > 0 ? `
            <div class="mw-side-selector-group-hdr">▾ Non-Looping Effects (${nonLoopItems.length})</div>
            ${nonLoopItems.map(renderVfxRow).join('')}
          ` : ''}
          ${filtered.length === 0 ? `
            <div class="mw-side-selector-empty">No matching VFX IDs found.</div>
          ` : ''}
        </div>
      </aside>
    `;
  }

  // --------------------------------------------------------------------------
  // MODE 2: BUTTON STATE MACHINE 1-TIER CHILD SELECTOR
  // --------------------------------------------------------------------------
  if (mode === 'button_state') {
    const slotKey = state.sideSelectorBtnSlot || 'normal';
    const slotMap = {
      normal: { prop: 'normalStatusNodeKey', title: 'Select Normal Status Node' },
      hover: { prop: 'hoverStatusNodeKey', title: 'Select Hover Status Node' },
      pressed: { prop: 'pressedStatusNodeKey', title: 'Select Pressed Status Node' },
      disabled: { prop: 'disabledStatusNodeKey', title: 'Select Disabled Status Node' }
    };
    const slotMeta = slotMap[slotKey] || slotMap.normal;
    const currentKey = selectedNode[slotMeta.prop] || '';
    const directChildren = project ? project.nodes.filter(n => n.parentKey === selectedNode.key) : [];
    const filteredChildren = directChildren.filter(c => {
      if (!query) return true;
      return (
        c.name.toLowerCase().includes(query) ||
        c.className.toLowerCase().includes(query) ||
        String(c.id).includes(query)
      );
    });

    return `
      <aside class="mw-side-selector-panel" id="mw-side-selector-panel">
        <div class="mw-side-selector-header">
          <span class="mw-side-selector-title">${escapeHtml(slotMeta.title)}</span>
          <button type="button" class="mw-side-selector-close" id="mw-side-selector-close-btn" title="Close Selector">✕</button>
        </div>

        <div class="mw-side-selector-search-wrap">
          <span class="mw-side-selector-search-icon">🔍</span>
          <input type="text" id="mw-side-selector-search-inp" placeholder="Search 1-Tier Child Controls" value="${escapeHtml(state.sideSelectorSearch || '')}" autocomplete="off" spellcheck="false" />
        </div>

        <div class="mw-side-selector-list" id="mw-side-selector-list">
          <div class="mw-side-selector-group-hdr">▾ 1-Tier Direct Children (${filteredChildren.length})</div>
          <div class="mw-side-selector-row ${!currentKey ? 'selected' : ''}" data-side-pick-btn-child="" data-side-btn-prop="${slotMeta.prop}" data-side-btn-state="${slotKey}">
            <span class="mw-ref-template-icon" style="width:22px;height:22px;font-size:10px;">—</span>
            <div class="mw-side-selector-row-meta">
              <div class="mw-side-selector-row-name">None (Unassigned)</div>
              <div class="mw-side-selector-row-sub">Leave ${escapeHtml(slotKey)} slot empty</div>
            </div>
          </div>
          ${filteredChildren.map(child => {
            const isSel = child.key === currentKey;
            const subCount = project.nodes.filter(n => n.parentKey === child.key).length;
            return `
              <div class="mw-side-selector-row ${isSel ? 'selected' : ''}" data-side-pick-btn-child="${escapeHtml(child.key)}" data-side-btn-prop="${slotMeta.prop}" data-side-btn-state="${slotKey}">
                <span class="mw-ref-template-icon" style="width:22px;height:22px;font-size:10px;">${escapeHtml(child.icon)}</span>
                <div class="mw-side-selector-row-meta">
                  <div class="mw-side-selector-row-name">${escapeHtml(child.name)}</div>
                  <div class="mw-side-selector-row-sub">id:${child.id} • ${subCount} child${subCount === 1 ? '' : 'ren'}</div>
                </div>
              </div>
            `;
          }).join('')}
          ${directChildren.length === 0 ? `
            <div class="mw-side-selector-empty">
              No direct child controls under <strong>${escapeHtml(selectedNode.name)}</strong> yet.<br/>
              Click <strong>[ + ADD 1-TIER CHILD STATUS CONTAINER ]</strong> in the Button card to create one!
            </div>
          ` : ''}
        </div>
      </aside>
    `;
  }

  // --------------------------------------------------------------------------
  // MODE 3 & 4: CLIENT CONTROL TEMPLATE LIST (GridScroller & ReferenceControl)
  // --------------------------------------------------------------------------
  const isGrid = mode === 'grid_template';
  const activeIdx = isGrid
    ? Number(selectedNode.itemPrefabIndex) || 0
    : Number(selectedNode.referencedPrefabIndex) || 0;

  const filteredTemplates = REFERENCE_TEMPLATE_PRESETS.filter(t => {
    if (!query) return true;
    return (
      t.name.toLowerCase().includes(query) ||
      String(t.index).includes(query) ||
      t.className.toLowerCase().includes(query)
    );
  });

  return `
    <aside class="mw-side-selector-panel" id="mw-side-selector-panel">
      <div class="mw-side-selector-header">
        <span class="mw-side-selector-title">Client Control Template List</span>
        <button type="button" class="mw-side-selector-close" id="mw-side-selector-close-btn" title="Close Template List">✕</button>
      </div>

      <div class="mw-side-selector-search-wrap">
        <span class="mw-side-selector-search-icon">🔍</span>
        <input type="text" id="mw-side-selector-search-inp" placeholder="Search" value="${escapeHtml(state.sideSelectorSearch || '')}" autocomplete="off" spellcheck="false" />
      </div>

      <div class="mw-side-selector-list" id="mw-side-selector-list">
        <div class="mw-side-selector-group-hdr">▾ Custom Templates (${filteredTemplates.length})</div>
        ${filteredTemplates.map(tpl => {
          const isSel = tpl.index === activeIdx;
          return `
            <div class="mw-side-selector-row ${isSel ? 'selected' : ''}" data-side-pick-tpl="${tpl.index}" data-side-tpl-target="${isGrid ? 'grid' : 'ref'}" title="${escapeHtml(tpl.desc)} (Index ${tpl.index})">
              <span class="mw-ref-template-icon" style="width:22px;height:22px;font-size:10px;">${escapeHtml(tpl.icon)}</span>
              <div class="mw-side-selector-row-meta">
                <div class="mw-side-selector-row-name">${escapeHtml(tpl.name)}</div>
                <div class="mw-side-selector-row-sub">Index ${tpl.index}</div>
              </div>
            </div>
          `;
        }).join('')}
        ${filteredTemplates.length === 0 ? `
          <div class="mw-side-selector-empty">No matching templates found.</div>
        ` : ''}
      </div>
    </aside>
  `;
}

// Entry point for rendering control-specific cards below Create Settings in the Basic tab
export function renderControlSpecificInspectorHTML(project, selectedNode, state) {
  if (!selectedNode) return '';
  ensureControlSpecificDefaults(selectedNode);

  const isTextCtrl =
    selectedNode.className === 'ClientUITextBoxControl' ||
    selectedNode.className === 'ClientUITextWindowControl';

  const isKeyHintCtrl =
    selectedNode.className === 'ClientUIKeyHintControl';

  const isButtonCtrl =
    selectedNode.className === 'ClientUIPresetButtonControl';

  const isImageCtrl =
    selectedNode.className === 'ClientUIImageControl';

  const isAnimCtrl =
    selectedNode.className === 'ClientUIFullscreenAnimationControl' ||
    selectedNode.className === 'ClientUIAnimationControl';

  const isRefCtrl =
    selectedNode.className === 'ClientUIReferenceControl';

  const isContainerCtrl =
    selectedNode.className === 'ClientUIContainerControl';

  const isCursorAreaCtrl =
    selectedNode.className === 'ClientUICursorEventAreaControl';

  const isGridScrollerCtrl =
    selectedNode.className === 'ClientUIGridScrollerControl';

  // KeyHintControl only shows Keybind Settings (Keyboard & Gamepad)
  if (isKeyHintCtrl) {
    return renderKeyHintInspectorCardHTML(selectedNode, state);
  }

  return `
    ${isButtonCtrl ? renderButtonInspectorCardHTML(project, selectedNode, state) : ''}
    ${isTextCtrl ? renderTextBoxInspectorCardHTML(selectedNode, state) : ''}
    ${isImageCtrl ? renderImageAndMaskInspectorCardsHTML(selectedNode, state) : ''}
    ${isAnimCtrl ? renderAnimationInspectorCardHTML(selectedNode, state) : ''}
    ${isRefCtrl ? renderReferenceControlInspectorCardHTML(selectedNode, state) : ''}
    ${isContainerCtrl ? renderContainerFunctionInspectorCardHTML(selectedNode, state) : ''}
    ${isCursorAreaCtrl ? renderCursorEventAreaInspectorCardHTML(selectedNode, state) : ''}
    ${isGridScrollerCtrl ? renderGridScrollerInspectorCardHTML(selectedNode, state) : ''}
    ${renderControllerNavigationCardHTML(selectedNode, state)}
  `;
}

// Build Lua lines reflecting Button / KeyHint / TextBox / Image / Mask properties for the Live Lua snippet
export function buildControlSpecificLuaLines(node, project = null) {
  ensureControlSpecificDefaults(node);
  const lines = [];

  if (node.className === 'ClientUIGridScrollerControl') {
    const m = computeGridScrollerLayoutMetrics(node);
    const tpl = getReferenceTemplateMeta(node.itemPrefabIndex);
    lines.push(`ctrl.itemPrefabIndex = ${tpl.index || 1073741954} -- Content Template: ${tpl.name}`);
    lines.push(`ctrl.interactable = ${node.interactable !== false} -- Can Scroll`);
    lines.push(`ctrl.showScrollBar = ${node.showScrollBar !== false}`);
    lines.push(`ctrl.raycastTarget = ${node.raycastTarget !== false}`);
    lines.push(`ctrl.scrollProgress = ${(Number(node.scrollProgress) || 0).toFixed(2)}`);
    lines.push(`-- Read-Only Editor Layout: scrollDirection = Enum.ScrollDirection.${m.isVertical ? 'Vertical' : 'Horizontal'}, layoutConstraint = Enum.ScrollLayoutConstraint.${m.isFixed ? 'Fixed' : 'AutoWrap'}, layoutConstraintFixedCount = ${m.isFixed ? m.crossCount : 0} (${m.crossCount} ${m.crossAxisLabel})`);
    lines.push(`-- Read-Only Metrics: GetItemSize() -> (${m.itemW}, ${m.itemH}) | GetItemSpacing() -> (${m.spaceX}, ${m.spaceY}) | GetPadding() -> (${m.padT}, ${m.padB}, ${m.padL}, ${m.padR}) | GetContentLength() -> ${Math.round(m.contentLength)}`);
    lines.push(`ctrl:RefreshItems(${m.itemCount}, function(slotCtrl, index)`);
    lines.push(`    slotCtrl.name = "Slot_" .. tostring(index) -- 0-indexed (0..${Math.max(0, m.itemCount - 1)})`);
    lines.push(`    -- local idx = ctrl:GetItemIndex(slotCtrl)`);
    lines.push(`end)`);
  }

  if (node.className === 'ClientUIKeyHintControl') {
    const kbMeta = getKeyboardKeyHintMeta(node.keyboardKeyCode);
    const ctrlMeta = getControllerKeyHintMeta(node.controllerKeyCode);
    lines.push(`ctrl.keyboardKeyCode = Enum.KeyboardKeyCode.${kbMeta.enumName} -- Default '${kbMeta.uiLabel}' (${kbMeta.actionName})`);
    lines.push(`ctrl.controllerKeyCode = Enum.ControllerKeyCode.${ctrlMeta.enumName} -- '${ctrlMeta.uiLabel}' (${ctrlMeta.badgeText})`);
    if (kbMeta.keyDownEnum) {
      lines.push(`-- Paired PC Listener: game.AddKeyEventListener(Enum.KeyEventType.${kbMeta.keyDownEnum}, function() ... end)`);
    }
    if (ctrlMeta.keyDownEnum) {
      lines.push(`-- Paired Pad Listener: game.AddKeyEventListener(Enum.KeyEventType.${ctrlMeta.keyDownEnum}, function() ... end)`);
    }
  }

  if (node.className === 'ClientUIPresetButtonControl') {
    lines.push(`ctrl.interactable = ${node.interactable !== false}`);
    lines.push(`ctrl.raycastTarget = ${node.raycastTarget !== false}`);
    if (node.clickAudioId) {
      lines.push(`ctrl.clickAudioId = ${Math.round(Number(node.clickAudioId) || 1001)}`);
    }
    if (project) {
      const findName = (k) => project.nodes.find(n => n.key === k)?.name || 'nil';
      if (node.normalStatusNodeKey) {
        lines.push(`-- State Machine [Normal]   -> ctrl:GetChild("${findName(node.normalStatusNodeKey)}")`);
      }
      if (node.hoverStatusNodeKey) {
        lines.push(`-- State Machine [Hover]    -> ctrl:GetChild("${findName(node.hoverStatusNodeKey)}")`);
      }
      if (node.pressedStatusNodeKey) {
        lines.push(`-- State Machine [Pressed]  -> ctrl:GetChild("${findName(node.pressedStatusNodeKey)}")`);
      }
      if (node.disabledStatusNodeKey) {
        lines.push(`-- State Machine [Disabled] -> ctrl:GetChild("${findName(node.disabledStatusNodeKey)}")`);
      }
    }
  }

  if (
    node.className === 'ClientUITextBoxControl' ||
    node.className === 'ClientUITextWindowControl'
  ) {
    if (node.className === 'ClientUITextWindowControl') {
      lines.push(`ctrl.interactable = ${node.interactable !== false} -- Can Scroll`);
      lines.push(`ctrl.showScrollBar = ${node.showScrollBar !== false} -- Show Scrollbar`);
    }
    lines.push(`ctrl.fontSize = ${Math.round(node.fontSize || 20)}`);
    if (node.adaptiveFontSize) {
      lines.push(`ctrl.adaptiveFontSize = true`);
      lines.push(`ctrl.minimumFontSize = ${Math.round(node.minFontSize || 14)}`);
    }
    if (node.fontColor) {
      lines.push(`ctrl.fontColor = Color.FromRGBA(${node.fontColor.r}, ${node.fontColor.g}, ${node.fontColor.b}, ${node.fontColor.a ?? 255})`);
    }
    if (node.bgColor && node.bgColor.a > 0) {
      lines.push(`ctrl.bgColor = Color.FromRGBA(${node.bgColor.r}, ${node.bgColor.g}, ${node.bgColor.b}, ${node.bgColor.a})`);
    }
    if (node.text !== undefined) {
      lines.push(`ctrl.text = ${JSON.stringify(node.text)}`);
    }
  }

  if (
    node.className === 'ClientUIFullscreenAnimationControl' ||
    node.className === 'ClientUIAnimationControl'
  ) {
    const vfx = getVfxPresetMeta(node.animationId, node.className);
    lines.push(`ctrl.animationId = ${Number(node.animationId) || 0} -- ${vfx.name} (${vfx.looping ? 'Looping' : 'Non-Looping 1-Shot'})`);
    lines.push(`ctrl.playSoundEffect = ${Boolean(node.playSoundEffect)}`);
    if (node.className === 'ClientUIAnimationControl') {
      lines.push(`ctrl.layer = Enum.UIAnimationLayer.${Number(node.layer) === 1 ? 'AboveAllControls' : 'BelowAllControls'}`);
      lines.push(`ctrl:PlayAnimation() -- ${vfx.looping ? 'Looping particle aura (use :StopAnimation() to stop)' : 'Non-looping burst (auto-stops when finished)'}`);
    }
  }

  if (node.className === 'ClientUIReferenceControl') {
    const tpl = getReferenceTemplateMeta(node.referencedPrefabIndex);
    lines.push(`-- Read-Only Template Reference: ctrl.referencedPrefabIndex == ${tpl.index} (${tpl.name})`);
  }

  if (node.className === 'ClientUIContainerControl') {
    lines.push(`ctrl.isolateNavigation = ${Boolean(node.isolateNavigation)}`);
    lines.push(`ctrl.disableKeyEventPassthrough = ${Boolean(node.disableKeyEventPassthrough)}`);
    lines.push(`ctrl.disableCursorEventPassthrough = ${Boolean(node.disableCursorEventPassthrough)}`);
    lines.push(`ctrl.showCursor = ${Boolean(node.showCursor)}`);
  }

  if (node.className === 'ClientUICursorEventAreaControl') {
    lines.push(`ctrl.raycastTarget = ${Boolean(node.raycastTarget)}`);
  }

  if (node.className === 'ClientUIImageControl') {
    lines.push(`ctrl:SetImage(Enum.ImageSource.StaticReference, ${node.resourceId || 100001})`);
    if (node.imageColor) {
      lines.push(`ctrl.imageColor = Color.FromRGBA(${node.imageColor.r}, ${node.imageColor.g}, ${node.imageColor.b}, ${node.imageColor.a ?? 255})`);
    }
    if (node.enableMask) {
      if (node.enableSoftEdge) {
        lines.push(`ctrl.enableSoftEdge = true`);
        lines.push(`ctrl:SetSoftEdgeWidth(${Number(node.softEdgeWidthX || 12).toFixed(1)}, ${Number(node.softEdgeWidthY || 12).toFixed(1)})`);
      }
      if (node.enableFillByProgress) {
        lines.push(`-- Mask FillByProgress: shape=${node.fillShape}, dir="${node.fillDirection}", fillAmount=${Math.round(node.fillAmount ?? 100)}%${node.invertMask ? ' (Inverted)' : ''}`);
      }
    }
  }

  return lines;
}

// Helper to re-render only the active control's inner visual on stage during live slider/text/color input
function syncStageControlInnerVisual(container, selectedNode) {
  const presetEl = container.querySelector(`[data-stage-drag-key="${selectedNode.key}"]`);
  if (!presetEl) return;

  const flipScaleX = selectedNode.mirrorX ? -1 : 1;
  const flipScaleY = selectedNode.mirrorY ? -1 : 1;
  const innerTransform = (flipScaleX !== 1 || flipScaleY !== 1)
    ? `transform: scale(${flipScaleX}, ${flipScaleY});`
    : '';

  const surfaceHost = presetEl.querySelector('.mw-stage-visual-host');
  if (!surfaceHost) return;

  if (selectedNode.className === 'ClientUIImageControl') {
    surfaceHost.innerHTML = renderStageImageVisualHTML(selectedNode, innerTransform);
  } else if (selectedNode.className === 'ClientUIPresetButtonControl') {
    surfaceHost.innerHTML = renderStageButtonVisualHTML(null, selectedNode, innerTransform);
  } else if (selectedNode.className === 'ClientUIKeyHintControl') {
    surfaceHost.innerHTML = renderStageKeyHintVisualHTML(selectedNode, innerTransform);
  } else if (
    selectedNode.className === 'ClientUIFullscreenAnimationControl' ||
    selectedNode.className === 'ClientUIAnimationControl'
  ) {
    surfaceHost.innerHTML = renderStageAnimationVisualHTML(selectedNode, innerTransform);
  } else if (selectedNode.className === 'ClientUIReferenceControl') {
    surfaceHost.innerHTML = renderStageReferenceVisualHTML(selectedNode, innerTransform);
  } else if (selectedNode.className === 'ClientUICursorEventAreaControl') {
    surfaceHost.innerHTML = renderStageCursorAreaVisualHTML(selectedNode, true, innerTransform);
  } else if (selectedNode.className === 'ClientUIGridScrollerControl') {
    surfaceHost.innerHTML = renderStageGridScrollerVisualHTML(selectedNode, innerTransform);
  } else if (
    selectedNode.className === 'ClientUITextBoxControl' ||
    selectedNode.className === 'ClientUITextWindowControl'
  ) {
    surfaceHost.innerHTML = renderStageTextBoxVisualHTML(selectedNode, innerTransform);
  }
}

// Bind all interactive events for Button State Machine, KeyHintControl, TextBoxControl, Image Settings, Mask Settings, and Controller Navigation
export function bindControlSpecificInspectorEvents({
  container,
  project,
  selectedNode,
  setSelectedNodeKey,
  normalizeProjectHierarchy,
  state,
  render,
  showToast
}) {
  if (!selectedNode) return;
  ensureControlSpecificDefaults(selectedNode);

  // ==========================================================================
  // DETACHED SIDE SELECTOR PANEL EVENTS 
  // ==========================================================================
  const closeSideBtn = container.querySelector('#mw-side-selector-close-btn');
  if (closeSideBtn) {
    closeSideBtn.addEventListener('click', () => {
      state.sideSelectorMode = null;
      render();
    });
  }

  const sideSearchInp = container.querySelector('#mw-side-selector-search-inp');
  if (sideSearchInp) {
    sideSearchInp.addEventListener('input', () => {
      state.sideSelectorSearch = sideSearchInp.value;
      const pos = sideSearchInp.selectionStart;
      render();
      const next = container.querySelector('#mw-side-selector-search-inp');
      if (next) {
        next.focus();
        next.setSelectionRange(pos, pos);
      }
    });
  }

  container.querySelectorAll('[data-side-vfx-filter]').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      state.vfxCategoryFilter = tabBtn.dataset.sideVfxFilter || 'all';
      render();
    });
  });

  container.querySelectorAll('[data-side-pick-vfx]').forEach(rowEl => {
    rowEl.addEventListener('click', () => {
      const listEl = container.querySelector('#mw-side-selector-list');
      const savedScroll = listEl ? listEl.scrollTop : 0;
      const pickedId = parseInt(rowEl.dataset.sidePickVfx, 10) || 0;
      selectedNode.animationId = pickedId;
      const meta = getVfxPresetMeta(pickedId, selectedNode.className);
      render();
      const nextList = container.querySelector('#mw-side-selector-list');
      if (nextList) nextList.scrollTop = savedScroll;
      showToast(`Selected ${meta.name} (Index ${pickedId} • ${meta.looping ? 'Looping' : 'Non-Looping 1-Shot'})`);
    });
  });

  container.querySelectorAll('[data-side-pick-tpl]').forEach(rowEl => {
    rowEl.addEventListener('click', () => {
      const listEl = container.querySelector('#mw-side-selector-list');
      const savedScroll = listEl ? listEl.scrollTop : 0;
      const pickedIdx = parseInt(rowEl.dataset.sidePickTpl, 10) || 1073741954;
      const targetKind = rowEl.dataset.sideTplTarget;
      const meta = getReferenceTemplateMeta(pickedIdx);
      if (targetKind === 'grid') {
        selectedNode.itemPrefabIndex = pickedIdx;
        render();
        showToast(`Inserted Content Template ${meta.name} (Index ${pickedIdx}) into ${selectedNode.name}`);
      } else {
        selectedNode.referencedPrefabIndex = pickedIdx;
        render();
        showToast(`Referenced ${meta.name} (Index ${pickedIdx}) on ${selectedNode.name}`);
      }
      const nextList = container.querySelector('#mw-side-selector-list');
      if (nextList) nextList.scrollTop = savedScroll;
    });
  });

  container.querySelectorAll('[data-side-pick-btn-child]').forEach(rowEl => {
    rowEl.addEventListener('click', () => {
      const childKey = rowEl.dataset.sidePickBtnChild || '';
      const prop = rowEl.dataset.sideBtnProp || 'normalStatusNodeKey';
      const stateKey = rowEl.dataset.sideBtnState || 'normal';
      selectedNode[prop] = childKey;
      if (childKey && stateKey) {
        selectedNode.previewButtonState = stateKey;
      }
      syncButtonStateMachineChildren(project, selectedNode, selectedNode.previewButtonState);
      render();
      const childObj = project ? project.nodes.find(n => n.key === childKey) : null;
      showToast(
        childObj
          ? `Assigned ${childObj.name} to ${stateKey.toUpperCase()} status on ${selectedNode.name}`
          : `Unassigned ${stateKey.toUpperCase()} status node on ${selectedNode.name}`
      );
    });
  });

  // Accordion section collapse toggles
  const bindAccordion = (id, stateKey) => {
    const hdr = container.querySelector(id);
    if (hdr) {
      hdr.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        state[stateKey] = !state[stateKey];
        render();
      });
    }
  };
  bindAccordion('#mw-toggle-button-sec', 'buttonSettingsCollapsed');
  bindAccordion('#mw-toggle-keybind-sec', 'keybindSettingsCollapsed');
  bindAccordion('#mw-toggle-textbox-sec', 'textBoxCollapsed');
  bindAccordion('#mw-toggle-image-sec', 'imageSettingsCollapsed');
  bindAccordion('#mw-toggle-mask-sec', 'maskSettingsCollapsed');
  bindAccordion('#mw-toggle-anim-sec', 'animSettingsCollapsed');
  bindAccordion('#mw-toggle-ref-sec', 'refSettingsCollapsed');
  bindAccordion('#mw-toggle-container-func-sec', 'containerFuncCollapsed');
  bindAccordion('#mw-toggle-cursorarea-sec', 'cursorAreaCollapsed');
  bindAccordion('#mw-toggle-gridscroller-sec', 'gridScrollerCollapsed');
  bindAccordion('#mw-toggle-ctrl-nav-sec', 'controllerNavCollapsed');

  // ==========================================================================
  // 000. GRIDSCROLLERCONTROL SETTINGS & CONTENT EVENTS
  // ==========================================================================
  const resetGsBtn = container.querySelector('#mw-reset-gridscroller-btn');
  if (resetGsBtn) {
    resetGsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedNode.interactable = true;
      selectedNode.showScrollBar = true;
      selectedNode.raycastTarget = true;
      selectedNode.scrollDirection = 'Vertical';
      selectedNode.layoutConstraint = 'AutoWrap';
      selectedNode.layoutConstraintFixedCount = 3;
      selectedNode.itemPrefabIndex = 1073741954;
      selectedNode.itemCount = 12;
      selectedNode.itemWidth = 56;
      selectedNode.itemHeight = 36;
      selectedNode.spacingX = 6;
      selectedNode.spacingY = 6;
      selectedNode.paddingTop = 6;
      selectedNode.paddingBottom = 6;
      selectedNode.paddingLeft = 6;
      selectedNode.paddingRight = 6;
      selectedNode.scrollProgress = 0;
      selectedNode.gridPreviewMode = 'template';
      render();
      showToast(`Reset Grid Scroller Settings on ${selectedNode.name}`);
    });
  }

  const gsCanScrollBtn = container.querySelector('#mw-gs-toggle-canscroll');
  if (gsCanScrollBtn) {
    gsCanScrollBtn.addEventListener('click', () => {
      selectedNode.interactable = selectedNode.interactable === false;
      render();
    });
  }

  const gsScrollbarBtn = container.querySelector('#mw-gs-toggle-scrollbar');
  if (gsScrollbarBtn) {
    gsScrollbarBtn.addEventListener('click', () => {
      selectedNode.showScrollBar = selectedNode.showScrollBar === false;
      render();
    });
  }

  const gsRaycastBtn = container.querySelector('#mw-gs-toggle-raycast');
  if (gsRaycastBtn) {
    gsRaycastBtn.addEventListener('click', () => {
      selectedNode.raycastTarget = selectedNode.raycastTarget === false;
      render();
    });
  }

  const gsScrollDirSelect = container.querySelector('#mw-gs-scroll-dir');
  if (gsScrollDirSelect) {
    gsScrollDirSelect.addEventListener('change', () => {
      selectedNode.scrollDirection = gsScrollDirSelect.value === 'Horizontal' ? 'Horizontal' : 'Vertical';
      render();
      showToast(
        selectedNode.scrollDirection === 'Vertical'
          ? `Scroll Direction: Vertical (Cross-axis counted by Columns)`
          : `Scroll Direction: Horizontal (Cross-axis counted by Rows)`
      );
    });
  }

  const gsConstraintSelect = container.querySelector('#mw-gs-layout-constraint');
  if (gsConstraintSelect) {
    gsConstraintSelect.addEventListener('change', () => {
      selectedNode.layoutConstraint = gsConstraintSelect.value === 'Fixed' ? 'Fixed' : 'AutoWrap';
      render();
    });
  }

  const gsFixedRange = container.querySelector('#mw-gs-fixed-count-range');
  const gsFixedNum = container.querySelector('#mw-gs-fixed-count-num');
  if (gsFixedRange) {
    gsFixedRange.addEventListener('input', () => {
      const v = Math.max(1, Math.min(24, parseInt(gsFixedRange.value, 10) || 3));
      selectedNode.layoutConstraintFixedCount = v;
      if (gsFixedNum) gsFixedNum.value = String(v);
      syncStageControlInnerVisual(container, selectedNode);
    });
    gsFixedRange.addEventListener('change', () => render());
  }
  if (gsFixedNum) {
    gsFixedNum.addEventListener('change', () => {
      const v = Math.max(1, Math.min(24, parseInt(gsFixedNum.value, 10) || 3));
      selectedNode.layoutConstraintFixedCount = v;
      render();
    });
  }

  // Content Template Picker -> Opens Side Selector next to Right Menu
  const toggleGridSideSelector = () => {
    state.sideSelectorMode = state.sideSelectorMode === 'grid_template' ? null : 'grid_template';
    state.sideSelectorSearch = '';
    render();
  };
  const gsOpenTplBtn = container.querySelector('#mw-gs-open-tpl-btn');
  const gsToggleTplLink = container.querySelector('#mw-gs-toggle-tpl-list');
  if (gsOpenTplBtn) gsOpenTplBtn.addEventListener('click', toggleGridSideSelector);
  if (gsToggleTplLink) gsToggleTplLink.addEventListener('click', toggleGridSideSelector);

  const gsCopyTplBtn = container.querySelector('#mw-gs-copy-tpl-btn');
  if (gsCopyTplBtn) {
    gsCopyTplBtn.addEventListener('click', () => {
      copyToClipboard(String(selectedNode.itemPrefabIndex || 0), 'Grid Content Template Index');
    });
  }

  const gsClearTplBtn = container.querySelector('#mw-gs-clear-tpl-btn');
  if (gsClearTplBtn) {
    gsClearTplBtn.addEventListener('click', () => {
      selectedNode.itemPrefabIndex = 0;
      state.sideSelectorMode = 'grid_template';
      state.sideSelectorSearch = '';
      render();
    });
  }

  const gsTplIdxInp = container.querySelector('#mw-gs-tpl-index-inp');
  if (gsTplIdxInp) {
    gsTplIdxInp.addEventListener('change', () => {
      selectedNode.itemPrefabIndex = Math.max(0, parseInt(gsTplIdxInp.value, 10) || 0);
      render();
    });
  }

  const gsCountRange = container.querySelector('#mw-gs-itemcount-range');
  const gsCountNum = container.querySelector('#mw-gs-itemcount-num');
  if (gsCountRange) {
    gsCountRange.addEventListener('input', () => {
      const v = Math.max(0, Math.min(96, parseInt(gsCountRange.value, 10) || 0));
      selectedNode.itemCount = v;
      if (gsCountNum) gsCountNum.value = String(v);
      syncStageControlInnerVisual(container, selectedNode);
    });
    gsCountRange.addEventListener('change', () => render());
  }
  if (gsCountNum) {
    gsCountNum.addEventListener('change', () => {
      selectedNode.itemCount = Math.max(0, Math.min(96, parseInt(gsCountNum.value, 10) || 0));
      render();
    });
  }

  container.querySelectorAll('[data-gs-preview-mode]').forEach(modeBtn => {
    modeBtn.addEventListener('click', () => {
      selectedNode.gridPreviewMode = modeBtn.dataset.gsPreviewMode || 'template';
      render();
    });
  });

  const bindGsNumInput = (sel, prop, minVal = 0, maxVal = 400) => {
    const inp = container.querySelector(sel);
    if (!inp) return;
    inp.addEventListener('input', () => {
      const v = Math.max(minVal, Math.min(maxVal, parseFloat(inp.value) || minVal));
      selectedNode[prop] = v;
      syncStageControlInnerVisual(container, selectedNode);
    });
    inp.addEventListener('change', () => render());
  };
  bindGsNumInput('#mw-gs-item-w', 'itemWidth', 12, 400);
  bindGsNumInput('#mw-gs-item-h', 'itemHeight', 12, 400);
  bindGsNumInput('#mw-gs-space-x', 'spacingX', 0, 120);
  bindGsNumInput('#mw-gs-space-y', 'spacingY', 0, 120);
  bindGsNumInput('#mw-gs-pad-t', 'paddingTop', 0, 120);
  bindGsNumInput('#mw-gs-pad-b', 'paddingBottom', 0, 120);
  bindGsNumInput('#mw-gs-pad-l', 'paddingLeft', 0, 120);
  bindGsNumInput('#mw-gs-pad-r', 'paddingRight', 0, 120);

  const gsProgRange = container.querySelector('#mw-gs-scroll-prog-range');
  const gsProgNum = container.querySelector('#mw-gs-scroll-prog-num');
  if (gsProgRange) {
    gsProgRange.addEventListener('input', () => {
      const v = Math.max(0, Math.min(1, parseFloat(gsProgRange.value) || 0));
      selectedNode.scrollProgress = v;
      if (gsProgNum) gsProgNum.value = v.toFixed(2);
      syncStageControlInnerVisual(container, selectedNode);
    });
    gsProgRange.addEventListener('change', () => render());
  }
  if (gsProgNum) {
    gsProgNum.addEventListener('change', () => {
      selectedNode.scrollProgress = Math.max(0, Math.min(1, parseFloat(gsProgNum.value) || 0));
      render();
    });
  }

  const gsCopyLuaBtn = container.querySelector('#mw-gs-copy-inv-lua-btn');
  if (gsCopyLuaBtn) {
    gsCopyLuaBtn.addEventListener('click', () => {
      const code = decodeURIComponent(gsCopyLuaBtn.dataset.snippet || '');
      copyToClipboard(code, 'GridScroller Inventory Lua');
    });
  }

  // ==========================================================================
  // 00. ANIMATION / REFERENCE / CONTAINER / CURSOR AREA / TEXTWINDOW EVENTS
  // ==========================================================================
  const twCanScrollBtn = container.querySelector('#mw-tw-toggle-canscroll');
  if (twCanScrollBtn) {
    twCanScrollBtn.addEventListener('click', () => {
      selectedNode.interactable = selectedNode.interactable === false;
      render();
    });
  }

  const twScrollbarBtn = container.querySelector('#mw-tw-toggle-scrollbar');
  if (twScrollbarBtn) {
    twScrollbarBtn.addEventListener('click', () => {
      selectedNode.showScrollBar = selectedNode.showScrollBar === false;
      render();
    });
  }

  // UI Animation Settings
  const resetAnimBtn = container.querySelector('#mw-reset-anim-btn');
  if (resetAnimBtn) {
    resetAnimBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isFull = selectedNode.className === 'ClientUIFullscreenAnimationControl';
      selectedNode.animationId = isFull ? 10002001 : 10001001;
      selectedNode.playSoundEffect = false;
      selectedNode.layer = 1;
      render();
      showToast(`Reset UI Animation Settings on ${selectedNode.name} (${selectedNode.animationId})`);
    });
  }

  const toggleVfxSideSelector = () => {
    state.sideSelectorMode = state.sideSelectorMode === 'vfx' ? null : 'vfx';
    state.sideSelectorSearch = '';
    render();
  };
  const openVfxBtn = container.querySelector('#mw-open-vfx-picker-btn');
  const toggleVfxLink = container.querySelector('#mw-toggle-vfx-list-link');
  if (openVfxBtn) openVfxBtn.addEventListener('click', toggleVfxSideSelector);
  if (toggleVfxLink) toggleVfxLink.addEventListener('click', toggleVfxSideSelector);

  const clearVfxBtn = container.querySelector('#mw-vfx-clear-btn');
  if (clearVfxBtn) {
    clearVfxBtn.addEventListener('click', () => {
      selectedNode.animationId = 0;
      state.sideSelectorMode = 'vfx';
      state.sideSelectorSearch = '';
      render();
    });
  }

  const copyVfxBtn = container.querySelector('#mw-vfx-copy-id-btn');
  if (copyVfxBtn) {
    copyVfxBtn.addEventListener('click', () => {
      copyToClipboard(String(selectedNode.animationId || 0), 'Animation Index');
    });
  }

  const vfxIdInp = container.querySelector('#mw-vfx-id-inp');
  if (vfxIdInp) {
    vfxIdInp.addEventListener('change', () => {
      selectedNode.animationId = Math.max(0, parseInt(vfxIdInp.value, 10) || 0);
      render();
    });
  }

  const animSoundToggle = container.querySelector('#mw-anim-toggle-sound');
  if (animSoundToggle) {
    animSoundToggle.addEventListener('click', () => {
      selectedNode.playSoundEffect = !selectedNode.playSoundEffect;
      render();
    });
  }

  const animLayerSelect = container.querySelector('#mw-anim-layer-select');
  if (animLayerSelect) {
    animLayerSelect.addEventListener('change', () => {
      selectedNode.layer = parseInt(animLayerSelect.value, 10) || 0;
      render();
    });
  }

  // Template Reference -> Opens Side Selector next to Right Menu
  const resetRefBtn = container.querySelector('#mw-reset-ref-btn');
  if (resetRefBtn) {
    resetRefBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedNode.referencedPrefabIndex = 1073741954;
      render();
      showToast(`Reset Template Reference on ${selectedNode.name} to 1073741954`);
    });
  }

  const toggleRefSideSelector = () => {
    state.sideSelectorMode = state.sideSelectorMode === 'ref_template' ? null : 'ref_template';
    state.sideSelectorSearch = '';
    render();
  };
  const openRefBtn = container.querySelector('#mw-open-ref-list-btn');
  const toggleRefLink = container.querySelector('#mw-toggle-ref-list-link');
  if (openRefBtn) openRefBtn.addEventListener('click', toggleRefSideSelector);
  if (toggleRefLink) toggleRefLink.addEventListener('click', toggleRefSideSelector);

  const copyRefBtn = container.querySelector('#mw-ref-copy-idx-btn');
  if (copyRefBtn) {
    copyRefBtn.addEventListener('click', () => {
      copyToClipboard(String(selectedNode.referencedPrefabIndex || 0), 'Template Prefab Index');
    });
  }

  const clearRefBtn = container.querySelector('#mw-ref-clear-btn');
  if (clearRefBtn) {
    clearRefBtn.addEventListener('click', () => {
      selectedNode.referencedPrefabIndex = 0;
      state.sideSelectorMode = 'ref_template';
      state.sideSelectorSearch = '';
      render();
    });
  }

  const refIdxInp = container.querySelector('#mw-ref-index-inp');
  if (refIdxInp) {
    refIdxInp.addEventListener('change', () => {
      selectedNode.referencedPrefabIndex = Math.max(0, parseInt(refIdxInp.value, 10) || 0);
      render();
    });
  }

  const gotoTplBtn = container.querySelector('#mw-ref-goto-editor-btn');
  if (gotoTplBtn) {
    gotoTplBtn.addEventListener('click', () => {
      const meta = getReferenceTemplateMeta(selectedNode.referencedPrefabIndex);
      showToast(`Template Editor: ${meta.name} (Index ${meta.index}). In Miliastra, templates are reusable UI prefabs.`);
    });
  }

  // ContainerControl Function Settings
  const resetContFuncBtn = container.querySelector('#mw-reset-container-func-btn');
  if (resetContFuncBtn) {
    resetContFuncBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedNode.isolateNavigation = false;
      selectedNode.disableKeyEventPassthrough = false;
      selectedNode.disableCursorEventPassthrough = false;
      selectedNode.showCursor = false;
      render();
      showToast(`Reset Container Function Settings on ${selectedNode.name}`);
    });
  }

  const bindBoolSwitch = (sel, prop) => {
    const el = container.querySelector(sel);
    if (el) {
      el.addEventListener('click', () => {
        selectedNode[prop] = !selectedNode[prop];
        render();
      });
    }
  };
  bindBoolSwitch('#mw-cont-toggle-isolate', 'isolateNavigation');
  bindBoolSwitch('#mw-cont-toggle-disablekey', 'disableKeyEventPassthrough');
  bindBoolSwitch('#mw-cont-toggle-disablecursor', 'disableCursorEventPassthrough');
  bindBoolSwitch('#mw-cont-toggle-showcursor', 'showCursor');

  // CursorEventArea Click Response Area 
  const resetCaBtn = container.querySelector('#mw-reset-cursorarea-btn');
  if (resetCaBtn) {
    resetCaBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedNode.persistentAreaPreview = false;
      selectedNode.raycastTarget = false;
      render();
      showToast(`Reset Click Response Area on ${selectedNode.name}`);
    });
  }
  bindBoolSwitch('#mw-ca-toggle-preview', 'persistentAreaPreview');
  bindBoolSwitch('#mw-ca-toggle-raycast', 'raycastTarget');

  // ==========================================================================
  // 0A. KEYHINTCONTROL KEYBIND SETTINGS EVENTS
  // ==========================================================================
  const resetKeybindBtn = container.querySelector('#mw-reset-keybind-btn');
  if (resetKeybindBtn) {
    resetKeybindBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedNode.keyboardKeyCode = 1; // '1' (KeyboardSkill1)
      selectedNode.controllerKeyCode = 1; // 'Action Bottom' (ControllerAction1)
      selectedNode.previewKeyHintDevice = 'keyboard';
      selectedNode.playerCustomKeyOverride = '';
      ensureControlSpecificDefaults(selectedNode);
      render();
      showToast(`Reset Keybind Settings on ${selectedNode.name} (Keyboard: 1, Gamepad: Action Bottom)`);
    });
  }

  const kbSelect = container.querySelector('#mw-keyhint-keyboard-select');
  if (kbSelect) {
    kbSelect.addEventListener('change', () => {
      selectedNode.keyboardKeyCode = parseInt(kbSelect.value, 10) || 0;
      selectedNode.previewKeyHintDevice = 'keyboard';
      ensureControlSpecificDefaults(selectedNode);
      const meta = getKeyboardKeyHintMeta(selectedNode.keyboardKeyCode);
      render();
      showToast(`Set ${selectedNode.name}.keyboardKeyCode = Enum.KeyboardKeyCode.${meta.enumName} (${meta.uiLabel})`);
    });
  }

  const padSelect = container.querySelector('#mw-keyhint-gamepad-select');
  if (padSelect) {
    padSelect.addEventListener('change', () => {
      selectedNode.controllerKeyCode = parseInt(padSelect.value, 10) || 0;
      selectedNode.previewKeyHintDevice = 'gamepad';
      ensureControlSpecificDefaults(selectedNode);
      const meta = getControllerKeyHintMeta(selectedNode.controllerKeyCode);
      render();
      showToast(`Set ${selectedNode.name}.controllerKeyCode = Enum.ControllerKeyCode.${meta.enumName} (${meta.uiLabel})`);
    });
  }

  container.querySelectorAll('[data-keyhint-device]').forEach(devBtn => {
    devBtn.addEventListener('click', () => {
      selectedNode.previewKeyHintDevice = devBtn.dataset.keyhintDevice || 'keyboard';
      ensureControlSpecificDefaults(selectedNode);
      render();
    });
  });

  const rebindInp = container.querySelector('#mw-keyhint-rebind-inp');
  if (rebindInp) {
    rebindInp.addEventListener('input', () => {
      selectedNode.playerCustomKeyOverride = rebindInp.value.trim();
      selectedNode.previewKeyHintDevice = 'keyboard';
      ensureControlSpecificDefaults(selectedNode);
      syncStageControlInnerVisual(container, selectedNode);
    });
    rebindInp.addEventListener('change', () => render());
  }

  container.querySelectorAll('[data-keyhint-quick-rebind]').forEach(qBtn => {
    qBtn.addEventListener('click', () => {
      selectedNode.playerCustomKeyOverride = qBtn.dataset.keyhintQuickRebind || '';
      selectedNode.previewKeyHintDevice = 'keyboard';
      ensureControlSpecificDefaults(selectedNode);
      render();
      if (selectedNode.playerCustomKeyOverride) {
        showToast(`Simulating player who rebound this slot to '${selectedNode.playerCustomKeyOverride}' in Game Settings!`);
      } else {
        showToast(`Cleared player rebind override (showing default keycap)`);
      }
    });
  });

  const copyListenerBtn = container.querySelector('#mw-copy-keyhint-listener-btn');
  if (copyListenerBtn) {
    copyListenerBtn.addEventListener('click', () => {
      const code = decodeURIComponent(copyListenerBtn.dataset.snippet || '');
      copyToClipboard(code, 'KeyHint + KeyEventType Lua');
    });
  }

  // ==========================================================================
  // 0. BUTTON STATE MACHINE EVENTS (ClientUIPresetButtonControl)
  // ==========================================================================
  const resetBtnCard = container.querySelector('#mw-reset-button-btn');
  if (resetBtnCard) {
    resetBtnCard.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedNode.interactable = true;
      selectedNode.raycastTarget = true;
      selectedNode.clickAudioId = 1001;
      selectedNode.previewButtonState = 'normal';
      syncButtonStateMachineChildren(project, selectedNode, 'normal');
      render();
      showToast(`Reset Button State Machine on ${selectedNode.name}`);
    });
  }

  const btnInteractableToggle = container.querySelector('#mw-btn-toggle-interactable');
  if (btnInteractableToggle) {
    btnInteractableToggle.addEventListener('click', () => {
      selectedNode.interactable = !(selectedNode.interactable !== false);
      selectedNode.previewButtonState = selectedNode.interactable ? 'normal' : 'disabled';
      syncButtonStateMachineChildren(project, selectedNode, selectedNode.previewButtonState);
      render();
    });
  }

  const btnRaycastToggle = container.querySelector('#mw-btn-toggle-raycast');
  if (btnRaycastToggle) {
    btnRaycastToggle.addEventListener('click', () => {
      selectedNode.raycastTarget = !(selectedNode.raycastTarget !== false);
      render();
    });
  }

  const btnAudioInp = container.querySelector('#mw-btn-audio-id');
  if (btnAudioInp) {
    btnAudioInp.addEventListener('change', () => {
      selectedNode.clickAudioId = Math.max(0, parseInt(btnAudioInp.value, 10) || 0);
      render();
    });
  }

  // Live State Machine Preview Flipper buttons (Normal | Hover | Pressed | Disabled)
  container.querySelectorAll('[data-btn-preview-state]').forEach(pillBtn => {
    pillBtn.addEventListener('click', () => {
      const targetState = pillBtn.dataset.btnPreviewState || 'normal';
      selectedNode.previewButtonState = targetState;
      syncButtonStateMachineChildren(project, selectedNode, targetState);
      render();
    });
  });

  // Button State Slot Picker Boxes -> Opens Side Selector next to Right Menu
  container.querySelectorAll('[data-open-btn-slot-picker]').forEach(slotBtn => {
    slotBtn.addEventListener('click', () => {
      const slotState = slotBtn.dataset.openBtnSlotPicker || 'normal';
      if (state.sideSelectorMode === 'button_state' && state.sideSelectorBtnSlot === slotState) {
        state.sideSelectorMode = null;
      } else {
        state.sideSelectorMode = 'button_state';
        state.sideSelectorBtnSlot = slotState;
        state.sideSelectorSearch = '';
      }
      render();
    });
  });

  container.querySelectorAll('[data-clear-btn-slot-prop]').forEach(clearBtn => {
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const prop = clearBtn.dataset.clearBtnSlotProp;
      if (!prop) return;
      selectedNode[prop] = '';
      syncButtonStateMachineChildren(project, selectedNode, selectedNode.previewButtonState);
      render();
      showToast(`Unassigned status node on ${selectedNode.name}`);
    });
  });

  // Jump to assigned child status node in Hierarchy (↗)
  container.querySelectorAll('[data-jump-child-key]').forEach(jumpBtn => {
    jumpBtn.addEventListener('click', () => {
      const childKey = jumpBtn.dataset.jumpChildKey;
      if (!childKey || typeof setSelectedNodeKey !== 'function') return;
      const childObj = project.nodes.find(n => n.key === childKey);
      if (!childObj) return;
      setSelectedNodeKey(childKey);
      render();
      showToast(`Selected status node ${childObj.name}`);
    });
  });

  // Quick "+ Add 1-Tier Child Status Container" button
  const addStateChildBtn = container.querySelector('#mw-btn-add-state-child');
  if (addStateChildBtn) {
    addStateChildBtn.addEventListener('click', () => {
      let maxId = 0;
      let maxH = 20;
      for (const n of project.nodes) {
        if (typeof n.id === 'number' && n.id > maxId) maxId = n.id;
        if (typeof n.userdataHandle === 'number' && n.userdataHandle > maxH) maxH = n.userdataHandle;
      }

      // Determine which status slot to populate next
      let stateTag = 'Custom';
      let targetProp = null;
      let targetPreview = 'normal';
      let bgCol = { r: 78, g: 62, b: 42, a: 245 };
      let txtLabel = `${selectedNode.name}`;

      if (!selectedNode.normalStatusNodeKey) {
        stateTag = 'Normal';
        targetProp = 'normalStatusNodeKey';
        targetPreview = 'normal';
        bgCol = { r: 58, g: 48, b: 36, a: 245 };
        txtLabel = `${selectedNode.name}`;
      } else if (!selectedNode.hoverStatusNodeKey) {
        stateTag = 'Hover';
        targetProp = 'hoverStatusNodeKey';
        targetPreview = 'hover';
        bgCol = { r: 122, g: 92, b: 44, a: 255 };
        txtLabel = `<b>▶ ${selectedNode.name} ◀</b>`;
      } else if (!selectedNode.pressedStatusNodeKey) {
        stateTag = 'Pressed';
        targetProp = 'pressedStatusNodeKey';
        targetPreview = 'pressed';
        bgCol = { r: 165, g: 62, b: 42, a: 255 };
        txtLabel = `<b>⚡ ${selectedNode.name} ⚡</b>`;
      } else if (!selectedNode.disabledStatusNodeKey) {
        stateTag = 'Disabled';
        targetProp = 'disabledStatusNodeKey';
        targetPreview = 'disabled';
        bgCol = { r: 42, g: 38, b: 34, a: 180 };
        txtLabel = `${selectedNode.name} (Disabled)`;
      } else {
        const count = project.nodes.filter(n => n.parentKey === selectedNode.key).length + 1;
        stateTag = `State_${count}`;
      }

      const w = selectedNode.width || 156;
      const h = selectedNode.height || 44;
      const contId = maxId + 1;
      const bgId = maxId + 2;
      const txtId = maxId + 3;
      const contKey = `btn_state_cont_${Date.now()}_${contId}`;
      const bgKey = `btn_state_bg_${Date.now()}_${bgId}`;
      const txtKey = `btn_state_txt_${Date.now()}_${txtId}`;

      const contNode = {
        key: contKey,
        parentKey: selectedNode.key,
        id: contId,
        userdataHandle: maxH + 7,
        depth: (selectedNode.depth || 1) + 1,
        icon: '□',
        name: `${stateTag}_Container`,
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
      };

      const bgNode = {
        key: bgKey,
        parentKey: contKey,
        id: bgId,
        userdataHandle: maxH + 14,
        depth: (selectedNode.depth || 1) + 2,
        icon: '▣',
        name: `${stateTag}_Bg`,
        className: 'ClientUIImageControl',
        prefabIndex: 1073741850,
        x: 0,
        y: 0,
        width: w,
        height: h,
        resourceId: 100001,
        imageColor: bgCol,
        active: true,
        visible: true,
        isUserCreated: true,
        script: null
      };

      const txtNode = {
        key: txtKey,
        parentKey: contKey,
        id: txtId,
        userdataHandle: maxH + 21,
        depth: (selectedNode.depth || 1) + 2,
        icon: 'T',
        name: `${stateTag}_Label`,
        className: 'ClientUITextBoxControl',
        prefabIndex: 1073741849,
        x: 0,
        y: 0,
        width: w,
        height: h,
        text: txtLabel,
        fontSize: 14,
        alignH: 'center',
        alignV: 'middle',
        fontColor: { r: 245, g: 238, b: 220, a: 255 },
        bgColor: { r: 0, g: 0, b: 0, a: 0 },
        active: true,
        visible: true,
        isUserCreated: true,
        script: null
      };

      // Layered ordering: place Label (foreground) on top of Bg (background) in the container's layer list
      project.nodes.push(contNode, txtNode, bgNode);
      if (targetProp) {
        selectedNode[targetProp] = contKey;
        selectedNode.previewButtonState = targetPreview;
      }
      if (typeof normalizeProjectHierarchy === 'function') {
        normalizeProjectHierarchy(project);
      }
      syncButtonStateMachineChildren(project, selectedNode, selectedNode.previewButtonState);
      render();
      showToast(`Created 1-tier child ${contNode.name} (with Image + TextBox) under ${selectedNode.name}`);
    });
  }

  // Controller Navigation switch
  const ctrlNavBtn = container.querySelector('#mw-toggle-ctrl-nav');
  if (ctrlNavBtn) {
    ctrlNavBtn.addEventListener('click', () => {
      selectedNode.controllerNav = !selectedNode.controllerNav;
      render();
    });
  }

  // Helper to bind a Color Row (picker + hex + alpha %)
  const bindColorControl = (prefixId, getColorObj, setColorObj) => {
    const picker = container.querySelector(`#${prefixId}-picker`);
    const hexInp = container.querySelector(`#${prefixId}-hex`);
    const alphaInp = container.querySelector(`#${prefixId}-alpha`);

    if (picker) {
      picker.addEventListener('input', () => {
        const curr = getColorObj();
        const next = hex6ToRgba(picker.value, curr ? curr.a : 255);
        if (next) {
          // If alpha was 0 and user picks a color from the swatch, make it visible if it's text/fill
          setColorObj(next);
          if (hexInp) hexInp.value = rgbToHex6(next);
          syncStageControlInnerVisual(container, selectedNode);
        }
      });
      picker.addEventListener('change', () => render());
    }

    if (hexInp) {
      hexInp.addEventListener('change', () => {
        const curr = getColorObj();
        const next = hex6ToRgba(hexInp.value, curr ? curr.a : 255);
        if (next) {
          setColorObj(next);
          render();
        } else {
          hexInp.value = rgbToHex6(curr);
        }
      });
    }

    if (alphaInp) {
      const updateAlpha = () => {
        const curr = getColorObj();
        if (!curr) return;
        curr.a = pctToAlpha(alphaInp.value);
        syncStageControlInnerVisual(container, selectedNode);
      };
      alphaInp.addEventListener('input', updateAlpha);
      alphaInp.addEventListener('change', () => {
        updateAlpha();
        render();
      });
    }
  };

  // ==========================================================================
  // 1. TEXTBOXCONTROL EVENTS 
  // ==========================================================================
  const resetTbBtn = container.querySelector('#mw-reset-textbox-btn');
  if (resetTbBtn) {
    resetTbBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedNode.fontSize = 20;
      selectedNode.adaptiveFontSize = false;
      selectedNode.minFontSize = 14;
      selectedNode.fontColor = { r: 255, g: 255, b: 255, a: 255 };
      selectedNode.bgColor = { r: 255, g: 255, b: 255, a: 0 };
      selectedNode.enableOutline = false;
      selectedNode.outlineColor = { r: 51, g: 51, b: 51, a: 51 };
      selectedNode.alignH = 'center';
      selectedNode.alignV = 'top';
      render();
      showToast(`Reset TextBox settings on ${selectedNode.name}`);
    });
  }

  // Font Size manual input + dropdown popover
  const fontSizeInp = container.querySelector('#mw-tb-fontsize-inp');
  if (fontSizeInp) {
    fontSizeInp.addEventListener('input', () => {
      const val = parseFloat(fontSizeInp.value);
      if (!Number.isNaN(val) && val >= 6) {
        selectedNode.fontSize = Math.min(160, Math.round(val));
        syncStageControlInnerVisual(container, selectedNode);
      }
    });
    fontSizeInp.addEventListener('change', () => render());
  }

  const fontSizeDropBtn = container.querySelector('#mw-tb-fontsize-drop-btn');
  if (fontSizeDropBtn) {
    fontSizeDropBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.fontSizeDropdownOpen = !state.fontSizeDropdownOpen;
      state.minFontSizeDropdownOpen = false;
      render();
    });
  }

  // Minimum Font Size manual input + dropdown popover 
  const minFontSizeInp = container.querySelector('#mw-tb-minfontsize-inp');
  if (minFontSizeInp) {
    minFontSizeInp.addEventListener('input', () => {
      const val = parseFloat(minFontSizeInp.value);
      if (!Number.isNaN(val) && val >= 6) {
        selectedNode.minFontSize = Math.min(selectedNode.fontSize || 20, Math.round(val));
        syncStageControlInnerVisual(container, selectedNode);
      }
    });
    minFontSizeInp.addEventListener('change', () => render());
  }

  const minFontSizeDropBtn = container.querySelector('#mw-tb-minfontsize-drop-btn');
  if (minFontSizeDropBtn) {
    minFontSizeDropBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.minFontSizeDropdownOpen = !state.minFontSizeDropdownOpen;
      state.fontSizeDropdownOpen = false;
      render();
    });
  }

  // Preset option click in Font Size / Minimum Font Size dropdowns
  container.querySelectorAll('[data-pick-fontsize]').forEach(optBtn => {
    optBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const picked = parseInt(optBtn.dataset.pickFontsize, 10) || 20;
      const targetInp = optBtn.dataset.targetInp;
      if (targetInp === 'mw-tb-minfontsize-inp') {
        selectedNode.minFontSize = Math.min(selectedNode.fontSize || 20, picked);
      } else {
        selectedNode.fontSize = picked;
      }
      state.fontSizeDropdownOpen = false;
      state.minFontSizeDropdownOpen = false;
      render();
    });
  });

  // Adaptive Font Size toggle
  const adaptiveToggle = container.querySelector('#mw-tb-toggle-adaptive');
  if (adaptiveToggle) {
    adaptiveToggle.addEventListener('click', () => {
      selectedNode.adaptiveFontSize = !selectedNode.adaptiveFontSize;
      render();
    });
  }

  // Text Color, Background Color, Outline Toggle & Outline Color
  bindColorControl('mw-tb-fontcolor', () => selectedNode.fontColor, (c) => { selectedNode.fontColor = c; });
  bindColorControl('mw-tb-bgcolor', () => selectedNode.bgColor, (c) => { selectedNode.bgColor = c; });
  bindColorControl('mw-tb-outlinecolor', () => selectedNode.outlineColor, (c) => { selectedNode.outlineColor = c; });

  const outlineToggle = container.querySelector('#mw-tb-toggle-outline');
  if (outlineToggle) {
    outlineToggle.addEventListener('click', () => {
      selectedNode.enableOutline = !selectedNode.enableOutline;
      render();
    });
  }

  // Horizontal & Vertical Align buttons
  container.querySelectorAll('[data-align-h]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedNode.alignH = btn.dataset.alignH;
      selectedNode.horizontalAlignment =
        selectedNode.alignH === 'center' ? 1 : (selectedNode.alignH === 'right' ? 2 : 0);
      render();
    });
  });

  container.querySelectorAll('[data-align-v]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedNode.alignV = btn.dataset.alignV;
      selectedNode.verticalAlignment =
        selectedNode.alignV === 'middle' ? 1 : (selectedNode.alignV === 'bottom' ? 2 : 0);
      render();
    });
  });

  // Rich Text textarea + Quick Tag Insert Buttons (<color>, <i>, <b>, <size>)
  const tbTextarea = container.querySelector('#mw-tb-content-textarea');
  if (tbTextarea) {
    tbTextarea.addEventListener('input', () => {
      selectedNode.text = tbTextarea.value;
      syncStageControlInnerVisual(container, selectedNode);
    });
    tbTextarea.addEventListener('change', () => render());
  }

  container.querySelectorAll('[data-insert-tag]').forEach(tagBtn => {
    tagBtn.addEventListener('click', () => {
      if (!tbTextarea) return;
      const kind = tagBtn.dataset.insertTag;
      const start = tbTextarea.selectionStart ?? tbTextarea.value.length;
      const end = tbTextarea.selectionEnd ?? tbTextarea.value.length;
      const selectedText = tbTextarea.value.slice(start, end) || 'Text';

      let openTag = '<b>';
      let closeTag = '</b>';
      if (kind === 'i') {
        openTag = '<i>';
        closeTag = '</i>';
      } else if (kind === 'color') {
        openTag = '<color=#F5B82E>';
        closeTag = '</color>';
      } else if (kind === 'size') {
        openTag = '<size=24>';
        closeTag = '</size>';
      }

      const nextVal = tbTextarea.value.slice(0, start) + openTag + selectedText + closeTag + tbTextarea.value.slice(end);
      selectedNode.text = nextVal;
      render();
    });
  });

  // ==========================================================================
  // 2. IMAGE SETTINGS & MASK SETTINGS EVENTS 
  // ==========================================================================
  const resetImgBtn = container.querySelector('#mw-reset-image-btn');
  if (resetImgBtn) {
    resetImgBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedNode.imageSource = 'Static Reference';
      selectedNode.resourceId = 100001;
      selectedNode.imageColor = { r: 255, g: 255, b: 255, a: 255 };
      selectedNode.imageType = 'Basic';
      render();
      showToast(`Reset Image Settings on ${selectedNode.name}`);
    });
  }

  const imgSourceSelect = container.querySelector('#mw-img-source-select');
  if (imgSourceSelect) {
    imgSourceSelect.addEventListener('change', () => {
      selectedNode.imageSource = imgSourceSelect.value;
      render();
    });
  }

  // Open / Toggle Bottom 1/3 Image Library Selector Drawer 
  const toggleAssetLibrary = (e) => {
    if (e && e.target && e.target.closest('[data-copy-asset-id]')) return;
    state.assetLibraryOpen = !state.assetLibraryOpen;
    render();
  };

  const libThumbBtn = container.querySelector('#mw-open-asset-lib-thumb');
  const libMetaBox = container.querySelector('#mw-open-asset-lib-meta');
  const libToggleBtn = container.querySelector('#mw-toggle-asset-lib-btn');
  if (libThumbBtn) libThumbBtn.addEventListener('click', toggleAssetLibrary);
  if (libMetaBox) libMetaBox.addEventListener('click', toggleAssetLibrary);
  if (libToggleBtn) libToggleBtn.addEventListener('click', toggleAssetLibrary);

  const libCloseBtn = container.querySelector('#mw-asset-lib-close-btn');
  if (libCloseBtn) {
    libCloseBtn.addEventListener('click', () => {
      state.assetLibraryOpen = false;
      render();
    });
  }

  const libSearchInp = container.querySelector('#mw-asset-lib-search-inp');
  if (libSearchInp) {
    libSearchInp.addEventListener('input', () => {
      state.assetLibrarySearch = libSearchInp.value;
      const pos = libSearchInp.selectionStart;
      render();
      const nextInp = container.querySelector('#mw-asset-lib-search-inp');
      if (nextInp) {
        nextInp.focus();
        nextInp.setSelectionRange(pos, pos);
      }
    });
  }

  container.querySelectorAll('[data-pick-asset-id]').forEach(cardEl => {
    cardEl.addEventListener('click', () => {
      const pickedId = parseInt(cardEl.dataset.pickAssetId, 10) || 100001;
      selectedNode.resourceId = pickedId;
      render();
    });
  });

  container.querySelectorAll('[data-copy-asset-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      copyToClipboard(btn.dataset.copyAssetId, 'Resource ID');
    });
  });

  const resetAssetBtn = container.querySelector('#mw-img-asset-reset-btn');
  if (resetAssetBtn) {
    resetAssetBtn.addEventListener('click', () => {
      selectedNode.resourceId = 100001;
      render();
      showToast('Reset Reference Asset Resource to 100001 (Basic Shapes)');
    });
  }

  bindColorControl('mw-img-fillcolor', () => selectedNode.imageColor, (c) => { selectedNode.imageColor = c; });

  // [1:1] Set to Default Size button 
  const oneToOneBtn = container.querySelector('#mw-img-1to1-btn');
  if (oneToOneBtn) {
    oneToOneBtn.addEventListener('click', () => {
      const squareSize = Math.max(32, Math.round(Math.max(selectedNode.width || 100, selectedNode.height || 100)));
      selectedNode.width = squareSize;
      selectedNode.height = squareSize;
      selectedNode.scaleX = 1.0;
      selectedNode.scaleY = 1.0;
      render();
      showToast(`Set ${selectedNode.name} to 1:1 square (${squareSize}×${squareSize})`);
    });
  }

  // Mask Settings Events 
  const resetMaskBtn = container.querySelector('#mw-reset-mask-btn');
  if (resetMaskBtn) {
    resetMaskBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedNode.enableMask = false;
      selectedNode.enableSoftEdge = false;
      selectedNode.softMode = 'Percentage';
      selectedNode.softRangeH = 43.11;
      selectedNode.softRangeV = 39.67;
      selectedNode.softEdgeWidthX = 12.0;
      selectedNode.softEdgeWidthY = 12.0;
      selectedNode.enableFillByProgress = false;
      selectedNode.fillShape = 'Vertical';
      selectedNode.fillDirection = 'From Bottom to Top';
      selectedNode.fillStartLocation = 'Top';
      selectedNode.fillAmount = 100;
      selectedNode.invertMask = false;
      render();
      showToast(`Reset Mask Settings on ${selectedNode.name}`);
    });
  }

  const maskEnableBtn = container.querySelector('#mw-mask-toggle-enable');
  if (maskEnableBtn) {
    maskEnableBtn.addEventListener('click', () => {
      selectedNode.enableMask = !selectedNode.enableMask;
      render();
    });
  }

  const maskSoftBtn = container.querySelector('#mw-mask-toggle-soft');
  if (maskSoftBtn) {
    maskSoftBtn.addEventListener('click', () => {
      selectedNode.enableSoftEdge = !selectedNode.enableSoftEdge;
      render();
    });
  }

  const softModeSelect = container.querySelector('#mw-mask-soft-mode');
  if (softModeSelect) {
    softModeSelect.addEventListener('change', () => {
      selectedNode.softMode = softModeSelect.value;
      render();
    });
  }

  // Soft Edge Percentage sliders + number boxes 
  const bindSliderPair = (rangeId, numId, onUpdate) => {
    const rangeEl = container.querySelector(rangeId);
    const numEl = container.querySelector(numId);
    if (rangeEl) {
      rangeEl.addEventListener('input', () => {
        const val = parseFloat(rangeEl.value) || 0;
        if (numEl) numEl.value = rangeEl.step === '1' ? String(Math.round(val)) : val.toFixed(2);
        onUpdate(val);
        syncStageControlInnerVisual(container, selectedNode);
      });
      rangeEl.addEventListener('change', () => render());
    }
    if (numEl) {
      numEl.addEventListener('input', () => {
        const val = Math.max(0, Math.min(100, parseFloat(numEl.value) || 0));
        if (rangeEl) rangeEl.value = String(val);
        onUpdate(val);
        syncStageControlInnerVisual(container, selectedNode);
      });
      numEl.addEventListener('change', () => render());
    }
  };

  bindSliderPair('#mw-mask-soft-h-range', '#mw-mask-soft-h-num', (val) => {
    selectedNode.softRangeH = Math.round(val * 100) / 100;
  });
  bindSliderPair('#mw-mask-soft-v-range', '#mw-mask-soft-v-num', (val) => {
    selectedNode.softRangeV = Math.round(val * 100) / 100;
  });

  // Soft Edge Pixels X/Y inputs 
  const softPxX = container.querySelector('#mw-mask-soft-px-x');
  const softPxY = container.querySelector('#mw-mask-soft-px-y');
  if (softPxX) {
    softPxX.addEventListener('input', () => {
      selectedNode.softEdgeWidthX = Math.max(0, parseFloat(softPxX.value) || 0);
      syncStageControlInnerVisual(container, selectedNode);
    });
    softPxX.addEventListener('change', () => render());
  }
  if (softPxY) {
    softPxY.addEventListener('input', () => {
      selectedNode.softEdgeWidthY = Math.max(0, parseFloat(softPxY.value) || 0);
      syncStageControlInnerVisual(container, selectedNode);
    });
    softPxY.addEventListener('change', () => render());
  }

  // Fill by Progress toggle, Shape, Direction, Starting Location, fillAmount, and Invert Mask Area
  const maskProgBtn = container.querySelector('#mw-mask-toggle-progress');
  if (maskProgBtn) {
    maskProgBtn.addEventListener('click', () => {
      selectedNode.enableFillByProgress = !selectedNode.enableFillByProgress;
      render();
    });
  }

  const fillShapeSelect = container.querySelector('#mw-mask-fill-shape');
  if (fillShapeSelect) {
    fillShapeSelect.addEventListener('change', () => {
      selectedNode.fillShape = fillShapeSelect.value;
      if (selectedNode.fillShape === 'Horizontal') {
        selectedNode.fillDirection = 'From Left to Right';
      } else if (selectedNode.fillShape === 'Vertical') {
        selectedNode.fillDirection = 'From Bottom to Top';
      } else {
        selectedNode.fillDirection = 'Clockwise';
      }
      render();
    });
  }

  const fillDirSelect = container.querySelector('#mw-mask-fill-dir');
  if (fillDirSelect) {
    fillDirSelect.addEventListener('change', () => {
      selectedNode.fillDirection = fillDirSelect.value;
      render();
    });
  }

  const fillStartSelect = container.querySelector('#mw-mask-fill-start');
  if (fillStartSelect) {
    fillStartSelect.addEventListener('change', () => {
      selectedNode.fillStartLocation = fillStartSelect.value;
      render();
    });
  }

  bindSliderPair('#mw-mask-fill-amount-range', '#mw-mask-fill-amount-num', (val) => {
    selectedNode.fillAmount = Math.max(0, Math.min(100, Math.round(val)));
  });

  const maskInvertBtn = container.querySelector('#mw-mask-toggle-invert');
  if (maskInvertBtn) {
    maskInvertBtn.addEventListener('click', () => {
      selectedNode.invertMask = !selectedNode.invertMask;
      render();
    });
  }
}
