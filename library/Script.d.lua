---@meta

---@type Script
script = script

---The type that represents an instance of a script that is attached to a Client Control, set as the Global Script, or running as a Module.
---@class Script
---@field alive boolean # [Read] Whether the script instance is currently loaded. Check this field before calling user-defined global functions from a different script.
---@field id number # [Read] The runtime ID of the script instance.
---@field prefabIndex number? # [Read] The mapping ID of the script. Always nil for Modules.
---@field object ClientControlType? # [Read] The Client Control instance that the script is mounted on. Always nil for the Global Script and Modules.
---@field path string # [Read] The path of the script relative to the `external_lua_file` directory, without the file extension.
---@field enabled boolean # [Read/Write] The active execution state of the script. **Not observed to have any effect on lifecycle functions or event handlers when changed directly.**
local Script = {}

---Sets whether the script executes OnUpdate and OnLevelUpdate lifecycle functions.
---@param enabled boolean # Whether to execute OnUpdate and OnLevelUpdate lifecycle functions.
---@see OnUpdate
---@see OnLevelUpdate
function Script:EnableUpdate(enabled) end

---Gets the value of a Script Variable defined in the script's mapping by name.
---
---Returns nil if a Script Variable with the specified name does not exist.
---@param varName string # The name of the Script Variable.
---@return ServerDataType? # The value of the Script Variable.
function Script:GetParam(varName) end

---Calls a global function by name.
---
---If calling a global function from another script instance, it is recommended to check that the target script is alive.
---@param funcName string # The name of the function to call (case-sensitive).
---@param ... any # Parameters to pass to the function call.
---@return any ... # The return values of the called function.
---@see Script.alive
function Script:Invoke(funcName, ...) end

---Registers a Custom Variable changed handler for the specified variable name and entity. The callback function does not provide pre-change or post-change values.
---
---Multiple handlers for the same Custom Variable cannot be registered on the same script; only the earliest handler will take effect.
---@param entity EnumItem.CustomVariableEntityType # The entity to handle Custom Variable changes on.
---@param varName string # The name of the Custom Variable.
---@param callback fun(entity: EnumItem.CustomVariableEntityType, varName: string) # The callback to execute whenever the specified Custom Variable changes.
---@see Enum.CustomVariableEntityType
---@see game.GetGlobalCustomVariableValue
function Script:RegisterCustomVariableChangedHandler(entity, varName, callback) end

---Registers a Client Scripted Signal handler for the specified signal name. Multiple handlers for the same signal cannot be registered on the same script; only the earliest handler will take effect.
---
---Only signals sent using the Send Client Scripted Signal server node will be handled, and **all server-sent signals have a minimum latency of approximately 100ms.**
---
---Callback parameters can only be accessed by sequence index, matching the order in the Server Signal Explorer.
---@param signalName string # The name of the signal to register a handler for.
---@param callback fun(signalName: string, signalParams: ServerDataType[]) # The callback to execute whenever the signal is received.
function Script:RegisterServerSignalHandler(signalName, callback) end

---Removes the handler for the specified Custom Variable.
---@param entity EnumItem.CustomVariableEntityType # The entity to unregister the handler from.
---@param varName string # The name of the Custom Variable.
---@see Enum.CustomVariableEntityType
function Script:UnregisterCustomVariableChangedHandler(entity, varName) end

---Removes the handler for the specified Client Scripted Signal.
---@param signalName string # The name of the signal to unregister the active handler for.
function Script:UnregisterServerSignalHandler(signalName) end
