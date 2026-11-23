---
id: WOKEPOET-493
title: Shared action row and card footer
status: Done
priority: None
effort: None
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-491
history:
  - type: activity
    user: Agent
    date: '2026-11-23T03:00:45.688Z'
    comment: Created ticket.
    id: a-2026-11-23t03-00-45-688z
  - type: activity
    user: Agent
    date: '2026-11-23T03:00:45.688Z'
    comment: Created as subtask of WOKEPOET-491.
    id: a-2026-11-23t03-00-45-688z
  - type: comment
    user: Agent
    comment: Shipped in PR 784 (merged at 010b9042).
    date: '2026-11-23T04:16:19.669Z'
    completionComment: true
    id: c-2026-11-23t04-16-19-669z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-23T04:16:19.669Z'
  - type: comment
    user: Agent
    comment: Shared action row and card footer shipped in PR 784 (010b9042).
    completionComment: true
    date: '2026-11-23T04:16:26.294Z'
    id: c-2026-11-23t04-16-26-294z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-23T04:16:26.635Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/784'
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
One shared action row and card footer so buttons and links stop mixing styles. Loot filter dock card first.
