SelectMode = "Cursor"
Hover = nil
Select = nil

local RCF = math.pi / 180
local LastValidRange = 20
local LastHoverMode = "Object"
local MouseX = 0.5
local MouseY = 0.5
local PPID = nil
local ObjectThread = {}
local Distance = 1000.0
local UntrackedModels = { [0] = true, }
local Spawn = nil
local HitCoords = nil
local NearbyOriginPos = nil
local DefaultScene = "default"
local ActiveScene = DefaultScene
local Scenes = {
    [ActiveScene] = { name = ActiveScene, objects = {} },
}
local PreviewObject = nil
local Theme = {
    Primary = {r=0, g=218, b=175, a=255},
    Secondary = {r=80, g=193, b=238, a=255},
}

local UID = 0
local _getUID = function()
    UID = UID + 1
    return UID
end

lazy.uiUpdate = function(select, hover, objData)
    da_ui.send("updateCrosshair", {
        hover = hover ~= nil,
        select = select ~= nil,
        selectData = objData,
    })
end

local ResetDefaultScene = function()
    ActiveScene = DefaultScene
    Scenes[DefaultScene] = { name = DefaultScene, objects = {} }
    kvp.encode("scenes:"..DefaultScene, Scenes[DefaultScene])
end

-- TODO: Prioritize sending pertinent info only to NUI, we end up passing large amounts of data for large scenes

-- TODO: Find a way to cache this information and utilize cache on frozen or
-- objects that haven't moved, maybe we invalidate cache for objects when making
-- changes
-- TODO: Alternatively, if this isn't a constantly called code, then dont worry about it
local GetObjData = function(entityHandle)
    local objData = {}
    if entityHandle == nil then return nil; end
    -- if not DoesEntityExist(entityHandle) then return objData; end

    local networkID = NetworkGetEntityIsNetworked(entityHandle) and NetworkGetNetworkIdFromEntity(entityHandle) or false
    local modelHash = GetEntityModel(entityHandle)
    local modelName = dat.getName(modelHash)
    local pos_x, pos_y, pos_z = table.unpack(GetEntityCoords(entityHandle))
    local rot_x, rot_y, rot_z = table.unpack(GetEntityRotation(entityHandle, 2))
    local visible = IsEntityVisible(entityHandle) == 1
    local frozen = IsEntityFrozen(entityHandle) == 1
    local collision = GetEntityCollisionDisabled(entityHandle) == false

    objData.handle = entityHandle
    objData.networkID = networkID ~= false and networkID or "-"
    objData.modelHash = modelHash
    objData.modelName = modelName
    objData.pos_x = pos_x
    objData.pos_y = pos_y
    objData.pos_z = pos_z
    objData.rot_x = rot_x
    objData.rot_y = rot_y
    objData.rot_z = rot_z
    objData.visible = visible
    objData.frozen = frozen
    objData.collision = collision


    if entityHandle == Hover then
        objData.hover = true
    elseif entityHandle == Select then
        objData.select = true
    end

    return objData
end

local RaycastXhair = function(dist, objIgnore)
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

local RaycastCursor = function(x, y, dist)
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

local function ClearScene(sceneName, force)
    log.info("Clearing scene", sceneName)
    if not force and not Scenes[sceneName].loaded then return false; end
    for _, obj in ipairs(Scenes[sceneName].objects) do
        if DoesEntityExist(obj.handle) then
            log.spam("Deleting object", obj.handle)
            DeleteEntity(obj.handle)
        else
            log.spam("Object does not exist", obj.handle)
        end
    end
    Scenes[sceneName].objects = {}
    Scenes[sceneName].loaded = false
    return true
end

local function ClearAllScenes()
    for sceneName in pairs(Scenes) do
        ClearScene(sceneName, true)
    end
end

