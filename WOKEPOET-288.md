---
id: WOKEPOET-288
title: >-
  Campaign route: crafting recipes as a chip on the zone's step; Portal scroll /
  logout
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - campaign
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-15T05:20:03.596Z'
    comment: Created ticket.
    id: a-2026-11-15t05-20-03-596z
  - type: comment
    user: Agent
    comment: 'Merged #446 on 2026-11-14.'
    completionComment: true
    date: '2026-11-15T05:20:34.442Z'
    id: c-2026-11-15t05-20-34-442z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T05:20:34.766Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/446'
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
Crafting recipe steps fold into a "⚒" chip on the zone's step (Guy's pick C), and the route says "Portal scroll / logout". Includes a step renumber migration. Shipped in PR #446.
