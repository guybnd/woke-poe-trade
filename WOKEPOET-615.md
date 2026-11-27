---
id: WOKEPOET-615
title: 'Help tooltips: rewrite map / Valdo / price check tips'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - polish
createdBy: Agent
updatedBy: Guy
parentId: WOKEPOET-613
history:
  - type: activity
    user: Agent
    date: '2026-11-25T10:56:25.621Z'
    comment: Created ticket.
    id: a-2026-11-25t10-56-25-621z
  - type: activity
    user: Agent
    date: '2026-11-25T10:56:25.621Z'
    comment: Created as subtask of WOKEPOET-613.
    id: a-2026-11-25t10-56-25-621z
  - type: comment
    user: Agent
    comment: PR 935 merged (942b6c5).
    date: '2026-11-25T12:29:35.106Z'
    completionComment: true
    id: c-2026-11-25t12-29-35-106z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-25T12:29:35.106Z'
  - type: comment
    user: Agent
    comment: Merged at 942b6c5; dev build reloaded.
    completionComment: true
    date: '2026-11-25T12:29:42.588Z'
    id: c-2026-11-25t12-29-42-588z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-25T12:29:44.141Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T04:30:54.989Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/935'
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
version: '0003'
releasedAt: '2026-11-27T04:30:50.393Z'
releaseDocPath: release-notes/0003
---
Rewrite the map, Valdo and price check help tips in the new format.
