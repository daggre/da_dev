local Color = { r = 255, g = 255, b = 255, a = 255 }
local Skeletons = {
    human = {
        isDrawing = false,
        entityCb = function() return PlayerPedId() end,
        key = "v",
        bones = {},
        graph = {},
    },
    horse = {
        isDrawing = false,
        entityCb = function() return GetMount(PlayerPedId()) end,
        key = "h",
        bones = {},
        graph = {
            {"skel_r_finger31","skel_head"},
            {"skel_head","skel_neck5"},
            {"skel_neck5","skel_neck4"},
            {"skel_neck4","skel_neck3"},
            {"skel_neck3","skel_neck2"},
            {"skel_neck2","skel_neck1"},
            {"skel_neck1","skel_neck0"},
            {"skel_neck1","skel_r_clavicle"},
            {"skel_neck1","skel_l_clavicle"},
            {"skel_spine3","skel_r_clavicle"},
            {"skel_spine3","skel_l_clavicle"},
            {"skel_neck0","skel_spine_root"},
            {"skel_neck0","skel_spine3"},
            {"skel_spine3","skel_spine2"},
            {"skel_spine2","skel_spine1"},
            {"skel_spine1","skel_spine0"},
            {"skel_spine0","skel_pelvis"},
            {"skel_pelvis","skel_tail0"},
            {"skel_tail0","skel_tail1"},
            {"skel_tail1","skel_tail2"},
            {"skel_tail2","skel_tail3"},
            {"skel_tail3","skel_tail4"},
            {"skel_pelvis","skel_r_calf"},
            {"skel_r_calf","skel_r_foot"},
            {"skel_r_foot","skel_r_toe0"},
            {"skel_r_toe0","skel_r_toe1"},
            {"skel_pelvis","skel_l_calf"},
            {"skel_l_calf","skel_l_foot"},
            {"skel_l_foot","skel_l_toe0"},
            {"skel_l_toe0","skel_l_toe1"},
            {"skel_r_clavicle","skel_r_upperarm"},
            {"skel_r_upperarm","skel_r_forearm"},
            {"skel_r_forearm","skel_r_hand"},
            {"skel_r_hand","skel_r_finger00"},
            {"skel_r_finger00","skel_r_finger01"},
            {"skel_l_clavicle","skel_l_upperarm"},
            {"skel_l_upperarm","skel_l_forearm"},
            {"skel_l_forearm","skel_l_hand"},
            {"skel_l_hand","skel_l_finger00"},
            {"skel_l_finger00","skel_l_finger01"},
        },
    },
}

local function startsWith(str, prefix)
    return string.sub(str, 1, #prefix) == prefix
end

da_trie.add("devRoot", "skeleton", "]")

for skelName, skel in pairs(Skeletons) do


    da_trie.addOpt("skeleton", skelName, skel.key, function()
        skel.isDrawing = not skel.isDrawing
        if not skel.isDrawing then return end
        local e = skel.entityCb()
        if not IsEntityAPed(e) then
            skel.IsDrawing = false
            return
        end
        for _, bone in ipairs(dat.bones) do
            local boneName = string.lower(bone)
            local boneIndex = GetEntityBoneIndexByName(e, boneName)
            -- log.debug(_, boneName, boneIndex, position)
            -- if startsWith(boneName, "skel") and boneIndex ~= -1 then
            if boneIndex ~= -1 then
                skel.bones[boneName] = boneIndex
            end
        end
        Citizen.CreateThread(function()
            local b = {}
            SetEntityAlpha(e, 100, false)
            while skel.isDrawing do
                for name, index in pairs(skel.bones) do
                    b[name] = GetWorldPositionOfEntityBone(e, index)
                    DrawText(name, b[name], Color, 0.15)
                end
                for _, v in ipairs(skel.graph) do
                    if b[v[1]] ~= nil and b[v[2]] ~= nil then
                        DrawLine(b[v[1]], b[v[2]], Color.r, Color.g, Color.b, Color.a)
                    end
                end
                Citizen.Wait(0)
            end
            SetEntityAlpha(e, 255, false)
        end)
    end)
end
