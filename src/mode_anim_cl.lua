Citizen.CreateThread(function()
    da_mode.register({
        name = "animation",
        priority = 70,
        onActivate = function()
            SetNuiFocus(true, true)
            da_ui.send("ui", { mode = "animation" })
        end,
        onDeactivate = function()
            da_mcp.deactivate()
            da_ui.send("ui", { mode = "animation", state = "off" })
            log.debug("Restoring Nui anim mode onDeactivate")
            SetNuiFocus(false, false)
            SetNuiFocusKeepInput(false)
        end,
        onPrimary = function()
            SetNuiFocus(true, true)
        end,
        activateMCP = function()
            da_mcp.activate({
                key = da_control.keyHash['MouseScrollClick'],
                activate = function()
                    SetNuiFocus(true, false)
                    SetNuiFocusKeepInput(true)
                end,
                deactivate = function()
                    log.debug("deactivating mcp for anim mode")
                    if not da_mode.isPrimary("animation") then return end
                    SetNuiFocus(true, true)
                    SetNuiFocusKeepInput(false)
                end,
            })
        end,
        keymaps = {
            escape = {
                justReleased = {
                    active = true,
                    fn = function()
                        da_mode.deactivate("animation")
                    end,
                }
            },
            -- c = {
            --     justReleased = {
            --         active = true,
            --         fn = function()
            --             da_mcp.deactivate()
            --         end,
            --     }
            -- },
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

da_trie.addOpt("devRoot", "devkit:anim", "a", function()
    da_mode.toggle("animation")
end)
