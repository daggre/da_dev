local peds = {
    john = { key = "j", model = `player_zero`, outfit = 0 },
    arthur = { key = "a", model = `player_three`, outfit = 0 },
    male = { key = "m", model = `mp_male`, outfit = 4 },
    female = { key = "f", model = `mp_female`, outfit = 4 },
    fear = { key = "1", model = `mp_g_m_m_armyoffear_01`, outfit = 0 },
    eagle = { key = "e", model = `a_c_eagle_01`, outfit = 2 },
    coyote = { key = "c", model = `a_c_coyote_01`, outfit = 1 },
    robot = { key = "r", model = `cs_crackpotrobot`, outfit = 2 },
    wapiti = { key = "w", model = `a_m_m_wapwarriors_01`, outfit = 17 },
    wolf = { key = "p", model = `a_c_wolf_medium`, outfit = 4 },
}


-- This is just a variant of the kibook animal fix (added predator vision for birds of prey)
local IsAnimal = false
local HasPredatorVision = false
local AnimalFix = false
local lastPlayerPedId = 0
local Deg2Rad = math.pi / 180

local PredatorVision = {
    [`a_c_eagle_01`] = true,
    [`a_c_hawk_01`] = true,
    [`a_c_owl_01`] = true,
}

local AttackModel = {
    [`A_C_Alligator_01`] = "alligator",
    [`MP_A_C_Alligator_01`] = "alligator",
    [`A_C_Alligator_02`] = "gator_giant",
    [`A_C_Badger_01`] = "badger",
    [`A_C_Bear_01`] = "bear",
    [`A_C_BearBlack_01`] = "bear",
    [`MP_A_C_Bear_01`] = "bear",
    [`A_C_Beaver_01`] = "beaver",
    [`MP_A_C_Beaver_01`] = "beaver",
    [`A_C_Cougar_01`] = "cougar",
    [`A_C_Panther_01`] = "cougar",
    [`MP_A_C_Cougar_01`] = "cougar",
    [`MP_A_C_Panther_01`] = "cougar",
    [`A_C_Coyote_01`] = "coyote",
    [`MP_A_C_Coyote_01`] = "coyote",
    [`A_C_DogAmericanFoxhound_01`] = "dog",
    [`A_C_DogAustralianShepherd_01`] = "dog",
    [`A_C_DogBluetickCoonhound_01`] = "dog",
    [`A_C_DogCatahoulaCur_01`] = "dog",
    [`A_C_DogChesBayRetriever_01`] = "dog",
    [`A_C_DogCollie_01`] = "dog",
    [`A_C_DogHobo_01`] = "dog",
    [`A_C_DogHound_01`] = "dog",
    [`A_C_DogHusky_01`] = "dog",
    [`A_C_DogLab_01`] = "dog",
    [`A_C_DogLion_01`] = "dog",
    [`A_C_DogPoodle_01`] = "dog",
    [`A_C_DogRufus_01`] = "dog",
    [`A_C_DogStreet_01`] = "dog",
    [`MP_A_C_DogAmericanFoxhound_01`] = "dog",
    [`A_C_Muskrat_01`] = "muskrat",
    [`A_C_Raccoon_01`] = "raccoon",
    [`A_C_Wolf`] = "wolf",
    [`MP_A_C_Wolf_01`] = "wolf",
    [`A_C_LionMangy_01`] = "wolf",
    [`A_C_Wolf_Medium`] = "wolf_medium",
    [`A_C_Wolf_Small`] = "wolf_small",
}

local AttackType = {
    alligator = {
        animDict = "creatures_reptile@alligator@melee@streamed_core",
        animName = "attack",
        radius = 2.5,
        force = 2.0,
        damage = 25,
    },
    alligator_giant = {
        animDict = "amb_creatures_reptile@gator_giant@nip_attack",
        animName = "nip",
        radius = 3.0,
        force = 2.0,
        damage = 25,
    },
    badger = {
        animDict = "creatures_mammal@badger@melee",
        animName = "nip_attack",
        radius = 2.0,
        force = 1.0,
        damage = 15,
    },
    bear = {
        animDict = "creatures_mammal@bear@melee@streamed_core",
        animName = "attack",
        radius = 3.0,
        force = 5.0,
        damage = 30,
    },
    beaver = {
        animDict = "creatures_mammal@beaver@melee",
        animName = "nip_attack",
        radius = 2.0,
        force = 1.0,
        damage = 15,
    },
    cougar = {
        animDict = "creatures_mammal@cougar@melee@streamed_core",
        animName = "attack",
        radius = 2.0,
        force = 3.0,
        damage = 20,
    },
    coyote = {
        animDict = "creatures_mammal@coyote@melee@streamed_core",
        animName = "attack",
        radius = 2.5,
        force = 2.0,
        damage = 25,
    },
    dog = {
        animDict = "creatures_mammal@dog_pers@melee@streamed_core",
        animName = "attack",
        radius = 2.5,
        force = 2.0,
        damage = 20,
    },
    muskrat = {
        animDict = "creatures_mammal@muskrat@melee",
        animName = "nip_attack",
        radius = 2.0,
        force = 1.0,
        damage = 15,
    },
    raccoon = {
        animDict = "creatures_mammal@raccoon@melee",
        animName = "nip_attack",
        radius = 2.0,
        force = 1.0,
        damage = 15,
    },
    wolf = {
        animDict = "creatures_mammal@wolf@melee@attacks@streamed_core",
        animName = "attack",
        radius = 3.0,
        force = 3.0,
        damage = 30,
    },
    wolf_medium = {
        animDict = "creatures_mammal@wolf_medium@melee@attacks@streamed_core",
        animName = "attack",
        radius = 3.0,
        force = 3.0,
        damage = 25,
    },
    wolf_small = {
        animDict = "creatures_mammal@wolf_small@melee@attacks@streamed_core",
        animName = "attack",
        radius = 3.0,
        force = 3.0,
        damage = 20,
    },
}

