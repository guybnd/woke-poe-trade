---
id: WOKEPOET-659
title: >-
  Map check: farming goal searched More Currency/Maps/Threads on maps without
  them
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-27T11:38:16.217Z'
    comment: Created ticket.
    id: a-2026-11-27t11-38-16-217z
  - type: comment
    user: Agent
    comment: Merged at 0dca060; dev build reloaded.
    completionComment: true
    date: '2026-11-27T12:05:42.413Z'
    id: c-2026-11-27t12-05-42-413z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-27T12:05:43.050Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/1001'
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
Farming goals searched for More Currency/Maps/Threads numbers even when the map didn't have them; they no longer do. PR: https://github.com/guybnd/woke-poe-trade/pull/1001 (0dca060).