local function LoadScene(sceneName)
    log.info("Loading scene objects", sceneName)
    local successfulLoad = true
    if Scenes[sceneName] == nil or Scenes[sceneName].objects == nil or not next(Scenes[sceneName].objects) then
        log.debug("Loading scene " .. sceneName .. " from kvp")
        Scenes[sceneName] = kvp.decode("scenes:"..sceneName)
    end
    if Scenes[sceneName].loaded then
        log.debug("Scene already loaded", sceneName)
        return false
    end
    for _, obj in ipairs(Scenes[sceneName].objects) do
        log.spam("Creating object", handle, obj.data)
        local quaternion = obj.quaternion_x and obj.quaternion_y and obj.quaternion_z and obj.quaternion_w and {
            x = obj.quaternion_x,
            y = obj.quaternion_y,
            z = obj.quaternion_z,
            w = obj.quaternion_w,
        } or nil
        local handle = da_obj.create(
            obj.modelHash,
            vector3(obj.pos_x, obj.pos_y, obj.pos_z),
            {
                collision = obj.collision,
                frozen = obj.frozen,
                rotation = {
                    x = obj.rot_x,
                    y = obj.rot_y,
                    z = obj.rot_z,
                },
                rotation_order = 2,
                quaternion = quaternion,
            }
        )
        obj.handle = handle
        if not handle then
            log.error("Failed to create object", obj.modelHash, obj.pos)
            successfulLoad = false
        end
    end
    if successfulLoad then
        Scenes[sceneName].loaded = true
    else
        ClearScene(sceneName, true)
    end
    return successfulLoad
end

local function GetScenesList()
    local scenes = {}
    for sceneName, sceneData in pairs(Scenes) do
        table.insert(scenes, {
            name = sceneName,
            loaded = sceneData.loaded,
        })
        log.debug("Adding cached scene", _)
    end

        local sceneNames = kvp.search("scenes:")
        for _, scene in ipairs(sceneNames) do
            local sceneName = scene:sub(8)
            if not Scenes[sceneName] then
                table.insert(scenes, { name = sceneName })
            end
        end
        return { scenes = json.encode(scenes) }
end

local function GetScene(sceneName)
    log.spam("Getting scene objects data", sceneName)
    if not Scenes[sceneName] then
        log.error("Scene not found", sceneName)
        if sceneName == DefaultScene then
            ResetDefaultScene()
        end
        ActiveScene = DefaultScene
        return { objects = json.encode({}) }
    end
    ActiveScene = sceneName
    local sceneObjects = {}
    local coords = GetEntityCoords(PlayerPedId())
    local warn = 0
    for _, obj in ipairs(Scenes[sceneName].objects) do
        local objData = GetObjData(obj.handle)
        if objData then
            local objCoords = vector3(objData.pos_x, objData.pos_y, objData.pos_z)
            objData.distance = #(coords - objCoords)
            table.insert(sceneObjects, objData)
        else
            log.error("Failed to get data for ", obj)
            warn = warn + 1
        end
    end
    if warn > 0 then
        log.warn("Failed to get data for " .. warn .. " objects in scene " .. sceneName)
    end
    return { objects = json.encode(sceneObjects) }
end

local function CheckRename(sceneName)
        if sceneName ~= ActiveScene then
            local newScene = { name = sceneName, objects = {} }
            for _, obj in ipairs(Scenes[ActiveScene].objects) do
                table.insert(newScene.objects, GetObjData(obj.handle))
                log.info("Copying object", obj.handle)
            end
            Scenes[sceneName] = newScene
            log.info("Copying scene", sceneName, ActiveScene)
            ActiveScene = sceneName
        end
end

local function SaveScene(sceneName)
    local storedScene = { name = sceneName, objects = {}, }
    for _, obj in ipairs(Scenes[sceneName].objects) do
        local objData = GetObjData(obj.handle)
        objData.handle = nil
        objData.networkID = nil
        objData.modelName = nil
        table.insert(storedScene.objects, objData)
        for key in pairs(obj) do
            if objData and objData[key] then
                obj[key] = objData[key]
            end
        end
    end
    log.info("Saving scene", sceneName, storedScene)
    kvp.encode("scenes:"..sceneName, storedScene)
end

