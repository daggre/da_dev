SelectMode = false
Hover = nil
Select = nil

local LastHoverMode = "Object"
local MouseX = 0.5
local MouseY = 0.5
local PPID = nil
local ObjectThread = {}
local Distance = 1000.0
local UntrackedModels = {
    [0] = true,
}
local Spawn = nil
local HitCoords = nil
local NearbyOriginPos = nil

local UID = 0
local _getUID = function()
    UID = UID + 1
    return UID
end

da_mode.new("object", {
    priority = 70,
    default = { focusKeyboard = true, focusCursor = true, keepFocus = false, },
    passthrough = { focusCursor = false, keepFocus = true, },
    updateFn = function(data)
        SetNuiFocus(data.focusKeyboard, data.focusCursor)
        SetNuiFocusKeepInput(data.keepFocus)
        SendNUIMessage({ type = "controlPass", enable = data.passthrough, })
    end,
    startFn = function()
        da_mode.stop("animation")
        da_mode.start("freecam")
        SelectMode = "Cursor"
        ObjectModeThread()
        SendNUIMessage({
            type = "displayHUD",
            value = "object",
            enable = true,
        })
        da_mode.passthrough("object", true)
    end,
    stopFn = function()
        da_mode.stop("freecam")
        da_mode.stop("focus")
        SelectMode = false
        SendNUIMessage({
            type = "displayHUD",
            value = "object",
            enable = false,
        })
    end,
    passthroughKey = da_control.keyHash['c'],
    passthroughFn = function(state, haltKey, cb)
        SelectMode = state and "Crosshair" or "Cursor"
        da_controlpass:set(state, haltKey, cb)
        SendNUIMessage({ type = "controlPass", enable = state, })
    end,
    passthroughCb = function()
        da_control.waitForRelease(dat.keys)
        da_mode.reset("object")
    end,
    controlMap = {
        disablePlayerFiring = true,
        {
            key = "r",
            justPressed = {
                active = "object",
                modifier = { ['Ctrl'] = false, ['Alt'] = false, },
                fn = function()
                    if Select then StartGizmo(Select) end
                end,
            },
        },
        {
            key = "r",
            justPressed = {
                active = "object",
                modifier = { ['Alt'] = true, },
                fn = function()
                    if Hover then Select = Hover end
                    if Select then StartGizmo(Select) end
                end,
            },
        },
        {
            key = "r",
            justPressed = {
                active = "object",
                modifier = { ['Ctrl'] = true, },
                fn = function()
                    if Hover and Select then
                        local hPos = GetEntityRotation(Hover)
                        SetEntityRotation(Select, hPos.x, hPos.y, hPos.z)
                    end
                end,
            },
        },
        {
            key = "x",
            justPressed = {
                active = "object",
                modifier = { ['Ctrl'] = true, },
                fn = function()
                    if Hover and Select then
                        local sPos = GetEntityCoords(Select)
                        local hPos = GetEntityCoords(Hover)
                        SetEntityCoords(Select, hPos.x, hPos.y, sPos.z)
                    end
                end,
            },
        },
        {
            key = "x",
            justPressed = {
                active = "object",
                modifier = { ['Shift'] = true, },
                fn = function()
                    if not Select then return; end
                    log.debug("Deleting entity", Select)
                    DeleteEntity(Select)
                end,
            },
        },
        {
            key = "z",
            justPressed = {
                active = "object",
                modifier = { ['Ctrl'] = true, },
                fn = function()
                    if Hover and Select then
                        local sPos = GetEntityCoords(Select)
                        local hPos = GetEntityCoords(Hover)
                        SetEntityCoords(Select, sPos.x, sPos.y, hPos.z)
                    end
                end,
            },
        },
        {
            key = "h",
            justPressed = {
                primary = "object",
                fn = function()
                    SendNUIMessage({
                        type = "toggleHelp",
                        mode = "objHelp",
                        state = "toggle",
                        toggleCursor = true,
                    })
                end,

            }
        },
        {
            key = "MouseLeft",
            justPressed = {
                active = "object",
                fn = function()
                    log.debug("MouseLeft", Hover, Hover == Select)
                    if not Hover then return; end
                    -- if Hover == Select then
                    --     Select = nil
                    -- else
                    --     Select = Hover
                    -- end
                    Select = (Hover ~= Select) and Hover or nil
                end,
            },
        },
        {
            key = "g",
            justPressed = {
                isPrimary = "object",
                fn = function()
                    if not Spawn or not HitCoords then return; end
                    local obj = da_obj.create(Spawn, HitCoords, {
                        ground = true,
                    })
                    Select = obj
                end
            },
        },
        {
            key = "Escape",
            justPressed = {
                isPrimary = "object",
                fn = function()
                    SendNUIMessage({ type = "keyPress", mode = "object", key = "Escape", })
                end,
            },
        },
        {
            key = "1",
            justPressed = {
                active = "object",
                fn = function()
                    SendNUIMessage({ type = "keyPress", mode = "object", key = "1", })
                end,
            },
        },
        {
            key = "2",
            justPressed = {
                active = "object",
                fn = function()
                    SendNUIMessage({ type = "keyPress", mode = "object", key = "2", })
                end,
            },
        },
        {
            key = "3",
            justPressed = {
                active = "object",
                fn = function()
                    SendNUIMessage({ type = "keyPress", mode = "object", key = "3", })
                end,
            },
        },
    }
})

