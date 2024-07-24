CurrentTree = "optionTree"

Citizen.CreateThread(function()
    local z = 0x26E9DC00
    while true do
        Citizen.Wait(5)
        -- if (IsControlJustPressed(0, z) and IsInputDisabled(0)) then
        -- end
        if (IsControlJustReleased(0, z) or IsDisabledControlJustReleased(0, z)) and not IsDisabledControlPressed(0, 0xD7DE6B1E) then
            da.Dev.Mode.Add("devTree")
            SendNUIMessage({
                type = "displayHUD",
                value = "devTreeHUD",
                optionTree = da.Dev.Menu.GetTree(CurrentTree),
            })
        end
    end
end)

RegisterNUICallback('exit', function(data, cb)
    da.Dev.Mode.Remove("anim")
    da.Dev.Mode.Remove("devTree")
    cb(true)
end)

RegisterNUICallback('trigger', function(data, cb)
    da.Dev.Mode.Remove("devTree")
    da.Dev.Menu.TriggerOption(data.menuName, data.optionName, data.params)
    cb(true)
end)

-- Animations

RegisterNUICallback('animHUD', function(data, cb)
    da.Dev.Mode.Add("anim")
    cb(true)
end)

RegisterNUICallback('transitionControl', function(data, cb)
    da.Log.DebugVerbose("transitionControl:", data)
    -- Handle any transition away
    if data.from == "animHUD" then
        da.Dev.Mode.Remove("anim")
    end

    -- Handle any transition to
    if data.to == "devTreeHUD" then
        da.Dev.Mode.Add("devTree")
    end

    cb(true)
end)

RegisterNUICallback('playAnim', function(data, cb)
    -- The flag anim has some linebreaks in it so I need to find out why
    da.Log.Debug("playAnim:", data)
    local entity = data.entity and tonumber(data.entity) or nil
    if data.entity and IsEntityAnObject(entity) and not IsEntityAPed(entity) then
        da.Anim.Object(
            tonumber(data.entity),
            data.animDict,
            data.animName
        )
    elseif data.type == "advanced" then
        da.Anim.Adv(
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
        da.Anim.Ped(
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
    cb({ animations = json.encode(Animations) })
end)

RegisterNUICallback('initObjects', function(data, cb)
    cb({
        objects = json.encode(Objects),
        peds = json.encode(Peds),
        vehicles = json.encode(Vehicles),
        pickups = json.encode(Pickups),
        propsets = json.encode(Propsets),
    })
end)

RegisterNUICallback('initAnimFlags', function(data, cb)
    cb({ flags = json.encode(AnimFlags) })
end)

RegisterNUICallback('initIKAnimFlags', function(data, cb)
    cb({ flags = json.encode(IKFlags) })
end)

