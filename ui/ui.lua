da_trie.addRoot("devRoot")
da_trie.addRoot("objRoot")

da_ui.callbacks({
    initAnims = function() return { animations = json.encode(dat.animation) } end,
    initAnimFlags = function() return { animflags = json.encode(dat.flags.anim) } end,
    initIKAnimFlags = function() return { animikflags = json.encode(dat.flags.ik) } end,
    initTaskFilters = function() return { taskfilters = json.encode(dat.taskFilter) } end,
    fetchSettings = function(data)
        local settings = {}
        for _, category in ipairs(data) do
            settings[category] = kvp.rawget("setting:ui:"..category)
        end
        return settings
    end,
    fetchObjects = function() return {
        ped = json.encode(dat.ped),
        object = json.encode(dat.object),
        pickup = json.encode(dat.pickup),
        vehicle = json.encode(dat.vehicle),
        propset = json.encode(dat.propset),
    } end,
})

da_ui.events({
    activateMode = function(data) da_mode.activate(data.mode) end,
    deactivateMode = function(data) da_mode.deactivate(data.mode) end,
    toggleMode = function(data) da_mode.toggle(data.mode) end,
    saveSettings = function(data)
        for category, values in pairs(data) do
            kvp.rawset("setting:ui:".. category, values)
        end
    end,
    playAnim = function(data)
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
    stopAnim = function(data)
        ClearPedTasksImmediately(data.entity or PlayerPedId())
    end,
    selectTrieOption = function(data)
        da_trie.run(data.menu, data.option)
        da_mode.deactivate("devTree")
    end,
    selectTrieMenu = function(data)
        da_ui.send("ui_trie", { trie = da_trie.get(data.menu) })
    end,
    exit = function()
        da_mode.deactivate("animation"); da_mode.deactivate("devTree")
    end,
})

Citizen.CreateThread(function()
    local setting = { ui = {}, }
    setting.ui.nearby = {
        object = true,
        ped = true,
        vehicle = true,
        other = false,
        origin = "camera",
        range = 50,
    }
    setting.ui.tags = { sort = "dist" }
    setting.ui.theme = {
        color = "cherry blossom",
        divider = "angle up",
        border = true,
        borderrad = false,
        borderradamount = 8,
    }
    setting.ui.objFavorites = { }

    -- Init settings
    for k1, category in pairs(setting) do
        for k2, catSetting in pairs(category) do
            local key = "setting:"..k1..":"..k2
            if kvp.init(key, catSetting) then
                log.info("Initialized kvp "..key)
            end
        end
    end

end)
