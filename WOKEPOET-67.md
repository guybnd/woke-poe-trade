---
id: WOKEPOET-67
title: 'Price check: make confidence and Sell fast honest'
status: Done
priority: High
effort: M
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-37
history:
  - type: activity
    user: Agent
    date: '2026-11-05T08:10:39.533Z'
    comment: Created ticket.
    id: a-2026-11-05t08-10-39-533z
  - type: activity
    user: Agent
    date: '2026-11-05T08:10:39.533Z'
    comment: Created as subtask of WOKEPOET-37.
    id: a-2026-11-05t08-10-39-533z
  - type: status_change
    from: Grooming
    to: In Progress
    user: Agent
    date: '2026-11-05T09:21:57.454Z'
  - type: comment
    user: Agent
    comment: >-
      **PR #139 is reviewed, fixed and checked, and sent for merge after #138.**
      Confidence counts sellers, thin markets get bait checks, Sell fast follows
      the market and flags bargains, and the headline says "Asking around".
      Branch claude/pc-honest-confidence is in a separate clone. No docs needed.
    date: '2026-11-05T09:35:10.013Z'
    completionComment: true
    id: c-2026-11-05t09-35-10-013z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-05T09:35:10.013Z'
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-12T00:16:56.735Z'
needsAction: null
reviewState: null
---
> TL;DR: One merchant's 10 rows reads SOLID, a 1c bait in a thin market survives, and Sell fast undercuts a single outlier. Count sellers, cap rows per seller, check bait on thin markets, base Sell fast on a trusted floor, and say asking price rather than "Likely sells for".

`insight.ts`, `PriceVerdict.vue`. Report finding 3 and the Sell fast row.
