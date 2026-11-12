---
id: WOKEPOET-230
title: Net worth books each stash read one read late
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
    date: '2026-11-12T11:19:24.715Z'
    comment: Created as subtask of WOKEPOET-218.
---
stash-reader.ts reports the done status before writing the cache; the overlay reads the old cache and marks the read counted. Fix: write first.
