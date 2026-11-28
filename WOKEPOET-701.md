---
id: WOKEPOET-701
title: 'Levelling 2: Levelling section UI'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - loot-filter
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-699
history:
  - type: activity
    user: Agent
    date: '2026-11-28T05:35:00.351Z'
    comment: Created ticket.
    id: a-2026-11-28t05-35-00-351z
  - type: activity
    user: Agent
    date: '2026-11-28T05:35:00.351Z'
    comment: Created as subtask of WOKEPOET-699.
    id: a-2026-11-28t05-35-00-351z
  - type: comment
    user: Agent
    comment: 'In review in PR 1069 (levelling part 1, with 700/702).'
    date: '2026-11-28T06:11:21.933Z'
    completionComment: true
    id: c-2026-11-28t06-11-21-933z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-28T06:11:21.933Z'
  - type: activity
    user: Agent
    date: '2026-11-28T06:11:31.137Z'
    comment: Updated implementation link.
    id: a-2026-11-28t06-11-31-137z
  - type: comment
    user: Agent
    comment: PR 1069 merged as 0946eea.
    completionComment: true
    date: '2026-11-28T07:06:50.493Z'
    id: c-2026-11-28t07-06-50-493z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-28T07:06:51.123Z'
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/1069'
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
Act bands, rows with until/Edit, lazy-loaded.
