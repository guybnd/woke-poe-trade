---
id: WOKEPOET-353
title: 'Price check side window: every row is clickable'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - price-check
  - ux
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-17T09:32:45.461Z'
    comment: Created ticket.
    id: a-2026-11-17t09-32-45-461z
  - type: comment
    user: Agent
    comment: 'Merged as cbeda29a: every row in the price check side window is clickable.'
    completionComment: true
    date: '2026-11-17T09:32:49.755Z'
    id: c-2026-11-17t09-32-49-755z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-17T09:32:50.197Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/574'
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
> **TL;DR:** Every row in the price check side window is clickable. Shipped in PR 574 (merged cbeda29a).
