-- Client half of the dev-kit authorization gate. Loads before every other src/ file.
--
-- Modes in da_dev register at file scope, spread across a dozen files. Rather than
-- thread an "am I allowed?" check through each of them, this wraps the mode facade and
-- holds registrations in a queue until the server says yes. Nothing registers, so
-- nothing binds a key, so the dev keybinds are inert for an unauthorized player.
--
-- `da_mode` here is da_dev's own copy of the facade -- each resource gets its own Lua
-- state, and the facade is a stub that forwards to da_lib through exports. Wrapping it
-- affects this resource only.
--
-- See src/auth_srv.lua for the levels, and docs/SECURITY.md in the toolkit repo for
-- what this does and does not protect against.

local authorized = false
local pending = {}      -- modes registered before authorization came through
local registered = {}   -- modes handed to da_lib, so they can be pulled back

local _register = da_mode.register
local _unregister = da_mode.unregister

da_mode.register = function(mode)
    if not authorized then
        pending[#pending + 1] = mode
        return
    end

    registered[#registered + 1] = mode
    return _register(mode)
end

da_mode.unregister = function(mode)
    for i, m in ipairs(pending) do
        if m == mode or m.name == mode then
            table.remove(pending, i)
            return
        end
    end

    for i, m in ipairs(registered) do
        if m == mode or m.name == mode then
            table.remove(registered, i)
            break
        end
    end

    return _unregister(mode)
end

local function grant()
    if authorized then return end
    authorized = true

    for _, mode in ipairs(pending) do
        registered[#registered + 1] = mode
        _register(mode)
    end

    log.info(("authorized - %d mode(s) live"):format(#pending))
    pending = {}
end

local function revoke()
    if not authorized then return end
    authorized = false

    -- Drop out of anything currently running before the mode disappears underneath it.
    for _, mode in ipairs(registered) do
        if da_mode.isActive(mode.name) then
            da_mode.deactivate(mode.name)
        end
    end

    -- da_lib's unregisterMode takes the mode *name*, not the definition table.
    for _, mode in ipairs(registered) do
        _unregister(mode.name)
        pending[#pending + 1] = mode
    end

    log.warn("authorization revoked - dev tools disabled")
    registered = {}
end

RegisterNetEvent("da_dev:auth:result", function(ok)
    if ok then grant() else revoke() end
end)

local function request()
    TriggerServerEvent("da_dev:auth:request")
end

-- Ask on load, and again on spawn: the first request can land before the player is
-- fully connected on a fresh join.
Citizen.CreateThread(function()
    Citizen.Wait(500)
    request()
end)

AddEventHandler("playerSpawned", request)

-- Other da_dev files check this before doing anything that isn't mode-gated
-- (console commands, NUI callbacks).
_ENV.da_dev_authorized = function() return authorized end
