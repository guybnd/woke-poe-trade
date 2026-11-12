---
id: WOKEPOET-241
title: 'PoB pins break when the build is renamed, moved or deleted'
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
    date: '2026-11-12T11:19:46.139Z'
    comment: Created as subtask of WOKEPOET-218.
---
followFile/removeBuild in WidgetPobBuilds.vue never touch pins, which keep the old relPath. Remap or drop them.
