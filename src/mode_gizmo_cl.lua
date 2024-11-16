function StartGizmo(entity)
    if not entity then return; end
    if not DoesEntityExist(entity) then return; end
    da_mode.start("gizmo")
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
        if da_mode.isActive("gizmo") then da_mode.stop("gizmo") end
        GizmoThreadStarted = false
    end)
end

local gizmoMovementEndTime = GetGameTimer()
local isCameraLockActive = false
local lockCameraDuringGizmoMovement = function()
    if isCameraLockActive or not gizmoMovementEndTime then return end
    isCameraLockActive = true

    while gizmoMovementEndTime > GetGameTimer() do
        Citizen.Wait(200)
    end

    gizmoMovementEndTime = nil
    isCameraLockActive = false
end

da_mode.register({
    name = "gizmo",
    priority = 100,
    onActivate = function()
        SetNuiFocus(true, true)
        SetNuiFocusKeepInput(true)
        Hover = nil
        SelectMode = "Cursor"
        GizmoThread()
        da_ui.send("setGizmoState", { data = { shown = true }})
    end,
    onDeactivate = function()
        SetNuiFocus(false, false)
        SetNuiFocusKeepInput(false)
        da_ui.send("setGizmoState", { data = { shown = false }})
        GizmoThreadStarted = false
    end,
    keymaps = {
        c = {
            justReleased = {
                modifiers = { ctrl = false },
                fn = function()
                    da_mcp.activate({
                        key = da_control.keyHash['c'],
                        activate = function()
                            SetNuiFocus(true, false)
                            SetNuiFocusKeepInput(true)
                        end,
                        deactivate = function()
                            if not da_mode.isActive("gizmo") then return; end
                            SetNuiFocus(true, true)
                            SetNuiFocusKeepInput(true)
                        end,
                    })
                end
            },
        },
    }
})

-- da_mode.new("gizmo", {
--     priority = 100,
--     default = { focusKeyboard = true, focusCursor = true, keepFocus = true, },
--     passthrough = { focusCursor = false, },
--     updateFn = function(data)
--         SetNuiFocus(data.focusKeyboard, data.focusCursor)
--         SetNuiFocusKeepInput(data.keepFocus)
--         da_ui.send("controlPass", { enable = data.passthrough, })
--     end,
--     startFn = function()
--         Hover = nil
--         SelectMode = "Cursor"
--         GizmoThread()
--         da_ui.send("setGizmoState", { data = { shown = true }})
--     end,
--     stopFn = function()
--         da_ui.send("setGizmoState", { data = { shown = false }})
--         GizmoThreadStarted = false
--     end,
--     passthroughKey = da_control.keyHash['c'],
--     passthroughFn = function(state, haltKey, cb)
--         da_controlpass:set(state, haltKey, cb)
--     end,
--     passthroughCb = function()
--         da_control.waitForRelease(dat.keys)
--         da_mode.reset("gizmo")
--         da_ui.send("controlPass", { enable = false })
--     end,
-- })

da_ui.events({
    moveGizmoEntity = function(data)
        if data.handle then
            if DoesEntityExist(data.handle) then
                SetEntityCoords(data.handle, data.position.x, data.position.y, data.position.z)
                SetEntityRotation(data.handle, data.rotation.x, data.rotation.y, data.rotation.z)
            end
        end
        gizmoMovementEndTime = GetGameTimer() + 500
        lockCameraDuringGizmoMovement()
    end,
    gizmoStop = function() da_mode.deactivate("gizmo") end,
})

AddEventHandler('onResourceStop', function(resourceName)
    if resourceName == GetCurrentResourceName() then
        GizmoThreadStarted = false
        da_mode.deactivate("gizmo")
    end
end)
