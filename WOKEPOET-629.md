---
id: WOKEPOET-629
title: 'UX consistency: real item tooltips on every Prices category, plus corpse info'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - polish
createdBy: Agent
updatedBy: Guy
parentId: WOKEPOET-622
history:
  - type: activity
    user: Agent
    date: '2026-11-26T02:01:55.639Z'
    comment: Created ticket.
    id: a-2026-11-26t02-01-55-639z
  - type: activity
    user: Agent
    date: '2026-11-26T02:01:55.639Z'
    comment: Created as subtask of WOKEPOET-622.
    id: a-2026-11-26t02-01-55-639z
  - type: comment
    user: Agent
    comment: 'PR 952 merged (6097747, data v35).'
    date: '2026-11-26T02:53:50.368Z'
    completionComment: true
    id: c-2026-11-26t02-53-50-368z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-26T02:53:50.368Z'
  - type: comment
    user: Agent
    comment: Merged at 6097747 (data v35); dev build reloaded.
    completionComment: true
    date: '2026-11-26T02:53:57.169Z'
    id: c-2026-11-26t02-53-57-169z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-26T02:53:58.156Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T04:30:53.187Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/952'
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
Real item tooltips on every Prices category, plus corpse info. Building.
