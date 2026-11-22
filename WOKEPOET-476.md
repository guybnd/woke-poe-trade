---
id: WOKEPOET-476
title: 'Price check: filter loaded listings live when a stat range tightens'
status: Done
priority: Medium
effort: None
assignee: unassigned
tags:
  - price-check
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-22T09:44:50.572Z'
    comment: Created ticket.
    id: a-2026-11-22t09-44-50-572z
  - type: activity
    user: Agent
    date: '2026-11-22T09:59:50.557Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/758 open (design A),
      review fixes in; CI running.
    id: a-2026-11-22t09-59-50-557z
  - type: comment
    user: Agent
    comment: >-
      PR 758 merged (pick C + short-list Load more / Search glow), reviewed
      twice, CI green.
    date: '2026-11-22T10:23:16.840Z'
    completionComment: true
    id: c-2026-11-22t10-23-16-840z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-22T10:23:16.840Z'
  - type: comment
    user: Agent
    comment: >-
      Merged PR 758 (Guy's pick C + short-list row): tighter stat ranges filter
      loaded listings with no search; Matched N of M here, range chip on the
      column, mark on the mod row; under 5 fit: Load 10 more from the last
      search or a Search hint with Search glowing; stale results glow Search.
      Dust/deck chips made async to keep startup JS under 1640 KB.
    completionComment: true
    date: '2026-11-22T10:23:26.479Z'
    id: c-2026-11-22t10-23-26-479z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-22T10:23:27.402Z'
  - type: activity
    user: Agent
    date: '2026-11-22T11:49:03.523Z'
    comment: >-
      Follow-up PR https://github.com/guybnd/woke-poe-trade/pull/763 merged:
      Load 10 more removed (Guy: a new search is better); short list points at
      Search, which glows.
    id: a-2026-11-22t11-49-03-523z
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/758'
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
Guy: after results load, tightening a stat's min/max (or ticking a readable stat) should filter the already-fetched listings locally, with no trade search. Widening/unticking/other filters keep the stale "search again" state. Must clearly show filtered-locally vs needs-search. Mockups: https://claude.ai/artifact/2smVMauq1dqp9pZZu9g9xw (recommended A: hide + teal strip + show hidden; red strip when stale). Branch woke/price-check-local-filter.
