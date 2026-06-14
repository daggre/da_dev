local Key = {
    Front = `INPUT_MOVE_UP_ONLY`,
    Back = `INPUT_MOVE_DOWN_ONLY`,
    Left = `INPUT_MOVE_LEFT_ONLY`,
    Right = `INPUT_MOVE_RIGHT_ONLY`,
    Jump = `INPUT_JUMP`,
}

local Bull = {
    entity = nil,
    player = nil,
    model = `a_c_bull_01`,
    bone = "skel_spine3",
    ridingPos = vector3(0.0, 0.2, 0.0),
    ridingRot = vector3(90.0, 90.0, 0.0),
}

local BullRideAnim = {
    BullAngry = {
        dict = "creatures_mammal@bull@charging@idle@variation@var_a",
        anim = "idle",
    },
    InPlace = {
        player = {
            dict = "veh_horseback@seat_saddle@male@bucking_high@canter_slow@2h@variation@var_c",
            anim = "move"
        },
        bull = {
            frontDict = "creatures_mammal@bull@agitated@canter",
            frontAnim = "stop_l",
            backDict = "creatures_mammal@horse@bucking_off@canter",
            backAnim = "start_static_0"
        },
    },
    Front = {
        player = {
            dict = "veh_horseback@seat_saddle@male@bucking_high@canter_slow@2h@variation@var_a",
            anim = "move"
        },
        bull = {
            frontDict = "creatures_mammal@bull@agitated@canter",
            frontAnim = "start_fwd_right_0",
            backDict = "creatures_mammal@horse@bucking_high@canter_slow",
            backAnim = "move"
        },
    },
    Back = {
        player = {
            dict = "veh_horseback@seat_saddle@male@bucking_high@canter_slow@2h@variation@var_a",
            anim = "move"
        },
        bull = {
            frontDict = "creatures_mammal@bull@agitated@walk",
            frontAnim = "stop_r",
            backDict = "creatures_mammal@horse@bucking_off@canter@drift",
            backAnim = "move_fwd_-0"
        },
    },
    LeftFront = {
        player = {
            dict = "veh_horseback@seat_saddle@male@bucking_high@canter_slow@2h@variation@var_c",
            anim = "move"
        },
        bull = {
            frontDict = "creatures_mammal@bull@agitated@canter",
            frontAnim = "start_fwd_left_-45",
            backDict = "creatures_mammal@horse@bucking_high@canter_slow@variation@var_c",
            backAnim = "turn_l2"
        },
    },
    Left = {
        player = {
            dict = "veh_horseback@seat_saddle@male@bucking_high@canter_slow@2h@variation@var_c",
            anim = "move"
        },
        bull = {
            frontDict = "creatures_mammal@bull@agitated@idle",
            frontAnim = "idle_turn_back_left_-180",
            backDict = "creatures_mammal@horse@bucking_off@canter@drift",
            backAnim = "turn_l2_fwd_-45",
            anim2delay = 1750,
            front2Dict = "creatures_mammal@bull@agitated@idle",
            front2Anim = "idle_turn_back_left_-180",
            back2Dict = "creatures_mammal@horse@bucking_high@canter_slow@variation@var_c",
            back2Anim = "turn_l2",
        },
    },
    LeftBack = {
        player = {
            dict = "veh_horseback@seat_saddle@male@bucking_high@canter_slow@2h@variation@var_c",
            anim = "move"
        },
        bull = {
            frontDict = "creatures_mammal@bull@agitated@idle",
            frontAnim = "idle_turn_left_-45",
            backDict = "creatures_mammal@horse@bucking_high@canter@variation@var_c@piaffe",
            backAnim = "turn_l2"
        },
    },
    RightFront = {
        player = {
            dict = "veh_horseback@seat_saddle@male@bucking_high@canter_slow@2h@variation@var_c",
            anim = "move"
        },
        bull = {
            frontDict = "creatures_mammal@bull@agitated@canter",
            frontAnim = "start_fwd_right_45",
            backDict = "creatures_mammal@horse@bucking_high@canter_slow@variation@var_c",
            backAnim = "turn_r2"
        },
    },
    Right = {
        player = {
            dict = "veh_horseback@seat_saddle@male@bucking_high@canter_slow@2h@variation@var_c",
            anim = "move"
        },
        bull = {
            frontDict = "creatures_mammal@bull@agitated@idle",
            frontAnim = "idle_turn_back_right_180",
            backDict = "creatures_mammal@horse@bucking_off@canter@drift",
            backAnim = "turn_r2_fwd_-45",
            anim2delay = 1750,
            front2Dict = "creatures_mammal@bull@agitated@idle",
            front2Anim = "idle_turn_back_right_180",
            back2Dict = "creatures_mammal@horse@bucking_high@canter_slow@variation@var_c",
            back2Anim = "turn_r2",
        },
    },
    RightBack = {
        player = {
            dict = "veh_horseback@seat_saddle@male@bucking_high@canter_slow@2h@variation@var_c",
            anim = "move"
        },
        bull = {
            frontDict = "creatures_mammal@bull@agitated@idle",
            frontAnim = "idle_turn_right_45",
            backDict = "creatures_mammal@horse@bucking_high@canter@variation@var_c@piaffe",
            backAnim = "turn_r2"
        },
    },
}

