---
id: WOKEPOET-641
title: Fix Timeless jewel price check
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - bug
  - price-check
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-26T09:48:03.955Z'
    comment: Created ticket.
    id: a-2026-11-26t09-48-03-955z
  - type: comment
    user: Agent
    comment: Merged at d3400c2; dev build reloaded.
    completionComment: true
    date: '2026-11-26T09:48:07.718Z'
    id: c-2026-11-26t09-48-07-718z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-26T09:48:10.685Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/966'
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
Glorious Vanity price check failed. Cause: stale conqueror name Mazcotl in the stat data. PR: https://github.com/guybnd/woke-poe-trade/pull/966 (d3400c2).
