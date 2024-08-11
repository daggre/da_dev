local gizmoEntity = false

function StartGizmo(entity)
    if not entity then return; end
    if not DoesEntityExist(entity) then return; end

    gizmoEntity = entity
    SendNUIMessage({
        type = 'setGizmoState',
        data = {
            shown = true
        }
    })
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
    da.Dev.Mode.Add("gizmo")
    GizmoThread()
end

local GizmoThreadStarted = false
function GizmoThread()
    if GizmoThreadStarted then
        return
    end
    GizmoThreadStarted = true
    Citizen.CreateThread(function()
        local playerPedId = PlayerPedId()
        while GizmoThreadStarted do
            SendNUIMessage({
                type = 'setCameraPosition',
                data = {
                    position = GetFinalRenderedCamCoord(),
                    rotation = GetFinalRenderedCamRot()
                }
            })
            -- DisableControlAction(0, `INPUT_MOVE_LR`, true) -- disable left/right
            -- DisableControlAction(0, `INPUT_MOVE_UD`, true) -- disable forward/back
            -- DisableControlAction(0, `INPUT_DUCK`, true) -- INPUT_DUCK
            -- DisableControlAction(0, `INPUT_SPRINT`, true) -- disable sprint
            -- DisableControlAction(0, `INPUT_MOVE_UP_ONLY`, true)
            -- DisableControlAction(0, `INPUT_MOVE_DOWN_ONLY`, true)
            -- DisableControlAction(0, `INPUT_MOVE_LEFT_ONLY`, true)
            -- DisableControlAction(0, `INPUT_MOVE_RIGHT_ONLY`, true)

            -- TODO: Move gizmo control passthrough to mode passthrough
            DisablePlayerFiring(playerPedId, true)
            if not IsDisabledControlPressed(0, Control.MouseRight, true) then
                -- EnableControlAction(0, `SKIPCUTSCENE`, true)
                DisableAllControlActions(0)
                if IsDisabledControlPressed(0, Control.Escape2, true) then
                    break
                end
            end

            if IsDisabledControlPressed(0, Control.LeftShift) and IsDisabledControlJustPressed(0, Control.D) then -- Shift D (Duplicate)
                local model = GetEntityModel(gizmoEntity)
                local pos = GetEntityCoords(gizmoEntity)
                local rot = GetEntityRotation(gizmoEntity)
                da.Obj.Create(model, pos, { rotation = rot, })
            end

            -- DisableControlAction(0, `INPUT_FRONTEND_RRIGHT`, true) -- ESC Menu
            -- DisableControlAction(0, `INPUT_FRONTEND_PAUSE_ALTERNATE`, true) -- ESC Menu
            -- DisableControlAction(0, `INPUT_VEH_LOOK_BEHIND`, true) -- VehicleMouseControlOverride
            --
            -- DisableControlAction(0, `INPUT_MELEE_ATTACK`, true)
            -- DisableControlAction(0, `INPUT_ATTACK`, true)
            -- DisableControlAction(0, `INPUT_HORSE_ATTACK`, true)
            -- DisableControlAction(0, `INPUT_VEH_ATTACK`, true)
            -- DisableControlAction(0, `INPUT_ATTACK2`, true)
            -- DisableControlAction(0, `INPUT_HORSE_ATTACK2`, true)
            -- DisableControlAction(0, `INPUT_VEH_ATTACK2`, true)
            --
            -- DisableControlAction(0, 0xE8342FF2, true) -- LALT

            Citizen.Wait(0)
        end
        SendNUIMessage({
            type = 'setGizmoState',
            data = {
                shown = false
            }
        })
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
    GizmoThreadStarted = false
end)

AddEventHandler("stopGizmo", function()
    SendNUIMessage({
        type = 'setGizmoState',
        data = {
            shown = false
        }
    })
end)

AddEventHandler('onResourceStop', function(resourceName)
    GizmoThreadStarted = false
    if resourceName == GetCurrentResourceName() then
        SendNUIMessage({
            type = 'setGizmoState',
            data = {
                shown = false
            }
        })
    end
end)

