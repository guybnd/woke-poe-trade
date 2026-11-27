---
id: WOKEPOET-251
title: >-
  Loot filter: strictness hotkey and auto ladder claim a switch that failed to
  save
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
    date: '2026-11-12T11:20:03.615Z'
    comment: Created ticket.
    id: a-2026-11-12t11-20-03-615z
  - type: activity
    user: Agent
    date: '2026-11-12T11:20:03.615Z'
    comment: Created as subtask of WOKEPOET-218.
    id: a-2026-11-12t11-20-03-615z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-12T11:54:59.516Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T16:10:32.895Z'
needsAction: null
version: '00024'
releasedAt: '2026-11-27T16:10:17.975Z'
releaseDocPath: release-notes/00024
---
stepLevel/followLadder don't undo ns.level when setLevel's save fails, unlike pickLevel.
