---@meta

---The type that represents data exposed by cursor event callbacks.
---
---Pending Documentation:
---- Unknown purpose of `touchId`. Always seems to return -1
---@class CursorEventData
---@field dragging boolean # [Read] Whether currently dragging.
---@field touchId number # [Read] Unknown purpose, seems to always return -1.
local CursorEventData = {}

---Returns the cursor position when the event took place originating from the bottom-left corner of the viewport.
---@return number x # The cursor x position.
---@return number y # The cursor y position.
function CursorEventData:GetUIPos() end

---Returns the cursor position when the mouse was pressed originating from the bottom-left corner of the viewport.
---@return number x # The cursor x position.
---@return number y # The cursor y position.
function CursorEventData:GetPressUIPos() end

---Returns the distance the cursor moved between the start and end of the event.
---@return number x # The cursor x position change.
---@return number y # The cursor y position change.
function CursorEventData:GetUIPosDelta() end
