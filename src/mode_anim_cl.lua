local animMCPState = false
Citizen.CreateThread(function()
    da_mode.register({
        name = "animation",
        priority = 70,
        disableGame = true, -- suppress baseline Game keymaps (e.g. xanims x) while active
        onActivate = function()
            SetNuiFocus(true, true)
            SetCursorLocation(0.5, 0.5)
            da_ui.send("ui_animation", {})
            if animMCPState then
                da_mode.activateMCP("animation")
            end
        end,
        onDeactivate = function()
            da_mcp.deactivate()
            da_ui.send("ui_animation", { state = false })
            SetNuiFocus(false, false)
            SetNuiFocusKeepInput(false)
        end,
        onPrimary = function()
            SetNuiFocus(true, true)
            SetNuiFocusKeepInput(false)
            if animMCPState then
                da_mode.activateMCP("animation")
                SetNuiFocus(true, false)
                SetNuiFocusKeepInput(true)
            end
        end,
        onLosePrimary = function()
            da_mcp.deactivate()
        end,
        activateMCP = function()
            if da_mcp.active then return; end
            return da_mcp.activate({
                key = dat.keyHash['MouseScrollClick'],
                activate = function()
                    da_ui.send("mcp", { active = true, })
                    if not da_mode.isPrimary("animation") then return end
                    animMCPState = true
                    SetNuiFocus(true, false)
                    SetNuiFocusKeepInput(true)
                end,
                deactivate = function()
                    da_ui.send("mcp", { active = false, })
                    if not da_mode.isPrimary("animation") then return end
                    da_control.waitForRelease(dat.keys)
                    animMCPState = false
                    SetNuiFocus(true, true)
                    SetNuiFocusKeepInput(false)
                end,
            })
        end,
        keymaps = {
            {
                key = "Escape3",
                event = "justPressed",
                primary = true,
                fn = function() da_mode.deactivate("animation") end,
            },
        }
    })
end)

-- Which entity a configured animation plays on: the one the config names, else the player.
local function animEntity(anim)
    local e = anim and anim.config and tonumber(anim.config.entity)
    return (e and e ~= 0) and e or PlayerPedId()
end

-- Previewing an animation REPLACES whatever the last preview left on the ped.
--
-- TaskPlayAnim does not do that by itself. An upper-body or secondary anim rides on top of what's
-- already playing — and the search tab's preview params are exactly those flags — so trying three
-- animations in a row showed you a composite of all three instead of the one you just clicked. Worse,
-- a full-body task replaces the full-body layer and leaves the secondary one running, so the leftover
-- could outlive several previews.
--
-- Only peds have tasks to clear. An object's anim is replaced outright by the next PlayEntityAnim, so
-- there is nothing to undo there.
--
-- Asked of the ENTITY (IsEntityAPed, as mode_object_cl does) rather than of its model: the model
-- lookup PlayAnimation uses answers nil for anything not in the object database, and "I don't know
-- what this is" must not silently mean "don't bother clearing it".
local function clearAnims(entity)
    if not entity or entity == 0 or not DoesEntityExist(entity) then return end
    if not IsEntityAPed(entity) then return end
    -- ClearPedTasks, not ...Immediately: this is a preview, and the harsher call is also the one
    -- that can eat a TaskPlayAnim issued on the same frame.
    da_anim.stop(entity)
    -- The secondary slot is NOT covered by ClearPedTasks, and it is where every upper-body preview
    -- lands — clearing only the primary is what let the leftovers stack up in the first place.
    ClearPedSecondaryTask(entity)
end

