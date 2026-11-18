---
id: WOKEPOET-384
title: >-
  S4+S5: loot filter unit tests: guard pairs/random on master only, parse
  NeverSink once
status: Grooming
priority: None
effort: None
assignee: unassigned
tags:
  - testing
  - loot-filter
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-380
history:
  - type: activity
    user: Agent
    date: '2026-11-18T15:25:51.758Z'
    comment: Created as subtask of WOKEPOET-380.
---
Loot filter files are ~75% of vitest CPU. S4: filter-guard-pairs + filter-guard-random (~66 CPU-s) run only on master pushes (env flag in CI); filter-guard.test.ts stays on PRs (safety net, WOKEPOET-267). S5: profile filter-flows (136 s), filter-match (94), filter-match-by-base (94), filter-presets-4 (63); if parsing NeverSink dominates, cache parsed files across the run.
