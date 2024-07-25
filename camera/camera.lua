HoveredObject = nil
SelectedObject = nil
GizmoMovedRecently = nil

Camera = {}
Camera.Handle = nil
Camera.Mode = "player"

local NoClip = {}
NoClip.Enabled = false

local Speed = {}
Speed.Fast = 5
Speed.Default = 0.1
Speed.Fine = 0.45
Speed.Current = Speed.Default
Speed.RateChange = 6

local Fov = {}
Fov.RateChange = 18
Fov.Max = 90
Fov.Min = 10

local Control = {}
Control.W = `INPUT_MOVE_UP_ONLY`
Control.A = `INPUT_MOVE_LEFT_ONLY`
Control.S = `INPUT_MOVE_DOWN_ONLY`
Control.D = `INPUT_MOVE_RIGHT_ONLY`
Control.Q = `INPUT_FRONTEND_LB`
Control.Crouch = `INPUT_DUCK`
Control.E = `INPUT_DYNAMIC_SCENARIO`
Control.F = `INPUT_CONTEXT_B`
Control.Spacebar = `INPUT_JUMP`
Control.LeftAlt = `INPUT_PC_FREE_LOOK`
Control.LAlt = 0x8AAA0AD4
Control.LeftShift = `INPUT_SPRINT`
Control.LeftControl = `INPUT_FRONTEND_RUP`
Control.MouseLR = `INPUT_LOOK_LR`
Control.MouseUD = `INPUT_LOOK_UD`
Control.MouseLeft = `SKIPCUTSCENE`
Control.MouseSpeed = 6.0
Control.WheelUp = `INPUT_PREV_WEAPON`
Control.WheelDown = `INPUT_NEXT_WEAPON`

local radian = math.pi / 180

local CheckControls = function()
    if IsDisabledControlJustPressed(0, Control.F) then
        if Camera.Mode == "free" then
            if IsDisabledControlPressed(0, Control.LAlt) and HoveredObject then
                SelectedObject = HoveredObject
            end
            if not SelectedObject then
                SelectedObject = HoveredObject
            end
            local obj = SelectedObject
            if obj then
                da.Dev.Mode.Add("focus")
                Camera.Mode = "focus"
                PointCamAtEntity(Camera.Handle, obj)
            end
        elseif Camera.Mode == "focus" then
            da.Dev.Mode.Remove("focus")
            Camera.Mode = "free"
            StopCamPointing(Camera.Handle)
        end
    elseif Camera.Mode == "focus" and not SelectedObject then
        da.Dev.Mode.Remove("focus")
        Camera.Mode = "free"
        StopCamPointing(Camera.Handle)
    end
end

local GetCoords = function(ped)
    if Camera.Mode == "free" or Camera.Mode == "focus" then
        return table.unpack(GetCamCoord(Camera.Handle))
    elseif Camera.Mode == "player" then
        return table.unpack(GetEntityCoords(ped))
    end
end

