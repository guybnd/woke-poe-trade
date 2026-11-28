---
id: WOKEPOET-691
title: 'Loot filter: per-section steps and rulers'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - loot-filter
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-649
history:
  - type: activity
    user: Agent
    date: '2026-11-28T04:49:35.619Z'
    comment: Created ticket.
    id: a-2026-11-28t04-49-35-619z
  - type: activity
    user: Agent
    date: '2026-11-28T04:49:35.619Z'
    comment: Created as subtask of WOKEPOET-649.
    id: a-2026-11-28t04-49-35-619z
  - type: comment
    user: Agent
    comment: Merged at afd670d; dev build reloaded.
    completionComment: true
    date: '2026-11-28T04:49:41.785Z'
    id: c-2026-11-28t04-49-41-785z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-28T04:49:42.508Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/1050'
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
Step on/off per page or section, own section rulers, hidden piles keep their look. PR: https://github.com/guybnd/woke-poe-trade/pull/1050 (afd670d).
