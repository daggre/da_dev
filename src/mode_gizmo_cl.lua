-- The entity the gizmo currently edits, and the GetEntityRotation read-order to seed it with.
-- Object mode leaves the order nil (default read); prop mode passes da_obj.xformReadOrder() so the
-- world rotation the gizmo hands back is in the same convention the bone math expects. Both are
-- cleared when the mode deactivates.
GizmoTarget = nil
GizmoRotOrder = nil

-- Seed the gizmo overlay with an entity's live WORLD transform. The gizmo swaps the Y rotation, so
-- pre-correct it here (and un-correct on the way back in moveGizmoEntity).
local function seedGizmo(entity)
    local rot = GizmoRotOrder and GetEntityRotation(entity, GizmoRotOrder) or GetEntityRotation(entity)
    da_ui.send("setGizmoEntity", { data = {
        name = GetEntityModel(entity),
        handle = entity,
        position = GetEntityCoords(entity),
        rotation = rot * vec3(1, -1, 1),
    }})
end

function StartGizmo(entity, rotOrder)
    if not entity then return; end
    if not DoesEntityExist(entity) then return; end
    GizmoTarget = entity
    GizmoRotOrder = rotOrder
    da_mode.activate("gizmo")
    Citizen.Wait(100)
    seedGizmo(entity)
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
            -- Own the input while the gizmo is up: no camera drift, no melee on left-click, no pause
            -- menu on Esc. Object mode gets this free from freecam's own disable loop; prop-launched
            -- gizmo has no freecam, so we disable here. In Crosshair mode (middle-click held) re-enable
            -- the look axes so the player can orbit the camera to reframe the prop. The MCP key and our
            -- keymaps read the DISABLED control variants, so this doesn't suppress them.
            DisableAllControlActions(0)
            if SelectMode == "Crosshair" then
                EnableControlAction(0, dat.keyHash['MouseLR'], true)
                EnableControlAction(0, dat.keyHash['MouseUD'], true)
            end
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
    disableGame = true, -- suppress baseline Game keymaps (e.g. xanims x) while active
    onActivate = function()
        local entity = GizmoTarget or Select
        if not entity then return; end
        log.debug("Gizmo activated")
        SetNuiFocus(true, true)
        SetNuiFocusKeepInput(false) -- cursor mode: NUI owns the mouse, game gets nothing (no camera/attack leak)
        Hover = nil
        SelectMode = "Cursor"
        GizmoThread()
        da_ui.send("setGizmoState", { data = { shown = true }})
        Citizen.Wait(100)
        seedGizmo(entity)
    end,
    onDeactivate = function()
        SetNuiFocus(false, false)
        SetNuiFocusKeepInput(false)
        da_ui.send("setGizmoState", { data = { shown = false }})
        GizmoThreadStarted = false
        GizmoTarget = nil
        GizmoRotOrder = nil
        if PropGizmoEnd then PropGizmoEnd() end -- let prop mode drop its gizmo proxy + frozen frame
        da_mcp.deactivate()
    end,
    activateMCP = function()
        if da_mcp.active then return; end
        return da_mcp.activate({
            key = dat.keyHash['MouseScrollClick'],
            activate = function()
                -- Crosshair: hand input to the game so the player can orbit the camera (the look
                -- axes are re-enabled in GizmoThread); NUI stays focused but cursorless.
                SelectMode = "Crosshair"
                if not da_mode.isPrimary("gizmo") then return; end
                SetNuiFocus(true, false)
                SetNuiFocusKeepInput(true)
            end,
            deactivate = function()
                -- Back to cursor: eat the middle-click release first so it doesn't leak, then give the
                -- mouse back to the NUI with game input off.
                SelectMode = "Cursor"
                da_control.waitForRelease(da_control.keys)
                da_ui.send("mcp", { active = false, })
                if not da_mode.isPrimary("gizmo") then return; end
                SetNuiFocus(true, true)
                SetNuiFocusKeepInput(false)
            end,
        })
    end,
    deactivateMCP = function()
        return da_mcp.deactivate()
    end,
    keymaps = {
        {
            key = "Escape",
            event = "justPressed", -- react on press; the native pause menu fires on press, so justReleased was too late
            primary = true,
            fn = function()
                da_mode.deactivate("gizmo")
            end
        },
    }
})

da_ui.events({
    moveGizmoEntity = function(data)
        if data.handle and DoesEntityExist(data.handle) then
            -- Always drive the handle in world space — the proven object-mode path. The PROP gizmo
            -- points this at an invisible FREE proxy, then reads it back into a bone-local offset
            -- (PropApplyGizmoProxy). Bouncing through SetEntityRotation/GetEntityRotation means the
            -- gizmo's own euler convention never has to be interpreted by hand (that was the bug).
            SetEntityCoords(data.handle, data.position.x, data.position.y, data.position.z)
            SetEntityRotation(data.handle, data.rotation.x, data.rotation.y, data.rotation.z)
            if PropGizmoProxy and data.handle == PropGizmoProxy then
                if PropApplyGizmoProxy then PropApplyGizmoProxy() end
            else
                -- flag the owning scene as having unsaved changes (mode_object_cl)
                if MarkSceneDirtyByHandle then MarkSceneDirtyByHandle(data.handle) end
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