local function ImportScene(scene)
    local storedScene = { name = scene.name, objects = {}, }
    for _, object in ipairs(scene.objects) do
        local objData = {}
        -- objData.modelName = object.modelName
        objData.modelHash = GetHashKey(object.modelName)
        objData.pos_x = object.pos_x
        objData.pos_y = object.pos_y
        objData.pos_z = object.pos_z
        objData.rot_x = object.rot_x
        objData.rot_y = object.rot_y
        objData.rot_z = object.rot_z
        objData.quaternion_x = object.quaternion_x
        objData.quaternion_y = object.quaternion_y
        objData.quaternion_z = object.quaternion_z
        objData.quaternion_w = object.quaternion_w
        objData.visible = object.visible
        objData.frozen = object.frozen
        objData.collision = object.collision
        table.insert(storedScene.objects, objData)
    end
    log.info("Importing scene", scene.name, storedScene)
    kvp.encode("scenes:"..scene.name, storedScene)

    return LoadScene(scene.name)
end

local function DeleteScene(sceneName)
    if not sceneName then return false; end
    ClearScene(sceneName, true)
    kvp.delete("scenes:"..sceneName)
    Scenes[sceneName] = nil
    log.info("Deleted scene", sceneName)
    if sceneName == DefaultScene then
        ResetDefaultScene()
        ActiveScene = DefaultScene
    end
    if sceneName == ActiveScene then ActiveScene = DefaultScene; end
    return true
end

local function ReloadScene(sceneName)
    if not sceneName then return; end
    ClearScene(sceneName, true)
    Scenes[sceneName] = kvp.decode("scenes:"..sceneName)
    return LoadScene(sceneName)
end

local function SetAlpha(handle)
    if not handle or not DoesEntityExist(handle) then return; end
    if GetEntityAlpha(handle) == 255 then
        SetEntityAlpha(handle, 90)
    else
        ResetEntityAlpha(handle)
    end
end

local SelectModeTick = function()
    local hit, obj, pos = nil, nil, nil
    if SelectMode == "Cursor" then
        hit, obj, pos = RaycastCursor(MouseX, MouseY, Distance)
    elseif SelectMode == "Crosshair" then
        hit, obj, pos = RaycastXhair(Distance, PPID)
    else
        return
    end
    HitCoords = pos

    -- Update the tracked objects
    local model = nil
    if not hit then
        if LastHoverMode == "Object" then
            Hover = nil
        end
    elseif not da_mode.isActive("gizmo") then
        model = GetEntityModel(obj)
        if model and not UntrackedModels[model] then
            LastHoverMode = "Object"
            Hover = obj
        elseif LastHoverMode == "Object" then
            Hover = nil
        end
    end

    -- DrawBB(Select, {r=0, g=218, b=175, a=255}) -- Green
    -- DrawBB(Hover, Hover ~= Select and
    --     {r=80, g=193, b=238, a=255} or -- Blue
    --     {r=255, g=255, b=255, a=255} -- White (Hovered and Selected)
    -- )
    DrawBB(Select, Theme.Primary) -- Blue
    DrawBB(Hover, Theme.Secondary) -- White
    lazy(30).uiUpdate(Select, Hover, GetObjData(Select))
end

local ObjectModeThread = function()
    local id = _getUID()
    ObjectThread = {}
    Citizen.CreateThread(function()
        ObjectThread[id] = true
        PPID = PlayerPedId()
        while ObjectThread[id] and SelectMode do
            SelectModeTick()
            Citizen.Wait(0)
        end
        ObjectThread[id] = nil
    end)
end

local objectMCPState = false

