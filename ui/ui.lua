CurrentTree = "optionTree"

Citizen.CreateThread(function()
    local z = 0x26E9DC00
    while true do
        Citizen.Wait(5)
        -- if (IsControlJustPressed(0, z) and IsInputDisabled(0)) then
        -- end
        if (IsControlJustReleased(0, z) and IsInputDisabled(0)) and not IsDisabledControlPressed(0, 0xD7DE6B1E) then
            SetNuiFocus(true, false)
            SetNuiFocusKeepInput(false)
            SendNUIMessage({
                type = "displayHUD",
                value = "devTreeHUD",
                optionTree = da.Dev.Menu.GetTree(CurrentTree),
            })
        end
    end
end)

RegisterNUICallback('exit', function(data, cb)
    SetNuiFocus(false, false)
    da.Control.Passthrough(false)
    cb(true)
end)

RegisterNUICallback('trigger', function(data, cb)
    SetNuiFocus(false, false)
    da.Dev.Menu.TriggerOption(data.menuName, data.optionName, data.params)
    cb(true)
end)

-- Animations

RegisterNUICallback('animHUD', function(data, cb)
    SetNuiFocus(true, true)
    cb(true)
end)

RegisterNUICallback('controlPass', function(data, cb)
    local enable = data.enable
    -- da.Log.Debug("controlPassthrough")
    SetNuiFocusKeepInput(data.enable)
    da.Control.Passthrough(data.enable)
    cb(true)
end)

RegisterNUICallback('transitionControl', function(data, cb)
    da.Log.DebugVerbose("transitionControl:", data)
    -- Handle any transition away
    if data.from == "animHUD" then
        da.Control.Passthrough(false)
        SetNuiFocus(false, false)
    end

    -- Handle any transition to
    if data.to == "devTreeHUD" then
        SetNuiFocus(true, false)
        SetNuiFocusKeepInput(false)
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

RegisterNUICallback('initAnimFlags', function(data, cb)
    cb({ flags = json.encode(AnimFlags) })
end)

RegisterNUICallback('initIKAnimFlags', function(data, cb)
    cb({ flags = json.encode(IKFlags) })
end)

AddEventHandler('onResourceStop', function(resourceName)
    if resourceName == GetCurrentResourceName() then
        SetNuiFocus(false, false)
        SetNuiFocusKeepInput(false)
        da.Control.Passthrough(false)
    end
end)
