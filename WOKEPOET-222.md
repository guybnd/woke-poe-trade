---
id: WOKEPOET-222
title: 'Atlas: tree link edited in Settings is hidden by an unsaved draft'
status: Grooming
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
    comment: Created as subtask of WOKEPOET-218.
---
atlas-editor.vue edits s.treeUrl but workingTree prefers the draft, so the edit seems ignored. Fix: drop the draft on edit.
