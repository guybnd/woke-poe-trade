---
id: WOKEPOET-234
title: 'Net worth: changing which tabs are read counts as profit per hour'
status: Grooming
priority: Medium
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
    date: '2026-11-12T11:19:32.980Z'
    comment: Created as subtask of WOKEPOET-218.
---
store.ts recordRead keeps today's points across a tab set change, so per-hour jumps. Fix: restart today's points from that read. "Since yesterday" still compares across the change (left as is).
