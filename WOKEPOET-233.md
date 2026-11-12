---
id: WOKEPOET-233
title: Compare-to-worn tooltip throws when your gear arrives while hovering
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
    date: '2026-11-12T11:19:31.136Z'
    comment: Created as subtask of WOKEPOET-218.
---
BuildFitChip.vue keeps the mouseenter Event; its currentTarget is null later, so showTip throws and the tip stays on "Reading…". Keep the element.
