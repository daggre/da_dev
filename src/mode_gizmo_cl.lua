function StartGizmo(entity)
    if not entity then return; end
    if not DoesEntityExist(entity) then return; end
    da_mode.activate("gizmo")
    Citizen.Wait(100)
    da_ui.send("setGizmoEntity", { data = {
        name = GetEntityModel(entity),
        handle = entity,
        position = GetEntityCoords(entity),
        rotation = GetEntityRotation(entity) * vec3(1, -1, 1), -- Gizmo is swapping the y rot, so correct for that ahead of time
    }})
end

local GizmoThreadStarted = false
function GizmoThread()
    if GizmoThreadStarted then return; end
    GizmoThreadStarted = true
    Citizen.CreateThread(function()
        while GizmoThreadStarted do
            da_ui.send("setCameraPosition", { data = {
                position = GetFinalRenderedCamCoord(),
                rotation = GetFinalRenderedCamRot()
            }})
            Citizen.Wait(0)
        end
        if da_mode.isActive("gizmo") then da_mode.deactivate("gizmo") end
        GizmoThreadStarted = false
    end)
end

local gizmoMovementEndTime = GetGameTimer()
IsCameraLockActive = false
local lockCameraDuringGizmoMovement = function()
    local mouseLeft = `INPUT_ATTACK`
    if IsCameraLockActive or not gizmoMovementEndTime then return end
    IsCameraLockActive = true

    while gizmoMovementEndTime > GetGameTimer() or
        IsControlPressed(0, mouseLeft) == 1 or
        IsDisabledControlPressed(0, mouseLeft) == 1 do
        Citizen.Wait(50)
    end

    gizmoMovementEndTime = nil
    IsCameraLockActive = false
end

da_mode.register({
    name = "gizmo",
    priority = 100,
    onActivate = function()
        local entity = Select
        if not entity then return; end
        log.debug("Gizmo activated")
        SetNuiFocus(true, true)
        SetNuiFocusKeepInput(true)
        Hover = nil
        SelectMode = "Cursor"
        GizmoThread()
        da_ui.send("setGizmoState", { data = { shown = true }})
        Citizen.Wait(100)
        da_ui.send("setGizmoEntity", { data = {
            name = GetEntityModel(entity),
            handle = entity,
            position = GetEntityCoords(entity),
            rotation = GetEntityRotation(entity) * vec3(1, -1, 1), -- Gizmo is swapping the y rot, so correct for that ahead of time
        }})
    end,
    onDeactivate = function()
        SetNuiFocus(false, false)
        SetNuiFocusKeepInput(false)
        da_ui.send("setGizmoState", { data = { shown = false }})
        GizmoThreadStarted = false
        da_mcp.deactivate()
    end,
    activateMCP = function()
        if da_mcp.active then return; end
        return da_mcp.activate({
            key = dat.keyHash['MouseScrollClick'],
            activate = function()
                SelectMode = "Crosshair"
                if not da_mode.isPrimary("gizmo") then return; end
                SetNuiFocus(false, false)
                SetNuiFocusKeepInput(false)
            end,
            deactivate = function()
                SelectMode = "Cursor"
                if not da_mode.isPrimary("gizmo") then return; end
                SetNuiFocus(true, true)
                SetNuiFocusKeepInput(true)
                da_ui.send("mcp", { active = false, })
            end,
        })
    end,
    deactivateMCP = function()
        return da_mcp.deactivate()
    end,
    keymaps = {
        {
            key = "Escape",
            event = "justReleased",
            primary = true,
            fn = function()
                da_mode.deactivate("gizmo")
            end
        },
    }
})

da_ui.events({
    moveGizmoEntity = function(data)
        if data.handle then
            if DoesEntityExist(data.handle) then
                SetEntityCoords(data.handle, data.position.x, data.position.y, data.position.z)
                SetEntityRotation(data.handle, data.rotation.x, data.rotation.y, data.rotation.z)
            end
        end
        gizmoMovementEndTime = GetGameTimer() + 100
        lockCameraDuringGizmoMovement()
    end,
    gizmoStop = function() da_mode.deactivate("gizmo") end,
})

da_net.events({
    onResourceStop = function(resourceName)
        if resourceName == GetCurrentResourceName() then
            GizmoThreadStarted = false
            da_mode.deactivate("gizmo")
        end
    end,
})
