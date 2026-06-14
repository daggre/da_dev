-- devRoot > weapons : give weapons and manage ammo via the da_weapon feature.

da_trie.add("devRoot", "weapons", "g")
da_trie.add("weapons", "give", "g")

-- Give list is driven by the shared @da_lib/data/weapon.lua table (dat.weapon).
for i, w in ipairs(dat.weapon) do
    da_trie.addOpt("give", w.name, w.key or tostring(i), function()
        da_weapon.give(w.hash, { ammo = w.ammo or 100, equip = true })
    end)
end

-- Refill ammo on every listed weapon the player is carrying.
da_trie.addOpt("weapons", "refill", "r", function()
    for _, w in ipairs(dat.weapon) do
        if da_weapon.has(w.hash) then
            da_weapon.setAmmo(w.hash, 9999)
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
