---
id: WOKEPOET-229
title: Undo of a removed atlas strategy or regex does nothing after adding another
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
    date: '2026-11-12T11:19:22.991Z'
    comment: Created as subtask of WOKEPOET-218.
---
The freed id is reused, so the Undo guard thinks the item is back (AtlasWindow.vue ~317, WidgetRegexLibrary.vue ~238). Put it back under a fresh id.
