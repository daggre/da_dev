if da.Util.IsDev then
    RegisterCommand("globalstate", function(source, args, rawCommand)
        if args[1] == "get" then
            local key = args[2]
            da.Log.Info(GlobalState[key])
        elseif args[1] == "set" then
            local key = args[2]
            local value = args[3]
            local pValue = GlobalState[key]
            if key and value then
                GlobalState[key] = value
                da.Log.Info(("%s -> %s"):format(pValue, GlobalState[key]))
            end
        end
    end, false)
end
