-- Inspect tab "attributes" sub-section: read-only ped/object stat readout.
--
-- Driven by the object-mode UI (inspect > attributes): reads the selected entity from
-- the global `Select`, builds a list of grouped label/value rows, and returns it to the
-- UI (ui/web/src/attributes.js). Read-only — no draw loop, no entity mutation.
--
-- Groups are gated by what the selection IS:
--   * cores      — any ped (the extension point for character-ped attributes)
--   * horse      — horses only (bond level/xp + carried pelt cargo)
--   * carriable  — any carriable ENTITY (ped or object): carcasses, small game, pelts
--
-- The horse reads (bond + cargo pelts) are research-derived candidates pending an
-- empirical da_test probe; see docs/agents/redm-research.md and the planned ADR-0013.
-- Bonding is ePedAttribute index 7 (PA_BONDING) via the standard attribute natives. The
-- carriable natives are entity-scoped and already proven in da_test (ADR-0012).

local IS_MODEL_HORSE   = 0x772A1969F649E902 -- _IS_THIS_MODEL_A_HORSE(model) -> bool
local ATTRIBUTE_CORE   = 0x36731AC041289BB1 -- _GET_ATTRIBUTE_CORE_VALUE(ped, core) -> 0-100
local PELT_FROM_HORSE  = 0x0CEEB6F4780B1F2F -- _GET_PELT_FROM_HORSE(horse, i) -> peltId|false
local IS_CARRIABLE     = 0x0CCFE72B43C9CF96 -- GET_IS_CARRIABLE_ENTITY(e) -> bool
local CARRIABLE_STATE  = 0x61914209C36EFDDB -- GET_CARRIABLE_ENTITY_STATE(e) -> eCarriableState
local IS_CARRIABLE_PELT = 0x255B6DB4E3AD3C3E -- _GET_IS_CARRIABLE_PELT(e) -> bool
local PED_QUALITY      = 0x7BCC6087D130312A -- _GET_PED_QUALITY(ped) -> int (carcass quality)
local FULLY_LOOTED     = 0x8DE41E9902E85756 -- IsEntityFullyLooted(e) -> bool
local CARRYING_FLAG    = 0x808077647856DE62 -- _GET_ENTITY_CARRYING_FLAG(e, flagId) -> bool
local IS_SKINNED       = 0x88A5564B19C15391 -- _IS_ANIMAL_SKINNED(ped) -> bool
local DAMAGE_CLEAN     = 0x88EFFED5FE8B0B4A -- _GET_PED_DAMAGE_CLEANLINESS(ped) -> 0..2

-- eCarryingFlag indices worth watching for the rotten signal (full enum in the DB).
local CARRY_FLAGS = { { 1, "cut free" }, { 2, "on foot" }, { 4, "droppable" }, { 7, "when dead" }, { 9, "any" }, { 27, "cleanup" } }

-- ePedAttribute indices
local PA_HEALTH  = 0
local PA_STAMINA = 1
local PA_DEADEYE = 2 -- PA_SPECIALABILITY
local PA_BONDING = 7

-- eCarriableState (full enum from the native DB)
local CarriableState = {
    [0]  = "none",
    [1]  = "transitioning to hogtied",
    [2]  = "carriable intro",
    [3]  = "carriable",
    [4]  = "being picked up (ground)",
    [5]  = "carried by human",
    [6]  = "being placed (ground)",
    [7]  = "carried by mount",
    [8]  = "being placed (mount)",
    [9]  = "being picked up (mount)",
    [10] = "being cut free",
    [11] = "being placed (ground escape)",
    [12] = "being placed (vehicle)",
}

local function maskHash(h) return h and (h & 0xFFFFFFFF) or 0 end

-- A native returns true or 1 depending on the build; normalize to bool.
local function nativeBool(v)
    return v == true or v == 1
end

-- _GET_META_PED_TYPE == MPT_ANIMAL is true for EVERY animal (turkeys, deer, ...), so it
-- can't gate horse-only stats. Use the model-level horse test instead.
local function isHorse(ped)
    return nativeBool(Citizen.InvokeNative(IS_MODEL_HORSE, GetEntityModel(ped)))
end

local function coreValue(ped, coreIndex)
    return Citizen.InvokeNative(ATTRIBUTE_CORE, ped, coreIndex)
end

local function isCarriable(e)
    return nativeBool(Citizen.InvokeNative(IS_CARRIABLE, e))
end

