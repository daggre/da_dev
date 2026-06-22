-- Dev menu hook for the da_tack horse-tack editor. Decoupled: fires an event
-- da_tack listens for, so da_dev doesn't hard-depend on it (no-op if absent).
da_trie.addOpt("devRoot", "tack", "s", function()
    TriggerEvent("da_tack:toggle")
end)