da_mode.register({
    name = "object",
    priority = 70,
    onActivate = function()
        CurrentTree = "objRoot"
        da_mode.deactivate("animation")
        da_mode.activate("freecam")
        ObjectModeThread()
        da_ui.send("ui_object", {})
        da_ui.send("mcp", { active = objectMCPState, })
        if objectMCPState then
            da_mode.activateMCP("object")
        end
    end,
    onDeactivate = function()
        SetNuiFocus(false, false)
        da_mode.deactivate("freecam")
        da_mode.deactivate("focus")
        ObjectThread = {}
        da_ui.send("ui_object", { state = false })
        da_mcp.deactivate()
        if not da_mode.isActive("noclip") then
            da_ui.send("ui_camera", { state = false, })
        end
        CurrentTree = "devRoot"
    end,
    onPrimary = function()
        if SelectMode == "Cursor" then
            SetNuiFocus(true, true)
            SetNuiFocusKeepInput(false)
        else
            SetNuiFocus(true, false)
            SetNuiFocusKeepInput(true)
        end
        if objectMCPState then
            da_mode.activateMCP("object")
        end
    end,
    onLosePrimary = function()
        da_mcp.deactivate()
    end,
    activateMCP = function()
        if da_mcp.active then return; end
        return da_mcp.activate({
            key = dat.keyHash['MouseScrollClick'],
            activate = function()
                log.debug("Activating MCP for object mode")
                SelectMode = "Crosshair"
                objectMCPState = true
                if not da_mode.isPrimary("object") then return; end
                SetNuiFocus(true, false)
                SetNuiFocusKeepInput(true)
            end,
            deactivate = function()
                log.debug("Deactivating MCP for object mode")
                SelectMode = "Cursor"
                da_control.waitForRelease(da_control.keys)
                da_ui.send("mcp", { active = false, })
                if not da_mode.isPrimary("object") then return; end
                objectMCPState = false
                SetNuiFocus(true, true)
                SetNuiFocusKeepInput(false)
            end,
        })
    end,
    deactivateMCP = function()
        da_mcp.deactivate()
    end,
    keymaps = {
        {
            key = "Escape",
            event = "justPressed",
            primary = true,
            fn = function()
                da_mode.deactivate("object")
            end,
        },
        {
            key = "MouseLeft",
            event = "justPressed",
            modifiers = { shift = false, },
            primary = true,
            fn = function()
                if not Hover then return; end
                Select = (Hover ~= Select) and Hover or nil
            end,
        },
        {
            key = "MouseLeft",
            event = "justPressed",
            primary = true,
            modifiers = { shift = true, },
            fn = function()
                if not Spawn or not HitCoords then return; end
                if not ActiveScene then ActiveScene = DefaultScene; end
                if not Scenes[ActiveScene] then Scenes[ActiveScene] = { objects = {}, }; end
                local obj = da_obj.create(Spawn, HitCoords, { ground = true, })
                log.spam("Spawned object", ActiveScene, obj, Spawn, HitCoords)
                table.insert(Scenes[ActiveScene].objects, GetObjData(obj))
                Select = obj
            end
        },
        {
            key = "f",
            event = "justPressed",
            primary = true,
            modifiers = { ctrl = true, },
            fn = function()
                -- Toggle Frozen
                if not Select then return; end
                da_obj.set(Select, { frozen = IsEntityFrozen(Select) == 0 })
            end
        },
        {
            key = "g",
            event = "justPressed",
            primary = true,
            fn = function()
                if Select then CopyObject({handle = Select}) end
            end,
        },
        {
            key = "h",
            event = "justPressed",
            primary = true,
            fn = function()
                da_ui.send("toggleHelp", {
                    mode = "objHelp",
                    state = nil,
                    toggleCursor = true
                })
            end,
        },
        {
            key = "r",
            event = "justPressed",
            primary = true,
            modifiers = { ctrl = false, alt = false },
            fn = function()
                if Select then StartGizmo(Select) end
            end,
        },
        {
            key = "r",
            event = "justPressed",
            primary = true,
            modifiers = { alt = true },
            fn = function()
                if Hover then Select = Hover end
                if Select then StartGizmo(Select) end
            end,
        },
        {
            key = "r",
            event = "justPressed",
            primary = true,
            modifiers = { ctrl = true },
            fn = function()
                ReloadScene(ActiveScene)
            end,
        },
        {
            key = "s",
            event = "justPressed",
            primary = true,
            modifiers = { ctrl = true },
            fn = function()
                if ActiveScene then SaveScene(ActiveScene) end
            end,
        },
        {
            key = "t",
            event = "justPressed",
            primary = true,
            modifiers = { ctrl = true },
            fn = function()
                if Select then SetAlpha(Select) end
            end,
        },
        -- {
        --     key = "x",
        --     event = "justPressed",
        --     primary = true,
        --     modifiers = { ctrl = true },
        --     fn = function()
        --         if Hover and Select then
        --             local sPos = GetEntityCoords(Select)
        --             local hPos = GetEntityCoords(Hover)
        --             SetEntityCoords(Select, hPos.x, hPos.y, sPos.z)
        --         end
        --     end,
        -- },
        {
            key = "x",
            event = "justPressed",
            primary = true,
            modifiers = { shift = true },
            fn = function()
                log.debug("Deleting entity", Select)
                if not Select then return; end
                for i, obj in ipairs(Scenes[ActiveScene].objects) do
                    if obj.handle == Select then
                        table.remove(Scenes[ActiveScene].objects, i)
                        break
                    end
                end
                DeleteEntity(Select)
                Select = nil
            end,
        },
        -- {
        --     key = "z",
        --     event = "justPressed",
        --     primary = true,
        --     modifiers = { ctrl = true, },
        --     fn = function()
        --         if Hover and Select then
        --             local sPos = GetEntityCoords(Select)
        --             local hPos = GetEntityCoords(Hover)
        --             SetEntityCoords(Select, sPos.x, sPos.y, hPos.z)
        --         end
        --     end,
        -- },
        {
            key = "1",
            event = "justPressed",
            active = true,
            fn = function()
                da_ui.send("keyPress", { mode = "object-hud", key = "1" })
            end,
        },
        {
            key = "2",
            event = "justPressed",
            active = true,
            fn = function()
                da_ui.send("keyPress", { mode = "object-hud", key = "2" })
            end,
        },
        {
            key = "3",
            event = "justPressed",
            active = true,
            fn = function()
                da_ui.send("keyPress", { mode = "object-hud", key = "3" })
            end,
        },
    },
})

