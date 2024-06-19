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
            rotation = GetEntityRotation(entity),
        }
    })
    SetNuiFocus(true, true)
    SetNuiFocusKeepInput(true)
    GizmoThread()
end

local gizmoThreadStarted = false
function GizmoThread()
    if gizmoThreadStarted then
        return
    end
    gizmoThreadStarted = true
    Citizen.CreateThread(function()
        while gizmoThreadStarted do
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

            DisablePlayerFiring(ped, true)
            if not IsDisabledControlPressed(0, `INPUT_AIM`, true) then
                DisableAllControlActions(0)
                if IsDisabledControlPressed(0, `INPUT_FRONTEND_RRIGHT`, true) then
                    break
                end
            end

            if IsDisabledControlPressed(0, 0x8FFC75D6) and IsDisabledControlJustPressed(0, `INPUT_MOVE_RIGHT_ONLY`) then
                local model = GetEntityModel(gizmoEntity)
                local pos = GetEntityCoords(gizmoEntity)
                local rot = GetEntityRotation(gizmoEntity)
                da.Obj.Create(model, pos, { rotation = rot, })
            end

            -- TODO: Add Undo for object
            -- if not IsDisabledControlPressed(0, `INPUT_AIM`, true) then
            --     DisableControlAction(0, `INPUT_LOOK_LR`, true) -- Look Left/Right
            --     DisableControlAction(0, `INPUT_LOOK_UD`, true) -- Look Up/Down
            -- end
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
        SetNuiFocus(false, false)
        gizmoThreadStarted = false
    end)
end

RegisterNUICallback('moveGizmoEntity', function(data, cb)
    if data.handle then
        if DoesEntityExist(data.handle) then
            SetEntityCoords(data.handle, data.position.x, data.position.y, data.position.z)
            SetEntityRotation(data.handle, data.rotation.x, data.rotation.y, data.rotation.z)
        end
    end

    cb(true)
end)

RegisterNUICallback('gizmoStop', function()
    gizmoThreadStarted = false
    cb(true)
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
    gizmoThreadStarted = false
    if resourceName == GetCurrentResourceName() then
        SendNUIMessage({
            type = 'setGizmoState',
            data = {
                shown = false
            }
        })
    end
end)

RegisterCommand("startGizmo", function(source, args, rawCommand)
    local entity = GetPlayerPed()
    if args[1] then
        entity = tonumber(args[1])
    end
    TriggerEvent("startGizmo", entity)
end, false)

RegisterCommand("stopGizmo", function(source, args, rawCommand)
    gizmoThreadStarted = false
end, false)
