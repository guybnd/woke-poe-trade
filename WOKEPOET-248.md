---
id: WOKEPOET-248
title: PoB numbers round to "1000k" instead of "1.0M"
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
    date: '2026-11-12T11:19:58.582Z'
    comment: Created ticket.
    id: a-2026-11-12t11-19-58-582z
  - type: activity
    user: Agent
    date: '2026-11-12T11:19:58.582Z'
    comment: Created as subtask of WOKEPOET-218.
    id: a-2026-11-12t11-19-58-582z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-12T11:54:57.866Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T16:11:26.820Z'
needsAction: null
version: '0000234'
releasedAt: '2026-11-27T16:11:26.816Z'
releaseDocPath: release-notes/0000234
---
build-model.ts shortNumber picks the unit before rounding.
