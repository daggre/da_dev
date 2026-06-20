-- devRoot > weapons : give weapons and manage ammo via the da_weapon feature.
-- The give list is driven by the shared @da_lib/data/weapon.lua table
-- (dat.weapon) and organised into submenus by weapon group.

da_trie.add("devRoot", "weapons", "g")
da_trie.add("weapons", "give", "g")

-- Group hash -> menu label + menu key (key must be unique within "give").
-- dat.weapon stores group as a joaat hash, so we map it back to a label here.
local groups = {
    { hash = `group_melee`,      label = "melee",     key = "m" },
    { hash = `group_pistol`,     label = "pistol",    key = "p" },
    { hash = `group_repeater`,   label = "repeater",  key = "e" },
    { hash = `group_revolver`,   label = "revolver",  key = "r" },
    { hash = `group_rifle`,      label = "rifle",     key = "f" },
    { hash = `group_shotgun`,    label = "shotgun",   key = "s" },
    { hash = `group_sniper`,     label = "sniper",    key = "n" },
    { hash = `group_thrown`,     label = "thrown",    key = "t" },
    { hash = `group_held`,       label = "held",      key = "h" },
    { hash = `group_bow`,        label = "bow",       key = "b" },
    { hash = `group_fishingrod`, label = "fishing",   key = "g" },
    { hash = `group_lasso`,      label = "lasso",     key = "l" },
    { hash = `group_petrolcan`,  label = "petrolcan", key = "c" },
}

-- Hands out unique single-char menu keys within one submenu, preferring the
-- letters of a hint (e.g. the weapon name) before falling back to a pool.
local KEY_POOL = "1234567890abcdefghijklmnopqrstuvwxyz"
local newKeyAllocator = function()
    local used = {}
    return function(hint)
        if hint then
            for c in hint:lower():gmatch("%w") do
                if not used[c] then used[c] = true; return c end
            end
        end
        for c in KEY_POOL:gmatch(".") do
            if not used[c] then used[c] = true; return c end
        end
    end
end

-- Strip the leading class token for a tidier label (melee_knife -> knife).
local displayName = function(name)
    return name:match("^[^_]+_(.+)$") or name
end

-- Build the group submenus and weaponGroupSubmenu weapons into them.
local weaponGroupSubmenu = {}
for _, group in ipairs(groups) do
    da_trie.add("give", group.label, group.key)
    weaponGroupSubmenu[group.hash] = { label = group.label, nextKey = newKeyAllocator() }
end

for _, weapData in ipairs(dat.weapon) do
    local menu = weaponGroupSubmenu[weapData.group]
    if not menu then
        log.warn("da_dev weapons: weapon", weapData.name, "has unknown group", weapData.group)
    else
        local label = displayName(weapData.name)
        da_trie.addOpt(menu.label, label, menu.nextKey(label), function()
            -- give() resolves the correct attach point from the game (melee auto-places),
            -- and seeds reserve ammo via opts.ammo. See ADR-0005.
            da_weapon.give(weapData.hash, { ammo = 100 })
        end)
    end
end

-- Refill ammo on every listed weapon the player is carrying.
da_trie.addOpt("weapons", "refill", "r", function()
    for _, w in ipairs(dat.weapon) do
        if da_weapon.has(w.hash) then
            da_weapon.setReserve(w.hash, 9999)
        end
    end
end)

-- Toggle a never-needs-reloading clip across the player's weapons.
local infiniteClip = false
da_trie.addOpt("weapons", "inf ammo", "i", function()
    infiniteClip = not infiniteClip
    da_weapon.setInfiniteClip(infiniteClip)
    log.debug("Infinite clip", infiniteClip)
end)

-- Strip all weapons from the player.
da_trie.addOpt("weapons", "remove all", "x", function()
    da_weapon.removeAll()
end)

da_trie.addOpt("weapons", "debug", "d", function()
    da_weapon.debug()
end)
