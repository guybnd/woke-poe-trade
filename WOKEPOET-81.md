---
id: WOKEPOET-81
title: 'Keep good poe.ninja prices through bad replies, and remove duplicate rows'
status: Done
priority: High
effort: S
assignee: unassigned
tags:
  - prices
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-05T10:48:12.781Z'
    comment: Created ticket.
    id: a-2026-11-05t10-48-12-781z
  - type: activity
    user: Agent
    date: '2026-11-05T11:07:05.358Z'
    comment: Updated implementation link.
    id: a-2026-11-05t11-07-05-358z
  - type: comment
    user: Agent
    comment: >-
      Merged as 10f9060 and live on the dev copy. Live overlay, read-only: 8,310
      snapshot rows, all unique, and 10 tracker rows on screen, all unique.
      Waiting on Guy to confirm the filter at 500c; his floor is now 0 and I
      didn't change it. Launcher follow-up is WOKEPOET-97.
    date: '2026-11-05T11:59:21.031Z'
    completionComment: true
    id: c-2026-11-05t11-59-21-031z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-05T11:59:21.031Z'
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-12T00:16:59.994Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/157'
needsAction: null
reviewState: null
---
From the price data critique (https://claude.ai/artifact/1LS2iXRoSHqMWqpHg9fynH), steps 1 and 2. Guy said yes, 2026-11-05.

- A failed or partial reply keeps the last good prices and retries in minutes, not 31.
- A running download isn't cancelled by another request for prices, so no startup AbortError.
- Currency and Fragment are stored once.
- No UI.
