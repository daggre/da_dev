cli.add_cmd("globalstate", { desc = "RedM Globalstate vars"})
cli.add_subcmd("globalstate", "get", {
    desc = "Get globalstate key value",
    args = { "key" },
    fn = function(args) log.info(GlobalState[args.key]) end,
})
cli.add_subcmd("globalstate", "set", {
    desc = "Set globalstate key value",
    args = { "key", "value" },
    fn = function(args)
        local pValue = GlobalState[args.key]
        if args.key and args.value then
            GlobalState[args.key] = args.value
            log.info(("%s -> %s"):format(pValue, GlobalState[args.key]))
        end
    end,
})
