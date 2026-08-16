-- Access control for the dev kit.
--
-- da_dev is a development tool — editors, freecam, a placement gizmo. It's for building
-- things rather than playing on, so it stays off unless a server asks for it. Driving
-- that from a convar means one resources folder works on both a dev and a live server,
-- instead of maintaining two copies and remembering which is which.
--
--   setr da_dev_enabled 0   (default) doesn't load. Live servers.
--   setr da_dev_enabled 1             runs, each player needs the ACE check.
--   setr da_dev_enabled 2             runs, every player allowed. Local box only.
--
-- Level 1 is the useful one on a shared dev server:
--   add_ace group.admin da_dev allow
--
-- Note the ACE check gates client-side code, so it's the right tool for keeping the kit
-- to the right people on a dev server rather than something to lean on with untrusted
-- players connected — that's what level 0 is for, and why it's the default. See
-- docs/DEV-TOOLS.md in the devkit repo.

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
