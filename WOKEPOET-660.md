---
id: WOKEPOET-660
title: 'Loot filter: Drop tiers and Base ranks as top-level tabs'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-27T12:58:45.750Z'
    comment: Created ticket.
    id: a-2026-11-27t12-58-45-750z
  - type: comment
    user: Agent
    comment: >-
      Merged at c5d5dda. Reaches the dev build when it returns to master after
      PR 1003.
    completionComment: true
    date: '2026-11-27T12:58:50.020Z'
    id: c-2026-11-27t12-58-50-020z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-27T12:58:50.426Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/978'
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
Drop tiers and Base ranks become top-level loot filter tabs. PR: https://github.com/guybnd/woke-poe-trade/pull/978 (c5d5dda).
