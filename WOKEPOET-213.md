---
id: WOKEPOET-213
title: 'Loot filter presets, second batch (12 one-click presets)'
status: In Progress
priority: Medium
effort: L
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-12T09:48:31.385Z'
    comment: Created ticket.
    id: a-2026-11-12t09-48-31-385z
  - type: activity
    user: Agent
    date: '2026-11-12T09:48:52.883Z'
    comment: >-
      Implemented on woke/presets-batch2 (0467537b): 12 presets, tests
      (filter-presets-2 + all-levels check in filter-rules), lint/tsc/3106
      tests/build pass, all JS 4904 KB. Adversarial review running.
    id: a-2026-11-12t09-48-52-883z
  - type: activity
    user: Agent
    date: '2026-11-12T10:04:52.979Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/389 open. Review found 4
      bugs (ilvl84 jewellery hidden, influenced maps hidden, vendor gem rule
      over 21/20 & 23q gems on Uber+, vendor flasks over endgame tiers), all
      fixed with real-NeverSink tests. Asked the coordinator to merge via the
      cloud thread.
    id: a-2026-11-12t10-04-52-979z
---
Guy's picks for a second batch of Presets tab rows (all default off): hide white/blue gear in maps, cheap div cards, maps below tier N, flasks in maps, cheap uniques in maps, cheap splinter stacks, MS boots while levelling, R-G-B items in maps, 20% quality gems/flasks for the vendor, drop sound volume %, beams/icons for top tiers only, weapons for a build type while levelling (Auto from PoB / Caster / Melee / Bow / Minion).

Skipped by Guy: regal recipe. Deferred: tiered magic/rare drops (3.30 launch day, TODO in presets.ts).

Branch: woke/presets-batch2 (worktree E:\Git\woke-poe-trade-presets2).
