
function StartGizmo(entity)
    if not entity then return; end
    if not DoesEntityExist(entity) then return; end
    da.Dev.Mode.Add("gizmo")
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
        da.Dev.Mode.Remove("gizmo")
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
    da.Dev.Mode.Remove("gizmo")
end)

AddEventHandler("stopGizmo", function()
    da.Dev.Mode.Remove("gizmo")
end)

AddEventHandler('onResourceStop', function(resourceName)
    if resourceName == GetCurrentResourceName() then
        GizmoThreadStarted = false
        da.Dev.Mode.Remove("gizmo")
    end
end)

