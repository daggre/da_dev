-- Prop mode: author a PROPSET — model + bone + offset/rotation against a live base entity — from
-- the anim HUD's "prop" section (.scratch/anim-editor-props/PRD.md).
--
-- The deliverable is the data a da_anims config references (`Propset.X = { objectHash, bone,
-- position, rotation }`); the UI emits the Lua, this file owns the live picture: a helper object
-- spawned and re-attached on every field edit, so what you see IS the propset.
--
-- Gizmo integration (press R, drag, offsets update) waits on the bone-transform spike
-- (`testrun prop_attach` → ADR); until then the offsets are numeric fields with live re-attach.
--
-- Runs inside the "animation" mode's focus — it's a SECTION of that HUD, not a mode of its own.
-- It sets the object-mode global `Select` to its base entity so bones_cl's getBones/skeleton
-- highlight work unchanged; the two HUDs are never open at once, so the global has one meaning
-- at a time.

local Prop = {
    base   = nil,  -- entity the helper attaches to; nil = the player ped
    helper = nil,  -- the spawned attach model
    model  = nil,  -- its model NAME (the propset emits `objectHash` from it)
    bone   = nil,  -- bone name, or nil/"" = entity root
    pos    = vec3(0.0, 0.0, 0.0),
    rot    = vec3(0.0, 0.0, 0.0),

    -- base-pick state: while `picking`, a draw thread raycasts from the NUI cursor and boxes the
    -- entity under it — the same hover affordance object mode gives its cursor picks.
    picking = false,
    curX    = 0.5,
    curY    = 0.5,
    hover   = nil, -- entity currently under the cursor (what a click will pick)
}

-- Blue, matching object mode's hover box (mode_object_cl Theme.Secondary), so a picked entity
-- reads the same across both HUDs.
local HOVER_COLOR = { r = 80, g = 193, b = 238, a = 255 }

local function baseEntity()
    if Prop.base and DoesEntityExist(Prop.base) then return Prop.base end
    return PlayerPedId()
end

local function clearHelper()
    if Prop.helper and DoesEntityExist(Prop.helper) then
        DetachEntity(Prop.helper, true, true)
        da_obj.delete(Prop.helper)
    end
    Prop.helper = nil
    Prop.model = nil
end

local function reattach()
    if not Prop.helper or not DoesEntityExist(Prop.helper) then return end
    local tgt = baseEntity()
    local idx = -1
    if Prop.bone and Prop.bone ~= "" then
        local i = GetEntityBoneIndexByName(tgt, Prop.bone)
        if i and i ~= -1 then idx = i
        else log.warn("prop mode: base has no bone named", Prop.bone) end
    end
    da_obj.attach(Prop.helper, tgt, idx, Prop.pos, Prop.rot)
end

-- The same cursor ray object mode picks with (mode_object_cl RaycastCursor) — copied rather than
-- shared because that one is local and entangled with object mode's Distance/ignore state.
local function raycastCursor(x, y, dist)
    local _, normal = GetWorldCoordFromScreenCoord(x, y)
    local pos = GetFinalRenderedCamCoord()
    local _, hit, endPos, _, obj = GetShapeTestResult(
        StartShapeTestRay(
            pos.x, pos.y, pos.z,
            pos.x + normal.x * dist,
            pos.y + normal.y * dist,
            pos.z + normal.z * dist,
            -1, nil, 0
        )
    )
    return hit, obj, endPos
end

local function toVec3(t)
    if type(t) ~= "table" then return vec3(0.0, 0.0, 0.0) end
    return vec3(tonumber(t.x) or 0.0, tonumber(t.y) or 0.0, tonumber(t.z) or 0.0)
end

-- While armed, box whatever entity the NUI cursor is over — one thread, self-terminating when
-- picking stops or the anim HUD closes. `Prop.hover` is what a click resolves to, so what's boxed
-- is exactly what gets picked. The helper we spawned is skipped so it never boxes itself.
local drawRunning = false
local function startHoverDraw()
    if drawRunning then return end
    drawRunning = true
    Citizen.CreateThread(function()
        while Prop.picking and da_mode.isActive("animation") do
            local hit, obj = raycastCursor(Prop.curX, Prop.curY, 50.0)
            local model = hit and obj and obj ~= 0 and GetEntityModel(obj)
            if model and model ~= 0 and obj ~= Prop.helper and DoesEntityExist(obj) then
                Prop.hover = obj
                DrawBB(obj, HOVER_COLOR)
            else
                Prop.hover = nil
            end
            Citizen.Wait(0)
        end
        Prop.hover = nil
        drawRunning = false
    end)
