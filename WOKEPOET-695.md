---
id: WOKEPOET-695
title: 'M1: Loot tab rows from our lists, not NeverSink''s BaseType lists'
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
    date: '2026-11-28T04:55:13.522Z'
    comment: Created ticket.
    id: a-2026-11-28t04-55-13-522z
  - type: activity
    user: Agent
    date: '2026-11-28T04:55:13.522Z'
    comment: Created as subtask of WOKEPOET-692.
    id: a-2026-11-28t04-55-13-522z
  - type: status_change
    from: Todo
    to: In Progress
    user: Agent
    date: '2026-11-28T05:17:41.647Z'
  - type: activity
    user: Agent
    date: '2026-11-28T05:17:43.155Z'
    comment: Updated implementation link.
    id: a-2026-11-28t05-17-43-155z
  - type: comment
    user: Agent
    comment: PR 1061 merged as e7e410a.
    date: '2026-11-28T06:35:44.165Z'
    completionComment: true
    id: c-2026-11-28t06-35-44-165z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-28T06:35:44.165Z'
  - type: comment
    user: Agent
    comment: PR 1061 merged as e7e410a.
    completionComment: true
    date: '2026-11-28T06:35:50.515Z'
    id: c-2026-11-28t06-35-50-515z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-28T06:35:51.250Z'
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/1061'
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
The Loot tab builds its rows from our item lists instead of NeverSink's BaseType lists, and keeps the dropUnknownBases guard.
