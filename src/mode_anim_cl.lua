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

local PlayAnimation = function(anim)
    local entity = tonumber(anim.config.entity) ~= 0 and tonumber(anim.config.entity) or PlayerPedId()
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

da_ui.callbacks({
    scnList = function()
        local out = {}
        for _, s in ipairs(exports.da_anims:animsList()) do
            if s.id:sub(1, 6) ~= "_test_" and s.id:sub(1, 6) ~= "_edit_" then
                local n = 0
                for _ in pairs(s.states or {}) do n = n + 1 end
                out[#out + 1] = { id = s.id, name = s.name, nStates = n }
            end
        end
        table.sort(out, function(a, b) return a.id < b.id end)
        return { scenarios = out }
    end,
    scnImport = function(data)
        return exports.da_anims:animsGetRaw(data.id) or { error = "no such scenario: " .. tostring(data.id) }
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
    playAnimation = function(data) PlayAnimation(data) end,
    playAnimations = function(data) PlayConfiguredAnimations(data) end,
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
