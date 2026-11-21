---
id: WOKEPOET-441
title: 'Price check: sort listings by real value across chaos and divine'
status: In Progress
priority: Medium
effort: S
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: claude-code@guy-pc
history:
  - type: activity
    user: Agent
    date: '2026-11-21T06:07:06.603Z'
    comment: Created ticket.
    id: a-2026-11-21t06-07-06-603z
  - type: activity
    user: claude-code@guy-pc
    date: '2026-11-21T06:07:09.945Z'
    comment: Claimed by claude-code@guy-pc
    id: a-2026-11-21t06-07-09-945z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@guy-pc
    date: '2026-11-21T06:07:09.945Z'
needsAction: null
claim:
  holder: claude-code@guy-pc
  claimedAt: '2026-11-21T06:07:09.945Z'
  expiresAt: '2026-11-21T06:37:09.945Z'
---
Trade results showed in the trade site's order (its own currency ratios), so a 150c listing could land after 1 div. Fix: re-sort the fetched rows by chaos value at the poe.ninja rate (divine and other currencies); unvalued rows go last; no divine rate means the order stays. No extra trade searches. Branch woke/price-sort-currency.
