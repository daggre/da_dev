local devTreeKeyMap = "z"
CurrentTree = "devRoot"

-- How the dev menu was opened this session:
--   tap `z`        → keyboard focus; stays open until Escape/selection
--   long-press `z` → cursor focus (mouse navigation); open only while held
--                    (mirrors da_xinteracts' hold-to-interact)
local openWithCursor = false   -- read by onActivate/onPrimary to pick focus mode
local sessionCursor = false    -- the live session was opened by holding `z`
local pending = false          -- `z` is down, not yet resolved to tap vs hold

local function applyFocus()
    if openWithCursor then
        -- keep game input alive (KeepInput) so the control loop can still see the
        -- `z` release that closes a hold-session, even under NUI cursor focus.
        SetNuiFocus(true, true)
        SetNuiFocusKeepInput(true)
        -- drop the pointer at top-middle, just above the bottom-anchored menu, so
        -- the user moves the cursor down onto the options (cf. da_xinteracts).
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
    onActivate = function()
        applyFocus()
        -- `cursor` tells the UI this is a hold/mouse session so it ignores keyboard
        -- shortcuts (otherwise the held `z` instantly fires the menu's `z` option).
        da_ui.send("ui_trie", { trie = da_trie.get(CurrentTree), cursor = openWithCursor })
    end,
    onDeactivate = function()
        if not da_mode.isPrimary("devTree") then return end
        SetNuiFocus(false, false)
        SetNuiFocusKeepInput(false)
        da_ui.send("ui_trie", { state = false })
        TriggerEvent("da_dev:cursorGrab", "devTree", false)
        openWithCursor = false
        sessionCursor = false
        pending = false
    end,
    onPrimary = function()
        applyFocus()
    end,
})

-- Open trigger: distinguish a quick tap (keyboard menu) from a hold (cursor menu).
-- Replaces the old mode keymaps. Control reads are disabled-control aware, so this
-- still fires while another mode (e.g. object) holds NUI focus.
Citizen.CreateThread(function()
    while true do
        Citizen.Wait(0)
        if da_mode.isActive("gizmo") then
            pending = false
        else
            local longPressed = da_control.isLongPressed(devTreeKeyMap)

            if da_mode.isActive("devTree") then
                -- only hold-sessions auto-close on release; taps close via the UI
                if sessionCursor then
                    -- mouse-only selection: kill all game input each frame so the
                    -- held key/mouse don't move the player or camera (like
                    -- da_xinteracts). The NUI cursor still clicks, and the
                    -- disabled-control reads still see the `z` release below.
                    DisableAllControlActions(0)
                    if not longPressed then
                        da_mode.deactivate("devTree")
                    end
                end
            else
                local justPressed = da_control.isJustPressed({ devTreeKeyMap })
                local justReleased = da_control.isJustReleased({ devTreeKeyMap })
                if justPressed[devTreeKeyMap] then pending = true end
                if pending then
                    if longPressed then
                        pending = false
                        openWithCursor = true
                        sessionCursor = true
                        da_mode.activate("devTree")
                    elseif justReleased[devTreeKeyMap] then
                        pending = false
                        openWithCursor = false
                        sessionCursor = false
                        da_mode.activate("devTree")
                    end
                end
            end
        end
    end
end)

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