local SetCoords = function(ped, x, y, z, rot_x, rot_y, rot_z, fov)
    if Camera.Mode == "free" or Camera.Mode == "focus" then
        SetCamCoord(Camera.Handle, x, y, z)
        SetCamRot(Camera.Handle, rot_x, 0.0, rot_z, 2)
        SetCamFov(Camera.Handle, fov+0.0)
        if Camera.Mode == "focus" then
            local obj = SelectedObject
            if obj then
                if ActiveMode ~= "gizmo" or not GizmoMovedRecently then
                -- if ActiveMode ~= "gizmo" or not IsControlPressed(0, `SKIPCUTSCENE`) then
                    PointCamAtEntity(Camera.Handle, obj)
                else
                    StopCamPointing(Camera.Handle)
                end
            else
                StopCamPointing(Camera.Handle)
            end
        end
    elseif Camera.Mode == "player" then
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
---@param dist number Distance to translate coordinates - Positive(Forward/Left) / Negative(Backward/Right)
---@param strafe boolean? Translate Left(+)/Right(-)
---@return number x Translated X Coordinate
---@return number y Translated Y Coordinate
---@return number z Translated Z Coordinate
local Translate = function(x, y, z, rot_x, rot_z, dist, strafe)
    local math_rot_x, math_rot_y, math_rot_z, res_x, res_y, res_z
    if Camera.Mode == "focus" then rot_x = 0; end

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
local ControlTranslation = function(x, y, z, rot_x, rot_z, fov)
    if IsDisabledControlPressed(0, Control.WheelUp) then
        if IsDisabledControlPressed(0, Control.LeftControl) then
            local fovDelta = fov / Fov.RateChange
            fov = math.max(fov - fovDelta, Fov.Min)
        else
            Speed.Current = Speed.Current + (Speed.Current / Speed.RateChange)
        end
    elseif IsDisabledControlPressed(0, Control.WheelDown) then
        if IsDisabledControlPressed(0, Control.LeftControl) then
            local fovDelta = fov / Fov.RateChange
            fov = math.min(fov + fovDelta, Fov.Max)
        else
            Speed.Current = Speed.Current - (Speed.Current / Speed.RateChange)
        end
    end

    local modifier = Speed.Current

    -- Speed Modifier
    if IsDisabledControlPressed(0, Control.LeftShift) then
        modifier = Speed.Fast
    elseif IsDisabledControlPressed(0, Control.Spacebar) then
        modifier = (modifier * Speed.Fine)
    end

    -- Translate Coordinates
    if IsDisabledControlPressed(0, Control.W) then
        x, y, z = Translate(x, y, z, rot_x, rot_z, modifier)
    end
    if IsDisabledControlPressed(0, Control.S) then
        x, y, z = Translate(x, y, z, rot_x, rot_z, 0 - modifier)
    end
    if IsDisabledControlPressed(0, Control.A) then
        x, y, z = Translate(x, y, z, rot_x, rot_z, modifier, true)
    end
    if IsDisabledControlPressed(0, Control.D) then
        x, y, z = Translate(x, y, z, rot_x, rot_z, 0 - modifier, true)
    end
    if IsDisabledControlPressed(0, Control.Q) then
        z = z + (modifier/2)
    end
    if IsDisabledControlPressed(0, Control.E) then
        z = z - (modifier/2)
    end


    if Camera.Mode == "free" and (ActiveMode ~= "gizmo" or Mode.gizmo.modified and Mode.gizmo.modified.focusCursor == false) then
        local deltaLR = GetDisabledControlNormal(0, Control.MouseLR)
        local deltaUD = GetDisabledControlNormal(0, Control.MouseUD)

        if deltaLR ~= 0.0 then
            rot_z = rot_z + deltaLR * -1.0 * (Control.MouseSpeed * (math.min(fov,50)/50))
        end
        if deltaUD ~= 0.0 then
            rot_x = math.max(math.min(89.9, rot_x + deltaUD * -1.0 * (Control.MouseSpeed * (math.min(fov,50)/50))), -89.9)
        end
    end

    -- Set Coords
    return x, y, z, rot_x, rot_z, fov
end

---Begin noclip movement and control thread
InitCamControl = function()
    local playerPedId = PlayerPedId()
    local x, y, z = GetCoords(playerPedId)
    local rot_x, rot_y, rot_z = table.unpack(GetFinalRenderedCamRot())
	local fov = GetGameplayCamFov()
    Citizen.CreateThread(function()
        while Camera.Mode == "free" or Camera.Mode == "focus" or NoClip.Enabled do
            -- Send NUI message with camera info for display
            if da.Cache.Lazy.Delay("dadev","camUpdate",100) then
                SendNUIMessage({
                    type = "displayHUD",
                    value = "cameraHUD",
                    mode = "on",
                    camera = {
                        speed = ("%.2f"):format(Speed.Current),
                        cameraMode = Camera.Mode == "focus" and "" or "",
                        noclip = Camera.Mode ~= "player" and "" or NoClip.Enabled and "" or "",
                    },
                })
            end
            DisableAllControlActions(0)
            if Camera.Mode == "player" then
                EnableControlAction(0, Control.MouseLR)
                EnableControlAction(0, Control.MouseUD)
            end
            Citizen.Wait(0)
            x, y, z = GetCoords(playerPedId)
            rot_x, rot_y, rot_z = table.unpack(GetFinalRenderedCamRot())
            x, y, z, rot_x, rot_z, fov = ControlTranslation(x, y, z, rot_x, rot_z, fov)
            SetCoords(playerPedId, x, y, z, rot_x, rot_y, rot_z, fov)
            CheckControls()
        end
        SendNUIMessage({
            type = "displayHUD",
            value = "cameraHUD",
            mode = "off",
        })
    end)
