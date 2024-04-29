Citizen.CreateThread(function()
    local z = 0x26E9DC00
    while true do
        Citizen.Wait(5)
        -- if (IsControlJustPressed(0, z) and IsInputDisabled(0)) then
        -- end
        if (IsControlJustReleased(0, z) and IsInputDisabled(0)) then
            SetNuiFocus(true, false)
            SendNUIMessage({
                type = "show",
                optionTree = da.Dev.Menu.GetTree("optionTree"),
            })
        end
    end
end)

RegisterNUICallback('exit', function(data, cb)
    SetNuiFocus(false, false)
    cb({})
end)

RegisterNUICallback('trigger', function(data, cb)
    SetNuiFocus(false, false)
    da.Dev.Menu.TriggerOption(data.menuName, data.optionName, data.params)
    cb({})
end)
