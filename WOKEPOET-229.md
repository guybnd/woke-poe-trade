---
id: WOKEPOET-229
title: Undo of a removed atlas strategy or regex does nothing after adding another
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
needsAction: null
---
The freed id is reused, so the Undo guard thinks the item is back (AtlasWindow.vue ~317, WidgetRegexLibrary.vue ~238). Put it back under a fresh id.
