---
id: WOKEPOET-380
title: 'Test suite: faster PR checks, fewer flakes, cover the bug-heavy areas'
status: Done
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
  - type: comment
    user: Agent
    comment: >-
      All subtasks merged: #630, #632, #634, #635, #636, #638, #640, #641, #642;
      388 needed no change. Fake-game check ~7.8 min vs 11.8 median; top flakes
      fixed at the cause.
    date: '2026-11-18T16:14:32.305Z'
    completionComment: true
    id: c-2026-11-18t16-14-32-305z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-18T16:14:32.305Z'
  - type: comment
    user: Agent
    comment: 'Epic done: PRs 630, 632, 634, 635, 636, 638, 640, 641, 642 merged.'
    completionComment: true
    date: '2026-11-18T16:14:37.537Z'
    id: c-2026-11-18t16-14-37-537z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T16:14:37.795Z'
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
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/630'
swimlane: null
diffSummary:
  - file: renderer/src/web/woke/pob-builds/BuildDetail.vue
    additions: 4
    deletions: 4
  - file: renderer/src/web/woke/pob-builds/build-model.ts
    additions: 14
    deletions: 0
  - file: renderer/test/woke/pob-builds.test.ts
    additions: 39
    deletions: 1
---
Epic from the 2026-11-19 test audit (artifact https://claude.ai/artifact/R6Ha5b6XsuME1zyjzPoozs). Guy approved S1-S6, F1-F5, G1-G4; skipped G5.

Data: 69 CI runs 17-18 Nov. Fake-game job 11.8 min median (e2e 8.3 min on 2 workers) is the PR long pole. Fake-game, perf budgets and Windows package stay required master checks; keep the "Fake-game tests" check name.

Subtasks hold one item each. Never run local e2e/vitest while PoE is open (woke-check cloud).
