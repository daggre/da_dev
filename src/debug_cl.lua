local debugMessageQueue = {}

local da_debug = {}
function da_debug:Breakpoint(condition)
    if condition ~= nil and condition ~= true then return end

    debugMessageQueue = {}
    local info = debug.getinfo(2, "Sln")
    local pause = true
    log.debug(("Breakpoint hit at %s:%d in function '%s'"):format(info.short_src, info.currentline, info.name or "unknown"))


    while pause do
        Citizen.Wait(100)

        -- Wait for instruction
        local msg = table.remove(debugMessageQueue, 1)
        if msg then
            if msg.cmd == "continue" then
                log.debug("Continuing")
                pause = false
            elseif msg.cmd == "print" then
                self:GetLocalVar(3, msg.args[1])
            elseif msg.cmd == "printall" then
                self:GetLocalVar(3, nil, true)
            -- elseif msg.cmd == "upvalue" then -- This dumps _ENV which is big
            --     self:GetUpValue(3, msg.args[1])
            elseif msg.cmd == "backtrace" then
                self:Backtrace(3)
            end
        end
    end
end

function da_debug:GetLocalVar(level, name, all)
    local index = 1
    while true do
        local var, value = debug.getlocal(level, index)
        if not var then break end
        if all or name == var then
            log.debug(var, value)
            if not all then break end
        end
        index = index + 1
    end
end

function da_debug:GetUpValue(level, name)
    local index = 1
    -- TODO: maybe grow the level for upvalue search
    while true do
        local var, value = debug.getlocal(level, index)
        if not var then break end
        if name == var then
            log.debug(var, value)
            return
        end
        index = index + 1
    end

    local info = debug.getinfo(level, "f")
    index = 1
    while true do
        local var, value = debug.getupvalue(info.func, index)
        log.debug(var, value)
        if not var then break end
        if name == var then
            log.debug(var, value)
            return
        end
        index = index + 1
    end
end

function da_debug:Backtrace(level)
    while true do
        local info = debug.getinfo(level, "Sln")
        if not info or info.short_src:find("citizen:/") then break end
        log.debug(("%d: %s:%d in function '%s'"):format(level, info.short_src, info.currentline, info.name or "unknown"))
        level = level + 1
    end
end

RegisterCommand("n", function(source, args, rawCommand)
    table.insert(debugMessageQueue, { cmd = "continue" })
end, false)
RegisterCommand("c", function(source, args, rawCommand)
    table.insert(debugMessageQueue, { cmd = "continue" })
end, false)
RegisterCommand("bt", function(source, args, rawCommand)
    table.insert(debugMessageQueue, { cmd = "backtrace" })
end, false)
RegisterCommand("p", function(source, args, rawCommand)
    if args[1] == nil then
        log.warn("No variable name provided.")
        return
    end
    if args[1] == "all" then
        table.insert(debugMessageQueue, { cmd = "printall" })
    else
        table.insert(debugMessageQueue, { cmd = "print", args = args })
    end
end, false)
RegisterCommand("u", function(source, args, rawCommand)
    if args[1] == nil then
        log.warn("No variable name provided.")
        return
    end
    table.insert(debugMessageQueue, { cmd = "upvalue", args = args })
end, false)

_ENV.da_dbg = da_debug
