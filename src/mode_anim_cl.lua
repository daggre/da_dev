local animMCPState = false
Citizen.CreateThread(function()
    da_mode.register({
        name = "animation",
        priority = 70,
        onActivate = function()
            SetNuiFocus(true, true)
            da_ui.send("ui_animation", {})
            if animMCPState then
                da_mode.activateMCP("animation")
            end
        end,
        onDeactivate = function()
            da_mcp.deactivate()
            da_ui.send("ui_animation", { state = false })
            SetNuiFocus(false, false)
            SetNuiFocusKeepInput(false)
        end,
        onPrimary = function()
            SetNuiFocus(true, true)
            SetNuiFocusKeepInput(false)
            if animMCPState then
                da_mode.activateMCP("animation")
                SetNuiFocus(true, false)
                SetNuiFocusKeepInput(true)
            end
        end,
        onLosePrimary = function()
            da_mcp.deactivate()
        end,
        activateMCP = function()
            if da_mcp.active then return; end
            da_mcp.activate({
                key = dat.keyHash['MouseScrollClick'],
                activate = function()
                    da_ui.send("mcp", { active = true, })
                    if not da_mode.isPrimary("animation") then return end
                    animMCPState = true
                    SetNuiFocus(true, false)
                    SetNuiFocusKeepInput(true)
                end,
                deactivate = function()
                    da_ui.send("mcp", { active = false, })
                    if not da_mode.isPrimary("animation") then return end
                    da_control.waitForRelease(dat.keys)
                    animMCPState = false
                    SetNuiFocus(true, true)
                    SetNuiFocusKeepInput(false)
                end,
            })
        end,
        keymaps = {
            {
                key = "Escape3",
                event = "justPressed",
                primary = true,
                fn = function()
                    da_mode.deactivate("animation")
                end,
            },
        }
    })
end)

da_ui.events({
    activateMCP = function(data)
        da_mode.activateMCP(data.mode)
    end,
    deactivateMCP = function(data)
        da_mcp.deactivate()
    end,
})

da_trie.addOpt("devRoot", "anim mode", "a", function() da_mode.toggle("animation") end)
