---
id: WOKEPOET-702
title: 'Levelling 3: currency floor'
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
    date: '2026-11-28T05:35:01.678Z'
    comment: Created ticket.
    id: a-2026-11-28t05-35-01-678z
  - type: activity
    user: Agent
    date: '2026-11-28T05:35:01.678Z'
    comment: Created as subtask of WOKEPOET-699.
    id: a-2026-11-28t05-35-01-678z
  - type: comment
    user: Agent
    comment: >-
      In review in PR 1069 (levelling part 1: below-maps currency floors).
      Merges on green.
    date: '2026-11-28T06:00:19.866Z'
    completionComment: true
    id: c-2026-11-28t06-00-19-866z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-28T06:00:19.866Z'
  - type: activity
    user: Agent
    date: '2026-11-28T06:00:21.317Z'
    comment: Updated implementation link.
    id: a-2026-11-28t06-00-21-317z
  - type: comment
    user: Agent
    comment: PR 1069 merged; dev build picks it up on the next master reload.
    completionComment: true
    date: '2026-11-28T07:06:38.644Z'
    id: c-2026-11-28t07-06-38-644z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-28T07:06:41.024Z'
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
A currency floor while levelling.
