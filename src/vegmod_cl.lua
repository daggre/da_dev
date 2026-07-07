-- Dev menu for testing da_vegmod veg-modifier spheres.
-- Raycasts from the camera; drops a sphere at the hit point.
--   devRoot > vegmod:
--     local  -- client-only sphere at the raycast hit (not synced)
--     net    -- networked sphere (synced to server, echoed to all clients)
--     clear  -- remove every sphere this client has spawned

local RAYCAST_DISTANCE = 100.0

-- Camera raycast -> world position, or nil if nothing was hit within range.
local function hitCoords()
    local hit, endPos = da_raycast.get(RAYCAST_DISTANCE)
    if hit ~= 1 then
        log.warn(("vegmod: raycast hit nothing within %.0fm"):format(RAYCAST_DISTANCE))
        return nil
    end
    return endPos
end

local function spawn(network)
    local coords = hitCoords()
    if not coords then return end
    local handle = da_vegmod.add(coords, { network = network })
    log.info(("vegmod: %s sphere %s at %.2f, %.2f, %.2f")
        :format(network and "networked" or "local", tostring(handle), coords.x, coords.y, coords.z))
end

-- Networked sphere the server auto-removes after `seconds` (server-owned timer).
local function spawnTimed(seconds)
    local coords = hitCoords()
    if not coords then return end
    local handle = da_vegmod.timed(coords, seconds)
    log.info(("vegmod: timed sphere %s at %.2f, %.2f, %.2f (server removes in %ds)")
        :format(tostring(handle), coords.x, coords.y, coords.z, seconds))
end

da_trie.add("devRoot", "vegmod", "m")

da_trie.addOpt("vegmod", "local", "l", function() spawn(false) end)
da_trie.addOpt("vegmod", "net", "n", function() spawn(true) end)
da_trie.addOpt("vegmod", "timed 30s", "t", function() spawnTimed(30) end)
da_trie.addOpt("vegmod", "timed 2m", "2", function() spawnTimed(120) end)
da_trie.addOpt("vegmod", "clear", "x", function()
    log.info(("vegmod: cleared %d sphere(s)"):format(da_vegmod.clear()))
end)
da_trie.addOpt("vegmod", "list client vegmods", "c", function() log.info(da_vegmod.Client) end)
da_trie.addOpt("vegmod", "list server vegmods", "s", function() log.info(da_vegmod.Server) end)
