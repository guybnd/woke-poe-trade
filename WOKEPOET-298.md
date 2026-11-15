---
id: WOKEPOET-298
title: 'Ctrl+Space search: a base lists its uniques with their prices'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-15T05:20:25.091Z'
    comment: Created ticket.
    id: a-2026-11-15t05-20-25-091z
  - type: comment
    user: Agent
    comment: 'Merged #488 on 2026-11-15.'
    completionComment: true
    date: '2026-11-15T05:20:44.107Z'
    id: c-2026-11-15t05-20-44-107z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T05:20:44.510Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/488'
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
Searching a base type in Ctrl+Space lists the uniques on that base with their prices. Shipped in PR #488.
