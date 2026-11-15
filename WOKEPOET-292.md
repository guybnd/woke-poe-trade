---
id: WOKEPOET-292
title: 'Mechanics card: each mechanic''s 3.30 Thread in place of its scarabs'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - '3.30'
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-15T05:20:16.637Z'
    comment: Created ticket.
    id: a-2026-11-15t05-20-16-637z
  - type: comment
    user: Agent
    comment: 'Merged #481 on 2026-11-14.'
    completionComment: true
    date: '2026-11-15T05:20:38.290Z'
    id: c-2026-11-15t05-20-38-290z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T05:20:38.661Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/481'
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
3.30 removed scarabs; the mechanics card now shows each mechanic's Thread instead. Shipped in PR #481.