-- UI Functions

local function TrackObject(data)
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
end

local function GetObjectTypeStr(entity)
    if IsEntityAPed(entity) then return "ped"; end
    if IsEntityAVehicle(entity) then return "vehicle"; end
    if IsEntityAnObject(entity) then return "object"; end
    return "other"
end

local function GetNearbyObjects(range, origin)
    -- TODO: Add params to only collect filtered objects data
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
    elseif origin == "set position" then
        pos = NearbyOriginPos ~= nil and NearbyOriginPos or pos
    elseif origin == "select" then
        pos = Select ~= nil and DoesEntityExist(Select) and GetEntityCoords(Select) or pos
    end

    if not tonumber(range) then range = LastValidRange end
    LastValidRange = range
    local entityData = {}

    local entities = da_util.GetEntitiesNearPoint(pos, range)
    for _, entity in ipairs(entities) do
        local model = GetEntityModel(entity)
        local coords = GetEntityCoords(entity)
        local objType = GetObjectTypeStr(entity)
        local data = {
            handle = entity,
            model = model,
            modelName = dat.getName(model),
            distance = #(pos - coords),
            objType = objType,
            networkId = NetworkGetEntityIsNetworked(entity) and NetworkGetNetworkIdFromEntity(entity) or nil,
        }
        if entity == Hover then
            data.hover = true
        elseif entity == Select then
            data.select = true
        end
        table.insert(entityData, data)
    end

    local peds = da_util.GetPedsNearPoint(pos, range)
    for _, entity in ipairs(peds) do
        local model = GetEntityModel(entity)
        local coords = GetEntityCoords(entity)
        local data = {
            handle = entity,
            model = model,
            modelName = dat.getName(model),
            distance = #(pos - coords),
            objType = "ped",
            networkId = NetworkGetEntityIsNetworked(entity) and NetworkGetNetworkIdFromEntity(entity) or nil,
        }
        if entity == Hover then
            data.hover = true
        elseif entity == Select then
            data.select = true
        end
        table.insert(entityData, data)
    end

    local vehicles = da_util.GetVehiclesNearPoint(pos, range)
    for _, entity in ipairs(vehicles) do
        local model = GetEntityModel(entity)
        local coords = GetEntityCoords(entity)
        local data = {
            handle = entity,
            model = model,
            modelName = dat.getName(model),
            distance = #(pos - coords),
            objType = "vehicle",
            networkId = NetworkGetEntityIsNetworked(entity) and NetworkGetNetworkIdFromEntity(entity) or nil,
        }
        if entity == Hover then
            data.hover = true
        elseif entity == Select then
            data.select = true
        end
        table.insert(entityData, data)
    end

    return entityData
end

local SetNearbyOriginPos = function(data)
    NearbyOriginPos = nil
    if data.remove then
        return true
    end

    local timeout = GetGameTimer() + 5000
    while not NearbyOriginPos and GetGameTimer() < timeout do
        local hit, obj, pos = RaycastXhair(1000.0, PlayerPedId())
        if hit then NearbyOriginPos = pos end
        Citizen.Wait(0)
    end

    return NearbyOriginPos ~= nil
