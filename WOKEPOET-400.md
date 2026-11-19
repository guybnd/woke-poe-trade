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
---
Guy asked why Catarina isn't in Boss runs. The boss table (renderer/src/web/woke/boss-runs/bosses.ts) is hand-typed and never had her.

Branch `woke/boss-catarina` adds Catarina (Syndicate Medallion), The Elder, Incarnations of Fear/Neglect/Dread + Uber versions, Oshabi, Hive Colony, Zorath. Drops from poe.how (measured rates where present: Fear 2439 kills, Zorath 208, Hive 10), Path of Kalandra estimates for the rest. Screams of the Desiccated (Saresh) now priced from unidentified trade listings. Elder arena counts as the 'elder' run.

Skipped: Aul, Trialmaster (scarab entries, no scarabs in 3.30), Chayula (no breachstone in 3.30 data), Velka (no poe.ninja rows in Covens).
