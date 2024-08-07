HoveredObject = nil
SelectedObject = nil
GizmoMovedRecently = nil

Camera = {}
Camera.Handle = nil
Camera.Mode = "player"

local NoClip = {}
NoClip.Enabled = false

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
Fov.RateChange = 6

local radian = math.pi / 180

local clamp = function(val, min, max)
    if val < min then
        return min
    elseif val > max then
        return max
    end
    return val
end

local CheckControls = function()
    if IsDisabledControlJustPressed(0, Control.MouseLeft) then
        if HoveredObject then
            SelectedObject = HoveredObject
        end
    end

    if IsDisabledControlJustPressed(0, Control.F) then
        if Camera.Mode == "free" then
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
---@return number rot_x Translated X Rotation
---@return number rot_y Translated Y Rotation
---@return number rot_z Translated Z Rotation
local ControlTranslation = function(x, y, z, rot_x, rot_z, fov)

    local deltaLR = GetDisabledControlNormal(0, Control.MouseLR)
    local deltaUD = GetDisabledControlNormal(0, Control.MouseUD)
    local pressed = {
        W = IsDisabledControlPressed(0, Control.W),
        S = IsDisabledControlPressed(0, Control.S),
        A = IsDisabledControlPressed(0, Control.A),
        D = IsDisabledControlPressed(0, Control.D),
        Q = IsDisabledControlPressed(0, Control.Q),
        E = IsDisabledControlPressed(0, Control.E),
        LAlt = IsDisabledControlPressed(0, Control.LeftAlt),
        LCtrl = IsDisabledControlPressed(0, Control.LeftControl),
        LShift = IsDisabledControlPressed(0, Control.LeftShift),
        WheelUp = IsDisabledControlPressed(0, Control.WheelUp),
        WheelDown = IsDisabledControlPressed(0, Control.WheelDown),
        Spacebar = IsDisabledControlPressed(0, Control.Spacebar),
        MouseRight = IsDisabledControlPressed(0, Control.MouseRight),
    }

    local modifier = Speed.Current

    -- Mouse Controls
    if pressed.LCtrl then
        -- Press LCtrl adjust FOV on Mouse Up/Down
        if deltaUD ~= 0.0 then
            fov = clamp(fov + (deltaUD * Fov.RateChange), Fov.Min, Fov.Max)
        end
        -- if deltaLR ~= 0.0 then
        --     rot_z = rot_z + deltaLR * -1.0 * (Speed.Mouse * (math.min(fov,50)/50))
        -- end
    elseif pressed.LShift and not (pressed.W or pressed.S or pressed.A or pressed.D) then
        -- Press LShift move camera on X/Y coordinate plane
        if deltaLR ~= 0.0 then
            x, y, _ = Translate(x, y, z, rot_x, rot_z, 0-(deltaLR*modifier*2), true)
        end
        if deltaUD ~= 0.0 then
            x, y, _ = Translate(x, y, z, rot_x, rot_z, 0-(deltaUD*modifier*2))
        end
    elseif pressed.LAlt and not (pressed.W or pressed.S or pressed.A or pressed.D) then
        -- Press LAlt move camera on X/Z coordinate plane
        if deltaLR ~= 0.0 then
            x, y, _ = Translate(x, y, z, rot_x, rot_z, 0-(deltaLR*modifier*2), true)
        end
        if deltaUD ~= 0.0 then
            z = z - deltaUD*modifier*2
        end
    elseif Camera.Mode ~= "focus" and (ActiveMode ~= "gizmo" or pressed.MouseRight) then
        -- Otherwise Mouse aims camera
        if deltaLR ~= 0.0 then
            rot_z = rot_z + deltaLR * -1.0 * (Speed.Mouse * (math.min(fov,50)/50))
        end
        if deltaUD ~= 0.0 then
            rot_x = clamp(rot_x + deltaUD * -1.0 * (Speed.Mouse * (math.min(fov,50)/50)), -89.9, 89.9)
        end
    end

    -- Speed Modifier
    if pressed.LShift then modifier = (modifier * Speed.Fast)
    elseif pressed.Spacebar then modifier = (modifier * Speed.Fine)
    end

    if pressed.WheelUp then
        Speed.Current = Speed.Current + (Speed.Current / Speed.RateChange)
    elseif pressed.WheelDown then
        Speed.Current = Speed.Current - (Speed.Current / Speed.RateChange)
    end

    -- Translate Coordinates
    if pressed.W then x, y, z = Translate(x, y, z, rot_x, rot_z, modifier) end
    if pressed.S then x, y, z = Translate(x, y, z, rot_x, rot_z, 0 - modifier) end
    if pressed.A then x, y, z = Translate(x, y, z, rot_x, rot_z, modifier, true) end
    if pressed.D then x, y, z = Translate(x, y, z, rot_x, rot_z, 0 - modifier, true) end
    if pressed.Q then z = z + (modifier/2) end
    if pressed.E then z = z - (modifier/2) end

    -- Set Coords
    return x, y, z, rot_x, rot_z, fov
end

local camControlThread = false
---Begin noclip movement and control thread
InitCamControl = function()
    local playerPedId = PlayerPedId()
    local x, y, z = GetCoords(playerPedId)
    local rot_x, rot_y, rot_z = table.unpack(GetFinalRenderedCamRot())
	local fov = GetGameplayCamFov()
    if camControlThread then return; end
    Citizen.CreateThread(function()
        camControlThread = true
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
        camControlThread = false
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
    if resourceName == GetCurrentResourceName() then
        DisableFreeCam()
    end
end)

