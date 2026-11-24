---
id: WOKEPOET-530
title: 'Runs: per-map cost kits priced live'
status: Done
priority: High
effort: M
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-528
history:
  - type: activity
    user: Agent
    date: '2026-11-24T02:41:01.478Z'
    comment: Created ticket.
    id: a-2026-11-24t02-41-01-478z
  - type: activity
    user: Agent
    date: '2026-11-24T02:41:01.478Z'
    comment: Created as subtask of WOKEPOET-528.
    id: a-2026-11-24t02-41-01-478z
  - type: status_change
    from: Todo
    to: In Progress
    user: Agent
    date: '2026-11-24T03:04:59.566Z'
  - type: comment
    user: Agent
    comment: >-
      In PR 840 (built as K1+C2+S1). Picks:
      https://claude.ai/artifact/RBERMp4gMxySNEbYLpaUYT
    date: '2026-11-24T03:05:01.823Z'
    selfAttested: true
    id: c-2026-11-24t03-05-01-823z
  - type: comment
    user: Agent
    comment: Shipped in PR 840 (4469e90e).
    date: '2026-11-24T03:12:45.487Z'
    completionComment: true
    id: c-2026-11-24t03-12-45-487z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-24T03:12:45.487Z'
  - type: comment
    user: Agent
    comment: Merged at 4469e90e from a cloud thread; dev build reloaded.
    completionComment: true
    date: '2026-11-24T03:12:52.813Z'
    id: c-2026-11-24t03-12-52-813z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T03:12:53.376Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/840'
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
Veteran review pick (run-kit). Save a kit ("4 Breach Threads, 1 Nightmare map, 1 Delirium orb") once; each map run charges it at today's poe.ninja price. Check overlap with WOKEPOET-515.
