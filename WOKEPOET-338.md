---
id: WOKEPOET-338
title: 'Loot filter clarity fixes, PR 2'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - loot-filter
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-16T03:36:04.869Z'
    comment: Created ticket.
    id: a-2026-11-16t03-36-04-869z
  - type: comment
    user: Agent
    comment: 'Filter clarity PR 2 merged as #550 (0361763a).'
    date: '2026-11-16T04:09:40.569Z'
    completionComment: true
    id: c-2026-11-16t04-09-40-569z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-16T04:09:40.569Z'
  - type: comment
    user: Agent
    comment: Merged as 0361763a; dev overlay on master caa6f304.
    completionComment: true
    date: '2026-11-16T04:09:41.441Z'
    id: c-2026-11-16t04-09-41-441z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-16T04:09:41.913Z'
  - type: activity
    user: Agent
    date: '2026-11-18T07:13:28.858Z'
    comment: >-
      Follow-up merged as #609 (dfea7842,
      https://github.com/guybnd/woke-poe-trade/pull/609): plain names for the
      last 101 raw NeverSink tags (r01, maps_a_t14…); the test now fails on any
      unnamed tag. Guy OK'd the names 2026-11-18.
    id: a-2026-11-18t07-13-28-858z
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T04:31:00.362Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/550'
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
version: '0003'
releasedAt: '2026-11-27T04:30:50.393Z'
releaseDocPath: release-notes/0003
---
The rest of the 10 filter clarity fixes (review artifact XWpdtdgRaK1WkbsEzJAGiV). PR 1 is #547 (PR-547 ticket); this covers the second PR, still to come. Worktree wt/filter-clarity-2.
