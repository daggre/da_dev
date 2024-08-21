
function StartGizmo(entity)
    if not entity then return; end
    if not DoesEntityExist(entity) then return; end
    da.Mode.Add("gizmo")
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
        da.Mode.Remove("gizmo")
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
    da.Mode.Remove("gizmo")
end)

AddEventHandler("stopGizmo", function()
    da.Mode.Remove("gizmo")
end)

AddEventHandler('onResourceStop', function(resourceName)
    if resourceName == GetCurrentResourceName() then
        GizmoThreadStarted = false
        da.Mode.Remove("gizmo")
    end
end)

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