-- Lazy model-hash -> name map across the carriable model lists (carcasses, small game,
-- birds, fish, domestic, pelts) from da_lib/data/hunting.lua. Used to name a carriable
-- entity (and to best-effort name a horse's pelt cargo).
local carriableNames
local function carriableNameFor(modelHash)
    if not carriableNames then
        carriableNames = {}
        if dat then
            for _, key in ipairs({ "skinnable", "smallAnimal", "bird", "fish", "domestic", "pelts" }) do
                local list = dat[key]
                if type(list) == "table" then
                    for _, name in ipairs(list) do
                        carriableNames[maskHash(GetHashKey(name))] = name
                    end
                end
            end
        end
    end
    return carriableNames[maskHash(modelHash)]
end

local function row(label, value)
    return { label = label, value = tostring(value) }
end

-- Generic cores any ped has (0-100). The extension point for character-ped attributes.
local function coresGroup(ped)
    return {
        title = "cores",
        rows = {
            row("health",   tostring(coreValue(ped, PA_HEALTH)) .. "%"),
            row("stamina",  tostring(coreValue(ped, PA_STAMINA)) .. "%"),
            row("dead eye", tostring(coreValue(ped, PA_DEADEYE)) .. "%"),
        },
    }
end

-- Horse-specific: bonding + the pelts the horse is currently hauling. Horses only.
local function horseGroup(ped)
    local rows = {
        row("bond level", GetAttributeRank(ped, PA_BONDING)),
        row("bond xp", string.format("%s / %s",
            tostring(GetAttributePoints(ped, PA_BONDING)),
            tostring(GetMaxAttributePoints(ped, PA_BONDING)))),
    }
    local found = false
    for i = 0, 5 do
        local peltId = Citizen.InvokeNative(PELT_FROM_HORSE, ped, i)
        if type(peltId) == "number" and peltId ~= 0 then
            found = true
            local name = carriableNameFor(peltId)
            rows[#rows + 1] = row("pelt slot " .. i, name or ("id " .. tostring(maskHash(peltId))))
        end
    end
    if not found then
        rows[#rows + 1] = row("pelts", "none carried")
    end
    return { title = "horse", rows = rows }
end

-- Carriable readout: works for a carcass/small-game ped OR a pelt/object. The leading
-- "carriable" yes/no makes the check itself visible (a ped shows this group even when not
-- currently carriable, e.g. a live animal). quality only applies to peds (carcasses).
local function carriableGroup(e, isPed, carriable)
    local state = Citizen.InvokeNative(CARRIABLE_STATE, e)
    local model = GetEntityModel(e)
    local rows = {
        row("carriable", carriable and "yes" or "no"),
        row("state", string.format("%s (%s)", CarriableState[state] or "unknown", tostring(state))),
        row("is pelt", nativeBool(Citizen.InvokeNative(IS_CARRIABLE_PELT, e)) and "yes" or "no"),
        row("model", carriableNameFor(model) or string.format("0x%08X", maskHash(model))),
    }
    if isPed then
        rows[#rows + 1] = row("quality", tostring(Citizen.InvokeNative(PED_QUALITY, e)))
        rows[#rows + 1] = row("fully looted", nativeBool(Citizen.InvokeNative(FULLY_LOOTED, e)) and "yes" or "no")
        -- Rotten-carcass probes: carriable/state/quality/looted showed NO fresh-vs-rotten
        -- difference, so widen the net. Point at a fresh vs rotten carcass and watch which
        -- of these flips — that's the rot signal. "carry flags" is the lead candidate:
        -- a rotten carcass that can't be picked up would drop flag 2 (on foot).
        local set = {}
        for _, f in ipairs(CARRY_FLAGS) do
            if nativeBool(Citizen.InvokeNative(CARRYING_FLAG, e, f[1])) then set[#set + 1] = f[2] end
        end
        rows[#rows + 1] = row("carry flags", #set > 0 and table.concat(set, ",") or "none")
        rows[#rows + 1] = row("skinned", nativeBool(Citizen.InvokeNative(IS_SKINNED, e)) and "yes" or "no")
        rows[#rows + 1] = row("kill clean", tostring(Citizen.InvokeNative(DAMAGE_CLEAN, e)))
    end
    return { title = "carriable", rows = rows }
end

da_ui.callbacks({
    -- Build the attribute readout for the current selection. Groups vary by entity type;
    -- a plain non-carriable object yields no groups.
    getAttributes = function(data)
        local sel = Select
        if not sel or not DoesEntityExist(sel) then
            return { groups = {} }
        end

        local groups = {}
        local isPed = IsEntityAPed(sel)
        local carriable = isCarriable(sel)
        if isPed then
            groups[#groups + 1] = coresGroup(sel)
            if isHorse(sel) then
                groups[#groups + 1] = horseGroup(sel)
            end
        end
        -- Peds always get the carriable group (so the yes/no check is visible); plain
        -- objects only when they're actually carriable.
        if isPed or carriable then
            groups[#groups + 1] = carriableGroup(sel, isPed, carriable)
        end

        return { groups = groups }
    end,
})
