---
id: WOKEPOET-360
title: On-click trade searches share one queue and cache
status: Backlog
priority: None
effort: M
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
    date: '2026-11-17T09:44:06.939Z'
    comment: Created as subtask of WOKEPOET-354.
---
> **TL;DR:** Gem versions, Harvest swap, price drivers and new-item search call trade on their own, with no cache, so reopening spends searches again. Route them through shared/trade-quotes.ts with one `useOnDemandQuote()` row state.

Audit finding 6.
