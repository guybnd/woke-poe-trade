---
id: WOKEPOET-426
title: 'Session story: exclude vaults and other areas from maps, times and averages'
status: In Progress
priority: Medium
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-21T02:39:09.153Z'
    comment: Created ticket.
---
Guy (2026-11-21): exclude areas such as vaults, reliquaries etc from the summary, timers and averages.

Client.txt check: reliquaries (ClassicTreasury_*, UberUberElderVault, 1_5_7) aren't Map* areas, so already not counted. Counted today: MapWorldsMemoryVault1-4 = Machinist's, Zealot's, Arkhon's, Scholar's Vault. Encounter rooms (MapAtlasEncounter_*) already stay in their map's run.

Plan: skip list by area name in the Session story settings, default the four vaults. Skipped areas: no map record or toast, not in map counts, map time, hideout time, averages or the strip.
