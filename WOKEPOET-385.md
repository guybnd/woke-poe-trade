---
id: WOKEPOET-385
title: 'F1-F3: fix the top e2e flakes'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - testing
createdBy: Agent
updatedBy: Guy
parentId: WOKEPOET-380
history:
  - type: activity
    user: Agent
    date: '2026-11-18T15:25:54.477Z'
    comment: Created ticket.
    id: a-2026-11-18t15-25-54-477z
  - type: activity
    user: Agent
    date: '2026-11-18T15:25:54.477Z'
    comment: Created as subtask of WOKEPOET-380.
    id: a-2026-11-18t15-25-54-477z
  - type: activity
    user: Agent
    date: '2026-11-18T15:58:03.396Z'
    comment: >-
      Rail drag click fix merged (#635, 3220b89f). item-copy-failed and
      run-timeline/cluster/item-tip leaks fixed in #632 (pending CI); done when
      it merges.
    id: a-2026-11-18t15-58-03-396z
  - type: comment
    user: Agent
    comment: >-
      #632 (9998bb80) fixes item-copy-failed (leftover hovered item) and the
      dock-card intercepts behind run-timeline, item-tip and cluster-type; #635
      (3220b89f) fixes the rail drag swallowing a real click.
    date: '2026-11-18T16:10:06.314Z'
    completionComment: true
    id: c-2026-11-18t16-10-06-314z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-18T16:10:06.314Z'
  - type: comment
    user: Agent
    comment: >-
      Merged via #632 (9998bb80) and #635 (3220b89f): top e2e flakes fixed at
      the cause.
    completionComment: true
    date: '2026-11-18T16:10:12.560Z'
    id: c-2026-11-18t16-10-12-560z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T16:10:12.814Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:52:53.119Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/632'
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
Retried in 69 CI runs: item-copy-failed.spec.ts:4 every run (3 s toast wait right after boot; guess: hotkey before overlay ready). run-timeline.spec.ts:55 (25) and :22 (15): likely reading runs before the save lands. cluster-type.spec.ts:8 rows (6), tab-rail.spec.ts:280 pinned drag (4 + 1 hard fail), item-tip.spec.ts:104 unique base (4 + 1 hard fail). Diagnose each before changing timeouts.
