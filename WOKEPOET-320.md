---
id: WOKEPOET-320
title: 'Price check: Harvest swap pick also filters the search'
status: In Progress
priority: None
effort: None
assignee: unassigned
tags:
  - price-check
  - harvest
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-15T07:03:21.940Z'
    comment: Created ticket.
    id: a-2026-11-15t07-03-21-940z
  - type: comment
    user: Agent
    comment: >-
      Guy picked C (element dropdown on the row). Built on branch
      woke/swap-filter; review and checks running.
    date: '2026-11-15T07:17:47.484Z'
    id: c-2026-11-15t07-17-47-484z
  - type: status_change
    from: Grooming
    to: In Progress
    user: Agent
    date: '2026-11-15T07:17:47.484Z'
  - type: activity
    user: Agent
    date: '2026-11-15T07:29:38.691Z'
    comment: >-
      C built and reviewed (11 findings, 9 fixed); PR
      https://github.com/guybnd/woke-poe-trade/pull/514 sent to merge.
    id: a-2026-11-15t07-29-38-691z
needsAction: null
---
Guy (2026-11-15): pressing Any/Fire/Cold on a mod's ⇄ should also filter the price check for that pick, so he can find a cheaper item of another element to buy, not only see the swap cost. One search per click, never more.

Mocks: https://claude.ai/artifact/DU5e4CX4GAcYMTh8nhPZEy. A: the pick changes the filter only, then press Search. B (recommended): one search fills Results (element marked per listing) and Flip (priced per element from the same listings). C: an element dropdown on the row; ⇄ stays flip-only. Building B meanwhile.