function PlayAnimation(playerPed, animDict, animName)
    if not DoesAnimDictExist(animDict) then
        log.warn("Invalid animation dictionary: " .. animDict)
        return
    end

    RequestAnimDict(animDict)
    while not HasAnimDictLoaded(animDict) do Citizen.Wait(0); end
    TaskPlayAnim(playerPed, animDict, animName, 4.0, 4.0, -1, 0, 0.0, false, false, false, "", false)

    RemoveAnimDict(animDict)
end

function IsPvpEnabled()
    return GetRelationshipBetweenGroups(`PLAYER`, `PLAYER`) == 5
end

function IsValidTarget(ped)
    return not IsPedDeadOrDying(ped) and not (IsPedAPlayer(ped) and not IsPvpEnabled())
end

function GetClosestPed(coords, radius)
    local itemset = CreateItemset(true)
    local size = Citizen.InvokeNative(0x59B57C4B06531E1E, coords, radius, itemset, 1, Citizen.ResultAsInteger())

    local closestPed
    local minDist = radius

    if size > 0 then
        for i = 0, size - 1 do
            local ped = GetIndexedItemInItemset(i, itemset)

            if playerPed ~= ped and IsValidTarget(ped) then
                local pedCoords = GetEntityCoords(ped)
                local distance = #(coords - pedCoords)

                if distance < minDist then
                    closestPed = ped
                    minDist = distance
                end
            end
        end
    end

    if IsItemsetValid(itemset) then DestroyItemset(itemset); end

    return closestPed
end

function EntityFaceEntity(entity1, entity2)
    local p1 = GetEntityCoords(entity1)
    local p2 = GetEntityCoords(entity2)

    local dx = p2.x - p1.x
    local dy = p2.y - p1.y

    local heading = GetHeadingFromVector_2d(dx, dy)

    SetEntityHeading(entity1, heading)
end

function GetAttackType(playerPed)
    local playerModel = GetEntityModel(playerPed)
    return AttackType[AttackModel[playerModel]]
end

function ApplyAttackToTarget(attacker, target, attackType)
    if attackType.force > 0 then
        SetPedToRagdoll(target, 1000, 1000, 0, 0, 0, 0)
        SetEntityVelocity(target, GetEntityForwardVector(attacker) * attackType.force)
    end

    if attackType.damage > 0 then
        ApplyDamageToPed(target, attackType.damage, 1, -1, 0)
    end
end

function GetPlayerServerIdFromPed(ped)
    for _, player in ipairs(GetActivePlayers()) do
        if GetPlayerPed(player) == ped then
            return GetPlayerServerId(player)
        end
    end
end

function Attack()
    if IsAttacking then return; end
    local playerPed = lastPlayerPedId
    if IsPedDeadOrDying(playerPed) or IsPedRagdoll(playerPed) then return; end

    local attackType = GetAttackType(playerPed)
    if attackType then
        local target = GetClosestPed(GetEntityCoords(playerPed), attackType.radius)
        if playerPed == target then return; end

        if target then
            IsAttacking = true
            EntityFaceEntity(playerPed, target)
            PlayAnimation(playerPed, attackType.animDict, attackType.animName)

            if IsPedAPlayer(target) then
                TriggerServerEvent("fixanimals:attack", GetPlayerServerIdFromPed(target), -1)
            elseif NetworkGetEntityIsNetworked(target) and not NetworkHasControlOfEntity(target) then
                TriggerServerEvent("fixanimals:attack", -1, PedToNet(target))
            else
                ApplyAttackToTarget(playerPed, target, attackType)
            end

            Citizen.SetTimeout(3000, function() IsAttacking = false end)
        end
    end
