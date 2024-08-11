local PPID = nil
local EnableSelectMode = false
local ObjectThread = {}
local SelectMode = false
local Distance = 1000.0
local UntrackedModels = {
    [0] = true,
}
local CategoryColor = {
    Select = {r=0, g=218, b=175, a=255},
    Hover = {r=80, g=193, b=238, a=255},
}
local TrackedObjects = {
    Select = nil,
    Hover = nil,
}

local TrackObject = function(category, handle)
    if not handle then return; end
    TrackedObjects[category] = handle
end

local RemoveTrackedObject = function(category)
    TrackedObjects[category] = nil
end

local DrawTrackedObjects = function()
    for category, handle in pairs(TrackedObjects) do
        DrawBoundingBox(handle, CategoryColor[category])
    end
end

local UpdateTrackedObjects = function(hit, obj)
    if not hit then return; end
    local model = GetEntityModel(obj)
    if not model or UntrackedModels[model] then return; end
    TrackedObjects.Hover = obj
end

local GetThreadId = function()
    local threadId = math.random(1000)
    while ObjectThread[threadId] do
        threadId = math.random(1000)
    end
    return threadId
end

local NUIMessageWait = nil
local _SendNUIUpdate = function(obj)
    if NUIMessageWait then return; end
    NUIMessageWait = true
    Citizen.SetTimeout(100, function() NUIMessageWait = nil end)
    SendNUIMessage({type = "objUpdate", data = {
        obj = obj,
        selected = SelectedObject ~= nil,
    }})
end

local SelectModeControlCheck = function()
    DisablePlayerFiring(PPID, true)
    for _, control in pairs(Control) do
        DisableControlAction(0, control, true)
    end
    if HoveredObject or SelectedObject then

        -- Select Object (T)
        if IsDisabledControlJustPressed(0, Control.T) then
            if HoveredObject then
                if HoveredObject == SelectedObject then
                    SelectedObject = nil
                else
                    SelectedObject = HoveredObject
                    SendNUIMessage({type = "clipboard", text = SelectedObject})
                end
            else
                SelectedObject = nil
            end
        end

        -- Open Gizmo (R)
        if not IsDisabledControlPressed(0, Control.LeftControl) and IsDisabledControlJustPressed(0, Control.R) then
            if not SelectedObject and HoveredObject then
                SelectedObject = HoveredObject
            end
            if IsDisabledControlPressed(0, Control.LAlt) and HoveredObject then
                SelectedObject = HoveredObject
            end
            if SelectedObject then
                StartGizmo(SelectedObject)
            end
        end

        if HoveredObject and SelectedObject and IsDisabledControlPressed(0, Control.LeftControl) then
            if IsDisabledControlJustPressed(0, Control.R) then
                local hPos = GetEntityRotation(HoveredObject)
                SetEntityRotation(SelectedObject, hPos.x, hPos.y, hPos.z)
            end
            if IsDisabledControlJustPressed(0, Control.X) then
                local sPos = GetEntityCoords(SelectedObject)
                local hPos = GetEntityCoords(HoveredObject)
                SetEntityCoords(SelectedObject, hPos.x, hPos.y, sPos.z)
            end
            if IsControlJustPressed(0, Control.Z) then
                local sPos = GetEntityCoords(SelectedObject)
                local hPos = GetEntityCoords(HoveredObject)
                SetEntityCoords(SelectedObject, sPos.x, sPos.y, hPos.z)
            end
        end


    end
end

RegisterNUICallback('NUIKey', function(data, cb)
    if data.key == "r" then
        if not SelectedObject and HoveredObject then
            SelectedObject = HoveredObject
        end
        if data.alt and HoveredObject then
            SelectedObject = HoveredObject
        end
        if SelectedObject then
            StartGizmo(SelectedObject)
        end
        cb(true)
    end
end)

local SelectModeTick = function()
    da.Log.Debug("SelectMode", SelectMode)
    -- TODO: Add support for SelectMode
    -- - Migrate away from EnableSelectMode
    local hit, obj = nil, nil
    if SelectMode == "Cursor" then
        hit, obj = RayCastCursor(Distance)
    elseif SelectMode == "Crosshair" then
        hit, obj = RayCastCrosshair(PPID, Distance)
        SelectModeControlCheck()
    else
        return
    end

    UpdateTrackedObjects(hit, obj)
    DrawTrackedObjects()

    _SendNUIUpdate(obj)
end

ObjectModeThread = function()
    local id = GetThreadId()
    ObjectThread = {}
    Citizen.CreateThread(function()
        ObjectThread[id] = true
        CurrentTree = "objectTree"
        PPID = PlayerPedId()
        while ObjectThread[id] and EnableSelectMode do
            SelectModeTick()
            Citizen.Wait(0)
        end
        ObjectThread[id] = nil
        CurrentTree = "optionTree"
    end)
