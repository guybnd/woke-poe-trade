---
id: WOKEPOET-306
title: 'Character: leveling stage follows your real passive points (idea 13)'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - pob
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-304
history:
  - type: activity
    user: Agent
    date: '2026-11-15T05:38:14.540Z'
    comment: Created ticket.
    id: a-2026-11-15t05-38-14-540z
  - type: activity
    user: Agent
    date: '2026-11-15T05:38:14.540Z'
    comment: Created as subtask of WOKEPOET-304.
    id: a-2026-11-15t05-38-14-540z
  - type: comment
    user: Agent
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/499 (with 305), reviewed,
      sent to merge.
    date: '2026-11-15T05:49:33.978Z'
    selfAttested: true
    id: c-2026-11-15t05-49-33-978z
  - type: comment
    user: Agent
    comment: >-
      Shipped in #499 (236be02f): leveling stage follows your real passive
      points.
    date: '2026-11-15T06:15:02.739Z'
    completionComment: true
    id: c-2026-11-15t06-15-02-739z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-15T06:15:02.739Z'
  - type: comment
    user: Agent
    comment: 'Merged #499 (236be02f).'
    completionComment: true
    date: '2026-11-15T06:15:09.550Z'
    id: c-2026-11-15t06-15-09-550z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T06:15:09.885Z'
  - type: comment
    user: Agent
    comment: 'Leveling stage by real points, merged in #499.'
    date: '2026-11-15T07:58:45.450Z'
    completionComment: true
    id: c-2026-11-15t07-58-45-450z
  - type: status_change
    from: Done
    to: Ready
    user: Agent
    date: '2026-11-15T07:58:45.450Z'
  - type: comment
    user: Agent
    comment: 'Merged in #499.'
    completionComment: true
    date: '2026-11-15T07:58:46.354Z'
    id: c-2026-11-15t07-58-46-354z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T07:58:46.596Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/499'
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
When a fresh character read exists for the character in play, loadoutOf/treeAhead pick the stage from the synced tree's point count instead of pointsBy(level, act).
