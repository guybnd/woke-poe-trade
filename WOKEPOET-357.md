---
id: WOKEPOET-357
title: One "uniques on this base" list for Search and Alt+F
status: Ready
priority: None
effort: S
assignee: unassigned
tags:
  - cleanup
  - ui
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-354
history:
  - type: activity
    user: Agent
    date: '2026-11-17T09:44:00.254Z'
    comment: Created ticket.
    id: a-2026-11-17t09-44-00-254z
  - type: activity
    user: Agent
    date: '2026-11-17T09:44:00.254Z'
    comment: Created as subtask of WOKEPOET-354.
    id: a-2026-11-17t09-44-00-254z
  - type: comment
    user: Agent
    comment: >-
      In PR #576 with WOKEPOET-356: shared/uniques-on-base.ts +
      shared/UniquesOnBase.vue draw Search's base pane and Alt+F "Can drop as".
    date: '2026-11-17T10:12:01.707Z'
    completionComment: true
    id: c-2026-11-17t10-12-01-707z
  - type: status_change
    from: Backlog
    to: Ready
    user: Agent
    date: '2026-11-17T10:12:01.707Z'
needsAction: null
---
> **TL;DR:** Search and the Alt+F filter card each list a base's uniques their own way; only one can be clicked. One component and one `uniquesOnBase(base)` for both.

Audit finding 3. Ships in the same PR as the shared item row.
