---
id: WOKEPOET-223
title: 'Loot filter: drop sound volume preset misses the safety net'
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
    date: '2026-11-12T11:19:11.001Z'
    comment: Created as subtask of WOKEPOET-218.
---
Safety-net blocks are added after presets apply, so their alert sound stays at full volume (store.ts compose, safety.ts).
