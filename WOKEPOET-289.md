---
id: WOKEPOET-289
title: 'Price check: Fractured only for mods inside a total and Jun/influence mods'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - price-check
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-15T05:20:12.932Z'
    comment: Created ticket.
    id: a-2026-11-15t05-20-12-932z
  - type: comment
    user: Agent
    comment: 'Merged #447 on 2026-11-14.'
    completionComment: true
    date: '2026-11-15T05:20:35.385Z'
    id: c-2026-11-15t05-20-35-385z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T05:20:35.752Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/447'
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
The Fractured option shows only on mods inside a pseudo total and on Jun/influence mods. Shipped in PR #447.
