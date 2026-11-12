---
id: WOKEPOET-219
title: PoB dock icon click blinks the whole overlay and opens the window late
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
    date: '2026-11-12T11:19:03.612Z'
    comment: Created as subtask of WOKEPOET-218.
---
Clicking the PoB dock icon while playing hides the whole overlay for a fit and waits 200 ms even when the passive tree isn't open (TreeOverlay.vue refit hideAll, tree-toggle.ts). Fix: quiet starts read without hiding; wait only if a card was open.
