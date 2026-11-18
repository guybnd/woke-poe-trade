---
id: WOKEPOET-382
title: 'S2: fix and split the loot filter stack sizes e2e (fails first try 58/69 runs)'
status: Grooming
priority: None
effort: None
assignee: unassigned
tags:
  - testing
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-380
history:
  - type: activity
    user: Agent
    date: '2026-11-18T15:25:47.067Z'
    comment: Created as subtask of WOKEPOET-380.
---
testing/e2e/loot-filter.spec.ts:728 "stack sizes: type a number or drag a line...". First attempt runs ~51 s against a 45 s timeout, passes on retry. Split type/Esc/drag from Gold + save, find the slow step.
