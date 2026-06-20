local animMCPState = false
Citizen.CreateThread(function()
    da_mode.register({
        name = "animation",
        priority = 70,
        onActivate = function()
            SetNuiFocus(true, true)
            SetCursorLocation(0.5, 0.5)
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
                fn = function() da_mode.deactivate("animation") end,
            },
        }
    })
end)

local PlayAnimation = function(anim)
    local entity = tonumber(anim.config.entity) ~= 0 and tonumber(anim.config.entity) or PlayerPedId()
    local objType = da_obj.getType(GetEntityModel(entity))
    if objType == nil or objType == "object" then
        da_anim.object(
            entity,
            anim.dict,
            anim.name,
            nil,
            anim.config.loop,
            anim.config.stayInAnim,
            nil,
            anim.config.delta,
            anim.config.bitset
        )
    elseif objType == "ped" then
        da_anim.ped(
            entity,
            anim.dict,
            anim.name,
            anim.config.blendin,
            anim.config.blendout,
            anim.config.duration,
            anim.config.flags,
            anim.config.rate,
            anim.config.ikflags,
            anim.config.taskfilter
        )
    elseif objType == "vehicle" then
        log.warn("Animations are not supported for vehicles")
    elseif objType == "propset" then
        log.warn("Animations are not supported for propsets")
    elseif objType == "pickup" then
        log.warn("Animations are not supported for pickup")
    end
    log.debug("da_mode_anim_cl PlayAnimation played", anim, objType)
end

local PlayConfiguredAnimations = function(data)
    for _, anim in pairs(data.animations) do
        Citizen.CreateThread(function()
            local delay = tonumber(anim.config.delay) and tonumber(anim.config.delay) or 0
            if delay > 0 then Citizen.Wait(delay) end
            log.debug("da_mode_anim_cl PlayConfiguredAnimations playing", anim)
            PlayAnimation(anim)
        end)
    end
end

da_ui.callbacks({
    playAnimation = function(data) PlayAnimation(data) end,
    playAnimations = function(data) PlayConfiguredAnimations(data) end,
    stopAnimation = function(data) da_anim.stop(data.entity or PlayerPedId()) end,
    getEntityType = function(data)
        local entity = tonumber(data.entity) ~= 0 and tonumber(data.entity) or PlayerPedId()
        local objType = da_obj.getType(GetEntityModel(entity))
        log.debug("da_ui.events getEntityType", entity, objType)
        return { entityType = objType or "ped" }
    end,
    activateMCP = function(data)
        local retval = da_mode.activateMCP(data.mode)
        log.spam("da_ui.events activateMCP retval", data, retval)
        return retval
    end,
    deactivateMCP = function(data)
        local retval = da_mcp.deactivate()
        log.spam("da_ui.events deactivateMCP retval", data, retval)
        return retval
    end,
})

da_trie.addOpt("devRoot", "anim mode", "a", function() da_mode.toggle("animation") end)
