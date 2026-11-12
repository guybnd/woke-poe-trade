---
id: WOKEPOET-251
title: >-
  Loot filter: strictness hotkey and auto ladder claim a switch that failed to
  save
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
    date: '2026-11-12T11:20:03.615Z'
    comment: Created as subtask of WOKEPOET-218.
---
stepLevel/followLadder don't undo ns.level when setLevel's save fails, unlike pickLevel.