local PlayAnimation = function(anim)
    local entity = animEntity(anim)
    local objType = da_obj.getType(GetEntityModel(entity))
    if objType == nil or objType == "object" then
        da_anim.object(
            entity,
            anim.dict,
            anim.name,
            nil,
            anim.config.loop,
            anim.config.stayInAnim,
            nil,
            anim.config.delta,
            anim.config.bitset
        )
    elseif objType == "ped" then
        da_anim.ped(entity, anim.dict, anim.name, {
            blendIn  = anim.config.blendin,
            blendOut = anim.config.blendout,
            duration = anim.config.duration,
            flags    = anim.config.flags,
            rate     = anim.config.rate,
            ikFlags  = anim.config.ikflags,
            filter   = anim.config.taskfilter,
        })
    elseif objType == "vehicle" then
        log.warn("Animations are not supported for vehicles")
    elseif objType == "propset" then
        log.warn("Animations are not supported for propsets")
    elseif objType == "pickup" then
        log.warn("Animations are not supported for pickup")
    end
    log.debug("da_mode_anim_cl PlayAnimation played", anim, objType)
end

local PlayConfiguredAnimations = function(data)
    for _, anim in pairs(data.animations) do
        Citizen.CreateThread(function()
            local delay = tonumber(anim.config.delay) and tonumber(anim.config.delay) or 0
            if delay > 0 then Citizen.Wait(delay) end
            log.debug("da_mode_anim_cl PlayConfiguredAnimations playing", anim)
            PlayAnimation(anim)
        end)
    end
end

-- ===================== the scenario editor =====================
--
-- The UI round-trips an authored config through da_anims' REAL registry: register it live under
-- the scratch id, play it through the real Timeline, serialize the authored table back to Lua.
-- da_dev holds no editor state — the document lives in the NUI (localStorage) and every callback
-- here is a stateless forward to da_anims.
local SCN_EDIT_ID = "_edit_dev"

-- Saved scenarios: one kvp key each, under a shared prefix so they can be enumerated.
local SAVED_PREFIX = "dev:scn:saved:"

