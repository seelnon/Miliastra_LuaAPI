---@meta

---The type that represents an instance of a Text Box Control component.
---@class ClientUITextBoxControl : ClientUIBaseControl
---@field text string # [Read/Write] The displayed text.
---@field fontSize integer # [Read/Write/Tweenable] The font size.
---@field fontColor ColorValue # [Read/Write/Tweenable] The font color.
---@field bgColor ColorValue # [Read/Write/Tweenable] The background color.
---@field enableOutline boolean # [Read/Write] Whether the text outline is enabled.
---@field outlineColor ColorValue # [Read/Write/Tweenable] The text outline color.
---@field horizontalAlignment EnumItem.TextHorizontalAlignment # [Read/Write] The horizontal alignment of the text.
---@field verticalAlignment EnumItem.TextVerticalAlignment # [Read/Write] The vertical alignment of the text.
---@field adaptiveFontSize boolean # [Read/Write] Whether the font size should adapt to the bounds of the text box.
---@field minimumFontSize integer # [Read/Write/Tweenable] The minimum font size when adaptive font size is enabled.
local ClientUITextBoxControl = {}
