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
