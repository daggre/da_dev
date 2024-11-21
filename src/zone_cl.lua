local zones = {}

da_trie.add("devRoot", "zone", "x")

da_trie.addOpt("zone", "add", "a", function()
    local z = zone.circle(GetEntityCoords(PlayerPedId()).xyz, 1.0, {
        name = "blah",
        debugPoly = true,
        debugColor = { 255, 0, 0 },
        useZ = true,
    })
    table.insert(zones, z)
end)

da_trie.addOpt("zone", "list", "l", function()
    for i, z in ipairs(zones) do
        log.info("zone:" .. i .. " " .. log.format(z))
    end
end)

da_trie.addOpt("zone", "clear", "x", function()
    for _, z in ipairs(zones) do
        z:destroy()
    end
    zones = {}
end)

cli.add_cmd("zone", { desc = "Zone commands" })
cli.add_subcmd("zone", "add", {
    desc = "Add a zone",
    args = { "name" },
    opt = { range = { desc = "Radius of the zone (default 1.0)", }, },
    fn = function(args)
        local radius = tonumber(args.range) or 1.0
        local z = zone.circle(GetEntityCoords(PlayerPedId()).xyz, radius, {
            name = args.name,
            debugPoly = true,
            debugColor = { 255, 0, 0 },
            useZ = true,
        })
        table.insert(zones, z)
    end,
})
cli.add_subcmd("zone", "list", {
    desc = "List zones",
    opt = {
        ["zone"] = { desc = "Zone ID", },
        ["name"] = { desc = "Zone name", },
    },
    fn = function(args)
        local id = tonumber(args.zone) and tonumber(args.zone) or nil
        local name = args.name
        for i, z in ipairs(zones) do
            if id and id == i then
                log.info("zone:" .. i .. " " .. z.name)
            elseif name and name == z.name then
                log.info("zone:" .. i .. " " .. z.name)
            elseif not id and not name then
                log.info("zone:" .. i .. " " .. z.name)
            end
        end
    end,
})
cli.add_subcmd("zone", "remove", {
    desc = "Remove zone",
    args = { "zone" },
    fn = function(args)
        for i = #zones, 1, -1 do
            if args.zone == "all" or tonumber(args.zone) == i then
                zones[i]:destroy()
                table.remove(zones, i)
            end
        end
    end,
})
