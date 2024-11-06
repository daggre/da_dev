da_trie.addOpt("devRoot","blood","7", function()
    local ped = PlayerPedId()
    local fxHandle = fx.new("scr_winter2","scr_blood_drips",{
        entity = ped,
        bone = GetEntityBoneIndexByName(ped, "PH_R_HAND"),
        networked = true,
        loop = true,
    })

    SetTimeout(10000, function()
        log.debug("Removing fxHandle", fxHandle)
        fx.remove({handle = fxHandle})
    end)
end)

cli.add_cmd("fx", { desc = "Fx commands" })
cli.add_subcmd("fx", "new", {
    desc = "Create a particle fx",
    args = { "ptfxDict", "ptfxName" },
    opt = {
        ["bone"] = { desc = "Bone to attach particle fx"},
        -- ["coords"] = { desc = "Coords to attach particle fx", args = 3, }, -- TODO: support multiple args
        ["duration"] = { desc = "Duration (sec) of particle fx" },
        ["entity"] = { desc = "Entity to attach particle fx", bool = true },
        ["net"] = { desc = "Network the particle fx", bool = true },
        ["loop"] = { desc = "Loop the particle fx", bool = true, },
    },
    fn = function(args)
        local playerPedId = PlayerPedId()
        -- local pos = GetEntityCoords(playerPedId)
        -- local hdg = GetEntityHeading(playerPedId)

        local entity = args.entity and playerPedId or nil
        local duration = tonumber(args.duration) and tonumber(args.duration)*1000 or 10000
        local fxHandle = fx.new(args.ptfxDict, args.ptfxName, {
            -- coords = GetOffsetFromCoordAndHeadingInWorldCoords(pos.x, pos.y, pos.z, hdg, 0.0, 1.0, 0.0),
            entity = entity,
            bone = args.bone,
            networked = args.net,
            loop = args.loop,
        })

        log.debug("Created ptfx fxHandle", fxHandle)
        SetTimeout(duration, function()
            log.debug("Removing fxHandle", fxHandle)
            fx.remove({handle = fxHandle})
        end)
    end,
})
cli.add_subcmd("fx", "remove", {
    desc = "Remove a particle fx",
    opt = {
        -- ["coords"] = { desc = "Coords to remove particle fx from" },
        ["entity"] = { desc = "Entity to remove particle fx from", bool = true },
        ["radius"] = { desc = "Radius to remove particle fx from" },
    },
    fn = function(args) fx.remove(args) end,
})
