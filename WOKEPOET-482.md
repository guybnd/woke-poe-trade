---
id: WOKEPOET-482
title: 'Loot filter: show how much a price moved on the "price jumped" badge'
status: Released
priority: Low
effort: XS
assignee: unassigned
tags:
  - loot-filter
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-22T11:49:25.820Z'
    comment: Created ticket.
    id: a-2026-11-22t11-49-25-820z
  - type: comment
    user: Agent
    comment: >-
      Merged as PR 764 (8552933f): Not moved chip reads "spiked +240% in a week"
      / "crashed −70% in a day", hover gives price then/now. Clean review, CI
      green.
    date: '2026-11-22T12:01:09.411Z'
    completionComment: true
    id: c-2026-11-22t12-01-09-411z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-22T12:01:09.411Z'
  - type: comment
    user: Agent
    comment: Merged as 8552933f. Dev build pull requested via coordinator.
    completionComment: true
    date: '2026-11-22T12:01:14.977Z'
    id: c-2026-11-22t12-01-14-977z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-22T12:01:15.417Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:53.418Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/764'
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
version: '0001'
releasedAt: '2026-11-25T11:50:45.359Z'
releaseDocPath: release-notes/0001
---
Guy: the Not moved list in Loot filter → Prices shows "price jumped" with no size. Show the move (poe.ninja-style percent) and say spiked or crashed instead of jumped.