local StopAnimMode = function(mode)
    local anim = BullRideAnim[mode].bull
    StopAnimTask(Bull.entity, anim.backDict, anim.backAnim, 1.0)
    StopAnimTask(Bull.entity, anim.frontDict, anim.frontAnim, 1.0)
    if anim.back2Anim or anim.front2Anim then
        StopAnimTask(Bull.entity, anim.back2Dict, anim.back2Anim, 1.0)
        StopAnimTask(Bull.entity, anim.front2Dict, anim.front2Anim, 1.0)
    end
end

local PlayerAnim = function(mode, opts)
    opts = opts or {}
    opts.loop = opts.loop and 1 or 0
    opts.uninterrupt = opts.uninterrupt and 4 or 0

    local anim = BullRideAnim[mode].player
    da_anim.ped(
        Bull.player,
        anim.dict,
        anim.anim,
        0.5, -- blendIn
        0.5, -- blendOut
        -1, -- duration
        opts.loop + opts.uninterrupt, -- flags
        0, -- rate
        0, -- ikFlags
        false -- taskFilter
    )
end

local BullAnim = function(mode, opts)
    opts = opts or {}
    opts.loop = opts.loop and 1 or 0
    opts.uninterrupt = opts.uninterrupt and 4 or 0

    local anim = BullRideAnim[mode].bull
    da_anim.ped(
        Bull.entity,
        anim.backDict,
        anim.backAnim,
        0.8, -- blendIn
        0.6, -- blendOut
        -1, -- duration
        opts.loop + opts.uninterrupt, -- flags
        0, -- rate
        0, -- ikFlags
        false -- taskFilter
    )
    da_anim.ped(
        Bull.entity,
        anim.frontDict,
        anim.frontAnim,
        0.8, -- blendIn
        0.6, -- blendOut
        -1, -- duration
        24 + opts.loop + opts.uninterrupt, -- flags (UPPERBODY + SECONDARY)
        0, -- rate
        0, -- ikFlags
        false -- taskFilter
    )

    if not anim.back2Anim and not anim.front2Anim then return end
    local delay = anim.anim2delay or 350
    Citizen.Wait(delay)
    if anim.back2Dict then
        da_anim.ped(
            Bull.entity,
            anim.back2Dict,
            anim.back2Anim,
            0.6, -- blendIn
            0.3, -- blendOut
            -1, -- duration
            opts.loop + opts.uninterrupt, -- flags
            0, -- rate
            0, -- ikFlags
            false -- taskFilter
        )
    end
    if anim.front2Dict then
        da_anim.ped(
            Bull.entity,
            anim.front2Dict,
            anim.front2Anim,
            0.6, -- blendIn
            0.3, -- blendOut
            -1, -- duration
            24 + opts.loop + opts.uninterrupt, -- flags (UPPERBODY + SECONDARY)
            0, -- rate
            0, -- ikFlags
            false -- taskFilter
        )
    end
end

local BullRide = function(mode, clearPedTasks)
    assert(BullRideAnim[mode] ~= nil, "Invalid bullride mode: " .. tostring(mode))

    if not Bull.entity then
        log.warn("No bull entity")
        return
    end

    if clearPedTasks then
        ClearPedTasksImmediately(Bull.entity)
    end

    PlayerAnim(mode, { loop = true })
    BullAnim(mode, { loop = true, uninterrupt = true })
end

local ReleaseBull = function()
    da_anim.ped(Bull.entity, "creatures_mammal@bull@agitated@canter", "stop_l", 0.6, 0.9, -1, 0, 0, 0, false)
    Citizen.Wait(1900)
    da_anim.ped(Bull.entity, "creatures_mammal@bull@agitated@walk@one_step@forward", "move", 0.6, 0.9, -1, 0, 0, 0, false)
    ClearPedTasks(Bull.entity)
    SetBlockingOfNonTemporaryEvents(Bull.entity, false)
    -- TaskCombatHatedTargetsAroundPedTimed(Bull.entity, 25.0, 5000, 0)
    -- Citizen.Wait(6000)
    -- TaskCombatHatedTargetsAroundPedTimed(Bull.entity, 25.0, 5000, 0)

end

