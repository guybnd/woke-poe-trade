---
id: WOKEPOET-710
title: >-
  Readable filter change history (rows say what changed, fold repeats, expand,
  section chips)
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
    date: '2026-11-28T06:15:58.896Z'
    comment: Created ticket.
    id: a-2026-11-28t06-15-58-896z
  - type: activity
    user: Agent
    date: '2026-11-28T06:15:58.896Z'
    comment: Created as subtask of WOKEPOET-649.
    id: a-2026-11-28t06-15-58-896z
  - type: activity
    user: Agent
    date: '2026-11-28T06:16:02.493Z'
    comment: Updated implementation link.
    id: a-2026-11-28t06-16-02-493z
  - type: comment
    user: Agent
    comment: In review in PR 1074 (pick A built).
    date: '2026-11-28T06:16:03.341Z'
    completionComment: true
    id: c-2026-11-28t06-16-03-341z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-28T06:16:03.341Z'
  - type: comment
    user: Agent
    comment: PR 1074 merged as b344d77.
    completionComment: true
    date: '2026-11-28T06:48:01.420Z'
    id: c-2026-11-28t06-48-01-420z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-28T06:48:02.181Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/1074'
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
Picks page: https://claude.ai/artifact/Qq2xR25qTgqUEmCFKJ8oj9. Option A is built in PR 1074.