end

RegisterNUICallback('sendCursorPos', function(data, cb)
    MouseX = data.x
    MouseY = data.y
    MouseClick = data.click
    cb(true)
end)

RegisterNUICallback('trackObject', function(data, cb)
    if data.remove then
        RemoveTrackedObject(data.category)
    else
        TrackObject(data.category, tonumber(data.handle))
    end
    cb(true)
end)


da.Dev.Menu.RegisterOption("root", "obj mode", "e", function() da.Dev.Mode.Add("object") end, function() return not EnableSelectMode end)
da.Dev.Menu.RegisterOption("objectRoot", "obj mode", "e", function() da.Dev.Mode.Remove("object") end, function() return EnableSelectMode end)

da.Dev.Menu.RegisterOption("objectRoot", "mov/rot", "r", function() StartGizmo(SelectedObject) end, function() return SelectedObject ~= nil and not LocalPlayer.state.metadata.isdead end)
da.Dev.Menu.RegisterMenu("objectRoot", "obj clipboard", "q")


da.Dev.Menu.RegisterOption("obj clipboard", "pos v3", "3", function()
        local v3 = GetEntityCoords(SelectedObject)
        SendNUIMessage({type = "clipboard", text = ("vector3(%.3f, %.3f, %.3f),"):format(v3.x, v3.y, v3.z)})
    end,
    function() return SelectedObject ~= nil end)
da.Dev.Menu.RegisterOption("obj clipboard", "pos v4", "4", function()
        local v3 = GetEntityCoords(SelectedObject)
        local hdg = GetEntityHeading(SelectedObject)
        SendNUIMessage({type = "clipboard", text = ("vector4(%.3f, %.3f, %.3f, %.3f),"):format(v3.x, v3.y, v3.z, hdg)})
    end,
    function() return SelectedObject ~= nil end)

da.Dev.Menu.RegisterOption("obj clipboard", "rot v3", "5", function()
        local v3 = GetEntityRotation(SelectedObject)
        SendNUIMessage({type = "clipboard", text = ("vector3(%.3f, %.3f, %.3f),"):format(v3.x, v3.y, v3.z)})
    end,
    function() return SelectedObject ~= nil end)

da.Dev.Menu.RegisterOption("obj clipboard", "entity id", "e", function()
        SendNUIMessage({type = "clipboard", text = SelectedObject})
    end,
    function() return SelectedObject ~= nil end)

da.Dev.Menu.RegisterOption("obj clipboard", "model hash", "m", function()
        SendNUIMessage({type = "clipboard", text = GetEntityModel(SelectedObject)})
    end,
    function() return SelectedObject ~= nil end)


da.Dev.Menu.RegisterMenu("objectRoot", "obj set", "s")

da.Dev.Menu.RegisterOption("obj set", "pos v3", "3", function()
        local pos = GetEntityCoords(HoveredObject)
        SetEntityCoords(SelectedObject, pos.x, pos.y, pos.z)
    end,
    function()
        return SelectedObject ~= nil and HoveredObject ~= nil
    end)

da.Dev.Menu.RegisterOption("obj set", "rot v3", "r", function()
        local rot = GetEntityRotation(HoveredObject)
        SetEntityRotation(SelectedObject, rot.x, rot.y, rot.z)
    end,
    function() return SelectedObject ~= nil and HoveredObject ~= nil end)

da.Dev.Menu.RegisterOption("obj set", "pos xy", "x", function()
        local sPos = GetEntityCoords(SelectedObject)
        local hPos = GetEntityCoords(HoveredObject)
        SetEntityCoords(HoveredObject, hPos.x, hPos.y, sPos.z)
    end,
    function()
        return SelectedObject ~= nil and HoveredObject ~= nil
    end)

da.Dev.Menu.RegisterOption("objectRoot", "reset rot", "]", function()
        local obj = HoveredObject ~= nil and HoveredObject or SelectedObject
        SetEntityRotation(obj, 0, 0, 0)
    end,
    function()
        return HoveredObject ~= nil or SelectedObject ~= nil
    end)

-- Freeze
da.Dev.Menu.RegisterOption("objectRoot", "frz", "f", function()
        local obj = HoveredObject ~= nil and HoveredObject or SelectedObject
        FreezeEntityPosition(obj, true)
    end, function()
        local obj = HoveredObject ~= nil and HoveredObject or SelectedObject
        return obj ~= nil and IsEntityFrozen(obj) == 0
    end)
da.Dev.Menu.RegisterOption("objectRoot", "unfrz", "f", function()
        local obj = HoveredObject ~= nil and HoveredObject or SelectedObject
        FreezeEntityPosition(obj, false)
    end, function()
        local obj = HoveredObject ~= nil and HoveredObject or SelectedObject
        return obj ~= nil and IsEntityFrozen(obj) == 1
    end)
