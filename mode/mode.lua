da.Dev.Mode = {}

ActiveMode = nil
local AllActiveModes = {}
Mode = {}

local SetMode = function(mode)
    if mode and not Mode[mode] then
        da.Log.Error(("Invalid mode '%s'"):format(mode))
        return
    end

    -- When exiting gizmo, wait for escape to be released while client has keyboard control
    if IsDisabledControlPressed(0, Control.Escape) then
        while IsDisabledControlPressed(0, Control.Escape) do
            SetNuiFocus(false, false)
            Citizen.Wait(0)
        end
    end


    local focusKeyboard = Mode[mode].default.focusKeyboard
    if Mode[mode].modified.focusKeyboard ~= nil then focusKeyboard = Mode[mode].modified.focusKeyboard end
    local focusCursor = Mode[mode].default.focusCursor
    if Mode[mode].modified.focusCursor ~= nil then focusCursor = Mode[mode].modified.focusCursor end
    local keepFocus = Mode[mode].default.keepFocus
    if Mode[mode].modified.keepFocus ~= nil then keepFocus = Mode[mode].modified.keepFocus end
    local passthrough = Mode[mode].default.passthrough
    if Mode[mode].modified.passthrough ~= nil then passthrough = Mode[mode].modified.passthrough end
    local passthroughHaltKey = Mode[mode].default.passthroughHaltKey
    local passthroughCallback = Mode[mode].default.passthroughCallback


    SetNuiFocus(focusKeyboard, focusCursor)
    SetNuiFocusKeepInput(keepFocus)
    da.Control.Passthrough(passthrough, passthroughHaltKey, passthroughCallback)

    SendNUIMessage({ type = "controlPass", enable = passthrough, })
    da.Log.Debug(("Setting mode '%s' key=%s mouse=%s keep=%s passthrough=%s"):format(
        mode,
        focusKeyboard,
        focusCursor,
        keepFocus,
        passthrough
    ))
end

local UpdateActiveMode = function()
    local activeMode = "none"
    local activePriority = 0
    for mode in pairs(AllActiveModes) do
        local modePrio = Mode[mode].priority
         if modePrio > activePriority then
            activeMode = mode
            activePriority = modePrio
        end
    end
    ActiveMode = activeMode
    SetMode(activeMode)
end

da.Dev.Mode.Add = function(mode)
    da.Log.Debug(("Adding mode %s"):format(mode))
    if not Mode[mode] then
        da.Log.Error(("Invalid mode '%s'"):format(mode))
        return
    end
    AllActiveModes[mode] = true
    UpdateActiveMode()
end

da.Dev.Mode.Remove = function(mode)
    da.Log.Debug(("Removing mode %s"):format(mode))
    AllActiveModes[mode] = nil
    UpdateActiveMode()
end

da.Dev.Mode.Clear = function()
    AllActiveModes = {}
    ActiveMode = nil
    SetMode("none")
end

RegisterNUICallback('controlPass', function(data, cb)
    SetNuiFocusKeepInput(data.enable)
    da.Control.Passthrough(data.enable)
    cb(true)
end)

RegisterNUICallback('modifyMode', function(data, cb)
    if not Mode[data.mode] then
        da.Log.Error(("Invalid mode '%s'"):format(data.mode))
        cb(false)
        return
    end

    if data.active and not AllActiveModes[data.mode] then
        cb(true)
        return
    end

    if data.focusKeyboard ~= nil then
        if Mode[data.mode].default.focusKeyboard ~= data.focusKeyboard then
            Mode[data.mode].modified.focusKeyboard = data.focusKeyboard
        else
            Mode[data.mode].modified.focusKeyboard = nil
        end
    end

    if data.focusCursor ~= nil then
        if Mode[data.mode].default.focusCursor ~= data.focusCursor then
            Mode[data.mode].modified.focusCursor = data.focusCursor
        else
            Mode[data.mode].modified.focusCursor = nil
        end
    end

    if data.keepFocus ~= nil then
        if Mode[data.mode].default.keepFocus ~= data.keepFocus then
            Mode[data.mode].modified.keepFocus = data.keepFocus
        else
            Mode[data.mode].modified.keepFocus = nil
        end
    end

    if data.passthrough ~= nil then
        if Mode[data.mode].default.passthrough ~= data.passthrough then
            Mode[data.mode].modified.passthrough = data.passthrough
            if Mode[data.mode].default.passthroughFn ~= nil then
                Mode[data.mode].default.passthroughFn()
            end
        else
            Mode[data.mode].modified.passthrough = nil
        end
    end

    UpdateActiveMode()
    cb(true)
end)

RegisterNUICallback('endPassthrough', function(data, cb)
    da.Control.Passthrough(false)
    cb(true)
end)

AddEventHandler('onResourceStop', function(resourceName)
    if resourceName == GetCurrentResourceName() then
        SetNuiFocus(false, false)
        SetNuiFocusKeepInput(false)
        da.Control.Passthrough(false)
    end
end)

Mode.gizmo = {
    priority = 7,
    default = {
        focusKeyboard = true,
        focusCursor = true,
        keepFocus = true,
        passthrough = false,
        passthroughHaltKey = Control.C,
        passthroughFn = function()
            Mode.gizmo.modified.focusCursor = false
        end,
        passthroughCallback = function()
            da.Control.WaitForKeyRelease(AllControls)
            Mode.gizmo.modified = {}
            UpdateActiveMode()
            SendNUIMessage({ type = "controlPass", enable = false, })
        end
    },
}
Mode.devTree = {
    priority = 6,
    default = {
        focusKeyboard = true,
        focusCursor = false,
        keepFocus = false,
        passthrough = false,
    },
}
Mode.anim = {
    priority = 5,
    default = {
        focusKeyboard = true,
        focusCursor = true,
        keepFocus = false,
        passthrough = false,
        passthroughFn = function()
            Mode.anim.modified.focusCursor = false
            Mode.anim.modified.keepFocus = true
        end,
        passthroughCallback = function()
            da.Control.WaitForKeyRelease(AllControls)
            Mode.anim.modified = {}
            UpdateActiveMode()
            SendNUIMessage({ type = "controlPass", enable = false, })
        end,
    },
}
Mode.object = {
    priority = 4,
    default = {
        focusKeyboard = true,
        focusCursor = true,
        keepFocus = false,
        passthrough = false,
        passthroughHaltKey = Control.C,
        passthroughFn = function()
            Mode.object.modified.focusCursor = false
            Mode.object.modified.keepFocus = true
        end,
        passthroughCallback = function()
            da.Control.WaitForKeyRelease(AllControls)
            Mode.object.modified = {}
            UpdateActiveMode()
            SendNUIMessage({ type = "controlPass", enable = false, })
        end

    },
}
Mode.focus = {
    priority = 3,
    default = {
        focusKeyboard = true,
        focusCursor = false,
        keepFocus = true,
        passthrough = false,
    },
}
Mode.freecam = {
    priority = 2,
    default = {
        focusKeyboard = true,
        focusCursor = false,
        keepFocus = true,
        passthrough = false,
    },
}
Mode.noclip = {
    priority = 1,
    default = {
        focusKeyboard = true,
        focusCursor = false,
        keepFocus = true,
        passthrough = false,
    },
}
Mode.none = {
    default = {
        focusKeyboard = false,
        focusCursor = false,
        keepFocus = false,
        passthrough = false,
    }
}

for mode in pairs(Mode) do
    Mode[mode].modified = {}
end