-- Every saved scenario, newest first. `kvp.search` walks the prefix, so this is the whole store with
-- no index to keep in step — an entry that fails to decode is skipped rather than taking the list
-- down with it, since a half-written blob must not make the import card unopenable.
local function savedScenarios()
    local out = {}
    -- pcall'd: `kvp.search` walks StartFindKvp/FindKvp, and if that ever misbehaves the failure must
    -- cost the SAVED SECTION, not the whole import card. A NUI callback that throws never calls its
    -- `cb`, so the UI's fetch simply never settles and the list stays blank with nothing to show why.
    local ok, keys = pcall(kvp.search, SAVED_PREFIX)
    if not ok then
        log.error("da_mode_anim_cl: could not read saved scenarios: " .. tostring(keys))
        return out
    end
    for _, key in ipairs(keys or {}) do
        local entry = kvp.decode(key)
        if type(entry) == "table" and type(entry.cfg) == "table" then
            local id = entry.id or key:sub(#SAVED_PREFIX + 1)
            local n = 0
            for _ in pairs(entry.cfg.states or {}) do n = n + 1 end
            -- The tags come off the config itself (`menu` names the folders it appears in), so the
            -- UI groups saved scenarios exactly the way it groups registered ones.
            local tags = {}
            for tag in pairs(entry.cfg.menu or {}) do tags[#tags + 1] = tag end
            table.sort(tags)
            out[#out + 1] = { id = id, name = entry.cfg.name or id, nStates = n, tags = tags }
        else
            log.warn("da_mode_anim_cl: unreadable saved scenario at " .. tostring(key))
        end
    end
    table.sort(out, function(a, b) return a.id < b.id end)
    return out
end

da_ui.callbacks({
    scnList = function()
        local out = {}
        for _, s in ipairs(exports.da_anims:animsList()) do
            if s.id:sub(1, 6) ~= "_test_" and s.id:sub(1, 6) ~= "_edit_" then
                local n = 0
                for _ in pairs(s.states or {}) do n = n + 1 end
                -- `menu` is the scenario's TAG placement — which menu folder it appears in. The
                -- import list groups by it, so it has to survive the hop; the tag tree below turns
                -- those names into the labels the player sees.
                local tags = {}
                for tag in pairs(s.menu or {}) do tags[#tags + 1] = tag end
                table.sort(tags)
                out[#out + 1] = { id = s.id, name = s.name, nStates = n, tags = tags }
            end
        end
        table.sort(out, function(a, b) return a.id < b.id end)
        -- Tags and saved scenarios ride along — one round trip renders all three sections. Both are
        -- pcall'd for the reason above: this callback MUST return. An older da_anims with no
        -- `animsTags` export, or an unreadable kvp entry, costs a section (categories flatten, saved
        -- goes missing) and says so on the status line — it does not leave the card empty.
        local okTags, tags = pcall(function() return exports.da_anims:animsTags() end)
        local okSaved, saved = pcall(savedScenarios)
        local warn = nil
        if not okTags then
            warn = "tag categories unavailable (restart da_anims?)"
            log.error("da_mode_anim_cl: animsTags failed: " .. tostring(tags))
        elseif not okSaved then
            warn = "saved scenarios unavailable"
            log.error("da_mode_anim_cl: savedScenarios failed: " .. tostring(saved))
        end
        return {
            scenarios = out,
            tags  = okTags  and tags  or {},
            saved = okSaved and saved or {},
            warn  = warn,
        }
    end,
    scnImport = function(data)
        return exports.da_anims:animsGetRaw(data.id) or { error = "no such scenario: " .. tostring(data.id) }
    end,

    -- ---- saved scenarios ----
    --
    -- A DRAFT lives in the browser's localStorage: scratch, and gone with the cache. SAVING puts the
    -- config in da_lib's kvp instead — the same durable client-side store da_anims keeps menu prefs
    -- in. It survives a cache clear and a resource restart, which is what "save" has to mean before
    -- anyone trusts it with an evening's work.
    --
    -- One key per scenario (`dev:scn:saved:<id>`) rather than one blob: saving a scenario rewrites
    -- only its own key, so two saves can't clobber each other, and a corrupt entry costs one
    -- scenario instead of the library.
    scnSave = function(data)
        local id = data and data.id
        if type(id) ~= "string" or id == "" or type(data.cfg) ~= "table" then
            return { error = "save needs an id and a config" }
        end
        -- No timestamp: `os.time()` is not available client-side (see carcass_probe_cl.lua) and
        -- GetGameTimer resets every session, so it could only ever sort wrongly. The list is
        -- alphabetical instead, which is at least honest about what it knows.
        kvp.encode(SAVED_PREFIX .. id, { id = id, cfg = data.cfg })
        log.debug("da_mode_anim_cl saved scenario", id)
        return { ok = true, id = id }
    end,
    -- Just the ids, without decoding a single config. The editor asks this on load and after every
    -- save/delete so the scenario card can say whether what you're editing has a saved copy behind
    -- it — a question you need answered constantly and shouldn't have to open the import card for.
    scnSavedIds = function()
        local out = {}
        local ok, keys = pcall(kvp.search, SAVED_PREFIX)
        if ok then
            for _, key in ipairs(keys or {}) do out[#out + 1] = key:sub(#SAVED_PREFIX + 1) end
        end
        return { ids = out }
    end,
    scnSavedLoad = function(data)
        local id = data and data.id
        local entry = type(id) == "string" and kvp.decode(SAVED_PREFIX .. id) or nil
        if type(entry) ~= "table" or type(entry.cfg) ~= "table" then
            return { error = "no saved scenario: " .. tostring(id) }
        end
        return { cfg = entry.cfg, id = entry.id or id }
    end,
    scnSavedDelete = function(data)
        local id = data and data.id
        if type(id) ~= "string" or id == "" then return { error = "delete needs an id" } end
        kvp.delete(SAVED_PREFIX .. id)
        return { ok = true, id = id }
    end,
    scnRegister = function(data)
        -- `focus` is the one state the timeline is drawing — the only one worth the streaming cost
        -- of measuring row lengths. Everything else registers as plain structure.
        return exports.da_anims:animsRegisterLive(SCN_EDIT_ID, data.cfg, data.focus)
    end,
    scnPlay = function(data)
        -- Preview the draft the way you'd REACH the state in game: a fidget is layered over the idle
        -- (so upper-body fidgets keep the idle's lower body), other roles play from their start.
        -- By default the `when` availability gate is IGNORED — you're authoring a scenario where its
        -- trigger can't fire yet — unless the editor's "enforce when" toggle asked to honour it.
        local ok = exports.da_anims:animsPreview(SCN_EDIT_ID, data.state,
            { ignoreWhen = not data.enforceWhen })
        return { ok = ok and true or false }
    end,
    scnStop = function(data)
        if data and data.force then exports.da_anims:animsCancel()
        else exports.da_anims:animsExit() end
        return {}
    end,
    scnState = function()
        -- The live run, for the timeline playhead. `running` is true only when it's OUR draft on the
        -- ped (not some other scenario the player fired), so the editor never sweeps a playhead for a
        -- run it didn't start. `elapsed` is ms since the current state began — the playhead position.
        local st = exports.da_anims:animsState()
        if not st then return { running = false } end
        return {
            running  = st.scenario == SCN_EDIT_ID,
            scenario = st.scenario,
            state    = st.state,
            role     = st.role,
            elapsed  = st.stateElapsed,
        }
    end,
    scnSerialize = function(data)
        -- Serialized under the id the AUTHOR chose — the scratch id is a registration detail.
        return exports.da_anims:animsSerialize(data.id, data.cfg)
    end,
    scnAnimLength = function(data)
        return { len = exports.da_anims:animsAnimLength(data.dict, data.anim) }
    end,
    scnResolveAwait = function(data)
        -- The one engine number the timeline needs per edit, without paying for a full register.
        return { ms = exports.da_anims:animsResolveAwait(data.await, data.anims) }
    end,
    scnPropsets = function()
        -- The propset catalogue (flat names incl. dotted variants) — the declaration picker, the
        -- attach-ref picker and the timeline's fade-in head all read from it.
        return { propsets = exports.da_anims:animsPropsets() }
    end,
    scnBoneNames = function()
        -- The static ped bone-name vocabulary (da_lib/data/bones.lua) — what an inline attach's
        -- `bone` field autocompletes against. Same list the skeleton picker brute-forces.
        return { bones = dat.bones }
    end,
})

da_ui.callbacks({
    -- Both PLAY paths clear first — a preview shows one thing, not an accumulation.
    playAnimation = function(data)
        clearAnims(animEntity(data))
        PlayAnimation(data)
    end,
    playAnimations = function(data)
        -- Once per entity, BEFORE the batch — never per animation. A configured sequence is meant to
        -- layer within itself (that is what the per-anim delays are for); it's only the previous
        -- preview that has to go.
        local cleared = {}
        for _, anim in pairs(data.animations or {}) do
            local e = animEntity(anim)
            if not cleared[e] then cleared[e] = true; clearAnims(e) end
        end
        PlayConfiguredAnimations(data)
    end,
    stopAnimation = function(data) da_anim.stop(data.entity or PlayerPedId()) end,
    getEntityType = function(data)
        local entity = tonumber(data.entity) ~= 0 and tonumber(data.entity) or PlayerPedId()
        local objType = da_obj.getType(GetEntityModel(entity))
        log.debug("da_ui.events getEntityType", entity, objType)
        return { entityType = objType or "ped" }
    end,
    activateMCP = function(data)
        local retval = da_mode.activateMCP(data.mode)
        log.spam("da_ui.events activateMCP retval", data, retval)
        return retval
    end,
    deactivateMCP = function(data)
        local retval = da_mcp.deactivate()
        log.spam("da_ui.events deactivateMCP retval", data, retval)
        return retval
    end,
})

da_trie.addOpt("devRoot", "animation", "a", function() da_mode.toggle("animation") end)
