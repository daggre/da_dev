DevMenu = {}
DevMenu.Option = {}
DevMenu.OptionLookup = {}

DevMenu.root = {
        subMenu = {
            Teleport = {
                key = "t",
                subMenu = {
                    Towns = { key = "t", },
                    Save = { key = "s", },
                }
            },
        },
    }

DevMenu.Option.Register = function(optionName, menuName, key, fn)
    if not DevMenu.OptionLookup[menuName] then
        DevMenu.OptionLookup[menuName] = {}
    end
    DevMenu.OptionLookup[menuName][optionName] = {
        key = key,
        fn = fn,
    }
end
DevMenu.Option.Trigger = function(menuName, optionName, params)
    if DevMenu.OptionLookup[menuName] and DevMenu.OptionLookup[menuName][optionName] then
        DevMenu.OptionLookup[menuName][optionName].fn(params)
    end
end
