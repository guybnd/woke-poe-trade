---
id: WOKEPOET-222
title: 'Atlas: tree link edited in Settings is hidden by an unsaved draft'
status: Done
priority: Low
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
needsAction: null
---
atlas-editor.vue edits s.treeUrl but workingTree prefers the draft, so the edit seems ignored. Fix: drop the draft on edit.
