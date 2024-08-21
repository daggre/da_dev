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
