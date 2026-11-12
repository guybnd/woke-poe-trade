---
id: WOKEPOET-235
title: Net worth window's farming profit freezes once the ledger is full
status: Grooming
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
    date: '2026-11-12T11:19:34.688Z'
    comment: Created as subtask of WOKEPOET-218.
---
NetWorthPanel watches points.length, which stays 3000 once capped. Watch the last point's time.
