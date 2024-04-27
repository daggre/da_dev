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

-- Example Register
DevMenu.Option.Register("NoClip", "root", "z", function()
    da.Dev.NoClip()
end)

DevMenu.Option.Register("Clothing", "root", "c", function()
    TriggerEvent('clothing:openMenu', true, false, true) -- Barber disabled
end)