local GetSelectedObjData = function(entityHandle)
    local objData = {}
    if entityHandle == nil then return objData; end
    -- if not DoesEntityExist(entityHandle) then return objData; end

    local networkID = NetworkGetEntityIsNetworked(entityHandle) and NetworkGetNetworkIdFromEntity(entityHandle) or false
    local modelHash = GetEntityModel(entityHandle)
    local modelName = dat.getName(modelHash)
    local x,y,z = table.unpack(GetEntityCoords(entityHandle))
    local pitch, roll, yaw = table.unpack(GetEntityRotation(entityHandle, 2))
    local frozen = IsEntityFrozen(entityHandle) == 1
    local collision = GetEntityCollisionDisabled(entityHandle) == false

    objData.handle = entityHandle
    objData.modelHash = modelHash
    objData.networkID = networkID ~= false and networkID or "-"
    objData.modelName = modelName
    objData.coords = {
        x = string.format("%.2f", x),
        y = string.format("%.2f", y),
        z = string.format("%.2f", z),
    }
    objData.rotation = {
        pitch = string.format("%.2f", pitch),
        roll = string.format("%.2f", roll),
        yaw = string.format("%.2f", yaw),
    }
    objData.frozen = frozen
    objData.collision = collision

    return objData
end

local ControlCheckCursor = function(pressed, justPressed)
    pressed = pressed or {}
    justPressed = justPressed or {}

    -- Select Object (MouseLeft)
    if SelectMode == "Cursor" then
        if justPressed.MouseLeft then
            if Hover then
                if Hover == Select then
                    Select = nil
                else
                    Select = Hover
                end
            end
        end
    end

    if justPressed.f then
        da_mode.toggle("focus")
    end

    if justPressed.r then
        if not Select and Hover then
            Select = Hover
        end
        if pressed.Alt and Hover then
            Select = Hover
        end
        if Select then
            StartGizmo(Select)
        end
    end

    if justPressed.x then
        Select = nil
        Hover = nil
    end
end

local RCF = math.pi / 180

RaycastXhair = function(dist, objIgnore)
    local pos = GetFinalRenderedCamCoord()
    local rot = GetFinalRenderedCamRot()
    local yaw = rot.z * RCF
    local pitch = rot.x * RCF
    local hdg = {
        x = -math.sin(yaw) * math.abs(math.cos(pitch)),
        y = math.cos(yaw) * math.abs(math.cos(pitch)),
        z = math.sin(pitch),
    }
    local _, hit, endPos, _, obj = GetShapeTestResult(
        StartShapeTestRay(
            pos.x, pos.y, pos.z,
            pos.x + hdg.x * dist,
            pos.y + hdg.y * dist,
            pos.z + hdg.z * dist,
            -1, objIgnore, 0
        )
    )
    return hit, obj, endPos
end

RaycastCursor = function(x, y, dist)
    local _, normal = GetWorldCoordFromScreenCoord(x, y)
    local pos = GetFinalRenderedCamCoord()
    local _, hit, endPos, _, obj = GetShapeTestResult(
        StartShapeTestRay(
            pos.x, pos.y, pos.z,
            pos.x + normal.x * dist,
            pos.y + normal.y * dist,
            pos.z + normal.z * dist,
            -1, nil, 0
        )
    )
    return hit, obj, endPos
end


lazy.nuiSelectedObjData = function(select, hover, objData)
    SendNUIMessage({
        type = "nuiUpdate",
        hover = hover ~= nil,
        select = select ~= nil,
        selectData = objData,
    })
end

local SelectModeTick = function()
    local hit, obj, pos = nil, nil, nil
    if SelectMode == "Cursor" then
        hit, obj = RaycastCursor(MouseX, MouseY, Distance)
    elseif SelectMode == "Crosshair" then
        hit, obj, pos = RaycastXhair(Distance, PPID)
    else
        return
    end
    HitCoords = pos

    -- Update the tracked objects
    local model = nil
    if not hit then
        if LastHoverMode == "Object" and not da_mode.isActive("gizmo") then
            Hover = nil
        end
    else
        model = GetEntityModel(obj)
        if model and not UntrackedModels[model] then
            LastHoverMode = "Object"
            Hover = obj
        elseif LastHoverMode == "Object" and not da_mode.isActive("gizmo") then
            Hover = nil
        end
    end

    DrawBB(Select, {r=0, g=218, b=175, a=255}) -- Green
    DrawBB(Hover, Hover ~= Select and
        {r=80, g=193, b=238, a=255} or -- Blue
        {r=255, g=255, b=255, a=255} -- White (Hovered and Selected)
    )
    lazy(30).nuiSelectedObjData(Select, Hover, GetSelectedObjData(Select))