local ThrowRider = function(currentMode, downtime)
    downtime = downtime or 2000
    local lastMode = currentMode:find("Left", 1, true) and "LeftBack" or "RightBack"
    local fallDelay = math.random(200,3000)
    fallDelay = math.min(fallDelay, math.random(200,3000))
    fallDelay = math.min(fallDelay, math.random(200,3000))
    local lastSpinTime = math.random(3000,6000)
    log.debug({lastMode=lastMode, fallDelay=fallDelay, lastSpinTime=lastSpinTime})
    StopAnimMode(currentMode)

    log.debug("Last spin starting")
    BullAnim(lastMode, { loop = true, uninterrupt = true })
    Citizen.CreateThread(function()
        Citizen.Wait(fallDelay)
        DetachEntity(Bull.player, true, true)
        SetPedToRagdoll(Bull.player, downtime, downtime+1000, 0, false, false, false)
    end)
    Citizen.Wait(fallDelay + lastSpinTime)
    log.debug("Last spin ending")
    StopAnimMode(lastMode)
    ReleaseBull()
end

local BullRideLoop = function()
    local ret = NetworkRequestControlOfEntity(Bull.entity)
    if not ret then return false end
    SetBlockingOfNonTemporaryEvents(Bull.entity, true)
    ClearPedTasksImmediately(Bull.entity)
    Citizen.CreateThread(function()
        local currentMode = nil
        local controlMode = "InPlace"
        local controlsPressed = {
            front = false,
            back = false,
            left = false,
            right = false,
        }

        while Bull.entity ~= nil do
            local interval = 50
            controlsPressed.jump = IsControlPressed(0, Key.Jump) or IsDisabledControlPressed(0, Key.Jump)
            controlsPressed.front = IsControlPressed(0, Key.Front) or IsDisabledControlPressed(0, Key.Front)
            controlsPressed.back = IsControlPressed(0, Key.Back) or IsDisabledControlPressed(0, Key.Back)
            controlsPressed.left = IsControlPressed(0, Key.Left) or IsDisabledControlPressed(0, Key.Left)
            controlsPressed.right = IsControlPressed(0, Key.Right) or IsDisabledControlPressed(0, Key.Right)

            if controlsPressed.jump then
                ThrowRider(currentMode, 3000)
                break
            end

            if controlsPressed.front then
                controlMode = "Front"
                if controlsPressed.left then
                    controlMode = "LeftFront"
                elseif controlsPressed.right then
                    controlMode = "RightFront"
                end
            elseif controlsPressed.back then
                controlMode = "Back"
                if controlsPressed.left then
                    controlMode = "LeftBack"
                elseif controlsPressed.right then
                    controlMode = "RightBack"
                end
            elseif controlsPressed.left then
                controlMode = "Left"
                -- if currentMode == "Right" then
                -- end
            elseif controlsPressed.right then
                controlMode = "Right"
                -- if currentMode == "Left" then
                -- end
            else
                controlMode = "InPlace"
            end

            if controlMode ~= currentMode then
                interval = math.random(50,600)
                currentMode = controlMode
                BullRide(currentMode, false)
                if currentMode == "InPlace" then
                    interval = 50
                end
                log.debug("Bullride mode:", currentMode)
            end
            Citizen.Wait(interval)
        end
    end)
end

da_trie.add("devRoot", "bullride", "q")
da_trie.addOpt("bullride", "spawnbull", "s", function()
    Bull.player = PlayerPedId()

    if Bull.entity ~= nil then
        da_obj.delete(Bull.entity)
        Bull.entity = nil
    end

    local pos = da_util.GetGroundPositionForward(GetEntityCoords(Bull.player), 8.0)
    Bull.entity = da_obj.createPed(Bull.model, pos)
    Citizen.Wait(100)

end)
da_trie.addOpt("bullride", "startride", "e", function()
    log.info("Starting bullride")
    Bull.player = PlayerPedId()

    if Bull.entity ~= nil then
        da_obj.delete(Bull.entity)
        Bull.entity = nil
    end

    local pos = da_util.GetGroundPositionForward(GetEntityCoords(Bull.player), 0.0)
    Bull.entity = da_obj.createPed(Bull.model, pos)
    Citizen.Wait(100)
    da_obj.attach(Bull.player, Bull.entity,
        GetEntityBoneIndexByName(Bull.entity, Bull.bone),
        Bull.ridingPos, Bull.ridingRot,
        { frozen = false, }
    )
    Citizen.Wait(100)
    BullRideLoop()
end)
da_trie.addOpt("bullride", "endride", "x", function()
    log.info("Ending bullride")
    da_obj.delete(Bull.entity)
    ClearPedTasksImmediately(Bull.player)
    Bull.entity = nil
end, function() return Bull.entity ~= nil end)

da_net.events({
    ["onResourceStop"] = function(resourceName)
        if resourceName == GetCurrentResourceName() then
            da_obj.delete(Bull.entity)
            Bull.entity = nil
            ClearPedTasksImmediately(Bull.player)
        end
    end,
})