end

local GetRaycast = function(data)
    local hit, obj, pos = RaycastCursor(data.x, data.y, Distance)
    if not hit then return {}; end
    local model = GetEntityModel(obj)
    if not model or UntrackedModels[model] then return {}; end
    return { handle = obj }
end

local DispatchKeyEvents = function(data)
    local pressed = data.pressed or {}
    local justPressed = data.justPressed or {}
    local released = data.released or {}
    local justReleased = data.justReleased or {}
    local modifiers = {
        shift = pressed.Shift,
        ctrl = pressed.Control,
        alt = pressed.Alt
    }

    da_mode.dispatchEvents({
        modifiers = modifiers,
        pressed = pressed,
        justPressed = justPressed,
        released = released,
        justReleased = justReleased,
    })
end

local function SetVisible(data)
    local entityHandle = tonumber(data.handle)
    da_obj.set(entityHandle, { visible = data.state })
end

local function SetFrozen(data)
    local entityHandle = tonumber(data.handle)
    da_obj.set(entityHandle, { frozen = data.state })
end

local function SetCollision(data)
    local entityHandle = tonumber(data.handle)
    da_obj.set(entityHandle, { collision = data.state })
end

local function SetRotation(data)
    if not data then return; end
    local entityHandle = tonumber(data.handle)
    if not data.x or not data.y or not data.z then
        local rot = GetEntityRotation(entityHandle, 2)
        if not data.x then data.x = rot.x; end
        if not data.y then data.y = rot.y; end
        if not data.z then data.z = rot.z; end
    end
    da_obj.set(entityHandle, { rotation = {
        x = data.x,
        y = data.y,
        z = data.z
    }})
end

local function PlaceOnGround(data)
    local entityHandle = tonumber(data.handle)
    da_obj.set(entityHandle, { ground = true })
end

local function CopyObject(data)
    local model = GetEntityModel(data.handle)
    local coords = GetEntityCoords(data.handle)
    local rotation = GetEntityRotation(data.handle, 2)

    if not ActiveScene then ActiveScene = DefaultScene; end
    if not Scenes[ActiveScene] then Scenes[ActiveScene] = { objects = {}, }; end
    local obj = da_obj.create(model, coords, {
        rotation = rotation,
        rotation_order = 2,
    })
    log.debug("Cloned object", ActiveScene, {
        obj = obj,
        model = model,
        coords = coords,
        rot = rotation,
    })
    table.insert(Scenes[ActiveScene].objects, GetObjData(obj))
end

local function RemovePreviewObject()
    local lastObj = PreviewObject
    if lastObj then da_obj.delete(lastObj); end
end

-- TODO: Handle peds versus objects
local function SpawnPreviewObject(name)
    local hit, _, pos = RaycastXhair(1000.0, PlayerPedId())
    if not hit then return; end
    local obj = da_obj.create(GetHashKey(name), pos, {})
    local lastObj = PreviewObject
    PreviewObject = obj
    if lastObj then da_obj.delete(lastObj); end
end

local function hexStringToNumber(hexStr)
    hexStr = hexStr:gsub("#", "")
    return tonumber(hexStr, 16)
end

local function hexToRGB(hex)
    return {
        r = (hex >> 16) & 0xFF,
        g = (hex >> 8) & 0xFF,
        b = hex & 0xFF,
        a = 255,
    }
end

local function parseHexColor(hexStr)
    local hex = hexStringToNumber(hexStr)
    if not hex then return nil end
    return hexToRGB(hex)
end

local function setTheme(theme)
    assert(theme[1][1] == "primary", "Invalid primary theme element")
    Theme.Primary = parseHexColor(theme[1][2])
    assert(theme[3][1] == "secondary-light", "Invalid secondary theme element")
    Theme.Secondary = parseHexColor(theme[3][2])
end

