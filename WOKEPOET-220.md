---
id: WOKEPOET-220
title: Net worth prices Awakened and exceptional gems at level 1
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
    date: '2026-11-12T11:19:05.457Z'
    comment: Created as subtask of WOKEPOET-218.
---
gemVariant turns any level under 20 into "1", so a level 5 Awakened gem is valued as level 1 (net-worth/valuation.ts, prices.ts). Fix: look up the gem's own level first.