end

ObjectModeThread = function()
    local id = _getUID()
    ObjectThread = {}
    Citizen.CreateThread(function()
        ObjectThread[id] = true
        CurrentTree = "objRoot"
        PPID = PlayerPedId()
        while ObjectThread[id] and SelectMode do
            SelectModeTick()
            Citizen.Wait(0)
        end
        ObjectThread[id] = nil
        CurrentTree = "devRoot"
    end)
end

RegisterNUICallback('sendCursorKey', function(data, cb)
    ControlCheckCursor(data.pressed, data.justPressed)
    cb(true)
end)

RegisterNUICallback('sendCursorPos', function(data, cb)
    MouseX = data.x
    MouseY = data.y
    cb(true)
end)

RegisterNUICallback('trackObject', function(data, cb)
    if data.remove then
        if data.category == "hover" and tonumber(data.handle) == Hover then Hover = nil
        elseif data.category == "select" and tonumber(data.handle) == Select then Select = nil
        end
    else
        if data.category == "hover" then
            Hover = tonumber(data.handle)
            LastHoverMode = "NUI"
        elseif data.category == "select" then Select = tonumber(data.handle)
        end
    end
    cb(true)
end)

local lastValidRange = 20

function GetObjectTypeStr(entity)
    if IsEntityAPed(entity) then return "ped"; end
    if IsEntityAVehicle(entity) then return "vehicle"; end
    if IsEntityAnObject(entity) then return "object"; end
    return "other"
end

function GetNearbyObjects(range, origin)
    local pos = GetFinalRenderedCamCoord()
    if origin == "offset" then
        local rot = GetFinalRenderedCamRot()
        pos = GetOffsetFromCoordAndHeadingInWorldCoords(pos.x, pos.y, pos.z, rot.z, 0.0, 6.0, 0.0)
    elseif origin == "player" then
        pos = GetEntityCoords(PlayerPedId())
    elseif origin == "raycast" then
        hit, obj, pos = RaycastXhair(1000.0, PlayerPedId())
        if not hit then
            pos = GetFinalRenderedCamCoord()
        end
    elseif origin == "pos" then
        pos = NearbyOriginPos ~= nil and NearbyOriginPos or pos
    elseif origin == "select" then
        pos = Select ~= nil and GetEntityCoords(Select) or pos
    end

    if not tonumber(range) then range = lastValidRange end
    lastValidRange = range
    local entityData = {}

    local entities = da_util.GetEntitiesNearPoint(pos, range)
    for i, entity in ipairs(entities) do
        local model = GetEntityModel(entity)
        local coords = GetEntityCoords(entity)
        local objType = GetObjectTypeStr(entity)
        entityData[i] = {
            handle = entity,
            model = model,
            modelName = dat.getName(model),
            distance = #(pos - coords),
            objType = objType,
            networkId = NetworkGetEntityIsNetworked(entity) and NetworkGetNetworkIdFromEntity(entity) or nil,
        }
        if entity == Hover then
            entityData[i].hover = true
        elseif entity == Select then
            entityData[i].select = true
        end
    end

    local peds = da_util.GetPedsNearPoint(pos, range)
    for i, entity in ipairs(peds) do
        local model = GetEntityModel(entity)
        local coords = GetEntityCoords(entity)
        entityData[i] = {
            handle = entity,
            model = model,
            modelName = dat.getName(model),
            distance = #(pos - coords),
            objType = "ped",
            networkId = NetworkGetEntityIsNetworked(entity) and NetworkGetNetworkIdFromEntity(entity) or nil,
        }
        if entity == Hover then
            entityData[i].hover = true
        elseif entity == Select then
            entityData[i].select = true
        end
    end

    local vehicles = da_util.GetVehiclesNearPoint(pos, range)
    for i, entity in ipairs(vehicles) do
        local model = GetEntityModel(entity)
        local coords = GetEntityCoords(entity)
        entityData[i] = {
            handle = entity,
            model = model,
            modelName = dat.getName(model),
            distance = #(pos - coords),
            objType = "vehicle",
            networkId = NetworkGetEntityIsNetworked(entity) and NetworkGetNetworkIdFromEntity(entity) or nil,
        }
        if entity == Hover then
            entityData[i].hover = true
        elseif entity == Select then
            entityData[i].select = true
        end
    end

    return entityData
end

