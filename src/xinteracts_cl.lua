-- Dev menu hook for da_xinteracts. Decoupled: fires an event da_xinteracts listens
-- for, so da_dev doesn't hard-depend on it (no-op if absent). Runs the condition
-- debug: logs each predicate + its evaluated output (player/world, plus entity
-- predicates against the nearest entity that has interacts).
da_trie.addOpt("devRoot", "xint cond", "x", function()
    TriggerEvent("da_xinteracts:debugConditions")
end)
