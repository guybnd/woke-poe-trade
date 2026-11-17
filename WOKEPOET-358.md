---
id: WOKEPOET-358
title: One price lookup for every window
status: Backlog
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
    comment: Created as subtask of WOKEPOET-354.
---
> **TL;DR:** Some windows read live poe.ninja prices, others the Market snapshot, and the unid jewel rule is wired into only three. One `priceOf(name, variant)` answers for all, so a row and its tooltip agree.

Audit finding 2. Picks the source, applies shared/unid-prices.ts (unid jewels use cached unid price; real trade search only on click), formats with divine. Replaces per-window fmt() copies.
