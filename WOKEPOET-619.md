---
id: WOKEPOET-619
title: Fix pinned panel losing drag when dragged up
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
    date: '2026-11-25T15:34:25.368Z'
    comment: Created ticket.
    id: a-2026-11-25t15-34-25-368z
  - type: comment
    user: Agent
    comment: Merged at 93b9c6f; dev build reloaded.
    completionComment: true
    date: '2026-11-25T15:34:28.660Z'
    id: c-2026-11-25t15-34-28-660z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-25T15:34:29.162Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/943'
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
Dragging a pinned panel upwards lost the hold after a bit (Guy, 2026-11-25). Fix keeps the mouse while dragging. PR: https://github.com/guybnd/woke-poe-trade/pull/943 (93b9c6f).
