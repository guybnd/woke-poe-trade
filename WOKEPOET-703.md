---
id: WOKEPOET-703
title: 'Levelling 4: flasks by level'
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
    date: '2026-11-28T05:35:02.610Z'
    comment: Created ticket.
    id: a-2026-11-28t05-35-02-610z
  - type: activity
    user: Agent
    date: '2026-11-28T05:35:02.610Z'
    comment: Created as subtask of WOKEPOET-699.
    id: a-2026-11-28t05-35-02-610z
  - type: comment
    user: Agent
    comment: 'Built in PR 1069, merged as 0946eea.'
    date: '2026-11-28T07:06:44.523Z'
    completionComment: true
    id: c-2026-11-28t07-06-44-523z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-28T07:06:44.523Z'
  - type: comment
    user: Agent
    comment: PR 1069 merged as 0946eea.
    completionComment: true
    date: '2026-11-28T07:06:52.399Z'
    id: c-2026-11-28t07-06-52-399z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-28T07:06:52.940Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/1069'
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
Flasks shown by character level.
