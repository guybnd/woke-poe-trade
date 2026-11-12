---
id: WOKEPOET-231
title: Net worth values white items at the ilvl 86 base price
status: Grooming
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
    comment: Created as subtask of WOKEPOET-218.
---
prices.ts falls back to the cheapest ITEM row by name, which for a white base is poe.ninja's base type row ("86"). Fix: skip base type rows for plain items.
