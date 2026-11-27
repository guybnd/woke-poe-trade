---
id: WOKEPOET-235
title: Net worth window's farming profit freezes once the ledger is full
status: Released
priority: Low
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
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T16:11:27.894Z'
needsAction: null
version: '0000234'
releasedAt: '2026-11-27T16:11:26.816Z'
releaseDocPath: release-notes/0000234
---
NetWorthPanel watches points.length, which stays 3000 once capped. Watch the last point's time.
