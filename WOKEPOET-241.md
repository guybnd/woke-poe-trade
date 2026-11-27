---
id: WOKEPOET-241
title: 'PoB pins break when the build is renamed, moved or deleted'
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
    date: '2026-11-12T11:19:46.139Z'
    comment: Created ticket.
    id: a-2026-11-12t11-19-46-139z
  - type: activity
    user: Agent
    date: '2026-11-12T11:19:46.139Z'
    comment: Created as subtask of WOKEPOET-218.
    id: a-2026-11-12t11-19-46-139z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-12T11:54:49.465Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T16:11:27.385Z'
needsAction: null
version: '0000234'
releasedAt: '2026-11-27T16:11:26.816Z'
releaseDocPath: release-notes/0000234
---
followFile/removeBuild in WidgetPobBuilds.vue never touch pins, which keep the old relPath. Remap or drop them.
