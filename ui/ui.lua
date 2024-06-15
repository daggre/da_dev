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
                type = "show",
                optionTree = da.Dev.Menu.GetTree(CurrentTree),
            })
        end
    end
end)

RegisterNUICallback('exit', function(data, cb)
    SetNuiFocus(false, false)
    da.Control.Passthrough(false)
end)

RegisterNUICallback('trigger', function(data, cb)
    SetNuiFocus(false, false)
    da.Dev.Menu.TriggerOption(data.menuName, data.optionName, data.params)
end)

-- Animations

RegisterNUICallback('animHUD', function(data, cb)
    SetNuiFocus(true, true)
    -- SetNuiFocusKeepInput(true)
    -- da.Control.Passthrough(true)
end)

RegisterNUICallback('controlPass', function(data, cb)
    da.Log.Debug("controlPassthrough")
    SetNuiFocusKeepInput(true)
    da.Control.Passthrough(true)
end)

RegisterNUICallback('controlPassEnd', function(data, cb)
    da.Log.Debug("controlPassthroughEnd")
    SetNuiFocusKeepInput(false)
    da.Control.Passthrough(false)
end)



RegisterNUICallback('playAnim', function(data, cb)
    -- The flag anim has some linebreaks in it so I need to find out why
    -- da.Log.Debug("playAnim:", data)
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
            data.blendInSpeed,
            data.blendOutSpeed,
            data.duration,
            data.flag,
            data.playbackRate,
            data.ikFlags,
            data.taskFilter
        )
    end
end)

RegisterNUICallback('stopAnim', function(data, cb)
    local ped = data.entity or PlayerPedId()
    ClearPedTasksImmediately(ped)
end)

RegisterNUICallback('initAnims', function(data, cb)
    cb({ animations = json.encode(Animations) })
end)

AddEventHandler('onResourceStop', function(resourceName)
    if resourceName == GetCurrentResourceName() then
        SetNuiFocus(false, false)
        SetNuiFocusKeepInput(false)
        da.Control.Passthrough(false)
    end
end)