end

function GetEntityAtRay(distance)
    local pos = GetFinalRenderedCamCoord()
    local rot = GetFinalRenderedCamRot()
    local yaw = rot.z * Deg2Rad
    local pitch = rot.x * Deg2Rad
    local hdg = {
        x = -math.sin(yaw) * math.abs(math.cos(pitch)),
        y = math.cos(yaw) * math.abs(math.cos(pitch)),
        z = math.sin(pitch),
    }
    local _, hit, endPos, _, obj = GetShapeTestResult(
        StartShapeTestRay(
            pos.x, pos.y, pos.z,
            pos.x + hdg.x * distance,
            pos.y + hdg.y * distance,
            pos.z + hdg.z * distance,
            -1, lastPlayerPedId, 0
        )
    )
    return hit, endPos
end

function LookAtEntity(distance)
    local hit, coords = GetEntityAtRay(distance)
    if hit ~= 1 then return; end
    local entity = GetClosestPed(coords, 40.0)
    if not entity then return; end

    local fov = 40.0
    local offset = 1.5
    local followDistance = 2.0
    local blendIn = 1000
    local blendOut = 1500
    local duration = -1
    local distance = #(GetEntityCoords(lastPlayerPedId) - GetEntityCoords(entity))
    log.debug("Setting cam", coords, entity, distance)


    if distance > 75 then
        offset = 1.0
        fov = 20.0
    elseif distance > 120 then
        offset = 0.5
        fov = 10.0
    end
    if IsControlPressed(0, 0x639B9FC9) then
        fov = 1.0
        blendIn = 1500
        blendOut = 2500
    end

    -- if IsGameplayHintActive() then StopGameplayHint(true) end
    SetGameplayHintFollowDistanceScalar(followDistance)
    SetGameplayHintCameraRelativeSideOffset(offset)
    SetGameplayHintFov(fov)
    SetGameplayPedHint(entity,
        0, 0, 0,
        true,
        duration, blendIn, blendOut)
end

RegisterNetEvent("da_lib:anmlfx")
AddEventHandler("da_lib:anmlfx", function(attacker, entity)
    local attackerPed = GetPlayerPed(GetPlayerFromServerId(attacker))
    local attackType = GetAttackType(attackerPed)

    if entity == -1 then
        if IsPvpEnabled() then
            ApplyAttackToTarget(attackerPed, lastPlayerPedId, attackType)
        end
    else
        ApplyAttackToTarget(attackerPed, NetToPed(entity), attackType)
    end
end)


local function ApplyAnimalFix()
    if AnimalFix then return; end

    AnimalFix = true
    Citizen.CreateThread(function()
        while AnimalFix do
            local playerPedId = PlayerPedId()
            if playerPedId ~= lastPlayerPedId then
                if IsPedHuman(playerPedId) then
                    Citizen.InvokeNative(0x2804658EB7D8A50B, 2, 0) -- Reset control context
                    IsAnimal = false
                    AnimalFix = false
                else
                    SetPedConfigFlag(playerPedId, 43, true) -- Prevent animal peds from climbing on ladders, as this crashes the game
                    IsAnimal = true
                    HasPredatorVision = PredatorVision[GetEntityModel(playerPedId)]
                end
                lastPlayerPedId = playerPedId
            end
            Citizen.Wait(1000)
        end
    end)

    Citizen.CreateThread(function()
        while IsAnimal do
            Citizen.InvokeNative(0x2804658EB7D8A50B, 2, `OnMount`) -- Reset control context
            DisableFirstPersonCamThisFrame()
            if IsControlJustPressed(0, `INPUT_ATTACK`) then Attack(); end -- Default 'LeftMouse'
            if IsControlJustPressed(0, `INPUT_HORSE_MELEE`) then -- Default 'F'
                Citizen.InvokeNative(0x7DE9692C6F64CFE8, lastPlayerPedId, not Citizen.InvokeNative(0xD5FE956C70FF370B, lastPlayerPedId), true) -- Swap crouch movement
            end
            if HasPredatorVision and IsControlJustPressed(0, `INPUT_DYNAMIC_SCENARIO`) then -- Default E
                LookAtEntity(700.0)
            end
            if IsControlJustPressed(0, 0xD9D0E1C0) then
                if GetEntityModel(lastPlayerPedId) == `a_c_chicken_01` then
                    TriggerEvent("da_xanims:queueAnim", "chicken_flap", "enter")
                end
            end
            Citizen.Wait(0)
        end
    end)
end


