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
            return da_mcp.activate({
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

local PlayAnimation = function(data)
    local entity = data.entity or PlayerPedId()
    da_anim.ped(entity, data.animDict, data.anim)
end

da_ui.callbacks({
    playAnimation = function(data) PlayAnimation(data) end,
    activateMCP = function(data)
        log.debug("da_ui.events activateMCP", data)
        local retval = da_mode.activateMCP(data.mode)
        log.debug("da_ui.events activateMCP retval", retval)
        return retval
    end,
    deactivateMCP = function(data)
        log.debug("da_ui.events deactivateMCP", data)
        local retval = da_mcp.deactivate()
        log.debug("da_ui.events deactivateMCP retval", retval)
        return retval
    end,
})

da_trie.addOpt("devRoot", "anim mode", "a", function() da_mode.toggle("animation") end)
