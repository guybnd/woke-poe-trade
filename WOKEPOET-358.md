---
id: WOKEPOET-358
title: One price lookup for every window
status: Ready
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
needsAction: null
---
> **TL;DR:** Some windows read live poe.ninja prices, others the Market snapshot, and the unid jewel rule is wired into only three. One `priceOf(name, variant)` answers for all, so a row and its tooltip agree.

Audit finding 2. Picks the source, applies shared/unid-prices.ts (unid jewels use cached unid price; real trade search only on click), formats with divine. Replaces per-window fmt() copies.
