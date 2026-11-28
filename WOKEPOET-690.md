---
id: WOKEPOET-690
title: 'Loot filter: new default map looks'
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
    date: '2026-11-28T04:21:27.256Z'
    comment: Created ticket.
    id: a-2026-11-28t04-21-27-256z
  - type: activity
    user: Agent
    date: '2026-11-28T04:21:27.256Z'
    comment: Created as subtask of WOKEPOET-649.
    id: a-2026-11-28t04-21-27-256z
  - type: comment
    user: Agent
    comment: Merged at 9ef6c4a; dev build reloaded.
    completionComment: true
    date: '2026-11-28T04:21:42.199Z'
    id: c-2026-11-28t04-21-42-199z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-28T04:21:43.258Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/1053'
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
New default map looks: black on white, each kind's tint on the edge, square icons. PR: https://github.com/guybnd/woke-poe-trade/pull/1053 (9ef6c4a).
