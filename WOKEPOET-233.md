---
id: WOKEPOET-233
title: Compare-to-worn tooltip throws when your gear arrives while hovering
status: Done
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
    comment: Created ticket.
    id: a-2026-11-12t11-19-31-136z
  - type: activity
    user: Agent
    date: '2026-11-12T11:19:31.136Z'
    comment: Created as subtask of WOKEPOET-218.
    id: a-2026-11-12t11-19-31-136z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-12T11:54:44.963Z'
needsAction: null
---
BuildFitChip.vue keeps the mouseenter Event; its currentTarget is null later, so showTip throws and the tip stays on "Reading…". Keep the element.
