-- Remote dev-menu registry: any resource can put an entry in the dev tree from its own code, via
-- @da_lib/features/devmenu/devmenu_cl.lua. da_dev knows nothing about it beyond a parent, a name,
-- a key and an id, and calls the owner back when the player picks it.
--
-- Why not a stub file here (the old src/tack_cl.lua shape, one per resource): a stub registers
-- whether or not the owning resource is loaded, so an absent feature leaves a menu item that does
-- nothing when pressed. An entry registered from the owner appears with the owner and is pulled
-- when it stops — see onResourceStop below.
--
-- Loads LAST in the client script list so da_dev's own file-scope entries have claimed their keys
-- first: a remote key collides against those, not the other way round.

local Owned = {}   -- [owner] = { [id] = { kind = , parent = , name = } }

-- Both call back into the owner's runtime, where the closure lives. pcall because the owner can
-- stop between the menu being built and the player picking something — a dead export must not
-- take the dev menu down with it.
local function fire(owner, id)
    return function()
        local ok, err = pcall(function() exports[owner]:daDevMenuFire(id) end)
        if not ok then
            log.error(("dev menu: %s failed to handle its option: %s"):format(owner, tostring(err)))
        end
    end
end

local function gate(owner, id)
    return function()
        local ok, allowed = pcall(function() return exports[owner]:daDevMenuCondition(id) end)
        return ok and allowed
    end
end

local function remove(owner, id)
    local entry = Owned[owner] and Owned[owner][id]
    if not entry then return false end

    if entry.kind == "menu" then
        da_trie.clear(entry.name)
    else
        da_trie.removeOpt(entry.parent, entry.name)
    end
    Owned[owner][id] = nil
    return true
end

local function clear(owner)
    if not Owned[owner] then return false end

    for id in pairs(Owned[owner]) do
        remove(owner, id)
    end
    Owned[owner] = nil
    return true
end

local function register(owner, def)
    if type(owner) ~= "string" or type(def) ~= "table" then return false end
    if not (def.parent and def.name and def.key and def.id) then
        log.error(("dev menu: %s sent an incomplete entry (parent/name/key/id required)"):format(tostring(owner)))
        return false
    end

    -- A replay after a da_dev restart re-sends entries we may already hold; the trie's duplicate-key
    -- check does not exempt an entry from itself, so drop the old one first.
    remove(owner, def.id)

    local condition = def.condition and gate(owner, def.id) or nil
    local ok
    if def.kind == "menu" then
        ok = da_trie.add(def.parent, def.name, def.key, condition, def.label)
    else
        ok = da_trie.addOpt(def.parent, def.name, def.key, fire(owner, def.id), condition, def.label)
    end
    if not ok then return false end

    Owned[owner] = Owned[owner] or {}
    Owned[owner][def.id] = { kind = def.kind, parent = def.parent, name = def.name }
    log.debug(("dev menu: %s registered %s '%s' under %s (%s)")
        :format(owner, def.kind == "menu" and "submenu" or "option", def.name, def.parent, def.key))
    return true
end

exports("devMenuRegister", function(owner, def) return register(owner, def) end)
exports("devMenuClear", function(owner) return clear(owner) end)

da_net.events({
    ["onResourceStop"] = function(resource)
        if resource == GetCurrentResourceName() then return end
        clear(resource)
    end,
})

-- The knock. Owners already running when da_dev starts (or restarts) have no other way to learn
-- the registry is up. Deferred a tick so every file-scope registration above has run.
Citizen.CreateThread(function()
    Citizen.Wait(0)
    TriggerEvent("da_dev:menuReady")
end)
