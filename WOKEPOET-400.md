---
id: WOKEPOET-400
title: 'Boss runs: add Catarina and other missing bosses; Saresh belt unid price'
status: Done
priority: None
effort: S
assignee: unassigned
tags:
  - boss-runs
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-19T15:03:15.493Z'
    comment: Created ticket.
    id: a-2026-11-19t15-03-15-493z
  - type: activity
    user: Agent
    date: '2026-11-19T15:03:59.963Z'
    comment: >-
      Pushed woke/boss-catarina (1613fdc7). Review clean; typecheck, lint, 4686
      unit tests pass. Handed to coordinator for merge + dev build.
    id: a-2026-11-19t15-03-59-963z
  - type: comment
    user: Agent
    comment: >-
      Merged as PR 658. Screams of the Desiccated base confirmed as Leather Belt
      in game item data and poe.ninja.
    date: '2026-11-19T15:10:58.689Z'
    completionComment: true
    id: c-2026-11-19t15-10-58-689z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-19T15:10:58.689Z'
  - type: comment
    user: Agent
    comment: >-
      Catarina, Elder, Incarnations + Ubers, Oshabi, Hive Colony, Zorath added
      to Boss runs; Screams of the Desiccated priced unidentified (base Leather
      Belt confirmed). Merged as PR 658.
    completionComment: true
    date: '2026-11-19T15:10:59.972Z'
    id: c-2026-11-19t15-10-59-972z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-19T15:11:00.473Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/658'
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
Guy asked why Catarina isn't in Boss runs. The boss table (renderer/src/web/woke/boss-runs/bosses.ts) is hand-typed and never had her.

Branch `woke/boss-catarina` adds Catarina (Syndicate Medallion), The Elder, Incarnations of Fear/Neglect/Dread + Uber versions, Oshabi, Hive Colony, Zorath. Drops from poe.how (measured rates where present: Fear 2439 kills, Zorath 208, Hive 10), Path of Kalandra estimates for the rest. Screams of the Desiccated (Saresh) now priced from unidentified trade listings. Elder arena counts as the 'elder' run.

Skipped: Aul, Trialmaster (scarab entries, no scarabs in 3.30), Chayula (no breachstone in 3.30 data), Velka (no poe.ninja rows in Covens).
