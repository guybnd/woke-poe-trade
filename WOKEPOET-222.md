---
id: WOKEPOET-222
title: 'Atlas: tree link edited in Settings is hidden by an unsaved draft'
status: Released
priority: Low
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
    date: '2026-11-12T11:19:09.353Z'
    comment: Created ticket.
    id: a-2026-11-12t11-19-09-353z
  - type: activity
    user: Agent
    date: '2026-11-12T11:19:09.353Z'
    comment: Created as subtask of WOKEPOET-218.
    id: a-2026-11-12t11-19-09-353z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-12T11:54:35.887Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T16:11:29.005Z'
needsAction: null
version: '0000234'
releasedAt: '2026-11-27T16:11:26.816Z'
releaseDocPath: release-notes/0000234
---
atlas-editor.vue edits s.treeUrl but workingTree prefers the draft, so the edit seems ignored. Fix: drop the draft on edit.
