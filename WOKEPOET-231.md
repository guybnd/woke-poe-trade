---
id: WOKEPOET-231
title: Net worth values white items at the ilvl 86 base price
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
    date: '2026-11-12T11:19:26.286Z'
    comment: Created ticket.
    id: a-2026-11-12t11-19-26-286z
  - type: activity
    user: Agent
    date: '2026-11-12T11:19:26.286Z'
    comment: Created as subtask of WOKEPOET-218.
    id: a-2026-11-12t11-19-26-286z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-12T11:54:40.938Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T16:11:28.267Z'
needsAction: null
version: '0000234'
releasedAt: '2026-11-27T16:11:26.816Z'
releaseDocPath: release-notes/0000234
---
prices.ts falls back to the cheapest ITEM row by name, which for a white base is poe.ninja's base type row ("86"). Fix: skip base type rows for plain items.
