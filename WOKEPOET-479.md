---
id: WOKEPOET-479
title: 'Price check: poe.ninja price first for bulk items, live search on click'
status: In Progress
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
    date: '2026-11-22T11:06:33.597Z'
    comment: Created ticket.
    id: a-2026-11-22t11-06-33-597z
  - type: activity
    user: claude-code@guy-pc
    date: '2026-11-22T11:06:37.340Z'
    comment: Claimed by claude-code@guy-pc
    id: a-2026-11-22t11-06-37-340z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@guy-pc
    date: '2026-11-22T11:06:37.340Z'
  - type: comment
    user: Agent
    comment: >-
      Mockups with pick buttons (A recommended, being built):
      https://claude.ai/artifact/RzCo6AUkASKWzLAABZuVtp
    date: '2026-11-22T11:09:38.136Z'
    selfAttested: true
    id: c-2026-11-22t11-09-38-136z
needsAction: null
claim:
  holder: claude-code@guy-pc
  claimedAt: '2026-11-22T11:06:37.340Z'
  expiresAt: '2026-11-22T11:36:37.340Z'
---
> **TL;DR:** Price checking currency and other bulk goods shows the cached poe.ninja price straight away as the verdict and no longer spends an exchange search; "Check live offers" (or Enter) runs it.

Guy's idea (project thread). Today bulk-preset items auto-search the exchange (smartInitialSearch) and show the ninja chip after an 800 ms artificial delay.

Plan (recommended option A, mockups in the thread):
- Bulk preset + exact poe.ninja price → no auto search; ninja verdict card in the verdict slot with each / stack value / 7d change and a "Check live offers" button.
- No ninja price → auto search as before.
- Lazy component to stay in the startup JS budget.
