da.Mode.New("gizmo", 100, {
    focusKeyboard = true,
    focusCursor = true,
    keepFocus = true,
    updateFn = function(data)
        SetNuiFocus(data.focusKeyboard, data.focusCursor)
        SetNuiFocusKeepInput(data.keepFocus)
        SendNUIMessage({ type = "controlPass", enable = data.passthrough, })
    end,
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
        SendNUIMessage({ type = 'setGizmoState', data = { shown = false } })
        GizmoThreadStarted = false
    end,
    passthroughFn = function()
        da.Mode.Modify("gizmo", { focusCursor = true, })
    end,
    passthroughCallback = function()
        da.Control.WaitForKeyRelease(da.Control.Keys)
        da.Mode.Reset("gizmo")
        SendNUIMessage({ type = "controlPass", enable = false, })
    end,
})

da.Mode.New("devTree", 80, {
    focusKeyboard = true,
    focusCursor = false,
    keepFocus = false,
    updateFn = function(data)
        SetNuiFocus(data.focusKeyboard, data.focusCursor)
        SetNuiFocusKeepInput(data.keepFocus)
        SendNUIMessage({ type = "controlPass", enable = data.passthrough, })
    end,
})

da.Mode.New("animation", 70, {
    focusKeyboard = true,
    focusCursor = true,
    keepFocus = false,
    updateFn = function(data)
        SetNuiFocus(data.focusKeyboard, data.focusCursor)
        SetNuiFocusKeepInput(data.keepFocus)
        SendNUIMessage({ type = "controlPass", enable = data.passthrough, })
    end,
    initFn = function()
        SendNUIMessage({ type = "displayHUD", value = "animation", mode = "on" })
    end,
    exitFn = function()
        SendNUIMessage({ type = "displayHUD", value = "animation", mode = "off" })
    end,
    passthroughFn = function()
        da.Mode.Modify("animation", { focusCursor = false, keepFocus = true, })
    end,
    passthroughCallback = function()
        da.Control.WaitForKeyRelease(da.Control.Keys)
        da.Mode.Reset("animation")
        SendNUIMessage({ type = "controlPass", enable = false, })
    end,
})

da.Mode.New("object", 60, {
    focusKeyboard = true,
    focusCursor = true,
    keepFocus = false,
    updateFn = function(data)
        SetNuiFocus(data.focusKeyboard, data.focusCursor)
        SetNuiFocusKeepInput(data.keepFocus)
        SendNUIMessage({ type = "controlPass", enable = data.passthrough, })
    end,
    initFn = function()
        da.Mode.Remove("animation")
        da.Mode.Add("freecam")
        SelectMode = "Cursor"
        ObjectModeThread()
        SendNUIMessage({
            type = "displayHUD",
            value = "object",
            enable = true,
        })
        da.Mode.Modify("object", { passthrough = true, })
    end,
    exitFn = function()
        da.Mode.Remove("freecam")
        da.Mode.Remove("focus")
        SelectMode = false
        SendNUIMessage({
            type = "displayHUD",
            value = "object",
            enable = false,
        })
    end,
    passthroughHaltKey = da.Control.Map.c,
    passthroughFn = function()
        if SelectMode then SelectMode = "Crosshair"; end
        da.Mode.Modify("object", { focusCursor = false, keepFocus = true, })
    end,
    passthroughCallback = function()
        da.Control.WaitForKeyRelease(da.Control.Keys)
        da.Mode.Reset("object")
        if SelectMode then SelectMode = "Cursor" end
        SendNUIMessage({ type = "controlPass", enable = false, })
    end,
})

da.Mode.New("focus", 40, {
    focusKeyboard = true,
    focusCursor = false,
    keepFocus = true,
    updateFn = function(data)
        SetNuiFocus(data.focusKeyboard, data.focusCursor)
        SetNuiFocusKeepInput(data.keepFocus)
        SendNUIMessage({ type = "controlPass", enable = data.passthrough, })
    end,
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
})

da.Mode.New("freecam", 20, {
    focusKeyboard = true,
    focusCursor = false,
    keepFocus = true,
    updateFn = function(data)
        SetNuiFocus(data.focusKeyboard, data.focusCursor)
        SetNuiFocusKeepInput(data.keepFocus)
        SendNUIMessage({ type = "controlPass", enable = data.passthrough, })
    end,
    initFn = function()
        CameraControlThread:Start()
        Freecam:Start()
    end,
    exitFn = function()
        CameraControlThread:Stop()
        Freecam:Stop()
        SendNUIMessage({
            type = "displayHUD",
            value = "camera",
            mode = "off",
        })
    end,
})

da.Mode.New("noclip", 10, {
    focusKeyboard = true,
    focusCursor = false,
    keepFocus = true,
    updateFn = function(data)
        SetNuiFocus(data.focusKeyboard, data.focusCursor)
        SetNuiFocusKeepInput(data.keepFocus)
        SendNUIMessage({ type = "controlPass", enable = data.passthrough, })
    end,
    initFn = function()
        CameraControlThread:Start()
        NoClip:Start()
    end,
    exitFn = function()
        CameraControlThread:Stop()
        NoClip:Stop()
        SendNUIMessage({ type = "displayHUD", value = "camera", mode = "off", })
    end,
})
