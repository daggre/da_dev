TMC = exports.core:getCoreObject()
da = exports.da_lib:importLib()
da.Log.Register(function(msg) print(msg) end)

local DryRun = true

local MinId = 0
local MaxId = 120000
local BatchInterval = 4000

local ResultStats = {
    total = 0,
    updated = 0,
    skipped = {},
    failed = {},
}

function ResetStats()
    ResultStats.total = 0
    ResultStats.updated = 0
    ResultStats.skipped = {}
    ResultStats.failed = {}
end

function PrintStats()
    if DryRun then
        da.Log.Info("Dry run, no changes made.")
    end
    da.Log.Info("\n-Stats-------------")
    da.Log.Info(("  Total:     %5d"):format(ResultStats.total))
    da.Log.Info(("  Updated:   %5d"):format(ResultStats.updated))
    da.Log.Info(("  Skipped:   %5d"):format(#ResultStats.skipped))
    da.Log.Info(("  Failed:    %5d"):format(#ResultStats.failed))
    da.Log.Info("-------------------")
    da.Log.DebugVerbose("Failed IDs: ", ResultStats.failed)
    da.Log.DebugVerbose("Skipped IDs: ", ResultStats.skipped)
end

function setUpJob()
    ResetStats()
    da.Log.Info("Starting job...")
end

function tearDownJob()
    PrintStats()
    DryRun = true
    da.Log.Info("Job finished.")
end

function UpdateDbRep(result)
    local metadata = json.decode(result.metadata)
    local rep = json.decode(result.rep)
    local id = result['#']

    if not metadata then
        da.Log.Error("No metadata found.", result)
        return
    elseif not rep then
        rep = {}
    end

    local repMap = {
        ["cooking"] = "cookingrep",
    }

    local repTypes = {
        "desertrep",
        "craftingrep",
        "miningrep",
        "lumberrep",
        "cooking",
        "cookingrep",
        "medicinerep",
        "bartendingrep",
        "fishingrep",
        "rodeobuckrep",
        "graverobbing",
        "blackmarketrep",
        "safecrackrep",
        "lockbreakrep",
        "attachmentcraftingrep",
    }

    local jobRepTypes = {
        "farmhand",
        "deliveryrep",
    }

    for _, repType in ipairs(repTypes) do
        mapRepType = repMap[repType] or repType
        if metadata[repType] then
            if not rep[mapRepType] then
                if tonumber(metadata[repType]) > 0 then
                    rep[mapRepType] = tonumber(metadata[repType])
                end
            elseif rep[mapRepType] then
                rep[mapRepType] = tonumber(rep[mapRepType]) + tonumber(metadata[repType])
            else
                da.Log.Debug("Invalid case:", repType)
            end
        end
        metadata[repType] = nil
        if metadata['jobrep'] then
            for _, jobRepType in ipairs(jobRepTypes) do
                if metadata['jobrep'][jobRepType] then
                    if not rep[jobRepType] then
                        rep[jobRepType] = tonumber(metadata['jobrep'][jobRepType])
                    elseif rep[jobRepType] then
                        rep[jobRepType] = tonumber(rep[jobRepType]) + tonumber(metadata['jobrep'][jobRepType])
                    else
                        da.Log.Debug("Invalid case:", jobRepType)
                    end
                end
            end
        end
        metadata['jobrep'] = nil
        metadata['ubi'] = nil
    end

    local updatedResult = {
        metadata = metadata,
        rep = rep,
        id = id,
    }

    return updatedResult
end

RegisterCommand("__da_db_update_rep", function(source, args, rawCommand)
    setUpJob()
    DryRun = args[1] ~= "update"

    local querySELECT = "SELECT `metadata`,`rep`,`#` from `players` WHERE `#` >= @interval AND `#` < @interval + @batchInterval"
    local queryUPDATE = "UPDATE `players` SET `metadata` = @metadata, `rep` = @rep WHERE `#` = @id"

    for interval = MinId, MaxId, BatchInterval do
        da.Log.Info("Interval:", interval, "to", interval + BatchInterval)
        TMC.Functions.ExecuteSqlSync(
            querySELECT,
            {
                ["@interval"] = interval,
                ["@batchInterval"] = BatchInterval
            }, function(result)
                if not result then
                    da.Log.Error("No SQL Result.")
                    return
                end
                if result then
                    for _, thisResult in ipairs(result) do
                        local updatedResult = UpdateDbRep(thisResult)

                        ResultStats.total = ResultStats.total + 1
                        if not updatedResult or not updatedResult.id then
                            table.insert(ResultStats.skipped, thisResult['#'])
                            da.Log.Debug("Skipped:", thisResult['#'])
                            return
                        elseif not DryRun then
                            TMC.Functions.ExecuteSql(queryUPDATE, {
                                ["@metadata"] = json.encode(updatedResult.metadata),
                                ["@rep"] = json.encode(updatedResult.rep),
                                ["@id"] = updatedResult.id
                            }, function(final)
                                    if final then
                                        ResultStats.updated = ResultStats.updated + final.changedRows
                                    else
                                        table.insert(ResultStats.failed, result['#'])
                                    end
                                end, function(error)
                                    da.Log.Error("DB Error:", error)
                                end)
                        else
                            -- da.Log.Verbose(updatedResult)
                            ResultStats.updated = ResultStats.updated + 1
                        end
                    end
                    Citizen.Wait(250)
                end
            end, function(error)
                da.Log.Error("DB Error:", error)
            end)
    end

    tearDownJob()
end, false)
