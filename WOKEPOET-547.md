---
id: WOKEPOET-547
title: Reprice bar on price check for listed items (R1)
status: Done
priority: None
effort: None
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-528
history:
  - type: activity
    user: Agent
    date: '2026-11-24T03:02:43.304Z'
    comment: Created ticket.
    id: a-2026-11-24t03-02-43-304z
  - type: activity
    user: Agent
    date: '2026-11-24T03:02:43.304Z'
    comment: Created as subtask of WOKEPOET-528.
    id: a-2026-11-24t03-02-43-304z
  - type: comment
    user: Agent
    comment: Shipped in PR 839 (c81a800c).
    date: '2026-11-24T08:56:40.065Z'
    completionComment: true
    id: c-2026-11-24t08-56-40-065z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-24T08:56:40.065Z'
  - type: comment
    user: Agent
    comment: Merged at c81a800c from a cloud thread; dev build reloaded.
    completionComment: true
    date: '2026-11-24T08:56:43.936Z'
    id: c-2026-11-24t08-56-43-936z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T08:56:44.706Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/839'
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
Built in a cloud thread.
