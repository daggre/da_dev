local NoClip = {}

NoClip.Enabled = false
NoClip.Speed = {}
NoClip.Speed.Fast = 5
NoClip.Speed.Default = 1
NoClip.Speed.Slow = 0.2
NoClip.Control = {}
NoClip.Control.W = `INPUT_MOVE_UP_ONLY`
NoClip.Control.A = `INPUT_MOVE_LEFT_ONLY`
NoClip.Control.S = `INPUT_MOVE_DOWN_ONLY`
NoClip.Control.D = `INPUT_MOVE_RIGHT_ONLY`
NoClip.Control.Q = `INPUT_FRONTEND_LB`
NoClip.Control.C = `INPUT_DUCK`
NoClip.Control.E = `INPUT_DYNAMIC_SCENARIO`
NoClip.Control.Spacebar = `INPUT_JUMP`
NoClip.Control.LeftShift = `INPUT_SPRINT`
NoClip.Control.LeftControl = `INPUT_FRONTEND_RUP`

local radian = math.pi / 180

---Translate directional coordinate translation based on direction of camera
---@param x number Origin X Coordinate
---@param y number Origin Y Coordinate
---@param z number Origin Z Coordinate
---@param dist number Distance to translate coordinates - Positive(Forward/Left) / Negative(Backward/Right)
---@param strafe boolean? Translate Left(+)/Right(-)
---@return number x Translated X Coordinate
---@return number y Translated Y Coordinate
---@return number z Translated Z Coordinate
local NoClipTranslate = function(x, y, z, dist, strafe)
    local rot_x, _, rot_z = table.unpack(GetGameplayCamRot()) -- rot_x (up/down), rot_y (roll?), rot_z (left/right)
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
---@param playerPedId any
---@param x number Origin X Coordinate
---@param y number Origin Y Coordinate
---@param z number Origin Z Coordinate
---@return number x Translated X Coordinate
---@return number y Translated Y Coordinate
---@return number z Translated Z Coordinate
local NoClipControlTranslation = function(playerPedId, x, y, z)
    local modifier = NoClip.Speed.Default

    -- Speed Modifier
    if IsControlPressed(0, NoClip.Control.LeftShift) then
        modifier = NoClip.Speed.Fast
    elseif IsControlPressed(0, NoClip.Control.LeftControl) then
        modifier = NoClip.Speed.Slow
    end

    -- Translate Coordinates
    if IsControlPressed(0, NoClip.Control.W) then
        x, y, z = NoClipTranslate(x, y, z, modifier)
    end
    if IsControlPressed(0, NoClip.Control.S) then
        x, y, z = NoClipTranslate(x, y, z, 0 - modifier)
    end
    if IsControlPressed(0, NoClip.Control.A) then
        x, y, z = NoClipTranslate(x, y, z, modifier, true)
    end
    if IsControlPressed(0, NoClip.Control.D) then
        x, y, z = NoClipTranslate(x, y, z, 0 - modifier, true)
    end
    if IsControlPressed(0, NoClip.Control.Spacebar) or IsControlPressed(0, NoClip.Control.Q) then
        z = z + modifier
    end
    if IsControlPressed(0, NoClip.Control.C) or IsControlPressed(0, NoClip.Control.E) then
        z = z - modifier
    end

    -- Set Coords
    SetEntityRotation(playerPedId, 0, 0, GetGameplayCamRot().z)
    SetEntityCoordsNoOffset(playerPedId, x, y, z, true, true, true)
    return x, y, z
end

---Begin noclip movement and control thread
local InitNoClip = function()
    local playerPedId = PlayerPedId()
    local x, y, z = table.unpack(GetEntityCoords(playerPedId))

    FreezeEntityPosition(playerPedId, true)
    SetEntityInvincible(playerPedId, true)
    SetEntityVisible(playerPedId, false)
    NetworkSetEntityInvisibleToNetwork(playerPedId, true)

    Citizen.CreateThread(function()
        while NoClip.Enabled do
            Wait(1)
            x, y, z = table.unpack(GetEntityCoords(playerPedId))
            x, y, z = NoClipControlTranslation(playerPedId, x, y, z)
        end

        FreezeEntityPosition(playerPedId, false)
        SetEntityInvincible(playerPedId, false)
        SetEntityVisible(playerPedId, true)
        NetworkSetEntityInvisibleToNetwork(playerPedId, false)
    end)
end

da.Dev.NoClip = function(state)
    if state == nil then
        NoClip.Enabled = not NoClip.Enabled
    else
        NoClip.Enabled = state
    end
    if NoClip.Enabled then
        InitNoClip()
    end
end