RegisterNUICallback('nearbyObjects', function(data, cb)
    cb({ nearbyObjects = GetNearbyObjects(data.range, data.origin)})
end)

RegisterNUICallback('selectSpawnObject', function(data, cb)
    Spawn = GetHashKey(data.name)
    cb(true)
end)

RegisterNUICallback('setNearbyOriginPos', function(data, cb)
    NearbyOriginPos = nil
    if data.remove then
        cb(true)
        return
    end

    local timeout = GetGameTimer() + 5000
    while not NearbyOriginPos and GetGameTimer() < timeout do
        local hit, obj, pos = RaycastXhair(1000.0, PlayerPedId())
        if hit then NearbyOriginPos = pos end
        Citizen.Wait(0)
    end

    cb(NearbyOriginPos ~= nil)
end)


da_trie.addOpt("devRoot", "mode:edit", "e", function() da_mode.start("object") end, function() return not SelectMode end)
da_trie.addOpt("objRoot", "mode:edit", "e", function() da_mode.stop("object") end, function() return SelectMode end)

da_trie.addOpt("objRoot", "mov/rot", "r",
    function()
        StartGizmo(Select)
    end, function()
        return Select ~= nil and not API.isDead()
    end)


da_trie.add("objRoot", "obj clipboard", "q")

da_trie.addOpt("obj clipboard", "pos v3", "3",
    function()
        local v3 = GetEntityCoords(Select)
        SendNUIMessage({
            type = "clipboard",
            text = ("vector3(%.3f, %.3f, %.3f),"):format(v3.x, v3.y, v3.z)
        })
    end,
    function() return Select ~= nil end)

da_trie.addOpt("obj clipboard", "pos v4", "4",
    function()
        local v3 = GetEntityCoords(Select)
        local hdg = GetEntityHeading(Select)
        SendNUIMessage({
            type = "clipboard",
            text = ("vector4(%.3f, %.3f, %.3f, %.3f),"):format(v3.x, v3.y, v3.z, hdg)
        })
    end,
    function() return Select ~= nil end)

da_trie.addOpt("obj clipboard", "rot v3", "5",
    function()
        local v3 = GetEntityRotation(Select)
        SendNUIMessage({
            type = "clipboard",
            text = ("vector3(%.3f, %.3f, %.3f),"):format(v3.x, v3.y, v3.z)
        })
    end,
    function() return Select ~= nil end)

da_trie.addOpt("obj clipboard", "entity id", "e",
    function()
        SendNUIMessage({
            type = "clipboard",
            text = Select
        })
    end,
    function() return Select ~= nil end)

da_trie.addOpt("obj clipboard", "model hash", "m",
    function()
        SendNUIMessage({
            type = "clipboard",
            text = GetEntityModel(Select)
        }) end,
    function() return Select ~= nil end)


da_trie.add("objRoot", "obj set", "s")

da_trie.addOpt("obj set", "pos v3", "3",
    function()
        local pos = GetEntityCoords(Hover)
        SetEntityCoords(Select, pos.x, pos.y, pos.z)
    end,
    function()
        return Select ~= nil and Hover ~= nil
    end)

da_trie.addOpt("obj set", "rot v3", "r",
    function()
        local rot = GetEntityRotation(Hover)
        SetEntityRotation(Select, rot.x, rot.y, rot.z)
    end,
    function()
        return Select ~= nil and Hover ~= nil
    end)

da_trie.addOpt("obj set", "pos xy", "x",
    function()
        local sPos = GetEntityCoords(Select)
        local hPos = GetEntityCoords(Hover)
        SetEntityCoords(Hover, hPos.x, hPos.y, sPos.z)
    end,
    function()
        return Select ~= nil and Hover ~= nil
    end)

da_trie.addOpt("objRoot", "reset rot", "]",
    function()
        local obj = Hover ~= nil and Hover or Select
        SetEntityRotation(obj, 0, 0, 0)
    end,
    function() return Hover ~= nil or Select ~= nil end)

-- Freeze
da_trie.addOpt("objRoot", "frz", "f",
    function()
        local obj = Hover ~= nil and Hover or Select
        FreezeEntityPosition(obj, true)
    end, function()
        local obj = Hover ~= nil and Hover or Select
        return obj ~= nil and IsEntityFrozen(obj) == 0
    end)

da_trie.addOpt("objRoot", "unfrz", "f",
    function()
        local obj = Hover ~= nil and Hover or Select
        FreezeEntityPosition(obj, false)
    end, function()
        local obj = Hover ~= nil and Hover or Select
        return obj ~= nil and IsEntityFrozen(obj) == 1
    end)

RegisterCommand("modeGetStateObject", function(source, args, rawCommand)
    log.info({
        SelectMode = SelectMode,
        Hover = Hover,
        Select = Select,
        isActive = da_mode.isActive("object"),
    })
end, false)
