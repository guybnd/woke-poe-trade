---
id: WOKEPOET-360
title: On-click trade searches share one queue and cache
status: Ready
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
    comment: Created ticket.
    id: a-2026-11-17t09-44-06-939z
  - type: activity
    user: Agent
    date: '2026-11-17T09:44:06.939Z'
    comment: Created as subtask of WOKEPOET-354.
    id: a-2026-11-17t09-44-06-939z
  - type: comment
    user: Agent
    comment: >-
      PR #581 (woke/trade-search-lane): shared/on-demand lane + 15-min answers;
      gem versions, Harvest swap, trade quotes on it; trade-quotes league fix.
      Checks, e2e, perf pass.
    date: '2026-11-17T11:20:22.744Z'
    completionComment: true
    id: c-2026-11-17t11-20-22-744z
  - type: status_change
    from: Backlog
    to: Ready
    user: Agent
    date: '2026-11-17T11:20:22.744Z'
needsAction: null
---
> **TL;DR:** Gem versions, Harvest swap, price drivers and new-item search call trade on their own, with no cache, so reopening spends searches again. Route them through shared/trade-quotes.ts with one `useOnDemandQuote()` row state.

Audit finding 6.
