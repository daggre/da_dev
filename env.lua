local freezeTime = false
local freezeWeather = false
local freezeWind = false

local currentHour = 12
local currentMinute = 0

da.Dev.Menu.RegisterMenu("root", "environ", "w")
da.Dev.Menu.RegisterMenu("environ", "time", "t")
da.Dev.Menu.RegisterMenu("environ", "weather", "w")
da.Dev.Menu.RegisterMenu("environ", "wind", "d")

da.Dev.Menu.RegisterOption("wind", "frz wind", "z", function()
    freezeWind = true
    TMC.Functions.TriggerServerEvent("weather:server:set", { type = "wind", isFrozen = freezeWind, })
end, function() return not freezeWind end)

da.Dev.Menu.RegisterOption("wind", "unfrz wind", "z", function()
    freezeWind = false
    TMC.Functions.TriggerServerEvent("weather:server:set", { type = "wind", isFrozen = freezeWind, })
end, function() return freezeWind end)

da.Dev.Menu.RegisterOption("weather", "unfrz wthr", "z", function()
    freezeWeather = false
    TMC.Functions.TriggerServerEvent("weather:server:set", { type = "weather", isFrozen = freezeWeather, })
end, function() return freezeWeather end)

da.Dev.Menu.RegisterOption("weather", "frz wthr", "z", function()
    freezeWeather = true
    TMC.Functions.TriggerServerEvent("weather:server:set", { type = "weather", isFrozen = freezeWeather, })
end, function() return not freezeWeather end)

da.Dev.Menu.RegisterOption("time", "frz time", "z", function()
    freezeTime = true
    TMC.Functions.TriggerServerEvent("weather:server:set", {
        type = "time",
        isFrozen = freezeTime,
        day = 1,
        hour = currentHour or 12,
        minute = currentMinute or 0,
        second = 0,
    })
end, function() return not freezeTime end)

da.Dev.Menu.RegisterOption("time", "unfrz time", "z", function()
    freezeTime = false
    TMC.Functions.TriggerServerEvent("weather:server:set", {
        type = "time",
        isFrozen = freezeTime,
        day = 1,
        hour = currentHour or 12,
        minute = currentMinute or 0,
        second = 0,
    })
end, function() return freezeTime end)

local timeOptions = {
    { name = "dawn", hour = 5, minute = 30 },
    { name = "sunrise", hour = 6, minute = 0 },
    { name = "morning", hour = 8, minute = 0 },
    { name = "noon", hour = 12, minute = 0 },
    { name = "dusk", hour = 18, minute = 0 },
    { name = "sunset", hour = 20, minute = 0 },
    { name = "evening", hour = 20, minute = 0 },
    { name = "night", hour = 2, minute = 0 },
}

for i, option in ipairs(timeOptions) do
    da.Dev.Menu.RegisterOption("time", option.name, tostring(i), function()
        currentHour = option.hour
        currentMinute = option.minute
        freezeTime = true
        TMC.Functions.TriggerServerEvent("weather:server:set", {
            type = "time",
            isFrozen = freezeTime,
            day = 1,
            hour = option.hour or 12,
            minute = option.minute or 0,
            second = 0,
        })
    end)
end

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
