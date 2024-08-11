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
Fov.Default = 48.84
Fov.RateChange = 6

local radian = math.pi / 180

local Clamp = function(val, min, max)
    if val < min then
        return min
    elseif val > max then
        return max
    end
    return val
end

local Focus = function()
    if Camera.Mode == "free" then
        if IsDisabledControlPressed(0, Control.Alt) and HoveredObject then
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
end

RegisterNUICallback("focus", function(data, cb)
    Focus()
    cb(true)
end)

local CheckControls = function()
    if IsDisabledControlJustPressed(0, Control.MouseLeft) then
        if ActiveMode ~= "gizmo" and HoveredObject then
            SelectedObject = HoveredObject
        end
    end

    if IsDisabledControlJustPressed(0, Control.f) then
        Focus()
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
---@param dist number Distance to translate coordinates - Forward/Left(+)/Backward/Right(-)
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
---@return number rot_x Translated Rotation X
---@return number rot_z Translated Rotation Z
---@return number fov Translated Field of View
local ControlTranslation = function(x, y, z, rot_x, rot_z, fov)
    local deltaLR = GetDisabledControlNormal(0, Control.MouseLR)
    local deltaUD = GetDisabledControlNormal(0, Control.MouseUD)
    local pressed, justPressed = da.Dev.Control.GetPressed(
        { "a", "d", "e", "q", "s", "w", "x", "Spacebar", "Alt", "Control", "Shift", "WheelUp", "WheelDown", "MouseRight", },
        { "x", }
    )
    local modifier = Speed.Current

    -- Mouse Controls
    if pressed.Control then
        -- Press Control adjust FOV on Mouse Up/Down

        if justPressed.x then
            fov = Fov.Default
        end
        if deltaUD ~= 0.0 then
            fov = Clamp(fov + (deltaUD * Fov.RateChange), Fov.Min, Fov.Max)
        end
        -- if deltaLR ~= 0.0 then
        --     rot_z = rot_z + deltaLR * -1.0 * (Speed.Mouse * (math.min(fov,50)/50))
        -- end
    elseif pressed.Alt and not (pressed.w or pressed.a or pressed.s or pressed.d or pressed.q or pressed.e) then
        -- Press Alt move camera on X/Y coordinate plane
        if deltaLR ~= 0.0 then
            x, y, _ = Translate(x, y, z, rot_x, rot_z, 0-(deltaLR*modifier*2), true)
        end
        if deltaUD ~= 0.0 then
            x, y, _ = Translate(x, y, z, rot_x, rot_z, 0-(deltaUD*modifier*2))
        end
    elseif pressed.Shift and not (pressed.w or pressed.a or pressed.s or pressed.d or pressed.q or pressed.e) then
        -- Press Shift move camera on X/Z coordinate plane
        if deltaLR ~= 0.0 then
            x, y, _ = Translate(x, y, z, rot_x, rot_z, 0-(deltaLR*modifier*2), true)
        end
        if deltaUD ~= 0.0 then
            z = z - deltaUD*modifier*2
        end
    elseif Camera.Mode ~= "focus" and (ActiveMode ~= "gizmo" or da.Control.PassthroughIsActive()) then
        -- Otherwise Mouse aims camera
        if deltaLR ~= 0.0 then
            rot_z = rot_z + deltaLR * -1.0 * (Speed.Mouse * (math.min(fov,50)/50))
        end
        if deltaUD ~= 0.0 then
            rot_x = Clamp(rot_x + deltaUD * -1.0 * (Speed.Mouse * (math.min(fov,50)/50)), -89.9, 89.9)
        end
    end

    -- Speed Modifier
    if pressed.Shift then modifier = (modifier * Speed.Fast)
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

    -- Set Coords
    return x, y, z, rot_x, rot_z, fov
end

local CamControlThread = false
InitCamControl = function()
    local playerPedId = PlayerPedId()
    local x, y, z = GetCoords(playerPedId)
    local rot_x, rot_y, rot_z = table.unpack(GetFinalRenderedCamRot())
	local fov = GetGameplayCamFov()
    if CamControlThread then return; end
    Citizen.CreateThread(function()
        CamControlThread = true
        while da.Dev.Mode.IsActive("freecam") or da.Dev.Mode.IsActive("noclip") do
            -- Send NUI message with camera info for display
            if da.Cache.Lazy.Delay("dadev","camUpdate",100) then
                SendNUIMessage({
                    type = "displayHUD",
                    value = "camera",
                    mode = "on",
                    camera = {
                        speed = ("%.2f"):format(Speed.Current),
                        cameraMode = Camera.Mode == "focus" and "" or "",
                        noclip = Camera.Mode ~= "player" and "" or da.Dev.Mode.IsActive("noclip") and "" or "",
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
        CamControlThread = false
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
end

function DisableFreeCam()
    CamControlThread = false
    RenderScriptCams(false, true, 500, true, true)
    SetCamActive(Camera.Handle, false)
    DetachCam(Camera.Handle)
    DestroyCam(Camera.Handle, true)
    Camera.Handle = nil
end

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

da.Dev.Menu.RegisterOption("root", "toggle cam", "c", function()
    if Camera.Mode == "free" then
        da.Dev.Mode.Remove("freecam")
    elseif Camera.Mode == "player" then
        da.Dev.Mode.Add("freecam")
    end
end)

da.Dev.NoClip = function(state)
    if state == nil then
        NoClip.Enabled = not NoClip.Enabled
    else
        NoClip.Enabled = state
    end
end

AddEventHandler('onResourceStop', function(resourceName)
    GizmoThreadStarted = false
    if resourceName == GetCurrentResourceName() then
        DisableFreeCam()
    end
end)

