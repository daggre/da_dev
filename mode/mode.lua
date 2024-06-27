da.Dev.Mode = {}

local ActiveMode = nil
local AllActiveModes = {}

local Mode = {
    gizmo = {
        priority = 6,
        getFocus = function()
            local focusKeyboard = true
            local focusCursor = true
            local keepFocus = true
            local passthrough = false
            return focusKeyboard, focusCursor, keepFocus, passthrough
        end,
    },
    devTree = {
        priority = 5,
        getFocus = function()
            local focusKeyboard = true
            local focusCursor = false
            local keepFocus = false
            local passthrough = false
            return focusKeyboard, focusCursor, keepFocus, passthrough
        end
    },
    anim = {
        priority = 4,
        getFocus = function()
            local focusKeyboard = true
            local focusCursor = true
            local keepFocus = false
            local passthrough = false
            return focusKeyboard, focusCursor, keepFocus, passthrough
        end,
    },
    object = {
        priority = 3,
        getFocus = function()
            local focusKeyboard = false
            local focusCursor = true
            local keepFocus = false
            local passthrough = false
            return focusKeyboard, focusCursor, keepFocus, passthrough
        end,
    },
    noclip = {
        priority = 2,
        getFocus = function()
            local focusKeyboard = false
            local focusCursor = false
            local keepFocus = false
            local passthrough = false
            return focusKeyboard, focusCursor, keepFocus, passthrough
        end,
    },
    freecam = {
        priority = 1,
        getFocus = function()
            local focusKeyboard = false
            local focusCursor = false
            local keepFocus = false
            local passthrough = false
            return focusKeyboard, focusCursor, keepFocus, passthrough
        end,
    },
}

local SetMode = function(hasFocus, hasCursor, keepInput, passthrough)
    SetNuiFocus(hasFocus, hasCursor)
    SetNuiFocusKeepInput(keepInput)
    da.Control.Passthrough(passthrough)
    da.Log.Debug(("Setting mode '%s' key=%s mouse=%s keep=%s passthrough=%s"):format(
        ActiveMode ~= nil and ActiveMode or "none",
        hasFocus,
        hasCursor,
        keepInput,
        passthrough
    ))
end

local UpdateActiveMode = function()
    local activeMode = nil
    local activePriority = 0
    for mode in pairs(AllActiveModes) do
        local modePrio = Mode[mode].priority
         if modePrio > activePriority then
            activeMode = mode
            activePriority = modePrio
        end
    end
    ActiveMode = activeMode
end

da.Dev.Mode.Add = function(mode)
    da.Log.Debug(("Adding mode %s"):format(mode))
    if not Mode[mode] then
        da.Log.Error(("Invalid mode '%s'"):format(mode))
        return
    end
    AllActiveModes[mode] = true
    local previousMode = ActiveMode
    UpdateActiveMode()
    if ActiveMode ~= previousMode then
        if ActiveMode == nil then
            SetMode(false, false, false, false)
        else
            SetMode(Mode[ActiveMode].getFocus())
        end
    end
end

da.Dev.Mode.Remove = function(mode)
    da.Log.Debug(("Removing mode %s"):format(mode))
    AllActiveModes[mode] = nil
    local previousMode = ActiveMode
    UpdateActiveMode()
    if ActiveMode ~= previousMode then
        if ActiveMode == nil then
            SetMode(false, false, false, false)
        else
            SetMode(Mode[ActiveMode].getFocus())
        end
    end
end

da.Dev.Mode.Clear = function(mode)
    AllActiveModes = {}
    ActiveMode = nil
    SetMode(false, false, false, false)
end

RegisterNUICallback('controlPass', function(data, cb)
    local enable = data.enable
    SetNuiFocusKeepInput(data.enable)
    da.Control.Passthrough(data.enable)
    cb(true)
end)

AddEventHandler('onResourceStop', function(resourceName)
    if resourceName == GetCurrentResourceName() then
        SetNuiFocus(false, false)
        SetNuiFocusKeepInput(false)
        da.Control.Passthrough(false)
    end
end)
