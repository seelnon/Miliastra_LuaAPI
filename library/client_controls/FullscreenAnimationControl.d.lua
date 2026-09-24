---@meta

---The type that represents an instance of a Fullscreen UI Animation component.
---
---The specified animation will automatically play when the component becomes active.
---@class ClientUIFullscreenAnimationControl : ClientUIBaseControl
---@field animationId integer # [Read/Write] The animation ID. Assigning a different ID while active will immediately play the new animation.
---@field playSoundEffect boolean # [Read/Write] Whether to play animation sound effects. Toggling this value from false to true while active will replay the corresponding sound effect, even if the animation has finished.
local ClientUIFullscreenAnimationControl = {}
