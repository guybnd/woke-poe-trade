---
id: WOKEPOET-637
title: 'Run summary: rename, reconcile, cost fix'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - feature
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-26T05:10:26.940Z'
    comment: Created ticket.
    id: a-2026-11-26t05-10-26-940z
  - type: comment
    user: Agent
    comment: Merged at 0bc8bdf; dev build reloaded.
    completionComment: true
    date: '2026-11-26T05:10:41.854Z'
    id: c-2026-11-26t05-10-41-854z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-26T05:10:42.345Z'
  - type: comment
    user: Agent
    comment: >-
      Follow-up PR 962 (https://github.com/guybnd/woke-poe-trade/pull/962,
      b74423e): the In row shows the run's own part, with the pre-run listings
      part crossed out underneath.
    date: '2026-11-26T06:50:38.412Z'
    selfAttested: true
    id: c-2026-11-26t06-50-38-412z
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/961'
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
Net worth runs (Guy, 2026-11-26): rename a run, In − Out adds up to Profit, "Per map, no best drop" column, map cost fixed on older runs. PR: https://github.com/guybnd/woke-poe-trade/pull/961 (0bc8bdf).
