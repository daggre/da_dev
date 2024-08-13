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
    if Mode[mode].default.initFn then
        Mode[mode].default.initFn()
    end
    UpdateActiveMode()
end

da.Dev.Mode.Remove = function(mode)
    da.Log.Debug(("Removing mode %s"):format(mode))
    if AllActiveModes[mode] and Mode[mode].default.exitFn then
        Mode[mode].default.exitFn()
    end
    AllActiveModes[mode] = nil
    UpdateActiveMode()
end

da.Dev.Mode.Toggle = function(mode)
    if AllActiveModes[mode] then
        da.Dev.Mode.Remove(mode)
    else
        da.Dev.Mode.Add(mode)
    end
end

da.Dev.Mode.Clear = function()
    AllActiveModes = {}
    ActiveMode = nil
    SetMode("none")
end

da.Dev.Mode.IsActive = function(mode)
    return AllActiveModes[mode]
end

RegisterNUICallback('modifyMode', function(data, cb)
    da.Dev.Mode.Modify(data.mode, data)
    cb(true)
end)

da.Dev.Mode.Modify = function(mode, data)
    mode = mode or data.mode

    if not Mode[mode] then
        da.Log.Error(("Invalid mode '%s'"):format(mode))
        return
    end

    if data.requireActive and not AllActiveModes[mode] then
        return
    end

    if data.add then
        da.Dev.Mode.Add(mode)
    end

    if data.remove then
        da.Dev.Mode.Remove(mode)
    end

    if data.focusKeyboard ~= nil then
        if Mode[mode].default.focusKeyboard ~= data.focusKeyboard then
            Mode[mode].modified.focusKeyboard = data.focusKeyboard
        else
            Mode[mode].modified.focusKeyboard = nil
        end
    end

    if data.focusCursor ~= nil then
        if Mode[mode].default.focusCursor ~= data.focusCursor then
            Mode[mode].modified.focusCursor = data.focusCursor
        else
            Mode[mode].modified.focusCursor = nil
        end
    end

    if data.keepFocus ~= nil then
        if Mode[mode].default.keepFocus ~= data.keepFocus then
            Mode[mode].modified.keepFocus = data.keepFocus
        else
            Mode[mode].modified.keepFocus = nil
        end
    end

    if data.passthrough ~= nil then
        if Mode[mode].default.passthrough ~= data.passthrough then
            Mode[mode].modified.passthrough = data.passthrough
            if Mode[mode].default.passthroughFn ~= nil then
                Mode[mode].default.passthroughFn()
            end
        else
            Mode[mode].modified.passthrough = nil
        end
    end

    UpdateActiveMode()
end

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
        initFn = function()
            SelectMode = "Cursor"
            InitGizmoThread()
            RemoveTrackedObject("hover")
            SendNUIMessage({
                type = 'setGizmoState',
                data = { shown = true }
            })
        end,
        exitFn = function()
            SendNUIMessage({
                type = 'setGizmoState',
                data = { shown = false }
            })
            GizmoThreadStarted = false
        end,
        passthrough = false,
        passthroughHaltKey = Control.c,
        passthroughFn = function()
            Mode.gizmo.modified.focusCursor = false
        end,
        passthroughCallback = function()
            da.Control.WaitForKeyRelease(AllControls)
            Mode.gizmo.modified = {}
            UpdateActiveMode()
            SendNUIMessage({ type = "controlPass", enable = false, })
        end,
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
        initFn = function()
            SendNUIMessage({ type = "displayHUD", value = "anim", mode = "on" })
        end,
        exitFn = function()
            SendNUIMessage({ type = "displayHUD", value = "anim", mode = "off" })
        end,
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
        initFn = function()
            da.Dev.Mode.Remove("anim")
            da.Dev.Mode.Add("freecam")
            SelectMode = "Cursor"
            ObjectModeThread()
            SendNUIMessage({
                type = "displayHUD",
                value = "object",
                enable = true,
            })
            da.Dev.Mode.Modify("object", { passthrough = true, })
        end,
        exitFn = function()
            da.Dev.Mode.Remove("freecam")
            SelectMode = false
            SendNUIMessage({
                type = "displayHUD",
                value = "object",
                enable = false,
            })
        end,
        passthrough = false,
        passthroughHaltKey = Control.c,
        passthroughFn = function()
            if SelectMode then SelectMode = "Crosshair"; end
            Mode.object.modified.focusCursor = false
            Mode.object.modified.keepFocus = true
        end,
        passthroughCallback = function()
            da.Control.WaitForKeyRelease(AllControls)
            Mode.object.modified = {}
            UpdateActiveMode()
            if SelectMode then SelectMode = "Cursor" end
            SendNUIMessage({
                type = "controlPass",
                enable = false,
            })
        end,
    },
}
Mode.focus = {
    priority = 3,
    default = {
        initFn = function()
            local trackedObject = GetTrackedObject("select")
            if trackedObject then
                da.Log.Debug(("Focusing on object %s"):format(trackedObject))
                PointCamAtEntity(Camera.Handle, trackedObject)
            end
        end,
        exitFn = function()
            StopCamPointing(Camera.Handle)
        end,
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
        initFn = function()
            InitCameraControlThread()
            EnableFreeCam()
        end,
        exitFn = function()
            DisableFreeCam()
            SendNUIMessage({
                type = "displayHUD",
                value = "camera",
                mode = "off",
            })
        end,
        passthrough = false,
    },
}
Mode.noclip = {
    priority = 1,
    default = {
        focusKeyboard = true,
        focusCursor = false,
        keepFocus = true,
        initFn = function()
            da.Dev.NoClip(true)
            InitCameraControlThread()
            local playerPedId = PlayerPedId()
            FreezeEntityPosition(playerPedId, true)
            SetEntityInvincible(playerPedId, true)
            SetEntityVisible(playerPedId, false)
            NetworkSetEntityInvisibleToNetwork(playerPedId, true)
        end,
        exitFn = function()
            da.Dev.NoClip(false)
            if not da.Dev.Mode.IsActive("noclip") then
                DisableFreeCam()
            end
            local playerPedId = PlayerPedId()
            FreezeEntityPosition(playerPedId, false)
            SetEntityVisible(playerPedId, true)
            NetworkSetEntityInvisibleToNetwork(playerPedId, false)
            Citizen.SetTimeout(5000, function() SetEntityInvincible(playerPedId, false) end)
            SendNUIMessage({
                type = "displayHUD",
                value = "camera",
                mode = "off",
            })
        end,
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

