da_trie.addOpt("devRoot", "revive", "r", function() API.revive() end, function() return IsPedDeadOrDying(PlayerPedId()) end)
da_trie.addOpt("objRoot", "revive", "r", function() API.revive() end, function() return IsPedDeadOrDying(PlayerPedId()) end)


da_trie.addOpt("devRoot", "max cores", "9", function()
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

da_trie.add("devRoot", "pos", "v")
da_trie.addOpt("pos", "cpy vec2", "2", function()
    local coords = GetEntityCoords(PlayerPedId())
    SendNUIMessage({ type = "clipboard", text = ("vector2(%.3f, %.3f)"):format(coords.x, coords.y), })
end)
da_trie.addOpt("pos", "cpy vec3", "3", function()
    local coords = GetEntityCoords(PlayerPedId())
    SendNUIMessage({ type = "clipboard", text = ("vector3(%.3f, %.3f, %.3f)"):format(coords.x, coords.y, coords.z), })
end)
da_trie.addOpt("pos", "cpy vec4", "4", function()
    local coords = GetEntityCoords(PlayerPedId())
    local heading = GetEntityHeading(PlayerPedId())
    SendNUIMessage({ type = "clipboard", text = ("vector4(%.3f, %.3f, %.3f, %.3f)"):format(coords.x, coords.y, coords.z, heading), })
end)

da_trie.add("devRoot", "menu", "m")
-- da_trie.addOpt("menu", "clothing", "c", function() TriggerEvent('clothing:openMenu', true, false, true) end) -- Barber disabled
-- da_trie.addOpt("menu", "horsetack", "h", function()
--     local horseEntity, dist = TMC.Functions.GetClosestHorse()
--     if dist > 25 or not horseEntity or not Entity(horseEntity) or not Entity(horseEntity).state then
--         log.debug("No horse close enough")
--         return
--     end
--     local horseId = Entity(horseEntity).state and Entity(horseEntity).state.horseId
--     TriggerServerEvent('stables:server:getTack', horseId, horseEntity)
-- end)
