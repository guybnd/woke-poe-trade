---
id: WOKEPOET-532
title: 'Runs: say when a run is too short to trust'
status: Released
priority: Medium
effort: XS
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Guy
parentId: WOKEPOET-528
history:
  - type: activity
    user: Agent
    date: '2026-11-24T02:41:04.497Z'
    comment: Created ticket.
    id: a-2026-11-24t02-41-04-497z
  - type: activity
    user: Agent
    date: '2026-11-24T02:41:04.497Z'
    comment: Created as subtask of WOKEPOET-528.
    id: a-2026-11-24t02-41-04-497z
  - type: status_change
    from: Todo
    to: In Progress
    user: Agent
    date: '2026-11-24T03:05:00.701Z'
  - type: comment
    user: Agent
    comment: >-
      In PR 840 (built as K1+C2+S1). Picks:
      https://claude.ai/artifact/RBERMp4gMxySNEbYLpaUYT
    date: '2026-11-24T03:05:04.204Z'
    selfAttested: true
    id: c-2026-11-24t03-05-04-204z
  - type: comment
    user: Agent
    comment: Shipped in PR 840 (4469e90e).
    date: '2026-11-24T03:12:47.310Z'
    completionComment: true
    id: c-2026-11-24t03-12-47-310z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-24T03:12:47.310Z'
  - type: comment
    user: Agent
    comment: Merged at 4469e90e from a cloud thread; dev build reloaded.
    completionComment: true
    date: '2026-11-24T03:12:54.971Z'
    id: c-2026-11-24t03-12-54-971z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T03:12:55.989Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T04:05:58.939Z'
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
version: 1.30.20
releasedAt: '2026-11-25T04:05:49.382Z'
releaseDocPath: release-notes/1.30.20
---
Veteran review pick (run-sample). Under about 30 maps, or when one drop is over half the profit, show "small sample" beside per map.
