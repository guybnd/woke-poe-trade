---
id: WOKEPOET-644
title: Fix atlas tree import from planner link and screenshot
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
    date: '2026-11-26T10:23:20.876Z'
    comment: Created ticket.
    id: a-2026-11-26t10-23-20-876z
  - type: comment
    user: Agent
    comment: Merged at dcb7d04; dev build reloaded.
    completionComment: true
    date: '2026-11-26T10:23:24.190Z'
    id: c-2026-11-26t10-23-24-190z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-26T10:23:25.571Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T04:30:51.492Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/968'
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
Atlas strategies: import Atlas Tree Planner links, and planner screenshots are read correctly. PR: https://github.com/guybnd/woke-poe-trade/pull/968 (dcb7d04).
