---
id: WOKEPOET-350
title: 'Atlas screenshot import: read pictures off the main thread'
status: In Progress
priority: Low
effort: None
assignee: unassigned
tags:
  - atlas
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-17T06:57:44.103Z'
    comment: Created ticket.
    id: a-2026-11-17t06-57-44-103z
  - type: status_change
    from: Grooming
    to: In Progress
    user: Agent
    date: '2026-11-17T06:57:46.018Z'
needsAction: null
---
Follow-up from #565's merge review: main fit each pasted screenshot synchronously (~0.2 s at 1440p). PR #567 moves the fit to a short-lived worker (dist/picture.js). Branch woke/atlas-shot-async.
