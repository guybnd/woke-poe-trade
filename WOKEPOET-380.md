---
id: WOKEPOET-380
title: 'Test suite: faster PR checks, fewer flakes, cover the bug-heavy areas'
status: Grooming
priority: Medium
effort: None
assignee: unassigned
tags:
  - testing
  - tooling
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-18T15:25:35.578Z'
    comment: Created ticket.
    id: a-2026-11-18t15-25-35-578z
subtasks:
  - WOKEPOET-381
  - WOKEPOET-382
  - WOKEPOET-383
  - WOKEPOET-384
  - WOKEPOET-385
  - WOKEPOET-386
  - WOKEPOET-387
  - WOKEPOET-388
  - WOKEPOET-389
  - WOKEPOET-390
---
Epic from the 2026-11-19 test audit (artifact https://claude.ai/artifact/R6Ha5b6XsuME1zyjzPoozs). Guy approved S1-S6, F1-F5, G1-G4; skipped G5.

Data: 69 CI runs 17-18 Nov. Fake-game job 11.8 min median (e2e 8.3 min on 2 workers) is the PR long pole. Fake-game, perf budgets and Windows package stay required master checks; keep the "Fake-game tests" check name.

Subtasks hold one item each. Never run local e2e/vitest while PoE is open (woke-check cloud).
