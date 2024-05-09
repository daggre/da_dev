Citizen.CreateThread(function()
    local z = 0x26E9DC00
    while true do
        Citizen.Wait(5)
        -- if (IsControlJustPressed(0, z) and IsInputDisabled(0)) then
        -- end
        if (IsControlJustReleased(0, z) and IsInputDisabled(0)) then
            SetNuiFocus(true, false)
            SetNuiFocusKeepInput(false)
            SendNUIMessage({
                type = "show",
                optionTree = da.Dev.Menu.GetTree("optionTree"),
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
    SetNuiFocusKeepInput(true)
    da.Control.Passthrough(true)
end)

RegisterNUICallback('playAnim', function(data, cb)
    if data.entity and data.entity ~= "entity" then
        -- TODO improve this
        da.Anim.Object(
            tonumber(data.entity),
            data.animDict,
            data.animName
        )
    elseif data.type == "advanced" then
        da.Anim.Adv(
            tonumber(data.entity) or PlayerPedId(),
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
            PlayerPedId(),
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
