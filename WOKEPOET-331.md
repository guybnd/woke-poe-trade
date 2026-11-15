---
id: WOKEPOET-331
title: 'Price check: keep the influence icon on the mod line'
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
    date: '2026-11-15T15:41:14.520Z'
    comment: Created ticket.
    id: a-2026-11-15t15-41-14-520z
  - type: comment
    user: Agent
    comment: 'Merged in PR #538 (1fe652d8). The dev overlay was reloaded on master.'
    date: '2026-11-15T15:41:19.791Z'
    completionComment: true
    id: c-2026-11-15t15-41-19-791z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-15T15:41:19.791Z'
  - type: comment
    user: Agent
    comment: 'Merged as 1fe652d8: price check keeps the influence icon on its mod line.'
    completionComment: true
    date: '2026-11-15T15:41:24.428Z'
    id: c-2026-11-15t15-41-24-428z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T15:41:25.320Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/538'
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
> **TL;DR:** In price check, the influence icon now stays on its mod's line. Built and merged in PR #538 (1fe652d8); this ticket records it.
