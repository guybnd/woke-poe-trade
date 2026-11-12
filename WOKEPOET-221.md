---
id: WOKEPOET-221
title: 'Tree overlay: a left-drag anywhere moves the drawing'
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
    date: '2026-11-12T11:19:07.600Z'
    comment: Created as subtask of WOKEPOET-218.
---
main/src/woke/tree-overlay.ts onDown follows any left button drag, e.g. on another monitor, until the next settle. Skipped for now: needs the game window's bounds in uiohook's pixel space (DPI) to be checked first.
