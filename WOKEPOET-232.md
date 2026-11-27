---
id: WOKEPOET-232
title: Net worth shows relic and foil uniques as their base
status: Released
priority: High
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Guy
parentId: WOKEPOET-218
history:
  - type: activity
    user: Agent
    date: '2026-11-12T11:19:29.291Z'
    comment: Created ticket.
    id: a-2026-11-12t11-19-29-291z
  - type: activity
    user: Agent
    date: '2026-11-12T11:19:29.291Z'
    comment: Created as subtask of WOKEPOET-218.
    id: a-2026-11-12t11-19-29-291z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-12T11:54:41.387Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T16:11:28.181Z'
needsAction: null
version: '0000234'
releasedAt: '2026-11-27T16:11:26.816Z'
releaseDocPath: release-notes/0000234
---
frameType 9/10 aren't treated as uniques in prices.ts, valuation.ts, tips.ts. Fix: isUniqueFrame.
