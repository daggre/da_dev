-- Dev menu hook for the da_wardrobe clothing editor. Decoupled: fires an event
-- da_wardrobe listens for, so da_dev doesn't hard-depend on it (no-op if absent).
da_trie.addOpt("devRoot", "wardrobe", "d", function()
    TriggerEvent("da_wardrobe:toggle")
end)
