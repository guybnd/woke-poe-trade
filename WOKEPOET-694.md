---
id: WOKEPOET-694
title: 'M1: our own price guesses from poe.ninja league history'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - loot-filter
  - prices
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-692
history:
  - type: activity
    user: Agent
    date: '2026-11-28T04:55:12.184Z'
    comment: Created ticket.
    id: a-2026-11-28t04-55-12-184z
  - type: activity
    user: Agent
    date: '2026-11-28T04:55:12.184Z'
    comment: Created as subtask of WOKEPOET-692.
    id: a-2026-11-28t04-55-12-184z
  - type: status_change
    from: Todo
    to: In Progress
    user: Agent
    date: '2026-11-28T05:17:41.058Z'
  - type: activity
    user: Agent
    date: '2026-11-28T05:17:42.442Z'
    comment: Updated implementation link.
    id: a-2026-11-28t05-17-42-442z
  - type: comment
    user: Agent
    comment: PR 1061 merged as e7e410a.
    date: '2026-11-28T06:35:43.375Z'
    completionComment: true
    id: c-2026-11-28t06-35-43-375z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-28T06:35:43.375Z'
  - type: comment
    user: Agent
    comment: PR 1061 merged as e7e410a.
    completionComment: true
    date: '2026-11-28T06:35:49.020Z'
    id: c-2026-11-28t06-35-49-020z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-28T06:35:50.231Z'
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/1061'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
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
A per-item typical price from poe.ninja league history replaces NeverSink's tier guesses. The unique sections (early league, high variance, boss) come from our data.
