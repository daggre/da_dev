da.Dev.Menu.RegisterOption("root", "noclip", "z", function() da.Dev.NoClip() end)
da.Dev.Menu.RegisterOption("root", "revive", "r", function() TriggerEvent('TMC:Command:Revive') end, function() return LocalPlayer.state.metadata.isdead end)
da.Dev.Menu.RegisterOption("objectRoot", "noclip", "z", function() da.Dev.NoClip() end)
da.Dev.Menu.RegisterOption("objectRoot", "revive", "r", function() TriggerEvent('TMC:Command:Revive') end, function() return LocalPlayer.state.metadata.isdead end)

da.Dev.Menu.RegisterOption("root", "max cores", "9", function()
    local playerPedId = PlayerPedId()
    for i = 0, 1 do
        Citizen.InvokeNative(0xC6258F41D86676E0, playerPedId, i, 100) -- SetAttributeCoreValue
        EnableAttributeOverpower(playerPedId, i, 5000.0)
        -- Citizen.InvokeNative(0xF6A7C08DF2E28B28, playerPedId, i, 5000.0) -- SetAttributeOverpoweredAmount
    end

    local mount = GetMount(playerPedId)
    if mount then
        for i = 0, 1 do
            Citizen.InvokeNative(0xC6258F41D86676E0, mount, i, 100) -- SetAttributeCoreValue
            EnableAttributeOverpower(mount, i, 5000.0)
            -- Citizen.InvokeNative(0xF6A7C08DF2E28B28, mount, i, 5000.0) -- SetAttributeOverpoweredAmount
        end
    end
    -- Citizen.InvokeNative(0xC3D4B754C0E86B9E, PlayerPedId(), 1000) --ChangePedStamina
    -- Citizen.InvokeNative(0x835F131E7DC8F97A, PlayerPedId(), 1000) --ChangeEntityHeath
end)

da.Dev.Menu.RegisterMenu("root", "pos", "v")
da.Dev.Menu.RegisterOption("pos", "cpy vec2", "2", function() TriggerEvent("v2copycoords") end)
da.Dev.Menu.RegisterOption("pos", "cpy vec3", "3", function() TriggerEvent("v3copycoords") end)
da.Dev.Menu.RegisterOption("pos", "cpy vec4", "4", function() TriggerEvent("v4copycoords") end)

da.Dev.Menu.RegisterMenu("root", "menu", "m")
da.Dev.Menu.RegisterOption("menu", "clothing", "c", function() TriggerEvent('clothing:openMenu', true, false, true) end) -- Barber disabled
da.Dev.Menu.RegisterOption("menu", "horsetack", "h", function()
    local horseEntity, dist = TMC.Functions.GetClosestHorse()
    if dist > 25 or not horseEntity or not Entity(horseEntity) or not Entity(horseEntity).state then
        da.Log.Debug("No horse close enough")
        return
    end
    local horseId = Entity(horseEntity).state and Entity(horseEntity).state.horseId
    TriggerServerEvent('stables:server:getTack', horseId, horseEntity)
end)
-- da.Dev.Menu.RegisterMenu("root", "anim mode", "a")
da.Dev.Menu.RegisterOption("root", "anim mode", "a", function()
    da.Dev.Mode.Add("anim")
    SendNUIMessage({ type = "displayHUD", value = "animHUD"})
end)
