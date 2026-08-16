-- Authorization gate for the dev kit.
--
-- da_dev hands out freecam, teleport, entity spawning and scene editing. None of that
-- belongs on a production server, but keeping two copies of the resources folder is
-- how people end up shipping the dev build by accident. So the gate lives here and is
-- driven by a convar, letting the same folder deploy to dev and prod unchanged.
--
--   setr da_dev_enabled 0   (default) resource stops at boot. Production.
--   setr da_dev_enabled 1             runs, but each player must pass an ACE check.
--   setr da_dev_enabled 2             runs, every player allowed. Solo/local dev only.
--
-- Level 1 is the useful one on a shared dev server:
--   add_ace group.admin da_dev allow
--
-- Level 0 is the only real security boundary. A stopped resource is never sent to
-- connecting clients, so there is nothing on their machine to bypass. The ACE check at
-- level 1 gates client-side code and stops honest users wandering in; it will not stop
-- someone running an injector. That tradeoff is documented for server owners rather
-- than papered over -- see docs/SECURITY.md in the toolkit repo.

local ACE = "da_dev"
local CONVAR = "da_dev_enabled"

local level = GetConvarInt(CONVAR, 0)

Citizen.CreateThread(function()
    -- Yield once: stopping a resource from inside its own startup pass is racy.
    Citizen.Wait(0)

    if level < 1 then
        log.warn(("%s is %d - All da_dev kit permissions disabled. Set `setr %s 1` to enable.")
            :format(CONVAR, level, CONVAR))
        StopResource(GetCurrentResourceName())
        return
    end

    if level >= 2 then
        log.warn(("%s is %d - ALL players are authorized to use da_dev tools.")
            :format(CONVAR, level))
    else
        log.info(("%s is %d - ACE permissions enabled. Grant with: add_ace group.admin %s allow")
            :format(CONVAR, level, ACE))
    end
end)

local function isAuthorized(src)
    if level < 1 then return false end
    if level >= 2 then return true end
    return IsPlayerAceAllowed(src, ACE)
end

RegisterNetEvent("da_dev:auth:request", function(reason)
    local src = source
    local ok = isAuthorized(src)

    if ok then
        log.info(("permission authorized %s (%d) %s"):format(GetPlayerName(src) or "?", src, reason or ""))
    else
        log.debug(("permission denied %s (%d) %s"):format(GetPlayerName(src) or "?", src, reason or ""))
    end

    TriggerClientEvent("da_dev:auth:result", src, ok)
end)

-- Re-check everyone without a restart, after editing ACEs at runtime.
RegisterCommand("da_dev_reauth", function(src)
    -- Console only (src 0). Players re-checking their own grant is what the client
    -- request path is for.
    if src ~= 0 then return end

    for _, pid in ipairs(GetPlayers()) do
        pid = tonumber(pid)
        TriggerClientEvent("da_dev:auth:result", pid, isAuthorized(pid))
    end

    log.info("re-sent authorization to all players")
end, true)
