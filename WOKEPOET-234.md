---
id: WOKEPOET-234
title: 'Net worth: changing which tabs are read counts as profit per hour'
status: Released
priority: Medium
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
    date: '2026-11-12T11:19:32.980Z'
    comment: Created ticket.
    id: a-2026-11-12t11-19-32-980z
  - type: activity
    user: Agent
    date: '2026-11-12T11:19:32.980Z'
    comment: Created as subtask of WOKEPOET-218.
    id: a-2026-11-12t11-19-32-980z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-12T11:54:45.515Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T16:11:27.976Z'
needsAction: null
version: '0000234'
releasedAt: '2026-11-27T16:11:26.816Z'
releaseDocPath: release-notes/0000234
---
store.ts recordRead keeps today's points across a tab set change, so per-hour jumps. Fix: restart today's points from that read. "Since yesterday" still compares across the change (left as is).
