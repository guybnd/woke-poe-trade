---
id: WOKEPOET-381
title: >-
  S1+F5: split fake-game e2e into 2 shard jobs, list flaky tests in the job
  summary
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - testing
  - tooling
createdBy: Agent
updatedBy: Guy
parentId: WOKEPOET-380
history:
  - type: activity
    user: Agent
    date: '2026-11-18T15:25:45.027Z'
    comment: Created ticket.
    id: a-2026-11-18t15-25-45-027z
  - type: activity
    user: Agent
    date: '2026-11-18T15:25:45.027Z'
    comment: Created as subtask of WOKEPOET-380.
    id: a-2026-11-18t15-25-45-027z
  - type: comment
    user: Agent
    comment: >-
      PR #630 merged (d3c99904): fake-game tests in two e2e shards plus an
      OCR/perf/Electron job; "Fake-game tests" aggregates, merges the report and
      lists flaky tests in the summary. First run: gate ~7.8 min vs 11.8 median.
    date: '2026-11-18T16:02:11.574Z'
    completionComment: true
    id: c-2026-11-18t16-02-11-574z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-18T16:02:11.574Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as d3c99904: sharded fake-game check, flaky list in the job
      summary.
    completionComment: true
    date: '2026-11-18T16:02:15.004Z'
    id: c-2026-11-18t16-02-15-004z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T16:02:15.282Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:52:55.054Z'
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
version: '00002'
releasedAt: '2026-11-25T11:52:41.308Z'
releaseDocPath: release-notes/00002
---
.github/workflows/test.yml. e2e step is 8.3 min on 2 workers (1,030 test-seconds; loot-filter.spec.ts 220 s). Two shard jobs (playwright --shard 1/2, 2/2) plus a final job still named "Fake-game tests" (required by the master ruleset) that needs both, runs perf + Electron smoke, and fails if a shard failed. Cheaper first try: workers 3 on the 4-core runner. Merge blob reports for the HTML report artifact. F5: write each flaky test name to $GITHUB_STEP_SUMMARY (retries=1 hides them). Target: gate ~7 min.
