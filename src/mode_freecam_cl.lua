local Speed = {}
Speed.Fast = 3
Speed.Default = 0.2
Speed.Fine = 0.33
Speed.Current = Speed.Default
Speed.RateChange = 6
Speed.Mouse = 6.0

local Fov = {}
Fov.Min = 10
Fov.Max = 90
Fov.Default = 48.84
Fov.RateChange = 6

local radian = math.pi / 180
local CamHandle = nil
local reframeCam = nil   -- in-flight da_cam spline during a reframe (released on stop)

GizmoMovedRecently = nil

-- Cursor-grab lock: while a mouse-driven mode (dev menu hold, da_xinteracts) owns
-- the NUI cursor, freecam must not consume the mouse — otherwise the mouse both
-- moves the cursor and rotates the camera (freecam reads the *disabled* mouse, so
-- DisableControlAction alone won't stop it). Owner-keyed so overlapping grabs
-- (e.g. dev menu + interact) don't clear each other.
CursorGrab = false
local cursorGrabOwners = {}
AddEventHandler("da_dev:cursorGrab", function(owner, active)
    if not owner then return end
    cursorGrabOwners[owner] = active and true or nil
    CursorGrab = next(cursorGrabOwners) ~= nil
end)

da_mode.register({
    name = "freecam",
    priority = 20,
    disableGame = true, -- suppress baseline Game keymaps (e.g. xanims x) while active
    onActivate = function()
        da_ui.send("ui_camera", {})

        local x, y, z = table.unpack(GetGameplayCamCoord())
        local pitch, roll, yaw = table.unpack(GetGameplayCamRot(2))
        local fov = GetGameplayCamFov()

        CameraControlThread:Start()
        CamHandle = CreateCam("DEFAULT_SCRIPTED_CAMERA", true)
        SetCamCoord(CamHandle, x, y, z)
        SetCamRot(CamHandle, pitch, roll, yaw, 2)
        SetCamFov(CamHandle, fov+0.0)
        RenderScriptCams(true, true, 500, true, true)
    end,
    onDeactivate = function()
        SetNuiFocus(false, false)
        SetNuiFocusKeepInput(false)

        if reframeCam then da_cam.release(reframeCam); reframeCam = nil end

        if not da_mode.isActive("noclip") then
            CameraControlThread:Stop()
        end
        RenderScriptCams(false, true, 500, true, true)
        SetCamActive(CamHandle, false)
        DetachCam(CamHandle)
        DestroyCam(CamHandle, true)
        CamHandle = nil

        if not da_mode.isActive("object") and not da_mode.isActive("noclip") then
            da_ui.send("ui_camera", { state = false })
            da_ui.send("toggleHelp", {
                mode = "camHelp",
                state = false,
            })
        end
    end,
    keymaps = {
        {
            key = "f",
            event = "justPressed",
            active = true,
            modifiers = { ctrl = false, shift = false },
            fn = function()
                da_mode.toggle("focus")
            end
        }, {
            key = "Escape",
            event = "justPressed",
            primary = true,
            fn = function()
                da_mode.deactivate("freecam")
            end
        },
        {
            key = "h",
            event = "justPressed",
            primary = true,
            fn = function()
                da_ui.send("toggleHelp", {
                    mode = "camHelp",
                    state = nil,
                })
            end,
        },
    }
})

da_mode.register({
    name = "noclip",
    priority = 10,
    disableGame = true, -- suppress baseline Game keymaps (e.g. xanims x) while active
    onActivate = function()
        local playerPedId = PlayerPedId()
        SetNuiFocus(true, false)
        SetNuiFocusKeepInput(true)
        FreezeEntityPosition(playerPedId, true)
        SetEntityInvincible(playerPedId, true)
        SetEntityVisible(playerPedId, false)
        NetworkSetEntityInvisibleToNetwork(playerPedId, true)
        da_ui.send("ui_camera", {})
        CameraControlThread:Start()
    end,
    onDeactivate = function()
        local playerPedId = PlayerPedId()
        SetNuiFocus(false, false)
        SetNuiFocusKeepInput(false)
        if not da_mode.isActive("freecam") then
            CameraControlThread:Stop()
        end
        FreezeEntityPosition(playerPedId, false)
        SetEntityVisible(playerPedId, true)
        NetworkSetEntityInvisibleToNetwork(playerPedId, false)
        Citizen.SetTimeout(5000, function() SetEntityInvincible(playerPedId, false) end)

        if not da_mode.isActive("object") and not da_mode.isActive("freecam") then
            da_ui.send("ui_camera", { state = false })
        end
    end,
    keymaps = {
        {
            key = "Escape",
            event = "justPressed",
            primary = true,
            fn = function()
                da_mode.deactivate("noclip")
            end
        },
    }
})

da_mode.register({
    name = "focus",
    onActivate = function()
        local trackedObject = Select
        if trackedObject then
            log.debug(("Focusing on object %s"):format(trackedObject))
            PointCamAtEntity(CamHandle, trackedObject)
        end
        da_ui.send("ui_camera", { focus = true, })
    end,
    onDeactivate = function()
        StopCamPointing(CamHandle)
        da_ui.send("ui_camera", { focus = false, })
    end,
})

da_trie.addOpt("devRoot", "freecam", "f", function() da_mode.toggle("freecam") end)
da_trie.addOpt("devRoot", "noclip", "z", function() da_mode.toggle("noclip") end)
da_trie.addOpt("objRoot", "noclip", "z", function() da_mode.toggle("noclip") end)

local Clamp = function(val, min, max)
    if val < min then
        return min
    elseif val > max then
        return max
    end
    return val
end

local GetCoords = function(ped)
    if da_mode.isActive("freecam") then
        return table.unpack(GetCamCoord(CamHandle))
    else
        return table.unpack(GetEntityCoords(ped))
    end
end

local SetCoords = function(ped, x, y, z, rot_x, rot_y, rot_z, fov)
    if da_mode.isActive("freecam") then
        SetCamCoord(CamHandle, x, y, z)
        SetCamRot(CamHandle, rot_x, 0.0, rot_z, 2)
        SetCamFov(CamHandle, fov+0.0)
        if da_mode.isActive("focus") then
            local selectedObject = Select
            if selectedObject then
                if not IsCameraLockActive then
                    PointCamAtEntity(CamHandle, selectedObject)
                else
                    StopCamPointing(CamHandle)
                end
            else
                da_mode.deactivate("focus")
            end
        end
    elseif da_mode.isActive("noclip") then
        -- Only noclip moves the PLAYER. (Guard, not `else`: on freecam teardown the
        -- controller clears mode.active before onDeactivate, so the control thread
        -- runs one last frame with neither mode active — an `else` here would
        -- rotate/teleport the player to the final camera pose.)
        SetEntityRotation(ped, 0, 0, rot_z)
        SetEntityCoordsNoOffset(ped, x, y, z, true, true, true)
    end
end

---Translate directional coordinate translation based on direction of camera
---@param x number Origin X Coordinate
---@param y number Origin Y Coordinate
---@param z number Origin Z Coordinate
---@param rot_x number Rotation X
---@param rot_z number Rotation Z
---@param dist number Distance to translate coordinates - Forward/Left(+)/Backward/Right(-)
---@param strafe boolean? Translate Left(+)/Right(-)
---@return number x Translated X Coordinate
---@return number y Translated Y Coordinate
---@return number z Translated Z Coordinate
local Translate = function(x, y, z, rot_x, rot_z, dist, strafe)
    local math_rot_x, math_rot_y, math_rot_z, res_x, res_y, res_z
    -- if da_mode.isActive("focus") then rot_x = 0; end -- Treat movement as if we are looking straight in focus mode
    -- rot_x = 0 -- Always treat movement as if we are looking straight (TODO toggle for above behavior later)

    if strafe then
        rot_z = rot_z + 90 -- Strafe calculation, calculate speed 90 degrees from aim
        rot_x = 0 -- Ignore up/down tilt in result calculation
    end

    math_rot_x = -math.sin(radian * rot_z) * math.abs(math.cos(radian * rot_x))
    math_rot_y = math.cos(radian * rot_z) * math.abs(math.cos(radian * rot_x))
    math_rot_z = math.sin(radian * rot_x)

    res_x = x + math_rot_x * dist
    res_y = y + math_rot_y * dist
    res_z = z + math_rot_z * dist

    return res_x, res_y, res_z
end

---Control check tick and coordinate translation for noclip movement
---@param x number Origin X Coordinate
---@param y number Origin Y Coordinate
---@param z number Origin Z Coordinate
---@param rot_x number Rotation X
---@param rot_z number Rotation Z
---@param fov number Field of View
---@return number x Translated X Coordinate
---@return number y Translated Y Coordinate
---@return number z Translated Z Coordinate
---@return number rot_x Translated Rotation X
---@return number rot_y Translated Rotation X
---@return number rot_z Translated Rotation Z
---@return number fov Translated Field of View
local CheckMovementControls = function(x, y, z, rot_x, rot_y, rot_z, fov)
    DisableAllControlActions(0)
    -- A cursor-grab mode owns the mouse: freeze freecam (no mouse aim, no movement)
    -- so the pointer only drives the menu, not the camera.
    if CursorGrab then
        return x, y, z, rot_x, rot_y, rot_z, fov
    end
    local enableMouseAim = not da_mode.isActive("freecam")

    local deltaLR = GetDisabledControlNormal(0, dat.keyHash['MouseLR'])
    local deltaUD = GetDisabledControlNormal(0, dat.keyHash['MouseUD'])
    local pressed = da_control.isPressed(
        { "a", "d", "e", "q", "s", "w", "x", "Spacebar", "alt", "ctrl", "shift", "WheelUp", "WheelDown", "MouseRight", })
    local justPressed = da_control.isJustPressed({ "x", })
    local modifier = Speed.Current

    -- Mouse Controls
    if pressed.ctrl and not (pressed.shift or pressed.w or pressed.a or pressed.s or pressed.d or pressed.q or pressed.e) then
        enableMouseAim = false
        -- Pressed Ctrl move camera on X/Y coordinate plane
        if deltaLR ~= 0.0 then
            x, y, _ = Translate(x, y, z, rot_x, rot_z, 0-(deltaLR*modifier*2), true)
        end
        if deltaUD ~= 0.0 then
            x, y, _ = Translate(x, y, z, rot_x, rot_z, 0-(deltaUD*modifier*2))
        end
    elseif pressed.shift and not (pressed.ctrl or pressed.w or pressed.a or pressed.s or pressed.d or pressed.q or pressed.e) then
        enableMouseAim = false
        -- Press Shift move camera on X/Z coordinate plane
        if deltaLR ~= 0.0 then
            x, y, _ = Translate(x, y, z, rot_x, rot_z, 0-(deltaLR*modifier*2), true)
        end
        if deltaUD ~= 0.0 then
            z = z - deltaUD*modifier*2
        end
    elseif pressed.shift and pressed.ctrl and not (pressed.w or pressed.a or pressed.s or pressed.d or pressed.q or pressed.e) then
        enableMouseAim = false
        -- Press Shift+Ctrl move camera on Y/Z coordinate plane
        if deltaLR ~= 0.0 then
            x, y, z = Translate(x, y, z, rot_x, rot_z, 0-(deltaLR*modifier*2), true)
        end
        if deltaUD ~= 0.0 then
            x, y, z = Translate(x, y, z, rot_x, rot_z, 0-(deltaUD*modifier*2))
        end
    elseif pressed.alt then
        -- Press Alt adjust FOV on Mouse Up/Down

        if justPressed.x then
            fov = Fov.Default
        end
        if deltaUD ~= 0.0 then
            fov = Clamp(fov + (deltaUD * Fov.RateChange), Fov.Min, Fov.Max)
        end
        -- if deltaLR ~= 0.0 then
        --     rot_z = rot_z + deltaLR * -1.0 * (Speed.Mouse * (math.min(fov,50)/50))
        -- end
    elseif not da_mode.isActive("focus") and (not da_mode.isActive("gizmo") or da_mcp.active) then
        -- Otherwise Mouse aims camera
        if deltaLR ~= 0.0 then
            rot_z = rot_z + deltaLR * -1.0 * (Speed.Mouse * (math.min(fov,50)/50))
        end
        if deltaUD ~= 0.0 then
            rot_x = Clamp(rot_x + deltaUD * -1.0 * (Speed.Mouse * (math.min(fov,50)/50)), -89.9, 89.9)
        end
    end

    -- Speed Modifier
    if pressed.shift then modifier = (modifier * Speed.Fast)
    elseif pressed.Spacebar then modifier = (modifier * Speed.Fine)
    end

    if pressed.WheelUp then
        Speed.Current = Speed.Current + (Speed.Current / Speed.RateChange)
    elseif pressed.WheelDown then
        Speed.Current = Speed.Current - (Speed.Current / Speed.RateChange)
    end

    -- Translate Coordinates
    if pressed.w then x, y, z = Translate(x, y, z, rot_x, rot_z, modifier) end
    if pressed.a then x, y, z = Translate(x, y, z, rot_x, rot_z, modifier, true) end
    if pressed.s then x, y, z = Translate(x, y, z, rot_x, rot_z, 0 - modifier) end
    if pressed.d then x, y, z = Translate(x, y, z, rot_x, rot_z, 0 - modifier, true) end
    if pressed.e then z = z + (modifier/2) end
    if pressed.q then z = z - (modifier/2) end

    if enableMouseAim then
        EnableControlAction(0, dat.keyHash['MouseLR'])
        EnableControlAction(0, dat.keyHash['MouseUD'])
    end

    -- Set Coords
    return x, y, z, rot_x, rot_y, rot_z, fov
end

local lastSpeed = nil
lazy.camUpdate = function(speed)
    if lastSpeed == speed then return; end
    lastSpeed = speed
    da_ui.send("updateCamera", {
        camera = {
            speed = ("%.2f"):format(speed),
            -- cameraMode = da_mode.isActive("focus") and "" or "",
            -- noclip = da_mode.isActive("freecam") and "" or da_mode.isActive("noclip") and "" or "",
        }
    })
end

CameraControlThread = {}
function CameraControlThread:Start()
    local playerPedId = PlayerPedId()
    local x, y, z = GetCoords(playerPedId)
    local rot_x, rot_y, rot_z = table.unpack(GetFinalRenderedCamRot())
	local fov = GetFinalRenderedCamFov()  -- seed from the rendered cam so a reframed fov survives a control resume
    self.active = true
    Citizen.CreateThread(function()
        while self.active do
            lazy(100).camUpdate(Speed.Current)
            Citizen.Wait(0)
            x, y, z = GetCoords(playerPedId)
            rot_x, rot_y, rot_z = table.unpack(GetFinalRenderedCamRot())
            x, y, z, rot_x, rot_y, rot_z, fov = CheckMovementControls(x, y, z, rot_x, rot_y, rot_z, fov)
            SetCoords(playerPedId, x, y, z, rot_x, rot_y, rot_z, fov)
        end
        self.active = false
    end)
end

function CameraControlThread:Stop()
    self.active = false
end

-- ---- external camera control (wardrobe/tack cinematic framing) ----
-- freecam stays the owner of CamHandle (one scripted cam, no conflicts). An
-- editor engages freecam, then drives smooth moves through these exports, which
-- use da_cam's spline to fly CamHandle between framed poses.
local function reframeFreecam(toPose, duration, smoothing)
    if not da_mode.isActive("freecam") or not CamHandle or type(toPose) ~= "table" then return end
    -- pause WASD control, spline the view from here to the target pose, then hand
    -- the freecam cam back at the destination and resume control seeded there.
    CameraControlThread:Stop()
    if reframeCam then da_cam.release(reframeCam); reframeCam = nil end
    -- Read the start pose while CamHandle is still the rendered cam, THEN hand the
    -- render to the spline cam (deactivate CamHandle so it isn't competing for the
    -- render — otherwise the spline plays on an unshown cam and the move cuts).
    local from = da_cam.currentPose()
    SetCamActive(CamHandle, false)
    -- arc around the subject (not a straight chord) for big swings — e.g. coming
    -- to the front from the side/behind, where a 2-node spline skims the head.
    reframeCam = da_cam.splineArc(from, toPose, { duration = duration or 1100, smoothing = smoothing or 0 })
    local cam = reframeCam
    Citizen.CreateThread(function()
        da_cam.waitSpline(cam, (duration or 1100) + 1500)
        if reframeCam ~= cam then return end   -- superseded or torn down mid-move
        reframeCam = nil
        if da_mode.isActive("freecam") and CamHandle then
            SetCamCoord(CamHandle, toPose.pos.x, toPose.pos.y, toPose.pos.z)
            SetCamRot(CamHandle, toPose.rot.x, toPose.rot.y, toPose.rot.z, 2)
            SetCamFov(CamHandle, (toPose.fov or 45.0) + 0.0)
            SetCamActive(CamHandle, true)
            da_cam.release(cam)
            CameraControlThread:Start()
        else
            da_cam.release(cam)
        end
    end)
end

exports("startFreecam", function() if not da_mode.isActive("freecam") then da_mode.activate("freecam") end end)
exports("stopFreecam", function() if da_mode.isActive("freecam") then da_mode.deactivate("freecam") end end)
exports("reframeFreecam", function(toPose, duration, smoothing) reframeFreecam(toPose, duration, smoothing) end)

AddEventHandler('onResourceStop', function(resourceName)
    GizmoThreadStarted = false
    if resourceName == GetCurrentResourceName() then
        da_mode.deactivate("freecam")
    end
end)