end

function EnableFreeCam()
	local x, y, z = table.unpack(GetGameplayCamCoord())
	local pitch, roll, yaw = table.unpack(GetGameplayCamRot(2))
	local fov = GetGameplayCamFov()
	Camera.Handle = CreateCam("DEFAULT_SCRIPTED_CAMERA", true)
	SetCamCoord(Camera.Handle, x, y, z)
	SetCamRot(Camera.Handle, pitch, roll, yaw, 2)
	SetCamFov(Camera.Handle, fov+0.0)
	RenderScriptCams(true, true, 500, true, true)
    da.Dev.Mode.Add("freecam")
end

function DisableFreeCam()
    da.Dev.Mode.Remove("freecam")
    RenderScriptCams(false, true, 500, true, true)
    SetCamActive(Camera.Handle, false)
    DetachCam(Camera.Handle)
    DestroyCam(Camera.Handle, true)
    Camera.Handle = nil
end

-- da.Dev.Menu.RegisterMenu("root", "camera", "c")
-- da.Dev.Menu.RegisterMenu("objectRoot", "camera", "c")

-- da.Dev.Menu.RegisterOption("camera", "free", "f", function()
--     if Camera.Mode ~= "free" then
--         Camera.Mode = "free"
--         EnableFreeCam()
--         InitCamControl()
--     end
-- end, function() return Camera.Mode == "player" end)

-- da.Dev.Menu.RegisterOption("camera", "player", "g", function()
--     if Camera.Mode ~= "player" then
--         Camera.Mode = "player"
--         DisableFreeCam()
--     end
-- end, function() return Camera.Mode == "free" end)

RegisterNUICallback("camera", function(data, cb)
    if data.mode == "free" then
        if Camera.Mode ~= "free" then
            Camera.Mode = "free"
            EnableFreeCam()
            InitCamControl()
        end
    elseif data.mode == "player" then
        if Camera.Mode ~= "player" then
            Camera.Mode = "player"
            DisableFreeCam()
        end
    end
    cb({})
end)

RegisterNUICallback("noclip", function(data, cb)
    da.Dev.NoClip(data.mode == "on")
    cb(true)
end)

da.Dev.Menu.RegisterOption("root", "toggle cam", "c", function()
    if Camera.Mode == "free" then
        Camera.Mode = "player"
        DisableFreeCam()
    elseif Camera.Mode == "player" then
        Camera.Mode = "free"
        EnableFreeCam()
        InitCamControl()
    end
end)

da.Dev.NoClip = function(state)
    local playerPedId = PlayerPedId()
    if state == nil then
        NoClip.Enabled = not NoClip.Enabled
    else
        NoClip.Enabled = state
    end
    if NoClip.Enabled then
        FreezeEntityPosition(playerPedId, true)
        SetEntityInvincible(playerPedId, true)
        SetEntityVisible(playerPedId, false)
        NetworkSetEntityInvisibleToNetwork(playerPedId, true)
        da.Dev.Mode.Add("noclip")
        InitCamControl()
    else
        da.Dev.Mode.Remove("noclip")
        FreezeEntityPosition(playerPedId, false)
        SetEntityVisible(playerPedId, true)
        NetworkSetEntityInvisibleToNetwork(playerPedId, false)
        Citizen.SetTimeout(5000, function() SetEntityInvincible(playerPedId, false) end)
    end
end

AddEventHandler('onResourceStop', function(resourceName)
    gizmoThreadStarted = false
    if resourceName == GetCurrentResourceName() then
        DisableFreeCam()
    end
end)

