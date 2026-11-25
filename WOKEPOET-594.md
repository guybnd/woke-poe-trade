---
id: WOKEPOET-594
title: 'Item tooltip: pool uniques'' mod lines shown as a sample'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-25T04:10:17.113Z'
    comment: Created ticket.
    id: a-2026-11-25t04-10-17-113z
  - type: comment
    user: Agent
    comment: Merged at 59bb342; dev build reloaded.
    completionComment: true
    date: '2026-11-25T04:10:22.243Z'
    id: c-2026-11-25t04-10-22-243z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-25T04:10:22.687Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:48.355Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/911'
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
version: '0001'
releasedAt: '2026-11-25T11:50:45.359Z'
releaseDocPath: release-notes/0001
---
For uniques that roll from a big mod pool, the item tooltip labels the mod lines as a sample of the pool. PR: https://github.com/guybnd/woke-poe-trade/pull/911 (59bb342).
