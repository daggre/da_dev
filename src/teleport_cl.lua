local SavedLocations = {}

local TeleportLocations = {
    ["Annesburg"] = { key = "a", location = vector3(2937.998, 1314.14, 44.487), category = "towns", },
    ["Big Valley"] = { key = "b", location = vector3(-1810.73, 469.338, 112.157), },
    ["Blackwater"] = { key = "b", location = vector4(-805.785, -1272.71, 43.668, 208.795), category = "towns", },
    ["Butcher Creek"] = { key = "c", location = vector3(2576.028, 768.841, 80.947), },
    ["St Denis"] = { key = "d", location = vector3(2628.322, -1221.465, 59.598), category = "towns", },
    ["Emerald Farm"] = { key = "f", location = vector4(1432.459, 320.61, 88.769, 87.306), },
    ["Hanging Dog"] = { key = "h", location = vector4(-2204.896, 711.084, 122.266, 240.798), },
    ["Van Horn"] = { key = "h", location = vector3(2930.864, 512.522, 45.882), category = "towns", },
    ["Mt Shan"] = { key = "m", location = vector3(-1976.458, 31.508, 330.356), },
    ["Rhodes"] = { key = "r", location = vector3(1373.57, -1293.563, 77.077), category = "towns", },
    ["Wapiti"] = { key = "r", location = vector4(478.767, 2219.107, 247.071, 118.443), },
    ["Spawn"] = { key = "s", location = vector4(-2805.181, -723.352, 272.668, 173.700), },
    ["Strawberry"] = { key = "s", location = vector3(-1787.239, -370.698, 159.9), category = "towns", },
    ["Tumbleweed"] = { key = "t", location = vector3(-5530.891, -2964.492, -1.245), category = "towns", },
    ["Valentine"] = { key = "v", location = vector3(-280.086, 798.556, 119.349), category = "towns", },
    ["Wallace"] = { key = "w", location = vector4(-1303.765, 393.19, 95.439, 257.936), },
}

da_trie.add("devRoot", "teleport", "t")
da_trie.add("teleport", "towns", "t")
da_trie.add("teleport", "custom", "1")
da_trie.add("teleport", "npc", "n")
da_trie.add("custom", "clear", "x")

for name, tpData in pairs(TeleportLocations) do
    da_trie.addOpt(tpData.category or "teleport", name, tpData.key, function()
        API.teleport(tpData.location)
    end)
end

for i=1,5 do
    da_trie.addOpt("custom", "sav "..tostring(i), tostring(i), function()
        local position = GetEntityCoords(PlayerPedId())
        local heading = GetEntityHeading(PlayerPedId())
        SavedLocations[i] = vec4(position.x, position.y, position.z, heading)
    end, function()
        return SavedLocations[i] == nil
    end)
    da_trie.addOpt("custom", "tp "..tostring(i), tostring(i), function()
        if SavedLocations[i] then
            API.teleport(SavedLocations[i])
        end
    end, function()
        return SavedLocations[i] ~= nil
    end)
    da_trie.addOpt("clear", "clear "..tostring(i), tostring(i), function()
        SavedLocations[i] = nil
    end, function()
        return SavedLocations[i] ~= nil
    end)
end

da_trie.addOpt("teleport", "disappear", "0", function()
    local coords = GetEntityCoords(PlayerPedId())
    fx.New("des_bnk_safe_exp", "ent_ray_bnk_safe_exp_end", {
        coords = coords,
        networked = true,
    })
    Citizen.Wait(1000)
    da_mode.start("noclip")
    fx.New("anm_shows", "ent_anim_magician_smoke", {
        coords = coords,
        networked = true,
    })
end)

da_trie.addOpt("objRoot", "tp to cam", "t", function()
    local playerPedId = PlayerPedId()
    local coords = GetFinalRenderedCamCoord()
    SetEntityInvincible(playerPedId, true)
    API.teleport(coords, false)
    Citizen.SetTimeout(10000, function() SetEntityInvincible(playerPedId, false) end)
end)
