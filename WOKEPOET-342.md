---
id: WOKEPOET-342
title: 'Price check: tick base type by default on fractured items'
status: In Progress
priority: None
effort: XS
assignee: unassigned
tags:
  - price-check
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-16T14:51:06.446Z'
    comment: Created ticket.
---
Guy (2026-11-16): when the item is fractured, the base type filter should start ticked in price check. No extra trade searches.

Fix: `create-item-filters.ts` starts the category (relaxed) search disabled for fractured items. Branch `woke/frac-base-default`, worktree `E:\Git\woke\wt\frac-base`.
