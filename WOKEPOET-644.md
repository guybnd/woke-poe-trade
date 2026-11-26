---
id: WOKEPOET-644
title: Fix atlas tree import from planner link and screenshot
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
---
Atlas strategies: import Atlas Tree Planner links, and planner screenshots are read correctly. PR: https://github.com/guybnd/woke-poe-trade/pull/968 (dcb7d04).
