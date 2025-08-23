local SkipNext = false
local devTreeKeyMap = "z"
CurrentTree = "devRoot"

da_mode.register({
    name = "devTree",
    priority = 80,
    onActivate = function()
        SetNuiFocus(true, false)
        SetNuiFocusKeepInput(false)
        da_ui.send("ui_trie", { trie = da_trie.get(CurrentTree) })
    end,
    onDeactivate = function()
        if not da_mode.isPrimary("devTree") then return end
        SetNuiFocus(false, false)
        SetNuiFocusKeepInput(false)
    end,
    onPrimary = function()
        SetNuiFocus(true, false)
        SetNuiFocusKeepInput(false)
    end,
    keymaps = {
        {
            key = devTreeKeyMap,
            event = "justReleased",
            modifiers = { ctrl = false },
            fn = function()
                if SkipNext then
                    SkipNext = false
                    return
                end
                if da_mode.isActive("gizmo") then return end
                da_mode.activate("devTree")
            end
        },
        {
            key = devTreeKeyMap,
            event = "justPressed",
            active = true,
            fn = function()
                log.debug("mode devTree SkipNext")
                SkipNext = true
            end
        },
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
