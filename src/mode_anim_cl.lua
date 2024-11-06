da_mode.new("animation", {
    priority = 70,
    default = { focusKeyboard = true, focusCursor = true, keepFocus = false, },
    passthrough = { focusCursor = false, keepFocus = true, },
    updateFn = function(data)
        SetNuiFocus(data.focusKeyboard, data.focusCursor)
        SetNuiFocusKeepInput(data.keepFocus)
        SendNUIMessage({ type = "controlPass", enable = data.passthrough, })
    end,
    startFn = function()
        SendNUIMessage({ type = "displayHUD", value = "animation", mode = "on" })
    end,
    stopFn = function()
        SendNUIMessage({ type = "displayHUD", value = "animation", mode = "off" })
        da_mode.reset("animation")
    end,
    passthroughFn = function(state, haltKey, cb)
        da_controlpass:set(state, haltKey, cb)
    end,
    passthroughCb = function()
        da_control.waitForRelease(dat.keyHashList)
        SendNUIMessage({ type = "controlPass", enable = false, })
        da_mode.reset("animation")
    end,
})

da_trie.addOpt("devRoot", "devkit:anim", "a", function()
    da_mode.toggle("animation")
end)
