---
id: WOKEPOET-301
title: 'Filter item card: verdict first, plain value tiers, strictness grid'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - loot-filter
  - ui
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-15T05:20:29.476Z'
    comment: Created ticket.
    id: a-2026-11-15t05-20-29-476z
  - type: comment
    user: Agent
    comment: 'Merged #492 on 2026-11-15.'
    completionComment: true
    date: '2026-11-15T05:20:46.944Z'
    id: c-2026-11-15t05-20-46-944z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T05:20:47.312Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T16:10:23.037Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/492'
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
version: '00024'
releasedAt: '2026-11-27T16:10:17.975Z'
releaseDocPath: release-notes/00024
---
The Alt+F loot filter item card was redesigned (Guy's pick A): the show/hide verdict leads, value tiers are in plain words, and a grid shows the item at every strictness. Shipped in PR #492.
