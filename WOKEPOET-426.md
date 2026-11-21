---
id: WOKEPOET-426
title: 'Session story: exclude vaults and other areas from maps, times and averages'
status: Done
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
    id: a-2026-11-21t02-39-09-153z
  - type: comment
    user: Agent
    comment: >-
      Merged #694: vault skip list (defaults: four 3.30 vaults, by id and name),
      faint strip part, Settings box, old rows filtered. Reviewed; CI green.
    date: '2026-11-21T02:58:42.229Z'
    completionComment: true
    id: c-2026-11-21t02-58-42-229z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T02:58:42.229Z'
  - type: comment
    user: Agent
    comment: >-
      Vaults left out of Session story maps, times, averages, deaths and toast;
      list editable in Settings. Farming module and Session analytics
      per-session counts still count vaults (out of scope).
    completionComment: true
    date: '2026-11-21T02:58:43.348Z'
    id: c-2026-11-21t02-58-43-348z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T02:58:44.752Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/694'
swimlane: null
diffSummary:
  - file: renderer/src/web/woke/pob-builds/BuildDetail.vue
    additions: 4
    deletions: 4
  - file: renderer/src/web/woke/pob-builds/build-model.ts
    additions: 14
    deletions: 0
  - file: renderer/test/woke/pob-builds.test.ts
    additions: 39
    deletions: 1
---
Guy (2026-11-21): exclude areas such as vaults, reliquaries etc from the summary, timers and averages.

Client.txt check: reliquaries (ClassicTreasury_*, UberUberElderVault, 1_5_7) aren't Map* areas, so already not counted. Counted today: MapWorldsMemoryVault1-4 = Machinist's, Zealot's, Arkhon's, Scholar's Vault. Encounter rooms (MapAtlasEncounter_*) already stay in their map's run.

Plan: skip list by area name in the Session story settings, default the four vaults. Skipped areas: no map record or toast, not in map counts, map time, hideout time, averages or the strip.
