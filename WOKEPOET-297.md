---
id: WOKEPOET-297
title: 'Filter card: warn when the game''s filter file is older'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - loot-filter
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-15T05:20:23.885Z'
    comment: Created ticket.
    id: a-2026-11-15t05-20-23-885z
  - type: comment
    user: Agent
    comment: 'Merged #487 on 2026-11-15.'
    completionComment: true
    date: '2026-11-15T05:20:43.116Z'
    id: c-2026-11-15t05-20-43-116z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T05:20:43.498Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T16:10:23.365Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/487'
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
version: '00024'
releasedAt: '2026-11-27T16:10:17.975Z'
releaseDocPath: release-notes/00024
---
The loot filter card warns when the filter file the game uses is older than the one the toolkit wrote. Shipped in PR #487.
