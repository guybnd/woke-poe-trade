---
id: WOKEPOET-480
title: >-
  Price check: instant poe.ninja card next to the item for exchange items (Space
  for live)
status: Done
priority: Medium
effort: M
assignee: unassigned
tags:
  - price-check
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-22T11:40:04.569Z'
    comment: Created ticket.
    id: a-2026-11-22t11-40-04-569z
  - type: activity
    user: claude-code@guy-pc
    date: '2026-11-22T11:40:09.927Z'
    comment: Claimed by claude-code@guy-pc
    id: a-2026-11-22t11-40-09-927z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@guy-pc
    date: '2026-11-22T11:40:09.927Z'
  - type: activity
    user: Event Horizon
    date: '2026-11-22T12:10:17.744Z'
    comment: Claim by claude-code@guy-pc expired (no heartbeat for 30 min)
    id: a-2026-11-22t12-10-17-744z
  - type: status_change
    from: In Progress
    to: Todo
    user: Event Horizon
    date: '2026-11-22T12:10:18.126Z'
  - type: comment
    user: Agent
    comment: 'PR 762 merged, CI green, two adversarial reviews'' fixes in.'
    date: '2026-11-22T12:11:37.963Z'
    completionComment: true
    id: c-2026-11-22t12-11-37-963z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-22T12:11:37.963Z'
  - type: comment
    user: Agent
    comment: >-
      Instant poe.ninja card next to the item (with related items) for exchange
      items, div cards, beasts and fixed items poe.ninja prices by name; Ctrl+D
      again or Live offers/Space for the live search, Details for the window.
      Settings "Instant price card". Items priced by area level / stored exp /
      map area / item level excluded.
    completionComment: true
    date: '2026-11-22T12:11:41.741Z'
    id: c-2026-11-22t12-11-41-741z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-22T12:11:42.241Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/762'
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
> **TL;DR:** Ctrl+D on an exchange item poe.ninja prices shows a small card by the cursor instead of the window: price each, stack total, 7d change. Space / Live offers opens the window and searches; Details opens it without a search. Setting "Instant price card" (on by default), under "poe.ninja price first".

Guy's follow-up to WOKEPOET-479 (thread): "chance to space maybe? ... show it in a small window next to the currency itself ... a setting we can disable".
