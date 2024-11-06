local SkipNext = false
CurrentTree = "devRoot"

do
    local setting = { ui = {}, }
    setting.ui.nearby = { object = true, ped = true, vehicle = true, other = false, origin = "camera", range = 50, }

    -- Init settings
    for k1, category in pairs(setting) do
        for k2, catSetting in pairs(category) do
            local key = "setting:"..k1..":"..k2
            if kvp.init(key, catSetting) then
                log.info("Initialized kvp "..key)
            end
        end
    end
end

RegisterCommand("dadev_setting_remove", function(source, args, rawCommand)
    if not args[1] then
        log.info("Usage: Remove setting stored under key 'setting:<setting>'\n\t/dadev_setting_clear <setting>")
        return
    end

    local key = "setting:"..args[1]
    if kvp.decode(key) == nil then
        log.error("Setting '" .. key .. "' already clear")
        return
    end

    kvp.delete(key)
    log.info("Cleared setting "..key)
end, false)

da_trie.addRoot("devRoot")
da_trie.addRoot("objRoot")

RegisterNUICallback('runOption', function(data, cb)
    da_trie.run(data.menu, data.option)
    da_mode.stop("devTree")
    cb(true)
end)

RegisterNUICallback('initObjSettings', function(data, cb)
    cb({ nearby = kvp.rawget("setting:ui:nearby") })
end)

RegisterNUICallback('setObjSettings', function(data, cb)
    kvp.rawset("setting:ui:nearby", data.nearby)
    cb(true)
end)

RegisterNUICallback('chooseMenu', function(data, cb)
    SendNUIMessage({
        type = "displayHUD",
        value = "devTreeHUD",
        tree = da_trie.get(data.menu)
    })
    cb(true)
end)

da_mode.new("devTree", {
    priority = 80,
    default = { focusKeyboard = true, focusCursor = false, keepFocus = false, },
    startFn = function()
        log.spam("devTree startFn")
        SendNUIMessage({
            type = "displayHUD",
            value = "devTreeHUD",
            tree = da_trie.get(CurrentTree)
        })
    end,
    updateFn = function(data)
        log.spam("devTree updateFn", data)
        SetNuiFocus(data.focusKeyboard, data.focusCursor)
        SetNuiFocusKeepInput(data.keepFocus)
        SendNUIMessage({ type = "controlPass", enable = data.passthrough, })
    end,
    stopFn = function()
        log.spam("devTree stopFn")
    end,
    controlMap = {
        {
            key = 'z',
            justReleased = {
                modifier = { ['Ctrl'] = false, },
                fn = function()
                    if SkipNext then
                        SkipNext = false
                        return
                    end
                    da_mode.start("devTree")
                end,
            },
            justPressed = {
                active = "devTree",
                fn = function() SkipNext = true end,
            },
        },
    },
})

RegisterNUICallback('endPassthrough', function(data, cb)
    log.debug("endPassthrough", da_controlpass:isActive())
    da_controlpass:set(false)
    cb(true)
end)

RegisterNUICallback('modifyMode', function(data, cb)
    log.debug("modifyMode called")
    da_mode.set(data.mode, data)
    cb(true)
end)

RegisterNUICallback('exit', function(data, cb)
    da_mode.stop("animation")
    da_mode.stop("devTree")
    cb(true)
end)

-- Animations
RegisterNUICallback('playAnim', function(data, cb)
    -- The flag anim has some linebreaks in it so I need to find out why
    log.debug("playAnim:" .. log.format(data))
    local entity = data.entity and tonumber(data.entity) or nil
    if data.entity and IsEntityAnObject(entity) and not IsEntityAPed(entity) then
        da_anim.object(
            tonumber(data.entity),
            data.animDict,
            data.animName
        )
    elseif data.type == "advanced" then
        local p14 = nil
        local p15 = nil
        local p16 = nil
        da_anim.adv(
            entity or PlayerPedId(),
            data.animDict,
            data.animName,
            tonumber(data.posX),
            tonumber(data.posY),
            tonumber(data.posZ),
            tonumber(data.rotZ),
            tonumber(data.speed),
            tonumber(data.speedMultiplier),
            tonumber(data.duration),
            tonumber(data.flags),
            tonumber(data.animTime),
            p14,
            p15,
            p16
        )
    else
        da_anim.ped(
            entity or PlayerPedId(),
            data.animDict,
            data.animName,
            tonumber(data.blendInSpeed),
            tonumber(data.blendOutSpeed),
            tonumber(data.duration),
            tonumber(data.flag),
            tonumber(data.playbackRate),
            tonumber(data.ikFlag),
            data.taskFilter
        )
    end
    cb(true)
end)

RegisterNUICallback('stopAnim', function(data, cb)
    local ped = data.entity or PlayerPedId()
    ClearPedTasksImmediately(ped)
    cb(true)
end)

RegisterNUICallback('initAnims', function(data, cb)
    cb({animations = json.encode(dat.animation)})
end)

RegisterNUICallback('initObjects', function(data, cb)
    cb({
        peds = json.encode(dat.ped),
        objects = json.encode(dat.object),
        pickups = json.encode(dat.pickup),
        vehicles = json.encode(dat.vehicle),
        propsets = json.encode(dat.propset),
    })
end)

RegisterNUICallback('initAnimFlags', function(data, cb)
    cb({flags = json.encode(dat.flags.anim)})
end)

RegisterNUICallback('initIKAnimFlags', function(data, cb)
    cb({flags = json.encode(dat.flags.ik)})
end)

AddEventHandler('onResourceStop', function(resourceName)
    if resourceName == GetCurrentResourceName() then
        SetNuiFocus(false, false)
        SetNuiFocusKeepInput(false)
        da_controlpass:set(false)
    end
end)

