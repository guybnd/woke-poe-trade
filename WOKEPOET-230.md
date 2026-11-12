---
id: WOKEPOET-230
title: Net worth books each stash read one read late
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
needsAction: null
---
stash-reader.ts reports the done status before writing the cache; the overlay reads the old cache and marks the read counted. Fix: write first.