end

da_ui.callbacks({
    -- The one write path: the UI sends the WHOLE config on any field edit; this spawns/reuses the
    -- helper and re-attaches. Stateless from the UI's point of view — same idiom as the scenario
    -- editor's register.
    propApply = function(data)
        Prop.bone = data.bone
        Prop.pos = toVec3(data.pos)
        Prop.rot = toVec3(data.rot)

        local model = data.model and data.model ~= "" and data.model or nil
        if not model then
            clearHelper()
            return { ok = false, reason = "no model" }
        end

        if model ~= Prop.model or not Prop.helper or not DoesEntityExist(Prop.helper) then
            clearHelper()
            local hash = GetHashKey(model)
            local obj = da_obj.createObj(hash, GetEntityCoords(baseEntity()), { frozen = false })
            if not obj or obj == 0 then
                return { ok = false, reason = "model failed to spawn: " .. model }
            end
            Prop.helper = obj
            Prop.model = model
        end

        reattach()
        return { ok = true }
    end,

    -- Click-to-pick the base. Prefer the entity the hover box is on (so what you see boxed is what
    -- you get); fall back to a fresh ray at the click coords if the draw thread has nothing. Any
    -- entity counts — ped, horse, object — the bone list is just empty for non-peds.
    propSetBase = function(data)
        local obj = Prop.hover
        if not obj or not DoesEntityExist(obj) then
            local hit, o = raycastCursor(tonumber(data.x) or 0.5, tonumber(data.y) or 0.5, 50.0)
            if hit and o and o ~= 0 and DoesEntityExist(o) then obj = o end
        end
        if not obj or obj == 0 or not DoesEntityExist(obj) then
            return { ok = false }
        end
        Prop.base = obj
        Prop.picking = false -- picked; stop boxing
        Select = obj -- bones_cl reads this for getBones + the skeleton highlight
        reattach()
        return {
            ok = true,
            handle = obj,
            model = tostring(dat.getName(GetEntityModel(obj))),
            isPed = IsEntityAPed(obj),
        }
    end,

    -- Back to the default base (your own ped).
    propBaseReset = function()
        Prop.base = nil
        Select = PlayerPedId()
        reattach()
        return { ok = true, isPed = true }
    end,

    propClear = function()
        clearHelper()
        return {}
    end,

    -- Save the authored prop into da_anims' live Propset table (model NAME hashed here), so it
    -- shows in the editor's prop dropdown and a draft can play it. The NUI owns persistence (it
    -- re-sends these on load); this is the live registration half.
    propRegister = function(data)
        if not data.model or data.model == "" then
            return { ok = false, error = "no model" }
        end
        return exports.da_anims:animsRegisterPropset(data.name, {
            objectHash = GetHashKey(data.model),
            bone       = data.bone,
            position   = data.pos,
            rotation   = data.rot,
        })
    end,
})

da_ui.events({
    -- The prop section opened/closed. Opening points `Select` at the base so the bone picker
    -- works immediately; closing keeps the helper attached (you're likely tuning numbers against
    -- the anim preview) — [clear] is the explicit way to drop it.
    propModeActive = function(data)
        if data.state then
            Select = baseEntity()
        else
            Prop.picking = false
            if da_bones_reset then da_bones_reset() end -- never leave the skeleton x-ray stuck on
        end
    end,

    -- The base field was armed/disarmed. Arming starts the hover-box draw thread; the UI feeds
    -- cursor moves through propCursor while it's up.
    propArmBase = function(data)
        Prop.picking = data.state and true or false
        if Prop.picking then startHoverDraw() else Prop.hover = nil end
    end,

    -- The NUI cursor position (normalized 0..1), while armed — what the draw thread rays from.
    propCursor = function(data)
        Prop.curX = tonumber(data.x) or 0.5
        Prop.curY = tonumber(data.y) or 0.5
    end,
})

da_net.events({
    onResourceStop = function(resourceName)
        if resourceName == GetCurrentResourceName() then
            Prop.picking = false
            clearHelper()
        end
    end,
})
