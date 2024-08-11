SelectMode = false

local MouseX = 0.5
local MouseY = 0.5
local PPID = nil
local ObjectThread = {}
local Distance = 1000.0
local UntrackedModels = {
    [0] = true,
}
local CategoryColor = {
    hover = {r=80, g=193, b=238, a=255},
    select = {r=0, g=218, b=175, a=255},
}
local TrackedObjects = {
    hover = nil,
    select = nil,
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
        if category ~= "hover" or handle ~= TrackedObjects.select then
            DrawBoundingBox(handle, CategoryColor[category])
        end
    end
end

local UpdateTrackedObjects = function(hit, obj)
    if not hit then
        TrackedObjects.hover = nil
        return
    end
    local model = GetEntityModel(obj)
    if not model or UntrackedModels[model] then
        TrackedObjects.hover = nil
        return
    end
    TrackedObjects.hover = obj
end

local GetThreadId = function()
    local threadId = math.random(1000)
    while ObjectThread[threadId] do
        threadId = math.random(1000)
    end
    return threadId
end

local NUIMessageWait = nil
local SendNUIUpdate = function(objects)
    if NUIMessageWait then return; end
    NUIMessageWait = true
    Citizen.SetTimeout(100, function() NUIMessageWait = nil end)
    SendNUIMessage({type = "nuiUpdate", objects = {
        hover = objects.hover ~= nil,
        select = objects.select ~= nil,
    }})
end

local ControlCheckCrosshair = function()
    DisablePlayerFiring(PPID, true)
    for _, control in pairs(Control) do
        DisableControlAction(0, control, true)
    end

    local pressed, justPressed = da.Dev.Control.GetPressed(
        { "r", "Escape", "Alt", "Control", },
        { "r", "x", "z", "MouseLeft", }
    )

    -- Select Object (MouseLeft)
    if justPressed.MouseLeft  then
        if TrackedObjects.hover then
            if TrackedObjects.hover == TrackedObjects.select then
                TrackedObjects.select = nil
            else
                TrackedObjects.select = TrackedObjects.hover
            end
        end
    end

    -- Open Gizmo (R)
    if not pressed.Control and pressed.r then
        if TrackedObjects.select then
            StartGizmo(TrackedObjects.select)
        end
    end

    if TrackedObjects.hover and TrackedObjects.select and pressed.Control then
        if justPressed.r then
            local hPos = GetEntityRotation(TrackedObjects.hover)
            SetEntityRotation(TrackedObjects.select, hPos.x, hPos.y, hPos.z)
        end
        if justPressed.x then
            local sPos = GetEntityCoords(TrackedObjects.select)
            local hPos = GetEntityCoords(TrackedObjects.hover)
            SetEntityCoords(TrackedObjects.select, hPos.x, hPos.y, sPos.z)
        end
        if justPressed.z then
            local sPos = GetEntityCoords(TrackedObjects.select)
            local hPos = GetEntityCoords(TrackedObjects.hover)
            SetEntityCoords(TrackedObjects.select, sPos.x, sPos.y, hPos.z)
        end
    end

    if pressed.Escape then
        da.Dev.Mode.Remove("object")
    end
end

local ControlCheckCursor = function(pressed, justPressed)
    pressed = pressed or {}
    justPressed = justPressed or {}

    -- Select Object (MouseLeft)
    if justPressed.MouseLeft then
        if TrackedObjects.hover then
            if TrackedObjects.hover == TrackedObjects.select then
                TrackedObjects.select = nil
            else
                TrackedObjects.select = TrackedObjects.hover
            end
        end
    end

    if justPressed.r then
        if not TrackedObjects.select and TrackedObjects.hover then
            TrackedObjects.select = TrackedObjects.hover
        end
        if pressed.alt and TrackedObjects.hover then
            TrackedObjects.select = TrackedObjects.hover
        end
        if TrackedObjects.select then
            StartGizmo(TrackedObjects.select)
        end
    end
end

RegisterNUICallback('NUIKey', function(data, cb)
    if data.key == "r" then
        if not TrackedObjects.select and TrackedObjects.hover then
            TrackedObjects.select = TrackedObjects.hover
        end
        if data.alt and TrackedObjects.hover then
            TrackedObjects.select = TrackedObjects.hover
        end
        if TrackedObjects.select then
            StartGizmo(TrackedObjects.select)
        end
        cb(true)
    end
end)

local SelectModeTick = function()
    local hit, obj = nil, nil
    if SelectMode == "Cursor" then
        hit, obj = RayCastCursor(MouseX, MouseY, Distance)
    elseif SelectMode == "Crosshair" then
        hit, obj = RayCastCrosshair(PPID, Distance)
        ControlCheckCrosshair()
    else
        return
    end

    UpdateTrackedObjects(hit, obj)
    DrawTrackedObjects()

    SendNUIUpdate(TrackedObjects)
end

ObjectModeThread = function()
    local id = GetThreadId()
    ObjectThread = {}
    Citizen.CreateThread(function()
        ObjectThread[id] = true
        CurrentTree = "objectTree"
        PPID = PlayerPedId()
        while ObjectThread[id] and SelectMode do
            SelectModeTick()
            Citizen.Wait(0)
        end
        ObjectThread[id] = nil
        CurrentTree = "optionTree"
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

RegisterNUICallback('sendControl', function(data, cb)
    ControlCheckCursor(data.pressed, data.justPressed)
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


da.Dev.Menu.RegisterOption("root", "obj mode", "e", function() da.Dev.Mode.Add("object") end, function() return not SelectMode end)
da.Dev.Menu.RegisterOption("objectRoot", "obj mode", "e", function() da.Dev.Mode.Remove("object") end, function() return SelectMode end)

da.Dev.Menu.RegisterOption("objectRoot", "mov/rot", "r", function() StartGizmo(TrackedObjects.select) end, function() return SelectedObject ~= nil and not LocalPlayer.state.metadata.isdead end)
da.Dev.Menu.RegisterMenu("objectRoot", "obj clipboard", "q")


da.Dev.Menu.RegisterOption("obj clipboard", "pos v3", "3", function()
        local v3 = GetEntityCoords(TrackedObjects.select)
        SendNUIMessage({type = "clipboard", text = ("vector3(%.3f, %.3f, %.3f),"):format(v3.x, v3.y, v3.z)})
    end,
    function() return TrackedObjects.select ~= nil end)
da.Dev.Menu.RegisterOption("obj clipboard", "pos v4", "4", function()
        local v3 = GetEntityCoords(TrackedObjects.select)
        local hdg = GetEntityHeading(TrackedObjects.select)
        SendNUIMessage({type = "clipboard", text = ("vector4(%.3f, %.3f, %.3f, %.3f),"):format(v3.x, v3.y, v3.z, hdg)})
    end,
    function() return TrackedObjects.select ~= nil end)

da.Dev.Menu.RegisterOption("obj clipboard", "rot v3", "5", function()
        local v3 = GetEntityRotation(TrackedObjects.select)
        SendNUIMessage({type = "clipboard", text = ("vector3(%.3f, %.3f, %.3f),"):format(v3.x, v3.y, v3.z)})
    end,
    function() return TrackedObjects.select ~= nil end)

da.Dev.Menu.RegisterOption("obj clipboard", "entity id", "e", function()
        SendNUIMessage({type = "clipboard", text = TrackedObjects.select})
    end,
    function() return TrackedObjects.select ~= nil end)

da.Dev.Menu.RegisterOption("obj clipboard", "model hash", "m", function()
        SendNUIMessage({type = "clipboard", text = GetEntityModel(TrackedObjects.select)})
    end,
    function() return TrackedObjects.select ~= nil end)


da.Dev.Menu.RegisterMenu("objectRoot", "obj set", "s")

da.Dev.Menu.RegisterOption("obj set", "pos v3", "3", function()
        local pos = GetEntityCoords(TrackedObjects.hover)
        SetEntityCoords(TrackedObjects.select, pos.x, pos.y, pos.z)
    end,
    function()
        return TrackedObjects.select ~= nil and TrackedObjects.hover ~= nil
    end)

da.Dev.Menu.RegisterOption("obj set", "rot v3", "r", function()
        local rot = GetEntityRotation(TrackedObjects.hover)
        SetEntityRotation(TrackedObjects.select, rot.x, rot.y, rot.z)
    end,
    function() return TrackedObjects.select ~= nil and TrackedObjects.hover ~= nil end)

da.Dev.Menu.RegisterOption("obj set", "pos xy", "x", function()
        local sPos = GetEntityCoords(TrackedObjects.select)
        local hPos = GetEntityCoords(TrackedObjects.hover)
        SetEntityCoords(TrackedObjects.hover, hPos.x, hPos.y, sPos.z)
    end,
    function()
        return TrackedObjects.select ~= nil and TrackedObjects.hover ~= nil
    end)

da.Dev.Menu.RegisterOption("objectRoot", "reset rot", "]", function()
        local obj = TrackedObjects.hover ~= nil and HoveredObject or TrackedObjects.select
        SetEntityRotation(obj, 0, 0, 0)
    end,
    function()
        return TrackedObjects.hover ~= nil or TrackedObjects.select ~= nil
    end)

-- Freeze
da.Dev.Menu.RegisterOption("objectRoot", "frz", "f", function()
        local obj = TrackedObjects.hover ~= nil and HoveredObject or TrackedObjects.select
        FreezeEntityPosition(obj, true)
    end, function()
        local obj = TrackedObjects.hover ~= nil and HoveredObject or TrackedObjects.select
        return obj ~= nil and IsEntityFrozen(obj) == 0
    end)
da.Dev.Menu.RegisterOption("objectRoot", "unfrz", "f", function()
        local obj = TrackedObjects.hover ~= nil and HoveredObject or TrackedObjects.select
        FreezeEntityPosition(obj, false)
    end, function()
        local obj = TrackedObjects.hover ~= nil and HoveredObject or TrackedObjects.select
        return obj ~= nil and IsEntityFrozen(obj) == 1
    end)
