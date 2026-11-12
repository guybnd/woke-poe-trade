---
id: WOKEPOET-223
title: 'Loot filter: drop sound volume preset misses the safety net'
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
    date: '2026-11-12T11:19:11.001Z'
    comment: Created ticket.
    id: a-2026-11-12t11-19-11-001z
  - type: activity
    user: Agent
    date: '2026-11-12T11:19:11.001Z'
    comment: Created as subtask of WOKEPOET-218.
    id: a-2026-11-12t11-19-11-001z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-12T11:54:36.438Z'
needsAction: null
---
Safety-net blocks are added after presets apply, so their alert sound stays at full volume (store.ts compose, safety.ts).
