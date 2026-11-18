---
id: WOKEPOET-381
title: >-
  S1+F5: split fake-game e2e into 2 shard jobs, list flaky tests in the job
  summary
status: Grooming
priority: None
effort: None
assignee: unassigned
tags:
  - testing
  - tooling
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-380
history:
  - type: activity
    user: Agent
    date: '2026-11-18T15:25:45.027Z'
    comment: Created as subtask of WOKEPOET-380.
---
.github/workflows/test.yml. e2e step is 8.3 min on 2 workers (1,030 test-seconds; loot-filter.spec.ts 220 s). Two shard jobs (playwright --shard 1/2, 2/2) plus a final job still named "Fake-game tests" (required by the master ruleset) that needs both, runs perf + Electron smoke, and fails if a shard failed. Cheaper first try: workers 3 on the 4-core runner. Merge blob reports for the HTML report artifact. F5: write each flaky test name to $GITHUB_STEP_SUMMARY (retries=1 hides them). Target: gate ~7 min.
