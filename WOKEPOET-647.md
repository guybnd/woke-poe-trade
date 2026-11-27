---
id: WOKEPOET-647
title: Drag and drop bases between rank columns
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
    date: '2026-11-26T13:24:26.662Z'
    comment: Created ticket.
    id: a-2026-11-26t13-24-26-662z
  - type: activity
    user: Agent
    date: '2026-11-26T13:24:28.974Z'
    comment: Updated implementation link.
    id: a-2026-11-26t13-24-28-974z
  - type: comment
    user: Agent
    comment: PR 972 merged (6b31df0).
    date: '2026-11-26T13:32:18.365Z'
    completionComment: true
    id: c-2026-11-26t13-32-18-365z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-26T13:32:18.365Z'
  - type: comment
    user: Agent
    comment: Merged at 6b31df0; dev build reloaded.
    completionComment: true
    date: '2026-11-26T13:32:22.090Z'
    id: c-2026-11-26t13-32-22-090z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-26T13:32:22.805Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T04:30:50.874Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/972'
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
version: '0003'
releasedAt: '2026-11-27T04:30:50.393Z'
releaseDocPath: release-notes/0003
---
Bases can be dragged and dropped between rank columns. PR: https://github.com/guybnd/woke-poe-trade/pull/972 (in review).
