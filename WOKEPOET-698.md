---
id: WOKEPOET-698
title: Alt+F item score card for rares and flasks
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
    date: '2026-11-28T05:28:50.518Z'
    comment: Created ticket.
    id: a-2026-11-28t05-28-50-518z
  - type: activity
    user: Agent
    date: '2026-11-28T05:28:50.518Z'
    comment: Created as subtask of WOKEPOET-649.
    id: a-2026-11-28t05-28-50-518z
  - type: activity
    user: Agent
    date: '2026-11-28T05:28:57.213Z'
    comment: Updated implementation link.
    id: a-2026-11-28t05-28-57-213z
  - type: comment
    user: Agent
    comment: PR 1063 merged as 397281a1.
    date: '2026-11-28T06:59:24.959Z'
    completionComment: true
    id: c-2026-11-28t06-59-24-959z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-28T06:59:24.959Z'
  - type: comment
    user: Agent
    comment: PR 1063 merged.
    date: '2026-11-28T06:59:30.973Z'
    completionComment: true
    id: c-2026-11-28t06-59-30-973z
  - type: comment
    user: Agent
    comment: PR 1063 merged as 397281a1.
    completionComment: true
    date: '2026-11-28T06:59:29.598Z'
    id: c-2026-11-28t06-59-29-598z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-28T06:59:32.351Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/1063'
needsAction: null
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
Item score card for rares and flasks on Alt+F, with No rank −10 / Large −5 defaults and a one-time migration. PR: https://github.com/guybnd/woke-poe-trade/pull/1063 (branch claude/project-thread-wz4xpq).
