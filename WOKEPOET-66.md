---
id: WOKEPOET-66
title: 'Price check: use the searched league''s prices and warn on missing data'
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
    date: '2026-11-05T08:10:37.189Z'
    comment: Created ticket.
    id: a-2026-11-05t08-10-37-189z
  - type: activity
    user: Agent
    date: '2026-11-05T08:10:37.189Z'
    comment: Created as subtask of WOKEPOET-37.
    id: a-2026-11-05t08-10-37-189z
  - type: status_change
    from: Grooming
    to: In Progress
    user: Agent
    date: '2026-11-05T09:07:16.679Z'
  - type: comment
    user: Agent
    comment: >-
      **PR #138 is reviewed, fixed and checked, and sent for merge after #136.**
      A search in another league uses none of the selected league's data, and
      unconverted divines are flagged. Branch claude/pc-league-prices is in a
      separate clone. No docs needed.
    date: '2026-11-05T09:21:57.418Z'
    completionComment: true
    id: c-2026-11-05t09-21-57-418z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-05T09:21:57.418Z'
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-12T00:16:56.188Z'
needsAction: null
reviewState: null
---
> TL;DR: Picking another league keeps the selected league's divine rate and poe.ninja data, and with no rate divine listings silently drop out. Don't use another league's data, say when divine listings can't be converted, and warn when the account name is blank.

`useInsight.ts`, `useSmartPrice.ts`, `Prices.ts`; `TradeBulk.vue` already guards the league. Report finding 5.
