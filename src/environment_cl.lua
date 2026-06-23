da_trie.add("devRoot", "world", "w")
da_trie.add("world", "time", "t")
da_trie.add("world", "weather", "w")

local timeOptions = {
    { name = "dawn", hour = 5, minute = 30 },
    { name = "sunrise", hour = 6, minute = 0 },
    { name = "morning", hour = 8, minute = 0 },
    { name = "noon", hour = 12, minute = 0 },
    { name = "dusk", hour = 18, minute = 0 },
    { name = "sunset", hour = 20, minute = 0 },
    { name = "evening", hour = 21, minute = 0 },
    { name = "night", hour = 2, minute = 0 },
}

for i, option in ipairs(timeOptions) do
    da_trie.addOpt("time", option.name, tostring(i), function()
        local freezeTime = true
        Citizen.InvokeNative(0x669E223E64B1903C, option.hour, option.minute, 0, 0, freezeTime) -- NetworkClockTimeOverride
    end)
end

local weatherTypes = {
    blizzard = "b",
    -- cloudy = "c", -- TODO: NOT WORKING
    drizzle = "d",
    fog = "f",
    groundblizzard = "g",
    hail = "h",
    highpressure = "p",
    hurricane = "u",
    misty = "m",
    overcast = "o",
    overcastdark = "k",
    rain = "r",
    sandstorm = "s",
    -- showers = "w", -- TODO: NOT WORKING
    sleet = "l",
    snow = "n",
    snowlight = "i",
    sunny = "y",
    thunder = "t",
    thunderstorm = "z",
    whiteout = "x",
}

for weatherName, key in pairs(weatherTypes) do
    da_trie.addOpt("weather", weatherName, key, function()
        -- Client Only
        local transitionTime = 10 -- Seconds
        Citizen.InvokeNative(0x59174F1AFE095B5A, GetHashKey(weatherName), true, false, true, transitionTime, false) -- SetWeatherType
    end)
end
