-- devRoot > events : capture the game's AI/network event queues, then dump the
-- collected, de-duplicated data on stop.
--
-- The game engine maintains several event queues (event "groups"). Each frame we
-- can ask how many events are pending in a group (GetNumberOfEvents), read the
-- hash of the event at a given index (GetEventAtIndex), and pull its data payload
-- (GET_EVENT_DATA / 0x57EC5FA4D4D6AFCA) into a buffer sized 8 bytes per element.
--
-- Reference + data-size table:
--   https://github.com/femga/rdr3_discoveries/tree/master/AI/EVENTS
-- Buffer reads use the bundled DataView lib (@da_lib/features/util/dataview.lua).

local GET_EVENT_DATA = 0x57EC5FA4D4D6AFCA

-- Field types control how a decoded element is read and rendered:
--   "i"      signed int (default)        "f"     32-bit float
--   "hash"   int shown in decimal + hex  "bool"  int shown as true/false
--   "ent"    entity handle (plain int, labelled for readability)
-- Events without a `fields` list are still captured; their elements are decoded
-- generically as ints and labelled by index.
local EVENTS = {
    -- Group 0 : SCRIPT_EVENT_QUEUE_AI -----------------------------------------
    { name = "EVENT_BUCKED_OFF", group = 0, size = 3, fields = {
        { "rider", "ent" }, { "mount", "ent" }, { "unk" },
    }},
    { name = "EVENT_CALCULATE_LOOT", group = 0, size = 26 },
    { name = "EVENT_CALM_PED", group = 0, size = 4, fields = {
        { "calmer", "ent" }, { "mount", "ent" }, { "calmTypeId" }, { "isFullyCalmed", "bool" },
    }},
    { name = "EVENT_CARRIABLE_UPDATE_CARRY_STATE", group = 0, size = 5, fields = {
        { "carriable", "ent" }, { "perpetrator", "ent" }, { "carrier", "ent" },
        { "isOnHorse", "bool" }, { "isOnGround", "bool" },
    }},
    { name = "EVENT_CARRIABLE_PROMPT_INFO_REQUEST", group = 0, size = 6 },
    { name = "EVENT_CARRIABLE_VEHICLE_STOW_START", group = 0, size = 5 },
    { name = "EVENT_CARRIABLE_VEHICLE_STOW_COMPLETE", group = 0, size = 3 },
    { name = "EVENT_CHALLENGE_GOAL_COMPLETE", group = 0, size = 1, fields = {
        { "challengeGoalHash", "hash" },
    }},
    { name = "EVENT_CHALLENGE_GOAL_UPDATE", group = 0, size = 1, fields = {
        { "challengeGoalHash", "hash" },
    }},
    { name = "EVENT_CHALLENGE_REWARD", group = 0, size = 3, fields = {
        { "challengeRewardHash", "hash" }, { "unk" }, { "unk" },
    }},
    { name = "EVENT_CONTAINER_INTERACTION", group = 0, size = 4, fields = {
        { "searcher", "ent" }, { "searched", "ent" }, { "unk" }, { "isContainerClosed", "bool" },
    }},
    { name = "EVENT_CRIME_CONFIRMED", group = 0, size = 3, fields = {
        { "crimeTypeHash", "hash" }, { "criminal", "ent" }, { "witness" },
    }},
    { name = "EVENT_DAILY_CHALLENGE_STREAK_COMPLETED", group = 0, size = 1 },
    { name = "EVENT_ENTITY_BROKEN", group = 0, size = 9, fields = {
        { "entity", "ent" }, { "unk" }, { "unk" }, { "unk" }, { "damageAmount", "f" },
        { "unk" }, { "x", "f" }, { "y", "f" }, { "z", "f" },
    }},
    { name = "EVENT_ENTITY_DAMAGED", group = 0, size = 9, fields = {
        { "entity", "ent" }, { "damager", "ent" }, { "weaponHash", "hash" }, { "ammoHash", "hash" },
        { "damageAmount", "f" }, { "unk" }, { "x", "f" }, { "y", "f" }, { "z", "f" },
    }},
    { name = "EVENT_ENTITY_DESTROYED", group = 0, size = 9, fields = {
        { "entity", "ent" }, { "damager", "ent" }, { "weaponHash", "hash" }, { "ammoHash", "hash" },
        { "damageAmount", "f" }, { "unk" }, { "x", "f" }, { "y", "f" }, { "z", "f" },
    }},
    { name = "EVENT_ENTITY_DISARMED", group = 0, size = 4, fields = {
        { "victim", "ent" }, { "damager", "ent" }, { "weaponHash", "hash" }, { "unk" },
    }},
    { name = "EVENT_ENTITY_EXPLOSION", group = 0, size = 6, fields = {
        { "ped", "ent" }, { "unk" }, { "weaponHash", "hash" },
        { "x", "f" }, { "y", "f" }, { "z", "f" },
    }},
    { name = "EVENT_ENTITY_HOGTIED", group = 0, size = 3, fields = {
        { "hogtied", "ent" }, { "hogtier", "ent" }, { "unk" },
    }},
    { name = "EVENT_HEADSHOT_BLOCKED_BY_HAT", group = 0, size = 2, fields = {
        { "victim", "ent" }, { "inflictor", "ent" },
    }},
    { name = "EVENT_HELP_TEXT_REQUEST", group = 0, size = 4 },
    { name = "EVENT_HITCH_ANIMAL", group = 0, size = 4, fields = {
        { "rider", "ent" }, { "mount", "ent" }, { "isAnimalHitched", "bool" }, { "hitchingTypeId" },
    }},
    { name = "EVENT_HOGTIED_ENTITY_PICKED_UP", group = 0, size = 2, fields = {
        { "hogtied", "ent" }, { "carrier", "ent" },
    }},
    { name = "EVENT_HORSE_BROKEN", group = 0, size = 3, fields = {
        { "rider", "ent" }, { "horse", "ent" }, { "horseBrokenEventTypeId" },
    }},
    { name = "EVENT_IMPENDING_SAMPLE_PROMPT", group = 0, size = 2 },
    { name = "EVENT_INVENTORY_ITEM_PICKED_UP", group = 0, size = 5, fields = {
        { "itemHash", "hash" }, { "entityModel", "hash" }, { "isItemWasUsed", "bool" },
        { "isItemWasBought", "bool" }, { "entity", "ent" },
    }},
    { name = "EVENT_INVENTORY_ITEM_REMOVED", group = 0, size = 1, fields = {
        { "itemHash", "hash" },
    }},
    { name = "EVENT_ITEM_PROMPT_INFO_REQUEST", group = 0, size = 2, fields = {
        { "entity", "ent" }, { "itemHash", "hash" },
    }},
    { name = "EVENT_LOOT", group = 0, size = 36 },
    { name = "EVENT_LOOT_COMPLETE", group = 0, size = 3, fields = {
        { "looter", "ent" }, { "looted", "ent" }, { "isLootSuccess", "bool" },
    }},
    { name = "EVENT_LOOT_PLANT_START", group = 0, size = 36 },
    { name = "EVENT_LOOT_VALIDATION_FAIL", group = 0, size = 2, fields = {
        { "failReasonId" }, { "looted", "ent" },
    }},
    { name = "EVENT_MISS_INTENDED_TARGET", group = 0, size = 3, fields = {
        { "shooter", "ent" }, { "target", "ent" }, { "weaponHash", "hash" },
    }},
    { name = "EVENT_MOUNT_OVERSPURRED", group = 0, size = 6, fields = {
        { "rider", "ent" }, { "mount", "ent" }, { "rageAmount", "f" },
        { "timesOverspurred" }, { "maxOverspurs" }, { "unk" },
    }},

    -- Group 1 : SCRIPT_EVENT_QUEUE_NETWORK -----------------------------------
    { name = "EVENT_NETWORK_AWARD_CLAIMED", group = 1, size = 12 },
    { name = "EVENT_NETWORK_BOUNTY_REQUEST_COMPLETE", group = 1, size = 7 },
    { name = "EVENT_NETWORK_BULLET_IMPACTED_MULTIPLE_PEDS", group = 1, size = 4, fields = {
        { "shooter", "ent" }, { "numImpacted" }, { "numKilled" }, { "numIncapacitated" },
    }},
    { name = "EVENT_NETWORK_CASHINVENTORY_TRANSACTION", group = 1, size = 6 },
    { name = "EVENT_NETWORK_CREW_CREATION", group = 1, size = 10 },
    { name = "EVENT_NETWORK_CREW_DISBANDED", group = 1, size = 2 },
    { name = "EVENT_NETWORK_CREW_INVITE_RECEIVED", group = 1, size = 11 },
    { name = "EVENT_NETWORK_CREW_JOINED", group = 1, size = 2 },
    { name = "EVENT_NETWORK_CREW_KICKED", group = 1, size = 2 },
    { name = "EVENT_NETWORK_CREW_LEFT", group = 1, size = 2 },
    { name = "EVENT_NETWORK_CREW_RANK_CHANGE", group = 1, size = 7 },
    { name = "EVENT_NETWORK_DAMAGE_ENTITY", group = 1, size = 32, fields = {
        { "victim", "ent" }, { "killer", "ent" }, { "damage" }, { "isVictimDestroyed", "bool" },
        { "isVictimIncapacitated", "bool" }, { "weaponHash", "hash" }, { "ammoHash", "hash" },
        { "instigatedWeaponUsed" }, { "victimSpeed" }, { "damagerSpeed" },
        { "isResponsibleForCollision", "bool" }, { "isHeadShot", "bool" },
        { "isWithMeleeWeapon", "bool" }, { "isVictimExecuted", "bool" },
        { "victimBledOut", "bool" }, { "damagerWasScopedIn", "bool" },
        { "damagerSpecialAbilityActive", "bool" }, { "victimHogtied", "bool" },
        { "victimMounted", "bool" }, { "victimInVehicle", "bool" }, { "victimInCover", "bool" },
        { "damagerShotLastBullet", "bool" }, { "victimKilledByStealth", "bool" },
        { "victimKilledByTakedown", "bool" }, { "victimKnockedOut", "bool" },
        { "isVictimTranquilized", "bool" }, { "victimKilledByStandardMelee", "bool" },
        { "victimMissionEntity", "bool" }, { "victimFleeing", "bool" },
        { "victimInCombat", "bool" }, { "unk" }, { "isSuicide", "bool" },
    }},
    { name = "EVENT_NETWORK_GANG", group = 1, size = 18 },
    { name = "EVENT_NETWORK_GANG_WAYPOINT_CHANGED", group = 1, size = 3 },
    { name = "EVENT_NETWORK_HOGTIE_BEGIN", group = 1, size = 2, fields = {
        { "victim", "ent" }, { "perpetrator", "ent" },
    }},
    { name = "EVENT_NETWORK_HOGTIE_END", group = 1, size = 2, fields = {
        { "victim", "ent" }, { "perpetrator", "ent" },
    }},
    { name = "EVENT_NETWORK_HUB_UPDATE", group = 1, size = 1, fields = {
        { "updateHash", "hash" },
    }},
    { name = "EVENT_NETWORK_INCAPACITATED_ENTITY", group = 1, size = 4, fields = {
        { "victim", "ent" }, { "damager", "ent" }, { "weaponHash", "hash" }, { "damage" },
    }},
    { name = "EVENT_NETWORK_LASSO_ATTACH", group = 1, size = 2, fields = {
        { "victim", "ent" }, { "perpetrator", "ent" },
    }},
    { name = "EVENT_NETWORK_LASSO_DETACH", group = 1, size = 2, fields = {
        { "victim", "ent" }, { "perpetrator", "ent" },
    }},
    { name = "EVENT_NETWORK_LOOT_CLAIMED", group = 1, size = 9 },
    { name = "EVENT_NETWORK_MINIGAME_REQUEST_COMPLETE", group = 1, size = 6 },
    { name = "EVENT_NETWORK_PED_DISARMED", group = 1, size = 3, fields = {
        { "victim", "ent" }, { "damager", "ent" }, { "weaponHash", "hash" },
    }},
    { name = "EVENT_NETWORK_PED_HAT_SHOT_OFF", group = 1, size = 3, fields = {
        { "victim", "ent" }, { "damager", "ent" }, { "weaponHash", "hash" },
    }},
    { name = "EVENT_NETWORK_PERMISSION_CHECK_RESULT", group = 1, size = 2 },
    { name = "EVENT_NETWORK_PICKUP_COLLECTION_FAILED", group = 1, size = 3 },
    { name = "EVENT_NETWORK_PICKUP_RESPAWNED", group = 1, size = 2 },
    { name = "EVENT_NETWORK_PLAYER_COLLECTED_PICKUP", group = 1, size = 8, fields = {
        { "collected", "ent" }, { "collector" }, { "pickupTypeHash", "hash" }, { "unk" },
        { "pickupModel", "hash" }, { "ammoAmount" }, { "ammoTypeHash", "hash" }, { "unk" },
    }},
    { name = "EVENT_NETWORK_PLAYER_COLLECTED_PORTABLE_PICKUP", group = 1, size = 3 },
    { name = "EVENT_NETWORK_PLAYER_DROPPED_PORTABLE_PICKUP", group = 1, size = 3 },
    { name = "EVENT_NETWORK_PLAYER_JOIN_SCRIPT", group = 1, size = 41 },
    { name = "EVENT_NETWORK_PLAYER_LEFT_SCRIPT", group = 1, size = 41 },
    { name = "EVENT_NETWORK_PLAYER_JOIN_SESSION", group = 1, size = 10 },
    { name = "EVENT_NETWORK_PLAYER_LEFT_SESSION", group = 1, size = 10 },
    { name = "EVENT_NETWORK_PLAYER_MISSED_SHOT", group = 1, size = 9 },
    { name = "EVENT_NETWORK_POSSE_CREATED", group = 1, size = 10 },
    { name = "EVENT_NETWORK_POSSE_DATA_CHANGED", group = 1, size = 2 },
    { name = "EVENT_NETWORK_POSSE_DISBANDED", group = 1, size = 2 },
    { name = "EVENT_NETWORK_POSSE_EX_ADMIN_DISBANDED", group = 1, size = 9 },
    { name = "EVENT_NETWORK_POSSE_EX_INACTIVE_DISBANDED", group = 1, size = 10 },
    { name = "EVENT_NETWORK_POSSE_JOINED", group = 1, size = 2 },
    { name = "EVENT_NETWORK_POSSE_LEADER_SET_ACTIVE", group = 1, size = 23 },
    { name = "EVENT_NETWORK_POSSE_LEFT", group = 1, size = 1 },
    { name = "EVENT_NETWORK_POSSE_MEMBER_DISBANDED", group = 1, size = 23 },
    { name = "EVENT_NETWORK_POSSE_MEMBER_JOINED", group = 1, size = 23 },
    { name = "EVENT_NETWORK_POSSE_MEMBER_KICKED", group = 1, size = 23 },
    { name = "EVENT_NETWORK_POSSE_MEMBER_LEFT", group = 1, size = 23 },
    { name = "EVENT_NETWORK_POSSE_MEMBER_SET_ACTIVE", group = 1, size = 23 },
    { name = "EVENT_NETWORK_PROJECTILE_ATTACHED", group = 1, size = 6, fields = {
        { "damager", "ent" }, { "victim", "ent" }, { "x", "f" }, { "y", "f" }, { "z", "f" },
        { "weaponHash", "hash" },
    }},
    { name = "EVENT_NETWORK_PROJECTILE_NO_DAMAGE_IMPACT", group = 1, size = 2, fields = {
        { "ped", "ent" }, { "ammoHash", "hash" },
    }},
    { name = "EVENT_NETWORK_REVIVED_ENTITY", group = 1, size = 2, fields = {
        { "victim", "ent" }, { "reviver", "ent" },
    }},
    { name = "EVENT_NETWORK_SESSION_EVENT", group = 1, size = 10 },
    { name = "EVENT_NETWORK_SESSION_MERGE_END", group = 1, size = 1 },
    { name = "EVENT_NETWORK_SESSION_MERGE_START", group = 1, size = 1 },
    { name = "EVENT_NETWORK_VEHICLE_LOOTED", group = 1, size = 3, fields = {
        { "looter", "ent" }, { "vehicle", "ent" }, { "unk" },
    }},
    { name = "EVENT_NETWORK_VEHICLE_UNDRIVABLE", group = 1, size = 3, fields = {
        { "vehicle", "ent" }, { "damager", "ent" }, { "unk" },
    }},

    -- Group 0 (continued) ----------------------------------------------------
    { name = "EVENT_OBJECT_INTERACTION", group = 0, size = 10, fields = {
        { "ped", "ent" }, { "interactionEntity", "ent" }, { "itemHash", "hash" },
        { "itemQuantity" }, { "unk" }, { "unk" }, { "unk" }, { "unk" },
        { "scenarioPointId" }, { "unk" },
    }},
    { name = "EVENT_PED_ANIMAL_INTERACTION", group = 0, size = 3, fields = {
        { "ped", "ent" }, { "animal", "ent" }, { "interactionTypeHash", "hash" },
    }},
    { name = "EVENT_PED_CREATED", group = 0, size = 1, fields = {
        { "ped", "ent" },
    }},
    { name = "EVENT_PED_DESTROYED", group = 0, size = 1, fields = {
        { "ped", "ent" },
    }},
    { name = "EVENT_PED_HAT_KNOCKED_OFF", group = 0, size = 2, fields = {
        { "ped", "ent" }, { "hat", "ent" },
    }},
    { name = "EVENT_PED_WHISTLE", group = 0, size = 2, fields = {
        { "whistler", "ent" }, { "whistleType" },
    }},
    { name = "EVENT_PICKUP_CARRIABLE", group = 0, size = 4, fields = {
        { "carrier", "ent" }, { "carriable", "ent" }, { "isPickupDoneFromParent", "bool" },
        { "carrierMount", "ent" },
    }},
    { name = "EVENT_PLACE_CARRIABLE_ONTO_PARENT", group = 0, size = 6, fields = {
        { "perpetrator", "ent" }, { "carriable", "ent" }, { "carrier", "ent" },
        { "unk" }, { "isCarriedEntityAPelt", "bool" }, { "itemHash", "hash" },
    }},
    { name = "EVENT_PLAYER_COLLECTED_AMBIENT_PICKUP", group = 0, size = 8, fields = {
        { "pickupNameHash", "hash" }, { "pickupEntity", "ent" }, { "player" },
        { "pickupModel", "hash" }, { "unk" }, { "unk" }, { "itemQuantity" }, { "itemHash", "hash" },
    }},
    { name = "EVENT_PLAYER_ESCALATED_PED", group = 0, size = 2, fields = {
        { "player", "ent" }, { "escalatedPed", "ent" },
    }},
    { name = "EVENT_PLAYER_HAT_EQUIPPED", group = 0, size = 10, fields = {
        { "player", "ent" }, { "hat", "ent" }, { "drawableHash", "hash" }, { "albedoHash", "hash" },
        { "normalHash", "hash" }, { "materialHash", "hash" }, { "paletteHash", "hash" },
        { "tint1" }, { "tint2" }, { "tint3" },
    }},
    { name = "EVENT_PLAYER_HAT_KNOCKED_OFF", group = 0, size = 5, fields = {
        { "player", "ent" }, { "thrower", "ent" }, { "hat", "ent" }, { "unk" }, { "unk" },
    }},
    { name = "EVENT_PLAYER_HORSE_AGITATED_BY_ANIMAL", group = 0, size = 4, fields = {
        { "horse", "ent" }, { "animal", "ent" }, { "unk" }, { "unk" },
    }},
    { name = "EVENT_PLAYER_MOUNT_WILD_HORSE", group = 0, size = 1, fields = {
        { "wildHorse", "ent" },
    }},
    { name = "EVENT_PLAYER_PROMPT_TRIGGERED", group = 0, size = 10, fields = {
        { "promptTypeId" }, { "unk" }, { "target", "ent" }, { "discoveredItem" },
        { "x", "f" }, { "y", "f" }, { "z", "f" }, { "discoverableEntityTypeId" },
        { "unk" }, { "kitEmoteActionHash", "hash" },
    }},
    { name = "EVENT_RAN_OVER_PED", group = 0, size = 2, fields = {
        { "unk" }, { "ped", "ent" },
    }},
    { name = "EVENT_REVIVE_ENTITY", group = 0, size = 3, fields = {
        { "victim", "ent" }, { "reviver", "ent" }, { "itemHash", "hash" },
    }},
    { name = "EVENT_SHOCKING_ITEM_STOLEN", group = 0, size = 3, fields = {
        { "ped", "ent" }, { "ped2", "ent" }, { "carriable", "ent" },
    }},
    { name = "EVENT_SHOT_FIRED_BULLET_IMPACT", group = 0, size = 1, fields = {
        { "entity", "ent" },
    }},
    { name = "EVENT_SHOT_FIRED_WHIZZED_BY", group = 0, size = 1, fields = {
        { "entity", "ent" },
    }},
    { name = "EVENT_STAT_VALUE_CHANGED", group = 0, size = 2, fields = {
        { "statValueTypeHash", "hash" }, { "unk" },
    }},
    { name = "EVENT_TRIGGERED_ANIMAL_WRITHE", group = 0, size = 2, fields = {
        { "animal", "ent" }, { "damager", "ent" },
    }},
    { name = "EVENT_VEHICLE_CREATED", group = 0, size = 1, fields = {
        { "vehicle", "ent" },
    }},
    { name = "EVENT_VEHICLE_DESTROYED", group = 0, size = 1, fields = {
        { "vehicle", "ent" },
    }},

    -- Group 2 : scenario -----------------------------------------------------
    { name = "EVENT_SCENARIO_ADD_PED", group = 2, size = 2 },
    { name = "EVENT_SCENARIO_DESTROY_PROP", group = 2, size = 2 },
    { name = "EVENT_SCENARIO_REMOVE_PED", group = 2, size = 2 },

    -- Group 3 : UI -----------------------------------------------------------
    { name = "EVENT_UI_ITEM_INSPECT_ACTIONED", group = 3, size = 6 },
    { name = "EVENT_UI_QUICK_ITEM_USED", group = 3, size = 6 },
}

