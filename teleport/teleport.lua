local SavedLocations = {}

local TeleportLocations = {
    ["Annesburg"] = { key = "a", location = vector3(2937.998, 1314.14, 44.487), category = "towns", },
    ["Big Valley"] = { key = "b", location = vector3(-1810.73, 469.338, 112.157), },
    ["Blackwater"] = { key = "b", location = vector4(-805.785, -1272.71, 43.668, 208.795), category = "towns", },
    ["Butcher Creek"] = { key = "c", location = vector3(2576.028, 768.841, 80.947), },
    ["St Denis"] = { key = "d", location = vector3(2628.322, -1221.465, 59.598), category = "towns", },
    ["Mother Tree"] = { key = "e", location = vector3(-2238.192, 610.82, 118.201), },
    ["Emerald Farm"] = { key = "f", location = vector4(1432.459, 320.61, 88.769, 87.306), },
    ["Hanging Dog"] = { key = "h", location = vector4(-2204.896, 711.084, 122.266, 240.798), },
    ["Van Horn"] = { key = "h", location = vector3(2930.864, 512.522, 45.882), category = "towns", },
    ["Mt Shan"] = { key = "m", location = vector3(-1976.458, 31.508, 330.356), },
    ["Rhodes"] = { key = "r", location = vector3(1373.57, -1293.563, 77.077), category = "towns", },
    ["Wapiti"] = { key = "r", location = vector3(490.008, 2233.7, 248.402), },
    ["Strawberry"] = { key = "s", location = vector3(-1787.239, -370.698, 159.9), category = "towns", },
    ["Tumbleweed"] = { key = "t", location = vector3(-5530.891, -2964.492, -1.245), category = "towns", },
    ["Valentine"] = { key = "v", location = vector3(-280.086, 798.556, 119.349), category = "towns", },
    ["Wallace"] = { key = "w", location = vector4(-1303.765, 393.19, 95.439, 257.936), },
    ["Arikoan"] = { key = "z", location = vector3(-2534.068, -98.345, 166.177), },
    ["Graverobbing"] = { key = "g", location = vector4(2413.753, 1772.332, 89.543, 300.794), category = "npc", },
    ["Coal Chute"] = { key = "c", location = vector4(2945.651, 1378.808, 51.357, 79.818), category = "npc", },
    ["Mining Fence"] = { key = "f", location = vector4(2731.39, 1368.416, 68.47, 107.077), category = "npc" },
    ["Music Vendor"] = { key = "m", location = vector4(2655.914, -1379.673, 48.532, 225.987), category = "npc" },
}

da.Dev.Teleport = function(coords) TriggerEvent('TMC:Command:TeleportToCoords', coords) end

da.Dev.Menu.RegisterMenu("root", "teleport", "t")
da.Dev.Menu.RegisterMenu("teleport", "towns", "t")
da.Dev.Menu.RegisterMenu("teleport", "custom", "1")
da.Dev.Menu.RegisterMenu("teleport", "npc", "n")
da.Dev.Menu.RegisterMenu("custom", "clear", "x")

for name, tpData in pairs(TeleportLocations) do
    da.Dev.Menu.RegisterOption(tpData.category or "teleport", name, tpData.key, function()
        da.Dev.Teleport(tpData.location)
    end)
end

for i=1,5 do
    da.Dev.Menu.RegisterOption("custom", "sav "..tostring(i), tostring(i), function()
        local position = GetEntityCoords(PlayerPedId())
        local heading = GetEntityHeading(PlayerPedId())
        SavedLocations[i] = vec4(position.x, position.y, position.z, heading)
    end, function()
        return SavedLocations[i] == nil
    end)
    da.Dev.Menu.RegisterOption("custom", "tp "..tostring(i), tostring(i), function()
        if SavedLocations[i] then
            da.Dev.Teleport(SavedLocations[i])
        end
    end, function()
        return SavedLocations[i] ~= nil
    end)
    da.Dev.Menu.RegisterOption("clear", "clear "..tostring(i), tostring(i), function()
        SavedLocations[i] = nil
    end, function()
        return SavedLocations[i] ~= nil
    end)
end

da.Dev.Menu.RegisterOption("teleport", "disappear", "0", function()
    local coords = GetEntityCoords(PlayerPedId())
    da.Fx.New("des_bnk_safe_exp", "ent_ray_bnk_safe_exp_end", {
        coords = coords,
        networked = true,
    })
    Citizen.Wait(1000)
    da.Dev.NoClip(true)
    da.Fx.New("anm_shows", "ent_anim_magician_smoke", {
        coords = coords,
        networked = true,
    })

end)
