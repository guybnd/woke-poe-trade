---
id: WOKEPOET-535
title: 'Listed tab: "Still cheapest?" for old listings'
status: Done
priority: High
effort: M
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-528
history:
  - type: activity
    user: Agent
    date: '2026-11-24T02:41:10.120Z'
    comment: Created ticket.
    id: a-2026-11-24t02-41-10-120z
  - type: activity
    user: Agent
    date: '2026-11-24T02:41:10.120Z'
    comment: Created as subtask of WOKEPOET-528.
    id: a-2026-11-24t02-41-10-120z
  - type: comment
    user: Agent
    comment: Shipped in PR 834 (79f94be1).
    date: '2026-11-24T03:02:42.318Z'
    completionComment: true
    id: c-2026-11-24t03-02-42-318z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-24T03:02:42.318Z'
  - type: comment
    user: Agent
    comment: Merged at 79f94be1 from a cloud thread; dev build reloaded onto it.
    completionComment: true
    date: '2026-11-24T03:02:48.986Z'
    id: c-2026-11-24t03-02-48-986z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T03:02:49.515Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/834'
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
Veteran review pick (listed-cheapest). Button on each listing older than the threshold runs one trade search for that item and shows your rank and the current cheapest. Click only, for rate limits.
