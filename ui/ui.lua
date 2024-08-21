CurrentTree = "optionTree"

Citizen.CreateThread(function()
    while true do
        Citizen.Wait(5)
        local pressed = da.Control.GetPressed({ "Control" })
        local justReleased = da.Control.GetJustReleased({ "z" })
        if justReleased.z and not pressed.Control then
            da.Mode.Add("devTree")
            SendNUIMessage({
                type = "displayHUD",
                value = "devTreeHUD",
                optionTree = da.Dev.Menu.GetTree(CurrentTree),
            })
        end
    end
end)

RegisterNUICallback('endPassthrough', function(data, cb)
    da.Control.Passthrough(false)
    cb(true)
end)

RegisterNUICallback('modifyMode', function(data, cb)
    da.Mode.Modify(data.mode, data)
    cb(true)
end)

RegisterNUICallback('exit', function(data, cb)
    da.Mode.Remove("animation")
    da.Mode.Remove("devTree")
    cb(true)
end)

RegisterNUICallback('trigger', function(data, cb)
    da.Log.Debug("trigger data:", data)
    da.Mode.Remove("devTree")
    da.Dev.Menu.TriggerOption(data.menuName, data.optionName, data.params)
    cb(true)
end)

-- Animations
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
        local p14 = nil
        local p15 = nil
        local p16 = nil
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
    cb({ animations = json.encode(da.Data.Animations()) })
end)

RegisterNUICallback('initObjects', function(data, cb)
    cb({
        objects = json.encode(da.Data.GetObjects()),
        peds = json.encode(da.Data.GetPeds()),
        vehicles = json.encode(da.Data.GetVehicles()),
        pickups = json.encode(da.Data.GetPickups()),
        propsets = json.encode(da.Data.Propsets()),
    })
end)

RegisterNUICallback('initAnimFlags', function(data, cb)
    cb({ flags = json.encode(da.Data.GetAnimFlags())})
end)

RegisterNUICallback('initIKAnimFlags', function(data, cb)
    cb({ flags = json.encode(da.Data.GetIkFlags())})
end)

AddEventHandler('onResourceStop', function(resourceName)
    if resourceName == GetCurrentResourceName() then
        SetNuiFocus(false, false)
        SetNuiFocusKeepInput(false)
        da.Control.Passthrough(false)
    end
end)

