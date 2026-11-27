---
id: WOKEPOET-229
title: Undo of a removed atlas strategy or regex does nothing after adding another
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
    date: '2026-11-12T11:19:22.991Z'
    comment: Created ticket.
    id: a-2026-11-12t11-19-22-991z
  - type: activity
    user: Agent
    date: '2026-11-12T11:19:22.991Z'
    comment: Created as subtask of WOKEPOET-218.
    id: a-2026-11-12t11-19-22-991z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-12T11:54:39.836Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T16:11:28.432Z'
needsAction: null
version: '0000234'
releasedAt: '2026-11-27T16:11:26.816Z'
releaseDocPath: release-notes/0000234
---
The freed id is reused, so the Undo guard thinks the item is back (AtlasWindow.vue ~317, WidgetRegexLibrary.vue ~238). Put it back under a fresh id.
