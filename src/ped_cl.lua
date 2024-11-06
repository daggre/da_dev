local peds = {
    fear = { key = "f", model = `mp_g_m_m_armyoffear_01`, outfit = 0 },
    eagle = { key = "e", model = `a_c_eagle_01`, outfit = 2 },
    coyote = { key = "c", model = `a_c_coyote_01`, outfit = 1 },
    robot = { key = "r", model = `cs_crackpotrobot`, outfit = 2 },
    wapiti = { key = "w", model = `a_m_m_wapwarriors_01`, outfit = 17 },
}

local SetPed = function(model, outfit)
    outfit = outfit or 0
    da_obj.load(model)
    SetPlayerModel(PlayerId(), model, false)
    SetPedOutfitPreset(PlayerPedId(), outfit, false)
    SetModelAsNoLongerNeeded(model)
    TriggerEvent("da_xanims:animalfix")
end

da_trie.add("devRoot", "ped", "p")
for pedName, pedData in pairs(peds) do
    da_trie.addOpt("ped", pedName, pedData.key or pedName:sub(1,1), function() SetPed(pedData.model, pedData.outfit) end)
end

cli.add_cmd("ped", { desc = "Ped commands"})
cli.add_subcmd("ped", "set", {
    desc = "Change ped model",
    args = { "model", "outfit" },
    fn = function(args) SetPed(GetHashKey(args.model), args.outfit) end,
})
cli.add_subcmd("ped", "get", {
    desc = "List ped models",
    fn = function(args) log.info(dat.getName(GetEntityModel(PlayerPedId()))) end,
})
cli.add_subcmd("ped", "outfit", { desc = "Change ped outfit", })
cli.add_subcmd("ped outfit", "set", {
    desc = "Change ped outfit",
    args = { "outfit" },
    fn = function(args)
        SetPedOutfitPreset(PlayerPedId(), tonumber(args.outfit), false)
    end,
})
