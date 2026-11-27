---
id: WOKEPOET-640
title: Price check anything from Ctrl+Space search
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-26T07:31:09.598Z'
    comment: Created ticket.
    id: a-2026-11-26t07-31-09-598z
  - type: comment
    user: Agent
    comment: Merged at e31da4c; dev build reloaded.
    completionComment: true
    date: '2026-11-26T07:31:14.545Z'
    id: c-2026-11-26t07-31-14-545z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-26T07:31:15.248Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T04:30:51.744Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/964'
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
Ctrl+Space (Guy, 2026-11-26): Enter price checks in the overlay, Alt+Enter opens the trade site, and bases and other unpriced items can be price checked. PR: https://github.com/guybnd/woke-poe-trade/pull/964 (e31da4c).
