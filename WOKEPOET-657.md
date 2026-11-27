---
id: WOKEPOET-657
title: 'Price check: unique tier and drop rarity in the side list'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - feature
  - price-check
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-27T06:55:43.274Z'
    comment: Created ticket.
    id: a-2026-11-27t06-55-43-274z
  - type: comment
    user: Agent
    comment: Merged at 779ccc6 (data v37); dev build reloaded.
    completionComment: true
    date: '2026-11-27T06:55:48.832Z'
    id: c-2026-11-27t06-55-48-832z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-27T06:55:49.417Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/981'
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
Price check side list shows a unique's drop rarity and its loot filter tier. Data version v37. PR: https://github.com/guybnd/woke-poe-trade/pull/981 (779ccc6).
