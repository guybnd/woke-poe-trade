---
id: WOKEPOET-235
title: Net worth window's farming profit freezes once the ledger is full
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
    date: '2026-11-12T11:19:34.688Z'
    comment: Created ticket.
    id: a-2026-11-12t11-19-34-688z
  - type: activity
    user: Agent
    date: '2026-11-12T11:19:34.688Z'
    comment: Created as subtask of WOKEPOET-218.
    id: a-2026-11-12t11-19-34-688z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-12T11:54:46.064Z'
needsAction: null
---
NetWorthPanel watches points.length, which stays 3000 once capped. Watch the last point's time.
