-- Ped skeleton viewer for object mode's "inspect" tab.
--
-- Replaces the old standalone devRoot skeleton toggle (skeleton_cl.lua). Driven by
-- the object-mode UI: the inspect tab requests the selected ped's bones (getBones),
-- the player filters/clicks bones and sets a transparency value, and this module
-- draws the matching bones in-world each frame, highlighting the clicked one.
--
-- Reads the object-mode global `Select` (the currently-selected entity). Peds only --
-- the static `dat.bones` name list is ped-oriented, so a non-ped selection yields an
-- empty list and nothing is drawn.

local LabelColor      = { r = 255, g = 255, b = 255, a = 200 }
local HighlightColor  = { r = 80, g = 220, b = 255, a = 255 }
local LabelSize       = 0.15
local HighlightRadius = 0.02

local Bones = {
    active   = false, -- inspect tab open with a ped selected
    entity   = nil,   -- the ped whose bones we're drawing
    map      = {},    -- name -> bone index (only bones present on the entity)
    filter   = "",    -- lowercased substring; "" = all
    selected = nil,   -- name of the highlighted bone
    running  = false, -- draw-thread guard
}

local function resetAlpha()
    if Bones.entity and DoesEntityExist(Bones.entity) then
        ResetEntityAlpha(Bones.entity)
    end
end

-- Brute-force the known bone-name list against the entity; keep the ones it has.
local function enumerateBones(entity)
    local map = {}
    for _, bone in ipairs(dat.bones) do
        local name = string.lower(bone)
        local index = GetEntityBoneIndexByName(entity, name)
        if index ~= -1 then
            map[name] = index
        end
    end
    return map
end

local function startDrawLoop()
    if Bones.running then return; end
    Bones.running = true
    Citizen.CreateThread(function()
        while Bones.active and Bones.entity and DoesEntityExist(Bones.entity) do
            for name, index in pairs(Bones.map) do
                if Bones.filter == "" or string.find(name, Bones.filter, 1, true) then
                    local pos = GetWorldPositionOfEntityBone(Bones.entity, index)
                    if name == Bones.selected then
                        DrawSphere(pos, HighlightRadius, HighlightColor)
                        DrawText(name, pos, HighlightColor, LabelSize)
                    else
                        DrawText(name, pos, LabelColor, LabelSize)
                    end
                end
            end
            Citizen.Wait(0)
        end
        resetAlpha()
        Bones.running = false
    end)
end

-- Global hook so object mode's onDeactivate can guarantee alpha never sticks.
function da_bones_reset()
    Bones.active = false
    Bones.selected = nil
    resetAlpha()
end

da_ui.callbacks({
    -- Enumerate the selected ped's bones, (re)start the draw loop, return the names.
    getBones = function(data)
        Bones.selected = nil
        local sel = Select
        if not sel or not DoesEntityExist(sel) or not IsEntityAPed(sel) then
            Bones.active = false
            resetAlpha()
            Bones.entity = nil
            Bones.map = {}
            return { bones = {} }
        end
        Bones.entity = sel
        Bones.map = enumerateBones(sel)
        Bones.active = true
        local names = {}
        for name in pairs(Bones.map) do names[#names + 1] = name end
        table.sort(names)
        startDrawLoop()
        return { bones = names }
    end,
})

da_ui.events({
    setBoneFilter = function(data) Bones.filter = string.lower(data.filter or "") end,
    selectBone    = function(data) Bones.selected = data.name end,
    setBoneAlpha  = function(data)
        local alpha = math.floor(tonumber(data.alpha) or 255)
        if alpha < 0 then alpha = 0 elseif alpha > 255 then alpha = 255 end
        if Bones.entity and DoesEntityExist(Bones.entity) then
            if alpha >= 255 then
                ResetEntityAlpha(Bones.entity)
            else
                SetEntityAlpha(Bones.entity, alpha, false)
            end
        end
    end,
    -- Sent by the UI when the inspect panel closes (tab switch / mode exit).
    bonesActive = function(data)
        Bones.active = data.state and true or false
        if not Bones.active then
            Bones.selected = nil
            resetAlpha()
        elseif Bones.entity then
            startDrawLoop()
        end
    end,
})
