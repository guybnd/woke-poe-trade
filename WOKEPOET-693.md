---
id: WOKEPOET-693
title: 'M1: item lists from game data (RePoE → item-lists.json)'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - loot-filter
  - data
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-692
history:
  - type: activity
    user: Agent
    date: '2026-11-28T04:55:10.669Z'
    comment: Created ticket.
    id: a-2026-11-28t04-55-10-669z
  - type: activity
    user: Agent
    date: '2026-11-28T04:55:10.669Z'
    comment: Created as subtask of WOKEPOET-692.
    id: a-2026-11-28t04-55-10-669z
  - type: activity
    user: Agent
    date: '2026-11-28T04:55:17.858Z'
    comment: Updated implementation link.
    id: a-2026-11-28t04-55-17-858z
  - type: comment
    user: Agent
    comment: PR 1057 merged (0e45aef).
    date: '2026-11-28T05:17:40.474Z'
    completionComment: true
    id: c-2026-11-28t05-17-40-474z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-28T05:17:40.474Z'
  - type: comment
    user: Agent
    comment: Merged at 0e45aef.
    completionComment: true
    date: '2026-11-28T05:17:49.742Z'
    id: c-2026-11-28t05-17-49-742z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-28T05:17:50.571Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/1057'
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
A script plus a weekly workflow that writes item-lists.json from RePoE. Draft PR: https://github.com/guybnd/woke-poe-trade/pull/1057
