local Camera = nil
local CameraMode = "player"

local Speed = {}
Speed.Fast = 5
Speed.Default = 1
Speed.Slow = 0.2
local Control = {}
Control.W = `INPUT_MOVE_UP_ONLY`
Control.A = `INPUT_MOVE_LEFT_ONLY`
Control.S = `INPUT_MOVE_DOWN_ONLY`
Control.D = `INPUT_MOVE_RIGHT_ONLY`
Control.Q = `INPUT_FRONTEND_LB`
Control.C = `INPUT_DUCK`
Control.E = `INPUT_DYNAMIC_SCENARIO`
Control.Spacebar = `INPUT_JUMP`
Control.LeftShift = `INPUT_SPRINT`
Control.LeftControl = `INPUT_FRONTEND_RUP`
Control.MouseLR = `INPUT_LOOK_LR`
Control.MouseUD = `INPUT_LOOK_UD`
Control.MouseSpeed = 8.0

local radian = math.pi / 180

local GetCoords = function(ped)
    if CameraMode == "free" then
        return table.unpack(GetCamCoord(Camera))
    elseif CameraMode == "player" then
        return table.unpack(GetEntityCoords(ped))
    end
end

local GetRot = function()
    if CameraMode == "free" then
        return table.unpack(GetCamRot(Camera,2))
    elseif CameraMode == "player" then
        return table.unpack(GetGameplayCamRot())
    end
end

local SetCoords = function(ped, x, y, z, pitch, roll, yaw)
    if CameraMode == "free" then
        SetCamCoord(Camera, x, y, z)
        SetCamRot(Camera, pitch, 0.0, yaw, 2)
    elseif CameraMode == "player" then
        SetEntityRotation(ped, 0, 0, yaw)
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
---@return number x Translated X Coordinate
---@return number y Translated Y Coordinate
---@return number z Translated Z Coordinate
local ControlTranslation = function(x, y, z, rot_x, rot_z)
    local modifier = Speed.Default

    -- Speed Modifier
    if IsDisabledControlPressed(0, Control.LeftShift) then
        modifier = Speed.Fast
    elseif IsDisabledControlPressed(0, Control.LeftControl) then
        modifier = Speed.Slow
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
    if IsDisabledControlPressed(0, Control.Spacebar) or IsDisabledControlPressed(0, Control.Q) then
        z = z + modifier
    end
    if IsDisabledControlPressed(0, Control.C) or IsDisabledControlPressed(0, Control.E) then
        z = z - modifier
    end

    local deltaLR = GetDisabledControlNormal(0, Control.MouseLR)
    local deltaUD = GetDisabledControlNormal(0, Control.MouseUD)

    if deltaLR ~= 0.0 then
        rot_z = rot_z + deltaLR * -1.0 * Control.MouseSpeed
    end
    if deltaUD ~= 0.0 then
        rot_x = math.max(math.min(89.9, rot_x + deltaUD * -1.0 * Control.MouseSpeed), -89.9)
    end

    -- Set Coords
    return x, y, z, rot_x, rot_z
end

---Begin noclip movement and control thread
local InitCamControl = function()
    local playerPedId = PlayerPedId()
    local x, y, z = GetCoords(playerPedId)
    local rot_x, rot_y, rot_z = GetRot()
    Citizen.CreateThread(function()
        while CameraMode == "free" do
            DisableAllControlActions(0)
            Citizen.Wait(0)
            x, y, z = GetCoords(playerPedId)
            rot_x, rot_y, rot_z = GetRot()
            x, y, z, rot_x, rot_z = ControlTranslation(x, y, z, rot_x, rot_z)
            SetCoords(playerPedId, x, y, z, rot_x, rot_y, rot_z)
        end
    end)
end

function EnableFreeCam()
	local x, y, z = table.unpack(GetGameplayCamCoord())
	local pitch, roll, yaw = table.unpack(GetGameplayCamRot(2))
	local fov = GetGameplayCamFov()
	Camera = CreateCam("DEFAULT_SCRIPTED_CAMERA", true)
	SetCamCoord(Camera, x, y, z)
	SetCamRot(Camera, pitch, roll, yaw, 2)
	SetCamFov(Camera, fov)
	RenderScriptCams(true, true, 500, true, true)
end

function DisableFreeCam()
    RenderScriptCams(false, true, 500, true, true)
    SetCamActive(Camera, false)
    DetachCam(Camera)
    DestroyCam(Camera, true)
    Camera = nil
end

da.Dev.Menu.RegisterMenu("root", "camera", "c")

da.Dev.Menu.RegisterOption("camera", "free", "f", function()
    da.Log.Debug("Free camera")
    if CameraMode ~= "free" then
        CameraMode = "free"
        EnableFreeCam()
        InitCamControl()
    end
end)

da.Dev.Menu.RegisterOption("camera", "player", "p", function()
    da.Log.Debug("Player camera")
    if CameraMode ~= "player" then
        CameraMode = "player"
        DisableFreeCam()
    end
end)

da.Dev.Menu.RegisterOption("camera", "toggle mode", "c", function()
    da.Log.Debug("Player camera")
    if CameraMode == "free" then
        CameraMode = "player"
        DisableFreeCam()
    elseif CameraMode == "player" then
        CameraMode = "free"
        EnableFreeCam()
        InitCamControl()
    end
end)