local SetPed = function(model, outfit)
    outfit = outfit or 0
    da_obj.load(model)
    SetPlayerModel(PlayerId(), model, false)
    SetPedOutfitPreset(PlayerPedId(), outfit, false)
    SetModelAsNoLongerNeeded(model)
    ApplyAnimalFix()
end

da_trie.add("devRoot", "ped", "p")
for pedName, pedData in pairs(peds) do
    da_trie.addOpt("ped", pedName, pedData.key or pedName:sub(1,1), function() SetPed(pedData.model, pedData.outfit) end)
end

cli.add_cmd("ped", { desc = "Ped commands"})
cli.add_subcmd("ped", "set", {
    desc = "Change ped model",
    args = { "model", "outfit" },
    fn = function(args) SetPed(GetHashKey(args.model), args.outfit) end,
})
cli.add_subcmd("ped", "get", {
    desc = "List ped models",
    fn = function(args) log.info(dat.getName(GetEntityModel(PlayerPedId()))) end,
})
cli.add_subcmd("ped", "outfit", { desc = "Change ped outfit", })
cli.add_subcmd("ped outfit", "set", {
    desc = "Change ped outfit",
    args = { "outfit" },
    fn = function(args)
        SetPedOutfitPreset(PlayerPedId(), tonumber(args.outfit), false)
    end,
})

da_trie.addOpt("devRoot", "horse", "h", function()
    local playerPedId = PlayerPedId()
    local horse = {
        entity = nil,
        model = `a_c_horse_turkoman_silver`,
        gender = 1, -- Female
        name = "Horse",
    }
    local pos = da_util.GetGroundPositionForward(
        GetEntityCoords(PlayerPedId()),
        6.0
    )
    horse.entity = da_obj.createPed(horse.model, pos, { network = true })
    if not horse.entity then
        log.error("Failed to create horse entity")
        return
    end

    SetPedNameDebug(horse.entity, horse.name)
    SetPedPromptName(horse.entity, horse.name)
    SetEntityAsMissionEntity(horse.entity, true, true)
    Citizen.InvokeNative(0x77FF8D35EEC6BBC4, horse.entity, 0, 0) -- EquipMetaPedOutfitPreset
    Citizen.InvokeNative(0x8FBF9EDB378CCB8C, PlayerId(), horse.entity) -- SetPedActivePlayerHorse
    Citizen.InvokeNative(0xD2CB0FB0FDCB473D, PlayerId(), horse.entity) -- SetPedAsSaddleHorseForPlayer
    Citizen.InvokeNative(0x06D26A96CA1BCA75, horse.entity, 3, 0.0, 0) -- SetPedMotivation
    Citizen.InvokeNative(0xADB3F206518799E8, horse.entity, `PLAYER`) -- SetPedRelationshipGroupDefaultHash
    Citizen.InvokeNative(0x4DB9D03AC4E1FA84, horse.entity, -1, -1, 0) -- SetPedWrithingDuration
    Citizen.InvokeNative(0xBCC76708E5677E1D9, horse.entity, 0) -- ?
    Citizen.InvokeNative(0xB8B6430EAD2D2437, horse.entity, `PLAYER_HORSE`)
    Citizen.InvokeNative(0xFD6943B6DF77E449, horse.entity, false) -- SetPedCanBeLassoed
    SetPedConfigFlag(horse.entity, 324, true)
    SetPedConfigFlag(horse.entity, 211, true)
    SetPedConfigFlag(horse.entity, 208, true)
    SetPedConfigFlag(horse.entity, 209, true)
    SetPedConfigFlag(horse.entity, 400, true)
    SetPedConfigFlag(horse.entity, 297, true)
    SetPedConfigFlag(horse.entity, 136, false)
    SetPedConfigFlag(horse.entity, 312, false)
    SetPedConfigFlag(horse.entity, 113, false)
    SetPedConfigFlag(horse.entity, 301, false)
    SetPedConfigFlag(horse.entity, 277, true)
    -- SetPedConfigFlag(horse.entity, 319, true) -- "Jump to horse"
    SetPedConfigFlag(horse.entity, 6, true)
    SetPedConfigFlag(horse.entity, 214, true)
    Citizen.InvokeNative(0x5653AB26C82938CF, horse.entity, 0xA28B, horse.gender+0.0) -- SetPedFaceFeature -- Set horse Gender using the face components system.
    Citizen.InvokeNative(0xCC8CA3E88256E58F, horse.entity, 0, 1, 1, 1, 0) -- UpdatePedVariation
    SetEntityAlpha(horse.entity, 255, false)
    SetEntityVisible(horse.entity, true, false)
    SetAttributePoints(horse.entity, 7, 99999)
    Citizen.InvokeNative(0x931B241409216C1F, playerPedId, horse.entity, false) -- SetPedOwnsAnimal to false - enables full bonding bonus attributes
end)
