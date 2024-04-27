local TeleportLocations = {
    ["Annesburg"] = { key = "a", location = vector3(2937.998, 1314.14, 44.487), category = "Towns", },
    ["Big Valley"] = { key = "b", location = vector3(-1810.73, 469.338, 112.157), },
    ["Butcher Creek"] = { key = "c", location = vector3(2576.028, 768.841, 80.947), },
    ["St Denis"] = { key = "d", location = vector3(2628.322, -1221.465, 59.598), category = "Towns", },
    ["Hanging Dog"] = { key = "h", location = vector3(-2201.164, 682.273, 121.01), },
    ["Mt Shan"] = { key = "m", location = vector3(-1976.458, 31.508, 330.356), },
    ["Mother Tree"] = { key = "n", location = vector3(-2238.192, 610.82, 118.201), },
    ["Rhodes"] = { key = "r", location = vector3(1373.57, -1293.563, 77.077), category = "Towns", },
    ["Strawberry"] = { key = "s", location = vector3(-1787.239, -370.698, 159.9), category = "Towns", },
    ["Tumbleweed"] = { key = "t", location = vector3(-5530.891, -2964.492, -1.245), category = "Towns", },
    ["Valentine"] = { key = "v", location = vector3(-280.086, 798.556, 119.349), category = "Towns", },
    ["Van Horn"] = { key = "v", location = vector3(2930.864, 512.522, 45.882), category = "Towns", },
    ["Wapiti"] = { key = "w", location = vector3(490.008, 2233.7, 248.402), },
    ["Arikoan"] = { key = "z", location = vector3(-2534.068, -98.345, 166.177), },
}

local SavedLocations = {
    [1] = nil,
    [2] = nil,
    [3] = nil,
    [4] = nil,
    [5] = nil,
}


da.Dev.Teleport = function(coords)
    TriggerEvent('TMC:Command:TeleportToCoords', coords)
end

for name, tpData in pairs(TeleportLocations) do
    DevMenu.Option.Register(name, tpData.category or "Teleport", tpData.key, function()
        da.Dev.Teleport(tpData.location)
    end)
end

for i=1,1 do
    DevMenu.Option.Register("Custom", "Save", tostring(i), function()
        SavedLocations[i] = GetEntityCoords(PlayerPedId())
    end)
    DevMenu.Option.Register("Custom", "Teleport", tostring(i), function()
        if SavedLocations[i] then
            da.Dev.Teleport(SavedLocations[i])
        end
    end)
end
