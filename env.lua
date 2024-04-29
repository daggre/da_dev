local freezeTime = false
local freezeWeather = false
local freezeWind = false

local currentHour = 12

da.Dev.Menu.RegisterMenu("root", "env", "e")
da.Dev.Menu.RegisterMenu("env", "time", "t")
da.Dev.Menu.RegisterMenu("env", "weather", "w")
-- da.Dev.Menu.RegisterMenu("env", "wind", "d")

da.Dev.Menu.RegisterOption("time", "frz time", "z", function()
    freezeTime = true
    TMC.Functions.TriggerServerEvent("weather:server:set", {
        type = "time",
        isFrozen = freezeTime,
        day = 1,
        hour = currentHour,
        minute = 0,
        second = 0,
    })
end, function() return not freezeTime end)

da.Dev.Menu.RegisterOption("weather", "frz wthr", "z", function()
    freezeWeather = true
    TMC.Functions.TriggerServerEvent("weather:server:set", { type = "weather", isFrozen = freezeWeather, })
end, function() return not freezeWeather end)

da.Dev.Menu.RegisterOption("wind", "frz wind", "z", function()
    freezeWind = true
    TMC.Functions.TriggerServerEvent("weather:server:set", { type = "wind", isFrozen = freezeWind, })
end, function() return not freezeWind end)

da.Dev.Menu.RegisterOption("time", "unfrz time", "z", function()
    freezeTime = false
    TMC.Functions.TriggerServerEvent("weather:server:set", {
        type = "time",
        isFrozen = freezeTime,
        day = 1,
        hour = currentHour,
        minute = 0,
        second = 0,
    })
end, function() return freezeTime end)

da.Dev.Menu.RegisterOption("weather", "unfrz wthr", "z", function()
    freezeWeather = false
    TMC.Functions.TriggerServerEvent("weather:server:set", { type = "weather", isFrozen = freezeWeather, })
end, function() return freezeWeather end)

da.Dev.Menu.RegisterOption("wind", "unfrz wind", "z", function()
    freezeWind = false
    TMC.Functions.TriggerServerEvent("weather:server:set", { type = "wind", isFrozen = freezeWind, })
end, function() return freezeWind end)

da.Dev.Menu.RegisterOption("time", "dawn", "1", function()
    currentHour = 5
    TMC.Functions.TriggerServerEvent("weather:server:set", {
        type = "time",
        isFrozen = freezeTime,
        day = 1,
        hour = currentHour,
        minute = 30,
        second = 0,
    })
end)

da.Dev.Menu.RegisterOption("time", "sunrise", "2", function()
    currentHour = 6
    TMC.Functions.TriggerServerEvent("weather:server:set", {
        type = "time",
        isFrozen = freezeTime,
        day = 1,
        hour = currentHour,
        minute = 0,
        second = 0,
    })
end)

da.Dev.Menu.RegisterOption("time", "morning", "3", function()
    currentHour = 8
    TMC.Functions.TriggerServerEvent("weather:server:set", {
        type = "time",
        isFrozen = freezeTime,
        day = 1,
        hour = currentHour,
        minute = 0,
        second = 0,
    })
end)

da.Dev.Menu.RegisterOption("time", "noon", "4", function()
    currentHour = 12
    TMC.Functions.TriggerServerEvent("weather:server:set", {
        type = "time",
        isFrozen = freezeTime,
        day = 1,
        hour = currentHour,
        minute = 0,
        second = 0,
    })
end)

da.Dev.Menu.RegisterOption("time", "dusk", "5", function()
    currentHour = 18
    TMC.Functions.TriggerServerEvent("weather:server:set", {
        type = "time",
        isFrozen = freezeTime,
        day = 1,
        hour = currentHour,
        minute = 0,
        second = 0,
    })
end)

da.Dev.Menu.RegisterOption("time", "sunset", "6", function()
    currentHour = 20
    TMC.Functions.TriggerServerEvent("weather:server:set", {
        type = "time",
        isFrozen = freezeTime,
        day = 1,
        hour = currentHour,
        minute = 0,
        second = 0,
    })
end)

da.Dev.Menu.RegisterOption("time", "evening", "7", function()
    currentHour = 20
    TMC.Functions.TriggerServerEvent("weather:server:set", {
        type = "time",
        isFrozen = freezeTime,
        day = 1,
        hour = currentHour,
        minute = 0,
        second = 0,
    })
end)

da.Dev.Menu.RegisterOption("time", "night", "8", function()
    currentHour = 2
    TMC.Functions.TriggerServerEvent("weather:server:set", {
        type = "time",
        isFrozen = freezeTime,
        day = 1,
        hour = currentHour,
        minute = 0,
        second = 0,
    })
end)

local weatherTypes = {
    blizzard = "blizzard",
    cloudy = "clouds",
    drizzle = "drizzle",
    fog = "fog",
    hail = "hail",
    sunny = "highpressure",
    windyrain = "hurricane",
    mist = "misty",
}

for title, weatherName in pairs(weatherTypes) do
    da.Dev.Menu.RegisterOption("weather", title, title:sub(1, 1), function()
        TMC.Functions.TriggerServerEvent("weather:server:set", {
            type = "weather",
            isFrozen = freezeWeather,
            weather = weatherName,
        })
    end)
end
