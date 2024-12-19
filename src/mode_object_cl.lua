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
local Scenes = {
    untracked = { objects = {}, },
}
local ActiveScene = "untracked"

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


local GetObjData = function(entityHandle)
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
    objData.coords_x = string.format("%.2f", x)
    objData.coords_y = string.format("%.2f", y)
    objData.coords_z = string.format("%.2f", z)
    objData.rotation_pitch = string.format("%.2f", pitch)
    objData.rotation_roll = string.format("%.2f", roll)
    objData.rotation_yaw = string.format("%.2f", yaw)
    objData.frozen = frozen
    objData.collision = collision

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

    DrawBB(Select, {r=0, g=218, b=175, a=255}) -- Green
    DrawBB(Hover, Hover ~= Select and
        {r=80, g=193, b=238, a=255} or -- Blue
        {r=255, g=255, b=255, a=255} -- White (Hovered and Selected)
    )
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
        -- SelectMode = "Cursor"
        -- objectMCPState = false

        da_mode.deactivate("animation")
        da_mode.activate("freecam")
        --
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
        da_mcp.activate({
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
                local obj = da_obj.create(Spawn, HitCoords, { ground = true, })
                table.insert(Scenes[ActiveScene].objects, {
                    model = Spawn,
                    handle = obj,
                })
                Select = obj
            end
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
                if Hover and Select then
                    local hPos = GetEntityRotation(Hover)
                    SetEntityRotation(Select, hPos.x, hPos.y, hPos.z)
                end
            end,
        },
        {
            key = "x",
            event = "justPressed",
            primary = true,
            modifiers = { ctrl = true },
            fn = function()
                if Hover and Select then
                    local sPos = GetEntityCoords(Select)
                    local hPos = GetEntityCoords(Hover)
                    SetEntityCoords(Select, hPos.x, hPos.y, sPos.z)
                end
            end,
        },
        {
            key = "x",
            event = "justPressed",
            primary = true,
            modifiers = { shift = true },
            fn = function()
                log.debug("Deleting entity", Select)
                if not Select then return; end
                DeleteEntity(Select)
            end,
        },
        {
            key = "z",
            event = "justPressed",
            primary = true,
            modifiers = { ctrl = true, },
            fn = function()
                if Hover and Select then
                    local sPos = GetEntityCoords(Select)
                    local hPos = GetEntityCoords(Hover)
                    SetEntityCoords(Select, sPos.x, sPos.y, hPos.z)
                end
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
            key = "1",
            event = "justPressed",
            active = true,
            fn = function()
                da_ui.send("keyPress", { mode = "objectHUD", key = "1" })
            end,
        },
        {
            key = "2",
            event = "justPressed",
            active = true,
            fn = function()
                da_ui.send("keyPress", { mode = "objectHUD", key = "2" })
            end,
        },
        {
            key = "3",
            event = "justPressed",
            active = true,
            fn = function()
                da_ui.send("keyPress", { mode = "objectHUD", key = "3" })
            end,
        },
        {
            key = "4",
            event = "justPressed",
            active = true,
            fn = function()
                da_ui.send("keyPress", { mode = "objectHUD", key = "4" })
            end,
        },
        {
            key = "5",
            event = "justPressed",
            active = true,
            fn = function()
                da_ui.send("keyPress", { mode = "objectHUD", key = "5" })
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

local ControlCheckCursor = function(pressed, justPressed)
    if SelectMode ~= "Cursor" then return; end
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
        if pressed.alt and Hover then
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

local testsceneobjects = {
    { model = "prop_test1", pos = vec3(1, 2, 3), rot = vec3(4, 5, 6), },
    { model = "prop_test1", pos = vec3(1, 1, 1), rot = vec3(1, 1, 1), },
    { model = "prop_test2", pos = vec3(1, 2, 3), rot = vec3(4, 5, 6), },
    { model = "prop_test2", pos = vec3(100, 0, 0), rot = vec3(0, 0, 0), },
    { model = "prop_test3", pos = vec3(0, 0, 0), rot = vec3(0, 0, 0), },
}
kvp.encode("scenes:test_1", { name = "test_1", objects = testsceneobjects })
kvp.encode("scenes:test_2", { name = "test_2", objects = testsceneobjects })
kvp.encode("scenes:test_3", { name = "test_3", objects = testsceneobjects })
kvp.encode("scenes:test_4", { name = "test_4", objects = testsceneobjects })

da_ui.callbacks({
    nearbyObjects = function(data) return {nearbyObjects = GetNearbyObjects(data.range, data.origin)} end,
    scenesList = function()
        local sceneNames = kvp.search("scenes:")
        local scenes = {}
        for _, scene in ipairs(sceneNames) do
            local sceneName = scene:sub(8)
            local s = kvp.decode(scene)
            Scenes[sceneName] = s
            table.insert(scenes, s)
        end
        return { scenes = scenes }
    end,
    sceneObjects = function(data)
        local coords = GetEntityCoords(PlayerPedId())
        local sceneName = data.scene
        local sceneObjects = {}
        for _, obj in ipairs(Scenes[sceneName].objects) do
            local handle = da_obj.create(obj.model, obj.pos, obj.data)
            SetEntityRotation(handle, obj.rot.x, obj.rot.y, obj.rot.z)

            -- TODO: clean this up
            local objData = GetObjData(handle)
            objData.distance = #(coords - obj.pos)
            table.insert(sceneObjects, objData)
        end
        return { objects = sceneObjects }
    end,
})
da_ui.events({
    sendCursorKey = function(data) ControlCheckCursor(data.pressed, data.justPressed) end,
    sendCursorPos = function(data) MouseX = data.x; MouseY = data.y end,
    selectSpawnObject = function(data) Spawn = GetHashKey(data.name) end,
    trackObject = TrackObject,
    setNearbyOriginPos = SetNearbyOriginPos,
})

-- UI Tree

da_trie.addOpt("devRoot", "mode:edit", "e",
    function() da_mode.activate("object") end,
    function() return not da_mode.isActive("object") end)

da_trie.addOpt("objRoot", "mode:edit", "e",
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


da_trie.add("objRoot", "obj clipboard", "q")

da_trie.addOpt("obj clipboard", "pos v3", "3",
    function()
        local v3 = GetEntityCoords(Select)
        da_ui.send("clipboard", {
            text = ("vector3(%.3f, %.3f, %.3f),"):format(v3.x, v3.y, v3.z)
        })
    end,
    function() return Select ~= nil end)

da_trie.addOpt("obj clipboard", "pos v4", "4",
    function()
        local v3 = GetEntityCoords(Select)
        local hdg = GetEntityHeading(Select)
        da_ui.send("clipboard", {
            text = ("vector4(%.3f, %.3f, %.3f, %.3f),"):format(v3.x, v3.y, v3.z, hdg)
        })
    end,
    function() return Select ~= nil end)

da_trie.addOpt("obj clipboard", "rot v3", "5",
    function()
        local v3 = GetEntityRotation(Select)
        da_ui.send("clipboard", {
            text = ("vector3(%.3f, %.3f, %.3f),"):format(v3.x, v3.y, v3.z)
        })
    end,
    function() return Select ~= nil end)

da_trie.addOpt("obj clipboard", "entity id", "e",
    function() da_ui.send("clipboard", { text = Select }) end,
    function() return Select ~= nil end)

da_trie.addOpt("obj clipboard", "model hash", "m",
    function() da_ui.send("clipboard", { text = GetEntityModel(Select) }) end,
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


