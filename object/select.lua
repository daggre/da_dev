local playerPedId = nil
local EnableSelectMode = false
local SelectModeThread = {}
local LightBlue = {r=80, g=193, b=238, a=255}
local Green = {r=0, g=218, b=175, a=255}

local _GetSelectModeThreadId = function()
    local threadId = math.random(1, 1000)
    while SelectModeThread[threadId] do
        threadId = math.random(1, 1000)
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
    DisablePlayerFiring(playerPedId, true)
    for _, control in pairs(Control) do
        DisableControlAction(0, control, true)
    end
    if HoveredObject or SelectedObject then
        local obj = HoveredObject ~= nil and HoveredObject or SelectedObject

        -- Open Gizmo (R)
        if not IsDisabledControlPressed(0, Control.LeftCtrl) and IsDisabledControlJustPressed(0, Control.R) then
            StartGizmo(obj)
        end

        -- if IsDisabledControlJustPressed(0, Control.RightBracket) then
        --     SetEntityRotation(SelectedObject or HoveredObject, 0, 0, 0)
        -- end

        if HoveredObject and SelectedObject and IsDisabledControlPressed(0, Control.LeftCtrl) then
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

local SelectModeTick = function()
    local model = nil
    local hit = nil
    local obj = nil
    local hover = nil
    if SelectedObject then
        DrawBoundingBox(SelectedObject, Green)
    end
    hit, obj = RayCastCamera(playerPedId, 500.0)
    if hit then
        if SelectedObject ~= obj then
            model = GetEntityModel(obj)
            if model and model ~= 0 then
                hover = true
                HoveredObject = obj
                DrawBoundingBox(obj, LightBlue)
            else
                obj = 0
            end
        end
    end
    if not hover then HoveredObject = nil; end
    SelectModeControlCheck()
    _SendNUIUpdate(obj)
end

local StartSelectModeThread = function(id)
    SelectModeThread = {}
    Citizen.CreateThread(function()
        SelectModeThread[id] = true
        CurrentTree = "objectTree"
        playerPedId = PlayerPedId()
        while SelectModeThread[id] and EnableSelectMode do
            SelectModeTick()
            Citizen.Wait(0)
        end
        SelectModeThread[id] = nil
        CurrentTree = "optionTree"
    end)
end

local ObjectModeToggle = function(state)
    if state ~= nil and EnableSelectMode == state then return; end
    EnableSelectMode = not EnableSelectMode
    da.Log.Info(("Entity select mode: %s"):format(EnableSelectMode and "^2ON^7" or "^1OFF^7"))
    SendNUIMessage({type = "displayHUD", value = "objectHUD", enable = EnableSelectMode and "on" or "off"})
    if EnableSelectMode then
        da.Dev.Mode.Add("object")
        StartSelectModeThread(_GetSelectModeThreadId())
        if Camera.Mode ~= "free" then
            Camera.Mode = "free"
            EnableFreeCam()
            InitCamControl()
        end
    else
        da.Dev.Mode.Remove("object")
        if Camera.Mode ~= "player" then
            Camera.Mode = "player"
            DisableFreeCam()
        end
    end
end

RegisterNUICallback('objectMode', function(data, cb)
    ObjectModeToggle(data.enable == "on")
    cb(true)
end)

-- da.Dev.Menu.RegisterMenu("root", "object mode", "e")
da.Dev.Menu.RegisterOption("root", "obj mode", "e", function() ObjectModeToggle() end, function() return not EnableSelectMode end)
da.Dev.Menu.RegisterOption("objectRoot", "obj mode", "e", function() ObjectModeToggle() end, function() return EnableSelectMode end)

-- da.Dev.Menu.RegisterMenu("objectRoot", "object mode", "e")
-- da.Dev.Menu.RegisterOption("object mode", "exit mode", "e", function() ObjectModeToggle() end, function() return EnableSelectMode end)
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