da_ui.callbacks({
    nearbyObjects = function(data) return { nearbyObjects = GetNearbyObjects(data.range, data.origin) } end,
    scenesList = function(data) return GetScenesList() end,
    getScene = function(data) return GetScene(data.scene) end,
    loadScene = function(data) return LoadScene(data.scene) end,
    clearScene = function(data) return ClearScene(data.scene) end,
    clearAllScenes = function(data) return ClearAllScenes() end,
    reloadScene = function(data) return ReloadScene(data.scene) end,
    deleteScene = function(data) return DeleteScene(data.scene) end,
    importScene = function(data) return ImportScene(data) end,
    setVisible = function(data) return SetVisible(data) end,
    setFrozen = function(data) return SetFrozen(data) end,
    setCollision = function(data) return SetCollision(data) end,
    setRotation = function(data) return SetRotation(data) end,
    placeOnGround = function(data) return PlaceOnGround(data) end,
    copyObject = function(data) return CopyObject(data) end,
    getRaycast = function(data) return GetRaycast(data) end,
})
da_ui.events({
    spawnPreviewObject = function(data) SpawnPreviewObject(data.name) end,
    removePreviewObject = function() RemovePreviewObject() end,
    dispatchKeyEvents = function(data) DispatchKeyEvents(data) end,
    sendCursorPos = function(data) MouseX = data.x; MouseY = data.y end,
    selectSpawnObject = function(data) Spawn = GetHashKey(data.name) end,
    trackObject = TrackObject,
    setNearbyOriginPos = SetNearbyOriginPos,
    saveScene = function(data) CheckRename(data.scene); SaveScene(data.scene) end,
    setTheme = function(data) setTheme(data.theme); end,
})
da_net.events({
    onResourceStop = function(resourceName)
        if resourceName == GetCurrentResourceName() then
            for sceneName, scene in pairs(Scenes) do
                if scene.loaded then
                    log.debug("Cleaning up loaded scene: "..sceneName.."...")
                    for _, obj in ipairs(scene.objects) do
                        DeleteEntity(obj.handle)
                    end
                end
            end
        end
    end,
})

-- UI Tree

da_trie.addOpt("devRoot", "obj mode", "e",
    function() da_mode.activate("object") end,
    function() return not da_mode.isActive("object") end)

da_trie.addOpt("objRoot", "exit mode", "e",
    function() da_mode.deactivate("object") end,
    function() return da_mode.isActive("object") end)

da_trie.addOpt("objRoot", "mov/rot", "r",
    function() StartGizmo(Select) end,
    function() return Select ~= nil and not API.isDead() end)

da_trie.addOpt("objRoot", "reset rot", "]",
    function()
        local obj = Hover ~= nil and Hover or Select
        SetEntityRotation(obj, 0, 0, 0)
    end,
    function() return Hover ~= nil or Select ~= nil end)

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


da_trie.add("objRoot", "clip", "q")

da_trie.addOpt("clip", "pos v3", "3",
    function()
        local v3 = GetEntityCoords(Select)
        da_ui.send("clipboard", {
            text = ("vector3(%.3f, %.3f, %.3f),"):format(v3.x, v3.y, v3.z)
        })
    end,
    function() return Select ~= nil end)

da_trie.addOpt("clip", "pos v4", "4",
    function()
        local v3 = GetEntityCoords(Select)
        local hdg = GetEntityHeading(Select)
        da_ui.send("clipboard", {
            text = ("vector4(%.3f, %.3f, %.3f, %.3f),"):format(v3.x, v3.y, v3.z, hdg)
        })
    end,
    function() return Select ~= nil end)

da_trie.addOpt("clip", "rot v3", "5",
    function()
        local v3 = GetEntityRotation(Select)
        da_ui.send("clipboard", {
            text = ("vector3(%.3f, %.3f, %.3f),"):format(v3.x, v3.y, v3.z)
        })
    end,
    function() return Select ~= nil end)

da_trie.addOpt("clip", "entity id", "e",
    function() da_ui.send("clipboard", { text = Select }) end,
    function() return Select ~= nil end)

da_trie.addOpt("clip", "model hash", "m",
    function() da_ui.send("clipboard", { text = GetEntityModel(Select) }) end,
    function() return Select ~= nil end)

da_trie.addOpt("clip", "model name", "n",
    function() da_ui.send("clipboard", { text = dat.getName(GetEntityModel(Select)) }) end,
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
