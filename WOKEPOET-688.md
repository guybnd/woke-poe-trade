---
id: WOKEPOET-688
title: Dock "Always" hide on What's new doesn't survive updates
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-28T02:20:44.921Z'
    comment: Created ticket.
    id: a-2026-11-28t02-20-44-921z
  - type: activity
    user: Agent
    date: '2026-11-28T02:20:48.654Z'
    comment: Updated implementation link.
    id: a-2026-11-28t02-20-48-654z
  - type: comment
    user: Agent
    comment: Waiting on the master heap fix before PR 1041 can merge.
    date: '2026-11-28T02:20:49.507Z'
    selfAttested: true
    pin: true
    id: c-2026-11-28t02-20-49-507z
  - type: comment
    user: Agent
    comment: PR 1041 merged (31a3499).
    date: '2026-11-28T02:28:34.607Z'
    completionComment: true
    id: c-2026-11-28t02-28-34-607z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-28T02:28:34.607Z'
  - type: comment
    user: Agent
    comment: Merged at 31a3499; dev build reloaded.
    completionComment: true
    date: '2026-11-28T02:28:39.115Z'
    id: c-2026-11-28t02-28-39-115z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-28T02:28:39.843Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/1041'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
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
Hiding the What's new dock icon with "Always" doesn't survive an app update. PR: https://github.com/guybnd/woke-poe-trade/pull/1041 — waiting on the master heap fix before it can merge.
