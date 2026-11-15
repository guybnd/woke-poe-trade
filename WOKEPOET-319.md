---
id: WOKEPOET-319
title: 'Claude link: name character jewel sockets correctly'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-15T06:47:10.620Z'
    comment: Created ticket.
    id: a-2026-11-15t06-47-10-620z
  - type: comment
    user: Agent
    comment: 'Merged #503 (40f2209e).'
    completionComment: true
    date: '2026-11-15T06:47:16.996Z'
    id: c-2026-11-15t06-47-16-996z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T06:47:17.519Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/503'
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
The Claude link's current-character tool named jewel sockets wrong: a jewel's position is its place in the tree's jewel slot list, not a node id. It now maps through that list, and falls back to "jewel slot N" when the list is missing. Shipped in PR #503.
