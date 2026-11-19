---
id: WOKEPOET-400
title: 'Boss runs: add Catarina and other missing bosses; Saresh belt unid price'
status: In Progress
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
---
Guy asked why Catarina isn't in Boss runs. The boss table (renderer/src/web/woke/boss-runs/bosses.ts) is hand-typed and never had her.

Branch `woke/boss-catarina` adds Catarina (Syndicate Medallion), The Elder, Incarnations of Fear/Neglect/Dread + Uber versions, Oshabi, Hive Colony, Zorath. Drops from poe.how (measured rates where present: Fear 2439 kills, Zorath 208, Hive 10), Path of Kalandra estimates for the rest. Screams of the Desiccated (Saresh) now priced from unidentified trade listings. Elder arena counts as the 'elder' run.

Skipped: Aul, Trialmaster (scarab entries, no scarabs in 3.30), Chayula (no breachstone in 3.30 data), Velka (no poe.ninja rows in Covens).
