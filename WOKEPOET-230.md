---
id: WOKEPOET-230
title: Net worth books each stash read one read late
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
    date: '2026-11-12T11:19:24.715Z'
    comment: Created ticket.
    id: a-2026-11-12t11-19-24-715z
  - type: activity
    user: Agent
    date: '2026-11-12T11:19:24.715Z'
    comment: Created as subtask of WOKEPOET-218.
    id: a-2026-11-12t11-19-24-715z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-12T11:54:40.385Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T16:11:28.345Z'
needsAction: null
version: '0000234'
releasedAt: '2026-11-27T16:11:26.816Z'
releaseDocPath: release-notes/0000234
---
stash-reader.ts reports the done status before writing the cache; the overlay reads the old cache and marks the read counted. Fix: write first.
