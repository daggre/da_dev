-- devRoot > keys : live overlay of every control currently being pressed, named
-- (not hashed). Recreates the old "monitor active controls" tool — start opens a
-- small HUD window that updates each frame until stopped, so you can press a key
-- in-game and see which control(s) it maps to.
--
-- Control names + hashes come from dat.control (@da_lib/data/control.lua, sourced
-- from femga's rdr3_discoveries). Reads use pad index 0, matching da_control; a
-- handful of mount/lock-on controls live on other pad indices and won't show.

local Monitor = {
    active = false,
    lastSig = nil,   -- last sent signature, so we only push the UI on change
}

-- Every control that reads as pressed (or disabled-pressed) this frame.
local function pressedControls()
    local list = {}
    for _, ctrl in ipairs(dat.control) do
        if IsControlPressed(0, ctrl.hash) == 1
            or IsDisabledControlPressed(0, ctrl.hash) == 1 then
            list[#list + 1] = { name = ctrl.name, key = ctrl.key }
        end
    end
    return list
end

local function signature(list)
    local parts = {}
    for _, c in ipairs(list) do parts[#parts + 1] = c.name end
    return table.concat(parts, ",")
end

local KeyMon = {}

function KeyMon.start()
    if Monitor.active then
        log.warn("Key monitor already running")
        return
    end
    Monitor.active = true
    Monitor.lastSig = nil
    da_ui.send("ui_keymon", { state = true })
    Citizen.CreateThread(function()
        while Monitor.active do
            Citizen.Wait(0)
            local list = pressedControls()
            local sig = signature(list)
            -- Only message the UI when the pressed set actually changes, so we
            -- aren't pushing 60 identical updates/sec while a key is held.
            if sig ~= Monitor.lastSig then
                Monitor.lastSig = sig
                da_ui.send("ui_keymon", { controls = list })
            end
        end
    end)
    log.info("Key monitor started")
end

function KeyMon.stop()
    if not Monitor.active then
        log.warn("Key monitor is not running")
        return
    end
    Monitor.active = false
    da_ui.send("ui_keymon", { state = false })
    log.info("Key monitor stopped")
end

_ENV.da_keymon = KeyMon

-- devRoot > keys trie menu ----------------------------------------------------
da_trie.add("devRoot", "keys", "k")
da_trie.addOpt("keys", "start", "s", function() KeyMon.start() end,
    function() return not Monitor.active end)
da_trie.addOpt("keys", "stop", "x", function() KeyMon.stop() end,
    function() return Monitor.active end)

da_net.events({
    ["onResourceStop"] = function(resourceName)
        if resourceName == GetCurrentResourceName() then
            Monitor.active = false
        end
    end,
})