-- Spammy events that fire continuously; suppressed by default so the dump stays
-- readable. Toggle with the "noisy" trie option.
local NOISY = {
    EVENT_PED_CREATED = true,
    EVENT_PED_DESTROYED = true,
    EVENT_VEHICLE_CREATED = true,
    EVENT_VEHICLE_DESTROYED = true,
    EVENT_SHOT_FIRED_BULLET_IMPACT = true,
    EVENT_SHOT_FIRED_WHIZZED_BY = true,
    EVENT_SCENARIO_ADD_PED = true,
    EVENT_SCENARIO_REMOVE_PED = true,
}

-- Build hash -> definition and the set of groups we need to poll.
local byHash = {}
local groups = {}
do
    local seenGroup = {}
    for _, def in ipairs(EVENTS) do
        byHash[GetHashKey(def.name)] = def
        if not seenGroup[def.group] then
            seenGroup[def.group] = true
            groups[#groups + 1] = def.group
        end
    end
    table.sort(groups)
end

local Capture = {
    active = false,
    includeNoisy = false,
    startTime = 0,
    total = 0,        -- every (non-deduped) occurrence seen
    records = {},     -- ordered list of unique records
    index = {},       -- signature -> record (for de-duplication)
}

-- Decode a single event's data payload into a list of { label, t, value, raw }.
local function decode(def, index)
    local view = DataView.ArrayBuffer(math.max(8 * def.size, 64))
    local ok = Citizen.InvokeNative(GET_EVENT_DATA, def.group, index, view:Buffer(), def.size)
    if not ok then return nil end

    local data = {}
    for k = 0, def.size - 1 do
        local off = k * 8
        local field = def.fields and def.fields[k + 1]
        local t = field and field[2] or "i"
        local raw = view:GetInt32(off)
        data[k + 1] = {
            label = field and field[1] or ("[" .. k .. "]"),
            t = t,
            raw = raw,
            value = (t == "f") and view:GetFloat32(off) or raw,
        }
    end
    return data
end

-- Stable signature so identical repeats of the same event collapse into one
-- record with a count instead of flooding the dump.
local function signature(def, data)
    local parts = { def.name }
    for _, f in ipairs(data) do
        parts[#parts + 1] = f.raw
    end
    return table.concat(parts, ":")
end

local function record(def, data)
    Capture.total = Capture.total + 1
    local sig = signature(def, data)
    local rec = Capture.index[sig]
    if rec then
        rec.count = rec.count + 1
        return
    end
    rec = {
        name = def.name,
        group = def.group,
        atMs = GetGameTimer() - Capture.startTime,
        data = data,
        count = 1,
    }
    Capture.index[sig] = rec
    Capture.records[#Capture.records + 1] = rec
end

-- The capture loop: while active, walk every polled group's pending events and
-- decode any we have a definition for.
local function pollThread()
    Citizen.CreateThread(function()
        while Capture.active do
            Citizen.Wait(0)
            for _, group in ipairs(groups) do
                local count = GetNumberOfEvents(group)
                for i = 0, count - 1 do
                    local def = byHash[GetEventAtIndex(group, i)]
                    if def and (Capture.includeNoisy or not NOISY[def.name]) then
                        local data = decode(def, i)
                        if data then record(def, data) end
                    end
                end
            end
        end
    end)
end

local function fmtValue(f)
    if f.t == "f" then
        return ("%.3f"):format(f.value)
    elseif f.t == "bool" then
        return tostring(f.value ~= 0)
    elseif f.t == "hash" then
        return ("%d (0x%08X)"):format(f.value, f.value & 0xFFFFFFFF)
    end
    return tostring(f.value)
end

-- Build the human-readable dump text.
local function buildDump()
    local durationMs = GetGameTimer() - Capture.startTime
    local lines = {
        "=== da_dev event capture ===",
        ("duration: %.2fs   unique: %d   total: %d   noisy: %s")
            :format(durationMs / 1000, #Capture.records, Capture.total,
                tostring(Capture.includeNoisy)),
        "",
    }
    if #Capture.records == 0 then
        lines[#lines + 1] = "(no events captured)"
    end
    for _, rec in ipairs(Capture.records) do
        lines[#lines + 1] = ("[+%.2fs] %s (group %d)%s")
            :format(rec.atMs / 1000, rec.name, rec.group,
                rec.count > 1 and (" x" .. rec.count) or "")
        for _, f in ipairs(rec.data) do
            lines[#lines + 1] = ("    %-22s = %s"):format(f.label, fmtValue(f))
        end
    end
    return table.concat(lines, "\n")
end

local Event = {}

function Event.start()
    if Capture.active then
        log.warn("Event capture already running")
        return
    end
    Capture.active = true
    Capture.startTime = GetGameTimer()
    Capture.total = 0
    Capture.records = {}
    Capture.index = {}
    log.info("Event capture started")
    pollThread()
end

function Event.stop()
    if not Capture.active then
        log.warn("Event capture is not running")
        return
    end
    Capture.active = false
    local dump = buildDump()
    log.info("\n" .. dump)
    da_ui.send("clipboard", { text = dump })
    log.info(("Event capture stopped: %d unique / %d total (copied to clipboard)")
        :format(#Capture.records, Capture.total))
end

function Event.clear()
    Capture.total = 0
    Capture.records = {}
    Capture.index = {}
    log.info("Event capture cleared")
end

function Event.toggleNoisy()
    Capture.includeNoisy = not Capture.includeNoisy
    log.info("Event capture noisy events", Capture.includeNoisy and "included" or "excluded")
end

_ENV.da_event = Event

-- devRoot > events trie menu --------------------------------------------------
da_trie.add("devRoot", "events", "o")
da_trie.addOpt("events", "start", "s", function() Event.start() end,
    function() return not Capture.active end)
da_trie.addOpt("events", "stop + dump", "x", function() Event.stop() end,
    function() return Capture.active end)
da_trie.addOpt("events", "clear", "c", function() Event.clear() end)
da_trie.addOpt("events", "incl noisy", "n", function() Event.toggleNoisy() end,
    function() return not Capture.includeNoisy end)
da_trie.addOpt("events", "excl noisy", "n", function() Event.toggleNoisy() end,
    function() return Capture.includeNoisy end)

da_net.events({
    ["onResourceStop"] = function(resourceName)
        if resourceName == GetCurrentResourceName() then
            Capture.active = false
        end
    end,
})
