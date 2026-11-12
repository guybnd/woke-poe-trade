---
id: WOKEPOET-82
title: Low-confidence price tag and filter across price panels
status: Done
priority: Medium
effort: M
assignee: unassigned
tags:
  - prices
  - mocks
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-05T10:48:15.107Z'
    comment: Created ticket.
    id: a-2026-11-05t10-48-15-107z
  - type: comment
    user: Agent
    comment: >-
      Which tag, filter and rule? Mocks:
      https://claude.ai/artifact/Gghx9jLJVkozMHRYqmrggX Recommended: 1B (the
      word thin), 2A (Skip thin per panel), 3A (Lab gems rule, low trade later).
    date: '2026-11-05T11:07:05.315Z'
    id: c-2026-11-05t11-07-05-315z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-05T11:07:05.315Z'
    comment: >-
      Which tag, filter and rule? Mocks:
      https://claude.ai/artifact/Gghx9jLJVkozMHRYqmrggX Recommended: 1B (the
      word thin), 2A (Skip thin per panel), 3A (Lab gems rule, low trade later).
  - type: comment
    user: Agent
    comment: >-
      Merged as #363 (14e17971): ! tag and Skip thin chip in League mechanics
      (on by default), Market tracker and Boss runs (off by default; thin drops
      count as 0). Built to Guy's picks 1A/2A/3A.
    date: '2026-11-12T06:49:59.855Z'
    completionComment: true
    id: c-2026-11-12t06-49-59-855z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-12T06:49:59.855Z'
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-12T06:49:59.855Z'
swimlane: null
needsAction: null
---
Guy, 2026-11-05: low-confidence prices should have a filter and a tag, like the Lab gems toggle. Same thin rule as Lab gems (no poe.ninja price on 3 or more of the last 7 days). Mocks first, then Guy's pick.

Panels to cover: Boss runs, League mechanics Best, Market tracker, others that show poe.ninja prices.
