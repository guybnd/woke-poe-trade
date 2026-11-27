---
id: WOKEPOET-219
title: PoB dock icon click blinks the whole overlay and opens the window late
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
    date: '2026-11-12T11:19:03.612Z'
    comment: Created ticket.
    id: a-2026-11-12t11-19-03-612z
  - type: activity
    user: Agent
    date: '2026-11-12T11:19:03.612Z'
    comment: Created as subtask of WOKEPOET-218.
    id: a-2026-11-12t11-19-03-612z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-12T11:54:19.919Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T16:11:29.172Z'
needsAction: null
version: '0000234'
releasedAt: '2026-11-27T16:11:26.816Z'
releaseDocPath: release-notes/0000234
---
Clicking the PoB dock icon while playing hides the whole overlay for a fit and waits 200 ms even when the passive tree isn't open (TreeOverlay.vue refit hideAll, tree-toggle.ts). Fix: quiet starts read without hiding; wait only if a card was open.
