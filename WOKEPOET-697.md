---
id: WOKEPOET-697
title: >-
  M1: own unique bases and unique sections (early league, high variance, boss)
  from our data
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - loot-filter
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-692
history:
  - type: activity
    user: Agent
    date: '2026-11-28T05:17:44.721Z'
    comment: Created ticket.
    id: a-2026-11-28t05-17-44-721z
  - type: activity
    user: Agent
    date: '2026-11-28T05:17:44.721Z'
    comment: Created as subtask of WOKEPOET-692.
    id: a-2026-11-28t05-17-44-721z
  - type: activity
    user: Agent
    date: '2026-11-28T07:49:25.996Z'
    comment: Updated implementation link.
    id: a-2026-11-28t07-49-25-996z
  - type: comment
    user: Agent
    comment: PR 1077 merged as 43632148.
    date: '2026-11-28T07:58:38.385Z'
    completionComment: true
    id: c-2026-11-28t07-58-38-385z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-28T07:58:38.385Z'
  - type: comment
    user: Agent
    comment: PR 1077 merged as 43632148.
    completionComment: true
    date: '2026-11-28T07:58:41.432Z'
    id: c-2026-11-28t07-58-41-432z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-28T07:58:43.103Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/1077'
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
Unique bases and the unique sections (early league, high variance, boss) built from our own data instead of NeverSink's.
