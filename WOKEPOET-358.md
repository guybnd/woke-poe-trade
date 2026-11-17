---
id: WOKEPOET-358
title: One price lookup for every window
status: Done
priority: None
effort: L
assignee: unassigned
tags:
  - cleanup
  - prices
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-354
history:
  - type: activity
    user: Agent
    date: '2026-11-17T09:44:02.634Z'
    comment: Created ticket.
    id: a-2026-11-17t09-44-02-634z
  - type: activity
    user: Agent
    date: '2026-11-17T09:44:02.634Z'
    comment: Created as subtask of WOKEPOET-354.
    id: a-2026-11-17t09-44-02-634z
  - type: comment
    user: Agent
    comment: >-
      PR #578 (woke/one-price-lookup): pickRow + usePrice + usePriceText;
      tooltip, Search, Boss runs and 9 windows on it. Checks, e2e, perf pass.
      Open: Essence scan chaos-only kept.
    date: '2026-11-17T10:33:03.818Z'
    completionComment: true
    id: c-2026-11-17t10-33-03-818z
  - type: status_change
    from: Backlog
    to: Ready
    user: Agent
    date: '2026-11-17T10:33:03.818Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 81bfad3e: pickRow + usePrice + usePriceText; tooltip, Search,
      Boss runs and 10 windows (incl. Essence scan, Guy's pick) on one price
      rule and divine rate.
    completionComment: true
    date: '2026-11-17T10:49:43.875Z'
    id: c-2026-11-17t10-49-43-875z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-17T10:49:44.183Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/578'
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
> **TL;DR:** Some windows read live poe.ninja prices, others the Market snapshot, and the unid jewel rule is wired into only three. One `priceOf(name, variant)` answers for all, so a row and its tooltip agree.

Audit finding 2. Picks the source, applies shared/unid-prices.ts (unid jewels use cached unid price; real trade search only on click), formats with divine. Replaces per-window fmt() copies.
