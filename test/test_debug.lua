RegisterCommand("dadev_test_debug", function(source, args, rawCommand)
    local z = 3

    local testFn = function(y)
        local x = 1
        print(z)
        for _ = 1, 10 do
            da.Debug:Breakpoint(_ == 8 or x == 3)
            x = x + y
        end

        da.Debug:Breakpoint()
        return x
    end

    print(testFn(2))
    da.Debug:Breakpoint()
end, false)
