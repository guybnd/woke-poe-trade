---
id: WOKEPOET-626
title: 'Deep audit: Hunt rancid bugs'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-621
history:
  - type: activity
    user: Agent
    date: '2026-11-26T01:37:53.584Z'
    comment: Created ticket.
    id: a-2026-11-26t01-37-53-584z
  - type: activity
    user: Agent
    date: '2026-11-26T01:37:53.584Z'
    comment: Created as subtask of WOKEPOET-621.
    id: a-2026-11-26t01-37-53-584z
  - type: status_change
    from: Todo
    to: In Progress
    user: Agent
    date: '2026-11-26T02:42:41.659Z'
  - type: activity
    user: Agent
    date: '2026-11-26T02:42:42.408Z'
    comment: Updated implementation link.
    id: a-2026-11-26t02-42-42-408z
  - type: comment
    user: Agent
    comment: 'PR 949 merged (c2a6af1): 17 data-loss fixes plus Guy''s two picks.'
    date: '2026-11-26T02:49:32.157Z'
    completionComment: true
    id: c-2026-11-26t02-49-32-157z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-26T02:49:32.157Z'
  - type: comment
    user: Agent
    comment: 'Merged at c2a6af1 (head 4a8d374, all checks green); dev build reloaded.'
    completionComment: true
    date: '2026-11-26T02:49:38.274Z'
    id: c-2026-11-26t02-49-38-274z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-26T02:49:39.114Z'
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/949'
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
Hunt long-standing, rancid bugs.
