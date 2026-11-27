---
id: WOKEPOET-227
title: 'Atlas Settings: a new strategy inherits a removed one''s unsaved tree'
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
    date: '2026-11-12T11:19:19.321Z'
    comment: Created ticket.
    id: a-2026-11-12t11-19-19-321z
  - type: activity
    user: Agent
    date: '2026-11-12T11:19:19.321Z'
    comment: Created as subtask of WOKEPOET-218.
    id: a-2026-11-12t11-19-19-321z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-12T11:54:38.691Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T16:11:28.593Z'
needsAction: null
version: '0000234'
releasedAt: '2026-11-27T16:11:26.816Z'
releaseDocPath: release-notes/0000234
---
atlas-editor.vue remove leaves drafts[id]; the next Add reuses the id. Call takeDrafts.
