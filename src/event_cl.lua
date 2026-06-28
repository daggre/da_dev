-- devRoot > events : capture the game's AI/network events, then dump the
-- collected, de-duplicated data on stop.
--
-- The event metadata table + decode now live in the shared dispatcher
-- (@da_lib/features/event/event_cl.lua → da_gameevent). This tool subscribes to
-- EVERY event via da_gameevent.onAny() while capturing, and records the decoded
-- payloads it receives. See da_lib/features/event/event_cl_ctl.lua for the EVENTS
-- table and field types.

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

local Capture = {
    active = false,
    includeNoisy = false,
    handle = nil,     -- da_gameevent.onAny subscription handle while active
    startTime = 0,
    total = 0,        -- every (non-deduped) occurrence seen
    records = {},     -- ordered list of unique records
    index = {},       -- signature -> record (for de-duplication)
}

-- Stable signature so identical repeats of the same event collapse into one
-- record with a count instead of flooding the dump.
local function signature(name, data)
    local parts = { name }
    for _, f in ipairs(data) do
        parts[#parts + 1] = f.raw
    end
    return table.concat(parts, ":")
end

local function record(ev)
    Capture.total = Capture.total + 1
    local sig = signature(ev.name, ev.raw)
    local rec = Capture.index[sig]
    if rec then
        rec.count = rec.count + 1
        return
    end
    rec = {
        name = ev.name,
        group = ev.group,
        atMs = GetGameTimer() - Capture.startTime,
        data = ev.raw,
        count = 1,
    }
    Capture.index[sig] = rec
    Capture.records[#Capture.records + 1] = rec
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
    -- Subscribe to all events; the dispatcher decodes, we filter + record.
    Capture.handle = da_gameevent.onAny(function(ev)
        if not Capture.includeNoisy and NOISY[ev.name] then return end
        record(ev)
    end)
    log.info("Event capture started")
end

function Event.stop()
    if not Capture.active then
        log.warn("Event capture is not running")
        return
    end
    Capture.active = false
    if Capture.handle then
        da_gameevent.off(Capture.handle)
        Capture.handle = nil
    end
    local dump = buildDump()
    log.info(dump)
    log.info(("Event capture stopped: %d unique / %d total")
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
            if Capture.handle then
                da_gameevent.off(Capture.handle)
                Capture.handle = nil
            end
        end
    end,
})
