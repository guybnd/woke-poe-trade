---
id: WOKEPOET-558
title: 'Crafting run kind in Runs (Used, Made, Sold)'
status: Released
priority: None
effort: None
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Guy
parentId: WOKEPOET-555
history:
  - type: activity
    user: Agent
    date: '2026-11-24T07:25:04.079Z'
    comment: Created ticket.
    id: a-2026-11-24t07-25-04-079z
  - type: activity
    user: Agent
    date: '2026-11-24T07:25:04.079Z'
    comment: Created as subtask of WOKEPOET-555.
    id: a-2026-11-24t07-25-04-079z
  - type: comment
    user: Agent
    comment: Shipped in PR 867.
    date: '2026-11-24T08:15:57.282Z'
    completionComment: true
    id: c-2026-11-24t08-15-57-282z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-24T08:15:57.282Z'
  - type: comment
    user: Agent
    comment: Merged from a cloud thread; dev build reloaded.
    completionComment: true
    date: '2026-11-24T08:16:13.186Z'
    id: c-2026-11-24t08-16-13-186z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T08:16:13.774Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T04:05:54.248Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/867'
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
version: 1.30.20
releasedAt: '2026-11-25T04:05:49.382Z'
releaseDocPath: release-notes/1.30.20
---
Add a "Crafting" run kind in Runs, with Used, Made and Sold columns.
