---
id: WOKEPOET-384
title: >-
  S4+S5: loot filter unit tests: guard pairs/random on master only, parse
  NeverSink once
status: Done
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
    comment: Created ticket.
    id: a-2026-11-18t15-25-51-758z
  - type: activity
    user: Agent
    date: '2026-11-18T15:25:51.758Z'
    comment: Created as subtask of WOKEPOET-380.
    id: a-2026-11-18t15-25-51-758z
  - type: comment
    user: Agent
    comment: >-
      PR #638 merged (caadb07b): guard pairs/random run only on master pushes
      (WOKE_FULL_GUARD). S5 profiled: parsing all 7 NeverSink files takes ~80
      ms, matching is the cost, so no parse cache.
    date: '2026-11-18T15:57:49.139Z'
    completionComment: true
    id: c-2026-11-18t15-57-49-139z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-18T15:57:49.140Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as caadb07b: guard pairs/random on master only; parse cache not
      worth it (profiled).
    completionComment: true
    date: '2026-11-18T15:57:57.168Z'
    id: c-2026-11-18t15-57-57-168z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T15:57:57.525Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/638'
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
Loot filter files are ~75% of vitest CPU. S4: filter-guard-pairs + filter-guard-random (~66 CPU-s) run only on master pushes (env flag in CI); filter-guard.test.ts stays on PRs (safety net, WOKEPOET-267). S5: profile filter-flows (136 s), filter-match (94), filter-match-by-base (94), filter-presets-4 (63); if parsing NeverSink dominates, cache parsed files across the run.
