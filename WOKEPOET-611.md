---
id: WOKEPOET-611
title: 'Price check: Eldritch implicit roll ranges and tier ladder'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - feature
  - price-check
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-25T07:37:23.790Z'
    comment: Created ticket.
    id: a-2026-11-25t07-37-23-790z
  - type: comment
    user: Agent
    comment: Merged at a1bcdd0; dev build reloaded.
    completionComment: true
    date: '2026-11-25T07:37:27.092Z'
    id: c-2026-11-25t07-37-27-092z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-25T07:37:27.566Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:46.203Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/922'
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
Price check shows roll ranges and the tier ladder for eldritch implicits. PR: https://github.com/guybnd/woke-poe-trade/pull/922 (a1bcdd0).
