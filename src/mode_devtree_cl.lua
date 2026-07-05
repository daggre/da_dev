local devTreeKeyMap = "z"
CurrentTree = "devRoot"

-- How the dev menu was opened this session:
--   tap `z`        → keyboard focus; stays open until Escape/selection
--   long-press `z` → cursor focus (mouse navigation); open only while held
local openWithCursor = false   -- read by onActivate/onPrimary to pick focus mode

local function applyFocus()
    if openWithCursor then
        SetNuiFocus(true, true)
        SetNuiFocusKeepInput(true)
        SetCursorLocation(0.5, 0.55)
    else
        SetNuiFocus(true, false)
        SetNuiFocusKeepInput(false)
    end
    -- tell freecam to freeze its mouse/movement during a cursor (mouse) session
    TriggerEvent("da_dev:cursorGrab", "devTree", openWithCursor)
end

da_mode.register({
    name = "devTree",
    priority = 80,
    disableGame = true, -- suppress game mode keymaps
    onActivate = function()
        applyFocus()
        da_ui.send("ui_trie", { trie = da_trie.get(CurrentTree), cursor = openWithCursor })
    end,
    onDeactivate = function()
        if not da_mode.isPrimary("devTree") then return end
        SetNuiFocus(false, false)
        SetNuiFocusKeepInput(false)
        da_ui.send("ui_trie", { state = false })
        TriggerEvent("da_dev:cursorGrab", "devTree", false)
        openWithCursor = false
    end,
    onPrimary = function()
        applyFocus()
    end,
    keymaps = {
        {
            key = devTreeKeyMap, -- default z
            event = "justPressed",
            fn = function()
                if da_mode.isActive("gizmo") then return end
                da_control.trackShortPress(devTreeKeyMap, function()
                    openWithCursor = false
                    da_mode.activate("devTree")
                end, 150)
                da_control.trackLongPress(devTreeKeyMap, function()
                    openWithCursor = true
                    da_mode.activate("devTree")
                    Citizen.CreateThread(function()
                        while da_mode.isActive("devTree") do
                            DisableAllControlActions(0)
                            Citizen.Wait(0)
                        end
                    end, 150)
                end)
            end
        },
        {
            key = devTreeKeyMap,
            event = "justReleased",
            active = true,
            fn = function()
                log.debug("justReleased")
                if openWithCursor then
                    da_mode.deactivate("devTree")
                    openWithCursor = false
                end
            end,
        }
    }
})

da_net.events({
    ["onResourceStop"] = function(resourceName)
        if resourceName == GetCurrentResourceName() then
            da_mode.deactivate("devTree")
            da_mode.unregister("devTree")
            SetNuiFocus(false, false)
            SetNuiFocusKeepInput(false)
            da_controlpass:set(false)
        end
    end,
})
