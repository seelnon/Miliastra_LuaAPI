---@meta

---The type that represents a color used for fonts, images, and fills.
---@class ColorValue
local ColorValue = {}

---@class Color
local Color = {}

---Creates a color from 0-255 RGB.
---@param r number # The red component (0-255).
---@param g number # The green component (0-255).
---@param b number # The blue component (0-255).
---@return ColorValue
function Color.FromRGB(r, g, b) end

---Creates a color from 0-255 RGBA.
---@param r number # The red component (0-255).
---@param g number # The green component (0-255).
---@param b number # The blue component (0-255).
---@param a? number # (Optional) The alpha component (0-255, default 255).
---@return ColorValue
function Color.FromRGBA(r, g, b, a) end

---Splits a color into four 0-255 RGBA values.
---@param color ColorValue
---@return number r # The red component (0-255).
---@return number g # The green component (0-255).
---@return number b # The blue component (0-255).
---@return number a # The alpha component (0-255).
function Color.ToRGBA(color) end
