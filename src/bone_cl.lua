local BoneIndexes = {}
local BoneEdges = {}
local ThreadActive = false
local White = {r = 255, g = 255, b = 255, a = 255}
local SphereSize = 0.003
local TextSize = 0.1
local Alpha = 150

local CacheBoneIndexes = function(entity)
    local boneList = bones.human_skel
    local boneIndexes = {}
    local boneEdges = bones.human_skel_edges

    if not DoesEntityExist(entity) then
        log.error("Entity does not exist: exiting bone draw")
        ThreadActive = false
        return boneIndexes, boneEdges
    elseif not bones or not next(bones) then
        log.error("Bones not loaded: exiting bone draw")
        ThreadActive = false
        return boneIndexes, boneEdges
    end

    local model = GetEntityModel(entity)
    if IsThisModelAHorse(model) ~= 0 then
        boneList = bones.horse_skel
        boneEdges = bones.horse_skel_edges
    elseif not IsEntityAPed(entity) then
        log.error("Entity is not a ped or horse: exiting bone draw")
        ThreadActive = false
        return boneIndexes, boneEdges
    end

    for _, bone in ipairs(boneList) do
        boneIndexes[bone] = GetEntityBoneIndexByName(entity, bone)
    end

    return boneIndexes, boneEdges
end

local DrawAllBones = function(entity, text)
    BoneIndexes, BoneEdges = CacheBoneIndexes(entity)
    local boneCoordCache = {}

    for bone, boneIndex in pairs(BoneIndexes) do
        local boneCoords = GetWorldPositionOfEntityBone(entity, boneIndex)
        if boneCoords then
            boneCoordCache[bone] = boneCoords
            if text then DrawText(bone, boneCoords.xyz, White, TextSize) end
            DrawSphere(boneCoords.xyz, SphereSize, White)
        end
    end

    for edge, bone in ipairs(BoneEdges) do
        local bone1 = boneCoordCache[bone[1]]
        local bone2 = boneCoordCache[bone[2]]
        if bone1 and bone2 then
            DrawLine(bone1.xyz, bone2.xyz, White.r, White.g, White.b, White.a)
        end
    end
end

local DrawBoneThread = function(entity, text)
    if ThreadActive then return; end
    ThreadActive = true
    Citizen.CreateThread(function()
        while ThreadActive do
            SetEntityAlpha(entity, Alpha, false)
            DrawAllBones(entity, text)
            Citizen.Wait(0)
        end
        ResetEntityAlpha(entity)
        ThreadActive = false
    end)
end

cli.add_cmd("bone", { desc = "Bone commands" })
cli.add_subcmd("bone", "draw", {
    desc = "Draw bone overlay on entity",
    args = { "enabled" },
    opt = {
        ["entity"] = { desc = "Entity to draw bones [default: player]", },
        ["text"] = { desc = "Draw bone names", bool = true },
    },
    fn = function(args)
        local enabled = args.enabled ~= nil and args.enabled ~= "false"
        if not enabled then
            ThreadActive = false
            return
        end

        local entity = args.entity and tonumber(args.entity) or PlayerPedId()
        log.debug("Drawing bones:", enabled)
        DrawBoneThread(entity, args.text)
    end
})
