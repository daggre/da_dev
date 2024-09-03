local IKThread = false
local IKEnabled = {}
local IKMenuName = "ikinemat"

da.Dev.Menu.RegisterMenu("root", IKMenuName, "q")

local IKTypes = {
    ["head"] = { key = "h", fn_address = 0xC11C18092C5530DC, },
    ["torso"] = { key = "t", fn_address = 0xF2B7106D37947CE0, },
    ["leg"] = { key = "s", fn_address = 0x73518ECE2485412B, },
    ["arm"] = { key = "a", fn_address = 0x6C3B4D6D13B4C841, },
    ["unk"] = { key = "q", fn_address = 0x6F0F77FBA9A8F2E6, },
    ["trs rct"] = { key = "r", fn_address = 0xF5846EDB26A98A24, },
    -- ["trs veh"]= { key = "v", fn_address = 0x6647C5F6F5792496, }, -- Crashed game
}

for ikType, ikData in pairs(IKTypes) do

    IKEnabled[ikType] = true

    -- Enable IK
    da.Dev.Menu.RegisterOption(IKMenuName, ikType.." ik on", ikData.key, function()
        if not IKThread then StartKinematicsThread(); end
        local ped = PlayerPedId()
        Citizen.InvokeNative(ikData.fn_address, ped, 1)
        IKEnabled[ikType] = true
    end, function() return not IKEnabled[ikType] end)

    -- Disable IK
    da.Dev.Menu.RegisterOption(IKMenuName, ikType.." ik off", ikData.key, function()
        if not IKThread then StartKinematicsThread(); end
        IKEnabled[ikType] = nil
    end, function() return IKEnabled[ikType] end)

end

da.Dev.Menu.RegisterOption(IKMenuName, "stop all", "x", function()
    IKThread = false
end, function() return IKThread end)

function StartKinematicsThread()
    if IKThread then return; end
    IKThread = true
    Citizen.CreateThread(function()
        while IKThread do
            if next(IKEnabled) then
                local ped = PlayerPedId()
                for ikType, ikData in pairs(IKTypes) do
                    if not IKEnabled[ikType] then
                        Citizen.InvokeNative(ikData.fn_address, ped, 0)
                    else
                        Citizen.InvokeNative(ikData.fn_address, ped, 1)
                    end
                end
                Citizen.Wait(0)
            end
        end
        IKThread = false
    end)
end

function GetNearbyObjects(range)
    local pos = GetFinalRenderedCamCoord()
    local entities = da.Util.GetEntitiesNearPoint(pos, range)
    local entityData = {}
    for i, entity in ipairs(entities) do
        local model = GetEntityModel(entity)
        local coords = GetEntityCoords(entity)
        entityData[i] = {
            handle = entity,
            model = model,
            modelName = da.Util.GetModelName(model),
            distance = #(pos - coords),
        }
    end
    local peds = da.Util.GetPedsNearPoint(pos, range)
    for i, entity in ipairs(peds) do
        local model = GetEntityModel(entity)
        local coords = GetEntityCoords(entity)
        entityData[i] = {
            handle = entity,
            model = model,
            modelName = da.Util.GetModelName(model),
            distance = #(pos - coords),
        }
    end
    return entityData
end

RegisterNUICallback('nearbyObjects', function(data, cb)
    cb({ nearbyObjects = GetNearbyObjects(data.range)})
end)
