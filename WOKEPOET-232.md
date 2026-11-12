---
id: WOKEPOET-232
title: Net worth shows relic and foil uniques as their base
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
    date: '2026-11-12T11:19:29.291Z'
    comment: Created as subtask of WOKEPOET-218.
---
frameType 9/10 aren't treated as uniques in prices.ts, valuation.ts, tips.ts. Fix: isUniqueFrame.
