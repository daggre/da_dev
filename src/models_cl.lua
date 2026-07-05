-- Registry for models contributed by OTHER resources (e.g. da_props streams).
-- These populate the object hud's "other" spawn category so they can be
-- searched / previewed / spawned just like the built-in dat.* model lists.
--
-- Load-order-proof handshake (works no matter which resource starts first):
--   * Providers call        exports['da_dev']:registerModels({ 'model_a', ... })
--   * On OUR start we fire   TriggerEvent('da_dev:requestModels')  so providers
--                            that loaded BEFORE us re-register.
--   * onClientResourceStop   drops a provider's models when it stops/restarts.

dat.other = dat.other or {}
if dat.lookup == nil then dat.lookup = {} end
dat.lookup.other = dat.lookup.other or {}

-- da_lib's dat.getName has a hardcoded lookup list that omits "other", so
-- registered models would otherwise show as a raw hash in the hud. Extend it
-- (this file loads after the @da_lib/data/* files, so our override wins).
local baseGetName = dat.getName
dat.getName = function(hash)
    if dat.lookup.other[hash] then return dat.lookup.other[hash] end
    return baseGetName and baseGetName(hash) or hash
end

local Registered = {}  -- [resourceName] = { 'model_a', 'model_b', ... }

local function rebuild()
    local seen, list = {}, {}
    for _, names in pairs(Registered) do
        for _, name in ipairs(names) do
            if not seen[name] then
                seen[name] = true
                list[#list + 1] = name
            end
        end
    end
    table.sort(list)

    dat.other = list
    dat.lookup.other = {}
    for _, name in ipairs(list) do
        dat.lookup.other[GetHashKey(name)] = name
    end

    -- Live-refresh the hud if it's open; also served fresh on next fetchObjects.
    da_ui.send("updateSpawnList", { category = "other", list = list })
    log.debug("Rebuilt 'other' model list", #list)
end

-- Export: a provider registers (or replaces) its full set of model names.
-- Attribution is via GetInvokingResource() so onClientResourceStop can drop it.
exports('registerModels', function(names)
    if type(names) ~= "table" then
        log.error("registerModels expects a table of model names")
        return false
    end
    local res = GetInvokingResource() or "unknown"
    Registered[res] = names
    log.info(("Registered %d models from %s"):format(#names, res))
    rebuild()
    return true
end)

-- Drop a provider's models when it stops (streamed models are gone anyway).
AddEventHandler("onClientResourceStop", function(res)
    if Registered[res] then
        Registered[res] = nil
        log.info("Dropped models from stopped resource", res)
        rebuild()
    end
end)

-- Ask providers that were already running before us to (re)register.
CreateThread(function()
    TriggerEvent("da_dev:requestModels")
end)
