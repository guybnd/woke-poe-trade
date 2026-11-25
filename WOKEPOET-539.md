---
id: WOKEPOET-539
title: 'Bulk: one remembered Bulk toggle'
status: Released
priority: Medium
effort: S
assignee: unassigned
tags:
  - feature
  - price-check
createdBy: Agent
updatedBy: Guy
parentId: WOKEPOET-528
history:
  - type: activity
    user: Agent
    date: '2026-11-24T02:41:16.825Z'
    comment: Created ticket.
    id: a-2026-11-24t02-41-16-825z
  - type: activity
    user: Agent
    date: '2026-11-24T02:41:16.825Z'
    comment: Created as subtask of WOKEPOET-528.
    id: a-2026-11-24t02-41-16-825z
  - type: comment
    user: Agent
    comment: 'In PR 838. Picks: https://claude.ai/artifact/EfhJoEt58BXT9gftzgSgNE'
    date: '2026-11-24T03:05:06.403Z'
    selfAttested: true
    id: c-2026-11-24t03-05-06-403z
  - type: comment
    user: Agent
    comment: Shipped in PR 838 (86a29b63).
    date: '2026-11-24T03:40:58.281Z'
    completionComment: true
    id: c-2026-11-24t03-40-58-281z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-24T03:40:58.281Z'
  - type: comment
    user: Agent
    comment: Merged at 86a29b63 from a cloud thread; dev build reloaded.
    completionComment: true
    date: '2026-11-24T03:41:06.801Z'
    id: c-2026-11-24t03-41-06-801z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T03:41:07.327Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T04:05:58.042Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/838'
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
Veteran review pick (bulk-merge). One Bulk switch that stays on for next checks and loads more as needed, replacing Bulk plus Search bulk.
