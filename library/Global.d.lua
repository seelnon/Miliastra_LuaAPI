---@meta

---Returns the runtime type name of the specified value.
---@param value any
---@return ApiType typeName
function typeof(value) end

---Writes passed values to the log. Client Script logging must be enabled.
function print(...) end

---Writes passed values to the log as an error. Client Script logging must be enabled.
function printerr(...) end

---Creates a color from 0-255 RGBA.
---@param r number # The red component (0-255).
---@param g number # The green component (0-255).
---@param b number # The blue component (0-255).
---@param a? number # (Optional) The alpha component (0-255, default 255).
---@return ColorValue
function Color(r, g, b, a) end

---Called when the Client Control that the script is attached to is initialized.
---
---Called immediately when a Client Control with the script attached is instantiated.
---
---Ignored by Module scripts.
---
---### Stage Start Lifecycle Function Call Order
---1. **Top Level Code > OnInit - Global Script**
---2. **Top Level Code > OnInit - Client Control Hierarchy**
---3. OnEnable - Client Control Hierarchy
---4. OnStart - Client Control Hierarchy
---5. OnEnable - Global Script
---6. OnStart - Global Script
---7. OnUpdate > OnLevelUpdate - Global Script
---8. OnUpdate > OnLevelUpdate - Client Control Hierarchy
---9. OnDestroy - Global Script (On Stage End)
function OnInit() end

---Called when the Client Control that the script is attached to is activated.
---
---Called immediately after OnInit when a Client Control with the script attached is instantiated.
---
---Ignored by Module scripts.
---
---### Stage Start Lifecycle Function Call Order
---1. Top Level Code > OnInit - Global Script
---2. Top Level Code > OnInit - Client Control Hierarchy
---3. **OnEnable - Client Control Hierarchy**
---4. OnStart - Client Control Hierarchy
---5. **OnEnable - Global Script**
---6. OnStart - Global Script
---7. OnUpdate > OnLevelUpdate - Global Script
---8. OnUpdate > OnLevelUpdate - Client Control Hierarchy
---9. OnDestroy - Global Script (On Stage End)
function OnEnable() end

---Called when the script starts.
---
---Called immediately after OnEnable when a Client Control with the script attached is instantiated.
---
---Ignored by Module scripts.
---
---### Stage Start Lifecycle Function Call Order
---1. Top Level Code > OnInit - Global Script
---2. Top Level Code > OnInit - Client Control Hierarchy
---3. OnEnable - Client Control Hierarchy
---4. **OnStart - Client Control Hierarchy**
---5. OnEnable - Global Script
---6. **OnStart - Global Script**
---7. OnUpdate > OnLevelUpdate - Global Script
---8. OnUpdate > OnLevelUpdate - Client Control Hierarchy
---9. OnDestroy - Global Script (On Stage End)
function OnStart() end

---Called when the Client Control that the script is attached to is deactivated. Also called before OnDestroy when the Client Control the script is attached to is destroyed.
---
---Ignored by Module scripts.
function OnDisable() end

---Called when the Client Control that the script is attached to is destroyed.
---
---Ignored by Module scripts.
function OnDestroy() end

---Called once every frame.
---
---Updates must be enabled for the script for this lifecycle function to be called.
---
---Ignored by Module scripts.
---
---### Stage Start Lifecycle Function Call Order
---1. Top Level Code > OnInit - Global Script
---2. Top Level Code > OnInit - Client Control Hierarchy
---3. OnEnable - Client Control Hierarchy
---4. OnStart - Client Control Hierarchy
---5. OnEnable - Global Script
---6. OnStart - Global Script
---7. **OnUpdate > OnLevelUpdate - Global Script**
---8. **OnUpdate > OnLevelUpdate - Client Control Hierarchy**
---9. OnDestroy - Global Script (On Stage End)
---@param deltaTime number # The time elapsed since the last frame in seconds.
function OnUpdate(deltaTime) end

---Called once after OnUpdate every frame when level-time is not paused.
---
---Updates must be enabled for the script for this lifecycle function to be called.
---
---Ignored by Module scripts.
---
---### Stage Start Lifecycle Function Call Order
---1. Top Level Code > OnInit - Global Script
---2. Top Level Code > OnInit - Client Control Hierarchy
---3. OnEnable - Client Control Hierarchy
---4. OnStart - Client Control Hierarchy
---5. OnEnable - Global Script
---6. OnStart - Global Script
---7. **OnUpdate > OnLevelUpdate - Global Script**
---8. **OnUpdate > OnLevelUpdate - Client Control Hierarchy**
---9. OnDestroy - Global Script (On Stage End)
---@param levelDeltaTime number # The time elapsed since the last frame in seconds.
function OnLevelUpdate(levelDeltaTime) end
