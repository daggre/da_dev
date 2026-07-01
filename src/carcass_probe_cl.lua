-- Carcass rot probe (diagnostic). Two rounds of targeted native reads
-- (carriable/state/quality/looted, then carry-flags/dirt/skinned/cleanliness) showed
-- NO fresh-vs-rotten difference, so this brute-forces the wide surface: every SET
-- ped config flag plus a batch of candidate carcass natives, dumped to the da_test
-- report channel so the dumps can be diffed offline.
--
-- Usage in-game:
--   /carcassdump fresh    -- aim at / stand near a FRESH carcass, run this
--   /carcassdump rotten   -- repeat on a ROTTEN carcass
-- Each run overwrites da_test/reports/latest.json (and keeps a timestamped copy).
-- Diff the two `configflags` lists: an index that flips is the rot signal candidate.

local PED_QUALITY   = 0x7BCC6087D130312A -- _GET_PED_QUALITY
local CARRIABLE_ST  = 0x61914209C36EFDDB -- GET_CARRIABLE_ENTITY_STATE
local IS_CARRIABLE  = 0x0CCFE72B43C9CF96 -- GET_IS_CARRIABLE_ENTITY
local FULLY_LOOTED  = 0x8DE41E9902E85756 -- IsEntityFullyLooted
local IS_PELT       = 0x255B6DB4E3AD3C3E -- _GET_IS_CARRIABLE_PELT
local IS_SKINNED    = 0x88A5564B19C15391 -- _IS_ANIMAL_SKINNED
local DAMAGE_CLEAN  = 0x88EFFED5FE8B0B4A -- _GET_PED_DAMAGE_CLEANLINESS
local PED_DAMAGED   = 0x6CFC373008A1EDAF -- _GET_PED_DAMAGED
local CARRY_CONFIG  = 0x0FD25587BB306C86 -- _GET_ENTITY_CARRY_CONFIG -> Hash
local CARRYING_FLAG = 0x808077647856DE62 -- _GET_ENTITY_CARRYING_FLAG(e, flagId)

-- IMPORTANT: reading a config flag past the valid enum HARD-CRASHES the RDR3 client
-- (this crashed the game at 600). Flag 400 is confirmed valid (stables sets it), so we
-- cap at 400 — provably in-range, covers the meaningful flags. Do NOT raise blindly;
-- pcall can't catch a native crash, only a verified-valid bound is safe.
local CONFIG_FLAG_MAX = 400
local CARRY_FLAG_MAX  = 30           -- eCarryingFlag indices seen so far are <= 29

local function bool(v) return v == true or v == 1 end

-- Target the da_dev-selected entity if it's a dead ped, else the nearest dead carcass.
local function findCarcass()
    local me = PlayerPedId()
    if Select and DoesEntityExist(Select) and IsEntityAPed(Select) and IsEntityDead(Select) then
        return Select
    end
    local mc = GetEntityCoords(me)
    local best, bestD = nil, 8.0 * 8.0
    for _, ped in ipairs(GetGamePool("CPed")) do
        if ped ~= me and DoesEntityExist(ped) and IsEntityDead(ped) then
            local model = GetEntityModel(ped)
            if dat.skinnableSet[model] or dat.smallAnimalSet[model] or dat.birdSet[model] then
                local c = GetEntityCoords(ped)
                local dx, dy, dz = c.x - mc.x, c.y - mc.y, c.z - mc.z
                local d = dx * dx + dy * dy + dz * dz
                if d < bestD then best, bestD = ped, d end
            end
        end
    end
    return best
end

-- Compact one-line summary of the candidate carcass natives.
local function scalarLine(e)
    local parts = {
        "model=" .. (dat.getName(GetEntityModel(e)) or GetEntityModel(e)),
        "health=" .. GetEntityHealth(e),
        "quality=" .. Citizen.InvokeNative(PED_QUALITY, e),
        "state=" .. Citizen.InvokeNative(CARRIABLE_ST, e),
        "carriable=" .. tostring(bool(Citizen.InvokeNative(IS_CARRIABLE, e))),
        "looted=" .. tostring(bool(Citizen.InvokeNative(FULLY_LOOTED, e))),
        "pelt=" .. tostring(bool(Citizen.InvokeNative(IS_PELT, e))),
        "skinned=" .. tostring(bool(Citizen.InvokeNative(IS_SKINNED, e))),
        "killclean=" .. Citizen.InvokeNative(DAMAGE_CLEAN, e),
        "damaged=" .. tostring(bool(Citizen.InvokeNative(PED_DAMAGED, e))),
        "carrycfg=" .. string.format("0x%X", Citizen.InvokeNative(CARRY_CONFIG, e) & 0xFFFFFFFF),
    }
    return table.concat(parts, " ")
end

local function carryFlagLine(e)
    local set = {}
    for i = 0, CARRY_FLAG_MAX do
        if bool(Citizen.InvokeNative(CARRYING_FLAG, e, i)) then set[#set + 1] = i end
    end
    return "set carry flags: " .. (next(set) and table.concat(set, ",") or "none")
end

local function configFlagLine(e)
    local set = {}
    for i = 0, CONFIG_FLAG_MAX do
        if GetPedConfigFlag(e, i, true) then set[#set + 1] = i end
    end
    return "set config flags: " .. (next(set) and table.concat(set, ",") or "none")
end

RegisterCommand("carcassdump", function(_, args)
    local label = args[1] or "unlabeled"
    local e = findCarcass()
    if not e then
        log.warn("carcassdump: no dead carcass selected or nearby (within 8m)")
        return
    end
    -- Guard each section: a misbehaving candidate native must not abort the
    -- config-flag dump, which is the part most likely to carry the rot signal.
    local function safe(fn) local ok, v = pcall(fn, e); return ok and v or ("ERR: " .. tostring(v)) end
    local scalars = safe(scalarLine)
    local carryFlags = safe(carryFlagLine)
    local configFlags = safe(configFlagLine)
    log.info("carcassdump [" .. label .. "] " .. scalars)
    log.info("carcassdump [" .. label .. "] " .. carryFlags)
    log.info("carcassdump [" .. label .. "] " .. configFlags)

    -- Land it in the da_test report channel so it can be read/diffed offline.
    -- Shape must match da_test's report schema (report_sv.lua buildHtml): each suite
    -- needs domain/passed/failed, each case needs a status. NB: no `at` — os.* is
    -- unavailable client-side; the server fills `at` with os.time() when omitted.
    local cases = {
        { status = "pass", name = "scalars", desc = scalars },
        { status = "pass", name = "carryflags", desc = carryFlags },
        { status = "pass", name = "configflags", error = configFlags },
    }
    TriggerServerEvent("da_test:saveReport", {
        totalPassed = #cases,
        totalFailed = 0,
        filter = "carcassdump:" .. label,
        suites = { {
            domain = "carcass-probe (" .. label .. ")",
            passed = #cases,
            failed = 0,
            cases = cases,
        } },
    })
    log.info("carcassdump: saved to da_test/reports/latest.json (entity " .. e .. ")")
end, false)
