---
id: WOKEPOET-385
title: 'F1-F3: fix the top e2e flakes'
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
    date: '2026-11-18T15:25:54.477Z'
    comment: Created as subtask of WOKEPOET-380.
---
Retried in 69 CI runs: item-copy-failed.spec.ts:4 every run (3 s toast wait right after boot; guess: hotkey before overlay ready). run-timeline.spec.ts:55 (25) and :22 (15): likely reading runs before the save lands. cluster-type.spec.ts:8 rows (6), tab-rail.spec.ts:280 pinned drag (4 + 1 hard fail), item-tip.spec.ts:104 unique base (4 + 1 hard fail). Diagnose each before changing timeouts.
