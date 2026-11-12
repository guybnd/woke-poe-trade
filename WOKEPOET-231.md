---
id: WOKEPOET-231
title: Net worth values white items at the ilvl 86 base price
status: Done
priority: High
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
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
needsAction: null
---
prices.ts falls back to the cheapest ITEM row by name, which for a white base is poe.ninja's base type row ("86"). Fix: skip base type rows for plain items.
