local SkipNext = false
CurrentTree = "devRoot"

da_trie.addRoot("devRoot")
da_trie.addRoot("objRoot")

da_ui.callbacks({
    ["initAnims"] = function() return { animations = json.encode(dat.animation) } end,
    ["initAnimFlags"] = function() return { flags = json.encode(dat.flags.anim) } end,
    ["initIKAnimFlags"] = function() return { flags = json.encode(dat.flags.ik) } end,
    ["initObjSettings"] = function() return { nearby = kvp.rawget("setting:ui:nearby") } end,
    ["initObjects"] = function() return {
        peds = json.encode(dat.ped),
        objects = json.encode(dat.object),
        pickups = json.encode(dat.pickup),
        vehicles = json.encode(dat.vehicle),
        propsets = json.encode(dat.propset),
    } end,
})

da_ui.events({
    ["activateMode"] = function(data)
        da_mode.activate(data.mode)
    end,
    ["deactivateMode"] = function(data)
        da_mode.deactivate(data.mode)
    end,
    ["setObjSettings"] = function(data)
        kvp.rawset("setting:ui:nearby", data.nearby)
    end,
    ["playAnim"] = function(data)
        local entity = data.entity and tonumber(data.entity) or nil
        if data.entity and IsEntityAnObject(entity) and not IsEntityAPed(entity) then
            da_anim.object(
                tonumber(data.entity),
                data.animDict,
                data.animName)
        elseif data.type == "advanced" then
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
                nil, nil, nil)
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
                data.taskFilter)
        end
    end,
    ["stopAnim"] = function(data)
        ClearPedTasksImmediately(data.entity or PlayerPedId())
    end,
    ["runOption"] = function(data)
        da_trie.run(data.menu, data.option)
        da_mode.deactivate("devTree")
    end,
    ["chooseMenu"] = function(data)
        da_ui.send("ui", { mode = "tree", tree = da_trie.get(data.menu) })
    end,
    ["exit"] = function()
        da_mode.deactivate("animation"); da_mode.deactivate("devTree")
    end,
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

Citizen.CreateThread(function()
    da_mode.register({
        name = "devTree",
        priority = 80,
        onActivate = function()
            SetNuiFocus(true, false)
            da_ui.send("ui", { mode = "tree", tree = da_trie.get(CurrentTree) })
        end,
        onDeactivate = function()
            SetNuiFocus(false, false)
        end,
        keymaps = {
            z = {
                justReleased = {
                    modifiers = { ctrl = false },
                    fn = function()
                        if SkipNext then
                            SkipNext = false
                            return
                        end
                        da_mode.activate("devTree")
                    end
                },
                justPressed = {
                    active = true,
                    fn = function() SkipNext = true end
                },
            }
        }
    })
end)

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

