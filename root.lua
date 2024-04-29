DevMenu.Option.Register("NoClip", "root", "z", function() da.Dev.NoClip() end)
DevMenu.Option.Register("Clothing", "root", "c", function() TriggerEvent('clothing:openMenu', true, false, true) end) -- Barber disabled
DevMenu.Option.Register("Revive", "root", "r", function() TriggerEvent('TMC:Command:Revive') end)
DevMenu.Option.Register("cpy vec3", "root", "3", function() TriggerEvent("v3copycoords") end)
DevMenu.Option.Register("cpy vec4", "root", "4", function() TriggerEvent("v4copycoords") end)

DevMenu.Option.Register("stats", "root", "s", function()
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

