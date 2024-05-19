local OptionLookup = {}
local MenuLookup = {}

---Register a dev menu option
---@param menuName string The name of the parent menu
---@param optionName string The name of the option
---@param key string The key to press to trigger the option
---@param fn function the function to call when the option is triggered
---@param condition function The condition to check before displaying the option
da.Dev.Menu.RegisterOption = function(menuName, optionName, key, fn, condition)
    if not OptionLookup[menuName] then
        OptionLookup[menuName] = {}
    end
    for menu, menuData in pairs(OptionLookup[menuName]) do
        if menuData.key == key then
            if not condition or not menuData.condition then
                da.Log.Error(("Key %s assigned to %s"):format(key, menu))
                return
            end
            da.Log.Debug(("Key %s conditionally assigned to %s"):format(key, menu))
        end
    end
    OptionLookup[menuName][optionName] = {
        key = key,
        fn = fn,
        condition = condition,
    }
end

---Trigger a dev menu option
---@param menuName string The name of the parent menu
---@param optionName string The name of the option
---@param params any The parameters to pass to the function
da.Dev.Menu.TriggerOption = function(menuName, optionName, params)
    if OptionLookup[menuName] and OptionLookup[menuName][optionName] then
        OptionLookup[menuName][optionName].fn(params)
    end
end

---Register a dev submenu
---@param parentMenu any the name of the parent menu
---@param menuName any the name of the submenu
---@param key any the key to press to open the submenu
da.Dev.Menu.RegisterMenu = function(parentMenu, menuName, key)
    if not MenuLookup[parentMenu] then
        MenuLookup[parentMenu] = {}
    end
    for menu, menuData in pairs(MenuLookup[parentMenu]) do
        if menuData.key == key then
            da.Log.Error(("Key %s already assigned to %s"):format(key, menu))
            return
        end
    end
    MenuLookup[parentMenu][menuName] = {
        key = key,
    }
end

---Get the tree of options
--- @param parentName any The name of the parent menu
--- @return table|nil
da.Dev.Menu.GetTree = function(parentName)
    local tree = {}
    if not MenuLookup[parentName] then return nil; end
    for childName, childData in pairs(MenuLookup[parentName]) do
        table.insert(tree, {
            menuName = childName,
            key = childData.key,
            subMenu = da.Dev.Menu.GetTree(childName),
            options = da.Dev.Menu.GetOptions(childName),
        })
    end
    if tree and next(tree) then
        table.sort(tree, function(a, b) return a.key < b.key end)
    end
    return next(tree) and tree or nil
end

---Get the options for a menu
---@param parentName any The name of the parent menu
---@return table|nil
da.Dev.Menu.GetOptions = function(parentName)
    local options = {}
    if not OptionLookup[parentName] then return nil; end
    for optionName, optionData in pairs(OptionLookup[parentName]) do
        if not optionData.condition or optionData.condition() then
            table.insert(options, {
                menuName = parentName,
                optionName = optionName,
                key = optionData.key,
            })
        end
    end
    if options and next(options) then
        table.sort(options, function(a, b) return a.key < b.key end)
    end
    return next(options) and options or nil
end

-- Register the tree and root menu
da.Dev.Menu.RegisterMenu("optionTree", "root", "z")
da.Dev.Menu.RegisterMenu("objSelTree", "objSelRoot", "z")

