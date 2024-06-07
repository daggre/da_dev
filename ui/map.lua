local HeritageSites = {
    { coords = vector3(-2239.451, 607.978, 118.222), }, -- Mother Tree
    { coords = vector3(-2663.869, 690.782, 184.386), }, -- Ancestral Cave
    { coords = vector3(-2153.554, 78.029, 311.003), }, -- First Fire
    { coords = vector3(-1980.855, 26.823, 332.064), }, -- Mt Shan peak
    { coords = vector3(-2691.714, -407.957, 147.404), }, -- Circle of Faces
    { coords = vector3(-2587.706, -93.596, 168.709), }, -- Burial Site
    { coords = vector3(-2935.732, -138.075, 198.807), } -- Obelisk
}

local UnlistedHeritageSites = {
    { coords = vector3(-1915.914, -28.13, 287.863), }, -- Waniyoni
    { coords = vector3(-2779.574, -434.406, 176.632), }, -- Unktehi
    { coords = vector3(-2121.299, 28.788, 266.827), }, -- Cave
    { coords = vector3(-2332.567, 102.892, 222.399), }, -- Cave
    { coords = vector3(-1517.486, 731.361, 126.618), }, -- Bear Cave
    { coords = vector3(-2888.396, 116.739, 193.12), }, -- Water Source
    { coords = vector3(-2606.11, 1232.782, 228.898), }, -- Water Source
}

local Blips = {}
local BlipColors = {
    blue = `BLIP_MODIFIER_MP_COLOR_1`,
    red = `BLIP_MODIFIER_MP_COLOR_2`,
    darkgreen = `BLIP_MODIFIER_MP_COLOR_20`,
}

local AddBlipRadius = function(coords, radius, color)
    local blip = Citizen.InvokeNative(0x45F13B7E0A15C880, 1664425300, coords.xyz, radius) -- AddBlipForRadius
    SetBlipSprite(blip, `blip_mp_location_h`, false)
    Citizen.InvokeNative(0x662D364ABF16DE2F, blip, BlipColors[color] or `BLIP_MODIFIER_MP_COLOR_1`)
    Citizen.InvokeNative(0x9CB1A1623062F402, blip, "Heritage Site")
    table.insert(Blips, blip)
end

local HeritageBlipsEnabled = false

local ToggleHeritageSites = function()
    HeritageBlipsEnabled = not HeritageBlipsEnabled
    if HeritageBlipsEnabled then
        for _, hSite in ipairs(UnlistedHeritageSites) do
            AddBlipRadius(hSite.coords, 100.1, "red")
        end
        for _, hSite in ipairs(HeritageSites) do
            AddBlipRadius(hSite.coords, 100.1, "darkgreen")
        end
    else
        for _, blip in ipairs(Blips) do
            RemoveBlip(blip)
        end
        Blips = {}
    end
end

RegisterCommand("da_toggle_heritage_blips", function(source, args, rawCommand)
    ToggleHeritageSites()
end, false)
