---
id: WOKEPOET-582
title: Stop price check re-searching on Low clicks
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - bug
  - price-check
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-25T00:58:28.464Z'
    comment: Created ticket.
    id: a-2026-11-25t00-58-28-464z
  - type: comment
    user: Agent
    comment: Merged at d0e91ab; dev build reloaded.
    completionComment: true
    date: '2026-11-25T00:58:33.859Z'
    id: c-2026-11-25t00-58-33-859z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-25T00:58:34.407Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/897'
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
A single mod's Low / ≈ / High pick no longer runs a trade search. PR: https://github.com/guybnd/woke-poe-trade/pull/897 (d0e91ab).
