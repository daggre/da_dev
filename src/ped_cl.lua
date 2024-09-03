da.Dev.Menu.RegisterMenu("root", "ped", "p")

local peds = {
    eagle = { key = "e", model = `a_c_eagle_01`, outfit = 2 },
    coyote = { key = "c", model = `a_c_coyote_01`, outfit = 1 },
    robot = { key = "r", model = `cs_crackpotrobot`, outfit = 2 },
    wapiti = { key = "w", model = `a_m_m_wapwarriors_01`, outfit = 25 },
}

for pedName, pedData in pairs(peds) do
    da.Dev.Menu.RegisterOption("ped", pedName, pedData.key or pedName:sub(1,1), function() SetPed(pedData.model, pedData.outfit) end)
end

RegisterCommand("setped", function(source, args, rawCommand)
    SetPed(args[1], tonumber(args[2] or 0))
end, false)

SetPed = function(model, outfit)
    outfit = outfit or 0
    da.Obj.Load(model)
    SetPlayerModel(PlayerId(), model, false)
    SetPedOutfitPreset(PlayerPedId(), outfit, false)
    SetModelAsNoLongerNeeded(model)
    TriggerEvent("da_xanims:animalfix")
end
