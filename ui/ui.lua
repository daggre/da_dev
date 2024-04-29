Citizen.CreateThread(function()
    local optionTree = {}
    local z = 0x26E9DC00
    while true do
        Citizen.Wait(5)
        -- if (IsControlJustPressed(0, z) and IsInputDisabled(0)) then
        -- end
        if (IsControlJustReleased(0, z) and IsInputDisabled(0)) then
            optionTree = GetOptionTree("tree", { subMenu = { root = DevMenu.root }})
            -- da.Log.Debug(optionTree)
            SetNuiFocus(true, false)
            SendNUIMessage({
                type = "show",
                optionTree = optionTree,
            })
            optionTree = {}
        end
    end
end)

GetOptionTree = function(name, menu)
    local subMenuTree = nil
    if menu.subMenu then
        subMenuTree = {}
        for subMenuName, subMenu in pairs(menu.subMenu) do
            optionTree = {
                menuName = subMenuName,
                key = subMenu.key,
                subMenu = GetOptionTree(subMenuName, subMenu),
                options = GetMenuOptions(subMenuName),
            }
            if optionTree.options then
                table.sort(optionTree.options, function(a, b) return a.key < b.key end)
            end
            if optionTree.subMenu then
                table.sort(optionTree.subMenu, function(a, b) return a.key < b.key end)
            end
            table.insert(subMenuTree, optionTree)
        end
    end
    return subMenuTree
end

GetMenuOptions = function(name)
    local options = {}
    if DevMenu.OptionLookup[name] then
        for optionName, option in pairs(DevMenu.OptionLookup[name]) do
            table.insert(options, {
                menuName = name,
                optionName = optionName,
                key = option.key,
            })
        end
    end
    return options
end

RegisterNUICallback('exit', function(data, cb)
    SetNuiFocus(false, false)
    cb({})
end)

RegisterNUICallback('trigger', function(data, cb)
    SetNuiFocus(false, false)
    DevMenu.Option.Trigger(data.menuName, data.optionName, data.params)
    cb({})
end)
