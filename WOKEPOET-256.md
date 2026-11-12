---
id: WOKEPOET-256
title: >-
  Loot filter: with no prices, the net keeps old stack rules after raising the
  line
status: Done
priority: Low
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
    date: '2026-11-12T11:20:12.320Z'
    comment: Created ticket.
    id: a-2026-11-12t11-20-12-320z
  - type: activity
    user: Agent
    date: '2026-11-12T11:20:12.320Z'
    comment: Created as subtask of WOKEPOET-218.
    id: a-2026-11-12t11-20-12-320z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-12T11:55:02.370Z'
needsAction: null
---
store.ts writes last.stacks without checking last.line or movedDown.
