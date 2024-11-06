da_mode.new("gizmo", {
    priority = 100,
    default = { focusKeyboard = true, focusCursor = true, keepFocus = true, },
    passthrough = { focusCursor = false, },
    updateFn = function(data)
        SetNuiFocus(data.focusKeyboard, data.focusCursor)
        SetNuiFocusKeepInput(data.keepFocus)
        SendNUIMessage({ type = "controlPass", enable = data.passthrough, })
    end,
    startFn = function()
        Hover = nil
        SelectMode = "Cursor"
        InitGizmoThread()
        SendNUIMessage({ type = 'setGizmoState', data = { shown = true } })
    end,
    stopFn = function()
        SendNUIMessage({ type = 'setGizmoState', data = { shown = false } })
        GizmoThreadStarted = false
    end,
    passthroughKey = da_control.keyHash['c'],
    passthroughFn = function(state, haltKey, cb)
        da_controlpass:set(state, haltKey, cb)
    end,
    passthroughCb = function()
        da_control.waitForRelease(dat.keys)
        da_mode.reset("gizmo")
        SendNUIMessage({ type = "controlPass", enable = false, })
    end,
})


function StartGizmo(entity)
    if not entity then return; end
    if not DoesEntityExist(entity) then return; end
    da_mode.start("gizmo")
    Citizen.Wait(100)
    SendNUIMessage({
        type = 'setGizmoEntity',
        data = {
            name = 'Unknown Game Object',
            handle = entity,
            position = GetEntityCoords(entity),
            rotation = GetEntityRotation(entity) * vec3(1, -1, 1), -- Gizmo is swapping the y rot, so correct for that ahead of time
        }
    })
end

local GizmoThreadStarted = false
function InitGizmoThread()
    if GizmoThreadStarted then return; end
    GizmoThreadStarted = true
    Citizen.CreateThread(function()
        while GizmoThreadStarted do
            SendNUIMessage({ type = 'setCameraPosition', data = {
                position = GetFinalRenderedCamCoord(),
                rotation = GetFinalRenderedCamRot()
            }})
            Citizen.Wait(0)
        end
        if da_mode.isActive("gizmo") then da_mode.stop("gizmo") end
        GizmoThreadStarted = false
    end)
end

local ExpirerRunning = false
local StartGizmoMovedExpirer = function()
    if ExpirerRunning then return; end
    ExpirerRunning = true
    while ExpirerRunning and GizmoMovedRecently > GetGameTimer() do
        Citizen.Wait(200)
    end
    GizmoMovedRecently = nil
    ExpirerRunning = false
end

RegisterNUICallback('moveGizmoEntity', function(data, cb)
    if data.handle then
        if DoesEntityExist(data.handle) then
            SetEntityCoords(data.handle, data.position.x, data.position.y, data.position.z)
            SetEntityRotation(data.handle, data.rotation.x, data.rotation.y, data.rotation.z)
        end
    end
    GizmoMovedRecently = GetGameTimer() + 500
    StartGizmoMovedExpirer()
    cb(true)
end)

RegisterNUICallback('gizmoStop', function()
    -- This is called from the gizmo js script
    da_mode.stop("gizmo")
end)

AddEventHandler('onResourceStop', function(resourceName)
    if resourceName == GetCurrentResourceName() then
        GizmoThreadStarted = false
        da_mode.stop("gizmo")
    end
end)
