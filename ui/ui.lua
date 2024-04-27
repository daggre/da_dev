Citizen.CreateThread(function()
    local optionTree = {}
    local z = 0x26E9DC00
    while true do
        Citizen.Wait(5)
        -- if (IsControlJustPressed(0, z) and IsInputDisabled(0)) then
        -- end
        if (IsControlJustReleased(0, z) and IsInputDisabled(0)) then
            optionTree = GetOptionTree("root", { subMenu = { root = DevMenu.root }})
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
    local optionTree = nil
    if menu.subMenu then
        optionTree = { subMenu = {}, options = {}, }
        for subMenuName, subMenu in pairs(menu.subMenu) do
            optionTree.menuName = subMenuName
            optionTree.key = subMenu.key
            table.insert(optionTree.subMenu, GetOptionTree(subMenuName, subMenu))
            optionTree.options = GetMenuOptions(subMenuName)
            table.sort(optionTree.options, function(a, b) return a.key < b.key end)
        end
        table.sort(optionTree.subMenu, function(a, b) return a.key < b.key end)
    end
    return optionTree
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
