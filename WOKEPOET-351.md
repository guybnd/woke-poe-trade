---
id: WOKEPOET-351
title: >-
  Alt+F Whole tier: list the tier's items with prices, pick and move them;
  on/off switches for Sound, Beam, Map icon
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - loot-filter
  - ux
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-17T08:19:01.568Z'
    comment: Created ticket.
    id: a-2026-11-17t08-19-01-568z
  - type: comment
    user: Agent
    comment: >-
      Merged as dba91e1a: Alt+F Whole tier item list with prices, pick and move;
      on/off switches for Sound, Beam, Map icon.
    completionComment: true
    date: '2026-11-17T08:19:06.433Z'
    id: c-2026-11-17t08-19-06-433z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-17T08:19:06.906Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/572'
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
> **TL;DR:** Alt+F card's "Whole tier" lists the tier's items with prices so you can pick and move them, plus on/off switches for Sound, Beam and Map icon. Shipped in PR 572 (merged dba91e1a).
